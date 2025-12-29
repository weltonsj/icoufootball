/**
 * chatStatusManager.js
 * Gerenciador centralizado de status online/offline do chat
 * Implementa detecção de inatividade (12 segundos) e listeners de visibilidade
 * Convenções em PT-BR conforme PRD
 */

import { db, auth } from '../services/firebase.js';
import { doc, updateDoc, serverTimestamp, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

// ===== CONSTANTES =====
// Seguir comportamento solicitado: 1 minuto de inatividade para marcar offline
const TEMPO_INATIVIDADE_MS = 60000; // 60 segundos para marcar offline
const INTERVALO_KEEP_ALIVE_MS = 10000; // 10 segundos para keep-alive (atualizar ultimoAcesso)

// ===== ESTADO DO GERENCIADOR =====
let isNoChatRoute = false; // Se o usuário está na rota /chat
let isWindowVisible = true; // Se a janela está visível
let isWindowFocused = true; // Se a janela está focada
let keepAliveInterval = null; // Interval para keep-alive
let inactivityTimeout = null; // Timeout para marcar offline após inatividade
let isOnline = false; // Estado atual online/offline
let listenersConfigured = false; // Se os listeners globais foram configurados

/**
 * Inicializa o gerenciador de status
 * Deve ser chamado uma vez no início da aplicação
 */
export function inicializarGerenciadorStatus() {
    if (listenersConfigured) return;
    
    console.log('[StatusManager] Inicializando gerenciador de status...');
    
    // Listener de visibilidade da página
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listener de foco da janela
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    
    // Listener de fechamento da página
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    listenersConfigured = true;
    console.log('[StatusManager] Listeners globais configurados');
}

/**
 * Chamado quando o usuário ENTRA na rota /chat
 */
export function entrarNoChat() {
    console.log('[StatusManager] Entrando no chat...');
    isNoChatRoute = true;
    
    // Marcar como online imediatamente
    atualizarStatusOnline();
    
    // Iniciar keep-alive
    iniciarKeepAlive();
    
    // Cancelar timeout de inatividade (usuário voltou)
    cancelarTimeoutInatividade();
}

/**
 * Chamado quando o usuário SAI da rota /chat
 */
export function sairDoChat() {
    console.log('[StatusManager] Saindo do chat...');
    isNoChatRoute = false;
    
    // Parar keep-alive
    pararKeepAlive();
    
    // IMPORTANTE: Ao sair da sessão de chat, iniciar timeout de inatividade
    // para marcar offline após o tempo configurado (1 minuto). Isso segue
    // o comportamento do WhatsApp onde sair do chat não marca offline
    // imediatamente, mas sim após período de inatividade.
    iniciarTimeoutInatividade();
}

/**
 * Força marcar como offline (usado ao destruir chat)
 */
export function forcarOffline() {
    console.log('[StatusManager] Forçando status offline...');
    pararKeepAlive();
    cancelarTimeoutInatividade();
    atualizarStatusOffline();
}

// ===== HANDLERS DE EVENTOS =====

function handleVisibilityChange() {
    isWindowVisible = document.visibilityState === 'visible';
    console.log(`[StatusManager] Visibilidade: ${isWindowVisible ? 'visível' : 'oculta'}`);
    
    if (!isWindowVisible) {
        // Usuário minimizou ou trocou de aba
        if (isNoChatRoute) {
            // Iniciar timeout mesmo se estiver na rota chat
            iniciarTimeoutInatividade();
        }
    } else {
        // Usuário voltou a ver a página
        if (isNoChatRoute) {
            cancelarTimeoutInatividade();
            atualizarStatusOnline();
            iniciarKeepAlive();
        }
    }
}

function handleWindowFocus() {
    isWindowFocused = true;
    console.log('[StatusManager] Janela focada');
    
    if (isNoChatRoute && isWindowVisible) {
        cancelarTimeoutInatividade();
        atualizarStatusOnline();
        iniciarKeepAlive();
    }
}

function handleWindowBlur() {
    isWindowFocused = false;
    console.log('[StatusManager] Janela perdeu foco');
    
    // Se perdeu foco enquanto no chat, iniciar timeout
    if (isNoChatRoute) {
        iniciarTimeoutInatividade();
    }
}

function handleBeforeUnload() {
    // Marcar como offline ao fechar a página
    atualizarStatusOfflineSync();
}

// ===== KEEP-ALIVE =====

function iniciarKeepAlive() {
    pararKeepAlive();
    
    keepAliveInterval = setInterval(() => {
        if (isNoChatRoute && isWindowVisible && isWindowFocused) {
            atualizarStatusOnline();
        }
    }, INTERVALO_KEEP_ALIVE_MS);
    
    console.log('[StatusManager] Keep-alive iniciado');
}

function pararKeepAlive() {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
        console.log('[StatusManager] Keep-alive parado');
    }
}

// ===== TIMEOUT DE INATIVIDADE =====

function iniciarTimeoutInatividade() {
    cancelarTimeoutInatividade();
    
    inactivityTimeout = setTimeout(() => {
        console.log(`[StatusManager] Inatividade de ${TEMPO_INATIVIDADE_MS/1000}s detectada - marcando offline`);
        atualizarStatusOffline();
    }, TEMPO_INATIVIDADE_MS);
    
    console.log(`[StatusManager] Timeout de inatividade iniciado (${TEMPO_INATIVIDADE_MS/1000}s)`);
}

function cancelarTimeoutInatividade() {
    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = null;
    }
}

// ===== ATUALIZAÇÃO DE STATUS NO FIRESTORE =====

async function atualizarStatusOnline() {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    
    try {
        // Verificar se o usuário está invisível antes de atualizar
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            const statusAtual = userDoc.data()?.status;
            // Se invisível, NÃO marcar como online e NÃO atualizar ultimoAcesso
            if (statusAtual === 'invisivel') {
                console.log('[StatusManager] Usuário invisível - mantendo offline e ultimoAcesso congelado');
                return;
            }
        }
        
        // Atualizar SEMPRE online e ultimoAcesso (heartbeat a cada 10s)
        console.log('[Audit] chatStatusManager.atualizarStatusOnline -> gravando online:true e ultimoAcesso (heartbeat) para', userId);
        await updateDoc(doc(db, 'users', userId), {
            online: true,
            ultimoAcesso: serverTimestamp()
        });
        
        if (!isOnline) {
            isOnline = true;
            console.log('[StatusManager] Status: ONLINE');
        }
    } catch (error) {
        console.error('[StatusManager] Erro ao marcar online:', error);
    }
}

async function atualizarStatusOffline() {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    
    try {
        // IMPORTANTE: Quando fica offline por inatividade, atualizar o
        // `ultimoAcesso` para o momento exato em que foi marcado offline,
        // EXCETO se o usuário estiver com status 'invisivel' — nesse caso
        // preservamos o ultimoAcesso definido quando ele ficou invisível.
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        const statusAtual = userDoc.exists() ? userDoc.data()?.status : null;

        if (statusAtual === 'invisivel') {
            console.log('[Audit] chatStatusManager.atualizarStatusOffline -> usuário invisível, preservando ultimoAcesso for', userId);
            await updateDoc(userRef, { online: false });
            isOnline = false;
            return;
        }

        const updateData = {
            online: false,
            ultimoAcesso: serverTimestamp()
        };
        console.log('[Audit] chatStatusManager.atualizarStatusOffline -> gravando online:false e ultimoAcesso (offline) para', userId);
        await updateDoc(userRef, updateData);
        isOnline = false;
        console.log('[StatusManager] Status: OFFLINE - ultimoAcesso atualizado para o momento do offline');
    } catch (error) {
        console.error('[StatusManager] Erro ao marcar offline:', error);
    }
}

// Versão síncrona para beforeunload (usando sendBeacon)
function atualizarStatusOfflineSync() {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    
    // Tentar atualizar de forma assíncrona também
    atualizarStatusOffline().catch(() => {});
}

// ===== FUNÇÕES DE DEBUG =====

export function getStatusInfo() {
    return {
        isNoChatRoute,
        isWindowVisible,
        isWindowFocused,
        isOnline,
        tempoInatividade: TEMPO_INATIVIDADE_MS
    };
}

// ===== EXPORTAR PARA USO GLOBAL =====
if (typeof window !== 'undefined') {
    window.ChatStatusManager = {
        inicializar: inicializarGerenciadorStatus,
        entrarNoChat,
        sairDoChat,
        forcarOffline,
        getInfo: getStatusInfo
    };
}

console.log('[StatusManager] Módulo carregado');
