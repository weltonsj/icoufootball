# ✅ Guia de Validação e Testes - Regressão Dashboard

**Objetivo:** Validar que os blocos **CLASSIFICAÇÃO GERAL**, **ESTATÍSTICAS AVANÇADAS** e **ÚLTIMAS PARTIDAS** funcionam simultaneamente sem conflitos.

---

## 🧪 Testes Manuais (Local)

### Teste 1: Validação de Carregamento da Home Page

**Passos:**
1. Abrir browser (DevTools F12 aberto)
2. Navegar para **Home Page** (raiz `/`)
3. Aguardar carregamento completo
4. Verificar **Console** para logs `[main]`

**Validações:**
```
✅ [main] 📊 Listener anual disparado: renderizando tabela e estatísticas
✅ [main] 🏆 Renderizando tabela (standings-body) com X jogadores
✅ [main] ✅ Tabela renderizada com sucesso (standings-body): X linhas
✅ [main] ✅ Classificação e estatísticas renderizadas com sucesso
✅ [main] ✅ Campeão anterior carregado: [NOME]
✅ [main] ✅ Melhor ataque: [NOME] (X GP)
✅ [main] ✅ Melhor defesa: [NOME] (X GC)
✅ [main] ✅ Maior goleada: [NOME] X X [NOME]
✅ [main] 📜 Últimas partidas atualizadas: X
✅ [main] ✅ Últimas partidas renderizadas com sucesso
✅ [main] 📡 Listener de últimas partidas iniciado
```

**Resultado Esperado:**
- ❌ Nenhuma mensagem de erro `❌ Erro ao renderizar...`
- ✅ Todos os 3 blocos visíveis com dados preenchidos
- ✅ Tabela com pelo menos 1 jogador
- ✅ Estatísticas com valores ou "-"
- ✅ Últimas partidas carregam (vazio ou com dados)

---

### Teste 2: Validação de Blocos Individuais

#### 2.1: CLASSIFICAÇÃO GERAL

**Localização:** Home Page → Seção "CLASSIFICAÇÃO GERAL"

**Validações:**
- [ ] Tabela visível com cabeçalho (#, Time, Jogador, Pts, PJ, V, E, D, GM, GC, SG)
- [ ] Pelo menos 1 linha de jogador
- [ ] Dados numéricos válidos (Pts > 0, PJ ≥ 0, etc)
- [ ] Se houver > 10 jogadores, scroll ativado
- [ ] Console mostra `✅ Tabela renderizada com sucesso (standings-body): X linhas`

#### 2.2: ESTATÍSTICAS AVANÇADAS

**Localização:** Home Page → Seção "ESTATÍSTICAS AVANÇADAS"

**Validações:**
- [ ] Card "CAMPEÃO ANTERIOR" visível
- [ ] Card "MELHOR ATAQUE" visível com formato: `[NOME] (X GP)`
- [ ] Card "MELHOR DEFESA" visível com formato: `[NOME] (X GC)`
- [ ] Card "MAIOR GOLEADA" visível com formato: `[NOME] X X [NOME]`
- [ ] Se sem dados: mostrar "-"
- [ ] Console mostra:
  - `✅ Campeão anterior carregado: [NOME]`
  - `✅ Melhor ataque: ...`
  - `✅ Melhor defesa: ...`
  - `✅ Maior goleada: ...`

#### 2.3: ÚLTIMAS PARTIDAS

**Localização:** Home Page → Seção "ÚLTIMAS PARTIDAS"

**Validações:**
- [ ] Seção visível
- [ ] Se houver partidas confirmadas:
  - [ ] Card de partida exibido (Time A vs Time B com placar)
  - [ ] Máximo 4 partidas mostradas
  - [ ] Formato: `[TIME_LOGO] [TIME_NOME] / [JOGADOR_NOME]` `Placar` `[JOGADOR_NOME] / [TIME_NOME] [TIME_LOGO]`
  - [ ] Console mostra `✅ Últimas partidas renderizadas com sucesso`
- [ ] Se NÃO houver partidas:
  - [ ] Mensagem: "Nenhuma partida finalizada ainda..."
  - [ ] Console mostra `ℹ️ Nenhuma partida finalizada encontrada`

---

### Teste 3: Validação de Não-Interferência

**Objetivo:** Garantir que blocos não se interferem mutuamente

**Passos:**
1. Abrir Home Page
2. Aguardar carregamento completo
3. Abrir DevTools → Console
4. **Procurar por erros ou avisos anormais**
5. Validar ordem de logs no console

**Resultado Esperado - Sequência Correta:**
```
1. [main] 📊 Listener anual disparado...
2. [main] 🏆 Renderizando tabela (standings-body)...
3. [main] ✅ Tabela renderizada...
4. [main] ✅ Campeão anterior carregado...
5. [main] ✅ Melhor ataque...
6. [main] ✅ Melhor defesa...
7. [main] ✅ Maior goleada...
8. [main] ✅ Classificação e estatísticas renderizadas...
9. [main] 📜 Últimas partidas atualizadas...
10. [main] ✅ Últimas partidas renderizadas...
11. [main] 📡 Listener de últimas partidas iniciado
```

**❌ Resultado Inválido:**
- Erros de tipo `[main] ❌ Erro ao renderizar...`
- Logs fora de sequência
- Um bloco renderizando dados vazio enquanto outros têm dados

---

### Teste 4: Recarregamento Dinâmico

**Objetivo:** Validar que listeners continuam atualizando dados

**Passos:**
1. Home Page carregada
2. Abrir outro navegador/aba → Insira um novo placar (em Partidas)
3. Volta para Home Page
4. Observar console

**Resultado Esperado:**
- [ ] Console mostra novo listener trigger
- [ ] ÚLTIMAS PARTIDAS atualiza automaticamente (< 1 segundo)
- [ ] CLASSIFICAÇÃO GERAL não é afetada
- [ ] Sem erros

---

### Teste 5: Dashboard Pessoal (Regressão)

**Localização:** Dashboard Pessoal (usuário logado)

**Validações:**
- [ ] Bloco KPI - DESEMPENHO carrega (Vitórias, Empates, Derrotas, Média de Gols)
- [ ] Bloco SUA POSIÇÃO NO RANKING carrega
- [ ] Bloco CAMPEONATO ATIVO carrega
- [ ] Bloco AMIGOS carrega
- [ ] Bloco PARTIDAS PENDENTES carrega
- [ ] Bloco ÚLTIMAS PARTIDAS carrega
- [ ] **Nenhuma interferência entre blocos**

**Console esperado no Dashboard:**
```
[Dashboard] 📥 Iniciando carregamento de dados...
[Dashboard] Chamando renderUserProfile...
[Dashboard] 📊 Calculando estatísticas dinamicamente...
[Dashboard] 🎯 Renderizando KPIs
[Dashboard] ✅ KPI Vitórias: X
[Dashboard] ✅ KPI Empates: X
[Dashboard] ✅ KPI Derrotas: X
```

---

## 🔧 Testes no Firestore (Validação de Dados)

### Verificar Dados de Partidas

**Firestore Console:**
1. Abrir Firebase Console → Firestore → `partidas`
2. Selecionar **qualquer documento** com `placarStatus: 'confirmado'`
3. Validar campos:
   - [ ] `criadoEm` preenchido com Timestamp
   - [ ] `placarStatus` = `'confirmado'`
   - [ ] `placarA` e `placarB` são números válidos
   - [ ] `dataPartida` ou `criadoEm` preenchido

**Exemplo de documento válido:**
```json
{
  "placarStatus": "confirmado",
  "criadoEm": Timestamp(2025-01-03 14:30:00),
  "dataPartida": Timestamp(2025-01-03 14:00:00),
  "placarA": 3,
  "placarB": 1,
  "jogadorAId": "user123",
  "jogadorBId": "user456",
  ...
}
```

### Validar Índice Firestore

**Firestore Console → Índices:**
1. Procurar por índice: `partidas` (collectionGroup)
2. Validar campos:
   - [ ] `placarStatus` (ASCENDING)
   - [ ] `criadoEm` (DESCENDING) ✅ **NOVO - não era dataFim**

---

## 📱 Testes de Responsividade

### Mobile (320px)
- [ ] CLASSIFICAÇÃO GERAL tabela scrollável horizontalmente
- [ ] ESTATÍSTICAS AVANÇADAS cards empilhados
- [ ] ÚLTIMAS PARTIDAS cards visíveis

### Tablet (768px)
- [ ] Todos os blocos visíveis e legíveis
- [ ] Sem overflow anormal

### Desktop (1920px)
- [ ] Layout spread conforme esperado
- [ ] Scroll em CLASSIFICAÇÃO GERAL apenas se > 10 jogadores

---

## 🐛 Troubleshooting

### Problema: "CLASSIFICAÇÃO GERAL vazia"

**Diagnóstico:**
1. Console mostra `🏆 Renderizando tabela...` ?
   - SIM → Problema em dados ou renderização
   - NÃO → Problema em subscribeToAnnualStandings

2. Firestore tem partidas com `placarStatus: 'confirmado'`?
   - NÃO → Criar dados de teste ou inserir placar
   - SIM → Problema em query

3. Console mostra erro `placarStatus where placarStatus`?
   - SIM → Índice Firestore não deployado. Execute:
     ```bash
     firebase deploy --only firestore:indexes
     ```

---

### Problema: "ÚLTIMAS PARTIDAS vazia apesar de ter partidas confirmadas"

**Diagnóstico:**
1. Console mostra `📜 Últimas partidas atualizadas: 0`?
   - SIM → Query retorna 0 documentos

2. Verificar Firestore:
   - Tem partidas com `placarStatus: 'confirmado'`?
   - Tem campo `criadoEm` preenchido?
   - Se não, problema foi em v1 (antes da correção)

3. Índice criado?
   ```bash
   firebase deploy --only firestore:indexes
   ```

---

### Problema: "ESTATÍSTICAS AVANÇADAS com valores errados"

**Diagnóstico:**
1. Console mostra `✅ Melhor ataque: ...`?
   - SIM → Dados retornados, mas cálculo pode estar errado

2. Verificar função `computeStats` em `src/utils/ranking.js`
   - Validar lógica de cálculo de bestAttack, bestDefense, biggestWin

---

## ✅ Checklist Final

Marque cada item após validação:

### Setup
- [ ] Código corrigido deployed
- [ ] Índices Firestore deployados
- [ ] Nenhum erro no build

### Validação Home Page
- [ ] CLASSIFICAÇÃO GERAL carrega com dados
- [ ] ESTATÍSTICAS AVANÇADAS carrega com dados
- [ ] ÚLTIMAS PARTIDAS carrega (vazio ou com dados)
- [ ] Console mostra apenas logs `[main] ✅` (sem `❌`)
- [ ] Sem race conditions visíveis

### Validação Dashboard
- [ ] KPIs carregam
- [ ] Ranking carrega
- [ ] Partidas carregam
- [ ] Sem interferência entre blocos

### Validação Responsividade
- [ ] Mobile: 320px funciona
- [ ] Tablet: 768px funciona
- [ ] Desktop: 1920px funciona

### Validação Performance
- [ ] Home Page carrega em < 2 segundos
- [ ] Dashboard carrega em < 2 segundos
- [ ] Sem memory leaks (DevTools → Performance)

---

**Documento:** Guia de Validação  
**Data:** 3 de Janeiro de 2026  
**Versão:** 1.0
