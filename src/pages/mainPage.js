export const main = {
    name: 'mainPage',
    className: 'main-page-content',
    content: `
        <!-- Bloco de Status do Usuário (visível apenas para usuários logados) -->
        <section class="section-user-status hidden" id="section-user-status">
            <div class="user-status-card" id="user-status-card">
                <div class="user-status-icon" id="user-status-icon">
                    <i class="fas fa-trophy"></i>
                </div>
                <div class="user-status-content">
                    <h3 class="user-status-title" id="user-status-title">Carregando...</h3>
                    <p class="user-status-message" id="user-status-message">Verificando sua participação em campeonatos</p>
                </div>
                <div class="user-status-cta" id="user-status-cta">
                    <!-- CTA será inserido dinamicamente -->
                </div>
            </div>
        </section>

        <section class="section-players icou-card">
            <div class="card-header">
                <i class="fas fa-star"></i>
                <h3>PLAYERS EM DESTAQUE</h3>
            </div>
            <div class="card-content">
                <div class="players-ticker-viewport" id="players-ticker">
                    <div class="players-ticker-track" id="players-ticker-track"></div>
                </div>
            </div>
        </section>

        <!-- RF12: Bloco Ao Vivo -->
        <section class="section-live icou-card" id="section-live">
            <div class="card-header">
                <i class="fas fa-broadcast-tower"></i>
                <h3>AO VIVO</h3>
            </div>
            <div class="card-content">
                <div id="live-streams-container" class="live-streams-list">
                    <div class="live-loading">
                        <i class="fas fa-spinner fa-spin"></i> Carregando transmissões...
                    </div>
                </div>
            </div>
        </section>

        <section class="section-standings icou-card">
            <div class="card-header">
                <i class="fas fa-trophy"></i>
                <h3>CLASSIFICAÇÃO GERAL</h3>
            </div>
            <div class="card-content">
                <div class="table-container">
                    <table class="icou-table table-standings">
                        <thead>
                            <tr>
                                <th class="col-pos">#</th>
                                <th class="col-time" style="text-align: center;">Time</th>
                                <th class="col-jogador">Jogador</th>
                                <th class="col-numeric">Pts</th>
                                <th class="col-numeric">PJ</th>
                                <th class="col-numeric">V</th>
                                <th class="col-numeric">E</th>
                                <th class="col-numeric">D</th>
                                <th class="col-numeric">GM</th>
                                <th class="col-numeric">GC</th>
                                <th class="col-numeric">SG</th>
                            </tr>
                        </thead>
                        <tbody id="standings-body"></tbody>
                    </table>
                </div>
            </div>
        </section>

        <section class="section-championship icou-card" id="section-championship-standings">
            <div class="card-header">
                <i class="fas fa-calendar-alt"></i>
                <h3 id="championship-standings-title">TABELA DO CAMPEONATO</h3>
            </div>
            <div class="card-content">
                <div class="championship-standings-controls" id="championship-standings-controls">
                    <div class="championship-filters-row">
                        <div class="input-group">
                            <label for="championship-year-select" class="sr-only">Selecione o ano</label>
                            <select id="championship-year-select" aria-label="Selecione o ano">
                                <option value="">Selecione o ano</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label for="championship-select" class="sr-only">Selecione o campeonato</label>
                            <select id="championship-select" aria-label="Selecione o campeonato" disabled>
                                <option value="">Selecione o campeonato</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="table-container" id="championship-table-container">
                    <!-- Mensagem inicial antes de selecionar campeonato -->
                    <div class="empty-championship-state" id="empty-championship-state">
                        <div class="empty-championship-icon">
                            <i class="fas fa-calendar-alt"></i>
                        </div>
                        <h4>Selecione um campeonato</h4>
                        <p>Escolha o ano e o campeonato acima para visualizar a tabela de classificação detalhada.</p>
                    </div>
                    <table class="icou-table table-standings hidden" id="championship-table">
                        <thead>
                            <tr>
                                <th class="col-pos">#</th>
                                <th class="col-time" style="text-align: center;">Time</th>
                                <th class="col-jogador">Jogador</th>
                                <th class="col-numeric">Pts</th>
                                <th class="col-numeric">PJ</th>
                                <th class="col-numeric">V</th>
                                <th class="col-numeric">E</th>
                                <th class="col-numeric">D</th>
                                <th class="col-numeric">GM</th>
                                <th class="col-numeric">GC</th>
                                <th class="col-numeric">SG</th>
                            </tr>
                        </thead>
                        <tbody id="championship-standings-body"></tbody>
                    </table>
                </div>
            </div>
        </section>

        <!-- Bloco de Últimas Partidas -->
        <section class="section-latest-results icou-card" id="section-latest-results">
            <div class="card-header">
                <i class="fas fa-history"></i>
                <h3>ÚLTIMAS PARTIDAS</h3>
            </div>
            <div class="card-content">
                <div class="latest-results-container" id="latest-results-container">
                    <div class="latest-results-loading">
                        <i class="fas fa-spinner fa-spin"></i> Carregando resultados...
                    </div>
                </div>
            </div>
        </section>

        <section class="section-stats icou-card">
            <div class="card-header">
                <i class="fas fa-chart-bar"></i>
                <h3>ESTATÍSTICAS AVANÇADAS</h3>
            </div>
            <div class="card-content">
                <div class="stats-cards">
                    <div class="stat-card">
                        <h4>CAMPEÃO ANTERIOR:</h4>
                        <p id="stat-campeao-anterior">-</p>
                    </div>
                    <div class="stat-card">
                        <h4>MELHOR ATAQUE:</h4>
                        <p id="stat-melhor-ataque">-</p>
                    </div>
                    <div class="stat-card">
                        <h4>MELHOR DEFESA:</h4>
                        <p id="stat-melhor-defesa">-</p>
                    </div>
                    <div class="stat-card">
                        <h4>MAIOR GOLEADA:</h4>
                        <p id="stat-maior-goleada">-</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Modal de Autenticação (acionado pelo link de login no header) -->
        <div id="authModal" class="modal-overlay auth-modal-overlay hidden">
            <div class="modal-content auth-modal-content">
                <button class="modal-close" id="authModalClose">&times;</button>
                <div class="auth-card-modal">
                    <div class="auth-card-title">
                        <h2>iCou<span>Football</span></h2>
                        <span>Gerencie seu campeonato de futebol.</span>
                    </div>

                    <div class="auth-toggle">
                        <button id="btnToggleLogin" class="toggle-button active">Login</button>
                        <button id="btnToggleRegister" class="toggle-button">Criar conta</button>
                    </div>

                    <form id="loginForm" class="auth-form active">
                        <div class="input-group">
                            <label for="loginEmail" class="sr-only">Email</label>
                            <input type="email" id="loginEmail" autocomplete="on" placeholder="Email" required>
                        </div>
                        <div class="input-group">
                            <label for="loginPassword" class="sr-only">Senha</label>
                            <input type="password" id="loginPassword" placeholder="Senha" required>
                        </div>
                        <a href="#" class="forgot-password">Esqueceu sua senha?</a>
                        <button type="submit" class="btn-primary">ENTRAR</button>
                    </form>

                    <form id="registerForm" class="auth-form hidden">
                        <div class="input-group">
                            <label for="registerUsername" class="sr-only">Nome de Usuário</label>
                            <input type="text" id="registerUsername" placeholder="Nome de Usuário" required>
                        </div>
                        <div class="input-group">
                            <label for="registerEmail" class="sr-only">Email</label>
                            <input type="email" id="registerEmail" placeholder="Email" required>
                        </div>
                        <div class="input-group">
                            <label for="registerPassword" class="sr-only">Senha</label>
                            <input type="password" id="registerPassword" placeholder="Senha" required>
                        </div>
                        <div class="input-group">
                            <label for="confirmPassword" class="sr-only">Confirmar Senha</label>
                            <input type="password" id="confirmPassword" placeholder="Confirmar Senha" required>
                        </div>
                        <button type="submit" class="btn-primary">REGISTRAR</button>
                    </form>
                </div>
            </div>
        </div>

        <!-- RF12: Modal de Transmissão Ao Vivo -->
        <div id="modalTransmissao" class="modal-overlay hidden">
            <div class="modal-content modal-stream">
                <button class="modal-close" data-close-modal>&times;</button>
                <div class="stream-header">
                    <h3 id="streamMatchTitle">Time A vs Time B</h3>
                    <span class="live-badge-large"><i class="fas fa-circle pulse"></i> AO VIVO</span>
                </div>
                <div id="streamPlayerContainer" class="stream-player-container">
                    <!-- Player será inserido dinamicamente -->
                </div>
                <div class="stream-info">
                    <p id="streamMatchInfo"></p>
                    <a id="streamExternalLink" href="#" target="_blank" class="btn-external-stream">
                        <i class="fas fa-external-link-alt"></i> <span>Assistir na plataforma</span>
                    </a>
                </div>
            </div>
        </div>
    `
}