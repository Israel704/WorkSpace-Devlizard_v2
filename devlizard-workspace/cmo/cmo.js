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
