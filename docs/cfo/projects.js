// Gestão de projetos do CFO (localStorage)
(function() {
  const CLIENTS_KEY = 'cfo_clients';
  const PROJECTS_KEY = 'cfo_projects';
  let editingProjectId = null;

  const formatCurrency = (value) => {
    const n = Number(value || 0);
    if (window.App?.formatCurrency) return window.App.formatCurrency(n, 'BRL');
    return `R$ ${n.toFixed(2)}`;
  };

  const calculateRentalTotal = () => {
    const monthlyValue = Number(document.getElementById('projectMonthlyRental')?.value || 0);
    const months = Number(document.getElementById('projectRentalMonths')?.value || 0);
    const total = monthlyValue * months;
    const totalInput = document.getElementById('projectRentalTotal');
    if (totalInput) {
      totalInput.value = formatCurrency(total);
    }
  };

  const toggleRentalFields = () => {
    const acquisitionType = document.getElementById('projectAcquisitionType')?.value;
    const rentalMonthlyContainer = document.getElementById('rentalMonthlyContainer');
    const rentalMonthsContainer = document.getElementById('rentalMonthsContainer');
    const rentalTotalContainer = document.getElementById('rentalTotalContainer');
    const projectValueInput = document.getElementById('projectValue');

    if (acquisitionType === 'rental') {
      if (rentalMonthlyContainer) rentalMonthlyContainer.style.display = 'block';
      if (rentalMonthsContainer) rentalMonthsContainer.style.display = 'block';
      if (rentalTotalContainer) rentalTotalContainer.style.display = 'block';
      if (projectValueInput) projectValueInput.style.display = 'none';
    } else {
      if (rentalMonthlyContainer) rentalMonthlyContainer.style.display = 'none';
      if (rentalMonthsContainer) rentalMonthsContainer.style.display = 'none';
      if (rentalTotalContainer) rentalTotalContainer.style.display = 'none';
      if (projectValueInput) projectValueInput.style.display = 'block';
    }
  };

  const loadClients = () => {
    try {
      const raw = localStorage.getItem(CLIENTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('Erro ao ler clientes:', err);
      return [];
    }
  };

  const loadProjects = () => {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('Erro ao ler projetos:', err);
      return [];
    }
  };

  const saveProjects = (projects) => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  };

  const populateClientsSelect = async () => {
    const select = document.getElementById('projectClient');
    const noClientsMessage = document.getElementById('noClientsMessage');
    if (!select) return;

    select.innerHTML = '';
    try {
      const clients = await window.App.apiFetch(`${window.API_BASE || '/api'}/clients`, { method: 'GET' });
      if (!clients.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Cadastre um cliente primeiro';
        select.appendChild(option);
        select.disabled = true;
        if (noClientsMessage) noClientsMessage.style.display = 'block';
        return;
      }
      select.disabled = false;
      if (noClientsMessage) noClientsMessage.style.display = 'none';
      clients
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((client) => {
          const option = document.createElement('option');
          option.value = client.id;
          option.textContent = client.name;
          select.appendChild(option);
        });
    } catch (e) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Erro ao carregar clientes';
      select.appendChild(option);
      select.disabled = true;
      if (noClientsMessage) noClientsMessage.style.display = 'block';
    }
  };

  const resetForm = async () => {
    const form = document.getElementById('projectForm');
    form?.reset();
    editingProjectId = null;
    const submitBtn = document.getElementById('submitProject');
    if (submitBtn) submitBtn.textContent = 'Salvar projeto';
    const cancelBtn = document.getElementById('cancelProjectEdit');
    if (cancelBtn) cancelBtn.style.display = 'none';
    toggleRentalFields();
    await populateClientsSelect();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const clients = loadClients();
    const selectClient = document.getElementById('projectClient');
    const clientId = Number(selectClient?.value || 0);
    const title = document.getElementById('projectTitle')?.value.trim();
    const description = document.getElementById('projectDescription')?.value.trim() || '';
    const techStack = document.getElementById('projectTech')?.value.trim() || '';
    const acquisitionType = document.getElementById('projectAcquisitionType')?.value || 'purchase';
    let value = Number(document.getElementById('projectValue')?.value || 0);
    const monthlyRental = Number(document.getElementById('projectMonthlyRental')?.value || 0);
    const rentalMonths = Number(document.getElementById('projectRentalMonths')?.value || 0);
    const costInvested = Number(document.getElementById('projectCost')?.value || 0);
    const status = document.getElementById('projectStatus')?.value || 'prospect';
    const expectedEntryDate = document.getElementById('projectDate')?.value || '';

    if (!clients.length) {
      alert('Cadastre um cliente antes de criar projetos.');
      return;
    }

    if (!clientId) {
      alert('Selecione um cliente.');
      return;
    }

    if (!title) {
      alert('Título é obrigatório.');
      return;
    }

    // Validação específica para aluguel
    if (acquisitionType === 'rental') {
      if (monthlyRental <= 0) {
        alert('Valor mensal do aluguel deve ser maior que zero.');
        return;
      }
      if (rentalMonths <= 0) {
        alert('Período de aluguel deve ser maior que zero meses.');
        return;
      }
      value = monthlyRental * rentalMonths;
    } else {
      if (value < 0) {
        alert('Valor do projeto deve ser igual ou maior que zero.');
        return;
      }
    }

    if (costInvested < 0) {
      alert('Investimento deve ser igual ou maior que zero.');
      return;
    }

    const now = Date.now();
    const projects = loadProjects();

    if (editingProjectId) {
      const current = projects.find((p) => p.id === editingProjectId);
      if (!current) {
        resetForm();
        return;
      }
      const updated = {
        ...current,
        clientId,
        title,
        description,
        techStack,
        acquisitionType,
        value,
        monthlyRental: acquisitionType === 'rental' ? monthlyRental : 0,
        rentalMonths: acquisitionType === 'rental' ? rentalMonths : 0,
        costInvested,
        status,
        expectedEntryDate,
        updatedAt: now,
      };
      const next = projects.map((p) => (p.id === editingProjectId ? updated : p));
      saveProjects(next);
    } else {
      const project = {
        id: Date.now(),
        clientId,
        title,
        description,
        techStack,
        acquisitionType,
        value,
        monthlyRental: acquisitionType === 'rental' ? monthlyRental : 0,
        rentalMonths: acquisitionType === 'rental' ? rentalMonths : 0,
        costInvested,
        status,
        expectedEntryDate,
        createdAt: now,
        updatedAt: now,
      };
      projects.push(project);
      saveProjects(projects);
    }

    resetForm();
    renderProjects();
  };

  const getClientName = (id) => {
    const client = loadClients().find((c) => c.id === id);
    return client?.name || 'Cliente removido';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status) => {
    const map = {
      prospect: { label: 'Prospect', color: '#6f42c1' },
      active: { label: 'Ativo', color: '#28a745' },
      paused: { label: 'Pausado', color: '#ffc107', text: '#000' },
      done: { label: 'Concluído', color: '#17a2b8' },
      canceled: { label: 'Cancelado', color: '#dc3545' },
    };
    const item = map[status] || { label: status, color: '#6c757d' };
    const textColor = item.text || '#fff';
    return `<span class="badge" style="background: ${item.color}; color: ${textColor}; padding: 6px 10px; border-radius: 12px; font-size: 12px;">${item.label}</span>`;
  };

  const applyFilters = (projects) => {
    const filterStatus = document.getElementById('filterStatus')?.value || '';
    const sortBy = document.getElementById('sortBy')?.value || 'recent';

    let filtered = projects;
    if (filterStatus) {
      filtered = projects.filter((p) => p.status === filterStatus);
    }

    const parseDate = (dateStr) => {
      if (!dateStr) return 0;
      const d = new Date(dateStr);
      return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    };

    const sorters = {
      recent: (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
      valueDesc: (a, b) => (b.value || 0) - (a.value || 0),
      valueAsc: (a, b) => (a.value || 0) - (b.value || 0),
      dateDesc: (a, b) => parseDate(b.expectedEntryDate) - parseDate(a.expectedEntryDate),
      dateAsc: (a, b) => parseDate(a.expectedEntryDate) - parseDate(b.expectedEntryDate),
    };

    const sorter = sorters[sortBy] || sorters.recent;
    return [...filtered].sort(sorter);
  };

  const renderProjects = () => {
    const container = document.getElementById('projectsList');
    if (!container) return;

    const projects = applyFilters(loadProjects());

    if (!projects.length) {
      container.innerHTML = '<div class="card"><p style="color: var(--muted); text-align: center; margin: 0;">Nenhum projeto cadastrado.</p></div>';
      return;
    }

    const html = projects
      .map((project) => {
        const clientName = getClientName(project.clientId);
        const acquisitionType = project.acquisitionType || 'purchase';
        let valueDisplay = formatCurrency(project.value);
        
        if (acquisitionType === 'rental') {
          valueDisplay = `${formatCurrency(project.monthlyRental)}/mês (${project.rentalMonths} meses) = ${formatCurrency(project.value)}`;
        }

        return `
          <div class="card" style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; gap: 12px; align-items: flex-start;">
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <h3 style="margin: 0;">${project.title}</h3>
                  ${getStatusBadge(project.status)}
                </div>
                <p style="margin: 6px 0 0 0; color: var(--muted);">Cliente: ${clientName}</p>
                <p style="margin: 6px 0 0 0; color: var(--muted); font-size: 14px;">Entrada prevista: ${formatDate(project.expectedEntryDate)}</p>
                <p style="margin: 10px 0 0 0;">Valor: <strong>${valueDisplay}</strong> • Investido: <strong>${formatCurrency(project.costInvested)}</strong></p>
                <p style="margin: 8px 0 0 0; color: var(--muted); white-space: pre-wrap;">${project.description || 'Sem descrição.'}</p>
                ${project.techStack ? `<p style="margin: 6px 0 0 0; color: var(--muted); font-size: 14px;">Stack: ${project.techStack}</p>` : ''}
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px; min-width: 170px; align-items: flex-end;">
                <button onclick="window.CFOProjects.edit(${project.id})" style="padding: 8px 12px; border: 1px solid #007bff; background: white; color: #007bff; border-radius: 4px; cursor: pointer;">Editar</button>
                <button onclick="window.CFOProjects.remove(${project.id})" style="padding: 8px 12px; border: 1px solid #dc3545; background: white; color: #dc3545; border-radius: 4px; cursor: pointer;">Excluir</button>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    container.innerHTML = html;
  };

  const startEdit = (id) => {
    const project = loadProjects().find((p) => p.id === id);
    if (!project) return;

    populateClientsSelect();
    editingProjectId = id;
    document.getElementById('projectClient').value = project.clientId;
    document.getElementById('projectTitle').value = project.title || '';
    document.getElementById('projectDescription').value = project.description || '';
    document.getElementById('projectTech').value = project.techStack || '';
    document.getElementById('projectAcquisitionType').value = project.acquisitionType || 'purchase';
    document.getElementById('projectValue').value = (project.acquisitionType === 'rental' ? 0 : project.value) ?? 0;
    document.getElementById('projectMonthlyRental').value = project.monthlyRental ?? 0;
    document.getElementById('projectRentalMonths').value = project.rentalMonths ?? 0;
    document.getElementById('projectCost').value = project.costInvested ?? 0;
    document.getElementById('projectStatus').value = project.status || 'prospect';
    document.getElementById('projectDate').value = project.expectedEntryDate || '';

    toggleRentalFields();
    calculateRentalTotal();

    const submitBtn = document.getElementById('submitProject');
    if (submitBtn) submitBtn.textContent = 'Atualizar projeto';
    const cancelBtn = document.getElementById('cancelProjectEdit');
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
  };

  const deleteProject = (id) => {
    const projects = loadProjects();
    const target = projects.find((p) => p.id === id);
    if (!target) return;

    if (!confirm(`Excluir projeto "${target.title}"?`)) return;

    const filtered = projects.filter((p) => p.id !== id);
    saveProjects(filtered);
    if (editingProjectId === id) resetForm();
    renderProjects();
  };

  const bindEvents = () => {
    document.getElementById('projectForm')?.addEventListener('submit', handleSubmit);
    document.getElementById('cancelProjectEdit')?.addEventListener('click', resetForm);
    document.getElementById('filterStatus')?.addEventListener('change', renderProjects);
    document.getElementById('sortBy')?.addEventListener('change', renderProjects);
    document.getElementById('projectAcquisitionType')?.addEventListener('change', toggleRentalFields);
    document.getElementById('projectMonthlyRental')?.addEventListener('input', calculateRentalTotal);
    document.getElementById('projectRentalMonths')?.addEventListener('input', calculateRentalTotal);
  };

  document.addEventListener('DOMContentLoaded', async () => {
    await populateClientsSelect();
    bindEvents();
    renderProjects();
  });

  // Expor para botões inline
  window.CFOProjects = {
    edit: startEdit,
    remove: deleteProject,
  };
})();
