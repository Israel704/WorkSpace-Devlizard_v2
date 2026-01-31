const express = require('express');
const db = require('../db');
const githubStore = require('../store/githubStore');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authRequired);

// Validar roles permitidos
const ALLOWED_ROLES = ['ceo', 'coo', 'cfo', 'cto', 'cmo'];
const STORAGE_KEY = 'dl_proposals_v1';

const nowSeconds = () => Math.floor(Date.now() / 1000);

async function readRepoProposals() {
  const data = await githubStore.getStorage(STORAGE_KEY, []);
  return Array.isArray(data) ? data : [];
}

async function writeRepoProposals(list, message) {
  await githubStore.setStorage(STORAGE_KEY, list, message || 'Update proposals');
}

async function getAllProposalsPreferRepo() {
  try {
    const repoList = await readRepoProposals();
    if (repoList.length) return { source: 'repo', list: repoList };
    const sqliteList = await db.all('SELECT * FROM proposals ORDER BY createdAt DESC', []);
    if (sqliteList.length) {
      try {
        await writeRepoProposals(sqliteList, 'Sync proposals from sqlite');
      } catch (_) {}
    }
    return { source: 'sqlite', list: sqliteList };
  } catch (e) {
    const sqliteList = await db.all('SELECT * FROM proposals ORDER BY createdAt DESC', []);
    return { source: 'sqlite', list: sqliteList };
  }
}

async function insertSqlProposal(payload) {
  try {
    const result = await db.run(
      `INSERT INTO proposals (title, description, fromRole, toRole, status, category)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
      [
        payload.title,
        payload.description,
        payload.fromRole,
        payload.toRole,
        payload.category || 'geral'
      ]
    );
    return result.id;
  } catch (err) {
    const result = await db.run(
      `INSERT INTO proposals (title, description, fromRole, toRole, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [
        payload.title,
        payload.description,
        payload.fromRole,
        payload.toRole
      ]
    );
    return result.id;
  }
}

// ==================== CRIAR PROPOSTA ====================

// POST /api/proposals
router.post('/', async (req, res) => {
  try {
    const { title, description, toRole, category } = req.body;
    const fromRole = req.user.role;

    if (!title || !description || !toRole) {
      return res.status(400).json({
        error: 'title, description e toRole são obrigatórios'
      });
    }

    if (!ALLOWED_ROLES.includes(toRole)) {
      return res.status(400).json({
        error: 'toRole inválido. Use: ceo, coo, cfo, cto ou cmo'
      });
    }

    if (fromRole === toRole) {
      return res.status(400).json({
        error: 'Você não pode enviar uma proposta para si mesmo'
      });
    }

    const createdAt = nowSeconds();

    try {
      const list = await readRepoProposals();
      const nextId = list.length ? Math.max(...list.map(p => Number(p.id) || 0)) + 1 : createdAt;
      const proposal = {
        id: nextId,
        title,
        description,
        fromRole,
        toRole,
        status: 'pending',
        category: category || 'geral',
        createdAt,
        updatedAt: createdAt,
        decisionComment: null,
        decidedAt: null,
      };
      list.unshift(proposal);
      await writeRepoProposals(list, `Add proposal ${proposal.id}`);
      return res.status(201).json(proposal);
    } catch (repoError) {
      const id = await insertSqlProposal({ title, description, fromRole, toRole, category });
      const proposal = await db.get(
        'SELECT * FROM proposals WHERE id = ?',
        [id]
      );

      return res.status(201).json(proposal);
    }
  } catch (error) {
    console.error('Erro ao criar proposta:', error);
    res.status(500).json({ error: 'Erro ao criar proposta' });
  }
});

// ==================== LISTAR PROPOSTAS ENVIADAS ====================

// GET /api/proposals/sent
router.get('/sent', async (req, res) => {
  try {
    const fromRole = req.user.role;
    const { list } = await getAllProposalsPreferRepo();
    const proposals = list
      .filter((p) => p.fromRole === fromRole)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    res.json(proposals);
  } catch (error) {
    console.error('Erro ao buscar propostas enviadas:', error);
    res.status(500).json({ error: 'Erro ao buscar propostas enviadas' });
  }
});

// ==================== LISTAR PROPOSTAS RECEBIDAS ====================

// GET /api/proposals/inbox
router.get('/inbox', async (req, res) => {
  try {
    const toRole = req.user.role;
    const { list } = await getAllProposalsPreferRepo();
    const proposals = list
      .filter((p) => p.toRole === toRole)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    res.json(proposals);
  } catch (error) {
    console.error('Erro ao buscar propostas recebidas:', error);
    res.status(500).json({ error: 'Erro ao buscar propostas recebidas' });
  }
});

// ==================== CONTAR PROPOSTAS PENDENTES ====================

// GET /api/proposals/pending/count
router.get('/pending/count', async (req, res) => {
  try {
    const toRole = req.user.role;
    const { list } = await getAllProposalsPreferRepo();
    const count = list.filter((p) => p.toRole === toRole && p.status === 'pending').length;
    res.json({ count });
  } catch (error) {
    console.error('Erro ao contar propostas pendentes:', error);
    res.status(500).json({ error: 'Erro ao contar propostas pendentes' });
  }
});

// ==================== DECIDIR PROPOSTA ====================

// PATCH /api/proposals/:id/decide
router.patch('/:id/decide', async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, comment } = req.body;
    const userRole = req.user.role;

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        error: 'decision deve ser "approved" ou "rejected"'
      });
    }

    if (!comment || comment.trim() === '') {
      return res.status(400).json({
        error: 'comment é obrigatório'
      });
    }

    try {
      const list = await readRepoProposals();
      const idx = list.findIndex((p) => String(p.id) === String(id));
      if (idx === -1) throw new Error('repo_not_found');
      const proposal = list[idx];
      if (proposal.toRole !== userRole) {
        return res.status(403).json({
          error: 'Somente o destinatário pode decidir esta proposta'
        });
      }
      if (proposal.status !== 'pending') {
        return res.status(400).json({
          error: 'Esta proposta já foi decidida'
        });
      }
      const decidedAt = nowSeconds();
      const updated = {
        ...proposal,
        status: decision,
        decisionComment: comment,
        decidedAt,
        updatedAt: decidedAt,
      };
      list[idx] = updated;
      await writeRepoProposals(list, `Decide proposal ${updated.id}`);
      return res.json(updated);
    } catch (repoError) {
      const proposal = await db.get(
        'SELECT * FROM proposals WHERE id = ?',
        [id]
      );

      if (!proposal) {
        return res.status(404).json({ error: 'Proposta não encontrada' });
      }

      if (proposal.toRole !== userRole) {
        return res.status(403).json({
          error: 'Somente o destinatário pode decidir esta proposta'
        });
      }

      if (proposal.status !== 'pending') {
        return res.status(400).json({
          error: 'Esta proposta já foi decidida'
        });
      }

      const decidedAt = nowSeconds();

      await db.run(
        `UPDATE proposals
         SET status = ?, decisionComment = ?, decidedAt = ?
         WHERE id = ?`,
        [decision, comment, decidedAt, id]
      );

      const updatedProposal = await db.get(
        'SELECT * FROM proposals WHERE id = ?',
        [id]
      );

      return res.json(updatedProposal);
    }
  } catch (error) {
    console.error('Erro ao decidir proposta:', error);
    res.status(500).json({ error: 'Erro ao decidir proposta' });
  }
});

// ==================== EXCLUIR PROPOSTA ====================

// DELETE /api/proposals/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    try {
      const list = await readRepoProposals();
      const idx = list.findIndex((p) => String(p.id) === String(id));
      if (idx === -1) throw new Error('repo_not_found');
      const proposal = list[idx];
      if (proposal.fromRole !== userRole) {
        return res.status(403).json({
          error: 'Somente o criador pode excluir esta proposta'
        });
      }
      if (proposal.status !== 'pending') {
        return res.status(400).json({
          error: 'Não é possível excluir uma proposta já decidida'
        });
      }
      list.splice(idx, 1);
      await writeRepoProposals(list, `Delete proposal ${proposal.id}`);
      return res.json({ message: 'Proposta excluída com sucesso' });
    } catch (repoError) {
      const proposal = await db.get(
        'SELECT * FROM proposals WHERE id = ?',
        [id]
      );

      if (!proposal) {
        return res.status(404).json({ error: 'Proposta não encontrada' });
      }

      if (proposal.fromRole !== userRole) {
        return res.status(403).json({
          error: 'Somente o criador pode excluir esta proposta'
        });
      }

      if (proposal.status !== 'pending') {
        return res.status(400).json({
          error: 'Não é possível excluir uma proposta já decidida'
        });
      }

      await db.run('DELETE FROM proposals WHERE id = ?', [id]);

      return res.json({ message: 'Proposta excluída com sucesso' });
    }
  } catch (error) {
    console.error('Erro ao excluir proposta:', error);
    res.status(500).json({ error: 'Erro ao excluir proposta' });
  }
});

module.exports = router;
