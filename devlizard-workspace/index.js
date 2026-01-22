// Lógica de seleção de cargo
const buttons = document.querySelectorAll('[data-role]');

buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    const role = btn.dataset.role;

    // NÃO apagar tudo - só remover sessão
    localStorage.removeItem('selectedRole');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('auth');
    
    localStorage.setItem('selectedRole', role);

    window.location.href = 'auth/login.html';
  });
});
