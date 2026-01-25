// CTO – Gestão Técnica
// Kanban Board + Dashboard com contadores de Intake e Debt

// ==================== CTO KANBAN ====================
const CTOKanban = (() => {
  // ==================== CONSTANTS ====================
  const STORAGE_KEY = 'cto_kanban_tasks';
  const SETTINGS_KEY = 'cto_kanban_settings';
  const STATUSES = ['backlog', 'ready', 'doing', 'review_wait', 'reviewing'];
  
  // ==================== STATE ====================
  let tasks = [];
  let filterText = '';
  let editingTaskId = null;
  let nextId = 1;
  let debounceTimer = null;

  // ==================== STORAGE ====================
  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ 
        nextId, 
        filterText,
        lastSaved: new Date().toISOString() 
      }));
    } catch (error) {
      console.error('Erro ao salvar no localStorage:', error);
      showToast('Erro ao salvar dados', 'error');
    }
  }

  function loadTasks() {
    try {
      const storedTasks = localStorage.getItem(STORAGE_KEY);
      const storedSettings = localStorage.getItem(SETTINGS_KEY);
      
      if (storedTasks) {
        tasks = JSON.parse(storedTasks);
      }
      
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        nextId = settings.nextId || 1;
        filterText = settings.filterText || '';
        if (filterText) {
          const filterInput = document.getElementById('kanbanFilterInput');
          if (filterInput) filterInput.value = filterText;
        }
      }
      
      // Encontrar o próximo ID disponível
      if (tasks.length > 0) {
        const maxId = Math.max(...tasks.map(t => t.id));
        nextId = Math.max(nextId, maxId + 1);
      }
    } catch (error) {
      console.error('Erro ao carregar do localStorage:', error);
      tasks = [];
      nextId = 1;
    }
  }

  // ==================== CRUD OPERATIONS ====================
  function createTask(taskData) {
    const task = {
      id: nextId++,
      title: taskData.title,
      description: taskData.description || '',
      status: taskData.status || 'backlog',
      createdAt: new Date().toISOString()
    };
    
    tasks.push(task);
    saveTasks();
    renderKanban();
    showToast('✅ Tarefa criada com sucesso!');
    return task;
  }

  function updateTask(id, taskData) {
    const task = tasks.find(t => t.id === id);
    if (!task) return null;
    
    task.title = taskData.title;
    task.description = taskData.description || '';
    
    saveTasks();
    renderKanban();
    showToast('✅ Tarefa atualizada!');
    return task;
  }

  function deleteTask(id) {
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return false;
    
    tasks.splice(index, 1);
    saveTasks();
    renderKanban();
    showToast('🗑️ Tarefa excluída!');
    return true;
  }

  function moveTask(id, newStatus) {
    const task = tasks.find(t => t.id === id);
    if (!task) return null;
    
    const oldStatus = task.status;
    task.status = newStatus;
    saveTasks();
    renderKanban();
    
    // Mostrar toast apenas se realmente moveu
    if (oldStatus !== newStatus) {
      showToast(`✅ Movido para ${getStatusLabel(newStatus)}!`);
    }
    
    return task;
  }

  // ==================== FILTERING ====================
  function filterTasks(searchText) {
    filterText = searchText.toLowerCase();
    
    // Salvar filtro nas configurações
    try {
      const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      settings.filterText = filterText;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Erro ao salvar filtro:', e);
    }
    
    renderKanban();
  }

  function getFilteredTasks() {
    if (!filterText) return tasks;
    
    return tasks.filter(task => {
      const titleMatch = task.title.toLowerCase().includes(filterText);
      const descMatch = task.description.toLowerCase().includes(filterText);
      return titleMatch || descMatch;
    });
  }

  function clearFilter() {
    filterText = '';
    const filterInput = document.getElementById('kanbanFilterInput');
    if (filterInput) filterInput.value = '';
    
    try {
      const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      settings.filterText = '';
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Erro ao limpar filtro:', e);
    }
    
    renderKanban();
    showToast('🔍 Filtro limpo!');
  }

  // ==================== RENDERING ====================
  function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.draggable = true;
    card.dataset.taskId = task.id;
    
    // Badge com ID
    const badge = document.createElement('div');
    badge.className = 'kanban-card-badge';
    badge.textContent = `DevLizard #${task.id}`;
    
    // Título
    const title = document.createElement('div');
    title.className = 'kanban-card-title';
    title.textContent = task.title;
    
    // Descrição (se existir)
    let description = null;
    if (task.description) {
      description = document.createElement('div');
      description.className = 'kanban-card-description';
      description.textContent = task.description.length > 60 
        ? task.description.substring(0, 60) + '...' 
        : task.description;
    }
    
    // Menu de ações
    const menu = document.createElement('div');
    menu.className = 'kanban-card-menu';
    if (window.App?.safeHTML) window.App.safeHTML(menu, '⋯'); else menu.innerHTML = '⋯';
    
    const dropdown = document.createElement('div');
    dropdown.className = 'kanban-card-dropdown';
    dropdown.style.display = 'none';
    
    // Opção Editar
    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️ Editar';
    editBtn.onclick = (e) => {
      e.stopPropagation();
      openEditModal(task.id);
      dropdown.style.display = 'none';
    };
    
    // Opção Excluir
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️ Excluir';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm(`Tem certeza que deseja excluir "${task.title}"?`)) {
        deleteTask(task.id);
      }
      dropdown.style.display = 'none';
    };
    
    // Opções "Mover para..."
    const moveToLabel = document.createElement('div');
    moveToLabel.className = 'dropdown-label';
    moveToLabel.textContent = 'Mover para:';
    
    dropdown.appendChild(editBtn);
    dropdown.appendChild(deleteBtn);
    dropdown.appendChild(moveToLabel);
    
    STATUSES.forEach(status => {
      if (status !== task.status) {
        const moveBtn = document.createElement('button');
        moveBtn.textContent = `→ ${getStatusLabel(status)}`;
        moveBtn.onclick = (e) => {
          e.stopPropagation();
          moveTask(task.id, status);
          dropdown.style.display = 'none';
        };
        dropdown.appendChild(moveBtn);
      }
    });
    
    menu.appendChild(dropdown);
    menu.onclick = (e) => {
      e.stopPropagation();
      const isVisible = dropdown.style.display === 'block';
      
      // Fechar todos os dropdowns
      document.querySelectorAll('.kanban-card-dropdown').forEach(d => {
        d.style.display = 'none';
      });
      
      // Toggle do dropdown atual
      dropdown.style.display = isVisible ? 'none' : 'block';
    };
    
    // Montar card
    card.appendChild(badge);
    card.appendChild(title);
    if (description) card.appendChild(description);
    card.appendChild(menu);
    
    // Drag & Drop handlers
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    
    return card;
  }

  function renderKanban() {
    const filteredTasks = getFilteredTasks();
    
    STATUSES.forEach(status => {
      const column = document.getElementById(`column-${status}`);
      const count = document.getElementById(`count-${status}`);
      
      const statusTasks = filteredTasks.filter(t => t.status === status);
      if (count) { if (window.App?.safeText) window.App.safeText(count, statusTasks.length); else count.textContent = statusTasks.length; }
      
      if (window.App?.safeHTML) window.App.safeHTML(column, ''); else column.innerHTML = '';
      
      if (statusTasks.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'kanban-empty';
        if (window.App?.safeText) window.App.safeText(emptyMsg, 'Sem itens'); else emptyMsg.textContent = 'Sem itens';
        column.appendChild(emptyMsg);
      } else {
        statusTasks.forEach(task => {
          column.appendChild(createTaskCard(task));
        });
      }
    });
  }

  function getStatusLabel(status) {
    const labels = {
      backlog: 'Backlog',
      ready: 'Disponíveis',
      doing: 'Em progresso',
      review_wait: 'Aguardando revisão',
      reviewing: 'Em revisão'
    };
    return labels[status] || status;
  }

  // ==================== DRAG & DROP ====================
  let draggedTaskId = null;

  function handleDragStart(e) {
    draggedTaskId = parseInt(e.target.dataset.taskId);
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedTaskId = null;
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Adicionar efeito visual na coluna
    const column = e.currentTarget;
    if (column.classList.contains('kanban-column-content')) {
      column.classList.add('drag-over');
    }
    
    return false;
  }

  function handleDragLeave(e) {
    const column = e.currentTarget;
    if (column.classList.contains('kanban-column-content')) {
      column.classList.remove('drag-over');
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Remover efeito visual
    const column = e.currentTarget;
    if (column.classList.contains('kanban-column-content')) {
      column.classList.remove('drag-over');
    }
    
    if (!draggedTaskId) return false;
    
    // Obter o status da coluna pai
    const columnElement = e.currentTarget;
    const kanbanColumn = columnElement.closest('.kanban-column');
    const newStatus = kanbanColumn ? kanbanColumn.dataset.status : null;
    
    if (newStatus) {
      // Encontrar a tarefa e atualizar seu status
      const task = tasks.find(t => t.id === draggedTaskId);
      if (task && task.status !== newStatus) {
        moveTask(draggedTaskId, newStatus);
      }
    }
    
    draggedTaskId = null;
    return false;
  }

  function setupDragAndDrop() {
    STATUSES.forEach(status => {
      const column = document.getElementById(`column-${status}`);
      if (column) {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('dragleave', handleDragLeave);
        column.addEventListener('drop', handleDrop);
      }
    });
  }

  // ==================== MODAL ====================
  function openModal(status = 'backlog') {
    editingTaskId = null;
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.textContent = 'Nova Tarefa';
    const titleInput = document.getElementById('taskTitle');
    if (titleInput) titleInput.value = '';
    const descInput = document.getElementById('taskDescription');
    if (descInput) descInput.value = '';
    const modal = document.getElementById('taskModal');
    if (modal) {
      modal.style.display = 'flex';
      modal.dataset.status = status;
    }
    if (titleInput) titleInput.focus();
  }

  function openEditModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    editingTaskId = taskId;
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
      if (window.App?.safeText) window.App.safeText(modalTitle, 'Editar Tarefa'); else modalTitle.textContent = 'Editar Tarefa';
    }
    const titleInput = document.getElementById('taskTitle');
    if (titleInput) titleInput.value = task.title;
    const descInput = document.getElementById('taskDescription');
    if (descInput) descInput.value = task.description || '';
    const modal = document.getElementById('taskModal');
    if (modal) modal.style.display = 'flex';
    if (titleInput) titleInput.focus();
  }

  function closeModal() {
    const modal = document.getElementById('taskModal');
    if (modal) modal.style.display = 'none';
    editingTaskId = null;
  }

  // ==================== EVENT HANDLERS ====================
  function setupEventListeners() {
    // Botão Nova Tarefa
    const btnNewTask = document.getElementById('btnNewTask');
    if (btnNewTask) {
      btnNewTask.addEventListener('click', () => {
        openModal('backlog');
      });
    }
    
    // Botões Add Item nas colunas
    document.querySelectorAll('.kanban-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const status = e.target.dataset.status;
        openModal(status);
      });
    });
    
    // Modal - Fechar
    const closeModalBtn = document.getElementById('closeModal');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    const cancelBtn = document.getElementById('cancelTaskBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    
    // Modal - Fechar ao clicar fora
    const taskModal = document.getElementById('taskModal');
    if (taskModal) {
      taskModal.addEventListener('click', (e) => {
        if (e.target.id === 'taskModal') {
          closeModal();
        }
      });
    }
    
    // Form Submit
    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
      taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const title = (document.getElementById('taskTitle')?.value || '').trim();
      const description = (document.getElementById('taskDescription')?.value || '').trim();
      
      if (!title) {
        showToast('⚠️ O título é obrigatório!', 'error');
        return;
      }
      if (title.length > 255) {
        showToast('⚠️ Título muito longo (máx. 255).', 'error');
        return;
      }
      if (description.length > 1000) {
        showToast('⚠️ Descrição muito longa (máx. 1000).', 'error');
        return;
      }
      
      if (editingTaskId) {
        updateTask(editingTaskId, { title, description });
      } else {
        const status = document.getElementById('taskModal').dataset.status || 'backlog';
        createTask({ title, description, status });
      }
      
        closeModal();
      });
    }
    
    // Filtro com debounce
    const filterInput = document.getElementById('kanbanFilterInput');
    if (filterInput) {
      filterInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          filterTasks(e.target.value);
        }, 200);
      });
    }
    
    // Limpar Filtro
    const btnClearFilter = document.getElementById('btnClearFilter');
    if (btnClearFilter) btnClearFilter.addEventListener('click', clearFilter);
    
    // Botão Salvar
    const btnSave = document.getElementById('btnSaveKanban');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        saveTasks();
        showToast('💾 Salvo ✅');
      });
    }
    
    // Fechar dropdowns ao clicar fora
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.kanban-card-menu')) {
        document.querySelectorAll('.kanban-card-dropdown').forEach(d => {
          d.style.display = 'none';
        });
      }
    });
    
    // ESC para fechar modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    });
  }

  // ==================== INIT ====================
  function init() {
    loadTasks();
    setupEventListeners();
    setupDragAndDrop();
    renderKanban();
  }

  // Auto-init quando DOM carregar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expor métodos públicos se necessário
  return {
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    getTasks: () => tasks,
    renderKanban
  };
})();

// ==================== CTO DASHBOARD ====================
const CTO = (() => {
  const STORAGE_KEYS = {
    INTAKE: "cto_intake_items",
    DEBT: "cto_debt_items",
  };

  function loadCounters() {
    try {
      const intakeData = JSON.parse(localStorage.getItem(STORAGE_KEYS.INTAKE) || "[]");
      const debtData = JSON.parse(localStorage.getItem(STORAGE_KEYS.DEBT) || "[]");

      // Contadores de Intake
      const intakePending = intakeData.filter(i => i.status === "pending").length;
      const intakeReviewed = intakeData.filter(i => i.status === "reviewed").length;

      // Contadores de Debt
      const debtCritical = debtData.filter(d => d.severity === "critical" || d.severity === "high").length;
      const debtInProgress = debtData.filter(d => d.status === "doing").length;

      // Atualizar DOM
      const pendingEl = document.getElementById("intakePendingCount");
      const reviewedEl = document.getElementById("intakeReviewedCount");
      const criticalEl = document.getElementById("debtCriticalCount");
      const progressEl = document.getElementById("debtProgressCount");

      if (pendingEl) pendingEl.textContent = intakePending;
      if (reviewedEl) reviewedEl.textContent = intakeReviewed;
      if (criticalEl) criticalEl.textContent = debtCritical;
      if (progressEl) progressEl.textContent = debtInProgress;
    } catch (error) {
      console.error('Erro ao carregar contadores:', error);
    }
  }

  // Inicializar
  function init() {
    loadCounters();
  }

  init();
})();

// Renderizar widget de decisões
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.DecisionsWidget) {
      DecisionsWidget.renderSummary('#decisionsSummary', { limit: 5 });
    }
  });
} else {
  if (window.DecisionsWidget) {
    DecisionsWidget.renderSummary('#decisionsSummary', { limit: 5 });
  }
}
