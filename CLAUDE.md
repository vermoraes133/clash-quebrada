# CLASH QUEBRADA v2 — Guia para Claude Code

## O que e este projeto

Jogo mobile de cartas em tempo real estilo Clash Royale, tematica brasileira de quebrada.
**Phaser 3 + Vite + ES Modules** — projeto modular com WebGL rendering, sprites procedurais e estrutura para publicacao real.

Migrado do arquivo unico `index.html` (3088 linhas) do projeto original em `/Users/ocrestreamnet/Downloads/CLASH_QUEBRADA/`.

---

## Como rodar

```bash
cd /Users/ocrestreamnet/Downloads/clash-quebrada-v2
npm run dev        # http://localhost:5173 (dev com hot-reload)
npm run build      # gera dist/ para deploy
npx vite preview   # testa o build local
```

---

## Arquitetura do projeto

```
clash-quebrada-v2/
├── index.html                    <- HTML + CSS + overlays DOM (login, lobby, admin, feedback)
├── vite.config.js                <- Vite config (base ./, port 5173)
├── package.json                  <- phaser 3, firebase
└── src/
    ├── main.js                   <- Phaser.Game init + login + admin + feedback DOM handlers
    ├── state/
    │   └── GameState.js          <- APP state object + loadData/saveData
    ├── config/
    │   ├── cards.js              <- CARDS{} com 37 personagens + SHOP_CARD_KEYS + BASE_KEYS
    │   ├── constants.js          <- W, H, ARENA_TOP, BRIDGES, DIFF_PRESETS, TUT_STEPS, etc.
    │   └── firebase.js           <- initFirebase(), getDb(), getAuth(), fbKey()
    ├── rendering/
    │   ├── TextureGenerator.js   <- Gera texturas Phaser no boot (74 chars + particulas + UI)
    │   └── ArenaRenderer.js      <- Gera 4 texturas de arena (favela, predio, bosque, rua)
    ├── scenes/
    │   ├── BootScene.js          <- Logo animada + progress bar + geracao de texturas
    │   ├── MenuScene.js          <- Menu principal com particulas e botoes interativos
    │   ├── DeckSelectScene.js    <- Selecao de deck (grid 4 colunas, timer, tooltip)
    │   ├── TutorialScene.js      <- Tutorial 6 passos com modal
    │   ├── BattleScene.js        <- Batalha principal (875+ linhas) — maior arquivo
    │   ├── ResultScene.js        <- Resultado + revanche online
    │   ├── RankingScene.js       <- Ranking global Firebase
    │   └── ShopScene.js          <- Loja com scroll, compra com diamantes
    ├── entities/
    │   ├── UnitSprite.js         <- Phaser Container: shadow, glow, char img, HP bar, bobbing
    │   ├── TowerSprite.js        <- Torre com tijolos, bandeira animada, rachaduras, fogo
    │   └── ProjectileSprite.js   <- Projetil com trail de 9 pontos + glow
    ├── systems/
    │   ├── AudioSystem.js        <- SFX (11 efeitos) + MUSIC (procedural 145 BPM, 3 intensidades)
    │   ├── BattleLogic.js        <- updateUnits, findTarget, dealDmg, checkWin, updateAI, specials
    │   └── OnlineSync.js         <- Firebase rooms, presenca, challenges, ranking, admin config
    └── ui/
        ├── ElixirBar.js          <- 10 segmentos glowing com tween
        ├── CardHand.js           <- 4 cartas na mao com preview e selecao
        ├── BattleHUD.js          <- Timer, badge dificuldade, forfeit com confirmacao
        ├── CharacterRenderer.js  <- Desenho procedural dos 37 personagens (Canvas2D -> textura)
        ├── DrawArena.js          <- Renderizador de arena Canvas2D (usado pelo ArenaRenderer)
        ├── DrawEntities.js       <- (legado) referencia de renderizacao Canvas2D
        ├── DrawScreens.js        <- (legado) referencia de telas Canvas2D
        └── DrawUI.js             <- (legado) referencia de UI Canvas2D
```

---

## Padrao de arquitetura

### Separacao logica vs renderizacao

- **BattleLogic.js** gerencia `G.units[]`, `G.projs[]`, `G.towers[]` como objetos JS puros
- **BattleScene.js** sincroniza sprites Phaser com esses objetos a cada frame via Map<id, Sprite>
- A logica de combate NAO conhece Phaser — apenas dados puros
- A renderizacao le os dados e cria/destroi sprites conforme necessario

### Comunicacao entre modulos (sem dependencia circular)

- **Callback pattern**: BattleLogic expoe `setApp()`, `setOnBattleEnd()` — main.js injeta
- **OnlineSync** expoe `setApp()`, `setGoScreen()`, `setSaveDataFn()` — main.js injeta
- **Nenhum modulo systems/ importa de main.js ou scenes/**
- **Scenes importam de systems/ e config/, nunca o contrario**

### DOM overlays coexistindo com Phaser

- Login, Sala de Desafios, Lobby, Admin, Feedback continuam como HTML/CSS no index.html
- Phaser canvas vive dentro de `<div id="game-container">`
- Scenes mostram/escondem overlays DOM via `document.getElementById().classList`
- z-index: overlays DOM em 100+, Phaser canvas em 1

---

## O que funciona

### Batalha
- Engine completa: unidades, torres, projeteis, colisoes, rio com pontes
- 37 cartas unicas com personagens brasileiros desenhados proceduralmente
- Sistema de elixir, deck de 8 cartas, rotacao de mao
- 4 tipos: melee, ranged, spell, building
- Especiais: stun, gas, heal, buff, sonic, lasso, sweep, slow, drain, dodge, teleport, pilintra
- IA com 4 dificuldades (configuravel via admin)
- 4 temas de arena: favela, predio, bosque, rua
- Obstaculos por tema
- Forfeit com confirmacao

### Visuais (Phaser 3)
- WebGL rendering via Phaser.AUTO
- 37 personagens procedurais com corpo, cabeca, acessorios unicos
- Torres com tijolos, ameias, bandeira animada, rachaduras, fogo
- Projeteis com trail de cometa
- Particulas: spark, puff, heal, stun, smoke, fire, water, sonic
- Camera shake real (Phaser cameras)
- Escala automatica (Phaser.Scale.FIT)
- Texturas geradas no boot (74 personagens + 4 arenas + particulas)
- Logo procedural animada no BootScene

### Online multiplayer
- Firebase Auth (email/senha) + criacao automatica
- Firebase Realtime Database
- Sala de Desafios com presenca global
- Heartbeat 15s + onDisconnect
- Desafios: enviar, aceitar, recusar, cancelar, timeout
- Rematch system
- Sync de deploys em tempo real

### Progressao
- Contas Firebase persistidas
- Trofeus, vitorias, derrotas, empates
- XP por carta (niveis 1-13)
- Diamantes como moeda
- Loja de cartas (21 cartas compraveis)
- Ranking global top-20

### UI/UX
- Menu animado com particulas
- Tutorial interativo 6 passos
- Selecao de deck com timer
- Resultado com stats detalhados
- Feedback pos-jogo
- Admin panel (dificuldade remota)
- Audio procedural (funk/baiao 145 BPM)
- Mute toggle

### Error Handling
- window.onerror + onunhandledrejection com overlay amigavel
- try-catch em geracao de texturas (fallback individual)
- try-catch em renderizacao de arena (fallback cor solida)
- Null checks em sync de entidades
- Guards em transicoes de cena
- init(data) seguro em todas as scenes

---

## Firebase — estrutura de dados

```
/presence/{fbKey}
  name, email, status (menu|lobby|solo|online|busy), ts, trophies

/matchlobby/challenges/{targetFbKey}/{fromFbKey}
  from, trophies, roomCode, deck, status (pending|accepted|declined)

/rooms/{roomCode}
  host: {name, id, deck}
  guest: {name, id, deck}
  status: waiting|playing
  events/{pushKey}: {type:'deploy', key, x, y, team}
  rematch: {host|guest: 'ready'}

/users/{fbKey}
  name, email, trophies, wins, losses, draws, diamonds,
  deck[], cardXP{}, isNew, isAdmin

/ranking/{fbKey}
  name, trophies, wins, losses, draws

/config/difficulty
  aiMin, aiMax, statMult, elixirMult, aiSmart, label

/feedback/{pushKey}
  rating, comment, name, ts
```

---

## Decisoes tecnicas

- **Phaser.AUTO**: WebGL com fallback Canvas2D automatico
- **Scale.FIT + CENTER_BOTH**: responsivo em qualquer tela
- **Texturas procedurais**: sem assets externos, tudo gerado no boot via Canvas2D
- **CharacterRenderer.js**: desenha em canvas offscreen, registra como textura Phaser
- **ArenaRenderer.js**: gera 4 backgrounds completos como texturas estáticas
- **BattleLogic puro**: zero dependencia de Phaser, pode ser testado isoladamente
- **Firebase compat CDN**: carregado via script tags no HTML (nao npm)
- **DOM overlays preservados**: login/lobby/admin sao HTML/CSS, nao Phaser UI
- **`G.dying[]`**: animacao de morte sem afetar targeting
- **`dispHp`**: tween suave da HP bar (visual only)
- **`fbKey(email)`**: btoa + replace para chave Firebase-safe

---

## Para publicacao

### Web (Vercel/Netlify)
```bash
npm run build        # gera dist/
# deploy dist/ no Vercel ou Netlify
```

### PWA
Adicionar `public/manifest.json` com nome, icones, `display: standalone`.

### Android (Google Play)
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init
npx cap add android
npx cap copy && npx cap open android
```

---

## Contexto de desenvolvimento

- Linguagem de resposta: **portugues**
- Plataforma: macOS Darwin 25.3.0
- Working directory: `/Users/ocrestreamnet/Downloads/clash-quebrada-v2`
- Projeto original: `/Users/ocrestreamnet/Downloads/CLASH_QUEBRADA/index.html`
- Node: v24+ / npm: v11+
- Phaser: 3.x / Vite: 8.x / Firebase: 10.7.1 (CDN compat)
