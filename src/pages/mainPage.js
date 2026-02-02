export const main = {
    name: 'mainPage',
    className: 'main-page-content',
    content: `
        <!-- Bloco de Status do Usuário (visível apenas para usuários logados) -->
        <section class="section-user-status icou-card hidden" id="section-user-status">
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

        <section class="section-standings icou-card" id="section-standings">
            <div class="card-header">
                <i class="fas fa-trophy"></i>
                <h3>CLASSIFICAÇÃO GERAL</h3>
            </div>
            <div class="card-content">
                <!-- Controle de Filtro de Ano -->
                <div class="standings-controls" id="standings-controls">
                    <div class="standings-filters-row">
                        <div class="input-group">
                            <label for="standings-year-select" class="sr-only">Selecione o ano</label>
                            <select id="standings-year-select" aria-label="Selecione o ano">
                                <option value="">Carregando...</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="table-container" id="standings-table-container">
                    <!-- Estado vazio quando não há dados -->
                    <div class="empty-standings-state hidden" id="empty-standings-state">
                        <div class="empty-standings-icon">
                            <i class="fas fa-trophy"></i>
                        </div>
                        <h4>Nenhuma partida registrada</h4>
                        <p>Não há partidas confirmadas para este ano. Selecione outro ano ou aguarde novas partidas.</p>
                    </div>
                    
                    <!-- Cabeçalho fixo em tabela separada -->
                    <table class="icou-table table-standings table-header-fixed" id="standings-table-header">
                        <thead>
                            <tr>
                                <th class="col-pos">#</th>
                                <th class="col-time">Time</th>
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
                    </table>
                    
                    <!-- Corpo da tabela com scroll vertical -->
                    <div class="table-body-wrapper" id="standings-body-wrapper">
                        <table class="icou-table table-standings table-body-scroll" id="standings-table-body">
                            <tbody id="standings-body"></tbody>
                        </table>
                    </div>
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
                    
                    <!-- Cabeçalho fixo em tabela separada -->
                    <table class="icou-table table-standings table-header-fixed hidden" id="championship-table-header">
                        <thead>
                            <tr>
                                <th class="col-pos">#</th>
                                <th class="col-time">Time</th>
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
                    </table>
                    
                    <!-- Corpo da tabela com scroll vertical -->
                    <div class="table-body-wrapper hidden" id="championship-body-wrapper">
                        <table class="icou-table table-standings table-body-scroll" id="championship-table-body">
                            <tbody id="championship-standings-body"></tbody>
                        </table>
                    </div>
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
                <div class="stats-cards stats-cards-enhanced">
                    <div class="stat-card stat-card-avatar" id="card-ranking-primeiro">
                        <div class="stat-avatar-container">
                            <img src="" alt="Ranking 1º" class="stat-avatar" id="avatar-ranking-primeiro">
                            <div class="stat-avatar-fallback hidden" id="fallback-ranking-primeiro">
                                <i class="fas fa-crown"></i>
                            </div>
                        </div>
                        <div class="stat-info">
                            <h4>RANKING 1º</h4>
                            <p id="stat-ranking-primeiro">-</p>
                        </div>
                    </div>
                    <div class="stat-card stat-card-avatar" id="card-campeao-anterior">
                        <div class="stat-avatar-container">
                            <img src="" alt="Campeão" class="stat-avatar" id="avatar-campeao-anterior">
                            <div class="stat-avatar-fallback hidden" id="fallback-campeao-anterior">
                                <i class="fas fa-trophy"></i>
                            </div>
                        </div>
                        <div class="stat-info">
                            <h4>CAMPEÃO ANTERIOR</h4>
                            <p id="stat-campeao-anterior">-</p>
                        </div>
                    </div>
                    <div class="stat-card stat-card-avatar" id="card-melhor-ataque">
                        <div class="stat-avatar-container">
                            <img src="" alt="Melhor Ataque" class="stat-avatar" id="avatar-melhor-ataque">
                            <div class="stat-avatar-fallback hidden" id="fallback-melhor-ataque">
                                <i class="fas fa-futbol"></i>
                            </div>
                        </div>
                        <div class="stat-info">
                            <h4>MELHOR ATAQUE</h4>
                            <p id="stat-melhor-ataque">-</p>
                        </div>
                    </div>
                    <div class="stat-card stat-card-avatar" id="card-melhor-defesa">
                        <div class="stat-avatar-container">
                            <img src="" alt="Melhor Defesa" class="stat-avatar" id="avatar-melhor-defesa">
                            <div class="stat-avatar-fallback hidden" id="fallback-melhor-defesa">
                                <i class="fas fa-shield-alt"></i>
                            </div>
                        </div>
                        <div class="stat-info">
                            <h4>MELHOR DEFESA</h4>
                            <p id="stat-melhor-defesa">-</p>
                        </div>
                    </div>
                    <div class="stat-card stat-card-goleada" id="card-maior-goleada">
                        <h4>MAIOR GOLEADA</h4>
                        <div class="goleada-content">
                            <div class="goleada-player">
                                <img src="" alt="Vencedor" class="stat-avatar stat-avatar-sm" id="avatar-goleada-a">
                                <div class="stat-avatar-fallback stat-avatar-fallback-sm hidden" id="fallback-goleada-a">
                                    <i class="fas fa-user"></i>
                                </div>
                                <span class="goleada-name" id="nome-goleada-a">-</span>
                            </div>
                            <div class="goleada-score" id="stat-maior-goleada">-</div>
                            <div class="goleada-player">
                                <img src="" alt="Perdedor" class="stat-avatar stat-avatar-sm" id="avatar-goleada-b">
                                <div class="stat-avatar-fallback stat-avatar-fallback-sm hidden" id="fallback-goleada-b">
                                    <i class="fas fa-user"></i>
                                </div>
                                <span class="goleada-name" id="nome-goleada-b">-</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Bloco de Desempenho TOP 3 (componente independente) -->
        <section class="section-performance-graph icou-card">
            <div class="card-header">
                <i class="fas fa-medal"></i>
                <h3>DESEMPENHO TOP 3 - <span id="chart-year-label">2026</span></h3>
            </div>
            <div class="card-content">
                <div class="chart-wrapper" id="performance-chart-wrapper">
                    <canvas id="performanceChart"></canvas>
                </div>
                <div class="chart-empty-state hidden" id="chart-empty-state">
                    <i class="fas fa-chart-area"></i>
                    <p>Sem dados de desempenho para este ano</p>
                </div>
            </div>
        </section>

        <!-- Modal de Autenticação (acionado pelo link de login no header) -->
        <div id="authModal" class="auth-modal-overlay hidden">
            <div class="auth-modal-content">
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

                    <form id="loginForm" class="auth-form">
                        <div class="input-group">
                            <label for="loginEmail" class="sr-only">Email</label>
                            <input type="email" id="loginEmail" autocomplete="on" placeholder="Email" required>
                        </div>
                        <div class="input-group input-group-password">
                            <label for="loginPassword" class="sr-only">Senha</label>
                            <input type="password" id="loginPassword" placeholder="Senha" required>
                            <button type="button" class="password-toggle" aria-label="Mostrar senha" data-target="loginPassword">
                                <i class="fas fa-eye"></i>
                            </button>
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
                        <div class="input-group input-group-password">
                            <label for="registerPassword" class="sr-only">Senha</label>
                            <input type="password" id="registerPassword" placeholder="Senha" required>
                            <button type="button" class="password-toggle" aria-label="Mostrar senha" data-target="registerPassword">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                        <div class="input-group input-group-password">
                            <label for="confirmPassword" class="sr-only">Confirmar Senha</label>
                            <input type="password" id="confirmPassword" placeholder="Confirmar Senha" required>
                            <button type="button" class="password-toggle" aria-label="Mostrar senha" data-target="confirmPassword">
                                <i class="fas fa-eye"></i>
                            </button>
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