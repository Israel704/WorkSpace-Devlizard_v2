/* ======================================================
   DECISIONS WIDGET

   Renderiza:
   - Painel resumido (últimas N decisões)
   - Lista completa com filtros

   Uso:
   - DecisionsWidget.renderSummary('#container', { limit: 5 })
   - DecisionsWidget.renderFullList('#container', { filters: true })
====================================================== */

window.DecisionsWidget = (() => {
  /**
   * Renderiza o painel resumido (últimas N decisões)
   * @param {string} selector - Seletor CSS do container
   * @param {Object} options - { limit: 5, onViewAll: callback }
   */
  const renderSummary = (selector, options = {}) => {
    const limit = options.limit || 5;
    const container = document.querySelector(selector);

    if (!container) {
      console.warn(`Container não encontrado: ${selector}`);
      return;
    }

    const decisions = DecisionsStore.getDecisions();
    const recent = decisions.slice(-limit).reverse();

    if (recent.length === 0) {
      container.innerHTML = `
        <div class="decisions-summary-empty">
          <p style="color: var(--muted); font-size: 14px; margin: 0;">
            Nenhuma decisão registrada.
          </p>
        </div>
      `;
      return;
    }

    const html = `
      <div class="decisions-summary-header">
        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">Decisões Recentes</h3>
      </div>
      <div class="decisions-summary-list">
        ${recent
          .map(
            (decision) => `
          <div class="decision-item-summary" data-id="${decision.id}">
            <div class="decision-summary-header">
              <span class="decision-title">${escapeHtml(decision.title)}</span>
              <span class="decision-status ${decision.status}">
                ${decision.status === "approved" ? "✓ Aprovada" : "✗ Rejeitada"}
              </span>
            </div>
            <div class="decision-summary-meta">
              <span class="decision-flow">${decision.fromRole.toUpperCase()} → ${decision.toRole.toUpperCase()}</span>
              <span class="decision-date">${DecisionsStore.formatDate(decision.decidedAt)}</span>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
        <a href="../shared/pages/decisions.html" style="
          font-size: 13px;
          color: var(--primary);
          text-decoration: none;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        " class="view-all-link">
          Ver todas as decisões →
        </a>
      </div>
    `;

    container.innerHTML = html;
  };

  /**
   * Renderiza a lista completa com filtros
   * @param {string} selector - Seletor CSS do container
   * @param {Object} options - { filters: true, onEdit, onDelete }
   */
  const renderFullList = (selector, options = {}) => {
    const showFilters = options.filters !== false;
    const container = document.querySelector(selector);

    if (!container) {
      console.warn(`Container não encontrado: ${selector}`);
      return;
    }

    let decisions = DecisionsStore.getDecisions();
    const roles = ["ceo", "coo", "cfo", "cto", "cmo"];

    const renderList = (filtered) => {
      if (filtered.length === 0) {
        return `
          <div style="padding: 40px 20px; text-align: center; color: var(--muted);">
            <p>Nenhuma decisão encontrada com os filtros selecionados.</p>
          </div>
        `;
      }

      return filtered
        .map(
          (decision) => `
        <div class="decision-item-full" data-id="${decision.id}">
          <div class="decision-item-content">
            <h4 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600;">
              ${escapeHtml(decision.title)}
            </h4>
            <p style="margin: 0 0 12px 0; font-size: 13px; color: var(--muted); line-height: 1.4;">
              ${escapeHtml(decision.summary)}
            </p>
            <div class="decision-item-meta">
              <span class="badge badge-flow">${decision.fromRole.toUpperCase()} → ${decision.toRole.toUpperCase()}</span>
              <span class="badge ${decision.status === "approved" ? "badge-approved" : "badge-rejected"}">
                ${decision.status === "approved" ? "✓ Aprovada" : "✗ Rejeitada"}
              </span>
              <span class="badge badge-date">${DecisionsStore.formatDate(decision.decidedAt)}</span>
              ${
                decision.tags && decision.tags.length > 0
                  ? decision.tags.map((tag) => `<span class="badge badge-tag">#${escapeHtml(tag)}</span>`).join("")
                  : ""
              }
            </div>
          </div>
        </div>
      `
        )
        .join("");
    };

    const filtersHtml = showFilters
      ? `
      <div class="decisions-filters">
        <select id="filterStatus" style="padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: white; font-size: 13px;">
          <option value="">Todos os status</option>
          <option value="approved">Aprovadas</option>
          <option value="rejected">Rejeitadas</option>
        </select>

        <select id="filterFrom" style="padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: white; font-size: 13px;">
          <option value="">De: Todos os cargos</option>
          ${roles.map((r) => `<option value="${r}">${r.toUpperCase()}</option>`).join("")}
        </select>

        <select id="filterTo" style="padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: white; font-size: 13px;">
          <option value="">Para: Todos os cargos</option>
          ${roles.map((r) => `<option value="${r}">${r.toUpperCase()}</option>`).join("")}
        </select>
      </div>
    `
      : "";

    const initialHtml = `
      <div class="decisions-container">
        ${filtersHtml}
        <div class="decisions-list" id="decisionsList">
          ${renderList(decisions)}
        </div>
      </div>
    `;

    container.innerHTML = initialHtml;

    if (showFilters) {
      const filterStatus = document.getElementById("filterStatus");
      const filterFrom = document.getElementById("filterFrom");
      const filterTo = document.getElementById("filterTo");
      const decisionsList = document.getElementById("decisionsList");

      const applyFilters = () => {
        const filters = {
          status: filterStatus.value || undefined,
          fromRole: filterFrom.value || undefined,
          toRole: filterTo.value || undefined,
        };

        let filtered = decisions;

        if (filters.status) {
          filtered = filtered.filter((d) => d.status === filters.status);
        }

        if (filters.fromRole) {
          filtered = filtered.filter((d) => d.fromRole === filters.fromRole);
        }

        if (filters.toRole) {
          filtered = filtered.filter((d) => d.toRole === filters.toRole);
        }

        decisionsList.innerHTML = renderList(filtered);
      };

      filterStatus?.addEventListener("change", applyFilters);
      filterFrom?.addEventListener("change", applyFilters);
      filterTo?.addEventListener("change", applyFilters);
    }
  };

  /**
   * Atualiza o widget (usado quando dados mudam)
   */
  const refresh = (selector) => {
    if (selector.includes("summary")) {
      renderSummary(selector);
    } else {
      renderFullList(selector);
    }
  };

  /**
   * Função auxiliar: escapa HTML
   */
  const escapeHtml = (text) => {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  };

  // API Pública
  return {
    renderSummary,
    renderFullList,
    refresh,
  };
})();
