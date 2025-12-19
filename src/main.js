// main.js - Lógica consolidada da página estática Home + Login
import { login, resetPassword } from "./services/authService.js";
import { registerUser } from "./services/registerService.js";
import { validateRegister } from "./utils/validation.js";
import { showModal, showConfirmModal, showEmailPromptModal } from "./components/modal.js";
import { showSpinner, hideSpinner } from "./components/spinner.js";
import { getActiveChampionshipId, subscribeToStandings } from "./services/standingsService.js";
import { getUserMap } from "./services/usersService.js";
import { initAuthManager, loadAuthStateFromCache, updateMenuVisibility } from "./utils/authManager.js";
import { initThemeManager } from "./utils/themeManager.js";

// ====================================================================
// HOMEPAGE - Classificação e Estatísticas
// ====================================================================

async function renderTable(ranking) {
    const tbody = document.getElementById("standings-body");
    if (!tbody) return;

    tbody.innerHTML = "";
    const ids = ranking.map(r => r.id);
    const userMap = await getUserMap(ids);

    for (const r of ranking) {
        const tr = document.createElement("tr");
        const tdTeam = document.createElement("td");
        tdTeam.className = "team-cell";

        const img = document.createElement("img");
        img.className = "team-logo";
        img.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><rect width='100%' height='100%' fill='%23606060'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='12' fill='%23ffffff'>T</text></svg>";
        img.alt = "Logo";

        const u = userMap.get(r.id) || {};
        const label = u.nome ? `${u.nome}${u.timeId ? " - " + u.timeId : ""}` : String(r.id);
        const name = document.createTextNode(label);

        tdTeam.appendChild(img);
        tdTeam.appendChild(name);

        // Colunas: Pts, PJ, V, E, D, GM, GC, SG
        const tdPts = document.createElement("td"); tdPts.className = "numeric"; tdPts.textContent = String(r.P || 0);
        const tdPJ = document.createElement("td"); tdPJ.className = "numeric"; tdPJ.textContent = String((r.V || 0) + (r.E || 0) + (r.D || 0));
        const tdV = document.createElement("td"); tdV.className = "numeric"; tdV.textContent = String(r.V || 0);
        const tdE = document.createElement("td"); tdE.className = "numeric"; tdE.textContent = String(r.E || 0);
        const tdD = document.createElement("td"); tdD.className = "numeric"; tdD.textContent = String(r.D || 0);
        const tdGM = document.createElement("td"); tdGM.className = "numeric"; tdGM.textContent = String(r.GM || r.GP || 0);
        const tdGC = document.createElement("td"); tdGC.className = "numeric"; tdGC.textContent = String(r.GC || 0);
        const tdSG = document.createElement("td"); tdSG.className = "numeric"; tdSG.textContent = String(r.SG || 0);

        tr.appendChild(tdTeam);
        tr.appendChild(tdPts);
        tr.appendChild(tdPJ);
        tr.appendChild(tdV);
        tr.appendChild(tdE);
        tr.appendChild(tdD);
        tr.appendChild(tdGM);
        tr.appendChild(tdGC);
        tr.appendChild(tdSG);
        tbody.appendChild(tr);
    }
}

function renderStats(stats) {
    const elAtk = document.getElementById("stat-melhor-ataque");
    const elDef = document.getElementById("stat-melhor-defesa");
    const elGoleada = document.getElementById("stat-maior-goleada");
    const elPrev = document.getElementById("stat-campeao-anterior");

    if (elPrev) elPrev.textContent = "-";
    if (stats.bestAttack && elAtk) elAtk.textContent = `${stats.bestAttack.id} (${stats.bestAttack.val} GP)`;
    if (stats.bestDefense && elDef) elDef.textContent = `${stats.bestDefense.id} (${stats.bestDefense.val} GC)`;
    if (stats.biggestWin && elGoleada) elGoleada.textContent = `${stats.biggestWin.a} ${stats.biggestWin.ga}x${stats.biggestWin.gb} ${stats.biggestWin.b}`;
}

async function initHomepage() {
    const champId = await getActiveChampionshipId();
    if (!champId) return;

    subscribeToStandings(champId, ({ ranking, stats }) => {
        renderTable(ranking);
        renderStats(stats);
    });
}

// ====================================================================
// LOGIN - Autenticação e Registro
// ====================================================================

function initLogin() {
    const btnToggleLogin = document.getElementById("btnToggleLogin");
    const btnToggleRegister = document.getElementById("btnToggleRegister");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const forgotLink = document.querySelector(".forgot-password");

    // Se elementos não existem, pular (usuário já autenticado)
    if (!btnToggleLogin || !loginForm) return;

    // Toggle entre Login e Registro
    btnToggleLogin.addEventListener("click", () => {
        btnToggleLogin.classList.add("active");
        btnToggleRegister.classList.remove("active");
        loginForm.classList.remove("hidden");
        registerForm.classList.add("hidden");
    });

    btnToggleRegister.addEventListener("click", () => {
        btnToggleRegister.classList.add("active");
        btnToggleLogin.classList.remove("active");
        registerForm.classList.remove("hidden");
        loginForm.classList.add("hidden");
    });

    // Submit Login
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        try {
            showSpinner();
            await login(email, password);
            hideSpinner();
            showModal('success', 'Login efetuado', 'Você está autenticado');
            setTimeout(() => {
                window.location.hash = '#mainPage';
                window.location.reload();
            }, 800);
        } catch (err) {
            hideSpinner();
            showModal('error', 'Falha no login', 'Verifique suas credenciais');
        }
    });

    // Submit Registro
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("registerUsername").value;
        const email = document.getElementById("registerEmail").value;
        const password = document.getElementById("registerPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        const errors = validateRegister({ username, email, password, confirmPassword });
        if (Object.keys(errors).length) {
            showModal('error', 'Erro no Cadastro', 'Verifique os campos e tente novamente');
            return;
        }

        try {
            showSpinner();
            await registerUser({ username, email, password });
            hideSpinner();
            showModal('success', 'Cadastro Concluído', 'Sua conta foi criada com sucesso');
            btnToggleLogin.click();
        } catch (err) {
            hideSpinner();
            const code = String(err.message || 'ERROR');
            if (code.includes('EMAIL_EXISTS')) {
                showModal('error', 'E-mail já cadastrado', 'Use outro e-mail ou faça login');
            } else if (code.includes('INVALID_EMAIL')) {
                showModal('error', 'E-mail inválido', 'Informe um e-mail válido');
            } else {
                showModal('error', 'Falha no servidor', 'Tente novamente mais tarde');
            }
        }
    });

    // Validação em tempo real
    function validateRealtime() {
        const emailInput = document.getElementById("loginEmail");
        const passInput = document.getElementById("loginPassword");

        function mark(el, ok) { el.setAttribute('aria-invalid', ok ? 'false' : 'true'); }

        emailInput.addEventListener('input', () => { mark(emailInput, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)); });
        passInput.addEventListener('input', () => { mark(passInput, passInput.value.length >= 6); });

        const rUser = document.getElementById('registerUsername');
        const rEmail = document.getElementById('registerEmail');
        const rPass = document.getElementById('registerPassword');
        const rConfirm = document.getElementById('confirmPassword');

        rUser.addEventListener('input', () => { mark(rUser, rUser.value.trim().length > 0); });
        rEmail.addEventListener('input', () => { mark(rEmail, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rEmail.value)); });
        rPass.addEventListener('input', () => { mark(rPass, rPass.value.length >= 6); });
        rConfirm.addEventListener('input', () => { mark(rConfirm, rConfirm.value === rPass.value); });
    }
    validateRealtime();

    // Recuperação de senha
    if (forgotLink) {
        forgotLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = await showEmailPromptModal('Recuperar senha');
            if (!email) return;

            try {
                showSpinner();
                await resetPassword(email);
                hideSpinner();
                showModal('success', 'E-mail enviado', 'Verifique sua caixa de entrada');
            } catch (err) {
                hideSpinner();
                const code = String(err && err.code || 'ERROR');
                if (code.includes('auth/user-not-found')) {
                    showModal('error', 'E-mail não cadastrado', 'Crie uma conta ou tente outro e-mail');
                } else if (code.includes('too-many-requests')) {
                    showModal('error', 'Limite excedido', 'Tente novamente mais tarde');
                } else {
                    showModal('error', 'Erro de conexão', 'Verifique sua rede e tente novamente');
                }
            }
        });
    }
}

// ====================================================================
// INICIALIZAÇÃO - Aplicar cache e iniciar componentes
// ====================================================================

async function startApp() {
    // Marca como recarregando para manter estado visual
    document.body.classList.add('page-reloading');
    document.body.classList.add('app-loading');

    // Carrega estado do cache e aplica imediatamente
    const cachedState = loadAuthStateFromCache();
    if (cachedState && cachedState.isAuthenticated) {
        updateMenuVisibility({ uid: 'cached' }, cachedState.role);

        // Aplica URL do avatar do cache
        const cachedAvatarUrl = sessionStorage.getItem('avatar_url');
        if (cachedAvatarUrl) {
            const headerAvatar = document.querySelector('.profile-avatar-header .avatar-img');
            if (headerAvatar) headerAvatar.src = cachedAvatarUrl;
        }
    }

    // Inicializa autenticação (Firebase vai sincronizar o estado real)
    await initAuthManager();

    // Obtém rota atual do hash ou usa mainPage como padrão
    let currentRoute = window.location.hash.replace("#", "") || "mainPage";
    if (currentRoute === 'homepage') currentRoute = 'mainPage';

    // Renderiza rota dinâmica
    await renderDynamicRoute(currentRoute);

    // Configura navegação SPA
    setupNavigation();

    // Remove classes de carregamento
    document.body.classList.remove('app-loading');
    setTimeout(() => {
        document.body.classList.remove('page-reloading');
    }, 150);
}

// Renderiza rota dinâmica no main
async function renderDynamicRoute(route) {
    const { renderPages } = await import('./routes/route.js');
    renderPages(route);
}

// Renderiza conteúdo estático da Home no main com transições
async function renderHomepage() {
    const target = document.querySelector('main.app-content');
    if (!target) return;

    // Importa utilitários necessários
    const { setActiveNavItem } = await import('./utils/authManager.js');

    // Transição suave: fade-out
    target.classList.add('fade-out');
    target.style.position = 'relative';
    showSpinner(target);

    setTimeout(() => {
        // Limpa estilos inline que podem conflitar
        target.removeAttribute('style');

        // Remove classes de outras rotas e aplica classe da homepage PRIMEIRO
        target.className = 'app-content main-page-content';

        // Remove assets CSS/JS de páginas dinâmicas anteriores
        removeDynamicPageAssets();

        // Força reflow do navegador para garantir que CSS seja aplicado
        void target.offsetHeight;

        // Agora insere o conteúdo HTML
        target.innerHTML = getHomepageContent();

        // Reinicializa componentes da homepage
        initHomepage();
        initLogin();

        // Transição suave: fade-in
        target.classList.add('fade-in');

        setTimeout(() => {
            target.classList.remove('fade-in');
            hideSpinner();
        }, 200);

        // Atualiza a classe active no menu
        setActiveNavItem('homepage');
    }, 300);
}

// Remove assets CSS/JS de páginas dinâmicas
function removeDynamicPageAssets() {
    const dynamicPages = ['dashboard', 'matches', 'chat', 'profile', 'admin'];
    dynamicPages.forEach(page => {
        const css = document.querySelector(`#${page}-css`);
        if (css) css.remove();
        const js = document.querySelector(`#${page}-js`);
        if (js) js.remove();
    });
}

// Retorna o HTML da homepage
function getHomepageContent() {
    return `
        <section class="section-standings">
            <h2>CLASSIFICAÇÃO GERAL</h2>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th class="numeric">Pts</th>
                            <th class="numeric">PJ</th>
                            <th class="numeric">V</th>
                            <th class="numeric">E</th>
                            <th class="numeric">D</th>
                            <th class="numeric">GM</th>
                            <th class="numeric">GC</th>
                            <th class="numeric">SG</th>
                        </tr>
                    </thead>
                    <tbody id="standings-body"></tbody>
                </table>
            </div>
        </section>

        <section class="section-stats">
            <h3>ESTATÍSTICAS AVANÇADAS</h3>
            <div class="stats-cards">
                <div class="stat-card">
                    <h4>CAMPEÃO ANTERIOR:</h4>
                    <p id="stat-campeao-anterior">-</p>
                </div>
                <div class="stat-card">
                    <h4>MELHOR ATAQUE:</h4>
                    <p id="stat-melhor-ataque">-</p>
                </div>
                <div class="stat-card">
                    <h4>MELHOR DEFESA:</h4>
                    <p id="stat-melhor-defesa">-</p>
                </div>
                <div class="stat-card">
                    <h4>MAIOR GOLEADA:</h4>
                    <p id="stat-maior-goleada">-</p>
                </div>
            </div>
        </section>

        <div class="auth-card">
            <div class="auth-card-title">
                <h2>iCou<span>Football</span></h2>
                <span>Gerencie seu campeonato de futebol.</span>
            </div>

            <div class="auth-toggle">
                <button id="btnToggleLogin" class="toggle-button active">Login</button>
                <button id="btnToggleRegister" class="toggle-button">Criar conta</button>
            </div>

            <form id="loginForm" class="auth-form active">
                <div class="input-group">
                    <label for="loginEmail" class="sr-only">Email</label>
                    <input type="email" id="loginEmail" autocomplete="on" placeholder="Email" required>
                </div>
                <div class="input-group">
                    <label for="loginPassword" class="sr-only">Senha</label>
                    <input type="password" id="loginPassword" placeholder="Senha" required>
                </div>
                <a href="#" class="forgot-password">Esqueceu sua senha?</a>
                <button type="submit" class="btn-primary">ENTRAR</button>
            </form>

            <form id="registerForm" class="auth-form hidden">
                <div class="input-group">
                    <label for="registerUsername" class="sr-only">Nome de Usuário</label>
                    <input type="text" id="registerUsername" placeholder="Nome de Usuário" required>
                </div>
                <div class="input-group">
                    <label for="registerEmail" class="sr-only">Email</label>
                    <input type="email" id="registerEmail" placeholder="Email" required>
                </div>
                <div class="input-group">
                    <label for="registerPassword" class="sr-only">Senha</label>
                    <input type="password" id="registerPassword" placeholder="Senha" required>
                </div>
                <div class="input-group">
                    <label for="confirmPassword" class="sr-only">Confirmar Senha</label>
                    <input type="password" id="confirmPassword" placeholder="Confirmar Senha" required>
                </div>
                <button type="submit" class="btn-primary">REGISTRAR</button>
            </form>
        </div>

        <section class="section-players">
            <h3>PLAYERS EM DESTAQUE</h3>
            <div class="players-grid">
                <article class="player-card">
                    <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%' height='100%' fill='%232980b9'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%23ffffff'>P1</text></svg>"
                        alt="Foto do Jogador 1" class="player-photo">
                    <h4>Jogador 1</h4>
                    <p class="player-team">Time X</p>
                    <div class="player-stars">
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star"></i>
                    </div>
                </article>
                <article class="player-card">
                    <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%' height='100%' fill='%232ecc71'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%23ffffff'>P2</text></svg>"
                        alt="Foto do Jogador 2" class="player-photo">
                    <h4>Jogador 2</h4>
                    <p class="player-team">Time Y</p>
                    <div class="player-stars">
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                    </div>
                </article>
                <article class="player-card">
                    <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%' height='100%' fill='%239b59b6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%23ffffff'>P3</text></svg>"
                        alt="Foto do Jogador 3" class="player-photo">
                    <h4>Jogador 3</h4>
                    <p class="player-team">Time X</p>
                    <div class="player-stars">
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star filled"></i>
                    </div>
                </article>
                <article class="player-card">
                    <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%' height='100%' fill='%23e67e22'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%23ffffff'>P4</text></svg>"
                        alt="Foto do Jogador 4" class="player-photo">
                    <h4>Jogador 4</h4>
                    <p class="player-team">Time Z</p>
                    <div class="player-stars">
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                    </div>
                </article>
            </div>
        </section>
    `;
}

// Configura navegação SPA
function setupNavigation() {
    const nav = document.querySelector('.main-nav');
    if (!nav) return;

    nav.addEventListener('click', async (e) => {
        const link = e.target.closest('a.nav-item');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href || !href.startsWith('#')) return;

        e.preventDefault();
        let route = href.replace('#', '');

        // Converte homepage para mainPage
        if (route === 'homepage') route = 'mainPage';

        // Atualiza hash
        history.pushState({ route }, '', `#${route}`);

        // Renderiza rota dinâmica
        await renderDynamicRoute(route);
    });

    // Escuta mudanças de hash (botão voltar/avançar)
    window.addEventListener('popstate', async (e) => {
        let route = window.location.hash.replace('#', '') || 'mainPage';
        if (route === 'homepage') route = 'mainPage';
        await renderDynamicRoute(route);
    });
}

// Salva snapshot do estado antes de recarregar
window.addEventListener('beforeunload', () => {
    try {
        const currentRoute = window.location.hash.replace("#", "") || "mainPage";
        sessionStorage.setItem('last_route', currentRoute);

        const headerAvatar = document.querySelector('.profile-avatar-header .avatar-img');
        if (headerAvatar && headerAvatar.src && !headerAvatar.src.includes('placeholder')) {
            sessionStorage.setItem('avatar_url', headerAvatar.src);
        }
    } catch (e) {
        // Ignora erros
    }
});

// Escuta evento de renderização da mainPage para inicializar funções
window.addEventListener('mainPageLoaded', async () => {
    await initHomepage();
    initLogin();
});

// Inicia aplicação
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        startApp();
        initThemeManager();
    });
} else {
    startApp();
    initThemeManager();
}
