// Proteção de acesso (middleware simples)
const auth = localStorage.getItem('auth');
const role = localStorage.getItem('role');

if (!auth) {
  window.location.href = '../index.html';
}

const pathRole = window.location.pathname.split('/')[1];

if (pathRole !== role) {
  window.location.href = `../${role}/index.html`;
}
