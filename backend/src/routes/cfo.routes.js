const express = require('express');
const db = require('../db');
const githubStore = require('../store/githubStore');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired);
router.use(requireRole(['cfo']));

const STORAGE_KEY = 'dl_api_cfo_revenue_v1';

async function readRepoRevenue() {
  const data = await githubStore.getStorage(STORAGE_KEY, []);
  return Array.isArray(data) ? data : [];
}

async function writeRepoRevenue(list, message) {
  await githubStore.setStorage(STORAGE_KEY, list, message || 'Update revenue');
}

async function getRevenuePreferRepo() {
  try {
    const repoList = await readRepoRevenue();
    if (repoList.length) return repoList;
    const sqliteList = await db.all('SELECT * FROM revenue ORDER BY date DESC');
    if (sqliteList.length) {
      try {
        await writeRepoRevenue(sqliteList, 'Sync revenue from sqlite');
      } catch (_) {}
    }
    return sqliteList;
  } catch (_) {
    return await db.all('SELECT * FROM revenue ORDER BY date DESC');
  }
}

// GET /api/cfo/revenue
router.get('/revenue', async (req, res) => {
  try {
    const revenue = await getRevenuePreferRepo();
    res.json(revenue);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar receita' });
  }
});

module.exports = router;
