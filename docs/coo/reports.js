// ==================== COO REPORTS MODULE ====================
// Comunicação entre COO e CEO para análise integrada de dados

const COOReports = (() => {
  const K = window.STORAGE_KEYS || {};
  const STORAGE_KEY_COO = K.COO_REPORTS || 'coo_reports_data';
  const STORAGE_KEY_SHARED = K.SHARED_REPORTS || 'shared_reports_data'; // Compartilhado entre CEO e COO
  const REFRESH_INTERVAL = 5000; // 5 segundos

  let refreshTimer = null;

  // ==================== DATA STRUCTURES ====================
  const defaultCOOData = {
    activeTasks: 0,
    proposals: 0,
    efficiency: 85,
    teamSize: 8,
    lastUpdated: new Date().toISOString(),
    indicators: [
      { label: 'Kanban sincronizado', time: '2 min atrás', status: 'ok' },
      { label: 'Equipe em operação', time: '30 seg atrás', status: 'ok' },
      { label: 'Última proposição processada', time: '5 min atrás', status: 'ok' }
    ]
  };

  const defaultCEOData = {
    decisions: 0,
    risks: 0,
    strategic: 0,
    notes: 0,
    lastUpdated: new Date().toISOString(),
    decisions_list: [
      { label: 'Aguardando decisão CEO', time: '10 min atrás', status: 'pending' }
    ]
  };

  // ==================== INITIALIZATION ====================
  const init = () => {
    loadData();
    renderDashboard();
    attachEventListeners();
    startAutoRefresh();
    broadcastReadiness();
  };

  // ==================== STORAGE ====================
  const loadData = () => {
    // Carregar dados do COO
    const storedCOO = localStorage.getItem(STORAGE_KEY_COO);
    if (!storedCOO) {
      localStorage.setItem(STORAGE_KEY_COO, JSON.stringify(defaultCOOData));
    }

    // Carregar dados compartilhados (do CEO)
    const storedShared = localStorage.getItem(STORAGE_KEY_SHARED);
    if (!storedShared) {
      localStorage.setItem(STORAGE_KEY_SHARED, JSON.stringify(defaultCEOData));
    }
  };

  const getCOOData = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY_COO);
      return data ? JSON.parse(data) : defaultCOOData;
    } catch (e) {
      console.error('Erro ao carregar dados COO:', e);
      return defaultCOOData;
    }
  };

  const getCEOData = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY_SHARED);
      return data ? JSON.parse(data) : defaultCEOData;
    } catch (e) {
      console.error('Erro ao carregar dados CEO:', e);
      return defaultCEOData;
    }
  };

  const saveCOOData = (data) => {
    try {
      localStorage.setItem(STORAGE_KEY_COO, JSON.stringify({
        ...data,
        lastUpdated: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Erro ao salvar dados COO:', e);
    }
  };

  // ==================== DATA SYNC ====================
  const syncWithCEO = () => {
    // Tenta sincronizar com dados do CEO
    const ceoData = getCEOData();
    
    // Atualizar última sincronização
    const cooData = getCOOData();
    cooData.lastCEOSync = new Date().toISOString();
    saveCOOData(cooData);

    console.log('COO sincronizado com CEO:', ceoData);
  };

  const broadcastReadiness = () => {
    // Notifica que COO está pronto (para possível uso por CEO)
    const readinessData = {
      role: 'coo',
      ready: true,
      timestamp: new Date().toISOString(),
      lastUpdated: getCOOData().lastUpdated
    };

    sessionStorage.setItem('coo_reports_ready', JSON.stringify(readinessData));
  };

  // ==================== RENDERING ====================
  const renderDashboard = () => {
    const cooData = getCOOData();
    const ceoData = getCEOData();

    // Atualizar métricas COO
    document.getElementById('metricTasks').textContent = cooData.activeTasks;
    document.getElementById('metricProposals').textContent = cooData.proposals;
    document.getElementById('metricEfficiency').textContent = cooData.efficiency + '%';
    document.getElementById('metricTeam').textContent = cooData.teamSize;

    // Atualizar hora COO
    document.getElementById('lastUpdateCOO').textContent = formatTime(cooData.lastUpdated);

    // Atualizar indicadores COO
    renderIndicators('cooIndicators', cooData.indicators);

    // Atualizar métricas CEO
    document.getElementById('metricDecisions').textContent = ceoData.decisions;
    document.getElementById('metricRisks').textContent = ceoData.risks;
    document.getElementById('metricStrategic').textContent = ceoData.strategic;
    document.getElementById('metricNotes').textContent = ceoData.notes;

    // Atualizar hora CEO
    document.getElementById('lastUpdateCEO').textContent = formatTime(ceoData.lastUpdated);

    // Atualizar decisões CEO
    renderIndicators('ceoDecisions', ceoData.decisions_list);

    // Atualizar tabela comparativa
    renderComparisonTable(cooData, ceoData);
  };

  const renderIndicators = (elementId, indicators) => {
    const container = document.getElementById(elementId);
    if (!container) return;

    if (!indicators || indicators.length === 0) {
      container.innerHTML = '<p style="color: var(--muted); font-size: 13px;">Nenhum indicador disponível</p>';
      return;
    }

    container.innerHTML = indicators.map(indicator => `
      <div class="timeline-item">
        <strong>${indicator.label}</strong>
        <div class="time">${indicator.time}</div>
      </div>
    `).join('');
  };

  const renderComparisonTable = (cooData, ceoData) => {
    const tbody = document.getElementById('comparisonTableBody');
    if (!tbody) return;

    const comparisons = [
      {
        metric: 'Foco Principal',
        coo: '🔧 Operacional',
        ceo: '📊 Estratégico',
        alignment: '✓ Complementar'
      },
      {
        metric: 'Tarefas Ativas',
        coo: cooData.activeTasks || 0,
        ceo: ceoData.strategic || 0,
        alignment: '✓ Alinhado'
      },
      {
        metric: 'Taxa de Propostas',
        coo: cooData.proposals || 0,
        ceo: ceoData.decisions || 0,
        alignment: ceoData.decisions > 0 ? '✓ Em progresso' : '⚠ Pendente'
      },
      {
        metric: 'Eficiência Geral',
        coo: cooData.efficiency + '%',
        ceo: 'Decisões: ' + ceoData.decisions,
        alignment: cooData.efficiency > 80 ? '✓ Otimizado' : '⚠ Revisar'
      }
    ];

    tbody.innerHTML = comparisons.map(comp => `
      <tr>
        <td><strong>${comp.metric}</strong></td>
        <td>${comp.coo}</td>
        <td>${comp.ceo}</td>
        <td>${comp.alignment}</td>
      </tr>
    `).join('');
  };

  // ==================== UTILITIES ====================
  const formatTime = (isoString) => {
    if (!isoString) return 'Desconhecido';
    
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}min atrás`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    
    return date.toLocaleDateString('pt-BR');
  };

  // ==================== EVENT LISTENERS ====================
  const attachEventListeners = () => {
    const btnRefreshCOO = document.getElementById('btnRefreshCOO');
    const btnExportCOO = document.getElementById('btnExportCOO');
    const btnRefreshCEO = document.getElementById('btnRefreshCEO');
    const btnViewCEOReports = document.getElementById('btnViewCEOReports');

    if (btnRefreshCOO) {
      btnRefreshCOO.addEventListener('click', () => {
        syncWithCEO();
        renderDashboard();
        showToast('✓ Dados atualizados!');
      });
    }

    if (btnExportCOO) {
      btnExportCOO.addEventListener('click', () => {
        exportData();
      });
    }

    if (btnRefreshCEO) {
      btnRefreshCEO.addEventListener('click', () => {
        syncWithCEO();
        renderDashboard();
        showToast('✓ Sincronizado com CEO!');
      });
    }

    if (btnViewCEOReports) {
      btnViewCEOReports.addEventListener('click', () => {
        window.location.href = '../ceo/reports.html';
      });
    }
  };

  // ==================== EXPORT ====================
  const exportData = () => {
    const cooData = getCOOData();
    const ceoData = getCEOData();
    
    const exportData = {
      exportDate: new Date().toISOString(),
      coo: cooData,
      ceo: ceoData,
      comparison: {
        activeTasks: cooData.activeTasks,
        proposals: cooData.proposals,
        efficiency: cooData.efficiency,
        decisions: ceoData.decisions
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_coo_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    showToast('📊 Relatório exportado!');
  };

  // ==================== AUTO REFRESH ====================
  const startAutoRefresh = () => {
    // Auto-sincronizar a cada 5 segundos
    refreshTimer = setInterval(() => {
      syncWithCEO();
      renderDashboard();
    }, REFRESH_INTERVAL);
  };

  const stopAutoRefresh = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  };

  // ==================== CLEANUP ====================
  window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
  });

  // ==================== PUBLIC API ====================
  return {
    init,
    getCOOData,
    getCEOData,
    saveCOOData,
    syncWithCEO,
    renderDashboard,
    exportData
  };
})();

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  const ready = window.App?.storageReady || Promise.resolve();
  ready.then(() => COOReports.init());
});
