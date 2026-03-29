// ================================================================
//  GameScene.js — Unified Canvas2D rendering scene
//  ALL screens (menu, deck, tutorial, battle, result, ranking, shop)
//  rendered via offscreen Canvas2D for perfect visual parity with
//  the original game. Phaser handles only scaling and input.
// ================================================================

import Phaser from 'phaser';
import { APP, saveData } from '../state/GameState.js';
import { CARDS, SHOP_CARD_KEYS } from '../config/cards.js';
import {
  W, H, ARENA_TOP, ARENA_BOT, ARENA_H, RIVER_Y, P1_UI_H, P2_UI_H,
  SAVE_KEY, DEFAULT_DECK, TUT_STEPS, ARENA_THEMES
} from '../config/constants.js';

// Systems
import {
  G, newBattle, updateUnits, updateProjectiles, updateTowers,
  updateAI, checkWin, spawnUnit, getCardLevel, getAllKeys, getCardScaled,
  currentTheme, currentDiff, setCurrentDiff, addXPtoCards,
  triggerShake, shakeAmt, shakeT, updateShake, resetShake,
  rnd, rand, dst, makeTowers, setupThemeObstacles
} from '../systems/BattleLogic.js';
import { SFX, MUSIC, getAC, isMuted, setMuted } from '../systems/AudioSystem.js';
import {
  sendOnlineDeploy, getOpponentName, getRematchPending,
  requestRematch, declineRematch, cleanupOnline,
  enterMatchLobby, updateRanking, fbLoadRanking, fbSaveUser,
  _gpUpdate
} from '../systems/OnlineSync.js';

// Canvas2D drawing functions (original high-quality rendering)
import { drawArena } from '../ui/DrawArena.js';
import { drawTower, drawUnit, drawProjectile, drawEffects } from '../ui/DrawEntities.js';
import { drawP1UI, drawP2UI, drawHUD, drawDeployZone, drawBattleOver } from '../ui/DrawUI.js';
import { drawMenu, drawDeckSelect, drawTutorial, drawResult, drawRanking, drawShop } from '../ui/DrawScreens.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // Offscreen Canvas2D
    this._cv = document.createElement('canvas');
    this._cv.width = W;
    this._cv.height = H;
    this._ctx = this._cv.getContext('2d');

    if (this.textures.exists('frame')) this.textures.remove('frame');
    this.textures.addCanvas('frame', this._cv);
    this._img = this.add.image(W / 2, H / 2, 'frame');

    // State
    this.mouseX = 0;
    this.mouseY = 0;
    this.lastTime = 0;
    this.menuBtn = [];
    this.deckBtn = [];
    this.shopBtn = [];
    this.shopScrollY = 0;
    this._shopTouchStartY = null;

    // Input
    this.input.on('pointermove', p => { this.mouseX = p.x; this.mouseY = p.y; });
    this.input.on('pointerdown', p => { this.handleClick(p.x, p.y); });

    // Wheel for shop scroll
    this.input.on('wheel', (pointer, gameObjects, dx, dy) => {
      if (APP.screen === 'shop') {
        this.shopScrollY = Math.max(0, this.shopScrollY + dy * 0.45);
      }
    });

    // Touch drag for shop scroll
    this.input.on('pointerdown', p => {
      if (APP.screen === 'shop') this._shopTouchStartY = p.y;
    });
    this.input.on('pointermove', p => {
      if (APP.screen === 'shop' && this._shopTouchStartY !== null && p.isDown) {
        this.shopScrollY = Math.max(0, this.shopScrollY - (p.y - this._shopTouchStartY));
        this._shopTouchStartY = p.y;
      }
    });
    this.input.on('pointerup', () => { this._shopTouchStartY = null; });

    // Unlock audio on first click
    this.input.once('pointerdown', () => { getAC(); });

    // Start at menu
    if (APP.screen === 'menu') {
      MUSIC.stop();
      _gpUpdate('menu');
    }
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.1);
    const ctx = this._ctx;
    if (!ctx) return;

    // Update battle logic if in battle
    if (APP.screen === 'battle' && G && G.phase === 'playing') {
      G.time -= dt;
      G.p1Elixir = Math.min(10, G.p1Elixir + 1.1 * dt);
      G.p2Elixir = Math.min(10, G.p2Elixir + 1.1 * (currentDiff ? currentDiff.elixirMult : 1) * dt);
      if (G.units) MUSIC.setIntensity(G.time > 150 ? 0 : (G.units.length > 4 || G.time < 90) ? 2 : 1);
      updateAI(dt);
      updateUnits(dt, time);
      updateTowers(time);
      updateProjectiles(dt);
      updateShake(dt);
      checkWin();
      // dispHp tween
      if (G.units) G.units.forEach(u => {
        if (u.dispHp === undefined) u.dispHp = u.hp;
        u.dispHp += (u.hp - u.dispHp) * Math.min(1, dt * 8);
      });
    }

    // Render
    ctx.clearRect(0, 0, W, H);

    switch (APP.screen) {
      case 'menu':
        drawMenu(ctx, APP, this.mouseX, this.mouseY, isMuted(), currentDiff, this.menuBtn);
        break;
      case 'deckSelect':
        drawDeckSelect(ctx, APP, this.mouseX, this.mouseY, getAllKeys, getCardLevel, this.deckBtn);
        break;
      case 'tutorial':
        drawTutorial(ctx, APP);
        break;
      case 'battle':
        this._drawBattle(ctx, dt);
        break;
      case 'result':
        drawResult(ctx, APP, G, APP.wasOnline, getOpponentName(), getRematchPending());
        break;
      case 'ranking':
        drawRanking(ctx, APP, true, false);
        break;
      case 'shop':
        drawShop(ctx, APP, this.shopScrollY, this.shopBtn, this.mouseX, this.mouseY);
        break;
    }

    // Refresh Phaser texture
    const tex = this.textures.get('frame');
    if (tex) tex.refresh();

    // Camera shake during battle
    if (APP.screen === 'battle' && shakeAmt > 0) {
      this.cameras.main.shake(80, shakeAmt * 0.003);
    }
  }

  _drawBattle(ctx, dt) {
    if (!G) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, ARENA_TOP, W, ARENA_H); ctx.clip();
    if (shakeAmt > 0) ctx.translate(rnd(shakeAmt * 2) - shakeAmt, rnd(shakeAmt * 2) - shakeAmt);

    drawArena(ctx, currentTheme, G.obstacles);

    // Vignette
    const _vg = ctx.createRadialGradient(W / 2, (ARENA_TOP + ARENA_BOT) / 2, ARENA_H * .18, W / 2, (ARENA_TOP + ARENA_BOT) / 2, ARENA_H * .75);
    _vg.addColorStop(0, 'rgba(0,0,0,0)'); _vg.addColorStop(1, 'rgba(0,0,0,.5)');
    ctx.fillStyle = _vg; ctx.fillRect(0, ARENA_TOP, W, ARENA_H);

    if (G.towers) G.towers.forEach(t => { if (t) drawTower(ctx, t); });
    drawDeployZone(ctx, G, this.mouseX, this.mouseY);

    if (G.dying) G.dying.forEach(d => {
      if (!d) return;
      const a = d.deathT / (d.deathMax || 1);
      ctx.save(); ctx.globalAlpha = a;
      ctx.translate(d.x, d.y); ctx.scale(a, a); ctx.translate(-d.x, -d.y);
      drawUnit(ctx, d, getCardLevel);
      ctx.restore();
    });

    if (G.units) G.units.forEach(u => { if (u && u.alive) drawUnit(ctx, u, getCardLevel); });
    if (G.projs) G.projs.forEach(p => { if (p && p.alive) drawProjectile(ctx, p); });
    ctx.restore();

    drawEffects(ctx, G, dt);
    drawHUD(ctx, G, APP.mode || 'solo', currentDiff);
    drawP2UI(ctx, G, APP.mode || 'solo', getOpponentName());
    drawP1UI(ctx, G, this.mouseX, this.mouseY, getCardLevel, isMuted());
    if (G.phase !== 'playing') drawBattleOver(ctx, G, getOpponentName());
  }

  // ════════════════════════════════════════════════════════════
  //  INPUT
  // ════════════════════════════════════════════════════════════
  handleClick(mx, my) {
    getAC();

    if (APP.screen === 'menu') {
      this.menuBtn.forEach(b => {
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
          SFX.click();
          if (b.id === 0) { APP.mode = 'solo'; APP.tmpDeck = [...APP.progress.deck]; this.startDeckSelect(); }
          else if (b.id === 2) enterMatchLobby();
          else if (b.id === 3) { APP.tmpDeck = [...APP.progress.deck]; APP.deckTimer = 9999; this.goScreen('deckSelect'); }
          else if (b.id === 4) this.goScreen('ranking');
          else if (b.id === 5) this.goScreen('shop');
          else if (b.id === 6) { const el = document.getElementById('admin'); if (el) el.classList.add('show'); }
          else if (b.id === 99) { setMuted(!isMuted()); MUSIC.syncMute(); }
        }
      });
      return;
    }

    if (APP.screen === 'deckSelect') {
      this.deckBtn.forEach(b => {
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
          SFX.select();
          if (b.key === '__confirm') {
            if (APP.tmpDeck.length >= 1) {
              const _ak = getAllKeys().filter(k => CARDS[k]);
              while (APP.tmpDeck.length < 8) APP.tmpDeck.push(_ak[Math.floor(Math.random() * _ak.length)]);
              APP.progress.deck = [...APP.tmpDeck];
              if (APP.deckTimer === 9999) { saveData(); this.goScreen('menu'); return; }
              saveData();
              if (APP.progress.isNew) { APP.progress.isNew = false; this.goScreen('tutorial'); }
              else this.startBattle();
            }
          } else {
            const idx = APP.tmpDeck.indexOf(b.key);
            if (idx >= 0) APP.tmpDeck.splice(idx, 1);
            else if (APP.tmpDeck.length < 8) APP.tmpDeck.push(b.key);
          }
        }
      });
      return;
    }

    if (APP.screen === 'tutorial') {
      const bbx = W / 2 - 90, bby = H / 2 - 160 + 320 - 60, bbw = 180, bbh = 40;
      if (mx >= bbx && mx <= bbx + bbw && my >= bby && my <= bby + bbh) {
        SFX.click();
        if (APP.tutStep < TUT_STEPS.length - 1) APP.tutStep++;
        else this.startBattle();
      }
      return;
    }

    if (APP.screen === 'result') {
      const _btnY = 326;
      const isOnline = APP.wasOnline || APP.mode === 'online';
      if (isOnline) {
        if (getRematchPending()) {
          if (mx >= W / 2 - 110 && mx <= W / 2 + 110 && my >= _btnY + 58 && my <= _btnY + 102) { SFX.click(); declineRematch(); }
        } else {
          if (mx >= W / 2 - 110 && mx <= W / 2 + 110 && my >= _btnY && my <= _btnY + 48) { SFX.click(); requestRematch(); }
          if (mx >= W / 2 - 110 && mx <= W / 2 + 110 && my >= _btnY + 58 && my <= _btnY + 102) { SFX.click(); declineRematch(); }
        }
        return;
      }
      [{ id: 'again', by: _btnY }, { id: 'menu', by: _btnY + 60 }].forEach(b => {
        if (mx >= W / 2 - 110 && mx <= W / 2 + 110 && my >= b.by && my <= b.by + 50) {
          SFX.click();
          if (b.id === 'again') { APP.tmpDeck = [...APP.progress.deck]; this.startDeckSelect(); }
          else this.goScreen('menu');
        }
      });
      return;
    }

    if (APP.screen === 'ranking') {
      if (my >= H - 52) { SFX.click(); this.goScreen('menu'); }
      return;
    }

    if (APP.screen === 'shop') {
      this.shopBtn.forEach(b => {
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
          SFX.click();
          if (b.key === '__back') { this.goScreen('menu'); return; }
          const d = CARDS[b.key]; if (!d) return;
          const owned = APP.progress.owned || [];
          if (!owned.includes(b.key) && (APP.progress.diamonds || 0) >= (d.shopCost || 0)) {
            APP.progress.diamonds -= d.shopCost;
            APP.progress.owned = [...owned, b.key];
            SFX.levelUp(); saveData(); fbSaveUser();
          }
        }
      });
      return;
    }

    if (APP.screen === 'battle' && G && G.phase === 'playing') {
      // Mute
      if (mx >= W - 38 && mx <= W - 8 && my >= ARENA_BOT + 5 && my <= ARENA_BOT + 27) { setMuted(!isMuted()); MUSIC.syncMute(); return; }
      // Forfeit confirm
      if (G.showForfeitConfirm) {
        if (mx >= W / 2 - 115 && mx <= W / 2 - 10 && my >= H / 2 + 14 && my <= H / 2 + 46) {
          G.showForfeitConfirm = false; G.forfeited = true; G.phase = 'lose';
          SFX.lose(); MUSIC.stop();
          APP.battleResult = 'lose'; APP.progress.losses++;
          APP.progress.trophies = Math.max(0, APP.progress.trophies - 20);
          addXPtoCards(APP.progress.deck, 10); G.earnedDiamonds = 0;
          updateRanking(); if (APP.mode === 'online') cleanupOnline();
          setTimeout(() => this.goScreen('result'), 1200);
        }
        if (mx >= W / 2 + 10 && mx <= W / 2 + 115 && my >= H / 2 + 14 && my <= H / 2 + 46) G.showForfeitConfirm = false;
        return;
      }
      // Forfeit button
      if (mx >= 4 && mx <= 32 && my >= ARENA_BOT - 26 && my <= ARENA_BOT - 4) { G.showForfeitConfirm = true; return; }
      // Card select
      const CW = 84, CH = 74, CS = 5, total = 4 * CW + 3 * CS, CX0 = (W - total) / 2, CY = ARENA_BOT + 36;
      for (let i = 0; i < 4; i++) {
        const cx = CX0 + i * (CW + CS);
        if (mx >= cx && mx <= cx + CW && my >= CY && my <= CY + CH) {
          const d = CARDS[G.p1Hand[i]]; if (d && G.p1Elixir >= d.cost) { G.p1Sel = G.p1Sel === i ? null : i; SFX.select(); } return;
        }
      }
      // Deploy
      if (G.p1Sel !== null && my >= RIVER_Y - 28 && my <= ARENA_BOT) {
        const key = G.p1Hand[G.p1Sel], d = CARDS[key];
        if (d && G.p1Elixir >= d.cost) {
          G.p1Elixir -= d.cost; spawnUnit(key, mx, my, 'player');
          if (APP.mode === 'online') sendOnlineDeploy(key, mx, my);
          const _da = d.deckAdvance || 1;
          G.p1Hand[G.p1Sel] = G.p1Deck[G.p1DeckIdx % G.p1Deck.length];
          G.p1DeckIdx += _da; G.p1Sel = null;
        }
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  //  NAVIGATION
  // ════════════════════════════════════════════════════════════
  goScreen(s) {
    APP.screen = s;
    if (s === 'battle') { MUSIC.start(); _gpUpdate(APP.mode === 'online' ? 'online' : 'solo'); }
    if (s === 'menu') { MUSIC.stop(); _gpUpdate('menu'); }
    if (s === 'shop') this.shopScrollY = 0;
    if (s === 'ranking') fbLoadRanking();
    if (s === 'result') setTimeout(() => {
      // Show feedback overlay
      const el = document.getElementById('feedbackOverlay');
      if (el) el.classList.add('show');
    }, 3500);
  }

  startDeckSelect() {
    APP.deckTimer = 30; APP.tmpDeck = [...APP.progress.deck];
    clearInterval(APP.deckTick);
    APP.deckTick = setInterval(() => {
      if (APP.screen !== 'deckSelect') { clearInterval(APP.deckTick); return; }
      APP.deckTimer--;
      if (APP.deckTimer <= 0) {
        clearInterval(APP.deckTick);
        const _ak = getAllKeys().filter(k => CARDS[k]);
        while (APP.tmpDeck.length < 8) APP.tmpDeck.push(_ak[Math.floor(Math.random() * _ak.length)]);
        APP.progress.deck = [...APP.tmpDeck]; saveData();
        if (APP.progress.isNew) { APP.progress.isNew = false; this.goScreen('tutorial'); }
        else this.startBattle();
      }
    }, 1000);
    this.goScreen('deckSelect');
  }

  startBattle() {
    clearInterval(APP.deckTick);
    APP.tutStep = 0;
    newBattle();
    this.goScreen('battle');
  }

  shutdown() {
    if (this.textures.exists('frame')) this.textures.remove('frame');
    this._cv = null; this._ctx = null;
  }
}
