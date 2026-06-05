// Cadastro de Projetos (CTO)
(function () {
  const { ClientsStore, ProjectsStore } = window;
  if (!ClientsStore || !ProjectsStore) return;

  let editingId = null;

  const complexityCriteriaMap = {
    baixa: "Poucas integrações, regras simples, até 10 funcionalidades.",
    media: "Múltiplos módulos, regras moderadas, 10-30 funcionalidades.",
    alta: "Arquitetura distribuída, integrações críticas, 30+ funcionalidades.",
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    if (window.App?.formatDate) return window.App.formatDate(value);
    return new Date(value).toLocaleString("pt-BR");
  };

  const getRole = () => (window.App?.getRole?.() || "").toLowerCase();

  const canEditProject = (project) => {
    if (!project) return false;
    if (project.scopeLocked) return false;
    return project.status === ProjectsStore.STATUS[1] || project.status === ProjectsStore.STATUS[0];
  };

  const populateClients = () => {
    const select = document.getElementById("projectClient");
    const noClientsMessage = document.getElementById("noClientsMessage");
    if (!select) return;

    const clients = ClientsStore.getAll();
    select.innerHTML = "";

    if (!clients.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Cadastre um cliente primeiro";
      select.appendChild(option);
      select.disabled = true;
      if (noClientsMessage) noClientsMessage.style.display = "block";
      return;
    }

    select.disabled = false;
    if (noClientsMessage) noClientsMessage.style.display = "none";

    clients
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((client) => {
        const option = document.createElement("option");
        option.value = client.id;
        option.textContent = client.name;
        select.appendChild(option);
      });
  };

  const updateComplexityCriteria = () => {
    const select = document.getElementById("projectComplexity");
    const criteria = document.getElementById("complexityCriteria");
    if (!select || !criteria) return;
    criteria.textContent = complexityCriteriaMap[select.value] || "Selecione para ver os critérios.";
  };

  const createModuleRow = (data = {}) => {
    const wrapper = document.createElement("div");
    wrapper.className = "card";
    wrapper.style.padding = "12px";

    wrapper.innerHTML = `
      <div style="display: flex; gap: 8px; align-items: flex-start; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 220px;">
          <label>Nome do módulo</label>
          <input class="module-name" type="text" placeholder="Ex.: Admin, Financeiro" value="${data.name || ""}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" />
        </div>
        <div style="flex: 2; min-width: 280px;">
          <label>Funcionalidades (uma por linha)</label>
          <textarea class="module-features" rows="3" placeholder="Ex.: Cadastro de usuários" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">${(data.features || []).join("\n")}</textarea>
        </div>
        <button type="button" class="remove-module" style="height: 36px; margin-top: 22px; background: #dc3545; color: white; border: none; border-radius: 4px; padding: 0 12px; cursor: pointer;">Remover</button>
      </div>
    `;

    wrapper.querySelector(".remove-module").addEventListener("click", () => {
      wrapper.remove();
    });

    return wrapper;
  };

  const renderModules = (modules = []) => {
    const list = document.getElementById("modulesList");
    if (!list) return;
    list.innerHTML = "";
    if (!modules.length) {
      list.appendChild(createModuleRow());
      return;
    }
    modules.forEach((module) => list.appendChild(createModuleRow(module)));
  };

  const collectModules = () => {
    const list = document.getElementById("modulesList");
    if (!list) return [];
    const rows = Array.from(list.querySelectorAll(".card"));
    return rows
      .map((row) => {
        const name = row.querySelector(".module-name")?.value.trim() || "";
        const featuresRaw = row.querySelector(".module-features")?.value || "";
        const features = featuresRaw
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean);
        if (!name && !features.length) return null;
        return { name, features };
      })
      .filter(Boolean);
  };

  const collectCategories = () => {
    const checkboxes = document.querySelectorAll("input[type='checkbox']");
    const categories = {};
    checkboxes.forEach((checkbox) => {
      categories[checkbox.value] = checkbox.checked;
    });
    return categories;
  };

  const resetForm = () => {
    const form = document.getElementById("projectForm");
    form?.reset();
    editingId = null;
    renderModules([]);
    updateComplexityCriteria();
    populateClients();
    const submitBtn = document.getElementById("submitProject");
    if (submitBtn) submitBtn.textContent = "Salvar projeto";
    const cancelBtn = document.getElementById("cancelProjectEdit");
    if (cancelBtn) cancelBtn.style.display = "none";
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const clientId = Number(document.getElementById("projectClient")?.value || 0);
    const name = document.getElementById("projectName")?.value.trim();
    const description = document.getElementById("projectDescription")?.value.trim();
    const complexity = document.getElementById("projectComplexity")?.value;
    const featuresCount = Number(document.getElementById("projectFeaturesCount")?.value || 0);
    const risks = document.getElementById("projectRisks")?.value.trim() || "";
    const modules = collectModules();
    const categories = collectCategories();
    const complexityCriteria = complexityCriteriaMap[complexity] || "";

    if (!clientId) {
      alert("Selecione um cliente.");
      return;
    }
    if (!name || !description) {
      alert("Nome e descrição são obrigatórios.");
      return;
    }
    if (!complexity) {
      alert("Selecione a complexidade técnica.");
      return;
    }
    if (featuresCount <= 0) {
      alert("Quantidade de funcionalidades deve ser maior que zero.");
      return;
    }

    if (editingId) {
      const project = ProjectsStore.getById(editingId);
      if (!canEditProject(project)) {
        alert("Este projeto está bloqueado para edição.");
        return;
      }
      ProjectsStore.updateProject(editingId, {
        clientId,
        name,
        description,
        complexity,
        complexityCriteria,
        featuresCount,
        modules,
        categories,
        risks,
      });
    } else {
      ProjectsStore.createProject({
        clientId,
        name,
        description,
        complexity,
        complexityCriteria,
        featuresCount,
        modules,
        categories,
        risks,
      });
    }

    resetForm();
    renderProjects();
  };

  const startEdit = (id) => {
    const project = ProjectsStore.getById(id);
    if (!project) return;
    if (!canEditProject(project)) {
      alert("Este projeto está bloqueado para edição.");
      return;
    }

    editingId = id;
    document.getElementById("projectClient").value = project.clientId || "";
    document.getElementById("projectName").value = project.name || "";
    document.getElementById("projectDescription").value = project.description || "";
    document.getElementById("projectComplexity").value = project.complexity || "";
    document.getElementById("projectFeaturesCount").value = project.featuresCount || 0;
    document.getElementById("projectRisks").value = project.risks || "";
    renderModules(project.modules || []);
    updateComplexityCriteria();

    const categories = project.categories || {};
    document.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
      checkbox.checked = !!categories[checkbox.value];
    });

    const submitBtn = document.getElementById("submitProject");
    if (submitBtn) submitBtn.textContent = "Atualizar projeto";
    const cancelBtn = document.getElementById("cancelProjectEdit");
    if (cancelBtn) cancelBtn.style.display = "inline-flex";
    window.scrollTo(0, 0);
  };

  const addComment = (id) => {
    const textarea = document.getElementById(`commentInput_${id}`);
    if (!textarea) return;
    const message = textarea.value.trim();
    if (!message) return;
    ProjectsStore.addComment(id, message);
    textarea.value = "";
    renderProjects();
  };

  const addExecutionTask = (id) => {
    const input = document.getElementById(`taskInput_${id}`);
    if (!input) return;
    const title = input.value.trim();
    if (!title) return;
    ProjectsStore.addExecutionTask(id, { title });
    input.value = "";
    renderProjects();
  };

  const toggleTask = (projectId, taskId, status) => {
    ProjectsStore.updateExecutionTask(projectId, taskId, status);
    renderProjects();
  };

  const startProduction = (id) => {
    const project = ProjectsStore.getById(id);
    if (!project) return;
    ProjectsStore.updateProject(id, {
      execution: { ...project.execution, productionStartAt: Date.now() },
    });
    renderProjects();
  };

  const renderProjects = () => {
    const container = document.getElementById("projectsList");
    if (!container) return;

    const projects = ProjectsStore.loadAll().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (!projects.length) {
      container.innerHTML =
        '<div class="card"><p style="color: var(--muted); text-align: center; margin: 0;">Nenhum projeto cadastrado.</p></div>';
      return;
    }

    const role = getRole();
    const html = projects
      .map((project) => {
        const client = ClientsStore.findById(project.clientId);
        const canEdit = canEditProject(project);
        const categories = Object.keys(project.categories || {})
          .filter((key) => project.categories[key])
          .join(", ");

        const modulesHtml = (project.modules || [])
          .map((module) => {
            const features = (module.features || []).map((f) => `<li>${f}</li>`).join("");
            return `
              <div style="padding: 10px; border: 1px solid #2a2f3a; border-radius: 6px; margin-bottom: 6px;">
                <strong>${module.name || "Módulo"}</strong>
                <ul style="margin: 6px 0 0 16px; color: var(--muted);">${features || "<li>Sem funcionalidades</li>"}</ul>
              </div>
            `;
          })
          .join("");

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

        const tasksHtml = (project.execution?.tasks || [])
          .map(
            (task) => `
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 0; border-bottom: 1px solid #2a2f3a;">
                <span>${task.title}</span>
                <select onchange="window.CTOProjects.toggleTask(${project.id}, ${task.id}, this.value)" style="padding: 6px 8px; border-radius: 4px;">
                  <option value="pendente" ${task.status === "pendente" ? "selected" : ""}>Pendente</option>
                  <option value="em_andamento" ${task.status === "em_andamento" ? "selected" : ""}>Em andamento</option>
                  <option value="concluido" ${task.status === "concluido" ? "selected" : ""}>Concluído</option>
                </select>
              </div>
            `
          )
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
                <p style="margin: 6px 0 0 0; color: var(--muted); font-size: 14px;">Complexidade: ${project.complexity?.toUpperCase?.() || "-"} • ${project.featuresCount} funcionalidades</p>
                <p style="margin: 8px 0 0 0;">${project.description || "Sem descrição."}</p>
                ${project.risks ? `<p style="margin: 6px 0 0 0; color: var(--muted);"><strong>Riscos:</strong> ${project.risks}</p>` : ""}
                ${categories ? `<p style="margin: 6px 0 0 0; color: var(--muted);"><strong>Categorias:</strong> ${categories}</p>` : ""}
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px; min-width: 180px; align-items: flex-end;">
                <button ${canEdit ? "" : "disabled"} onclick="window.CTOProjects.edit(${project.id})" style="padding: 8px 12px; border: 1px solid #007bff; background: white; color: #007bff; border-radius: 4px; cursor: pointer;">Editar</button>
                ${project.scopeLocked ? '<small style="color: var(--muted); font-size: 11px;">Escopo congelado</small>' : ""}
              </div>
            </div>

            <div style="margin-top: 12px;">
              <h4 style="margin: 0 0 6px 0;">Funcionalidades por módulo</h4>
              ${modulesHtml || "<p style='color: var(--muted);'>Nenhum módulo informado.</p>"}
            </div>

            ${project.pricing ? `
              <div style="margin-top: 12px; padding: 10px; border: 1px solid #2a2f3a; border-radius: 6px;">
                <strong>Precificação:</strong>
                <div style="font-size: 13px; color: var(--muted); margin-top: 6px;">
                  Custos técnicos: R$ ${project.pricing.techCost?.toFixed?.(2) || project.pricing.techCost || 0} •
                  Custos operacionais: R$ ${project.pricing.operationalCost?.toFixed?.(2) || project.pricing.operationalCost || 0} •
                  Margem: ${project.pricing.marginPercent || 0}%
                </div>
                <div style="margin-top: 4px;"><strong>Preço final:</strong> R$ ${project.pricing.finalPrice?.toFixed?.(2) || project.pricing.finalPrice || 0}</div>
              </div>
            ` : ""}

            <details style="margin-top: 12px;">
              <summary style="cursor: pointer; color: var(--muted); font-size: 12px;">Comentários técnicos</summary>
              <div style="margin-top: 8px;">
                ${commentsHtml || "<p style='color: var(--muted);'>Sem comentários.</p>"}
                ${role === "cto" ? `
                  <div style="margin-top: 8px; display: flex; gap: 8px;">
                    <input id="commentInput_${project.id}" type="text" placeholder="Adicionar comentário..." style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <button onclick="window.CTOProjects.addComment(${project.id})" style="padding: 8px 12px; background: #198754; color: white; border: none; border-radius: 4px;">Enviar</button>
                  </div>
                ` : ""}
              </div>
            </details>

            ${project.status === ProjectsStore.STATUS[6] ? `
              <div style="margin-top: 12px;">
                <h4 style="margin: 0 0 6px;">Execução do projeto</h4>
                <p style="margin: 0 0 8px; color: var(--muted); font-size: 12px;">Início: ${formatDateTime(project.execution?.productionStartAt)}</p>
                ${!project.execution?.productionStartAt ? `
                  <button onclick="window.CTOProjects.startProduction(${project.id})" style="padding: 6px 10px; background: #0d6efd; color: white; border: none; border-radius: 4px; margin-bottom: 8px;">Registrar início</button>
                ` : ""}
                <div style="margin-top: 6px;">
                  ${tasksHtml || "<p style='color: var(--muted);'>Nenhuma tarefa registrada.</p>"}
                </div>
                <div style="margin-top: 8px; display: flex; gap: 8px;">
                  <input id="taskInput_${project.id}" type="text" placeholder="Nova tarefa" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                  <button onclick="window.CTOProjects.addTask(${project.id})" style="padding: 8px 12px; background: #198754; color: white; border: none; border-radius: 4px;">Adicionar</button>
                </div>
              </div>
            ` : ""}

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

  const bindEvents = () => {
    document.getElementById("projectForm")?.addEventListener("submit", handleSubmit);
    document.getElementById("cancelProjectEdit")?.addEventListener("click", resetForm);
    document.getElementById("addModuleBtn")?.addEventListener("click", () => {
      const list = document.getElementById("modulesList");
      if (!list) return;
      list.appendChild(createModuleRow());
    });
    document.getElementById("projectComplexity")?.addEventListener("change", updateComplexityCriteria);
  };

  document.addEventListener("DOMContentLoaded", () => {
    const ready = window.App?.storageReady || Promise.resolve();
    ready.then(() => {
      populateClients();
      renderModules([]);
      updateComplexityCriteria();
      bindEvents();
      renderProjects();
    });
  });

  window.CTOProjects = {
    edit: startEdit,
    addComment,
    addTask: addExecutionTask,
    toggleTask,
    startProduction,
  };
})();
