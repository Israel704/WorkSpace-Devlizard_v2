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

  // Chaves de sessão (não apagar dados de ferramentas!)
  const SESSION_KEYS = ["user", "role", "auth", "selectedRole"];

  function initializeState() {
    const storedUser = localStorage.getItem("user");
    const storedRole = localStorage.getItem("role");
    const storedAuth = localStorage.getItem("auth");

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

    localStorage.setItem("user", username);
    localStorage.setItem("role", state.role);
    localStorage.setItem("auth", "true");

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
    const userInfo = document.getElementById("userInfo");
    if (userInfo && state.user) userInfo.textContent = state.user;

    // Avatar letra
    const userAvatar = document.getElementById("userAvatar");
    if (userAvatar && state.user) userAvatar.textContent = state.user.charAt(0).toUpperCase();

    // Badge role
    const roleIndicator = document.getElementById("roleIndicator");
    if (roleIndicator && state.role) roleIndicator.textContent = state.role.toUpperCase();
  };

  const setupLogout = () => {
    // suporta ids diferentes
    const logoutBtn =
      document.getElementById("logoutBtn") ||
      document.getElementById("logout");

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
    const nav = document.getElementById("nav");
    if (!nav) return false;

    const role = state.role;
    if (!role) return false;

    // Pega o arquivo atual (index.html, notes.html...)
    const current = window.location.pathname.split("/").pop() || "index.html";

    // Menus por cargo (começa só com CEO, expande depois)
    const menus = {
      ceo: [
  { label: "Visão Geral", href: "index.html" },
  { label: "Encaminhar Arquivo", href: "forward.html" },
  { label: "Caixa de Entrada", href: "inbox.html" },
  { label: "Decisões", href: "decisions.html" },
  { label: "Riscos", href: "risks.html" },
  { label: "Notas", href: "notes.html" },
  { label: "Relatórios", href: "reports.html" },
  { label: "Relatório Operacional", href: "ops-report.html" },
],

    };

    const items = menus[role] || [];
    nav.innerHTML = items
      .map((item) => {
        const active = item.href === current ? "active" : "";
        return `<a href="${item.href}" class="${active}">${item.label}</a>`;
      })
      .join("");

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
      if (key === "text") element.textContent = value;
      else if (key === "html") element.innerHTML = value;
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

  const log = (message, data = null) => {
    const timestamp = new Date().toLocaleTimeString("pt-BR");
    const roleTag = state.role ? `[${state.role.toUpperCase()}]` : "";
    if (data) console.log(`[${timestamp}] ${roleTag} ${message}`, data);
    else console.log(`[${timestamp}] ${roleTag} ${message}`);
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
    log("Aplicação inicializada");
  };

  // ===================================================
  // API PÚBLICA
  // ===================================================

  return {
    // Estado
    getState,
    getUser,
    getRole,
    isAuthenticated,
    setUser,
    clearState,

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
