/**
 * teams-service.js
 * Serviço para integração com API-Football (api-sports.io)
 * Funções: busca de times, cache, seleção e atualização de UI
 */

import { db } from "./firebase.js";
import { doc, updateDoc, getDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { showModal } from "../components/modal.js";
import { showSpinner, hideSpinner } from "../components/spinner.js";

// ====================================================================
// CACHE MANAGEMENT (localStorage com TTL de 24h)
// ====================================================================

/**
 * Salva valor no cache com TTL
 * @param {string} key - Chave do cache
 * @param {any} value - Valor a ser armazenado
 * @param {number} ttlSeconds - Tempo de vida em segundos (padrão: 86400 = 24h)
 */
function cacheSet(key, value, ttlSeconds = 86400) {
    try {
        const payload = {
            value,
            expiresAt: Date.now() + (ttlSeconds * 1000)
        };
        localStorage.setItem(key, JSON.stringify(payload));
        console.log(`✅ Cache salvo: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (e) {
        console.warn('⚠️ Erro ao salvar cache:', e);
    }
}

/**
 * Recupera valor do cache se ainda válido
 * @param {string} key - Chave do cache
 * @returns {any|null} Valor do cache ou null se expirado/inexistente
 */
function cacheGet(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;

        const payload = JSON.parse(raw);
        
        // Verifica se expirou
        if (Date.now() > payload.expiresAt) {
            localStorage.removeItem(key);
            console.log(`⏰ Cache expirado: ${key}`);
            return null;
        }

        console.log(`✅ Cache recuperado: ${key}`);
        return payload.value;
    } catch (e) {
        console.warn('⚠️ Erro ao ler cache:', e);
        return null;
    }
}

/**
 * Limpa cache específico ou todos os caches de times
 * @param {string} [key] - Chave específica ou null para limpar todos
 */
export function clearTeamsCache(key = null) {
    if (key) {
        localStorage.removeItem(key);
        console.log(`🗑️ Cache removido: ${key}`);
    } else {
        // Remove todos os caches de times
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith('teams_')) {
                localStorage.removeItem(k);
            }
        });
        console.log('🗑️ Todos os caches de times removidos');
    }
}

// ====================================================================
// API KEY MANAGEMENT
// ====================================================================

/**
 * Obtém API Key da API-Football
 * Prioridade: window.ENV.API_FOOTBALL_KEY → localStorage → api-config.js
 * @returns {string|null} API Key ou null
 */
function getApiKey() {
    // Prioridade 1: window.ENV
    if (window.ENV && window.ENV.API_FOOTBALL_KEY) {
        return window.ENV.API_FOOTBALL_KEY;
    }

    // Prioridade 2: localStorage
    const keyFromStorage = localStorage.getItem('API_FOOTBALL_KEY');
    if (keyFromStorage) {
        return keyFromStorage;
    }

    // Prioridade 3: Tenta importar de api-config.js dinamicamente
    try {
        // Assume que API_CONFIG foi exportado globalmente ou via módulo
        if (window.API_CONFIG && window.API_CONFIG.FOOTBALL_KEY) {
            return window.API_CONFIG.FOOTBALL_KEY;
        }
    } catch (e) {
        console.warn('⚠️ Não foi possível acessar API_CONFIG:', e);
    }

    console.error('❌ API Key não encontrada! Configure em window.ENV.API_FOOTBALL_KEY ou localStorage.');
    return null;
}

// ====================================================================
// API INTEGRATION
// ====================================================================

/**
 * Busca time por nome na API-Football
 * @param {string} name - Nome do time (ex: "Barcelona", "Flamengo")
 * @returns {Promise<Array>} Array de times encontrados [{id, name, logo}]
 */
export async function searchTeamByName(name) {
    const apiKey = getApiKey();
    
    if (!apiKey) {
        throw new Error('API_KEY_MISSING');
    }

    if (!name || name.trim().length === 0) {
        throw new Error('TEAM_NAME_EMPTY');
    }

    const url = `https://v3.football.api-sports.io/teams?name=${encodeURIComponent(name.trim())}`;
    
    console.log(`🔍 Buscando time por nome: "${name}"`);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-apisports-key': apiKey
            }
        });

        // Trata rate limit (429)
        if (response.status === 429) {
            console.warn('⚠️ Rate limit atingido (429)');
            throw { code: 429, message: 'RATE_LIMIT' };
        }

        if (!response.ok) {
            throw new Error(`API retornou status ${response.status}`);
        }

        const data = await response.json();

        if (!data.response || data.response.length === 0) {
            console.warn(`⚠️ Nenhum time encontrado com o nome "${name}"`);
            return [];
        }

        // Mapeia para formato simplificado
        const teams = data.response.map(item => ({
            id: String(item.team.id),
            name: item.team.name,
            logo: item.team.logo || `https://media.api-sports.io/football/teams/${item.team.id}.png`
        }));

        console.log(`✅ ${teams.length} time(s) encontrado(s): ${teams.map(t => t.name).join(', ')}`);

        return teams;

    } catch (error) {
        console.error('❌ Erro ao buscar time por nome:', error);

        if (error.code === 429) {
            throw { code: 'RATE_LIMIT', message: 'Limite de requisições atingido. Aguarde alguns minutos.' };
        }

        throw error;
    }
}

/**
 * Busca times de uma liga específica na API-Football
 * @param {Object} params - Parâmetros da busca
 * @param {number} params.leagueId - ID da liga (ex: 71 = Brasileirão)
 * @param {number} params.season - Temporada (ex: 2024)
 * @returns {Promise<Array>} Array de times [{id, name, logo}]
 */
export async function fetchTeams({ leagueId = 71, season = 2024 } = {}) {
    const apiKey = getApiKey();
    
    if (!apiKey) {
        throw new Error('API_KEY_MISSING');
    }

    // Verifica cache primeiro
    const cacheKey = `teams_${leagueId}_${season}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
        console.log(`📦 Usando cache para liga ${leagueId} temporada ${season}`);
        return cached;
    }

    // Busca da API
    const url = `https://v3.football.api-sports.io/teams?league=${leagueId}&season=${season}`;
    
    console.log(`🌐 Buscando times da API: league=${leagueId}, season=${season}`);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-apisports-key': apiKey
            }
        });

        // Trata rate limit (429)
        if (response.status === 429) {
            console.warn('⚠️ Rate limit atingido (429)');
            throw { code: 429, message: 'RATE_LIMIT' };
        }

        if (!response.ok) {
            throw new Error(`API retornou status ${response.status}`);
        }

        const data = await response.json();

        if (!data.response || data.response.length === 0) {
            console.warn('⚠️ API retornou array vazio');
            return [];
        }

        // Mapeia para formato simplificado
        const teams = data.response.map(item => ({
            id: String(item.team.id),
            name: item.team.name,
            logo: item.team.logo || `https://media.api-sports.io/football/teams/${item.team.id}.png`
        }));

        console.log(`✅ ${teams.length} times carregados da API`);

        // Salva no cache (24h)
        cacheSet(cacheKey, teams, 86400);

        return teams;

    } catch (error) {
        console.error('❌ Erro ao buscar times:', error);

        // Se foi rate limit, tenta usar cache antigo
        if (error.code === 429) {
            const oldCache = localStorage.getItem(cacheKey);
            if (oldCache) {
                try {
                    const parsed = JSON.parse(oldCache);
                    console.log('📦 Usando cache antigo devido ao rate limit');
                    return parsed.value || [];
                } catch (e) {
                    console.error('❌ Cache corrompido');
                }
            }
        }

        throw error;
    }
}

// ====================================================================
// UI MANIPULATION
// ====================================================================

/**
 * Preenche elemento <select> com times da API
 * @param {HTMLSelectElement} selectElement - Elemento <select>
 * @param {Object} params - Parâmetros da liga
 * @param {number} params.leagueId - ID da liga
 * @param {number} params.season - Temporada
 * @param {string} [selectedTeamId] - ID do time atualmente selecionado
 */
export async function loadTeamsIntoSelect(selectElement, { leagueId = 71, season = 2024 } = {}, selectedTeamId = null) {
    if (!selectElement) {
        console.error('❌ Elemento select não encontrado');
        return;
    }

    // Mostra estado de carregamento
    selectElement.innerHTML = '<option value="">Carregando times...</option>';
    selectElement.disabled = true;

    try {
        const teams = await fetchTeams({ leagueId, season });

        if (teams.length === 0) {
            selectElement.innerHTML = '<option value="">Nenhum time disponível</option>';
            selectElement.disabled = true;
            return;
        }

        // Limpa e adiciona opção padrão
        selectElement.innerHTML = '<option value="">Selecione seu time...</option>';

        // Adiciona times ordenados alfabeticamente
        teams.sort((a, b) => a.name.localeCompare(b.name)).forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.name;
            option.dataset.logo = team.logo;

            if (selectedTeamId && team.id === selectedTeamId) {
                option.selected = true;
            }

            selectElement.appendChild(option);
        });

        selectElement.disabled = false;
        console.log(`✅ Seletor preenchido com ${teams.length} times`);

    } catch (error) {
        console.error('❌ Erro ao carregar times no seletor:', error);

        if (error.code === 429) {
            selectElement.innerHTML = '<option value="">Limite de requisições atingido. Aguarde alguns minutos.</option>';
            showModal('warning', 'Limite atingido', 'A API atingiu o limite de requisições. Tente novamente em alguns minutos.');
        } else if (error.message === 'API_KEY_MISSING') {
            selectElement.innerHTML = '<option value="">Configure a API Key</option>';
            showModal('error', 'API Key ausente', 'Configure FOOTBALL_KEY no arquivo api-config.js');
        } else {
            selectElement.innerHTML = '<option value="">Não foi possível carregar os times</option>';
            showModal('error', 'Erro ao carregar times', 'Verifique sua conexão e tente novamente');
        }

        selectElement.disabled = true;
    }
}

/**
 * Atualiza elemento #time-profile-summary com logo e nome do time
 * @param {Object} team - Objeto do time {id, name, logo}
 */
export function updateTimeProfileSummary(team) {
    const container = document.querySelector('#time-profile-summary') || 
                      document.querySelector('.time-profile-summary');

    if (!container) {
        console.warn('⚠️ Elemento #time-profile-summary não encontrado');
        return;
    }

    // Limpa e reconstrói estrutura
    container.innerHTML = '';

    // Cria imagem da logo
    const img = document.createElement('img');
    img.className = 'team-logo profile-thumb';
    img.src = team.logo || `https://media.api-sports.io/football/teams/${team.id}.png`;
    img.alt = `${team.name} escudo`;
    img.style.width = '40px';
    img.style.height = '40px';
    img.style.objectFit = 'contain';

    // Fallback se imagem falhar
    img.onerror = () => {
        img.src = '/assets/img/team-placeholder.svg';
    };

    // Cria span com nome do time
    const nameSpan = document.createElement('span');
    nameSpan.className = 'team-name-display';
    nameSpan.textContent = team.name;
    nameSpan.style.marginLeft = '10px';
    nameSpan.style.fontWeight = '600';

    container.appendChild(img);
    container.appendChild(nameSpan);

    console.log(`✅ UI atualizado com time: ${team.name}`);
}

// ====================================================================
// FIRESTORE INTEGRATION
// ====================================================================

/**
 * Verifica se o usuário pode alterar o time (limitação de 2h)
 * @param {string} userId - ID do usuário
 * @returns {Promise<{allowed: boolean, remainingTime?: number}>} Se permitido e tempo restante em ms
 */
export async function canChangeTeam(userId) {
    if (!userId) {
        throw new Error('userId é obrigatório');
    }

    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // Usuário novo, pode alterar
            return { allowed: true };
        }

        const userData = userSnap.data();
        const lastChange = userData.lastTeamChange;

        if (!lastChange) {
            // Nunca alterou, pode alterar
            return { allowed: true };
        }

        // Converte Timestamp do Firestore para Date
        const lastChangeDate = lastChange.toDate ? lastChange.toDate() : new Date(lastChange);
        const now = new Date();
        const TWO_HOURS_MS = 2 * 60 * 60 * 1000; // 2 horas em milissegundos
        const timeSinceLastChange = now - lastChangeDate;

        if (timeSinceLastChange < TWO_HOURS_MS) {
            const remainingMs = TWO_HOURS_MS - timeSinceLastChange;
            const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
            
            console.warn(`⚠️ Usuário tentou alterar time antes de 2h. Restam ${remainingMinutes} minutos.`);
            
            return { 
                allowed: false, 
                remainingTime: remainingMs,
                remainingMinutes 
            };
        }

        // Passou 2h, pode alterar
        return { allowed: true };

    } catch (error) {
        console.error('❌ Erro ao verificar permissão de alteração:', error);
        throw error;
    }
}

/**
 * Salva time selecionado no Firestore e atualiza UI
 * @param {string} userId - ID do usuário
 * @param {string} teamId - ID do time selecionado
 * @returns {Promise<Object>} Objeto do time salvo
 */
export async function handleTeamSelection(userId, teamId) {
    if (!userId || !teamId) {
        throw new Error('userId e teamId são obrigatórios');
    }

    showSpinner();

    try {
        // Busca dados do time (do cache ou API)
        const teams = await fetchTeams({ leagueId: 71, season: 2024 });
        const selectedTeam = teams.find(t => t.id === teamId);

        if (!selectedTeam) {
            throw new Error('Time não encontrado');
        }

        // Atualiza Firestore
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            timeId: teamId
        });

        console.log(`✅ Time salvo no Firestore: ${selectedTeam.name} (ID: ${teamId})`);

        // Atualiza UI
        updateTimeProfileSummary(selectedTeam);

        hideSpinner();

        // Feedback visual simples
        showModal('success', 'Time salvo!', `${selectedTeam.name} foi definido como seu time`);

        return selectedTeam;

    } catch (error) {
        hideSpinner();
        console.error('❌ Erro ao salvar time:', error);

        // Trata erros de permissão do Firestore
        if (error.code === 'permission-denied') {
            showModal('error', 'Permissão negada', 'Você não tem permissão para atualizar este perfil');
        } else {
            showModal('error', 'Erro ao salvar', 'Não foi possível salvar seu time. Tente novamente.');
        }

        throw error;
    }
}

/**
 * Salva time (nome e logo) no Firestore com validação de 2h
 * @param {string} userId - ID do usuário
 * @param {Object} teamData - Dados do time {id, name, logo}
 * @returns {Promise<Object>} Objeto do time salvo
 */
export async function saveUserTeam(userId, teamData, skipValidation = false) {
    if (!userId || !teamData) {
        throw new Error('userId e teamData são obrigatórios');
    }

    if (!teamData.name || !teamData.logo) {
        throw new Error('teamData deve conter name e logo');
    }

    // Verifica se pode alterar (2h) apenas se não pular validação
    if (!skipValidation) {
        const permission = await canChangeTeam(userId);
        
        if (!permission.allowed) {
            const hours = Math.floor(permission.remainingMinutes / 60);
            const minutes = permission.remainingMinutes % 60;
            const timeText = hours > 0 
                ? `${hours}h ${minutes}min` 
                : `${minutes} minutos`;
            
            throw {
                code: 'TIME_LIMIT',
                message: `Você só pode alterar seu time 1 vez a cada 2 horas. Aguarde ${timeText}.`,
                remainingTime: permission.remainingTime
            };
        }
    }

    showSpinner();

    try {
        // Atualiza Firestore com timeName, timeLogo e timestamp
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            timeName: teamData.name,
            timeLogo: teamData.logo,
            lastTeamChange: Timestamp.now()
        });

        console.log(`✅ Time salvo: ${teamData.name} (lastTeamChange atualizado)`);

        // Atualiza UI
        updateTimeProfileSummary(teamData);

        hideSpinner();

        // Feedback visual
        showModal('success', 'Time atualizado com sucesso', teamData.name);

        return teamData;

    } catch (error) {
        hideSpinner();
        console.error('❌ Erro ao salvar time:', error);

        // Trata erros de permissão do Firestore
        if (error.code === 'permission-denied') {
            showModal('error', 'Permissão negada', 'Você não tem permissão para atualizar este perfil');
        } else if (error.code !== 'TIME_LIMIT') {
            showModal('error', 'Erro ao salvar', 'Não foi possível salvar seu time. Tente novamente.');
        }

        throw error;
    }
}

// ====================================================================
// DASHBOARD INTEGRATION
// ====================================================================

/**
 * Inicializa seletor de time no Dashboard (clique na logo)
 * @param {HTMLElement} selectorElement - Elemento clicável (logo do time)
 * @param {string} userId - ID do usuário logado
 * @param {Object} params - Parâmetros da liga
 */
export function initDashboardTeamSelector(selectorElement, userId, { leagueId = 71, season = 2024 } = {}) {
    if (!selectorElement) {
        console.warn('⚠️ Elemento seletor do Dashboard não encontrado');
        return;
    }

    selectorElement.style.cursor = 'pointer';
    selectorElement.title = 'Clique para alterar seu time';

    selectorElement.addEventListener('click', async () => {
        // Cria modal com seletor
        const modal = createTeamSelectorModal(userId, { leagueId, season });
        document.body.appendChild(modal);
    });

    console.log('✅ Seletor de time do Dashboard inicializado');
}

/**
 * Cria modal com seletor de times
 * @param {string} userId - ID do usuário
 * @param {Object} params - Parâmetros da liga
 * @returns {HTMLElement} Elemento do modal
 */
function createTeamSelectorModal(userId, { leagueId, season }) {
    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    // Modal
    const modal = document.createElement('div');
    modal.className = 'modal team-selector-modal';
    modal.style.cssText = `
        background: var(--secondary-bg, #2c2c2c);
        padding: 30px;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    `;

    // Título
    const title = document.createElement('h3');
    title.textContent = 'Selecione seu time';
    title.style.cssText = `
        margin-bottom: 20px;
        color: var(--text-color, #fff);
        font-size: 1.4em;
    `;

    // Select
    const select = document.createElement('select');
    select.id = 'dashboard-team-select';
    select.setAttribute('aria-label', 'Selecione seu time');
    select.style.cssText = `
        width: 100%;
        padding: 12px;
        font-size: 16px;
        border-radius: 8px;
        border: 2px solid var(--highlight-color, #FD8A24);
        background: var(--primary-bg, #1a1a1a);
        color: var(--text-color, #fff);
        margin-bottom: 20px;
    `;

    // Botões
    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;';

    const btnCancel = document.createElement('button');
    btnCancel.textContent = 'Cancelar';
    btnCancel.className = 'modal-btn';
    btnCancel.style.cssText = 'padding: 10px 20px; cursor: pointer;';

    const btnSave = document.createElement('button');
    btnSave.textContent = 'Salvar';
    btnSave.className = 'modal-btn';
    btnSave.style.cssText = `
        padding: 10px 20px;
        background: var(--highlight-color, #FD8A24);
        color: #fff;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
    `;

    // Monta estrutura
    actions.appendChild(btnCancel);
    actions.appendChild(btnSave);
    modal.appendChild(title);
    modal.appendChild(select);
    modal.appendChild(actions);
    overlay.appendChild(modal);

    // Carrega times
    loadTeamsIntoSelect(select, { leagueId, season });

    // Eventos
    btnCancel.onclick = () => overlay.remove();

    btnSave.onclick = async () => {
        const teamId = select.value;
        if (!teamId) {
            showModal('warning', 'Selecione um time', 'Escolha um time antes de salvar');
            return;
        }

        try {
            await handleTeamSelection(userId, teamId);
            overlay.remove();
        } catch (error) {
            console.error('Erro ao salvar time:', error);
        }
    };

    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };

    return overlay;
}
