import { onAuth, logout } from "../services/authService.js";
import { getUser } from "../services/usersService.js";
import { showModal, showConfirmModal } from "../components/modal.js";
import { showSpinner, hideSpinner } from "../components/spinner.js";
import { db } from "../services/firebase.js";
import { API_CONFIG } from "../../config/api-config.js";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

let currentUser = null;
let currentRole = null;

function normalizeRole(role) {
  const r = String(role || '').trim().toLowerCase();
  if (!r) return 'Jogador';
  if (r === 'admin') return 'Admin';
  if (r === 'superadmin' || r === 'super-admin' || r === 'super admin') return 'Superadmin';
  if (r === 'gestao' || r === 'gestão') return 'Gestao';
  if (r === 'jogador' || r === 'player') return 'Jogador';
  // fallback: mantém capitalização razoável
  return role;
}

function isAdminRole(role) {
  const n = normalizeRole(role);
  return n === 'Admin' || n === 'Superadmin';
}

const NAV_ITEMS = {
  home: 'navHome',
  login: 'navLogin',
  dashboard: 'navDashboard',
  matches: 'navMatches',
  chat: 'navChat',
  profile: 'navProfile',
  admin: 'navAdmin'
};

// Funções de cache de autenticação
function saveAuthStateToCache(isAuthenticated, role) {
  try {
    localStorage.setItem('auth_cache', JSON.stringify({
      isAuthenticated,
      role,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error('Erro ao salvar cache:', e);
  }
}

function loadAuthStateFromCache() {
  try {
    const cache = localStorage.getItem('auth_cache');
    if (!cache) return null;
    const data = JSON.parse(cache);
    // Cache válido por 1 hora
    if (Date.now() - data.timestamp > 3600000) {
      localStorage.removeItem('auth_cache');
      return null;
    }
    return data;
  } catch (e) {
    console.error('Erro ao carregar cache:', e);
    return null;
  }
}

function clearAuthCache() {
  try {
    localStorage.removeItem('auth_cache');
  } catch (e) {
    console.error('Erro ao limpar cache:', e);
  }
}

function getNavElement(key) {
  return document.getElementById(NAV_ITEMS[key]);
}

function updateMenuVisibility(user, role) {
  const navHome = getNavElement('home');
  const navLogin = getNavElement('login');
  const navDashboard = getNavElement('dashboard');
  const navMatches = getNavElement('matches');
  const navChat = getNavElement('chat');
  const navProfile = getNavElement('profile');
  const navAdmin = getNavElement('admin');
  const headerAvatar = document.querySelector('.profile-avatar-header');
  const notificationBell = document.getElementById('notification-bell');
  const headerLoginLink = document.getElementById('header-login-link');

  if (!user) {
    // Usuário não autenticado
    navHome && navHome.classList.remove('hidden');
    navLogin && navLogin.classList.remove('hidden');
    navDashboard && navDashboard.classList.add('hidden');
    navMatches && navMatches.classList.add('hidden');
    navChat && navChat.classList.add('hidden');
    navProfile && navProfile.classList.add('hidden');
    navAdmin && navAdmin.classList.add('hidden');
    headerAvatar && headerAvatar.classList.add('hidden');
    notificationBell && notificationBell.classList.add('hidden');
    
    // Exibir link de login no header
    headerLoginLink && headerLoginLink.classList.remove('hidden');

    // Parar listener de notificações (evita cache stale e erros de permissão)
    try {
      import('../services/notificationsService.js')
        .then(({ pararListenerNotificacoes }) => {
          if (typeof pararListenerNotificacoes === 'function') {
            pararListenerNotificacoes();
          }
        })
        .catch(() => {});
    } catch (e) {
      // ignore
    }

    const badge = document.getElementById('notification-badge');
    if (badge) {
      badge.style.display = 'none';
      badge.textContent = '';
    }

    // Remove classes de autenticação do HTML
    document.documentElement.classList.remove('authenticated');
    document.documentElement.classList.remove('role-jogador');
    document.documentElement.classList.remove('role-admin');

    // Salva estado no cache
    saveAuthStateToCache(false, null);
  } else if (normalizeRole(role) === 'Jogador') {
    // Usuário autenticado como Jogador
    headerLoginLink && headerLoginLink.classList.add('hidden');
    navHome && navHome.classList.remove('hidden');
    navLogin && navLogin.classList.add('hidden');
    navDashboard && navDashboard.classList.remove('hidden');
    navMatches && navMatches.classList.remove('hidden');
    navChat && navChat.classList.remove('hidden');
    navProfile && navProfile.classList.remove('hidden');
    navAdmin && navAdmin.classList.add('hidden');
    headerAvatar && headerAvatar.classList.remove('hidden');
    notificationBell && notificationBell.classList.remove('hidden');

    // Adiciona classes de autenticação ao HTML
    document.documentElement.classList.add('authenticated');
    document.documentElement.classList.add('role-jogador');
    document.documentElement.classList.remove('role-admin');

    // Salva estado no cache
    saveAuthStateToCache(true, 'Jogador');
    
    // Inicializa notificações
    initializeNotifications(user);
  } else if (isAdminRole(role)) {
    // Usuário autenticado como Admin/Superadmin
    headerLoginLink && headerLoginLink.classList.add('hidden');
    navHome && navHome.classList.remove('hidden');
    navLogin && navLogin.classList.add('hidden');
    navDashboard && navDashboard.classList.remove('hidden');
    navMatches && navMatches.classList.remove('hidden');
    navChat && navChat.classList.remove('hidden');
    navProfile && navProfile.classList.remove('hidden');
    navAdmin && navAdmin.classList.remove('hidden');
    headerAvatar && headerAvatar.classList.remove('hidden');
    notificationBell && notificationBell.classList.remove('hidden');

    // Adiciona classes de autenticação ao HTML
    document.documentElement.classList.add('authenticated');
    document.documentElement.classList.add('role-admin');
    document.documentElement.classList.remove('role-jogador');

    // Salva estado no cache
    saveAuthStateToCache(true, normalizeRole(role));
    
    // Inicializa notificações
    initializeNotifications(user);
  }
}

function setActiveNavItem(routeName) {
  // Remove active de todos os items
  Object.values(NAV_ITEMS).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });

  // Normaliza o routeName
  const normalizedRoute = routeName.toLowerCase().trim();

  // Adiciona active ao item correspondente
  const navKey = Object.keys(NAV_ITEMS).find(key => {
    if (key === 'logout') return false;
    
    // Match exato para home/homepage
    if (key === 'home') {
      return normalizedRoute === 'home' || 
             normalizedRoute === 'homepage' || 
             normalizedRoute === 'mainpage' ||
             normalizedRoute === '';
    }
    
    // Match para outras rotas
    return normalizedRoute.includes(key);
  });

  if (navKey) {
    const el = getNavElement(navKey);
    if (el) el.classList.add('active');
  }
}

// Função para carregar avatar do usuário
async function loadUserAvatar(user) {
  if (!user) return;

  try {
    const data = await getUser(user.uid);
    const headerAvatar = document.querySelector('.profile-avatar-header .avatar-img');
    const fotoUrl = (data && data.fotoUrl) || '';

    if (headerAvatar && fotoUrl) {
      headerAvatar.src = fotoUrl;
      // Salva URL do avatar no sessionStorage para recarregamento instantâneo
      sessionStorage.setItem('avatar_url', fotoUrl);
    }
  } catch (err) {
    console.error('Erro ao carregar avatar:', err);
  }
}

// Função auxiliar para salvar dados parciais do usuário
async function savePartial(uid, partial) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, partial);
  } else {
    await setDoc(ref, partial, { merge: true });
  }
}

// Função para criar file picker
function createFilePicker() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  return input;
}

// Função para ler arquivo como base64
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const res = String(r.result || '');
      const base64 = res.split(',')[1] || '';
      resolve(base64);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

// Função para fazer upload de foto
async function handleUpload(uid) {
  // Mesma lógica do profile.js - busca de API_CONFIG também
  const key = (window.ENV && window.ENV.IMGBB_KEY) || localStorage.getItem('IMGBB_KEY') || ((API_CONFIG && API_CONFIG.IMGBB_KEY) || null);
  if (!key) {
    showModal('error', 'Chave Imgbb ausente', 'Configure IMGBB_KEY no arquivo api-config.js');
    return;
  }

  const picker = createFilePicker();
  picker.onchange = async () => {
    const file = picker.files && picker.files[0];
    if (!file) return;

    if (!/^image\//.test(file.type)) {
      showModal('error', 'Arquivo inválido', 'Selecione uma imagem');
      return;
    }

    try {
      showSpinner();
      const b64 = await readFileAsBase64(file);
      const fd = new FormData();
      fd.append('image', b64);

      const resp = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        body: fd
      });

      if (!resp.ok) {
        hideSpinner();
        showModal('error', 'Falha no upload', 'Tente novamente mais tarde');
        return;
      }

      const json = await resp.json();
      const url = (json && json.data && json.data.url) || '';

      if (!url) {
        hideSpinner();
        showModal('error', 'Resposta inválida', 'Não foi possível obter a URL');
        return;
      }

      await savePartial(uid, { fotoUrl: url });

      // Atualiza avatar no header
      const headerAvatar = document.querySelector('.profile-avatar-header .avatar-img');
      if (headerAvatar) {
        headerAvatar.src = url;
        // Salva URL do avatar no sessionStorage para recarregamento instantâneo
        sessionStorage.setItem('avatar_url', url);
      }

      // Atualiza foto na página de perfil se existir
      const profilePhoto = document.querySelector('.profile-photo');
      if (profilePhoto) profilePhoto.src = url;

      hideSpinner();
      showModal('success', 'Foto atualizada', 'Sua foto de perfil foi salva');
    } catch (e) {
      hideSpinner();
      showModal('error', 'Erro no upload', 'Verifique sua rede e tente novamente');
    }
  };

  picker.click();
}

// Função para gerenciar dropdown do avatar globalmente - Layout Vertical Moderno
function wireAvatarDropdown(uid) {
  const icon = document.querySelector('.avatar-dropdown-icon');
  if (!icon) return;

  let pop = null;

  function close() {
    if (pop) {
      pop.remove();
      pop = null;
      document.removeEventListener('keydown', onEsc);
      document.removeEventListener('click', onClickOutside);
    }
  }

  function onEsc(e) {
    if (e.key === 'Escape') close();
  }

  function onClickOutside(e) {
    if (pop && !pop.contains(e.target) && !icon.contains(e.target)) {
      close();
    }
  }

  // Remove listener anterior se existir
  const oldListener = icon._avatarClickListener;
  if (oldListener) {
    icon.removeEventListener('click', oldListener);
  }

  // Cria novo listener
  const newListener = async (e) => {
    e.stopPropagation();

    if (pop) {
      close();
      return;
    }

    pop = document.createElement('div');
    pop.className = 'avatar-popover';

    // Menu items com ícones
    const menuItems = [
      { icon: 'fa-camera', text: 'Alterar foto', action: 'photo' },
      { icon: 'fa-edit', text: 'Editar descrição', action: 'description' },
      { icon: 'fa-user-friends', text: 'Amigos', action: 'friends' }
    ];

    menuItems.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.className = 'avatar-menu-item';

      const iconEl = document.createElement('i');
      iconEl.className = `fas ${item.icon}`;

      const textEl = document.createElement('span');
      textEl.textContent = item.text;

      menuItem.appendChild(iconEl);
      menuItem.appendChild(textEl);

      menuItem.onclick = async () => {
        close();

        if (item.action === 'photo') {
          handleUpload(uid);
        } else if (item.action === 'description') {
          showDescriptionModal(uid);
        } else if (item.action === 'friends') {
          const { showFriendsModal } = await import('../components/friendsModal.js');
          await showFriendsModal();
        }
      };

      pop.appendChild(menuItem);
    });

    // Adiciona Public Profile Toggle
    const publicProfileToggle = document.createElement('div');
    publicProfileToggle.className = 'public-profile-toggle avatar-toggle';

    const toggleLabel = document.createElement('span');
    toggleLabel.textContent = 'Perfil Público';

    const switchLabel = document.createElement('label');
    switchLabel.className = 'switch';

    const switchInput = document.createElement('input');
    switchInput.type = 'checkbox';
    
    // Carrega estado atual do perfil
    getUser(uid).then(data => {
      if (data && data.perfilPublico !== undefined) {
        switchInput.checked = data.perfilPublico;
      }
    }).catch(() => {
      switchInput.checked = true; // Padrão: público
    });

    // Handler para salvar mudança
    switchInput.addEventListener('change', async (e) => {
      try {
        const isPublic = e.target.checked;
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { perfilPublico: isPublic });
        showModal('success', 'Perfil atualizado', 
          isPublic ? 'Seu perfil agora é público' : 'Seu perfil agora é privado');
      } catch (err) {
        console.error('Erro ao atualizar perfil:', err);
        showModal('error', 'Erro ao salvar', 'Tente novamente');
        e.target.checked = !e.target.checked; // Reverte
      }
    });

    const switchSlider = document.createElement('span');
    switchSlider.className = 'slider round';

    switchLabel.appendChild(switchInput);
    switchLabel.appendChild(switchSlider);

    publicProfileToggle.appendChild(toggleLabel);
    publicProfileToggle.appendChild(switchLabel);

    pop.appendChild(publicProfileToggle);

    // Adiciona separador
    const separator = document.createElement('div');
    separator.style.height = '1px';
    separator.style.background = 'var(--border-color)';
    separator.style.margin = '8px 0';
    pop.appendChild(separator);

    // Item de Logout
    const logoutItem = document.createElement('div');
    logoutItem.className = 'avatar-menu-item danger';

    const logoutIcon = document.createElement('i');
    logoutIcon.className = 'fas fa-sign-out-alt';

    const logoutText = document.createElement('span');
    logoutText.textContent = 'Sair';

    logoutItem.appendChild(logoutIcon);
    logoutItem.appendChild(logoutText);

    logoutItem.onclick = async () => {
      close();
      await handleLogout();
    };

    pop.appendChild(logoutItem);

    document.body.appendChild(pop);

    // Posiciona o menu
    setTimeout(() => {
      const rect = icon.getBoundingClientRect();
      pop.style.top = `${rect.bottom + 8}px`;
      pop.style.right = '8px';
    }, 0);

    // Adiciona listeners
    setTimeout(() => {
      document.addEventListener('keydown', onEsc);
      document.addEventListener('click', onClickOutside);
    }, 100);
  };

  // Armazena referência ao listener
  icon._avatarClickListener = newListener;
  icon.addEventListener('click', newListener);
}

// Função para mostrar modal de descrição
function showDescriptionModal(uid) {
  const root = document.getElementById('modal-root') || document.body;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  const h = document.createElement('h3');
  h.textContent = 'Editar Descrição';

  const label = document.createElement('label');
  label.textContent = 'Descrição do perfil';
  label.style.display = 'block';
  label.style.marginBottom = '8px';
  label.style.color = 'var(--text-color)';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Ex: A lenda da campianlone';
  input.style.width = '100%';

  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const btnCancel = document.createElement('button');
  btnCancel.className = 'modal-btn';
  btnCancel.textContent = 'Cancelar';

  const btnSave = document.createElement('button');
  btnSave.className = 'modal-btn';
  btnSave.textContent = 'Salvar';

  btnCancel.onclick = () => overlay.remove();

  btnSave.onclick = async () => {
    const v = input.value.trim();
    if (!v || v.length > 280) {
      showModal('error', 'Descrição inválida', 'Informe até 280 caracteres');
      return;
    }

    try {
      showSpinner();
      await savePartial(uid, { descricao: v });

      const motto = document.querySelector('.team-motto');
      if (motto) motto.textContent = v;

      hideSpinner();
      showModal('success', 'Descrição salva', 'Seu lema foi atualizado');
      overlay.remove();
    } catch (e) {
      hideSpinner();
      showModal('error', 'Erro ao salvar', 'Tente novamente');
    }
  };

  modal.appendChild(h);
  modal.appendChild(label);
  modal.appendChild(input);
  modal.appendChild(actions);
  actions.appendChild(btnCancel);
  actions.appendChild(btnSave);
  overlay.appendChild(modal);
  root.appendChild(overlay);

  input.focus();
}

// Função para lidar com logout
async function handleLogout() {
  const confirmed = await showConfirmModal('Encerrar sessão', 'Deseja sair da sua conta?');
  if (!confirmed) return;

  try {
    showSpinner();
    // Limpar estado persistente do chat
    sessionStorage.removeItem('conversaAtivaId');
    
    // IMPORTANTE: Marcar usuário como offline antes de deslogar
    // NÃO atualizar ultimoAcesso - deixar congelado no último valor do heartbeat
    try {
      const { atualizarStatusOnline, atualizarConversaAtiva } = await import('../services/chatService.js');
      await atualizarConversaAtiva(null);
      // Marcar como offline SEM tocar em ultimoAcesso (mantém o último valor do heartbeat)
      await atualizarStatusOnline(false, { preserveLastAccess: true });
      console.log('[Auth] ✅ Usuário marcado como offline - ultimoAcesso preservado');
    } catch (err) {
      console.warn('[Auth] Erro ao marcar usuário como offline:', err);
    }
    
    await logout();
    clearAuthCache();

    // Remover listener de status do usuário
    try {
      if (userStatusUnsubscribe) {
        userStatusUnsubscribe();
        userStatusUnsubscribe = null;
      }
    } catch (e) {
      console.warn('[Auth] Erro ao remover listener de status do usuário:', e);
    }

    // Ocultar o status-indicator no header
    try {
      const profileStatus = document.querySelector('.profile-status');
      if (profileStatus) profileStatus.classList.remove('visible');
    } catch (e) {
      console.warn('[Auth] Erro ao ocultar status-indicator:', e);
    }

    // Remove classes de autenticação do HTML
    document.documentElement.classList.remove('authenticated');
    document.documentElement.classList.remove('role-jogador');
    document.documentElement.classList.remove('role-admin');

    hideSpinner();
    showModal('success', 'Sessão encerrada', 'Você foi desconectado');
    setTimeout(() => {
      window.location.hash = '#homepage';
      window.location.href = './index.html#homepage';
    }, 800);
  } catch (err) {
    hideSpinner();
    showModal('error', 'Erro ao desconectar', 'Tente novamente mais tarde');
  }
}

function initAuthManager() {
  return new Promise((resolve) => {
    let resolved = false;

    onAuth(async (user) => {
      currentUser = user;

      if (!user) {
        currentRole = null;
        updateMenuVisibility(null, null);
        if (!resolved) { resolved = true; resolve(null); }
        return;
      }

      // PRIMEIRO: Marcar usuário como online no Firestore (antes de qualquer outra coisa)
      try {
        const { atualizarStatusOnline } = await import('../services/chatService.js');
        await atualizarStatusOnline(true);
        console.log('[Auth] ✅ Usuário marcado como online no Firestore');
      } catch (err) {
        console.warn('[Auth] ⚠️ Erro ao marcar usuário como online:', err);
      }

      // Atualizar status-indicator globalmente (visível enquanto autenticado)
      try {
        const { carregarStatusUsuarioLogado } = await import('../services/chatService.js');
        const statusObj = await carregarStatusUsuarioLogado();
        const status = statusObj?.status || 'disponivel';

          let loginOfflineTimeout = null;

          // Após login, agendar fallback: se o usuário NÃO acessar a sessão de chat
          // dentro de 60s, marcar como offline (comportamento solicitado).
          try {
            if (loginOfflineTimeout) {
              clearTimeout(loginOfflineTimeout);
              loginOfflineTimeout = null;
            }
            loginOfflineTimeout = setTimeout(async () => {
              // Se já estiver na rota de chat, manter online
              const inChatRoute = window.location && window.location.hash && window.location.hash.startsWith('#chat');
              if (!inChatRoute) {
                try {
                  const { atualizarStatusOnline } = await import('../services/chatService.js');
                  await atualizarStatusOnline(false);
                  console.log('[Auth] Usuário inativo após login - marcado offline (fallback 60s)');
                } catch (e) {
                  console.warn('[Auth] Erro no fallback de marcar offline:', e);
                }
              }
            }, 60000);

            // Cancelar fallback se navegar para chat
            const cancelOnChat = () => {
              if (window.location.hash && window.location.hash.startsWith('#chat')) {
                if (loginOfflineTimeout) { clearTimeout(loginOfflineTimeout); loginOfflineTimeout = null; }
                window.removeEventListener('hashchange', cancelOnChat);
              }
            };
            window.addEventListener('hashchange', cancelOnChat);
          } catch (e) {
            console.warn('[Auth] Erro ao agendar fallback offline após login:', e);
          }
        const statusLabels = {
          'disponivel': 'Online',
          'ocupado': 'Ocupado',
          'ausente': 'Ausente',
          'invisivel': 'Offline'
        };

        const statusIndicator = document.querySelector('.status-indicator');
        const profileStatus = document.querySelector('.profile-status');

        if (statusIndicator) {
          const statusClassMap = {
            'disponivel': 'online',
            'online': 'online',
            'ocupado': 'ocupado',
            'ausente': 'ausente',
            'offline': 'offline',
            'invisivel': 'invisivel'
          };
          const cssClass = statusClassMap[status] || 'online';
          statusIndicator.classList.remove('online', 'ocupado', 'ausente', 'offline', 'invisivel');
          statusIndicator.classList.add(cssClass);
          statusIndicator.innerHTML = `\n          <span class="status-dot"></span>\n          ${statusLabels[status] || 'Online'}\n        `;
          if (profileStatus) profileStatus.classList.add('visible');
        }

        // Escutar mudanças em tempo real no documento do usuário para atualizar o indicador
        try {
          if (userStatusUnsubscribe) {
            userStatusUnsubscribe();
            userStatusUnsubscribe = null;
          }
          userStatusUnsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
            if (!snap.exists()) return;
            const d = snap.data();
            const newStatus = d?.status || (d?.online ? 'disponivel' : 'invisivel');
            const label = statusLabels[newStatus] || (d?.online ? 'Online' : 'Offline');
            if (statusIndicator) {
              const statusClassMap = {
                'disponivel': 'online',
                'online': 'online',
                'ocupado': 'ocupado',
                'ausente': 'ausente',
                'offline': 'offline',
                'invisivel': 'invisivel'
              };
              const cssClass = statusClassMap[newStatus] || (d?.online ? 'online' : 'invisivel');
              statusIndicator.classList.remove('online', 'ocupado', 'ausente', 'offline', 'invisivel');
              statusIndicator.classList.add(cssClass);
              statusIndicator.innerHTML = `<span class="status-dot"></span>${label}`;
              if (profileStatus) profileStatus.classList.add('visible');
            }
          }, (err) => {
            console.warn('[Auth] Erro no listener do status do usuário:', err);
          });
        } catch (err) {
          console.warn('[Auth] Não foi possível iniciar listener de status do usuário:', err);
        }
      } catch (err) {
        console.warn('[Auth] Erro ao carregar/atualizar status-indicator:', err);
      }

      try {
        const profile = await getUser(user.uid);
        // Bloqueio por conta inativa (campo `ativo: false`)
        const ativo = profile && Object.prototype.hasOwnProperty.call(profile, 'ativo') ? !!profile.ativo : true;
        if (!ativo) {
          currentRole = null;
          updateMenuVisibility(null, null);
          try {
            await logout();
          } catch (e) {
            console.warn('[Auth] Erro ao deslogar usuário inativo:', e);
          }
          showModal('error', 'Conta inativa', 'Sua conta foi inativada. Contate o administrador.');
          if (!resolved) { resolved = true; resolve(null); }
          return;
        }

        currentRole = normalizeRole((profile && profile.funcao) || 'Jogador');
        updateMenuVisibility(user, currentRole);

        // Carrega avatar do usuário
        await loadUserAvatar(user);

        // Inicializa dropdown do avatar globalmente
        wireAvatarDropdown(user.uid);
      } catch (err) {
        console.error('Erro ao buscar perfil do usuário:', err);
        currentRole = 'Jogador';
        updateMenuVisibility(user, currentRole);
      }

      if (!resolved) { resolved = true; resolve(user); }
    });
  });
}

function getCurrentUser() {
  return currentUser;
}

function getCurrentRole() {
  return currentRole;
}

function isCurrentUserAdmin() {
  return isAdminRole(currentRole);
}

/**
 * Inicializa sistema de notificações
 */
let notificationUnsubscribe = null;
let userStatusUnsubscribe = null;

async function initializeNotifications(user) {
  if (!user) {
    console.warn('[Auth] Tentativa de inicializar notificações sem usuário autenticado');
    return;
  }
  
  // Verifica se o usuário tem UID válido
  if (!user.uid) {
    console.warn('[Auth] Usuário sem UID válido, ignorando inicialização de notificações');
    return;
  }
  
  try {
    const { 
      iniciarListenerNotificacoes, 
      configurarNotificationBell,
      exibirDropdownNotificacoes 
    } = await import('../services/notificationsService.js');
    
    // CORREÇÃO: Aguardar tempo suficiente para o chat restaurar estado e marcar mensagens como lidas
    // O chat faz limpeza no Firestore que leva tempo
    console.log('[Auth] ⏳ Aguardando chat inicializar (1.5s)...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Iniciar listener de notificações (atualiza badge automaticamente)
    console.log('[Auth] 🔔 Iniciando listener de notificações para usuário:', user.uid);
    iniciarListenerNotificacoes(user.uid);
    
    // Configurar click no notification-bell
    configurarNotificationBell();
    
    console.log('[Auth] ✅ Sistema de notificações inicializado');
    
  } catch (error) {
    console.error('[Auth] Erro ao inicializar notificações:', error);
    
    // Fallback: tentar método antigo
    try {
      const { listenUnreadNotifications } = await import('../services/notificationsService.js');
      
      if (notificationUnsubscribe) {
        notificationUnsubscribe();
      }
      
      notificationUnsubscribe = listenUnreadNotifications(user.uid, (count) => {
        const badge = document.getElementById('notification-badge');
        if (badge) {
          if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
          } else {
            badge.style.display = 'none';
          }
        }
      });
    } catch (e) {
      console.error('Fallback de notificações falhou:', e);
    }
  }
}

export {
  initAuthManager,
  updateMenuVisibility,
  setActiveNavItem,
  getCurrentUser,
  getCurrentRole,
  isCurrentUserAdmin,
  loadAuthStateFromCache,
  saveAuthStateToCache,
  clearAuthCache
};
