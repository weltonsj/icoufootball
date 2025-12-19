/**
 * Theme Manager - Controla o modo claro/escuro da aplicação
 * Aplica tema na classe 'app-content' e persiste em localStorage
 */

const THEME_KEY = 'icoufootball_theme';
const THEME_LIGHT = 'light';
const THEME_DARK = 'dark';

/**
 * Obtém o tema atual do localStorage ou retorna 'dark' como padrão
 */
function getCurrentTheme() {
    try {
        const saved = localStorage.getItem(THEME_KEY);
        return saved === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
    } catch (e) {
        console.error('Erro ao ler tema:', e);
        return THEME_DARK;
    }
}

/**
 * Salva o tema no localStorage
 */
function saveTheme(theme) {
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
        console.error('Erro ao salvar tema:', e);
    }
}

/**
 * Aplica o tema na aplicação
 */
function applyTheme(theme) {
    const appContent = document.querySelector('.app-content');
    const body = document.body;
    const html = document.documentElement;

    if (!appContent) {
        console.warn('Elemento .app-content não encontrado');
        return;
    }

    if (theme === THEME_LIGHT) {
        // Modo Claro
        appContent.classList.add('theme-light');
        appContent.classList.remove('theme-dark');
        body.classList.add('theme-light');
        body.classList.remove('theme-dark');
        html.classList.add('theme-light');
        html.classList.remove('theme-dark');
        
        // Aplica imagem de fundo do tema claro
        appContent.style.backgroundImage = 'url("https://i.ibb.co/205VWTVK/background-main-claro-1024x1024.webp")';
    } else {
        // Modo Escuro (padrão)
        appContent.classList.add('theme-dark');
        appContent.classList.remove('theme-light');
        body.classList.add('theme-dark');
        body.classList.remove('theme-light');
        html.classList.add('theme-dark');
        html.classList.remove('theme-light');
        
        // Aplica imagem de fundo do tema escuro
        appContent.style.backgroundImage = 'url("https://i.ibb.co/YBwM7XCy/background-main-1024x1024.webp")';
    }
}

/**
 * Atualiza o texto do status do modo escuro
 */
function updateThemeStatus(theme) {
    const statusElement = document.querySelector('.dark-mode-status');
    if (statusElement) {
        statusElement.textContent = theme === THEME_DARK ? 'ON' : 'OFF';
    }
}

/**
 * Alterna entre os temas
 */
function toggleTheme() {
    const currentTheme = getCurrentTheme();
    const newTheme = currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
    
    applyTheme(newTheme);
    saveTheme(newTheme);
    updateThemeStatus(newTheme);
    
    return newTheme;
}

/**
 * Inicializa o gerenciador de temas
 */
function initThemeManager() {
    // Aplica o tema salvo imediatamente
    const savedTheme = getCurrentTheme();
    applyTheme(savedTheme);
    
    // Atualiza o checkbox do toggle
    const toggleCheckbox = document.querySelector('.dark-mode-toggle input[type="checkbox"]');
    if (toggleCheckbox) {
        toggleCheckbox.checked = savedTheme === THEME_DARK;
        
        // Adiciona listener para mudanças
        toggleCheckbox.addEventListener('change', (e) => {
            toggleTheme();
        });
    }
    
    // Atualiza o status inicial
    updateThemeStatus(savedTheme);
}

export {
    initThemeManager,
    toggleTheme,
    getCurrentTheme,
    THEME_LIGHT,
    THEME_DARK
};
