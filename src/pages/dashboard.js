export const dashboard = {
    name: 'dashboard',
    className: 'dashboard-content',
    content: `
        <section class="section-kpis">
            <div class="kpis-header">
                <div class="time-profile-summary">
                    <img src="https://via.placeholder.com/40x40/2980b9/ffffff?text=T" alt="Logo do time"
                        class="profile-thumb">
                    <span class="team-name-display">Selecione seu time</span>
                </div>
                <h2>KPI - Desempenho</h2>
            </div>
            <div class="kpi-cards">
                <div class="kpi-card">
                    <i class="fas fa-trophy kpi-icon"></i>
                    <span class="kpi-value">8</span>
                    <span class="kpi-label">Vitórias</span>
                </div>
                <div class="kpi-card">
                    <i class="fas fa-handshake kpi-icon"></i>
                    <span class="kpi-value">2</span>
                    <span class="kpi-label">Empates</span>
                </div>
                <div class="kpi-card">
                    <i class="fas fa-times-circle kpi-icon"></i>
                    <span class="kpi-value">1</span>
                    <span class="kpi-label">Derrotas</span>
                </div>
                <div class="kpi-card">
                    <i class="fas fa-futbol kpi-icon"></i>
                    <span class="kpi-value">2.5</span>
                    <span class="kpi-label">Média de Gols</span>
                </div>
            </div>
        </section>

        <section class="section-match-history">
            <h3>Histórico de Confrontos por Campeonato</h3>
            <div class="match-history-list">
                <article class="match-item confirmed">
                    <span class="match-date">20/10/2024</span>
                    <span class="match-teams">[ Falcões FC ] 3 x 1 [ Tigres SC ]</span>
                    <span class="match-status badge confirmed-badge"><i class="fas fa-check-circle"></i>
                        Confirmado</span>
                </article>
                <article class="match-item pending">
                    <span class="match-date">20/10/2024</span>
                    <span class="match-teams">[ Dragões EC ] 1 x 1 [ Tigres SC ]</span>
                    <span class="match-status badge pending-badge"><i class="fas fa-hourglass-half"></i>
                        Pendente</span>
                </article>
                <article class="match-item confirmed">
                    <span class="match-date">20/10/2024</span>
                    <span class="match-teams">[ Falcões FC ] 3 x 1 [ Tigres SC ]</span>
                    <span class="match-status badge confirmed-badge"><i class="fas fa-check-circle"></i>
                        Confirmado</span>
                </article>
                <article class="match-item confirmed">
                    <span class="match-date">20/10/2024</span>
                    <span class="match-teams">[ Falcões FC ] 3 x 1 [ Tigres SC ]</span>
                    <span class="match-status badge confirmed-badge"><i class="fas fa-check-circle"></i>
                        Confirmado</span>
                </article>
                <article class="match-item pending">
                    <span class="match-date">20/10/2024</span>
                    <span class="match-teams">[ Dragões EC ] 1 x 1 [ Tigres SC ]</span>
                    <span class="match-status badge pending-badge"><i class="fas fa-hourglass-half"></i>
                        Pendente</span>
                </article>
                <article class="match-item contested">
                    <span class="match-date">20/10/2024</span>
                    <span class="match-teams">[ Dragões EC ] 0 x 2 [ Lebes CF ]</span>
                    <span class="match-status badge contested-badge"><i class="fas fa-exclamation-triangle"></i>
                        Contestado</span>
                </article>
                <article class="match-item contested">
                    <span class="match-date">20/10/2024</span>
                    <span class="match-teams">[ Dragões EC ] 0 x 2 [ Lebes CF ]</span>
                    <span class="match-status badge contested-badge"><i class="fas fa-exclamation-triangle"></i>
                        Contestado</span>
                </article>
            </div>
        </section>
    ` 
};