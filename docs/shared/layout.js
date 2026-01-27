/* ======================================================
   LAYOUT INJECTOR

   Responsável por injetar automaticamente a sidebar
   e o header em todas as páginas internas.

   Uso: <script src="../shared/layout.js"></script>

   Estrutura esperada no HTML:
   - <div id="sidebar"></div>
   - <div id="header"></div>

====================================================== */

const Layout = (() => {
  /**
   * Detecta o caminho base para os assets 'shared' automaticamente
   * Suporta páginas em diferentes níveis:
   * - Se está em /cto/, /coo/, etc. → base = "../shared/"
   * - Se está em /shared/pages/ → base = "../"
   */
  const getSharedBase = () => {
    // Em file:// precisa ser relativo. Em http(s) usa caminho absoluto para evitar 404 por base relativa.
    if (window.location.protocol !== "file:") {
      return "/shared/";
    }

    const path = window.location.pathname.toLowerCase();

    // Se a pagina esta dentro de /shared/ (como /shared/pages/)
    if (path.includes("/shared/")) {
      return "../";
    }

    // Padrao para paginas em pastas como /cto/, /coo/, /cfo/, etc.
    return "../shared/";
  };

  const sharedBase = getSharedBase();
  /**
   * Carrega um componente HTML de forma segura
   * @param {string} selector - Seletor CSS do container
   * @param {string} filePath - Caminho do arquivo HTML
   */
  const loadComponent = async (selector, filePath) => {
    try {
      const container = document.querySelector(selector);

      if (!container) {
        console.warn(`Container não encontrado: ${selector}`);
        return;
      }

      const response = await fetch(filePath);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const html = await response.text();
      if (window.App?.safeHTML) {
        window.App.safeHTML(container, html);
      } else {
        container.innerHTML = html;
      }
    } catch (error) {
      console.error(`Erro ao carregar ${filePath}:`, error);

      const container = document.querySelector(selector);
      if (container) {
        const html = `
          <div style="padding: 1rem; color: #f85149; background: rgba(248, 81, 73, 0.1); border-radius: 4px;">
            ⚠️ Erro ao carregar componente
          </div>
        `;
        if (window.App?.safeHTML) {
          window.App.safeHTML(container, html);
        } else {
          container.innerHTML = html;
        }
      }
    }
  };

  /**
   * Injeta os estilos CSS globais
   */
  const injectStyles = async () => {
    try {
      const stylePaths = [
        sharedBase + "css/global.css",
        sharedBase + "css/components.css",
        sharedBase + "css/roles.css",
      ];

      const existingLinks = document.querySelectorAll('link[rel="stylesheet"]');
      const existingHrefs = Array.from(existingLinks).map((l) => l.getAttribute("href") || "");

      stylePaths.forEach((path) => {
        const file = path.split("/").pop();
        const alreadyLoaded = existingHrefs.some((href) => href.includes(file));
        if (!alreadyLoaded) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = path;
          link.type = "text/css";
          document.head.appendChild(link);
        }
      });
    } catch (error) {
      console.error("Erro ao injetar estilos:", error);
    }
  };

  /**
   * Carrega o layout (sidebar e header)
   */
  const loadLayout = async () => {
    await injectStyles();

    // Carregar componentes em paralelo
    await Promise.all([
      loadComponent("#sidebar", sharedBase + "components/sidebar.html"),
      loadComponent("#header", sharedBase + "components/header.html"),
    ]);

    // Depois que sidebar/header existem, sincroniza com App
    syncWithApp();
    
    // Inicializa sistema de notificações
    initNotifications();
  };

  /**
   * Sincroniza UI com o estado global (App)
   * Evita race condition entre Layout e App.
   */
  const syncWithApp = () => {
    if (!window.App) return;

    // aplica role no body (role-ceo etc)
    window.App.applyRoleStyles?.();

    // preenche header (user, avatar, role)
    window.App.updateUserUI?.();

    // configura logout (importante: header foi injetado agora)
    window.App.setupLogout?.();

    // monta o menu dinâmico por role
    window.App.buildSidebar?.();

    // marca ativo (fallback se necessário)
    setActiveLinkByUrl();
  };

  /**
   * Inicializa o sistema de notificações de propostas
   */
  const initNotifications = () => {
    // Aguarda um momento para garantir que o header foi renderizado
    setTimeout(() => {
      if (window.NotificationSystem) {
        window.NotificationSystem.initialize();
      }
    }, 500);
  };

  /**
   * Marca o item ativo baseado na URL atual
   * (Funciona bem com <a href="notes.html"> etc.)
   */
  const setActiveLinkByUrl = () => {
    const nav = document.getElementById("nav");
    if (!nav) return;

    const current = window.location.pathname.split("/").pop() || "index.html";
    const links = nav.querySelectorAll("a[href]");

    links.forEach((a) => {
      const href = a.getAttribute("href");
      if (!href) return;
      a.classList.toggle("active", href === current);
    });
  };

  /**
   * (LEGADO) Se você ainda usa .sidebar-nav-item em algum lugar,
   * isso não vai quebrar. Mas não é mais o padrão.
   */
  const setupLegacyNavigation = () => {
    const navItems = document.querySelectorAll(".sidebar-nav-item");
    if (!navItems.length) return;

    navItems.forEach((item) => {
      item.addEventListener("click", () => {
        navItems.forEach((nav) => nav.classList.remove("active"));
        item.classList.add("active");
      });
    });
  };

  /**
   * Inicializa o layout
   */
  const init = async () => {
    const boot = async () => {
      await loadLayout();
      setupLegacyNavigation(); // não atrapalha, só fallback
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      await boot();
    }
  };

  return {
    init,
    loadLayout,
    loadComponent,
  };
})();

Layout.init();
