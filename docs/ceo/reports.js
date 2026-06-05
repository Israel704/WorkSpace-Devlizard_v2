// ==================== CEO REPORTS MODULE ====================
// Comunicação com COO para análise integrada de dados estratégicos e operacionais

const CEOReports = (() => {
  const K = window.STORAGE_KEYS || {};
  const STORAGE_KEY_CEO = K.CEO_REPORTS || 'ceo_reports_data';
  const STORAGE_KEY_SHARED = K.SHARED_REPORTS || 'shared_reports_data'; // Compartilhado entre CEO e COO
  const REFRESH_INTERVAL = 5000; // 5 segundos

  let refreshTimer = null;

  // ==================== DATA STRUCTURES ====================
  const defaultCEOData = {
    decisions: 5,
    risks: 3,
    strategic: 8,
    notes: 12,
    lastUpdated: new Date().toISOString(),
    indicators: [
      { label: 'Decisão: Aprovação de orçamento Q1', time: '15 min atrás', status: 'ok' },
      { label: 'Risco: Atraso em deliverable crítico', time: '45 min atrás', status: 'alert' },
      { label: 'Nota: Reunião com stakeholders agendada', time: '2h atrás', status: 'ok' }
    ]
  };

  const defaultCOOData = {
    activeTasks: 24,
    proposals: 7,
    efficiency: 88,
    teamSize: 8,
    lastUpdated: new Date().toISOString(),
    indicators: [
      { label: 'Kanban: 3 tarefas em revisão', time: '5 min atrás', status: 'ok' },
      { label: 'Equipe: Todos operacionais', time: '30 seg atrás', status: 'ok' },
      { label: 'Propostas: 2 novas para avaliar', time: '20 min atrás', status: 'warning' }
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
    // Carregar dados do CEO
    const storedCEO = localStorage.getItem(STORAGE_KEY_CEO);
    if (!storedCEO) {
      localStorage.setItem(STORAGE_KEY_CEO, JSON.stringify(defaultCEOData));
    }

    // Carregar dados compartilhados (do COO)
    const storedShared = localStorage.getItem(STORAGE_KEY_SHARED);
    if (!storedShared) {
      localStorage.setItem(STORAGE_KEY_SHARED, JSON.stringify(defaultCOOData));
    }
  };

  const getCEOData = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CEO);
      return data ? JSON.parse(data) : defaultCEOData;
    } catch (e) {
      console.error('Erro ao carregar dados CEO:', e);
      return defaultCEOData;
    }
  };

  const getCOOData = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY_SHARED);
      return data ? JSON.parse(data) : defaultCOOData;
    } catch (e) {
      console.error('Erro ao carregar dados COO:', e);
      return defaultCOOData;
    }
  };

  const saveCEOData = (data) => {
    try {
      localStorage.setItem(STORAGE_KEY_CEO, JSON.stringify({
        ...data,
        lastUpdated: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Erro ao salvar dados CEO:', e);
    }
  };

  // ==================== DATA SYNC ====================
  const syncWithCOO = () => {
    // Tenta sincronizar com dados do COO
    const cooData = getCOOData();
    
    // Atualizar última sincronização
    const ceoData = getCEOData();
    ceoData.lastCOOSync = new Date().toISOString();
    saveCEOData(ceoData);

    console.log('CEO sincronizado com COO:', cooData);
  };

  const broadcastReadiness = () => {
    // Notifica que CEO está pronto (para possível uso por COO)
    const readinessData = {
      role: 'ceo',
      ready: true,
      timestamp: new Date().toISOString(),
      lastUpdated: getCEOData().lastUpdated
    };

    sessionStorage.setItem('ceo_reports_ready', JSON.stringify(readinessData));
  };

  // ==================== RENDERING ====================
  const renderDashboard = () => {
    const ceoData = getCEOData();
    const cooData = getCOOData();

    // Atualizar métricas CEO
    document.getElementById('metricDecisions').textContent = ceoData.decisions;
    document.getElementById('metricRisks').textContent = ceoData.risks;
    document.getElementById('metricStrategic').textContent = ceoData.strategic;
    document.getElementById('metricNotes').textContent = ceoData.notes;

    // Atualizar hora CEO
    document.getElementById('lastUpdateCEO').textContent = formatTime(ceoData.lastUpdated);

    // Atualizar indicadores CEO
    renderIndicators('ceoIndicators', ceoData.indicators);

    // Atualizar métricas COO
    document.getElementById('metricTasks').textContent = cooData.activeTasks;
    document.getElementById('metricProposals').textContent = cooData.proposals;
    document.getElementById('metricEfficiency').textContent = cooData.efficiency + '%';
    document.getElementById('metricTeam').textContent = cooData.teamSize;

    // Atualizar hora COO
    document.getElementById('lastUpdateCOO').textContent = formatTime(cooData.lastUpdated);

    // Atualizar indicadores COO
    renderIndicators('cooIndicators', cooData.indicators);

    // Atualizar tabela comparativa
    renderComparisonTable(ceoData, cooData);
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

  const renderComparisonTable = (ceoData, cooData) => {
    const tbody = document.getElementById('comparisonTableBody');
    if (!tbody) return;

    const comparisons = [
      {
        metric: 'Foco Principal',
        ceo: '📊 Estratégico',
        coo: '🔧 Operacional',
        integration: '✓ Complementar'
      },
      {
        metric: 'Itens em Decisão',
        ceo: ceoData.decisions || 0,
        coo: cooData.proposals || 0,
        integration: cooData.proposals > 0 ? '✓ Em progresso' : '⚠ Aguardando'
      },
      {
        metric: 'Risco vs Tarefas',
        ceo: ceoData.risks + ' riscos',
        coo: cooData.activeTasks + ' tarefas',
        integration: cooData.efficiency > 85 ? '✓ Controlado' : '⚠ Revisar'
      },
      {
        metric: 'Eficiência Geral',
        ceo: ceoData.decisions > 0 ? 'Decisões ativas' : 'Aguardando',
        coo: cooData.efficiency + '%',
        integration: (cooData.efficiency > 80 && ceoData.decisions > 0) ? '✓ Otimizado' : '⚠ Em ajuste'
      },
      {
        metric: 'Sincronização',
        ceo: ceoData.lastUpdated ? 'Sincronizado' : 'Desconectado',
        coo: cooData.lastUpdated ? 'Sincronizado' : 'Desconectado',
        integration: '✓ Tempo real'
      }
    ];

    tbody.innerHTML = comparisons.map(comp => `
      <tr>
        <td><strong>${comp.metric}</strong></td>
        <td>${comp.ceo}</td>
        <td>${comp.coo}</td>
        <td>${comp.integration}</td>
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
    const btnRefreshCEO = document.getElementById('btnRefreshCEO');
    const btnExportCEO = document.getElementById('btnExportCEO');
    const btnRefreshCOO = document.getElementById('btnRefreshCOO');
    const btnViewCOOReports = document.getElementById('btnViewCOOReports');

    if (btnRefreshCEO) {
      btnRefreshCEO.addEventListener('click', () => {
        syncWithCOO();
        renderDashboard();
        showToast('✓ Dados atualizados!');
      });
    }

    if (btnExportCEO) {
      btnExportCEO.addEventListener('click', () => {
        exportData();
      });
    }

    if (btnRefreshCOO) {
      btnRefreshCOO.addEventListener('click', () => {
        syncWithCOO();
        renderDashboard();
        showToast('✓ Sincronizado com COO!');
      });
    }

    if (btnViewCOOReports) {
      btnViewCOOReports.addEventListener('click', () => {
        window.location.href = '../coo/reports.html';
      });
    }
  };

  // ==================== EXPORT ====================
  const exportData = () => {
    const ceoData = getCEOData();
    const cooData = getCOOData();
    
    const exportData = {
      exportDate: new Date().toISOString(),
      ceo: ceoData,
      coo: cooData,
      integration: {
        decisions: ceoData.decisions,
        risks: ceoData.risks,
        activeTasks: cooData.activeTasks,
        efficiency: cooData.efficiency
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_ceo_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    showToast('📊 Relatório exportado!');
  };

  // ==================== AUTO REFRESH ====================
  const startAutoRefresh = () => {
    // Auto-sincronizar a cada 5 segundos
    refreshTimer = setInterval(() => {
      syncWithCOO();
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
    getCEOData,
    getCOOData,
    saveCEOData,
    syncWithCOO,
    renderDashboard,
    exportData
  };
})();

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  const ready = window.App?.storageReady || Promise.resolve();
  ready.then(() => CEOReports.init());
});
