import { verifyResetCode, applyNewPassword } from "../services/authService.js";
import { showModal, showPasswordResetModal } from "../components/modal.js";
import { showSpinner, hideSpinner } from "../components/spinner.js";

function getParam(name){const url=new URL(window.location.href);return url.searchParams.get(name)}

async function init(){
  const code=getParam('oobCode');
  const status=document.getElementById('reset-status');
  if(!code){status.textContent='Link inválido';return}
  try{
    showSpinner();
    await verifyResetCode(code);
    hideSpinner();
    const res=await showPasswordResetModal('Definir nova senha');
    if(!res){status.textContent='Operação cancelada';return}
    showSpinner();
    await applyNewPassword(code,res.password);
    hideSpinner();
    showModal('success','Senha alterada','Você pode fazer login com a nova senha');
    setTimeout(()=>{window.location.href='./login.html'},1000)
  }catch(err){
    hideSpinner();
    showModal('error','Link inválido ou expirado','Solicite uma nova recuperação')
    status.textContent='Não foi possível validar o link'
  }
}

init();
