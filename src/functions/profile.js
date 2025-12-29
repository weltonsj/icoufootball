import { db, auth } from "../services/firebase.js";
import { API_CONFIG } from "../../config/api-config.js";
import { getUser } from "../services/usersService.js";
import { getCurrentUser, clearAuthCache } from "../utils/authManager.js";
import { showModal, showConfirmModal } from "../components/modal.js";
import { showSpinner, hideSpinner } from "../components/spinner.js";
import { deleteAccount } from "../services/authService.js";
import { searchTeamByName, saveUserTeam, updateTimeProfileSummary, canChangeTeam } from "../services/teams-service.js";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { subscribeToUserProfile, updateUserProfile, removeUserPhoto } from "../services/profileService.js";

const PLACEHOLDER_AVATAR = './assets/img/avatar-placeholder.svg';
const PLACEHOLDER_TEAM = './assets/img/team-placeholder.svg';

let unsubscribeProfile = null;

function q(id) { return document.getElementById(id) }
function qs(sel) { return document.querySelector(sel) }
function readImgbbKey() { const k = (window.ENV && window.ENV.IMGBB_KEY) || localStorage.getItem('IMGBB_KEY') || ((API_CONFIG && API_CONFIG.IMGBB_KEY) || null); return k }
function onlyDigits(s) { return String(s || '').replace(/\D+/g, '') }
function toE164(input) { const raw = String(input || '').trim(); if (!raw) return ''; if (/^\+\d{10,15}$/.test(raw)) return raw; const d = onlyDigits(raw); return d.length >= 10 ? `+${d}` : '' }
function ensureAt(handle, pattern) { const v = String(handle || '').trim(); if (!v) return ''; const h = v.startsWith('@') ? v : `@${v}`; return pattern.test(h) ? h : '' }
function isStrongPassword(p) { const s = String(p || ''); return s.length >= 6 && /[A-Za-z]/.test(s) && /[0-9]/.test(s) }
function setInvalid(el, flag) { if (el) el.setAttribute('aria-invalid', flag ? 'true' : 'false') }
function setValueIfNotFocused(el, value) { if (!el) return; if (document.activeElement === el) return; el.value = value }

/**
 * Remove os elementos skeleton e exibe os elementos reais
 */
function removeSkeletons() {
    // Remove skeleton da foto
    const photoSkeleton = qs('.profile-photo-skeleton');
    const photo = qs('.profile-photo');
    if (photoSkeleton) photoSkeleton.remove();
    if (photo) photo.style.display = '';
    
    // Remove skeleton do time
    const teamSkeleton = qs('.team-logo-skeleton');
    const teamThumb = qs('.time-profile-summary .profile-thumb');
    if (teamSkeleton) teamSkeleton.remove();
    if (teamThumb) teamThumb.style.display = '';
    
    // Remove skeleton de texto nas estrelas
    const starsSkeleton = qs('.player-stars .skeleton-text');
    if (starsSkeleton) starsSkeleton.remove();
}

function applyProfileDataToUI(data) {
    const safe = data || {};
    
    // Remove skeletons na primeira vez que dados são carregados
    removeSkeletons();
    
    const photo = qs('.profile-photo');
    const headerAvatar = qs('.profile-avatar-header .avatar-img');
    const fUsername = q('username');
    const fPassword = q('password');
    const fBio = q('bio');
    const fWhatsapp = q('whatsapp');
    const fInstagram = q('instagram');
    const fTwitch = q('twitch');
    const fTeamSearch = q('team-search');
    const teamMotto = qs('.team-motto');
    const starsContainer = qs('.player-stars');
    const starsHint = qs('.total-stars-hint');
    const profileVisibility = q('profileVisibility');

    const fotoUrl = safe.fotoUrl ? String(safe.fotoUrl) : '';
    if (photo) {
        photo.src = fotoUrl || PLACEHOLDER_AVATAR;
        photo.onerror = () => { photo.src = PLACEHOLDER_AVATAR; };
    }
    if (headerAvatar) {
        headerAvatar.src = fotoUrl || PLACEHOLDER_AVATAR;
        headerAvatar.onerror = () => { headerAvatar.src = PLACEHOLDER_AVATAR; };
    }

    const nome = safe.nome ? String(safe.nome) : '';
    if (fUsername) setValueIfNotFocused(fUsername, nome);
    if (fPassword) setValueIfNotFocused(fPassword, '*****');

    const descricao = typeof safe.descricao === 'string' ? safe.descricao : (typeof safe.bio === 'string' ? safe.bio : '');
    if (fBio) setValueIfNotFocused(fBio, descricao);

    const redes = (safe.redesSociais && typeof safe.redesSociais === 'object') ? safe.redesSociais : {};
    const whatsapp = redes.whatsapp || safe.whatsapp || '';
    const instagram = redes.instagram || safe.instagram || '';
    const twitch = redes.twitch || safe.twitch || '';

    if (fWhatsapp) {
        setValueIfNotFocused(fWhatsapp, whatsapp);
        applyPhoneMask(fWhatsapp);
    }
    if (fInstagram) setValueIfNotFocused(fInstagram, instagram);
    if (fTwitch) setValueIfNotFocused(fTwitch, twitch);

    if (teamMotto) {
        const desc = descricao || teamMotto.textContent || '';
        teamMotto.textContent = desc;
    }

    const total = Math.max(0, Number(safe.estrelas || 0));
    if (starsContainer) {
        if (starsHint) starsHint.textContent = `${total} TOTAL`;
        renderStars(starsContainer, Math.min(total, 5), !!safe.ultimoCampeao);
    }

    const timeName = safe.timeName || safe.nomeTime || '';
    const timeLogo = safe.timeLogo || safe.logoTime || '';
    // Sempre atualiza o resumo do time, usando placeholder se não houver logo
    updateTimeProfileSummary({ 
        name: String(timeName || 'Selecione seu time'), 
        logo: timeLogo ? String(timeLogo) : PLACEHOLDER_TEAM, 
        id: '' 
    });
    if (fTeamSearch) setValueIfNotFocused(fTeamSearch, timeName ? String(timeName) : '');

    if (profileVisibility) {
        const isPublic = safe.perfilPublico !== false;
        profileVisibility.innerHTML = `
            <span class="visibility-badge">
                <i class="fas ${isPublic ? 'fa-globe' : 'fa-lock'}"></i>
                Perfil ${isPublic ? 'Público' : 'Privado'}
            </span>
        `;
    }
}

function bindProfileRealtime(uid) {
    if (unsubscribeProfile) {
        try { unsubscribeProfile(); } catch { }
        unsubscribeProfile = null;
    }
    unsubscribeProfile = subscribeToUserProfile(
        uid,
        (data) => applyProfileDataToUI(data || {}),
        (err) => {
            console.error('[Profile] Erro no realtime:', err);
            showModal('error', 'Erro ao carregar perfil', 'Não foi possível atualizar seus dados em tempo real');
        }
    );
}
function promptCurrentPassword() { return new Promise(resolve => { const root = document.getElementById('modal-root') || document.body; const overlay = document.createElement('div'); overlay.className = 'modal-overlay'; const modal = document.createElement('div'); modal.className = 'modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); const h = document.createElement('h3'); h.textContent = 'Confirmar senha atual'; const input = document.createElement('input'); input.type = 'password'; input.placeholder = 'Senha atual'; input.setAttribute('aria-invalid', 'true'); input.addEventListener('input', () => { setInvalid(input, input.value.trim() ? false : true) }); const actions = document.createElement('div'); actions.className = 'modal-actions'; const btnCancel = document.createElement('button'); btnCancel.className = 'modal-btn'; btnCancel.textContent = 'Cancelar'; const btnOk = document.createElement('button'); btnOk.className = 'modal-btn'; btnOk.textContent = 'Confirmar'; btnCancel.onclick = () => { overlay.remove(); resolve(null) }; btnOk.onclick = () => { if (!input.value.trim()) { setInvalid(input, true); return } overlay.remove(); resolve(input.value) }; modal.appendChild(h); modal.appendChild(input); modal.appendChild(actions); actions.appendChild(btnCancel); actions.appendChild(btnOk); overlay.appendChild(modal); root.appendChild(overlay); input.focus() }) }

async function loadProfile() { 
    const user = getCurrentUser(); 
    if (!user) { 
        showModal('error', 'Sessão inválida', 'Faça login para acessar seu perfil'); 
        return; 
    } 

    bindProfileRealtime(user.uid);

    // Carregamento inicial para não esperar o primeiro snapshot
    try {
        const data = await getUser(user.uid);
        applyProfileDataToUI(data || {});
    } catch (e) {
        console.warn('[Profile] Falha no carregamento inicial:', e);
    }

    const btnUpload = qs('.btn-upload');
    const btnDeletePhoto = q('btnDeletePhoto');
    if (btnUpload) btnUpload.addEventListener('click', () => handleUpload(user.uid));

    if (btnDeletePhoto) {
        btnDeletePhoto.addEventListener('click', async () => {
            const confirmed = await showConfirmModal(
                'Excluir foto do perfil',
                'Sua foto será removida e você voltará ao avatar padrão. Deseja continuar?'
            );
            if (!confirmed) return;

            try {
                showSpinner();
                await removeUserPhoto(user.uid);
                try { sessionStorage.removeItem('avatar_url'); } catch { }
                hideSpinner();
                showModal('success', 'Foto removida', 'Sua foto de perfil foi removida com sucesso');
            } catch (err) {
                hideSpinner();
                console.error('[Profile] Erro ao remover foto:', err);
                showModal('error', 'Erro ao remover foto', 'Tente novamente mais tarde');
            }
        });
    }

    const fTeamSearch = q('team-search');
    const btnConfirmTeam = q('btn-confirm-team');
    
    // Busca de time por nome (input texto)
    if (fTeamSearch && btnConfirmTeam) {
        const handleConfirm = async () => {
            const teamName = fTeamSearch.value.trim();
            if (!teamName) {
                showModal('warning', 'Campo vazio', 'Digite o nome de um time para buscar');
                return;
            }
            // Verifica limitação antes de buscar
            try {
                const permission = await canChangeTeam(user.uid);
                console.log('🔍 Verificação de permissão:', permission);
                
                if (!permission.allowed) {
                    const hours = Math.floor(permission.remainingMinutes / 60);
                    const minutes = permission.remainingMinutes % 60;
                    const timeText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes} minutos`;
                    console.warn('⚠️ Usuário bloqueado. Tempo restante:', timeText);
                    showModal('warning', 'Aguarde para alterar', `Você só pode alterar seu time 1 vez a cada 2 horas. Aguarde ${timeText}.`);
                    return;
                }
                console.log('✅ Usuário pode alterar o time');
            } catch (permError) {
                console.error('❌ Erro ao verificar permissão:', permError);
                showModal('error', 'Erro', 'Não foi possível verificar permissão. Tente novamente.');
                return;
            }
            showSpinner();
            try {
                // Busca time na API
                const teams = await searchTeamByName(teamName);
                hideSpinner();
                if (teams.length === 0) {
                    showModal('warning', 'Time não encontrado', `Nenhum time encontrado com o nome "${teamName}". Verifique a ortografia e tente novamente.`);
                    return;
                }
                let selectedTeam = teams[0];
                if (teams.length > 1) {
                    selectedTeam = await showTeamSelectionModal(teams);
                    if (!selectedTeam) return;
                }
                try {
                    showSpinner();
                    // Passa skipValidation=true pois já validamos acima
                    await saveUserTeam(user.uid, selectedTeam, true);
                    hideSpinner();
                    fTeamSearch.value = selectedTeam.name;
                } catch (saveError) {
                    hideSpinner();
                    console.error('❌ Erro ao salvar time:', saveError);
                    showModal('error', 'Erro ao salvar', 'Não foi possível salvar o time. Tente novamente.');
                }
            } catch (error) {
                hideSpinner();
                console.error('Erro ao buscar time:', error);
                if (error.code === 'RATE_LIMIT') {
                    showModal('error', 'Limite atingido', error.message);
                } else {
                    showModal('error', 'Erro na busca', 'Não foi possível buscar o time. Verifique sua conexão e tente novamente.');
                }
            }
        };
        btnConfirmTeam.addEventListener('click', (e) => {
            e.preventDefault(); // Previne submit do formulário
            e.stopPropagation(); // Previne propagação do evento
            handleConfirm();
        });
        fTeamSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
            }
        });
    }
}

/**
 * Mostra modal para seleção quando múltiplos times são encontrados
 * @param {Array} teams - Array de times [{id, name, logo}]
 * @returns {Promise<Object|null>} Time selecionado ou null se cancelado
 */
function showTeamSelectionModal(teams) {
    return new Promise((resolve) => {
        const root = document.getElementById('modal-root') || document.body;
        
        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        // Modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.style.cssText = `
            background: var(--secondary-bg, #2c2c2c);
            padding: 30px;
            border-radius: 12px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        `;
        
        // Título
        const title = document.createElement('h3');
        title.textContent = `${teams.length} times encontrados. Selecione um:`;
        title.style.cssText = 'margin-bottom: 20px; color: var(--text-color, #fff);';
        
        // Lista de times
        const list = document.createElement('div');
        list.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;';
        
        teams.forEach(team => {
            const item = document.createElement('button');
            item.className = 'team-item';
            item.style.cssText = `
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 15px;
                background: var(--primary-bg, #1a1a1a);
                border: 2px solid transparent;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                text-align: left;
            `;
            
            // Logo
            const img = document.createElement('img');
            img.src = team.logo;
            img.alt = `${team.name} logo`;
            img.style.cssText = 'width: 40px; height: 40px; object-fit: contain;';
            img.onerror = () => {
                img.src = '/assets/img/team-placeholder.svg';
            };
            
            // Nome
            const name = document.createElement('span');
            name.textContent = team.name;
            name.style.cssText = 'color: var(--text-color, #fff); font-weight: 600; font-size: 1.1em;';
            
            item.appendChild(img);
            item.appendChild(name);
            
            // Hover
            item.onmouseenter = () => {
                item.style.borderColor = 'var(--highlight-color, #FD8A24)';
                item.style.transform = 'scale(1.02)';
            };
            item.onmouseleave = () => {
                item.style.borderColor = 'transparent';
                item.style.transform = 'scale(1)';
            };
            
            // Click
            item.onclick = () => {
                overlay.remove();
                resolve(team);
            };
            
            list.appendChild(item);
        });
        
        // Botão cancelar
        const btnCancel = document.createElement('button');
        btnCancel.className = 'modal-btn';
        btnCancel.textContent = 'Cancelar';
        btnCancel.style.cssText = 'width: 100%; padding: 12px; cursor: pointer;';
        btnCancel.onclick = () => {
            overlay.remove();
            resolve(null);
        };
        
        // Monta
        modal.appendChild(title);
        modal.appendChild(list);
        modal.appendChild(btnCancel);
        overlay.appendChild(modal);
        root.appendChild(overlay);
        
        // Fecha ao clicar fora
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve(null);
            }
        };
    });
}

function createFilePicker() { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; return input }
function readFileAsBase64(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => { const res = String(r.result || ''); const base64 = res.split(',')[1] || ''; resolve(base64) }; r.onerror = () => reject(r.error); r.readAsDataURL(file) }) }
async function handleUpload(uid) {
    const key = readImgbbKey();
    if (!key) {
        showModal('error', 'Chave Imgbb ausente', 'Configure IMGBB_KEY em window.ENV ou localStorage');
        return;
    }
    const picker = createFilePicker();
    picker.onchange = async () => {
        const file = picker.files && picker.files[0];
        if (!file) return;

        const isJpg = file.type === 'image/jpeg';
        const isPng = file.type === 'image/png';
        if (!isJpg && !isPng) {
            showModal('error', 'Arquivo inválido', 'Envie uma imagem .jpg ou .png');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            showModal('error', 'Arquivo muito grande', 'O limite é 2MB');
            return;
        }

        try {
            showSpinner();
            const b64 = await readFileAsBase64(file);
            const fd = new FormData();
            fd.append('image', b64);
            const resp = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`, { method: 'POST', body: fd });
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

            await updateUserProfile(uid, { fotoUrl: url });
            try { sessionStorage.setItem('avatar_url', url); } catch { }

            hideSpinner();
            showModal('success', 'Foto atualizada', 'Sua foto de perfil foi salva');
        } catch (e) {
            hideSpinner();
            showModal('error', 'Erro no upload', 'Verifique sua rede e tente novamente');
        }
    };
    picker.click();
}

async function savePartial(uid, partial) { const ref = doc(db, 'users', uid); const snap = await getDoc(ref); if (snap.exists()) { await updateDoc(ref, partial) } else { await setDoc(ref, partial, { merge: true }) } }

function wireValidation() { 
    const fUsername = q('username'); 
    const fBio = q('bio'); 
    const fWhatsapp = q('whatsapp'); 
    const fInstagram = q('instagram'); 
    const fTwitch = q('twitch'); 
    
    if (fUsername) fUsername.addEventListener('input', () => { 
        const v = fUsername.value.trim(); 
        setInvalid(fUsername, !(v.length >= 3 && v.length <= 40));
    }); 
    
    if (fBio) fBio.addEventListener('input', () => { 
        const v = fBio.value.trim(); 
        setInvalid(fBio, v.length > 280);
    }); 
    
    if (fWhatsapp) {
        // Aplica máscara em tempo real
        fWhatsapp.addEventListener('input', () => { 
            applyPhoneMask(fWhatsapp);
            const e164 = toE164(fWhatsapp.value); 
            setInvalid(fWhatsapp, !e164);
        });
    }
    
    if (fInstagram) fInstagram.addEventListener('input', () => { 
        const ok = /^@[A-Za-z0-9._]{1,30}$/.test(fInstagram.value.startsWith('@') ? fInstagram.value : `@${fInstagram.value}`); 
        setInvalid(fInstagram, !ok);
    }); 
    
    if (fTwitch) fTwitch.addEventListener('input', () => { 
        const ok = /^@[A-Za-z0-9_]{1,25}$/.test(fTwitch.value.startsWith('@') ? fTwitch.value : `@${fTwitch.value}`); 
        setInvalid(fTwitch, !ok);
    });
}

async function saveProfile() {
    const user = getCurrentUser();
    if (!user) {
        showModal('error', 'Sessão inválida', 'Entre novamente');
        return;
    }

    const fUsername = q('username');
    const fPassword = q('password');
    const fBio = q('bio');
    const fWhatsapp = q('whatsapp');
    const fInstagram = q('instagram');
    const fTwitch = q('twitch');

    const nome = (fUsername && fUsername.value.trim()) || '';
    const descricao = (fBio && fBio.value.trim()) || '';
    const whatsapp = (fWhatsapp && fWhatsapp.value.trim()) || '';
    const instagram = (fInstagram && fInstagram.value.trim()) || '';
    const twitch = (fTwitch && fTwitch.value.trim()) || '';

    const e164 = toE164(whatsapp);
    const ig = ensureAt(instagram, /^@[A-Za-z0-9._]{1,30}$/);
    const tw = ensureAt(twitch, /^@[A-Za-z0-9_]{1,25}$/);

    const errors = [];
    if (!(nome.length >= 3 && nome.length <= 40)) errors.push('Nome inválido');
    if (descricao.length > 280) errors.push('Bio muito longa');
    if (whatsapp && !e164) errors.push('WhatsApp inválido');
    if (instagram && !ig) errors.push('Instagram inválido');
    if (twitch && !tw) errors.push('Twitch inválido');
    if (errors.length) {
        showModal('error', 'Validação falhou', errors.join(' • '));
        return;
    }

    const payload = {
        nome,
        descricao,
        redesSociais: {
            whatsapp: e164 || '',
            instagram: ig || '',
            twitch: tw || ''
        }
    };

    try {
        showSpinner();
        await updateUserProfile(user.uid, payload);
        const newPass = (fPassword && fPassword.value.trim()) || '';
        if (newPass && newPass !== '*****') {
            await tryUpdatePassword(user, newPass);
        }
        hideSpinner();
        showModal('success', 'Perfil atualizado', 'Suas alterações foram salvas');
    } catch (e) {
        hideSpinner();
        showModal('error', 'Erro ao salvar', 'Tente novamente mais tarde');
    }
}

async function tryUpdatePassword(user, newPass) { if (!isStrongPassword(newPass)) { showModal('error', 'Senha fraca', 'Use ao menos 6 caracteres com letras e números'); return } try { await updatePassword(user, newPass) } catch (err) { const code = String((err && err.code) || ''); if (code.includes('auth/requires-recent-login')) { const current = await promptCurrentPassword(); if (!current) return; try { const cred = EmailAuthProvider.credential(user.email, current); await reauthenticateWithCredential(user, cred); await updatePassword(user, newPass); showModal('success', 'Senha atualizada', 'Sua senha foi alterada') } catch (e) { showModal('error', 'Falha na reautenticação', 'Verifique a senha atual e tente novamente') } } else { showModal('error', 'Erro ao alterar senha', 'Tente novamente mais tarde') } } }

function wireActions() { const form = qs('.profile-edit-form'); if (form) { form.addEventListener('submit', async e => { e.preventDefault(); await saveProfile() }) } }

function renderStars(container, count, isChampion = false) {
    const hint = container.querySelector('.total-stars-hint');
    const hintDetached = hint ? hint : null;
    container.innerHTML = '';
    for (let i = 0; i < count && i < 5; i++) {
        const s = document.createElement('i');
        s.className = 'fas fa-star filled';
        container.appendChild(s);
    }
    if (isChampion) {
        const t = document.createElement('i');
        t.className = 'fas fa-trophy champion-trophy';
        t.title = 'Campeão do último campeonato';
        container.appendChild(t);
    }
    if (hintDetached) {
        container.appendChild(hintDetached);
    }
}

/**
 * Aplica máscara de telefone brasileiro no formato (99) 99999-9999
 */
function applyPhoneMask(input) {
    if (!input) return;
    
    let value = input.value.replace(/\D/g, ''); // Remove tudo que não é dígito
    
    if (value.length > 11) {
        value = value.slice(0, 11); // Limita a 11 dígitos
    }
    
    if (value.length > 10) {
        // Formato: (99) 99999-9999
        value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (value.length > 6) {
        // Formato: (99) 9999-9999
        value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (value.length > 2) {
        // Formato: (99) 9999
        value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    } else if (value.length > 0) {
        // Formato: (99
        value = value.replace(/^(\d*)/, '($1');
    }
    
    input.value = value;
}

// Funções de times movidas para teams-service.js
// loadTeamSelector → loadTeamsIntoSelect
// updateTeamDisplay → updateTimeProfileSummary

// Função para lidar com exclusão de conta
async function handleDeleteAccount() {
    const user = getCurrentUser();
    if (!user) {
        showModal('error', 'Sessão inválida', 'Faça login para continuar');
        return;
    }

    // Primeiro modal de confirmação
    const confirmed = await showConfirmModal(
        'Excluir Conta Permanentemente',
        'Esta ação é irreversível. Todos os seus dados serão perdidos. Tem certeza?'
    );

    if (!confirmed) return;

    // Modal para solicitar senha
    const root = document.getElementById('modal-root') || document.body;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal modal-error';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    const h = document.createElement('h3');
    h.textContent = 'Confirmar Exclusão de Conta';
    h.style.color = '#dc3545';

    const p = document.createElement('p');
    p.textContent = 'Por favor, insira sua senha para confirmar a exclusão da conta:';

    const input = document.createElement('input');
    input.type = 'password';
    input.placeholder = 'Sua senha';
    input.setAttribute('aria-invalid', 'false');

    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const btnCancel = document.createElement('button');
    btnCancel.className = 'modal-btn';
    btnCancel.textContent = 'Cancelar';

    const btnConfirm = document.createElement('button');
    btnConfirm.className = 'modal-btn';
    btnConfirm.style.background = '#dc3545';
    btnConfirm.textContent = 'Excluir Conta';

    btnCancel.onclick = () => overlay.remove();

    btnConfirm.onclick = async () => {
        const password = input.value.trim();
        if (!password) {
            input.setAttribute('aria-invalid', 'true');
            return;
        }

        try {
            showSpinner();
            overlay.remove();

            // Deleta dados do Firestore
            const userDocRef = doc(db, 'users', user.uid);
            await deleteDoc(userDocRef);

            // Deleta conta do Firebase Auth
            await deleteAccount(password);

            // Limpa cache
            clearAuthCache();

            hideSpinner();
            showModal('success', 'Conta excluída', 'Sua conta foi excluída permanentemente');

            setTimeout(() => {
                window.location.hash = '#homepage';
                window.location.href = './index.html#homepage';
            }, 1500);
        } catch (err) {
            hideSpinner();
            console.error('Erro ao excluir conta:', err);

            if (err.code === 'auth/wrong-password') {
                showModal('error', 'Senha incorreta', 'A senha fornecida está incorreta');
            } else if (err.code === 'auth/requires-recent-login') {
                showModal('error', 'Sessão expirada', 'Faça login novamente e tente excluir a conta');
            } else {
                showModal('error', 'Erro ao excluir conta', 'Tente novamente mais tarde');
            }
        }
    };

    modal.appendChild(h);
    modal.appendChild(p);
    modal.appendChild(input);
    modal.appendChild(actions);
    actions.appendChild(btnCancel);
    actions.appendChild(btnConfirm);
    overlay.appendChild(modal);
    root.appendChild(overlay);

    input.focus();
}

function init() {
    wireActions();
    wireValidation();
    loadProfile();

    // Controle da Danger Zone
    const btnShowDanger = document.getElementById('btnShowDangerZone');
    const btnCloseDanger = document.getElementById('btnCloseDangerZone');
    const dangerZone = document.querySelector('.danger-zone');

    if (btnShowDanger && dangerZone) {
        btnShowDanger.addEventListener('click', () => {
            dangerZone.style.display = 'flex';
            dangerZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    if (btnCloseDanger && dangerZone) {
        btnCloseDanger.addEventListener('click', () => {
            dangerZone.style.display = 'none';
        });
    }

    // Adiciona listener para botão de exclusão de conta
    const btnDeleteAccount = document.getElementById('btnDeleteAccount');
    if (btnDeleteAccount) {
        btnDeleteAccount.addEventListener('click', handleDeleteAccount);
    }
}


init();

window.cleanupProfile = () => {
    if (unsubscribeProfile) {
        try { unsubscribeProfile(); } catch { }
        unsubscribeProfile = null;
    }
};
