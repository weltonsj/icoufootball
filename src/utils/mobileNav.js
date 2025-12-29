// mobileNav.js - Gerenciamento do Menu Hambúrguer e Navegação Mobile
// iCouFootball v2.0 - Responsividade

/**
 * Inicializa o sistema de navegação mobile (hambúrguer)
 */
export function initMobileNav() {
    const hamburger = document.getElementById('hamburger-menu');
    const mobileNavMenu = document.getElementById('mobile-nav-menu');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    const mobileNavClose = document.getElementById('mobile-nav-close');

    if (!hamburger || !mobileNavMenu || !mobileNavOverlay) {
        console.warn('[mobileNav] Elementos do menu mobile não encontrados');
        return;
    }

    // Toggle do menu ao clicar no hambúrguer
    hamburger.addEventListener('click', () => {
        toggleMobileMenu();
    });

    // Fechar ao clicar no overlay
    mobileNavOverlay.addEventListener('click', () => {
        closeMobileMenu();
    });

    // Fechar ao clicar no X
    if (mobileNavClose) {
        mobileNavClose.addEventListener('click', () => {
            closeMobileMenu();
        });
    }

    // Fechar ao clicar em um link de navegação
    const mobileNavLinks = mobileNavMenu.querySelectorAll('.nav-item');
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeMobileMenu();
        });
    });

    // Fechar com tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileNavMenu.classList.contains('active')) {
            closeMobileMenu();
        }
    });

    // Sincroniza visibilidade dos itens do menu mobile com o menu desktop
    syncMobileNavVisibility();

    // Observer para sincronizar quando itens do menu desktop mudam
    observeNavChanges();
}

/**
 * Abre/fecha o menu mobile
 */
function toggleMobileMenu() {
    const hamburger = document.getElementById('hamburger-menu');
    const mobileNavMenu = document.getElementById('mobile-nav-menu');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');

    const isOpen = mobileNavMenu.classList.contains('active');

    if (isOpen) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
}

/**
 * Abre o menu mobile
 */
function openMobileMenu() {
    const hamburger = document.getElementById('hamburger-menu');
    const mobileNavMenu = document.getElementById('mobile-nav-menu');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');

    hamburger.classList.add('active');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileNavMenu.classList.add('active');
    mobileNavOverlay.classList.add('active');
    
    // Previne scroll do body
    document.body.style.overflow = 'hidden';

    // Sincroniza visibilidade
    syncMobileNavVisibility();
}

/**
 * Fecha o menu mobile
 */
export function closeMobileMenu() {
    const hamburger = document.getElementById('hamburger-menu');
    const mobileNavMenu = document.getElementById('mobile-nav-menu');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');

    if (!hamburger || !mobileNavMenu || !mobileNavOverlay) return;

    hamburger.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileNavMenu.classList.remove('active');
    mobileNavOverlay.classList.remove('active');
    
    // Restaura scroll do body
    document.body.style.overflow = '';
}

/**
 * Sincroniza a visibilidade dos itens do menu mobile com o menu desktop
 */
export function syncMobileNavVisibility() {
    const desktopNav = document.getElementById('main-nav');
    const mobileNavMenu = document.getElementById('mobile-nav-menu');

    if (!desktopNav || !mobileNavMenu) return;

    // Mapeia itens do menu desktop
    const desktopItems = desktopNav.querySelectorAll('.nav-item');
    
    desktopItems.forEach(desktopItem => {
        const href = desktopItem.getAttribute('href');
        const isHidden = desktopItem.classList.contains('hidden');
        
        // Encontra item correspondente no menu mobile
        const mobileItem = mobileNavMenu.querySelector(`[href="${href}"]`);
        if (mobileItem) {
            if (isHidden) {
                mobileItem.classList.add('hidden');
            } else {
                mobileItem.classList.remove('hidden');
            }
        }
    });

    // Sincroniza classe active
    const activeDesktopItem = desktopNav.querySelector('.nav-item.active');
    if (activeDesktopItem) {
        const href = activeDesktopItem.getAttribute('href');
        const mobileItems = mobileNavMenu.querySelectorAll('.nav-item');
        mobileItems.forEach(item => {
            if (item.getAttribute('href') === href) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
}

/**
 * Observer para detectar mudanças nos itens de navegação desktop
 */
function observeNavChanges() {
    const desktopNav = document.getElementById('main-nav');
    if (!desktopNav) return;

    const observer = new MutationObserver((mutations) => {
        let shouldSync = false;
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                shouldSync = true;
            }
        });
        if (shouldSync) {
            syncMobileNavVisibility();
        }
    });

    // Observa todos os itens de navegação
    const navItems = desktopNav.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        observer.observe(item, { attributes: true, attributeFilter: ['class'] });
    });
}

/**
 * Atualiza item ativo no menu mobile
 * @param {string} route - A rota ativa atual
 */
export function setActiveMobileNavItem(route) {
    const mobileNavMenu = document.getElementById('mobile-nav-menu');
    if (!mobileNavMenu) return;

    const mobileItems = mobileNavMenu.querySelectorAll('.nav-item');
    mobileItems.forEach(item => {
        const href = item.getAttribute('href')?.replace('#', '');
        if (href === route || (route === 'mainPage' && href === 'homepage')) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

/**
 * Verifica se estamos em viewport mobile
 * @returns {boolean}
 */
export function isMobileViewport() {
    return window.innerWidth <= 768;
}

/**
 * Detecta mudanças de viewport e ajusta comportamentos
 */
export function initViewportListener() {
    let lastIsMobile = isMobileViewport();

    window.addEventListener('resize', () => {
        const currentIsMobile = isMobileViewport();
        
        // Se mudou de mobile para desktop, fecha o menu
        if (lastIsMobile && !currentIsMobile) {
            closeMobileMenu();
        }
        
        lastIsMobile = currentIsMobile;
    });
}
