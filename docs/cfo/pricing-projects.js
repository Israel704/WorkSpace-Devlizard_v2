// Precificação de Projetos (CFO)
(function () {
  const { ClientsStore, ProjectsStore } = window;
  if (!ClientsStore || !ProjectsStore) return;

  const formatDateTime = (value) => {
    if (!value) return "-";
    if (window.App?.formatDate) return window.App.formatDate(value);
    return new Date(value).toLocaleString("pt-BR");
  };

  const formatCurrency = (value) => {
    if (window.App?.formatCurrency) return window.App.formatCurrency(value || 0, "BRL");
    return `R$ ${Number(value || 0).toFixed(2)}`;
  };

  const renderProjects = () => {
    const container = document.getElementById("pricingProjectsList");
    if (!container) return;

    const projects = ProjectsStore.loadAll().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (!projects.length) {
      container.innerHTML =
        '<div class="card"><p style="color: var(--muted); text-align: center; margin: 0;">Nenhum projeto para precificar.</p></div>';
      return;
    }

    const html = projects
      .map((project) => {
        const client = ClientsStore.findById(project.clientId);
        const pricing = project.pricing || {};
        const canPrice = project.status === ProjectsStore.STATUS[1] || project.status === ProjectsStore.STATUS[2];
        const commentsHtml = (project.comments || [])
          .map(
            (comment) => `
              <div style="padding: 8px; border: 1px solid #2a2f3a; border-radius: 6px; margin-bottom: 6px;">
                <div style="font-size: 12px; color: var(--muted);">${formatDateTime(comment.at)} • ${comment.byRole?.toUpperCase?.()} (${comment.byName || ""})</div>
                <div style="margin-top: 4px;">${comment.message}</div>
              </div>
            `
          )
          .join("");

        const proposalInfo = project.proposal
          ? `<div style="margin-top: 8px; font-size: 12px; color: var(--muted);">Proposta gerada em ${formatDateTime(project.proposal.generatedAt)} por ${project.proposal.generatedBy?.role?.toUpperCase?.() || "-"}.</div>`
          : "";

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
                <p style="margin: 6px 0 0 0; color: var(--muted); font-size: 14px;">Complexidade: ${project.complexity?.toUpperCase?.() || "-"}</p>
                <p style="margin: 6px 0 0 0;">${project.description || "Sem descrição."}</p>
              </div>
            </div>

            <div style="margin-top: 12px;">
              <h4 style="margin: 0 0 6px 0;">Precificação</h4>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
                <div>
                  <label for="techCost_${project.id}">Custos técnicos (R$)</label>
                  <input id="techCost_${project.id}" type="number" min="0" step="0.01" value="${pricing.techCost || ""}" ${canPrice ? "" : "disabled"} style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" />
                </div>
                <div>
                  <label for="opCost_${project.id}">Custos operacionais (R$)</label>
                  <input id="opCost_${project.id}" type="number" min="0" step="0.01" value="${pricing.operationalCost || ""}" ${canPrice ? "" : "disabled"} style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" />
                </div>
                <div>
                  <label for="margin_${project.id}">Margem (%)</label>
                  <input id="margin_${project.id}" type="number" min="0" step="0.1" value="${pricing.marginPercent || ""}" ${canPrice ? "" : "disabled"} style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" />
                </div>
                <div>
                  <label for="finalPrice_${project.id}">Preço final (R$)</label>
                  <input id="finalPrice_${project.id}" type="number" min="0" step="0.01" value="${pricing.finalPrice || ""}" ${canPrice ? "" : "disabled"} style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" />
                </div>
              </div>
              <div style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
                <button ${canPrice ? "" : "disabled"} onclick="window.CFOProjectPricing.calculate(${project.id})" style="padding: 8px 12px; background: #0d6efd; color: white; border: none; border-radius: 4px;">Calcular preço</button>
                <button ${canPrice ? "" : "disabled"} onclick="window.CFOProjectPricing.save(${project.id})" style="padding: 8px 12px; background: #198754; color: white; border: none; border-radius: 4px;">Gerar proposta oficial</button>
              </div>
              ${proposalInfo}
            </div>

            <details style="margin-top: 12px;">
              <summary style="cursor: pointer; color: var(--muted); font-size: 12px;">Comentários técnicos</summary>
              <div style="margin-top: 8px;">
                ${commentsHtml || "<p style='color: var(--muted);'>Sem comentários.</p>"}
                <div style="margin-top: 8px; display: flex; gap: 8px;">
                  <input id="commentInput_${project.id}" type="text" placeholder="Adicionar comentário..." style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                  <button onclick="window.CFOProjectPricing.addComment(${project.id})" style="padding: 8px 12px; background: #198754; color: white; border: none; border-radius: 4px;">Enviar</button>
                </div>
              </div>
            </details>

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

  const calculatePrice = (id) => {
    const techCost = Number(document.getElementById(`techCost_${id}`)?.value || 0);
    const opCost = Number(document.getElementById(`opCost_${id}`)?.value || 0);
    const margin = Number(document.getElementById(`margin_${id}`)?.value || 0);
    const base = techCost + opCost;
    const finalPrice = base * (1 + margin / 100);
    const finalInput = document.getElementById(`finalPrice_${id}`);
    if (finalInput) finalInput.value = finalPrice.toFixed(2);
  };

  const savePricing = (id) => {
    const techCost = Number(document.getElementById(`techCost_${id}`)?.value || 0);
    const opCost = Number(document.getElementById(`opCost_${id}`)?.value || 0);
    const margin = Number(document.getElementById(`margin_${id}`)?.value || 0);
    const finalPrice = Number(document.getElementById(`finalPrice_${id}`)?.value || 0);

    if (techCost <= 0 && opCost <= 0) {
      alert("Informe custos técnicos ou operacionais.");
      return;
    }
    if (finalPrice <= 0) {
      alert("Preço final deve ser maior que zero.");
      return;
    }

    const project = ProjectsStore.getById(id);
    const client = ClientsStore.findById(project?.clientId);
    const pricing = {
      techCost,
      operationalCost: opCost,
      marginPercent: margin,
      finalPrice,
    };
    const proposalSnapshot = {
      projectName: project?.name || "",
      clientName: client?.name || "",
      pricing,
      generatedAt: Date.now(),
    };

    ProjectsStore.applyPricing(id, pricing, proposalSnapshot);
    alert("Proposta comercial oficial gerada. Status atualizado para Precificado.");
    renderProjects();
  };

  const addComment = (id) => {
    const input = document.getElementById(`commentInput_${id}`);
    if (!input) return;
    const message = input.value.trim();
    if (!message) return;
    ProjectsStore.addComment(id, message);
    input.value = "";
    renderProjects();
  };

  document.addEventListener("DOMContentLoaded", () => {
    const ready = window.App?.storageReady || Promise.resolve();
    ready.then(() => renderProjects());
  });

  window.CFOProjectPricing = {
    calculate: calculatePrice,
    save: savePricing,
    addComment,
  };
})();
