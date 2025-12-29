import {
  searchUserByName,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendsList,
  getPendingRequests
} from "../services/friendsService.js";
import { showModal } from "./modal.js";
import { showSpinner, hideSpinner } from "./spinner.js";
import { showFriendProfile } from "./friendProfileModal.js";
// Obs: import de `getCurrentUser` é feito dinamicamente para evitar
// dependência circular com `authManager.js` (que importa este módulo).

/**
 * Abre o modal de amigos
 */
export async function showFriendsModal(passedUser) {
  const user = passedUser || (await import('../utils/authManager.js')).getCurrentUser();
  if (!user) {
    showModal('error', 'Sessão inválida', 'Faça login para acessar seus amigos');
    return;
  }

  const root = document.getElementById('modal-root') || document.body;

  // Remove modal existente se houver
  const existingModal = document.getElementById('friends-modal-overlay');
  if (existingModal) {
    existingModal.remove();
  }

  // Cria overlay
  const overlay = document.createElement('div');
  overlay.id = 'friends-modal-overlay';
  overlay.className = 'modal-overlay';

  // Cria modal
  const modal = document.createElement('div');
  modal.className = 'modal friends-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'friends-modal-title');

  // Header do modal
  const header = document.createElement('div');
  header.className = 'modal-header';
  
  const title = document.createElement('h3');
  title.id = 'friends-modal-title';
  title.textContent = 'Meus Amigos';
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.setAttribute('aria-label', 'Fechar modal');
  closeBtn.innerHTML = '<i class="fas fa-times"></i>';
  closeBtn.onclick = () => overlay.remove();
  
  header.appendChild(title);
  header.appendChild(closeBtn);

  // Botão adicionar amigo
  const addFriendSection = document.createElement('div');
  addFriendSection.className = 'add-friend-section';
  
  const addBtn = document.createElement('button');
  addBtn.className = 'btn-primary btn-add-friend';
  addBtn.innerHTML = '<i class="fas fa-user-plus"></i> Adicionar Amigo';
  addBtn.onclick = () => showAddFriendForm(user.uid, modal);
  
  addFriendSection.appendChild(addBtn);

  // Container de busca (inicialmente oculto)
  const searchContainer = document.createElement('div');
  searchContainer.className = 'friend-search-container hidden';
  searchContainer.id = 'friend-search-container';
  searchContainer.innerHTML = `
    <div class="input-group">
      <input 
        type="text" 
        id="friend-search-input" 
        placeholder="Digite o nome do usuário..."
        aria-label="Buscar usuário"
      >
      
    </div>
    <div class="search-actions">
        <button class="btn-secondary" id="btn-search-friend">
            <i class="fas fa-search"></i> Buscar
        </button>
        <button class="btn-secondary" id="btn-cancel-search">
            <i class="fas fa-times"></i> Cancelar
        </button>
    </div>
    <div id="search-results" class="search-results"></div>
  `;

  // Solicitações pendentes
  const pendingSection = document.createElement('div');
  pendingSection.className = 'pending-requests-section';
  pendingSection.innerHTML = `
    <h4><i class="fas fa-clock"></i> Solicitações Pendentes</h4>
    <div id="pending-requests-list" class="pending-requests-list">
      <div class="skeleton-loading">
        <div class="skeleton-item"></div>
        <div class="skeleton-item"></div>
      </div>
    </div>
  `;

  // Lista de amigos
  const friendsSection = document.createElement('div');
  friendsSection.className = 'friends-list-section';
  friendsSection.innerHTML = `
    <h4><i class="fas fa-users"></i> Meus Amigos</h4>
    <div id="friends-list" class="friends-list">
      <div class="skeleton-loading">
        <div class="skeleton-item"></div>
        <div class="skeleton-item"></div>
        <div class="skeleton-item"></div>
      </div>
    </div>
  `;

  // Cria wrapper para scroll
  const bodyScrollable = document.createElement('div');
  bodyScrollable.className = 'modal-body-scrollable';
  bodyScrollable.appendChild(addFriendSection);
  bodyScrollable.appendChild(searchContainer);
  bodyScrollable.appendChild(pendingSection);
  bodyScrollable.appendChild(friendsSection);
  
  // Monta modal
  modal.appendChild(header);
  modal.appendChild(bodyScrollable);
  overlay.appendChild(modal);
  root.appendChild(overlay);

  // Fecha ao clicar fora
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  };

  // Carrega dados
  await loadPendingRequests(user.uid);
  await loadFriendsList(user.uid);
}

/**
 * Mostra formulário de adicionar amigo
 */
function showAddFriendForm(userId, modal) {
  const searchContainer = modal.querySelector('#friend-search-container');
  searchContainer.classList.remove('hidden');
  
  const searchInput = modal.querySelector('#friend-search-input');
  const btnSearch = modal.querySelector('#btn-search-friend');
  const btnCancel = modal.querySelector('#btn-cancel-search');
  const resultsDiv = modal.querySelector('#search-results');
  
  searchInput.value = '';
  searchInput.focus();
  resultsDiv.innerHTML = '';
  
  // Handler de busca
  const handleSearch = async () => {
    const searchTerm = searchInput.value.trim();
    
    if (!searchTerm) {
      resultsDiv.innerHTML = '<p class="empty-state">Digite um nome para buscar</p>';
      return;
    }
    
    resultsDiv.innerHTML = '<div class="skeleton-loading"><div class="skeleton-item"></div></div>';
    
    try {
      const user = await searchUserByName(searchTerm, userId);
      
      if (!user) {
        resultsDiv.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-user-slash"></i>
            <p>Usuário não encontrado</p>
            <small>Verifique o nome e tente novamente</small>
          </div>
        `;
        return;
      }
      
      // Exibe resultado
      resultsDiv.innerHTML = `
        <div class="user-result-card">
          <div class="user-info">
            <i class="fas fa-user-circle user-avatar"></i>
            <div>
              <strong>${user.nome}</strong>
              <small>${user.nomeTime}</small>
            </div>
          </div>
          <button class="btn-primary btn-send-request" data-user-id="${user.id}">
            <i class="fas fa-paper-plane"></i> Enviar Solicitação
          </button>
        </div>
      `;
      
      // Handler de enviar solicitação
      const btnSend = resultsDiv.querySelector('.btn-send-request');
      btnSend.onclick = async () => {
        btnSend.disabled = true;
        btnSend.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        
        try {
          const currentUser = (await import('../utils/authManager.js')).getCurrentUser();
          const currentUserData = await getCurrentUserData();
          
          await sendFriendRequest(
            userId, 
            currentUserData.nome,
            user.id,
            user.nome
          );
          
          showModal('success', 'Solicitação enviada!', `Solicitação de amizade enviada para ${user.nome}`);
          searchContainer.classList.add('hidden');
          resultsDiv.innerHTML = '';
        } catch (error) {
          console.error('Erro ao enviar solicitação:', error);
          showModal('error', 'Erro', error.message || 'Não foi possível enviar a solicitação');
          btnSend.disabled = false;
          btnSend.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Solicitação';
        }
      };
      
    } catch (error) {
      console.error('Erro na busca:', error);
      resultsDiv.innerHTML = `
        <div class="empty-state error">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Erro ao buscar usuário</p>
        </div>
      `;
    }
  };
  
  btnSearch.onclick = handleSearch;
  searchInput.onkeypress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  btnCancel.onclick = () => {
    searchContainer.classList.add('hidden');
    resultsDiv.innerHTML = '';
  };
}

/**
 * Carrega solicitações pendentes
 */
async function loadPendingRequests(userId) {
  const container = document.getElementById('pending-requests-list');
  
  try {
    const requests = await getPendingRequests(userId);
    
    if (requests.length === 0) {
      container.innerHTML = '<p class="empty-state">Nenhuma solicitação pendente</p>';
      return;
    }
    
    container.innerHTML = '';
    
    requests.forEach(request => {
      const card = document.createElement('div');
      card.className = 'request-card';
      card.innerHTML = `
        <div class="request-info">
          <i class="fas fa-user-circle request-avatar"></i>
          <div>
            <strong>${request.deNome}</strong>
            <small>Enviada em ${formatDate(request.criadoEm.toDate())}</small>
          </div>
        </div>
        <div class="request-actions">
          <button class="btn-accept" data-request-id="${request.id}">
            <i class="fas fa-check"></i> Aceitar
          </button>
          <button class="btn-reject" data-request-id="${request.id}">
            <i class="fas fa-times"></i> Recusar
          </button>
        </div>
      `;
      
      // Handler aceitar
      const btnAccept = card.querySelector('.btn-accept');
      btnAccept.onclick = async () => {
        btnAccept.disabled = true;
        btnAccept.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        try {
          await acceptFriendRequest(request.id, userId);
          showModal('success', 'Amizade confirmada!', `Você e ${request.deNome} agora são amigos`);
          card.remove();
          await loadFriendsList(userId);
        } catch (error) {
          console.error('Erro ao aceitar:', error);
          showModal('error', 'Erro', 'Não foi possível aceitar a solicitação');
          btnAccept.disabled = false;
          btnAccept.innerHTML = '<i class="fas fa-check"></i> Aceitar';
        }
      };
      
      // Handler recusar
      const btnReject = card.querySelector('.btn-reject');
      btnReject.onclick = async () => {
        btnReject.disabled = true;
        btnReject.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        try {
          await rejectFriendRequest(request.id, userId);
          card.remove();
          if (container.children.length === 0) {
            container.innerHTML = '<p class="empty-state">Nenhuma solicitação pendente</p>';
          }
        } catch (error) {
          console.error('Erro ao recusar:', error);
          showModal('error', 'Erro', 'Não foi possível recusar a solicitação');
          btnReject.disabled = false;
          btnReject.innerHTML = '<i class="fas fa-times"></i> Recusar';
        }
      };
      
      container.appendChild(card);
    });
    
  } catch (error) {
    console.error('Erro ao carregar solicitações:', error);
    container.innerHTML = '<p class="empty-state error">Erro ao carregar solicitações</p>';
  }
}

/**
 * Carrega lista de amigos
 */
async function loadFriendsList(userId) {
  const container = document.getElementById('friends-list');
  
  try {
    const friends = await getFriendsList(userId);
    
    console.log('Debug Friends List:', friends);
    
    if (friends.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-user-friends"></i>
          <p>Você ainda não adicionou amigos</p>
          <small>Clique em "Adicionar Amigo" para começar</small>
        </div>
      `;
      return;
    }
    
    container.innerHTML = '';
    
    friends.forEach(friend => {
      console.log('Renderizando amigo:', {
        nome: friend.nome,
        nomeTime: friend.nomeTime,
        logoTime: friend.logoTime,
        estrelas: friend.estrelas
      });
      const card = document.createElement('div');
      card.className = 'friend-card';
      
      // Garante que os dados existem
      const nome = friend.nome || 'Usuário';
      const nomeTime = friend.nomeTime || 'Sem time';
      const logoTime = friend.logoTime || '';
      const estrelas = friend.estrelas || 0;
      const ultimoCampeao = friend.ultimoCampeao || false;
      const usuarioId = friend.usuarioId || friend.id;
      
      // Estrelas (máximo 5 visíveis)
      const starsHTML = renderStars(estrelas);
      const tooltipText = estrelas > 5 ? `${estrelas} estrelas totais` : '';
      
      card.innerHTML = `
        <div class="friend-info">
          ${logoTime ? 
            `<img src="${logoTime}" alt="${nomeTime}" class="friend-team-logo">` :
            '<i class="fas fa-shield-alt friend-team-logo-fallback"></i>'
          }
          <div class="friend-details">
            <strong>${nome}</strong>
            <small>${nomeTime}</small>
            <div class="friend-stars" ${tooltipText ? `title="${tooltipText}"` : ''}>
              ${starsHTML}
              ${ultimoCampeao ? '<i class="fas fa-trophy trophy-icon" title="Campeão atual"></i>' : ''}
            </div>
          </div>
        </div>
        <button class="btn-view-profile" data-friend-id="${usuarioId}">
          <i class="fas fa-eye"></i> Ver Perfil
        </button>
      `;
      
      // Handler ver perfil
      const btnView = card.querySelector('.btn-view-profile');
      btnView.onclick = () => {
        showFriendProfile(userId, usuarioId);
      };
      
      container.appendChild(card);
    });
    
  } catch (error) {
    console.error('Erro ao carregar lista de amigos:', error);
    container.innerHTML = '<p class="empty-state error">Erro ao carregar lista de amigos</p>';
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
 * Formata data para exibição
 */
function formatDate(date) {
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 7) return `${days} dias atrás`;
  
  return date.toLocaleDateString('pt-BR');
}

/**
 * Busca dados do usuário atual
 */
async function getCurrentUserData() {
  const { getCurrentUser } = await import('../utils/authManager.js');
  const user = getCurrentUser();
  const { getUser } = await import('../services/usersService.js');
  return await getUser(user.uid);
}
