const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// Configurar pasta de uploads
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

// Criar diretório se não existir
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log('✅ Pasta uploads/ criada');
}

// Configurar Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Gerar nome único usando UUID
    const uniqueName = crypto.randomUUID() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB padrão
  },
  fileFilter: (req, file, cb) => {
    // Sanitização básica - aceitar apenas certos tipos
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

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

// Aplicar autenticação em todas as rotas
router.use(authRequired);

// POST /api/files/forward - Upload e encaminhamento de arquivo
router.post('/forward', upload.single('file'), async (req, res) => {
  try {
    const { toRole, note } = req.body;
    const fromRole = req.user.role;

    // Validação
    if (!toRole) {
      // Remover arquivo se validação falhar
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'toRole é obrigatório' });
    }

    const validRoles = ['ceo', 'cfo', 'cto', 'cmo', 'coo', 'comercial'];
    if (!validRoles.includes(toRole)) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'toRole inválido' });
    }

    // Registrar no banco
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

    res.status(201).json({
      message: 'Arquivo encaminhado com sucesso',
      data: message
    });

  } catch (error) {
    console.error('Erro ao encaminhar arquivo:', error);
    
    // Remover arquivo em caso de erro
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Erro ao remover arquivo:', unlinkError);
      }
    }
    
    res.status(500).json({ error: 'Erro ao encaminhar arquivo' });
  }
});

// GET /api/files/inbox - Listar mensagens recebidas
router.get('/inbox', async (req, res) => {
  try {
    const userRole = req.user.role;

    const messages = await db.all(
      'SELECT * FROM messages WHERE toRole = ? ORDER BY createdAt DESC',
      [userRole]
    );

    res.json(messages);
  } catch (error) {
    console.error('Erro ao buscar inbox:', error);
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
});

// GET /api/files/:id/download - Download de arquivo
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    // Buscar mensagem
    const message = await db.get('SELECT * FROM messages WHERE id = ?', [id]);

    if (!message) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    // Verificar permissão (usuário deve ser o destinatário)
    if (message.toRole !== userRole) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Verificar se arquivo existe
    const filePath = path.join(UPLOAD_DIR, message.storedName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo físico não encontrado' });
    }

    // Fazer streaming do arquivo
    res.setHeader('Content-Disposition', `attachment; filename="${message.originalName}"`);
    res.setHeader('Content-Type', message.mimeType);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Erro ao fazer download:', error);
    res.status(500).json({ error: 'Erro ao fazer download do arquivo' });
  }
});

// PATCH /api/files/:id/read - Marcar como lida
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    // Verificar se mensagem pertence ao usuário
    const message = await db.get('SELECT * FROM messages WHERE id = ?', [id]);

    if (!message) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }

    if (message.toRole !== userRole) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Marcar como lida
    await db.run('UPDATE messages SET read = 1 WHERE id = ?', [id]);

    const updated = await db.get('SELECT * FROM messages WHERE id = ?', [id]);
    res.json(updated);

  } catch (error) {
    console.error('Erro ao marcar como lida:', error);
    res.status(500).json({ error: 'Erro ao atualizar mensagem' });
  }
});

// DELETE /api/files/:id - Deletar mensagem/arquivo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    // Buscar mensagem
    const message = await db.get('SELECT * FROM messages WHERE id = ?', [id]);

    if (!message) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }

    // Verificar permissão (destinatário ou remetente podem deletar)
    if (message.toRole !== userRole && message.fromRole !== userRole) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Deletar arquivo físico se existir
    if (message.storedName) {
      const filePath = path.join(UPLOAD_DIR, message.storedName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Deletar do banco
    await db.run('DELETE FROM messages WHERE id = ?', [id]);

    res.json({ message: 'Arquivo deletado com sucesso' });

  } catch (error) {
    console.error('Erro ao deletar arquivo:', error);
    res.status(500).json({ error: 'Erro ao deletar arquivo' });
  }
});

module.exports = router;
