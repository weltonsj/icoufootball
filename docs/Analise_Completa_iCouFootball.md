# Análise Completa — iCouFootball

Data: 20/11/2025  
PRD: `docs/PRD_iCouFootball.md`  
Regras do Projeto: `.trae/rules/project_rules.md`

## Sumário Executivo

O projeto está com a infraestrutura e a estrutura de pastas prontas (PWA básico, inicialização do Firebase v9 modular, páginas e assets), mas carece de implementação das funcionalidades de domínio descritas no PRD (tabela em tempo real, autenticação completa, partidas com validação dupla, critérios de desempate, estatísticas, chat, notificações e exportação). Também há ajustes necessários na camada de UI/CSS para aderência a `theme.css` e na função do `index.html` como shell da aplicação.

Status geral: Infraestrutura OK; Funcionalidades de domínio — não implementadas/incipientes.

## Conformidade com Regras do Projeto

- Tecnologias proibidas: em conformidade (não há React/Vue/Angular/Svelte/jQuery; sem Bootstrap/Tailwind/SASS; sem TypeScript).
- Firebase v9 modular: em conformidade. Inicialização e módulos via CDN moderna:
  - `assets/js/firebase.js:1` (imports modulares)
  - `assets/js/firebase.js:7` (initializeApp/getApps/getApp)
- Uso de `fetch` para APIs externas: parcial. Funções com `fetch` existem, mas o módulo está quebrado (ver Problemas):
  - `assets/js/api.js:31` (ImgBB upload)
  - `assets/js/api.js:62` (TheSportsDB)
- Estrutura de arquivos: próxima do planejado em `docs/Estrutura do Projeto.md`. Páginas e módulos JS estão presentes, porém majoritariamente vazios.
- Estilo visual: parcialmente conforme. Paleta base respeitada, porém variáveis de `theme.css` não são utilizadas/operacionalizadas nos demais CSS, e `index.html` não importa `theme.css`.
- `index.html` deveria ser shell: parcialmente conforme. Hoje contém tabela de classificação em vez de apenas estrutura base.

## Infraestrutura e Inicialização

- PWA:
  - Registro do Service Worker: `assets/js/pwa.js:3`
  - Cache básico de páginas e CSS: `config/service-worker.js:1`
  - `manifest.json` configurado: `config/manifest.json:1`
- Firebase:
  - Inicialização modular v9: `assets/js/firebase.js:1-10`
  - Configuração cliente presente: `config/firebase-config.js:3` (chaves públicas do Firebase em cliente; manter sem logs sensíveis)
- Bootstrap de app:
  - `assets/js/app.js:1-2` importa `pwa.js` e `firebase.js`

## UI/UX e CSS

- `index.html` com tabela pública de classificação (shell + conteúdo misturados): `index.html:20-38`
- Login UI completa com toggle de registro: `pages/login.html:1-55`, `assets/js/auth.js:1-33`
- Variáveis de tema centralizadas em `assets/css/theme.css:1-44`, porém:
  - Não importadas em `index.html:7-9`
  - `main.css`/`components.css` usam variáveis próprias (`--primary-color`, `--text-color`, etc.) divergentes de `theme.css`
- `assets/css/layout.css:1` vazio (responsividade e grid/flex avançado pendentes)

## Aderência ao PRD — Funcionais (RF)

- RF1 Home Pública em tempo real
  - UI de tabela presente: `index.html:34-36`
  - Falta integração Firestore com `onSnapshot` e cálculo/ordenação: ausência geral (`onSnapshot` não encontrado)
- RF2 Autenticação e Perfis
  - UI de login/registro e controle de formulário: `assets/js/auth.js:15-33`
  - Autenticação Firebase não implementada (placeholders): `assets/js/auth.js:46`, `assets/js/auth.js:64`
  - Perfis e tipo de usuário (Admin/Jogador): não implementados
  - Recuperação de senha: não implementada
- RF3 Usuários e Permissões
  - Fluxos de inserção/remover/forçar placar com papéis: não implementados
- RF4 Campeonatos e Rodadas
  - Sistema de pontos corridos e rodadas fixas: não implementados
  - Arquivamento 12 meses: não implementado
  - Exportação PDF: não implementada (nenhum `jspdf`)
- RF5 Inserção e Validação de Placar (Fair Play)
  - Fluxo pendente→confirmação→forçar: não implementado
  - Notificação ao adversário: não implementada
- RF6 Critério de Desempate (Confronto Direto)
  - Ordenação por P, V, SG, GP, GC e confronto direto: não implementada
- RF7 Estatísticas e Visualização
  - Dashboard pessoal e KPIs: não implementados (`pages/dashboard.html:1-9`, `assets/js/stats.js:1`)
- RF8 Perfis de Jogadores
  - Gestão de perfil/visibilidade/estrelas: não implementados
- RF9 Comunicação e Logs
  - Chat interno: não implementado (`assets/js/chat.js:1`)
  - Notificações por e-mail: não implementadas (não há `emailjs-config.js`)
  - Log de atividades (Admin): não implementado

## Aderência ao PRD — Não Funcionais (RNF)

- RNF1 Performance com `onSnapshot` (<2s): não aplicável ainda (ausente)
- RNF2 Escalabilidade Firestore: schema planejado no PRD, porém sem coleções/regras implementadas; `config/firestore.rules:1` está vazio
- RNF3 Disponibilidade e placeholders: sem lógica de fallback para imagens de perfil
- RNF4 Limitação de upload (2MB): implementado em `assets/js/api.js:22-25`
- RNF5 Link de transmissão: campo e persistência não implementados
- RNF6 Segurança (painel restrito): guarda de sessão e regras não configuradas

## Problemas Detectados

- `assets/js/api.js` quebrado:
  - Import inválido para config: `assets/js/api.js:1` (caminho não existe)
  - Reatribuição circular de `API_CONFIG`: `assets/js/api.js:9-12`
- Regras do Firestore vazias: `config/firestore.rules:1`
- CSS não padronizado com `theme.css`:
  - Divergência de variáveis entre `main.css:1`, `components.css:1` e `theme.css:1`
  - Falta import de `theme.css` em `index.html:7-9`
- `index.html` não atua como shell (contém conteúdo de tabela): `index.html:20-38`
- Módulos de domínio vazios: `assets/js/standings.js:1`, `assets/js/matches.js:1`, `assets/js/admin.js:1`, `assets/js/stats.js:1`, `assets/js/chat.js:1`, `assets/js/notifications.js:1`, `assets/js/export.js:1`
- Autenticação não implementada (somente UI/handlers): `assets/js/auth.js:46`, `assets/js/auth.js:64`

## Prioridades de Implementação

1. Padronizar CSS com `theme.css` e importar nas páginas principais (index/login/standings).  
2. Transformar `index.html` em shell (header/nav/main) e mover a tabela para `pages/standings.html`.  
3. Implementar `assets/js/standings.js` com `onSnapshot` do Firestore, cálculo e ordenação por critérios do PRD.  
4. Corrigir `assets/js/api.js` (criar `config/api-config.js` ou parametrização; remover reatribuição circular).  
5. Implementar Autenticação Firebase: login, registro, recuperação de senha e `onAuthStateChanged` com base em `assets/js/auth.js`.  
6. Configurar `config/firestore.rules` alinhado ao PRD: leitura pública de standings, escritas vinculadas a usuário e privilégios de admin em subcoleções.  
7. Implementar fluxo de partidas (RF5) com estados `pending/confirmed/contested`, notificações e forçar confirmação (admin).  
8. Adicionar dashboard pessoal e estatísticas (RF7); persistência e consultas.  
9. Implementar chat interno via Firestore e notificações por e-mail (EmailJS).  
10. Exportação PDF da tabela final (jsPDF) e arquivamento de campeonatos.

## Recomendações Técnicas

- Manter chaves públicas do Firebase apenas em `config/firebase-config.js` e evitar logs sensíveis (`config/firebase-config.js:3`).  
- Definir um `config/api-config.js` com chaves/URLs públicas para ImgBB/TheSportsDB e importar corretamente a partir de `assets/js/api.js`.  
- Consolidar variáveis CSS: migrar `--primary-color`/`--text-color` para os nomes de `theme.css` ou importar `theme.css` e referenciar suas variáveis; padronizar tokens de tema.
- Criar helpers para renderização (DOM) separados da lógica de dados, seguindo modularidade.
- Adicionar media queries no `layout.css` para adequação de header/nav entre mobile/desktop.

## Matriz de Status por Requisito

| ID | Requisito | Status | Referências |
|----|-----------|--------|-------------|
| RF1 | Home pública em tempo real | Não implementado | `index.html:34`, ausência `onSnapshot` |
| RF2 | Autenticação e perfis | Parcial | `pages/login.html:1-55`, `assets/js/auth.js:46`,`64` |
| RF3 | Usuários e permissões | Não implementado | — |
| RF4 | Campeonatos e rodadas | Não implementado | — |
| RF5 | Fair Play (placar) | Não implementado | — |
| RF6 | Confronto direto | Não implementado | — |
| RF7 | Estatísticas | Não implementado | `assets/js/stats.js:1` |
| RF8 | Perfis | Não implementado | — |
| RF9 | Chat/Notificações/Logs | Não implementado | `assets/js/chat.js:1` |
| RNF1 | Performance `onSnapshot` | Não aplicável | — |
| RNF2 | Escalabilidade Firestore | Não implementado | `config/firestore.rules:1` |
| RNF3 | Placeholders | Não implementado | — |
| RNF4 | Upload 2MB | Implementado | `assets/js/api.js:22-25` |
| RNF5 | Link transmissão | Não implementado | — |
| RNF6 | Segurança Painel | Não implementado | — |

## Conclusão

O iCouFootball está pronto para avançar da fase de infraestrutura para a implementação das funcionalidades centrais do PRD. A prioridade deve ser tornar a Home realmente dinâmica com Firestore (`onSnapshot`), corrigir o módulo de APIs externas, implementar autenticação funcional com Firebase e padronizar o tema CSS. Em seguida, deve-se endereçar o fluxo de partidas com validação dupla e os critérios de desempate, além de configurar corretamente as regras do Firestore.
