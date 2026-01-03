/**
 * matchesService.js
 * Serviço de gerenciamento de partidas do iCouFootball
 * Implementa RF11 (Criação de Partidas entre Amigos), RF5 (Fair Play) e RF12 (Bloco Ao Vivo)
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  Timestamp,
  writeBatch,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';
import { db } from './firebase.js';

// ============================================================================
// CONSTANTES E VALIDAÇÕES
// ============================================================================

/**
 * Plataformas de streaming suportadas com regex de validação
 */
export const PLATAFORMAS_STREAMING = {
  youtube: {
    nome: 'YouTube',
    icone: 'fab fa-youtube',
    cor: '#FF0000',
    regex: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i,
    embedConverter: (url) => {
      // Converte youtu.be/xxx, youtube.com/watch?v=xxx, ou youtube.com/live/xxx para embed
      const patterns = [
        /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/))([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/
      ];
      
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          return `https://www.youtube.com/embed/${match[1]}`;
        }
      }
      return url;
    }
  },
  twitch: {
    nome: 'Twitch',
    icone: 'fab fa-twitch',
    cor: '#9146FF',
    regex: /^(https?:\/\/)?(www\.)?twitch\.tv\/.+/i,
    embedConverter: (url) => {
      // Extrai channel name do Twitch
      const channelMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/i);
      if (channelMatch) {
        return `https://player.twitch.tv/?channel=${channelMatch[1]}&parent=${window.location.hostname}`;
      }
      return url;
    }
  },
  kick: {
    nome: 'Kick',
    icone: 'fas fa-k',
    cor: '#53FC18',
    regex: /^(https?:\/\/)?(www\.)?kick\.com\/.+/i,
    embedConverter: (url) => {
      // Kick não suporta embed diretamente, abre em nova aba
      return url;
    }
  },
  facebook: {
    nome: 'Facebook Gaming',
    icone: 'fab fa-facebook',
    cor: '#1877F2',
    regex: /^(https?:\/\/)?(www\.)?facebook\.com\/(gaming\/)?.+/i,
    embedConverter: (url) => {
      // Facebook video embed
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
    }
  },
  instagram: {
    nome: 'Instagram Live',
    icone: 'fab fa-instagram',
    cor: '#E4405F',
    regex: /^(https?:\/\/)?(www\.)?instagram\.com\/.+/i,
    embedConverter: (url) => {
      // Instagram não suporta embed de lives, abre em nova aba
      return url;
    }
  },
  outro: {
    nome: 'Outro',
    icone: 'fas fa-globe',
    cor: '#888888',
    regex: /^https?:\/\/.+/i,
    embedConverter: (url) => url
  }
};

/**
 * Status possíveis de uma partida
 */
export const STATUS_PARTIDA = {
  AGUARDANDO: 'aguardando',       // Aguardando resultado
  EM_ANDAMENTO: 'em_andamento',   // Transmissão ao vivo
  FINALIZADA: 'finalizada'        // Partida encerrada
};

/**
 * Status possíveis do placar
 */
export const STATUS_PLACAR = {
  SEM_PLACAR: 'sem_placar',           // Nenhum placar inserido
  PENDENTE: 'pendente',               // Aguardando confirmação do adversário
  CONFIRMADO: 'confirmado',           // Confirmado por ambos
  CONTESTADO: 'contestado'            // Contestado pelo adversário
};

/**
 * Valida URL de transmissão de acordo com a plataforma
 * @param {string} plataforma - Nome da plataforma
 * @param {string} url - URL para validar
 * @returns {boolean} - true se válido
 */
export function validarUrlTransmissao(plataforma, url) {
  if (!plataforma || !url) return false;
  
  const plataformaConfig = PLATAFORMAS_STREAMING[plataforma.toLowerCase()];
  if (!plataformaConfig) return false;
  
  return plataformaConfig.regex.test(url);
}

/**
 * Converte URL para formato embed
 * @param {string} plataforma - Nome da plataforma
 * @param {string} url - URL original
 * @returns {string} - URL para embed
 */
export function converterParaEmbed(plataforma, url) {
  if (!plataforma || !url) return url;
  
  const plataformaConfig = PLATAFORMAS_STREAMING[plataforma.toLowerCase()];
  if (!plataformaConfig || !plataformaConfig.embedConverter) return url;
  
  return plataformaConfig.embedConverter(url);
}

// ============================================================================
// CRIAÇÃO E GERENCIAMENTO DE PARTIDAS
// ============================================================================

/**
 * Cria uma nova partida entre amigos
 * RF11: Partida é criada sem necessidade de o amigo aceitar previamente
 * @param {Object} dados - Dados da partida
 * @returns {Promise<string>} - ID da partida criada
 */
export async function criarPartida(dados) {
  const { 
    criadorId, 
    criadorNome,
    criadorTimeNome,
    criadorTimeLogo,
    criadorFoto,
    adversarioId, 
    adversarioNome,
    adversarioTimeNome,
    adversarioTimeLogo,
    adversarioFoto,
    plataformaStreaming = null, 
    linkTransmissao = null,
    oficial = true,
    campeonatoId = null,
    rodadaId = null
  } = dados;

  // Validações
  if (!criadorId || !adversarioId) {
    throw new Error('IDs de criador e adversário são obrigatórios');
  }

  if (criadorId === adversarioId) {
    throw new Error('Você não pode criar uma partida consigo mesmo');
  }

  // Valida URL se fornecida
  if (linkTransmissao && plataformaStreaming) {
    if (!validarUrlTransmissao(plataformaStreaming, linkTransmissao)) {
      throw new Error(`URL inválida para a plataforma ${plataformaStreaming}`);
    }
  }

  try {
    const partidaData = {
      // Jogadores
      jogadorAId: criadorId,
      jogadorANome: criadorNome || 'Jogador A',
      jogadorATimeNome: criadorTimeNome || 'Sem time',
      jogadorATimeLogo: criadorTimeLogo || '',
      jogadorAFoto: criadorFoto || '',
      
      jogadorBId: adversarioId,
      jogadorBNome: adversarioNome || 'Jogador B',
      jogadorBTimeNome: adversarioTimeNome || 'Sem time',
      jogadorBTimeLogo: adversarioTimeLogo || '',
      jogadorBFoto: adversarioFoto || '',
      
      // Placar
      placarA: null,
      placarB: null,
      placarStatus: STATUS_PLACAR.SEM_PLACAR,
      placarInseridoPor: null,
      vencedorId: null,
      
      // Transmissão
      plataformaStreaming: plataformaStreaming || null,
      linkTransmissao: linkTransmissao || null,
      linkEmbed: linkTransmissao ? converterParaEmbed(plataformaStreaming, linkTransmissao) : null,
      
      // Status e datas
      status: linkTransmissao ? STATUS_PARTIDA.EM_ANDAMENTO : STATUS_PARTIDA.AGUARDANDO,
      dataPartida: serverTimestamp(),
      dataInicio: linkTransmissao ? serverTimestamp() : null,
      dataFim: null,
      
      // Campeonato (se oficial)
      oficial: oficial,
      campeonatoId: campeonatoId,
      rodadaId: rodadaId,
      
      // Metadados
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    };

    // Cria a partida
    const partidaRef = await addDoc(collection(db, 'partidas'), partidaData);
    
    // Cria notificação de confirmação para o adversário
    await addDoc(collection(db, 'notificacoes'), {
      usuarioId: adversarioId,
      tipo: 'convite_amistosa',
      remetenteId: criadorId,
      partidaId: partidaRef.id,
      rodadaId: rodadaId || null,
      mensagemPreview: `${criadorNome || 'Jogador'} vs ${adversarioNome || 'Jogador'}`,
      mensagem: `${criadorNome || 'Um jogador'} convidou você para uma partida. Confirme sua participação.`,
      lida: false,
      dataNotificacao: serverTimestamp(),
      metadados: {
        remetenteId: criadorId,
        remetenteNome: criadorNome || 'Jogador'
      }
    });

    console.log('[matchesService] Partida criada:', partidaRef.id);
    return partidaRef.id;
    
  } catch (error) {
    console.error('[matchesService] Erro ao criar partida:', error);
    throw error;
  }
}

/**
 * Insere resultado de uma partida (Fair Play - Passo 1)
 * RF5: Resultado fica em "Confirmação Pendente"
 * @param {string} partidaId - ID da partida
 * @param {string} userId - ID do usuário inserindo o resultado
 * @param {number} placarA - Placar do jogador A
 * @param {number} placarB - Placar do jogador B
 * @returns {Promise<void>}
 */
export async function inserirResultado(partidaId, userId, placarA, placarB) {
  try {
    const partidaRef = doc(db, 'partidas', partidaId);
    const partidaDoc = await getDoc(partidaRef);
    
    if (!partidaDoc.exists()) {
      throw new Error('Partida não encontrada');
    }
    
    const partida = partidaDoc.data();
    
    // Verifica se o usuário é participante da partida
    if (partida.jogadorAId !== userId && partida.jogadorBId !== userId) {
      throw new Error('Você não é participante desta partida');
    }
    
    // Verifica se já tem placar confirmado
    if (partida.placarStatus === STATUS_PLACAR.CONFIRMADO) {
      throw new Error('Esta partida já foi finalizada');
    }
    
    // Valida placares
    if (placarA < 0 || placarB < 0 || !Number.isInteger(placarA) || !Number.isInteger(placarB)) {
      throw new Error('Placares inválidos');
    }
    
    // Determina o vencedor
    let vencedorId = null;
    if (placarA > placarB) {
      vencedorId = partida.jogadorAId;
    } else if (placarB > placarA) {
      vencedorId = partida.jogadorBId;
    }
    // Se empate, vencedorId permanece null
    
    // Determina o adversário para notificação
    const adversarioId = userId === partida.jogadorAId ? partida.jogadorBId : partida.jogadorAId;
    const inseridorNome = userId === partida.jogadorAId ? partida.jogadorANome : partida.jogadorBNome;
    
    // Atualiza partida
    await updateDoc(partidaRef, {
      placarA: placarA,
      placarB: placarB,
      placarStatus: STATUS_PLACAR.PENDENTE,
      placarInseridoPor: userId,
      vencedorId: vencedorId,
      status: STATUS_PARTIDA.FINALIZADA,
      atualizadoEm: serverTimestamp()
    });
    
    // Notifica o adversário
    await addDoc(collection(db, 'notificacoes'), {
      usuarioId: adversarioId,
      tipo: 'placar_pendente',
      partidaId: partidaId,
      placarA: placarA,
      placarB: placarB,
      mensagem: `${inseridorNome} inseriu o placar ${placarA} x ${placarB}. Confirme o resultado.`,
      lida: false,
      dataNotificacao: serverTimestamp(),
      metadados: {
        remetenteId: userId,
        remetenteNome: inseridorNome
      }
    });
    
    console.log('[matchesService] Resultado inserido:', { partidaId, placarA, placarB });
    
  } catch (error) {
    console.error('[matchesService] Erro ao inserir resultado:', error);
    throw error;
  }
}

/**
 * Confirma resultado de uma partida (Fair Play - Passo 2)
 * RF5: Placar é validado e pontos são atualizados na tabela
 * @param {string} partidaId - ID da partida
 * @param {string} userId - ID do usuário confirmando
 * @returns {Promise<void>}
 */
export async function confirmarResultado(partidaId, userId) {
  try {
    const partidaRef = doc(db, 'partidas', partidaId);
    const partidaDoc = await getDoc(partidaRef);
    
    if (!partidaDoc.exists()) {
      throw new Error('Partida não encontrada');
    }
    
    const partida = partidaDoc.data();
    
    // Verifica se o usuário é participante da partida
    if (partida.jogadorAId !== userId && partida.jogadorBId !== userId) {
      throw new Error('Você não é participante desta partida');
    }
    
    // Verifica se o usuário é diferente de quem inseriu o placar
    if (partida.placarInseridoPor === userId) {
      throw new Error('Você não pode confirmar um placar que você mesmo inseriu');
    }
    
    // Verifica se está pendente de confirmação
    if (partida.placarStatus !== STATUS_PLACAR.PENDENTE) {
      throw new Error('Esta partida não está pendente de confirmação');
    }
    
    const batch = writeBatch(db);
    
    // Atualiza partida
    batch.update(partidaRef, {
      placarStatus: STATUS_PLACAR.CONFIRMADO,
      dataFim: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    });
    
    // Se partida é oficial, atualiza estatísticas
    if (partida.oficial) {
      // Atualiza estatísticas do jogador A
      await atualizarEstatisticasJogador(partida.jogadorAId, {
        golsPro: partida.placarA,
        golsContra: partida.placarB,
        vitoria: partida.placarA > partida.placarB,
        empate: partida.placarA === partida.placarB,
        derrota: partida.placarA < partida.placarB
      });
      
      // Atualiza estatísticas do jogador B
      await atualizarEstatisticasJogador(partida.jogadorBId, {
        golsPro: partida.placarB,
        golsContra: partida.placarA,
        vitoria: partida.placarB > partida.placarA,
        empate: partida.placarA === partida.placarB,
        derrota: partida.placarB < partida.placarA
      });
    }
    
    await batch.commit();
    
    // Notifica quem inseriu o placar que foi confirmado
    const confirmadorNome = userId === partida.jogadorAId ? partida.jogadorANome : partida.jogadorBNome;
    await addDoc(collection(db, 'notificacoes'), {
      usuarioId: partida.placarInseridoPor,
      tipo: 'placar_confirmado',
      partidaId: partidaId,
      mensagem: `${confirmadorNome} confirmou o placar ${partida.placarA} x ${partida.placarB}`,
      lida: false,
      dataNotificacao: serverTimestamp(),
      metadados: {
        remetenteId: userId,
        remetenteNome: confirmadorNome
      }
    });
    
    console.log('[matchesService] Resultado confirmado:', partidaId);
    
  } catch (error) {
    console.error('[matchesService] Erro ao confirmar resultado:', error);
    throw error;
  }
}

/**
 * Contesta resultado de uma partida (Fair Play - Disputa)
 * RF5: Placar fica em disputa até Admin resolver
 * @param {string} partidaId - ID da partida
 * @param {string} userId - ID do usuário contestando
 * @param {string} motivo - Motivo da contestação
 * @returns {Promise<void>}
 */
export async function contestarResultado(partidaId, userId, motivo) {
  try {
    const partidaRef = doc(db, 'partidas', partidaId);
    const partidaDoc = await getDoc(partidaRef);
    
    if (!partidaDoc.exists()) {
      throw new Error('Partida não encontrada');
    }
    
    const partida = partidaDoc.data();
    
    // Verifica se o usuário é participante da partida
    if (partida.jogadorAId !== userId && partida.jogadorBId !== userId) {
      throw new Error('Você não é participante desta partida');
    }
    
    // Verifica se o usuário é diferente de quem inseriu o placar
    if (partida.placarInseridoPor === userId) {
      throw new Error('Você não pode contestar um placar que você mesmo inseriu');
    }
    
    // Verifica se está pendente de confirmação
    if (partida.placarStatus !== STATUS_PLACAR.PENDENTE) {
      throw new Error('Esta partida não está pendente de confirmação');
    }
    
    // Atualiza partida
    const contestadorNome = userId === partida.jogadorAId ? partida.jogadorANome : partida.jogadorBNome;
    
    await updateDoc(partidaRef, {
      placarStatus: STATUS_PLACAR.CONTESTADO,
      contestadoPor: userId,
      motivoContestacao: motivo || 'Placar incorreto',
      atualizadoEm: serverTimestamp()
    });
    
    // Notifica quem inseriu o placar
    await addDoc(collection(db, 'notificacoes'), {
      usuarioId: partida.placarInseridoPor,
      tipo: 'placar_contestado',
      partidaId: partidaId,
      mensagem: `${contestadorNome} contestou o placar. Motivo: ${motivo || 'Placar incorreto'}`,
      lida: false,
      dataNotificacao: serverTimestamp(),
      metadados: {
        remetenteId: userId,
        remetenteNome: contestadorNome,
        motivo: motivo || 'Placar incorreto'
      }
    });
    
    // Notifica admins (para resolução)
    // TODO: Implementar notificação para admins
    
    console.log('[matchesService] Resultado contestado:', partidaId);
    
  } catch (error) {
    console.error('[matchesService] Erro ao contestar resultado:', error);
    throw error;
  }
}

/**
 * Força confirmação de placar (Admin)
 * RF5: Admin pode forçar a confirmação em caso de disputa
 * @param {string} partidaId - ID da partida
 * @param {string} adminId - ID do admin
 * @param {number} placarA - Placar final do jogador A
 * @param {number} placarB - Placar final do jogador B
 * @returns {Promise<void>}
 */
export async function forcarConfirmacao(partidaId, adminId, placarA, placarB) {
  try {
    const partidaRef = doc(db, 'partidas', partidaId);
    const partidaDoc = await getDoc(partidaRef);
    
    if (!partidaDoc.exists()) {
      throw new Error('Partida não encontrada');
    }
    
    const partida = partidaDoc.data();
    
    // Determina o vencedor
    let vencedorId = null;
    if (placarA > placarB) {
      vencedorId = partida.jogadorAId;
    } else if (placarB > placarA) {
      vencedorId = partida.jogadorBId;
    }
    
    // Atualiza partida
    await updateDoc(partidaRef, {
      placarA: placarA,
      placarB: placarB,
      placarStatus: STATUS_PLACAR.CONFIRMADO,
      vencedorId: vencedorId,
      forcadoPor: adminId,
      dataFim: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    });
    
    // Se partida é oficial, atualiza estatísticas
    if (partida.oficial) {
      await atualizarEstatisticasJogador(partida.jogadorAId, {
        golsPro: placarA,
        golsContra: placarB,
        vitoria: placarA > placarB,
        empate: placarA === placarB,
        derrota: placarA < placarB
      });
      
      await atualizarEstatisticasJogador(partida.jogadorBId, {
        golsPro: placarB,
        golsContra: placarA,
        vitoria: placarB > placarA,
        empate: placarA === placarB,
        derrota: placarB < placarA
      });
    }
    
    // Notifica ambos os jogadores
    const notifBase = {
      tipo: 'placar_forcado',
      partidaId: partidaId,
      mensagem: `Placar forçado pelo administrador: ${placarA} x ${placarB}`,
      lida: false,
      dataNotificacao: serverTimestamp(),
      metadados: {
        remetenteId: adminId,
        remetenteNome: 'Administrador'
      }
    };
    
    await addDoc(collection(db, 'notificacoes'), { ...notifBase, usuarioId: partida.jogadorAId });
    await addDoc(collection(db, 'notificacoes'), { ...notifBase, usuarioId: partida.jogadorBId });
    
    // Log da ação
    await addDoc(collection(db, 'logs'), {
      acao: 'forcar_placar',
      userIdResponsavel: adminId,
      tipoUsuario: 'admin',
      entidadeAfetada: partidaId,
      detalhes: { placarA, placarB },
      data: serverTimestamp()
    });
    
    console.log('[matchesService] Placar forçado por admin:', partidaId);
    
  } catch (error) {
    console.error('[matchesService] Erro ao forçar confirmação:', error);
    throw error;
  }
}

// ============================================================================
// CONSULTAS DE PARTIDAS
// ============================================================================

/**
 * Busca partidas de um usuário
 * @param {string} userId - ID do usuário
 * @param {Object} filtros - Filtros opcionais
 * @returns {Promise<Array>} Lista de partidas
 */
export async function getPartidasUsuario(userId, filtros = {}) {
  try {
    const partidasRef = collection(db, 'partidas');
    let partidas = [];
    
    // Busca partidas onde o usuário é jogador A
    const qA = query(partidasRef, where('jogadorAId', '==', userId));
    const snapshotA = await getDocs(qA);
    snapshotA.forEach(doc => {
      partidas.push({ id: doc.id, ...doc.data() });
    });
    
    // Busca partidas onde o usuário é jogador B
    const qB = query(partidasRef, where('jogadorBId', '==', userId));
    const snapshotB = await getDocs(qB);
    snapshotB.forEach(doc => {
      partidas.push({ id: doc.id, ...doc.data() });
    });
    
    // Aplica filtros
    if (filtros.status) {
      partidas = partidas.filter(p => p.status === filtros.status);
    }
    
    if (filtros.placarStatus) {
      partidas = partidas.filter(p => p.placarStatus === filtros.placarStatus);
    }
    
    // Ordena por data (mais recentes primeiro)
    partidas.sort((a, b) => {
      const dataA = a.criadoEm?.toMillis() || 0;
      const dataB = b.criadoEm?.toMillis() || 0;
      return dataB - dataA;
    });
    
    return partidas;
    
  } catch (error) {
    console.error('[matchesService] Erro ao buscar partidas:', error);
    throw error;
  }
}

/**
 * Busca partidas aguardando inserção de resultado (para o criador)
 * @param {string} userId - ID do usuário
 * @returns {Promise<Array>}
 */
export async function getPartidasAguardandoResultado(userId) {
  return getPartidasUsuario(userId, { placarStatus: STATUS_PLACAR.SEM_PLACAR });
}

/**
 * Busca partidas pendentes de confirmação Fair Play
 * Onde o usuário deve confirmar/contestar (não foi ele quem inseriu)
 * @param {string} userId - ID do usuário
 * @returns {Promise<Array>}
 */
export async function getPartidasPendentesConfirmacao(userId) {
  try {
    const todasPartidas = await getPartidasUsuario(userId, { placarStatus: STATUS_PLACAR.PENDENTE });
    // Filtra apenas as que NÃO foram inseridas pelo usuário
    return todasPartidas.filter(p => p.placarInseridoPor !== userId);
  } catch (error) {
    console.error('[matchesService] Erro ao buscar partidas pendentes:', error);
    throw error;
  }
}

/**
 * Busca partidas aguardando confirmação do adversário
 * Onde o usuário inseriu e está aguardando o outro confirmar
 * @param {string} userId - ID do usuário
 * @returns {Promise<Array>}
 */
export async function getPartidasAguardandoAdversario(userId) {
  try {
    const todasPartidas = await getPartidasUsuario(userId, { placarStatus: STATUS_PLACAR.PENDENTE });
    // Filtra apenas as que FORAM inseridas pelo usuário
    return todasPartidas.filter(p => p.placarInseridoPor === userId);
  } catch (error) {
    console.error('[matchesService] Erro ao buscar partidas aguardando:', error);
    throw error;
  }
}

/**
 * Busca partidas contestadas
 * @param {string} userId - ID do usuário
 * @returns {Promise<Array>}
 */
export async function getPartidasContestadas(userId) {
  return getPartidasUsuario(userId, { placarStatus: STATUS_PLACAR.CONTESTADO });
}

/**
 * Busca partidas confirmadas
 * @param {string} userId - ID do usuário
 * @returns {Promise<Array>}
 */
export async function getPartidasConfirmadas(userId) {
  return getPartidasUsuario(userId, { placarStatus: STATUS_PLACAR.CONFIRMADO });
}

/**
 * Busca uma partida específica
 * @param {string} partidaId - ID da partida
 * @returns {Promise<Object|null>}
 */
export async function getPartida(partidaId) {
  try {
    const partidaDoc = await getDoc(doc(db, 'partidas', partidaId));
    if (!partidaDoc.exists()) {
      return null;
    }
    return { id: partidaDoc.id, ...partidaDoc.data() };
  } catch (error) {
    console.error('[matchesService] Erro ao buscar partida:', error);
    throw error;
  }
}

// ============================================================================
// TRANSMISSÕES AO VIVO (RF12)
// ============================================================================

/**
 * Busca transmissões ao vivo
 * RF12: Partidas com linkTransmissao e status 'em_andamento'
 * @returns {Promise<Array>}
 */
export async function getTransmissoesAoVivo() {
  try {
    const partidasRef = collection(db, 'partidas');
    const q = query(
      partidasRef, 
      where('status', '==', STATUS_PARTIDA.EM_ANDAMENTO),
      where('linkTransmissao', '!=', null)
    );
    
    const snapshot = await getDocs(q);
    const transmissoes = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.linkTransmissao) { // Double check
        transmissoes.push({
          id: doc.id,
          ...data,
          plataformaInfo: PLATAFORMAS_STREAMING[data.plataformaStreaming] || null
        });
      }
    });
    
    // Ordena por data de início (mais recentes primeiro)
    transmissoes.sort((a, b) => {
      const dataA = a.dataInicio?.toMillis() || 0;
      const dataB = b.dataInicio?.toMillis() || 0;
      return dataB - dataA;
    });
    
    return transmissoes;
    
  } catch (error) {
    console.error('[matchesService] Erro ao buscar transmissões:', error);
    throw error;
  }
}

/**
 * Listener em tempo real para transmissões ao vivo
 * RF12: Atualização via onSnapshot
 * @param {Function} callback - Função chamada quando dados mudam
 * @returns {Function} - Função para cancelar listener
 */
export function onTransmissoesAoVivo(callback) {
  const partidasRef = collection(db, 'partidas');
  const q = query(
    partidasRef, 
    where('status', '==', STATUS_PARTIDA.EM_ANDAMENTO)
  );
  
  return onSnapshot(q, (snapshot) => {
    const transmissoes = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.linkTransmissao) {
        transmissoes.push({
          id: doc.id,
          ...data,
          plataformaInfo: PLATAFORMAS_STREAMING[data.plataformaStreaming] || null
        });
      }
    });
    
    // Ordena por data de início
    transmissoes.sort((a, b) => {
      const dataA = a.dataInicio?.toMillis() || 0;
      const dataB = b.dataInicio?.toMillis() || 0;
      return dataB - dataA;
    });
    
    callback(transmissoes);
  });
}

/**
 * Inicia transmissão de uma partida
 * @param {string} partidaId - ID da partida
 * @param {string} plataforma - Plataforma de streaming
 * @param {string} linkTransmissao - URL da transmissão
 * @returns {Promise<void>}
 */
export async function iniciarTransmissao(partidaId, plataforma, linkTransmissao) {
  try {
    if (!validarUrlTransmissao(plataforma, linkTransmissao)) {
      throw new Error(`URL inválida para a plataforma ${plataforma}`);
    }
    
    await updateDoc(doc(db, 'partidas', partidaId), {
      plataformaStreaming: plataforma,
      linkTransmissao: linkTransmissao,
      linkEmbed: converterParaEmbed(plataforma, linkTransmissao),
      status: STATUS_PARTIDA.EM_ANDAMENTO,
      dataInicio: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    });
    
    console.log('[matchesService] Transmissão iniciada:', partidaId);
    
  } catch (error) {
    console.error('[matchesService] Erro ao iniciar transmissão:', error);
    throw error;
  }
}

/**
 * Atualiza link de transmissão de uma partida
 * @param {string} partidaId - ID da partida
 * @param {string} plataforma - Plataforma de streaming
 * @param {string} linkTransmissao - URL da transmissão
 * @returns {Promise<void>}
 */
export async function atualizarLinkTransmissao(partidaId, plataforma, linkTransmissao) {
  try {
    const updateData = {
      atualizadoEm: serverTimestamp()
    };
    
    if (linkTransmissao && plataforma) {
      if (!validarUrlTransmissao(plataforma, linkTransmissao)) {
        throw new Error(`URL inválida para a plataforma ${plataforma}`);
      }
      
      updateData.plataformaStreaming = plataforma;
      updateData.linkTransmissao = linkTransmissao;
      updateData.linkEmbed = converterParaEmbed(plataforma, linkTransmissao);
      updateData.status = STATUS_PARTIDA.EM_ANDAMENTO;
      updateData.dataInicio = serverTimestamp();
    } else {
      // Remove transmissão
      updateData.plataformaStreaming = null;
      updateData.linkTransmissao = null;
      updateData.linkEmbed = null;
      updateData.status = STATUS_PARTIDA.AGUARDANDO;
    }
    
    await updateDoc(doc(db, 'partidas', partidaId), updateData);
    
    console.log('[matchesService] Link de transmissão atualizado:', partidaId);
    
  } catch (error) {
    console.error('[matchesService] Erro ao atualizar link de transmissão:', error);
    throw error;
  }
}

/**
 * Encerra transmissão de uma partida
 * @param {string} partidaId - ID da partida
 * @returns {Promise<void>}
 */
export async function encerrarTransmissao(partidaId) {
  try {
    const partidaDoc = await getDoc(doc(db, 'partidas', partidaId));
    
    if (!partidaDoc.exists()) {
      throw new Error('Partida não encontrada');
    }
    
    const partida = partidaDoc.data();
    
    // Determina novo status baseado no placar
    let novoStatus = STATUS_PARTIDA.AGUARDANDO;
    if (partida.placarStatus === STATUS_PLACAR.CONFIRMADO) {
      novoStatus = STATUS_PARTIDA.FINALIZADA;
    }
    
    await updateDoc(doc(db, 'partidas', partidaId), {
      status: novoStatus,
      atualizadoEm: serverTimestamp()
    });
    
    console.log('[matchesService] Transmissão encerrada:', partidaId);
    
  } catch (error) {
    console.error('[matchesService] Erro ao encerrar transmissão:', error);
    throw error;
  }
}

// ============================================================================
// ATUALIZAÇÃO DE ESTATÍSTICAS
// ============================================================================

/**
 * Atualiza estatísticas de um jogador
 * @param {string} userId - ID do usuário
 * @param {Object} dados - Dados da partida
 */
async function atualizarEstatisticasJogador(userId, dados) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.warn('[matchesService] Usuário não encontrado para atualizar estatísticas:', userId);
      return;
    }
    
    const userData = userDoc.data();
    const estatisticas = userData.estatisticas || {
      partidasJogadas: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      golsPro: 0,
      golsContra: 0
    };
    
    // Atualiza estatísticas
    estatisticas.partidasJogadas += 1;
    estatisticas.golsPro += dados.golsPro || 0;
    estatisticas.golsContra += dados.golsContra || 0;
    
    if (dados.vitoria) {
      estatisticas.vitorias += 1;
    } else if (dados.empate) {
      estatisticas.empates += 1;
    } else if (dados.derrota) {
      estatisticas.derrotas += 1;
    }
    
    await updateDoc(userRef, {
      estatisticas: estatisticas,
      atualizadoEm: serverTimestamp()
    });
    
    console.log('[matchesService] Estatísticas atualizadas para:', userId);
    
  } catch (error) {
    console.error('[matchesService] Erro ao atualizar estatísticas:', error);
    // Não propaga erro para não interromper fluxo
  }
}

// ============================================================================
// ÚLTIMAS PARTIDAS FINALIZADAS
// ============================================================================

/**
 * Busca as últimas partidas finalizadas com placar confirmado
 * @param {number} limite - Número máximo de partidas a retornar (padrão: 4)
 * @returns {Promise<Array>} - Lista de partidas finalizadas
 */
export async function getUltimasPartidasFinalizadas(limite = 4) {
  try {
    const partidasRef = collection(db, 'partidas');
    const q = query(
      partidasRef,
      where('placarStatus', '==', STATUS_PLACAR.CONFIRMADO),
      orderBy('criadoEm', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const partidas = [];
    
    snapshot.forEach((doc) => {
      if (partidas.length < limite) {
        partidas.push({
          id: doc.id,
          ...doc.data()
        });
      }
    });
    
    return partidas;
    
  } catch (error) {
    console.error('[matchesService] Erro ao buscar últimas partidas:', error);
    return [];
  }
}

/**
 * Listener em tempo real para últimas partidas finalizadas
 * @param {Function} callback - Função chamada quando dados mudam
 * @param {number} limite - Número máximo de partidas (padrão: 4)
 * @returns {Function} - Função para cancelar listener
 */
export function onUltimasPartidasFinalizadas(callback, limite = 4) {
  const partidasRef = collection(db, 'partidas');
  const q = query(
    partidasRef,
    where('placarStatus', '==', STATUS_PLACAR.CONFIRMADO),
    orderBy('criadoEm', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const partidas = [];
    
    snapshot.forEach((doc) => {
      if (partidas.length < limite) {
        partidas.push({
          id: doc.id,
          ...doc.data()
        });
      }
    });
    
    callback(partidas);
  }, (error) => {
    console.error('[matchesService] Erro no listener de últimas partidas:', error);
    callback([]);
  });
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  // Constantes
  PLATAFORMAS_STREAMING,
  STATUS_PARTIDA,
  STATUS_PLACAR,
  
  // Validações
  validarUrlTransmissao,
  converterParaEmbed,
  
  // CRUD
  criarPartida,
  inserirResultado,
  confirmarResultado,
  contestarResultado,
  forcarConfirmacao,
  
  // Consultas
  getPartidasUsuario,
  getPartidasAguardandoResultado,
  getPartidasPendentesConfirmacao,
  getPartidasAguardandoAdversario,
  getPartidasContestadas,
  getPartidasConfirmadas,
  getPartida,
  getUltimasPartidasFinalizadas,
  onUltimasPartidasFinalizadas,
  
  // Transmissões
  getTransmissoesAoVivo,
  onTransmissoesAoVivo,
  iniciarTransmissao,
  encerrarTransmissao
};
