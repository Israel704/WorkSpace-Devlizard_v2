require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const db = require('./db');
// ...existing code...

// Importar rotas
const authRoutes = require('./routes/auth.routes');
const ceoRoutes = require('./routes/ceo.routes');
const cooRoutes = require('./routes/coo.routes');

const filesRoutes = require('./routes/files.routes');
const proposalsRoutes = require('./routes/proposals.routes');
const usersRoutes = require('./routes/users.routes');
const clientsRoutes = require('./routes/clients.routes');
const projectsRoutes = require('./routes/projects.routes');
const opsTasksRoutes = require('./routes/opsTasks.routes');

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
app.use('/api/clients', clientsRoutes);


app.use('/api/projects', projectsRoutes);
app.use('/api/ops-tasks', opsTasksRoutes);

// Compat: shared pages index.html (mesmo não existindo, evita erro de navegação)
app.get('/shared/pages/index', (req, res) => {
  res.redirect('/');
});
app.get('/shared/pages/index.html', (req, res) => {
  res.redirect('/');
});

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


// Compat: shared pages sem extensao (.html)
const sharedPages = [
  'clients',
  'commercial-projects',
  'decisions',
  'instructions',
  'profile',
  'roadmap-view',
];
sharedPages.forEach(page => {
  app.get(`/shared/pages/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, `../../docs/shared/pages/${page}.html`));
  });
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
      console.log('🦎 DevLizard Backend API');
      console.log('------------------------------');
      console.log(`Acesse: http://localhost:${PORT}`);
      console.log('');
      console.log('Perfis de acesso:');
      console.log('  CEO:        admin@devlizard.com / 123456');
      console.log('  COO:        coo@devlizard.com / 123456');
      console.log('  CFO:        cfo@devlizard.com / 123456');
      console.log('  CTO:        cto@devlizard.com / 123456');
      console.log('  CMO:        cmo@devlizard.com / 123456');
      console.log('  Comercial:  comercial@devlizard.com / 123456');
      console.log('------------------------------');
    });
    
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();
