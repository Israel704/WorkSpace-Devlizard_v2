// CEO logic
// CEO – Gerenciamento Executivo
const CEO = (() => {
  // Inicializar gerenciador de arquivos
  function initFileManager() {
    FilesManager.initSendFileForm('sendFileForm', 'inboxContainer');
    FilesManager.loadAndDisplayInbox('inboxContainer');
  }

  // Executar ao carregar
  initFileManager();
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
