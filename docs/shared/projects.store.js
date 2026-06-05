// Shared Projects Store (localStorage) - DevLizard
(function () {
  const STORAGE_KEY = "dl_projects_v1";

  const STATUS = [
    "Lead",
    "Em análise técnica",
    "Precificado",
    "Em negociação",
    "Aceito",
    "Negado",
    "Em execução",
    "Em pausa",
    "Concluído",
  ];

  const getActor = () => {
    const role = (window.App?.getRole?.() || localStorage.getItem(window.App?.STORAGE_KEYS?.ROLE) || "").toLowerCase();
    const name =
      localStorage.getItem(window.App?.STORAGE_KEYS?.PROFILE_NAME || "profile_name") ||
      window.App?.getUser?.() ||
      "Usuário";
    return { role, name };
  };

  const loadAll = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn("Erro ao ler projetos:", err);
      return [];
    }
  };

  const saveAll = (projects) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  };

  const logStatusChange = (project, fromStatus, toStatus, actor, meta = {}) => {
    const history = Array.isArray(project.statusHistory) ? project.statusHistory.slice() : [];
    history.push({
      at: Date.now(),
      byRole: actor.role || "system",
      byName: actor.name || "Sistema",
      from: fromStatus || "-",
      to: toStatus,
      meta,
    });
    return history;
  };

  const createProject = (payload) => {
    const actor = getActor();
    const now = Date.now();
    const projects = loadAll();
    const status = "Em análise técnica";

    const project = {
      id: now,
      clientId: Number(payload.clientId || 0),
      name: payload.name || "",
      description: payload.description || "",
      complexity: payload.complexity || "media",
      complexityCriteria: payload.complexityCriteria || "",
      featuresCount: Number(payload.featuresCount || 0),
      modules: Array.isArray(payload.modules) ? payload.modules : [],
      categories: payload.categories || {},
      risks: payload.risks || "",
      status,
      createdAt: now,
      updatedAt: now,
      createdBy: { role: actor.role, name: actor.name },
      statusHistory: logStatusChange({}, "Lead", status, actor),
      comments: [],
      pricing: null,
      proposal: null,
      assignedRole: "",
      assignedAt: null,
      scopeLocked: false,
      scopeLockedAt: null,
      execution: {
        productionStartAt: null,
        tasks: [],
      },
    };

    projects.push(project);
    saveAll(projects);
    return project;
  };

  const updateProject = (id, payload) => {
    const projects = loadAll();
    const index = projects.findIndex((p) => p.id === id);
    if (index < 0) return null;

    const current = projects[index];
    const updated = {
      ...current,
      ...payload,
      updatedAt: Date.now(),
    };

    projects[index] = updated;
    saveAll(projects);
    return updated;
  };

  const addComment = (id, message) => {
    const actor = getActor();
    const projects = loadAll();
    const index = projects.findIndex((p) => p.id === id);
    if (index < 0) return null;

    const project = projects[index];
    const comments = Array.isArray(project.comments) ? project.comments.slice() : [];
    comments.push({
      id: Date.now(),
      at: Date.now(),
      byRole: actor.role || "system",
      byName: actor.name,
      message: message || "",
    });

    projects[index] = { ...project, comments, updatedAt: Date.now() };
    saveAll(projects);
    return projects[index];
  };

  const setStatus = (id, nextStatus, meta = {}) => {
    const actor = getActor();
    const projects = loadAll();
    const index = projects.findIndex((p) => p.id === id);
    if (index < 0) return null;
    const project = projects[index];
    const fromStatus = project.status || "Lead";

    const statusHistory = logStatusChange(project, fromStatus, nextStatus, actor, meta);
    const updated = {
      ...project,
      status: nextStatus,
      statusHistory,
      updatedAt: Date.now(),
    };

    projects[index] = updated;
    saveAll(projects);
    return updated;
  };

  const applyPricing = (id, pricing, proposalSnapshot) => {
    const actor = getActor();
    const projects = loadAll();
    const index = projects.findIndex((p) => p.id === id);
    if (index < 0) return null;
    const project = projects[index];

    let updated = {
      ...project,
      pricing,
      proposal: {
        generatedAt: Date.now(),
        generatedBy: { role: actor.role, name: actor.name },
        snapshot: proposalSnapshot,
      },
      updatedAt: Date.now(),
    };

    updated.statusHistory = logStatusChange(project, project.status || "Lead", "Precificado", actor, {
      action: "pricing",
    });
    updated.status = "Precificado";

    projects[index] = updated;
    saveAll(projects);
    return updated;
  };

  const markCommercialStatus = (id, nextStatus) => {
    let updated = setStatus(id, nextStatus, { action: "commercial" });
    if (!updated) return null;

    if (nextStatus === "Aceito") {
      const projects = loadAll();
      const index = projects.findIndex((p) => p.id === id);
      if (index < 0) return updated;
      const project = projects[index];

      const history = logStatusChange(project, "Aceito", "Em execução", { role: "system", name: "Sistema" }, {
        action: "auto-execution",
      });

      updated = {
        ...project,
        status: "Em execução",
        statusHistory: history,
        scopeLocked: true,
        scopeLockedAt: Date.now(),
        execution: {
          ...project.execution,
          productionStartAt: project.execution?.productionStartAt || Date.now(),
        },
        updatedAt: Date.now(),
      };
      projects[index] = updated;
      saveAll(projects);
    }

    return updated;
  };

  const addExecutionTask = (id, task) => {
    const actor = getActor();
    const projects = loadAll();
    const index = projects.findIndex((p) => p.id === id);
    if (index < 0) return null;
    const project = projects[index];

    const tasks = Array.isArray(project.execution?.tasks) ? project.execution.tasks.slice() : [];
    tasks.push({
      id: Date.now(),
      title: task.title || "",
      ownerRole: task.ownerRole || actor.role || "",
      status: "pendente",
      createdAt: Date.now(),
    });

    projects[index] = {
      ...project,
      execution: { ...project.execution, tasks },
      updatedAt: Date.now(),
    };
    saveAll(projects);
    return projects[index];
  };

  const updateExecutionTask = (id, taskId, status) => {
    const projects = loadAll();
    const index = projects.findIndex((p) => p.id === id);
    if (index < 0) return null;
    const project = projects[index];

    const tasks = Array.isArray(project.execution?.tasks) ? project.execution.tasks.slice() : [];
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex < 0) return null;
    tasks[taskIndex] = { ...tasks[taskIndex], status };

    projects[index] = {
      ...project,
      execution: { ...project.execution, tasks },
      updatedAt: Date.now(),
    };
    saveAll(projects);
    return projects[index];
  };

  const getById = (id) => loadAll().find((p) => p.id === id);

  const assignRole = (id, role) => {
    const projects = loadAll();
    const index = projects.findIndex((p) => p.id === id);
    if (index < 0) return null;
    const project = projects[index];
    const updated = {
      ...project,
      assignedRole: role || "",
      assignedAt: Date.now(),
      updatedAt: Date.now(),
    };
    projects[index] = updated;
    saveAll(projects);
    return updated;
  };

  const completeProject = (id) => setStatus(id, "Concluído", { action: "commercial-complete" });

  const clearProposal = (id) => {
    const projects = loadAll();
    const index = projects.findIndex((p) => p.id === id);
    if (index < 0) return null;
    const project = projects[index];
    const updated = {
      ...project,
      proposal: null,
      assignedRole: "",
      assignedAt: null,
      updatedAt: Date.now(),
    };
    projects[index] = updated;
    saveAll(projects);
    return updated;
  };

  const removeProject = (id) => {
    const projects = loadAll().filter((p) => p.id !== id);
    saveAll(projects);
  };

  window.ProjectsStore = {
    STORAGE_KEY,
    STATUS,
    loadAll,
    saveAll,
    getById,
    createProject,
    updateProject,
    setStatus,
    addComment,
    applyPricing,
    markCommercialStatus,
    addExecutionTask,
    updateExecutionTask,
    assignRole,
    completeProject,
    clearProposal,
    removeProject,
  };
})();

