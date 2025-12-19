## Objetivo
- Sincronizar a foto do perfil com o avatar do header.
- Implementar um menu pequeno no ícone de dropdown do avatar para editar “descrição” (salva em `descricao` no Firestore) e refletir no `.team-motto`.
- Conectar “total-stars-hint” e renderização das estrelas à chave `estrelas` (máximo 5), conforme PRD.

## Onde Intervir
- `src/functions/profile.js` (lógica da página Perfil): adicionar listeners e sincronizações.
- Sem alterações em HTML/CSS estrutural; usaremos elementos e estilos existentes.

## Detalhes Técnicos
- Foto do Perfil → Header:
  - Ao carregar dados (`loadProfile`), se houver `fotoUrl`, setar `.profile-photo` e também `.profile-avatar-header .avatar-img`.
  - Após upload via Imgbb, atualizar ambos e salvar em `fotoUrl`.

- Menu de Descrição (avatar-dropdown):
  - Listener no `.avatar-dropdown-icon` para abrir um pequeno popover ancorado ao header.
  - Campo texto (ou textarea) para “descrição”; botões Salvar/Cancelar.
  - Ao salvar: validação básica (trim, até 140–280 chars), persistir `users/{uid}.descricao` via Firestore, atualizar `.team-motto` e fechar popover com feedback.

- Estrelas (player-stars):
  - Carregar `users/{uid}.estrelas`, clamp 0–5.
  - Atualizar `.total-stars-hint` para `${estrelas} TOTAL`.
  - Renderizar exatamente `estrelas` ícones `<i class="fas fa-star filled"></i>` dentro de `.player-stars` (opcionalmente remover ícones estáticos anteriores).

- Tratamento de erros e UX:
  - Reutilizar `showSpinner/hideSpinner` e `showModal`.
  - Fechar popover em clique fora/ESC.

## Segurança e Conformidade
- Firebase v9 (modular), Vanilla JS, sem frameworks.
- Sem alterações na interface além de interações programáticas.

## Próximo Passo
- Implementar as mudanças em `src/functions/profile.js` com validações e persistência no Firestore.