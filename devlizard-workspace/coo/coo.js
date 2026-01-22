// COO logic - Kanban Board com integração API
const COO = (() => {
  const API_BASE = 'http://localhost:3001/api';
  let tasks = [];
  let editingTaskId = null;

  // ==================== HELPERS ====================

  function getToken() {
    return localStorage.getItem('token');
  }

  async function apiFetch(url, options = {}) {
    const token = getToken();
    if (!token) {
      window.location.href = '../auth/login.html';
      throw new Error('Token não encontrado');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };

    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '../auth/login.html';
      throw new Error('Não autorizado');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro na requisição');
    }

    return response.json();
  }

  // ==================== API CALLS ====================

  async function loadTasks() {
    try {
      tasks = await apiFetch('/coo/tasks');
      renderKanban();
    } catch (error) {
      console.error('Erro ao carregar tasks:', error);
      alert('Erro ao carregar tarefas: ' + error.message);
    }
  }

  async function createTask(taskData) {
    try {
      const newTask = await apiFetch('/coo/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData)
      });
      tasks.push(newTask);
      renderKanban();
      return newTask;
    } catch (error) {
      console.error('Erro ao criar task:', error);
      alert('Erro ao criar tarefa: ' + error.message);
      throw error;
    }
  }

  async function updateTask(id, taskData) {
    try {
      const updatedTask = await apiFetch(`/coo/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(taskData)
      });
      const index = tasks.findIndex(t => t.id === id);
      if (index !== -1) {
        tasks[index] = updatedTask;
      }
      renderKanban();
      return updatedTask;
    } catch (error) {
      console.error('Erro ao atualizar task:', error);
      alert('Erro ao atualizar tarefa: ' + error.message);
      throw error;
    }
  }

  async function moveTask(id, newStatus) {
    try {
      const updatedTask = await apiFetch(`/coo/tasks/${id}/move`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      const index = tasks.findIndex(t => t.id === id);
      if (index !== -1) {
        tasks[index] = updatedTask;
      }
      renderKanban();
      return updatedTask;
    } catch (error) {
      console.error('Erro ao mover task:', error);
      alert('Erro ao mover tarefa: ' + error.message);
      throw error;
    }
  }

  async function deleteTask(id) {
    try {
      await apiFetch(`/coo/tasks/${id}`, {
        method: 'DELETE'
      });
      tasks = tasks.filter(t => t.id !== id);
      renderKanban();
    } catch (error) {
      console.error('Erro ao deletar task:', error);
      alert('Erro ao deletar tarefa: ' + error.message);
      throw error;
    }
  }

  // ==================== RENDER ====================

  function formatDate(isoDate) {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    return date.toLocaleDateString('pt-BR');
  }

  function getPriorityBadge(priority) {
    const badges = {
      low: '<span style="background: #28a745; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px;">Baixa</span>',
      medium: '<span style="background: #ffc107; color: black; padding: 2px 8px; border-radius: 3px; font-size: 11px;">Média</span>',
      high: '<span style="background: #dc3545; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px;">Alta</span>'
    };
    return badges[priority] || badges.medium;
  }

  function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.style.cssText = `
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 12px;
      cursor: pointer;
      transition: box-shadow 0.2s;
    `;
    card.onmouseenter = () => card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    card.onmouseleave = () => card.style.boxShadow = 'none';

    const statusOptions = ['todo', 'doing', 'blocked', 'done'];
    const statusLabels = {
      todo: 'Pendente',
      doing: 'Em Andamento',
      blocked: 'Bloqueado',
      done: 'Concluído'
    };

    card.innerHTML = `
      <div style="margin-bottom: 8px;">
        <strong style="font-size: 14px; display: block; margin-bottom: 4px;">${task.title}</strong>
        ${task.description ? `<p style="font-size: 12px; color: #666; margin: 4px 0;">${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}</p>` : ''}
      </div>
      <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
        ${getPriorityBadge(task.priority)}
        ${task.owner ? `<span style="font-size: 11px; color: #666;">👤 ${task.owner}</span>` : ''}
      </div>
      ${task.dueDate ? `<div style="font-size: 11px; color: #666; margin-bottom: 8px;">📅 ${formatDate(task.dueDate)}</div>` : ''}
      <div style="display: flex; gap: 4px; flex-wrap: wrap;">
        <select onchange="COO.handleMoveTask(${task.id}, this.value); this.value='${task.status}';" style="font-size: 11px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 3px; background: white;">
          <option value="${task.status}">Mover para...</option>
          ${statusOptions.filter(s => s !== task.status).map(s => 
            `<option value="${s}">${statusLabels[s]}</option>`
          ).join('')}
        </select>
        <button onclick="COO.handleEditTask(${task.id})" style="font-size: 11px; padding: 4px 8px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">✏️ Editar</button>
        <button onclick="COO.handleDeleteTask(${task.id})" style="font-size: 11px; padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">🗑️ Excluir</button>
      </div>
    `;

    return card;
  }

  function renderKanban() {
    const statuses = ['todo', 'doing', 'blocked', 'done'];
    
    statuses.forEach(status => {
      const column = document.getElementById(`column-${status}`);
      const count = document.getElementById(`count-${status}`);
      
      const tasksInColumn = tasks.filter(t => t.status === status);
      count.textContent = tasksInColumn.length;
      
      column.innerHTML = '';
      tasksInColumn.forEach(task => {
        column.appendChild(createTaskCard(task));
      });

      if (tasksInColumn.length === 0) {
        column.innerHTML = '<p style="color: #999; text-align: center; padding: 20px; font-size: 12px;">Nenhuma tarefa</p>';
      }
    });
  }

  // ==================== FORM HANDLERS ====================

  function setupTaskForm() {
    const form = document.getElementById('taskForm');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const taskData = {
        title: document.getElementById('taskTitle').value.trim(),
        description: document.getElementById('taskDescription').value.trim() || null,
        priority: document.getElementById('taskPriority').value,
        owner: document.getElementById('taskOwner').value.trim() || null,
        dueDate: document.getElementById('taskDueDate').value || null
      };

      if (!taskData.title) {
        alert('O título é obrigatório!');
        return;
      }

      try {
        if (editingTaskId) {
          // Modo edição
          await updateTask(editingTaskId, { ...taskData, status: tasks.find(t => t.id === editingTaskId).status });
          editingTaskId = null;
          form.querySelector('button[type="submit"]').textContent = 'Criar Tarefa';
        } else {
          // Modo criação
          await createTask(taskData);
        }
        form.reset();
      } catch (error) {
        // Erro já tratado no createTask/updateTask
      }
    });
  }

  // ==================== PUBLIC METHODS ====================

  function handleMoveTask(id, newStatus) {
    if (confirm(`Mover tarefa para "${newStatus}"?`)) {
      moveTask(id, newStatus);
    }
  }

  function handleEditTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    editingTaskId = id;
    
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskOwner').value = task.owner || '';
    document.getElementById('taskDueDate').value = task.dueDate || '';
    
    const submitBtn = document.getElementById('taskForm').querySelector('button[type="submit"]');
    submitBtn.textContent = 'Atualizar Tarefa';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDeleteTask(id) {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      deleteTask(id);
    }
  }

  // ==================== INIT ====================

  function initFileManager() {
    FilesManager.initSendFileForm('sendFileForm', 'inboxContainer');
    FilesManager.loadAndDisplayInbox('inboxContainer');
  }

  function init() {
    setupTaskForm();
    loadTasks();
    initFileManager();
  }

  // Executar ao carregar
  init();

  // Expor métodos públicos
  return {
    handleMoveTask,
    handleEditTask,
    handleDeleteTask
  };
})();

