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
