# DevLizard Backend API

Backend MVP para o projeto DevLizard Workspace - Sistema de gestão C-Level com autenticação JWT, CRUD e encaminhamento de arquivos.

## 🚀 Tecnologias

- **Node.js** (CommonJS)
- **Express** - Framework web
- **SQLite3** - Banco de dados leve
- **JWT** - Autenticação via tokens
- **Multer** - Upload de arquivos
- **bcryptjs** - Hash de senhas
- **CORS** - Controle de acesso

## 📁 Estrutura do Projeto

```
backend/
├── src/
│   ├── server.js              # Servidor principal
│   ├── db.js                  # Configuração SQLite + migrations
│   ├── middleware/
│   │   └── auth.js            # Middleware de autenticação JWT
│   └── routes/
│       ├── auth.routes.js     # Login e autenticação
│       ├── ceo.routes.js      # CRUD Notes/Decisions/Risks
│       └── files.routes.js    # Upload/Download de arquivos
├── uploads/                   # Arquivos enviados (criado automaticamente)
├── devlizard.db              # Banco SQLite (criado automaticamente)
├── .env                       # Variáveis de ambiente
├── .gitignore
├── package.json
└── README.md
```

## ⚙️ Instalação

### 1. Navegar para a pasta backend

```bash
cd backend
```

### 2. Instalar dependências

```bash
npm install
```

Dependências instaladas:
- `express` - Framework web
- `sqlite3` - Banco de dados
- `jsonwebtoken` - Tokens JWT
- `cors` - CORS policy
- `multer` - Upload multipart
- `dotenv` - Variáveis de ambiente
- `bcryptjs` - Hash de senhas

### 3. Configurar variáveis de ambiente

O arquivo `.env` já está criado com:

```env
PORT=3000
JWT_SECRET=devlizard_secret_key_change_in_production_2026
MAX_FILE_SIZE=10485760
```

⚠️ **IMPORTANTE**: Altere `JWT_SECRET` em produção!

### 4. Iniciar servidor

```bash
npm run dev
```

ou

```bash
node src/server.js
```

O servidor iniciará em `http://localhost:3000` e:
- ✅ Criará o banco de dados automaticamente
- ✅ Criará as tabelas necessárias
- ✅ Inserirá usuário admin padrão

## 👤 Usuários Padrão (Por Role)

| Role | Email | Senha | 
|------|-------|-------|
| CEO | `admin@devlizard.com` | `123456` |
| COO | `coo@devlizard.com` | `coo2024` |
| CFO | `cfo@devlizard.com` | `cfo2024` |
| CTO | `cto@devlizard.com` | `cto2024` |
| CMO | `cmo@devlizard.com` | `cmo2024` |
| Comercial | `comercial@devlizard.com` | `comercial2024` |

## 📡 Endpoints Disponíveis

### 🔐 Autenticação

#### **POST** `/api/auth/login`

Fazer login e obter token JWT.

**Body:**
```json
{
  "email": "admin@devlizard.com",
  "password": "123456",
  "role": "ceo"
}
```

**Resposta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@devlizard.com",
    "role": "ceo"
  }
}
```

**Exemplo CURL:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@devlizard.com\",\"password\":\"123456\",\"role\":\"ceo\"}"
```

---

### 📝 CEO - Notes

> 🔒 **Requer autenticação:** Adicionar header `Authorization: Bearer {token}`

#### **GET** `/api/ceo/notes`

Listar todas as notas.

```bash
curl http://localhost:3000/api/ceo/notes \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

#### **POST** `/api/ceo/notes`

Criar nova nota.

**Body:**
```json
{
  "title": "Reunião Q1",
  "text": "Discutir estratégias para o próximo trimestre"
}
```

```bash
curl -X POST http://localhost:3000/api/ceo/notes \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Reunião Q1\",\"text\":\"Discutir estratégias\"}"
```

#### **PUT** `/api/ceo/notes/:id`

Atualizar nota existente.

```bash
curl -X PUT http://localhost:3000/api/ceo/notes/1 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Reunião Q1 - Atualizado\",\"text\":\"Nova descrição\"}"
```

#### **DELETE** `/api/ceo/notes/:id`

Deletar nota.

```bash
curl -X DELETE http://localhost:3000/api/ceo/notes/1 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

### 📊 CEO - Decisions

> Mesma estrutura de endpoints das Notes

- **GET** `/api/ceo/decisions`
- **POST** `/api/ceo/decisions`
- **PUT** `/api/ceo/decisions/:id`
- **DELETE** `/api/ceo/decisions/:id`

---

### ⚠️ CEO - Risks

> Mesma estrutura de endpoints das Notes

- **GET** `/api/ceo/risks`
- **POST** `/api/ceo/risks`
- **PUT** `/api/ceo/risks/:id`
- **DELETE** `/api/ceo/risks/:id`

---

### 📎 Files - Encaminhamento de Arquivos

> 🔒 **Todas as rotas requerem autenticação**

#### **POST** `/api/files/forward`

Upload e encaminhar arquivo para outra role.

**Content-Type:** `multipart/form-data`

**Campos:**
- `toRole` - Role de destino (ceo, cfo, cto, cmo, coo, comercial)
- `note` - Nota/mensagem (opcional)
- `file` - Arquivo a ser enviado

**Exemplo CURL:**
```bash
curl -X POST http://localhost:3000/api/files/forward \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -F "toRole=cfo" \
  -F "note=Revisar este relatório" \
  -F "file=@/caminho/para/arquivo.pdf"
```

**Resposta:**
```json
{
  "message": "Arquivo encaminhado com sucesso",
  "data": {
    "id": 1,
    "fromRole": "ceo",
    "toRole": "cfo",
    "note": "Revisar este relatório",
    "originalName": "relatorio.pdf",
    "storedName": "abc123-uuid.pdf",
    "mimeType": "application/pdf",
    "size": 45678,
    "read": 0,
    "createdAt": "2026-01-22T10:30:00.000Z"
  }
}
```

#### **GET** `/api/files/inbox`

Listar arquivos recebidos pelo usuário autenticado.

```bash
curl http://localhost:3000/api/files/inbox \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

#### **GET** `/api/files/:id/download`

Fazer download de arquivo específico.

```bash
curl http://localhost:3000/api/files/1/download \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  --output arquivo_baixado.pdf
```

#### **PATCH** `/api/files/:id/read`

Marcar mensagem como lida.

```bash
curl -X PATCH http://localhost:3000/api/files/1/read \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

#### **DELETE** `/api/files/:id`

Deletar mensagem/arquivo (apenas remetente ou destinatário).

```bash
curl -X DELETE http://localhost:3000/api/files/1 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## 🗄️ Estrutura do Banco de Dados

### Tabela `users`

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela `ceo_notes`

```sql
CREATE TABLE ceo_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  ownerRole TEXT DEFAULT 'ceo',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela `ceo_decisions`

```sql
CREATE TABLE ceo_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  ownerRole TEXT DEFAULT 'ceo',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela `ceo_risks`

```sql
CREATE TABLE ceo_risks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  ownerRole TEXT DEFAULT 'ceo',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela `messages`

```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fromRole TEXT NOT NULL,
  toRole TEXT NOT NULL,
  note TEXT,
  originalName TEXT,
  storedName TEXT,
  mimeType TEXT,
  size INTEGER,
  read INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔒 Segurança

- ✅ **Autenticação JWT** - Tokens expiram em 24h
- ✅ **Hash de senhas** - bcryptjs com salt rounds
- ✅ **CORS configurado** - Apenas origens permitidas
- ✅ **Validação de payloads** - Sanitização básica
- ✅ **Limite de upload** - Máximo 10MB por arquivo
- ✅ **Tipos de arquivo** - Whitelist de MIME types
- ✅ **Nomes seguros** - UUID para arquivos armazenados

### Tipos de Arquivo Permitidos

- PDF
- Word (.doc, .docx)
- Excel (.xls, .xlsx)
- Imagens (JPEG, PNG, GIF)
- Texto (.txt, .csv)

---

## 🧪 Testando a API

### 1. Fazer Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@devlizard.com","password":"123456","role":"ceo"}'
```

Copie o `token` da resposta.

### 2. Criar uma Nota

```bash
curl -X POST http://localhost:3000/api/ceo/notes \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"title":"Minha primeira nota","text":"Conteúdo da nota"}'
```

### 3. Listar Notas

```bash
curl http://localhost:3000/api/ceo/notes \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### 4. Enviar Arquivo

```bash
curl -X POST http://localhost:3000/api/files/forward \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -F "toRole=cfo" \
  -F "note=Teste de envio" \
  -F "file=@teste.pdf"
```

---

## 🐛 Debug

### Ver logs do servidor

Os logs mostram cada requisição:
```
2026-01-22T10:30:00.000Z - POST /api/auth/login
2026-01-22T10:31:00.000Z - GET /api/ceo/notes
```

### Verificar banco de dados

Você pode inspecionar o banco usando SQLite Browser ou CLI:

```bash
sqlite3 devlizard.db
```

```sql
.tables                    -- Listar tabelas
SELECT * FROM users;       -- Ver usuários
SELECT * FROM ceo_notes;   -- Ver notas
SELECT * FROM messages;    -- Ver mensagens
```

---

## 📦 Próximos Passos

Para integrar com o frontend:

1. **Atualizar o frontend** para fazer chamadas à API ao invés de usar IndexedDB
2. **Armazenar token JWT** no localStorage após login
3. **Adicionar header Authorization** em todas as requisições protegidas
4. **Implementar rotas para outras roles** (CFO, CTO, CMO, etc.)

### Exemplo de integração no frontend:

```javascript
// Login
async function login(email, password, role) {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role })
  });
  
  const data = await response.json();
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
}

// Criar nota
async function createNote(title, text) {
  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:3000/api/ceo/notes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ title, text })
  });
  
  return await response.json();
}
```

---

## 📄 Licença

MIT

---

## 🦎 DevLizard Team

Backend MVP - Janeiro 2026
