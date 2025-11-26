# Especificação Funcional de Páginas — iCouFootball

Fonte: `docs/PRD_iCouFootball.md`  
Stack: HTML5, CSS, JS Vanilla; Firebase Auth/Firestore (v9+)  
Cores: `#FD8A24` (Ação/Destaque), `#605F54` (Base)

## 1. Home Page Pública (Classificação)
- **Acesso:** Público
- **Objetivo UX:** Exibir a classificação atual e estatísticas gerais do campeonato em tempo real, sem necessidade de login.
- **Layout & Estrutura (Mobile First):**
  - **Header:** Logo; Navegação para `Classificação`, `Dashboard`, `Partidas`, `Admin`, `Entrar`. Referência: `index.html:1-44`.
  - **Corpo Principal:**
    - Seção "Classificação" com tabela responsiva (scroll horizontal no mobile).
    - Seção "Estatísticas Avançadas" (Melhor Ataque, Melhor Defesa, Maior Goleada).
  - **Rodapé:** Copyright, status de modo escuro, links institucionais.
- **Detalhamento de Funcionalidades e Componentes:**
  - **Elemento:** Tabela de Classificação
    - **Ação do Usuário:** Scroll; Hover nos cabeçalhos; Navegação.
    - **Comportamento (Frontend):** Renderiza `tbody#standings-body` e aplica ordenação por critérios: Pontos (P), Vitórias (V), Saldo de Gols (SG), Gols Pró (GP), Gols Contra (GC); aplica critério final de desempate por Confronto Direto.
    - **Integração/Lógica (Backend):** `onSnapshot` em `campeonatos/{id}/rodadas/*/partidas` para resultados confirmados; agregação client-side para ranking.
  - **Elemento:** Estatísticas Avançadas
    - **Ação:** Visualização.
    - **Comportamento:** Calcula métricas (Maior GP, Menor GC, Maior Goleada) a partir das partidas confirmadas.
    - **Integração:** Leitura em tempo real das mesmas coleções de partidas.
- **Regras de Negócio Específicas:**
  - Ordenação segue P, V, SG, GP, GC e Confronto Direto.
  - Atualização em tempo real via `onSnapshot`.
- **Implementação/Arquivos:**
  - UI: `pages/standings.html:1-35`
  - Estilos: `assets/css/components.css:150-224` (tabela), `assets/css/theme.css:1-44`

## 2. Autenticação (Login/Registro/Recuperação)
- **Acesso:** Público
- **Objetivo UX:** Permitir que usuários acessem e criem contas de forma segura e simples.
- **Layout & Estrutura (Mobile First):**
  - **Header:** Logo; Toggle Registrar/Entrar.
  - **Corpo Principal:** Card com inputs de Email, Senha; campos adicionais em modo Registrar (Usuário, Confirmar Senha); link "Esqueceu sua senha?"; botões sociais (placeholders).
  - **Rodapé:** Dots de paginação/estado visual.
- **Detalhamento de Funcionalidades e Componentes:**
  - **Elemento:** Toggle Registrar/Entrar
    - **Ação:** Alterar modo.
    - **Comportamento:** Mostra/oculta campos adicionais; muda rótulo do botão.
    - **Integração:** Sem backend; apenas UI.
  - **Elemento:** Form Login/Registro
    - **Ação:** Submeter.
    - **Comportamento:** Valida email/senha; valida confirmação de senha em registro; exibe mensagens de erro.
    - **Integração:**
      - Login: `signInWithEmailAndPassword(auth, email, password)`
      - Registro: `createUserWithEmailAndPassword(auth, email, password)` e persistência de perfil em `users/{userId}`
      - Recuperação: `sendPasswordResetEmail(auth, email)`
      - Sessão: `onAuthStateChanged(auth, cb)`
- **Regras de Negócio Específicas:**
  - Validação básica de campos obrigatórios.
  - Perfis com função inicial "Jogador"; funções "Admin" definidas separadamente.
- **Implementação/Arquivos:**
  - UI: `pages/login.html:1-55`
  - Script: `assets/js/auth.js:1-73` (a integrar com Firebase)
  - Firebase: `assets/js/firebase.js:1-10`

## 3. Dashboard do Jogador (Privado)
- **Acesso:** Logado (Jogador/Admin)
- **Objetivo UX:** Exibir KPIs pessoais por campeonato e histórico de confrontos.
- **Layout & Estrutura (Mobile First):**
  - **Header:** Logo; Navegação; Logout.
  - **Corpo Principal:** Grid de cartões com KPIs (Vitórias, Empates, Derrotas, Média de Gols) e seção de histórico.
  - **Rodapé:** Links de suporte.
- **Detalhamento de Funcionalidades e Componentes:**
  - **Elemento:** Cards de KPIs
    - **Ação:** Visualização.
    - **Comportamento:** Atualização em tempo real com agregação client-side.
    - **Integração:** `onSnapshot` filtrando partidas do usuário.
  - **Elemento:** Histórico de Confrontos
    - **Ação:** Scroll; filtro por adversário.
    - **Comportamento:** Lista ordenada por data; badges de resultado.
    - **Integração:** Leitura de `partidas` por `userId` em subcoleções.
- **Regras de Negócio Específicas:**
  - KPIs calculados apenas de partidas confirmadas.
- **Implementação/Arquivos:**
  - UI: `pages/dashboard.html:1-35`
  - Estilos: `assets/css/components.css:180-224`

## 4. Painel de Partidas & Fair Play (Privado)
- **Acesso:** Logado (Jogador/Admin)
- **Objetivo UX:** Inserir placares e acompanhar estados (pendente/confirmado/contestado), incluindo link de transmissão.
- **Layout & Estrutura (Mobile First):**
  - **Header:** Logo; Navegação; Logout.
  - **Corpo Principal:** Tabela de partidas com status e ações; formulário de inserção de placar "[ A ] x [ B ]"; campo para link de transmissão.
  - **Rodapé:** Ajuda/boas práticas.
- **Detalhamento de Funcionalidades e Componentes:**
  - **Elemento:** Formulário de Placar
    - **Ação:** Preencher e enviar.
    - **Comportamento:** Valida valores numéricos (>=0); destaca campos; limpa após envio.
    - **Integração:** `addDoc` em `campeonatos/{id}/rodadas/{rodadaId}/partidas/{partidaId}` com `placarStatus: 'pending'`, `linkTransmissao` opcional; registra `dataPartida`.
  - **Elemento:** Ação "Confirmar"
    - **Ação:** Clicar.
    - **Comportamento:** Atualiza `placarStatus: 'confirmed'` se jogador B.
    - **Integração:** `updateDoc` na partida; registra log em `logs`.
  - **Elemento:** Ação "Contestar"
    - **Ação:** Clicar.
    - **Comportamento:** Marca `placarStatus: 'contested'`; notifica admin.
    - **Integração:** `updateDoc`; cria entrada em `logs`.
  - **Elemento:** Ação "Forçar Confirmação" (Admin)
    - **Ação:** Clicar.
    - **Comportamento:** Define `placarStatus: 'confirmed'` e `vencedorId` se aplicável.
    - **Integração:** `updateDoc` com privilégio; log: `logs`.
- **Regras de Negócio Específicas:**
  - Pontuação: Vitória 3, Empate 1, Derrota 0.
  - Notificação ao adversário em status pendente.
  - Link de transmissão armazenado no documento da partida.
- **Implementação/Arquivos:**
  - UI: `pages/matches.html:1-43`
  - Estilos: badges e formulário em `assets/css/components.css:200-224`

## 5. Perfil do Usuário
- **Acesso:** Logado (Jogador/Admin)
- **Objetivo UX:** Permitir que o usuário gerencie informações de perfil, foto e time.
- **Layout & Estrutura (Mobile First):**
  - **Header:** Logo; Navegação; Logout.
  - **Corpo Principal:** Form com campos de Nome, Time, Descrição, Redes Sociais, Contato; upload de foto; exibição de estrelas.
  - **Rodapé:** Política de privacidade.
- **Detalhamento de Funcionalidades e Componentes:**
  - **Elemento:** Upload de Foto
    - **Ação:** Selecionar arquivo.
    - **Comportamento:** Valida tipo `.jpg/.png` e tamanho <2MB; mostra preview.
    - **Integração:** Upload via ImgBB (`fetch` POST); salva `fotoUrl` em `users/{userId}`.
  - **Elemento:** Escolher Time
    - **Ação:** Digitar nome.
    - **Comportamento:** Auto-sugestão; fallback quando API indisponível.
    - **Integração:** `fetch` na TheSportsDB; persistir `timeId`.
  - **Elemento:** Estrelas
    - **Ação:** Hover.
    - **Comportamento:** Mostra tooltip com total quando >5.
    - **Integração:** Leitura de `estrelas` em `users/{userId}`.
- **Regras de Negócio Específicas:**
  - Sistema de estrelas: +1 por campeonato vencido; máximo 5 visíveis; total em tooltip.
  - `perfilPublico`: controla visibilidade na Home.

## 6. Painel Administrativo (Admin Only)
- **Acesso:** Admin
- **Objetivo UX:** Gerenciar campeonatos, rodadas, usuários e ações críticas.
- **Layout & Estrutura (Mobile First):**
  - **Header:** Logo; Navegação Admin; Logout.
  - **Corpo Principal:** Tabelas de usuários; gerenciamento de campeonatos/rodadas; botões de ação (Forçar Placar, Inativar Jogador, Iniciar/Finalizar Campeonato); exportação PDF.
  - **Rodapé:** Logs e auditoria.
- **Detalhamento de Funcionalidades e Componentes:**
  - **Elemento:** Gestão de Rodadas Fixas
    - **Ação:** Criar/editar confrontos.
    - **Comportamento:** CRUD com validação de datas e pares.
    - **Integração:** `campeonatos/{id}/rodadas/{rodadaId}/partidas/*`.
  - **Elemento:** Logs de Atividade
    - **Ação:** Visualizar.
    - **Comportamento:** Lista paginada.
    - **Integração:** `logs/{logId}` com `acao`, `userIdResponsavel`, `detalhes`, `data`.
  - **Elemento:** Exportar PDF
    - **Ação:** Clicar.
    - **Comportamento:** Gera PDF da tabela final.
    - **Integração:** Geração client-side (ex: jsPDF via CDN, se aprovado).
- **Regras de Negócio Específicas:**
  - Campeonatos finalizados: arquivar e manter por até 12 meses.
  - Ações críticas devem gerar logs.

## Diretrizes de Qualidade
- **Tecnologia:** Frontend em JS Vanilla; Firebase v9+ modular (imports `initializeApp`, `getAuth`, `getFirestore`, `onSnapshot`).
- **Design System:** `#FD8A24` para botões/ações/destaques; `#605F54` como base e elementos secundários; modo escuro padrão.
- **Responsividade:** Tabelas com `overflow-x: auto` no mobile; cabeçalhos claros; layout mobile-first.
- **Integridade:** Implementar apenas funcionalidades do PRD.

## Integrações e Dados (Resumo)
- **Auth:** `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `sendPasswordResetEmail`, `onAuthStateChanged`.
- **Firestore:**
  - `users/{userId}`: perfil, estrelas, visibilidade.
  - `campeonatos/{id}`: status, datas, campeões.
  - `rodadas` (subcoleção): número, data prevista.
  - `partidas` (subcoleção): jogadores A/B, placar, status, vencedor, link, data.
  - `logs/{logId}`: auditoria admin.
- **APIs Externas:**
  - ImgBB: upload de imagens (validação <2MB; tipos permitidos).
  - TheSportsDB: busca de times/escudos (fallback para indisponibilidade).

## Arquivos do Projeto (Referências)
- Shell: `index.html:1-44`
- Classificação: `pages/standings.html:1-35`
- Login/Registro: `pages/login.html:1-55`, `assets/js/auth.js:1-73`
- Dashboard: `pages/dashboard.html:1-35`
- Partidas: `pages/matches.html:1-43`
- Admin: `pages/admin.html:1-39`
- Tema/CSS: `assets/css/theme.css:1-44`, `assets/css/main.css:1-47`, `assets/css/components.css:1-224`
- Firebase: `assets/js/firebase.js:1-10`, `config/firebase-config.js:3`
