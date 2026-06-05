require('dotenv').config();
const githubStore = require('./src/store/githubStore');

(async () => {
  try {
    await githubStore.createUser({
      email: 'cfo@devlizard.com',
      password: '123456',
      role: 'cfo',
      name: 'CFO',
      avatar: null
    });
    console.log('Usuário CFO criado no banco GitHub!');
  } catch (err) {
    console.error('Erro ao criar usuário:', err.message);
  }
})();
