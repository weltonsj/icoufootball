/**
 * src/functions/dashboard.js
 * Lógica para a página de Dashboard com seleção de time
 */

import { db } from "../services/firebase.js";
import { getCurrentUser } from "../utils/authManager.js";
import { getUser } from "../services/usersService.js";
import { updateTimeProfileSummary } from "../services/teams-service.js";
import { showModal } from "../components/modal.js";
import { showSpinner, hideSpinner } from "../components/spinner.js";
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

function q(id) { return document.getElementById(id); }
function qs(sel) { return document.querySelector(sel); }

/**
 * Salva dados parciais do usuário
 */
async function savePartial(uid, partial) {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        await updateDoc(ref, partial);
    } else {
        await setDoc(ref, partial, { merge: true });
    }
}

/**
 * Carrega o time do usuário na interface do dashboard (somente exibição)
 */
async function loadUserTeam() {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        const data = await getUser(user.uid);
        
        // Carrega time salvo (timeName e timeLogo)
        if (data && data.timeName && data.timeLogo) {
            updateTimeProfileSummary({ 
                name: data.timeName, 
                logo: data.timeLogo 
            });
        } else {
            // Exibe placeholder se nenhum time foi definido
            const container = qs('.time-profile-summary');
            if (container) {
                container.innerHTML = `
                    <span style="color: #888; font-size: 0.95em;">
                        <i class="fas fa-shield-alt" style="margin-right: 8px;"></i>
                        Nenhum time selecionado. Acesse o Perfil para escolher.
                    </span>
                `;
            }
        }
    } catch (error) {
        console.error('Erro ao carregar time do usuário:', error);
    }
}

/**
 * Inicializa o dashboard (sem lógica de troca de time)
 */
function initDashboard() {
    const user = getCurrentUser();
    if (!user) return;
    
    // Carrega time do usuário (apenas exibição)
    loadUserTeam();
    
    // REMOVIDO: Listener de clique para troca de time
    // A troca de time agora é exclusiva da página de Perfil
}

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}
