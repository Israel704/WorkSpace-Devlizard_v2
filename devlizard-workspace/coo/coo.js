// COO logic
// COO – Operações
const COO = (() => {
  const processKey = 'coo_processes';
  const bottleneckKey = 'coo_bottlenecks';

  const processes = JSON.parse(localStorage.getItem(processKey)) || [];
  const bottlenecks = JSON.parse(localStorage.getItem(bottleneckKey)) || [];

  const processList = document.getElementById('processList');
  const bottleneckList = document.getElementById('bottleneckList');

  const processCount = document.getElementById('processCount');
  const bottleneckCount = document.getElementById('bottleneckCount');
  const operationStatus = document.getElementById('operationStatus');

  function save() {
    localStorage.setItem(processKey, JSON.stringify(processes));
    localStorage.setItem(bottleneckKey, JSON.stringify(bottlenecks));
  }

  function updateDashboard() {
    processCount.textContent = processes.length;
    bottleneckCount.textContent = bottlenecks.length;
    operationStatus.textContent =
      bottlenecks.length > 0 ? 'Atenção necessária' : 'Estável';
  }

  function render() {
    processList.innerHTML = '';
    bottleneckList.innerHTML = '';

    processes.forEach((p, i) => {
      const li = document.createElement('li');
      li.textContent = p;
      li.onclick = () => {
        processes.splice(i, 1);
        save();
        render();
      };
      processList.appendChild(li);
    });

    bottlenecks.forEach((b, i) => {
      const li = document.createElement('li');
      li.textContent = b;
      li.onclick = () => {
        bottlenecks.splice(i, 1);
        save();
        render();
      };
      bottleneckList.appendChild(li);
    });

    updateDashboard();
  }

  document.getElementById('processForm').addEventListener('submit', e => {
    e.preventDefault();
    processes.push(document.getElementById('processName').value);
    e.target.reset();
    save();
    render();
  });

  document.getElementById('bottleneckForm').addEventListener('submit', e => {
    e.preventDefault();
    bottlenecks.push(document.getElementById('bottleneckDesc').value);
    e.target.reset();
    save();
    render();
  });

  // Inicializar gerenciador de arquivos
  function initFileManager() {
    FilesManager.initSendFileForm('sendFileForm', 'inboxContainer');
    FilesManager.loadAndDisplayInbox('inboxContainer');
  }

  // Executar ao carregar
  render();
  initFileManager();
})();
