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
  // API BASE (suporte a Live Server e backend local)
  // ===================================================

  const resolveApiBase = () => {
    const port = window.location.port;
    if (port === "5500" || port === "5501") {
      return "http://localhost:3000/api";
    }
    return "/api";
  };

  const API_BASE = resolveApiBase();
  window.API_BASE = API_BASE;


  // ===================================================
  // CHAVES CENTRALIZADAS DE STORAGE (compatíveis)
  // ===================================================
  const STORAGE_KEYS = {
    AUTH: "auth",
    ROLE: "role",
    USER: "user",
    TOKEN: "token",
    SELECTED_ROLE: "selectedRole",
    PROFILE_NAME: "profile_name",
    AVATAR: "profile_avatar",
    COO_KANBAN: "coo_kanban_tasks",
    COO_KANBAN_SETTINGS: "coo_kanban_settings",
    CEO_REPORTS: "ceo_reports_data",
    COO_REPORTS: "coo_reports_data",
    SHARED_REPORTS: "shared_reports_data",
  };

  // Tornar disponível globalmente sem mudar stack
  window.STORAGE_KEYS = STORAGE_KEYS;

  const ROLE_LIST = ["ceo", "coo", "cto", "cfo", "cmo", "comercial"];
  const PRESENCE_KEY_PREFIX = "role_presence_";
  const PRESENCE_TTL_MS = 60 * 1000;
  let presenceTimer = null;
  let presenceListenerBound = false;
  let presenceCache = null;
  let presenceApiAvailable = true;

  // Chaves de sessão (não apagar dados de ferramentas!)
  const SESSION_KEYS = [
    STORAGE_KEYS.USER,
    STORAGE_KEYS.ROLE,
    STORAGE_KEYS.AUTH,
    STORAGE_KEYS.SELECTED_ROLE,
    STORAGE_KEYS.TOKEN,
    STORAGE_KEYS.PROFILE_NAME,
    STORAGE_KEYS.AVATAR,
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
    localStorage.setItem(STORAGE_KEYS.PROFILE_NAME, username);

    applyRoleStyles();
    updateUserUI();
    touchPresence();
    updatePresenceUI();
    fetchPresence();
    if (!presenceTimer) {
      presenceTimer = setInterval(() => {
        touchPresence();
        fetchPresence();
        updatePresenceUI();
      }, 15000);
    }

    if (!presenceListenerBound) {
      window.addEventListener("storage", (event) => {
        if (event.key && event.key.startsWith(PRESENCE_KEY_PREFIX)) {
          updatePresenceUI();
        }
      });
      presenceListenerBound = true;
    }
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
    const displayName =
      localStorage.getItem(STORAGE_KEYS.PROFILE_NAME) || state.user || "Usuário";

    const avatarUrl = localStorage.getItem(STORAGE_KEYS.AVATAR);

    // Nome do usuário
    const userInfo = byId("userInfo");
    safeText(userInfo, displayName);

    // Avatar letra
    const userAvatar = byId("userAvatar");
    if (userAvatar) {
      if (avatarUrl) {
        userAvatar.style.backgroundImage = `url('${avatarUrl}')`;
        userAvatar.classList.add("has-image");
        safeText(userAvatar, "");
      } else {
        userAvatar.style.backgroundImage = "";
        userAvatar.classList.remove("has-image");
        safeText(userAvatar, displayName.charAt(0).toUpperCase());
      }
    }

    // Badge role
    const roleIndicator = byId("roleIndicator");
    if (state.role) safeText(roleIndicator, state.role.toUpperCase());

    updatePresenceUI();
  };

  const touchPresence = async () => {
    if (!state.role) return;
    localStorage.setItem(`${PRESENCE_KEY_PREFIX}${state.role}`, String(Date.now()));

    if (!presenceApiAvailable) return;
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) return;

    try {
      await apiFetch(`${API_BASE}/users/presence`, { method: "POST" });
      presenceApiAvailable = true;
    } catch (e) {
      presenceApiAvailable = false;
    }
  };

  const getPresenceState = () => {
    if (presenceCache && presenceCache.roles) {
      return ROLE_LIST.map((role) => ({
        role,
        online: !!presenceCache.roles[role]?.online,
      }));
    }

    const now = Date.now();
    return ROLE_LIST.map((role) => {
      const lastSeen = Number(localStorage.getItem(`${PRESENCE_KEY_PREFIX}${role}`)) || 0;
      return { role, online: now - lastSeen <= PRESENCE_TTL_MS };
    });
  };

  const fetchPresence = async () => {
    if (!presenceApiAvailable) return;
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) return;

    try {
      const data = await apiFetch(`${API_BASE}/users/presence`);
      if (data && data.roles) {
        presenceCache = data;
        updatePresenceUI();
      }
      presenceApiAvailable = true;
    } catch (e) {
      presenceApiAvailable = false;
    }
  };

  const updatePresenceUI = () => {
    const container = byId("rolePresence");
    if (!container) return;

    const items = getPresenceState()
      .filter(({ role }) => !state.role || role !== state.role)
      .map(({ role, online }) => {
        const label = role.toUpperCase();
        const statusClass = online ? "online" : "offline";
        return `<span class="role-pill ${statusClass}">(${label})</span>`;
      })
      .join("");

    safeHTML(container, items);
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
  { label: "Clientes", href: "../shared/pages/clients.html" },
  { label: "Decisões", href: "decisions.html" },
  { label: "Riscos", href: "risks.html" },
  { label: "Notas", href: "notes.html" },
  { label: "Roadmap Estratégico", href: "roadmap.html" },
  { label: "Propostas", href: "proposals.html" },
  { label: "Fluxo Comercial", href: "../shared/pages/commercial-projects.html" },
  { label: "Relatórios", href: "reports.html" },
  { label: "Relatório Operacional", href: "ops-report.html" },
  { label: "Painel de Decisões", href: "../shared/pages/decisions.html" },
  { label: "Roadmap (Leitura)", href: "../shared/pages/roadmap-view.html" },
  { label: "Configurações de Perfil", href: "../shared/pages/profile.html" },
],
      coo: [
  { label: "Visão Geral", href: "index.html" },
  { label: "Clientes", href: "../shared/pages/clients.html" },
  { label: "Propostas", href: "proposals.html" },
  { label: "Fluxo Comercial", href: "../shared/pages/commercial-projects.html" },
  { label: "Relatórios", href: "reports.html" },
  { label: "Painel de Decisões", href: "../shared/pages/decisions.html" },
  { label: "Gerenciar Decisões", href: "decisions-admin.html" },
  { label: "Roadmap (Leitura)", href: "../shared/pages/roadmap-view.html" },
  { label: "Configurações de Perfil", href: "../shared/pages/profile.html" },
],
      cfo: [
  { label: "Visão Geral", href: "index.html" },
  { label: "Situação da Empresa", href: "situation.html" },
  { label: "Clientes", href: "clients.html" },
  { label: "Projetos", href: "projects.html" },
  { label: "Propostas", href: "proposals.html" },
  { label: "Precificação", href: "pricing.html" },
  { label: "Precificação de Projetos", href: "pricing-projects.html" },
  { label: "Fluxo Comercial", href: "../shared/pages/commercial-projects.html" },
  { label: "Painel de Decisões", href: "../shared/pages/decisions.html" },
  { label: "Roadmap (Leitura)", href: "../shared/pages/roadmap-view.html" },
  { label: "Configurações de Perfil", href: "../shared/pages/profile.html" },
],
      cto: [
  { label: "Visão Geral", href: "index.html" },
  { label: "Clientes", href: "../shared/pages/clients.html" },
  { label: "Cadastro de Projetos", href: "projects.html" },
  { label: "Tech Intake", href: "intake.html" },
  { label: "Debt & Quality", href: "debt.html" },
  { label: "Notas", href: "notes.html" },
  { label: "Propostas", href: "proposals.html" },
  { label: "Fluxo Comercial", href: "../shared/pages/commercial-projects.html" },
  { label: "Painel de Decisões", href: "../shared/pages/decisions.html" },
  { label: "Roadmap (Leitura)", href: "../shared/pages/roadmap-view.html" },
  { label: "Configurações de Perfil", href: "../shared/pages/profile.html" },
],
      cmo: [
  { label: "Visão Geral", href: "index.html" },
  { label: "Clientes", href: "../shared/pages/clients.html" },
  { label: "Roteiro de Promessas", href: "promises.html" },
  { label: "Status", href: "status.html" },
  { label: "Biblioteca", href: "library.html" },
  { label: "Propostas", href: "proposals.html" },
  { label: "Fluxo Comercial", href: "../shared/pages/commercial-projects.html" },
  { label: "Painel de Decisões", href: "../shared/pages/decisions.html" },
  { label: "Roadmap (Leitura)", href: "../shared/pages/roadmap-view.html" },
  { label: "Configurações de Perfil", href: "../shared/pages/profile.html" },
],
      comercial: [
  { label: "Visão Geral", href: "index.html" },
  { label: "Clientes", href: "../shared/pages/clients.html" },
  { label: "Fluxo Comercial", href: "../shared/pages/commercial-projects.html" },
  { label: "Roadmap (Leitura)", href: "../shared/pages/roadmap-view.html" },
  { label: "Configurações de Perfil", href: "../shared/pages/profile.html" },
],

    };

    const items = menus[role] || [];
    const isSharedPage = window.location.pathname.toLowerCase().includes("/shared/pages/");
    const resolveHref = (href) => {
      if (!isSharedPage) return href;
      // Se já está em /shared/pages/ e o href é relativo (ex: decisions.html), não alterar
      if (!href.startsWith("../") && href.endsWith(".html")) return href;
      // Se começa com ../shared/, manter
      if (href.startsWith("../shared/")) return href;
      // Para outros casos, manter padrão antigo
      return `../../${role}/${href}`;
    };
    const html = items
      .map((item) => {
        const resolvedHref = resolveHref(item.href);
        const active = item.href === current ? "active" : "";
        return `<a href="${resolvedHref}" class="${active}">${item.label}</a>`;
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

    const resolveLoginPath = () => {
      const pathname = (window.location.pathname || "").toLowerCase();
      if (pathname.includes("/shared/pages/")) {
        return "../../auth/login.html";
      }
      return "../auth/login.html";
    };

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
        window.location.href = resolveLoginPath();
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
    touchPresence();
    updatePresenceUI();
    fetchPresence();
    if (!presenceTimer) {
      presenceTimer = setInterval(() => {
        touchPresence();
        fetchPresence();
        updatePresenceUI();
      }, 15000);
    }

    if (!presenceListenerBound) {
      window.addEventListener("storage", (event) => {
        if (event.key && event.key.startsWith(PRESENCE_KEY_PREFIX)) {
          updatePresenceUI();
        }
      });
      presenceListenerBound = true;
    }
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
    getApiBase: () => API_BASE,

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


