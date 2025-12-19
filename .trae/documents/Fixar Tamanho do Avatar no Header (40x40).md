## Mudança Planejada
- Adicionar regras CSS em `assets/css/main.css` para limitar `.profile-avatar-header .avatar-img` a `width: 40px; height: 40px; border-radius: 50%; object-fit: cover`.
- Opcional (se necessário para layout): garantir `.profile-avatar-header` com `display: flex; align-items: center; gap: 8px`.

## Impacto
- O avatar do header não expandirá para o tamanho original da imagem; ficará sempre em 40x40px, conforme solicitado, e cortado corretamente.
- Mantém conformidade com CSS nativo e design system.

## Próximo Passo
- Aplicar as regras em `assets/css/main.css` na seção de header.