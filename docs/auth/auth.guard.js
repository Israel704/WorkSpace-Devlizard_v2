// Proteção de acesso (middleware simples)
const K = window.STORAGE_KEYS || {};
const auth = localStorage.getItem(K.AUTH || 'auth');
const role = localStorage.getItem(K.ROLE || 'role');

if (!auth) {
  window.location.href = '../index.html';
}

const pathRole = window.location.pathname.split('/')[1];

if (pathRole !== role) {
  window.location.href = `../${role}/index.html`;
}
