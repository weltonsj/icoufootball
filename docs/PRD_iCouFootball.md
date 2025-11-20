## 📄 Product Requirements Document (PRD) - iCouFootball

| Detalhe | Valor |
| :--- | :--- |
| **Nome do Produto** | iCouFootball |
| **Versão** | 1.0 |
| **Data** | 20 de Novembro de 2025 |
| **Desenvolvimento** | HTML5, CSS e JavaScript (Vanilla - Sem Frameworks) |
| **Idioma Padrão** | Português (Brasil) |
| **Cores Primárias** | **\#FD8A24** (Laranja) e **\#605F54** (Cinza Escuro) |

-----

## 1\. 🎯 Visão Geral do Produto

O iCouFootball é um **sistema de gerenciamento e exibição de estatísticas** para campeonatos de **FC25 (EAFC)**, focado em proporcionar uma experiência **pública, dinâmica e confiável** para o acompanhamento de competições no formato de **Pontos Corridos**. O sistema deve ser **fácil de usar** tanto para a administração quanto para os jogadores, com foco em uma interface **limpa e responsiva**, seguindo a identidade visual com as cores primárias **\#FD8A24** e **\#605F54**.

-----

## 2\. 🚀 Metas do Produto

  * **Transparência:** Fornecer uma página inicial totalmente **pública** e atualizada **em tempo real** com as estatísticas do campeonato.
  * **Confiabilidade:** Implementar um sistema de **validação de placar (Fair Play)** e critérios de desempate **robustos**.
  * **Gestão Simplificada:** Oferecer um painel de controle **intuitivo** para Administradores gerenciarem campeonatos, rodadas e usuários.
  * **Experiência do Jogador:** Dar **autonomia** aos jogadores para gerenciar seus perfis e inserir resultados.

-----

## 3\. 👥 Público-Alvo e Casos de Uso

| Público-Alvo | Função Principal | Casos de Uso Chave |
| :--- | :--- | :--- |
| **Público Geral** | Consumo de Informação | Acompanhar a tabela de classificação e estatísticas de jogadores em tempo real. |
| **Jogador** | Participação e Atualização | Inserir placares, gerenciar perfil, recuperar senha, interagir no chat. |
| **Administrador** | Gestão Total | Iniciar/Finalizar campeonatos, forçar placares, gerenciar usuários, configurar rodadas. |

-----

## 4\. ✨ Requisitos de UI/UX e Estilo

| Requisito | Detalhamento |
| :--- | :--- |
| **Identidade Visual** | Uso das cores **\#FD8A24 (Laranja)** para destaque e **\#605F54 (Cinza Escuro)** para fundo ou elementos secundários. |
| **Design** | O design deve ser moderno e alinhado com os templates fornecidos. Deve ser **totalmente responsivo (Mobile First)**. |
| **Modo Escuro** | O sistema deve suportar e ter o **Modo Escuro como padrão** ou com fácil alternância. |
| **Imagens de Perfil** | Uso de **placeholder ou fallback** para imagens de perfil (jogadores/times) caso o ImgBB não carregue. |
| **Acessibilidade** | Garantir **contraste suficiente**, especialmente entre o texto e o fundo (importante no modo escuro). |

-----

## 5\. 🛠️ Requisitos Funcionais (RF)

### RF1: Home Page (Pública)

  * **Exibição de Estatísticas:** A página inicial deve exibir, **sem necessidade de login**, a tabela atual do campeonato em Pontos Corridos.
  * **Tabela Dinâmica:** A tabela deve ser atualizada em **tempo real** via `onSnapshot` do Firestore assim que um placar for confirmado.
  * **Tabela de Classificação:** Deve listar o ranking por: **Pontos (P), Vitórias (V), Saldo de Gols (SG), Gols Pró (GP), Gols Contra (GC)**, e o critério de desempate (**Confronto Direto**).
  * **Lista de Players:** Exibição da lista de jogadores com nome, time e o nível de estrelas (parcialmente).
  * **Estatísticas Avançadas:** Exibir métricas como Melhor Ataque, Melhor Defesa, Maior Goleada, etc.

### RF2: Autenticação e Perfis

  * **Mecanismo de Autenticação:** Uso de **Firebase Authentication** (e-mail/senha) e `signInWithCustomToken`.
  * **Tipos de Usuário:**
      * **Administrador (Admin):** Controle total do sistema e gestão de usuários.
      * **Jogador:** Permissões limitadas, foco na participação e gestão do próprio perfil/placar.
  * **Recuperação de Senha:** Funcionalidade padrão via Firebase Auth (enviar link para e-mail).

### RF3: Gerenciamento de Usuários e Permissões

| Funcionalidade | Jogador | Administrador |
| :--- | :--- | :--- |
| Inserir Placar | Sim | Sim |
| Editar/Remover Placar | Não | Sim |
| Forçar Confirmação Placar | Não | Sim |
| Excluir Própria Conta | Sim | Sim |
| Excluir Conta de Terceiros | Não | Sim |
| Mudar Foto de Perfil | Sim (Validação: .jpg/.png \< 2MB, ImgBB) | Sim |
| Escolher Time | Sim (Integração com TheSportsDB) | Sim |
| Inativar Jogador | Não | Sim |
| Adicionar/Mudar Funções | Não | Sim |
| Iniciar/Finalizar Campeonato | Não | Sim |

### RF4: Gerenciamento de Campeonatos e Rodadas

  * **Sistema de Pontos Corridos:** A lógica do sistema deve calcular pontos (**Vitória: 3, Empate: 1, Derrota: 0**) e atualizar a tabela.
  * **Registro de Data/Hora:** O sistema deve registrar a data e hora de início e fim de cada campeonato para fins de histórico.
  * **Rodadas Fixas:** O Administrador deve poder **pré-definir todos os confrontos** de todas as rodadas antes do início do campeonato.
  * **Arquivamento:** Campeonatos finalizados serão armazenados e consultáveis por no máximo **12 meses**.
  * **Exportação:** O Administrador deve poder exportar a tabela final do campeonato em formato **PDF**.

### RF5: Inserção e Validação de Placar (Fair Play)

  * **Lançamento de Placar:** O Jogador insere o placar (ex: 3x0). O sistema registra o resultado como **"Confirmação Pendente"**.
  * **Notificação de Pendência:** O Jogador adversário (B) recebe uma **notificação** (no painel e/ou e-mail) informando sobre o placar pendente.
  * **Confirmação:** O Jogador B deve clicar em **"Confirmar"** para que o placar seja validado e os pontos sejam atualizados na tabela.
  * **Disputa/Forçar:** O Administrador pode, a qualquer momento, **forçar a confirmação** do placar em caso de disputa ou inércia de um dos jogadores.

### RF6: Critério de Desempate (Confronto Direto)

  * **Lógica da Tabela:** A ordenação da tabela segue a ordem padrão dos Pontos Corridos.
  * **Regra de Desempate:** Se **Pontos, Vitórias e Saldo de Gols** forem iguais entre dois ou mais times, o **Confronto Direto** será o critério de desempate final.

### RF7: Estatísticas e Visualização

  * **Dashboard Pessoal (Jogador):** Seção privada para exibir estatísticas detalhadas por campeonato:
      * Percentual de Vitórias/Empates/Derrotas.
      * Média de Gols por Partida (GP).
      * Histórico de Confrontos (vs. outros jogadores).
  * **Estatísticas Avançadas (Geral):**
      * Melhor Ataque (Maior GP).
      * Melhor Defesa (Menor GC).

### RF8: Perfis de Jogadores

  * **Gestão de Perfil (Jogador):** O Jogador pode adicionar/editar: Nome, Nome do Time, Descrição, Links de Redes Sociais, Contato.
  * **Visibilidade do Perfil:**
      * **Público:** Todas as informações são exibidas na Home Page (Lista de Players).
      * **Privado:** Apenas Nome, Time e a quantidade de Estrelas (parcial) são exibidos publicamente.
  * **Sistema de Estrelas:**
      * Cada campeonato vencido confere **uma estrela**.
      * Máximo de **5 estrelas visíveis**.
      * Se ultrapassar 5, o número total só é revelado ao posicionar o mouse (tooltip) sobre as estrelas.

### RF9: Comunicação e Logs

  * **Chat Interno:** Usuários logados e cadastrados devem ter um sistema de chat (requer **Firestore**) para se comunicarem e combinarem partidas.
  * **Notificações por E-mail:** O Administrador configura o envio de e-mails para: Início de um novo campeonato, Início de uma nova rodada, ou Ambos.
  * **Log de Atividades (Admin):** Sistema de log interno (armazenado no Firestore) para registrar ações críticas, como:
      * "Admin forçou confirmação do placar X."
      * "Usuário Y excluiu a conta."
      * "Admin Z inativou o Jogador W."

-----

## 6\. ⚙️ Requisitos Não Funcionais (RNF)

| ID | Requisito | Detalhamento |
| :--- | :--- | :--- |
| **RNF1** | **Performance** | Todas as consultas à tabela (Home Page) devem ser **rápidas** (tempo de carregamento **inferior a 2s**) devido ao uso do `onSnapshot` do Firestore. |
| **RNF2** | **Escalabilidade** | O Firestore deve ser estruturado para suportar um **crescimento modular** (ex: nova coleção para cada campeonato). |
| **RNF3** | **Disponibilidade** | Dependência das APIs externas (ImgBB e TheSportsDB). É obrigatório ter uma **interface de fallback ou placeholders**. |
| **RNF4** | **Limitação de Upload** | Validação em Frontend para aceitar apenas arquivos **.jpg ou .png** e limitar o tamanho a **2MB** (para ImgBB). |
| **RNF5** | **Transmissão** | Deve haver um campo para inserir o **link da transmissão** (Youtube/OBS Studio) do lado do Jogador A ou B. |
| **RNF6** | **Segurança** | Acesso ao Painel de Controle restrito aos usuários autenticados (Admin/Jogador) via **Firebase Auth**. |

-----

## 7\. 💡 Sugestões de Melhoria (Roadmap Futuro)

1.  **Integração de Notificação Push:** Implementar notificações push (via Firebase Cloud Messaging - FCM) para placares pendentes e início de rodadas.
2.  **Visualização Gráfica de Estatísticas:** Adicionar gráficos simples (barras, pizza) no Dashboard Pessoal e na Home Page.
3.  **Sistema de Premiações/Troféus:** Implementar um sistema de "Troféus" virtuais por conquistas.
4.  **Sistema de Votação (MVP):** Permitir que os jogadores votem no "Melhor Jogador da Rodada" ou "Melhor Gol".

-----

## 8\. 💾 Proposta de Firestore Schema

| Coleção | Documento (ID) | Descrição dos Campos Chave | Regras de Acesso |
| :--- | :--- | :--- | :--- |
| **users** | `[userId]` | `nome`, `email`, `funcao`, `timeId`, `fotoUrl`, `estrelas`, `perfilPublico`, `redesSociais`, `descricao`, `log` (subcoleção) | Privado |
| **campeonatos** | `[campeonatoId]` | `nome`, `status`, `dataInicio`, `dataFim`, `campeoes`, `rodadas` (subcoleção), `tabelaFinal` | Público |
| **rodadas** (Subcoleção de **campeonatos**) | `[rodadaId]` | `numero`, `dataPrevista`, `partidas` (subcoleção) | Público |
| **partidas** (Subcoleção de **rodadas**) | `[partidaId]` | `jogadorAId`, `jogadorBId`, `placarA`, `placarB`, `placarStatus`, `vencedorId`, `linkTransmissao`, `dataPartida` | Público |
| **logs** (Admin) | `[logId]` | `data`, `acao`, `userIdResponsavel`, `detalhes` | **Apenas Admin** |

-----

## 9\. 📈 Fluxograma Principal do Sistema (Mermaid)

```mermaid
graph TD
    A[Início do Sistema - Home Page Pública] --> P1[Carregar Tabela e Estatísticas (onSnapshot)];
    P1 --> P2[Exibir Tabela, Players, Estatísticas Avançadas];
    P2 --> P3[Atualização em Tempo Real];

    A --> B{Usuário Logado?};
    B -- Não --> A;
    B -- Sim --> C{Qual é a Função do Usuário?};
    C -- Jogador --> D[Painel do Jogador];
    C -- Administrador --> E[Painel do Administrador];

    %% FLUXO JOGADOR
    D --> F{Ação do Jogador};
    F --> G[Gerenciar Perfil];
    F --> H[Inserir Placar (RF5)];
    F --> I[Dashboard Pessoal];
    F --> J[Chat Interno];
    
    %% FLUXO DE INSERÇÃO DE PLACAR (FAIR PLAY - RF5)
    H --> K[Placar Enviado (Ex: 3x0)];
    K --> L[Placar é Registrado como 'Confirmação Pendente' no Firestore];
    L --> M[Notificação Enviada ao Jogador B];
    M --> N{Jogador B Confirma?};
    N -- Sim --> O[Placar Validado];
    N -- Não --> P{Admin Intervém?};
    P -- Sim --> Q[Admin Força Confirmação];
    P -- Não --> M;
    
    O --> R[Cálculo de Pontos e Desempate (Confronto Direto)];
    R --> S[Atualizar Tabela de Classificação no Firestore];
    S --> P3;
    
    Q --> R;
    Q --> T[Registrar Ação no Log de Atividades (Admin)];

    %% FLUXO ADMINISTRADOR
    E --> U[Gerenciar Campeonatos (Iniciar, Rodadas Fixas)];
    E --> V[Gestão de Usuários];
    E --> W[Configurar Notificações por E-mail];
    E --> X[Acesso ao Log de Atividades];
    E --> Y[Exportar Tabela Final em PDF];
    
    U --> Z[Fim do Campeonato];
    Z --> AA[Arquivar Dados (12 Meses)];
    Z --> W;
```