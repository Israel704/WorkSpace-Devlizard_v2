// Gerenciador de Arquivos - Shared Module
const FilesManager = (() => {
  const API_BASE = 'http://localhost:3000/api/files';

  // Obter token do localStorage
  function getToken() {
    return localStorage.getItem('token');
  }

  // Enviar arquivo
  async function sendFile(toRole, file, note) {
    try {
      const formData = new FormData();
      formData.append('toRole', toRole);
      formData.append('file', file);
      if (note) {
        formData.append('note', note);
      }

      const data = await (window.App?.apiFetch
        ? window.App.apiFetch(`${API_BASE}/forward`, { method: 'POST', body: formData })
        : (async () => {
            const response = await fetch(`${API_BASE}/forward`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${getToken()}` },
              body: formData
            });
            if (!response.ok) {
              let errorMessage = 'Erro ao enviar arquivo';
              try {
                const error = await response.json();
                errorMessage = error.error || error.message || errorMessage;
              } catch (e) {
                errorMessage = `Erro ${response.status}: ${response.statusText}`;
              }
              throw new Error(errorMessage);
            }
            return await response.json();
          })()
      );
      return { success: true, message: 'Arquivo enviado com sucesso!', data };
    } catch (error) {
      console.error('Erro ao enviar arquivo:', error);
      return { success: false, message: error.message || 'Erro desconhecido' };
    }
  }

  // Carregar inbox (arquivos recebidos)
  async function loadInbox() {
    try {
      const messages = await (window.App?.apiFetch
        ? window.App.apiFetch(`${API_BASE}/inbox`, {})
        : (async () => {
            const response = await fetch(`${API_BASE}/inbox`, {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (!response.ok) throw new Error('Erro ao carregar inbox');
            return await response.json();
          })()
      );
      return { success: true, data: messages };
    } catch (error) {
      console.error('Erro ao carregar inbox:', error);
      return { success: false, message: error.message, data: [] };
    }
  }

  // Marcar como lida
  async function markAsRead(messageId) {
    try {
      const data = await (window.App?.apiFetch
        ? window.App.apiFetch(`${API_BASE}/${messageId}/read`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' } })
        : (async () => {
            const response = await fetch(`${API_BASE}/${messageId}/read`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
              }
            });
            if (!response.ok) throw new Error('Erro ao marcar como lida');
            return await response.json();
          })()
      );
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
      return { success: false, message: error.message };
    }
  }

  // Download de arquivo
  async function downloadFile(messageId, originalName) {
    try {
      const response = await (window.App?.apiFetch
        ? window.App.apiFetch(`${API_BASE}/${messageId}/download`, {})
        : fetch(`${API_BASE}/${messageId}/download`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${getToken()}` }
          })
      );

      if (!response || (response.status && !response.ok)) {
        throw new Error('Erro ao fazer download');
      }

      // Criar blob do arquivo
      const blob = await response.blob();

      // Criar URL de download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { success: true, message: 'Download iniciado' };
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      return { success: false, message: error.message };
    }
  }

  // Abrir arquivo (visualizar)
  async function openFile(messageId) {
    try {
      const response = await (window.App?.apiFetch
        ? window.App.apiFetch(`${API_BASE}/${messageId}/download`, {})
        : fetch(`${API_BASE}/${messageId}/download`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${getToken()}` }
          })
      );

      if (!response || (response.status && !response.ok)) {
        throw new Error('Erro ao abrir arquivo');
      }

      const blob = await response.blob();

      // Determinar tipo de arquivo
      const fileName = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'arquivo';
      const fileType = blob.type;

      // Se for PDF, imagem ou texto, abrir em nova aba
      if (fileType.includes('pdf') || fileType.includes('image') || fileType.includes('text') || fileType.includes('svg')) {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        return { success: true, message: 'Arquivo aberto' };
      } else {
        // Para outros tipos, fazer download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return { success: true, message: 'Download iniciado' };
      }
    } catch (error) {
      console.error('Erro ao abrir arquivo:', error);
      return { success: false, message: error.message };
    }
  }

  // Deletar arquivo
  async function deleteFile(messageId) {
    try {
      const result = await (window.App?.apiFetch
        ? window.App.apiFetch(`${API_BASE}/${messageId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } })
        : (async () => {
            const response = await fetch(`${API_BASE}/${messageId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
              }
            });
            if (!response.ok) throw new Error('Erro ao deletar arquivo');
            return { ok: true };
          })()
      );

      return { success: true, message: 'Arquivo deletado com sucesso' };
    } catch (error) {
      console.error('Erro ao deletar:', error);
      return { success: false, message: error.message };
    }
  }

  // Renderizar inbox
  function renderInbox(messages, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!messages || messages.length === 0) {
      const html = '<p style="color: var(--muted); text-align: center; padding: 20px;">Nenhum arquivo recebido</p>';
      if (window.App?.safeHTML) window.App.safeHTML(container, html); else container.innerHTML = html;
      return;
    }

    const htmlList = messages.map(msg => `
      <div style="
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 12px;
        margin-bottom: 12px;
        background-color: ${msg.read ? '#f9f9f9' : '#f0f7ff'};
      ">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
          <div>
            <strong style="font-size: 14px;">${msg.originalName || '(sem arquivo)'}</strong>
            <p style="color: var(--muted); font-size: 12px; margin: 4px 0 0 0;">De: <strong>${msg.fromRole.toUpperCase()}</strong></p>
            <p style="color: var(--muted); font-size: 12px; margin: 2px 0 0 0;">${new Date(msg.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <span style="background-color: ${msg.read ? '#e8e8e8' : '#007bff'}; color: white; padding: 4px 8px; border-radius: 3px; font-size: 11px;">
            ${msg.read ? 'Lido' : 'Novo'}
          </span>
        </div>

        ${msg.note ? `<p style="color: #555; font-size: 13px; margin: 8px 0; padding: 8px; background-color: #f5f5f5; border-left: 3px solid #007bff; border-radius: 2px;">${msg.note}</p>` : ''}

        <div style="display: flex; gap: 8px; margin-top: 10px;">
          ${msg.storedName ? `
            <button onclick="FilesManager.openFile(${msg.id})" style="
              padding: 6px 12px;
              background-color: #28a745;
              color: white;
              border: none;
              border-radius: 3px;
              cursor: pointer;
              font-size: 12px;
            ">Abrir</button>
            <button onclick="FilesManager.downloadFile(${msg.id}, '${msg.originalName}')" style="
              padding: 6px 12px;
              background-color: #17a2b8;
              color: white;
              border: none;
              border-radius: 3px;
              cursor: pointer;
              font-size: 12px;
            ">Download</button>
          ` : ''}
          <button onclick="FilesManager.deleteFile(${msg.id})" style="
            padding: 6px 12px;
            background-color: #dc3545;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
          ">Deletar</button>
        </div>
      </div>
    `).join('');
    if (window.App?.safeHTML) window.App.safeHTML(container, htmlList); else container.innerHTML = htmlList;
  }

  // Inicializar form de envio
  function initSendFileForm(formId, inboxContainerId, onSuccess) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const toRole = document.getElementById('toRole').value;
      const fileInput = document.getElementById('fileInput');
      const fileNote = document.getElementById('fileNote').value;

      if (!toRole || !fileInput.files[0]) {
        alert('Por favor, preencha todos os campos obrigatórios');
        return;
      }

      // Validar tamanho do arquivo (10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileInput.files[0].size > maxSize) {
        alert('Arquivo muito grande! Tamanho máximo: 10MB');
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';

      const result = await sendFile(toRole, fileInput.files[0], fileNote);

      if (result.success) {
        alert(result.message);
        form.reset();
        // Recarregar inbox
        const inboxResult = await loadInbox();
        if (inboxResult.success) {
          renderInbox(inboxResult.data, inboxContainerId);
        }
        if (onSuccess) onSuccess();
      } else {
        alert('Erro: ' + result.message);
        console.error('Detalhes do erro:', result);
      }

      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    });
  }

  // Carregar e exibir inbox
  async function loadAndDisplayInbox(inboxContainerId) {
    const result = await loadInbox();
    if (result.success) {
      renderInbox(result.data, inboxContainerId);
      return result.data;
    } else {
      const el = document.getElementById(inboxContainerId);
      if (el) {
        const html = '<p style="color: #d32f2f; text-align: center; padding: 20px;">Erro ao carregar arquivos</p>';
        if (window.App?.safeHTML) window.App.safeHTML(el, html); else el.innerHTML = html;
      }
      return [];
    }
  }

  // Expor as funções públicas
  return {
    sendFile,
    loadInbox,
    markAsRead,
    downloadFile,
    openFile,
    deleteFile,
    renderInbox,
    initSendFileForm,
    loadAndDisplayInbox
  };
})();
