const express = require('express');
const { authRequired } = require('../middleware/auth');
const githubStore = require('../store/githubStore');

const router = express.Router();

router.use(authRequired);

router.get('/:key', async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.key || '');
    const value = await githubStore.getStorage(key, null);
    res.json(value === undefined ? null : value);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:key', async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.key || '');
    const value = Object.prototype.hasOwnProperty.call(req.body || {}, 'value')
      ? req.body.value
      : req.body;
    await githubStore.setStorage(key, value, `Update storage ${key}`);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
