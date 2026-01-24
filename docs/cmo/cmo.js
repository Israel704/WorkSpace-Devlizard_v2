// CMO logic

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

// Atualizar estatísticas de promessas no dashboard
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.CMOPromises) {
      window.CMOPromises.syncWithProposals().then(() => {
        const stats = window.CMOPromises.getStats();
        document.getElementById('countDraft').textContent = stats.draft || '0';
        document.getElementById('countWaitingCTO').textContent = stats.waiting_cto || '0';
        document.getElementById('countWaitingCFO').textContent = stats.waiting_cfo || '0';
        document.getElementById('countApproved').textContent = stats.approved || '0';
        document.getElementById('countRejected').textContent = stats.rejected || '0';
      });
    }
  });
} else {
  if (window.CMOPromises) {
    window.CMOPromises.syncWithProposals().then(() => {
      const stats = window.CMOPromises.getStats();
      document.getElementById('countDraft').textContent = stats.draft || '0';
      document.getElementById('countWaitingCTO').textContent = stats.waiting_cto || '0';
      document.getElementById('countWaitingCFO').textContent = stats.waiting_cfo || '0';
      document.getElementById('countApproved').textContent = stats.approved || '0';
      document.getElementById('countRejected').textContent = stats.rejected || '0';
    });
  }
}
