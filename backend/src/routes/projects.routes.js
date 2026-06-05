const express = require('express');
const { authRequired } = require('../middleware/auth');
const githubStore = require('../store/githubStore');

const router = express.Router();

// Adiciona novo projeto
router.post('/', authRequired, async (req, res) => {
  try {
    const {
      clientId, title, description, techStack, acquisitionType, value, monthlyRental, rentalMonths, status
    } = req.body;
    if (!clientId || !title) {
      return res.status(400).json({ error: 'clientId e title são obrigatórios' });
    }
    const project = await githubStore.addProject({
      clientId,
      title,
      description: description || '',
      techStack: techStack || '',
      acquisitionType: acquisitionType || 'purchase',
      value: value || 0,
      monthlyRental: monthlyRental || 0,
      rentalMonths: rentalMonths || 0,
      status: status || 'Em análise técnica',
    });
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lista todos os projetos
router.get('/', authRequired, async (req, res) => {
  try {
    const projects = await githubStore.getProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
