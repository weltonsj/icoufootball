export const dashboard = {
    name: 'dashboard',
    className: 'dashboard-content',
    content: `
        <!-- Seção: Informações do Usuário e KPIs -->
        <section class="section-kpis">
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
                <h2>KPI - Desempenho</h2>
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
        </section>

        <!-- Seção: Ranking e Campeonato Ativo -->
        <section class="section-dashboard-cards">
            <!-- Bloco: Posição no Ranking -->
            <div class="dashboard-card ranking-card" id="dashboardRankingCard">
                <div class="dashboard-card-header">
                    <i class="fas fa-chart-line"></i>
                    <span>Sua Posição no Ranking</span>
                </div>
                <div class="ranking-card-content" id="dashboardRankingContent">
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
            <div class="dashboard-card championship-card" id="dashboardChampionshipCard">
                <div class="dashboard-card-header">
                    <i class="fas fa-trophy"></i>
                    <span>Campeonato Ativo</span>
                </div>
                <div class="championship-card-content" id="dashboardChampionshipContent">
                    <div class="loading-placeholder">
                        <i class="fas fa-spinner fa-spin"></i> Verificando...
                    </div>
                </div>
            </div>

            <!-- Bloco: Resumo Social -->
            <div class="dashboard-card social-card" id="dashboardSocialCard">
                <div class="dashboard-card-header">
                    <i class="fas fa-users"></i>
                    <span>Amigos</span>
                </div>
                <div class="social-card-content" id="dashboardSocialContent">
                    <div class="loading-placeholder">
                        <i class="fas fa-spinner fa-spin"></i> Carregando...
                    </div>
                </div>
            </div>
        </section>

        <!-- Seção: Partidas Ativas / Pendentes Fair Play -->
        <section class="section-active-matches">
            <h3><i class="fas fa-exclamation-circle"></i> Partidas Pendentes de Ação</h3>
            <div class="match-history-list" id="dashboardPartidasPendentes">
                <div class="loading-placeholder">
                    <i class="fas fa-spinner fa-spin"></i> Carregando partidas...
                </div>
            </div>
        </section>

        <!-- Seção: Histórico de Partidas (Últimas 3) -->
        <section class="section-match-history">
            <div class="section-header-with-link">
                <h3>Últimas Partidas</h3>
                <a href="#matches" class="view-all-link" id="viewAllMatchesLink">
                    Ver todas <i class="fas fa-arrow-right"></i>
                </a>
            </div>
            <div class="match-history-list" id="dashboardMatchHistory">
                <div class="loading-placeholder">
                    <i class="fas fa-spinner fa-spin"></i> Carregando histórico...
                </div>
            </div>
        </section>
    ` 
};