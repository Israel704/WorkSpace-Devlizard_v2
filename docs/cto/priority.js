// Prioridades de Projetos (CTO)
(function () {
  const STORAGE_KEY = "cto_priority_projects_v1";
  const DEV_STATUSES = ["Em execução", "Em pausa"];
  const PRICING_STATUSES = ["Precificado", "Em negociação"];

  const { ProjectsStore, ClientsStore } = window;
  if (!ProjectsStore || !ClientsStore) return;

  const state = {
    search: "",
    status: "",
    onlyDev: false,
    order: [],
    updatedAt: null,
    projects: [],
  };

  const byId = (id) => document.getElementById(id);

  const loadPriorityState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { order: [], updatedAt: null };
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return { order: parsed, updatedAt: null };
      }
      if (parsed && Array.isArray(parsed.order)) {
        return { order: parsed.order, updatedAt: parsed.updatedAt || null };
      }
    } catch (_) {}
    return { order: [], updatedAt: null };
  };

  const savePriorityState = (order) => {
    const payload = { order: order.slice(), updatedAt: Date.now() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {}
    return payload;
  };

  const normalizeOrder = (projects, order) => {
    const projectIds = projects.map((p) => String(p.id));
    const seen = new Set();
    const cleaned = (order || [])
      .map((id) => String(id))
      .filter((id) => projectIds.includes(id))
      .filter((id) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    const missing = projectIds.filter((id) => !seen.has(id));
    return cleaned.concat(missing);
  };

  const buildOrderIndex = (order) => {
    const index = new Map();
    order.forEach((id, idx) => index.set(String(id), idx));
    return index;
  };

  const getClientName = (project) => {
    const client = ClientsStore.findById(project.clientId);
    return client?.name || "Cliente removido";
  };

  const formatDate = (value) => {
    if (!value) return "-";
    if (window.App?.formatDate) return window.App.formatDate(value);
    return new Date(value).toLocaleString("pt-BR");
  };

  const hydrateProjects = () => {
    state.projects = ProjectsStore.loadAll() || [];
    const priority = loadPriorityState();
    const normalized = normalizeOrder(state.projects, priority.order || []);
    state.order = normalized;
    state.updatedAt = priority.updatedAt || null;
    if (normalized.length !== (priority.order || []).length) {
      const saved = savePriorityState(normalized);
      state.updatedAt = saved.updatedAt;
    }
  };

  const getSortedProjects = () => {
    const index = buildOrderIndex(state.order);
    return state.projects
      .slice()
      .sort((a, b) => {
        const ai = index.has(String(a.id)) ? index.get(String(a.id)) : Number.MAX_SAFE_INTEGER;
        const bi = index.has(String(b.id)) ? index.get(String(b.id)) : Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
  };

  const applyFilters = (projects) => {
    const search = state.search.trim().toLowerCase();
    return projects.filter((project) => {
      if (state.onlyDev && !DEV_STATUSES.includes(project.status)) return false;
      if (state.status && project.status !== state.status) return false;
      if (!search) return true;

      const clientName = getClientName(project).toLowerCase();
      const haystack = [
        project.name,
        project.description,
        project.status,
        clientName,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  };

  const updateStats = (projects) => {
    const total = projects.length;
    const inDev = projects.filter((p) => DEV_STATUSES.includes(p.status)).length;
    const inAnalysis = projects.filter((p) => p.status === "Em análise técnica").length;
    const inPricing = projects.filter((p) => PRICING_STATUSES.includes(p.status)).length;

    const totalEl = byId("priorityTotal");
    const devEl = byId("priorityInDev");
    const analysisEl = byId("priorityInAnalysis");
    const pricingEl = byId("priorityInPricing");

    if (totalEl) totalEl.textContent = total;
    if (devEl) devEl.textContent = inDev;
    if (analysisEl) analysisEl.textContent = inAnalysis;
    if (pricingEl) pricingEl.textContent = inPricing;
  };

  const updateUpdatedAt = () => {
    const updatedEl = byId("priorityUpdatedAt");
    if (!updatedEl) return;
    if (!state.updatedAt) {
      updatedEl.textContent = "";
      return;
    }
    updatedEl.textContent = `Atualizado em ${formatDate(state.updatedAt)}`;
  };

  const renderList = () => {
    const list = byId("priorityList");
    if (!list) return;

    const projects = applyFilters(getSortedProjects());
    updateStats(projects);
    updateUpdatedAt();

    if (!projects.length) {
      list.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--muted);">Nenhum projeto encontrado.</div>';
      return;
    }

    const total = projects.length;
    list.innerHTML = projects
      .map((project, index) => {
        const clientName = getClientName(project);
        const isDev = DEV_STATUSES.includes(project.status);
        const devBadge = isDev ? '<span class="badge" style="background: rgba(25,135,84,0.2); color: var(--success);">Em desenvolvimento</span>' : "";
        const statusBadge = `<span class="badge" style="background: rgba(13,110,253,0.2); color: var(--primary);">${project.status || "-"}</span>`;
        const lastUpdate = formatDate(project.updatedAt || project.createdAt);
        const disableUp = index === 0 ? "disabled" : "";
        const disableDown = index === total - 1 ? "disabled" : "";

        return `
          <div class="priority-item" draggable="true" data-id="${project.id}">
            <div class="priority-handle" aria-label="Arrastar">⠿</div>
            <div class="priority-number">${index + 1}</div>
            <div style="flex: 1; min-width: 220px;">
              <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px;">
                <strong>${project.name || "Projeto sem nome"}</strong>
                ${statusBadge}
                ${devBadge}
              </div>
              <div style="margin-top: 6px; color: var(--muted); font-size: 13px;">Cliente: ${clientName}</div>
              <div style="margin-top: 6px; color: var(--muted); font-size: 12px;">Última atualização: ${lastUpdate}</div>
              ${project.description ? `<div style="margin-top: 8px; font-size: 13px; color: var(--muted);">${project.description}</div>` : ""}
            </div>
            <div class="priority-actions" style="display: flex; flex-direction: column; gap: 6px;">
              <button data-action="up" data-id="${project.id}" ${disableUp}>↑</button>
              <button data-action="down" data-id="${project.id}" ${disableDown}>↓</button>
            </div>
          </div>
        `;
      })
      .join("");
  };

  const updateOrderFromVisible = (visibleIds) => {
    const visibleSet = new Set(visibleIds.map(String));
    const current = state.order.slice();
    const nextVisible = visibleIds.map(String)[Symbol.iterator]();

    const updated = current.map((id) => (visibleSet.has(String(id)) ? nextVisible.next().value : String(id)));
    const saved = savePriorityState(updated);
    state.order = updated;
    state.updatedAt = saved.updatedAt;
  };

  const setupDragAndDrop = () => {
    const list = byId("priorityList");
    if (!list) return;

    let draggingId = null;

    list.addEventListener("dragstart", (event) => {
      const item = event.target.closest(".priority-item");
      if (!item) return;
      draggingId = item.dataset.id;
      item.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
    });

    list.addEventListener("dragover", (event) => {
      event.preventDefault();
      const item = event.target.closest(".priority-item");
      if (!item || item.dataset.id === draggingId) return;

      const dragging = list.querySelector(".priority-item.dragging");
      if (!dragging) return;

      const rect = item.getBoundingClientRect();
      const after = event.clientY - rect.top > rect.height / 2;
      list.insertBefore(dragging, after ? item.nextSibling : item);
    });

    list.addEventListener("dragend", () => {
      const dragging = list.querySelector(".priority-item.dragging");
      if (dragging) dragging.classList.remove("dragging");
      const visibleIds = Array.from(list.querySelectorAll(".priority-item")).map((el) => el.dataset.id);
      if (visibleIds.length) {
        updateOrderFromVisible(visibleIds);
      }
      renderList();
      draggingId = null;
    });
  };

  const handleMoveClick = (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;

    const list = byId("priorityList");
    if (!list) return;

    const action = btn.dataset.action;
    const visibleIds = Array.from(list.querySelectorAll(".priority-item")).map((el) => el.dataset.id);
    const id = String(btn.dataset.id);
    const index = visibleIds.indexOf(id);
    if (index < 0) return;

    const targetIndex = action === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= visibleIds.length) return;

    const swapped = visibleIds.slice();
    const tmp = swapped[index];
    swapped[index] = swapped[targetIndex];
    swapped[targetIndex] = tmp;

    updateOrderFromVisible(swapped);
    renderList();
  };

  const populateStatusFilter = () => {
    const select = byId("priorityStatus");
    if (!select) return;

    const statuses = ProjectsStore.STATUS || [];
    statuses.forEach((status) => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      select.appendChild(option);
    });
  };

  const bindControls = () => {
    const search = byId("prioritySearch");
    const status = byId("priorityStatus");
    const onlyDev = byId("priorityOnlyDev");
    const resetBtn = byId("priorityReset");
    const reloadBtn = byId("priorityReload");
    const list = byId("priorityList");

    if (search) {
      search.addEventListener("input", (event) => {
        state.search = event.target.value;
        renderList();
      });
    }

    if (status) {
      status.addEventListener("change", (event) => {
        state.status = event.target.value;
        renderList();
      });
    }

    if (onlyDev) {
      onlyDev.addEventListener("change", (event) => {
        state.onlyDev = event.target.checked;
        renderList();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const sorted = state.projects
          .slice()
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
          .map((p) => String(p.id));
        const saved = savePriorityState(sorted);
        state.order = sorted;
        state.updatedAt = saved.updatedAt;
        renderList();
      });
    }

    if (reloadBtn) {
      reloadBtn.addEventListener("click", () => {
        hydrateProjects();
        renderList();
      });
    }

    if (list) {
      list.addEventListener("click", handleMoveClick);
    }
  };

  const init = () => {
    hydrateProjects();
    populateStatusFilter();
    bindControls();
    renderList();
    setupDragAndDrop();
  };

  document.addEventListener("DOMContentLoaded", () => {
    const ready = window.App?.storageReady || Promise.resolve();
    ready.then(init);
  });
})();
