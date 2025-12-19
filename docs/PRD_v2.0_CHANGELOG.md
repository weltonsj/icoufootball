# 📋 Changelog PRD iCouFootball v2.0

**Data:** 12 de Dezembro de 2025  
**Versão Anterior:** 1.0  
**Versão Atual:** 2.0

---

## 🆕 Novas Funcionalidades Adicionadas

### 1. Sistema de Amigos (RF9)
**Localização:** Avatar-popover → Opção "Amigos"

**Funcionalidades:**
- ✅ Buscar usuários por nome
- ✅ Enviar solicitações de amizade
- ✅ Aceitar/Recusar solicitações
- ✅ Lista de amigos com estrelas e troféu
- ✅ Ver perfil completo do amigo
- ✅ Botões: "Conversar" (abre chat) e "Excluir amigo"
- ✅ Notificações de solicitações

**Banco de Dados:**
- Nova coleção: `solicitacoesAmizade`
- Novo campo em `users`: `amigos` (array de userId)

---

### 2. Gestão por Usuário (RF10)
**Localização:** Avatar-popover → Opção "Gestão" (condicional)

**Funcionalidades:**
- ✅ Permissões granulares por usuário
- ✅ Funções liberadas individualmente pelo Admin
- ✅ Restrição: Apenas Superadmin pode excluir/inativar contas
- ✅ Modal exibe apenas funções liberadas
- ✅ Log automático de todas as ações de gestão

**Banco de Dados:**
- Novo campo em `users`: `permissoesGestao` (objeto)
- Atualização na coleção `logs`: campo `tipoUsuario`

**Permissões Disponíveis:**
- `forcarPlacar`: Forçar confirmação de placar
- `editarPartidas`: Editar informações de partidas
- `iniciarRodadas`: Iniciar/Finalizar rodadas
- `visualizarLogs`: Acessar logs do sistema
- `excluirContas`: **false** (sempre), exceto Superadmin

---

### 3. Criação de Partidas entre Amigos (RF11)
**Localização:** Sessão Partidas → Bloco "Criar Partida"

**Funcionalidades:**
- ✅ Selecionar amigo da lista (dropdown)
- ✅ Criar partida sem permissão prévia
- ✅ Seletor de plataforma de streaming (YouTube, Twitch, Kick, etc.)
- ✅ Input de URL habilitado APENAS após selecionar plataforma
- ✅ Validação de URL por plataforma (regex específico)
- ✅ Partida aparece em "Inserir Resultado"
- ✅ Se tem transmissão, aparece no bloco "Ao Vivo" da Home

**Banco de Dados:**
- Novos campos em `partidas`:
  - `plataformaStreaming` (string)
  - `dataInicio` (Timestamp)
  - `status` ('aguardando', 'em_andamento', 'finalizada')
  - `oficial` (boolean - se conta pontos)

---

### 4. Bloco "Ao Vivo" na Home (RF12)
**Localização:** Home Page pública

**Funcionalidades:**
- ✅ Exibe transmissões ativas em tempo real
- ✅ Formato: "Time A vs Time B - HH:MM"
- ✅ Badge "AO VIVO" pulsante (vermelho)
- ✅ Ícone da plataforma (YouTube, Twitch, etc.)
- ✅ Ao clicar: Modal com player embutido (iframe)
- ✅ Botão "Assistir no [Plataforma]" (abre em nova aba)
- ✅ Atualização via `onSnapshot` (tempo real)
- ✅ Fallback: "Nenhuma transmissão ao vivo no momento"

**Tecnologia:**
- Embed responsivo via iframe
- Conversão automática de URLs (ex: youtu.be → youtube.com/embed)

---

### 5. Seletor de Plataforma de Transmissão (RF11 - Complementar)
**Localização:** Sessão Partidas → Bloco "Link da Transmissão"

**Funcionalidades:**
- ✅ Dropdown com plataformas: YouTube, Twitch, Kick, Facebook Gaming
- ✅ Input de URL desabilitado até selecionar plataforma
- ✅ Validação de formato específica por plataforma
- ✅ Feedback visual: ícone verde (válido) ou vermelho (inválido)

**Plataformas Suportadas:**
```javascript
- YouTube: ^(https?://)?(www\.)?(youtube\.com|youtu\.be)/.+
- Twitch: ^(https?://)?(www\.)?twitch\.tv/.+
- Kick: ^(https?://)?(www\.)?kick\.com/.+
- Facebook Gaming: ^(https?://)?(www\.)?facebook\.com/gaming/.+
```

---

### 6. Troféu de Campeão (RF8 - Atualizado)
**Funcionalidade:**
- ✅ Jogador que venceu o último campeonato exibe ícone de troféu
- ✅ Visível na lista de amigos e no perfil do amigo

**Banco de Dados:**
- Novo campo em `users`: `ultimoCampeao` (boolean)
- Atualizado automaticamente ao finalizar campeonato

---

### 7. Notificações In-App (RF13 - Expandido)
**Funcionalidades:**
- ✅ Badge com contador de notificações não lidas
- ✅ Tipos de notificação:
  - Nova solicitação de amizade
  - Solicitação aceita
  - Placar pendente de confirmação
  - Nova partida criada por amigo
  - Mensagem de chat recebida
- ✅ Atualização em tempo real via `onSnapshot`

**Banco de Dados:**
- Nova coleção: `notificacoes`
- Campos: `userId`, `tipo`, `mensagem`, `lida`, `dataNotificacao`, `metadados`

---

## 🗄️ Estrutura de Banco de Dados Atualizada

### Novas Coleções

#### `solicitacoesAmizade`
```javascript
{
  id: "[solicitacaoId]",
  remetenteId: "userId",
  destinatarioId: "userId",
  status: "pendente" | "aceita" | "recusada",
  dataSolicitacao: Timestamp,
  dataResposta: Timestamp
}
```

#### `notificacoes`
```javascript
{
  id: "[notificacaoId]",
  userId: "userId",
  tipo: "solicitacao_amizade" | "placar_pendente" | "mensagem" | etc.,
  mensagem: "string",
  lida: boolean,
  dataNotificacao: Timestamp,
  metadados: { ... } // Dados adicionais específicos do tipo
}
```

#### `chats` e `mensagens` (já existentes, mantidos)

---

### Campos Adicionados em Coleções Existentes

#### Coleção `users`
```javascript
{
  // Campos existentes...
  timeName: "string",           // Nome do time escolhido
  timeLogo: "string",           // URL do logo do time
  lastTeamChange: Timestamp,    // Controle de 2h para alteração
  ultimoCampeao: boolean,       // Venceu o último campeonato?
  amigos: ["userId1", "userId2"], // Lista de amigos conectados
  permissoesGestao: {           // Permissões individuais de gestão
    forcarPlacar: boolean,
    editarPartidas: boolean,
    iniciarRodadas: boolean,
    visualizarLogs: boolean,
    excluirContas: false        // Sempre false, exceto superadmin
  }
}
```

#### Coleção `partidas`
```javascript
{
  // Campos existentes...
  plataformaStreaming: "youtube" | "twitch" | "kick" | "facebook",
  dataInicio: Timestamp,        // Horário de início da transmissão
  status: "aguardando" | "em_andamento" | "finalizada",
  oficial: boolean,             // Se conta pontos no campeonato
  campeonatoId: "string",       // Referência ao campeonato
  rodadaId: "string"            // Referência à rodada
}
```

#### Coleção `logs`
```javascript
{
  // Campos existentes...
  tipoUsuario: "admin" | "superadmin" | "gestao", // Tipo do responsável
  entidadeAfetada: "string"     // ID da entidade afetada
}
```

---

## 🔒 Firestore Security Rules Atualizadas

### Novas Regras

```javascript
// Solicitações de Amizade
match /solicitacoesAmizade/{solicitacaoId} {
  allow read: if request.auth != null && 
    (resource.data.remetenteId == request.auth.uid || 
     resource.data.destinatarioId == request.auth.uid);
  allow create: if request.auth != null && 
    request.resource.data.remetenteId == request.auth.uid;
  allow update: if request.auth != null && 
    resource.data.destinatarioId == request.auth.uid;
}

// Notificações
match /notificacoes/{notificacaoId} {
  allow read, write: if request.auth != null && 
    resource.data.userId == request.auth.uid;
}

// Permissões de Gestão (funções helper)
function hasGestaoPermission(permission) { ... }
function isSuperadmin() { ... }
```

---

## 🛠️ Novos Arquivos e Módulos

### Services
- `src/services/friendsService.js` - Gestão de amigos
- `src/services/notificationsService.js` - Sistema de notificações
- `src/services/gestaoService.js` - Funções de gestão
- `src/services/liveMatchesService.js` - Bloco Ao Vivo
- `src/services/streamingService.js` - Validação de streaming

### Components
- `src/components/friendsModal.js` - Modal de amigos
- `src/components/profileModal.js` - Modal de perfil do amigo
- `src/components/gestaoModal.js` - Modal de gestão
- `src/components/livePlayerModal.js` - Modal de player ao vivo
- `src/components/notificationBadge.js` - Badge de notificações

### Utils
- `src/utils/permissionsManager.js` - Cache de permissões
- `src/utils/urlValidator.js` - Validação de URLs
- `src/utils/embedConverter.js` - Conversão para embed

---

## 🎨 UI/UX Alterações

### Avatar-popover
- ➕ Nova opção: **"Amigos"** (sempre visível para usuários logados)
- ➕ Nova opção: **"Gestão"** (visível apenas para usuários com permissões)

### Sessão Partidas
- ➕ Novo bloco: **"Criar Partida"**
  - Dropdown de amigos
  - Checkbox "Adicionar transmissão"
  - Seletor de plataforma
  - Input de URL (condicional)
  - Botão "Criar Partida"

### Home Page
- ➕ Novo bloco: **"Ao Vivo"**
  - Cards de transmissões ativas
  - Badge "AO VIVO" pulsante
  - Ícone da plataforma
  - Modal com player ao clicar

### Header
- ➕ Ícone de sino com badge de notificações
- Contador de notificações não lidas

---

## ⚙️ Requisitos Não Funcionais Adicionados

| ID | Requisito | Detalhamento |
|---|---|---|
| **RNF7** | Limitação de Time | 1 alteração a cada 2 horas |
| **RNF8** | Responsividade de Modais | 320px+ (mobile-first) |
| **RNF9** | Notificações Tempo Real | < 1s de latência (onSnapshot) |
| **RNF10** | Validação de Links | Regex específico por plataforma |
| **RNF11** | Cache de Permissões | Revalidar a cada 5 minutos |
| **RNF12** | Auditoria | Todas as ações de Gestão registradas |

---

## ✅ Critérios de Aceitação

Total de **24 novos critérios de aceitação** distribuídos em:
- **CA-RF9:** Sistema de Amigos (6 critérios)
- **CA-RF10:** Gestão por Usuário (4 critérios)
- **CA-RF11:** Criação de Partidas (4 critérios)
- **CA-RF12:** Bloco Ao Vivo (4 critérios)
- **CA-RF13:** Notificações (3 critérios)

Consulte seção **7. Critérios de Aceitação** no PRD para detalhes completos.

---

## 📈 Tabela de Permissões Atualizada

Nova coluna adicionada: **"Usuário com Gestão"**

Restrições importantes:
- ❌ Usuário com Gestão **NÃO PODE** excluir/inativar contas
- ✅ Apenas **Superadmin** pode excluir/inativar contas
- ⚙️ Demais funções são **configuráveis** pelo Admin

---

## 🚀 Roadmap Futuro (Sugestões)

Novas sugestões adicionadas:
5. Ranking de Amigos
6. Partidas Amistosas (não oficiais)
7. Histórico de Confrontos
8. Exportação de Estatísticas (por jogador)

---

## 📋 Checklist de Implementação

Total de **62 tarefas** distribuídas em **7 fases**:
1. Sistema de Amigos (10 tarefas)
2. Notificações In-App (8 tarefas)
3. Gestão por Usuário (10 tarefas)
4. Criar Partida entre Amigos (10 tarefas)
5. Bloco Ao Vivo (10 tarefas)
6. Troféu de Campeão (6 tarefas)
7. Testes e Validação (10 tarefas)

---

## 🔄 Compatibilidade

✅ **Sem Breaking Changes**
- Nenhuma rota existente foi modificada
- Schema do Firestore apenas **expandido** (não alterado)
- CSS adiciona novas classes (não modifica existentes)
- JavaScript Vanilla puro (ES6 modules)

---

## 📊 Métricas de Impacto

### Novas Coleções: 2
- `solicitacoesAmizade`
- `notificacoes`

### Novos Campos em Coleções Existentes: 9
- `users`: 5 campos (`timeName`, `timeLogo`, `lastTeamChange`, `ultimoCampeao`, `amigos`, `permissoesGestao`)
- `partidas`: 4 campos (`plataformaStreaming`, `dataInicio`, `status`, `oficial`)
- `logs`: 2 campos (`tipoUsuario`, `entidadeAfetada`)

### Novos Arquivos JavaScript: 13
- 5 Services
- 5 Components
- 3 Utils

### Novos Blocos de UI: 3
- Bloco "Criar Partida" (Sessão Partidas)
- Bloco "Ao Vivo" (Home Page)
- Badge de Notificações (Header)

### Novos Modais: 4
- Modal de Amigos
- Modal de Perfil do Amigo
- Modal de Gestão
- Modal de Player Ao Vivo

---

**Documento gerado automaticamente em:** 12 de Dezembro de 2025  
**Responsável:** Desenvolvedor Fullstack Sênior  
**Status:** ✅ Completo e Pronto para Implementação
