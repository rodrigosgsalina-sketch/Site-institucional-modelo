# Ferro & Sal — site institucional (modelo)

Site institucional de uma empresa fictícia de arquitetura e reforma em Natal/RN. É HTML, CSS e JavaScript puros, sem build e sem dependências: abra o `index.html` no navegador ou publique a pasta como está (GitHub Pages, Netlify, qualquer hospedagem estática).

Conceito visual: "caderno de obra". Cada página é uma **folha** numerada (FL. 01 a FL. 08), e o rodapé é o carimbo da prancha.

## Páginas

| Folha | Arquivo | Conteúdo |
|---|---|---|
| FL. 01 | `index.html` | Início: hero, manifesto, serviços, obras em destaque, processo resumido, depoimentos |
| FL. 02 | `estudio.html` | História, manifesto, números, regras da casa, equipe, o espaço |
| FL. 03 | `servicos.html` | Os 5 serviços em detalhe, com ficha e link para pedir visita |
| FL. 04 | `obras.html` | As 5 obras, com filtro por tipo e antes/depois arrastável |
| FL. 04.1–04.5 | `obras/*.html` | Uma página por obra: ficha técnica, relato, antes/depois, galeria com ampliação, depoimento |
| FL. 05 | `processo.html` | Linha do tempo das 6 etapas (horizontal no desktop), diário de obra, entregas |
| FL. 06 | `valores.html` | Tabela de preços de projeto, condições e calculadora de estimativa |
| FL. 07 | `perguntas.html` | Perguntas frequentes em 4 grupos |
| FL. 08 | `contato.html` | Formulário com validação, dados, mapa em SVG |
| Anexos | `privacidade.html`, `creditos.html`, `404.html` | Aviso de privacidade, créditos das fotos, página não encontrada |

A calculadora (FL. 06) leva a estimativa para o formulário de contato pela URL (`contato.html?tipo=…&area=…&msg=…`), e os botões "Pedir uma visita" de cada serviço já chegam com o tipo de obra selecionado.

## Arquivos compartilhados

- `assets/css/estilo.css` — todas as cores, fontes e medidas ficam em variáveis no topo (`--papel`, `--tinta`, `--ferro`, `--sal`, `--cal`, `--grafite`). Organizado por componente e depois por folha.
- `assets/js/site.js` — um arquivo para o site todo; cada bloco só roda se a página tiver os elementos dele.
- `assets/img/` — fotos em WebP, cada uma em duas larguras (`-800` e `-1600`, servidas por `srcset`). Créditos em `assets/img/CREDITOS.md`.

## Trocar as fotos de exemplo

As fotos são do [Unsplash](https://unsplash.com) (Licença Unsplash, uso livre inclusive comercial). Elas ilustram o tipo de trabalho; as obras são fictícias. Para trocar:

1. Gere duas versões da foto nova com o mesmo nome do arquivo antigo: `nome-800.webp` (lado maior com 900 px) e `nome-1600.webp` (lado maior com 1600 px).
2. Se a proporção mudar, ajuste `width` e `height` do `<img>` nas páginas onde ela aparece.
3. No antes/depois, use duas fotos com o **mesmo enquadramento**. As de exemplo não são do mesmo lugar.
4. Atualize `creditos.html` e `assets/img/CREDITOS.md`.

## Antes de publicar

- **Formulário:** não envia para lugar nenhum; ele valida e mostra a mensagem de sucesso. Ligue a um serviço (Formspree, Netlify Forms ou endpoint próprio) no trecho marcado com `enviar:` em `assets/js/site.js`.
- **Domínio:** `canonical`, Open Graph, `sitemap.xml` e `robots.txt` apontam para `https://ferroesal.arq.br/`. Troque pelo domínio real.
- **Cabeçalho, menu e rodapé** se repetem em todas as páginas. Ao mudar um link ou o telefone, procure e substitua em todos os `.html`.
