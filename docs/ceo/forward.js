// forward.js - Envio de arquivos para outras roles via backend
(() => {
  const API_BASE = (window.App?.getApiBase ? window.App.getApiBase() : (window.API_BASE || ((window.location.port === '5500' || window.location.port === '5501') ? 'http://localhost:3000/api' : '/api')));

  const form = document.getElementById('forward-form');
  const toRoleEl = document.getElementById('to-role');
  const noteEl = document.getElementById('forward-note');
  const fileEl = document.getElementById('forward-file');
  const statusEl = document.getElementById('forward-status');
  const submitBtn = document.getElementById('forward-submit');

  if (!form || !toRoleEl || !fileEl || !statusEl || !submitBtn) return;

  const allowedRoles = ['ceo', 'cfo', 'cto', 'cmo', 'coo', 'comercial'];

  const setStatus = (msg, type = 'info') => {
    if (window.App?.safeText) window.App.safeText(statusEl, msg); else statusEl.textContent = msg;
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

    const token = localStorage.getItem((window.STORAGE_KEYS?.TOKEN) || 'token');
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
      const data = await (window.App?.apiFetch
        ? window.App.apiFetch(`${API_BASE}/files/forward`, { method: 'POST', body: formData })
        : (async () => {
            const response = await fetch(`${API_BASE}/files/forward`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            });
            const json = await response.json();
            if (!response.ok) throw new Error(json.error || 'Falha ao encaminhar arquivo');
            return json;
          })()
      );

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
