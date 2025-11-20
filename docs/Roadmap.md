# Roadmap de Desenvolvimento iCouFootball v2.0 (Versão Final – 19 de Novembro de 2025)

**Objetivo deste documento:** Ser o único ponto de verdade para o Trae AI (ou qualquer desenvolvedor) seguir 100% à risca, sem margem para alucinações ou interpretações. Todo o código, estrutura de pastas, nomes de arquivos, classes CSS, IDs e fluxos devem respeitar exatamente o que está descrito aqui e no PRD.

**Stack obrigatória (sem exceções):**
- HTML5 + CSS3 (Vanilla) + JavaScript ES6+ (Vanilla – sem React, Vue, etc.)
- Firebase Auth + Firestore
- PWA (manifest + service worker)
- Bibliotecas permitidas apenas via CDN: Chart.js, jsPDF + html2canvas, EmailJS

**Estrutura de pastas oficial (já criada e imutável):**

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

## 1. Design System Oficial (obrigatório seguir exatamente)

### Cores (variáveis CSS em `assets/css/theme.css`)
```css
:root {
  --brand-primary: #FD8A24;     /* laranja */
  --brand-secondary: #605F54;   /* cinza oliva */
  --bg-light: #FFFFFF;
  --bg-dark: #1A1A1A;
  --text-light: #212529;
  --text-dark: #E9ECEF;
  --success: #28A745;
  --danger: #DC3545;
  --warning: #FFC107;
  --card-bg-light: #F8F9FA;
  --card-bg-dark: #2D2D2D;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-light: #1A1A1A;
    --text-light: #E9ECEF;
    --card-bg-light: #2D2D2D;
  }
}
```

### Fontes (Google Fonts – incluir no `<head>` de todas as páginas)
```html
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Montserrat:wght@600;700&display=swap" rel="stylesheet">
```
- Body: 'Roboto', sans-serif
- Títulos: 'Montserrat', sans-serif

### Espaçamentos (8px grid)
- 0.5rem = 8px
- 1rem   = 16px
- 1.5rem = 24px
- 2rem   = 32px
- 3rem   = 48px

### Classes CSS obrigatórias (em `components.css`)
```css
.btn-primary { background: var(--brand-primary); color: white; }
.btn-success { background: var(--success); }
.btn-danger  { background: var(--danger); }
.card { background: var(--card-bg-light); border-radius: 0.5rem; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.table-responsive { overflow-x: auto; }
.text-center { text-align: center; }
```

## 2. Páginas HTML – Estrutura Exata (IDs e classes obrigatórios)

### `index.html` (shell único)
- Verifica Firebase Auth → redireciona para login.html ou dashboard.html

### `pages/login.html`
IDs obrigatórios: `#login-form`, `#email`, `#password`, `#btn-login`, `#error-message`

### `pages/dashboard.html`
- Seções com IDs:
  - `#pending-matches-alert`
  - `#kpi-cards`
  - `#recent-matches`
  - `#standings-preview`
  - `#chart-points-evolution` (Chart.js canvas)

### `pages/matches.html`
- Formulário: `#match-form`
- Inputs: `#home-score`, `#away-score`, `#btn-submit-match`
- Lista de pendentes: `#pending-list` (com botões `data-match-id` e ações "Confirmar" / "Contestar")

### `pages/standings.html`
- Tabela: `<table id="standings-table">` com thead fixo:
  - Pos | Time | PJ | V | E | D | GP | GC | SG | Pts
- Botão: `#btn-export-pdf`

### `pages/admin.html` (visível só para role === 'admin')
- Seções: Iniciar/Encerrar Campeonato, Gerenciar Usuários, Forçar Placar

### `pages/history.html`
- Lista de campeonatos arquivados da coleção `history`

## 3. Roadmap de Implementação – Fases Obrigatórias (sem pular nenhuma)

### Fase 1 – Setup & Auth (100% funcional antes de seguir)
- [ ] Criar projeto Firebase (Auth + Firestore)
- [ ] Copiar exatamente `config/firebase-config.js` e `config/firestore.rules` (regras do PRD)
- [ ] Implementar `assets/js/firebase.js` + `auth.js`
- [ ] `index.html` com listener de authStateChanged
- [ ] `login.html` completo com login, registro e recuperação de senha
- [ ] Redirecionamento correto

### Fase 2 – Perfil & Upload de Imagens
- [ ] Edição de perfil (foto + time) → usar ImgBB API (chave no `api.js`)
- [ ] Busca de escudos via TheSportsDB (função em `api.js`)

### Fase 3 – Core: Partidas + Validação Dupla (Fair Play)
- [ ] `matches.js`: criar partida → status "pending"
- [ ] Listener em tempo real no dashboard mostrando pendências
- [ ] Botões "Confirmar" (muda para "confirmed") e "Contestar" (notifica admin via EmailJS)
- [ ] Admin pode forçar confirmação (bypass)

### Fase 4 – Tabela de Classificação Dinâmica
- [ ] `standings.js`: função `calculateStandings()` com ordem exata do PRD:
  1. Pontos → 2. Vitórias → 3. Saldo de Gols → 4. Gols Pró → 5. Confronto Direto (implementar função `headToHeadPoints(playerA, playerB)`)
- [ ] Atualização em tempo real via Firestore listener

### Fase 5 – Estatísticas + Chat
- [ ] `stats.js` + Chart.js (gráfico de evolução de pontos)
- [ ] `chat.js` com listener Firestore coleção `chat`

### Fase 6 – Admin + Export + Notificações
- [ ] Painel admin completo
- [ ] `export.js` → jsPDF + html2canvas para PDF da tabela
- [ ] `notifications.js` → EmailJS ao iniciar nova rodada

### Fase 7 – PWA + Finalizações
- [ ] `manifest.json` (nome "iCouFootball", ícones 192x192 e 512x512 em `/assets/images/icons/`)
- [ ] `service-worker.js` com cache de todas as páginas e assets
- [ ] Testar instalação PWA em Android/Chrome

### Fase 8 – Deploy
- [ ] Firebase Hosting (`firebase deploy`)

## 4. Regras Firestore (copiar exatamente para `config/firestore.rules`)
```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Usuários
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Partidas ativas
    match /matches/{matchId} {
      allow read: if request.auth != null;
      allow create: if request.auth.uid in [resource.data.homePlayerId, resource.data.awayPlayerId];
      allow update: if (request.auth.uid in [resource.data.homePlayerId, resource.data.awayPlayerId] 
                     && request.resource.data.status == 'confirmed')
                     || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Chat
    match /chat/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }

    // History (somente leitura + admin delete)
    match /history/{seasonId} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

**Este documento + PRD.md são a única fonte de verdade.**  
Qualquer dúvida: pare e pergunte antes de inventar algo novo.