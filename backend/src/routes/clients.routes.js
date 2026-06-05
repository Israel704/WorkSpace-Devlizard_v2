const express = require('express');
const { authRequired } = require('../middleware/auth');
const githubStore = require('../store/githubStore');

const router = express.Router();

// Adiciona novo cliente
router.post('/', authRequired, async (req, res) => {
  try {
    const { name, email, company, documentId, contact, leadSource, responsibleRole, responsibleName, relationshipStatus } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name é obrigatório' });
    }
    // Monta objeto cliente com todos os campos recebidos
    const client = await githubStore.addClient({
      name,
      email: email || '',
      company: company || name,
      documentId: documentId || '',
      contact: contact || '',
      leadSource: leadSource || '',
      responsibleRole: responsibleRole || '',
      responsibleName: responsibleName || '',
      relationshipStatus: relationshipStatus || 'lead',
    });
    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lista todos os clientes
router.get('/', authRequired, async (req, res) => {
  try {
    const clients = await githubStore.getClients();
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
