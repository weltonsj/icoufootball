## Objetivo
- Exibir o total de estrelas sem limite e limitar apenas o número de ícones renderizados (máx. 5).
- Adicionar opção para alterar foto no menu do avatar (popover), reutilizando o fluxo de upload.
- Tornar o avatar visível somente para usuários autenticados.

## Onde Alterar
- `src/functions/profile.js`: ajustar `loadProfile()` para usar `totalEstrelas` e `renderStars(Math.min(totalEstrelas,5))`; estender `wireAvatarDropdown(uid)` com botão “Alterar foto” acionando o upload.
- `src/utils/authManager.js`: controlar visibilidade de `.profile-avatar-header` conforme autenticação.

## UX e Validações
- Spinner e modais existentes para feedback.
- Manter CSS e layout atuais, sem frameworks.

## Próximo Passo
- Aplicar as mudanças nos arquivos acima e validar comportamentos no Perfil e no header.