const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'devlizard.db');

class Database {
  constructor() {
    this.db = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('❌ Erro ao conectar ao banco de dados:', err);
          reject(err);
        } else {
          console.log('✅ Conectado ao banco de dados SQLite');
          resolve();
        }
      });
    });
  }

  async initialize() {
    await this.connect();
    await this.createTables();
    await this.seedData();
  }

  createTables() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Tabela de usuários
        this.db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Tabela de notas do CEO
        this.db.run(`
          CREATE TABLE IF NOT EXISTS ceo_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            text TEXT NOT NULL,
            ownerRole TEXT DEFAULT 'ceo',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Tabela de decisões do CEO
        this.db.run(`
          CREATE TABLE IF NOT EXISTS ceo_decisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            text TEXT NOT NULL,
            ownerRole TEXT DEFAULT 'ceo',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Tabela de riscos do CEO
        this.db.run(`
          CREATE TABLE IF NOT EXISTS ceo_risks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            text TEXT NOT NULL,
            ownerRole TEXT DEFAULT 'ceo',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Tabela de mensagens/arquivos
        this.db.run(`
          CREATE TABLE IF NOT EXISTS messages (
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
          )
        `, (err) => {
          if (err) {
            console.error('❌ Erro ao criar tabelas:', err);
            reject(err);
          } else {
            console.log('✅ Tabelas criadas/verificadas com sucesso');
            resolve();
          }
        });
      });
    });
  }

  async seedData() {
    return new Promise((resolve, reject) => {
      // Definir usuários padrão para cada role
      const defaultUsers = [
        { email: 'admin@devlizard.com', password: '123456', role: 'ceo' },
        { email: 'coo@devlizard.com', password: 'coo2024', role: 'coo' },
        { email: 'cfo@devlizard.com', password: 'cfo2024', role: 'cfo' },
        { email: 'cto@devlizard.com', password: 'cto2024', role: 'cto' },
        { email: 'cmo@devlizard.com', password: 'cmo2024', role: 'cmo' },
        { email: 'comercial@devlizard.com', password: 'comercial2024', role: 'comercial' },
      ];

      // Verificar e criar usuários
      const createUsersRecursively = async (index) => {
        if (index >= defaultUsers.length) {
          console.log('✅ Todos os usuários padrão foram verificados/criados');
          resolve();
          return;
        }

        const user = defaultUsers[index];
        
        this.db.get('SELECT id FROM users WHERE email = ? AND role = ?', [user.email, user.role], async (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (!row) {
            try {
              const hashedPassword = await bcrypt.hash(user.password, 10);
              
              this.db.run(
                'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
                [user.email, hashedPassword, user.role],
                (err) => {
                  if (err) {
                    console.error(`❌ Erro ao criar usuário ${user.role}:`, err);
                    reject(err);
                  } else {
                    console.log(`✅ Usuário ${user.role} criado: ${user.email} / ${user.password}`);
                    createUsersRecursively(index + 1);
                  }
                }
              );
            } catch (error) {
              reject(error);
            }
          } else {
            console.log(`✅ Usuário ${user.role} já existe: ${user.email}`);
            createUsersRecursively(index + 1);
          }
        });
      };

      createUsersRecursively(0);
    });
  }

  // Métodos auxiliares para queries
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

// Singleton instance
const database = new Database();

module.exports = database;
