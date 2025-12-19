/**
 * chatService.js
 * Serviço de chat com Firestore em tempo real
 * Convenções em PT-BR conforme PRD
 */

import { db, auth } from './firebase.js';
import {
    collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs,
    query, where, orderBy, onSnapshot, serverTimestamp, limit,
    writeBatch, arrayRemove, setDoc
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// ===== SANITIZAÇÃO XSS =====
export function sanitizarTexto(texto) {
    if (!texto) return '';
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

// ===== VERIFICAÇÃO DE AMIZADE =====
/**
 * Verifica se dois usuários são amigos
 * @param {string} userId1 - ID do primeiro usuário
 * @param {string} userId2 - ID do segundo usuário
 * @returns {Promise<boolean>}
 */
export async function verificarSaoAmigos(userId1, userId2) {
    if (!userId1 || !userId2) return false;
    
    try {
        const amigoRef = doc(db, `users/${userId1}/amigos`, userId2);
        const amigoDoc = await getDoc(amigoRef);
        return amigoDoc.exists();
    } catch (error) {
        console.error('[ChatService] Erro ao verificar amizade:', error);
        return false;
    }
}

// ===== RATE LIMITING =====
const contadorMensagens = new Map();
const LIMITE_MENSAGENS_POR_MINUTO = 30;

function verificarLimiteMensagens(userId) {
    const agora = Date.now();
    const dados = contadorMensagens.get(userId) || { count: 0, inicio: agora };

    if (agora - dados.inicio > 60000) {
        contadorMensagens.set(userId, { count: 1, inicio: agora });
        return true;
    }

    if (dados.count >= LIMITE_MENSAGENS_POR_MINUTO) {
        return false;
    }

    dados.count++;
    contadorMensagens.set(userId, dados);
    return true;
}

// ===== CONVERSAS =====
export async function carregarConversas(callback) {
    const userId = auth.currentUser?.uid;
    if (!userId) return null;

    const q = query(
        collection(db, 'conversas'),
        where('participantes', 'array-contains', userId),
        orderBy('dataUltimaMensagem', 'desc')
    );

    return onSnapshot(q, async (snapshot) => {
        const conversas = [];
        for (const docSnap of snapshot.docs) {
            const dados = docSnap.data();
            const outroUserId = dados.participantes.find(id => id !== userId);
            
            // Buscar dados do amigo
            let amigo = { nome: 'Usuário', fotoUrl: '' };
            if (outroUserId) {
                try {
                    const amigoDoc = await getDoc(doc(db, 'users', outroUserId));
                    if (amigoDoc.exists()) {
                        amigo = amigoDoc.data();
                    }
                } catch (error) {
                    console.warn('[ChatService] Erro ao buscar amigo:', error);
                }
            }

            conversas.push({
                id: docSnap.id,
                ...dados,
                amigoId: outroUserId,
                nomeAmigo: amigo?.nome || 'Usuário',
                fotoAmigo: amigo?.fotoUrl || '',
                naoLidas: dados.naoLidas?.[userId] || 0,
                arquivada: dados.arquivada?.[userId] || false
            });
        }
        callback(conversas);
    }, (error) => {
        console.error('[ChatService] Erro ao carregar conversas:', error);
        callback([]);
    });
}

export function filtrarConversas(conversas, termo) {
    if (!termo) return conversas;
    const termoLower = termo.toLowerCase();
    return conversas.filter(c =>
        c.nomeAmigo?.toLowerCase().includes(termoLower) ||
        c.ultimaMensagem?.toLowerCase().includes(termoLower)
    );
}

// ===== MENSAGENS =====
export function carregarMensagens(conversaId, callback) {
    if (!conversaId) return null;

    const q = query(
        collection(db, 'conversas', conversaId, 'mensagens'),
        orderBy('dataEnvio', 'asc'),
        limit(100)
    );

    return onSnapshot(q, (snapshot) => {
        const mensagens = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));
        callback(mensagens);
    }, (error) => {
        console.error('[ChatService] Erro ao carregar mensagens:', error);
        callback([]);
    });
}

export async function enviarMensagem(conversaId, conteudo, tipo = 'texto', urlImagem = null) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Usuário não autenticado');
    if (!conversaId) throw new Error('Conversa não selecionada');

    if (!verificarLimiteMensagens(userId)) {
        throw new Error('Limite de mensagens atingido. Aguarde um momento.');
    }

    const conteudoSanitizado = sanitizarTexto(conteudo);

    // Buscar dados da conversa ANTES de criar a mensagem
    const conversaRef = doc(db, 'conversas', conversaId);
    const conversaDoc = await getDoc(conversaRef);
    
    if (!conversaDoc.exists()) {
        throw new Error('Conversa não encontrada');
    }
    
    const dados = conversaDoc.data();
    const outroUserId = dados.participantes.find(id => id !== userId);

    // Verificar status do destinatário ANTES de criar a mensagem
    let destinatarioOnline = false;
    let destinatarioNaConversa = false;
    
    if (outroUserId) {
        try {
            const outroUserDoc = await getDoc(doc(db, 'users', outroUserId));
            if (outroUserDoc.exists()) {
                const outroUserData = outroUserDoc.data();
                console.log('[ChatService] 🔍 Dados do destinatário:', {
                    id: outroUserId,
                    online: outroUserData?.online,
                    status: outroUserData?.status,
                    conversaAtiva: outroUserData?.conversaAtiva
                });
                destinatarioOnline = outroUserData?.online === true && outroUserData?.status !== 'invisivel';
                destinatarioNaConversa = outroUserData?.conversaAtiva === conversaId;
                console.log('[ChatService] 📊 Status calculado:', {
                    destinatarioOnline,
                    destinatarioNaConversa,
                    conversaId
                });
            } else {
                console.warn('[ChatService] ⚠️ Documento do destinatário não existe:', outroUserId);
            }
        } catch (err) {
            console.warn('[ChatService] Erro ao verificar status do destinatário:', err);
        }
    }

    // Definir status inicial da mensagem baseado no estado do destinatário (WhatsApp)
    // - Se destinatário OFFLINE: enviado=true, entregue=false, lida=false (1 tick cinza)
    // - Se destinatário ONLINE mas fora da conversa: entregue=true (2 ticks cinza)
    // - Se destinatário ONLINE e na conversa: lida=true (2 ticks azuis)
    const mensagemData = {
        remetenteId: userId,
        conteudo: conteudoSanitizado,
        tipo,
        urlImagem,
        dataEnvio: serverTimestamp(),
        enviado: true,
        entregue: destinatarioOnline,  // ✓✓ cinza se online
        lida: destinatarioNaConversa   // ✓✓ azul se na conversa
    };

    // Criar mensagem
    const mensagemRef = await addDoc(collection(db, 'conversas', conversaId, 'mensagens'), mensagemData);

    // Atualizar última mensagem da conversa
    const updateData = {
        ultimaMensagem: tipo === 'imagem' ? '📷 Imagem' : conteudoSanitizado.substring(0, 50),
        dataUltimaMensagem: serverTimestamp()
    };

    // Só incrementar naoLidas se o destinatário NÃO está na conversa ativa
    if (!destinatarioNaConversa) {
        updateData[`naoLidas.${outroUserId}`] = (dados.naoLidas?.[outroUserId] || 0) + 1;
        
        // Criar notificação apenas se destinatário NÃO está na conversa ativa
        try {
            const { criarNotificacaoMensagem } = await import('./notificationsService.js');
            const preview = tipo === 'imagem' ? '📷 Imagem' : conteudoSanitizado;
            await criarNotificacaoMensagem(userId, outroUserId, conversaId, preview);
        } catch (error) {
            console.warn('[ChatService] Erro ao criar notificação:', error);
        }
    }

    await updateDoc(conversaRef, updateData);

    return mensagemRef.id;
}

export async function marcarComoLida(conversaId) {
    const userId = auth.currentUser?.uid;
    if (!userId || !conversaId) {
        console.warn('[ChatService] marcarComoLida: userId ou conversaId ausente');
        return;
    }

    console.log(`[ChatService] 📖 Iniciando marcarComoLida para conversa: ${conversaId}`);

    try {
        // Zerar contador de não lidas
        const conversaRef = doc(db, 'conversas', conversaId);
        await updateDoc(conversaRef, {
            [`naoLidas.${userId}`]: 0
        });
        console.log('[ChatService] ✅ Contador naoLidas zerado');

        // CORREÇÃO: Query simplificada - apenas mensagens não lidas
        // Filtrar por remetente no código para evitar índice composto
        const q = query(
            collection(db, 'conversas', conversaId, 'mensagens'),
            where('lida', '==', false)
        );

        const snapshot = await getDocs(q);
        console.log(`[ChatService] 📊 Mensagens não lidas encontradas: ${snapshot.size}`);
        
        if (snapshot.empty) {
            console.log('[ChatService] Nenhuma mensagem para marcar como lida');
            return;
        }

        const batch = writeBatch(db);
        let count = 0;
        
        snapshot.docs.forEach(docSnap => {
            const data = docSnap.data();
            // Filtrar no código: apenas mensagens de OUTROS usuários (não minhas)
            if (data.remetenteId && data.remetenteId !== userId) {
                console.log(`[ChatService] Marcando mensagem ${docSnap.id} como lida`);
                batch.update(docSnap.ref, { 
                    lida: true,      // ✓✓ azul
                    entregue: true   // Garantir que está entregue também
                });
                count++;
            }
        });
        
        if (count > 0) {
            await batch.commit();
            console.log(`[ChatService] ✅ ${count} mensagens marcadas como lidas`);
        } else {
            console.log('[ChatService] Nenhuma mensagem de outros usuários para marcar');
        }

        // Limpar notificações desta conversa
        try {
            const { marcarNotificacoesConversaComoLidas } = await import('./notificationsService.js');
            await marcarNotificacoesConversaComoLidas(userId, conversaId);
            console.log('[ChatService] ✅ Notificações da conversa limpas');
        } catch (error) {
            console.warn('[ChatService] Erro ao limpar notificações:', error);
        }
    } catch (error) {
        console.error('[ChatService] ❌ Erro ao marcar como lida:', error);
    }
}

/**
 * Marcar mensagens como entregues quando o destinatário está online
 * CORREÇÃO: Usar consulta simplificada para evitar erro de índice composto
 * @param {string} conversaId - ID da conversa
 */
export async function marcarComoEntregue(conversaId) {
    const userId = auth.currentUser?.uid;
    if (!userId || !conversaId) return;

    try {
        // CORREÇÃO: Consulta simplificada - apenas 'entregue' == false
        // Depois filtra no código para evitar índice composto
        const q = query(
            collection(db, 'conversas', conversaId, 'mensagens'),
            where('entregue', '==', false)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        let count = 0;
        
        snapshot.docs.forEach(docSnap => {
            const data = docSnap.data();
            // Filtrar no código: apenas mensagens de outros usuários
            if (data.remetenteId && data.remetenteId !== userId) {
                batch.update(docSnap.ref, { entregue: true }); // ✓✓ cinza
                count++;
            }
        });
        
        if (count > 0) {
            await batch.commit();
            console.log(`[ChatService] ${count} mensagens marcadas como entregues`);
        }
    } catch (error) {
        // Fallback: Se ainda der erro de índice, logar aviso amigável
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            console.warn('[ChatService] Índice Firestore necessário para marcarComoEntregue.');
            console.warn('[ChatService] Crie o índice em: https://console.firebase.google.com/project/_/firestore/indexes');
            console.warn('[ChatService] Campos: conversas/{conversaId}/mensagens -> entregue (ASC)');
        } else {
            console.error('[ChatService] Erro ao marcar como entregue:', error);
        }
    }
}

// ===== STATUS ONLINE =====
export async function atualizarStatusOnline(online = true) {
    const userId = auth.currentUser?.uid;
    if (!userId) {
        console.warn('[ChatService] ⚠️ atualizarStatusOnline: Usuário não autenticado');
        return;
    }

    try {
        // Usar setDoc com merge para garantir que o campo seja criado mesmo se não existir
        if (online) {
            // Ao marcar online: NÃO atualizar `ultimoAcesso` (congelado até ficar offline)
            await setDoc(doc(db, 'users', userId), {
                online: true
            }, { merge: true });
            console.log(`[ChatService] ✅ Status online=true gravado para userId=${userId}`);

            // Se ficou online, marcar mensagens pendentes de TODAS as conversas como entregues
            marcarTodasMensagensComoEntregue().catch(err => 
                console.warn('[ChatService] Erro ao marcar mensagens entregues:', err)
            );
        } else {
            // Ao marcar offline: atualizar `ultimoAcesso` para o timestamp atual
            await setDoc(doc(db, 'users', userId), {
                online: false,
                ultimoAcesso: serverTimestamp()
            }, { merge: true });
            console.log(`[ChatService] ✅ Status online=false e ultimoAcesso gravado para userId=${userId}`);
        }
    } catch (error) {
        console.error('[ChatService] ❌ Erro ao atualizar status online:', error);
    }
}

/**
 * Marca mensagens de TODAS as conversas do usuário como entregues
 * Chamada quando o usuário faz login para atualizar ticks (1 tick -> 2 ticks cinza)
 */
async function marcarTodasMensagensComoEntregue() {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    
    try {
        // Buscar todas as conversas do usuário
        const conversasRef = collection(db, 'conversas');
        const q = query(conversasRef, where('participantes', 'array-contains', userId));
        const conversasSnapshot = await getDocs(q);
        
        if (conversasSnapshot.empty) return;
        
        let totalMarcadas = 0;
        
        for (const conversaDoc of conversasSnapshot.docs) {
            const conversaId = conversaDoc.id;
            
            // Buscar mensagens não entregues nesta conversa
            const mensagensRef = collection(db, 'conversas', conversaId, 'mensagens');
            const mensagensQuery = query(mensagensRef, where('entregue', '==', false));
            const mensagensSnapshot = await getDocs(mensagensQuery);
            
            if (mensagensSnapshot.empty) continue;
            
            const batch = writeBatch(db);
            let count = 0;
            
            mensagensSnapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                // Apenas mensagens de outros usuários (não minhas)
                if (data.remetenteId && data.remetenteId !== userId) {
                    batch.update(docSnap.ref, { entregue: true });
                    count++;
                }
            });
            
            if (count > 0) {
                await batch.commit();
                totalMarcadas += count;
            }
        }
        
        if (totalMarcadas > 0) {
            console.log(`[ChatService] ✅ ${totalMarcadas} mensagens marcadas como entregues em todas as conversas`);
        }
    } catch (error) {
        console.error('[ChatService] Erro ao marcar todas mensagens como entregue:', error);
    }
}

/**
 * Atualiza a conversa ativa do usuário no Firestore
 * Usado para determinar se deve mostrar 2 ticks azuis (mensagem lida instantaneamente)
 * @param {string|null} conversaId - ID da conversa ativa ou null para limpar
 */
export async function atualizarConversaAtiva(conversaId) {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
        await updateDoc(doc(db, 'users', userId), {
            conversaAtiva: conversaId || null
        });
        console.log(`[ChatService] Conversa ativa atualizada: ${conversaId || 'nenhuma'}`);
    } catch (error) {
        console.error('[ChatService] Erro ao atualizar conversa ativa:', error);
    }
}

/**
 * Carrega o status atual do usuário logado do Firestore
 * Usado para exibir status-indicator no header ao carregar a página
 * @returns {Promise<{status: string, online: boolean}>}
 */
export async function carregarStatusUsuarioLogado() {
    const userId = auth.currentUser?.uid;
    if (!userId) return { status: 'disponivel', online: false };

    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            const dados = userDoc.data();
            return {
                status: dados?.status || 'disponivel',
                online: dados?.online || false
            };
        }
        return { status: 'disponivel', online: false };
    } catch (error) {
        console.error('[ChatService] Erro ao carregar status do usuário:', error);
        return { status: 'disponivel', online: false };
    }
}

export function escutarStatusAmigo(amigoId, callback) {
    if (!amigoId) return null;

    return onSnapshot(doc(db, 'users', amigoId), (docSnap) => {
        if (docSnap.exists()) {
            const dados = docSnap.data();
            callback({
                online: dados?.online || false,
                ultimoAcesso: dados?.ultimoAcesso || null,
                digitando: dados?.digitando || {},
                status: dados?.status || 'disponivel'
            });
        } else {
            callback({ online: false, ultimoAcesso: null, digitando: {}, status: 'disponivel' });
        }
    }, (error) => {
        console.error('[ChatService] Erro ao escutar status:', error);
        callback({ online: false, ultimoAcesso: null, digitando: {}, status: 'disponivel' });
    });
}

/**
 * Busca o status de um amigo de forma síncrona (uma vez)
 * Usado para carregar status imediato antes de iniciar listener
 * @param {string} amigoId - ID do amigo
 * @returns {Promise<{online: boolean, ultimoAcesso: any, status: string}>}
 */
export async function buscarStatusAmigo(amigoId) {
    if (!amigoId) return { online: false, ultimoAcesso: null, status: 'disponivel', digitando: {} };

    try {
        const amigoDoc = await getDoc(doc(db, 'users', amigoId));
        if (amigoDoc.exists()) {
            const dados = amigoDoc.data();
            return {
                online: dados?.online || false,
                ultimoAcesso: dados?.ultimoAcesso || null,
                digitando: dados?.digitando || {},
                status: dados?.status || 'disponivel'
            };
        }
        return { online: false, ultimoAcesso: null, status: 'disponivel', digitando: {} };
    } catch (error) {
        console.error('[ChatService] Erro ao buscar status do amigo:', error);
        return { online: false, ultimoAcesso: null, status: 'disponivel', digitando: {} };
    }
}

export async function setDigitando(conversaId, digitando = true) {
    const userId = auth.currentUser?.uid;
    if (!userId || !conversaId) return;

    try {
        await updateDoc(doc(db, 'users', userId), {
            [`digitando.${conversaId}`]: digitando
        });
    } catch (error) {
        console.error('[ChatService] Erro ao definir digitando:', error);
    }
}

/**
 * Altera o status do usuário
 * @param {string} status - disponivel | ocupado | ausente | invisivel
 */
export async function alterarStatusUsuario(status) {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
        const updateData = {
            status: status
        };

        // Se invisível, aparece como offline para os outros
        // IMPORTANTE: NÃO atualizar ultimoAcesso quando invisível (congela "visto por último")
        if (status === 'invisivel') {
            updateData.online = false;
            // ultimoAcesso NÃO é atualizado - fica congelado no último valor
        } else {
            // Ao mudar o status para disponível/ocupado/ausente, NÃO atualizar ultimoAcesso.
            // `ultimoAcesso` só é atualizado quando o usuário efetivamente fica OFFLINE.
            updateData.online = true;
        }

        await updateDoc(doc(db, 'users', userId), updateData);
    } catch (error) {
        console.error('[ChatService] Erro ao alterar status:', error);
        throw error;
    }
}

/**
 * Atualiza o campo ultimoAcesso do usuário
 * Deve ser chamado ao sair do chat ou navegar para outra rota
 */
export async function atualizarUltimoAcesso() {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
        await updateDoc(doc(db, 'users', userId), {
            ultimoAcesso: serverTimestamp()
        });
    } catch (error) {
        console.error('[ChatService] Erro ao atualizar último acesso:', error);
    }
}

// ===== UPLOAD IMAGEM =====
export async function enviarImagem(arquivo) {
    // Buscar chave do ImgBB
    const IMGBB_API_KEY = window.API_CONFIG?.IMGBB_KEY || 
                          localStorage.getItem('IMGBB_KEY') || 
                          'e12344c679260f5d4c21a5621ef474ed';
    
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB

    if (!arquivo) {
        throw new Error('Nenhum arquivo selecionado');
    }

    if (arquivo.size > MAX_SIZE) {
        throw new Error('Arquivo muito grande. Máximo permitido: 5MB');
    }

    if (!arquivo.type.startsWith('image/')) {
        throw new Error('Apenas imagens são permitidas');
    }

    // Converter para base64
    const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            // Remover prefixo data:image/...;base64,
            const base64Data = result.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(arquivo);
    });

    const formData = new FormData();
    formData.append('image', base64);
    formData.append('expiration', '3600'); // 1 hora

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Falha no upload da imagem');
    }

    const data = await response.json();
    
    if (!data.success || !data.data?.url) {
        throw new Error('Resposta inválida do servidor de imagens');
    }

    return data.data.url;
}

// ===== AÇÕES DO CHAT =====
export async function arquivarConversa(conversaId, arquivar = true) {
    const userId = auth.currentUser?.uid;
    if (!userId || !conversaId) return;

    try {
        await updateDoc(doc(db, 'conversas', conversaId), {
            [`arquivada.${userId}`]: arquivar
        });
    } catch (error) {
        console.error('[ChatService] Erro ao arquivar:', error);
        throw error;
    }
}

export async function excluirConversa(conversaId) {
    const userId = auth.currentUser?.uid;
    if (!userId || !conversaId) return;

    try {
        // Soft delete - remove da lista do usuário
        await updateDoc(doc(db, 'conversas', conversaId), {
            participantes: arrayRemove(userId)
        });
    } catch (error) {
        console.error('[ChatService] Erro ao excluir:', error);
        throw error;
    }
}

export async function salvarTemaChat(conversaId, tema) {
    const userId = auth.currentUser?.uid;
    if (!userId || !conversaId) return;

    try {
        await updateDoc(doc(db, 'conversas', conversaId), {
            [`tema.${userId}`]: tema
        });
    } catch (error) {
        console.error('[ChatService] Erro ao salvar tema:', error);
        throw error;
    }
}

// ===== CRIAR CONVERSA =====
export async function criarOuObterConversa(amigoId) {
    const userId = auth.currentUser?.uid;
    if (!userId) return null;
    if (!amigoId) throw new Error('ID do amigo não informado');
    if (userId === amigoId) throw new Error('Não é possível criar conversa consigo mesmo');

    try {
        // Verificar se já existe conversa entre os dois
        const q = query(
            collection(db, 'conversas'),
            where('participantes', 'array-contains', userId)
        );

        const snapshot = await getDocs(q);
        const conversaExistente = snapshot.docs.find(docSnap =>
            docSnap.data().participantes.includes(amigoId)
        );

        if (conversaExistente) {
            return conversaExistente.id;
        }

        // Criar nova conversa
        const novaConversa = await addDoc(collection(db, 'conversas'), {
            participantes: [userId, amigoId],
            ultimaMensagem: '',
            dataUltimaMensagem: serverTimestamp(),
            naoLidas: { [userId]: 0, [amigoId]: 0 },
            arquivada: { [userId]: false, [amigoId]: false },
            tema: {}
        });

        return novaConversa.id;
    } catch (error) {
        console.error('[ChatService] Erro ao criar conversa:', error);
        throw error;
    }
}

// ===== BUSCA INTERNA =====
export async function buscarMensagensInternas(conversaId, termo) {
    if (!conversaId || !termo) return [];

    const termoLower = termo.toLowerCase();
    const q = query(
        collection(db, 'conversas', conversaId, 'mensagens'),
        orderBy('dataEnvio', 'desc'),
        limit(100)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
        .filter(msg => msg.conteudo?.toLowerCase().includes(termoLower));
}

// ===== SISTEMA DE TEMAS AVANÇADO =====
/**
 * Estrutura de temas do chat salva em users/{userId}/configuracoes/chat-temas
 */
const TEMAS_DEFAULT = {
    temaGlobal: { corFundo: '', corTexto: '', usandoPadrao: true },
    cardEnviados: { corFundo: '', corTexto: '', usandoPadrao: true },
    cardRecebidos: { corFundo: '', corTexto: '', usandoPadrao: true },
    conversaAtiva: { corFundo: '', corBorda: '', usandoPadrao: true }
};

/**
 * Salva configurações de tema do chat no Firestore
 * @param {Object} temas - Objeto com configurações de tema
 */
export async function salvarTemasChat(temas) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Usuário não autenticado');

    try {
        const temasRef = doc(db, `users/${userId}/configuracoes`, 'chat-temas');
        await setDoc(temasRef, {
            ...temas,
            atualizadoEm: serverTimestamp()
        }, { merge: true });
        console.log('[ChatService] Temas salvos com sucesso');
    } catch (error) {
        console.error('[ChatService] Erro ao salvar temas:', error);
        throw error;
    }
}

/**
 * Carrega configurações de tema do chat do Firestore
 * @returns {Promise<Object>} Configurações de tema
 */
export async function carregarTemasChat() {
    const userId = auth.currentUser?.uid;
    if (!userId) return TEMAS_DEFAULT;

    try {
        const temasRef = doc(db, `users/${userId}/configuracoes`, 'chat-temas');
        const temasDoc = await getDoc(temasRef);
        
        if (temasDoc.exists()) {
            return { ...TEMAS_DEFAULT, ...temasDoc.data() };
        }
        return TEMAS_DEFAULT;
    } catch (error) {
        console.error('[ChatService] Erro ao carregar temas:', error);
        return TEMAS_DEFAULT;
    }
}

/**
 * Restaura temas para o padrão
 */
export async function restaurarTemasChat() {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Usuário não autenticado');

    try {
        const temasRef = doc(db, `users/${userId}/configuracoes`, 'chat-temas');
        await setDoc(temasRef, {
            ...TEMAS_DEFAULT,
            atualizadoEm: serverTimestamp()
        });
        console.log('[ChatService] Temas restaurados para o padrão');
    } catch (error) {
        console.error('[ChatService] Erro ao restaurar temas:', error);
        throw error;
    }
}
