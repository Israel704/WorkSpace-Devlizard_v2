/* ======================================================
   SISTEMA DE NOTIFICAÇÕES DE PROPOSTAS

   Responsável por:
   - Buscar contagem de propostas pendentes
   - Atualizar ícone de notificação no header
   - Fazer polling automático para atualização

   Uso: Automaticamente inicializado pelo layout.js
====================================================== */

const NotificationSystem = (() => {
  let pollInterval = null;
  const POLL_INTERVAL_MS = 30000; // 30 segundos
  const API_BASE = (window.App?.getApiBase
    ? window.App.getApiBase()
    : (window.API_BASE || ((window.location.port === '5500' || window.location.port === '5501') ? 'http://localhost:3000/api' : '/api')));

  const getToken = () => localStorage.getItem((window.STORAGE_KEYS?.TOKEN) || 'token');

  /**
   * Busca a contagem de propostas pendentes do backend
   */
  const fetchPendingCount = async () => {
    try {
      const token = getToken();
      if (!token) {
        console.warn('Token não encontrado. Usuário não autenticado.');
        return 0;
      }

      const response = await fetch(`${API_BASE}/proposals/pending/count`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Token inválido ou expirado');
          return 0;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      console.error('Erro ao buscar contagem de propostas:', error);
      return 0;
    }
  };

  /**
   * Atualiza o ícone de notificação no header
   */
  const updateNotificationIcon = (count) => {
    const notificationIcon = document.getElementById('proposalNotification');
    const notificationCount = document.getElementById('notificationCount');

    if (!notificationIcon || !notificationCount) {
      return;
    }

    if (count > 0) {
      notificationIcon.style.display = 'flex';
      notificationCount.textContent = count > 99 ? '99+' : count;
      
      // Adiciona título tooltip
      notificationIcon.title = `${count} proposta${count > 1 ? 's' : ''} pendente${count > 1 ? 's' : ''}`;
    } else {
      notificationIcon.style.display = 'none';
      notificationCount.textContent = '0';
      notificationIcon.title = '';
    }
  };

  /**
   * Atualiza a notificação (busca e atualiza UI)
   */
  const refresh = async () => {
    const count = await fetchPendingCount();
    updateNotificationIcon(count);
    return count;
  };

  /**
   * Inicia o polling automático
   */
  const startPolling = () => {
    // Para polling anterior se existir
    stopPolling();

    // Atualiza imediatamente
    refresh();

    // Configura polling
    pollInterval = setInterval(refresh, POLL_INTERVAL_MS);
  };

  /**
   * Para o polling automático
   */
  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };

  /**
   * Inicializa o sistema de notificações
   */
  const initialize = () => {
    // Verifica se o usuário está autenticado
    const isAuthenticated = localStorage.getItem('auth') === 'true';
    const role = localStorage.getItem('role');

    // Apenas perfis C recebem notificações
    const cProfiles = ['ceo', 'cfo', 'cmo', 'coo', 'cto'];
    
    if (isAuthenticated && role && cProfiles.includes(role.toLowerCase())) {
      startPolling();

      // Para o polling quando a janela é fechada
      window.addEventListener('beforeunload', stopPolling);

      // Atualiza quando a janela recebe foco (usuário volta à aba)
      window.addEventListener('focus', refresh);
    }
  };

  /**
   * Adiciona click no ícone de notificação para ir para propostas
   */
  const setupClickHandler = () => {
    const notificationIcon = document.getElementById('proposalNotification');
    if (notificationIcon) {
      notificationIcon.style.cursor = 'pointer';
      notificationIcon.addEventListener('click', () => {
        const role = localStorage.getItem('role');
        if (role) {
          window.location.href = `../${role}/proposals.html`;
        }
      });
    }
  };

  // Aguarda o DOM carregar e tenta configurar o click handler
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(setupClickHandler, 500);
    });
  } else {
    setTimeout(setupClickHandler, 500);
  }

  // API Pública
  return {
    initialize,
    refresh,
    startPolling,
    stopPolling,
    fetchPendingCount,
    updateNotificationIcon
  };
})();

// Torna disponível globalmente
window.NotificationSystem = NotificationSystem;
