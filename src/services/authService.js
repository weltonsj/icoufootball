import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, verifyPasswordResetCode, confirmPasswordReset, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

async function login(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

async function register(email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

async function logout() {
  await signOut(auth);
  try { sessionStorage.clear(); localStorage.removeItem('firebase:authUser'); localStorage.removeItem('firebase:accessToken') } catch (e) { }
}

async function verifyResetCode(oobCode) {
  return await verifyPasswordResetCode(auth, oobCode)
}

async function applyNewPassword(oobCode, newPassword) {
  return await confirmPasswordReset(auth, oobCode, newPassword)
}

async function deleteAccount(password) {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  // Reautentica antes de excluir
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);

  // Deleta conta
  await deleteUser(user);
}

export { login, register, resetPassword, onAuth, logout, verifyResetCode, applyNewPassword, deleteAccount };
