// approvals.js - Caixa de Aprovações Financeiras do CFO

const API_URL = '/api';

function getToken() {
  return localStorage.getItem((window.STORAGE_KEYS?.TOKEN) || 'token');
}

function getRole() {
  return localStorage.getItem((window.STORAGE_KEYS?.ROLE) || 'role');
}

// Usar window.App.formatDate se disponível, senão fallback
function formatDate(timestamp) {
  if (window.App?.formatDate) {
    const d = new Date(timestamp * 1000);
    return window.App.formatDate(d);
  }
  // Fallback
  if (!timestamp) return '-';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getRoleName(role) {
  const names = {
    ceo: 'CEO',
    coo: 'COO',
    cfo: 'CFO',
    cto: 'CTO',
    cmo: 'CMO'
  };
  return names[role] || role.toUpperCase();
}

function getStatusBadge(status) {
  const badges = {
    pending: '<span class="badge badge-pending">Pendente</span>',
    approved: '<span class="badge badge-approved">Aprovada</span>',
    rejected: '<span class="badge badge-rejected">Rejeitada</span>'
  };
  return badges[status] || status;
}

async function fetchFinancialProposals() {
  try {
    const data = await (window.App?.apiFetch
      ? window.App.apiFetch(`${API_URL}/proposals/inbox`, {})
      : (async () => {
          const response = await fetch(`${API_URL}/proposals/inbox`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
          });
          const json = await response.json();
          if (!response.ok) throw new Error(json.error || 'Erro ao buscar propostas');
          return json;
        })()
    );
    
    // Filtrar apenas propostas financeiras
    return data.filter(p => p.toRole === 'cfo' && (p.category === 'financeiro' || !p.category));
  } catch (error) {
    console.error('Erro ao buscar propostas financeiras:', error);
    throw error;
  }
}

function renderFinancialProposals(proposals, filterStatus = '') {
  const container = document.getElementById('approvalsContainer');
  if (!container) return;

  // Filtrar por status se necessário
  let filtered = proposals;
  if (filterStatus) {
    filtered = proposals.filter(p => p.status === filterStatus);
  }

  if (filtered.length === 0) {
    const html = `
      <div class="card">
        <p style="color: var(--muted); text-align: center;">
          ${filterStatus ? 'Nenhuma proposta com este status.' : 'Nenhuma proposta financeira.'}
        </p>
      </div>
    `;
    if (window.App?.safeHTML) window.App.safeHTML(container, html); 
    else container.innerHTML = html;
    return;
  }

  const htmlList = filtered.map(proposal => `
    <div class="card" style="margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <div>
          <h3 style="margin: 0;">${proposal.title}</h3>
          <p style="color: var(--muted); font-size: 14px; margin: 4px 0 0 0;">
            De: ${getRoleName(proposal.fromRole)} • ${formatDate(proposal.createdAt)} • <strong>Financeiro</strong>
          </p>
        </div>
        ${getStatusBadge(proposal.status)}
      </div>
      
      <p style="margin: 12px 0; white-space: pre-wrap;">${proposal.description}</p>
      
      ${proposal.status === 'pending' ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e0e0e0;">
          <label for="comment-${proposal.id}">Comentário da decisão *</label>
          <textarea 
            id="comment-${proposal.id}" 
            placeholder="Adicione um comentário explicando sua decisão..." 
            style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; min-height: 80px; font-family: inherit; margin-top: 4px;"
          ></textarea>
          <div style="display: flex; gap: 12px; margin-top: 12px;">
            <button 
              onclick="decideCFOProposal(${proposal.id}, 'approved')"
              style="flex: 1; padding: 10px 16px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;"
            >
              ✓ Aprovar
            </button>
            <button 
              onclick="decideCFOProposal(${proposal.id}, 'rejected')"
              style="flex: 1; padding: 10px 16px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;"
            >
              ✗ Rejeitar
            </button>
          </div>
        </div>
      ` : `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e0e0e0;">
          <p style="margin: 0; font-weight: 500;">Decisão:</p>
          <p style="margin: 4px 0 0 0; color: var(--muted);">${proposal.decisionComment || '-'}</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: var(--muted);">
            Decidida em: ${formatDate(proposal.decidedAt)}
          </p>
        </div>
      `}
    </div>
  `).join('');
  
  if (window.App?.safeHTML) window.App.safeHTML(container, htmlList); 
  else container.innerHTML = htmlList;
}

async function loadFinancialProposals(filterStatus = '') {
  const container = document.getElementById('approvalsContainer');
  if (!container) return;

  const loadingHtml = '<div class="card"><p style="text-align: center;">Carregando...</p></div>';
  if (window.App?.safeHTML) window.App.safeHTML(container, loadingHtml); 
  else container.innerHTML = loadingHtml;

  try {
    const proposals = await fetchFinancialProposals();
    renderFinancialProposals(proposals, filterStatus);
  } catch (error) {
    const errHtml = `<div class="card"><p style="color: #dc3545; text-align: center;">Erro ao carregar propostas: ${error.message}</p></div>`;
    if (window.App?.safeHTML) window.App.safeHTML(container, errHtml); 
    else container.innerHTML = errHtml;
  }
}

async function decideCFOProposal(proposalId, decision) {
  const commentField = document.getElementById(`comment-${proposalId}`);
  const comment = commentField ? commentField.value.trim() : '';

  if (!comment) {
    alert('Por favor, adicione um comentário explicando sua decisão.');
    commentField?.focus();
    return;
  }

  if (!confirm(`Tem certeza que deseja ${decision === 'approved' ? 'APROVAR' : 'REJEITAR'} esta proposta?`)) {
    return;
  }

  try {
    const data = await (window.App?.apiFetch
      ? window.App.apiFetch(`${API_URL}/proposals/${proposalId}/decide`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision, comment })
        })
      : (async () => {
          const response = await fetch(`${API_URL}/proposals/${proposalId}/decide`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ decision, comment })
          });
          const json = await response.json();
          if (!response.ok) throw new Error(json.error || 'Erro ao decidir proposta');
          return json;
        })()
    );

    // Publicar no painel global de decisões
    if (data && data.id) {
      publishGlobalDecision(data, decision, comment);
    }

    alert(`Proposta ${decision === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso!`);
    
    // Recarregar mantendo o filtro
    const filterStatus = document.getElementById('filterStatus')?.value || '';
    loadFinancialProposals(filterStatus);
  } catch (error) {
    alert(error.message);
  }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  loadFinancialProposals();

  // Listener para filtro
  const filterSelect = document.getElementById('filterStatus');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      loadFinancialProposals(e.target.value);
    });
  }

  if (window.App?.log) window.App.log('INIT', 'CFO Approvals module carregado');
});
