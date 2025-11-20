# Relatório de Fidelidade Visual – Tela de Login/Registro

## Discrepâncias Técnicas

- Ícones sociais: placeholders tipográficos ("G" e "f"). Substituição por SVGs oficiais pendente.
- Fonte exata do template: adotada Montserrat para títulos e Inter para corpo; diferenças mínimas de antialiasing por sistema podem alterar percepção de 1–2px.
- Medidas pixel‑perfect: ajustadas para 32/38/46px em títulos e 44/52px em campos/botões; variações de DPI/zoom do navegador podem gerar desvios sutis.
- Imagem de fundo: requer arquivo em `/assets/imagens/png/_background.png`. Enquanto ausente, usa fallback com gradiente para legibilidade.

## Screenshots Comparativos

- Instrução: gerar capturas nas resoluções 320×640, 768×1024, 1024×1366, 1440×900.
- Ferramenta sugerida: DevTools (Chrome) → Device toolbar → Capturar screenshot.
- Verificar: alinhamento de elementos (título, switch, inputs, botão, dots), contraste e nitidez.

## Testes Cross‑Browser

- Chrome (última): compatível; `backdrop-filter` com efeito glass ativo.
- Firefox (última): efeito glass pode exigir `layout.css.backdrop-filter.enabled`; caso contrário, degrade suave sem perda de leitura.
- Safari (última): compatível com `backdrop-filter`; verificar antialiasing de fontes.
- Edge (última): compatível; manter `cover` no background.

## Limitações e Alternativas

- Kerning/antialiasing: dependente do motor de renderização; mitigação por `font-smoothing` aplicado.
- `backdrop-filter`: fallback visual preserva legibilidade via sombras/gradientes.
- Exatidão absoluta de pixels: diferenças por densidade de tela e zoom; proporções preservadas por breakpoints e dimensões fixas no card, campos e botão.