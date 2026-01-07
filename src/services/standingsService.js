import { db } from "./firebase.js";
import { collection, query, where, limit, getDocs, onSnapshot, orderBy, doc, getDoc, collectionGroup } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { computeRanking, computeStats } from "../utils/ranking.js";

function getYearFromTimestamp(ts) {
  try {
    const d = ts?.toDate?.();
    if (!d) return null;
    return d.getFullYear();
  } catch {
    return null;
  }
}

/**
 * Mantém compatibilidade: retorna o primeiro campeonato ativo.
 */
async function getActiveChampionshipId() {
  const q = query(collection(db, "campeonatos"), where("status", "==", "Ativo"), limit(1));
  const snap = await getDocs(q);
  const docSnap = snap.docs[0];
  return docSnap ? docSnap.id : null;
}

/**
 * Lista (em tempo real) campeonatos ativos.
 * Mantém query simples (sem orderBy) para evitar índices.
 */
function subscribeToActiveChampionships(cb, { max = 5 } = {}) {
  const q = query(collection(db, "campeonatos"), where("status", "==", "Ativo"), limit(max));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => cb(null, err)
  );
}

/**
 * Lista anos disponíveis para campeonatos (baseado na data de início).
 * Retorna array de anos únicos em ordem decrescente.
 */
async function getChampionshipYears() {
  const snap = await getDocs(collection(db, "campeonatos"));
  const years = new Set();
  snap.docs.forEach(doc => {
    const data = doc.data();
    const year = getYearFromTimestamp(data.dataInicio);
    if (year) years.add(year);
  });
  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Lista anos disponíveis para classificação geral (baseado em partidas confirmadas).
 * Retorna array de anos únicos em ordem decrescente.
 */
async function getStandingsYears() {
  const q = query(collection(db, "partidas"), where("placarStatus", "==", "confirmado"));
  const snap = await getDocs(q);
  const years = new Set();
  snap.docs.forEach(doc => {
    const data = doc.data();
    const year = getYearFromTimestamp(data.dataPartida || data.criadoEm);
    if (year) years.add(year);
  });
  // Sempre inclui o ano atual, mesmo sem partidas
  const currentYear = new Date().getFullYear();
  years.add(currentYear);
  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Lista campeonatos de um ano específico.
 * Filtra no client para evitar índices compostos.
 */
async function getChampionshipsByYear(year) {
  const snap = await getDocs(collection(db, "campeonatos"));
  const camps = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(c => {
      const campYear = getYearFromTimestamp(c.dataInicio);
      return campYear === year;
    })
    .sort((a, b) => {
      const ta = a?.dataInicio?.toMillis?.() || 0;
      const tb = b?.dataInicio?.toMillis?.() || 0;
      return tb - ta; // mais recente primeiro
    });
  return camps;
}

/**
 * Ranking por campeonato (classificação do campeonato).
 * Obs: evita índices compostos; filtra no client.
 */
function subscribeToStandings(campeonatoId, cb) {
  if (!campeonatoId) {
    cb({ ranking: [], stats: computeStats([]) });
    return () => {};
  }

  console.log('[Standings] Iniciando listener de campeonato:', campeonatoId);
  const q = query(collection(db, "partidas"), where("campeonatoId", "==", campeonatoId));
  return onSnapshot(q, (snap) => {
    const matches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const confirmadas = matches.filter(m => m.placarStatus === 'confirmado' && Number.isFinite(m.placarA) && Number.isFinite(m.placarB));
    const ranking = computeRanking(confirmadas);
    const stats = computeStats(confirmadas);
    console.log('[Standings] Campeonato carregado:', confirmadas.length, 'partidas confirmadas');
    cb({ ranking, stats });
  }, (error) => {
    console.error('[Standings] Erro ao carregar campeonato:', error);
    cb({ ranking: [], stats: computeStats([]) });
  });
}

/**
 * Ranking anual acumulado (amistosas + campeonatos), baseado no ano corrente.
 * Consulta apenas por placar confirmado e filtra por ano no client.
 */
function subscribeToAnnualStandings({ year = new Date().getFullYear() } = {}, cb) {
  console.log('[Standings] Iniciando listener de classificação anual para ano:', year);
  const q = query(collection(db, "partidas"), where("placarStatus", "==", "confirmado"));
  return onSnapshot(q, (snap) => {
    console.log('[Standings] Dados recebidos:', snap.docs.length, 'partidas confirmadas');
    const matches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const doAno = matches.filter(m => {
      const y = getYearFromTimestamp(m.dataPartida || m.criadoEm);
      return y === year && Number.isFinite(m.placarA) && Number.isFinite(m.placarB);
    });
    console.log('[Standings] Partidas do ano', year + ':', doAno.length);
    const ranking = computeRanking(doAno);
    const stats = computeStats(doAno);
    console.log('[Standings] Ranking calculado:', ranking.length, 'jogadores');
    cb({ ranking, stats, year });
  }, (error) => {
    console.error('[Standings] Erro ao carregar classificação:', error);
    cb({ ranking: [], stats: computeStats([]), year });
  });
}

/**
 * Verifica o estado do usuário em relação a campeonatos.
 * Retorna: { participating: Array, pendingInvites: Array, activeChampionship: Object|null }
 * @param {string} userId - ID do usuário
 */
async function getUserChampionshipStatus(userId) {
  if (!userId) {
    return { participating: [], pendingInvites: [], activeChampionship: null };
  }

  try {
    // Busca campeonatos ativos onde o usuário está participando
    const activeCampsQuery = query(
      collection(db, "campeonatos"),
      where("status", "==", "Ativo")
    );
    const activeCampsSnap = await getDocs(activeCampsQuery);
    
    const participating = [];
    let activeChampionship = null;
    
    for (const campDoc of activeCampsSnap.docs) {
      const campData = { id: campDoc.id, ...campDoc.data() };
      
      // Verifica se o usuário está nos participantes
      if (campData.participantesIds && campData.participantesIds.includes(userId)) {
        participating.push(campData);
        if (!activeChampionship) {
          activeChampionship = campData;
        }
      }
    }

    // Busca convites pendentes para o usuário
    const pendingInvites = [];
    
    // Busca campeonatos com status ConvitesPendentes
    const pendingCampsQuery = query(
      collection(db, "campeonatos"),
      where("status", "==", "ConvitesPendentes")
    );
    const pendingCampsSnap = await getDocs(pendingCampsQuery);
    
    for (const campDoc of pendingCampsSnap.docs) {
      const campData = { id: campDoc.id, ...campDoc.data() };
      
      // Verifica se existe convite pendente para o usuário neste campeonato
      const conviteRef = doc(db, "campeonatos", campDoc.id, "convites", userId);
      const conviteSnap = await getDoc(conviteRef);
      
      if (conviteSnap.exists()) {
        const conviteData = conviteSnap.data();
        if (conviteData.status === 'pendente') {
          pendingInvites.push({
            ...campData,
            conviteId: conviteSnap.id,
            conviteStatus: conviteData.status,
            convidadoEm: conviteData.convidadoEm
          });
        }
      }
    }

    return { participating, pendingInvites, activeChampionship };
  } catch (error) {
    console.error('[standingsService] Erro ao verificar status do usuário em campeonatos:', error);
    return { participating: [], pendingInvites: [], activeChampionship: null };
  }
}

/**
 * Listener em tempo real para o estado do usuário em campeonatos.
 * @param {string} userId - ID do usuário
 * @param {Function} callback - Função chamada com { participating, pendingInvites, activeChampionship }
 */
function subscribeToUserChampionshipStatus(userId, callback) {
  if (!userId) {
    callback({ participating: [], pendingInvites: [], activeChampionship: null });
    return () => {};
  }

  // Listener para campeonatos
  const campsQuery = query(collection(db, "campeonatos"));
  
  return onSnapshot(campsQuery, async (snap) => {
    try {
      const participating = [];
      const pendingInvites = [];
      let activeChampionship = null;
      
      for (const campDoc of snap.docs) {
        const campData = { id: campDoc.id, ...campDoc.data() };
        
        if (campData.status === 'Ativo') {
          // Verifica participação
          if (campData.participantesIds && campData.participantesIds.includes(userId)) {
            participating.push(campData);
            if (!activeChampionship) {
              activeChampionship = campData;
            }
          }
        } else if (campData.status === 'ConvitesPendentes') {
          // Verifica convite pendente
          const conviteRef = doc(db, "campeonatos", campDoc.id, "convites", userId);
          const conviteSnap = await getDoc(conviteRef);
          
          if (conviteSnap.exists()) {
            const conviteData = conviteSnap.data();
            if (conviteData.status === 'pendente') {
              pendingInvites.push({
                ...campData,
                conviteId: conviteSnap.id,
                conviteStatus: conviteData.status,
                convidadoEm: conviteData.convidadoEm
              });
            }
          }
        }
      }
      
      callback({ participating, pendingInvites, activeChampionship });
    } catch (error) {
      console.error('[standingsService] Erro no listener de status:', error);
      callback({ participating: [], pendingInvites: [], activeChampionship: null });
    }
  });
}

export { getActiveChampionshipId, subscribeToActiveChampionships, subscribeToStandings, subscribeToAnnualStandings, getChampionshipYears, getChampionshipsByYear, getStandingsYears, getUserChampionshipStatus, subscribeToUserChampionshipStatus };
