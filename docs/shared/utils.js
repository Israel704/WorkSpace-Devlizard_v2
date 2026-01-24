// Helpers (storage, redirects)

/**
 * Exibe uma notificação tipo toast na tela
 * @param {string} message - Mensagem a exibir
 * @param {string} type - Tipo de notificação: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duração em ms (padrão: 3000)
 */
function showToast(message, type = 'success', duration = 3000) {
  const toastContainer = document.getElementById('toastContainer') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  // Estilos inline caso não exista CSS
  toast.style.cssText = `
    padding: 12px 16px;
    margin-bottom: 8px;
    border-radius: 4px;
    font-size: 14px;
    animation: slideIn 0.3s ease-in-out;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;
  
  // Cores por tipo
  const colors = {
    success: { bg: '#4caf50', text: '#fff' },
    error: { bg: '#f44336', text: '#fff' },
    warning: { bg: '#ff9800', text: '#fff' },
    info: { bg: '#2196f3', text: '#fff' }
  };
  
  const color = colors[type] || colors.info;
  toast.style.backgroundColor = color.bg;
  toast.style.color = color.text;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in-out';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Cria o container para toasts
 */
function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.style.cssText = `
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 9999;
    max-width: 400px;
  `;
  
  // Adicionar animações CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(container);
  
  return container;
}
