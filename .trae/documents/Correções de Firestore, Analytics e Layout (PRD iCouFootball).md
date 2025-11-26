## Objetivo
Corrigir os erros de Firestore (índice de collectionGroup), ruído do Analytics e alinhar o layout à identidade/criterios do PRD, incluindo centralização da section e posicionamento do footer.

## Firestore
- Criar índice de Collection Group para `partidas` por `championshipId` (ASC) conforme o link exibido no console.
- Ajustar regras para permitir leitura via `collectionGroup`:
  - Adicionar `match /{path=**}/partidas/{partidaId} { allow read: if true; }` no arquivo `config/firestore.rules`.
- Manter fallback já existente em `assets/js/standings.js` (consulta por subcoleções `rodadas/{id}/partidas`) e trocar `console.error` por `console.warn` quando cair no fallback.

## Firebase Analytics
- Gatear inicialização do Analytics apenas quando suportado e em ambiente de produção:
  - Em `assets/js/firebase.js`, inicializar Analytics somente se `isSupported()` for true e `measurementId` existir.
  - Adicionar condicionais para não inicializar Analytics em hosts locais (ex.: `localhost`, `127.*`, `192.168.*`).
- Resultado esperado: remover chamadas abortadas ao GA durante desenvolvimento local.

## Layout e PRD
- Atualizar `assets/css/theme.css` para alinhar com PRD:
  - `--color-primary: #FD8A24` (mantido)
  - `--color-secondary: #605F54` (mantido)
  - `--color-background-dark: #1a1a1a` (ajustar de #222222)
- Estruturar o layout para footer no final e section centralizada:
  - Em `assets/css/main.css`: usar `body { display: flex; flex-direction: column; min-height: 100vh; }` e remover `justify-content/align-items` do body.
  - Em `.main-bg`: manter `display:flex; justify-content:center; align-items:center; padding: var(--spacing-md);` e adicionar `flex: 1` para ocupar o espaço entre header e footer.
  - Adicionar classe `.app-footer` em `assets/css/components.css` para estilos do rodapé (mover estilos inline do HTML para CSS) e garantir posicionamento no final (sem fixed).
- Centralização/limpeza de inline styles em `pages/standings.html`:
  - Trocar inline styles do `header` por classes (`row row-apart`).
  - Remover estilos inline do `footer` e aplicar `.app-footer`.
  - Manter sticky das colunas da tabela somente se necessário; caso contrário, padronizar com classes.

## Standings.js
- Manter a consulta via `collectionGroup` para tempo real.
- No `catch`/callback de erro, reduzir para `console.warn` e exibir mensagem amigável; persistir fallback por subcoleções.
- Confirmar que o `ACTIVE_CHAMPIONSHIP_ID` corresponde ao documento real de `campeonatos` em uso.

## Testes e Verificação
- Publicar regras atualizadas no console do Firebase.
- Criar índice conforme o link do console.
- Abrir `pages/standings.html` e validar:
  - Tabela carrega sem erros (com índice criado, a primeira consulta não cai no fallback).
  - Sem logs de GA abortados em ambiente local (Analytics não inicializado localmente).
  - Section centralizada e footer no final da página.
  - Cores e tipografia seguem variáveis de `theme.css` conforme PRD.

## Entregáveis
- Atualizações nos arquivos: `config/firestore.rules`, `assets/js/firebase.js`, `assets/css/theme.css`, `assets/css/main.css`, `assets/css/components.css`, `pages/standings.html`.
- Instruções operacionais: publicação das regras e criação do índice de Firestore.

Confirma que posso aplicar as mudanças acima?