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