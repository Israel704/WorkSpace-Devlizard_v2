// Login logic com backend (JWT)
const selectedRole = localStorage.getItem('selectedRole');
const roleInfo = document.getElementById('roleInfo');
const form = document.getElementById('loginForm');

const API_BASE = 'http://localhost:3000/api';

if (!selectedRole) {
  window.location.href = '../index.html';
}

roleInfo.textContent = `Área selecionada: ${selectedRole.toUpperCase()}`;

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const user = document.getElementById('user').value.trim();
  const pass = document.getElementById('pass').value.trim();
  const submitBtn = form.querySelector('button[type="submit"]');

  if (!user || !pass) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Autenticando...';

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user,
        password: pass,
        role: selectedRole,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Falha ao autenticar');
    }

    // Guarda sessão + token JWT
    localStorage.setItem('auth', 'true');
    localStorage.setItem('role', data.user?.role || selectedRole);
    localStorage.setItem('user', data.user?.email || user);
    localStorage.setItem('token', data.token);

    window.location.href = `../${selectedRole}/index.html`;
  } catch (err) {
    alert(err.message || 'Erro ao autenticar');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Entrar';
  }
});
