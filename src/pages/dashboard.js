export const dashboard = {
    name: 'dashboard',
    className: 'dashboard-content',
    content: `
        <!-- Seção: Informações do Usuário e KPIs -->
        <section class="section-kpis icou-card">
            <div class="card-header">
                <i class="fas fa-chart-line"></i>
                <h3>KPI - DESEMPENHO</h3>
            </div>
            <div class="card-content">
                <div class="kpis-header">
                    <div class="time-profile-summary" id="dashboardUserProfile">
                    <img src="./assets/img/team-placeholder.svg" alt="Logo do time"
                        class="profile-thumb" id="dashboardTimeLogo">
                    <div class="user-profile-info">
                        <span class="user-name-display" id="dashboardUserName">Carregando...</span>
                        <span class="team-name-display" id="dashboardTimeName">-</span>
                    </div>
                    <div class="user-badges" id="dashboardUserBadges">
                        <!-- Estrelas e troféu serão inseridos dinamicamente -->
                    </div>
                </div>
            </div>
            <div class="kpi-cards" id="dashboardKpiCards">
                <!-- Loading state -->
                <div class="kpi-card">
                    <i class="fas fa-trophy kpi-icon"></i>
                    <span class="kpi-value" id="kpiVitorias">-</span>
                    <span class="kpi-label">Vitórias</span>
                </div>
                <div class="kpi-card">
                    <i class="fas fa-handshake kpi-icon"></i>
                    <span class="kpi-value" id="kpiEmpates">-</span>
                    <span class="kpi-label">Empates</span>
                </div>
                <div class="kpi-card">
                    <i class="fas fa-times-circle kpi-icon"></i>
                    <span class="kpi-value" id="kpiDerrotas">-</span>
                    <span class="kpi-label">Derrotas</span>
                </div>
                <div class="kpi-card">
                    <i class="fas fa-futbol kpi-icon"></i>
                    <span class="kpi-value" id="kpiMediaGols">-</span>
                    <span class="kpi-label">Média de Gols</span>
                </div>
            </div>
            </div>
        </section>

        <!-- Seção: Ranking e Campeonato Ativo -->
        <section class="section-dashboard-cards">
            <!-- Bloco: Posição no Ranking -->
            <div class="dashboard-card ranking-card icou-card" id="dashboardRankingCard">
                <div class="card-header">
                    <i class="fas fa-chart-line"></i>
                    <h3>SUA POSIÇÃO NO RANKING</h3>
                </div>
                <div class="card-content ranking-card-content" id="dashboardRankingContent">
                    <div class="ranking-position-wrapper">
                        <span class="ranking-position" id="rankingPosition">-</span>
                        <span class="ranking-variation" id="rankingVariation" title="Variação">
                            <i class="fas fa-minus"></i>
                        </span>
                    </div>
                    <span class="ranking-total" id="rankingTotal">de - jogadores</span>
                    <div class="ranking-points-info" id="rankingPointsInfo">
                        <span class="ranking-points" id="rankingPoints"></span>
                        <span class="ranking-comparativo" id="rankingComparativo"></span>
                    </div>
                </div>
            </div>

            <!-- Bloco: Campeonato Ativo -->
            <div class="dashboard-card championship-card icou-card" id="dashboardChampionshipCard">
                <div class="card-header">
                    <i class="fas fa-trophy"></i>
                    <h3>CAMPEONATO ATIVO</h3>
                </div>
                <div class="card-content championship-card-content" id="dashboardChampionshipContent">
                    <div class="loading-placeholder">
                        <i class="fas fa-spinner fa-spin"></i> Verificando...
                    </div>
                </div>
            </div>

            <!-- Bloco: Resumo Social -->
            <div class="dashboard-card social-card icou-card" id="dashboardSocialCard">
                <div class="card-header">
                    <i class="fas fa-users"></i>
                    <h3>AMIGOS</h3>
                </div>
                <div class="card-content social-card-content" id="dashboardSocialContent">
                    <div class="loading-placeholder">
                        <i class="fas fa-spinner fa-spin"></i> Carregando...
                    </div>
                </div>
            </div>
        </section>

        <!-- Seção: Partidas Ativas / Pendentes Fair Play -->
        <section class="section-active-matches icou-card">
            <div class="card-header">
                <i class="fas fa-exclamation-circle"></i>
                <h3>PARTIDAS PENDENTES DE AÇÃO</h3>
            </div>
            <div class="card-content">
                    <div class="match-history-list" id="dashboardPartidasPendentes">
                    <div class="loading-placeholder">
                        <i class="fas fa-spinner fa-spin"></i> Carregando partidas...
                    </div>
                </div>
            </div>
        </section>

        <!-- Modal: Inserir Placar (Dashboard) -->
        <div id="modalInserirPlacarDashboard" class="modal-overlay hidden">
            <div class="modal-content modal-small">
                <button class="modal-close" data-close-modal>&times;</button>
                <h3><i class="fas fa-futbol"></i> Inserir Placar</h3>
                
                <form id="formInserirPlacarDashboard">
                    <input type="hidden" id="partidaIdPlacarDashboard">
                    
                    <div class="placar-display">
                        <div class="team-placar">
                            <span id="timeANomePlacarDashboard" class="team-name">Time A</span>
                            <input type="number" id="placarADashboard" min="0" value="0" class="placar-input" required>
                        </div>
                        <span class="placar-x">X</span>
                        <div class="team-placar">
                            <span id="timeBNomePlacarDashboard" class="team-name">Time B</span>
                            <input type="number" id="placarBDashboard" min="0" value="0" class="placar-input" required>
                        </div>
                    </div>
                    
                    <button type="submit" class="btn-primary btn-full-width">
                        <i class="fas fa-paper-plane"></i> ENVIAR PLACAR
                    </button>
                </form>
            </div>
        </div>

        <!-- Modal: Cancelar Partida (Dashboard) -->
        <div id="modalCancelarPartidaDashboard" class="modal-overlay hidden">
            <div class="modal-content modal-small">
                <button class="modal-close" data-close-modal>&times;</button>
                <h3><i class="fas fa-times-circle"></i> Cancelar Partida</h3>
                
                <form id="formCancelarPartidaDashboard">
                    <input type="hidden" id="partidaIdCancelarDashboard">
                    
                    <div class="cancelar-info">
                        <p>Tem certeza que deseja cancelar esta partida?</p>
                        <p class="cancelar-aviso"><i class="fas fa-exclamation-triangle"></i> Esta ação não pode ser desfeita.</p>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" data-close-modal>Voltar</button>
                        <button type="submit" class="btn-danger">
                            <i class="fas fa-trash"></i> CANCELAR PARTIDA
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Seção: Histórico de Partidas (Últimas 3) -->
        <section class="section-match-history icou-card">
            <div class="card-header">
                <i class="fas fa-history"></i>
                <h3>ÚLTIMAS PARTIDAS</h3>
                <a href="#matches" class="view-all-link" id="viewAllMatchesLink">
                    Ver todas <i class="fas fa-arrow-right"></i>
                </a>
            </div>
            <div class="card-content">
                    <div class="match-history-list" id="dashboardMatchHistory">
                    <div class="loading-placeholder">
                        <i class="fas fa-spinner fa-spin"></i> Carregando histórico...
                    </div>
                </div>
            </div>
        </section>
    ` 
};