# Portfólio — João Vitor Navari

Site estático em HTML, CSS e JavaScript, sem dependências de aplicação.
Para visualizar, abra `index.html` ou execute `python3 -m http.server 8000`.

## Projetos

- `data/projects.json`: conteúdo, imagens, tecnologias e URLs. Uma demonstração sem URL usa `null`.
- `scripts/render_projects.py`: componentes reutilizáveis que geram os mockups, ações e apresentações no HTML.
- `css/projects.css`: layout, profundidade e responsividade, usando as variáveis dos temas em `css/style.css`.
- `js/projects.js`: controlador da cena sticky, fases da apresentação e inclinação, sem dependência de animação. Lê os projetos do HTML, sem duplicar os dados.

Depois de editar os dados ou o gerador, execute:

```sh
python3 scripts/render_projects.py
python3 scripts/render_projects.py --check
```

O HTML gerado fica entre `projects:start` e `projects:end` em `index.html`.
Ele deve acompanhar as alterações dos dados na publicação. Não precisa de Python
no servidor: todos os projetos, imagens e links funcionam sem JavaScript.

## Apresentação por rolagem

A partir de 768 px, o controlador mede o texto de **todos** os projetos e o laptop
compartilhado. Ativa a apresentação somente se todos couberem na área útil, sem
rolagem interna, e todas as capturas estiverem carregadas. Durante o carregamento
ou se uma imagem falhar, a lista continua disponível.
O contêiner externo determina a duração; o contêiner interno fica sticky, 16 px
abaixo do cabeçalho. Os quatro projetos compartilham um único laptop em HTML/CSS,
com moldura, câmera, dobradiça e base, ao lado do texto em duas colunas.
O título fica visível ao acessar `#projetos`, com DevFlow já em estado de leitura.

O progresso é `clamp((scrollY - início) / distância, 0, 1)`. O início corresponde
ao topo da seção menos o deslocamento sticky. A distância é a altura útil da cena
vezes 1,25, vezes a quantidade de projetos menos 0,28. O progresso é convertido
em uma linha do tempo com uma unidade por projeto:

- Os primeiros 72% de cada unidade são uma pausa de leitura: opacidade 1,
  posição e escala estáveis.
- Nos 28% seguintes, a saída atual se sobrepõe à entrada do próximo projeto.
  A captura seguinte aparece sobre a anterior, que permanece opaca por baixo
  para não revelar o fundo escuro durante a troca. As imagens recebem um zoom
  discreto; o laptop permanece no lugar e o texto entra em sequência.
- O último projeto permanece legível até a cena ser liberada e a página seguir
  para a seção Stack. A rolagem para cima reverte a apresentação.

O indicador, os botões anterior/próximo e a opção **Ver em lista** permitem
navegação sem depender do gesto de rolar. Na apresentação de desktop, somente o projeto
ativo participa da navegação por teclado e da árvore de acessibilidade; os
controles permitem acessar todos. Na lista, todos ficam acessíveis em ordem.

A inclinação afeta o laptop inteiro e responde apenas ao mouse em telas acima de
1000 px, com interpolação via `requestAnimationFrame`, e somente durante a leitura.
A documentação da API usa `object-fit: contain` para preservar a captura inteira.
Em tablets, a intensidade da animação é reduzida.

Abaixo de 768 px, o mesmo laptop fica sticky abaixo do cabeçalho, com os controles
acima da tela. Os textos passam abaixo dele em fluxo normal, mantendo todas as
descrições, tecnologias e ações acessíveis. A posição de cada artigo determina a
troca da captura e do contador, nos dois sentidos da rolagem. Anterior/próximo
leva ao começo do texto correspondente; **Ver em lista** restaura os laptops
individuais e permite retornar à apresentação. Não há inclinação pelo toque,
rolagem interna nem altura artificial para prolongar a apresentação móvel.

Se não restarem pelo menos 220 px para leitura abaixo do laptop, a lista é usada
automaticamente, inclusive em celulares na horizontal. Janelas de desktop sem
espaço suficiente também usam a lista. `prefers-reduced-motion` restaura a lista
e desativa todos os movimentos da seção, inclusive quando a preferência muda
durante a visita. A rolagem permanece nativa em todos os modos.

O controlador só escuta rolagem enquanto a seção está próxima da tela, agrupa
atualizações com `requestAnimationFrame`, mede novamente ao redimensionar a janela
e após carregar as fontes, e remove listeners, observadores e animações ao sair.
Sem JavaScript, todos os projetos permanecem em fluxo normal. Se houver uma falha
durante a configuração ou a animação, o controlador restaura esse fluxo.

## Verificação local

```sh
python3 scripts/render_projects.py --check
node --check js/main.js
node --check js/projects.js
git diff --check
```

Não há ferramentas de lint, TypeScript, suíte de testes ou bundler configurados.
Valide também os dois temas, teclado, preferência de movimento reduzido e
larguras de 320, 375, 390, 430, 768, 1024, 1280 e 1440 px no navegador. Teste a âncora Projetos,
as três trocas de projeto nos dois sentidos e em velocidades diferentes, os
intervalos de leitura, o fim da cena, os controles e a alternativa em lista.
Janelas baixas e zoom aumentado podem ativar a lista para preservar a leitura.
