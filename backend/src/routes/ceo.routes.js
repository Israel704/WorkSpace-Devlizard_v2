const express = require('express');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação e verificação de role em todas as rotas
router.use(authRequired);
router.use(requireRole(['ceo']));

// ==================== NOTES ====================

// GET /api/ceo/notes
router.get('/notes', async (req, res) => {
  try {
    const notes = await db.all(
      'SELECT * FROM ceo_notes ORDER BY createdAt DESC'
    );
    res.json(notes);
  } catch (error) {
    console.error('Erro ao buscar notes:', error);
    res.status(500).json({ error: 'Erro ao buscar notas' });
  }
});

// POST /api/ceo/notes
router.post('/notes', async (req, res) => {
  try {
    const { title, text } = req.body;

    if (!title || !text) {
      return res.status(400).json({ error: 'Title e text são obrigatórios' });
    }

    const result = await db.run(
      'INSERT INTO ceo_notes (title, text, ownerRole) VALUES (?, ?, ?)',
      [title, text, 'ceo']
    );

    const note = await db.get('SELECT * FROM ceo_notes WHERE id = ?', [result.id]);
    res.status(201).json(note);
  } catch (error) {
    console.error('Erro ao criar note:', error);
    res.status(500).json({ error: 'Erro ao criar nota' });
  }
});

// PUT /api/ceo/notes/:id
router.put('/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, text } = req.body;

    if (!title || !text) {
      return res.status(400).json({ error: 'Title e text são obrigatórios' });
    }

    await db.run(
      'UPDATE ceo_notes SET title = ?, text = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [title, text, id]
    );

    const note = await db.get('SELECT * FROM ceo_notes WHERE id = ?', [id]);
    
    if (!note) {
      return res.status(404).json({ error: 'Nota não encontrada' });
    }

    res.json(note);
  } catch (error) {
    console.error('Erro ao atualizar note:', error);
    res.status(500).json({ error: 'Erro ao atualizar nota' });
  }
});

// DELETE /api/ceo/notes/:id
router.delete('/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.run('DELETE FROM ceo_notes WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Nota não encontrada' });
    }

    res.json({ message: 'Nota deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar note:', error);
    res.status(500).json({ error: 'Erro ao deletar nota' });
  }
});

// ==================== DECISIONS ====================

// GET /api/ceo/decisions
router.get('/decisions', async (req, res) => {
  try {
    const decisions = await db.all(
      'SELECT * FROM ceo_decisions ORDER BY createdAt DESC'
    );
    res.json(decisions);
  } catch (error) {
    console.error('Erro ao buscar decisions:', error);
    res.status(500).json({ error: 'Erro ao buscar decisões' });
  }
});

// POST /api/ceo/decisions
router.post('/decisions', async (req, res) => {
  try {
    const { title, text } = req.body;

    if (!title || !text) {
      return res.status(400).json({ error: 'Title e text são obrigatórios' });
    }

    const result = await db.run(
      'INSERT INTO ceo_decisions (title, text, ownerRole) VALUES (?, ?, ?)',
      [title, text, 'ceo']
    );

    const decision = await db.get('SELECT * FROM ceo_decisions WHERE id = ?', [result.id]);
    res.status(201).json(decision);
  } catch (error) {
    console.error('Erro ao criar decision:', error);
    res.status(500).json({ error: 'Erro ao criar decisão' });
  }
});

// PUT /api/ceo/decisions/:id
router.put('/decisions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, text } = req.body;

    if (!title || !text) {
      return res.status(400).json({ error: 'Title e text são obrigatórios' });
    }

    await db.run(
      'UPDATE ceo_decisions SET title = ?, text = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [title, text, id]
    );

    const decision = await db.get('SELECT * FROM ceo_decisions WHERE id = ?', [id]);
    
    if (!decision) {
      return res.status(404).json({ error: 'Decisão não encontrada' });
    }

    res.json(decision);
  } catch (error) {
    console.error('Erro ao atualizar decision:', error);
    res.status(500).json({ error: 'Erro ao atualizar decisão' });
  }
});

// DELETE /api/ceo/decisions/:id
router.delete('/decisions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.run('DELETE FROM ceo_decisions WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Decisão não encontrada' });
    }

    res.json({ message: 'Decisão deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar decision:', error);
    res.status(500).json({ error: 'Erro ao deletar decisão' });
  }
});

// ==================== RISKS ====================

// GET /api/ceo/risks
router.get('/risks', async (req, res) => {
  try {
    const risks = await db.all(
      'SELECT * FROM ceo_risks ORDER BY createdAt DESC'
    );
    res.json(risks);
  } catch (error) {
    console.error('Erro ao buscar risks:', error);
    res.status(500).json({ error: 'Erro ao buscar riscos' });
  }
});

// POST /api/ceo/risks
router.post('/risks', async (req, res) => {
  try {
    const { title, text } = req.body;

    if (!title || !text) {
      return res.status(400).json({ error: 'Title e text são obrigatórios' });
    }

    const result = await db.run(
      'INSERT INTO ceo_risks (title, text, ownerRole) VALUES (?, ?, ?)',
      [title, text, 'ceo']
    );

    const risk = await db.get('SELECT * FROM ceo_risks WHERE id = ?', [result.id]);
    res.status(201).json(risk);
  } catch (error) {
    console.error('Erro ao criar risk:', error);
    res.status(500).json({ error: 'Erro ao criar risco' });
  }
});

// PUT /api/ceo/risks/:id
router.put('/risks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, text } = req.body;

    if (!title || !text) {
      return res.status(400).json({ error: 'Title e text são obrigatórios' });
    }

    await db.run(
      'UPDATE ceo_risks SET title = ?, text = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [title, text, id]
    );

    const risk = await db.get('SELECT * FROM ceo_risks WHERE id = ?', [id]);
    
    if (!risk) {
      return res.status(404).json({ error: 'Risco não encontrado' });
    }

    res.json(risk);
  } catch (error) {
    console.error('Erro ao atualizar risk:', error);
    res.status(500).json({ error: 'Erro ao atualizar risco' });
  }
});

// DELETE /api/ceo/risks/:id
router.delete('/risks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.run('DELETE FROM ceo_risks WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Risco não encontrado' });
    }

    res.json({ message: 'Risco deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar risk:', error);
    res.status(500).json({ error: 'Erro ao deletar risco' });
  }
});

module.exports = router;
