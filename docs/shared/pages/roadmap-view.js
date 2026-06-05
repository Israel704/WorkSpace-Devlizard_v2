// Roadmap View - Modo Leitura
// Para todos os C-levels (CEO, COO, CTO, CFO, CMO e demais)
// Apenas visualização, sem capacidade de edição

const RoadmapView = (() => {
  const STORAGE_KEY = "ceo_roadmaps";

  // Estado local de filtros
  let filters = {
    status: "",
    priority: "",
    search: "",
  };

  // ========================
  // INICIALIZAÇÃO
  // ========================
  function init() {
    setupEventListeners();
    renderActiveRoadmap();
    renderHistory();
  }

  // ========================
  // EVENT LISTENERS
  // ========================
  function setupEventListeners() {
    const filterStatus = document.getElementById("filterStatus");
    const filterPriority = document.getElementById("filterPriority");
    const searchTitle = document.getElementById("searchTitle");
    const btnClearFilters = document.getElementById("btnClearFilters");

    if (filterStatus) {
      filterStatus.addEventListener("change", (e) => {
        filters.status = e.target.value;
        renderActiveRoadmap();
      });
    }

    if (filterPriority) {
      filterPriority.addEventListener("change", (e) => {
        filters.priority = e.target.value;
        renderActiveRoadmap();
      });
    }

    if (searchTitle) {
      searchTitle.addEventListener("input", (e) => {
        filters.search = e.target.value.toLowerCase();
        renderActiveRoadmap();
      });
    }

    if (btnClearFilters) {
      btnClearFilters.addEventListener("click", () => {
        filters = { status: "", priority: "", search: "" };
        if (filterStatus) filterStatus.value = "";
        if (filterPriority) filterPriority.value = "";
        if (searchTitle) searchTitle.value = "";
        renderActiveRoadmap();
      });
    }
  }

  // ========================
  // RENDER: ROADMAP ATIVO
  // ========================
  function renderActiveRoadmap() {
    const container = document.getElementById("activeRoadmapContainer");
    const roadmap = getCurrentRoadmap();

    if (!roadmap) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Nenhum roadmap ativo no momento.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="roadmap-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
          <div>
            <h2 style="margin: 0 0 4px 0;">${escapeHtml(roadmap.title)}</h2>
            <p style="margin: 0; color: var(--text-muted); font-size: 13px;">
              v${escapeHtml(roadmap.version)} • ${escapeHtml(roadmap.periodStart)} a ${escapeHtml(roadmap.periodEnd)}
            </p>
          </div>
          <span class="roadmap-status ativo">Ativo</span>
        </div>

        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);">
          <h4 style="margin: 0 0 4px 0;">Objetivo</h4>
          <p style="margin: 0; color: var(--text);">${escapeHtml(roadmap.objective)}</p>
        </div>
    `;

    if (roadmap.premises) {
      html += `
        <div style="margin-top: 12px;">
          <h4 style="margin: 0 0 4px 0;">Premissas</h4>
          <p style="margin: 0; color: var(--text-muted); font-size: 13px;">${escapeHtml(roadmap.premises)}</p>
        </div>
      `;
    }

    if (roadmap.restrictions) {
      html += `
        <div style="margin-top: 12px;">
          <h4 style="margin: 0 0 4px 0;">Restrições</h4>
          <p style="margin: 0; color: var(--text-muted); font-size: 13px;">${escapeHtml(roadmap.restrictions)}</p>
        </div>
      `;
    }

    html += `</div>`;

    // Renderizar iniciativas com filtros aplicados
    html += renderInitiativesFiltered(roadmap.initiatives || []);

    container.innerHTML = html;
  }

  function renderInitiativesFiltered(initiatives) {
    if (!initiatives || initiatives.length === 0) {
      return `
        <div class="empty-state">
          <p>Nenhuma iniciativa no roadmap.</p>
        </div>
      `;
    }

    // Aplicar filtros
    let filtered = initiatives.filter((init) => {
      if (filters.status && init.status !== filters.status) {
        return false;
      }
      if (filters.priority && init.priority !== filters.priority) {
        return false;
      }
      if (filters.search && !init.title.toLowerCase().includes(filters.search)) {
        return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      return `
        <div class="empty-state">
          <p>Nenhuma iniciativa corresponde aos filtros selecionados.</p>
        </div>
      `;
    }

    // Ordenar por strategic order
    const sorted = [...filtered].sort(
      (a, b) => (a.strategicOrder || 999) - (b.strategicOrder || 999)
    );

    let html = `<div style="margin-top: 20px;">`;

    sorted.forEach((init) => {
      html += `
        <div class="initiative-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div style="flex: 1;">
              <h4 style="margin: 0 0 8px 0;">${escapeHtml(init.title)}</h4>

              <div style="margin-bottom: 8px;">
                <span class="initiative-tag type-${init.type}">${formatLabel(init.type)}</span>
                <span class="initiative-tag priority-${init.priority}">Prioridade: ${formatLabel(init.priority)}</span>
                <span class="initiative-status status-${init.status}">${formatStatus(init.status)}</span>
              </div>

              <div style="margin-bottom: 8px;">
                <span class="impact-badge impact-${init.impactTech}">Tech: ${formatLabel(init.impactTech)}</span>
                <span class="impact-badge impact-${init.impactFinance}">Fin: ${formatLabel(init.impactFinance)}</span>
                <span class="impact-badge impact-${init.impactOps}">Ops: ${formatLabel(init.impactOps)}</span>
                <span class="impact-badge impact-${init.impactComm}">Com: ${formatLabel(init.impactComm)}</span>
              </div>

              ${init.description ? `<p style="margin: 8px 0; color: var(--text); font-size: 13px;"><strong>Descrição:</strong> ${escapeHtml(init.description)}</p>` : ""}
              ${init.problem ? `<p style="margin: 8px 0; color: var(--text-muted); font-size: 13px;"><strong>Problema:</strong> ${escapeHtml(init.problem)}</p>` : ""}
              ${init.expectedResult ? `<p style="margin: 8px 0; color: var(--text-muted); font-size: 13px;"><strong>Resultado Esperado:</strong> ${escapeHtml(init.expectedResult)}</p>` : ""}
              ${init.timeframe ? `<p style="margin: 8px 0; color: var(--text-muted); font-size: 13px;"><strong>Horizonte:</strong> ${formatLabel(init.timeframe)}</p>` : ""}
              ${init.pauseReason ? `<p style="margin: 8px 0; color: #ef4444; font-size: 13px;"><strong>Motivo:</strong> ${escapeHtml(init.pauseReason)}</p>` : ""}
              ${init.risks ? `<p style="margin: 8px 0; color: var(--text-muted); font-size: 13px;"><strong>Riscos:</strong> ${escapeHtml(init.risks)}</p>` : ""}
            </div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    return html;
  }

  // ========================
  // RENDER: HISTÓRICO
  // ========================
  function renderHistory() {
    const container = document.getElementById("historyContainer");
    const roadmaps = getAllRoadmaps();
    const archived = roadmaps.filter((r) => r.status !== "ativo");

    if (archived.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Nenhum roadmap no histórico.</p>
        </div>
      `;
      return;
    }

    let html = `<div>`;

    archived.forEach((roadmap, idx) => {
      const createdDate = new Date(roadmap.createdAt).toLocaleDateString("pt-BR");
      const updatedDate = new Date(roadmap.updatedAt).toLocaleDateString("pt-BR");
      const historyId = `history-${roadmap.id}`;

      html += `
        <div class="history-card" onclick="RoadmapView.toggleHistoryDetail(${idx})">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div style="flex: 1;">
              <h3 style="margin: 0 0 4px 0;">
                ${escapeHtml(roadmap.title)}
                <span class="roadmap-status ${roadmap.status}">${formatStatus(roadmap.status)}</span>
              </h3>
              <p style="margin: 0;">v${escapeHtml(roadmap.version)} • ${escapeHtml(roadmap.periodStart)} a ${escapeHtml(roadmap.periodEnd)}</p>
              <p style="margin: 4px 0 0 0; font-size: 12px;">Criado: ${createdDate} | Atualizado: ${updatedDate}</p>
            </div>
          </div>
          <div id="${historyId}" class="history-initiatives" style="display: none;">
            ${renderHistoryInitiatives(roadmap.initiatives || [])}
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  }

  function renderHistoryInitiatives(initiatives) {
    if (!initiatives || initiatives.length === 0) {
      return `<p style="color: var(--text-muted); font-size: 13px;">Nenhuma iniciativa registrada.</p>`;
    }

    const sorted = [...initiatives].sort(
      (a, b) => (a.strategicOrder || 999) - (b.strategicOrder || 999)
    );

    let html = `<div style="padding-top: 12px;">`;

    sorted.forEach((init) => {
      html += `
        <div style="padding: 8px; border-left: 2px solid var(--border-color); margin-bottom: 8px;">
          <p style="margin: 0 0 4px 0; font-weight: 600;">${escapeHtml(init.title)}</p>
          <div style="margin-bottom: 4px;">
            <span class="initiative-tag type-${init.type}" style="font-size: 10px;">${formatLabel(init.type)}</span>
            <span class="initiative-status status-${init.status}" style="font-size: 10px;">${formatStatus(init.status)}</span>
          </div>
          ${init.description ? `<p style="margin: 4px 0; color: var(--text-muted); font-size: 12px;">${escapeHtml(init.description)}</p>` : ""}
        </div>
      `;
    });

    html += `</div>`;
    return html;
  }

  // ========================
  // PUBLIC API (para onclick)
  // ========================
  function toggleHistoryDetail(idx) {
    const roadmaps = getAllRoadmaps();
    const archived = roadmaps.filter((r) => r.status !== "ativo");
    const roadmap = archived[idx];

    if (!roadmap) return;

    const historyId = `history-${roadmap.id}`;
    const elem = document.getElementById(historyId);

    if (elem) {
      const isHidden = elem.style.display === "none";
      elem.style.display = isHidden ? "block" : "none";

      // Toggle classe no card pai
      const card = elem.parentElement;
      if (card) {
        if (isHidden) {
          card.classList.add("expanded");
        } else {
          card.classList.remove("expanded");
        }
      }
    }
  }

  // ========================
  // STORAGE UTILITIES
  // ========================
  function getAllRoadmaps() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  function getCurrentRoadmap() {
    const roadmaps = getAllRoadmaps();
    return roadmaps.find((r) => r.status === "ativo") || null;
  }

  // ========================
  // UTILITIES
  // ========================
  function escapeHtml(text) {
    if (!text) return "";
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  function formatLabel(str) {
    if (!str) return "";
    return str
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  function formatStatus(status) {
    const map = {
      ativo: "Ativo",
      substituido: "Substituído",
      arquivado: "Arquivado",
      planejada: "Planejada",
      em_validacao: "Em Validação",
      aprovada: "Aprovada",
      em_execucao: "Em Execução",
      pausada: "Pausada",
      concluida: "Concluída",
      cancelada: "Cancelada",
    };
    return map[status] || status;
  }

  // ========================
  // INIT
  // ========================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      const ready = window.App?.storageReady || Promise.resolve();
      ready.then(() => init());
    });
  } else {
    init();
  }

  // ========================
  // PUBLIC API
  // ========================
  return {
    init,
    toggleHistoryDetail,
  };
})();
