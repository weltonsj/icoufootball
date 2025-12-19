## Visão Geral
- Integrar a página Perfil aos dados do Firestore usando Firebase v9 (modular) e o Auth atual.
- Implementar: carregamento dos dados do usuário, edição e validação, upload de foto via Imgbb, atualização da senha, persistência de "Perfil Público".
- Reutilizar componentes existentes: `modal` e `spinner` para feedback e estados de carregamento.

## Estrutura Existente
- HTML da página Perfil em `src/pages/profile.js` com IDs: `#username`, `#password`, `#bio`, `#whatsapp`, `#instagram`, `#twitch`, botão `.btn-upload`, switch `input[type="checkbox"]` dentro de `.public-profile-toggle` (src/pages/profile.js:35–93).
- Roteamento injeta o HTML e carrega o JS dinâmico a partir de `./src/functions/profile.js` (src/routes/route.js:97–107).
- Serviços prontos:
  - Auth: `src/services/authService.js` (login, reset, logout)
  - Firebase App/DB: `src/services/firebase.js`
  - Users: `src/services/usersService.js` com `getUser(uid)` (src/services/usersService.js:22–23)
  - UI: `src/components/modal.js`, `src/components/spinner.js`
- Observação: `src/functions/profile.js` não existe; será criado para inicializar a página Perfil e orquestrar dados.

## Modelo de Dados (Firestore)
- Documento `users/{uid}` com chaves:
  - `nome` (string)
  - `bio` (string)
  - `whatsapp` (string padronizada)
  - `instagram` (string, com `@` no início)
  - `twitch` (string, com `@` no início)
  - `fotoUrl` (string URL pública da imagem)
  - `perfilPublico` (boolean)
- Não armazenar senha no Firestore; a alteração de senha será via Firebase Auth.

## Carregamento ao Entrar em Perfil
- Ao carregar `profile` via roteador, `src/functions/profile.js`:
  - Obtém `currentUser` do `authManager` (src/utils/authManager.js:134–140).
  - Busca `users/{uid}` com `getUser(uid)`.
  - Popula os inputs:
    - `#username` ⇄ `nome`
    - `#bio` ⇄ `bio`
    - `#whatsapp` ⇄ `whatsapp`
    - `#instagram` ⇄ `instagram`
    - `#twitch` ⇄ `twitch`
    - `.profile-photo` `src` ⇄ `fotoUrl` (se existir)
    - Switch `checked` ⇄ `perfilPublico`
  - Define `#password` como `"*****"` e limpa ao focar para permitir digitar nova senha.

## Upload de Foto (Imgbb)
- Fluxo:
  - Ao clicar `.btn-upload`, abrir um `<input type="file" accept="image/*">` programático.
  - Validar tamanho e tipo básico.
  - `showSpinner()`; enviar via `fetch` para `https://api.imgbb.com/1/upload?key=IMGBB_KEY` com `FormData` (`image` como arquivo/Blob).
  - Em sucesso, obter `data.url` e atualizar `fotoUrl` no Firestore para o `uid`.
  - Atualizar `.profile-photo.src` e `showModal('success', ...)`; `hideSpinner()`.
  - Em erro, `hideSpinner()` e `showModal('error', ...)` com mensagens claras.

## Validações dos Campos
- `nome`: obrigatório (trim ≠ vazio), 3–40 chars.
- `bio`: opcional, até 280 chars.
- `whatsapp`: aceitar E.164 (`+` e dígitos) ou formato BR; normalizar para E.164 ao salvar quando possível.
- `instagram`: deve iniciar com `@` e seguir regex `^@[A-Za-z0-9._]{1,30}$`.
- `twitch`: deve iniciar com `@` e seguir regex `^@[A-Za-z0-9_]{1,25}$`.
- `password`: se o campo for alterado (não vazio), verificar força mínima (≥6, letras e números) e processar via Auth.
- Feedbacks visuais: ícones já existentes e mensagens via `modal`; marcar `aria-invalid` para acessibilidade.

## Salvar Alterações
- Listener no botão `SALVAR ALTERAÇÕES`:
  - Coletar valores dos campos, validar e montar payload.
  - Atualizar Firestore `users/{uid}` com `updateDoc` (ou `setDoc` merge=true se doc inexistente).
  - Alteração de senha: se preenchida, usar `updatePassword(user, novaSenha)`. Em `auth/requires-recent-login`, solicitar reautenticação (modal para senha atual) e repetir operação.
  - Switch `Perfil Público`: refletir no campo `perfilPublico` booleano.
  - Em sucesso: `showModal('success', 'Perfil atualizado', ...)`.
  - Em falha: `showModal('error', ...)` com detalhe amigável.

## Alteração de Senha (Auth)
- Abordagem:
  - Campo `#password` vazio ⇒ ignorar.
  - Campo com valor ⇒ tentativa de `updatePassword(currentUser, novaSenha)`.
  - Se erro `auth/requires-recent-login`: abrir modal solicitando senha atual, reautenticar com `EmailAuthProvider.credential(currentUser.email, senhaAtual)` e repetir `updatePassword`.

## Perfil Público
- Switch controla `perfilPublico` no Firestore.
- Carregamento inicial seta o estado conforme BD; alteração local refletida no payload de salvamento.

## Tratamento de Erros e Feedback
- Usar `showSpinner/hideSpinner` durante operações.
- `showModal('success'|'error')` para sucesso/erro.
- Mensagens específicas:
  - Validação: destacar campo inválido com `aria-invalid='true'`.
  - Upload: tempo limite, tipo inválido, resposta da API.
  - Firestore: problemas de rede/permissão.
  - Auth: senha fraca, reautenticação necessária.

## Arquivos a Criar/Atualizar
- Criar `src/functions/profile.js` para:
  - Inicialização, carregamento de dados, listeners de upload e salvar, validações, integração com Auth/Firestore.
- Sem alterações de HTML/CSS estruturais; manter a interface atual e IDs já presentes.

## Gestão da Chave Imgbb (Segurança)
- A chave fornecida ficará exposta se usada no cliente. Opções:
  1) Variável em tempo de execução (ex.: `window.ENV.IMGBB_KEY`) definida fora do repositório e lida pelo código.
  2) Arquivo `config/imgbb-config.js` (não versionado) que exporta `imgbbKey`.
- Recomendo a opção 1 para evitar persistir o segredo no código. Confirma qual opção prefere.

## Conformidade com PRD
- Vanilla JS, CSS nativo, sem frameworks.
- Firebase v9 modular.
- Reutilizar variáveis de tema e componentes existentes.
- Acessibilidade básica (ARIA e foco).

## Solicitação de Confirmação
- Posso criar `src/functions/profile.js` e integrar todos os fluxos acima?
- Indique a opção de gestão da chave Imgbb que prefere usar antes de eu iniciar.