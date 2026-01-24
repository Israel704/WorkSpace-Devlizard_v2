// Lógica de seleção de cargo
const buttons = document.querySelectorAll('[data-role]');

buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    const role = btn.dataset.role;

    // NÃO apagar tudo - só remover sessão
    const K = window.STORAGE_KEYS || {};
    localStorage.removeItem(K.SELECTED_ROLE || 'selectedRole');
    localStorage.removeItem(K.USER || 'user');
    localStorage.removeItem(K.ROLE || 'role');
    localStorage.removeItem(K.AUTH || 'auth');
    
    localStorage.setItem((K.SELECTED_ROLE || 'selectedRole'), role);

    window.location.href = 'auth/login.html';
  });
});
