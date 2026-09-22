# Portfólio — João Vitor Navari

Site estático em HTML, CSS e JavaScript, sem dependências de aplicação.
Para visualizar, abra `index.html` ou execute `python3 -m http.server 8000`.

## Projetos

- `data/projects.json`: conteúdo, imagens, tecnologias e URLs. Uma demonstração sem URL usa `null`.
- `scripts/render_projects.py`: componentes reutilizáveis que geram os mockups, ações e apresentações no HTML.
- `css/projects.css`: layout, profundidade e responsividade, usando as variáveis dos temas em `css/style.css`.
- `js/projects.js`: rolagem e inclinação progressivas, sem dependência de animação.

Depois de editar os dados ou o gerador, execute:

```sh
python3 scripts/render_projects.py
python3 scripts/render_projects.py --check
```

O HTML gerado fica entre `projects:start` e `projects:end` em `index.html`.
Ele deve acompanhar as alterações dos dados na publicação. Não precisa de Python
no servidor: todos os projetos, imagens e links funcionam sem JavaScript.

No desktop, a rolagem controla a entrada dos textos e a perspectiva dos mockups.
A inclinação responde apenas ao mouse em telas acima de 1000 px. Em tablets,
a profundidade é reduzida. Até 600 px, há somente entradas curtas, sem paralaxe.
`prefers-reduced-motion` desativa todos esses movimentos, inclusive ao mudar
a preferência durante a visita. A rolagem permanece nativa.

O controlador só escuta rolagem enquanto a seção está próxima da tela, agrupa
atualizações com `requestAnimationFrame` e remove listeners, observadores e
animações ao sair da página ou mudar as condições de interação.

## Verificação local

```sh
python3 scripts/render_projects.py --check
node --check js/main.js
node --check js/projects.js
git diff --check
```

Não há ferramentas de lint, TypeScript, suíte de testes ou bundler configurados.
Valide também os dois temas, teclado, preferência de movimento reduzido e
larguras de 320, 390, 768, 1024 e 1440 px no navegador.
