const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db');
const githubStore = require('../store/githubStore');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

const STORAGE_KEY = 'dl_api_files_messages_v1';

const nowSeconds = () => Math.floor(Date.now() / 1000);

async function readRepoMessages() {
  const data = await githubStore.getStorage(STORAGE_KEY, []);
  return Array.isArray(data) ? data : [];
}

async function writeRepoMessages(list, message) {
  await githubStore.setStorage(STORAGE_KEY, list, message || 'Update messages');
}

async function getAllMessagesPreferRepo() {
  try {
    const repoList = await readRepoMessages();
    if (repoList.length) return repoList;
    const sqliteList = await db.all('SELECT * FROM messages ORDER BY createdAt DESC');
    if (sqliteList.length) {
      try {
        await writeRepoMessages(sqliteList, 'Sync messages from sqlite');
      } catch (_) {}
    }
    return sqliteList;
  } catch (_) {
    return await db.all('SELECT * FROM messages ORDER BY createdAt DESC');
  }
}

// Configurar pasta de uploads
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log('✅ Pasta uploads/ criada');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueName = crypto.randomUUID() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'text/csv'
    ];
    if (allowedMimes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido'));
  }
});

router.use(authRequired);

// POST /api/files/forward
router.post('/forward', upload.single('file'), async (req, res) => {
  try {
    const { toRole, note } = req.body;
    const fromRole = req.user.role;

    if (!toRole) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'toRole é obrigatório' });
    }

    const validRoles = ['ceo', 'cfo', 'cto', 'cmo', 'coo', 'comercial'];
    if (!validRoles.includes(toRole)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'toRole inválido' });
    }

    const createdAt = nowSeconds();

    try {
      const list = await readRepoMessages();
      const nextId = list.length ? Math.max(...list.map(m => Number(m.id) || 0)) + 1 : createdAt;
      const message = {
        id: nextId,
        fromRole,
        toRole,
        note: note || '',
        originalName: req.file ? req.file.originalname : null,
        storedName: req.file ? req.file.filename : null,
        mimeType: req.file ? req.file.mimetype : null,
        size: req.file ? req.file.size : 0,
        read: 0,
        createdAt,
        updatedAt: createdAt,
      };
      list.unshift(message);
      await writeRepoMessages(list, `Add message ${message.id}`);
      return res.status(201).json({ message: 'Arquivo encaminhado com sucesso', data: message });
    } catch (_) {
      const result = await db.run(
        `INSERT INTO messages (fromRole, toRole, note, originalName, storedName, mimeType, size, read)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          fromRole,
          toRole,
          note || '',
          req.file ? req.file.originalname : null,
          req.file ? req.file.filename : null,
          req.file ? req.file.mimetype : null,
          req.file ? req.file.size : 0
        ]
      );

      const message = await db.get('SELECT * FROM messages WHERE id = ?', [result.id]);
      return res.status(201).json({ message: 'Arquivo encaminhado com sucesso', data: message });
    }
  } catch (error) {
    console.error('Erro ao encaminhar arquivo:', error);
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    res.status(500).json({ error: 'Erro ao encaminhar arquivo' });
  }
});

// GET /api/files/inbox
router.get('/inbox', async (req, res) => {
  try {
    const userRole = req.user.role;
    const messages = await getAllMessagesPreferRepo();
    const filtered = messages
      .filter(m => m.toRole === userRole)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    res.json(filtered);
  } catch (error) {
    console.error('Erro ao buscar inbox:', error);
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
});

// GET /api/files/:id/download
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    let message = null;
    try {
      const list = await readRepoMessages();
      message = list.find(m => String(m.id) === String(id)) || null;
    } catch (_) {}

    if (!message) {
      message = await db.get('SELECT * FROM messages WHERE id = ?', [id]);
    }

    if (!message) return res.status(404).json({ error: 'Arquivo não encontrado' });
    if (message.toRole !== userRole) return res.status(403).json({ error: 'Acesso negado' });

    const filePath = path.join(UPLOAD_DIR, message.storedName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo físico não encontrado' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${message.originalName}"`);
    res.setHeader('Content-Type', message.mimeType);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Erro ao fazer download:', error);
    res.status(500).json({ error: 'Erro ao fazer download do arquivo' });
  }
});

// PATCH /api/files/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    try {
      const list = await readRepoMessages();
      const idx = list.findIndex(m => String(m.id) === String(id));
      if (idx === -1) throw new Error('repo_not_found');
      const message = list[idx];
      if (message.toRole !== userRole) return res.status(403).json({ error: 'Acesso negado' });
      const updated = { ...message, read: 1, updatedAt: nowSeconds() };
      list[idx] = updated;
      await writeRepoMessages(list, `Read message ${id}`);
      return res.json(updated);
    } catch (_) {
      const message = await db.get('SELECT * FROM messages WHERE id = ?', [id]);
      if (!message) return res.status(404).json({ error: 'Mensagem não encontrada' });
      if (message.toRole !== userRole) return res.status(403).json({ error: 'Acesso negado' });
      await db.run('UPDATE messages SET read = 1 WHERE id = ?', [id]);
      const updated = await db.get('SELECT * FROM messages WHERE id = ?', [id]);
      return res.json(updated);
    }
  } catch (error) {
    console.error('Erro ao marcar como lida:', error);
    res.status(500).json({ error: 'Erro ao atualizar mensagem' });
  }
});

// DELETE /api/files/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    let message = null;
    let fromRepo = false;
    try {
      const list = await readRepoMessages();
      const idx = list.findIndex(m => String(m.id) === String(id));
      if (idx !== -1) {
        message = list[idx];
        if (message.toRole !== userRole && message.fromRole !== userRole) {
          return res.status(403).json({ error: 'Acesso negado' });
        }
        list.splice(idx, 1);
        await writeRepoMessages(list, `Delete message ${id}`);
        fromRepo = true;
      }
    } catch (_) {}

    if (!message) {
      message = await db.get('SELECT * FROM messages WHERE id = ?', [id]);
      if (!message) return res.status(404).json({ error: 'Mensagem não encontrada' });
      if (message.toRole !== userRole && message.fromRole !== userRole) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      await db.run('DELETE FROM messages WHERE id = ?', [id]);
    }

    if (message.storedName) {
      const filePath = path.join(UPLOAD_DIR, message.storedName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    res.json({ message: 'Arquivo deletado com sucesso', source: fromRepo ? 'repo' : 'sqlite' });
  } catch (error) {
    console.error('Erro ao deletar arquivo:', error);
    res.status(500).json({ error: 'Erro ao deletar arquivo' });
  }
});

module.exports = router;
