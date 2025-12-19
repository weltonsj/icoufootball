import { 
  getUnreadNotifications, 
  markNotificationsAsRead 
} from "../services/notificationsService.js";
import { showModal } from "./modal.js";
import { getCurrentUser } from "../utils/authManager.js";

/**
 * Abre modal de notificações
 */
export async function showNotificationsModal() {
  const user = getCurrentUser();
  if (!user) {
    showModal('error', 'Sessão inválida', 'Faça login para ver notificações');
    return;
  }

  const root = document.getElementById('modal-root') || document.body;

  // Remove modal existente
  const existingModal = document.getElementById('notifications-modal-overlay');
  if (existingModal) {
    existingModal.remove();
  }

  // Busca notificações
  const notifications = await getUnreadNotifications(user.uid);

  // Cria overlay
  const overlay = document.createElement('div');
  overlay.id = 'notifications-modal-overlay';
  overlay.className = 'modal-overlay';

  // Cria modal
  const modal = document.createElement('div');
  modal.className = 'modal notifications-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  modal.innerHTML = `
    <div class="modal-header">
      <h3><i class="fas fa-bell"></i> Notificações</h3>
      <button class="modal-close" aria-label="Fechar modal">
        <i class="fas fa-times"></i>
      </button>
    </div>
    
    <div class="notifications-content">
      ${notifications.length === 0 ? `
        <div class="empty-state">
          <i class="fas fa-bell-slash"></i>
          <p>Nenhuma notificação nova</p>
          <small>Você está em dia!</small>
        </div>
      ` : `
        <div class="notifications-list">
          ${notifications.map(notif => `
            <div class="notification-item ${notif.tipo}" data-id="${notif.id}">
              <div class="notification-icon">
                ${getNotificationIcon(notif.tipo)}
              </div>
              <div class="notification-content">
                <strong>${notif.mensagem}</strong>
                <small>${formatNotificationDate(notif.criadoEm?.toDate())}</small>
              </div>
              ${notif.tipo === 'solicitacao_amizade' ? `
                <button class="btn-view-request" data-request-id="${notif.solicitacaoId || ''}">
                  Ver
                </button>
              ` : ''}
            </div>
          `).join('')}
        </div>
        <div class="notifications-actions">
          <button class="btn-secondary" id="btn-mark-all-read">
            <i class="fas fa-check-double"></i> Marcar Todas como Lidas
          </button>
        </div>
      `}
    </div>
  `;

  overlay.appendChild(modal);
  root.appendChild(overlay);

  // Event listeners
  const closeBtn = modal.querySelector('.modal-close');
  closeBtn.onclick = () => overlay.remove();

  // Marca como lida ao abrir
  if (notifications.length > 0) {
    const notifIds = notifications.map(n => n.id);
    setTimeout(() => {
      markNotificationsAsRead(notifIds);
      // Badge será atualizado automaticamente pelo listener em tempo real
    }, 1000);
  }

  // Botão marcar todas como lidas
  const btnMarkAll = modal.querySelector('#btn-mark-all-read');
  if (btnMarkAll) {
    btnMarkAll.onclick = async () => {
      const notifIds = notifications.map(n => n.id);
      await markNotificationsAsRead(notifIds);
      overlay.remove();
      showModal('success', 'Feito!', 'Todas as notificações foram marcadas como lidas');
      // Badge será atualizado automaticamente pelo listener em tempo real
    };
  }

  // Botão "Ver" nas solicitações
  const btnViewRequests = modal.querySelectorAll('.btn-view-request');
  btnViewRequests.forEach(btn => {
    btn.onclick = async () => {
      overlay.remove();
      const { showFriendsModal } = await import('./friendsModal.js');
      await showFriendsModal();
    };
  });

  // Fecha ao clicar fora
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  };
}

/**
 * Retorna ícone conforme tipo de notificação
 */
function getNotificationIcon(tipo) {
  const icons = {
    'solicitacao_amizade': '<i class="fas fa-user-plus"></i>',
    'amizade_aceita': '<i class="fas fa-user-check"></i>',
    'mensagem': '<i class="fas fa-comment"></i>',
    'partida': '<i class="fas fa-gamepad"></i>'
  };
  return icons[tipo] || '<i class="fas fa-bell"></i>';
}

/**
 * Formata data da notificação
 */
function formatNotificationDate(date) {
  if (!date) return '';
  
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `${minutes}min atrás`;
  if (hours < 24) return `${hours}h atrás`;
  if (days < 7) return `${days}d atrás`;
  
  return date.toLocaleDateString('pt-BR');
}
