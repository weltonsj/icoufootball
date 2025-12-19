import { db } from "./firebase.js";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { showModal } from "../components/modal.js";

/**
 * Busca usuário por nome (case-insensitive)
 * @param {string} username - Nome do usuário a buscar
 * @param {string} currentUserId - ID do usuário atual (para excluir da busca)
 * @returns {Promise<Object|null>} Usuário encontrado ou null
 */
export async function searchUserByName(username, currentUserId) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef);
    const snapshot = await getDocs(q);
    
    const searchTerm = username.trim().toLowerCase();
    
    // Busca case-insensitive no frontend (Firestore não tem busca case-insensitive nativa)
    const users = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.nome && data.nome.toLowerCase().includes(searchTerm) && doc.id !== currentUserId) {
        users.push({
          id: doc.id,
          nome: data.nome,
          nomeTime: data.nomeTime || data.timeName || 'Sem time',
          logoTime: data.logoTime || data.timeLogo || '',
          estrelas: data.estrelas || 0,
          ultimoCampeao: data.ultimoCampeao || false
        });
      }
    });
    
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    throw error;
  }
}

/**
 * Verifica se já existe solicitação pendente ou amizade
 * @param {string} userId - ID do usuário atual
 * @param {string} friendId - ID do potencial amigo
 * @returns {Promise<Object>} { canRequest, reason }
 */
export async function canRequestFriendship(userId, friendId) {
  try {
    // Verifica se já são amigos
    const friendDoc = await getDoc(doc(db, `users/${userId}/amigos`, friendId));
    if (friendDoc.exists()) {
      return { canRequest: false, reason: 'already_friends' };
    }
    
    // Verifica solicitações pendentes (em ambas as direções)
    const requestsRef = collection(db, 'solicitacoesAmizade');
    const q1 = query(requestsRef, 
      where('deId', '==', userId), 
      where('paraId', '==', friendId),
      where('status', '==', 'pendente')
    );
    const q2 = query(requestsRef, 
      where('deId', '==', friendId), 
      where('paraId', '==', userId),
      where('status', '==', 'pendente')
    );
    
    const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    if (!snapshot1.empty) {
      return { canRequest: false, reason: 'request_sent' };
    }
    if (!snapshot2.empty) {
      return { canRequest: false, reason: 'request_received' };
    }
    
    return { canRequest: true, reason: '' };
  } catch (error) {
    console.error('Erro ao verificar possibilidade de amizade:', error);
    throw error;
  }
}

/**
 * Envia solicitação de amizade
 * @param {string} fromId - ID do remetente
 * @param {string} fromName - Nome do remetente
 * @param {string} toId - ID do destinatário
 * @param {string} toName - Nome do destinatário
 * @returns {Promise<void>}
 */
export async function sendFriendRequest(fromId, fromName, toId, toName) {
  try {
    // Verifica se pode solicitar
    const validation = await canRequestFriendship(fromId, toId);
    if (!validation.canRequest) {
      const messages = {
        already_friends: 'Vocês já são amigos',
        request_sent: 'Você já enviou uma solicitação para este usuário',
        request_received: 'Este usuário já enviou uma solicitação para você. Verifique suas solicitações pendentes.'
      };
      throw new Error(messages[validation.reason]);
    }
    
    // Cria solicitação
    const requestRef = doc(collection(db, 'solicitacoesAmizade'));
    await setDoc(requestRef, {
      deId: fromId,
      deNome: fromName,
      paraId: toId,
      paraNome: toName,
      status: 'pendente',
      criadoEm: Timestamp.now()
    });
    
    // Cria notificação para o destinatário
    const notificationRef = doc(collection(db, 'notificacoes'));
    await setDoc(notificationRef, {
      usuarioId: toId,
      tipo: 'solicitacao_amizade',
      deId: fromId,
      deNome: fromName,
      mensagem: `${fromName} enviou uma solicitação de amizade`,
      lida: false,
      criadoEm: Timestamp.now(),
      solicitacaoId: requestRef.id
    });
    
    return requestRef.id;
  } catch (error) {
    console.error('Erro ao enviar solicitação:', error);
    throw error;
  }
}

/**
 * Aceita solicitação de amizade
 * @param {string} requestId - ID da solicitação
 * @param {string} currentUserId - ID do usuário que está aceitando
 * @returns {Promise<void>}
 */
export async function acceptFriendRequest(requestId, currentUserId) {
  try {
    const requestRef = doc(db, 'solicitacoesAmizade', requestId);
    const requestDoc = await getDoc(requestRef);
    
    if (!requestDoc.exists()) {
      throw new Error('Solicitação não encontrada');
    }
    
    const requestData = requestDoc.data();
    
    // Verifica se o usuário atual é o destinatário
    if (requestData.paraId !== currentUserId) {
      throw new Error('Você não tem permissão para aceitar esta solicitação');
    }
    
    // Busca dados completos de ambos os usuários
    const [fromUserDoc, toUserDoc] = await Promise.all([
      getDoc(doc(db, 'users', requestData.deId)),
      getDoc(doc(db, 'users', requestData.paraId))
    ]);
    
    if (!fromUserDoc.exists() || !toUserDoc.exists()) {
      throw new Error('Usuário não encontrado');
    }
    
    const fromUserData = fromUserDoc.data();
    const toUserData = toUserDoc.data();
    
    // Usa batch para garantir atomicidade
    const batch = writeBatch(db);
    
    // Adiciona amigo para o remetente
    const friendRef1 = doc(db, `users/${requestData.deId}/amigos`, requestData.paraId);
    batch.set(friendRef1, {
      usuarioId: requestData.paraId,
      nome: toUserData.nome,
      nomeTime: toUserData.nomeTime || toUserData.timeName || 'Sem time',
      logoTime: toUserData.logoTime || toUserData.timeLogo || '',
      estrelas: toUserData.estrelas || 0,
      ultimoCampeao: toUserData.ultimoCampeao || false,
      criadoEm: Timestamp.now()
    });
    
    // Adiciona amigo para o destinatário
    const friendRef2 = doc(db, `users/${requestData.paraId}/amigos`, requestData.deId);
    batch.set(friendRef2, {
      usuarioId: requestData.deId,
      nome: fromUserData.nome,
      nomeTime: fromUserData.nomeTime || fromUserData.timeName || 'Sem time',
      logoTime: fromUserData.logoTime || fromUserData.timeLogo || '',
      estrelas: fromUserData.estrelas || 0,
      ultimoCampeao: fromUserData.ultimoCampeao || false,
      criadoEm: Timestamp.now()
    });
    
    // Atualiza status da solicitação
    batch.update(requestRef, {
      status: 'aceita',
      respondidoEm: Timestamp.now()
    });
    
    // Cria notificação para o remetente
    const notificationRef = doc(collection(db, 'notificacoes'));
    batch.set(notificationRef, {
      usuarioId: requestData.deId,
      tipo: 'amizade_aceita',
      deId: requestData.paraId,
      deNome: requestData.paraNome,
      mensagem: `${requestData.paraNome} aceitou sua solicitação de amizade`,
      lida: false,
      criadoEm: Timestamp.now()
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Erro ao aceitar solicitação:', error);
    throw error;
  }
}

/**
 * Recusa solicitação de amizade
 * @param {string} requestId - ID da solicitação
 * @param {string} currentUserId - ID do usuário que está recusando
 * @returns {Promise<void>}
 */
export async function rejectFriendRequest(requestId, currentUserId) {
  try {
    const requestRef = doc(db, 'solicitacoesAmizade', requestId);
    const requestDoc = await getDoc(requestRef);
    
    if (!requestDoc.exists()) {
      throw new Error('Solicitação não encontrada');
    }
    
    const requestData = requestDoc.data();
    
    if (requestData.paraId !== currentUserId) {
      throw new Error('Você não tem permissão para recusar esta solicitação');
    }
    
    await updateDoc(requestRef, {
      status: 'recusada',
      respondidoEm: Timestamp.now()
    });
  } catch (error) {
    console.error('Erro ao recusar solicitação:', error);
    throw error;
  }
}

/**
 * Busca lista de amigos do usuário
 * @param {string} userId - ID do usuário
 * @returns {Promise<Array>} Lista de amigos
 */
export async function getFriendsList(userId) {
  try {
    const friendsRef = collection(db, `users/${userId}/amigos`);
    const snapshot = await getDocs(friendsRef);
    
    const friends = [];
    const friendIds = [];
    
    // Coleta IDs dos amigos
    snapshot.forEach(doc => {
      friendIds.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    // Busca dados atualizados de cada amigo
    const friendsPromises = friendIds.map(async ({ id, data }) => {
      try {
        const fullProfileDoc = await getDoc(doc(db, 'users', id));
        const fullProfile = fullProfileDoc.exists() ? fullProfileDoc.data() : {};
        
        return {
          id: id,
          usuarioId: id,
          nome: fullProfile.nome || data.nome || 'Usuário',
          nomeTime: fullProfile.nomeTime || fullProfile.timeName || data.nomeTime || 'Sem time',
          logoTime: fullProfile.logoTime || fullProfile.timeLogo || data.logoTime || '',
          estrelas: fullProfile.estrelas !== undefined ? fullProfile.estrelas : data.estrelas || 0,
          ultimoCampeao: fullProfile.ultimoCampeao !== undefined ? fullProfile.ultimoCampeao : data.ultimoCampeao || false,
          criadoEm: data.criadoEm
        };
      } catch (error) {
        console.error(`Erro ao buscar perfil do amigo ${id}:`, error);
        // Retorna dados da subcoleção como fallback
        return {
          id: id,
          usuarioId: id,
          ...data
        };
      }
    });
    
    const friendsData = await Promise.all(friendsPromises);
    
    // Ordena: campeões primeiro, depois por estrelas
    friendsData.sort((a, b) => {
      if (a.ultimoCampeao && !b.ultimoCampeao) return -1;
      if (!a.ultimoCampeao && b.ultimoCampeao) return 1;
      return b.estrelas - a.estrelas;
    });
    
    return friendsData;
  } catch (error) {
    console.error('Erro ao buscar lista de amigos:', error);
    throw error;
  }
}

/**
 * Busca solicitações pendentes do usuário
 * @param {string} userId - ID do usuário
 * @returns {Promise<Array>} Lista de solicitações pendentes
 */
export async function getPendingRequests(userId) {
  try {
    const requestsRef = collection(db, 'solicitacoesAmizade');
    const q = query(requestsRef, 
      where('paraId', '==', userId),
      where('status', '==', 'pendente')
    );
    const snapshot = await getDocs(q);
    
    const requests = [];
    snapshot.forEach(doc => {
      requests.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Ordena no cliente para evitar necessidade de índice composto
    requests.sort((a, b) => {
      const timeA = a.criadoEm?.toMillis() || 0;
      const timeB = b.criadoEm?.toMillis() || 0;
      return timeB - timeA; // Mais recentes primeiro
    });
    
    return requests;
  } catch (error) {
    console.error('Erro ao buscar solicitações pendentes:', error);
    throw error;
  }
}

/**
 * Remove amigo (ambos os lados)
 * @param {string} userId - ID do usuário atual
 * @param {string} friendId - ID do amigo a remover
 * @returns {Promise<void>}
 */
export async function removeFriend(userId, friendId) {
  try {
    const batch = writeBatch(db);
    
    // Remove amigo do usuário atual
    const friendRef1 = doc(db, `users/${userId}/amigos`, friendId);
    batch.delete(friendRef1);
    
    // Remove amigo do outro usuário
    const friendRef2 = doc(db, `users/${friendId}/amigos`, userId);
    batch.delete(friendRef2);
    
    await batch.commit();
  } catch (error) {
    console.error('Erro ao remover amigo:', error);
    throw error;
  }
}

/**
 * Busca dados completos de um amigo
 * @param {string} userId - ID do usuário atual
 * @param {string} friendId - ID do amigo
 * @returns {Promise<Object>} Dados do amigo
 */
export async function getFriendProfile(userId, friendId) {
  try {
    const friendDoc = await getDoc(doc(db, `users/${userId}/amigos`, friendId));
    
    if (!friendDoc.exists()) {
      throw new Error('Amigo não encontrado');
    }
    
    const friendData = friendDoc.data();
    
    // Busca dados completos do perfil do amigo (incluindo foto e estrelas atualizadas)
    const fullProfileDoc = await getDoc(doc(db, 'users', friendId));
    const fullProfile = fullProfileDoc.exists() ? fullProfileDoc.data() : {};
    
    return {
      id: friendDoc.id,
      ...friendData,
      fotoUrl: fullProfile.fotoUrl || friendData.fotoUrl || '',
      estrelas: fullProfile.estrelas !== undefined ? fullProfile.estrelas : friendData.estrelas || 0,
      ultimoCampeao: fullProfile.ultimoCampeao !== undefined ? fullProfile.ultimoCampeao : friendData.ultimoCampeao || false,
      nomeTime: fullProfile.nomeTime || fullProfile.timeName || friendData.nomeTime || 'Sem time',
      logoTime: fullProfile.logoTime || fullProfile.timeLogo || friendData.logoTime || ''
    };
  } catch (error) {
    console.error('Erro ao buscar perfil do amigo:', error);
    throw error;
  }
}
