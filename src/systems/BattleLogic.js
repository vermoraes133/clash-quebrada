// ════════════════════════════════════════════════════════════
//  BATTLE LOGIC — All combat, units, projectiles, AI, win
//  Ported from index.html
// ════════════════════════════════════════════════════════════

import { CARDS } from '../config/cards.js';
import { W, ARENA_TOP, ARENA_BOT, ARENA_H, RIVER_Y, BRIDGES, onBridge, XP_TABLE, DEFAULT_DECK, ARENA_THEMES } from '../config/constants.js';
import { SFX, MUSIC } from './AudioSystem.js';

// ── APP reference (set via setApp) ───────────────────────────
let APP = null;
export function setApp(app) { APP = app; }
export function getApp() { return APP; }

// ── Callbacks for scene transitions ──────────────────────────
let _onBattleEnd = null;
export function setOnBattleEnd(fn) { _onBattleEnd = fn; }

// _updateRankingFn and _saveDataFn removed — battle-end logic now handled in main.js onBattleEnd

// ── Shake + Helpers ──────────────────────────────────────────
export let shakeAmt = 0, shakeT = 0;
export function triggerShake(a, d) { if (a >= shakeAmt) { shakeAmt = a; shakeT = d; } }
export function resetShake() { shakeAmt = 0; shakeT = 0; }
export function updateShake(dt) { if (shakeT > 0) { shakeT -= dt; if (shakeT <= 0) { shakeAmt = 0; shakeT = 0; } } }

export function rnd(n) { return Math.random() * n; }
export function rand(a, b) { return a + rnd(b - a); }
export function dst(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

let uid = 0;
export let currentTheme = 'favela';
export let currentDiff = { aiMin: 2.5, aiMax: 5.5, statMult: 1, elixirMult: 1, aiSmart: false, label: 'Medio' };
export function setCurrentDiff(d) { currentDiff = d; }
export function setCurrentTheme(t) { currentTheme = t; }

// ── Game state object ────────────────────────────────────────
export let G = {};
export function getG() { return G; }

// ── Card level / XP system ───────────────────────────────────
export function getCardLevel(key) {
  if (!APP || !APP.progress) return 1;
  const xp = (APP.progress.cardXP[key] || 0);
  for (let i = XP_TABLE.length - 1; i >= 0; i--) if (xp >= XP_TABLE[i]) return i + 1;
  return 1;
}

export function levelMult(lvl) { return 1 + ((lvl - 1) * 0.1); }

export function getAllKeys() {
  const BASE_KEYS = Object.keys(CARDS).filter(k => !CARDS[k].locked);
  return [...BASE_KEYS, ...(APP && APP.progress ? APP.progress.owned || [] : [])];
}

export function addXPtoCards(keys, amount) {
  if (!APP || !APP.progress) return;
  let leveledUp = false;
  keys.forEach(k => {
    const oldLvl = getCardLevel(k);
    APP.progress.cardXP[k] = (APP.progress.cardXP[k] || 0) + amount;
    if (getCardLevel(k) > oldLvl) leveledUp = true;
  });
  if (leveledUp) SFX.levelUp();
}

function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ── Towers ───────────────────────────────────────────────────
export function makeTowers() {
  const mk = (x, y, team, kind) => ({
    x, y, hp: kind === 'king' ? 2600 : 1100, maxHp: kind === 'king' ? 2600 : 1100,
    team, kind, alive: true, lastShot: 0,
    range: kind === 'king' ? 165 : 155, r: kind === 'king' ? 36 : 28,
  });
  return [
    mk(100, ARENA_TOP + ARENA_H * .79, 'player', 'side'),
    mk(320, ARENA_TOP + ARENA_H * .79, 'player', 'side'),
    mk(210, ARENA_TOP + ARENA_H * .91, 'player', 'king'),
    mk(100, ARENA_TOP + ARENA_H * .21, 'enemy', 'side'),
    mk(320, ARENA_TOP + ARENA_H * .21, 'enemy', 'side'),
    mk(210, ARENA_TOP + ARENA_H * .09, 'enemy', 'king'),
  ];
}

// ── Theme obstacles ──────────────────────────────────────────
export function setupThemeObstacles() {
  G.obstacles = [];
  if (currentTheme === 'predio') {
    G.obstacles.push({ x: 5, y: ARENA_TOP + 80, w: 30, h: 60 });
    G.obstacles.push({ x: 385, y: ARENA_TOP + 80, w: 30, h: 60 });
    G.obstacles.push({ x: 5, y: ARENA_BOT - 140, w: 30, h: 60 });
    G.obstacles.push({ x: 385, y: ARENA_BOT - 140, w: 30, h: 60 });
  } else if (currentTheme === 'bosque') {
    G.obstacles.push({ x: 20, y: ARENA_TOP + 60, w: 28, h: 28 });
    G.obstacles.push({ x: 372, y: ARENA_TOP + 60, w: 28, h: 28 });
    G.obstacles.push({ x: 20, y: ARENA_BOT - 88, w: 28, h: 28 });
    G.obstacles.push({ x: 372, y: ARENA_BOT - 88, w: 28, h: 28 });
  } else if (currentTheme === 'favela') {
    G.obstacles.push({ x: 10, y: ARENA_TOP + 100, w: 24, h: 40 });
    G.obstacles.push({ x: 386, y: ARENA_TOP + 100, w: 24, h: 40 });
  }
}

// ── New Battle ───────────────────────────────────────────────
export function newBattle(p1DeckOverride, p2DeckOverride) {
  const pd = p1DeckOverride ? [...p1DeckOverride] : [...APP.progress.deck];
  const _ak = getAllKeys();
  const ed = p2DeckOverride ? [...p2DeckOverride] : shuffleArr([..._ak.filter(k => CARDS[k] && CARDS[k].type !== 'spell'), ..._ak.filter(k => CARDS[k] && CARDS[k].type === 'spell')]).slice(0, 8);
  G = {
    phase: 'playing',
    time: 180,
    p1Elixir: 5, p2Elixir: 5,
    p1Sel: null, p2Sel: null,
    p1DeckIdx: 0, p2DeckIdx: 0,
    p1Hand: [], p2Hand: [],
    p1Deck: pd, p2Deck: ed,
    aiTimer: 0, aiNext: rand(2.5, 5),
    units: [], projs: [], efx: [], dying: [],
    towers: makeTowers(),
    forfeited: false, showForfeitConfirm: false,
    earnedDiamonds: 0, obstacles: [],
  };
  currentTheme = ARENA_THEMES[Math.floor(Math.random() * ARENA_THEMES.length)];
  MUSIC.setTheme(currentTheme);
  setupThemeObstacles();
  for (let i = 0; i < 4; i++) {
    G.p1Hand.push(G.p1Deck[i % G.p1Deck.length]);
    G.p2Hand.push(G.p2Deck[i % G.p2Deck.length]);
  }
}

// ── Card scaling ─────────────────────────────────────────────
export function getCardScaled(key, team) {
  if (!key || !CARDS[key]) return { type: 'melee', hp: 1, dmg: 1, spd: 50, range: 25, atkRate: 1, r: 12, cost: 99, name: '?', emoji: '?', color: '#888' };
  const d = { ...CARDS[key] };
  if (d.type === 'spell') return d;
  const lvl = team === 'player' ? getCardLevel(key) : 1;
  const m = levelMult(lvl) * (team === 'enemy' ? currentDiff.statMult : 1);
  d.hp = Math.floor((d.hp || 1) * m);
  d.dmg = Math.floor((d.dmg || 1) * m);
  return d;
}

// ── Spawn Unit ───────────────────────────────────────────────
export function spawnUnit(key, x, y, team) {
  const d = getCardScaled(key, team);
  if (d.type === 'spell') { doSpell(key, x, y, team); return; }
  if (team === 'player') SFX.deploy();
  const cnt = d.count || 1;
  for (let i = 0; i < cnt; i++) {
    const ox = cnt > 1 ? (i - (cnt - 1) / 2) * 26 : 0;
    G.units.push({
      id: uid++, key, team,
      x: x + ox, y,
      hp: d.hp, maxHp: d.hp, dispHp: d.hp, hitFlash: 0,
      dmg: d.dmg, spd: d.spd,
      range: d.range, atkRate: d.atkRate,
      r: d.r, type: d.type, prio: d.prio || 'unit',
      color: d.color, emoji: d.emoji,
      lastAtk: 0, alive: true,
      stun: 0, dmgMult: 1, slow: 0,
      special: d.special || null,
      stunDur: d.stunDur || 0, stunChance: d.stunChance || 1,
      gasR: d.gasR || 0, gasDmg: d.gasDmg || 0,
      healR: d.healR || 0, healAmt: d.healAmt || 0,
      buffR: d.buffR || 0, buffMult: d.buffMult || 1,
      sonicR: d.sonicR || 0, lassoR: d.lassoR || 0,
      sweepR: d.sweepR || 0, slowR: d.slowR || 0,
      slowF: d.slowF || 1, slowDur: d.slowDur || 0,
      pullDist: d.pullDist || 0, dodgeChance: d.dodgeChance || 0,
      drainPct: d.drainPct || 0,
      waypoints: [],
    });
  }
}

// ── Spell ────────────────────────────────────────────────────
export function doSpell(key, x, y, team) {
  const d = CARDS[key];
  SFX.spell(); triggerShake(5, .3);
  G.efx.push({ x, y, r: d.aoe, life: .6, maxLife: .6, type: 'boom', color: d.color });
  G.units.forEach(u => {
    if (u.team !== team && dst(u, { x, y }) < d.aoe + u.r) { dealDmg(u, d.dmg); }
  });
  G.towers.forEach(t => {
    if (t.team !== team && dst(t, { x, y }) < d.aoe + t.r) { t.hp = Math.max(0, t.hp - d.dmg); if (!t.hp) t.alive = false; }
  });
}

// ── River Pathfinding ────────────────────────────────────────
export function getWaypoint(unit, target) {
  const ty = target.y;
  const crossingDown = (unit.y < RIVER_Y - 28 && ty > RIVER_Y + 28);
  const crossingUp = (unit.y > RIVER_Y + 28 && ty < RIVER_Y - 28);
  const needCross = crossingDown || crossingUp;
  if (!needCross) return { x: target.x, y: target.y };
  if (onBridge(unit.x)) return { x: target.x, y: target.y };
  // nearest bridge
  const nb = BRIDGES.reduce((a, b) => Math.abs(a.cx - unit.x) < Math.abs(b.cx - unit.x) ? a : b);
  const bY = crossingDown ? RIVER_Y - 10 : RIVER_Y + 10;
  return { x: nb.cx, y: bY };
}

// ── Combat: Deal Damage ──────────────────────────────────────
export function dealDmg(target, dmg) {
  const isTower = !!target.kind;
  if (!isTower && target.dodgeChance && Math.random() < target.dodgeChance) {
    G.efx.push({ x: target.x, y: target.y - 18, life: .5, maxLife: .5, type: 'text', txt: 'ESQUIVOU', color: '#f1c40f' });
    return;
  }
  const was = (target.hp <= 0);
  target.hp -= dmg;
  if (target.hp <= 0) {
    target.hp = 0;
    if (!was) {
      target.alive = false;
      if (isTower) {
        SFX.towerDown(); triggerShake(12, .55);
        // Flash tela + muita faisca ao destruir torre
        G.efx.push({ x: target.x, y: target.y, life: .22, maxLife: .22, type: 'flash' });
        for (let i = 0; i < 22; i++) { const a = Math.random() * Math.PI * 2, s = 55 + rnd(110); G.efx.push({ x: target.x, y: target.y, life: .7, maxLife: .7, type: 'spark', vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, color: i % 2 ? '#f39c12' : '#e74c3c' }); }
        for (let i = 0; i < 6; i++) { const a = Math.random() * Math.PI * 2, s = 20 + rnd(40); G.efx.push({ x: target.x, y: target.y, life: .5, maxLife: .5, type: 'puff', vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, r: target.r * .9 }); }
      } else {
        // Morte de unidade: guarda fantasma para animacao de saida
        G.dying.push({ ...target, deathT: .28, deathMax: .28 });
        // Nuvem de poeira
        for (let i = 0; i < 7; i++) { const a = Math.random() * Math.PI * 2, s = 16 + rnd(28); G.efx.push({ x: target.x, y: target.y, life: .32, maxLife: .32, type: 'puff', vx: Math.cos(a) * s, vy: Math.sin(a) * s - 18, r: target.r * .7 }); }
      }
    }
  } else {
    if (isTower) { SFX.towerHit(); triggerShake(2.5, .12); } else SFX.hit();
  }
  // Hit flash na unidade (nao torres)
  if (!isTower) target.hitFlash = 0.1;
  for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2, s = 35 + rnd(55); G.efx.push({ x: target.x, y: target.y, life: .28, maxLife: .28, type: 'spark', vx: Math.cos(a) * s, vy: Math.sin(a) * s - 25, color: '#ffe066' }); }
  G.efx.push({ x: target.x, y: target.y, life: .12, maxLife: .12, type: 'hit' });
  G.efx.push({ x: target.x + (Math.random() - .5) * 16, y: target.y - (target.r || 28) - 4, life: .85, maxLife: .85, type: 'dmg', val: dmg, vy: -38 - rnd(18), big: isTower });
}

// ── Apply Special ────────────────────────────────────────────
export function applySpecial(unit, target) {
  const sp = unit.special; if (!sp) return;
  const foe = unit.team === 'player' ? 'enemy' : 'player';
  const ally = unit.team;
  if (sp === 'stun' && Math.random() < (unit.stunChance || 1)) {
    target.stun = unit.stunDur;
    G.efx.push({ x: target.x, y: target.y - 20, life: .8, maxLife: .8, type: 'text', txt: 'STUN', color: '#fff' });
  }
  if (sp === 'gas') {
    G.units.filter(u => u.alive && u.team === foe && dst(u, target) < unit.gasR).forEach(u => dealDmg(u, unit.gasDmg));
    G.efx.push({ x: target.x, y: target.y, r: unit.gasR, life: .5, maxLife: .5, type: 'gas' });
  }
  if (sp === 'heal') {
    G.units.filter(u => u.alive && u.team === ally && dst(u, unit) < unit.healR).forEach(u => { u.hp = Math.min(u.maxHp, u.hp + unit.healAmt); });
    G.efx.push({ x: unit.x, y: unit.y, r: unit.healR, life: .4, maxLife: .4, type: 'heal' });
  }
  if (sp === 'buff') {
    G.units.filter(u => u.alive && u.team === ally && dst(u, unit) < unit.buffR).forEach(u => { u.dmgMult = unit.buffMult; });
    G.efx.push({ x: unit.x, y: unit.y, r: unit.buffR, life: .4, maxLife: .4, type: 'buff' });
  }
  if (sp === 'sonic') {
    G.units.filter(u => u.alive && u.team === foe && dst(u, unit) < unit.sonicR).forEach(u => { u.stun = unit.stunDur; });
    G.efx.push({ x: unit.x, y: unit.y, r: unit.sonicR, life: .5, maxLife: .5, type: 'sonic' });
  }
  if (sp === 'lasso') {
    G.units.filter(u => u.alive && u.team === foe && dst(u, unit) < unit.lassoR).forEach(u => { u.stun = unit.stunDur; G.efx.push({ x: u.x, y: u.y - 18, life: .6, maxLife: .6, type: 'text', txt: 'LASSO', color: '#f1c40f' }); });
    G.efx.push({ x: unit.x, y: unit.y, r: unit.lassoR, life: .4, maxLife: .4, type: 'sonic' });
  }
  if (sp === 'sweep') {
    G.units.filter(u => u.alive && u.team === foe && dst(u, unit) < unit.sweepR).forEach(u => dealDmg(u, unit.dmg * .5));
    G.efx.push({ x: unit.x, y: unit.y, r: unit.sweepR, life: .35, maxLife: .35, type: 'boom', color: '#78909c' });
  }
  if (sp === 'slow') {
    G.units.filter(u => u.alive && u.team === foe && dst(u, unit) < unit.slowR).forEach(u => { u.slow = unit.slowDur; u.slowF = unit.slowF; });
    G.efx.push({ x: unit.x, y: unit.y, r: unit.slowR, life: .45, maxLife: .45, type: 'gas' });
  }
  if (sp === 'pull' && target.x !== undefined) {
    const a = Math.atan2(unit.y - target.y, unit.x - target.x);
    target.x += Math.cos(a) * unit.pullDist * .3;
    target.y += Math.sin(a) * unit.pullDist * .3;
    G.efx.push({ x: target.x, y: target.y - 16, life: .4, maxLife: .4, type: 'text', txt: 'PULL', color: '#00838f' });
  }
  if (sp === 'drain' && unit.drainPct > 0) {
    // Rouba HP do alvo e transfere para si mesmo
    const stolen = Math.floor(unit.dmg * unit.drainPct);
    unit.hp = Math.min(unit.maxHp, unit.hp + stolen);
    G.efx.push({ x: target.x, y: target.y - 16, life: .7, maxLife: .7, type: 'text', txt: '-' + stolen, color: '#ce93d8' });
    G.efx.push({ x: unit.x, y: unit.y - 16, life: .7, maxLife: .7, type: 'text', txt: '+' + stolen, color: '#e91e63' });
  }
  if (sp === 'pilintra') {
    // Cura aliados proximos
    G.units.filter(u => u.alive && u.team === ally && dst(u, unit) < unit.healR).forEach(u => {
      u.hp = Math.min(u.maxHp, u.hp + unit.healAmt);
      G.efx.push({ x: u.x, y: u.y - 18, life: .8, maxLife: .8, type: 'text', txt: '+' + unit.healAmt, color: '#b39ddb' });
    });
    // Teleporte — avanca ou recua aleatoriamente
    const forward = Math.random() < 0.65;
    const dashDist = rand(60, 130);
    const dy = (unit.team === 'player' ? -1 : 1) * (forward ? dashDist : -dashDist);
    unit.y = Math.max(ARENA_TOP + unit.r, Math.min(ARENA_BOT - unit.r, unit.y + dy));
    unit.x = Math.max(unit.r, Math.min(W - unit.r, unit.x + rnd(40) - 20));
    G.efx.push({ x: unit.x, y: unit.y, r: 42, life: .45, maxLife: .45, type: 'sonic' });
    G.efx.push({ x: unit.x, y: unit.y - 22, life: .9, maxLife: .9, type: 'text', txt: 'TELEPORT', color: '#ce93d8' });
  }
}

// ── Find Target ──────────────────────────────────────────────
export function findTarget(unit) {
  const foe = unit.team === 'player' ? 'enemy' : 'player';
  let best = null, bd = Infinity;
  const add = (o) => { const d = dst(unit, o); if (d < bd) { bd = d; best = { ref: o, d }; } };
  if (unit.prio === 'building') G.towers.filter(t => t.alive && t.team === foe).forEach(add);
  else { G.units.filter(u => u.alive && u.team === foe).forEach(add); G.towers.filter(t => t.alive && t.team === foe).forEach(add); }
  if (!best) G.units.filter(u => u.alive && u.team === foe).forEach(add);
  return best;
}

// ── Update Units ─────────────────────────────────────────────
export function updateUnits(dt, now) {
  G.units.forEach(unit => {
    if (!unit.alive) return;
    // Smooth HP bar tween
    if (unit.dispHp === undefined) unit.dispHp = unit.hp;
    unit.dispHp += (unit.hp - unit.dispHp) * Math.min(1, dt * 9);
    // Hit flash decay
    if (unit.hitFlash > 0) unit.hitFlash -= dt;
    if (unit.stun > 0) { unit.stun -= dt; return; }
    if (unit.slow > 0) { unit.slow -= dt; }
    const found = findTarget(unit);
    if (!found) return;
    const { ref, d } = found;
    const tR = ref.r || 28, reach = unit.range + tR;
    if (d <= reach) {
      const cd = 1000 / unit.atkRate;
      if (now - unit.lastAtk >= cd) {
        unit.lastAtk = now;
        const dmg = Math.floor(unit.dmg * (unit.dmgMult || 1));
        if (unit.type === 'ranged') {
          if (unit.team === 'player') SFX.shoot();
          G.projs.push({ x: unit.x, y: unit.y, tgt: ref, spd: 230, dmg, team: unit.team, color: unit.color, alive: true, isTower: false, trail: [] });
        } else { dealDmg(ref, dmg); }
        applySpecial(unit, ref);
      }
    } else {
      const effSpd = unit.slow > 0 ? unit.spd * unit.slowF : unit.spd;
      const wp = getWaypoint(unit, ref);
      const a = Math.atan2(wp.y - unit.y, wp.x - unit.x);
      const prevY = unit.y;
      unit.x += Math.cos(a) * effSpd * dt;
      unit.y += Math.sin(a) * effSpd * dt;
      unit.x = Math.max(unit.r, Math.min(W - unit.r, unit.x));
      unit.y = Math.max(ARENA_TOP + unit.r, Math.min(ARENA_BOT - unit.r, unit.y));
      // Colisao com rio: bloquear travessia fora das pontes
      const RZONE = 12;
      if (!onBridge(unit.x)) {
        const crossedDown = prevY < RIVER_Y - RZONE && unit.y > RIVER_Y - RZONE;
        const crossedUp = prevY > RIVER_Y + RZONE && unit.y < RIVER_Y + RZONE;
        if (crossedDown) unit.y = RIVER_Y - RZONE - 1;
        else if (crossedUp) unit.y = RIVER_Y + RZONE + 1;
      }
      // Colisao com obstaculos
      if (G.obstacles) {
        G.obstacles.forEach(ob => {
          if (unit.x + unit.r > ob.x && unit.x - unit.r < ob.x + ob.w && unit.y + unit.r > ob.y && unit.y - unit.r < ob.y + ob.h) {
            const ox = Math.min(unit.x + unit.r - ob.x, ob.x + ob.w - (unit.x - unit.r));
            const oy = Math.min(unit.y + unit.r - ob.y, ob.y + ob.h - (unit.y - unit.r));
            if (ox < oy) { unit.x += (unit.x < ob.x + ob.w / 2) ? -ox : ox; }
            else { unit.y += (unit.y < ob.y + ob.h / 2) ? -oy : oy; }
          }
        });
      }
    }
  });
  G.units = G.units.filter(u => u.alive);
  // Atualiza animacoes de morte
  G.dying.forEach(d => { d.deathT -= dt; });
  G.dying = G.dying.filter(d => d.deathT > 0);
}

// ── Update Projectiles ───────────────────────────────────────
export function updateProjectiles(dt) {
  G.projs.forEach(p => {
    if (!p.alive) return;
    if (!p.tgt.alive) { p.alive = false; return; }
    // Grava trail antes de mover
    if (p.trail) { p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 9) p.trail.shift(); }
    const d = dst(p, p.tgt);
    if (d < 8) { dealDmg(p.tgt, p.dmg); p.alive = false; }
    else { const a = Math.atan2(p.tgt.y - p.y, p.tgt.x - p.x); p.x += Math.cos(a) * p.spd * dt; p.y += Math.sin(a) * p.spd * dt; }
  });
  G.projs = G.projs.filter(p => p.alive);
}

// ── Update Towers ────────────────────────────────────────────
export function updateTowers(now) {
  G.towers.forEach(tw => {
    if (!tw.alive) return;
    const foe = tw.team === 'player' ? 'enemy' : 'player';
    const inR = G.units.filter(u => u.alive && u.team === foe && dst(tw, u) <= tw.range);
    if (inR.length && now - tw.lastShot >= 900) {
      tw.lastShot = now;
      const tgt = inR.reduce((a, b) => dst(tw, a) < dst(tw, b) ? a : b);
      G.projs.push({ x: tw.x, y: tw.y, tgt, spd: 270, dmg: 88, team: tw.team, color: tw.team === 'player' ? '#5dade2' : '#f1948a', alive: true, isTower: true, trail: [] });
    }
  });
}

// ── Update AI ────────────────────────────────────────────────
export function updateAI(dt) {
  if (!APP || APP.mode === 'online') return;
  G.aiTimer += dt;
  if (G.aiTimer < G.aiNext) return;
  G.aiTimer = 0; G.aiNext = rand(currentDiff.aiMin, currentDiff.aiMax);
  for (let attempt = 0; attempt < 4; attempt++) {
    const key = G.p2Deck[G.p2DeckIdx % G.p2Deck.length];
    const d = CARDS[key];
    G.p2DeckIdx++; // avanca 1 na tentativa
    if (!d || G.p2Elixir < d.cost) continue;
    G.p2Elixir -= d.cost;
    G.p2DeckIdx += (d.deckAdvance || 1) - 1; // avanca extra se carta especial
    if (d.type === 'spell') {
      let ref;
      if (currentDiff.aiSmart) {
        // IA inteligente: mira na unidade mais avancada do jogador
        const targets = G.units.filter(u => u.alive && u.team === 'player');
        if (targets.length) {
          ref = targets.reduce((best, u) => u.y < best.y ? u : best, targets[0]);
        } else {
          ref = G.towers.find(t => t.team === 'player' && t.alive);
        }
      } else {
        const targets = G.units.filter(u => u.team === 'player');
        ref = targets.length ? targets[0] : G.towers.find(t => t.team === 'player' && t.alive);
      }
      const scatter = currentDiff.aiSmart ? 16 : 36;
      if (ref) doSpell(key, ref.x + rnd(scatter) - scatter / 2, ref.y + rnd(scatter) - scatter / 2, 'enemy');
    } else {
      let x, y = rand(ARENA_TOP + ARENA_H * .08, RIVER_Y - 20);
      if (currentDiff.aiSmart) {
        // IA inteligente: flanqueia o lado com menos unidades inimigas
        const leftCount = G.units.filter(u => u.alive && u.team === 'player' && u.x < W / 2).length;
        const goLeft = leftCount <= G.units.filter(u => u.alive && u.team === 'player' && u.x >= W / 2).length;
        x = goLeft ? rand(55, 175) : rand(245, 365);
      } else {
        x = Math.random() < .5 ? rand(60, 160) : rand(250, 360);
      }
      spawnUnit(key, x, y, 'enemy');
    }
    break;
  }
}

// ── Check Win ────────────────────────────────────────────────
export function checkWin() {
  if (!APP) return;
  const pk = G.towers.find(t => t.team === 'player' && t.kind === 'king');
  const ek = G.towers.find(t => t.team === 'enemy' && t.kind === 'king');
  const prev = G.phase;
  if (!pk.alive) G.phase = 'lose';
  else if (!ek.alive) G.phase = 'win';
  else if (G.time <= 0) {
    const pa = G.towers.filter(t => t.team === 'player' && t.alive).length;
    const ea = G.towers.filter(t => t.team === 'enemy' && t.alive).length;
    G.phase = pa > ea ? 'win' : ea > pa ? 'lose' : 'draw';
  }
  if (G.phase !== prev && G.phase !== 'playing') {
    // Notify main.js to handle battle end (stats, ranking, screen transition)
    // All stat changes (wins, trophies, diamonds, XP) are done in main.js onBattleEnd
    if (_onBattleEnd) _onBattleEnd(G.phase);
  }
}
