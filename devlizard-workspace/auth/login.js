// Login logic com backend (JWT)
const selectedRole = localStorage.getItem((window.STORAGE_KEYS?.SELECTED_ROLE) || 'selectedRole');
const roleInfo = document.getElementById('roleInfo');
const form = document.getElementById('loginForm');

const API_BASE = 'http://localhost:3000/api';

if (!selectedRole) {
  window.location.href = '../index.html';
}

if (window.App?.safeText) {
  window.App.safeText(roleInfo, `Área selecionada: ${selectedRole.toUpperCase()}`);
} else {
  roleInfo.textContent = `Área selecionada: ${selectedRole.toUpperCase()}`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const user = document.getElementById('user')?.value.trim() || '';
  const pass = document.getElementById('pass')?.value.trim() || '';
  const submitBtn = form.querySelector('button[type="submit"]');

  if (!user || !pass) {
    alert('Preencha usuário e senha.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Autenticando...';

  try {
    const data = await (window.App?.apiFetch
      ? window.App.apiFetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user, password: pass, role: selectedRole })
        })
      : (async () => {
          const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user, password: pass, role: selectedRole })
          });
          const json = await response.json();
          if (!response.ok) throw new Error(json.error || 'Falha ao autenticar');
          return json;
        })()
    );

    // Guarda sessão + token JWT
    const K = window.STORAGE_KEYS || {};
    localStorage.setItem(K.AUTH || 'auth', 'true');
    localStorage.setItem(K.ROLE || 'role', data.user?.role || selectedRole);
    localStorage.setItem(K.USER || 'user', data.user?.email || user);
    localStorage.setItem(K.TOKEN || 'token', data.token);

    window.location.href = `../${selectedRole}/index.html`;
  } catch (err) {
    alert(err.message || 'Erro ao autenticar');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Entrar';
  }
});
