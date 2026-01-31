const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db');
const githubStore = require('../store/githubStore');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

const PRESENCE_TTL_MS = 60 * 1000;
const ROLE_LIST = ['ceo', 'coo', 'cto', 'cfo', 'cmo', 'comercial'];
const presenceStore = new Map();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueName = `avatar_${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const avatarUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de imagem não permitido'));
  }
});

const normalizeString = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

// GET /api/users/me
router.get('/me', authRequired, async (req, res) => {
  try {
    try {
      const repoUser = await githubStore.getUserById(req.user.id);
      if (repoUser) {
        const { id, email, role, name, avatar } = repoUser;
        return res.json({ id, email, role, name, avatar });
      }
    } catch (_) {}

    const user = await db.get(
      'SELECT id, email, role, name, avatar FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// PATCH /api/users/me
router.patch('/me', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const name = normalizeString(req.body.name);
    const email = normalizeString(req.body.email);
    const password = normalizeString(req.body.password);

    const updates = [];
    const params = [];
    const repoUpdates = {};

    if (name) {
      updates.push('name = ?');
      params.push(name);
      repoUpdates.name = name;
    }

    if (email) {
      try {
        const users = await githubStore.getUsers();
        const exists = users.find(u => String(u.id) !== String(userId) && u.email === email);
        if (exists) {
          return res.status(409).json({ error: 'Login já está em uso' });
        }
      } catch (_) {}

      const existing = await db.get(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );
      if (existing) {
        return res.status(409).json({ error: 'Login já está em uso' });
      }
      updates.push('email = ?');
      params.push(email);
      repoUpdates.email = email;
    }

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      params.push(hashed);
      repoUpdates.password = hashed;
    }

    if (!updates.length) {
      return res.status(400).json({ error: 'Nenhuma alteração enviada' });
    }

    params.push(userId);

    try {
      const updatedRepo = await githubStore.updateUserById(userId, repoUpdates, `Update user ${userId}`);
      if (updatedRepo) {
        const { id, email: uEmail, role, name: uName, avatar } = updatedRepo;
        return res.json({ id, email: uEmail, role, name: uName, avatar });
      }
    } catch (_) {}

    await db.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await db.get(
      'SELECT id, email, role, name, avatar FROM users WHERE id = ?',
      [userId]
    );

    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// POST /api/users/me/avatar
router.post('/me/avatar', authRequired, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Imagem não enviada' });
    }

    const userId = req.user.id;
    const newAvatar = `/uploads/${req.file.filename}`;

    let currentAvatar = null;
    try {
      const repoUser = await githubStore.getUserById(userId);
      if (repoUser && repoUser.avatar) currentAvatar = repoUser.avatar;
    } catch (_) {}

    if (!currentAvatar) {
      const current = await db.get('SELECT avatar FROM users WHERE id = ?', [userId]);
      currentAvatar = current ? current.avatar : null;
    }

    if (currentAvatar) {
      const oldFile = path.join(UPLOAD_DIR, path.basename(currentAvatar));
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    }

    try {
      const updated = await githubStore.updateUserById(userId, { avatar: newAvatar }, `Update avatar ${userId}`);
      if (updated) return res.json({ avatar: newAvatar });
    } catch (_) {}

    await db.run('UPDATE users SET avatar = ? WHERE id = ?', [newAvatar, userId]);
    res.json({ avatar: newAvatar });
  } catch (error) {
    console.error('Erro ao atualizar avatar:', error);
    res.status(500).json({ error: 'Erro ao atualizar avatar' });
  }
});

// POST /api/users/presence
router.post('/presence', authRequired, (req, res) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (!role) {
    return res.status(400).json({ error: 'Role inválida' });
  }
  const lastSeen = Date.now();
  presenceStore.set(role, { lastSeen });
  res.json({ ok: true, role, lastSeen });
});

// GET /api/users/presence
router.get('/presence', authRequired, (req, res) => {
  const now = Date.now();
  const roles = {};
  ROLE_LIST.forEach((role) => {
    const entry = presenceStore.get(role);
    const lastSeen = entry ? entry.lastSeen : 0;
    roles[role] = {
      lastSeen,
      online: !!lastSeen && now - lastSeen <= PRESENCE_TTL_MS,
    };
  });
  res.json({ now, ttl: PRESENCE_TTL_MS, roles });
});

module.exports = router;
