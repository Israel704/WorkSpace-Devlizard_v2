const express = require('express');
const db = require('../db');
const githubStore = require('../store/githubStore');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação e verificação de role em todas as rotas
router.use(authRequired);
router.use(requireRole(['ceo']));

const STORAGE = {
  notes: 'dl_api_ceo_notes_v1',
  decisions: 'dl_api_ceo_decisions_v1',
  risks: 'dl_api_ceo_risks_v1',
  opsTasks: 'dl_api_ops_tasks_v1',
};

const nowSeconds = () => Math.floor(Date.now() / 1000);

async function readRepoList(key) {
  const data = await githubStore.getStorage(key, []);
  return Array.isArray(data) ? data : [];
}

async function writeRepoList(key, list, message) {
  await githubStore.setStorage(key, list, message || `Update ${key}`);
}

async function getAllPreferRepo(key, sqliteQuery) {
  try {
    const repoList = await readRepoList(key);
    if (repoList.length) return repoList;
    const sqliteList = await db.all(sqliteQuery);
    if (sqliteList.length) {
      try {
        await writeRepoList(key, sqliteList, `Sync ${key} from sqlite`);
      } catch (_) {}
    }
    return sqliteList;
  } catch (_) {
    return await db.all(sqliteQuery);
  }
}

// ==================== NOTES ====================

router.get('/notes', async (req, res) => {
  try {
    const notes = await getAllPreferRepo(
      STORAGE.notes,
      'SELECT * FROM ceo_notes ORDER BY createdAt DESC'
    );
    res.json(notes);
  } catch (error) {
    console.error('Erro ao buscar notes:', error);
    res.status(500).json({ error: 'Erro ao buscar notas' });
  }
});

router.post('/notes', async (req, res) => {
  try {
    const { title, text } = req.body;
    if (!title || !text) {
      return res.status(400).json({ error: 'Title e text são obrigatórios' });
    }

    const createdAt = nowSeconds();

    try {
      const list = await readRepoList(STORAGE.notes);
      const nextId = list.length ? Math.max(...list.map(n => Number(n.id) || 0)) + 1 : createdAt;
      const note = {
        id: nextId,
        title,
        text,
        ownerRole: 'ceo',
        createdAt,
        updatedAt: createdAt,
      };
      list.unshift(note);
      await writeRepoList(STORAGE.notes, list, `Add ceo note ${note.id}`);
      return res.status(201).json(note);
    } catch (_) {
      const result = await db.run(
        'INSERT INTO ceo_notes (title, text, ownerRole) VALUES (?, ?, ?)',
        [title, text, 'ceo']
      );
      const note = await db.get('SELECT * FROM ceo_notes WHERE id = ?', [result.id]);
      return res.status(201).json(note);
    }
  } catch (error) {
    console.error('Erro ao criar note:', error);
    res.status(500).json({ error: 'Erro ao criar nota' });
  }
});

router.put('/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, text } = req.body;

    if (!title || !text) {
      return res.status(400).json({ error: 'Title e text são obrigatórios' });
    }

    try {
      const list = await readRepoList(STORAGE.notes);
      const idx = list.findIndex(n => String(n.id) === String(id));
      if (idx === -1) throw new Error('repo_not_found');
      const updatedAt = nowSeconds();
      const updated = { ...list[idx], title, text, updatedAt };
      list[idx] = updated;
      await writeRepoList(STORAGE.notes, list, `Update ceo note ${id}`);
      return res.json(updated);
    } catch (_) {
      await db.run(
        'UPDATE ceo_notes SET title = ?, text = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [title, text, id]
      );
      const note = await db.get('SELECT * FROM ceo_notes WHERE id = ?', [id]);
      if (!note) return res.status(404).json({ error: 'Nota não encontrada' });
      return res.json(note);
    }
  } catch (error) {
    console.error('Erro ao atualizar note:', error);
    res.status(500).json({ error: 'Erro ao atualizar nota' });
  }
});

router.delete('/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    try {
      const list = await readRepoList(STORAGE.notes);
      const next = list.filter(n => String(n.id) !== String(id));
      if (next.length === list.length) throw new Error('repo_not_found');
      await writeRepoList(STORAGE.notes, next, `Delete ceo note ${id}`);
      return res.json({ message: 'Nota deletada com sucesso' });
    } catch (_) {
      const result = await db.run('DELETE FROM ceo_notes WHERE id = ?', [id]);
      if (result.changes === 0) return res.status(404).json({ error: 'Nota não encontrada' });
      return res.json({ message: 'Nota deletada com sucesso' });
    }
  } catch (error) {
    console.error('Erro ao deletar note:', error);
    res.status(500).json({ error: 'Erro ao deletar nota' });
  }
});

// ==================== DECISIONS ====================

router.get('/decisions', async (req, res) => {
  try {
    const decisions = await getAllPreferRepo(
      STORAGE.decisions,
      'SELECT * FROM ceo_decisions ORDER BY createdAt DESC'
    );
    res.json(decisions);
  } catch (error) {
    console.error('Erro ao buscar decisions:', error);
    res.status(500).json({ error: 'Erro ao buscar decisões' });
  }
});

router.post('/decisions', async (req, res) => {
  try {
    const { title, text } = req.body;
    if (!title || !text) {
      return res.status(400).json({ error: 'Title e text são obrigatórios' });
    }

    const createdAt = nowSeconds();
    try {
      const list = await readRepoList(STORAGE.decisions);
      const nextId = list.length ? Math.max(...list.map(d => Number(d.id) || 0)) + 1 : createdAt;
      const decision = {
        id: nextId,
        title,
        text,
        ownerRole: 'ceo',
        createdAt,
        updatedAt: createdAt,
      };
      list.unshift(decision);
      await writeRepoList(STORAGE.decisions, list, `Add ceo decision ${decision.id}`);
      return res.status(201).json(decision);
    } catch (_) {
      const result = await db.run(
        'INSERT INTO ceo_decisions (title, text, ownerRole) VALUES (?, ?, ?)',
        [title, text, 'ceo']
      );
      const decision = await db.get('SELECT * FROM ceo_decisions WHERE id = ?', [result.id]);
      return res.status(201).json(decision);
    }
  } catch (error) {
    console.error('Erro ao criar decision:', error);
    res.status(500).json({ error: 'Erro ao criar decisão' });
  }
});

router.put('/decisions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, text } = req.body;

    if (!title || !text) {
      return res.status(400).json({ error: 'Title e text são obrigatórios' });
    }

    try {
      const list = await readRepoList(STORAGE.decisions);
      const idx = list.findIndex(d => String(d.id) === String(id));
      if (idx === -1) throw new Error('repo_not_found');
      const updatedAt = nowSeconds();
      const updated = { ...list[idx], title, text, updatedAt };
      list[idx] = updated;
      await writeRepoList(STORAGE.decisions, list, `Update ceo decision ${id}`);
      return res.json(updated);
    } catch (_) {
      await db.run(
        'UPDATE ceo_decisions SET title = ?, text = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [title, text, id]
      );
      const decision = await db.get('SELECT * FROM ceo_decisions WHERE id = ?', [id]);
      if (!decision) return res.status(404).json({ error: 'Decisão não encontrada' });
      return res.json(decision);
    }
  } catch (error) {
    console.error('Erro ao atualizar decision:', error);
    res.status(500).json({ error: 'Erro ao atualizar decisão' });
  }
});

router.delete('/decisions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    try {
      const list = await readRepoList(STORAGE.decisions);
      const next = list.filter(d => String(d.id) !== String(id));
      if (next.length === list.length) throw new Error('repo_not_found');
      await writeRepoList(STORAGE.decisions, next, `Delete ceo decision ${id}`);
      return res.json({ message: 'Decisão deletada com sucesso' });
    } catch (_) {
      const result = await db.run('DELETE FROM ceo_decisions WHERE id = ?', [id]);
      if (result.changes === 0) return res.status(404).json({ error: 'Decisão não encontrada' });
      return res.json({ message: 'Decisão deletada com sucesso' });
    }
  } catch (error) {
    console.error('Erro ao deletar decision:', error);
    res.status(500).json({ error: 'Erro ao deletar decisão' });
  }
});

// ==================== RISKS ====================

router.get('/risks', async (req, res) => {
  try {
    const risks = await getAllPreferRepo(
      STORAGE.risks,
      'SELECT * FROM ceo_risks ORDER BY createdAt DESC'
    );
    res.json(risks);
  } catch (error) {
    console.error('Erro ao buscar risks:', error);
    res.status(500).json({ error: 'Erro ao buscar riscos' });
  }
});

router.post('/risks', async (req, res) => {
  try {
    const { title, text } = req.body;
    if (!title || !text) {
      return res.status(400).json({ error: 'Title e text são obrigatórios' });
    }

    const createdAt = nowSeconds();
    try {
      const list = await readRepoList(STORAGE.risks);
      const nextId = list.length ? Math.max(...list.map(r => Number(r.id) || 0)) + 1 : createdAt;
      const risk = {
        id: nextId,
        title,
        text,
        ownerRole: 'ceo',
        createdAt,
        updatedAt: createdAt,
      };
      list.unshift(risk);
      await writeRepoList(STORAGE.risks, list, `Add ceo risk ${risk.id}`);
      return res.status(201).json(risk);
    } catch (_) {
      const result = await db.run(
        'INSERT INTO ceo_risks (title, text, ownerRole) VALUES (?, ?, ?)',
        [title, text, 'ceo']
      );
      const risk = await db.get('SELECT * FROM ceo_risks WHERE id = ?', [result.id]);
      return res.status(201).json(risk);
    }
  } catch (error) {
    console.error('Erro ao criar risk:', error);
    res.status(500).json({ error: 'Erro ao criar risco' });
  }
});

router.put('/risks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, text } = req.body;

    if (!title || !text) {
      return res.status(400).json({ error: 'Title e text são obrigatórios' });
    }

    try {
      const list = await readRepoList(STORAGE.risks);
      const idx = list.findIndex(r => String(r.id) === String(id));
      if (idx === -1) throw new Error('repo_not_found');
      const updatedAt = nowSeconds();
      const updated = { ...list[idx], title, text, updatedAt };
      list[idx] = updated;
      await writeRepoList(STORAGE.risks, list, `Update ceo risk ${id}`);
      return res.json(updated);
    } catch (_) {
      await db.run(
        'UPDATE ceo_risks SET title = ?, text = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [title, text, id]
      );
      const risk = await db.get('SELECT * FROM ceo_risks WHERE id = ?', [id]);
      if (!risk) return res.status(404).json({ error: 'Risco não encontrado' });
      return res.json(risk);
    }
  } catch (error) {
    console.error('Erro ao atualizar risk:', error);
    res.status(500).json({ error: 'Erro ao atualizar risco' });
  }
});

router.delete('/risks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    try {
      const list = await readRepoList(STORAGE.risks);
      const next = list.filter(r => String(r.id) !== String(id));
      if (next.length === list.length) throw new Error('repo_not_found');
      await writeRepoList(STORAGE.risks, next, `Delete ceo risk ${id}`);
      return res.json({ message: 'Risco deletado com sucesso' });
    } catch (_) {
      const result = await db.run('DELETE FROM ceo_risks WHERE id = ?', [id]);
      if (result.changes === 0) return res.status(404).json({ error: 'Risco não encontrado' });
      return res.json({ message: 'Risco deletado com sucesso' });
    }
  } catch (error) {
    console.error('Erro ao deletar risk:', error);
    res.status(500).json({ error: 'Erro ao deletar risco' });
  }
});

// ==================== OPS REPORT ====================

router.get('/ops-report', async (req, res) => {
  try {
    let tasks = [];
    try {
      tasks = await readRepoList(STORAGE.opsTasks);
      if (!tasks.length) {
        const sqliteTasks = await db.all(
          'SELECT id, title, status, priority, owner, dueDate, updatedAt FROM ops_tasks ORDER BY updatedAt DESC'
        );
        tasks = sqliteTasks;
        if (sqliteTasks.length) {
          try {
            await writeRepoList(STORAGE.opsTasks, sqliteTasks, 'Sync ops tasks from sqlite');
          } catch (_) {}
        }
      }
    } catch (_) {
      tasks = await db.all(
        'SELECT id, title, status, priority, owner, dueDate, updatedAt FROM ops_tasks ORDER BY updatedAt DESC'
      );
    }

    const summary = { todo: 0, doing: 0, blocked: 0, done: 0, review: 0 };
    tasks.forEach((t) => {
      if (summary[t.status] !== undefined) summary[t.status] += 1;
    });

    const recentTasks = tasks
      .slice()
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 10);

    res.json({ summary, recentTasks });
  } catch (error) {
    console.error('Erro ao buscar relatório operacional:', error);
    res.status(500).json({ error: 'Erro ao buscar relatório operacional' });
  }
});

module.exports = router;
