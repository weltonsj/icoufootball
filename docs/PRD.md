# PRD - iCouFootball: Sistema de Gestão de Campeonatos FC25

| Metadado | Detalhe |
| :--- | :--- |
| **Produto** | iCouFootball |
| **Versão** | 2.0 (Final) |
| **Data** | 19 de Novembro de 2025 |
| **Stack** | HTML5, CSS3, Vanilla JS, Firebase (Firestore/Auth) |

---

## 1. Visão Geral
O **iCouFootball** é uma Web Application (com capacidades PWA) para gerenciar ligas de "pontos corridos" do jogo EA Sports FC 25. O sistema foca em **integridade de dados** (validação de placares), **estatísticas detalhadas** e **interação social** entre os jogadores.

### Objetivos Chave
1. Automatizar a tabela de classificação com atualização em tempo real.
2. Garantir Fair Play através de um sistema de validação dupla de placares.
3. Oferecer uma experiência instalável (PWA) com design responsivo e modo escuro.

---

## 2. Especificações Técnicas

### 2.1. Stack Tecnológica
* **Frontend:** HTML5, CSS3 (Grid/Flexbox), JavaScript ES6+ (Sem Frameworks).
* **Backend (BaaS):** Firebase Firestore (NoSQL) e Firebase Authentication.
* **Recursos PWA:** `manifest.json` para instalação e `serviceWorker.js` para cache de assets estáticos.
* **Imagens:** Upload via API (ImgBB/Cloudinary) com validação de tamanho (<2MB) e tipo (.jpg/.png).
* **Dados Externos:** API Gratuita (TheSportsDB ou API-Football) para buscar escudos dos times.
* **Bibliotecas Auxiliares (CDN):** `Chart.js` (Gráficos), `jspdf` (Exportação), `EmailJS` (Notificações).

### 2.2. Design System & UI
* **Cores:**
  * Primária (Brand): `#FD8A24` (Laranja)
  * Secundária (Base): `#605F54` (Cinza Oliva)
  * Background Dark: `#1a1a1a`
* **Layout:** Mobile-first, responsivo.

---

## 3. Perfis de Usuário e Permissões

### 3.1. Usuário Comum (Jogador)
* **Acesso:** Login/Senha, Recuperação de conta.
* **Perfil:** Editar foto e time.
* **Jogos:**
  * Inserir placar de partida (status inicial: *Pendente*).
  * **Ação Crítica:** Confirmar placar inserido pelo adversário (necessário para validar os pontos).
* **Social:** Chat global, visualizar estatísticas.

### 3.2. Administrador (Dono da Liga)
* **Permissões Totais:** Todas do Usuário +
* **Gestão de Liga:** Iniciar/Encerrar campeonato, Iniciar rodada.
* **Moderação:** Editar/Remover qualquer placar (bypass na validação), Forçar confirmação de placar.
* **Usuários:** Ativar/Inativar contas, Promover a Admin, Banir.
* **Histórico:** Acesso e exclusão de campeonatos arquivados.

---

## 4. Funcionalidades Principais

### 4.1. Sistema de Partidas e Validação (Fair Play)
Para evitar fraudes, o fluxo de inserção de placar segue a regra:
1. **Input:** Jogador A insere: "Eu (Real Madrid) 3 x 1 Adversário (Barcelona)".
2. **Estado:** O jogo entra no banco como `status: "pending"`.
3. **Notificação:** Jogador B vê um alerta no dashboard: "Confirma o resultado 1x3 contra Jogador A?".
4. **Confirmação:**
   * Se Jogador B clicar em **"Sim"**: O status muda para `confirmed` e a tabela atualiza.
   * Se Jogador B clicar em **"Contestar"**: O Admin é notificado para resolver.

### 4.2. Tabela de Classificação Dinâmica
A tabela deve ser reordenada automaticamente sempre que um jogo mudar para `status: "confirmed"`.
**Critérios de Desempate (Ordem Estrita):**
1. Pontos (Vitória=3, Empate=1, Derrota=0).
2. Número de Vitórias.
3. Saldo de Gols.
4. Gols Pró (Ataque).
5. **Confronto Direto** (Pontos somados apenas nos jogos entre os empatados).

### 4.3. Dashboard de Estatísticas
* **Gráficos (Chart.js):** Evolução de pontos nas últimas 5 rodadas.
* **KPIs:** Melhor Ataque, Melhor Defesa, Pior Defesa, Artilharia (se houver input de jogadores).

### 4.4. Chat Interno
* Chat em tempo real (Firestore Listener).
* Recursos: Nome, Timestamp, Texto.

### 4.5. Ciclo de Vida e Histórico
* **Encerramento:** Ao finalizar campeonato, os dados são movidos para a coleção `history`.
* **Retenção (Garbage Collection):** O sistema deve verificar no load: `SE (data_hoje - data_fim_campeonato) > 365 dias ENTÃO deletar_registro`.

### 4.6. Exportação e Notificações
* **PDF:** Botão para gerar PDF da tabela final.
* **E-mail:** Disparo via EmailJS para todos os usuários ativos quando o Admin inicia uma nova rodada.

---

## 5. Requisitos Não-Funcionais e Segurança

### 5.1. Segurança (Firestore Rules)
* **Integridade:**
  * `allow create`: Apenas se o usuário for um dos participantes da partida.
  * `allow update`: Apenas para mudar `status` de 'pending' para 'confirmed' (pelo adversário) ou edição total (pelo Admin).
* **Validação de Dados:** Impedir inserção de placares negativos ou textos onde deveriam ser números.

### 5.2. Performance
* Utilizar Vanilla JS para manipulação do DOM (sem peso de frameworks).
* Carregamento preguiçoso (Lazy Load) das imagens de perfil e logos.

---

## 6. Modelo de Dados (Schema Sugerido)

```json
// Collection: users
{
  "uid": "string",
  "username": "string",
  "role": "admin | user",
  "teamId": "string (API ID)",
  "teamLogo": "string (URL)",
  "active": boolean
}

// Collection: matches (Campeonato Ativo)
{
  "id": "string",
  "homePlayerId": "string",
  "awayPlayerId": "string",
  "homeScore": number,
  "awayScore": number,
  "round": number,
  "status": "pending | confirmed | contested",
  "date": timestamp
}

// Collection: history
{
  "seasonId": "string",
  "data": json_object_full_table,
  "finishedAt": timestamp
}