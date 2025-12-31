/**
 * profile.js
 * Template da página de perfil - SEM CONTEÚDO ESTÁTICO para evitar FOUC
 * Todos os dados são carregados dinamicamente via profile.js (functions)
 */
export const profile = {
    name: 'profile',
    className: 'profile-content',
    content: `
        <!-- Seção: Meu Perfil Header -->
        <section class="section-profile-info icou-card">
            <div class="card-header">
                <i class="fas fa-user-circle"></i>
                <h3>MEU PERFIL</h3>
            </div>
            <div class="card-content">
                <div class="profile-header-area">
                <div class="profile-photo-upload">
                    <!-- Skeleton loading para foto -->
                    <div class="profile-photo-skeleton skeleton-loading" style="width: 100px; height: 100px; border-radius: 50%; background: var(--secondary-bg);"></div>
                    <img src="" alt="Foto de Perfil" class="profile-photo" style="display: none;">
                    <button class="btn-upload">UPLOAD FOTO</button>
                    <button class="btn-delete-photo" id="btnDeletePhoto" type="button">EXCLUIR FOTO</button>
                </div>

                <div class="profile-details-summary">
                    <div class="stars-display">
                        <span>Estrelas de Campeonato:</span>
                        <div class="player-stars">
                            <!-- Renderizado dinamicamente -->
                            <span class="skeleton-text" style="width: 80px; height: 16px; display: inline-block; background: var(--secondary-bg); border-radius: 4px;"></span>
                            <span class="total-stars-hint">-- TOTAL</span>
                        </div>
                    </div>
                    <div class="profile-visibility" id="profileVisibility" aria-live="polite">
                        <!-- Renderizado dinamicamente -->
                    </div>
                    <div class="team-info">
                        <div class="time-profile-summary" id="time-profile-summary">
                            <!-- Skeleton para time -->
                            <div class="team-logo-skeleton skeleton-loading" style="width: 40px; height: 40px; border-radius: 50%; background: var(--secondary-bg);"></div>
                            <img src="./assets/img/team-placeholder.svg" alt="Logo do time" class="profile-thumb team-logo" style="display: none; width: 40px; height: 40px; object-fit: contain;">
                            <span class="team-name-display">Selecione seu time</span>
                        </div>
                        <span class="team-motto"></span>
                    </div>
                </div>
                </div>
            </div>
        </section>

        <!-- Seção: Informações Pessoais -->
        <section class="section-profile-form icou-card">
            <div class="card-header">
                <i class="fas fa-id-card"></i>
                <h3>INFORMAÇÕES PESSOAIS</h3>
            </div>
            <div class="card-content">
                <form class="profile-edit-form">
                <div class="input-group">
                    <label for="username">Nome de Usuário</label>
                    <div class="input-with-icon">
                        <input type="text" id="username" placeholder="Carregando...">
                        <i class="fas fa-search input-icon"></i>
                    </div>
                </div>

                <div class="input-group">
                    <label for="password">Senha</label>
                    <div class="input-with-icon">
                        <input type="password" id="password" value="*****" readonly>
                        <i class="fas fa-check-circle input-icon valid-icon"></i>
                    </div>
                    <span class="input-help-text">Clique para alterar sua senha.</span>
                </div>

                <div class="input-group">
                    <label for="bio">Bio</label>
                    <div class="input-with-icon">
                        <textarea id="bio" placeholder="Fale um pouco sobre você..."></textarea>
                        <i class="fab fa-youtube input-icon social-icon"></i>
                    </div>
                </div>
                <div class="input-group">
                    <label for="team-search">Time</label>
                    <div class="input-with-icon" style="position: relative;">
                        <input type="text" id="team-search" placeholder="Digite o nome do time (ex: Barcelona)" aria-label="Nome do time">
                        <button type="button" id="btn-confirm-team" class="btn-confirm-team" title="Confirmar time" style="background: none; border: none; position: absolute; right: 45px; top: 50%; transform: translateY(-50%); padding: 0; cursor: pointer;">
                            <i class="fas fa-check"></i>
                        </button>
                        <i class="fas fa-shield-alt input-icon social-icon"></i>
                    </div>
                    <small style="display: block; margin-top: 5px; color: #888;">
                        Digite o nome e clique em confirmar ou pressione Enter. Limitação: 1 alteração a cada 2 horas.
                    </small>
                </div>
                <div class="input-group">
                    <label for="whatsapp">Whatsapp</label>
                    <div class="input-with-icon">
                        <input type="tel" id="whatsapp" placeholder="(XX) XXXXX-XXXX">
                        <i class="fab fa-whatsapp input-icon social-icon"></i>
                    </div>
                </div>
                <div class="input-group">
                    <label for="instagram">Instagram</label>
                    <div class="input-with-icon">
                        <input type="text" id="instagram" placeholder="@seuinstagram">
                        <i class="fab fa-instagram input-icon social-icon"></i>
                    </div>
                </div>
                <div class="input-group">
                    <label for="twitch">Twitch</label>
                    <div class="input-with-icon">
                        <input type="text" id="twitch" placeholder="SeuCanalTwitch">
                        <i class="fab fa-twitch input-icon social-icon"></i>
                    </div>
                </div>

                    <div class="form-actions">
                        <button type="submit" class="btn-primary"><i class="fas fa-save"></i> SALVAR ALTERAÇÕES</button>
                    </div>
                </form>
            </div>
        </section>

            <div class="danger-zone-trigger">
                <button class="btn-show-danger" id="btnShowDangerZone">
                    <i class="fas fa-exclamation-triangle"></i>
                    Excluir conta
                </button>
            </div>

            <section class="danger-zone icou-card" style="display: none;">
                <div class="card-header danger-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>ZONA DE PERIGO</h3>
                    <button class="btn-close-danger" id="btnCloseDangerZone" title="Fechar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="card-content">
                    <p class="danger-description">
                        A exclusão da sua conta é <strong>permanente e irreversível</strong>. 
                        Todos os seus dados, incluindo perfil, estatísticas, histórico de partidas 
                        e informações pessoais serão removidos permanentemente da plataforma.
                    </p>
                    <p class="danger-warning">
                        <i class="fas fa-info-circle"></i>
                        Esta ação não pode ser desfeita. Certifique-se de que realmente deseja excluir sua conta.
                    </p>
                    <button class="btn-danger" id="btnDeleteAccount">
                        <i class="fas fa-trash-alt"></i>
                        Excluir Conta Permanentemente
                    </button>
                </div>
            </section>
    `
};