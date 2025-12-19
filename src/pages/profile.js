export const profile = {
    name: 'profile',
    className: 'profile-content',
    content: `
        <section class="section-profile-info">
            <h2>Meu Perfil</h2>

            <div class="profile-header-area card-section">
                <div class="profile-photo-upload">
                    <img src="https://via.placeholder.com/100x100/e74c3c/ffffff?text=U" alt="Foto de Perfil"
                        class="profile-photo">
                    <button class="btn-upload">UPLOAD FOTO</button>
                </div>

                <div class="profile-details-summary">
                    <div class="stars-display">
                        <span>Estrelas de Campeonato:</span>
                        <div class="player-stars">
                            <i class="fas fa-star filled"></i>
                            <i class="fas fa-star filled"></i>
                            <i class="fas fa-star filled"></i>
                            <i class="fas fa-star filled"></i>
                            <i class="fas fa-star filled"></i>
                            <span class="total-stars-hint">5 TOTAL</span>
                        </div>
                    </div>
                    <div class="team-info">
                        <div class="time-profile-summary">
                            <img src="https://via.placeholder.com/40x40/2980b9/ffffff?text=T" alt="Logo do time" class="profile-thumb">
                            <span class="team-name-display">Selecione seu time</span>
                        </div>
                        <span class="team-motto">"A lenda da campianlone"</span>
                    </div>
                </div>
            </div>

            <form class="profile-edit-form card-section">
                <h3>Informações Pessoais</h3>
                <div class="input-group">
                    <label for="username">Nome de Usuário</label>
                    <div class="input-with-icon">
                        <input type="text" id="username" value="Jogador Exemplo">
                        <i class="fas fa-search input-icon"></i>
                    </div>
                </div>

                <div class="input-group">
                    <label for="password">Senha</label>
                    <div class="input-with-icon">
                        <input type="password" id="password" value="Esqueceu sua senha">
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

            <div class="danger-zone-trigger">
                <button class="btn-show-danger" id="btnShowDangerZone">
                    <i class="fas fa-exclamation-triangle"></i>
                    Excluir conta
                </button>
            </div>

            <section class="danger-zone card-section" style="display: none;">
                <div class="danger-zone-header">
                    <h3><i class="fas fa-exclamation-triangle"></i> Zona de Perigo</h3>
                    <button class="btn-close-danger" id="btnCloseDangerZone" title="Fechar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
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
            </section>
        </section>
    `
};