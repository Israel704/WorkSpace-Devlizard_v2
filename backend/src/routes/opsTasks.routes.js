// Rotas REST para Kanban Operacional (COO)
const express = require('express');
const router = express.Router();
const opsTasksStore = require('../store/opsTasksStore');
const authRequired = require('../middleware/auth');

// Listar todas as tarefas
router.get('/', authRequired, async (req, res) => {
  try {
    const tasks = await opsTasksStore.getOpsTasks();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Criar nova tarefa
router.post('/', authRequired, async (req, res) => {
  try {
    const newTask = await opsTasksStore.addOpsTask(req.body);
    res.status(201).json(newTask);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Atualizar tarefa
router.put('/:id', authRequired, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updated = await opsTasksStore.updateOpsTask(id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Deletar tarefa
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const removed = await opsTasksStore.deleteOpsTask(id);
    res.json(removed);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
