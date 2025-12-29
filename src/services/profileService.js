import { db } from "./firebase.js";
import {
  doc,
  onSnapshot,
  getDoc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

async function upsertUserPartial(uid, partial) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, partial);
  } else {
    await setDoc(ref, partial, { merge: true });
  }
}

export function subscribeToUserProfile(uid, onData, onError) {
  const ref = doc(db, "users", uid);
  return onSnapshot(
    ref,
    (snap) => {
      onData(snap.exists() ? snap.data() : null);
    },
    (err) => {
      if (typeof onError === "function") onError(err);
    }
  );
}

export async function updateUserProfile(uid, partial) {
  await upsertUserPartial(uid, partial);
}

export async function removeUserPhoto(uid) {
  await upsertUserPartial(uid, { fotoUrl: "" });
}
