export const admin = {
    name: 'admin',
    className: 'admin-content',
    content: `
        <section class="section-admin-dashboard">
            <h2>Painel <span>Administrativo</span></h2>

            <!-- Info Box: Permissões do Admin -->
            <div class="admin-permissions-info">
                <div class="permissions-header">
                    <i class="fas fa-shield-alt"></i>
                    <span>Permissões do Administrador</span>
                    <button class="btn-toggle-permissions" id="btnTogglePermissions">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                <div class="permissions-content" id="permissionsContent">
                    <div class="permissions-columns">
                        <div class="permissions-column can-do">
                            <h4><i class="fas fa-check-circle"></i> O que posso fazer</h4>
                            <ul>
                                <li><i class="fas fa-check"></i> Criar e gerenciar campeonatos</li>
                                <li><i class="fas fa-check"></i> Forçar placar em partidas contestadas</li>
                                <li><i class="fas fa-check"></i> Iniciar e finalizar campeonatos</li>
                                <li><i class="fas fa-check"></i> Criar amistosos de rodada fixa</li>
                                <li><i class="fas fa-check"></i> Visualizar logs de atividade</li>
                                <li><i class="fas fa-check"></i> Exportar relatórios em PDF</li>
                            </ul>
                        </div>
                        <div class="permissions-column cannot-do">
                            <h4><i class="fas fa-times-circle"></i> O que NÃO posso fazer</h4>
                            <ul>
                                <li><i class="fas fa-times"></i> Excluir usuários (apenas Superadmin)</li>
                                <li><i class="fas fa-times"></i> Inativar jogadores (apenas Superadmin)</li>
                                <li><i class="fas fa-times"></i> Promover para Superadmin</li>
                                <li><i class="fas fa-times"></i> Alterar regras do sistema</li>
                                <li><i class="fas fa-times"></i> Executar ações sem registro em log</li>
                            </ul>
                        </div>
                    </div>
                    <p class="permissions-note">
                        <i class="fas fa-info-circle"></i>
                        Todas as ações críticas são registradas automaticamente nos logs de atividade.
                    </p>
                </div>
            </div>

            <div class="admin-table-group">
                <!-- GESTÃO DE AMISTOSOS -->
                <div class="admin-card-table icou-card">
                    <div class="card-header">
                        <i class="fas fa-gamepad"></i>
                        <h3>GESTÃO DE AMISTOSOS</h3>
                        <button class="btn-add-new" id="btn-novo-amistoso">
                            <i class="fas fa-plus"></i> Novo Amistoso
                        </button>
                    </div>
                    <div class="card-content">
                    <div class="table-container">
                        <table class="icou-table table-admin">
                            <thead>
                                <tr>
                                    <th>Partida</th>
                                    <th class="col-data">Data</th>
                                    <th class="col-status">Status</th>
                                    <th class="col-actions">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="admin-amistosos-tbody">
                                <!-- Renderizado dinamicamente -->
                            </tbody>
                        </table>
                    </div>
                    </div>
                </div>

                <!-- GESTÃO DE USUÁRIOS -->
                <div class="admin-card-table icou-card">
                    <div class="card-header">
                        <i class="fas fa-users-cog"></i>
                        <h3>GESTÃO DE USUÁRIOS</h3>
                        <span class="admin-tooltip" data-tooltip="Apenas Superadmin pode excluir ou inativar usuários">
                            <i class="fas fa-info-circle"></i>
                        </span>
                    </div>
                    <div class="card-content">
                    
                    <!-- Barra de Filtros de Usuários -->
                    <div class="admin-filters-bar" id="usersFiltersBar">
                        <div class="filter-group filter-search">
                            <i class="fas fa-search"></i>
                            <input type="text" id="filterUsersSearch" placeholder="Buscar por nome..." class="filter-input">
                        </div>
                        <div class="filter-group">
                            <select id="filterUsersStatus" class="filter-select">
                                <option value="todos">Todos os Status</option>
                                <option value="ativo">Ativos</option>
                                <option value="inativo">Inativos</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <select id="filterUsersRole" class="filter-select">
                                <option value="todos">Todas as Funções</option>
                                <option value="Jogador">Jogador</option>
                                <option value="Gestao">Gestão</option>
                                <option value="Admin">Admin</option>
                                <option value="Superadmin">Superadmin</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <select id="filterUsersSort" class="filter-select">
                                <option value="nome-asc">Nome (A-Z)</option>
                                <option value="nome-desc">Nome (Z-A)</option>
                                <option value="criado-desc">Mais Recentes</option>
                                <option value="criado-asc">Mais Antigos</option>
                                <option value="estrelas-desc">Mais Estrelas</option>
                            </select>
                        </div>
                        <button class="btn-clear-filters" id="btnClearUsersFilters" title="Limpar filtros">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="filter-results-info" id="usersResultsInfo"></div>
                    
                    <div class="table-container">
                        <table class="icou-table table-admin">
                            <thead>
                                <tr>
                                    <th>Usuário</th>
                                    <th>Time</th>
                                    <th class="col-status">Status</th>
                                    <th class="col-funcao">Função</th>
                                    <th class="col-actions">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="admin-users-tbody">
                                <!-- Renderizado dinamicamente -->
                            </tbody>
                        </table>
                    </div>
                    </div>
                </div>

                <!-- GESTÃO DE CAMPEONATOS -->
                <div class="admin-card-table icou-card">
                    <div class="card-header">
                        <i class="fas fa-trophy"></i>
                        <h3>GESTÃO DE CAMPEONATOS</h3>
                        <button class="btn-add-new" id="btn-novo-campeonato">
                            <i class="fas fa-plus"></i> Novo Campeonato
                        </button>
                    </div>
                    <div class="card-content">
                    
                    <!-- Barra de Filtros de Campeonatos -->
                    <div class="admin-filters-bar" id="campsFiltersBar">
                        <div class="filter-group filter-search">
                            <i class="fas fa-search"></i>
                            <input type="text" id="filterCampsSearch" placeholder="Buscar por nome..." class="filter-input">
                        </div>
                        <div class="filter-group">
                            <select id="filterCampsStatus" class="filter-select">
                                <option value="todos">Todos os Status</option>
                                <option value="Ativo">Em Andamento</option>
                                <option value="ConvitesPendentes">Convites Pendentes</option>
                                <option value="Finalizado">Finalizados</option>
                                <option value="Cancelado">Cancelados</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <select id="filterCampsSort" class="filter-select">
                                <option value="criado-desc">Mais Recentes</option>
                                <option value="criado-asc">Mais Antigos</option>
                                <option value="nome-asc">Nome (A-Z)</option>
                                <option value="participantes-desc">Mais Participantes</option>
                            </select>
                        </div>
                        <button class="btn-clear-filters" id="btnClearCampsFilters" title="Limpar filtros">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="filter-results-info" id="campsResultsInfo"></div>
                    
                    <div class="table-container">
                        <table class="icou-table table-admin">
                            <thead>
                                <tr>
                                    <th>Campeonato</th>
                                    <th class="col-status">Status</th>
                                    <th class="col-numeric">Partic.</th>
                                    <th class="col-actions">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="admin-camps-tbody">
                                <!-- Renderizado dinamicamente -->
                            </tbody>
                        </table>
                    </div>
                    </div>
                </div>
            </div>

            <div class="admin-actions-critical icou-card">
                <div class="card-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>AÇÕES CRÍTICAS DO SISTEMA</h3>
                </div>
                <div class="card-content">
                <p class="critical-actions-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    Ações abaixo exigirão confirmação e serão registradas nos logs
                </p>
                <div class="critical-actions-grid">
                    <button class="btn-critical" id="btn-forcar-placar"><i class="fas fa-plus-circle"></i> Forçar Placar</button>
                    <button class="btn-critical" id="btn-inativar-jogador"><i class="fas fa-user-slash"></i> Inativar Jogador</button>
                    <button class="btn-critical" id="btn-finalizar-campeonato"><i class="fas fa-flag-checkered"></i> Finalizar Campeonato</button>
                    <button class="btn-critical" id="btn-exportar-pdf"><i class="fas fa-file-export"></i> Exportar PDF Geral</button>
                </div>
                </div>
            </div>

            <div class="admin-logs icou-card">
                <div class="card-header">
                    <i class="fas fa-history"></i>
                    <h3>LOGS DE ATIVIDADE</h3>
                </div>
                <div class="card-content">
                    <div class="table-container">
                        <table class="icou-table table-admin">
                            <thead>
                                <tr>
                                    <th class="col-data">Data</th>
                                    <th>Responsável</th>
                                    <th>Ação</th>
                                    <th>Detalhes</th>
                                </tr>
                            </thead>
                            <tbody id="admin-logs-tbody">
                                <!-- Renderizado dinamicamente -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>

        <!-- MODAL: Novo Campeonato -->
        <div id="modal-novo-campeonato" class="modal-overlay hidden">
            <div class="modal-content modal-lg">
                <button class="modal-close" data-close-modal>&times;</button>
                <h3><i class="fas fa-trophy"></i> Criar Novo Campeonato</h3>
                
                <form id="form-novo-campeonato">
                    <div class="input-group">
                        <label for="camp-nome">Nome do Campeonato</label>
                        <input type="text" id="camp-nome" placeholder="Ex: Copa iCou 2025" required>
                    </div>
                    
                    <div class="input-group">
                        <label for="camp-tipo">Tipo de Campeonato</label>
                        <select id="camp-tipo" required>
                            <option value="">Selecione o tipo</option>
                            <option value="pontos-corridos-predefinido">Pontos Corridos | Pré-definido</option>
                            <option value="pontos-corridos-avulso">Pontos Corridos | Avulso</option>
                        </select>
                    </div>
                    
                    <!-- Opções para Pontos Corridos | Pré-definido -->
                    <div id="opcoes-predefinido" class="camp-opcoes hidden">
                        <div class="input-group">
                            <label for="camp-modo">Modo de Encerramento</label>
                            <select id="camp-modo">
                                <option value="periodo">Por Período (data início/fim)</option>
                                <option value="alcance">Por Alcance de Pontuação</option>
                            </select>
                        </div>
                        
                        <div id="opcoes-periodo" class="camp-sub-opcoes">
                            <div class="form-row">
                                <div class="input-group">
                                    <label for="camp-data-inicio">Data Início</label>
                                    <input type="date" id="camp-data-inicio">
                                </div>
                                <div class="input-group">
                                    <label for="camp-data-fim">Data Fim</label>
                                    <input type="date" id="camp-data-fim">
                                </div>
                            </div>
                        </div>
                        
                        <div id="opcoes-alcance" class="camp-sub-opcoes hidden">
                            <div class="input-group">
                                <label for="camp-pontos-meta">Pontuação para Vencer</label>
                                <input type="number" id="camp-pontos-meta" min="1" placeholder="Ex: 30">
                            </div>
                        </div>
                        
                        <div class="input-group">
                            <label>Selecionar Participantes</label>
                            <div id="camp-participantes-lista" class="participantes-checklist">
                                <!-- Renderizado dinamicamente -->
                            </div>
                        </div>
                    </div>
                    
                    <!-- Opções para Pontos Corridos | Avulso -->
                    <div id="opcoes-avulso" class="camp-opcoes hidden">
                        <div class="input-group">
                            <label for="camp-vagas">Número de Vagas</label>
                            <input type="number" id="camp-vagas" min="2" max="50" placeholder="Quantos participantes">
                        </div>
                        <p class="help-text">
                            <i class="fas fa-info-circle"></i> 
                            Todos os usuários serão notificados e poderão se inscrever. 
                            O campeonato iniciará automaticamente quando todas as vagas forem preenchidas.
                        </p>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" data-close-modal>Cancelar</button>
                        <button type="submit" class="btn-primary">Criar Campeonato</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL: Status do Campeonato -->
        <div id="modal-status-campeonato" class="modal-overlay hidden">
            <div class="modal-content modal-lg">
                <button class="modal-close" data-close-modal>&times;</button>
                <h3><i class="fas fa-chart-pie"></i> Status do Campeonato</h3>
                
                <div id="status-campeonato-content">
                    <!-- Renderizado dinamicamente -->
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" data-close-modal>Fechar</button>
                </div>
            </div>
        </div>

        <!-- MODAL: Cancelar Campeonato -->
        <div id="modal-cancelar-campeonato" class="modal-overlay hidden">
            <div class="modal-content">
                <button class="modal-close" data-close-modal>&times;</button>
                <h3><i class="fas fa-ban"></i> Cancelar Campeonato</h3>
                
                <form id="form-cancelar-campeonato">
                    <input type="hidden" id="cancelar-camp-id">
                    
                    <p class="warning-text">
                        <i class="fas fa-exclamation-triangle"></i>
                        Você está prestes a cancelar este campeonato. Esta ação não pode ser desfeita.
                    </p>
                    
                    <div class="input-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="cancelar-com-notificacao" checked>
                            Enviar notificação aos participantes
                        </label>
                    </div>
                    
                    <div id="cancelar-notificacao-texto" class="input-group">
                        <label for="cancelar-mensagem">Mensagem personalizada (opcional)</label>
                        <textarea id="cancelar-mensagem" rows="3" placeholder="Informe o motivo do cancelamento..."></textarea>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" data-close-modal>Voltar</button>
                        <button type="submit" class="btn-danger">Confirmar Cancelamento</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL: Excluir Usuário -->
        <div id="modal-excluir-usuario" class="modal-overlay hidden">
            <div class="modal-content">
                <button class="modal-close" data-close-modal>&times;</button>
                <h3><i class="fas fa-user-times"></i> Excluir Usuário</h3>
                
                <form id="form-excluir-usuario">
                    <input type="hidden" id="excluir-user-id">
                    
                    <p class="danger-text">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>ATENÇÃO:</strong> Esta ação excluirá permanentemente o usuário e todos os seus dados.
                        Esta ação NÃO pode ser desfeita!
                    </p>
                    
                    <div class="input-group">
                        <label for="excluir-confirmacao">Digite "EXCLUIR" para confirmar</label>
                        <input type="text" id="excluir-confirmacao" placeholder="EXCLUIR" required>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" data-close-modal>Cancelar</button>
                        <button type="submit" class="btn-danger" id="btn-confirmar-exclusao" disabled>Excluir Permanentemente</button>
                    </div>
                </form>
            </div>
        </div>
    `
}; 