// Shared Clients Page
(function () {
  const { ClientsStore } = window;
  if (!ClientsStore) return;

  let editingId = null;

  const getRole = () => (window.App?.getRole?.() || "").toLowerCase();
  const formatDateTime = (value) => {
    if (!value) return "-";
    if (window.App?.formatDate) return window.App.formatDate(value);
    return new Date(value).toLocaleString("pt-BR");
  };

  const buildRoleOptions = (selected) => {
    return Object.keys(ClientsStore.ROLE_LABELS)
      .map((role) => {
        const label = ClientsStore.ROLE_LABELS[role];
        const isSelected = selected === role ? "selected" : "";
        return `<option value="${role}" ${isSelected}>${label}</option>`;
      })
      .join("");
  };

  const resetForm = () => {
    const form = document.getElementById("clientForm");
    form?.reset();
    editingId = null;
    const submitBtn = document.getElementById("submitClient");
    if (submitBtn) submitBtn.textContent = "Salvar cliente";
    const cancelBtn = document.getElementById("cancelEdit");
    if (cancelBtn) cancelBtn.style.display = "none";
    const responsibleRole = document.getElementById("clientResponsibleRole");
    if (responsibleRole && !responsibleRole.value) {
      responsibleRole.value = getRole() || "cfo";
    }
  };

  const renderClients = async () => {
    const container = document.getElementById("clientsList");
    if (!container) return;

    try {
      const clients = await window.App.apiFetch(`${window.API_BASE || '/api'}/clients`, { method: 'GET' });
      if (!clients.length) {
        container.innerHTML =
          '<div class="card"><p style="color: var(--muted); text-align: center; margin: 0;">Nenhum cliente cadastrado.</p></div>';
        return;
      }
      const role = getRole();
      const html = clients
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        .map((client) => {
          const canEdit = true;
          const statusLabel = client.relationshipStatus || "lead";
          const documentDisplay = client.documentId || "-";
          const responsibleLabel = ClientsStore.formatRole?.(client.responsibleRole) || (client.responsibleRole || "-");
          const responsibleName = client.responsibleName ? ` (${client.responsibleName})` : "";
          // Histórico pode não existir no backend, então omite
          return `
            <div class="card" style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: start; gap: 12px; flex-wrap: wrap;">
                <div style="flex: 1;">
                  <h3 style="margin: 0 0 6px 0;">${client.name}</h3>
                  <p style="margin: 0; color: var(--muted);">CPF/CNPJ: ${documentDisplay}</p>
                  <p style="margin: 6px 0 0 0; color: var(--muted); font-size: 14px;">Contato: ${client.contact || "-"}</p>
                  <p style="margin: 6px 0 0 0; color: var(--muted); font-size: 14px;">Origem: ${client.leadSource || "-"}</p>
                  <p style="margin: 6px 0 0 0; color: var(--muted); font-size: 14px;">Responsável: ${responsibleLabel}${responsibleName}</p>
                  <p style="margin: 6px 0 0 0; color: var(--muted); font-size: 12px;">Atualizado em ${formatDateTime(client.updatedAt)}</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end; min-width: 180px;">
                  <span class="badge" style="background: #0d6efd; color: white; padding: 6px 10px; border-radius: 12px; font-size: 12px;">${statusLabel}</span>
                  <!-- Botões de editar/excluir podem ser implementados -->
                </div>
              </div>
            </div>
          `;
        })
        .join("");
      container.innerHTML = html;
    } catch (e) {
      container.innerHTML = `<div class='card'><p style='color: #dc3545; text-align: center;'>Erro ao carregar clientes: ${e.message || e}</p></div>`;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = document.getElementById("clientName")?.value.trim();
    const documentId = document.getElementById("clientDocument")?.value.trim();
    const contact = document.getElementById("clientContact")?.value.trim() || "";
    const leadSource = document.getElementById("clientLeadSource")?.value.trim() || "";
    const responsibleRole = document.getElementById("clientResponsibleRole")?.value || "";
    const responsibleName = document.getElementById("clientResponsibleName")?.value.trim() || "";
    const relationshipStatus = document.getElementById("clientRelationshipStatus")?.value || "lead";

    if (!name) {
      alert("Nome/Razão Social é obrigatório.");
      return;
    }
    if (!documentId) {
      alert("CPF ou CNPJ é obrigatório.");
      return;
    }

    try {
      const payload = {
        name,
        email: '', // campo opcional para compatibilidade backend
        company: name, // compatível com backend, pode ser ajustado
        documentId,
        contact,
        leadSource,
        responsibleRole,
        responsibleName,
        relationshipStatus,
      };
      await window.App.apiFetch(`${window.API_BASE || '/api'}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      alert('Cliente salvo com sucesso!');
      resetForm();
      // Opcional: recarregar lista do backend
      // renderClients();
      window.location.reload();
    } catch (e) {
      alert('Erro ao salvar cliente: ' + (e.message || e));
    }
  };

  const startEdit = (id) => {
    const client = ClientsStore.findById(id);
    if (!client) return;
    editingId = id;
    document.getElementById("clientName").value = client.name || "";
    document.getElementById("clientDocument").value = client.documentId || "";
    document.getElementById("clientContact").value = client.contact || "";
    document.getElementById("clientLeadSource").value = client.leadSource || "";
    document.getElementById("clientResponsibleRole").value = client.responsibleRole || "";
    document.getElementById("clientResponsibleName").value = client.responsibleName || "";
    document.getElementById("clientRelationshipStatus").value = client.relationshipStatus || "lead";

    const submitBtn = document.getElementById("submitClient");
    if (submitBtn) submitBtn.textContent = "Atualizar cliente";
    const cancelBtn = document.getElementById("cancelEdit");
    if (cancelBtn) cancelBtn.style.display = "inline-flex";
  };

  const deleteClient = (id) => {
    const client = ClientsStore.findById(id);
    if (!client) return;
    if (!confirm(`Excluir cliente "${client.name}"?`)) return;
    ClientsStore.removeClient(id);
    if (editingId === id) resetForm();
    renderClients();
  };

  const bindEvents = () => {
    const form = document.getElementById("clientForm");
    form?.addEventListener("submit", handleSubmit);
    document.getElementById("cancelEdit")?.addEventListener("click", resetForm);
  };

  const init = () => {
    const roleSelect = document.getElementById("clientResponsibleRole");
    if (roleSelect) {
      roleSelect.innerHTML = buildRoleOptions(getRole());
    }
    resetForm();
    bindEvents();
    renderClients();
  };

  document.addEventListener("DOMContentLoaded", init);

  window.SharedClients = {
    edit: startEdit,
    remove: deleteClient,
  };
})();

