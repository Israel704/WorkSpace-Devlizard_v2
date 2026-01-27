const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validação básica
    if (!email || !password || !role) {
      return res.status(400).json({ 
        error: 'Email, password e role são obrigatórios' 
      });
    }

    // Buscar usuário
    const user = await db.get(
      'SELECT * FROM users WHERE email = ? AND role = ?',
      [email, role]
    );

    if (!user) {
      return res.status(401).json({ 
        error: 'Credenciais inválidas' 
      });
    }

    // Verificar senha
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ 
        error: 'Credenciais inválidas' 
      });
    }

    // Validar JWT_SECRET antes de gerar token
    if (!process.env.JWT_SECRET) {
      console.error('❌ ERRO CRÍTICO: JWT_SECRET não está configurado nas variáveis de ambiente');
      return res.status(500).json({ 
        error: 'Erro de configuração do servidor. Contate o administrador.' 
      });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Retornar resposta
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name || null,
        avatar: user.avatar || null
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
