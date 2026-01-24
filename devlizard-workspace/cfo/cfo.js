// CFO logic

// Renderizar widget de decisões
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.DecisionsWidget) {
      DecisionsWidget.renderSummary('#decisionsSummary', { limit: 5 });
    }
    setTimeout(loadApprovalsStats, 500);
  });
} else {
  if (window.DecisionsWidget) {
    DecisionsWidget.renderSummary('#decisionsSummary', { limit: 5 });
  }
  setTimeout(loadApprovalsStats, 500);
}

async function loadApprovalsStats() {
  try {
    const API_URL = 'http://localhost:3000/api';
    const token = localStorage.getItem((window.STORAGE_KEYS?.TOKEN) || 'token');

    const response = await fetch(`${API_URL}/proposals/inbox`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      console.warn('Não foi possível carregar propostas para estatísticas');
      return;
    }

    const proposals = await response.json();
    const financialProposals = proposals.filter(p => 
      p.toRole === 'cfo' && (p.category === 'financeiro' || !p.category)
    );

    const pending = financialProposals.filter(p => p.status === 'pending').length;
    const approved = financialProposals.filter(p => p.status === 'approved').length;
    const rejected = financialProposals.filter(p => p.status === 'rejected').length;

    // Atualizar cards - procurar o elemento com retry
    const updateCard = () => {
      const container = document.querySelector('.cards');
      if (!container) {
        setTimeout(updateCard, 200);
        return;
      }

      const firstCard = container.querySelector('.card');
      if (!firstCard) {
        setTimeout(updateCard, 200);
        return;
      }

      firstCard.innerHTML = `
        <h3>Aprovações Financeiras</h3>
        <div style="margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
          <div style="text-align: center; padding: 12px; background: rgba(255, 193, 7, 0.1); border-radius: 4px;">
            <div style="font-size: 24px; font-weight: 600; color: #ffc107;">${pending}</div>
            <p style="color: var(--muted); margin: 4px 0 0 0; font-size: 12px;">Pendentes</p>
          </div>
          <div style="text-align: center; padding: 12px; background: rgba(40, 167, 69, 0.1); border-radius: 4px;">
            <div style="font-size: 24px; font-weight: 600; color: #28a745;">${approved}</div>
            <p style="color: var(--muted); margin: 4px 0 0 0; font-size: 12px;">Aprovadas</p>
          </div>
          <div style="text-align: center; padding: 12px; background: rgba(220, 53, 69, 0.1); border-radius: 4px;">
            <div style="font-size: 24px; font-weight: 600; color: #dc3545;">${rejected}</div>
            <p style="color: var(--muted); margin: 4px 0 0 0; font-size: 12px;">Rejeitadas</p>
          </div>
        </div>
        <a href="proposals.html" style="display: inline-block; margin-top: 16px; padding: 8px 16px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 500;">
          Ir para Propostas
        </a>
      `;
    };

    updateCard();
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
  }
}
