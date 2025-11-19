# ⚽ iCouFootball

![Status do Projeto](https://img.shields.io/badge/Status-Em_Desenvolvimento-orange)
![License](https://img.shields.io/badge/License-MIT-blue)
![Tech](https://img.shields.io/badge/Stack-HTML_CSS_JS_Firebase-yellow)

**iCouFootball** é um sistema web (SPA & PWA) desenvolvido para gerenciar campeonatos de pontos corridos do jogo **EA Sports FC 25**. O foco do projeto é oferecer uma plataforma leve, sem frameworks pesados, com atualizações em tempo real e ferramentas robustas de estatísticas.

---

## 🎨 Identidade Visual & Design

O design system foi construído com foco em alto contraste e identidade esportiva.

| Cor | Hex | Uso Principal |
| :--- | :--- | :--- |
| 🟠 **Laranja Vibrante** | `#FD8A24` | Botões, Destaques, Acentos |
| 🟤 **Cinza Oliva** | `#605F54` | Elementos Secundários, Bordas |
| ⚫ **Dark Mode** | `#1a1a1a` | Fundo da Aplicação |

---

## 🚀 Funcionalidades Principais

### 👤 Gestão de Usuários
* **Níveis de Acesso:** Administrador e Usuário Comum.
* **Perfil:** Personalização de foto e escolha de time (via API externa).
* **Segurança:** Autenticação via Firebase Auth.

### 🏆 Campeonato & Tabela
* **Tabela Dinâmica:** Ordenação automática (Pontos > Vitórias > Saldo > Gols Pró).
* **Fair Play:** Sistema de **Validação de Placar** (O oponente precisa confirmar o resultado inserido).
* **Histórico:** Arquivamento de campeonatos passados com limpeza automática após 1 ano.

### 📊 Dashboard & Estatísticas
* Gráficos de evolução de desempenho (`Chart.js`).
* Cards de destaque: Melhor Ataque, Melhor Defesa, Aproveitamento.
* Exportação da tabela final em **PDF**.

### ⚙️ Ferramentas
* **Chat Global:** Comunicação em tempo real entre participantes da liga.
* **Notificações:** E-mail automático ao iniciar rodadas (`EmailJS`).
* **PWA:** Instalável em dispositivos móveis (Android/iOS).

---

## 🛠️ Stack Tecnológica

Este projeto segue uma filosofia **"Vanilla"** (Puro), sem dependência de frameworks Frontend (React/Vue/Angular).

* **Frontend:**
  * HTML5 Semântico
  * CSS3 (Grid & Flexbox, Variáveis CSS)
  * JavaScript (ES6+, Módulos)
* **Backend (BaaS):**
  * Google Firebase Firestore (Banco de Dados NoSQL)
  * Google Firebase Authentication
* **APIs & Integrações:**
  * **TheSportsDB / API-Football:** Logos e bandeiras dos times.
  * **ImgBB / Cloudinary:** Hospedagem de imagens de perfil.
  * **EmailJS:** Disparo de e-mails transacionais.
  * **jsPDF:** Geração de relatórios PDF.
  * **Chart.js:** Visualização de dados.

---

## 📂 Estrutura do Projeto

```text
iCouFootball/
│
├── index.html          # Entrada principal (SPA)
├── manifest.json       # Configuração PWA
├── serviceWorker.js    # Cache e funcionamento Offline
│
├── css/
│   ├── style.css       # Estilos globais e reset
│   ├── components.css  # Estilos de botões, cards e tabelas
│   └── dark-mode.css   # Variáveis de tema
│
├── js/
│   ├── app.js          # Lógica principal e roteamento
│   ├── firebase-config.js # Configuração do Firebase (Ignorado no Git)
│   ├── auth.js         # Lógica de Login/Logout
│   ├── db.js           # Funções CRUD do Firestore
│   └── utils.js        # Formatadores e auxiliares
│
└── assets/             # Imagens estáticas e ícones
    ├── icons/          # Ícones do PWA
    └── images/         # Logos, banners e perfis