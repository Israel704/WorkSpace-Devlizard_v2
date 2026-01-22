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
      // Verificar se já existe o usuário admin
      this.db.get('SELECT id FROM users WHERE email = ?', ['admin@devlizard.com'], async (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          // Criar usuário admin
          const hashedPassword = await bcrypt.hash('123456', 10);
          
          this.db.run(
            'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
            ['admin@devlizard.com', hashedPassword, 'ceo'],
            (err) => {
              if (err) {
                console.error('❌ Erro ao criar usuário admin:', err);
                reject(err);
              } else {
                console.log('✅ Usuário admin criado: admin@devlizard.com / 123456');
                resolve();
              }
            }
          );
        } else {
          console.log('✅ Usuário admin já existe');
          resolve();
        }
      });
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
