/**
 * chatFunctions.js
 * Lógica de UI e eventos do chat
 * Inicializado automaticamente pelo route.js
 */

import * as ChatService from '../services/chatService.js';
import { auth, db } from '../services/firebase.js';
import { showModal } from '../components/modal.js';
import { showSpinner, hideSpinner } from '../components/spinner.js';
import { 
    doc, updateDoc, collection, query, where, getDocs, writeBatch 
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Importar gerenciador de status
let ChatStatusManager = null;

// Estado global do chat
let conversaAtualId = null;
let todasConversas = [];
let conversasArquivadas = [];
let mostrandoArquivadas = false;
let unsubscribeConversas = null;
let unsubscribeMensagens = null;
let unsubscribeStatus = null;
let enviarComEnter = true;
let digitandoTimeout = null;

// Estado de amizade para conversa atual
let amigoExcluido = false;
let amigoIdAtual = null;

// Cache de temas
let temasCarregados = null;

// Controle de inicialização (evitar duplicação de listeners)
let eventosConfigurados = false;
let chatInicializado = false;

// ===== INICIALIZAÇÃO =====
export async function inicializarChat() {
    // CORREÇÃO: Evitar inicialização duplicada
    if (chatInicializado) {
        console.log('[Chat] Chat já inicializado, ignorando...');
        return;
    }
    
    console.log('[Chat] Inicializando sistema de chat...');
    chatInicializado = true;

    // Carregar gerenciador de status dinamicamente
    try {
        const statusModule = await import('../utils/chatStatusManager.js');
        ChatStatusManager = statusModule;
        ChatStatusManager.inicializarGerenciadorStatus();
        ChatStatusManager.entrarNoChat();
    } catch (error) {
        console.warn('[Chat] Erro ao carregar ChatStatusManager:', error);
        // Fallback para método antigo
        ChatService.atualizarStatusOnline(true);
    }

    // Ocultar header do chat (não há conversa selecionada)
    ocultarHeaderChat();

    // Mostrar placeholder vazio
    mostrarSemConversas();

    // Listener para fechar página (apenas uma vez)
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Configurar eventos da UI (apenas se não configurados)
    configurarEventos();

    // Adicionar botão de arquivadas
    adicionarBotaoArquivadas();

    // Carregar conversas (sem pré-selecionar)
    await carregarConversas();

    // Carregar e aplicar temas personalizados
    await carregarEAplicarTemas();

    // CORREÇÃO: Carregar status do usuário logado e atualizar status-indicator
    await carregarStatusUsuarioLogadoEAtualizar();

    // Expor destruirChat globalmente para route.js
    window.destruirChat = destruirChat;

    console.log('[Chat] Sistema de chat inicializado');
}

export function destruirChat() {
    console.log('[Chat] Destruindo listeners do chat...');

    // Notificar gerenciador de status que saiu do chat
    if (ChatStatusManager) {
        ChatStatusManager.sairDoChat();
    } else {
        // Fallback
        ChatService.atualizarStatusOnline(false);
        ChatService.atualizarUltimoAcesso();
    }
    
    // IMPORTANTE: Limpar conversa ativa no Firestore
    ChatService.atualizarConversaAtiva(null).catch(err => 
        console.warn('[Chat] Erro ao limpar conversa ativa:', err)
    );

    if (unsubscribeConversas) {
        unsubscribeConversas();
        unsubscribeConversas = null;
    }
    if (unsubscribeMensagens) {
        unsubscribeMensagens();
        unsubscribeMensagens = null;
    }
    if (unsubscribeStatus) {
        unsubscribeStatus();
        unsubscribeStatus = null;
    }

    // Limpar estado
    conversaAtualId = null;
    
    // CORREÇÃO: Resetar variáveis de controle para permitir reinicialização
    chatInicializado = false;
    eventosConfigurados = false;

    window.removeEventListener('beforeunload', handleBeforeUnload);
}

function handleBeforeUnload() {
    if (ChatStatusManager) {
        ChatStatusManager.forcarOffline();
    } else {
        ChatService.atualizarStatusOnline(false);
    }
}

// ===== CARREGAR CONVERSAS =====
async function carregarConversas() {
    const container = document.querySelector('.conversation-list');
    if (container) {
        container.innerHTML = `
            <div class="loading-conversas" style="text-align: center; padding: 20px; color: #AAA;">
                <i class="fas fa-spinner fa-spin"></i> Carregando conversas...
            </div>
        `;
    }

    unsubscribeConversas = await ChatService.carregarConversas((conversas) => {
        // Separar conversas normais e arquivadas
        todasConversas = conversas.filter(c => !c.arquivada);
        conversasArquivadas = conversas.filter(c => c.arquivada);

        // Renderizar conforme modo ativo
        if (mostrandoArquivadas) {
            renderizarConversasArquivadas();
        } else {
            renderizarConversas(todasConversas);
        }

        // NUNCA pré-selecionar conversas automaticamente
        // O usuário deve escolher manualmente
        
        // Se não há conversas, mostrar mensagem
        if (todasConversas.length === 0 && !conversaAtualId) {
            mostrarSemConversas();
        }
    });
}

function renderizarConversas(conversas) {
    const lista = document.querySelector('.conversation-list');
    if (!lista) return;

    if (conversas.length === 0) {
        lista.innerHTML = `
            <div class="empty-conversations" style="text-align: center; padding: 30px; color: #AAA;">
                <i class="fas fa-comments" style="font-size: 2em; margin-bottom: 10px; display: block;"></i>
                <p>Nenhuma conversa encontrada</p>
                <small>Inicie uma conversa com um amigo!</small>
            </div>
        `;
        return;
    }

    lista.innerHTML = conversas.map(c => {
        const nome = ChatService.sanitizarTexto(c.nomeAmigo || 'Usuário');
        const ultimaMsg = ChatService.sanitizarTexto(c.ultimaMensagem || 'Sem mensagens');
        const foto = c.fotoAmigo || `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=2B2B2B&color=FD8A24`;
        const isActive = c.id === conversaAtualId;

        return `
            <article class="conversation-item ${isActive ? 'active' : ''}" 
                     data-id="${c.id}" 
                     data-amigo-id="${c.amigoId || ''}">
                <img src="${foto}" alt="Avatar ${nome}" class="avatar-small" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=2B2B2B&color=FD8A24'">
                <div class="conversation-info">
                    <span class="conversation-name">${nome}</span>
                    <span class="last-message">${ultimaMsg}</span>
                </div>
                ${c.naoLidas > 0 ? `<span class="unread-count ${isActive ? 'active' : ''}">${c.naoLidas}</span>` : ''}
            </article>
        `;
    }).join('');

    // CORREÇÃO: NÃO adicionar listeners aqui - usar event delegation configurado uma vez em configurarEventos()
}

function mostrarSemConversas() {
    const chatMain = document.querySelector('.chat-main');
    if (!chatMain) return;

    const messagesArea = chatMain.querySelector('.chat-messages');
    if (messagesArea) {
        messagesArea.innerHTML = `
            <div class="empty-chat" style="
                display: flex; flex-direction: column; align-items: center; 
                justify-content: center; height: 100%; color: #AAA; text-align: center;
            ">
                <i class="fas fa-comment-dots" style="font-size: 4em; margin-bottom: 20px; opacity: 0.5;"></i>
                <h3 style="margin-bottom: 10px;">Nenhuma conversa selecionada</h3>
                <p>Selecione uma conversa ou inicie um novo chat com um amigo.</p>
            </div>
        `;
    }
    
    // Ocultar input quando não há conversa selecionada
    ocultarInputChat();
}

/**
 * Oculta o container de input do chat
 * Usado quando nenhuma conversa está selecionada
 */
function ocultarInputChat() {
    const inputContainer = document.querySelector('.chat-input-container');
    if (inputContainer) {
        inputContainer.style.display = 'none';
    }
}

/**
 * Exibe o container de input do chat
 * Usado quando uma conversa é selecionada
 */
function exibirInputChat() {
    const inputContainer = document.querySelector('.chat-input-container');
    if (inputContainer) {
        inputContainer.style.display = 'flex';
    }
}

// ===== CONTROLE DE VISIBILIDADE DO HEADER =====
/**
 * Oculta o cabeçalho do chat (chat-recipient-info)
 * Usado quando nenhuma conversa está selecionada
 */
function ocultarHeaderChat() {
    const recipientInfo = document.querySelector('.chat-recipient-info');
    const recipientDetails = document.querySelector('.recipient-details');
    
    if (recipientInfo) {
        recipientInfo.style.display = 'none';
    }
    if (recipientDetails) {
        recipientDetails.style.display = 'none';
    }
}

/**
 * Exibe o cabeçalho do chat (chat-recipient-info)
 * Usado quando uma conversa é selecionada
 */
function exibirHeaderChat() {
    const recipientInfo = document.querySelector('.chat-recipient-info');
    const recipientDetails = document.querySelector('.recipient-details');
    
    if (recipientInfo) {
        recipientInfo.style.display = 'flex';
    }
    if (recipientDetails) {
        recipientDetails.style.display = 'flex';
    }
}

// ===== SELECIONAR CONVERSA =====
// Flag para evitar cliques duplos durante carregamento
let selecionandoConversa = false;

async function selecionarConversa(conversaId) {
    if (!conversaId) return;
    
    // CORREÇÃO CRÍTICA: Evitar race condition de cliques duplos
    if (selecionandoConversa) {
        console.log('[Chat] Seleção em andamento, ignorando clique...');
        return;
    }
    
    // Se já está nesta conversa, apenas atualizar destaque visual
    if (conversaId === conversaAtualId) {
        atualizarDestaqueConversaAtiva();
        return;
    }
    
    selecionandoConversa = true;
    console.log('[Chat] Selecionando conversa:', conversaId);

    try {
        // 1. CANCELAR LISTENERS ANTERIORES PRIMEIRO
        if (unsubscribeMensagens) {
            unsubscribeMensagens();
            unsubscribeMensagens = null;
        }
        if (unsubscribeStatus) {
            unsubscribeStatus();
            unsubscribeStatus = null;
        }

        // 2. ATUALIZAR ESTADO GLOBAL
        conversaAtualId = conversaId;
        amigoExcluido = false;
        amigoIdAtual = null;

        // 3. BUSCAR DADOS DA CONVERSA
        const conversa = todasConversas.find(c => c.id === conversaId);
        if (!conversa) {
            console.warn('[Chat] Conversa não encontrada:', conversaId);
            selecionandoConversa = false;
            return;
        }

        amigoIdAtual = conversa.amigoId;

        // 4. ATUALIZAR UI IMEDIATAMENTE (antes de awaits)
        exibirHeaderChat();
        atualizarCabecalhoChat(conversa, false); // Primeiro sem bloqueio
        atualizarDestaqueConversaAtiva();
        
        // 5. Mostrar loading de mensagens
        const messagesContainer = document.querySelector('.chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="loading-messages" style="text-align: center; padding: 40px; color: #AAA;">
                    <i class="fas fa-spinner fa-spin"></i> Carregando mensagens...
                </div>
            `;
        }

        // 6. VERIFICAR AMIZADE (async mas não bloqueia UI)
        const userId = auth.currentUser?.uid;
        if (userId && conversa.amigoId) {
            const saoAmigos = await ChatService.verificarSaoAmigos(userId, conversa.amigoId);
            amigoExcluido = !saoAmigos;
            
            if (amigoExcluido) {
                atualizarCabecalhoChat(conversa, true);
                bloquearInterfaceAmigoExcluido();
            }
        }

        // 7. SE NÃO EXCLUÍDO, CARREGAR STATUS E RESTAURAR INTERFACE
        if (!amigoExcluido) {
            desbloquearInterface();
            
            // Carregar status IMEDIATAMENTE (resolve problema do primeiro clique)
            if (conversa.amigoId) {
                try {
                    const statusInicial = await ChatService.buscarStatusAmigo(conversa.amigoId);
                    atualizarStatusRecipiente(statusInicial, conversaId);
                } catch (err) {
                    console.warn('[Chat] Erro ao buscar status inicial:', err);
                    // Fallback: mostrar offline
                    const statusEl = document.querySelector('.recipient-status');
                    if (statusEl) {
                        statusEl.textContent = 'offline';
                        statusEl.style.color = '#AAA';
                    }
                }
                
                // Depois iniciar listener para atualizações em tempo real
                unsubscribeStatus = ChatService.escutarStatusAmigo(conversa.amigoId, (status) => {
                    atualizarStatusRecipiente(status, conversaId);
                });
            }

            // Marcar como entregue e lida (não bloqueia UI)
            ChatService.marcarComoEntregue(conversaId).catch(err => 
                console.warn('[Chat] Erro ao marcar entregue:', err)
            );
            ChatService.marcarComoLida(conversaId).catch(err => 
                console.warn('[Chat] Erro ao marcar lida:', err)
            );
            
            // IMPORTANTE: Atualizar conversa ativa no Firestore para lógica de ticks
            ChatService.atualizarConversaAtiva(conversaId).catch(err => 
                console.warn('[Chat] Erro ao atualizar conversa ativa:', err)
            );
        }

        // 8. CARREGAR MENSAGENS
        unsubscribeMensagens = ChatService.carregarMensagens(conversaId, (mensagens) => {
            renderizarMensagens(mensagens);
        });

    } catch (error) {
        console.error('[Chat] Erro ao selecionar conversa:', error);
        showModal('error', 'Erro', 'Não foi possível carregar a conversa');
    } finally {
        selecionandoConversa = false;
    }
}

/**
 * Atualiza apenas o destaque visual da conversa ativa (sem recriar elementos)
 */
function atualizarDestaqueConversaAtiva() {
    document.querySelectorAll('.conversation-item').forEach(item => {
        if (item.dataset.id === conversaAtualId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

/**
 * Bloqueia a interface quando o amigo foi excluído
 */
function bloquearInterfaceAmigoExcluido() {
    const inputArea = document.querySelector('.chat-input-area');
    const statusEl = document.querySelector('.recipient-status');
    
    if (inputArea) {
        inputArea.innerHTML = `
            <div style="
                padding: 15px 20px;
                text-align: center;
                color: #AAA;
                background: rgba(0,0,0,0.3);
                border-radius: 20px;
                font-size: 0.9em;
            ">
                <i class="fas fa-ban" style="margin-right: 8px;"></i>
                Usuário não está mais na sua lista de amigos
            </div>
        `;
    }
    
    if (statusEl) {
        statusEl.textContent = '';
        statusEl.style.display = 'none';
    }
}

/**
 * Desbloqueia a interface (restaura input normal)
 * CORREÇÃO: Exibe chat-input-container e habilita todos os elementos
 */
function desbloquearInterface() {
    const inputArea = document.querySelector('.chat-input-area');
    const statusEl = document.querySelector('.recipient-status');
    const searchInput = document.querySelector('.search-chat input');
    
    if (statusEl) {
        statusEl.style.display = '';
    }
    
    // Habilitar busca de conversas
    if (searchInput) {
        searchInput.disabled = false;
    }
    
    // Verificar se a área de input existe e tem o input de mensagem
    const existingInput = inputArea?.querySelector('#chat-message-input');
    const existingContainer = inputArea?.querySelector('.chat-input-container');
    const btnSend = inputArea?.querySelector('#btn-send, .btn-send');
    const btnAttach = inputArea?.querySelector('#btn-attach, .btn-attach');
    
    // Se o container existe, exibir e habilitar elementos
    if (existingContainer) {
        existingContainer.style.display = 'flex';
        if (existingInput) {
            existingInput.disabled = false;
            existingInput.placeholder = 'Digite uma mensagem...';
        }
        if (btnSend) btnSend.disabled = false;
        if (btnAttach) btnAttach.disabled = false;
        return;
    }
    
    // Só recria se realmente foi removido (ex: após bloquearInterfaceAmigoExcluido)
    if (inputArea && !existingContainer) {
        inputArea.innerHTML = `
            <div class="chat-input-container" style="display: flex;">
                <input type="file" id="chat-image-input" accept="image/*" hidden>
                <button class="btn-attach" id="btn-attach" title="Enviar imagem">
                    <i class="fas fa-image"></i>
                </button>
                <input type="text" id="chat-message-input" placeholder="Digite uma mensagem..." autocomplete="off">
                <button class="btn-send" id="btn-send">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        `;
        // NÃO reconfigurar eventos aqui - já estão configurados via event delegation
    }
}

/**
 * Configura eventos do input de mensagem
 */
function configurarEventosInput() {
    const input = document.getElementById('chat-message-input');
    const btnSend = document.getElementById('btn-send');
    const btnAttach = document.getElementById('btn-attach');
    const imageInput = document.getElementById('chat-image-input');
    
    if (input) {
        input.addEventListener('keypress', handleKeyPress);
        input.addEventListener('input', handleTyping);
    }
    
    if (btnSend) {
        btnSend.addEventListener('click', enviarMensagem);
    }
    
    if (btnAttach && imageInput) {
        btnAttach.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', handleImageUpload);
    }
}

function atualizarCabecalhoChat(conversa, bloqueado = false) {
    const img = document.querySelector('.chat-recipient-info img');
    const nome = document.querySelector('.recipient-name');
    const status = document.querySelector('.recipient-status');

    const nomeAmigo = conversa.nomeAmigo || 'Usuário';
    
    // Se amigo foi excluído, não mostrar foto
    const fotoAmigo = bloqueado 
        ? 'https://ui-avatars.com/api/?name=U&background=3A3A3A&color=666'
        : (conversa.fotoAmigo || `https://ui-avatars.com/api/?name=${encodeURIComponent(nomeAmigo)}&background=2B2B2B&color=FD8A24`);

    if (img) {
        img.src = fotoAmigo;
        img.alt = bloqueado ? 'Usuário' : `Avatar ${nomeAmigo}`;
        if (!bloqueado) {
            img.onerror = () => {
                img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nomeAmigo)}&background=2B2B2B&color=FD8A24`;
            };
        }
    }
    if (nome) nome.textContent = nomeAmigo;
    if (status) {
        if (bloqueado) {
            status.textContent = '';
            status.style.display = 'none';
        } else {
            status.textContent = 'Carregando...';
            status.style.display = '';
        }
    }
}

function atualizarStatusRecipiente(status, conversaId) {
    const statusEl = document.querySelector('.recipient-status');
    if (!statusEl) return;

    // Status do usuário (Disponível, Ocupado, Ausente, Invisível)
    const userStatus = status.status || 'disponivel';

    // CORREÇÃO DEFINITIVA: Verificar se online === true
    // Se online = false, SEMPRE mostrar visto por último
    const isOnline = status.online === true;

    // Prioridade 1: Digitando nesta conversa específica (só se online)
    if (isOnline && status.digitando?.[conversaId]) {
        statusEl.textContent = 'digitando…';
        statusEl.style.color = '#FD8A24';
        return;
    }

    // Prioridade 2: Status invisível - sempre mostra visto por último
    if (userStatus === 'invisivel') {
        exibirVistoUltimo(statusEl, status.ultimoAcesso);
        return;
    }

    // Prioridade 3: Online e status do usuário
    if (isOnline) {
        // Mostrar status do usuário
        switch(userStatus) {
            case 'disponivel':
                statusEl.textContent = 'online';
                statusEl.style.color = '#28a745';
                break;
            case 'ocupado':
                statusEl.textContent = 'ocupado';
                statusEl.style.color = '#dc3545';
                break;
            case 'ausente':
                statusEl.textContent = 'ausente';
                statusEl.style.color = '#ffc107';
                break;
            default:
                statusEl.textContent = 'online';
                statusEl.style.color = '#28a745';
        }
        return;
    }

    // Prioridade 4: Offline - mostrar visto por último (estilo WhatsApp)
    // Como no WhatsApp: se não está online, mostra quando foi visto pela última vez
    exibirVistoUltimo(statusEl, status.ultimoAcesso);
}

/**
 * Função auxiliar para exibir "visto por último" de forma padronizada (estilo WhatsApp)
 */
function exibirVistoUltimo(statusEl, ultimoAcesso) {
    if (!ultimoAcesso) {
        statusEl.textContent = 'offline';
        statusEl.style.color = '#AAA';
        return;
    }

    const data = ultimoAcesso.toDate?.() || new Date(ultimoAcesso);
    const agora = new Date();
    const diferenca = Math.floor((agora - data) / 1000); // segundos
    
    // Menos de 1 minuto
    if (diferenca < 60) {
        statusEl.textContent = 'visto por último agora';
    }
    // Menos de 1 hora
    else if (diferenca < 3600) {
        const minutos = Math.floor(diferenca / 60);
        statusEl.textContent = `visto por último há ${minutos} min`;
    }
    // Hoje
    else if (agora.toDateString() === data.toDateString()) {
        const hora = data.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        statusEl.textContent = `visto por último às ${hora}`;
    }
    // Ontem
    else if (agora.getDate() - data.getDate() === 1 && agora.getMonth() === data.getMonth()) {
        const hora = data.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        statusEl.textContent = `visto por último ontem às ${hora}`;
    }
    // Data anterior
    else {
        const dataFormatada = data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-numeric'
        });
        statusEl.textContent = `visto por último em ${dataFormatada}`;
    }
    statusEl.style.color = '#AAA';
}

// ===== RENDERIZAR MENSAGENS =====
function renderizarMensagens(mensagens) {
    const container = document.querySelector('.chat-messages');
    if (!container) return;

    const userId = auth.currentUser?.uid;

    if (mensagens.length === 0) {
        container.innerHTML = `
            <div class="empty-messages" style="
                display: flex; flex-direction: column; align-items: center; 
                justify-content: center; height: 100%; color: #AAA; text-align: center;
            ">
                <i class="fas fa-paper-plane" style="font-size: 3em; margin-bottom: 15px; opacity: 0.5;"></i>
                <p>Nenhuma mensagem ainda</p>
                <small>Envie a primeira mensagem!</small>
            </div>
        `;
        return;
    }

    container.innerHTML = mensagens.map(m => {
        const isSent = m.remetenteId === userId;
        const dataEnvio = m.dataEnvio?.toDate?.() || (m.dataEnvio ? new Date(m.dataEnvio) : new Date());
        const hora = dataEnvio.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        let conteudoHtml = ChatService.sanitizarTexto(m.conteudo || '');
        if (m.tipo === 'imagem' && m.urlImagem) {
            conteudoHtml = `
                <img src="${m.urlImagem}" alt="Imagem" 
                     style="max-width: 200px; max-height: 200px; border-radius: 8px; cursor: pointer;"
                     onclick="window.open('${m.urlImagem}', '_blank')"
                     onerror="this.src='https://via.placeholder.com/200x150?text=Imagem+Expirada'">
            `;
        }

        // Sistema de ticks (WhatsApp) - CORES AJUSTADAS
        // ✓ cinza = enviado
        // ✓✓ cinza = entregue  
        // ✓✓ azul = lido
        let tickIcon = '';
        if (isSent) {
            if (m.lida) {
                // ✓✓ Dois ticks azuis (lida) - var(--action-blue) = #4FC3F7
                tickIcon = `
                    <span class="message-ticks lida" style="margin-left: 5px; font-size: 0.75em;">
                        <i class="fas fa-check" style="color: var(--action-blue, #4FC3F7);"></i>
                        <i class="fas fa-check" style="color: var(--action-blue, #4FC3F7); margin-left: -4px;"></i>
                    </span>
                `;
            } else if (m.entregue) {
                // ✓✓ Dois ticks cinza (entregue mas não lida)
                tickIcon = `
                    <span class="message-ticks entregue" style="margin-left: 5px; font-size: 0.75em;">
                        <i class="fas fa-check" style="color: var(--chat-bubble-received, #AAA);"></i>
                        <i class="fas fa-check" style="color: var(--chat-bubble-received, #AAA); margin-left: -4px;"></i>
                    </span>
                `;
            } else if (m.enviado !== false) {
                // ✓ Um tick cinza (apenas enviada)
                tickIcon = `
                    <span class="message-ticks enviado" style="margin-left: 5px; font-size: 0.75em;">
                        <i class="fas fa-check" style="color: var(--chat-bubble-received, #AAA);"></i>
                    </span>
                `;
            }
        }

        return `
            <div class="message ${isSent ? 'sent' : 'received'}" data-id="${m.id}">
                <div class="message-bubble">
                    <span class="message-text">${conteudoHtml}</span>
                    <span class="message-time">${hora}${tickIcon}</span>
                </div>
            </div>
        `;
    }).join('');

    // Scroll para última mensagem
    requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
    });
}

// ===== ARQUIVAMENTO DE CONVERSAS =====
/**
 * Adiciona botão de "Arquivadas" abaixo do search-chat
 */
function adicionarBotaoArquivadas() {
    const searchChat = document.querySelector('.search-chat');
    if (!searchChat) return;

    // Verificar se já existe
    if (document.getElementById('btn-arquivadas')) return;

    const btnArquivadas = document.createElement('div');
    btnArquivadas.id = 'btn-arquivadas';
    btnArquivadas.className = 'btn-arquivadas';
    // btnArquivadas.style.cssText = `
    //     display: flex; align-items: center; gap: 10px;
    //     padding: 10px 15px; margin-top: 10px;
    //     background: rgba(253, 138, 36, 0.1);
    //     border-radius: 10px; cursor: pointer;
    //     transition: background 0.2s ease;
    //     color: var(--text-color);
    // `;
    btnArquivadas.innerHTML = `
        <i class="fas fa-archive" style="color: #FD8A24;"></i>
        <span>Arquivadas <span id="arquivadas-count" style="
            background: #FD8A24; color: #1A1A1A; 
            padding: 2px 8px; border-radius: 10px; 
            font-size: 0.8em; font-weight: bold;
        ">0</span></span>
    `;

    btnArquivadas.addEventListener('mouseenter', () => {
        btnArquivadas.style.background = 'rgba(253, 138, 36, 0.2)';
    });
    btnArquivadas.addEventListener('mouseleave', () => {
        btnArquivadas.style.background = 'rgba(253, 138, 36, 0.1)';
    });

    btnArquivadas.addEventListener('click', alternarModoArquivadas);

    searchChat.parentElement.insertBefore(btnArquivadas, searchChat.nextSibling);

    // Atualizar contador
    atualizarContadorArquivadas();
}

/**
 * Atualiza o contador de conversas arquivadas
 */
function atualizarContadorArquivadas() {
    const counter = document.getElementById('arquivadas-count');
    if (counter) {
        counter.textContent = conversasArquivadas.length;
        counter.style.display = conversasArquivadas.length > 0 ? 'inline' : 'none';
    }
}

/**
 * Alterna entre conversas normais e arquivadas
 */
function alternarModoArquivadas() {
    mostrandoArquivadas = !mostrandoArquivadas;

    const btn = document.getElementById('btn-arquivadas');
    if (btn) {
        const icon = btn.querySelector('i');
        const span = btn.querySelector('span');

        if (mostrandoArquivadas) {
            icon.className = 'fas fa-arrow-left';
            span.childNodes[0].textContent = 'Voltar para conversas ';
            renderizarConversasArquivadas();
        } else {
            icon.className = 'fas fa-archive';
            span.childNodes[0].textContent = 'Arquivadas ';
            renderizarConversas(todasConversas);
        }
    }
}

/**
 * Renderiza a lista de conversas arquivadas
 */
function renderizarConversasArquivadas() {
    const lista = document.querySelector('.conversation-list');
    if (!lista) return;

    if (conversasArquivadas.length === 0) {
        lista.innerHTML = `
            <div class="empty-conversations" style="text-align: center; padding: 30px; color: #AAA;">
                <i class="fas fa-archive" style="font-size: 2em; margin-bottom: 10px; display: block;"></i>
                <p>Nenhuma conversa arquivada</p>
                <small>As conversas arquivadas aparecem aqui</small>
            </div>
        `;
        return;
    }

    lista.innerHTML = conversasArquivadas.map(c => {
        const nome = ChatService.sanitizarTexto(c.nomeAmigo || 'Usuário');
        const ultimaMsg = ChatService.sanitizarTexto(c.ultimaMensagem || 'Sem mensagens');
        const foto = c.fotoAmigo || `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=2B2B2B&color=FD8A24`;

        return `
            <article class="conversation-item arquivada" data-id="${c.id}">
                <img src="${foto}" alt="Avatar ${nome}" class="avatar-small">
                <div class="conversation-info">
                    <span class="conversation-name">${nome}</span>
                    <span class="last-message">${ultimaMsg}</span>
                </div>
                <button class="btn-desarquivar" data-id="${c.id}" style="
                    background: #FD8A24; color: #1A1A1A; border: none;
                    border-radius: 20px; padding: 5px 12px; cursor: pointer;
                    font-size: 0.8em; font-weight: bold;
                    transition: all 0.2s ease;
                " title="Desarquivar">
                    <i class="fas fa-box-open"></i>
                </button>
            </article>
        `;
    }).join('');

    // Event listeners para desarquivar
    lista.querySelectorAll('.btn-desarquivar').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const conversaId = btn.dataset.id;
            await desarquivarConversa(conversaId);
        });

        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.1)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
        });
    });
}

/**
 * Arquiva uma conversa
 * @param {string} conversaId - ID da conversa
 */
async function arquivarConversa(conversaId) {
    if (!conversaId) return;

    try {
        await ChatService.arquivarConversa(conversaId, true);
        showModal('success', 'Sucesso', 'Conversa arquivada');

        // Limpar seleção se era a conversa ativa
        if (conversaAtualId === conversaId) {
            conversaAtualId = null;
            ocultarHeaderChat();
            mostrarSemConversas();
        }

        atualizarContadorArquivadas();
    } catch (error) {
        console.error('[Chat] Erro ao arquivar:', error);
        showModal('error', 'Erro', 'Não foi possível arquivar a conversa');
    }
}

/**
 * Desarquiva uma conversa
 * @param {string} conversaId - ID da conversa
 */
async function desarquivarConversa(conversaId) {
    if (!conversaId) return;

    try {
        await ChatService.arquivarConversa(conversaId, false);
        showModal('success', 'Sucesso', 'Conversa desarquivada');
        atualizarContadorArquivadas();
    } catch (error) {
        console.error('[Chat] Erro ao desarquivar:', error);
        showModal('error', 'Erro', 'Não foi possível desarquivar a conversa');
    }
}

/**
 * Exibe modal de confirmação para excluir conversa (PRD proíbe alerts/confirms)
 * @param {string} conversaId - ID da conversa a excluir
 */
function mostrarModalConfirmacaoExcluir(conversaId) {
    const modal = document.createElement('div');
    modal.className = 'modal-confirmacao-excluir';
    modal.innerHTML = `
        <div class="modal-overlay-excluir" style="
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); z-index: 9999;
        "></div>
        <div class="modal-content-excluir" style="
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #2B2B2B 0%, #1f1f1f 100%);
            padding: 30px; border-radius: 15px; z-index: 10000;
            min-width: 350px; text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            border: 1px solid #3A3A3A;
        ">
            <div class="modal-icon" style="
                width: 60px; height: 60px; margin: 0 auto 20px;
                background: rgba(220, 53, 69, 0.2);
                border-radius: 50%; display: flex;
                align-items: center; justify-content: center;
            ">
                <i class="fas fa-trash-alt" style="font-size: 1.8em; color: #dc3545;"></i>
            </div>
            <h3 style="color: #E0E0E0; margin-bottom: 15px; font-size: 1.3em;">
                Excluir Conversa
            </h3>
            <p style="color: #AAA; margin-bottom: 25px; line-height: 1.5;">
                Deseja realmente excluir esta conversa?<br>
                <small style="color: #888;">Esta ação não pode ser desfeita.</small>
            </p>
            <div class="modal-buttons" style="display: flex; gap: 15px; justify-content: center;">
                <button class="btn-cancelar" style="
                    padding: 12px 30px; border: none; border-radius: 8px;
                    background: #3A3A3A; color: #E0E0E0;
                    cursor: pointer; font-size: 1em; transition: all 0.2s ease;
                ">Cancelar</button>
                <button class="btn-excluir" style="
                    padding: 12px 30px; border: none; border-radius: 8px;
                    background: #dc3545; color: white;
                    cursor: pointer; font-size: 1em; font-weight: bold;
                    transition: all 0.2s ease;
                ">Excluir</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Hover effects
    const btnCancelar = modal.querySelector('.btn-cancelar');
    const btnExcluir = modal.querySelector('.btn-excluir');

    btnCancelar.addEventListener('mouseenter', () => {
        btnCancelar.style.background = '#4A4A4A';
    });
    btnCancelar.addEventListener('mouseleave', () => {
        btnCancelar.style.background = '#3A3A3A';
    });

    btnExcluir.addEventListener('mouseenter', () => {
        btnExcluir.style.background = '#c82333';
        btnExcluir.style.transform = 'scale(1.02)';
    });
    btnExcluir.addEventListener('mouseleave', () => {
        btnExcluir.style.background = '#dc3545';
        btnExcluir.style.transform = 'scale(1)';
    });

    // Event listeners
    btnCancelar.addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-overlay-excluir').addEventListener('click', () => modal.remove());

    btnExcluir.addEventListener('click', async () => {
        try {
            btnExcluir.disabled = true;
            btnExcluir.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';
            
            await ChatService.excluirConversa(conversaId);
            modal.remove();
            
            showModal('success', 'Sucesso', 'Conversa excluída com sucesso');
            
            // Limpar estado e atualizar interface
            conversaAtualId = null;
            ocultarHeaderChat();
            mostrarSemConversas();
        } catch (error) {
            console.error('[Chat] Erro ao excluir conversa:', error);
            modal.remove();
            showModal('error', 'Erro', 'Não foi possível excluir a conversa');
        }
    });
}

// ===== CONFIGURAR EVENTOS =====
function configurarEventos() {
    // CORREÇÃO: Evitar duplicação de listeners
    if (eventosConfigurados) {
        console.log('[Chat] Eventos já configurados, ignorando...');
        return;
    }
    eventosConfigurados = true;
    
    // CORREÇÃO CRÍTICA: Event delegation para conversation-list (evita duplicação de listeners)
    const conversationList = document.querySelector('.conversation-list');
    if (conversationList) {
        conversationList.addEventListener('click', (e) => {
            const conversationItem = e.target.closest('.conversation-item');
            if (conversationItem && conversationItem.dataset.id) {
                selecionarConversa(conversationItem.dataset.id);
            }
        });
    }
    
    // Busca de conversas
    const searchInput = document.querySelector('.search-chat input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const filtradas = ChatService.filtrarConversas(todasConversas, e.target.value);
            renderizarConversas(filtradas);
        });
    }

    // Input de mensagem - usar event delegation também
    const chatInputArea = document.querySelector('.chat-input-area');
    if (chatInputArea) {
        // Event delegation para input e botões dentro de chat-input-area
        chatInputArea.addEventListener('keypress', async (e) => {
            if (e.target.matches('input[type="text"], #chat-message-input') && e.key === 'Enter' && enviarComEnter) {
                e.preventDefault();
                await enviarMensagem();
            }
        });

        chatInputArea.addEventListener('input', (e) => {
            if (e.target.matches('input[type="text"], #chat-message-input') && conversaAtualId) {
                ChatService.setDigitando(conversaAtualId, true);
                clearTimeout(digitandoTimeout);
                digitandoTimeout = setTimeout(() => {
                    ChatService.setDigitando(conversaAtualId, false);
                }, 2000);
            }
        });

        chatInputArea.addEventListener('click', (e) => {
            // Botão enviar
            if (e.target.closest('.send-button, .btn-send, #btn-send')) {
                enviarMensagem();
            }
            // Botão anexar
            if (e.target.closest('.attachment-icon, .btn-attach, #btn-attach')) {
                const imageInput = document.getElementById('chat-image-input');
                if (imageInput) {
                    imageInput.click();
                } else {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (ev) => {
                        const file = ev.target.files?.[0];
                        if (file) enviarImagemHandler(file);
                    };
                    input.click();
                }
            }
        });

        chatInputArea.addEventListener('change', (e) => {
            if (e.target.matches('#chat-image-input, input[type="file"]')) {
                handleImageUpload(e);
            }
        });
    }

    // Ações do chat
    configurarAcoesChat();
}

function configurarAcoesChat() {
    const actions = document.querySelector('.chat-actions');
    if (!actions) return;

    // Busca interna
    const searchIcon = actions.querySelector('.fa-search');
    if (searchIcon) {
        searchIcon.style.cursor = 'pointer';
        searchIcon.addEventListener('click', abrirBuscaInterna);
    }

    // Chamada de vídeo
    const videoIcon = actions.querySelector('.fa-video');
    if (videoIcon) {
        videoIcon.style.cursor = 'pointer';
        videoIcon.addEventListener('click', iniciarChamadaVideo);
    }

    // Chamada de voz
    const phoneIcon = actions.querySelector('.fa-phone-alt');
    if (phoneIcon) {
        phoneIcon.style.cursor = 'pointer';
        phoneIcon.addEventListener('click', iniciarChamadaVoz);
    }

    // Menu vertical
    const menuIcon = actions.querySelector('.fa-ellipsis-v');
    if (menuIcon) {
        menuIcon.style.cursor = 'pointer';
        menuIcon.addEventListener('click', alternarMenuChat);
    }
}

// ===== ENVIAR MENSAGEM =====
async function enviarMensagem() {
    const input = document.getElementById('chat-message-input') || document.querySelector('.chat-input-area input[type="text"]');
    if (!input) {
        console.warn('[Chat] Input de mensagem não encontrado');
        return;
    }

    const conteudo = input.value.trim();
    if (!conteudo) return;

    if (!conversaAtualId) {
        showModal('warning', 'Atenção', 'Selecione uma conversa primeiro');
        return;
    }

    // BLOQUEIO: Verificar se ainda são amigos antes de enviar
    if (amigoExcluido) {
        showModal('warning', 'Bloqueado', 'Você não pode enviar mensagens para este usuário');
        return;
    }

    // Verificação em tempo real (para casos de exclusão durante a conversa)
    const userId = auth.currentUser?.uid;
    if (userId && amigoIdAtual) {
        const saoAmigos = await ChatService.verificarSaoAmigos(userId, amigoIdAtual);
        if (!saoAmigos) {
            amigoExcluido = true;
            bloquearInterfaceAmigoExcluido();
            showModal('warning', 'Bloqueado', 'Usuário não está mais na sua lista de amigos');
            return;
        }
    }

    try {
        input.disabled = true;
        await ChatService.enviarMensagem(conversaAtualId, conteudo, 'texto');
        input.value = '';
        ChatService.setDigitando(conversaAtualId, false);
    } catch (error) {
        console.error('[Chat] Erro ao enviar mensagem:', error);
        showModal('error', 'Erro', error.message || 'Não foi possível enviar a mensagem');
    } finally {
        input.disabled = false;
        input.focus();
    }
}

async function enviarImagemHandler(arquivo) {
    if (!arquivo) return;

    if (!conversaAtualId) {
        showModal('warning', 'Atenção', 'Selecione uma conversa primeiro');
        return;
    }

    // BLOQUEIO: Verificar se ainda são amigos antes de enviar imagem
    if (amigoExcluido) {
        showModal('warning', 'Bloqueado', 'Você não pode enviar mensagens para este usuário');
        return;
    }

    // Verificação em tempo real
    const userId = auth.currentUser?.uid;
    if (userId && amigoIdAtual) {
        const saoAmigos = await ChatService.verificarSaoAmigos(userId, amigoIdAtual);
        if (!saoAmigos) {
            amigoExcluido = true;
            bloquearInterfaceAmigoExcluido();
            showModal('warning', 'Bloqueado', 'Usuário não está mais na sua lista de amigos');
            return;
        }
    }

    try {
        showSpinner();
        console.log('[Chat] Enviando imagem...', arquivo.name);

        const urlImagem = await ChatService.enviarImagem(arquivo);
        console.log('[Chat] Imagem enviada:', urlImagem);

        await ChatService.enviarMensagem(conversaAtualId, 'Imagem enviada', 'imagem', urlImagem);
        
        // REMOVIDO: Modal de sucesso (comportamento WhatsApp - envio silencioso)
        // showModal('success', 'Sucesso', 'Imagem enviada com sucesso!');
    } catch (error) {
        console.error('[Chat] Erro ao enviar imagem:', error);
        showModal('error', 'Erro', error.message || 'Não foi possível enviar a imagem');
    } finally {
        hideSpinner();
    }
}

// ===== BUSCA INTERNA =====
function abrirBuscaInterna() {
    const header = document.querySelector('.chat-header');
    if (!header) return;

    let searchBox = header.querySelector('.search-internal');
    if (searchBox) {
        searchBox.remove();
        return;
    }

    searchBox = document.createElement('div');
    searchBox.className = 'search-internal';
    searchBox.style.cssText = `
        position: absolute; top: 60px; right: 15px; z-index: 50;
        background: #3A3A3A; padding: 10px; border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    searchBox.innerHTML = `
        <input type="text" placeholder="Buscar na conversa..." style="
            padding: 8px 12px;
            border-radius: 20px;
            border: 1px solid #555;
            background: #2B2B2B;
            color: #E0E0E0;
            width: 200px;
            outline: none;
        ">
        <i class="fas fa-times" style="
            margin-left: 8px; cursor: pointer; color: #AAA;
        "></i>
    `;
    header.style.position = 'relative';
    header.appendChild(searchBox);

    const input = searchBox.querySelector('input');
    const closeBtn = searchBox.querySelector('.fa-times');

    input.focus();
    input.addEventListener('input', (e) => filtrarMensagensInternas(e.target.value));
    closeBtn.addEventListener('click', () => {
        filtrarMensagensInternas(''); // Limpar filtro
        searchBox.remove();
    });
}

function filtrarMensagensInternas(termo) {
    const mensagens = document.querySelectorAll('.message');
    mensagens.forEach(msg => {
        const texto = msg.querySelector('.message-text')?.textContent?.toLowerCase() || '';
        const match = termo && texto.includes(termo.toLowerCase());

        msg.style.opacity = termo && !match ? '0.3' : '1';
        
        if (match) {
            msg.classList.add('highlight');
            msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => msg.classList.remove('highlight'), 2000);
        }
    });

    // Adicionar estilo de highlight se não existir
    if (!document.querySelector('#chat-highlight-style')) {
        const style = document.createElement('style');
        style.id = 'chat-highlight-style';
        style.textContent = `
            .message.highlight .message-bubble {
                animation: highlight-pulse 0.5s ease-in-out 3;
            }
            @keyframes highlight-pulse {
                0%, 100% { box-shadow: 0 0 0 rgba(253, 138, 36, 0); }
                50% { box-shadow: 0 0 15px rgba(253, 138, 36, 0.8); }
            }
        `;
        document.head.appendChild(style);
    }
}

// ===== CHAMADAS WEBRTC =====
function verificarSuporteMedia() {
    // Verificar se está em HTTPS ou localhost
    const isSecure = window.isSecureContext || 
                     location.protocol === 'https:' || 
                     location.hostname === 'localhost' || 
                     location.hostname === '127.0.0.1';
    
    if (!isSecure) {
        showModal('warning', 'Conexão Insegura', 
            'As chamadas de vídeo/voz requerem uma conexão segura (HTTPS). ' +
            'Por favor, acesse o site via HTTPS ou use localhost para testes.');
        return false;
    }

    // Verificar suporte do navegador
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showModal('warning', 'Navegador Incompatível', 
            'Seu navegador não suporta chamadas de vídeo/voz. ' +
            'Por favor, use um navegador moderno como Chrome, Firefox ou Edge.');
        return false;
    }

    return true;
}

async function iniciarChamadaVideo() {
    if (!conversaAtualId) {
        showModal('warning', 'Atenção', 'Selecione uma conversa primeiro');
        return;
    }

    if (!verificarSuporteMedia()) return;

    const conversa = todasConversas.find(c => c.id === conversaAtualId);
    if (!conversa) return;

    const modal = criarModalChamada('video', conversa.nomeAmigo);
    document.body.appendChild(modal);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const videoLocal = modal.querySelector('#video-local');
        if (videoLocal) {
            videoLocal.srcObject = stream;
        }

        // Salvar stream para encerrar depois
        modal.dataset.streamId = 'local';
        modal.stream = stream;

        console.log('[Chat] Chamada de vídeo iniciada');
    } catch (error) {
        console.error('[Chat] Erro ao iniciar chamada de vídeo:', error);
        
        let mensagem = 'Não foi possível acessar câmera/microfone.';
        if (error.name === 'NotAllowedError') {
            mensagem = 'Permissão negada. Por favor, permita o acesso à câmera e microfone nas configurações do navegador.';
        } else if (error.name === 'NotFoundError') {
            mensagem = 'Câmera ou microfone não encontrado. Verifique se estão conectados.';
        } else if (error.name === 'NotReadableError') {
            mensagem = 'Câmera ou microfone em uso por outro aplicativo.';
        }
        
        showModal('error', 'Erro', mensagem);
        modal.remove();
    }
}

async function iniciarChamadaVoz() {
    if (!conversaAtualId) {
        showModal('warning', 'Atenção', 'Selecione uma conversa primeiro');
        return;
    }

    if (!verificarSuporteMedia()) return;

    const conversa = todasConversas.find(c => c.id === conversaAtualId);
    if (!conversa) return;

    const modal = criarModalChamada('voz', conversa.nomeAmigo);
    document.body.appendChild(modal);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        modal.stream = stream;

        console.log('[Chat] Chamada de voz iniciada');
    } catch (error) {
        console.error('[Chat] Erro ao iniciar chamada de voz:', error);
        
        let mensagem = 'Não foi possível acessar o microfone.';
        if (error.name === 'NotAllowedError') {
            mensagem = 'Permissão negada. Por favor, permita o acesso ao microfone nas configurações do navegador.';
        } else if (error.name === 'NotFoundError') {
            mensagem = 'Microfone não encontrado. Verifique se está conectado.';
        } else if (error.name === 'NotReadableError') {
            mensagem = 'Microfone em uso por outro aplicativo.';
        }
        
        showModal('error', 'Erro', mensagem);
        modal.remove();
    }
}

function criarModalChamada(tipo, nomeAmigo) {
    const modal = document.createElement('div');
    modal.className = 'call-modal';
    modal.innerHTML = `
        <div class="call-overlay" style="
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.8); z-index: 999;
        "></div>
        <div class="call-modal-content" style="
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #2B2B2B 0%, #1a1a1a 100%);
            padding: 40px; border-radius: 20px;
            text-align: center; z-index: 1000;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            min-width: 320px;
        ">
            <div style="margin-bottom: 25px;">
                <i class="fas ${tipo === 'video' ? 'fa-video' : 'fa-phone-alt'}" style="
                    font-size: 3em; color: #FD8A24; margin-bottom: 15px; display: block;
                "></i>
                <h3 style="color: #E0E0E0; margin-bottom: 5px; font-size: 1.4em;">
                    ${tipo === 'video' ? 'Chamada de Vídeo' : 'Chamada de Voz'}
                </h3>
                <p style="color: #AAA; font-size: 1.1em;">Chamando ${nomeAmigo}...</p>
            </div>
            ${tipo === 'video' ? `
                <video id="video-local" autoplay muted playsinline style="
                    width: 280px; height: 210px; border-radius: 15px; 
                    background: #1a1a1a; margin-bottom: 20px;
                    object-fit: cover;
                "></video>
            ` : `
                <div style="
                    width: 120px; height: 120px; margin: 0 auto 20px;
                    border-radius: 50%; background: #3A3A3A;
                    display: flex; align-items: center; justify-content: center;
                    animation: pulse-call 1.5s ease-in-out infinite;
                ">
                    <i class="fas fa-user" style="font-size: 3em; color: #FD8A24;"></i>
                </div>
            `}
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button class="btn-encerrar" style="
                    padding: 15px 35px; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                    color: white; border: none; border-radius: 30px; cursor: pointer;
                    font-size: 1em; font-weight: 600;
                    transition: all 0.3s ease;
                ">
                    <i class="fas fa-phone-slash"></i> Encerrar
                </button>
            </div>
        </div>
    `;

    // Adicionar estilo de animação
    if (!document.querySelector('#call-animation-style')) {
        const style = document.createElement('style');
        style.id = 'call-animation-style';
        style.textContent = `
            @keyframes pulse-call {
                0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(253, 138, 36, 0.4); }
                50% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(253, 138, 36, 0); }
            }
            .btn-encerrar:hover {
                transform: scale(1.05);
                box-shadow: 0 5px 20px rgba(220, 53, 69, 0.4);
            }
        `;
        document.head.appendChild(style);
    }

    // Eventos
    const encerrarBtn = modal.querySelector('.btn-encerrar');
    const overlay = modal.querySelector('.call-overlay');

    const encerrarChamada = () => {
        if (modal.stream) {
            modal.stream.getTracks().forEach(track => track.stop());
        }
        modal.remove();
    };

    encerrarBtn.addEventListener('click', encerrarChamada);
    overlay.addEventListener('click', encerrarChamada);

    return modal;
}

// ===== MENU DO CHAT =====
function alternarMenuChat(event) {
    event?.stopPropagation();

    let menu = document.querySelector('.chat-menu-dropdown');
    if (menu) {
        menu.remove();
        return;
    }

    menu = document.createElement('div');
    menu.className = 'chat-menu-dropdown';
    menu.style.cssText = `
        position: absolute; top: 50px; right: 10px;
        background: linear-gradient(135deg, #2B2B2B 0%, #1f1f1f 100%);
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.4);
        z-index: 100;
        padding: 8px 0;
        min-width: 200px;
        border: 1px solid #3A3A3A;
    `;
    menu.innerHTML = `
        <div class="menu-item" data-action="status" style="
            padding: 12px 20px; cursor: pointer; color: #E0E0E0;
            display: flex; align-items: center; gap: 12px;
            transition: background 0.2s;
        ">
            <i class="fas fa-circle" style="color: #FD8A24; width: 20px;"></i> 
            <span>Alterar status</span>
        </div>
        <div style="border-top: 1px solid #3A3A3A; margin: 8px 0;"></div>
        <div class="menu-item" data-action="arquivar" style="
            padding: 12px 20px; cursor: pointer; color: #E0E0E0;
            display: flex; align-items: center; gap: 12px;
            transition: background 0.2s;
        ">
            <i class="fas fa-archive" style="color: #FD8A24; width: 20px;"></i> 
            <span>Arquivar conversa</span>
        </div>
        <div class="menu-item" data-action="enter-toggle" style="
            padding: 12px 20px; cursor: pointer; color: #E0E0E0;
            display: flex; align-items: center; gap: 12px;
            transition: background 0.2s;
        ">
            <i class="fas fa-keyboard" style="color: #FD8A24; width: 20px;"></i> 
            <span>Enviar com Enter: ${enviarComEnter ? 'ON' : 'OFF'}</span>
        </div>
        <div class="menu-item" data-action="tema" style="
            padding: 12px 20px; cursor: pointer; color: #E0E0E0;
            display: flex; align-items: center; gap: 12px;
            transition: background 0.2s;
        ">
            <i class="fas fa-palette" style="color: #FD8A24; width: 20px;"></i> 
            <span>Mudar tema</span>
        </div>
        <div style="border-top: 1px solid #3A3A3A; margin: 8px 0;"></div>
        <div class="menu-item" data-action="excluir" style="
            padding: 12px 20px; cursor: pointer; color: #dc3545;
            display: flex; align-items: center; gap: 12px;
            transition: background 0.2s;
        ">
            <i class="fas fa-trash" style="width: 20px;"></i> 
            <span>Excluir conversa</span>
        </div>
    `;

    // Hover effect
    menu.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
            item.style.background = 'rgba(253, 138, 36, 0.1)';
        });
        item.addEventListener('mouseleave', () => {
            item.style.background = 'transparent';
        });

        item.addEventListener('click', async () => {
            const action = item.dataset.action;

            if (action === 'status') {
                menu.remove();
                abrirSeletorStatus();
            } else if (action === 'arquivar' && conversaAtualId) {
                try {
                    await arquivarConversa(conversaAtualId);
                    menu.remove();
                } catch (error) {
                    console.error('[Chat] Erro ao arquivar:', error);
                }
            } else if (action === 'enter-toggle') {
                enviarComEnter = !enviarComEnter;
                showModal('info', 'Configuração', `Enviar com Enter: ${enviarComEnter ? 'Ativado' : 'Desativado'}`);
                menu.remove();
            } else if (action === 'tema') {
                menu.remove();
                abrirSeletorTema();
            } else if (action === 'excluir' && conversaAtualId) {
                menu.remove();
                // USAR MODAL EM VEZ DE CONFIRM (PRD proíbe alerts/confirms)
                mostrarModalConfirmacaoExcluir(conversaAtualId);
            }
        });
    });

    const chatMain = document.querySelector('.chat-main');
    if (chatMain) {
        chatMain.style.position = 'relative';
        chatMain.appendChild(menu);
    }

    // Fechar ao clicar fora
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
}

// ===== SISTEMA DE TEMAS AVANÇADO (4 SEÇÕES) =====
/**
 * Abre modal de personalização avançada de temas
 * Conforme PRD: Escolher Tema, Card Enviados, Card Recebidos, Conversa Ativa
 */
function abrirSeletorTemaAvancado() {
    const coresPadrao = [
        { nome: 'Padrão', cor: '' },
        { nome: 'Azul Escuro', cor: '#1a237e' },
        { nome: 'Verde Escuro', cor: '#1b5e20' },
        { nome: 'Roxo', cor: '#4a148c' },
        { nome: 'Vermelho', cor: '#b71c1c' },
        { nome: 'Laranja', cor: '#e65100' },
        { nome: 'Rosa', cor: '#880e4f' },
        { nome: 'Ciano', cor: '#006064' },
        { nome: 'Cinza', cor: '#37474f' }
    ];

    const modal = document.createElement('div');
    modal.className = 'theme-advanced-modal';
    modal.innerHTML = `
        <div class="theme-overlay" style="
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.8); z-index: 9999;
        "></div>
        <div class="theme-content" style="
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #2B2B2B 0%, #1f1f1f 100%);
            padding: 0; border-radius: 20px;
            z-index: 10000; width: 90%; max-width: 450px;
            max-height: 85vh; overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        ">
            <div class="theme-header" style="
                padding: 20px 25px; background: rgba(253, 138, 36, 0.1);
                border-bottom: 1px solid #3A3A3A;
            ">
                <h3 style="color: #E0E0E0; margin: 0; display: flex; align-items: center; gap: 12px;">
                    <i class="fas fa-palette" style="color: #FD8A24;"></i> 
                    Personalizar Tema do Chat
                </h3>
            </div>
            
            <div class="theme-body" style="padding: 20px 25px; max-height: 60vh; overflow-y: auto;">
                <!-- Seção 1: Tema Global -->
                <div class="theme-section" style="margin-bottom: 25px;">
                    <h4 style="color: #FD8A24; margin-bottom: 12px; font-size: 0.95em; text-transform: uppercase;">
                        <i class="fas fa-th-large"></i> Escolher Tema (Global)
                    </h4>
                    <p style="color: #888; font-size: 0.8em; margin-bottom: 12px;">
                        Altera: header, sidebar, área de mensagens e input
                    </p>
                    <div class="cores-grid" data-section="temaGlobal" style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${coresPadrao.map(c => `
                            <div class="cor-option ${c.cor === '' ? 'padrao' : ''}" 
                                 data-cor="${c.cor}" title="${c.nome}" style="
                                width: 36px; height: 36px; border-radius: 50%;
                                background: ${c.cor || 'linear-gradient(135deg, #2B2B2B 0%, #3A3A3A 100%)'};
                                cursor: pointer; border: 2px solid transparent;
                                transition: all 0.2s ease;
                                ${c.cor === '' ? 'display: flex; align-items: center; justify-content: center;' : ''}
                            ">${c.cor === '' ? '<i class="fas fa-undo" style="color: #AAA; font-size: 0.8em;"></i>' : ''}</div>
                        `).join('')}
                    </div>
                </div>

                <!-- Seção 2: Card Enviados -->
                <div class="theme-section" style="margin-bottom: 25px;">
                    <h4 style="color: #FD8A24; margin-bottom: 12px; font-size: 0.95em; text-transform: uppercase;">
                        <i class="fas fa-comment"></i> Card Mensagens Enviadas
                    </h4>
                    <p style="color: #888; font-size: 0.8em; margin-bottom: 12px;">
                        Altera: .sent .message-bubble
                    </p>
                    <div class="cores-grid" data-section="cardEnviados" style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${[
                            { nome: 'Padrão', cor: '' },
                            { nome: 'Laranja', cor: '#FD8A24' },
                            { nome: 'Verde', cor: '#25D366' },
                            { nome: 'Azul', cor: '#0088cc' },
                            { nome: 'Roxo', cor: '#7C4DFF' },
                            { nome: 'Rosa', cor: '#E91E63' },
                            { nome: 'Vermelho', cor: '#F44336' },
                            { nome: 'Ciano', cor: '#00BCD4' }
                        ].map(c => `
                            <div class="cor-option ${c.cor === '' ? 'padrao' : ''}" 
                                 data-cor="${c.cor}" title="${c.nome}" style="
                                width: 36px; height: 36px; border-radius: 50%;
                                background: ${c.cor || 'linear-gradient(135deg, #FD8A24 0%, #e67e22 100%)'};
                                cursor: pointer; border: 2px solid transparent;
                                transition: all 0.2s ease;
                                ${c.cor === '' ? 'display: flex; align-items: center; justify-content: center;' : ''}
                            ">${c.cor === '' ? '<i class="fas fa-undo" style="color: #1A1A1A; font-size: 0.8em;"></i>' : ''}</div>
                        `).join('')}
                    </div>
                </div>

                <!-- Seção 3: Card Recebidos -->
                <div class="theme-section" style="margin-bottom: 25px;">
                    <h4 style="color: #FD8A24; margin-bottom: 12px; font-size: 0.95em; text-transform: uppercase;">
                        <i class="fas fa-comment-dots"></i> Card Mensagens Recebidas
                    </h4>
                    <p style="color: #888; font-size: 0.8em; margin-bottom: 12px;">
                        Altera: .received .message-bubble
                    </p>
                    <div class="cores-grid" data-section="cardRecebidos" style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${[
                            { nome: 'Padrão', cor: '' },
                            { nome: 'Cinza Claro', cor: '#3A3A3A' },
                            { nome: 'Azul Escuro', cor: '#1E3A5F' },
                            { nome: 'Verde Escuro', cor: '#1B4332' },
                            { nome: 'Roxo Escuro', cor: '#2E1065' },
                            { nome: 'Marrom', cor: '#3E2723' },
                            { nome: 'Cinza Azulado', cor: '#37474F' }
                        ].map(c => `
                            <div class="cor-option ${c.cor === '' ? 'padrao' : ''}" 
                                 data-cor="${c.cor}" title="${c.nome}" style="
                                width: 36px; height: 36px; border-radius: 50%;
                                background: ${c.cor || 'linear-gradient(135deg, #3A3A3A 0%, #2B2B2B 100%)'};
                                cursor: pointer; border: 2px solid transparent;
                                transition: all 0.2s ease;
                                ${c.cor === '' ? 'display: flex; align-items: center; justify-content: center;' : ''}
                            ">${c.cor === '' ? '<i class="fas fa-undo" style="color: #AAA; font-size: 0.8em;"></i>' : ''}</div>
                        `).join('')}
                    </div>
                </div>

                <!-- Seção 4: Conversa Ativa -->
                <div class="theme-section">
                    <h4 style="color: #FD8A24; margin-bottom: 12px; font-size: 0.95em; text-transform: uppercase;">
                        <i class="fas fa-check-circle"></i> Conversa Ativa (Destaque)
                    </h4>
                    <p style="color: #888; font-size: 0.8em; margin-bottom: 12px;">
                        Altera: .conversation-item.active
                    </p>
                    <div class="cores-grid" data-section="conversaAtiva" style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${[
                            { nome: 'Padrão', cor: '' },
                            { nome: 'Laranja', cor: '#FD8A24' },
                            { nome: 'Verde', cor: '#28a745' },
                            { nome: 'Azul', cor: '#007bff' },
                            { nome: 'Roxo', cor: '#6f42c1' },
                            { nome: 'Rosa', cor: '#e83e8c' },
                            { nome: 'Ciano', cor: '#17a2b8' }
                        ].map(c => `
                            <div class="cor-option ${c.cor === '' ? 'padrao' : ''}" 
                                 data-cor="${c.cor}" title="${c.nome}" style="
                                width: 36px; height: 36px; border-radius: 50%;
                                background: ${c.cor || 'linear-gradient(135deg, #FD8A24 0%, #e67e22 100%)'};
                                cursor: pointer; border: 2px solid transparent;
                                transition: all 0.2s ease;
                                ${c.cor === '' ? 'display: flex; align-items: center; justify-content: center;' : ''}
                            ">${c.cor === '' ? '<i class="fas fa-undo" style="color: #1A1A1A; font-size: 0.8em;"></i>' : ''}</div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="theme-footer" style="
                padding: 15px 25px; background: rgba(0,0,0,0.2);
                border-top: 1px solid #3A3A3A;
                display: flex; gap: 10px;
            ">
                <button class="btn-restaurar" style="
                    flex: 1; padding: 12px;
                    background: #3A3A3A; color: #E0E0E0;
                    border: none; border-radius: 8px; cursor: pointer;
                    font-size: 0.9em; transition: all 0.2s ease;
                "><i class="fas fa-undo"></i> Restaurar Padrão</button>
                <button class="btn-fechar" style="
                    flex: 1; padding: 12px;
                    background: #FD8A24; color: #1A1A1A;
                    border: none; border-radius: 8px; cursor: pointer;
                    font-size: 0.9em; font-weight: bold; transition: all 0.2s ease;
                ">Fechar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Configurar eventos de seleção de cor
    modal.querySelectorAll('.cor-option').forEach(opt => {
        opt.addEventListener('click', async () => {
            const cor = opt.dataset.cor;
            const section = opt.closest('.cores-grid').dataset.section;
            
            // Visual feedback - selecionar
            opt.closest('.cores-grid').querySelectorAll('.cor-option').forEach(o => {
                o.style.borderColor = 'transparent';
                o.style.transform = 'scale(1)';
            });
            opt.style.borderColor = '#FD8A24';
            opt.style.transform = 'scale(1.15)';
            
            // Aplicar tema visualmente
            aplicarTemaSecao(section, cor);
            
            // Salvar no Firestore
            await salvarTemaSecao(section, cor);
        });

        opt.addEventListener('mouseenter', () => {
            if (opt.style.borderColor !== 'rgb(253, 138, 36)') {
                opt.style.transform = 'scale(1.1)';
            }
        });
        opt.addEventListener('mouseleave', () => {
            if (opt.style.borderColor !== 'rgb(253, 138, 36)') {
                opt.style.transform = 'scale(1)';
            }
        });
    });

    // Botão restaurar padrão
    modal.querySelector('.btn-restaurar').addEventListener('click', async () => {
        try {
            await ChatService.restaurarTemasChat();
            restaurarTemasVisuais();
            showModal('success', 'Sucesso', 'Temas restaurados para o padrão');
        } catch (error) {
            showModal('error', 'Erro', 'Não foi possível restaurar os temas');
        }
    });

    modal.querySelector('.btn-fechar').addEventListener('click', () => modal.remove());
    modal.querySelector('.theme-overlay').addEventListener('click', () => modal.remove());
}

/**
 * Aplica tema a uma seção específica
 * CORREÇÃO: temaGlobal (Escolher Tema) altera APENAS chat-messages
 */
function aplicarTemaSecao(section, cor) {
    const isDarkMode = document.body.classList.contains('dark-mode') || 
                       document.querySelector('.dark-mode-toggle input')?.checked;
    
    switch(section) {
        case 'temaGlobal':
            // CORREÇÃO: Escolher Tema altera SOMENTE chat-messages (não header, sidebar, input)
            const chatMessages = document.querySelector('.chat-messages');
            
            if (cor) {
                if (chatMessages) chatMessages.style.background = cor;
            } else {
                // Restaurar padrão
                if (chatMessages) chatMessages.style.background = '';
            }
            // Injetar estilo para garantir persistência
            atualizarEstiloDinamico('chat-messages-style', 
                cor ? `.chat-messages { background: ${cor} !important; }` : '');
            break;
            
        case 'cardEnviados':
            document.querySelectorAll('.message.sent .message-bubble').forEach(el => {
                el.style.background = cor || '';
            });
            // Injetar estilo para novas mensagens
            atualizarEstiloDinamico('sent-bubble-style', 
                cor ? `.message.sent .message-bubble { background: ${cor} !important; }` : '');
            break;
            
        case 'cardRecebidos':
            document.querySelectorAll('.message.received .message-bubble').forEach(el => {
                el.style.background = cor || '';
            });
            atualizarEstiloDinamico('received-bubble-style', 
                cor ? `.message.received .message-bubble { background: ${cor} !important; }` : '');
            break;
            
        case 'conversaAtiva':
            document.querySelectorAll('.conversation-item.active').forEach(el => {
                el.style.background = cor || '';
            });
            atualizarEstiloDinamico('active-conversation-style', 
                cor ? `.conversation-item.active { background: ${cor} !important; }` : '');
            break;
    }
}

/**
 * Atualiza ou cria estilo dinâmico
 */
function atualizarEstiloDinamico(id, css) {
    let style = document.getElementById(id);
    if (!style) {
        style = document.createElement('style');
        style.id = id;
        document.head.appendChild(style);
    }
    style.textContent = css;
}

/**
 * Salva configuração de tema de uma seção
 */
async function salvarTemaSecao(section, cor) {
    try {
        const temasAtuais = temasCarregados || {};
        temasAtuais[section] = { corFundo: cor, usandoPadrao: !cor };
        await ChatService.salvarTemasChat(temasAtuais);
        temasCarregados = temasAtuais;
    } catch (error) {
        console.error('[Chat] Erro ao salvar tema:', error);
    }
}

/**
 * Restaura todos os temas para o padrão visual
 * CORREÇÃO: Apenas chat-messages para tema global, não header/sidebar/input
 */
function restaurarTemasVisuais() {
    // Remover estilos dinâmicos
    ['chat-messages-style', 'sent-bubble-style', 'received-bubble-style', 'active-conversation-style'].forEach(id => {
        const style = document.getElementById(id);
        if (style) style.remove();
    });
    
    // Restaurar apenas chat-messages (tema global)
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) chatMessages.style.background = '';
    
    // Restaurar bubbles e conversa ativa
    document.querySelectorAll('.message .message-bubble').forEach(el => {
        el.style.background = '';
    });
    
    document.querySelectorAll('.conversation-item.active').forEach(el => {
        el.style.background = '';
    });
}

/**
 * Carrega e aplica temas salvos do Firestore
 */
async function carregarEAplicarTemas() {
    try {
        temasCarregados = await ChatService.carregarTemasChat();
        
        if (temasCarregados.temaGlobal?.corFundo) {
            aplicarTemaSecao('temaGlobal', temasCarregados.temaGlobal.corFundo);
        }
        if (temasCarregados.cardEnviados?.corFundo) {
            aplicarTemaSecao('cardEnviados', temasCarregados.cardEnviados.corFundo);
        }
        if (temasCarregados.cardRecebidos?.corFundo) {
            aplicarTemaSecao('cardRecebidos', temasCarregados.cardRecebidos.corFundo);
        }
        if (temasCarregados.conversaAtiva?.corFundo) {
            aplicarTemaSecao('conversaAtiva', temasCarregados.conversaAtiva.corFundo);
        }
    } catch (error) {
        console.warn('[Chat] Erro ao carregar temas:', error);
    }
}

// Alias para manter compatibilidade
function abrirSeletorTema() {
    abrirSeletorTemaAvancado();
}

// ===== SELETOR DE STATUS DO USUÁRIO =====
/**
 * Abre modal para alterar status do usuário
 */
function abrirSeletorStatus() {
    const statusOptions = [
        { value: 'disponivel', label: 'Disponível', icon: 'fa-circle', color: '#28a745' },
        { value: 'ocupado', label: 'Ocupado', icon: 'fa-circle', color: '#dc3545' },
        { value: 'ausente', label: 'Ausente', icon: 'fa-moon', color: '#ffc107' },
        { value: 'invisivel', label: 'Invisível', icon: 'fa-eye-slash', color: '#6c757d' }
    ];

    const modal = document.createElement('div');
    modal.className = 'status-selector-modal';
    modal.innerHTML = `
        <div class="status-overlay" style="
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); z-index: 999;
        "></div>
        <div class="status-content" style="
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #2B2B2B; padding: 25px; border-radius: 15px;
            z-index: 1000; min-width: 320px;
        ">
            <h3 style="color: #E0E0E0; margin-bottom: 20px; text-align: center;">
                <i class="fas fa-circle" style="color: #FD8A24;"></i> Alterar Status
            </h3>
            <div class="status-options" style="display: flex; flex-direction: column; gap: 12px;">
                ${statusOptions.map(s => `
                    <div class="status-option" data-status="${s.value}" data-color="${s.color}" style="
                        display: flex; align-items: center; gap: 15px;
                        padding: 15px; border-radius: 10px;
                        background: rgba(255,255,255,0.05);
                        cursor: pointer; transition: all 0.2s ease;
                        border: 2px solid transparent;
                    ">
                        <i class="fas ${s.icon}" style="
                            color: ${s.color}; font-size: 1.3em; width: 25px;
                        "></i>
                        <span style="color: #E0E0E0; font-size: 1.1em; flex: 1;">${s.label}</span>
                    </div>
                `).join('')}
            </div>
            <button class="btn-fechar" style="
                margin-top: 20px; width: 100%; padding: 12px;
                background: #3A3A3A; color: #E0E0E0;
                border: none; border-radius: 8px; cursor: pointer;
                font-size: 1em;
            ">Cancelar</button>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll('.status-option').forEach(opt => {
        opt.addEventListener('click', async () => {
            const status = opt.dataset.status;
            const color = opt.dataset.color;
            await alterarStatusUsuario(status, color);
            modal.remove();
        });

        opt.addEventListener('mouseenter', () => {
            opt.style.background = 'rgba(253, 138, 36, 0.15)';
            opt.style.borderColor = '#FD8A24';
            opt.style.transform = 'translateX(5px)';
        });
        opt.addEventListener('mouseleave', () => {
            opt.style.background = 'rgba(255,255,255,0.05)';
            opt.style.borderColor = 'transparent';
            opt.style.transform = 'translateX(0)';
        });
    });

    modal.querySelector('.btn-fechar').addEventListener('click', () => modal.remove());
    modal.querySelector('.status-overlay').addEventListener('click', () => modal.remove());
}

/**
 * Altera o status do usuário no Firestore e atualiza o status-indicator do header
 * @param {string} novoStatus - disponivel | ocupado | ausente | invisivel
 * @param {string} corStatus - Cor correspondente ao status
 */
async function alterarStatusUsuario(novoStatus, corStatus) {
    try {
        await ChatService.alterarStatusUsuario(novoStatus);
        
        const statusLabels = {
            'disponivel': 'Online',
            'ocupado': 'Ocupado',
            'ausente': 'Ausente',
            'invisivel': 'Offline'
        };
        
        const statusColors = {
            'disponivel': '#28a745',
            'ocupado': '#dc3545',
            'ausente': '#ffc107',
            'invisivel': '#6c757d'
        };

        // ATUALIZAR STATUS-INDICATOR DO HEADER
        atualizarStatusIndicatorHeader(novoStatus, statusLabels[novoStatus], statusColors[novoStatus]);

        showModal('success', 'Status Alterado', `Seu status agora é: ${statusLabels[novoStatus]}`);
        console.log('[Chat] Status do usuário alterado para:', novoStatus);
    } catch (error) {
        console.error('[Chat] Erro ao alterar status:', error);
        showModal('error', 'Erro', 'Não foi possível alterar o status');
    }
}

/**
 * Carrega o status do usuário logado do Firestore e atualiza o status-indicator
 * Chamado ao inicializar o chat para manter consistência após refresh
 */
async function carregarStatusUsuarioLogadoEAtualizar() {
    try {
        const { status, online } = await ChatService.carregarStatusUsuarioLogado();
        
        const statusLabels = {
            'disponivel': 'Online',
            'ocupado': 'Ocupado',
            'ausente': 'Ausente',
            'invisivel': 'Offline'
        };
        
        const statusColors = {
            'disponivel': '#28a745',
            'ocupado': '#dc3545',
            'ausente': '#ffc107',
            'invisivel': '#6c757d'
        };

        // Atualizar status-indicator do header com o status salvo
        const statusParaExibir = status || 'disponivel';
        atualizarStatusIndicatorHeader(
            statusParaExibir, 
            statusLabels[statusParaExibir] || 'Online',
            statusColors[statusParaExibir] || '#28a745'
        );
        
        console.log('[Chat] Status do usuário carregado:', statusParaExibir);
    } catch (error) {
        console.warn('[Chat] Erro ao carregar status do usuário logado:', error);
        // Fallback para status padrão
        atualizarStatusIndicatorHeader('disponivel', 'Online', '#28a745');
    }
}

/**
 * Atualiza o elemento status-indicator no header
 * @param {string} status - Status atual
 * @param {string} label - Texto a exibir
 * @param {string} color - Cor do indicador
 */
function atualizarStatusIndicatorHeader(status, label, color) {
    const profileStatus = document.querySelector('.profile-status');
    const statusIndicator = document.querySelector('.status-indicator');
    
    if (!statusIndicator) return;
    
    // Mapear status para classes CSS
    const statusClassMap = {
        'disponivel': 'online',
        'online': 'online',
        'ocupado': 'ocupado',
        'ausente': 'ausente',
        'offline': 'offline',
        'invisivel': 'invisivel'
    };
    
    const cssClass = statusClassMap[status] || 'offline';
    
    // Remover todas as classes de status anteriores
    statusIndicator.classList.remove('online', 'ocupado', 'ausente', 'offline', 'invisivel');
    
    // Adicionar a nova classe de status
    statusIndicator.classList.add(cssClass);
    
    // Atualizar o texto do label
    statusIndicator.innerHTML = `
        <span class="status-dot"></span>
        ${label}
    `;
    
    // Tornar visível o container de status (se existir)
    if (profileStatus) {
        profileStatus.classList.add('visible');
    }
}

// ===== EXPORTAR FUNÇÃO PARA INICIAR CHAT COM AMIGO =====
export async function iniciarChatComAmigo(amigoId) {
    if (!amigoId) {
        showModal('error', 'Erro', 'ID do amigo não informado');
        return;
    }

    try {
        showSpinner();
        const conversaId = await ChatService.criarOuObterConversa(amigoId);
        if (conversaId) {
            await selecionarConversa(conversaId);
        }
    } catch (error) {
        console.error('[Chat] Erro ao iniciar chat com amigo:', error);
        showModal('error', 'Erro', error.message || 'Não foi possível iniciar a conversa');
    } finally {
        hideSpinner();
    }
}

// Expor globalmente para acesso de outros módulos
window.iniciarChatComAmigo = iniciarChatComAmigo;

// Verificar se há parâmetros na URL (ex: #chat?friendId=xxx)
function verificarParametrosURL() {
    const hash = window.location.hash;
    const match = hash.match(/friendId=([^&]+)/);
    if (match) {
        const friendId = match[1];
        console.log('[Chat] Iniciando chat via URL com amigo:', friendId);
        setTimeout(() => iniciarChatComAmigo(friendId), 1000);
    }
}

// Inicializar automaticamente quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        inicializarChat();
        verificarParametrosURL();
    });
} else {
    inicializarChat();
    verificarParametrosURL();
}
