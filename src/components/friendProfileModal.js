import { getFriendProfile, removeFriend } from "../services/friendsService.js";
import { showModal, showConfirmModal } from "./modal.js";
import { showSpinner, hideSpinner } from "./spinner.js";
import { getCurrentUser } from "../utils/authManager.js";

/**
 * Abre modal de perfil do amigo
 * @param {string} userId - ID do usuário atual
 * @param {string} friendId - ID do amigo
 */
export async function showFriendProfile(userId, friendId) {
  showSpinner();
  
  try {
    const friend = await getFriendProfile(userId, friendId);
    
    hideSpinner();
    
    const root = document.getElementById('modal-root') || document.body;
    
    // Remove modal existente se houver
    const existingModal = document.getElementById('friend-profile-modal-overlay');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Cria overlay
    const overlay = document.createElement('div');
    overlay.id = 'friend-profile-modal-overlay';
    overlay.className = 'modal-overlay';
    
    // Cria modal
    const modal = document.createElement('div');
    modal.className = 'modal friend-profile-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'friend-profile-title');
    
    // Renderiza estrelas
    const estrelas = friend.estrelas || 0;
    const starsHTML = renderStars(estrelas);
    const totalStarsText = estrelas > 5 ? ` (${estrelas} total)` : '';
    
    console.log('Debug Friend Profile:', {
      nome: friend.nome,
      estrelas: estrelas,
      starsHTML: starsHTML
    });
    
    // Conteúdo do modal
    modal.innerHTML = `
      <div class="modal-header">
        <h3 id="friend-profile-title">Perfil do Amigo</h3>
        <button class="modal-close" aria-label="Fechar modal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="friend-profile-content">
        <div class="profile-avatar">
          ${friend.fotoUrl ? 
            `<img src="${friend.fotoUrl}" alt="${friend.nome}" class="friend-avatar-img">` :
            '<i class="fas fa-user-circle"></i>'
          }
        </div>
        
        <h2 class="friend-name">${friend.nome}</h2>
        
        <div class="friend-team-info">
          ${friend.logoTime ? 
            `<img src="${friend.logoTime}" alt="${friend.nomeTime}" class="team-logo">` :
            '<i class="fas fa-shield-alt team-logo-fallback"></i>'
          }
          <span class="team-name">${friend.nomeTime}</span>
        </div>
        
        <div class="friend-achievements">
          <div class="achievement-item">
            <i class="fas fa-star achievement-icon"></i>
            <span>Estrelas de Campeonato</span>
            <div class="stars-display">
              ${starsHTML}
              <span class="stars-count">${estrelas}${totalStarsText}</span>
            </div>
          </div>
          
          ${friend.ultimoCampeao ? `
            <div class="achievement-item champion">
              <i class="fas fa-trophy achievement-icon"></i>
              <span>Campeão Atual</span>
              <div class="champion-badge">
                <i class="fas fa-crown"></i>
                Vencedor do Último Campeonato
              </div>
            </div>
          ` : ''}
        </div>
        
        <div class="profile-actions">
          <button class="btn-primary btn-chat" id="btn-chat-friend">
            <i class="fas fa-comments"></i> Conversar
          </button>
          <button class="btn-danger btn-remove" id="btn-remove-friend">
            <i class="fas fa-user-times"></i> Excluir Amigo
          </button>
        </div>
      </div>
    `;
    
    overlay.appendChild(modal);
    root.appendChild(overlay);
    
    // Event listeners
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.onclick = () => overlay.remove();
    
    const btnChat = modal.querySelector('#btn-chat-friend');
    btnChat.onclick = () => {
      openChatWithFriend(friendId, friend.nome);
      overlay.remove();
    };
    
    const btnRemove = modal.querySelector('#btn-remove-friend');
    btnRemove.onclick = async () => {
      const confirmed = await showConfirmModal(
        'Excluir Amigo',
        `Tem certeza que deseja remover ${friend.nome} da sua lista de amigos? Esta ação não pode ser desfeita.`
      );
      
      if (confirmed) {
        btnRemove.disabled = true;
        btnRemove.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removendo...';
        
        try {
          await removeFriend(userId, friendId);
          showModal('success', 'Amigo removido', `${friend.nome} foi removido da sua lista de amigos`);
          overlay.remove();
          
          // Recarrega lista de amigos se o modal estiver aberto
          const friendsModal = document.getElementById('friends-modal-overlay');
          if (friendsModal) {
            const { showFriendsModal } = await import('./friendsModal.js');
            friendsModal.remove();
            await showFriendsModal();
          }
        } catch (error) {
          console.error('Erro ao remover amigo:', error);
          showModal('error', 'Erro', 'Não foi possível remover o amigo');
          btnRemove.disabled = false;
          btnRemove.innerHTML = '<i class="fas fa-user-times"></i> Excluir Amigo';
        }
      }
    };
    
    // Fecha ao clicar fora
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    };
    
  } catch (error) {
    hideSpinner();
    console.error('Erro ao carregar perfil do amigo:', error);
    showModal('error', 'Erro', 'Não foi possível carregar o perfil do amigo');
  }
}

/**
 * Renderiza estrelas (máximo 5 visíveis)
 */
function renderStars(count) {
  const visible = Math.min(count, 5);
  let html = '';
  for (let i = 0; i < visible; i++) {
    html += '<i class="fas fa-star star-filled"></i>';
  }
  return html;
}

/**
 * Abre chat com o amigo
 * @param {string} friendId - ID do amigo
 * @param {string} friendName - Nome do amigo
 */
async function openChatWithFriend(friendId, friendName) {
  console.log(`[FriendProfile] Abrindo chat com ${friendName} (${friendId})`);
  
  // Fechar o modal de amigos (friends-modal) se estiver aberto
  const friendsModal = document.getElementById('friends-modal-overlay');
  if (friendsModal) {
    friendsModal.remove();
    console.log('[FriendProfile] Friends modal fechado');
  }
  
  // Navegar para a rota de chat
  const { renderPages } = await import('../routes/route.js');
  renderPages('chat');
  
  // Aguardar o chat carregar e iniciar conversa com o amigo
  setTimeout(async () => {
    // Usar função global do chat se disponível
    if (typeof window.iniciarChatComAmigo === 'function') {
      await window.iniciarChatComAmigo(friendId);
    } else {
      // Fallback: usar hash para indicar amigo
      window.location.hash = `#chat?friendId=${friendId}&friendName=${encodeURIComponent(friendName)}`;
    }
  }, 500);
}
