// forward.js - Envio de arquivos para outras roles via backend
(() => {
  const API_BASE = 'http://localhost:3000/api';

  const form = document.getElementById('forward-form');
  const toRoleEl = document.getElementById('to-role');
  const noteEl = document.getElementById('forward-note');
  const fileEl = document.getElementById('forward-file');
  const statusEl = document.getElementById('forward-status');
  const submitBtn = document.getElementById('forward-submit');

  if (!form || !toRoleEl || !fileEl || !statusEl || !submitBtn) return;

  const allowedRoles = ['ceo', 'cfo', 'cto', 'cmo', 'coo', 'comercial'];

  const setStatus = (msg, type = 'info') => {
    statusEl.textContent = msg;
    statusEl.style.display = 'block';
    statusEl.style.color = type === 'error' ? '#f85149' : '#6ad1b9';
  };

  const clearStatus = () => {
    statusEl.style.display = 'none';
    statusEl.textContent = '';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    clearStatus();

    const token = localStorage.getItem('token');
    if (!token) {
      setStatus('Token não encontrado. Faça login para obter acesso.', 'error');
      return;
    }

    const toRole = (toRoleEl.value || '').toLowerCase();
    const note = noteEl.value || '';
    const file = fileEl.files[0];

    if (!allowedRoles.includes(toRole)) {
      setStatus('Selecione uma role válida.', 'error');
      return;
    }

    if (!file) {
      setStatus('Selecione um arquivo para enviar.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('toRole', toRole);
    formData.append('note', note.trim());
    formData.append('file', file);

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    try {
      const response = await fetch(`${API_BASE}/files/forward`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao encaminhar arquivo');
      }

      setStatus('Arquivo enviado com sucesso!', 'success');
      form.reset();
    } catch (err) {
      setStatus(err.message || 'Erro ao enviar arquivo', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar';
    }
  });
})();
