import { db } from "./firebase.js";
import { collection, query, where, limit, getDocs, onSnapshot, collectionGroup } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { computeRanking, computeStats } from "../utils/ranking.js";

async function getActiveChampionshipId() {
  const q = query(collection(db, "campeonatos"), where("status", "==", "Ativo"), limit(1));
  const snap = await getDocs(q);
  const doc = snap.docs[0];
  return doc ? doc.id : null;
}

function subscribeToStandings(championshipId, cb) {
  const q = query(collectionGroup(db, "partidas"), where("championshipId", "==", championshipId), where("placarStatus", "==", "confirmed"));
  return onSnapshot(q, (snap) => {
    const matches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const ranking = computeRanking(matches);
    const stats = computeStats(matches);
    cb({ ranking, stats });
  });
}

export { getActiveChampionshipId, subscribeToStandings };
