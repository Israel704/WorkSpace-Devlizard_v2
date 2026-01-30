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

  const renderClients = () => {
    const container = document.getElementById("clientsList");
    if (!container) return;

    const clients = ClientsStore.getAll().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (!clients.length) {
      container.innerHTML =
        '<div class="card"><p style="color: var(--muted); text-align: center; margin: 0;">Nenhum cliente cadastrado.</p></div>';
      return;
    }

    const role = getRole();
    const html = clients
      .map((client) => {
        const canEdit = true;
        const statusLabel = client.relationshipStatus || "lead";
        const documentDisplay = client.documentId || "-";
        const responsibleLabel = ClientsStore.formatRole(client.responsibleRole);
        const responsibleName = client.responsibleName ? ` (${client.responsibleName})` : "";
        const historyItems = (client.history || [])
          .slice()
          .reverse()
          .map((entry) => {
            const changes = (entry.changes || [])
              .map((change) => `<li>${change.field}: "${change.from}" → "${change.to}"</li>`)
              .join("");
            return `
              <div style="padding: 10px; border: 1px solid #2a2f3a; border-radius: 6px; margin-bottom: 8px;">
                <div style="font-size: 12px; color: var(--muted);">
                  ${formatDateTime(entry.at)} • ${entry.byRole?.toUpperCase?.() || "-"} ${entry.byName ? `(${entry.byName})` : ""}
                </div>
                <ul style="margin: 6px 0 0 16px; font-size: 12px; color: var(--muted);">${changes || "<li>Sem alterações registradas.</li>"}</ul>
              </div>
            `;
          })
          .join("");

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
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <button ${canEdit ? "" : "disabled"} onclick="window.SharedClients.edit(${client.id})" style="padding: 8px 12px; border: 1px solid #007bff; background: white; color: #007bff; border-radius: 4px; cursor: pointer;">Editar</button>
                  <button ${canEdit ? "" : "disabled"} onclick="window.SharedClients.remove(${client.id})" style="padding: 8px 12px; border: 1px solid #dc3545; background: white; color: #dc3545; border-radius: 4px; cursor: pointer;">Excluir</button>
                </div>
                ${!canEdit ? '<small style="color: var(--muted); font-size: 11px;">Somente leitura</small>' : ""}
              </div>
            </div>
            <details style="margin-top: 12px;">
              <summary style="cursor: pointer; color: var(--muted); font-size: 12px;">Histórico de alterações</summary>
              <div style="margin-top: 8px;">${historyItems || "<p style='color: var(--muted);'>Sem histórico.</p>"}</div>
            </details>
          </div>
        `;
      })
      .join("");

    container.innerHTML = html;
  };

  const handleSubmit = (event) => {
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

    const normalized = ClientsStore.normalizeDocument(documentId);
    if (!ClientsStore.isDocumentUnique(normalized, editingId)) {
      alert("CPF/CNPJ já cadastrado para outro cliente.");
      return;
    }

    if (editingId) {
      const client = ClientsStore.findById(editingId);
      ClientsStore.updateClient(editingId, {
        name,
        documentId: normalized,
        contact,
        leadSource,
        responsibleRole,
        responsibleName,
        relationshipStatus,
      });
    } else {
      ClientsStore.createClient({
        name,
        documentId: normalized,
        contact,
        leadSource,
        responsibleRole,
        responsibleName,
        relationshipStatus,
      });
    }

    resetForm();
    renderClients();
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

