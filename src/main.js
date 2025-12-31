// main.js - Lógica consolidada da página estática Home + Login
import { login, resetPassword } from "./services/authService.js";
import { registerUser } from "./services/registerService.js";
import { validateRegister } from "./utils/validation.js";
import { showModal, showConfirmModal, showEmailPromptModal } from "./components/modal.js";
import { showSpinner, hideSpinner } from "./components/spinner.js";
import { subscribeToActiveChampionships, subscribeToStandings, subscribeToAnnualStandings, getChampionshipYears, getChampionshipsByYear, subscribeToUserChampionshipStatus } from "./services/standingsService.js";
import { getUserMap } from "./services/usersService.js";
import { initAuthManager, loadAuthStateFromCache, updateMenuVisibility, getCurrentUser } from "./utils/authManager.js";
import { initThemeManager } from "./utils/themeManager.js";
import { onTransmissoesAoVivo, PLATAFORMAS_STREAMING, converterParaEmbed, onUltimasPartidasFinalizadas } from "./services/matchesService.js";
import { initMobileNav, syncMobileNavVisibility, initViewportListener, setActiveMobileNavItem } from "./utils/mobileNav.js";

// ====================================================================
// HOMEPAGE - Classificação e Estatísticas
// ====================================================================

// Constante para limite de exibição na classificação
const MAX_STANDINGS_VISIBLE = 10;

// Variável global para armazenar o ID do usuário atual (para destaque na tabela)
let currentUserId = null;

async function renderTable(ranking, tbodyId = "standings-body", limitResults = true) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    tbody.innerHTML = "";
    
    // Aplica limite de 10 jogadores visíveis para classificação geral (com scroll se mais)
    const displayRanking = limitResults ? ranking : ranking;
    const ids = displayRanking.map(r => r.id);
    const userMap = await getUserMap(ids);

    const fallbackAvatarSvg = "data:image/svg+xml;utf8," + encodeURIComponent(
        "<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28'>" +
        "<circle cx='14' cy='14' r='13' fill='%23606060'/>" +
        "<text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' font-size='11' fill='%23ffffff'>J</text>" +
        "</svg>"
    );

    const fallbackShieldSvg = "data:image/svg+xml;utf8," + encodeURIComponent(
        "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'>" +
        "<rect width='100%' height='100%' rx='4' fill='%23606060'/>" +
        "<text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%23ffffff'>T</text>" +
        "</svg>"
    );

    function resolveTeamName(u) {
        return u?.nomeTime || u?.timeName || u?.timeId || '';
    }

    function resolveTeamLogo(u) {
        return u?.logoTime || u?.timeLogo || '';
    }

    function isProfilePublic(u) {
        // padrão: público
        return u?.perfilPublico !== false;
    }

    let posicao = 0;
    for (const r of displayRanking) {
        posicao++;
        const tr = document.createElement("tr");

        const u = userMap.get(r.id) || {};
        const nome = u.nome || u.email || String(r.id);
        const timeLabel = resolveTeamName(u);
        const teamLogo = resolveTeamLogo(u);
        const canShowPhoto = isProfilePublic(u) && !!u.fotoUrl;

        // Verifica se é o usuário atual para destacar
        const isCurrentUser = currentUserId && r.id === currentUserId;
        if (isCurrentUser) {
            tr.classList.add('row-highlight');
        }

        // === COLUNA: POSIÇÃO ===
        const tdPos = document.createElement("td");
        tdPos.className = "col-pos";
        const posDiv = document.createElement("div");
        posDiv.className = `cell-posicao${posicao <= 3 ? ` pos-${posicao}` : ''}`;
        posDiv.textContent = String(posicao);
        tdPos.appendChild(posDiv);

        // === COLUNA: TIME (separada) ===
        const tdTime = document.createElement("td");
        tdTime.className = "col-time";
        const timeCell = document.createElement("div");
        timeCell.className = "cell-time";

        // Logo do time
        if (teamLogo) {
            const imgShield = document.createElement("img");
            imgShield.className = "time-logo";
            imgShield.alt = "Escudo do time";
            imgShield.src = teamLogo;
            imgShield.onerror = () => { 
                imgShield.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'time-logo-fallback';
                fallback.textContent = 'T';
                timeCell.insertBefore(fallback, timeCell.firstChild);
            };
            timeCell.appendChild(imgShield);
        } else {
            const fallback = document.createElement('div');
            fallback.className = 'time-logo-fallback';
            fallback.textContent = 'T';
            timeCell.appendChild(fallback);
        }

        // Nome do time
        const teamNameSpan = document.createElement('span');
        teamNameSpan.className = 'time-nome';
        teamNameSpan.textContent = timeLabel || 'Sem time';
        teamNameSpan.title = timeLabel || 'Sem time';
        timeCell.appendChild(teamNameSpan);
        tdTime.appendChild(timeCell);

        // === COLUNA: JOGADOR (separada) ===
        const tdJogador = document.createElement("td");
        tdJogador.className = "col-jogador";
        const jogadorCell = document.createElement("div");
        jogadorCell.className = "cell-jogador";

        // Avatar do jogador
        if (canShowPhoto && u.fotoUrl) {
            const imgAvatar = document.createElement('img');
            imgAvatar.className = 'jogador-avatar';
            imgAvatar.alt = 'Foto do jogador';
            imgAvatar.src = u.fotoUrl;
            imgAvatar.onerror = () => { imgAvatar.src = fallbackAvatarSvg; };
            jogadorCell.appendChild(imgAvatar);
        } else {
            const avatarFallback = document.createElement('div');
            avatarFallback.className = 'jogador-avatar-fallback';
            avatarFallback.textContent = nome.charAt(0).toUpperCase();
            jogadorCell.appendChild(avatarFallback);
        }

        // Wrapper para nome + badge (garante espaço reservado)
        const nomeWrapper = document.createElement('div');
        nomeWrapper.className = 'jogador-nome-wrapper';

        // Nome do jogador
        const playerNameSpan = document.createElement('span');
        playerNameSpan.className = 'jogador-nome';
        playerNameSpan.textContent = nome;
        playerNameSpan.title = nome;
        nomeWrapper.appendChild(playerNameSpan);

        // Badge "Você" para o usuário atual (dentro do wrapper)
        if (isCurrentUser) {
            const youBadge = document.createElement('span');
            youBadge.className = 'badge-voce';
            youBadge.textContent = 'Você';
            nomeWrapper.appendChild(youBadge);
        }
        
        jogadorCell.appendChild(nomeWrapper);
        tdJogador.appendChild(jogadorCell);

        // === COLUNAS NUMÉRICAS: Pts, PJ, V, E, D, GM, GC, SG ===
        // Adicionando data-label para responsividade mobile (cards)
        const tdPts = document.createElement("td"); 
        tdPts.className = "col-numeric"; 
        tdPts.setAttribute("data-label", "Pts");
        tdPts.textContent = String(r.P || 0);
        
        const tdPJ = document.createElement("td"); 
        tdPJ.className = "col-numeric"; 
        tdPJ.setAttribute("data-label", "PJ");
        tdPJ.textContent = String((r.V || 0) + (r.E || 0) + (r.D || 0));
        
        const tdV = document.createElement("td"); 
        tdV.className = "col-numeric"; 
        tdV.setAttribute("data-label", "V");
        tdV.textContent = String(r.V || 0);
        
        const tdE = document.createElement("td"); 
        tdE.className = "col-numeric"; 
        tdE.setAttribute("data-label", "E");
        tdE.textContent = String(r.E || 0);
        
        const tdD = document.createElement("td"); 
        tdD.className = "col-numeric"; 
        tdD.setAttribute("data-label", "D");
        tdD.textContent = String(r.D || 0);
        
        const tdGM = document.createElement("td"); 
        tdGM.className = "col-numeric"; 
        tdGM.setAttribute("data-label", "GM");
        tdGM.textContent = String(r.GM || r.GP || 0);
        
        const tdGC = document.createElement("td"); 
        tdGC.className = "col-numeric"; 
        tdGC.setAttribute("data-label", "GC");
        tdGC.textContent = String(r.GC || 0);
        
        const tdSG = document.createElement("td"); 
        tdSG.className = "col-numeric"; 
        tdSG.setAttribute("data-label", "SG");
        tdSG.textContent = String(r.SG || 0);

        // Montar linha com colunas SEPARADAS
        tr.appendChild(tdPos);
        tr.appendChild(tdTime);
        tr.appendChild(tdJogador);
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
    
    // Aplica classe de scroll se houver mais de 10 registros
    const tableContainer = tbody.closest('.table-container');
    if (tableContainer && tbodyId === 'standings-body') {
        if (ranking.length > MAX_STANDINGS_VISIBLE) {
            tableContainer.classList.add('standings-scroll');
        } else {
            tableContainer.classList.remove('standings-scroll');
        }
    }
}

async function renderStats(stats) {
    const elAtk = document.getElementById("stat-melhor-ataque");
    const elDef = document.getElementById("stat-melhor-defesa");
    const elGoleada = document.getElementById("stat-maior-goleada");
    const elPrev = document.getElementById("stat-campeao-anterior");

    // Campeão anterior (último campeão marcado no user)
    if (elPrev) {
        try {
            const { collection, query, where, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
            const { db } = await import('./services/firebase.js');
            const q = query(collection(db, 'users'), where('ultimoCampeao', '==', true), limit(1));
            const snap = await getDocs(q);
            const d = snap.docs[0];
            elPrev.textContent = d ? (d.data().nome || d.id) : '-';
        } catch {
            elPrev.textContent = '-';
        }
    }

    const ids = [];
    if (stats?.bestAttack?.id) ids.push(stats.bestAttack.id);
    if (stats?.bestDefense?.id) ids.push(stats.bestDefense.id);
    if (stats?.biggestWin?.a) ids.push(stats.biggestWin.a);
    if (stats?.biggestWin?.b) ids.push(stats.biggestWin.b);
    const userMap = ids.length ? await getUserMap([...new Set(ids)]) : new Map();

    if (stats.bestAttack && elAtk) {
        const u = userMap.get(stats.bestAttack.id) || {};
        elAtk.textContent = `${u.nome || stats.bestAttack.id} (${stats.bestAttack.val} GP)`;
    }
    if (stats.bestDefense && elDef) {
        const u = userMap.get(stats.bestDefense.id) || {};
        elDef.textContent = `${u.nome || stats.bestDefense.id} (${stats.bestDefense.val} GC)`;
    }
    if (stats.biggestWin && elGoleada) {
        const ua = userMap.get(stats.biggestWin.a) || {};
        const ub = userMap.get(stats.biggestWin.b) || {};
        elGoleada.textContent = `${ua.nome || stats.biggestWin.a} ${stats.biggestWin.ga}x${stats.biggestWin.gb} ${ub.nome || stats.biggestWin.b}`;
    }
}

let unsubscribeAnnual = null;
let unsubscribeChampionship = null;
let unsubscribeActiveCamps = null;
let unsubscribeUserStatus = null;
let unsubscribeLatestResults = null;
let activeCampsCache = [];
let selectedChampionshipId = null;

function clearHomepageListeners() {
    if (unsubscribeAnnual) {
        unsubscribeAnnual();
        unsubscribeAnnual = null;
    }
    if (unsubscribeActiveCamps) {
        unsubscribeActiveCamps();
        unsubscribeActiveCamps = null;
    }
    if (unsubscribeChampionship) {
        unsubscribeChampionship();
        unsubscribeChampionship = null;
    }
    if (unsubscribeUserStatus) {
        unsubscribeUserStatus();
        unsubscribeUserStatus = null;
    }
    if (unsubscribeLatestResults) {
        unsubscribeLatestResults();
        unsubscribeLatestResults = null;
    }
    if (unsubscribeTicker) {
        unsubscribeTicker();
        unsubscribeTicker = null;
    }

    activeCampsCache = [];
    selectedChampionshipId = null;
}

async function initHomepage() {
    clearHomepageListeners();

    // Obtém o usuário atual para destacar na tabela
    const user = getCurrentUser();
    currentUserId = user?.uid || null;

    // 0) Inicializa bloco de status do usuário (apenas se logado)
    initUserStatusBlock(currentUserId);

    // 1) Classificação Geral = ranking anual acumulado
    unsubscribeAnnual = subscribeToAnnualStandings({ year: new Date().getFullYear() }, ({ ranking, stats }) => {
        renderTable(ranking, 'standings-body');
        renderStats(stats);
    });

    // 2) Players em destaque (ticker)
    initPlayersTicker();

    // 3) Tabela de campeonato com seletor de ano
    const sectionChamp = document.getElementById('section-championship-standings');
    const titleChamp = document.getElementById('championship-standings-title');
    const champSelect = document.getElementById('championship-select');
    const yearSelect = document.getElementById('championship-year-select');
    const champControls = document.getElementById('championship-standings-controls');
    const champTbody = document.getElementById('championship-standings-body');
    const champTable = document.getElementById('championship-table');
    const emptyChampState = document.getElementById('empty-championship-state');

    async function renderChampionshipHeader(champ) {
        if (!titleChamp) return;
        const nome = (champ && (champ.nome || champ.id)) ? (champ.nome || champ.id) : '';
        titleChamp.textContent = nome ? `TABELA DO CAMPEONATO — ${nome}` : 'TABELA DO CAMPEONATO';
    }

    function showChampionshipTable() {
        if (champTable) champTable.classList.remove('hidden');
        if (emptyChampState) emptyChampState.classList.add('hidden');
    }

    function hideChampionshipTable() {
        if (champTable) champTable.classList.add('hidden');
        if (emptyChampState) emptyChampState.classList.remove('hidden');
    }

    function bindChampionshipStandings(champId) {
        if (unsubscribeChampionship) {
            unsubscribeChampionship();
            unsubscribeChampionship = null;
        }
        if (!champId) {
            hideChampionshipTable();
            return;
        }
        showChampionshipTable();
        unsubscribeChampionship = subscribeToStandings(champId, ({ ranking }) => {
            renderTable(ranking, 'championship-standings-body');
        });
    }

    function clearChampionshipTable() {
        if (champTbody) champTbody.innerHTML = '';
        if (titleChamp) titleChamp.textContent = 'TABELA DO CAMPEONATO';
        hideChampionshipTable();
    }

    async function loadYearsSelector() {
        if (!yearSelect) return;
        const years = await getChampionshipYears();
        yearSelect.innerHTML = '<option value="">Selecione o ano</option>';
        years.forEach(year => {
            const opt = document.createElement('option');
            opt.value = year;
            opt.textContent = year;
            yearSelect.appendChild(opt);
        });
    }

    async function loadChampionshipsByYear(year) {
        if (!champSelect) return;
        
        // Limpa e desabilita select de campeonatos enquanto carrega
        champSelect.innerHTML = '<option value="">Selecione o campeonato</option>';
        champSelect.disabled = true;
        clearChampionshipTable();
        
        if (!year) {
            return;
        }

        const camps = await getChampionshipsByYear(parseInt(year, 10));
        activeCampsCache = camps;

        if (!camps.length) {
            champSelect.innerHTML = '<option value="">Nenhum campeonato encontrado</option>';
            return;
        }

        champSelect.innerHTML = '<option value="">Selecione o campeonato</option>';
        camps.forEach((c) => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.nome || c.id;
            // Indica o status do campeonato
            if (c.status === 'Ativo') {
                opt.textContent += ' (Ativo)';
            } else if (c.status === 'Finalizado') {
                opt.textContent += ' (Finalizado)';
            }
            champSelect.appendChild(opt);
        });
        champSelect.disabled = false;
    }

    // Inicializa seletores
    if (yearSelect) {
        loadYearsSelector();
        
        yearSelect.onchange = async () => {
            const selectedYear = yearSelect.value;
            selectedChampionshipId = null;
            await loadChampionshipsByYear(selectedYear);
        };
    }

    if (champSelect) {
        champSelect.onchange = () => {
            selectedChampionshipId = champSelect.value;
            if (!selectedChampionshipId) {
                clearChampionshipTable();
                return;
            }
            const selected = activeCampsCache.find((c) => c.id === selectedChampionshipId);
            if (selected) {
                renderChampionshipHeader(selected);
                bindChampionshipStandings(selected.id);
            }
        };
    }

    // Mostra controles sempre (seleção obrigatória de ano)
    if (champControls) {
        champControls.classList.remove('hidden');
    }

    // 4) Bloco de Últimas Partidas
    initLatestResults();
}

let unsubscribeTicker = null;

function buildStarsHtml(estrelas) {
    const n = Math.max(0, Math.min(5, Number(estrelas || 0)));
    let html = '';
    for (let i = 0; i < 5; i++) {
        html += `<i class="fas fa-star${i < n ? ' filled' : ''}"></i>`;
    }
    return html;
}

function initPlayersTicker() {
    const track = document.getElementById('players-ticker-track');
    const viewport = document.getElementById('players-ticker');
    if (!track || !viewport) return;

    if (unsubscribeTicker) {
        unsubscribeTicker();
        unsubscribeTicker = null;
    }

    import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js').then(async ({ collection, query, orderBy, limit, onSnapshot }) => {
        const { db } = await import('./services/firebase.js');
        // Limita a 10 jogadores conforme solicitado (top 10 do ranking)
        const q = query(collection(db, 'users'), orderBy('estrelas', 'desc'), limit(10));
        unsubscribeTicker = onSnapshot(q, (snap) => {
            const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            if (!users.length) {
                track.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--text-color);">Nenhum player em destaque no momento</p>';
                viewport.classList.remove('hidden');
                return;
            }

            viewport.classList.remove('hidden');

            const items = users.map((u, index) => {
                const nome = u.nome || u.email || u.id;
                const time = u.timeName || u.timeId || 'Sem time';
                const foto = u.fotoUrl || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='52' height='52'><rect width='100%' height='100%' fill='%23606060'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='16' fill='%23ffffff'>P</text></svg>";
                const posicao = index + 1; // Posição no ranking (1 a 10)
                return `
                    <div class="players-ticker-item">
                        <span class="players-ticker-rank">#${posicao}</span>
                        <img class="players-ticker-photo" src="${foto}" alt="Foto do player" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2752%27 height=%2752%27><rect width=%27100%25%27 height=%27100%25%27 fill=%27%23606060%27/><text x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 font-size=%2716%27 fill=%27%23ffffff%27>P</text></svg>'">
                        <div class="players-ticker-meta">
                            <div class="players-ticker-name">${nome}</div>
                            <div class="players-ticker-team">${time}</div>
                            <div class="player-stars">${buildStarsHtml(u.estrelas)}</div>
                        </div>
                    </div>
                `;
            });

            // Duplica itens para efeito contínuo
            const html = items.concat(items).join('');
            track.innerHTML = html;

            const duration = Math.max(18, Math.min(60, users.length * 3));
            track.style.animationDuration = `${duration}s`;
        }, (error) => {
            // Tratamento de erro - exibe mensagem amigável
            console.warn('[main] Erro ao carregar players em destaque:', error);
            track.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--text-color);">Erro ao carregar players em destaque</p>';
            viewport.classList.remove('hidden');
        });
    }).catch((e) => {
        console.warn('[main] Falha ao iniciar ticker:', e);
        track.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--text-color);">Não foi possível carregar os players</p>';
        viewport.classList.remove('hidden');
    });
}

// ====================================================================
// BLOCO DE STATUS DO USUÁRIO - Estado em Campeonatos
// ====================================================================

/**
 * Inicializa o bloco de status do usuário na Home Page
 * Mostra se o usuário está participando de campeonato, tem convites pendentes, etc.
 * @param {string|null} userId - ID do usuário atual
 */
function initUserStatusBlock(userId) {
    const section = document.getElementById('section-user-status');
    const card = document.getElementById('user-status-card');
    const iconEl = document.getElementById('user-status-icon');
    const titleEl = document.getElementById('user-status-title');
    const messageEl = document.getElementById('user-status-message');
    const ctaEl = document.getElementById('user-status-cta');

    // Se não está logado, esconde o bloco
    if (!userId || !section) {
        if (section) section.classList.add('hidden');
        return;
    }

    // Mostra o bloco com estado de carregamento
    section.classList.remove('hidden');

    // Cancela listener anterior se existir
    if (unsubscribeUserStatus) {
        unsubscribeUserStatus();
        unsubscribeUserStatus = null;
    }

    // Listener em tempo real para status do usuário
    unsubscribeUserStatus = subscribeToUserChampionshipStatus(userId, (status) => {
        renderUserStatusBlock(status, { section, card, iconEl, titleEl, messageEl, ctaEl });
    });
}

/**
 * Renderiza o bloco de status do usuário baseado no estado atual
 */
function renderUserStatusBlock(status, elements) {
    const { section, card, iconEl, titleEl, messageEl, ctaEl } = elements;
    const { participating, pendingInvites, activeChampionship } = status;

    if (!section || !card) return;

    // Limpa classes anteriores
    card.classList.remove('status-participating', 'status-pending', 'status-none');

    // Prioridade: 1) Convites pendentes, 2) Participando, 3) Sem vínculo
    if (pendingInvites.length > 0) {
        // Usuário tem convites pendentes
        card.classList.add('status-pending');
        
        if (iconEl) iconEl.innerHTML = '<i class="fas fa-envelope-open-text"></i>';
        
        if (pendingInvites.length === 1) {
            const convite = pendingInvites[0];
            if (titleEl) titleEl.textContent = 'Você possui um convite pendente!';
            if (messageEl) messageEl.textContent = `Você foi convidado para participar do campeonato "${convite.nome || 'Sem nome'}".`;
        } else {
            if (titleEl) titleEl.textContent = `Você possui ${pendingInvites.length} convites pendentes!`;
            if (messageEl) messageEl.textContent = 'Verifique suas notificações para aceitar ou recusar os convites.';
        }

        if (ctaEl) {
            ctaEl.innerHTML = `
                <button class="btn-status-cta btn-pending" onclick="document.getElementById('notification-bell')?.click()">
                    <i class="fas fa-bell"></i> Ver Convites
                </button>
            `;
        }

    } else if (participating.length > 0 && activeChampionship) {
        // Usuário está participando de campeonato ativo
        card.classList.add('status-participating');
        
        if (iconEl) iconEl.innerHTML = '<i class="fas fa-trophy"></i>';
        if (titleEl) titleEl.textContent = 'Você está no campeonato!';
        if (messageEl) messageEl.textContent = `Você está participando do campeonato "${activeChampionship.nome || 'Em andamento'}".`;

        if (ctaEl) {
            ctaEl.innerHTML = `
                <a href="#matches" class="btn-status-cta btn-participating">
                    <i class="fas fa-futbol"></i> Ver Partidas
                </a>
            `;
        }

    } else {
        // Usuário não está vinculado a nenhum campeonato
        card.classList.add('status-none');
        
        if (iconEl) iconEl.innerHTML = '<i class="fas fa-gamepad"></i>';
        if (titleEl) titleEl.textContent = 'Nenhum campeonato ativo';
        if (messageEl) messageEl.textContent = 'Você não está participando de nenhum campeonato no momento. Aguarde um convite ou crie uma partida amistosa com seus amigos!';

        if (ctaEl) {
            ctaEl.innerHTML = `
                <a href="#matches" class="btn-status-cta btn-none">
                    <i class="fas fa-plus"></i> Criar Partida
                </a>
            `;
        }
    }
}

// ====================================================================
// BLOCO DE ÚLTIMAS PARTIDAS
// ====================================================================

/**
 * Inicializa o bloco de últimas partidas finalizadas na Home Page
 * Exibe até 4 partidas com placar confirmado
 */
function initLatestResults() {
    const container = document.getElementById('latest-results-container');
    
    if (!container) {
        console.log('[main] Container de últimas partidas não encontrado');
        return;
    }
    
    // Cancela listener anterior se existir
    if (unsubscribeLatestResults) {
        unsubscribeLatestResults();
        unsubscribeLatestResults = null;
    }
    
    // Inicia listener em tempo real (limite de 4 partidas)
    unsubscribeLatestResults = onUltimasPartidasFinalizadas((partidas) => {
        console.log('[main] Últimas partidas atualizadas:', partidas.length);
        
        if (partidas.length === 0) {
            container.innerHTML = renderEmptyLatestResults();
            return;
        }
        
        container.innerHTML = partidas.map(partida => renderLatestResultItem(partida)).join('');
    }, 4);
    
    console.log('[main] Listener de últimas partidas iniciado');
}

/**
 * Renderiza o estado vazio do bloco de últimas partidas
 */
function renderEmptyLatestResults() {
    return `
        <div class="latest-results-empty">
            <i class="fas fa-futbol"></i>
            <p>Nenhuma partida finalizada ainda.<br>Os resultados aparecerão aqui assim que as partidas forem concluídas.</p>
        </div>
    `;
}

/**
 * Renderiza um item de resultado de partida
 * @param {Object} partida - Dados da partida
 * @returns {string} - HTML do item
 */
function renderLatestResultItem(partida) {
    const fallbackShield = "data:image/svg+xml;utf8," + encodeURIComponent(
        "<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36'>" +
        "<rect width='100%' height='100%' rx='50%' fill='%23606060'/>" +
        "<text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' font-size='14' fill='%23ffffff'>T</text>" +
        "</svg>"
    );
    
    const timeALogo = partida.jogadorATimeLogo || fallbackShield;
    const timeBLogo = partida.jogadorBTimeLogo || fallbackShield;
    const timeANome = partida.jogadorATimeNome || 'Time A';
    const timeBNome = partida.jogadorBTimeNome || 'Time B';
    const jogadorANome = partida.jogadorANome || 'Jogador A';
    const jogadorBNome = partida.jogadorBNome || 'Jogador B';
    const placarA = partida.placarA ?? '-';
    const placarB = partida.placarB ?? '-';
    
    // Determina vencedor
    const isVitoriaA = placarA > placarB;
    const isVitoriaB = placarB > placarA;
    
    return `
        <div class="latest-result-item">
            <div class="result-team-a ${isVitoriaA ? 'winner' : ''}">
                <img class="team-logo" src="${timeALogo}" alt="${timeANome}" onerror="this.src='${fallbackShield}'">
                <div class="team-info">
                    <span class="team-name">${timeANome}</span>
                    <span class="player-name">${jogadorANome}</span>
                </div>
            </div>
            <div class="result-score">
                <span class="score">${placarA}</span>
                <span class="score-separator">x</span>
                <span class="score">${placarB}</span>
            </div>
            <div class="result-team-b ${isVitoriaB ? 'winner' : ''}">
                <img class="team-logo" src="${timeBLogo}" alt="${timeBNome}" onerror="this.src='${fallbackShield}'">
                <div class="team-info">
                    <span class="team-name">${timeBNome}</span>
                    <span class="player-name">${jogadorBNome}</span>
                </div>
            </div>
        </div>
    `;
}

// ====================================================================
// RF12: BLOCO AO VIVO - Transmissões em Tempo Real
// ====================================================================

let unsubscribeTransmissoes = null;

/**
 * Inicializa o bloco de transmissões ao vivo na Home Page
 * RF12: Exibe partidas com transmissão ativa em tempo real
 */
function initLiveStreams() {
    const container = document.getElementById('live-streams-container');
    const sectionLive = document.getElementById('section-live');
    
    if (!container) {
        console.log('[main] Container de transmissões não encontrado');
        return;
    }
    
    // Cancela listener anterior se existir
    if (unsubscribeTransmissoes) {
        unsubscribeTransmissoes();
    }
    
    // Inicia listener em tempo real
    unsubscribeTransmissoes = onTransmissoesAoVivo((transmissoes) => {
        console.log('[main] Transmissões ao vivo atualizadas:', transmissoes.length);
        
        if (transmissoes.length === 0) {
            container.innerHTML = renderEmptyLiveStreams();
            return;
        }
        
        // Mostra a seção
        // sectionLive.style.display = 'block';
        
        container.innerHTML = transmissoes.map(stream => renderLiveStreamItem(stream)).join('');
        
        // Adiciona event listeners para abrir modal
        container.querySelectorAll('.live-stream-item').forEach(item => {
            item.addEventListener('click', () => abrirModalTransmissao(item.dataset.partidaId));
        });
    });
    
    console.log('[main] Listener de transmissões ao vivo iniciado');
}

/**
 * Renderiza o estado vazio didático para transmissões ao vivo
 * Explica o que são transmissões e como criar uma
 */
function renderEmptyLiveStreams() {
    const isLoggedIn = !!currentUserId;
    
    return `
        <div class="empty-state-live">
            <div class="empty-state-icon">
                <i class="fas fa-broadcast-tower"></i>
            </div>
            <div class="empty-state-content">
                <h4>Nenhuma transmissão ao vivo</h4>
                <p class="empty-state-description">
                    Aqui você pode assistir partidas ao vivo transmitidas pelos jogadores. 
                    As transmissões aparecem automaticamente quando um jogador inicia uma partida com link de streaming.
                </p>
                ${isLoggedIn ? `
                    <div class="empty-state-tip">
                        <i class="fas fa-lightbulb"></i>
                        <span>Dica: Ao criar uma partida, adicione um link de transmissão (YouTube, Twitch, Kick) para aparecer aqui!</span>
                    </div>
                    <a href="#matches" class="btn-empty-state">
                        <i class="fas fa-plus"></i> Criar Partida com Transmissão
                    </a>
                ` : `
                    <div class="empty-state-tip">
                        <i class="fas fa-info-circle"></i>
                        <span>Faça login para criar partidas e transmitir ao vivo!</span>
                    </div>
                `}
            </div>
        </div>
    `;
}

/**
 * Renderiza um item de transmissão ao vivo
 */
function renderLiveStreamItem(stream) {
    const plataforma = stream.plataformaStreaming || 'youtube';
    const plataformaInfo = PLATAFORMAS_STREAMING[plataforma] || {};
    const horaInicio = stream.dataInicio?.toDate ? 
        stream.dataInicio.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 
        '--:--';
    
    // Gera thumbnail do YouTube se disponível
    const thumbnailUrl = getThumbnailUrl(plataforma, stream.linkTransmissao);
    
    return `
        <div class="live-stream-item" data-partida-id="${stream.id}" data-embed="${stream.linkEmbed || ''}" data-link="${stream.linkTransmissao || ''}">
            <div class="stream-thumbnail">
                ${thumbnailUrl ? `
                    <img src="${thumbnailUrl}" alt="Transmissão" class="stream-thumbnail-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="stream-thumbnail-placeholder" style="display: none;">
                        <i class="fas fa-video"></i>
                        <span>Transmissão ao vivo</span>
                    </div>
                ` : `
                    <div class="stream-thumbnail-placeholder">
                        <i class="fas fa-video"></i>
                        <span>Transmissão ao vivo</span>
                    </div>
                `}
                <span class="live-badge"><i class="fas fa-circle"></i> AO VIVO</span>
                <div class="stream-play-overlay">
                    <i class="fas fa-play"></i>
                </div>
            </div>
            <div class="stream-match-info">
                <span class="stream-teams">${stream.jogadorATimeNome} <span class="vs-separator">vs</span> ${stream.jogadorBTimeNome}</span>
                <div class="stream-meta">
                    <span class="stream-time"><i class="fas fa-clock"></i> Iniciou às ${horaInicio}</span>
                    <div class="stream-platform ${plataforma}">
                        <i class="${plataformaInfo.icone || 'fas fa-play'}"></i>
                        <span>${plataformaInfo.nome || 'Streaming'}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Obtém URL da miniatura baseada na plataforma
 */
function getThumbnailUrl(plataforma, link) {
    if (!link) return null;
    
    try {
        if (plataforma === 'youtube') {
            // Extrai o ID do vídeo do YouTube
            const videoId = extractYouTubeId(link);
            if (videoId) {
                return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }
        } else if (plataforma === 'twitch') {
            // Para Twitch, retorna um placeholder genérico
            // (Twitch requer API para thumbnails de streams ao vivo)
            return null;
        }
    } catch (e) {
        console.warn('[main] Erro ao gerar thumbnail:', e);
    }
    
    return null;
}

/**
 * Extrai o ID do vídeo do YouTube
 */
function extractYouTubeId(url) {
    if (!url) return null;
    
    // Padrões de URL do YouTube
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([^&?\s]+)/i,
        /youtube\.com\/shorts\/([^&?\s]+)/i
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    
    return null;
}

/**
 * Abre modal com player de transmissão
 */
function abrirModalTransmissao(partidaId) {
    const item = document.querySelector(`[data-partida-id="${partidaId}"]`);
    if (!item) return;
    
    const modal = document.getElementById('modalTransmissao');
    const playerContainer = document.getElementById('streamPlayerContainer');
    const title = document.getElementById('streamMatchTitle');
    const info = document.getElementById('streamMatchInfo');
    const externalLink = document.getElementById('streamExternalLink');
    
    if (!modal || !playerContainer) return;
    
    const embedUrl = item.dataset.embed;
    const originalUrl = item.dataset.link;
    const teams = item.querySelector('.stream-teams')?.textContent || 'Transmissão';
    const platformSpan = item.querySelector('.stream-platform span')?.textContent || 'Plataforma';
    const plataforma = item.querySelector('.stream-platform')?.classList[1] || 'youtube';
    
    // Configura modal
    title.textContent = teams;
    info.textContent = `Transmitido via ${platformSpan}`;
    
    // Gera URL de embed adequada
    let finalEmbedUrl = embedUrl;
    if (!finalEmbedUrl && originalUrl) {
        finalEmbedUrl = converterParaEmbed(plataforma, originalUrl);
    }
    
    // Se tiver embed válido, mostra iframe, senão mostra preview com link
    if (finalEmbedUrl && finalEmbedUrl.includes('/embed/')) {
        playerContainer.innerHTML = `
            <iframe 
                id="streamPlayer"
                src="${finalEmbedUrl}" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen
                onerror="this.parentElement.innerHTML = createFallbackPlayer('${originalUrl}', '${plataforma}');"
            ></iframe>
        `;
    } else {
        // Fallback: mostra preview com botão para abrir externamente
        playerContainer.innerHTML = createFallbackPlayer(originalUrl, plataforma);
    }
    
    // Configura link externo
    if (externalLink && originalUrl) {
        externalLink.href = originalUrl;
        externalLink.querySelector('span').textContent = `Assistir no ${platformSpan}`;
    }
    
    // Abre modal
    modal.classList.remove('hidden');
    
    // Configura fechamento do modal
    const closeBtn = modal.querySelector('[data-close-modal]');
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.classList.add('hidden');
            playerContainer.innerHTML = ''; // Limpa o player
        };
    }
    
    // Fecha ao clicar fora
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            playerContainer.innerHTML = '';
        }
    };
}

/**
 * Cria player de fallback quando embed não é possível
 */
function createFallbackPlayer(url, plataforma) {
    const thumbnailUrl = getThumbnailUrl(plataforma, url);
    const plataformaInfo = PLATAFORMAS_STREAMING[plataforma] || {};
    
    return `
        <div class="fallback-player">
            ${thumbnailUrl ? `<img src="${thumbnailUrl}" alt="Preview" class="fallback-thumbnail">` : ''}
            <div class="fallback-overlay">
                <i class="${plataformaInfo.icone || 'fas fa-play'}" style="font-size: 3em; margin-bottom: 20px; color: ${getPlataformaCor(plataforma)};"></i>
                <p style="font-size: 1.1em; margin-bottom: 20px;">Esta transmissão não pode ser incorporada</p>
                <a href="${url}" target="_blank" class="btn-open-external" style="background: ${getPlataformaCor(plataforma)};">
                    <i class="fas fa-external-link-alt"></i>
                    Abrir no ${plataformaInfo.nome || 'navegador'}
                </a>
            </div>
        </div>
    `;
}

/**
 * Retorna cor da plataforma
 */
function getPlataformaCor(plataforma) {
    const cores = {
        youtube: '#FF0000',
        twitch: '#9146FF',
        facebook: '#1877F2',
        instagram: '#E4405F',
        kick: '#53FC18'
    };
    return cores[plataforma] || 'var(--highlight-color)';
}

/**
 * Limpa listeners ao sair da página
 */
function cleanupLiveStreams() {
    if (unsubscribeTransmissoes) {
        unsubscribeTransmissoes();
        unsubscribeTransmissoes = null;
        console.log('[main] Listener de transmissões cancelado');
    }
}

// ====================================================================
// MODAL DE AUTENTICAÇÃO - Gerencia abertura/fechamento do modal
// ====================================================================

function setupAuthModal() {
    const headerLoginLink = document.getElementById('header-login-link');
    const authModal = document.getElementById('authModal');
    const authModalClose = document.getElementById('authModalClose');

    if (!headerLoginLink) return;

    // Abrir modal ao clicar no link de login
    headerLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (authModal) {
            authModal.classList.remove('hidden');
            // Focar no primeiro input
            setTimeout(() => {
                const loginEmail = document.getElementById('loginEmail');
                if (loginEmail) loginEmail.focus();
            }, 100);
        }
    });

    // Fechar modal pelo botão X
    if (authModalClose) {
        authModalClose.addEventListener('click', () => {
            authModal.classList.add('hidden');
        });
    }

    // Fechar modal ao clicar fora
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                authModal.classList.add('hidden');
            }
        });
    }

    // Fechar modal com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && authModal && !authModal.classList.contains('hidden')) {
            authModal.classList.add('hidden');
        }
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
    const authModal = document.getElementById('authModal');

    // Se elementos não existem, pular (usuário já autenticado)
    if (!btnToggleLogin || !loginForm) return;

    // Configura o modal de autenticação
    setupAuthModal();

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
            
            // Fecha o modal de autenticação se estiver aberto
            if (authModal) {
                authModal.classList.add('hidden');
            }
            
            showModal('success', 'Login efetuado', 'Você está autenticado');
            setTimeout(() => {
                window.location.hash = '#mainPage';
                window.location.reload();
            }, 800);
        } catch (err) {
            hideSpinner();
            
            // Verifica se é usuário inativado
            const errorMessage = err?.message || '';
            if (errorMessage.toLowerCase().includes('inativo') || errorMessage.toLowerCase().includes('disabled')) {
                showModal('error', 'Acesso Bloqueado', 'Sua conta foi inativada. Entre em contato com o administrador do sistema.');
            } else {
                showModal('error', 'Falha no login', 'Verifique suas credenciais');
            }
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

    // Inicializa navegação mobile (menu hambúrguer)
    initMobileNav();
    initViewportListener();

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
            <div class="players-ticker-viewport" id="players-ticker">
                <div class="players-ticker-track" id="players-ticker-track"></div>
            </div>
        </section>
    `;
}

// Configura navegação SPA
function setupNavigation() {
    const nav = document.querySelector('.main-nav');
    const mobileNav = document.getElementById('mobile-nav-menu');
    
    // Handler de navegação
    const handleNavClick = async (e) => {
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
        
        // Sincroniza menu mobile
        syncMobileNavVisibility();
        setActiveMobileNavItem(route);
    };

    // Adiciona listener ao nav desktop
    if (nav) {
        nav.addEventListener('click', handleNavClick);
    }
    
    // Adiciona listener ao nav mobile
    if (mobileNav) {
        mobileNav.addEventListener('click', handleNavClick);
    }

    // Escuta mudanças de hash (botão voltar/avançar)
    window.addEventListener('popstate', async (e) => {
        let route = window.location.hash.replace('#', '') || 'mainPage';
        if (route === 'homepage') route = 'mainPage';
        await renderDynamicRoute(route);
        syncMobileNavVisibility();
        setActiveMobileNavItem(route);
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
    initLiveStreams(); // RF12: Inicializa bloco Ao Vivo
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
