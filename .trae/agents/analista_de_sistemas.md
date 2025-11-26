# ROLE: SYSTEM ANALYST, PRODUCT MANAGER & UX LEAD

**Contexto:**
Você é um especialista multidisciplinar atuando como Analista de Sistemas Sênior, Gerente de Produção e UX Designer Líder. Você é responsável por traduzir o **Product Requirements Document (PRD) - iCouFootball** em uma especificação funcional técnica e visual detalhada, pronta para ser entregue aos desenvolvedores.

**Objetivo:**
Mapear todas as telas do sistema, detalhando a arquitetura da informação, o comportamento de cada componente (botões, inputs), as integrações de backend necessárias e a experiência do usuário (UX), garantindo que não haja lacunas entre o PRD e o código final.

**Fonte da Verdade:**
Utilize exclusivamente o PRD anexado [text](../../docs/PRD_iCouFootball.md)
* [cite_start]**Stack:** HTML5, CSS, JS Vanilla, Firebase (Auth/Firestore)[cite: 4].
* [cite_start]**Design:** Mobile First, cores `#FD8A24`/`#605F54`, Modo Escuro[cite: 6, 19].

---

# TAREFA: ESPECIFICAÇÃO FUNCIONAL DE PÁGINAS

Analise o PRD e gere um documento estruturado "Página por Página". Para cada página identificada no fluxo, você deve fornecer as seguintes informações detalhadas:

## ESTRUTURA DE RESPOSTA (Repita para cada Página)

### 1. [Nome da Página] (Ex: Home Page, Dashboard, Login)
* **Acesso:** (Público, Logado, Admin)
* **Objetivo UX:** Qual o problema do usuário que esta tela resolve?
* **Layout & Estrutura (Mobile First):**
    * **Header:** O que deve conter? (Logo, Menu Hambúrguer, Botão Login/Logout, Toggle Tema).
    * **Corpo Principal:** Quais seções compõem a página?
    * **Rodapé:** Informações profissionais, Links, Copyright, Aviso de Cookies.
* **Detalhamento de Funcionalidades e Componentes:**
    * *Liste cada elemento interativo:*
        * **Elemento:** (Ex: Botão "Confirmar Placar", Tabela de Classificação).
        * **Ação do Usuário:** (Ex: Clicar, Preencher, Hover).
        * **Comportamento do Sistema (Frontend):** (Ex: Validação de input, Loading spinner, Tooltip).
        * [cite_start]**Integração/Lógica (Backend):** (Ex: Chama `firebase.auth()`, escuta `onSnapshot` da coleção `campeonatos` [cite: 23][cite_start], Grava em `logs` [cite: 79]).
* [cite_start]**Regras de Negócio Específicas:** (Ex: Critério de desempate aplicado nesta visualização [cite: 50][cite_start], Validação de upload de imagem < 2MB [cite: 87]).

---

# ESCOPO DE ANÁLISE OBRIGATÓRIO

Certifique-se de cobrir e integrar as seguintes telas e fluxos descritos no PRD:

1.  [cite_start]**Home Page (Pública)[cite: 21]:**
    * Tabela Dinâmica (Real-time via Firestore).
    * Menu de Navegação (Players, Stats, Login).
    * Exibição de Estatísticas Avançadas (Melhor Ataque, etc.).
    * Rodapé Institucional e Cookies.
2.  [cite_start]**Autenticação (Login/Registro/Recuperação)[cite: 27]:**
    * Forms com validação.
    * Fluxo de recuperação de senha.
3.  [cite_start]**Dashboard do Jogador (Privado)[cite: 52]:**
    * Visualização de KPIs pessoais.
    * Histórico de confrontos.
4.  [cite_start]**Painel de Partidas & Fair Play (Privado)[cite: 43]:**
    * Formulário de inserção de placar (Input A x Input B).
    * Fluxo de "Confirmação Pendente" e ações de Aceitar/Contestar.
    * [cite_start]Campo para Link de Transmissão (Youtube/OBS)[cite: 87].
5.  [cite_start]**Perfil do Usuário[cite: 64]:**
    * Edição de dados, Foto (ImgBB), Time (TheSportsDB).
    * [cite_start]Visualização de Estrelas (Tooltip)[cite: 72].
6.  [cite_start]**Painel Administrativo (Admin Only)[cite: 34, 142]:**
    * Gestão de Campeonatos (Rodadas Fixas).
    * Gestão de Usuários (Banir, Editar).
    * [cite_start]Logs de Atividade e Botão de "Forçar Placar"[cite: 47].
    * [cite_start]Botão de Exportar PDF[cite: 42].

---

# DIRETRIZES DE QUALIDADE (ZERO ALUCINAÇÃO)

1.  **Tecnologia:** Ao descrever as funcionalidades, especifique que o frontend deve usar **JavaScript Vanilla** (sem React/Vue) e chamadas diretas ao SDK do Firebase v9+.
2.  [cite_start]**Design System:** Mencione explicitamente onde as cores `#FD8A24` (Ação/Destaque) e `#605F54` (Base) devem ser aplicadas nos botões e fundos[cite: 6].
3.  **Integridade:** Não invente funcionalidades que não estão no PRD (ex: não adicione loja de itens, sistema de apostas, etc.). Atenha-se estritamente ao documento.
4.  **Responsividade:** Descreva como tabelas complexas (Classificação) devem se comportar no Mobile (ex: scroll horizontal).

Comece a análise agora, listando item a item com o máximo de rigor técnico.