// CFO logic
const PROJECTS_KEY = 'cfo_projects';
const YIELD_KEY = 'cfo_invested_yield';
const ENTRY_STATUSES = ['active', 'done'];
const INVEST_STATUSES = ['active', 'paused', 'done'];

const formatCurrency = (value) => {
  const n = Number(value || 0);
  if (window.App?.formatCurrency) return window.App.formatCurrency(n, 'BRL');
  return `R$ ${n.toFixed(2)}`;
};

const loadProjects = () => {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Erro ao ler projetos:', err);
    return [];
  }
};

const loadYield = () => {
  const raw = localStorage.getItem(YIELD_KEY);
  const num = Number(raw);
  return Number.isFinite(num) && num >= 0 ? num : 0;
};

const sumField = (list, field) => list.reduce((acc, item) => acc + Number(item?.[field] || 0), 0);

const updateRevenueCard = () => {
  const projects = loadProjects();
  const card = findCardByTitle('receita');
  if (!card) return;

  const entries = sumField(projects.filter(p => ENTRY_STATUSES.includes(p.status)), 'value');

  card.innerHTML = `
    <h3>Receita</h3>
    <p style="color: var(--muted); margin-top: 6px;">Entradas (ativos) registradas.</p>
    <div style="margin-top: 16px; padding: 20px; background: rgba(0, 123, 255, 0.06); border-radius: 8px; border: 1px solid rgba(0, 123, 255, 0.15);">
      <span style="color: var(--muted); font-size: 12px;">Entradas</span>
      <strong style="display: block; margin-top: 6px; font-size: 28px;">${formatCurrency(entries)}</strong>
    </div>
    <a href="situation.html" style="display: inline-block; margin-top: 16px; font-weight: 600; color: var(--primary);">Abrir situação</a>
  `;
};

const updateProjectsCard = () => {
  const projects = loadProjects();
  const card = findCardByTitle('projetos');
  if (!card) return;

  const total = projects.length;
  const active = projects.filter(p => p.status === 'active').length;
  const prospect = projects.filter(p => p.status === 'prospect').length;
  const done = projects.filter(p => p.status === 'done').length;
  const pipelineValue = sumField(projects, 'value');

  card.innerHTML = `
    <h3>Projetos</h3>
    <p style="color: var(--muted); margin-top: 6px;">Estado do portfólio e pipeline.</p>
    <div style="margin-top: 16px; display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));">
      <div class="stat">
        <span style="color: var(--muted); font-size: 12px;">Total</span>
        <strong style="display: block; margin-top: 4px; font-size: 20px;">${total}</strong>
      </div>
      <div class="stat">
        <span style="color: var(--muted); font-size: 12px;">Ativos</span>
        <strong style="display: block; margin-top: 4px; font-size: 20px;">${active}</strong>
      </div>
      <div class="stat">
        <span style="color: var(--muted); font-size: 12px;">Prospects</span>
        <strong style="display: block; margin-top: 4px; font-size: 20px;">${prospect}</strong>
      </div>
      <div class="stat">
        <span style="color: var(--muted); font-size: 12px;">Concluídos</span>
        <strong style="display: block; margin-top: 4px; font-size: 20px;">${done}</strong>
      </div>
      <div class="stat">
        <span style="color: var(--muted); font-size: 12px;">Pipeline</span>
        <strong style="display: block; margin-top: 4px; font-size: 20px;">${formatCurrency(pipelineValue)}</strong>
      </div>
    </div>
    <a href="projects.html" style="display: inline-block; margin-top: 16px; font-weight: 600; color: var(--primary);">Gerenciar projetos</a>
  `;
};

const findCardByTitle = (title) => {
  const cards = Array.from(document.querySelectorAll('.cards .card'));
  return cards.find((card) => {
    const h3 = card.querySelector('h3');
    return h3 && h3.textContent.toLowerCase().includes(title.toLowerCase());
  });
};

const updateOverviewCards = () => {
  updateRevenueCard();
  updateProjectsCard();
};

// Renderizar widget de decisões e cards dinâmicos
const boot = () => {
  if (window.DecisionsWidget) {
    DecisionsWidget.renderSummary('#decisionsSummary', { limit: 5 });
  }
  updateOverviewCards();
  setTimeout(loadApprovalsStats, 500);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
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
      const targetCard = findCardByTitle('riscos') || Array.from(document.querySelectorAll('.cards .card'))[2];
      if (!targetCard) {
        setTimeout(updateCard, 200);
        return;
      }

      targetCard.innerHTML = `
        <h3>Aprovações Financeiras</h3>
        <div style="margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px;">
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
