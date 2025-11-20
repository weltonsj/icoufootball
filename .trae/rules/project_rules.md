# PROJETO: iCouFootball
# REGRAS ESTRITAS DE DESENVOLVIMENTO

1. TECNOLOGIA PROIBIDA:
   - NÃO use React, Vue, Angular, Svelte, jQuery.
   - NÃO use Bootstrap, Tailwind ou SASS (apenas CSS nativo e variáveis CSS root).
   - NÃO use TypeScript (apenas Javascript ES6+ moderno).

2. ESTILO VISUAL:
   - Cor Destaque: #FD8A24
   - Cor Base: #605F54
   - Fundo Dark Mode: #1a1a1a

3. BANCO DE DADOS:
   - Apenas Firebase Firestore e Authentication.
   - Use SEMPRE a sintaxe Modular do Firebase v9+.

4. REQUISITOS:
   - O código deve ser modular (separe lógica de renderização da lógica de dados).
   - Use 'fetch' para APIs externas (Logos/Bandeiras).
   - Se não souber como implementar algo em Vanilla JS, não invente uma biblioteca, pergunte-me primeiro.

5. ESTRUTURA DE ARQUIVOS:
   - Siga a estrutura de arquivos e diretórios EXATAMENTE como descrito.
   - APENAS CSS e HTML PURO.** Não introduza classes de frameworks (ex: `flex-col`, `p-4`).
   - Todos os valores de cores, espaçamentos, tipografia e sombras DEVEM usar as variáveis CSS definidas em `theme.css`.
   - O `index.html` deve ser o *shell* da aplicação, sem o conteúdo específico de dashboard ou login, apenas a estrutura geral (header, nav, main content area).
   - Priorize a responsividade (media queries básicas para ajustar o layout do header/nav para desktop).