export const matches = {
    name: "matches",
    className: "matches-content",
    content: `
        <section class="section-new-match">
            <h2>Registrar Placar</h2>

            <form id="scoreEntryForm" class="score-form card-section">
                <h3 class="card-title">Inserir Resultado de Jogo</h3>
                <div class="input-group">
                    <label for="matchSelect" class="sr-only">Confronto</label>
                    <select id="matchSelect" required>
                        <option value="" disabled selected>Selecione o Confronto</option>
                        <option value="match1">Falcoes FC vs Tigres SC (20/11)</option>
                        <option value="match2">Dragões EC vs Lebes CF (21/11)</option>
                    </select>
                </div>

                <div class="score-inputs-group">
                    <div class="score-input-item">
                        <label for="scoreA">Seu Placar</label>
                        <input type="number" id="scoreA" min="0" value="0" required>
                    </div>
                    <span class="score-separator">x</span>
                    <div class="score-input-item">
                        <label for="scoreB">Adversário</label>
                        <input type="number" id="scoreB" min="0" value="0" required>
                    </div>
                </div>

                <button type="submit" class="btn-primary">ENVIAR PLACAR</button>
            </form>

            <form id="transmissionLink" class="transmission-form card-section">
                <h3 class="card-title">Link da Transmissão (Opcional)</h3>
                <div class="input-group">
                    <label for="linkInput" class="sr-only">Link da Transmissão</label>
                    <input type="url" id="linkInput" placeholder="Link (Twitch, YouTube, etc.)">
                </div>
                <button type="button" class="btn-secondary">SALVAR LINK</button>
            </form>
        </section>

        <section class="section-match-list">
            <h3>Partidas Pendentes de Ação (Fair Play)</h3>

            <div class="match-list">
                <article class="match-item pending-confirmation">
                    <div class="match-info">
                        <span class="match-date-time">22/11/2025 - 21:00h</span>
                        <p class="match-details"><strong>Falcoes FC</strong> <span class="score-pending-value">3
                                x 1</span> <strong>Dragões EC</strong></p>
                        <span class="match-status-badge pending-badge">AGUARDANDO SUA CONFIRMAÇÃO</span>
                    </div>
                    <div class="match-actions">
                        <button class="btn-action confirm"><i class="fas fa-check"></i> Confirmar</button>
                        <button class="btn-action contest"><i class="fas fa-times"></i> Contestar</button>
                    </div>
                </article>

                <article class="match-item awaiting-opponent">
                    <div class="match-info">
                        <span class="match-date-time">23/11/2025 - 20:00h</span>
                        <p class="match-details"><strong>Seu Time</strong> <span class="score-pending-value">2 x
                                0</span> <strong>Lebes CF</strong></p>
                        <span class="match-status-badge awaiting-badge">PLACAR ENVIADO (Aguardando
                            Adversário)</span>
                    </div>
                    <div class="match-actions">
                        <button class="btn-action view" title="Ver Link de Transmissão"><i
                                class="fas fa-link"></i> Link</button>
                        <button class="btn-action edit" title="Editar Placar"><i class="fas fa-edit"></i>
                            Editar</button>
                    </div>
                </article>

                <article class="match-item contested-final">
                    <div class="match-info">
                        <span class="match-date-time">24/11/2025 - 19:00h</span>
                        <p class="match-details"><strong>Time X</strong> <span class="score-pending-value">1 x
                                1</span> <strong>Time Y</strong></p>
                        <span class="match-status-badge contested-badge">CONTESTADO (Intervenção Admin
                            Necessária)</span>
                    </div>
                    <div class="match-actions">
                        <button class="btn-action force-confirm admin-only"
                            title="Forçar Confirmação (Admin)"><i class="fas fa-gavel"></i> Forçar</button>
                        <button class="btn-action view" title="Ver Detalhes/Logs"><i class="fas fa-search"></i>
                            Detalhes</button>
                    </div>
                </article>

                <article class="match-item confirmed-item">
                    <div class="match-info">
                        <span class="match-date-time">18/11/2025 - 22:00h</span>
                        <p class="match-details"><strong>Falcoes FC</strong> <span
                                class="score-confirmed-value">5 x 2</span> <strong>Tigres SC</strong></p>
                        <span class="match-status-badge confirmed-badge">CONFIRMADO</span>
                    </div>
                    <div class="match-actions">
                        <button class="btn-action view" title="Ver Detalhes"><i class="fas fa-eye"></i></button>
                    </div>
                </article>
            </div>
        </section>
    `
};        