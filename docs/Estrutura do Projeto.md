# Estrutura Organizacional do Projeto iCouFootball

Este documento descreve a organização de pastas e arquivos do iCouFootball, considerando as restrições técnicas: HTML, CSS e JavaScript puro no frontend e Firebase (Firestore/Auth) no backend, com suporte PWA.

## Visão Geral da Estrutura

```
icoufootball/
├─ index.html
├─ pages/
│  ├─ login.html
│  ├─ dashboard.html
│  ├─ admin.html
│  ├─ history.html
│  ├─ matches.html
│  └─ standings.html
├─ assets/
│  ├─ css/
│  │  ├─ main.css
│  │  ├─ theme.css
│  │  ├─ layout.css
│  │  └─ components.css
│  ├─ js/
│  │  ├─ app.js
│  │  ├─ auth.js
│  │  ├─ firebase.js
│  │  ├─ matches.js
│  │  ├─ standings.js
│  │  ├─ stats.js
│  │  ├─ chat.js
│  │  ├─ notifications.js
│  │  ├─ export.js
│  │  ├─ api.js
│  │  ├─ admin.js
│  │  └─ pwa.js
│  └─ images/
│     ├─ teams/
│     └─ icons/
├─ config/
│  ├─ manifest.json
│  ├─ service-worker.js
│  ├─ firebase-config.js
│  ├─ firestore.rules
│  └─ emailjs-config.js
├─ docs/
│  ├─ PRD.md
│  └─ Fluxograma do Sistema (Mermaid).md
├─ .gitignore
└─ README.md
```

## Diretórios e Responsabilidades

- `index.html`
  - Página raiz; pode servir como shell/base para redirecionar fluxo conforme estado de autenticação.

- `pages/`
  - Páginas HTML desacopladas por fluxo de uso.
  - `login.html`: autenticação (Firebase Auth).
  - `dashboard.html`: visão geral com notificações, últimos resultados e KPIs.
  - `admin.html`: recursos administrativos (iniciar/encerrar campeonato, moderar placares, usuários).
  - `history.html`: acesso ao histórico (coleção `history`).
  - `matches.html`: inserção e confirmação de placares (`status: pending/confirmed/contested`).
  - `standings.html`: tabela de classificação dinâmica com critérios de desempate.

- `assets/`
  - Conteúdo estático do frontend.
  - `assets/css/`
    - `main.css`: estilos base e utilitários globais.
    - `theme.css`: variáveis de tema (cores brand, modo escuro/claro).
    - `layout.css`: grid/flex e responsividade (mobile-first).
    - `components.css`: componentes reutilizáveis (botões, cards, tabelas).
  - `assets/js/`
    - `app.js`: bootstrap da aplicação; inicialização generalista.
    - `auth.js`: login/logout, listener de sessão (Firebase Auth).
    - `firebase.js`: inicialização do SDK Firebase e helpers comuns.
    - `matches.js`: CRUD de partidas, validação dupla e notificações.
    - `standings.js`: cálculo e ordenação da tabela com critérios do PRD.
    - `stats.js`: KPIs e integração com Chart.js.
    - `chat.js`: chat em tempo real via Firestore listeners.
    - `notifications.js`: integrações com EmailJS e alertas.
    - `export.js`: geração de PDF (jspdf) e exportações.
    - `api.js`: serviços para dados externos (logos de times).
    - `admin.js`: ações e painéis específicos para administradores.
    - `pwa.js`: registro do Service Worker e lógica de PWA.
  - `assets/images/`
    - `teams/`: escudos dos times obtidos de APIs externas.
    - `icons/`: ícones, favicons e imagens do PWA.

- `config/`
  - Arquivos de configuração e infraestrutura do app.
  - `manifest.json`: metadados do PWA (nome, ícones, cores).
  - `service-worker.js`: cache de assets estáticos e estratégias offline.
  - `firebase-config.js`: credenciais e inicialização client-side do Firebase.
  - `firestore.rules`: regras de segurança do Firestore.
  - `emailjs-config.js`: chaves e inicialização do EmailJS.

- `docs/`
  - Documentação do projeto.
  - `PRD.md`: requisitos funcionais e não-funcionais.
  - `Fluxograma do Sistema (Mermaid).md`: visualização de fluxos.

## Convenções de Organização

- CSS
  - Separação clara entre base (`main.css`), tema (`theme.css`), layout (`layout.css`) e componentes (`components.css`).
  - Importar na ordem: base → tema → layout → componentes.

- JS
  - Módulos por responsabilidade; evitar arquivos monolíticos.
  - Dependências externas por CDN conforme PRD (Chart.js, jspdf, EmailJS).
  - Evitar variáveis globais; usar IIFE ou namespaces simples quando necessário.

- Imagens
  - `teams/` para escudos e logos de clubes.
  - `icons/` para ícones do app/PWA e favicons.

- Configurações
  - `manifest.json` e `service-worker.js` para PWA.
  - `firebase-config.js` com chaves públicas do Firebase (client-side).
  - `firestore.rules` acompanha as regras de integridade e permissões do PRD.

## Links e Referências

- PRD: `docs/PRD.md`
- Regras Firestore: `config/firestore.rules`
- Páginas principais: `pages/` (login, dashboard, admin, history, matches, standings)