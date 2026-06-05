const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const db = require('./db');

// Importar rotas
const authRoutes = require('./routes/auth.routes');
const ceoRoutes = require('./routes/ceo.routes');
const cooRoutes = require('./routes/coo.routes');
const filesRoutes = require('./routes/files.routes');
const proposalsRoutes = require('./routes/proposals.routes');
const usersRoutes = require('./routes/users.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globais
app.use(cors({
  origin: [
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://127.0.0.1:5501',
    'http://localhost:5501',
    'http://127.0.0.1:3000',
    'http://localhost:3000'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging de requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'DevLizard Backend API'
  });
});

// Registrar rotas
app.use('/api/auth', authRoutes);
app.use('/api/ceo', ceoRoutes);
app.use('/api/coo', cooRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/proposals', proposalsRoutes);
app.use('/api/users', usersRoutes);

// Servir uploads (avatars/arquivos)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../../docs')));

// Fallback simples para a pÃ¡gina inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../docs/index.html'));
});

// Compat: permitir /auth/login (sem .html)
app.get('/auth/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../../docs/auth/login.html'));
});

// Compat: shared pages sem extensao
app.get('/shared/pages/decisions', (req, res) => {
  res.sendFile(path.join(__dirname, '../../docs/shared/pages/decisions.html'));
});

app.get('/shared/pages/roadmap-view', (req, res) => {
  res.sendFile(path.join(__dirname, '../../docs/shared/pages/roadmap-view.html'));
});

app.get('/shared/pages/profile', (req, res) => {
  res.sendFile(path.join(__dirname, '../../docs/shared/pages/profile.html'));
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ 
      error: 'Arquivo muito grande. Tamanho máximo: 10MB' 
    });
  }
  
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: err.message 
  });
});

// Inicializar servidor
async function startServer() {
  try {
    // Inicializar banco de dados
    await db.initialize();
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('');
      console.log('🦎 ========================================');
      console.log('🦎 DevLizard Backend API');
      console.log('🦎 ========================================');
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log('');
      console.log('📌 Endpoints disponíveis:');
      console.log('   POST   /api/auth/login');
      console.log('   GET    /api/ceo/notes');
      console.log('   POST   /api/ceo/notes');
      console.log('   PUT    /api/ceo/notes/:id');
      console.log('   DELETE /api/ceo/notes/:id');
      console.log('   GET    /api/ceo/decisions');
      console.log('   POST   /api/ceo/decisions');
      console.log('   PUT    /api/ceo/decisions/:id');
      console.log('   DELETE /api/ceo/decisions/:id');
      console.log('   GET    /api/ceo/risks');
      console.log('   POST   /api/ceo/risks');
      console.log('   PUT    /api/ceo/risks/:id');
      console.log('   DELETE /api/ceo/risks/:id');
      console.log('   GET    /api/ceo/ops-report');
      console.log('   GET    /api/coo/tasks');
      console.log('   POST   /api/coo/tasks');
      console.log('   PUT    /api/coo/tasks/:id');
      console.log('   PATCH  /api/coo/tasks/:id/move');
      console.log('   DELETE /api/coo/tasks/:id');
      console.log('   POST   /api/files/forward');
      console.log('   GET    /api/files/inbox');
      console.log('   GET    /api/files/:id/download');
      console.log('   PATCH  /api/files/:id/read');
      console.log('   DELETE /api/files/:id');
      console.log('   GET    /api/users/me');
      console.log('   PATCH  /api/users/me');
      console.log('   POST   /api/users/me/avatar');
      console.log('   POST   /api/proposals');
      console.log('   GET    /api/proposals/sent');
      console.log('   GET    /api/proposals/inbox');
      console.log('   PATCH  /api/proposals/:id/decide');
      console.log('   DELETE /api/proposals/:id');
      console.log('');
      console.log('🦎 ========================================');
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();
