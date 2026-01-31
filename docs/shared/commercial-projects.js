// Fluxo Comercial compartilhado
(function () {
  const { ClientsStore, ProjectsStore } = window;
  if (!ClientsStore || !ProjectsStore) return;

  const getRole = () => (window.App?.getRole?.() || "").toLowerCase();

  const formatDateTime = (value) => {
    if (!value) return "-";
    if (window.App?.formatDate) return window.App.formatDate(value);
    return new Date(value).toLocaleString("pt-BR");
  };

  const formatCurrency = (value) => {
    if (window.App?.formatCurrency) return window.App.formatCurrency(value || 0, "BRL");
    return `R$ ${Number(value || 0).toFixed(2)}`;
  };

  const canManage = (project, role) => {
    if (!project) return false;
    return project.assignedRole === role;
  };

  const roleOptions = [
    { value: "ceo", label: "CEO" },
    { value: "coo", label: "COO" },
    { value: "cto", label: "CTO" },
    { value: "cfo", label: "CFO" },
    { value: "cmo", label: "CMO" },
    { value: "comercial", label: "Comercial" },
  ];

  const renderProjects = () => {
    const container = document.getElementById("commercialProjectsList");
    if (!container) return;

    const role = getRole();
    const isCfo = role === "cfo";
    const projects = ProjectsStore.loadAll()
      .filter((project) => {
        if (!project.proposal) return false;
        if (isCfo) return true;
        return project.assignedRole === role;
      })
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    if (!projects.length) {
      container.innerHTML =
        '<div class="card"><p style="color: var(--muted); text-align: center; margin: 0;">Nenhuma proposta para seu perfil.</p></div>';
      return;
    }

    const html = projects
      .map((project) => {
        const client = ClientsStore.findById(project.clientId);
        const proposal = project.proposal?.snapshot || {};
        const pricing = proposal.pricing || project.pricing || {};
        const canAct = canManage(project, role);
        const selectOptions = roleOptions
          .map((opt) => {
            const selected = opt.value === project.assignedRole ? "selected" : "";
            return `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
          })
          .join("");

        const statusHistoryHtml = (project.statusHistory || [])
          .slice()
          .reverse()
          .map(
            (entry) => `
              <li style="margin-bottom: 6px;">
                ${formatDateTime(entry.at)} • ${entry.byRole?.toUpperCase?.() || "-"} ${entry.byName || ""}:
                <strong>${entry.from}</strong> → <strong>${entry.to}</strong>
              </li>
            `
          )
          .join("");

        return `
          <div class="card" style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <h3 style="margin: 0;">${project.name}</h3>
                  <span class="badge" style="background: #0d6efd; color: #fff; padding: 6px 10px; border-radius: 12px; font-size: 12px;">${project.status}</span>
                </div>
                <p style="margin: 6px 0 0 0; color: var(--muted);">Cliente: ${client?.name || "Cliente removido"}</p>
                <p style="margin: 6px 0 0 0; color: var(--muted); font-size: 12px;">Responsável: ${project.assignedRole?.toUpperCase?.() || "-"}</p>
              </div>
              <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                <button ${canAct ? "" : "disabled"} onclick="window.CommercialFlow.updateStatus(${project.id}, 'Em negociação')" style="padding: 8px 12px; border: 1px solid #0d6efd; background: white; color: #0d6efd; border-radius: 4px;">Em negociação</button>
                <button ${canAct ? "" : "disabled"} onclick="window.CommercialFlow.updateStatus(${project.id}, 'Aceito')" style="padding: 8px 12px; border: 1px solid #198754; background: white; color: #198754; border-radius: 4px;">Aceitar</button>
                <button ${canAct ? "" : "disabled"} onclick="window.CommercialFlow.updateStatus(${project.id}, 'Negado')" style="padding: 8px 12px; border: 1px solid #dc3545; background: white; color: #dc3545; border-radius: 4px;">Negar</button>
                <button ${canAct ? "" : "disabled"} onclick="window.CommercialFlow.complete(${project.id})" style="padding: 8px 12px; border: 1px solid #198754; background: white; color: #198754; border-radius: 4px;">Concluir</button>
                <button ${canAct ? "" : "disabled"} onclick="window.CommercialFlow.clear(${project.id})" style="padding: 8px 12px; border: 1px solid #6c757d; background: white; color: #6c757d; border-radius: 4px;">Apagar</button>
              </div>
            </div>

            ${isCfo ? `
              <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                <label for="roleSelect_${project.id}" style="font-size: 12px; color: var(--muted);">Encaminhar para:</label>
                <select id="roleSelect_${project.id}" style="padding: 8px 10px; border-radius: 4px; border: 1px solid #ddd; min-width: 160px;">
                  ${selectOptions}
                </select>
                <button onclick="window.CommercialFlow.assign(${project.id})" style="padding: 8px 12px; background: #0d6efd; color: #fff; border: none; border-radius: 4px;">Encaminhar</button>
              </div>
            ` : ""}

            <div style="margin-top: 12px; padding: 10px; border: 1px solid #2a2f3a; border-radius: 6px;">
              <h4 style="margin: 0 0 8px;">Proposta Comercial Oficial</h4>
              <p style="margin: 0; color: var(--muted); font-size: 13px;">Cliente: ${proposal.clientName || client?.name || "-"}</p>
              <p style="margin: 4px 0 0; color: var(--muted); font-size: 13px;">Projeto: ${proposal.projectName || project.name}</p>
              <div style="margin-top: 8px; display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px;">
                <div><strong>Custos técnicos:</strong> ${formatCurrency(pricing.techCost)}</div>
                <div><strong>Custos operacionais:</strong> ${formatCurrency(pricing.operationalCost)}</div>
                <div><strong>Margem:</strong> ${pricing.marginPercent || 0}%</div>
                <div><strong>Preço final:</strong> ${formatCurrency(pricing.finalPrice)}</div>
              </div>
              <p style="margin: 8px 0 0; color: var(--muted); font-size: 12px;">Gerada em ${formatDateTime(project.proposal?.generatedAt)}</p>
            </div>

            <details style="margin-top: 12px;">
              <summary style="cursor: pointer; color: var(--muted); font-size: 12px;">Histórico de status</summary>
              <ul style="margin: 8px 0 0 16px; color: var(--muted); font-size: 12px;">${statusHistoryHtml || "<li>Sem histórico.</li>"}</ul>
            </details>
          </div>
        `;
      })
      .join("");

    container.innerHTML = html;
  };

  const updateStatus = (id, status) => {
    const role = getRole();
    const project = ProjectsStore.getById(id);
    if (!canManage(project, role)) {
      alert("Você não tem permissão para atualizar este projeto.");
      return;
    }
    ProjectsStore.markCommercialStatus(id, status);
    renderProjects();
  };

  const assignRole = (id) => {
    const role = getRole();
    if (role !== "cfo") {
      alert("Apenas o CFO pode encaminhar propostas.");
      return;
    }
    const project = ProjectsStore.getById(id);
    const select = document.getElementById(`roleSelect_${id}`);
    const nextRole = select?.value || "";
    if (!nextRole) return;
    ProjectsStore.assignRole(id, nextRole);
    renderProjects();
  };

  const completeProject = (id) => {
    const role = getRole();
    const project = ProjectsStore.getById(id);
    if (!canManage(project, role)) {
      alert("Você não tem permissão para concluir este projeto.");
      return;
    }
    ProjectsStore.completeProject(id);
    renderProjects();
  };

  const clearProposal = (id) => {
    const role = getRole();
    const project = ProjectsStore.getById(id);
    if (!canManage(project, role)) {
      alert("Você não tem permissão para apagar esta proposta.");
      return;
    }
    if (!confirm("Apagar esta proposta? Esta ação não pode ser desfeita.")) return;
    ProjectsStore.clearProposal(id);
    renderProjects();
  };

  document.addEventListener("DOMContentLoaded", () => {
    const ready = window.App?.storageReady || Promise.resolve();
    ready.then(() => renderProjects());
  });

  window.CommercialFlow = {
    updateStatus,
    assign: assignRole,
    complete: completeProject,
    clear: clearProposal,
  };
})();
