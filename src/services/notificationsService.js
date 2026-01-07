import { auth, db } from "./firebase.js";
import { 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc,
  updateDoc,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

/**
 * Busca notificações não lidas do usuário
 * @param {string} userId - ID do usuário
 * @returns {Promise<Array>} Lista de notificações não lidas
 */
export async function getUnreadNotifications(userId) {
  try {
    const notificacoesRef = collection(db, 'notificacoes');
    const q = query(
      notificacoesRef, 
            where('usuarioId', '==', userId),
      where('lida', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const notifications = [];
    
    snapshot.forEach(doc => {
      notifications.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Ordena por data (mais recentes primeiro)
    notifications.sort((a, b) => {
            const timeA = a.dataNotificacao?.toMillis?.() || 0;
            const timeB = b.dataNotificacao?.toMillis?.() || 0;
      return timeB - timeA;
    });
    
    return notifications;
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return [];
  }
}

/**
 * Marca notificações como lidas
 * @param {Array<string>} notificationIds - IDs das notificações
 */
export async function markNotificationsAsRead(notificationIds) {
  try {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) {
            throw new Error('Usuário não autenticado.');
        }

        const safeIds = Array.isArray(notificationIds)
            ? notificationIds.filter(id => {
                    const notif = notificacoesAtuais.find(n => n?.id === id);
                    // Se não encontrarmos no cache local, não tentamos atualizar (evita erro de permissão por IDs stale)
                    if (!notif) return false;
                    // CORRIGIDO: usar usuarioId (padrão PRD português) em vez de userId
                    return notif.usuarioId === currentUserId;
                })
            : [];

        if (safeIds.length === 0) {
            console.warn('[Notifications] Nenhuma notificação válida para marcar como lida');
            return;
        }

        console.log(`[Notifications] Marcando ${safeIds.length} notificações como lidas`);

        const { writeBatch } = await import("https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js");
        const batch = writeBatch(db);
        
        safeIds.forEach(id => {
            batch.update(doc(db, 'notificacoes', id), { lida: true });
        });
        
        await batch.commit();
        console.log('[Notifications] ✅ Todas notificações marcadas como lidas');
  } catch (error) {
    console.error('Erro ao marcar notificações como lidas:', error);
    throw error;
  }
}

/**
 * Escuta em tempo real notificações não lidas
 * @param {string} userId - ID do usuário
 * @param {Function} callback - Função chamada quando houver mudanças
 * @returns {Function} Função para cancelar a escuta
 */
export function listenUnreadNotifications(userId, callback, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;
  
  // Verificar se usuário está autenticado e se o userId corresponde antes de criar listener
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) {
    console.warn('[Notifications] Usuário não autenticado ou userId inválido, não iniciando listener');
    callback(0, []);
    return () => {}; // Retorna função vazia para unsubscribe
  }

  console.log('[Notifications] Iniciando listener para userId:', userId, retryCount > 0 ? `(tentativa ${retryCount + 1})` : '');
  const notificacoesRef = collection(db, 'notificacoes');
  const q = query(
    notificacoesRef,
    where('usuarioId', '==', userId),
    where('lida', '==', false)
  );
  
  let unsubscribe = null;
  let isListenerActive = true;
  
  unsubscribe = onSnapshot(q, (snapshot) => {
    // Se listener foi cancelado enquanto aguardava resposta, ignorar
    if (!isListenerActive) return;
    
    const count = snapshot.size;
    const notifications = [];
    
    snapshot.forEach(doc => {
      notifications.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('[Notifications] ✅ Recebidas', count, 'notificações não lidas');
    callback(count, notifications);
  }, (error) => {
    // Se listener foi cancelado, ignorar erro
    if (!isListenerActive) return;
    
    // Erro de permissão: pode ser condição de corrida ou permissão insuficiente
    if (error.code === 'permission-denied') {
      // Verificar se ainda temos usuário autenticado com UUID correto
      if (auth.currentUser?.uid === userId && retryCount < MAX_RETRIES) {
        console.warn(`[Notifications] Permissão negada, tentando novamente em ${RETRY_DELAY}ms (tentativa ${retryCount + 1}/${MAX_RETRIES})...`);
        const retryTimeout = setTimeout(() => {
          // Dupla verificação antes de retry
          if (isListenerActive && auth.currentUser?.uid === userId) {
            listenUnreadNotifications(userId, callback, retryCount + 1);
          }
        }, RETRY_DELAY);
        
        // Retornar função que cancela tanto o listener quanto o timeout
        return () => {
          isListenerActive = false;
          clearTimeout(retryTimeout);
          if (unsubscribe) {
            unsubscribe();
          }
        };
      } else {
        console.warn(`[Notifications] ⚠️ Permissões insuficientes ou usuário deslogado. userId=${userId}, currentUid=${auth.currentUser?.uid}, retryCount=${retryCount}`);
        isListenerActive = false;
      }
    } else {
      console.error('[Notifications] Erro ao escutar notificações:', error.code, error.message);
    }
    
    // Chamar callback com dados vazios após erro
    callback(0, []);
  });
  
  // Retornar função de unsubscribe
  return () => {
    isListenerActive = false;
    if (unsubscribe) {
      unsubscribe();
    }
    console.log('[Notifications] Listener cancelado para userId:', userId);
  };
}

/**
 * Criar notificação de nova mensagem
 * @param {string} remetenteId - ID do remetente
 * @param {string} destinatarioId - ID do destinatário
 * @param {string} conversaId - ID da conversa
 * @param {string} mensagemPreview - Prévia da mensagem
 */
export async function criarNotificacaoMensagem(remetenteId, destinatarioId, conversaId, mensagemPreview) {
    if (!remetenteId || !destinatarioId) return;

    try {
        const { addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js");
        
        await addDoc(collection(db, 'notificacoes'), {
            usuarioId: destinatarioId,
            tipo: 'mensagem',
            conversaId: conversaId,
            mensagemPreview: mensagemPreview.substring(0, 50),
            lida: false,
            dataNotificacao: serverTimestamp(),
            metadados: {
                remetenteId
            }
        });
        console.log('[Notifications] Notificação de mensagem criada');
    } catch (error) {
        console.error('[Notifications] Erro ao criar notificação:', error);
    }
}

/**
 * Marcar todas as notificações de uma conversa como lidas
 * @param {string} userId - ID do usuário
 * @param {string} conversaId - ID da conversa
 */
export async function marcarNotificacoesConversaComoLidas(userId, conversaId) {
    if (!userId || !conversaId) return;

    try {
        const { writeBatch } = await import("https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js");
        
        const q = query(
            collection(db, 'notificacoes'),
            where('usuarioId', '==', userId),
            where('conversaId', '==', conversaId),
            where('lida', '==', false)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach(docSnap => {
            batch.update(docSnap.ref, { lida: true });
        });
        await batch.commit();

        console.log(`[Notifications] ${snapshot.size} notificações marcadas como lidas para conversa ${conversaId}`);
    } catch (error) {
        console.error('[Notifications] Erro ao marcar notificações da conversa:', error);
    }
}

// ===== NOTIFICATION-BELL MANAGER =====
let unsubscribeNotificacoes = null;
let notificacoesAtuais = [];
let dropdownAberto = false;
let ultimaContagem = -1; // Cache para evitar atualizações desnecessárias

/**
 * Inicializa o listener de notificações e atualiza o notification-bell
 * @param {string} userId - ID do usuário logado
 */
export function iniciarListenerNotificacoes(userId) {
    if (!userId || !auth.currentUser) {
        console.warn('[Notifications] Impossível iniciar listener: usuário não autenticado ou userId vazio');
        return;
    }
    
    if (auth.currentUser.uid !== userId) {
        console.warn('[Notifications] Impossível iniciar listener: userId não corresponde ao usuário autenticado');
        return;
    }
    
    // Cancelar listener anterior se existir
    if (unsubscribeNotificacoes) {
        console.log('[Notifications] Cancelando listener anterior...');
        unsubscribeNotificacoes();
    }
    
    ultimaContagem = -1; // Reset cache
    notificacoesAtuais = []; // Limpar notificações em cache
    console.log('[Notifications] ▶️ Iniciando listener de notificações para userId:', userId);
    
    unsubscribeNotificacoes = listenUnreadNotifications(userId, (count, notifications) => {
        notificacoesAtuais = notifications;
        atualizarBadgeNotificacoes(count);
    });
}

/**
 * Para o listener de notificações
 * Deve ser chamado no logout ou quando desmontar componente
 */
export function pararListenerNotificacoes() {
    if (unsubscribeNotificacoes) {
        console.log('[Notifications] ⏹️ Parando listener de notificações...');
        unsubscribeNotificacoes();
        unsubscribeNotificacoes = null;
        ultimaContagem = -1;
        notificacoesAtuais = [];
        console.log('[Notifications] Listener de notificações parado com sucesso');
    }
}

/**
 * Atualiza o badge de notificações no header
 * Usa cache para evitar atualizações desnecessárias (flickering)
 * @param {number} count - Quantidade de notificações não lidas
 */
function atualizarBadgeNotificacoes(count) {
    // Evitar atualizações desnecessárias
    if (count === ultimaContagem) return;
    ultimaContagem = count;
    
    const bell = document.getElementById('notification-bell');
    const badge = document.getElementById('notification-badge');
    
    if (!bell || !badge) return;
    
    if (count > 0) {
        // Só remover hidden se ainda estiver escondido
        if (bell.classList.contains('hidden')) {
            bell.classList.remove('hidden');
        }
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

/**
 * Busca o nome do remetente pelo ID
 */
async function buscarNomeRemetente(remetenteId) {
    if (!remetenteId) return 'Usuário';
    
    try {
        const userDoc = await getDoc(doc(db, 'users', remetenteId));
        if (userDoc.exists()) {
            return userDoc.data().nome || 'Usuário';
        }
    } catch (error) {
        console.error('[Notifications] Erro ao buscar nome do remetente:', error);
    }
    return 'Usuário';
}

/**
 * Exibe as notificações em um dropdown ao clicar no notification-bell
 */
export async function exibirDropdownNotificacoes() {
    // Remover dropdown existente
    const dropdownExistente = document.getElementById('notification-dropdown-global');
    if (dropdownExistente) {
        dropdownExistente.remove();
        dropdownAberto = false;
        return;
    }
    
    dropdownAberto = true;
    
    const bell = document.getElementById('notification-bell');
    if (!bell) return;
    
    // Pegar posição do bell
    const bellRect = bell.getBoundingClientRect();
    
    // Criar dropdown no body (não dentro do bell)
    const dropdown = document.createElement('div');
    dropdown.id = 'notification-dropdown-global';
    dropdown.style.cssText = `
        position: fixed;
        top: ${bellRect.bottom + 10}px;
        right: ${window.innerWidth - bellRect.right}px;
        width: 340px;
        max-height: 450px;
        overflow-y: auto;
        background: #2B2B2B;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        z-index: 10000;
        border: 1px solid #444;
        animation: fadeInDropdown 0.2s ease;
    `;
    
    // Adicionar animação CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInDropdown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
    
    // Header do dropdown
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 15px 18px;
        border-bottom: 1px solid #444;
        font-weight: bold;
        color: #FD8A24;
        display: flex;
        align-items: center;
        gap: 10px;
        background: #252525;
        border-radius: 12px 12px 0 0;
    `;
    header.innerHTML = `<i class="fas fa-bell"></i> Notificações (${notificacoesAtuais.length})`;
    dropdown.appendChild(header);
    
    // Lista de notificações
    if (notificacoesAtuais.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding: 40px 20px; text-align: center; color: #888;';
        empty.innerHTML = `
            <i class="fas fa-check-circle" style="font-size: 2.5em; margin-bottom: 15px; display: block; color: #28a745;"></i>
            <p style="margin: 0;">Nenhuma notificação pendente</p>
        `;
        dropdown.appendChild(empty);
    } else {
        const listContainer = document.createElement('div');
        listContainer.style.cssText = 'max-height: 350px; overflow-y: auto;';
        
        // Buscar nomes dos remetentes
        const remetentesIds = [...new Set(notificacoesAtuais.map(n => n?.metadados?.remetenteId).filter(Boolean))];
        const nomesMap = new Map();
        
        for (const id of remetentesIds) {
            const nome = await buscarNomeRemetente(id);
            nomesMap.set(id, nome);
        }
        
        notificacoesAtuais.forEach(notif => {
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 14px 18px;
                border-bottom: 1px solid #3A3A3A;
                cursor: pointer;
                transition: background 0.2s;
                display: flex;
                align-items: flex-start;
                gap: 12px;
            `;
            item.onmouseenter = () => item.style.background = '#3A3A3A';
            item.onmouseleave = () => item.style.background = 'transparent';
            
            let icone = 'fa-bell';
            let corIcone = '#FD8A24';
            let titulo = 'Notificação';
            let subtitulo = ''; // Adicionar subtítulo com origem/motivo
            let rotaDestino = null; // Rota para redirecionamento
            const preview = notif.mensagemPreview || notif.mensagem || '';
            const remetenteId = notif?.metadados?.remetenteId || null;
            const nomeRemetente = (remetenteId && nomesMap.get(remetenteId)) || notif?.metadados?.remetenteNome || 'Sistema';
            
            if (notif.tipo === 'mensagem') {
                icone = 'fa-comment';
                corIcone = '#4FC3F7';
                titulo = `Nova mensagem de ${nomeRemetente}`;
                subtitulo = 'Chat privado';
                rotaDestino = '#chat';
            } else if (notif.tipo === 'solicitacao_amizade') {
                icone = 'fa-user-plus';
                corIcone = '#28a745';
                titulo = `Solicitação de amizade`;
                subtitulo = `De: ${nomeRemetente}`;
                rotaDestino = '#profile';
            } else if (notif.tipo === 'amizade_aceita') {
                icone = 'fa-user-check';
                corIcone = '#28a745';
                titulo = `Amizade aceita`;
                subtitulo = `${nomeRemetente} aceitou seu pedido`;
                rotaDestino = '#profile';
            } else if (notif.tipo === 'convite_campeonato') {
                icone = 'fa-trophy';
                corIcone = '#FD8A24';
                const nomeCamp = notif.campeonatoNome || 'Campeonato';
                titulo = `Convite para Campeonato`;
                subtitulo = `${nomeCamp} • De: ${nomeRemetente}`;
                rotaDestino = '#homepage';
            } else if (notif.tipo === 'convite_amistosa') {
                icone = 'fa-futbol';
                corIcone = '#FD8A24';
                const rodadaTxt = notif.rodadaId ? `Rodada ${notif.rodadaId}` : 'Amistoso';
                titulo = `Convite de Partida`;
                subtitulo = `${rodadaTxt} • De: ${nomeRemetente}`;
                rotaDestino = '#matches';
            } else if (notif.tipo === 'placar_pendente') {
                icone = 'fa-edit';
                corIcone = '#FF9800';
                titulo = `Placar pendente`;
                subtitulo = `Confirme o resultado • De: ${nomeRemetente}`;
                rotaDestino = '#matches';
            } else if (notif.tipo === 'placar_confirmado') {
                icone = 'fa-check-circle';
                corIcone = '#28a745';
                titulo = `Placar confirmado`;
                subtitulo = `Partida finalizada`;
                rotaDestino = '#matches';
            } else if (notif.tipo === 'placar_contestado') {
                icone = 'fa-exclamation-triangle';
                corIcone = '#f44336';
                titulo = `Placar contestado`;
                subtitulo = `Aguardando resolução • Por: ${nomeRemetente}`;
                rotaDestino = '#matches';
            } else if (notif.tipo === 'placar_forcado') {
                icone = 'fa-gavel';
                corIcone = '#9C27B0';
                titulo = `Placar forçado pelo Admin`;
                subtitulo = `Decisão administrativa`;
                rotaDestino = '#matches';
            } else if (notif.tipo === 'partida_criada') {
                icone = 'fa-gamepad';
                corIcone = '#2196F3';
                titulo = `Nova partida criada`;
                subtitulo = `Por: ${nomeRemetente}`;
                rotaDestino = '#matches';
            } else if (notif.tipo === 'campeonato_cancelado') {
                icone = 'fa-ban';
                corIcone = '#f44336';
                titulo = `Campeonato cancelado`;
                subtitulo = notif.campeonatoNome || 'Campeonato';
                rotaDestino = '#homepage';
            } else {
                // Notificação genérica - garantir que tenha contexto
                titulo = notif.mensagem || 'Notificação do sistema';
                subtitulo = `Origem: ${nomeRemetente}`;
            }
            
            // Armazenar rota no item para redirecionamento
            item.dataset.rotaDestino = rotaDestino || '';
            
            // Formatar data
            const data = notif.dataNotificacao?.toDate?.() || new Date();
            const agora = new Date();
            const diff = Math.floor((agora - data) / 1000);
            let tempo = '';
            if (diff < 60) tempo = 'Agora';
            else if (diff < 3600) tempo = `${Math.floor(diff / 60)} min`;
            else if (diff < 86400) tempo = `${Math.floor(diff / 3600)}h`;
            else tempo = data.toLocaleDateString('pt-BR');
            
            item.innerHTML = `
                <div style="
                    width: 40px; height: 40px; border-radius: 50%; 
                    background: ${corIcone}20; display: flex; 
                    align-items: center; justify-content: center; flex-shrink: 0;
                ">
                    <i class="fas ${icone}" style="color: ${corIcone}; font-size: 1em;"></i>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; color: #E0E0E0; margin-bottom: 2px; font-size: 0.9em;">
                        ${titulo}
                    </div>
                    <div style="font-size: 0.8em; color: #FD8A24; margin-bottom: 4px;">
                        ${subtitulo}
                    </div>
                    ${preview ? `<div style="font-size: 0.85em; color: #AAA; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${preview}
                    </div>` : ''}
                    <div style="font-size: 0.75em; color: #666; margin-top: 5px;">${tempo}</div>
                </div>
                <button class="mark-read-btn" data-notif-id="${notif.id}" style="
                    background: none; border: none; color: #666; cursor: pointer;
                    padding: 5px; font-size: 0.9em; transition: color 0.2s;
                " title="Marcar como lida">
                    <i class="fas fa-check"></i>
                </button>
            `;
            
            // Evento para marcar como lida
            const markReadBtn = item.querySelector('.mark-read-btn');
            markReadBtn.onmouseenter = () => markReadBtn.style.color = '#28a745';
            markReadBtn.onmouseleave = () => markReadBtn.style.color = '#666';
            markReadBtn.onclick = async (e) => {
                e.stopPropagation();
                await marcarNotificacaoComoLida(notif.id);
                item.style.opacity = '0.5';
                setTimeout(() => item.remove(), 300);
                
                // Atualizar contagem no header
                const remaining = listContainer.querySelectorAll('[data-notif-id]').length - 1;
                header.innerHTML = `<i class="fas fa-bell"></i> Notificações (${remaining})`;
            };
            
            // Ao clicar no item, navegar para a sessão correspondente
            item.onclick = async (e) => {
                if (e.target.closest('.mark-read-btn')) return;
                
                // Handler para mensagens - navegar para chat
                if (notif.tipo === 'mensagem' && notif.conversaId) {
                    dropdown.remove();
                    dropdownAberto = false;
                    await marcarNotificacaoComoLida(notif.id);
                    window.location.hash = '#chat';
                    setTimeout(() => {
                        if (typeof window.selecionarConversaPorId === 'function') {
                            window.selecionarConversaPorId(notif.conversaId);
                        }
                    }, 500);
                    return;
                }

                // Handler para convite de campeonato
                if (notif.tipo === 'convite_campeonato' && notif.campeonatoId && notif.usuarioId) {
                    dropdown.remove();
                    dropdownAberto = false;
                    const nomeCamp = notif.campeonatoNome || 'Campeonato';
                    const { showConfirmModal, showModal } = await import('../components/modal.js');

                    const aceitar = await showConfirmModal('Convite de campeonato', `Aceitar o convite para "${nomeCamp}"?`);
                    if (aceitar) {
                        try {
                            await responderConviteCampeonato({ campeonatoId: notif.campeonatoId, usuarioId: notif.usuarioId, status: 'confirmado' });
                            await marcarNotificacaoComoLida(notif.id);
                            showModal('success', 'Confirmado', 'Presença confirmada no campeonato.');
                        } catch (err) {
                            showModal('error', 'Erro', err?.message || 'Falha ao confirmar presença.');
                        }
                        return;
                    }

                    const recusar = await showConfirmModal('Recusar convite?', `Deseja recusar o convite para "${nomeCamp}"?`);
                    if (!recusar) return;
                    try {
                        await responderConviteCampeonato({ campeonatoId: notif.campeonatoId, usuarioId: notif.usuarioId, status: 'recusado' });
                        await marcarNotificacaoComoLida(notif.id);
                        showModal('info', 'Recusado', 'Convite recusado.');
                    } catch (err) {
                        showModal('error', 'Erro', err?.message || 'Falha ao recusar convite.');
                    }
                    return;
                }

                // Handler para convite de amistosa
                if (notif.tipo === 'convite_amistosa' && notif.partidaId && notif.usuarioId) {
                    dropdown.remove();
                    dropdownAberto = false;
                    const { showConfirmModal, showModal } = await import('../components/modal.js');

                    const rodadaTxt = notif.rodadaId ? `Rodada ${notif.rodadaId}` : 'Amistoso';
                    const aceitar = await showConfirmModal('Convite de amistoso', `Aceitar o convite de amistoso (${rodadaTxt})?`);
                    const { serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');

                    if (aceitar) {
                        try {
                            await updateDoc(doc(db, 'partidas', notif.partidaId), {
                                [`confirmacoes.${notif.usuarioId}`]: 'confirmado',
                                atualizadoEm: serverTimestamp()
                            });
                            await marcarNotificacaoComoLida(notif.id);
                            showModal('success', 'Confirmado', 'Participação confirmada no amistoso.');
                        } catch (err) {
                            showModal('error', 'Erro', err?.message || 'Falha ao confirmar participação.');
                        }
                        return;
                    }

                    const recusar = await showConfirmModal('Recusar convite?', `Deseja recusar o convite de amistoso (${rodadaTxt})?`);
                    if (!recusar) return;
                    try {
                        await updateDoc(doc(db, 'partidas', notif.partidaId), {
                            [`confirmacoes.${notif.usuarioId}`]: 'recusado',
                            atualizadoEm: serverTimestamp()
                        });
                        await marcarNotificacaoComoLida(notif.id);
                        showModal('info', 'Recusado', 'Convite recusado.');
                    } catch (err) {
                        showModal('error', 'Erro', err?.message || 'Falha ao recusar convite.');
                    }
                    return;
                }

                // Redirecionamento genérico para outras notificações
                const rotaDestino = item.dataset.rotaDestino;
                if (rotaDestino) {
                    dropdown.remove();
                    dropdownAberto = false;
                    await marcarNotificacaoComoLida(notif.id);
                    window.location.hash = rotaDestino;
                }
            };
            
            listContainer.appendChild(item);
        });
        
        dropdown.appendChild(listContainer);
        
        // Botão "Marcar todas como lidas"
        if (notificacoesAtuais.length > 0) {
            const footer = document.createElement('div');
            footer.style.cssText = `
                padding: 12px 18px;
                border-top: 1px solid #444;
                text-align: center;
                background: #252525;
                border-radius: 0 0 12px 12px;
            `;
            footer.innerHTML = `
                <button id="mark-all-read-btn" style="
                    background: none; border: 1px solid #FD8A24; color: #FD8A24;
                    padding: 8px 16px; border-radius: 20px; cursor: pointer;
                    font-size: 0.85em; transition: all 0.2s;
                ">
                    <i class="fas fa-check-double"></i> Marcar todas como lidas
                </button>
            `;
            
            const markAllBtn = footer.querySelector('#mark-all-read-btn');
            markAllBtn.onmouseenter = () => {
                markAllBtn.style.background = '#FD8A24';
                markAllBtn.style.color = '#1A1A1A';
            };
            markAllBtn.onmouseleave = () => {
                markAllBtn.style.background = 'none';
                markAllBtn.style.color = '#FD8A24';
            };
            markAllBtn.onclick = async () => {
                try {
                    const ids = notificacoesAtuais.map(n => n.id);
                    await markNotificationsAsRead(ids);
                    dropdown.remove();
                    dropdownAberto = false;
                } catch (err) {
                    try {
                        const { showModal } = await import('../components/modal.js');
                        const msg = (err && typeof err.message === 'string' && err.message.trim())
                            ? err.message
                            : 'Não foi possível marcar as notificações como lidas.';
                        showModal('error', 'Erro', msg);
                    } catch (_) {
                        // Sem modal disponível, apenas log
                    }
                }
            };
            
            dropdown.appendChild(footer);
        }
    }
    
    // Adicionar ao body
    document.body.appendChild(dropdown);
    
    // Fechar ao clicar fora
    const closeHandler = (e) => {
        const dropdown = document.getElementById('notification-dropdown-global');
        if (!dropdown) {
            document.removeEventListener('click', closeHandler);
            return;
        }
        
        if (!dropdown.contains(e.target) && !bell.contains(e.target)) {
            dropdown.remove();
            dropdownAberto = false;
            document.removeEventListener('click', closeHandler);
        }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);
}

/**
 * Marca uma notificação específica como lida
 */
async function marcarNotificacaoComoLida(notificacaoId) {
    if (!notificacaoId) return;
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return;
    
    try {
        await updateDoc(doc(db, 'notificacoes', notificacaoId), { lida: true });
        console.log('[Notifications] Notificação marcada como lida:', notificacaoId);
    } catch (error) {
        console.error('[Notifications] Erro ao marcar notificação como lida:', error);
    }
}

async function responderConviteCampeonato({ campeonatoId, usuarioId, status }) {
    if (!campeonatoId || !usuarioId) throw new Error('Convite inválido.');
    const finalStatus = status === 'confirmado' ? 'confirmado' : 'recusado';

    const { serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
    await updateDoc(doc(db, 'campeonatos', campeonatoId, 'convites', usuarioId), {
        status: finalStatus,
        respondidoEm: serverTimestamp()
    });
}

/**
 * Configura o click no notification-bell
 */
export function configurarNotificationBell() {
    const bell = document.getElementById('notification-bell');
    if (!bell) return;
    
    // Remover listeners anteriores
    bell.replaceWith(bell.cloneNode(true));
    const newBell = document.getElementById('notification-bell');
    
    newBell.style.cursor = 'pointer';
    newBell.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        exibirDropdownNotificacoes();
    });
    
    console.log('[Notifications] Notification-bell configurado');
}

/**
 * Retorna notificações de mensagens por conversa
 * @param {string} conversaId - ID da conversa
 * @returns {Array} Notificações da conversa
 */
export function getNotificacoesPorConversa(conversaId) {
    return notificacoesAtuais.filter(n => n.conversaId === conversaId && n.tipo === 'mensagem');
}

/**
 * Retorna contagem de notificações de mensagens não lidas
 * @returns {number} Total de mensagens não lidas
 */
export function getContadorMensagensNaoLidas() {
    return notificacoesAtuais.filter(n => n.tipo === 'mensagem').length;
}
