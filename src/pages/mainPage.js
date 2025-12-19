export const main = {
    name: 'mainPage',
    className: 'main-page-content',
    content: `
        <section class="section-standings">
            <h2>CLASSIFICAÇÃO GERAL</h2>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th class="numeric">Pts</th>
                            <th class="numeric">PJ</th>
                            <th class="numeric">V</th>
                            <th class="numeric">E</th>
                            <th class="numeric">D</th>
                            <th class="numeric">GM</th>
                            <th class="numeric">GC</th>
                            <th class="numeric">SG</th>
                        </tr>
                    </thead>
                    <tbody id="standings-body"></tbody>
                </table>
            </div>
        </section>

        <section class="section-stats">
            <h3>ESTATÍSTICAS AVANÇADAS</h3>
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
        </section>

        <div class="auth-card">
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

        <section class="section-players">
            <h3>PLAYERS EM DESTAQUE</h3>
            <div class="players-grid">
                <article class="player-card">
                    <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%' height='100%' fill='%232980b9'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%23ffffff'>P1</text></svg>"
                        alt="Foto do Jogador 1" class="player-photo">
                    <h4>Jogador 1</h4>
                    <p class="player-team">Time X</p>
                    <div class="player-stars">
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star"></i>
                    </div>
                </article>
                <article class="player-card">
                    <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%' height='100%' fill='%232ecc71'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%23ffffff'>P2</text></svg>"
                        alt="Foto do Jogador 2" class="player-photo">
                    <h4>Jogador 2</h4>
                    <p class="player-team">Time Y</p>
                    <div class="player-stars">
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                    </div>
                </article>
                <article class="player-card">
                    <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%' height='100%' fill='%239b59b6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%23ffffff'>P3</text></svg>"
                        alt="Foto do Jogador 3" class="player-photo">
                    <h4>Jogador 3</h4>
                    <p class="player-team">Time X</p>
                    <div class="player-stars">
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star filled"></i>
                    </div>
                </article>
                <article class="player-card">
                    <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%' height='100%' fill='%23e67e22'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%23ffffff'>P4</text></svg>"
                        alt="Foto do Jogador 4" class="player-photo">
                    <h4>Jogador 4</h4>
                    <p class="player-team">Time Z</p>
                    <div class="player-stars">
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star filled"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                    </div>
                </article>
            </div>
        </section>
    `
}