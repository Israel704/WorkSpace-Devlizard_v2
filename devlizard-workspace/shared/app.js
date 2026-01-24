/* ======================================================
   ESTADO GLOBAL DA APLICAÇÃO

   Gerencia:
   - Usuário logado
   - Cargo/Role
   - UI comum (header/sidebar)
   - Helpers comuns

   IMPORTANTE:
   - Não apaga localStorage inteiro no logout
   - Acessos ao DOM são sempre protegidos
====================================================== */

window.App = (() => {
  // ===================================================
  // ESTADO PRIVADO
  // ===================================================

  let state = {
    user: null,
    role: null,
    isAuthenticated: false,
    theme: "dark",
  };

  // ===================================================
  // CHAVES CENTRALIZADAS DE STORAGE (compatíveis)
  // ===================================================
  const STORAGE_KEYS = {
    AUTH: "auth",
    ROLE: "role",
    USER: "user",
    TOKEN: "token",
    SELECTED_ROLE: "selectedRole",
    COO_KANBAN: "coo_kanban_tasks",
    COO_KANBAN_SETTINGS: "coo_kanban_settings",
    CEO_REPORTS: "ceo_reports_data",
    COO_REPORTS: "coo_reports_data",
    SHARED_REPORTS: "shared_reports_data",
  };

  // Tornar disponível globalmente sem mudar stack
  window.STORAGE_KEYS = STORAGE_KEYS;

  // Chaves de sessão (não apagar dados de ferramentas!)
  const SESSION_KEYS = [
    STORAGE_KEYS.USER,
    STORAGE_KEYS.ROLE,
    STORAGE_KEYS.AUTH,
    STORAGE_KEYS.SELECTED_ROLE,
    STORAGE_KEYS.TOKEN,
  ];

  function initializeState() {
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
    const storedRole = localStorage.getItem(STORAGE_KEYS.ROLE);
    const storedAuth = localStorage.getItem(STORAGE_KEYS.AUTH);

    if (storedUser && storedRole) {
      state.user = storedUser;
      state.role = String(storedRole).toLowerCase();
      // se você usa "auth" como flag, respeita; senão assume true pelo par user+role
      state.isAuthenticated = storedAuth ? storedAuth === "true" : true;
    }
  }

  // ===================================================
  // GETTERS
  // ===================================================

  const getState = () => ({ ...state });
  const getUser = () => state.user;
  const getRole = () => state.role;
  const isAuthenticated = () => state.isAuthenticated;

  // ===================================================
  // SETTERS
  // ===================================================

  const setUser = (username, role) => {
    state.user = username;
    state.role = String(role).toLowerCase();
    state.isAuthenticated = true;

    localStorage.setItem(STORAGE_KEYS.USER, username);
    localStorage.setItem(STORAGE_KEYS.ROLE, state.role);
    localStorage.setItem(STORAGE_KEYS.AUTH, "true");

    applyRoleStyles();
    updateUserUI();
    buildSidebar(); // tenta montar menu imediatamente
  };

  const clearState = () => {
    state = {
      user: null,
      role: null,
      isAuthenticated: false,
      theme: "dark",
    };

    // NÃO apaga tudo. Só sessão.
    SESSION_KEYS.forEach((k) => localStorage.removeItem(k));

    removeRoleStyles();
  };

  const clearSession = () => {
    SESSION_KEYS.forEach((k) => localStorage.removeItem(k));
  };

  // ===================================================
  // ESTILOS POR CARGO
  // ===================================================

  const applyRoleStyles = () => {
    const body = document.body;
    if (!body) return;

    // remove apenas classes role-*
    [...body.classList].forEach((c) => {
      if (c.startsWith("role-")) body.classList.remove(c);
    });

    if (state.role) body.classList.add(`role-${state.role}`);
  };

  const removeRoleStyles = () => {
    const body = document.body;
    if (!body) return;

    [...body.classList].forEach((c) => {
      if (c.startsWith("role-")) body.classList.remove(c);
    });
  };

  // ===================================================
  // UI: HEADER / USER INFO / LOGOUT
  // ===================================================

  const updateUserUI = () => {
    // Nome do usuário
    const userInfo = byId("userInfo");
    if (state.user) safeText(userInfo, state.user);

    // Avatar letra
    const userAvatar = byId("userAvatar");
    if (state.user) safeText(userAvatar, state.user.charAt(0).toUpperCase());

    // Badge role
    const roleIndicator = byId("roleIndicator");
    if (state.role) safeText(roleIndicator, state.role.toUpperCase());
  };

  const setupLogout = () => {
    // suporta ids diferentes
    const logoutBtn = byId("logoutBtn") || byId("logout");

    if (logoutBtn) {
      // evita duplicar listener
      logoutBtn.onclick = () => {
        clearState();
        window.location.href = "../index.html";
      };
    }
  };

  // ===================================================
  // SIDEBAR DINÂMICA (POR ROLE)
  // ===================================================

  const buildSidebar = () => {
    // sidebar pode ainda não ter sido injetada pelo layout.js
    const nav = byId("nav");
    if (!nav) return false;

    const role = state.role;
    if (!role) return false;

    // Pega o arquivo atual (index.html, notes.html...)
    const current = window.location.pathname.split("/").pop() || "index.html";

    // Menus por cargo (começa só com CEO, expande depois)
    const menus = {
      ceo: [
  { label: "Visão Geral", href: "index.html" },
  { label: "Decisões", href: "decisions.html" },
  { label: "Riscos", href: "risks.html" },
  { label: "Notas", href: "notes.html" },
  { label: "Propostas", href: "proposals.html" },
  { label: "Relatórios", href: "reports.html" },
  { label: "Relatório Operacional", href: "ops-report.html" },
  { label: "Painel de Decisões", href: "../shared/pages/decisions.html" },
],
      coo: [
  { label: "Visão Geral", href: "index.html" },
  { label: "Propostas", href: "proposals.html" },
  { label: "Relatórios", href: "reports.html" },
  { label: "Painel de Decisões", href: "../shared/pages/decisions.html" },
  { label: "Gerenciar Decisões", href: "decisions-admin.html" },
],
      cfo: [
  { label: "Visão Geral", href: "index.html" },
  { label: "Aprovações Financeiras", href: "approvals.html" },
  { label: "Propostas", href: "proposals.html" },
  { label: "Painel de Decisões", href: "../shared/pages/decisions.html" },
],
      cto: [
  { label: "Visão Geral", href: "index.html" },
  { label: "Tech Intake", href: "intake.html" },
  { label: "Debt & Quality", href: "debt.html" },
  { label: "Notas", href: "notes.html" },
  { label: "Propostas", href: "proposals.html" },
  { label: "Painel de Decisões", href: "../shared/pages/decisions.html" },
],
      cmo: [
  { label: "Visão Geral", href: "index.html" },
  { label: "Propostas", href: "proposals.html" },
  { label: "Painel de Decisões", href: "../shared/pages/decisions.html" },
],

    };

    const items = menus[role] || [];
    const html = items
      .map((item) => {
        const active = item.href === current ? "active" : "";
        return `<a href="${item.href}" class="${active}">${item.label}</a>`;
      })
      .join("");
    safeHTML(nav, html);

    return true;
  };

  // Se o layout injeta depois, tenta algumas vezes
  const buildSidebarWithRetry = (tries = 10, delay = 80) => {
    let count = 0;
    const tick = () => {
      const ok = buildSidebar();
      if (ok) return;
      count += 1;
      if (count < tries) setTimeout(tick, delay);
    };
    tick();
  };

  // ===================================================
  // HELPERS COMUNS
  // ===================================================

  const createElement = (tag, className = "", attributes = {}) => {
    const element = document.createElement(tag);
    if (className) element.className = className;

    Object.entries(attributes).forEach(([key, value]) => {
      if (key === "text") safeText(element, value);
      else if (key === "html") safeHTML(element, value);
      else element.setAttribute(key, value);
    });

    return element;
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value, currency = "BRL") => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  const debounce = (func, wait = 300) => {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const throttle = (func, limit = 300) => {
    let inThrottle = false;
    return function (...args) {
      if (inThrottle) return;
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    };
  };

  const fetchData = async (url, options = {}) => {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    return await response.json();
  };

  // ===================================================
  // DOM HELPERS (blindagem contra DOM inexistente)
  // ===================================================
  const byId = (id) => {
    if (!id) return null;
    try {
      return document.getElementById(id) || null;
    } catch (_) {
      return null;
    }
  };

  const qs = (selector) => {
    if (!selector) return null;
    try {
      return document.querySelector(selector) || null;
    } catch (_) {
      return null;
    }
  };

  const safeText = (el, value) => {
    if (!el) return;
    try {
      el.textContent = String(value ?? "");
    } catch (_) {}
  };

  const safeHTML = (el, value) => {
    if (!el) return;
    try {
      el.innerHTML = String(value ?? "");
    } catch (_) {}
  };

  // ===================================================
  // FETCH PADRONIZADO (injeta token, trata 401)
  // ===================================================
  const apiFetch = async (path, options = {}) => {
    const opts = { ...options };
    opts.headers = { ...(options.headers || {}) };

    // Injeta token automaticamente se não houver Authorization
    const hasAuthHeader = Object.keys(opts.headers).some(
      (h) => h.toLowerCase() === "authorization"
    );
    if (!hasAuthHeader) {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token) opts.headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(path, opts);

      if (res.status === 401) {
        // Sessão inválida: limpa apenas chaves de sessão e redireciona
        clearSession();
        // Tenta ir para login relativo às páginas internas
        window.location.href = "../auth/login.html";
        throw new Error("Não autorizado (401)");
      }

      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        // Tenta ler JSON de erro
        if (contentType.includes("application/json")) {
          const err = await res.json();
          throw new Error(err.error || err.message || `HTTP ${res.status}`);
        }
        throw new Error(`HTTP ${res.status}`);
      }

      if (contentType.includes("application/json")) {
        return await res.json();
      }
      // fallback: retorna Response para quem precisar blob/text
      return res;
    } catch (e) {
      // Log controlado
      log("apiFetch", e.message);
      throw e;
    }
  };

  const log = (contextOrMessage, messageOrData = null, maybeData = null) => {
    const timestamp = new Date().toLocaleTimeString("pt-BR");
    const roleTag = state.role ? `[${state.role.toUpperCase()}]` : "";

    // Compat: log(message, data)
    if (maybeData === null && typeof messageOrData !== "string") {
      const msg = contextOrMessage;
      const data = messageOrData;
      if (data) console.log(`[${timestamp}] ${roleTag} ${msg}`, data);
      else console.log(`[${timestamp}] ${roleTag} ${msg}`);
      return;
    }

    // Novo formato: log(context, message, data?)
    const ctx = String(contextOrMessage || "").toUpperCase();
    const msg = String(messageOrData || "");
    const data = maybeData;
    const ctxTag = ctx ? `[${ctx}]` : "";
    if (data) console.log(`[${timestamp}] ${roleTag} ${ctxTag} ${msg}`, data);
    else console.log(`[${timestamp}] ${roleTag} ${ctxTag} ${msg}`);
  };

  // ===================================================
  // INICIALIZAÇÃO
  // ===================================================

  const init = () => {
    initializeState();
    applyRoleStyles();
    updateUserUI();
    setupLogout();
    buildSidebarWithRetry(); // importante por causa do layout.js
    log("INIT", "Aplicação inicializada");
  };

  // ===================================================
  // API PÚBLICA
  // ===================================================

  return {
    // Storage keys
    STORAGE_KEYS,
    // Estado
    getState,
    getUser,
    getRole,
    isAuthenticated,
    setUser,
    clearState,
    clearSession,

    // UI
    updateUserUI,
    applyRoleStyles,
    buildSidebar, // usado pelo layout.js se quiser chamar direto
    setupLogout, // usado pelo layout.js após injetar header

    // Helpers
    createElement,
    formatDate,
    formatCurrency,
    truncateText,
    debounce,
    throttle,
    fetchData,
    byId,
    qs,
    safeText,
    safeHTML,
    apiFetch,
    log,

    // Init
    init,
  };
})();

// Inicializar quando DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => window.App.init());
} else {
  window.App.init();
}
