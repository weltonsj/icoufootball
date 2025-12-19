import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const cache = new Map();

async function getUserMap(ids) {
  const result = new Map();
  for (const id of ids) {
    if (cache.has(id)) {
      result.set(id, cache.get(id));
      continue;
    }
    const snap = await getDoc(doc(db, "users", id));
    const data = snap.exists() ? snap.data() : null;
    cache.set(id, data);
    result.set(id, data);
  }
  return result;
}

export { getUserMap };
async function getUser(uid){const snap=await getDoc(doc(db,'users',uid));return snap.exists()?snap.data():null}
export { getUser }
