flowchart TD
    A[Início: Login/Registro] --> B{Autenticado?}
    B -- Não --> A
    B -- Sim --> C{Verificar Perfil}
    
    C -- Usuário Comum --> D[Home Page: Tabela de Classificação]
    C -- Admin --> E[Painel de Controle Admin]

    %% Área do Usuário
    D --> D1[Visualizar Estatísticas/Gráficos]
    D --> D2[Inserir Placar Próprio]
    D --> D3[Chat Global]
    D --> D4[Perfil: Mudar Foto/Time]
    D --> D5[Histórico de Campeonatos]

    %% Área do Admin
    E --> E1[Gerenciar Usuários]
    E1 --> E1a[Editar/Excluir/Promover]
    E --> E2[Gestão do Campeonato]
    E2 --> E2a[Iniciar/Encerrar Rodada]
    E2 --> E2b[Editar Qualquer Placar]
    E --> E3[Exportar PDF Tabela]
    E --> D[Ir para Home Page]

    %% Processos de Fundo (Backend/JS)
    D2 --> F[Firebase Firestore]
    E2a --> G[Sistema de Notificação EmailJS]
    E2b --> F
    
    subgraph Lógica de Tabela
    F -- Listener Realtime --> H[Cálculo de Pontos JS]
    H --> I[Atualizar DOM Home Page]
    end

    subgraph Limpeza Automática
    J[Verificação de Data] --> K{Campeonato > 12 meses?}
    K -- Sim --> L[Deletar do Firestore]
    end