const express = require('express');
const db = require('../db');
const githubStore = require('../store/githubStore');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired);
router.use(requireRole(['coo']));

const STORAGE_KEY = 'dl_api_ops_tasks_v1';

const VALID_STATUSES = ['todo', 'doing', 'blocked', 'review', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];
const MAX_DESCRIPTION_LENGTH = 1000;

const nowSeconds = () => Math.floor(Date.now() / 1000);

async function readRepoTasks() {
  const data = await githubStore.getStorage(STORAGE_KEY, []);
  return Array.isArray(data) ? data : [];
}

async function writeRepoTasks(list, message) {
  await githubStore.setStorage(STORAGE_KEY, list, message || 'Update ops tasks');
}

async function getAllTasksPreferRepo() {
  try {
    const repoList = await readRepoTasks();
    if (repoList.length) return repoList;
    const sqliteList = await db.all('SELECT * FROM ops_tasks ORDER BY updatedAt DESC');
    if (sqliteList.length) {
      try {
        await writeRepoTasks(sqliteList, 'Sync ops tasks from sqlite');
      } catch (_) {}
    }
    return sqliteList;
  } catch (_) {
    return await db.all('SELECT * FROM ops_tasks ORDER BY updatedAt DESC');
  }
}

// GET /api/coo/tasks
router.get('/tasks', async (req, res) => {
  try {
    const tasks = await getAllTasksPreferRepo();
    res.json(tasks);
  } catch (error) {
    console.error('Erro ao buscar tasks:', error);
    res.status(500).json({ error: 'Erro ao buscar tarefas' });
  }
});

// POST /api/coo/tasks
router.post('/tasks', async (req, res) => {
  try {
    const { title, description, priority, owner, dueDate } = req.body;

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

    const now = nowSeconds();

    try {
      const list = await readRepoTasks();
      const nextId = list.length ? Math.max(...list.map(t => Number(t.id) || 0)) + 1 : now;
      const task = {
        id: nextId,
        title: title.trim(),
        description: description || null,
        status: 'todo',
        priority: priority || 'medium',
        owner: owner || null,
        dueDate: dueDate || null,
        createdByRole: 'coo',
        createdAt: now,
        updatedAt: now,
      };
      list.unshift(task);
      await writeRepoTasks(list, `Add ops task ${task.id}`);
      return res.status(201).json(task);
    } catch (_) {
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
      return res.status(201).json(task);
    }
  } catch (error) {
    console.error('Erro ao criar task:', error);
    res.status(500).json({ error: 'Erro ao criar tarefa' });
  }
});

// PUT /api/coo/tasks/:id
router.put('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, owner, dueDate, status } = req.body;

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

    const now = nowSeconds();

    try {
      const list = await readRepoTasks();
      const idx = list.findIndex(t => String(t.id) === String(id));
      if (idx === -1) throw new Error('repo_not_found');
      const updated = {
        ...list[idx],
        title: title.trim(),
        description: description || null,
        priority: priority || 'medium',
        owner: owner || null,
        dueDate: dueDate || null,
        status: status || 'todo',
        updatedAt: now,
      };
      list[idx] = updated;
      await writeRepoTasks(list, `Update ops task ${id}`);
      return res.json(updated);
    } catch (_) {
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
      if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
      return res.json(task);
    }
  } catch (error) {
    console.error('Erro ao atualizar task:', error);
    res.status(500).json({ error: 'Erro ao atualizar tarefa' });
  }
});

// PATCH /api/coo/tasks/:id/move
router.patch('/tasks/:id/move', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Status deve ser: ${VALID_STATUSES.join(', ')}`
      });
    }

    const now = nowSeconds();

    try {
      const list = await readRepoTasks();
      const idx = list.findIndex(t => String(t.id) === String(id));
      if (idx === -1) throw new Error('repo_not_found');
      const updated = { ...list[idx], status, updatedAt: now };
      list[idx] = updated;
      await writeRepoTasks(list, `Move ops task ${id}`);
      return res.json(updated);
    } catch (_) {
      await db.run(
        'UPDATE ops_tasks SET status = ?, updatedAt = ? WHERE id = ?',
        [status, now, id]
      );
      const task = await db.get('SELECT * FROM ops_tasks WHERE id = ?', [id]);
      if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
      return res.json(task);
    }
  } catch (error) {
    console.error('Erro ao mover task:', error);
    res.status(500).json({ error: 'Erro ao mover tarefa' });
  }
});

// DELETE /api/coo/tasks/:id
router.delete('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    try {
      const list = await readRepoTasks();
      const next = list.filter(t => String(t.id) !== String(id));
      if (next.length === list.length) throw new Error('repo_not_found');
      await writeRepoTasks(next, `Delete ops task ${id}`);
      return res.json({ message: 'Tarefa deletada com sucesso' });
    } catch (_) {
      const result = await db.run('DELETE FROM ops_tasks WHERE id = ?', [id]);
      if (result.changes === 0) return res.status(404).json({ error: 'Tarefa não encontrada' });
      return res.json({ message: 'Tarefa deletada com sucesso' });
    }
  } catch (error) {
    console.error('Erro ao deletar task:', error);
    res.status(500).json({ error: 'Erro ao deletar tarefa' });
  }
});

module.exports = router;
