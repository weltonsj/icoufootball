import { db, auth } from "./firebase.js"
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js"
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js"

async function persistUser(uid,{username,email}){
  const profile={nome:username,email,funcao:'Jogador',timeId:null,fotoUrl:null,estrelas:0,perfilPublico:true,redesSociais:{},descricao:'',criadoEm:serverTimestamp(),atualizadoEm:serverTimestamp()}
  await setDoc(doc(db,'users',uid),profile)
  return profile
}

async function registerUser({username,email,password}){
  const cred=await createUserWithEmailAndPassword(auth,email,password)
  const uid=cred.user.uid
  const profile=await persistUser(uid,{username,email})
  return {uid,profile}
}

export { registerUser }
