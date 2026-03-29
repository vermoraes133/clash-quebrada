export const W = 420;
export const H = 680;
export const P2_UI_H = 68;
export const P1_UI_H = 118;
export const ARENA_TOP = P2_UI_H;
export const ARENA_BOT = H - P1_UI_H;
export const ARENA_H = ARENA_BOT - ARENA_TOP;
export const RIVER_Y = ARENA_TOP + ARENA_H * 0.5;
export const BRIDGES = [
  { cx: 100, half: 26 },
  { cx: 315, half: 26 },
];
export function onBridge(x) { return BRIDGES.some(b => Math.abs(x - b.cx) <= b.half + 4); }
export const SAVE_KEY = 'cq_v2';
export const XP_TABLE = [0, 50, 130, 260, 440, 680, 980, 1350, 1790, 2310, 2910, 3590, 4350];
export const DEFAULT_DECK = ['padeiro','policia','mototaxista','vereador','vendedor','funkeiro','churrasco','ronda'];
export const ARENA_THEMES = ['favela','predio','bosque','rua'];
export const DIFF_PRESETS = {
  facil:      { label:'Facil',       aiMin:4,   aiMax:8,   statMult:0.70, elixirMult:0.80, aiSmart:false },
  medio:      { label:'Medio',       aiMin:2.5, aiMax:5.5, statMult:1.00, elixirMult:1.00, aiSmart:false },
  dificil:    { label:'Dificil',     aiMin:1.4, aiMax:3.0, statMult:1.35, elixirMult:1.30, aiSmart:true  },
  impossivel: { label:'Impossivel',  aiMin:0.7, aiMax:1.6, statMult:1.80, elixirMult:1.60, aiSmart:true  },
};
export const ADMIN_EMAILS = ['e@emoraesl.com'];
export const TUT_STEPS = [
  {emoji:'⚔️',title:'Bem-vindo ao Clash Quebrada!',body:'Voce vai batalhar contra o inimigo. Destrua a torre REI adversaria para vencer! Cada partida tem um TEMA diferente: favela, predio, bosque ou rua.'},
  {emoji:'⚡',title:'Elixir — o combustivel',body:'O elixir roxo recarrega automaticamente. Cada carta tem um custo. Gerencie bem!'},
  {emoji:'🃏',title:'Como invocar unidades',body:'Toque em uma carta na parte de baixo para seleciona-la. Depois toque na sua metade da arena para invocar!'},
  {emoji:'🌊',title:'O Rio e as Pontes',body:'As unidades so atravessam o rio pelas PONTES de madeira. Planeje suas rotas de ataque!'},
  {emoji:'💎',title:'Diamantes e a Loja!',body:'Vitorias rapidas rendem DIAMANTES (💎 1-5). No menu acesse a LOJA para desbloquear novos personagens exclusivos com seus diamantes!'},
  {emoji:'🏆',title:'Ganhe e evolua!',body:'Cada vitoria da trofeus e XP para suas cartas. As cartas sobem de nivel e ficam mais fortes! Use 🏳️ para desistir se precisar.'},
];
