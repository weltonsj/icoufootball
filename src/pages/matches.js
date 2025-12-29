/**
 * matches.js
 * Página de Partidas do iCouFootball
 * Implementa RF11 (Criação de Partidas), RF5 (Fair Play) conforme PRD v2.0
 */

import { 
    criarPartida, 
    inserirResultado, 
    confirmarResultado, 
    contestarResultado,
    getPartidasAguardandoResultado,
    getPartidasPendentesConfirmacao,
    getPartidasAguardandoAdversario,
    getPartidasContestadas,
    getPartidasConfirmadas,
    PLATAFORMAS_STREAMING,
    validarUrlTransmissao,
    iniciarTransmissao,
    atualizarLinkTransmissao,
    getPartida
} from '../services/matchesService.js';
import { getFriendsList } from '../services/friendsService.js';
import { subscribeToAnnualStandings } from '../services/standingsService.js';
import { auth } from '../services/firebase.js';
import { getDoc, doc, collection, query, where, getDocs, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';
import { db } from '../services/firebase.js';
import { showModal, showConfirmModal } from '../components/modal.js';

// Estado local do módulo
let currentUser = null;
let currentUserData = null;
let friendsList = [];

// Estado dos filtros
let filtrosAtivos = {
    tipo: 'todas',
    status: 'todas',
    data: 'todas',
    adversario: ''
};

// Cache de partidas para filtros
let partidasCache = {
    aguardandoResultado: [],
    pendentesConfirmacao: [],
    aguardandoAdversario: [],
    contestadas: [],
    confirmadas: []
};

// Cache de dados de adversários (ranking, estrelas, forma)
let adversariosCache = {};

export const matches = {
    name: "matches",
    className: "matches-content",
    content: `
        <!-- Toast Container para Feedback Fair Play -->
        <div id="fairplayToastContainer" class="fairplay-toast-container"></div>

        <!-- Seção: Filtros de Partidas -->
        <section class="section-filters card-section">
            <h2><i class="fas fa-filter"></i> Filtrar Partidas</h2>
            
            <div class="filters-bar">
                <div class="filter-group">
                    <label for="filterTipo">Tipo</label>
                    <select id="filterTipo" class="filter-select">
                        <option value="todas">Todas</option>
                        <option value="campeonato">Campeonato</option>
                        <option value="amistoso">Amistoso</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="filterStatus">Status</label>
                    <select id="filterStatus" class="filter-select">
                        <option value="todas">Todos</option>
                        <option value="aguardando">Aguardando Resultado</option>
                        <option value="pendente">Pendente Confirmação</option>
                        <option value="confirmado">Confirmada</option>
                        <option value="contestado">Contestada</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="filterData">Período</label>
                    <select id="filterData" class="filter-select">
                        <option value="todas">Todas</option>
                        <option value="hoje">Hoje</option>
                        <option value="semana">Última Semana</option>
                        <option value="mes">Último Mês</option>
                    </select>
                </div>
                
                <div class="filter-group filter-group-search">
                    <label for="filterAdversario">Adversário</label>
                    <input type="text" id="filterAdversario" class="filter-input" placeholder="Nome do adversário...">
                </div>
                
                <button type="button" id="btnLimparFiltros" class="btn-clear-filters">
                    <i class="fas fa-times"></i> Limpar
                </button>
            </div>
            
            <div id="filtrosAtivos" class="filtros-ativos-container hidden">
                <span class="filtros-ativos-label"><i class="fas fa-check-circle"></i> Filtros aplicados:</span>
                <div id="filtrosAtivosTags" class="filtros-ativos-tags"></div>
            </div>
        </section>

        <!-- Seção: Criar Nova Partida -->
        <section class="section-create-match card-section">
            <h2><i class="fas fa-plus-circle"></i> Criar Nova Partida</h2>
            
            <form id="createMatchForm" class="create-match-form">
                <div class="form-row">
                    <div class="input-group">
                        <label for="friendSelect">Selecione o Adversário</label>
                        <select id="friendSelect" required>
                            <option value="" disabled selected>Carregando amigos...</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-row streaming-row">
                    <div class="input-group platform-group">
                        <label for="platformSelect">Plataforma de Streaming</label>
                        <select id="platformSelect">
                            <option value="">Sem transmissão</option>
                            <option value="youtube"><i class="fab fa-youtube"></i> YouTube</option>
                            <option value="twitch"><i class="fab fa-twitch"></i> Twitch</option>
                            <option value="kick">Kick</option>
                            <option value="facebook"><i class="fab fa-facebook"></i> Facebook Gaming</option>
                        </select>
                    </div>
                    
                    <div class="input-group url-group">
                        <label for="streamUrlInput">URL da Transmissão</label>
                        <input type="url" id="streamUrlInput" placeholder="Cole o link da transmissão" disabled>
                        <span class="url-validation-icon"></span>
                    </div>
                </div>
                
                <button type="submit" class="btn-primary btn-create-match">
                    <i class="fas fa-gamepad"></i> CRIAR PARTIDA
                </button>
            </form>
        </section>

        <!-- Seção: Inserir Resultado -->
        <section class="section-insert-result card-section">
            <h2><i class="fas fa-edit"></i> Inserir Resultado</h2>
            <p class="section-subtitle">Partidas aguardando você inserir o placar</p>
            
            <div id="matchesAguardandoResultado" class="match-list">
                <div class="loading-placeholder">
                    <i class="fas fa-spinner fa-spin"></i> Carregando partidas...
                </div>
            </div>
        </section>

        <!-- Seção: Partidas Pendentes Fair Play -->
        <section class="section-pending-fairplay card-section">
            <h2><i class="fas fa-balance-scale"></i> Confirmar Resultados (Fair Play)</h2>
            <p class="section-subtitle">Partidas aguardando sua confirmação</p>
            
            <div id="matchesPendentesConfirmacao" class="match-list">
                <div class="loading-placeholder">
                    <i class="fas fa-spinner fa-spin"></i> Carregando partidas...
                </div>
            </div>
        </section>

        <!-- Seção: Aguardando Adversário -->
        <section class="section-awaiting-opponent card-section">
            <h2><i class="fas fa-clock"></i> Aguardando Adversário</h2>
            <p class="section-subtitle">Você inseriu o placar, aguardando confirmação</p>
            
            <div id="matchesAguardandoAdversario" class="match-list">
                <div class="loading-placeholder">
                    <i class="fas fa-spinner fa-spin"></i> Carregando partidas...
                </div>
            </div>
        </section>

        <!-- Seção: Partidas Contestadas -->
        <section class="section-contested card-section">
            <h2><i class="fas fa-exclamation-triangle"></i> Partidas Contestadas</h2>
            <p class="section-subtitle">Aguardando resolução do administrador</p>
            
            <div id="matchesContestadas" class="match-list">
                <div class="loading-placeholder">
                    <i class="fas fa-spinner fa-spin"></i> Carregando partidas...
                </div>
            </div>
        </section>

        <!-- Seção: Histórico de Partidas Confirmadas -->
        <section class="section-confirmed card-section">
            <h2><i class="fas fa-check-circle"></i> Partidas Confirmadas</h2>
            <p class="section-subtitle">Histórico de partidas finalizadas</p>
            
            <div id="matchesConfirmadas" class="match-list">
                <div class="loading-placeholder">
                    <i class="fas fa-spinner fa-spin"></i> Carregando partidas...
                </div>
            </div>
        </section>

        <!-- Modal: Inserir Placar -->
        <div id="modalInserirPlacar" class="modal-overlay hidden">
            <div class="modal-content modal-small">
                <button class="modal-close" data-close-modal>&times;</button>
                <h3><i class="fas fa-futbol"></i> Inserir Placar</h3>
                
                <form id="formInserirPlacar">
                    <input type="hidden" id="partidaIdPlacar">
                    
                    <div class="placar-display">
                        <div class="team-placar">
                            <span id="timeANomePlacar" class="team-name">Time A</span>
                            <input type="number" id="placarA" min="0" value="0" class="placar-input" required>
                        </div>
                        <span class="placar-x">X</span>
                        <div class="team-placar">
                            <span id="timeBNomePlacar" class="team-name">Time B</span>
                            <input type="number" id="placarB" min="0" value="0" class="placar-input" required>
                        </div>
                    </div>
                    
                    <button type="submit" class="btn-primary btn-full-width">
                        <i class="fas fa-paper-plane"></i> ENVIAR PLACAR
                    </button>
                </form>
            </div>
        </div>

        <!-- Modal: Contestar Placar -->
        <div id="modalContestar" class="modal-overlay hidden">
            <div class="modal-content modal-small">
                <button class="modal-close" data-close-modal>&times;</button>
                <h3><i class="fas fa-exclamation-circle"></i> Contestar Placar</h3>
                
                <form id="formContestar">
                    <input type="hidden" id="partidaIdContestar">
                    
                    <div class="placar-info-contestar">
                        <p>Placar informado: <strong id="placarContestarInfo">0 x 0</strong></p>
                    </div>
                    
                    <div class="input-group">
                        <label for="motivoContestacao">Motivo da Contestação</label>
                        <textarea id="motivoContestacao" rows="3" placeholder="Descreva o motivo..." required></textarea>
                    </div>
                    
                    <button type="submit" class="btn-danger btn-full-width">
                        <i class="fas fa-times"></i> CONTESTAR PLACAR
                    </button>
                </form>
            </div>
        </div>
    `
};

/**
 * Inicializa a página de partidas
 */
export async function initMatchesPage() {
    console.log('[matches] Inicializando página de partidas...');
    
    currentUser = auth.currentUser;
    
    if (!currentUser) {
        console.warn('[matches] Usuário não autenticado');
        return;
    }
    
    // Busca dados do usuário atual
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            currentUserData = userDoc.data();
        }
    } catch (error) {
        console.error('[matches] Erro ao buscar dados do usuário:', error);
    }
    
    // Inicializa componentes
    await carregarAmigos();
    setupEventListeners();
    await carregarTodasPartidas();
}

/**
 * Carrega lista de amigos para o dropdown
 */
async function carregarAmigos() {
    const friendSelect = document.getElementById('friendSelect');
    if (!friendSelect || !currentUser) return;
    
    try {
        friendsList = await getFriendsList(currentUser.uid);
        
        friendSelect.innerHTML = '';
        
        if (friendsList.length === 0) {
            friendSelect.innerHTML = '<option value="" disabled selected>Você ainda não tem amigos</option>';
            return;
        }
        
        friendSelect.innerHTML = '<option value="" disabled selected>Selecione um amigo</option>';
        
        friendsList.forEach(friend => {
            const option = document.createElement('option');
            option.value = friend.id;
            option.textContent = `${friend.nome} (${friend.nomeTime || 'Sem time'})`;
            option.dataset.nome = friend.nome;
            option.dataset.nomeTime = friend.nomeTime || 'Sem time';
            option.dataset.logoTime = friend.logoTime || '';
            friendSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('[matches] Erro ao carregar amigos:', error);
        friendSelect.innerHTML = '<option value="" disabled selected>Erro ao carregar amigos</option>';
    }
}

/**
 * Configura event listeners
 */
function setupEventListeners() {
    // Formulário de criar partida
    const createMatchForm = document.getElementById('createMatchForm');
    if (createMatchForm) {
        createMatchForm.addEventListener('submit', handleCriarPartida);
    }
    
    // === Filtros ===
    setupFiltrosListeners();
    
    // Seletor de plataforma - habilita/desabilita input de URL
    const platformSelect = document.getElementById('platformSelect');
    const streamUrlInput = document.getElementById('streamUrlInput');
    
    if (platformSelect && streamUrlInput) {
        platformSelect.addEventListener('change', (e) => {
            const plataforma = e.target.value;
            
            if (plataforma) {
                streamUrlInput.disabled = false;
                streamUrlInput.placeholder = `Cole o link do ${PLATAFORMAS_STREAMING[plataforma]?.nome || 'streaming'}`;
            } else {
                streamUrlInput.disabled = true;
                streamUrlInput.value = '';
                streamUrlInput.placeholder = 'Selecione uma plataforma primeiro';
            }
            
            // Limpa validação
            streamUrlInput.classList.remove('valid', 'invalid');
            const icon = streamUrlInput.parentElement.querySelector('.url-validation-icon');
            if (icon) icon.innerHTML = '';
        });
        
        // Validação de URL em tempo real
        streamUrlInput.addEventListener('input', (e) => {
            const plataforma = platformSelect.value;
            const url = e.target.value;
            const icon = streamUrlInput.parentElement.querySelector('.url-validation-icon');
            
            if (!url) {
                streamUrlInput.classList.remove('valid', 'invalid');
                if (icon) icon.innerHTML = '';
                return;
            }
            
            if (validarUrlTransmissao(plataforma, url)) {
                streamUrlInput.classList.remove('invalid');
                streamUrlInput.classList.add('valid');
                if (icon) icon.innerHTML = '<i class="fas fa-check-circle" style="color: #27ae60;"></i>';
            } else {
                streamUrlInput.classList.remove('valid');
                streamUrlInput.classList.add('invalid');
                if (icon) icon.innerHTML = '<i class="fas fa-times-circle" style="color: #e74c3c;"></i>';
            }
        });
    }
    
    // Formulário de inserir placar
    const formInserirPlacar = document.getElementById('formInserirPlacar');
    if (formInserirPlacar) {
        formInserirPlacar.addEventListener('submit', handleInserirPlacar);
    }
    
    // Formulário de contestar
    const formContestar = document.getElementById('formContestar');
    if (formContestar) {
        formContestar.addEventListener('submit', handleContestar);
    }
    
    // Botões de fechar modal
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.classList.add('hidden');
            });
        });
    });
    
    // Fechar modal ao clicar fora
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
}

/**
 * Handler para criar partida
 */
async function handleCriarPartida(e) {
    e.preventDefault();
    
    const friendSelect = document.getElementById('friendSelect');
    const platformSelect = document.getElementById('platformSelect');
    const streamUrlInput = document.getElementById('streamUrlInput');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    const adversarioId = friendSelect.value;
    const selectedOption = friendSelect.selectedOptions[0];
    
    if (!adversarioId) {
        showModal('warning', 'Atenção', 'Selecione um amigo para criar a partida');
        return;
    }
    
    const plataforma = platformSelect.value || null;
    const linkTransmissao = streamUrlInput.value || null;
    
    // Valida URL se fornecida
    if (linkTransmissao && plataforma) {
        if (!validarUrlTransmissao(plataforma, linkTransmissao)) {
            showModal('error', 'URL Inválida', 'URL de transmissão inválida para a plataforma selecionada');
            return;
        }
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';
    
    try {
        await criarPartida({
            criadorId: currentUser.uid,
            criadorNome: currentUserData?.nome || currentUser.displayName || 'Jogador',
            criadorTimeNome: currentUserData?.nomeTime || currentUserData?.timeName || 'Sem time',
            criadorTimeLogo: currentUserData?.logoTime || currentUserData?.timeLogo || '',
            adversarioId: adversarioId,
            adversarioNome: selectedOption.dataset.nome,
            adversarioTimeNome: selectedOption.dataset.nomeTime,
            adversarioTimeLogo: selectedOption.dataset.logoTime,
            plataformaStreaming: plataforma,
            linkTransmissao: linkTransmissao,
            oficial: true
        });
        
        showModal('success', 'Sucesso!', 'Partida criada com sucesso!');
        
        // Limpa formulário
        e.target.reset();
        streamUrlInput.disabled = true;
        streamUrlInput.classList.remove('valid', 'invalid');
        
        // Recarrega partidas
        await carregarTodasPartidas();
        
    } catch (error) {
        console.error('[matches] Erro ao criar partida:', error);
        showModal('error', 'Erro', 'Erro ao criar partida: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-gamepad"></i> CRIAR PARTIDA';
    }
}

/**
 * Handler para inserir placar
 */
async function handleInserirPlacar(e) {
    e.preventDefault();
    
    const partidaId = document.getElementById('partidaIdPlacar').value;
    const placarA = parseInt(document.getElementById('placarA').value);
    const placarB = parseInt(document.getElementById('placarB').value);
    
    if (!partidaId) {
        showModal('error', 'Erro', 'Partida não identificada');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    
    try {
        await inserirResultado(partidaId, currentUser.uid, placarA, placarB);
        
        showModal('success', 'Placar Enviado!', 'Aguardando confirmação do adversário.');
        
        // Fecha modal
        document.getElementById('modalInserirPlacar').classList.add('hidden');
        
        // Recarrega partidas
        await carregarTodasPartidas();
        
    } catch (error) {
        console.error('[matches] Erro ao inserir placar:', error);
        showModal('error', 'Erro', 'Erro ao inserir placar: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> ENVIAR PLACAR';
    }
}

/**
 * Handler para contestar placar
 */
async function handleContestar(e) {
    e.preventDefault();
    
    const partidaId = document.getElementById('partidaIdContestar').value;
    const motivo = document.getElementById('motivoContestacao').value;
    
    if (!partidaId) {
        showModal('error', 'Erro', 'Partida não identificada');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Contestando...';
    
    try {
        await contestarResultado(partidaId, currentUser.uid, motivo);
        
        showModal('success', 'Placar Contestado!', 'Um administrador irá analisar.');
        
        // Fecha modal
        document.getElementById('modalContestar').classList.add('hidden');
        
        // Recarrega partidas
        await carregarTodasPartidas();
        
    } catch (error) {
        console.error('[matches] Erro ao contestar:', error);
        showModal('error', 'Erro', 'Erro ao contestar: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-times"></i> CONTESTAR PLACAR';
    }
}

/**
 * Handler para confirmar placar
 */
async function handleConfirmarPlacar(partidaId) {
    const confirmado = await showConfirmModal('Confirmar Placar', 'Tem certeza que deseja confirmar este placar?');
    if (!confirmado) return;
    
    // Anima o card
    animateMatchCard(partidaId, 'confirmed');
    
    try {
        await confirmarResultado(partidaId, currentUser.uid);
        
        // Toast de sucesso ao invés de modal
        showFairPlayToast('success', 'Fair Play! ✓', 'Placar confirmado com sucesso. Obrigado pela honestidade!', 5000);
        
        await carregarTodasPartidas();
    } catch (error) {
        console.error('[matches] Erro ao confirmar:', error);
        showFairPlayToast('error', 'Erro', 'Não foi possível confirmar: ' + error.message, 5000);
    }
}

/**
 * Carrega todas as partidas do usuário
 */
async function carregarTodasPartidas() {
    if (!currentUser) return;
    
    await Promise.all([
        carregarPartidasAguardandoResultado(),
        carregarPartidasPendentesConfirmacao(),
        carregarPartidasAguardandoAdversario(),
        carregarPartidasContestadas(),
        carregarPartidasConfirmadas()
    ]);
}

/**
 * Carrega partidas aguardando resultado
 */
async function carregarPartidasAguardandoResultado() {
    const container = document.getElementById('matchesAguardandoResultado');
    if (!container) return;
    
    try {
        const partidas = await getPartidasAguardandoResultado(currentUser.uid);
        
        // Armazena no cache
        partidasCache.aguardandoResultado = partidas;
        
        // Enriquece dados de adversários
        await enriquecerDadosAdversarios(partidas);
        
        const partidasFiltradas = partidas.filter(partidaPassaFiltros);
        
        if (partidasFiltradas.length === 0) {
            container.innerHTML = '<p class="empty-message">Nenhuma partida aguardando resultado</p>';
            return;
        }
        
        container.innerHTML = partidasFiltradas.map(partida => renderPartidaAguardandoResultado(partida)).join('');
        
        // Adiciona event listeners
        container.querySelectorAll('.btn-inserir-placar').forEach(btn => {
            btn.addEventListener('click', () => abrirModalInserirPlacar(btn.dataset.partidaId));
        });
        
        container.querySelectorAll('.btn-edit-stream').forEach(btn => {
            btn.addEventListener('click', () => abrirModalEditarStream(btn.dataset.partidaId));
        });
        
    } catch (error) {
        console.error('[matches] Erro ao carregar partidas aguardando resultado:', error);
        container.innerHTML = '<p class="error-message">Erro ao carregar partidas</p>';
    }
}

/**
 * Carrega partidas pendentes de confirmação
 */
async function carregarPartidasPendentesConfirmacao() {
    const container = document.getElementById('matchesPendentesConfirmacao');
    if (!container) return;
    
    try {
        const partidas = await getPartidasPendentesConfirmacao(currentUser.uid);
        
        // Armazena no cache
        partidasCache.pendentesConfirmacao = partidas;
        
        // Enriquece dados de adversários
        await enriquecerDadosAdversarios(partidas);
        
        const partidasFiltradas = partidas.filter(partidaPassaFiltros);
        
        if (partidasFiltradas.length === 0) {
            container.innerHTML = '<p class="empty-message">Nenhuma partida pendente de confirmação</p>';
            return;
        }
        
        container.innerHTML = partidasFiltradas.map(partida => renderPartidaPendenteConfirmacao(partida)).join('');
        
        // Adiciona event listeners
        container.querySelectorAll('.btn-confirmar').forEach(btn => {
            btn.addEventListener('click', () => handleConfirmarPlacar(btn.dataset.partidaId));
        });
        
        container.querySelectorAll('.btn-contestar').forEach(btn => {
            btn.addEventListener('click', () => abrirModalContestar(btn.dataset.partidaId, btn.dataset.placar));
        });
        
    } catch (error) {
        console.error('[matches] Erro ao carregar partidas pendentes:', error);
        container.innerHTML = '<p class="error-message">Erro ao carregar partidas</p>';
    }
}

/**
 * Carrega partidas aguardando adversário
 */
async function carregarPartidasAguardandoAdversario() {
    const container = document.getElementById('matchesAguardandoAdversario');
    if (!container) return;
    
    try {
        const partidas = await getPartidasAguardandoAdversario(currentUser.uid);
        
        // Armazena no cache
        partidasCache.aguardandoAdversario = partidas;
        
        // Enriquece dados de adversários
        await enriquecerDadosAdversarios(partidas);
        
        const partidasFiltradas = partidas.filter(partidaPassaFiltros);
        
        if (partidasFiltradas.length === 0) {
            container.innerHTML = '<p class="empty-message">Nenhuma partida aguardando adversário</p>';
            return;
        }
        
        container.innerHTML = partidasFiltradas.map(partida => renderPartidaAguardandoAdversario(partida)).join('');
        
    } catch (error) {
        console.error('[matches] Erro ao carregar partidas aguardando:', error);
        container.innerHTML = '<p class="error-message">Erro ao carregar partidas</p>';
    }
}

/**
 * Carrega partidas contestadas
 */
async function carregarPartidasContestadas() {
    const container = document.getElementById('matchesContestadas');
    if (!container) return;
    
    try {
        const partidas = await getPartidasContestadas(currentUser.uid);
        
        // Armazena no cache
        partidasCache.contestadas = partidas;
        
        // Enriquece dados de adversários
        await enriquecerDadosAdversarios(partidas);
        
        const partidasFiltradas = partidas.filter(partidaPassaFiltros);
        
        if (partidasFiltradas.length === 0) {
            container.innerHTML = '<p class="empty-message">Nenhuma partida contestada</p>';
            return;
        }
        
        container.innerHTML = partidasFiltradas.map(partida => renderPartidaContestada(partida)).join('');
        
    } catch (error) {
        console.error('[matches] Erro ao carregar partidas contestadas:', error);
        container.innerHTML = '<p class="error-message">Erro ao carregar partidas</p>';
    }
}

/**
 * Carrega partidas confirmadas
 */
async function carregarPartidasConfirmadas() {
    const container = document.getElementById('matchesConfirmadas');
    if (!container) return;
    
    try {
        const partidas = await getPartidasConfirmadas(currentUser.uid);
        
        // Armazena no cache
        partidasCache.confirmadas = partidas;
        
        // Enriquece dados de adversários
        await enriquecerDadosAdversarios(partidas);
        
        let partidasFiltradas = partidas.filter(partidaPassaFiltros);
        
        if (partidasFiltradas.length === 0) {
            container.innerHTML = '<p class="empty-message">Nenhuma partida confirmada</p>';
            return;
        }
        
        // Limita a 10 mais recentes
        const ultimasPartidas = partidasFiltradas.slice(0, 10);
        
        container.innerHTML = ultimasPartidas.map(partida => renderPartidaConfirmada(partida)).join('');
        
    } catch (error) {
        console.error('[matches] Erro ao carregar partidas confirmadas:', error);
        container.innerHTML = '<p class="error-message">Erro ao carregar partidas</p>';
    }
}

// ============================================================================
// FUNÇÕES DE RENDERIZAÇÃO
// ============================================================================

// Fallbacks para imagens
const FALLBACK_TEAM_LOGO = './assets/img/team-placeholder.svg';
const FALLBACK_AVATAR = './assets/img/avatar-placeholder.svg';

/**
 * Formata data para exibição
 */
function formatarData(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR') + ' - ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + 'h';
}

/**
 * Renderiza informações de um jogador no formato padrão
 * logo time + nome time + | + foto jogador + nome jogador
 */
function renderPlayerInfo(timeLogo, timeNome, jogadorFoto, jogadorNome, alignRight = false) {
    const logo = timeLogo || FALLBACK_TEAM_LOGO;
    const foto = jogadorFoto || FALLBACK_AVATAR;
    const time = timeNome || 'Sem time';
    const nome = jogadorNome || 'Jogador';
    
    return `
        <div class="match-player-info ${alignRight ? 'align-right' : ''}">
            <img src="${logo}" alt="Logo ${time}" class="match-team-logo" onerror="this.src='${FALLBACK_TEAM_LOGO}'">
            <span class="match-team-name">${time}</span>
            <span class="match-separator">|</span>
            <img src="${foto}" alt="Foto ${nome}" class="match-player-avatar" onerror="this.src='${FALLBACK_AVATAR}'">
            <span class="match-player-name">${nome}</span>
        </div>
    `;
}

/**
 * Renderiza label do tipo de partida (Campeonato ou Amistoso)
 */
function renderTipoLabel(campeonatoId) {
    const tipo = campeonatoId ? 'Campeonato' : 'Amistoso';
    const classe = campeonatoId ? 'match-type-campeonato' : 'match-type-amistoso';
    return `<span class="match-type-label ${classe}">${tipo}</span>`;
}

/**
 * Renderiza partida aguardando resultado
 */
function renderPartidaAguardandoResultado(partida) {
    // Verifica se tem link de transmissão
    const hasStream = partida.linkTransmissao && partida.linkTransmissao.length > 0;
    
    return `
        <article class="match-item awaiting-result" data-partida-id="${partida.id}">
            <div class="match-header">
                <span class="match-date-time">${formatarData(partida.criadoEm)}</span>
                ${renderTipoLabel(partida.campeonatoId)}
            </div>
            <div class="match-teams-detailed">
                ${renderPlayerInfo(partida.jogadorATimeLogo, partida.jogadorATimeNome, partida.jogadorAFoto, partida.jogadorANome, true)}
                <span class="match-vs">VS</span>
                ${renderPlayerInfo(partida.jogadorBTimeLogo, partida.jogadorBTimeNome, partida.jogadorBFoto, partida.jogadorBNome)}
            </div>
            ${renderAdversarioEnriquecido(partida)}
            <div class="match-footer">
                ${hasStream ? '<span class="stream-indicator"><i class="fas fa-broadcast-tower"></i> Com transmissão</span>' : ''}
                <span class="match-status-badge awaiting-result-badge">AGUARDANDO RESULTADO</span>
            </div>
            <div class="match-actions">
                <button class="btn-action btn-sm btn-inserir-placar" data-partida-id="${partida.id}">
                    <i class="fas fa-edit"></i> Placar
                </button>
                <button class="btn-action btn-sm btn-edit-stream" data-partida-id="${partida.id}" title="Editar link de transmissão">
                    <i class="fas fa-video"></i> ${hasStream ? 'Editar' : 'Adicionar'} Link
                </button>
            </div>
        </article>
    `;
}

/**
 * Renderiza partida pendente de confirmação
 */
function renderPartidaPendenteConfirmacao(partida) {
    return `
        <article class="match-item pending-confirmation" data-partida-id="${partida.id}">
            <div class="match-header">
                <span class="match-date-time">${formatarData(partida.criadoEm)}</span>
                ${renderTipoLabel(partida.campeonatoId)}
            </div>
            <div class="match-teams-detailed">
                ${renderPlayerInfo(partida.jogadorATimeLogo, partida.jogadorATimeNome, partida.jogadorAFoto, partida.jogadorANome, true)}
                <span class="match-score">${partida.placarA} x ${partida.placarB}</span>
                ${renderPlayerInfo(partida.jogadorBTimeLogo, partida.jogadorBTimeNome, partida.jogadorBFoto, partida.jogadorBNome)}
            </div>
            ${renderAdversarioEnriquecido(partida)}
            <div class="match-footer">
                <span class="match-status-badge pending-badge">AGUARDANDO SUA CONFIRMAÇÃO</span>
            </div>
            <div class="match-actions match-actions-fairplay">
                <button class="btn-action confirm btn-confirmar" data-partida-id="${partida.id}">
                    <i class="fas fa-check"></i> Confirmar
                </button>
                <button class="btn-action contest btn-contestar" 
                    data-partida-id="${partida.id}" 
                    data-placar="${partida.placarA} x ${partida.placarB}">
                    <i class="fas fa-times"></i> Contestar
                </button>
            </div>
        </article>
    `;
}

/**
 * Renderiza partida aguardando adversário
 */
function renderPartidaAguardandoAdversario(partida) {
    return `
        <article class="match-item awaiting-opponent" data-partida-id="${partida.id}">
            <div class="match-header">
                <span class="match-date-time">${formatarData(partida.criadoEm)}</span>
                ${renderTipoLabel(partida.campeonatoId)}
            </div>
            <div class="match-teams-detailed">
                ${renderPlayerInfo(partida.jogadorATimeLogo, partida.jogadorATimeNome, partida.jogadorAFoto, partida.jogadorANome, true)}
                <span class="match-score">${partida.placarA} x ${partida.placarB}</span>
                ${renderPlayerInfo(partida.jogadorBTimeLogo, partida.jogadorBTimeNome, partida.jogadorBFoto, partida.jogadorBNome)}
            </div>
            ${renderAdversarioEnriquecido(partida)}
            <div class="match-footer">
                <span class="match-status-badge awaiting-badge">PLACAR ENVIADO (Aguardando Adversário)</span>
            </div>
            <div class="match-actions">
                ${partida.linkTransmissao ? `
                    <button class="btn-action view" onclick="window.open('${partida.linkTransmissao}', '_blank')">
                        <i class="fas fa-link"></i> Ver Transmissão
                    </button>
                ` : ''}
            </div>
        </article>
    `;
}

/**
 * Renderiza partida contestada
 */
function renderPartidaContestada(partida) {
    return `
        <article class="match-item contested-final" data-partida-id="${partida.id}">
            <div class="match-header">
                <span class="match-date-time">${formatarData(partida.criadoEm)}</span>
                ${renderTipoLabel(partida.campeonatoId)}
            </div>
            <div class="match-teams-detailed">
                ${renderPlayerInfo(partida.jogadorATimeLogo, partida.jogadorATimeNome, partida.jogadorAFoto, partida.jogadorANome, true)}
                <span class="match-score contested">${partida.placarA} x ${partida.placarB}</span>
                ${renderPlayerInfo(partida.jogadorBTimeLogo, partida.jogadorBTimeNome, partida.jogadorBFoto, partida.jogadorBNome)}
            </div>
            ${renderAdversarioEnriquecido(partida)}
            <div class="match-footer">
                <span class="match-status-badge contested-badge">CONTESTADO</span>
                <p class="contest-reason"><em>Motivo: ${partida.motivoContestacao || 'Não informado'}</em></p>
            </div>
            <div class="match-actions">
                <span class="waiting-admin"><i class="fas fa-gavel"></i> Aguardando Admin</span>
            </div>
        </article>
    `;
}

/**
 * Renderiza partida confirmada
 */
function renderPartidaConfirmada(partida) {
    const isVencedor = partida.vencedorId === currentUser.uid;
    const isEmpate = partida.vencedorId === null;
    
    let resultClass = 'draw';
    if (isVencedor) resultClass = 'win';
    else if (!isEmpate) resultClass = 'loss';
    
    return `
        <article class="match-item confirmed-item ${resultClass}" data-partida-id="${partida.id}">
            <div class="match-header">
                <span class="match-date-time">${formatarData(partida.dataFim || partida.criadoEm)}</span>
                ${renderTipoLabel(partida.campeonatoId)}
            </div>
            <div class="match-teams-detailed">
                ${renderPlayerInfo(partida.jogadorATimeLogo, partida.jogadorATimeNome, partida.jogadorAFoto, partida.jogadorANome, true)}
                <span class="match-score ${resultClass}">${partida.placarA} x ${partida.placarB}</span>
                ${renderPlayerInfo(partida.jogadorBTimeLogo, partida.jogadorBTimeNome, partida.jogadorBFoto, partida.jogadorBNome)}
            </div>
            ${renderAdversarioEnriquecido(partida)}
            <div class="match-footer">
                <span class="match-status-badge confirmed-badge">CONFIRMADO</span>
                <div class="match-result-indicator ${resultClass}">
                    ${isVencedor ? '<i class="fas fa-trophy"></i> VITÓRIA' : 
                      isEmpate ? '<i class="fas fa-handshake"></i> EMPATE' : 
                      '<i class="fas fa-times-circle"></i> DERROTA'}
                </div>
            </div>
        </article>
    `;
}

// ============================================================================
// MODAIS
// ============================================================================

/**
 * Abre modal para inserir placar
 */
async function abrirModalInserirPlacar(partidaId) {
    try {
        const partida = await getPartida(partidaId);
        
        if (!partida) {
            showModal('error', 'Erro', 'Partida não encontrada');
            return;
        }
        
        document.getElementById('partidaIdPlacar').value = partidaId;
        document.getElementById('timeANomePlacar').textContent = partida.jogadorATimeNome;
        document.getElementById('timeBNomePlacar').textContent = partida.jogadorBTimeNome;
        document.getElementById('placarA').value = 0;
        document.getElementById('placarB').value = 0;
        
        document.getElementById('modalInserirPlacar').classList.remove('hidden');
        
    } catch (error) {
        console.error('[matches] Erro ao abrir modal:', error);
        showModal('error', 'Erro', 'Erro ao carregar partida');
    }
}

/**
 * Abre modal para editar/adicionar link de transmissão
 */
async function abrirModalEditarStream(partidaId) {
    try {
        const partida = await getPartida(partidaId);
        
        if (!partida) {
            showModal('error', 'Erro', 'Partida não encontrada');
            return;
        }
        
        // Criar modal dinâmico se não existir
        let modal = document.getElementById('modalEditarStream');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalEditarStream';
            modal.className = 'custom-modal hidden';
            modal.innerHTML = `
                <div class="modal-content stream-modal">
                    <div class="modal-header">
                        <h2><i class="fas fa-video"></i> Link de Transmissão</h2>
                        <button class="close-modal" id="closeModalStream">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p class="match-info-stream">
                            <strong id="streamTimeA"></strong> vs <strong id="streamTimeB"></strong>
                        </p>
                        <input type="hidden" id="partidaIdStream">
                        <div class="form-group">
                            <label for="plataformaStream">Plataforma</label>
                            <select id="plataformaStream" class="form-control">
                                <option value="youtube">YouTube</option>
                                <option value="twitch">Twitch</option>
                                <option value="facebook">Facebook Gaming</option>
                                <option value="instagram">Instagram Live</option>
                                <option value="outro">Outro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="linkStream">URL da Transmissão</label>
                            <input type="url" id="linkStream" class="form-control" 
                                placeholder="https://youtube.com/watch?v=...">
                        </div>
                        <p class="hint-text">
                            <i class="fas fa-info-circle"></i> 
                            Cole o link da sua transmissão ao vivo. Se estiver usando YouTube, 
                            certifique-se de que a transmissão está pública ou não listada.
                        </p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" id="btnRemoveStream">
                            <i class="fas fa-trash"></i> Remover
                        </button>
                        <button class="btn-primary" id="btnSalvarStream">
                            <i class="fas fa-save"></i> Salvar
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Adiciona event listeners
            document.getElementById('closeModalStream').addEventListener('click', () => {
                modal.classList.add('hidden');
            });
            
            document.getElementById('btnSalvarStream').addEventListener('click', handleSalvarStream);
            document.getElementById('btnRemoveStream').addEventListener('click', handleRemoverStream);
        }
        
        // Preenche dados
        document.getElementById('partidaIdStream').value = partidaId;
        document.getElementById('streamTimeA').textContent = partida.jogadorATimeNome;
        document.getElementById('streamTimeB').textContent = partida.jogadorBTimeNome;
        document.getElementById('plataformaStream').value = partida.plataformaStreaming || 'youtube';
        document.getElementById('linkStream').value = partida.linkTransmissao || '';
        
        modal.classList.remove('hidden');
        
    } catch (error) {
        console.error('[matches] Erro ao abrir modal de stream:', error);
        showModal('error', 'Erro', 'Erro ao carregar partida');
    }
}

/**
 * Salva link de transmissão
 */
async function handleSalvarStream() {
    const partidaId = document.getElementById('partidaIdStream').value;
    const plataforma = document.getElementById('plataformaStream').value;
    const link = document.getElementById('linkStream').value.trim();
    
    if (!link) {
        showModal('warning', 'Atenção', 'Por favor, insira o link da transmissão');
        return;
    }
    
    try {
        await atualizarLinkTransmissao(partidaId, plataforma, link);
        showModal('success', 'Sucesso', 'Link de transmissão atualizado!');
        document.getElementById('modalEditarStream').classList.add('hidden');
        carregarPartidasAguardandoResultado();
    } catch (error) {
        console.error('[matches] Erro ao salvar stream:', error);
        showModal('error', 'Erro', error.message || 'Erro ao salvar link de transmissão');
    }
}

/**
 * Remove link de transmissão
 */
async function handleRemoverStream() {
    const confirmado = await showConfirmModal(
        'Remover Transmissão',
        'Tem certeza que deseja remover o link de transmissão?'
    );
    
    if (!confirmado) return;
    
    const partidaId = document.getElementById('partidaIdStream').value;
    
    try {
        await atualizarLinkTransmissao(partidaId, null, null);
        showModal('success', 'Sucesso', 'Transmissão removida');
        document.getElementById('modalEditarStream').classList.add('hidden');
        carregarPartidasAguardandoResultado();
    } catch (error) {
        console.error('[matches] Erro ao remover stream:', error);
        showModal('error', 'Erro', 'Erro ao remover transmissão');
    }
}

/**
 * Abre modal para contestar placar
 */
function abrirModalContestar(partidaId, placar) {
    document.getElementById('partidaIdContestar').value = partidaId;
    document.getElementById('placarContestarInfo').textContent = placar;
    document.getElementById('motivoContestacao').value = '';
    
    document.getElementById('modalContestar').classList.remove('hidden');
}

// ============================================================================
// SISTEMA DE FILTROS
// ============================================================================

/**
 * Configura listeners dos filtros
 */
function setupFiltrosListeners() {
    const filterTipo = document.getElementById('filterTipo');
    const filterStatus = document.getElementById('filterStatus');
    const filterData = document.getElementById('filterData');
    const filterAdversario = document.getElementById('filterAdversario');
    const btnLimpar = document.getElementById('btnLimparFiltros');
    
    if (filterTipo) {
        filterTipo.addEventListener('change', (e) => {
            filtrosAtivos.tipo = e.target.value;
            aplicarFiltros();
        });
    }
    
    if (filterStatus) {
        filterStatus.addEventListener('change', (e) => {
            filtrosAtivos.status = e.target.value;
            aplicarFiltros();
        });
    }
    
    if (filterData) {
        filterData.addEventListener('change', (e) => {
            filtrosAtivos.data = e.target.value;
            aplicarFiltros();
        });
    }
    
    if (filterAdversario) {
        let debounceTimer;
        filterAdversario.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                filtrosAtivos.adversario = e.target.value.toLowerCase().trim();
                aplicarFiltros();
            }, 300);
        });
    }
    
    if (btnLimpar) {
        btnLimpar.addEventListener('click', limparFiltros);
    }
}

/**
 * Limpa todos os filtros
 */
function limparFiltros() {
    filtrosAtivos = {
        tipo: 'todas',
        status: 'todas',
        data: 'todas',
        adversario: ''
    };
    
    // Reseta UI
    const filterTipo = document.getElementById('filterTipo');
    const filterStatus = document.getElementById('filterStatus');
    const filterData = document.getElementById('filterData');
    const filterAdversario = document.getElementById('filterAdversario');
    
    if (filterTipo) filterTipo.value = 'todas';
    if (filterStatus) filterStatus.value = 'todas';
    if (filterData) filterData.value = 'todas';
    if (filterAdversario) filterAdversario.value = '';
    
    // Esconde indicador de filtros ativos
    const filtrosAtivosContainer = document.getElementById('filtrosAtivos');
    if (filtrosAtivosContainer) filtrosAtivosContainer.classList.add('hidden');
    
    aplicarFiltros();
}

/**
 * Verifica se uma partida passa nos filtros ativos
 */
function partidaPassaFiltros(partida) {
    // Filtro: Tipo (campeonato/amistoso)
    if (filtrosAtivos.tipo !== 'todas') {
        const isCampeonato = partida.campeonatoId !== null && partida.campeonatoId !== undefined;
        if (filtrosAtivos.tipo === 'campeonato' && !isCampeonato) return false;
        if (filtrosAtivos.tipo === 'amistoso' && isCampeonato) return false;
    }
    
    // Filtro: Status
    if (filtrosAtivos.status !== 'todas') {
        const statusMap = {
            'aguardando': 'sem_placar',
            'pendente': 'pendente',
            'confirmado': 'confirmado',
            'contestado': 'contestado'
        };
        if (partida.placarStatus !== statusMap[filtrosAtivos.status]) return false;
    }
    
    // Filtro: Data
    if (filtrosAtivos.data !== 'todas') {
        const dataPartida = partida.criadoEm?.toDate ? partida.criadoEm.toDate() : new Date(partida.criadoEm);
        const agora = new Date();
        
        if (filtrosAtivos.data === 'hoje') {
            const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
            if (dataPartida < inicioHoje) return false;
        } else if (filtrosAtivos.data === 'semana') {
            const iniciaSemana = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (dataPartida < iniciaSemana) return false;
        } else if (filtrosAtivos.data === 'mes') {
            const inicioMes = new Date(agora.getFullYear(), agora.getMonth() - 1, agora.getDate());
            if (dataPartida < inicioMes) return false;
        }
    }
    
    // Filtro: Adversário (nome)
    if (filtrosAtivos.adversario) {
        const adversarioNome = currentUser.uid === partida.jogadorAId 
            ? partida.jogadorBNome 
            : partida.jogadorANome;
        if (!adversarioNome?.toLowerCase().includes(filtrosAtivos.adversario)) return false;
    }
    
    return true;
}

/**
 * Aplica filtros às partidas e atualiza UI
 */
function aplicarFiltros() {
    // Atualiza indicador de filtros ativos
    atualizarIndicadorFiltros();
    
    // Renderiza cada seção com filtros aplicados
    renderizarPartidasFiltradas('matchesAguardandoResultado', partidasCache.aguardandoResultado, renderPartidaAguardandoResultado);
    renderizarPartidasFiltradas('matchesPendentesConfirmacao', partidasCache.pendentesConfirmacao, renderPartidaPendenteConfirmacao);
    renderizarPartidasFiltradas('matchesAguardandoAdversario', partidasCache.aguardandoAdversario, renderPartidaAguardandoAdversario);
    renderizarPartidasFiltradas('matchesContestadas', partidasCache.contestadas, renderPartidaContestada);
    renderizarPartidasFiltradas('matchesConfirmadas', partidasCache.confirmadas, renderPartidaConfirmada, 10);
    
    // Re-adiciona event listeners
    setupMatchActionListeners();
}

/**
 * Renderiza partidas filtradas em um container
 */
function renderizarPartidasFiltradas(containerId, partidas, renderFn, limite = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let partidasFiltradas = partidas.filter(partidaPassaFiltros);
    
    if (limite) {
        partidasFiltradas = partidasFiltradas.slice(0, limite);
    }
    
    if (partidasFiltradas.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhuma partida encontrada com os filtros selecionados</p>';
        return;
    }
    
    container.innerHTML = partidasFiltradas.map(renderFn).join('');
}

/**
 * Re-adiciona event listeners aos botões das partidas
 */
function setupMatchActionListeners() {
    // Botões inserir placar
    document.querySelectorAll('.btn-inserir-placar').forEach(btn => {
        btn.addEventListener('click', () => abrirModalInserirPlacar(btn.dataset.partidaId));
    });
    
    // Botões editar stream
    document.querySelectorAll('.btn-edit-stream').forEach(btn => {
        btn.addEventListener('click', () => abrirModalEditarStream(btn.dataset.partidaId));
    });
    
    // Botões confirmar
    document.querySelectorAll('.btn-confirmar').forEach(btn => {
        btn.addEventListener('click', () => handleConfirmarPlacar(btn.dataset.partidaId));
    });
    
    // Botões contestar
    document.querySelectorAll('.btn-contestar').forEach(btn => {
        btn.addEventListener('click', () => abrirModalContestar(btn.dataset.partidaId, btn.dataset.placar));
    });
}

/**
 * Atualiza indicador visual de filtros ativos
 */
function atualizarIndicadorFiltros() {
    const container = document.getElementById('filtrosAtivos');
    const tagsContainer = document.getElementById('filtrosAtivosTags');
    if (!container || !tagsContainer) return;
    
    const filtrosLabels = [];
    
    if (filtrosAtivos.tipo !== 'todas') {
        filtrosLabels.push(`Tipo: ${filtrosAtivos.tipo === 'campeonato' ? 'Campeonato' : 'Amistoso'}`);
    }
    if (filtrosAtivos.status !== 'todas') {
        const statusNames = {
            'aguardando': 'Aguardando',
            'pendente': 'Pendente',
            'confirmado': 'Confirmada',
            'contestado': 'Contestada'
        };
        filtrosLabels.push(`Status: ${statusNames[filtrosAtivos.status]}`);
    }
    if (filtrosAtivos.data !== 'todas') {
        const dataNames = {
            'hoje': 'Hoje',
            'semana': 'Última Semana',
            'mes': 'Último Mês'
        };
        filtrosLabels.push(`Período: ${dataNames[filtrosAtivos.data]}`);
    }
    if (filtrosAtivos.adversario) {
        filtrosLabels.push(`Adversário: "${filtrosAtivos.adversario}"`);
    }
    
    if (filtrosLabels.length > 0) {
        container.classList.remove('hidden');
        tagsContainer.innerHTML = filtrosLabels.map(label => 
            `<span class="filtro-tag">${label}</span>`
        ).join('');
    } else {
        container.classList.add('hidden');
    }
}

// ============================================================================
// SISTEMA DE TOAST - FEEDBACK FAIR PLAY
// ============================================================================

/**
 * Exibe um toast de feedback
 * @param {string} type - 'success', 'error', 'info', 'warning'
 * @param {string} title - Título do toast
 * @param {string} message - Mensagem
 * @param {number} duration - Duração em ms (default 4000)
 */
function showFairPlayToast(type, title, message, duration = 4000) {
    const container = document.getElementById('fairplayToastContainer');
    if (!container) return;
    
    const toastId = 'toast-' + Date.now();
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `fairplay-toast fairplay-toast-${type}`;
    toast.innerHTML = `
        <div class="fairplay-toast-icon">
            <i class="fas ${icons[type] || icons.info}"></i>
        </div>
        <div class="fairplay-toast-content">
            <strong class="fairplay-toast-title">${title}</strong>
            <span class="fairplay-toast-message">${message}</span>
        </div>
        <button class="fairplay-toast-close" onclick="document.getElementById('${toastId}').remove()">
            <i class="fas fa-times"></i>
        </button>
        <div class="fairplay-toast-progress"></div>
    `;
    
    container.appendChild(toast);
    
    // Adiciona classe de animação após um frame para trigger da transição
    requestAnimationFrame(() => {
        toast.classList.add('fairplay-toast-show');
    });
    
    // Remove após duração
    setTimeout(() => {
        toast.classList.remove('fairplay-toast-show');
        toast.classList.add('fairplay-toast-hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Anima o card da partida após confirmação Fair Play
 * @param {string} partidaId - ID da partida
 * @param {string} animationType - 'confirmed', 'contested'
 */
function animateMatchCard(partidaId, animationType) {
    const card = document.querySelector(`[data-partida-id="${partidaId}"]`);
    if (!card) return;
    
    card.classList.add(`fairplay-${animationType}-animation`);
    
    // Badge de confirmação
    if (animationType === 'confirmed') {
        const badge = document.createElement('div');
        badge.className = 'fairplay-confirmed-badge';
        badge.innerHTML = '<i class="fas fa-handshake"></i> Fair Play!';
        card.appendChild(badge);
        
        setTimeout(() => badge.remove(), 2000);
    }
    
    setTimeout(() => {
        card.classList.remove(`fairplay-${animationType}-animation`);
    }, 1500);
}

// ============================================================================
// ENRIQUECIMENTO DE DADOS DO ADVERSÁRIO
// ============================================================================

// Cache do ranking anual
let rankingAnualCache = [];
let rankingUnsubscribe = null;

/**
 * Inicializa a subscription do ranking anual para enriquecimento
 */
function inicializarRankingCache() {
    if (rankingUnsubscribe) return; // Já está inscrito
    
    rankingUnsubscribe = subscribeToAnnualStandings({}, ({ ranking }) => {
        rankingAnualCache = ranking || [];
    });
}

/**
 * Busca as últimas N partidas de um usuário (para forma recente)
 * @param {string} userId - ID do usuário
 * @param {number} limite - Número de partidas a buscar
 * @returns {Promise<Array>} - Array de resultados: 'V', 'E', 'D'
 */
async function getFormaRecente(userId, limite = 5) {
    try {
        // Busca partidas confirmadas do usuário
        const partidasRef = collection(db, 'partidas');
        
        // Busca como jogadorA
        const qA = query(
            partidasRef, 
            where('jogadorAId', '==', userId),
            where('placarStatus', '==', 'confirmado')
        );
        
        // Busca como jogadorB
        const qB = query(
            partidasRef, 
            where('jogadorBId', '==', userId),
            where('placarStatus', '==', 'confirmado')
        );
        
        const [snapA, snapB] = await Promise.all([getDocs(qA), getDocs(qB)]);
        
        let partidas = [];
        snapA.forEach(doc => partidas.push({ id: doc.id, ...doc.data() }));
        snapB.forEach(doc => partidas.push({ id: doc.id, ...doc.data() }));
        
        // Ordena por data mais recente
        partidas.sort((a, b) => {
            const dataA = a.dataFim?.toMillis?.() || a.criadoEm?.toMillis?.() || 0;
            const dataB = b.dataFim?.toMillis?.() || b.criadoEm?.toMillis?.() || 0;
            return dataB - dataA;
        });
        
        // Pega os últimos N resultados
        const ultimas = partidas.slice(0, limite);
        
        return ultimas.map(p => {
            const isJogadorA = p.jogadorAId === userId;
            const meuPlacar = isJogadorA ? p.placarA : p.placarB;
            const placarAdv = isJogadorA ? p.placarB : p.placarA;
            
            if (meuPlacar > placarAdv) return 'V';
            if (meuPlacar < placarAdv) return 'D';
            return 'E';
        });
        
    } catch (error) {
        console.error('[matches] Erro ao buscar forma recente:', error);
        return [];
    }
}

/**
 * Busca dados enriquecidos de um adversário
 * @param {string} adversarioId - ID do adversário
 * @returns {Object} - { ranking, estrelas, formaRecente }
 */
async function getDadosAdversario(adversarioId) {
    // Verifica cache primeiro
    if (adversariosCache[adversarioId]) {
        return adversariosCache[adversarioId];
    }
    
    // Busca posição no ranking
    const posicaoRanking = rankingAnualCache.findIndex(r => r.id === adversarioId) + 1;
    const totalJogadores = rankingAnualCache.length;
    
    // Busca dados do usuário (estrelas)
    let estrelas = 0;
    try {
        const userDoc = await getDoc(doc(db, 'users', adversarioId));
        if (userDoc.exists()) {
            estrelas = userDoc.data()?.estrelas || userDoc.data()?.rating || 0;
        }
    } catch (error) {
        console.error('[matches] Erro ao buscar estrelas:', error);
    }
    
    // Busca forma recente
    const formaRecente = await getFormaRecente(adversarioId, 5);
    
    // Armazena no cache
    adversariosCache[adversarioId] = {
        ranking: posicaoRanking > 0 ? `${posicaoRanking}º de ${totalJogadores}` : '-',
        rankingNumero: posicaoRanking,
        estrelas,
        formaRecente
    };
    
    return adversariosCache[adversarioId];
}

/**
 * Enriquece dados de adversários para uma lista de partidas
 * @param {Array} partidas - Lista de partidas
 */
async function enriquecerDadosAdversarios(partidas) {
    // Inicializa ranking cache se necessário
    inicializarRankingCache();
    
    // Coleta IDs únicos de adversários
    const adversariosIds = new Set();
    partidas.forEach(p => {
        const adversarioId = currentUser.uid === p.jogadorAId ? p.jogadorBId : p.jogadorAId;
        adversariosIds.add(adversarioId);
    });
    
    // Busca dados de todos os adversários em paralelo
    const promises = Array.from(adversariosIds).map(id => getDadosAdversario(id));
    await Promise.all(promises);
}

/**
 * Renderiza badge de forma recente
 * @param {Array} forma - Array de 'V', 'E', 'D'
 * @returns {string} - HTML
 */
function renderFormaRecente(forma) {
    if (!forma || forma.length === 0) return '';
    
    const badges = forma.map(r => {
        const classes = {
            'V': 'forma-vitoria',
            'E': 'forma-empate',
            'D': 'forma-derrota'
        };
        return `<span class="forma-badge ${classes[r]}">${r}</span>`;
    }).join('');
    
    return `<div class="forma-recente" title="Forma recente (últimas ${forma.length} partidas)">${badges}</div>`;
}

/**
 * Renderiza estrelas do adversário
 * @param {number} estrelas - Número de estrelas (0-5)
 * @returns {string} - HTML
 */
function renderEstrelas(estrelas) {
    if (!estrelas || estrelas === 0) return '';
    
    const cheias = Math.floor(estrelas);
    const meia = estrelas % 1 >= 0.5;
    const vazias = 5 - cheias - (meia ? 1 : 0);
    
    let html = '<div class="adversario-estrelas" title="Avaliação do jogador">';
    for (let i = 0; i < cheias; i++) html += '<i class="fas fa-star"></i>';
    if (meia) html += '<i class="fas fa-star-half-alt"></i>';
    for (let i = 0; i < vazias; i++) html += '<i class="far fa-star"></i>';
    html += '</div>';
    
    return html;
}

/**
 * Renderiza informações enriquecidas do adversário
 * @param {Object} partida - Dados da partida
 * @returns {string} - HTML
 */
function renderAdversarioEnriquecido(partida) {
    const adversarioId = currentUser.uid === partida.jogadorAId ? partida.jogadorBId : partida.jogadorAId;
    const dados = adversariosCache[adversarioId];
    
    if (!dados) return '';
    
    let html = '<div class="adversario-stats">';
    
    // Ranking
    if (dados.ranking && dados.ranking !== '-') {
        html += `<span class="adversario-ranking" title="Posição no ranking anual"><i class="fas fa-trophy"></i> ${dados.ranking}</span>`;
    }
    
    // Estrelas
    html += renderEstrelas(dados.estrelas);
    
    // Forma recente
    html += renderFormaRecente(dados.formaRecente);
    
    html += '</div>';
    
    return html;
}

// Exporta função de inicialização para ser chamada pelo router
export default {
    matches,
    initMatchesPage
};