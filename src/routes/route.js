import { page } from "../functions/pages.js";
import { showSpinner, hideSpinner } from "../components/spinner.js";
import { setActiveNavItem, getCurrentUser, getCurrentRole } from "../utils/authManager.js";
import { showModal } from "../components/modal.js";

const ROUTES = Object.keys(page);

// Rotas que requerem autenticação
const PROTECTED_ROUTES = ['dashboard', 'matches', 'chat', 'profile', 'admin'];

function getPageByRoute(route) {
  // Converte 'homepage' para 'mainPage' para compatibilidade
  if (route === 'homepage') route = 'mainPage';
  return page[route] || null;
}

function isRouteProtected(route) {
  return PROTECTED_ROUTES.includes(route);
}

function isUserAuthenticated() {
  return getCurrentUser() !== null;
}

function isAdminRoute(route) {
  return route === 'admin';
}

function isRoleAdminOrSuperadmin(role) {
  const r = String(role || '').trim().toLowerCase();
  return r === 'admin' || r === 'superadmin' || r === 'super-admin' || r === 'super admin';
}

// Variável global para rastrear rota anterior
let rotaAnterior = null;

export function renderPages(route = "mainPage", targetSelector = "main.app-content") {
  // Converte 'homepage' para 'mainPage' para compatibilidade
  if (route === 'homepage') route = 'mainPage';

  const target = document.querySelector(targetSelector);
  if (!target) {
    console.warn("A tag <main> não encontrada");
    return;
  }

  // Detectar saída da rota 'chat' e chamar destruirChat()
  if (rotaAnterior === 'chat' && route !== 'chat') {
    console.log('[Route] Saindo da rota chat, chamando destruirChat()...');
    if (typeof window.destruirChat === 'function') {
      window.destruirChat();
    }
  }

  // Detectar saída da rota 'admin' e chamar destruirAdmin()
  if (rotaAnterior === 'admin' && route !== 'admin') {
    console.log('[Route] Saindo da rota admin, chamando destruirAdmin()...');
    if (typeof window.destruirAdmin === 'function') {
      window.destruirAdmin();
    }
  }

  // Detectar saída da rota 'dashboard' e chamar cleanupDashboard()
  if (rotaAnterior === 'dashboard' && route !== 'dashboard') {
    console.log('[Route] Saindo da rota dashboard, chamando cleanupDashboard()...');
    if (typeof window.cleanupDashboard === 'function') {
      window.cleanupDashboard();
    }
  }

  // Detectar saída da rota 'profile' e chamar cleanupProfile()
  if (rotaAnterior === 'profile' && route !== 'profile') {
    console.log('[Route] Saindo da rota profile, chamando cleanupProfile()...');
    if (typeof window.cleanupProfile === 'function') {
      window.cleanupProfile();
    }
  }

  // Atualizar rota anterior
  rotaAnterior = route;

  // Gerenciar classes no body para estilização específica por página
  // Remove classes antigas de página
  document.body.classList.forEach(cls => {
    if (cls.startsWith('page-')) {
      document.body.classList.remove(cls);
    }
  });
  // Adiciona classe da página atual
  document.body.classList.add(`page-${route}`);

  // Route Guard: Verifica se rota é protegida e usuário não está autenticado
  if (isRouteProtected(route) && !isUserAuthenticated()) {
    console.warn(`Acesso negado à rota protegida: ${route}. Redirecionando para home.`);
    window.location.href = './index.html';
    return;
  }

  // Route Guard: Admin Only
  if (isAdminRoute(route)) {
    const role = getCurrentRole();
    if (!isRoleAdminOrSuperadmin(role)) {
      showModal('error', 'Acesso negado', 'Esta página é restrita a administradores.');
      window.location.hash = '#homepage';
      return;
    }
  }

  // Transição suave: fade-out
  target.classList.add("fade-out");
  target.style.position = 'relative';
  showSpinner(target);

  setTimeout(() => {
    const currentPage = getPageByRoute(route);
    if (!currentPage) {
      target.innerHTML = `<section class=\"not-found\"><h2>Página não encontrada</h2><p>A rota <b>${route}</b> não existe.</p></section>`;
      target.className = "app-content not-found";
      removeDynamicAssets(route);
      target.classList.remove("fade-out");
      target.classList.add("fade-in");
      setTimeout(() => {
        target.classList.remove("fade-in");
        hideSpinner();
      }, 200); // Reduzido de 400ms para transição mais rápida
      return;
    }

    // NÃO renderiza HTML ainda - aguarda CSS primeiro
    let cssLoaded = false;
    const existingCss = document.querySelector(`#${currentPage.name}-css`);

    if (!existingCss) {
      const link = document.createElement("link");
      link.id = `${currentPage.name}-css`;
      link.rel = "stylesheet";
      link.href = `./assets/css/pages/${currentPage.name}.css`;

      // Espera o CSS carregar ANTES de renderizar o HTML
      link.onload = () => {
        cssLoaded = true;
        proceedWithRendering();
      };

      // Timeout de segurança (3s) para evitar travamento
      const cssTimeout = setTimeout(() => {
        if (!cssLoaded) {
          cssLoaded = true;
          proceedWithRendering();
        }
      }, 3000);

      link.onerror = () => {
        clearTimeout(cssTimeout);
        proceedWithRendering();
      };

      document.head.appendChild(link);
    } else {
      // CSS já estava em cache, renderiza imediatamente
      proceedWithRendering();
    }

    function proceedWithRendering() {
      // AGORA renderiza o HTML (CSS já está pronto)
      target.innerHTML = `${currentPage.content}`;
      target.className = `app-content ${currentPage.className}`;

      // Para mainPage, não carrega script dinâmico (lógica está em main.js)
      // Dispara evento para que main.js inicialize as funções
      if (currentPage.name === 'mainPage') {
        window.dispatchEvent(new CustomEvent('mainPageLoaded'));
      } else if (currentPage.name === 'chat') {
        // Chat usa chatFunctions.js em vez de chat.js
        const existingScript = document.querySelector(`#chat-js`);
        if (existingScript) {
          existingScript.remove();
        }
        const script = document.createElement("script");
        script.type = "module";
        script.id = `chat-js`;
        script.src = `./src/functions/chatFunctions.js?t=${Date.now()}`;
        document.body.appendChild(script);
      } else if (currentPage.name === 'matches') {
        // Matches usa initMatchesPage do matches.js
        import('../pages/matches.js').then(module => {
          if (module.initMatchesPage) {
            module.initMatchesPage();
          }
        }).catch(err => console.error('[route] Erro ao carregar matches.js:', err));
      } else {
        // Carrega JS dinâmico para outras páginas
        const existingScript = document.querySelector(`#${currentPage.name}-js`);
        if (existingScript) {
          existingScript.remove();
        }
        const script = document.createElement("script");
        script.type = "module";
        script.id = `${currentPage.name}-js`;
        script.src = `./src/functions/${currentPage.name}.js?t=${Date.now()}`;
        document.body.appendChild(script);
      }

      // Remove assets de páginas anteriores
      removeDynamicAssets(currentPage.name);

      // Transição suave: fade-in (HTML + CSS já prontos)
      target.classList.remove("fade-out");
      target.classList.add("fade-in");
      setTimeout(() => {
        target.classList.remove("fade-in");
        hideSpinner();
      }, 200); // Reduzido de 400ms para transição mais rápida

      // Atualiza a classe active no menu
      setActiveNavItem(route);
    }
  }, 300);
}

function removeDynamicAssets(currentName) {
  ROUTES.forEach((route) => {
    if (route !== currentName) {
      const css = document.querySelector(`#${route}-css`);
      if (css) css.remove();
      const js = document.querySelector(`#${route}-js`);
      if (js) js.remove();
    }
  });
}

function getRouteFromHref(href) {
  // Extrai o nome da página do href
  const match = href.match(/([a-zA-Z]+)\.html$/);
  if (match && ROUTES.includes(match[1])) {
    return match[1];
  }
  return null;
}

function getRouteFromHash() {
  const hash = window.location.hash.replace("#", "");
  return ROUTES.includes(hash) ? hash : null;
}