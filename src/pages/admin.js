export const admin = {
    name: 'admin',
    className: 'admin-content',
    content: `
        <section class="section-admin-dashboard">
            <h2>Painel <span>Administrativo</span></h2>

            <div class="admin-table-group">
                <div class="card-section admin-card-table">
                    <h3 class="card-title">Gestão de Rodadas Fixas</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Partida</th>
                                    <th>Data/Hora</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Falcoes FC vs Dragões EC</td>
                                    <td>20/12 20:00</td>
                                    <td>Ativo</td>
                                    <td class="admin-actions">
                                        <button class="btn-icon edit"><i class="fas fa-edit"></i></button>
                                        <button class="btn-icon delete"><i
                                                class="fas fa-trash-alt"></i></button>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Lebes CF vs Tigres SC</td>
                                    <td>21/12 21:00</td>
                                    <td>Pendente</td>
                                    <td class="admin-actions">
                                        <button class="btn-icon edit"><i class="fas fa-edit"></i></button>
                                        <button class="btn-icon delete"><i
                                                class="fas fa-trash-alt"></i></button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="card-section admin-card-table">
                    <h3 class="card-title">Gestão de Usuários</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Usuário</th>
                                    <th>Status</th>
                                    <th>Função</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>jolas.exemplo</td>
                                    <td>Ativo</td>
                                    <td>Jogador</td>
                                    <td class="admin-actions">
                                        <button class="btn-icon action-red"><i class="fas fa-user-slash"></i>
                                            Inativar</button>
                                        <button class="btn-icon edit"><i class="fas fa-user-edit"></i></button>
                                    </td>
                                </tr>
                                <tr>
                                    <td>admin.user</td>
                                    <td>Ativo</td>
                                    <td>Admin</td>
                                    <td class="admin-actions">
                                        <button class="btn-icon action-red" disabled><i
                                                class="fas fa-user-slash"></i> Inativar</button>
                                        <button class="btn-icon edit"><i class="fas fa-user-edit"></i></button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="card-section admin-card-table">
                    <h3 class="card-title">Gestão de Campeonatos</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Campeonato</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Ancilia Olimp</td>
                                    <td>Ativo</td>
                                    <td class="admin-actions">
                                        <button class="btn-icon action-orange"><i
                                                class="fas fa-flag-checkered"></i> Finalizar</button>
                                        <button class="btn-icon action-green"><i class="fas fa-file-pdf"></i>
                                            Gerar PDF</button>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Ano de Ouro</td>
                                    <td>Finalizado</td>
                                    <td class="admin-actions">
                                        <button class="btn-icon action-blue"><i class="fas fa-chart-bar"></i>
                                            Relatório</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="card-section admin-actions-critical">
                <h3 class="card-title">Ações Críticas do Sistema</h3>
                <div class="critical-actions-grid">
                    <button class="btn-critical"><i class="fas fa-plus-circle"></i> Forçar Placar</button>
                    <button class="btn-critical"><i class="fas fa-user-slash"></i> Inativar Jogador</button>
                    <button class="btn-critical"><i class="fas fa-flag-checkered"></i> Finalizar
                        Campeonato</button>
                    <button class="btn-critical"><i class="fas fa-file-export"></i> Exportar PDF Geral</button>
                </div>
            </div>

            <div class="card-section admin-logs">
                <h3 class="card-title">Logs de Atividade</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Data/Hora</th>
                                <th>Responsável</th>
                                <th>Ação</th>
                                <th>Detalhes</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>2024-11-25 14:30</td>
                                <td>admin.user</td>
                                <td>Forçou Placar</td>
                                <td>Partida ID: 123, 3x1 (Jogador A)</td>
                            </tr>
                            <tr>
                                <td>2024-11-25 14:20</td>
                                <td>admin.user</td>
                                <td>Inativou Jogador</td>
                                <td>Usuário ID: 456 (jogador.exemplo)</td>
                            </tr>
                            <tr>
                                <td>2024-11-25 14:10</td>
                                <td>Sistema</td>
                                <td>Campeonato Finalizado</td>
                                <td>Campeonato ID: 789 (Ano de Ouro)</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    `
}; 