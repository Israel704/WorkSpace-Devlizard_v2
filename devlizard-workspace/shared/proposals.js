// Sistema de Propostas
const API_URL = 'http://localhost:3000/api';

// ==================== UTILIDADES ====================

function getToken() {
  return localStorage.getItem((window.STORAGE_KEYS?.TOKEN) || 'token');
}

function getRole() {
  return localStorage.getItem((window.STORAGE_KEYS?.ROLE) || 'role');
}

function formatDate(timestamp) {
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

// ==================== GERENCIAMENTO DE ABAS ====================

function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');

      // Remover classe active de todos os botões e conteúdos
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
      });

      // Adicionar classe active no botão clicado
      button.classList.add('active');

      // Mostrar o conteúdo da aba
      const targetContent = document.getElementById(`tab-${targetTab}`);
      if (targetContent) {
        targetContent.classList.add('active');
        targetContent.style.display = 'block';
      }

      // Carregar dados se necessário
      if (targetTab === 'inbox') {
        loadInboxProposals();
      } else if (targetTab === 'sent') {
        loadSentProposals();
      }
    });
  });
}

// ==================== CRIAR PROPOSTA ====================

async function createProposal(title, description, toRole) {
  try {
    const data = await (window.App?.apiFetch
      ? window.App.apiFetch(`${API_URL}/proposals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, toRole })
        })
      : (async () => {
          const response = await fetch(`${API_URL}/proposals`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ title, description, toRole })
          });
          const json = await response.json();
          if (!response.ok) throw new Error(json.error || 'Erro ao criar proposta');
          return json;
        })()
    );
    return data;
  } catch (error) {
    console.error('Erro ao criar proposta:', error);
    throw error;
  }
}

function initCreateForm() {
  const form = document.getElementById('createProposalForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = (document.getElementById('proposalTitle')?.value || '').trim();
    const description = (document.getElementById('proposalDescription')?.value || '').trim();
    const toRole = (document.getElementById('proposalToRole')?.value || '').trim();

    // Validações defensivas sem alterar UX
    if (!title) {
      alert('Título é obrigatório.');
      document.getElementById('proposalTitle')?.focus();
      return;
    }
    if (title.length > 255) {
      alert('Título muito longo (máx. 255 caracteres).');
      document.getElementById('proposalTitle')?.focus();
      return;
    }
    if (description.length > 1000) {
      alert('Descrição muito longa (máx. 1000 caracteres).');
      document.getElementById('proposalDescription')?.focus();
      return;
    }
    if (!toRole) {
      alert('Selecione o destino da proposta.');
      document.getElementById('proposalToRole')?.focus();
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    try {
      await createProposal(title, description, toRole);
      alert('Proposta enviada com sucesso!');
      form.reset();
      
      // Mudar para aba de enviadas
      const sentTab = document.querySelector('.tab-btn[data-tab="sent"]');
      if (sentTab) sentTab.click();
    } catch (error) {
      alert(error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

// ==================== LISTAR PROPOSTAS RECEBIDAS ====================

async function fetchInboxProposals() {
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
    return data;
  } catch (error) {
    console.error('Erro ao buscar propostas recebidas:', error);
    throw error;
  }
}

function renderInboxProposals(proposals) {
  const container = document.getElementById('inboxProposals');
  if (!container) return;

  if (proposals.length === 0) {
    const html = `
      <div class="card">
        <p style="color: var(--muted); text-align: center;">Nenhuma proposta recebida.</p>
      </div>
    `;
    if (window.App?.safeHTML) window.App.safeHTML(container, html); else container.innerHTML = html;
    return;
  }

  const htmlList = proposals.map(proposal => `
    <div class="card" style="margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <div>
          <h3 style="margin: 0;">${proposal.title}</h3>
          <p style="color: var(--muted); font-size: 14px; margin: 4px 0 0 0;">
            De: ${getRoleName(proposal.fromRole)} • ${formatDate(proposal.createdAt)}
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
              onclick="decideProposal(${proposal.id}, 'approved')"
              style="flex: 1; padding: 10px 16px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;"
            >
              ✓ Aprovar
            </button>
            <button 
              onclick="decideProposal(${proposal.id}, 'rejected')"
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
  if (window.App?.safeHTML) window.App.safeHTML(container, htmlList); else container.innerHTML = htmlList;
}

async function loadInboxProposals() {
  const container = document.getElementById('inboxProposals');
  if (!container) return;

  const loadingHtml = '<div class="card"><p style="text-align: center;">Carregando...</p></div>';
  if (window.App?.safeHTML) window.App.safeHTML(container, loadingHtml); else container.innerHTML = loadingHtml;

  try {
    const proposals = await fetchInboxProposals();
    renderInboxProposals(proposals);
  } catch (error) {
    const errHtml = `<div class="card"><p style="color: #dc3545; text-align: center;">Erro ao carregar propostas: ${error.message}</p></div>`;
    if (window.App?.safeHTML) window.App.safeHTML(container, errHtml); else container.innerHTML = errHtml;
  }
}

// ==================== LISTAR PROPOSTAS ENVIADAS ====================

async function fetchSentProposals() {
  try {
    const data = await (window.App?.apiFetch
      ? window.App.apiFetch(`${API_URL}/proposals/sent`, {})
      : (async () => {
          const response = await fetch(`${API_URL}/proposals/sent`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
          });
          const json = await response.json();
          if (!response.ok) throw new Error(json.error || 'Erro ao buscar propostas');
          return json;
        })()
    );
    return data;
  } catch (error) {
    console.error('Erro ao buscar propostas enviadas:', error);
    throw error;
  }
}

function renderSentProposals(proposals) {
  const container = document.getElementById('sentProposals');
  if (!container) return;

  if (proposals.length === 0) {
    const html = `
      <div class="card">
        <p style="color: var(--muted); text-align: center;">Nenhuma proposta enviada.</p>
      </div>
    `;
    if (window.App?.safeHTML) window.App.safeHTML(container, html); else container.innerHTML = html;
    return;
  }

  const htmlList = proposals.map(proposal => `
    <div class="card" style="margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <div>
          <h3 style="margin: 0;">${proposal.title}</h3>
          <p style="color: var(--muted); font-size: 14px; margin: 4px 0 0 0;">
            Para: ${getRoleName(proposal.toRole)} • ${formatDate(proposal.createdAt)}
          </p>
        </div>
        ${getStatusBadge(proposal.status)}
      </div>
      
      <p style="margin: 12px 0; white-space: pre-wrap;">${proposal.description}</p>
      
      ${proposal.status === 'pending' ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e0e0e0;">
          <p style="margin: 0; color: var(--muted); font-style: italic;">
            Aguardando decisão do ${getRoleName(proposal.toRole)}
          </p>
          <button 
            onclick="deleteProposal(${proposal.id})"
            style="margin-top: 12px; padding: 8px 16px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;"
          >
            Excluir Proposta
          </button>
        </div>
      ` : `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e0e0e0;">
          <p style="margin: 0; font-weight: 500;">
            ${proposal.status === 'approved' ? '✓ Aprovada' : '✗ Rejeitada'} pelo ${getRoleName(proposal.toRole)}
          </p>
          <p style="margin: 8px 0 0 0; color: var(--muted);">${proposal.decisionComment || '-'}</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: var(--muted);">
            Decidida em: ${formatDate(proposal.decidedAt)}
          </p>
        </div>
      `}
    </div>
  `).join('');
  if (window.App?.safeHTML) window.App.safeHTML(container, htmlList); else container.innerHTML = htmlList;
}

async function loadSentProposals() {
  const container = document.getElementById('sentProposals');
  if (!container) return;

  const loadingHtml = '<div class="card"><p style="text-align: center;">Carregando...</p></div>';
  if (window.App?.safeHTML) window.App.safeHTML(container, loadingHtml); else container.innerHTML = loadingHtml;

  try {
    const proposals = await fetchSentProposals();
    renderSentProposals(proposals);
  } catch (error) {
    const errHtml = `<div class="card"><p style="color: #dc3545; text-align: center;">Erro ao carregar propostas: ${error.message}</p></div>`;
    if (window.App?.safeHTML) window.App.safeHTML(container, errHtml); else container.innerHTML = errHtml;
  }
}

// ==================== DECIDIR PROPOSTA ====================

async function decideProposal(proposalId, decision) {
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

    alert(`Proposta ${decision === 'approved' ? 'aprovada' : 'rejeitada'} com sucesso!`);
    loadInboxProposals();
  } catch (error) {
    alert(error.message);
  }
}

// ==================== EXCLUIR PROPOSTA ====================

async function deleteProposal(proposalId) {
  if (!confirm('Tem certeza que deseja excluir esta proposta? Esta ação não pode ser desfeita.')) {
    return;
  }

  try {
    const data = await (window.App?.apiFetch
      ? window.App.apiFetch(`${API_URL}/proposals/${proposalId}`, { method: 'DELETE' })
      : (async () => {
          const response = await fetch(`${API_URL}/proposals/${proposalId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
          });
          const json = await response.json();
          if (!response.ok) throw new Error(json.error || 'Erro ao excluir proposta');
          return json;
        })()
    );

    alert('Proposta excluída com sucesso!');
    loadSentProposals();
  } catch (error) {
    alert(error.message);
  }
}

// ==================== INICIALIZAÇÃO ====================

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initCreateForm();
  if (window.App?.log) window.App.log('INIT', 'Proposals module carregado');
  
  // Carregar propostas recebidas por padrão
  // (aba "Criar" está ativa por padrão, então não carregamos nada)
});

// Adicionar estilos para badges
const style = document.createElement('style');
style.textContent = `
  .badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .badge-pending {
    background-color: #ffc107;
    color: #000;
  }
  
  .badge-approved {
    background-color: #28a745;
    color: #fff;
  }
  
  .badge-rejected {
    background-color: #dc3545;
    color: #fff;
  }
  
  .tab-btn {
    padding: 12px 20px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
    color: #666;
    border-bottom: 3px solid transparent;
    transition: all 0.3s;
  }
  
  .tab-btn:hover {
    color: #007bff;
  }
  
  .tab-btn.active {
    color: #007bff;
    border-bottom-color: #007bff;
  }
  
  .tabs {
    margin-bottom: -2px;
  }
`;
document.head.appendChild(style);
