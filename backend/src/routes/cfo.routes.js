const express = require('express');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação e verificação de role em todas as rotas
router.use(authRequired);
router.use(requireRole(['cfo']));

// ==================== REVENUE ====================

// GET /api/cfo/revenue
router.get('/revenue', async (req, res) => {
  try {
    const revenue = await db.all('SELECT * FROM revenue ORDER BY date DESC');
    res.json(revenue);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar receita' });
  }
});

module.exports = router;