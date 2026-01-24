const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authRequired);

// Validar roles permitidos
const ALLOWED_ROLES = ['ceo', 'coo', 'cfo', 'cto', 'cmo'];

// ==================== CRIAR PROPOSTA ====================

// POST /api/proposals
router.post('/', async (req, res) => {
  try {
    const { title, description, toRole } = req.body;
    const fromRole = req.user.role;

    // Validações
    if (!title || !description || !toRole) {
      return res.status(400).json({ 
        error: 'title, description e toRole são obrigatórios' 
      });
    }

    // Validar role de destino
    if (!ALLOWED_ROLES.includes(toRole)) {
      return res.status(400).json({ 
        error: 'toRole inválido. Use: ceo, coo, cfo, cto ou cmo' 
      });
    }

    // Não pode enviar para si mesmo
    if (fromRole === toRole) {
      return res.status(400).json({ 
        error: 'Você não pode enviar uma proposta para si mesmo' 
      });
    }

    // Criar proposta
    const result = await db.run(
      `INSERT INTO proposals (title, description, fromRole, toRole, status) 
       VALUES (?, ?, ?, ?, 'pending')`,
      [title, description, fromRole, toRole]
    );

    const proposal = await db.get(
      'SELECT * FROM proposals WHERE id = ?', 
      [result.id]
    );

    res.status(201).json(proposal);
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

    const proposals = await db.all(
      `SELECT * FROM proposals 
       WHERE fromRole = ? 
       ORDER BY createdAt DESC`,
      [fromRole]
    );

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

    const proposals = await db.all(
      `SELECT * FROM proposals 
       WHERE toRole = ? 
       ORDER BY createdAt DESC`,
      [toRole]
    );

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

    const result = await db.get(
      `SELECT COUNT(*) as count FROM proposals 
       WHERE toRole = ? AND status = 'pending'`,
      [toRole]
    );

    res.json({ count: result.count || 0 });
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

    // Validações
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

    // Buscar proposta
    const proposal = await db.get(
      'SELECT * FROM proposals WHERE id = ?', 
      [id]
    );

    if (!proposal) {
      return res.status(404).json({ error: 'Proposta não encontrada' });
    }

    // Verificar se o usuário é o destinatário
    if (proposal.toRole !== userRole) {
      return res.status(403).json({ 
        error: 'Somente o destinatário pode decidir esta proposta' 
      });
    }

    // Verificar se já foi decidida
    if (proposal.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Esta proposta já foi decidida' 
      });
    }

    // Atualizar proposta
    const decidedAt = Math.floor(Date.now() / 1000);
    
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

    res.json(updatedProposal);
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

    // Buscar proposta
    const proposal = await db.get(
      'SELECT * FROM proposals WHERE id = ?', 
      [id]
    );

    if (!proposal) {
      return res.status(404).json({ error: 'Proposta não encontrada' });
    }

    // Verificar se o usuário é o criador
    if (proposal.fromRole !== userRole) {
      return res.status(403).json({ 
        error: 'Somente o criador pode excluir esta proposta' 
      });
    }

    // Verificar se está pendente
    if (proposal.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Não é possível excluir uma proposta já decidida' 
      });
    }

    // Excluir proposta
    await db.run('DELETE FROM proposals WHERE id = ?', [id]);

    res.json({ message: 'Proposta excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir proposta:', error);
    res.status(500).json({ error: 'Erro ao excluir proposta' });
  }
});

module.exports = router;
