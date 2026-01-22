const express = require('express');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação e verificação de role em todas as rotas
router.use(authRequired);
router.use(requireRole(['coo']));

// Validações
const VALID_STATUSES = ['todo', 'doing', 'blocked', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];
const MAX_DESCRIPTION_LENGTH = 1000;

// ==================== TASKS CRUD ====================

// GET /api/coo/tasks - Buscar todas as tasks
router.get('/tasks', async (req, res) => {
  try {
    const tasks = await db.all(
      'SELECT * FROM ops_tasks ORDER BY updatedAt DESC'
    );
    res.json(tasks);
  } catch (error) {
    console.error('Erro ao buscar tasks:', error);
    res.status(500).json({ error: 'Erro ao buscar tarefas' });
  }
});

// POST /api/coo/tasks - Criar nova task
router.post('/tasks', async (req, res) => {
  try {
    const { title, description, priority, owner, dueDate } = req.body;

    // Validações
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Title é obrigatório' });
    }

    if (description && description.length > MAX_DESCRIPTION_LENGTH) {
      return res.status(400).json({ 
        error: `Description não pode exceder ${MAX_DESCRIPTION_LENGTH} caracteres` 
      });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ 
        error: `Priority deve ser: ${VALID_PRIORITIES.join(', ')}` 
      });
    }

    const now = Math.floor(Date.now() / 1000);

    const result = await db.run(
      `INSERT INTO ops_tasks (title, description, status, priority, owner, dueDate, createdByRole, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        description || null,
        'todo',
        priority || 'medium',
        owner || null,
        dueDate || null,
        'coo',
        now,
        now
      ]
    );

    const task = await db.get('SELECT * FROM ops_tasks WHERE id = ?', [result.id]);
    res.status(201).json(task);
  } catch (error) {
    console.error('Erro ao criar task:', error);
    res.status(500).json({ error: 'Erro ao criar tarefa' });
  }
});

// PUT /api/coo/tasks/:id - Atualizar task completa
router.put('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, owner, dueDate, status } = req.body;

    // Validações
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Title é obrigatório' });
    }

    if (description && description.length > MAX_DESCRIPTION_LENGTH) {
      return res.status(400).json({ 
        error: `Description não pode exceder ${MAX_DESCRIPTION_LENGTH} caracteres` 
      });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ 
        error: `Priority deve ser: ${VALID_PRIORITIES.join(', ')}` 
      });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ 
        error: `Status deve ser: ${VALID_STATUSES.join(', ')}` 
      });
    }

    const now = Math.floor(Date.now() / 1000);

    await db.run(
      `UPDATE ops_tasks 
       SET title = ?, description = ?, priority = ?, owner = ?, dueDate = ?, status = ?, updatedAt = ?
       WHERE id = ?`,
      [
        title.trim(),
        description || null,
        priority || 'medium',
        owner || null,
        dueDate || null,
        status || 'todo',
        now,
        id
      ]
    );

    const task = await db.get('SELECT * FROM ops_tasks WHERE id = ?', [id]);
    
    if (!task) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    res.json(task);
  } catch (error) {
    console.error('Erro ao atualizar task:', error);
    res.status(500).json({ error: 'Erro ao atualizar tarefa' });
  }
});

// PATCH /api/coo/tasks/:id/move - Mover task rapidamente no Kanban
router.patch('/tasks/:id/move', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ 
        error: `Status deve ser: ${VALID_STATUSES.join(', ')}` 
      });
    }

    const now = Math.floor(Date.now() / 1000);

    await db.run(
      'UPDATE ops_tasks SET status = ?, updatedAt = ? WHERE id = ?',
      [status, now, id]
    );

    const task = await db.get('SELECT * FROM ops_tasks WHERE id = ?', [id]);
    
    if (!task) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    res.json(task);
  } catch (error) {
    console.error('Erro ao mover task:', error);
    res.status(500).json({ error: 'Erro ao mover tarefa' });
  }
});

// DELETE /api/coo/tasks/:id - Deletar task
router.delete('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.run('DELETE FROM ops_tasks WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    res.json({ message: 'Tarefa deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar task:', error);
    res.status(500).json({ error: 'Erro ao deletar tarefa' });
  }
});

module.exports = router;
