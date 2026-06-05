require('dotenv').config();
const github = require('./src/githubClient');

(async () => {
  try {
    await github.createOrUpdateJson('data/users.json', [], 'Cria users.json vazio');
    console.log('Arquivo data/users.json criado no GitHub!');
  } catch (err) {
    console.error('Erro ao criar users.json:', err.message);
    process.exitCode = 1;
  }
})();
