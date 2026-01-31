// Roadmap Estratégico - CEO
// roadmap.js

const RoadmapManager = (() => {
  const STORAGE_KEY = "ceo_roadmaps";
  const K = window.STORAGE_KEYS || {};
  const AUTH_KEY = K.AUTH || "auth";
  const ROLE_KEY = K.ROLE || "role";

  // ========================
  // INICIALIZAÇÃO
  // ========================
  function init() {
    setupEventListeners();
    renderCurrentRoadmap();
    renderHistory();
  }

  // ========================
  // EVENT LISTENERS
  // ========================
  function setupEventListeners() {
    // Abas
    document.querySelectorAll(".tab-button").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const tab = e.target.dataset.tab;
        switchTab(tab);
      });
    });

    // Formulário de criar roadmap
    const roadmapForm = document.getElementById("roadmap-form");
    if (roadmapForm) {
      roadmapForm.addEventListener("submit", (e) => {
        e.preventDefault();
        handleCreateRoadmap();
      });
    }

    // Modais
    setupModalControls();

    // Status de iniciativa muda
    const statusSelect = document.getElementById("init-status");
    if (statusSelect) {
      statusSelect.addEventListener("change", (e) => {
        const field = document.getElementById("pause-reason-field");
        if (e.target.value === "pausada" || e.target.value === "cancelada") {
          field.style.display = "block";
          document.getElementById("init-pauseReason").required = true;
        } else {
          field.style.display = "none";
          document.getElementById("init-pauseReason").required = false;
        }
      });
    }
  }

  function setupModalControls() {
    // Modal de editar roadmap
    document.querySelectorAll('[data-modal="edit-roadmap"]').forEach((btn) => {
      btn.addEventListener("click", () => openEditRoadmapModal());
    });

    // Modal de criar iniciativa
    document.getElementById("modal-initiative").addEventListener("submit", (e) => {
      if (e.target.id === "form-initiative") {
        e.preventDefault();
        handleSaveInitiative();
      }
    });

    // Modal de pausar iniciativa
    document.getElementById("modal-pause-initiative").addEventListener("submit", (e) => {
      if (e.target.id === "form-pause-initiative") {
        e.preventDefault();
        handlePauseInitiative();
      }
    });

    // Modal de deletar roadmap
    const confirmDeleteBtn = document.getElementById("confirm-delete-roadmap");
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener("click", () => {
        const modal = document.getElementById("modal-delete-roadmap");
        const roadmapId = parseInt(modal.dataset.roadmapId);
        if (roadmapId) {
          deleteRoadmap(roadmapId);
        }
      });
    }

    // Fechar modais
    document.querySelectorAll(".modal-close, .modal-close-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const modal = e.target.closest(".modal");
        if (modal) {
          modal.classList.remove("active");
        }
      });
    });

    // Fechar modal ao clicar fora
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.classList.remove("active");
        }
      });
    });
  }

  // ========================
  // TAB NAVIGATION
  // ========================
  function switchTab(tabName) {
    // Deactivate all tabs
    document.querySelectorAll(".tab-button").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.remove("active");
    });

    // Activate selected
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");
    document.getElementById(`tab-${tabName}`).classList.add("active");

    // Refresh content if needed
    if (tabName === "history") {
      renderHistory();
    } else if (tabName === "current") {
      renderCurrentRoadmap();
    }
  }

  // ========================
  // RENDER: ROADMAP ATIVO
  // ========================
  function renderCurrentRoadmap() {
    const container = document.getElementById("current-roadmap-container");
    const roadmap = getCurrentRoadmap();

    if (!roadmap) {
      container.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted);">
          <p>Nenhum roadmap ativo no momento.</p>
          <p style="font-size: 13px;">Crie um novo roadmap na aba <strong>Novo Roadmap</strong>.</p>
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

        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
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

    html += `
      <div style="display: flex; gap: 10px; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-color);">
        <button class="btn btn-secondary" onclick="RoadmapManager.openEditRoadmapModal()">Editar Roadmap</button>
        <button class="btn btn-secondary" onclick="RoadmapManager.openNewInitiativeModal()">+ Criar Iniciativa</button>
        <button class="btn btn-secondary" onclick="RoadmapManager.archiveRoadmap(${roadmap.id})">Arquivar</button>
        <button class="btn btn-danger" onclick="RoadmapManager.openDeleteRoadmapModal(${roadmap.id})">Deletar</button>
      </div>
      </div>
    `;

    // Iniciativas
    html += renderInitiatives(roadmap.initiatives || []);

    container.innerHTML = html;
  }

  function renderInitiatives(initiatives) {
    if (!initiatives || initiatives.length === 0) {
      return `
        <div style="padding: 24px; text-align: center; color: var(--text-muted);">
          <p>Nenhuma iniciativa ainda.</p>
        </div>
      `;
    }

    // Sort by strategic order
    const sorted = [...initiatives].sort(
      (a, b) => (a.strategicOrder || 999) - (b.strategicOrder || 999)
    );

    let html = `<div style="margin-top: 20px;">`;

    sorted.forEach((init) => {
      html += `
        <div class="initiative-card status-${init.status}">
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

            <div style="display: flex; flex-direction: column; gap: 6px;">
              <button class="btn-small btn-secondary" onclick="RoadmapManager.openEditInitiativeModal(${init.id})">Editar</button>
              ${init.status !== "pausada" && init.status !== "cancelada" && init.status !== "concluida" ? `
                <button class="btn-small btn-secondary" onclick="RoadmapManager.openPauseInitiativeModal(${init.id})">Pausar</button>
              ` : ""}
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
    const container = document.getElementById("history-container");
    const roadmaps = getAllRoadmaps();
    const archived = roadmaps.filter((r) => r.status !== "ativo");

    if (archived.length === 0) {
      container.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted);">
          <p>Nenhum roadmap no histórico ainda.</p>
        </div>
      `;
      return;
    }

    let html = `<div class="history-list">`;

    archived.forEach((roadmap) => {
      const createdDate = new Date(roadmap.createdAt).toLocaleDateString("pt-BR");
      const updatedDate = new Date(roadmap.updatedAt).toLocaleDateString("pt-BR");

      html += `
        <div class="history-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div style="flex: 1;">
              <h3 style="margin: 0 0 4px 0;">
                ${escapeHtml(roadmap.title)}
                <span class="roadmap-status ${roadmap.status}">${formatStatus(roadmap.status)}</span>
              </h3>
              <p style="margin: 0;">v${escapeHtml(roadmap.version)} • ${escapeHtml(roadmap.periodStart)} a ${escapeHtml(roadmap.periodEnd)}</p>
              <p style="margin: 4px 0 0 0; font-size: 12px;">Criado: ${createdDate} | Atualizado: ${updatedDate}</p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <button class="btn btn-small btn-secondary" onclick="RoadmapManager.viewRoadmapDetails(${roadmap.id})">Visualizar</button>
              ${roadmap.status === "substituido" ? `<button class="btn btn-small btn-secondary" onclick="RoadmapManager.restoreRoadmap(${roadmap.id})">Restaurar</button>` : ""}
              <button class="btn btn-small btn-danger" onclick="RoadmapManager.openDeleteRoadmapModal(${roadmap.id})">Deletar</button>
            </div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  }

  // ========================
  // HANDLERS: ROADMAP
  // ========================
  function handleCreateRoadmap() {
    const title = document.getElementById("roadmap-title").value.trim();
    const version = document.getElementById("roadmap-version").value.trim();
    const periodStart = document.getElementById("roadmap-periodStart").value.trim();
    const periodEnd = document.getElementById("roadmap-periodEnd").value.trim();
    const objective = document.getElementById("roadmap-objective").value.trim();
    const premises = document.getElementById("roadmap-premises").value.trim();
    const restrictions = document.getElementById("roadmap-restrictions").value.trim();

    // Validações
    if (!title || !version || !periodStart || !periodEnd || !objective) {
      alert("Preencha todos os campos obrigatórios (*)");
      return;
    }

    // Validar formato da data
    if (!/^\d{2}\/\d{4}$/.test(periodStart) || !/^\d{2}\/\d{4}$/.test(periodEnd)) {
      alert("Formato de período inválido. Use MM/YYYY (ex: 01/2025)");
      return;
    }

    // Marcar roadmap ativo anterior como "substituido"
    const current = getCurrentRoadmap();
    if (current) {
      current.status = "substituido";
      current.updatedAt = Date.now();
    }

    // Criar novo roadmap
    const roadmap = {
      id: Date.now(),
      title,
      version,
      status: "ativo",
      objective,
      periodStart,
      periodEnd,
      premises,
      restrictions,
      initiatives: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: "CEO",
    };

    const roadmaps = getAllRoadmaps();
    roadmaps.push(roadmap);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roadmaps));

    // Limpar formulário
    document.getElementById("roadmap-form").reset();

    // Renderizar
    renderCurrentRoadmap();
    switchTab("current");

    alert("Roadmap criado com sucesso!");
  }

  function openEditRoadmapModal() {
    const roadmap = getCurrentRoadmap();
    if (!roadmap) {
      alert("Nenhum roadmap ativo para editar");
      return;
    }

    document.getElementById("edit-objective").value = roadmap.objective || "";
    document.getElementById("edit-premises").value = roadmap.premises || "";
    document.getElementById("edit-restrictions").value = roadmap.restrictions || "";
    document.getElementById("edit-revision-reason").value = "";

    const modal = document.getElementById("modal-edit-roadmap");
    modal.classList.add("active");

    // Handler para form
    const form = document.getElementById("form-edit-roadmap");
    form.onsubmit = handleSaveRoadmapEdit;
  }

  function handleSaveRoadmapEdit(e) {
    e.preventDefault();

    const roadmap = getCurrentRoadmap();
    if (!roadmap) return;

    const objective = document.getElementById("edit-objective").value.trim();
    const premises = document.getElementById("edit-premises").value.trim();
    const restrictions = document.getElementById("edit-restrictions").value.trim();
    const reason = document.getElementById("edit-revision-reason").value.trim();

    if (!objective || !reason) {
      alert("Objetivo e motivo da revisão são obrigatórios");
      return;
    }

    roadmap.objective = objective;
    roadmap.premises = premises;
    roadmap.restrictions = restrictions;
    roadmap.updatedAt = Date.now();

    const roadmaps = getAllRoadmaps();
    const idx = roadmaps.findIndex((r) => r.id === roadmap.id);
    if (idx !== -1) {
      roadmaps[idx] = roadmap;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roadmaps));

    document.getElementById("modal-edit-roadmap").classList.remove("active");
    renderCurrentRoadmap();

    alert("Roadmap atualizado com sucesso!");
  }

  // ========================
  // HANDLERS: INICIATIVAS
  // ========================
  function openNewInitiativeModal() {
    const roadmap = getCurrentRoadmap();
    if (!roadmap) {
      alert("Nenhum roadmap ativo");
      return;
    }

    document.getElementById("initiative-modal-title").textContent = "Nova Iniciativa";
    document.getElementById("form-initiative").reset();
    document.getElementById("init-order").value = (roadmap.initiatives?.length || 0) + 1;

    const modal = document.getElementById("modal-initiative");
    modal.classList.add("active");
    modal.dataset.editId = "";
  }

  function openEditInitiativeModal(initId) {
    const roadmap = getCurrentRoadmap();
    if (!roadmap) return;

    const init = roadmap.initiatives.find((i) => i.id === initId);
    if (!init) return;

    document.getElementById("initiative-modal-title").textContent = "Editar Iniciativa";

    document.getElementById("init-title").value = init.title || "";
    document.getElementById("init-type").value = init.type || "";
    document.getElementById("init-priority").value = init.priority || "";
    document.getElementById("init-timeframe").value = init.timeframe || "";
    document.getElementById("init-order").value = init.strategicOrder || 1;
    document.getElementById("init-description").value = init.description || "";
    document.getElementById("init-problem").value = init.problem || "";
    document.getElementById("init-result").value = init.expectedResult || "";
    document.getElementById("init-impactTech").value = init.impactTech || "";
    document.getElementById("init-impactFinance").value = init.impactFinance || "";
    document.getElementById("init-impactOps").value = init.impactOps || "";
    document.getElementById("init-impactComm").value = init.impactComm || "";
    document.getElementById("init-status").value = init.status || "";
    document.getElementById("init-pauseReason").value = init.pauseReason || "";
    document.getElementById("init-notes").value = init.notes || "";
    document.getElementById("init-risks").value = init.risks || "";
    document.getElementById("init-relatedDecisions").value = init.relatedDecisions || "";

    // Show pause reason field if needed
    const pauseField = document.getElementById("pause-reason-field");
    if (init.status === "pausada" || init.status === "cancelada") {
      pauseField.style.display = "block";
    } else {
      pauseField.style.display = "none";
    }

    const modal = document.getElementById("modal-initiative");
    modal.classList.add("active");
    modal.dataset.editId = initId;
  }

  function handleSaveInitiative() {
    const roadmap = getCurrentRoadmap();
    if (!roadmap) return;

    const title = document.getElementById("init-title").value.trim();
    const type = document.getElementById("init-type").value;
    const priority = document.getElementById("init-priority").value;
    const timeframe = document.getElementById("init-timeframe").value;
    const order = parseInt(document.getElementById("init-order").value) || 1;
    const description = document.getElementById("init-description").value.trim();
    const problem = document.getElementById("init-problem").value.trim();
    const result = document.getElementById("init-result").value.trim();
    const impactTech = document.getElementById("init-impactTech").value;
    const impactFinance = document.getElementById("init-impactFinance").value;
    const impactOps = document.getElementById("init-impactOps").value;
    const impactComm = document.getElementById("init-impactComm").value;
    const status = document.getElementById("init-status").value;
    const pauseReason =
      status === "pausada" || status === "cancelada"
        ? document.getElementById("init-pauseReason").value.trim()
        : null;
    const notes = document.getElementById("init-notes").value.trim();
    const risks = document.getElementById("init-risks").value.trim();
    const relatedDecisions = document.getElementById("init-relatedDecisions").value.trim();

    // Validações
    if (!title || !type || !priority || !timeframe || !status) {
      alert("Preencha todos os campos obrigatórios (*)");
      return;
    }

    if ((status === "pausada" || status === "cancelada") && !pauseReason) {
      alert("Motivo é obrigatório para pausar/cancelar");
      return;
    }

    const modal = document.getElementById("modal-initiative");
    const editId = modal.dataset.editId ? parseInt(modal.dataset.editId) : null;

    if (editId) {
      // Editar
      const init = roadmap.initiatives.find((i) => i.id === editId);
      if (init) {
        init.title = title;
        init.type = type;
        init.priority = priority;
        init.timeframe = timeframe;
        init.strategicOrder = order;
        init.description = description;
        init.problem = problem;
        init.expectedResult = result;
        init.impactTech = impactTech;
        init.impactFinance = impactFinance;
        init.impactOps = impactOps;
        init.impactComm = impactComm;
        init.status = status;
        init.pauseReason = pauseReason;
        init.notes = notes;
        init.risks = risks;
        init.relatedDecisions = relatedDecisions;
        init.updatedInVersion = roadmap.version;
      }
    } else {
      // Criar nova
      const newInit = {
        id: Date.now(),
        title,
        type,
        priority,
        timeframe,
        strategicOrder: order,
        description,
        problem,
        expectedResult: result,
        impactTech,
        impactFinance,
        impactOps,
        impactComm,
        status,
        pauseReason,
        notes,
        risks,
        relatedDecisions,
        createdInVersion: roadmap.version,
        updatedInVersion: roadmap.version,
      };

      if (!roadmap.initiatives) {
        roadmap.initiatives = [];
      }
      roadmap.initiatives.push(newInit);
    }

    roadmap.updatedAt = Date.now();

    const roadmaps = getAllRoadmaps();
    const idx = roadmaps.findIndex((r) => r.id === roadmap.id);
    if (idx !== -1) {
      roadmaps[idx] = roadmap;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roadmaps));

    modal.classList.remove("active");
    renderCurrentRoadmap();

    alert(editId ? "Iniciativa atualizada!" : "Iniciativa criada!");
  }

  function openPauseInitiativeModal(initId) {
    const roadmap = getCurrentRoadmap();
    if (!roadmap) return;

    const init = roadmap.initiatives.find((i) => i.id === initId);
    if (!init) return;

    document.getElementById("pause-initiative-name").textContent = `Iniciativa: ${escapeHtml(init.title)}`;
    document.getElementById("pause-new-status").value = "pausada";
    document.getElementById("pause-reason").value = "";

    const modal = document.getElementById("modal-pause-initiative");
    modal.classList.add("active");
    modal.dataset.initId = initId;
  }

  function handlePauseInitiative() {
    const modal = document.getElementById("modal-pause-initiative");
    const initId = parseInt(modal.dataset.initId);
    const newStatus = document.getElementById("pause-new-status").value;
    const reason = document.getElementById("pause-reason").value.trim();

    if (!reason) {
      alert("Motivo é obrigatório");
      return;
    }

    const roadmap = getCurrentRoadmap();
    if (!roadmap) return;

    const init = roadmap.initiatives.find((i) => i.id === initId);
    if (init) {
      init.status = newStatus;
      init.pauseReason = reason;
      init.updatedInVersion = roadmap.version;
    }

    roadmap.updatedAt = Date.now();

    const roadmaps = getAllRoadmaps();
    const idx = roadmaps.findIndex((r) => r.id === roadmap.id);
    if (idx !== -1) {
      roadmaps[idx] = roadmap;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roadmaps));

    modal.classList.remove("active");
    renderCurrentRoadmap();

    alert("Status atualizado!");
  }

  function viewRoadmapDetails(roadmapId) {
    const roadmap = getAllRoadmaps().find((r) => r.id === roadmapId);
    if (!roadmap) return;

    let details = `Roadmap: ${roadmap.title} v${roadmap.version}\n\n`;
    details += `Status: ${roadmap.status}\n`;
    details += `Período: ${roadmap.periodStart} a ${roadmap.periodEnd}\n\n`;
    details += `Objetivo:\n${roadmap.objective}\n\n`;

    if (roadmap.premises) {
      details += `Premissas:\n${roadmap.premises}\n\n`;
    }

    if (roadmap.restrictions) {
      details += `Restrições:\n${roadmap.restrictions}\n\n`;
    }

    details += `\nIniciativas: ${roadmap.initiatives?.length || 0}`;

    alert(details);
  }

  function openDeleteRoadmapModal(roadmapId) {
    const roadmap = getAllRoadmaps().find((r) => r.id === roadmapId);
    if (!roadmap) {
      alert("Roadmap não encontrado");
      return;
    }

    document.getElementById("delete-roadmap-name").textContent = `${escapeHtml(roadmap.title)} (v${escapeHtml(roadmap.version)})`;
    
    const modal = document.getElementById("modal-delete-roadmap");
    modal.classList.add("active");
    modal.dataset.roadmapId = roadmapId;
  }

  function deleteRoadmap(roadmapId) {
    const roadmaps = getAllRoadmaps();
    const filtered = roadmaps.filter((r) => r.id !== roadmapId);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    
    document.getElementById("modal-delete-roadmap").classList.remove("active");
    renderCurrentRoadmap();
    renderHistory();
    
    alert("Roadmap deletado com sucesso!");
  }

  function archiveRoadmap(roadmapId) {
    const roadmap = getAllRoadmaps().find((r) => r.id === roadmapId);
    if (!roadmap) return;

    roadmap.status = "arquivado";
    roadmap.updatedAt = Date.now();

    const roadmaps = getAllRoadmaps();
    const idx = roadmaps.findIndex((r) => r.id === roadmapId);
    if (idx !== -1) {
      roadmaps[idx] = roadmap;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roadmaps));

    renderCurrentRoadmap();
    renderHistory();

    alert("Roadmap arquivado!");
  }

  function restoreRoadmap(roadmapId) {
    const roadmap = getAllRoadmaps().find((r) => r.id === roadmapId);
    if (!roadmap) return;

    // Se há um ativo, marcar como substituído
    const current = getCurrentRoadmap();
    if (current) {
      current.status = "substituido";
      current.updatedAt = Date.now();
    }

    // Restaurar o selecionado
    roadmap.status = "ativo";
    roadmap.updatedAt = Date.now();

    const roadmaps = getAllRoadmaps();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roadmaps));

    renderCurrentRoadmap();
    renderHistory();

    alert("Roadmap restaurado como ativo!");
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
  const ready = window.App?.storageReady || Promise.resolve();
  const boot = () => ready.then(() => init());
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // ========================
  // PUBLIC API
  // ========================
  return {
    init,
    openNewInitiativeModal,
    openEditInitiativeModal,
    openPauseInitiativeModal,
    openEditRoadmapModal,
    openDeleteRoadmapModal,
    deleteRoadmap,
    archiveRoadmap,
    restoreRoadmap,
    viewRoadmapDetails,
    renderCurrentRoadmap,
    renderHistory,
  };
})();
