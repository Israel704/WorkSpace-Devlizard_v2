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
          resolve();
        }
      });
    });
  }

  async initialize() {
    await this.connect();
    await this.createTables();
    await this.ensureUserColumns();
    await this.seedData();
  }

  createTables() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // ...existing code...
        this.db.run(`
          CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status)
        `, (err) => {
          if (err) {
            console.error('❌ Erro ao criar tabelas:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  }

  ensureUserColumns() {
    return new Promise((resolve, reject) => {
      this.db.all('PRAGMA table_info(users)', (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        const existing = new Set((rows || []).map((row) => row.name));
        const missing = [];

        if (!existing.has('name')) missing.push({ name: 'name', type: 'TEXT' });
        if (!existing.has('avatar')) missing.push({ name: 'avatar', type: 'TEXT' });

        if (!missing.length) {
          resolve();
          return;
        }

        const addNext = (index) => {
          if (index >= missing.length) {
            resolve();
            return;
          }

          const column = missing[index];
          this.db.run(
            `ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`,
            (alterErr) => {
              if (alterErr) {
                reject(alterErr);
                return;
              }
              addNext(index + 1);
            }
          );
        };

        addNext(0);
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
                    createUsersRecursively(index + 1);
                  }
                }
              );
            } catch (error) {
              reject(error);
            }
          } else {
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
