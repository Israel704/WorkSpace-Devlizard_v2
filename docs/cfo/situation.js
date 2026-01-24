// Dashboard de Situação da Empresa (CFO)
(function() {
  const PROJECTS_KEY = 'cfo_projects';
  const YIELD_KEY = 'cfo_invested_yield';
  const ENTRY_STATUSES = ['active', 'done'];
  const INVEST_STATUSES = ['active', 'paused', 'done'];
  const STATUS_ORDER = [
    { key: 'prospect', label: 'Prospect' },
    { key: 'active', label: 'Ativos' },
    { key: 'paused', label: 'Pausados' },
    { key: 'done', label: 'Concluídos' },
    { key: 'canceled', label: 'Cancelados' },
  ];

  const formatCurrency = (value) => {
    const n = Number(value || 0);
    if (window.App?.formatCurrency) return window.App.formatCurrency(n, 'BRL');
    return `R$ ${n.toFixed(2)}`;
  };

  const loadYield = () => {
    const raw = localStorage.getItem(YIELD_KEY);
    const num = Number(raw);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  };

  const saveYield = (value) => {
    localStorage.setItem(YIELD_KEY, String(value));
  };

  const loadProjects = () => {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('Erro ao ler projetos do storage:', err);
      return [];
    }
  };

  const sumField = (list, field) => list.reduce((acc, item) => acc + Number(item?.[field] || 0), 0);

  const calculateMetrics = (projects) => {
    const entriesProjects = projects.filter((p) => ENTRY_STATUSES.includes(p.status));
    const investedProjects = projects.filter((p) => INVEST_STATUSES.includes(p.status));
    const forecastProjects = projects.filter((p) => p.status === 'prospect');

    const entries = sumField(entriesProjects, 'value');
    const invested = sumField(investedProjects, 'costInvested');
    const forecast = sumField(forecastProjects, 'value');
    const exits = invested; // MVP: saídas = investido
    const cash = entries - exits;
    const investedYield = loadYield();

    const breakdown = STATUS_ORDER.map(({ key, label }) => {
      const items = projects.filter((p) => p.status === key);
      return {
        key,
        label,
        count: items.length,
        value: sumField(items, 'value'),
        invested: sumField(items, 'costInvested'),
      };
    });

    return { entries, invested, exits, cash, forecast, investedYield, breakdown };
  };

  const renderMetrics = ({ entries, invested, exits, cash, forecast, investedYield, breakdown }) => {
    const cashEl = document.getElementById('cashValue');
    const entriesEl = document.getElementById('entriesValue');
    const exitsEl = document.getElementById('exitsValue');
    const investedEl = document.getElementById('investedValue');
    const prospectNote = document.getElementById('prospectNote');
    const statusBreakdown = document.getElementById('statusBreakdown');
    const yieldEl = document.getElementById('yieldValue');
    const yieldInput = document.getElementById('yieldInput');

    if (cashEl) cashEl.textContent = formatCurrency(cash);
    if (entriesEl) entriesEl.textContent = formatCurrency(entries);
    if (exitsEl) exitsEl.textContent = formatCurrency(exits);
    if (investedEl) investedEl.textContent = formatCurrency(invested);
    if (yieldEl) yieldEl.textContent = formatCurrency(investedYield);
    if (yieldInput) yieldInput.value = investedYield;

    if (prospectNote) {
      prospectNote.textContent = forecast > 0
        ? `Previsão (prospect): ${formatCurrency(forecast)} não entra no caixa até virar ativo.`
        : '';
    }

    if (statusBreakdown) {
      const html = breakdown.map((item) => {
        const badgeColor = getStatusColor(item.key);
        return `
          <div class="card" style="padding: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${badgeColor};"></span>
              <strong>${item.label}</strong>
            </div>
            <p style="margin: 0; color: var(--muted);">${item.count} projeto(s)</p>
            <p style="margin: 4px 0 0 0;">Valor: ${formatCurrency(item.value)}</p>
            <p style="margin: 4px 0 0 0;">Gasto: ${formatCurrency(item.invested)}</p>
          </div>
        `;
      }).join('');
      statusBreakdown.innerHTML = html;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      prospect: '#6f42c1',
      active: '#28a745',
      paused: '#ffc107',
      done: '#17a2b8',
      canceled: '#dc3545',
    };
    return colors[status] || '#6c757d';
  };

  const updateDashboard = () => {
    const projects = loadProjects();
    const metrics = calculateMetrics(projects);
    renderMetrics(metrics);
  };

  const bindYieldForm = () => {
    const form = document.getElementById('yieldForm');
    const input = document.getElementById('yieldInput');
    if (!form || !input) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = Number(input.value || 0);
      if (!Number.isFinite(value) || value < 0) {
        alert('Informe um valor maior ou igual a zero.');
        return;
      }
      saveYield(value);
      updateDashboard();
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    bindYieldForm();
    updateDashboard();
  });
})();
