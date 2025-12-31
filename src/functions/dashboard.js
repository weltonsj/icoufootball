/**
 * src/functions/dashboard.js
 * Lógica para a página de Dashboard - iCouFootball
 * Implementa RF7, RF8 conforme PRD v2.0
 * 
 * Responsabilidades:
 * - Carregar informações do usuário logado (nome, time, estrelas, troféu)
 * - Exibir KPIs de desempenho (vitórias, empates, derrotas, média de gols)
 * - Exibir posição no ranking geral com indicador de variação
 * - Exibir resumo do campeonato ativo do usuário
 * - Exibir resumo social (amigos, online, destaque)
 * - Listar partidas pendentes de ação (Fair Play)
 * - Exibir histórico de partidas do usuário (últimas 3)
 * - Indicar partidas com transmissão ativa
 * - Atualizar em tempo real via listeners
 */

import { db } from "../services/firebase.js";
import { getCurrentUser } from "../utils/authManager.js";
import { getUser, getUserMap } from "../services/usersService.js";
import { showModal } from "../components/modal.js";
import { 
    getPartidasUsuario,
    getPartidasPendentesConfirmacao,
    getPartidasAguardandoAdversario,
    getPartidasConfirmadas,
    STATUS_PLACAR,
    STATUS_PARTIDA,
    PLATAFORMAS_STREAMING
} from "../services/matchesService.js";
import { 
    subscribeToAnnualStandings,
    getUserChampionshipStatus
} from "../services/standingsService.js";
import { getFriendsList } from "../services/friendsService.js";
import { 
    doc, 
    getDoc,
    onSnapshot,
    collection,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// ============================================================================
// ESTADO DO MÓDULO
// ============================================================================

let unsubscribeUserListener = null;
let unsubscribePartidasListener = null;
let unsubscribeRankingListener = null;
let unsubscribeFriendsListener = null;
let currentUserData = null;
let isInitialized = false;
let previousRankingPosition = null; // Para calcular variação

// ============================================================================
// CONSTANTES
// ============================================================================

const MAX_RECENT_MATCHES = 3; // Limite de partidas no histórico resumido
const MAX_FEATURED_FRIENDS = 3; // Limite de amigos em destaque

// ============================================================================
// SELETORES DOM
// ============================================================================

const SELECTORS = {
    // Perfil do usuário
    userProfile: '#dashboardUserProfile',
    timeLogo: '#dashboardTimeLogo',
    userName: '#dashboardUserName',
    timeName: '#dashboardTimeName',
    userBadges: '#dashboardUserBadges',
    
    // KPIs
    kpiCards: '#dashboardKpiCards',
    kpiVitorias: '#kpiVitorias',
    kpiEmpates: '#kpiEmpates',
    kpiDerrotas: '#kpiDerrotas',
    kpiMediaGols: '#kpiMediaGols',
    
    // Ranking
    rankingCard: '#dashboardRankingCard',
    rankingContent: '#dashboardRankingContent',
    rankingPosition: '#rankingPosition',
    rankingVariation: '#rankingVariation',
    rankingTotal: '#rankingTotal',
    
    // Campeonato Ativo
    championshipCard: '#dashboardChampionshipCard',
    championshipContent: '#dashboardChampionshipContent',
    
    // Resumo Social
    socialCard: '#dashboardSocialCard',
    socialContent: '#dashboardSocialContent',
    
    // Partidas
    partidasPendentes: '#dashboardPartidasPendentes',
    matchHistory: '#dashboardMatchHistory'
};

function qs(selector) {
    return document.querySelector(selector);
}

// ============================================================================
// FUNÇÕES DE RENDERIZAÇÃO - PERFIL DO USUÁRIO
// ============================================================================

/**
 * Renderiza informações do usuário no header do Dashboard
 * @param {Object} userData - Dados do usuário do Firestore
 */
function renderUserProfile(userData) {
    if (!userData) return;
    
    // Nome do usuário
    const userNameEl = qs(SELECTORS.userName);
    if (userNameEl) {
        userNameEl.textContent = userData.nome || 'Jogador';
    }
    
    // Time do usuário
    const timeNameEl = qs(SELECTORS.timeName);
    const timeLogoEl = qs(SELECTORS.timeLogo);
    
    if (userData.timeName && userData.timeLogo) {
        if (timeNameEl) timeNameEl.textContent = userData.timeName;
        if (timeLogoEl) {
            timeLogoEl.src = userData.timeLogo;
            timeLogoEl.alt = `Logo ${userData.timeName}`;
        }
    } else {
        if (timeNameEl) timeNameEl.textContent = 'Sem time selecionado';
        if (timeLogoEl) timeLogoEl.src = './assets/img/team-placeholder.svg';
    }
    
    // Badges (estrelas e troféu)
    renderUserBadges(userData);
}

/**
 * Renderiza estrelas e troféu do usuário
 * @param {Object} userData - Dados do usuário
 */
function renderUserBadges(userData) {
    const badgesEl = qs(SELECTORS.userBadges);
    if (!badgesEl) return;
    
    let badgesHtml = '';
    
    // Estrelas (máximo visual: 5, tooltip com total real)
    const estrelas = userData.estrelas || 0;
    const estrelasVisiveis = Math.min(estrelas, 5);
    
    if (estrelas > 0) {
        badgesHtml += `<span class="user-stars" title="${estrelas} título${estrelas > 1 ? 's' : ''} conquistado${estrelas > 1 ? 's' : ''}">`;
        for (let i = 0; i < estrelasVisiveis; i++) {
            badgesHtml += '<i class="fas fa-star star-icon"></i>';
        }
        if (estrelas > 5) {
            badgesHtml += `<span class="stars-extra">+${estrelas - 5}</span>`;
        }
        badgesHtml += '</span>';
    }
    
    // Troféu de último campeão (RF8)
    if (userData.ultimoCampeao) {
        badgesHtml += `
            <span class="champion-trophy" title="Campeão do último campeonato">
                <i class="fas fa-trophy trophy-icon"></i>
            </span>
        `;
    }
    
    badgesEl.innerHTML = badgesHtml;
}

// ============================================================================
// FUNÇÕES DE CÁLCULO - ESTATÍSTICAS DINÂMICAS
// ============================================================================

/**
 * Calcula estatísticas dinamicamente a partir de TODAS as partidas confirmadas do usuário
 * Inclui partidas avulsas e de campeonatos
 * @param {string} userId - ID do usuário
 * @returns {Promise<Object>} Estatísticas calculadas
 */
async function calcularEstatisticasDinamicas(userId) {
    console.log('[Dashboard] 📊 Calculando estatísticas dinâmicas para:', userId);
    
    try {
        // Busca TODAS as partidas confirmadas do usuário (avulsas + campeonatos)
        const partidasConfirmadas = await getPartidasConfirmadas(userId);
        
        console.log('[Dashboard] Total de partidas confirmadas encontradas:', partidasConfirmadas.length);
        
        // Inicializa contadores
        let vitorias = 0;
        let empates = 0;
        let derrotas = 0;
        let golsPro = 0;
        let golsContra = 0;
        
        // Percorre cada partida e calcula resultados
        partidasConfirmadas.forEach((partida, index) => {
            const isJogadorA = partida.jogadorAId === userId;
            const placarUsuario = isJogadorA ? partida.placarA : partida.placarB;
            const placarAdversario = isJogadorA ? partida.placarB : partida.placarA;
            
            console.log(`[Dashboard] Partida ${index + 1}:`, {
                id: partida.id,
                isJogadorA,
                placarUsuario,
                placarAdversario,
                origem: partida.campeonatoId ? 'Campeonato' : 'Avulsa'
            });
            
            // Acumula gols
            golsPro += placarUsuario || 0;
            golsContra += placarAdversario || 0;
            
            // Determina resultado
            if (placarUsuario > placarAdversario) {
                vitorias++;
            } else if (placarUsuario === placarAdversario) {
                empates++;
            } else {
                derrotas++;
            }
        });
        
        const partidasJogadas = partidasConfirmadas.length;
        const mediaGols = partidasJogadas > 0 ? (golsPro / partidasJogadas) : 0;
        
        const estatisticas = {
            vitorias,
            empates,
            derrotas,
            golsPro,
            golsContra,
            partidasJogadas,
            mediaGols
        };
        
        console.log('[Dashboard] ✅ Estatísticas calculadas dinamicamente:', estatisticas);
        
        return estatisticas;
        
    } catch (error) {
        console.error('[Dashboard] ❌ Erro ao calcular estatísticas dinâmicas:', error);
        return {
            vitorias: 0,
            empates: 0,
            derrotas: 0,
            golsPro: 0,
            golsContra: 0,
            partidasJogadas: 0,
            mediaGols: 0
        };
    }
}

// ============================================================================
// FUNÇÕES DE RENDERIZAÇÃO - KPIs
// ============================================================================

/**
 * Renderiza os KPIs de desempenho do usuário
 * @param {Object} estatisticas - Estatísticas calculadas
 */
function renderKPIs(estatisticas) {
    console.log('[Dashboard] 🎯 Renderizando KPIs');
    console.log('[Dashboard] Estatísticas recebidas:', JSON.stringify(estatisticas, null, 2));
    
    const stats = estatisticas || {
        vitorias: 0,
        empates: 0,
        derrotas: 0,
        golsPro: 0,
        partidasJogadas: 0
    };
    
    // Vitórias
    const vitoriasEl = qs(SELECTORS.kpiVitorias);
    if (vitoriasEl) {
        vitoriasEl.textContent = stats.vitorias || 0;
        console.log('[Dashboard] ✅ KPI Vitórias:', stats.vitorias);
    }
    
    // Empates
    const empatesEl = qs(SELECTORS.kpiEmpates);
    if (empatesEl) {
        empatesEl.textContent = stats.empates || 0;
        console.log('[Dashboard] ✅ KPI Empates:', stats.empates);
    }
    
    // Derrotas
    const derrotasEl = qs(SELECTORS.kpiDerrotas);
    if (derrotasEl) {
        derrotasEl.textContent = stats.derrotas || 0;
        console.log('[Dashboard] ✅ KPI Derrotas:', stats.derrotas);
    }
    
    // Média de gols (já calculada ou calcula aqui)
    const mediaGolsEl = qs(SELECTORS.kpiMediaGols);
    if (mediaGolsEl) {
        const mediaGols = stats.mediaGols !== undefined 
            ? stats.mediaGols.toFixed(1)
            : (stats.partidasJogadas > 0 
                ? (stats.golsPro / stats.partidasJogadas).toFixed(1) 
                : '0.0');
        mediaGolsEl.textContent = mediaGols;
        console.log('[Dashboard] ✅ KPI Média de Gols:', mediaGols);
    }
    
    console.log('[Dashboard] 🏁 Renderização de KPIs concluída');
}

// ============================================================================
// FUNÇÕES DE RENDERIZAÇÃO - RANKING
// ============================================================================

/**
 * Renderiza a posição do usuário no ranking geral
 * @param {Array} ranking - Lista ordenada de jogadores no ranking
 * @param {string} userId - ID do usuário atual
 */
function renderRankingPosition(ranking, userId) {
    const positionEl = qs(SELECTORS.rankingPosition);
    const variationEl = qs(SELECTORS.rankingVariation);
    const totalEl = qs(SELECTORS.rankingTotal);
    
    if (!ranking || ranking.length === 0) {
        if (positionEl) positionEl.textContent = '-';
        if (totalEl) totalEl.textContent = 'Sem dados';
        if (variationEl) {
            variationEl.innerHTML = '<i class="fas fa-minus"></i>';
            variationEl.className = 'ranking-variation neutral';
            variationEl.title = 'Sem variação';
        }
        return;
    }
    
    const totalJogadores = ranking.length;
    const posicaoAtual = ranking.findIndex(r => r.id === userId) + 1;
    
    if (posicaoAtual === 0) {
        // Usuário não está no ranking (sem partidas confirmadas)
        if (positionEl) positionEl.textContent = '-';
        if (totalEl) totalEl.textContent = `de ${totalJogadores} jogador${totalJogadores > 1 ? 'es' : ''}`;
        if (variationEl) {
            variationEl.innerHTML = '<i class="fas fa-minus"></i>';
            variationEl.className = 'ranking-variation neutral';
            variationEl.title = 'Você ainda não está no ranking';
        }
        return;
    }
    
    // Exibe posição atual
    if (positionEl) positionEl.textContent = `${posicaoAtual}º`;
    if (totalEl) totalEl.textContent = `de ${totalJogadores} jogador${totalJogadores > 1 ? 'es' : ''}`;
    
    // Calcula variação (comparado com posição anterior armazenada)
    if (variationEl) {
        if (previousRankingPosition !== null && previousRankingPosition !== posicaoAtual) {
            const diferenca = previousRankingPosition - posicaoAtual;
            
            if (diferenca > 0) {
                // Subiu no ranking
                variationEl.innerHTML = `<i class="fas fa-arrow-up"></i> ${diferenca}`;
                variationEl.className = 'ranking-variation up';
                variationEl.title = `Subiu ${diferenca} posição${diferenca > 1 ? 'ões' : ''}`;
            } else {
                // Desceu no ranking
                const desceu = Math.abs(diferenca);
                variationEl.innerHTML = `<i class="fas fa-arrow-down"></i> ${desceu}`;
                variationEl.className = 'ranking-variation down';
                variationEl.title = `Desceu ${desceu} posição${desceu > 1 ? 'ões' : ''}`;
            }
        } else {
            // Manteve ou primeiro carregamento
            variationEl.innerHTML = '<i class="fas fa-minus"></i>';
            variationEl.className = 'ranking-variation neutral';
            variationEl.title = 'Manteve a posição';
        }
    }
    
    // Salva posição atual para próxima comparação
    previousRankingPosition = posicaoAtual;
    
    console.log('[Dashboard] 📊 Ranking renderizado: posição', posicaoAtual, 'de', totalJogadores);
}

// ============================================================================
// FUNÇÕES DE RENDERIZAÇÃO - CAMPEONATO ATIVO
// ============================================================================

/**
 * Renderiza informações do campeonato ativo do usuário
 * @param {Object|null} championship - Dados do campeonato ativo
 */
function renderActiveChampionship(championship) {
    const contentEl = qs(SELECTORS.championshipContent);
    if (!contentEl) return;
    
    if (!championship) {
        contentEl.innerHTML = `
            <div class="championship-empty-state">
                <i class="fas fa-trophy"></i>
                <p>Você não está em nenhum campeonato ativo</p>
                <span class="empty-hint">Aguarde um convite de administrador</span>
            </div>
        `;
        return;
    }
    
    // Formata tipo do campeonato
    const tipoLabel = championship.tipo === 'pontos_corridos' ? 'Pontos Corridos' : 
                      championship.tipo === 'chave' ? 'Chave/Mata-mata' : 
                      championship.tipo || 'Padrão';
    
    // Formata status
    const statusLabel = championship.status || 'Ativo';
    const statusClass = statusLabel.toLowerCase().replace(/\s+/g, '-');
    
    // Condição de término
    let condicaoTermino = 'Não definida';
    if (championship.terminoPorPontos && championship.metaQtdPontos) {
        condicaoTermino = `${championship.metaQtdPontos} pontos`;
    } else if (championship.terminoPorPeriodo && championship.dataFimPrevista) {
        const dataFim = championship.dataFimPrevista?.toDate ? 
            championship.dataFimPrevista.toDate().toLocaleDateString('pt-BR') : 
            'Data prevista';
        condicaoTermino = `Até ${dataFim}`;
    } else if (championship.terminoPorRodadas && championship.totalRodadas) {
        condicaoTermino = `${championship.totalRodadas} rodadas`;
    } else {
        condicaoTermino = 'Manual (admin)';
    }
    
    // Total de participantes
    const totalParticipantes = championship.participantesIds?.length || 0;
    
    contentEl.innerHTML = `
        <div class="championship-info">
            <div class="championship-name">${championship.nome || 'Campeonato'}</div>
            <div class="championship-details">
                <div class="championship-detail">
                    <i class="fas fa-gamepad"></i>
                    <span>${tipoLabel}</span>
                </div>
                <div class="championship-detail">
                    <i class="fas fa-circle status-${statusClass}"></i>
                    <span>${statusLabel}</span>
                </div>
                <div class="championship-detail">
                    <i class="fas fa-flag-checkered"></i>
                    <span>${condicaoTermino}</span>
                </div>
                <div class="championship-detail">
                    <i class="fas fa-users"></i>
                    <span>${totalParticipantes} jogador${totalParticipantes > 1 ? 'es' : ''}</span>
                </div>
            </div>
        </div>
    `;
    
    console.log('[Dashboard] 🏆 Campeonato ativo renderizado:', championship.nome);
}

// ============================================================================
// FUNÇÕES DE RENDERIZAÇÃO - RESUMO SOCIAL
// ============================================================================

/**
 * Renderiza o resumo social com amigos, online e destaque
 * @param {Array} friends - Lista de amigos
 * @param {Object} onlineStatus - Mapa de status online por ID
 */
function renderSocialSummary(friends, onlineStatus = {}) {
    const contentEl = qs(SELECTORS.socialContent);
    if (!contentEl) return;
    
    const totalAmigos = friends.length;
    
    // Conta quantos estão online
    const amigosOnline = friends.filter(f => {
        const status = onlineStatus[f.id];
        return status?.online === true || status?.status === 'disponivel';
    }).length;
    
    // Seleciona até 3 amigos em destaque (prioriza online, depois campeões, depois estrelas)
    const amigosOrdenados = [...friends].sort((a, b) => {
        const aOnline = onlineStatus[a.id]?.online ? 1 : 0;
        const bOnline = onlineStatus[b.id]?.online ? 1 : 0;
        if (bOnline !== aOnline) return bOnline - aOnline;
        if (a.ultimoCampeao && !b.ultimoCampeao) return -1;
        if (!a.ultimoCampeao && b.ultimoCampeao) return 1;
        return (b.estrelas || 0) - (a.estrelas || 0);
    });
    
    const amigosDestaque = amigosOrdenados.slice(0, MAX_FEATURED_FRIENDS);
    
    if (totalAmigos === 0) {
        contentEl.innerHTML = `
            <div class="social-empty-state">
                <i class="fas fa-user-plus"></i>
                <p>Você ainda não tem amigos</p>
                <span class="empty-hint">Adicione amigos para criar partidas</span>
            </div>
        `;
        return;
    }
    
    // Fallback para avatar
    const fallbackAvatar = './assets/img/avatar-placeholder.svg';
    
    // Renderiza amigos em destaque
    const amigosHtml = amigosDestaque.map(amigo => {
        const isOnline = onlineStatus[amigo.id]?.online === true || onlineStatus[amigo.id]?.status === 'disponivel';
        const statusClass = isOnline ? 'online' : 'offline';
        const foto = amigo.fotoUrl || amigo.logoTime || fallbackAvatar;
        
        return `
            <div class="social-friend-item" data-friend-id="${amigo.id}" title="${amigo.nome}">
                <div class="friend-avatar-wrapper">
                    <img src="${foto}" alt="${amigo.nome}" class="friend-avatar-mini" onerror="this.src='${fallbackAvatar}'">
                    <span class="friend-status-dot ${statusClass}"></span>
                </div>
                <span class="friend-name-mini">${amigo.nome?.split(' ')[0] || 'Amigo'}</span>
            </div>
        `;
    }).join('');
    
    contentEl.innerHTML = `
        <div class="social-stats">
            <div class="social-stat">
                <span class="social-stat-value">${totalAmigos}</span>
                <span class="social-stat-label">amigo${totalAmigos > 1 ? 's' : ''}</span>
            </div>
            <div class="social-stat online-stat">
                <span class="social-stat-value">${amigosOnline}</span>
                <span class="social-stat-label">online</span>
            </div>
        </div>
        ${amigosDestaque.length > 0 ? `
            <div class="social-friends-featured">
                ${amigosHtml}
            </div>
        ` : ''}
        <a href="#matches" class="social-action-btn" title="Criar partida com amigo">
            <i class="fas fa-gamepad"></i>
            <span>Criar partida</span>
        </a>
    `;
    
    console.log('[Dashboard] 👥 Resumo social renderizado:', totalAmigos, 'amigos,', amigosOnline, 'online');
}

// ============================================================================
// FUNÇÕES DE RENDERIZAÇÃO - PARTIDAS
// ============================================================================

/**
 * Formata data para exibição
 * @param {Timestamp|Date} timestamp - Data a formatar
 * @returns {string} Data formatada
 */
function formatDate(timestamp) {
    if (!timestamp) return '-';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Retorna classe CSS e ícone baseado no status do placar
 * @param {string} placarStatus - Status do placar
 * @returns {Object} { classe, badgeClasse, icone, texto }
 */
function getStatusInfo(placarStatus) {
    switch (placarStatus) {
        case STATUS_PLACAR.CONFIRMADO:
            return {
                classe: 'confirmed',
                badgeClasse: 'status-confirmado',
                icone: 'fa-check-circle',
                texto: 'Confirmado'
            };
        case STATUS_PLACAR.PENDENTE:
            return {
                classe: 'pending',
                badgeClasse: 'status-pendente',
                icone: 'fa-hourglass-half',
                texto: 'Pendente'
            };
        case STATUS_PLACAR.CONTESTADO:
            return {
                classe: 'contested',
                badgeClasse: 'status-contestado',
                icone: 'fa-exclamation-triangle',
                texto: 'Contestado'
            };
        case STATUS_PLACAR.SEM_PLACAR:
            return {
                classe: 'awaiting',
                badgeClasse: 'status-aguardando',
                icone: 'fa-clock',
                texto: 'Aguardando'
            };
        default:
            return {
                classe: '',
                badgeClasse: '',
                icone: 'fa-question',
                texto: 'Indefinido'
            };
    }
}

/**
 * Renderiza uma partida no padrão unificado
 * Estrutura: [TIME + JOGADOR] PLACAR [TIME + JOGADOR]
 * @param {Object} partida - Dados da partida
 * @param {string} userId - ID do usuário atual
 * @returns {string} HTML da partida
 */
function renderMatchItem(partida, userId) {
    const statusInfo = getStatusInfo(partida.placarStatus);
    const dataPartida = formatDate(partida.dataPartida || partida.criadoEm);
    
    // Fallbacks para imagens
    const fallbackTeamLogo = './assets/img/team-placeholder.svg';
    const fallbackAvatar = './assets/img/avatar-placeholder.svg';
    
    // Dados do Jogador A
    const jogadorATimeLogo = partida.jogadorATimeLogo || fallbackTeamLogo;
    const jogadorATimeNome = partida.jogadorATimeNome || 'Time A';
    const jogadorAFoto = partida.jogadorAFoto || fallbackAvatar;
    const jogadorANome = partida.jogadorANome || 'Jogador A';
    
    // Dados do Jogador B
    const jogadorBTimeLogo = partida.jogadorBTimeLogo || fallbackTeamLogo;
    const jogadorBTimeNome = partida.jogadorBTimeNome || 'Time B';
    const jogadorBFoto = partida.jogadorBFoto || fallbackAvatar;
    const jogadorBNome = partida.jogadorBNome || 'Jogador B';
    
    // Monta o placar ou "VS"
    let placarHtml = '';
    if (partida.placarA !== null && partida.placarB !== null) {
        const isContestado = partida.placarStatus === STATUS_PLACAR.CONTESTADO;
        placarHtml = `
            <div class="partida-placar">
                <span class="partida-placar-valor${isContestado ? ' contestado' : ''}">${partida.placarA} x ${partida.placarB}</span>
            </div>
        `;
    } else {
        placarHtml = `
            <div class="partida-placar">
                <span class="partida-placar-vs">VS</span>
            </div>
        `;
    }
    
    // Indicador de transmissão ao vivo
    let liveIndicator = '';
    if (partida.linkTransmissao && partida.status === STATUS_PARTIDA.EM_ANDAMENTO) {
        const plataforma = PLATAFORMAS_STREAMING[partida.plataformaStreaming] || PLATAFORMAS_STREAMING.outro;
        liveIndicator = `
            <span class="partida-stream-badge" title="Transmissão ao vivo">
                <i class="${plataforma.icone}" style="color: ${plataforma.cor}"></i>
                <span class="live-badge pulse">AO VIVO</span>
            </span>
        `;
    }
    
    // Label de tipo de partida: Campeonato ou Amistoso
    const tipoPartida = partida.campeonatoId ? 'Campeonato' : 'Amistoso';
    const tipoClasse = partida.campeonatoId ? 'tipo-campeonato' : 'tipo-amistoso';
    
    // Determina resultado para cards confirmados
    let resultadoClass = '';
    let resultadoHtml = '';
    if (partida.placarStatus === STATUS_PLACAR.CONFIRMADO && partida.placarA !== null) {
        const isJogadorA = partida.jogadorAId === userId;
        const placarUsuario = isJogadorA ? partida.placarA : partida.placarB;
        const placarAdversario = isJogadorA ? partida.placarB : partida.placarA;
        
        if (placarUsuario > placarAdversario) {
            resultadoClass = 'resultado-win';
            resultadoHtml = '<span class="partida-resultado partida-resultado-win"><i class="fas fa-trophy"></i> VITÓRIA</span>';
        } else if (placarUsuario < placarAdversario) {
            resultadoClass = 'resultado-loss';
            resultadoHtml = '<span class="partida-resultado partida-resultado-loss"><i class="fas fa-times-circle"></i> DERROTA</span>';
        } else {
            resultadoClass = 'resultado-draw';
            resultadoHtml = '<span class="partida-resultado partida-resultado-draw"><i class="fas fa-handshake"></i> EMPATE</span>';
        }
    }
    
    return `
        <article class="partida-card ${resultadoClass}" data-partida-id="${partida.id}">
            <div class="partida-card-header">
                <span class="partida-data">${dataPartida}</span>
                <span class="partida-tipo-badge ${tipoClasse}">${tipoPartida}</span>
            </div>
            <div class="partida-card-body">
                <!-- Lado A: Time + Jogador -->
                <div class="partida-lado lado-a">
                    <div class="partida-time">
                        <img src="${jogadorATimeLogo}" alt="Logo ${jogadorATimeNome}" class="partida-time-logo" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="partida-time-logo-fallback" style="display:none;">T</div>
                        <span class="partida-time-nome" title="${jogadorATimeNome}">${jogadorATimeNome}</span>
                    </div>
                    <div class="partida-jogador">
                        <img src="${jogadorAFoto}" alt="Foto ${jogadorANome}" class="partida-jogador-avatar" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="partida-jogador-avatar-fallback" style="display:none;">${jogadorANome.charAt(0).toUpperCase()}</div>
                        <span class="partida-jogador-nome" title="${jogadorANome}">${jogadorANome}</span>
                    </div>
                </div>
                
                ${placarHtml}
                
                <!-- Lado B: Time + Jogador -->
                <div class="partida-lado lado-b">
                    <div class="partida-time">
                        <img src="${jogadorBTimeLogo}" alt="Logo ${jogadorBTimeNome}" class="partida-time-logo" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="partida-time-logo-fallback" style="display:none;">T</div>
                        <span class="partida-time-nome" title="${jogadorBTimeNome}">${jogadorBTimeNome}</span>
                    </div>
                    <div class="partida-jogador">
                        <img src="${jogadorBFoto}" alt="Foto ${jogadorBNome}" class="partida-jogador-avatar" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="partida-jogador-avatar-fallback" style="display:none;">${jogadorBNome.charAt(0).toUpperCase()}</div>
                        <span class="partida-jogador-nome" title="${jogadorBNome}">${jogadorBNome}</span>
                    </div>
                </div>
            </div>
            <div class="partida-card-footer">
                <div>
                    ${liveIndicator}
                    <span class="partida-status-badge ${statusInfo.badgeClasse}">
                        <i class="fas ${statusInfo.icone}"></i> ${statusInfo.texto}
                    </span>
                </div>
                ${resultadoHtml}
            </div>
        </article>
    `;
}

/**
 * Renderiza partidas pendentes de ação Fair Play
 * @param {Array} partidas - Lista de partidas
 * @param {string} userId - ID do usuário
 */
function renderPartidasPendentes(partidas, userId) {
    const container = qs(SELECTORS.partidasPendentes);
    if (!container) return;
    
    // Filtra partidas que requerem ação do usuário
    const partidasPendentes = partidas.filter(p => {
        // Partidas pendentes de confirmação (Fair Play) onde o usuário não inseriu
        if (p.placarStatus === STATUS_PLACAR.PENDENTE && p.placarInseridoPor !== userId) {
            return true;
        }
        // Partidas sem placar onde o usuário pode inserir
        if (p.placarStatus === STATUS_PLACAR.SEM_PLACAR) {
            return true;
        }
        // Partidas contestadas
        if (p.placarStatus === STATUS_PLACAR.CONTESTADO) {
            return true;
        }
        return false;
    });
    
    if (partidasPendentes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle empty-icon"></i>
                <p>Nenhuma partida pendente de ação</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = partidasPendentes
        .map(p => renderMatchItem(p, userId))
        .join('');
}

/**
 * Renderiza histórico de partidas (confirmadas e aguardando adversário)
 * Limitado às 3 partidas mais recentes
 * @param {Array} partidas - Lista de partidas
 * @param {string} userId - ID do usuário
 */
function renderMatchHistory(partidas, userId) {
    const container = qs(SELECTORS.matchHistory);
    if (!container) return;
    
    // Filtra partidas para histórico
    let partidasHistorico = partidas.filter(p => {
        // Partidas confirmadas
        if (p.placarStatus === STATUS_PLACAR.CONFIRMADO) return true;
        // Partidas aguardando confirmação do adversário (usuário já inseriu)
        if (p.placarStatus === STATUS_PLACAR.PENDENTE && p.placarInseridoPor === userId) return true;
        return false;
    });
    
    // Ordena por data mais recente e limita ao máximo definido
    partidasHistorico.sort((a, b) => {
        const dataA = (a.dataPartida || a.criadoEm)?.toMillis?.() || 0;
        const dataB = (b.dataPartida || b.criadoEm)?.toMillis?.() || 0;
        return dataB - dataA;
    });
    
    const totalPartidas = partidasHistorico.length;
    partidasHistorico = partidasHistorico.slice(0, MAX_RECENT_MATCHES);
    
    if (partidasHistorico.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-gamepad empty-icon"></i>
                <p>Nenhuma partida no histórico</p>
                <span class="empty-hint">Crie partidas com seus amigos na seção "Partidas"</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = partidasHistorico
        .map(p => renderMatchItem(p, userId))
        .join('');
    
    console.log(`[Dashboard] 📜 Histórico: exibindo ${partidasHistorico.length} de ${totalPartidas} partidas`);
}

/**
 * Exibe estado de erro no Dashboard
 * @param {string} message - Mensagem de erro
 */
function renderErrorState(message) {
    const containers = [
        qs(SELECTORS.partidasPendentes),
        qs(SELECTORS.matchHistory)
    ];
    
    containers.forEach(container => {
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle error-icon"></i>
                    <p>${message || 'Erro ao carregar dados'}</p>
                    <button class="btn-retry" onclick="window.location.reload()">
                        <i class="fas fa-redo"></i> Tentar novamente
                    </button>
                </div>
            `;
        }
    });
}

// ============================================================================
// FUNÇÕES DE CARREGAMENTO DE DADOS
// ============================================================================

/**
 * Carrega dados do usuário do Firestore
 * @param {string} userId - ID do usuário
 * @returns {Promise<Object|null>}
 */
async function loadUserData(userId) {
    try {
        console.log('[Dashboard] 📥 Iniciando carregamento de dados para usuário:', userId);
        
        const userData = await getUser(userId);
        
        if (userData) {
            currentUserData = userData;
            
            // Renderiza perfil do usuário
            console.log('[Dashboard] Chamando renderUserProfile...');
            renderUserProfile(userData);
            
            // Calcula estatísticas DINAMICAMENTE a partir das partidas confirmadas
            console.log('[Dashboard] 📊 Calculando estatísticas dinamicamente...');
            const estatisticasDinamicas = await calcularEstatisticasDinamicas(userId);
            
            console.log('[Dashboard] Chamando renderKPIs com estatísticas calculadas');
            renderKPIs(estatisticasDinamicas);
        } else {
            console.error('[Dashboard] ❌ userData é null ou undefined!');
        }
        
        return userData;
    } catch (error) {
        console.error('[Dashboard] ❌ Erro ao carregar dados do usuário:', error);
        return null;
    }
}

/**
 * Carrega todas as partidas do usuário
 * @param {string} userId - ID do usuário
 * @returns {Promise<Array>}
 */
async function loadUserMatches(userId) {
    try {
        const partidas = await getPartidasUsuario(userId);
        renderPartidasPendentes(partidas, userId);
        renderMatchHistory(partidas, userId);
        return partidas;
    } catch (error) {
        console.error('[Dashboard] Erro ao carregar partidas:', error);
        renderErrorState('Erro ao carregar partidas');
        return [];
    }
}

// ============================================================================
// LISTENERS EM TEMPO REAL
// ============================================================================

/**
 * Inicia listener para atualizações do usuário em tempo real
 * @param {string} userId - ID do usuário
 */
function startUserListener(userId) {
    if (unsubscribeUserListener) {
        unsubscribeUserListener();
    }
    
    const userRef = doc(db, 'users', userId);
    
    unsubscribeUserListener = onSnapshot(userRef, async (snapshot) => {
        if (snapshot.exists()) {
            const userData = snapshot.data();
            
            console.log('[Dashboard] 🔄 Listener: Usuário atualizado');
            
            currentUserData = userData;
            renderUserProfile(userData);
            
            // Recalcula estatísticas dinamicamente quando usuário é atualizado
            const estatisticasDinamicas = await calcularEstatisticasDinamicas(userId);
            renderKPIs(estatisticasDinamicas);
        } else {
            console.error('[Dashboard] ❌ Listener: Documento do usuário não existe!');
        }
    }, (error) => {
        console.error('[Dashboard] ❌ Erro no listener de usuário:', error);
    });
}

/**
 * Inicia listener para partidas do usuário em tempo real
 * @param {string} userId - ID do usuário
 */
function startPartidasListener(userId) {
    if (unsubscribePartidasListener) {
        unsubscribePartidasListener();
    }
    
    const partidasRef = collection(db, 'partidas');
    
    // Listener para partidas onde o usuário é jogador A
    const qA = query(partidasRef, where('jogadorAId', '==', userId));
    const qB = query(partidasRef, where('jogadorBId', '==', userId));
    
    let partidasA = [];
    let partidasB = [];
    
    // Combina resultados de ambos os listeners
    const updatePartidas = async () => {
        const todasPartidas = [...partidasA, ...partidasB];
        // Remove duplicatas (caso improvável, mas seguro)
        const uniquePartidas = todasPartidas.filter((p, index, self) =>
            index === self.findIndex(t => t.id === p.id)
        );
        // Ordena por data
        uniquePartidas.sort((a, b) => {
            const dataA = a.criadoEm?.toMillis() || 0;
            const dataB = b.criadoEm?.toMillis() || 0;
            return dataB - dataA;
        });
        
        renderPartidasPendentes(uniquePartidas, userId);
        renderMatchHistory(uniquePartidas, userId);
        
        // Recalcula KPIs quando partidas são atualizadas (nova confirmação, etc)
        console.log('[Dashboard] 🔄 Partidas atualizadas, recalculando KPIs...');
        const estatisticasDinamicas = await calcularEstatisticasDinamicas(userId);
        renderKPIs(estatisticasDinamicas);
    };
    
    const unsubA = onSnapshot(qA, (snapshot) => {
        partidasA = [];
        snapshot.forEach(doc => {
            partidasA.push({ id: doc.id, ...doc.data() });
        });
        updatePartidas();
    }, (error) => {
        console.error('[Dashboard] Erro no listener de partidas A:', error);
    });
    
    const unsubB = onSnapshot(qB, (snapshot) => {
        partidasB = [];
        snapshot.forEach(doc => {
            partidasB.push({ id: doc.id, ...doc.data() });
        });
        updatePartidas();
    }, (error) => {
        console.error('[Dashboard] Erro no listener de partidas B:', error);
    });
    
    // Combina unsubscribes
    unsubscribePartidasListener = () => {
        unsubA();
        unsubB();
    };
}

// ============================================================================
// CLEANUP E LIFECYCLE
// ============================================================================

/**
 * Para todos os listeners ativos
 */
function stopListeners() {
    if (unsubscribeUserListener) {
        unsubscribeUserListener();
        unsubscribeUserListener = null;
    }
    if (unsubscribePartidasListener) {
        unsubscribePartidasListener();
        unsubscribePartidasListener = null;
    }
    if (unsubscribeRankingListener) {
        unsubscribeRankingListener();
        unsubscribeRankingListener = null;
    }
    if (unsubscribeFriendsListener) {
        unsubscribeFriendsListener();
        unsubscribeFriendsListener = null;
    }
}

/**
 * Limpa o estado do módulo
 */
function cleanup() {
    stopListeners();
    currentUserData = null;
    isInitialized = false;
    previousRankingPosition = null;
}

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

/**
 * Carrega dados do campeonato ativo do usuário
 * @param {string} userId - ID do usuário
 */
async function loadChampionshipStatus(userId) {
    try {
        const status = await getUserChampionshipStatus(userId);
        renderActiveChampionship(status.activeChampionship);
    } catch (error) {
        console.error('[Dashboard] Erro ao carregar status do campeonato:', error);
        renderActiveChampionship(null);
    }
}

/**
 * Carrega dados dos amigos e seus status online
 * @param {string} userId - ID do usuário
 */
async function loadFriendsData(userId) {
    try {
        const friends = await getFriendsList(userId);
        
        // Busca status online de cada amigo
        const onlineStatus = {};
        for (const friend of friends) {
            try {
                const userDoc = await getDoc(doc(db, 'users', friend.id));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    onlineStatus[friend.id] = {
                        online: data.online || false,
                        status: data.status || 'offline',
                        ultimoAcesso: data.ultimoAcesso
                    };
                    // Adiciona foto se disponível
                    friend.fotoUrl = data.fotoUrl || data.timeLogo || '';
                }
            } catch (err) {
                console.warn(`[Dashboard] Erro ao buscar status de ${friend.id}:`, err);
            }
        }
        
        renderSocialSummary(friends, onlineStatus);
    } catch (error) {
        console.error('[Dashboard] Erro ao carregar dados de amigos:', error);
        renderSocialSummary([], {});
    }
}

/**
 * Inicia listener para o ranking anual em tempo real
 * @param {string} userId - ID do usuário
 */
function startRankingListener(userId) {
    if (unsubscribeRankingListener) {
        unsubscribeRankingListener();
    }
    
    unsubscribeRankingListener = subscribeToAnnualStandings({}, ({ ranking }) => {
        renderRankingPosition(ranking, userId);
    });
}

/**
 * Inicia listener para amigos em tempo real
 * @param {string} userId - ID do usuário
 */
function startFriendsListener(userId) {
    if (unsubscribeFriendsListener) {
        unsubscribeFriendsListener();
    }
    
    const friendsRef = collection(db, `users/${userId}/amigos`);
    
    unsubscribeFriendsListener = onSnapshot(friendsRef, async () => {
        // Recarrega dados quando lista de amigos muda
        await loadFriendsData(userId);
    }, (error) => {
        console.error('[Dashboard] Erro no listener de amigos:', error);
    });
}

/**
 * Inicializa o Dashboard
 */
async function initDashboard() {
    const user = getCurrentUser();
    
    if (!user) {
        console.warn('[Dashboard] Usuário não autenticado');
        return;
    }
    
    // Evita reinicialização desnecessária
    if (isInitialized) {
        return;
    }
    
    isInitialized = true;
    
    try {
        // Carrega dados iniciais
        await Promise.all([
            loadUserData(user.uid),
            loadUserMatches(user.uid),
            loadChampionshipStatus(user.uid),
            loadFriendsData(user.uid)
        ]);
        
        // Inicia listeners em tempo real
        startUserListener(user.uid);
        startPartidasListener(user.uid);
        startRankingListener(user.uid);
        startFriendsListener(user.uid);
        
        console.log('[Dashboard] Inicializado com sucesso');
        
    } catch (error) {
        console.error('[Dashboard] Erro na inicialização:', error);
        renderErrorState('Erro ao carregar o Dashboard');
    }
}

// ============================================================================
// EXPORT
// ============================================================================

// Exporta função de cleanup para uso pelo sistema de rotas
export { cleanup as cleanupDashboard };

// Disponibiliza cleanup globalmente para o sistema de rotas
window.cleanupDashboard = cleanup;

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}
