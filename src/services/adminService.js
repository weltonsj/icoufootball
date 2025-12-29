import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

import { db } from './firebase.js';
import { computeRanking } from '../utils/ranking.js';

function normalizeRole(role) {
  const r = String(role || '').trim().toLowerCase();
  if (r === 'admin') return 'Admin';
  if (r === 'superadmin' || r === 'super-admin' || r === 'super admin') return 'Superadmin';
  if (r === 'gestao' || r === 'gestão') return 'Gestao';
  return role || 'Jogador';
}

function tipoUsuarioFromRole(role) {
  const n = normalizeRole(role);
  if (n === 'Superadmin') return 'superadmin';
  if (n === 'Admin') return 'admin';
  if (n === 'Gestao') return 'gestao';
  return 'jogador';
}

export async function registrarLog({ acao, userIdResponsavel, role, entidadeAfetada = null, detalhes = {} }) {
  await addDoc(collection(db, 'logs'), {
    acao,
    userIdResponsavel: userIdResponsavel || null,
    tipoUsuario: tipoUsuarioFromRole(role),
    entidadeAfetada: entidadeAfetada || null,
    detalhes: detalhes || {},
    data: serverTimestamp()
  });
}

// =====================
// USERS
// =====================

export function subscribeUsers(cb, { max = 50 } = {}) {
  const q = query(collection(db, 'users'), orderBy('nome'), limit(max));
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    },
    (err) => cb(null, err)
  );
}

export async function setUserRole({ targetUserId, newRole, actorUserId, actorRole }) {
  await updateDoc(doc(db, 'users', targetUserId), {
    funcao: newRole,
    atualizadoEm: serverTimestamp()
  });

  await registrarLog({
    acao: 'alterar_funcao_usuario',
    userIdResponsavel: actorUserId,
    role: actorRole,
    entidadeAfetada: targetUserId,
    detalhes: { funcao: newRole }
  });
}

export async function setUserActive({ targetUserId, ativo, actorUserId, actorRole }) {
  await updateDoc(doc(db, 'users', targetUserId), {
    ativo: !!ativo,
    atualizadoEm: serverTimestamp()
  });

  await registrarLog({
    acao: ativo ? 'reativar_jogador' : 'inativar_jogador',
    userIdResponsavel: actorUserId,
    role: actorRole,
    entidadeAfetada: targetUserId,
    detalhes: { ativo: !!ativo }
  });
}

export async function resetUserStats({ targetUserId, actorUserId, actorRole }) {
  await updateDoc(doc(db, 'users', targetUserId), {
    estatisticas: {
      partidasJogadas: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      golsPro: 0,
      golsContra: 0
    },
    atualizadoEm: serverTimestamp()
  });

  await registrarLog({
    acao: 'resetar_estatisticas_usuario',
    userIdResponsavel: actorUserId,
    role: actorRole,
    entidadeAfetada: targetUserId,
    detalhes: { reset: true }
  });
}

// =====================
// CHAMPIONSHIPS
// =====================

export function subscribeChampionships(cb, { max = 20 } = {}) {
  const q = query(collection(db, 'campeonatos'), orderBy('dataInicio', 'desc'), limit(max));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => cb(null, err)
  );
}

export async function getActiveChampionship() {
  const q = query(collection(db, 'campeonatos'), where('status', '==', 'Ativo'), limit(1));
  const snap = await getDocs(q);
  const d = snap.docs[0];
  return d ? { id: d.id, ...d.data() } : null;
}

export async function createChampionship({ nome, tipo = 'pontos_corridos', participantesIds = [], confrontosModo = 'manual', actorUserId, actorRole }) {
  const nomeFinal = String(nome || '').trim();
  if (!nomeFinal) throw new Error('Informe o nome do campeonato.');
  const tipoFinal = String(tipo || '').trim().toLowerCase() === 'chave' ? 'chave' : 'pontos_corridos';
  const modoFinal = String(confrontosModo || '').trim().toLowerCase() === 'aleatorio' ? 'aleatorio' : 'manual';
  const participantesFinal = Array.isArray(participantesIds) ? participantesIds.filter(Boolean) : [];

  // Limite de campeonatos ativos simultâneos (PRD 2.0)
  const activeQ = query(collection(db, 'campeonatos'), where('status', '==', 'Ativo'));
  const activeSnap = await getDocs(activeQ);
  if (activeSnap.size >= 5) throw new Error('Limite de 5 campeonatos ativos atingido. Finalize algum campeonato antes de criar outro.');

  // Valida mínimos por tipo
  const min = tipoFinal === 'chave' ? 4 : 3;
  if (participantesFinal.length < min) throw new Error(`Selecione pelo menos ${min} participantes para este tipo de campeonato.`);

  const ref = await addDoc(collection(db, 'campeonatos'), {
    nome: nomeFinal,
    tipo: tipoFinal,
    confrontosModo: modoFinal,
    participantesIds: participantesFinal,
    status: 'ConvitesPendentes',
    dataInicio: null,
    dataFim: null,
    campeoes: [],
    tabelaFinal: null,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });

  // Cria convites e notificações
  const batch = writeBatch(db);
  const convitesCol = collection(db, 'campeonatos', ref.id, 'convites');
  participantesFinal.forEach((uid) => {
    const conviteRef = doc(convitesCol, uid);
    batch.set(conviteRef, {
      usuarioId: uid,
      status: 'pendente',
      convidadoEm: serverTimestamp(),
      respondidoEm: null
    });
  });
  await batch.commit();

  // Notificações (fora do batch para manter simplicidade)
  for (const uid of participantesFinal) {
    await addDoc(collection(db, 'notificacoes'), {
      usuarioId: uid,
      tipo: 'convite_campeonato',
      remetenteId: actorUserId,
      campeonatoId: ref.id,
      campeonatoNome: nomeFinal,
      mensagem: `Você foi convidado para o campeonato "${nomeFinal}".`,
      mensagemPreview: `Convite: ${nomeFinal}`,
      lida: false,
      dataNotificacao: serverTimestamp(),
      metadados: {
        remetenteId: actorUserId,
        campeonatoId: ref.id,
        campeonatoNome: nomeFinal
      }
    });
  }

  await registrarLog({
    acao: 'criar_campeonato',
    userIdResponsavel: actorUserId,
    role: actorRole,
    entidadeAfetada: ref.id,
    detalhes: { nome: nomeFinal, tipo: tipoFinal, confrontosModo: modoFinal, participantes: participantesFinal.length }
  });

  return ref.id;
}

export async function startChampionship({ campeonatoId, actorUserId, actorRole }) {
  if (!campeonatoId) throw new Error('Campeonato inválido.');

  // Limite de campeonatos ativos simultâneos
  const activeQ = query(collection(db, 'campeonatos'), where('status', '==', 'Ativo'));
  const activeSnap = await getDocs(activeQ);
  if (activeSnap.size >= 5) throw new Error('Limite de 5 campeonatos ativos atingido.');

  // Busca dados do campeonato
  const champRef = doc(db, 'campeonatos', campeonatoId);
  const champSnap = await getDoc(champRef);
  if (!champSnap.exists()) throw new Error('Campeonato não encontrado.');
  const champData = champSnap.data();

  const convitesQ = query(collection(db, 'campeonatos', campeonatoId, 'convites'));
  const convitesSnap = await getDocs(convitesQ);
  if (convitesSnap.empty) throw new Error('Nenhum convite encontrado para este campeonato.');

  const pendentes = convitesSnap.docs.filter((d) => (d.data()?.status || 'pendente') !== 'confirmado');
  if (pendentes.length > 0) throw new Error('Ainda existem convites pendentes/recusados. O campeonato só pode iniciar após todos confirmarem presença.');

  // Pega lista de participantes confirmados
  const participantesIds = convitesSnap.docs
    .filter((d) => d.data()?.status === 'confirmado')
    .map((d) => d.id);

  if (participantesIds.length < 2) throw new Error('São necessários pelo menos 2 participantes confirmados.');

  // Busca dados dos participantes
  const participantesData = await Promise.all(
    participantesIds.map(async (uid) => {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          id: uid,
          nome: data.nome || 'Jogador',
          timeName: data.timeName || data.nomeTime || 'Sem time',
          timeLogo: data.timeLogo || data.logoTime || ''
        };
      }
      return { id: uid, nome: 'Jogador', timeName: 'Sem time', timeLogo: '' };
    })
  );

  // Gera confrontos (todos contra todos - ida e volta para pontos corridos)
  const confrontos = [];
  const tipo = champData.tipo || 'pontos_corridos';
  
  for (let i = 0; i < participantesData.length; i++) {
    for (let j = i + 1; j < participantesData.length; j++) {
      // Partida de ida
      confrontos.push({
        jogadorA: participantesData[i],
        jogadorB: participantesData[j],
        rodada: confrontos.length + 1
      });
      
      // Partida de volta (apenas para pontos corridos)
      if (tipo === 'pontos_corridos') {
        confrontos.push({
          jogadorA: participantesData[j],
          jogadorB: participantesData[i],
          rodada: confrontos.length + 1
        });
      }
    }
  }

  // Cria as partidas
  const batch = writeBatch(db);
  
  for (const confronto of confrontos) {
    const partidaRef = doc(collection(db, 'partidas'));
    batch.set(partidaRef, {
      jogadorAId: confronto.jogadorA.id,
      jogadorANome: confronto.jogadorA.nome,
      jogadorATimeNome: confronto.jogadorA.timeName,
      jogadorATimeLogo: confronto.jogadorA.timeLogo,
      
      jogadorBId: confronto.jogadorB.id,
      jogadorBNome: confronto.jogadorB.nome,
      jogadorBTimeNome: confronto.jogadorB.timeName,
      jogadorBTimeLogo: confronto.jogadorB.timeLogo,
      
      placarA: null,
      placarB: null,
      placarStatus: 'sem_placar',
      placarInseridoPor: null,
      vencedorId: null,
      
      plataformaStreaming: null,
      linkTransmissao: null,
      linkEmbed: null,
      
      status: 'aguardando',
      dataPartida: serverTimestamp(),
      dataInicio: null,
      dataFim: null,
      
      oficial: true,
      campeonatoId: campeonatoId,
      rodadaId: `rodada_${confronto.rodada}`,
      
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    });
  }

  // Atualiza status do campeonato
  batch.update(champRef, {
    status: 'Ativo',
    dataInicio: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });

  await batch.commit();

  await registrarLog({
    acao: 'iniciar_campeonato',
    userIdResponsavel: actorUserId,
    role: actorRole,
    entidadeAfetada: campeonatoId,
    detalhes: { partidasCriadas: confrontos.length, participantes: participantesIds.length }
  });

  return { partidasCriadas: confrontos.length };
}

async function listarPartidasOficiaisPorCampeonato(campeonatoId) {
  const q = query(collection(db, 'partidas'), where('oficial', '==', true), where('campeonatoId', '==', campeonatoId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function finalizeChampionship({ campeonatoId, actorUserId, actorRole }) {
  const champRef = doc(db, 'campeonatos', campeonatoId);
  const champSnap = await getDoc(champRef);
  if (!champSnap.exists()) throw new Error('Campeonato não encontrado.');

  const champ = champSnap.data();
  if (champ.status !== 'Ativo') throw new Error('Apenas campeonatos ativos podem ser finalizados.');

  const partidas = await listarPartidasOficiaisPorCampeonato(campeonatoId);
  const confirmadas = partidas.filter((p) => p.placarStatus === 'confirmado' && Number.isFinite(p.placarA) && Number.isFinite(p.placarB));
  if (confirmadas.length === 0) throw new Error('Não há partidas confirmadas suficientes para calcular campeão.');

  const ranking = computeRanking(confirmadas);
  const campeaoId = ranking[0]?.id || null;
  if (!campeaoId) throw new Error('Não foi possível determinar o campeão.');

  const batch = writeBatch(db);

  // Atualiza campeonato
  batch.update(champRef, {
    status: 'Finalizado',
    dataFim: serverTimestamp(),
    campeoes: [campeaoId],
    tabelaFinal: ranking,
    atualizadoEm: serverTimestamp()
  });

  // Atualiza troféu/estrelas: desmarca todos e marca campeão
  const usersSnap = await getDocs(collection(db, 'users'));
  usersSnap.forEach((u) => {
    const uref = u.ref;
    batch.update(uref, { ultimoCampeao: false });
  });

  const campeaoRef = doc(db, 'users', campeaoId);
  const campeaoSnap = await getDoc(campeaoRef);
  const estrelasAtual = campeaoSnap.exists() ? Number(campeaoSnap.data().estrelas || 0) : 0;
  batch.update(campeaoRef, {
    ultimoCampeao: true,
    estrelas: Math.max(0, estrelasAtual) + 1,
    atualizadoEm: serverTimestamp()
  });

  await batch.commit();

  await registrarLog({
    acao: 'finalizar_campeonato',
    userIdResponsavel: actorUserId,
    role: actorRole,
    entidadeAfetada: campeonatoId,
    detalhes: { campeaoId }
  });

  return { campeaoId, ranking };
}

// =====================
// FIXED ROUNDS (matches)
// =====================

export function subscribeRodadasFixas(cb, { max = 100 } = {}) {
  // Rodadas fixas são amistosas rápidas (não pertencem a campeonato)
  const q = query(
    collection(db, 'partidas'),
    where('rodadaFixa', '==', true),
    limit(max)
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => cb(null, err)
  );
}

export async function createFriendlyMatchFromRodadaFixa({
  rodadaId,
  jogadorA,
  jogadorB,
  dataPartida,
  actorUserId,
  actorRole
}) {
  if (!jogadorA?.id || !jogadorB?.id) throw new Error('Selecione os dois jogadores.');
  if (jogadorA.id === jogadorB.id) throw new Error('Os jogadores devem ser diferentes.');

  const payload = {
    jogadorAId: jogadorA.id,
    jogadorANome: jogadorA.nome || 'Jogador A',
    jogadorATimeNome: jogadorA.nomeTime || jogadorA.timeName || jogadorA.timeId || 'Sem time',
    jogadorATimeLogo: jogadorA.logoTime || jogadorA.timeLogo || '',

    jogadorBId: jogadorB.id,
    jogadorBNome: jogadorB.nome || 'Jogador B',
    jogadorBTimeNome: jogadorB.nomeTime || jogadorB.timeName || jogadorB.timeId || 'Sem time',
    jogadorBTimeLogo: jogadorB.logoTime || jogadorB.timeLogo || '',

    placarA: null,
    placarB: null,
    placarStatus: 'sem_placar',
    placarInseridoPor: null,
    vencedorId: null,

    motivoContestacao: null,
    contestadoPor: null,

    plataformaStreaming: null,
    linkTransmissao: null,
    linkEmbed: null,

    status: 'aguardando',
    dataPartida: dataPartida || serverTimestamp(),
    dataInicio: null,
    dataFim: null,

    // Amistosa (não-oficial) e vinculada a Rodada Fixa
    oficial: false,
    campeonatoId: null,
    rodadaId: rodadaId || null,
    rodadaFixa: true,

    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  };

  const ref = await addDoc(collection(db, 'partidas'), payload);

  // Notificações de confirmação (para os dois jogadores)
  const nomeA = payload.jogadorANome || 'Jogador A';
  const nomeB = payload.jogadorBNome || 'Jogador B';
  const rodadaTxt = rodadaId ? `Rodada ${rodadaId}` : 'Amistoso';
  const preview = `${rodadaTxt}: ${nomeA} vs ${nomeB}`;

  const baseNotif = {
    tipo: 'convite_amistosa',
    partidaId: ref.id,
    rodadaId: rodadaId || null,
    remetenteId: actorUserId || null,
    mensagemPreview: preview,
    lida: false,
    dataNotificacao: serverTimestamp(),
    metadados: {
      remetenteId: actorUserId || null
    }
  };

  await Promise.all([
    addDoc(collection(db, 'notificacoes'), {
      ...baseNotif,
      usuarioId: payload.jogadorAId,
      mensagem: `Você foi convidado para um amistoso (${rodadaTxt}). Confirme sua participação.`
    }),
    addDoc(collection(db, 'notificacoes'), {
      ...baseNotif,
      usuarioId: payload.jogadorBId,
      mensagem: `Você foi convidado para um amistoso (${rodadaTxt}). Confirme sua participação.`
    })
  ]);

  await registrarLog({
    acao: 'criar_amistosa_rodada',
    userIdResponsavel: actorUserId,
    role: actorRole,
    entidadeAfetada: ref.id,
    detalhes: { rodadaId: rodadaId || null, jogadorAId: jogadorA.id, jogadorBId: jogadorB.id }
  });

  return ref.id;
}

export async function contestarPartidaRodadaFixa({ partidaId, motivo, actorUserId, actorRole }) {
  const motivoFinal = String(motivo || '').trim();
  if (!partidaId) throw new Error('Partida inválida.');
  if (!motivoFinal) throw new Error('Informe o motivo da contestação.');

  const ref = doc(db, 'partidas', partidaId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Partida não encontrada.');

  const data = snap.data();
  if (data?.rodadaFixa !== true) throw new Error('Esta partida não é de Rodada Fixa.');

  await updateDoc(ref, {
    placarStatus: 'contestado',
    motivoContestacao: motivoFinal,
    contestadoPor: actorUserId || null,
    atualizadoEm: serverTimestamp()
  });

  await registrarLog({
    acao: 'contestar_partida_rodada',
    userIdResponsavel: actorUserId,
    role: actorRole,
    entidadeAfetada: partidaId,
    detalhes: { motivo: motivoFinal }
  });
}

export function subscribeOfficialMatchesForChampionship(campeonatoId, cb, { max = 100 } = {}) {
  const q = query(
    collection(db, 'partidas'),
    where('oficial', '==', true),
    where('campeonatoId', '==', campeonatoId),
    limit(max)
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => cb(null, err)
  );
}

export async function createOfficialMatch({
  campeonatoId,
  rodadaId,
  jogadorA,
  jogadorB,
  dataPartida,
  actorUserId,
  actorRole
}) {
  if (!jogadorA?.id || !jogadorB?.id) throw new Error('Selecione os dois jogadores.');
  if (jogadorA.id === jogadorB.id) throw new Error('Os jogadores devem ser diferentes.');

  const payload = {
    jogadorAId: jogadorA.id,
    jogadorANome: jogadorA.nome || 'Jogador A',
    jogadorATimeNome: jogadorA.timeName || jogadorA.timeId || 'Sem time',
    jogadorATimeLogo: jogadorA.timeLogo || '',

    jogadorBId: jogadorB.id,
    jogadorBNome: jogadorB.nome || 'Jogador B',
    jogadorBTimeNome: jogadorB.timeName || jogadorB.timeId || 'Sem time',
    jogadorBTimeLogo: jogadorB.timeLogo || '',

    placarA: null,
    placarB: null,
    placarStatus: 'sem_placar',
    placarInseridoPor: null,
    vencedorId: null,

    plataformaStreaming: null,
    linkTransmissao: null,
    linkEmbed: null,

    status: 'aguardando',
    dataPartida: dataPartida || serverTimestamp(),
    dataInicio: null,
    dataFim: null,

    oficial: true,
    campeonatoId: campeonatoId,
    rodadaId: rodadaId || null,

    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  };

  const ref = await addDoc(collection(db, 'partidas'), payload);

  await registrarLog({
    acao: 'criar_confronto_rodada',
    userIdResponsavel: actorUserId,
    role: actorRole,
    entidadeAfetada: ref.id,
    detalhes: { campeonatoId, rodadaId, jogadorAId: jogadorA.id, jogadorBId: jogadorB.id }
  });

  return ref.id;
}

export async function deleteMatch({ partidaId, actorUserId, actorRole }) {
  await deleteDoc(doc(db, 'partidas', partidaId));
  await registrarLog({
    acao: 'excluir_partida',
    userIdResponsavel: actorUserId,
    role: actorRole,
    entidadeAfetada: partidaId,
    detalhes: {}
  });
}

// =====================
// LOGS
// =====================

export function subscribeLogs(cb, { max = 50 } = {}) {
  const q = query(collection(db, 'logs'), orderBy('data', 'desc'), limit(max));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => cb(null, err)
  );
}
