// Gestão de clientes do CFO (localStorage)
(function() {
  const CLIENTS_KEY = 'cfo_clients';
  let editingId = null;

  const formatDate = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString('pt-BR');
  };

  const loadClients = () => {
    try {
      const raw = localStorage.getItem(CLIENTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('Erro ao ler clientes:', err);
      return [];
    }
  };

  const saveClients = (clients) => {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  };

  const resetForm = () => {
    const form = document.getElementById('clientForm');
    if (form) form.reset();
    editingId = null;
    const submitBtn = document.getElementById('submitClient');
    if (submitBtn) submitBtn.textContent = 'Salvar cliente';
    const cancelBtn = document.getElementById('cancelEdit');
    if (cancelBtn) cancelBtn.style.display = 'none';
  };

  const upsertClient = (client) => {
    const clients = loadClients();
    const existingIndex = clients.findIndex((c) => c.id === client.id);
    if (existingIndex >= 0) {
      clients[existingIndex] = client;
    } else {
      clients.push(client);
    }
    saveClients(clients);
    renderClients();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const name = document.getElementById('clientName')?.value.trim();
    const contact = document.getElementById('clientContact')?.value.trim() || '';
    const email = document.getElementById('clientEmail')?.value.trim() || '';
    const phone = document.getElementById('clientPhone')?.value.trim() || '';
    const status = document.getElementById('clientStatus')?.value || 'active';

    if (!name) {
      alert('Nome do cliente é obrigatório.');
      return;
    }

    const now = Date.now();

    if (editingId) {
      const clients = loadClients();
      const current = clients.find((c) => c.id === editingId);
      if (!current) {
        resetForm();
        return;
      }
      const updated = {
        ...current,
        name,
        contact,
        email,
        phone,
        status,
        updatedAt: now,
      };
      upsertClient(updated);
    } else {
      const client = {
        id: Date.now(),
        name,
        contact,
        email,
        phone,
        status,
        createdAt: now,
        updatedAt: now,
      };
      upsertClient(client);
    }

    resetForm();
  };

  const renderClients = () => {
    const container = document.getElementById('clientsList');
    if (!container) return;

    const clients = loadClients();

    if (!clients.length) {
      container.innerHTML = '<div class="card"><p style="color: var(--muted); text-align: center; margin: 0;">Nenhum cliente cadastrado.</p></div>';
      return;
    }

    const html = clients
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((client) => `
        <div class="card" style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: start; gap: 12px;">
            <div>
              <h3 style="margin: 0 0 6px 0;">${client.name}</h3>
              <p style="margin: 0; color: var(--muted);">${client.contact || 'Contato não informado'}</p>
              <p style="margin: 6px 0 0 0; color: var(--muted); font-size: 14px;">Email: ${client.email || '-'} • Tel: ${client.phone || '-'}</p>
              <p style="margin: 6px 0 0 0; color: var(--muted); font-size: 12px;">Atualizado em ${formatDate(client.updatedAt)}</p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end; min-width: 160px;">
              <span class="badge" style="background: ${client.status === 'active' ? '#28a745' : '#6c757d'}; color: white; padding: 6px 10px; border-radius: 12px; font-size: 12px;">${client.status === 'active' ? 'Ativo' : 'Inativo'}</span>
              <div style="display: flex; gap: 8px;">
                <button onclick="window.CFOClients.edit(${client.id})" style="padding: 8px 12px; border: 1px solid #007bff; background: white; color: #007bff; border-radius: 4px; cursor: pointer;">Editar</button>
                <button onclick="window.CFOClients.remove(${client.id})" style="padding: 8px 12px; border: 1px solid #dc3545; background: white; color: #dc3545; border-radius: 4px; cursor: pointer;">Excluir</button>
              </div>
            </div>
          </div>
        </div>
      `)
      .join('');

    container.innerHTML = html;
  };

  const startEdit = (id) => {
    const client = loadClients().find((c) => c.id === id);
    if (!client) return;

    editingId = id;
    const form = document.getElementById('clientForm');
    if (form) {
      document.getElementById('clientName').value = client.name || '';
      document.getElementById('clientContact').value = client.contact || '';
      document.getElementById('clientEmail').value = client.email || '';
      document.getElementById('clientPhone').value = client.phone || '';
      document.getElementById('clientStatus').value = client.status || 'active';
    }

    const submitBtn = document.getElementById('submitClient');
    if (submitBtn) submitBtn.textContent = 'Atualizar cliente';
    const cancelBtn = document.getElementById('cancelEdit');
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
  };

  const deleteClient = (id) => {
    const clients = loadClients();
    const target = clients.find((c) => c.id === id);
    if (!target) return;

    if (!confirm(`Excluir cliente "${target.name}"?`)) return;

    const filtered = clients.filter((c) => c.id !== id);
    saveClients(filtered);
    if (editingId === id) resetForm();
    renderClients();
  };

  const bindEvents = () => {
    const form = document.getElementById('clientForm');
    form?.addEventListener('submit', handleSubmit);
    const cancelBtn = document.getElementById('cancelEdit');
    cancelBtn?.addEventListener('click', resetForm);
  };

  document.addEventListener('DOMContentLoaded', () => {
    const ready = window.App?.storageReady || Promise.resolve();
    ready.then(() => {
      bindEvents();
      renderClients();
    });
  });

  // Expor para botões inline
  window.CFOClients = {
    edit: startEdit,
    remove: deleteClient,
  };
})();
