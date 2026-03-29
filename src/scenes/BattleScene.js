// ================================================================
//  BattleScene.js — Hybrid Canvas2D + Phaser 3 Battle Scene
//
//  Strategy: Render ALL battle visuals to an offscreen Canvas2D
//  (which supports shadowBlur, radialGradient, glow effects) and
//  display it as a Phaser texture. Phaser handles scene management,
//  scaling, and input only.
//
//  This gives pixel-perfect visual parity with the original game.
// ================================================================

import Phaser from 'phaser';
import { APP, saveData } from '../state/GameState.js';
import { CARDS } from '../config/cards.js';
import {
  W, H, ARENA_TOP, ARENA_BOT, ARENA_H, P1_UI_H, P2_UI_H,
  RIVER_Y, BRIDGES
} from '../config/constants.js';
import {
  G, newBattle, updateUnits, updateProjectiles, updateTowers,
  updateAI, checkWin, spawnUnit, getCardLevel, getAllKeys,
  currentTheme, currentDiff, addXPtoCards,
  triggerShake, shakeAmt, shakeT, updateShake, resetShake,
  rnd, rand, dst
} from '../systems/BattleLogic.js';
import { SFX, MUSIC, isMuted, setMuted } from '../systems/AudioSystem.js';
import { sendOnlineDeploy, getOpponentName } from '../systems/OnlineSync.js';

// Canvas2D drawing modules (original high-quality rendering)
import { drawArena } from '../ui/DrawArena.js';
import { drawTower, drawUnit, drawProjectile, drawEffects } from '../ui/DrawEntities.js';
import { drawP1UI, drawP2UI, drawHUD, drawDeployZone, drawBattleOver } from '../ui/DrawUI.js';

// ================================================================
//  BATTLE SCENE
// ================================================================
export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  // ── Lifecycle ────────────────────────────────────────────────
  init(data) {
    data = data || {};
    this._goScreen = data.goScreen || this.registry.get('goScreen') || (() => {});
    this._saveData = data.saveData || this.registry.get('saveData') || (() => {});
  }

  create() {
    // ── Offscreen Canvas2D for ALL rendering ───────────────────
    this._offscreen = document.createElement('canvas');
    this._offscreen.width = W;
    this._offscreen.height = H;
    this._ctx = this._offscreen.getContext('2d');

    // Register as a Phaser CanvasTexture
    if (this.textures.exists('battleFrame')) {
      this.textures.remove('battleFrame');
    }
    this.textures.addCanvas('battleFrame', this._offscreen);
    this._frameImage = this.add.image(W / 2, H / 2, 'battleFrame').setDepth(0);

    // ── Cursor tracking ────────────────────────────────────────
    this.cursorX = 0;
    this.cursorY = 0;

    // ── Input via Phaser (translated to canvas coordinates) ────
    this.input.on('pointermove', (pointer) => {
      this.cursorX = pointer.x;
      this.cursorY = pointer.y;
    });

    this.input.on('pointerdown', (pointer) => {
      this.handlePointerDown(pointer.x, pointer.y);
    });

    // ── Start music ────────────────────────────────────────────
    if (!isMuted()) {
      MUSIC.start();
    }

    // ── Battle-over transition timer ───────────────────────────
    this._battleOverTimer = 0;
    this._battleOverShown = false;
  }

  // ── Update (game loop) ───────────────────────────────────────
  update(time, delta) {
    if (!G) return;

    const dt = delta / 1000;

    // ── Handle battle-over state ───────────────────────────────
    if (G.phase !== 'playing') {
      if (!this._battleOverShown) {
        this._battleOverShown = true;
        this._battleOverTimer = 0;
      }
      this._battleOverTimer += dt;

      // Render the frozen frame + overlay
      this._renderFrame(dt);
      return;
    }

    // ── Timer & Elixir ─────────────────────────────────────────
    G.time -= dt;
    G.p1Elixir = Math.min(10, G.p1Elixir + 1.1 * dt);
    G.p2Elixir = Math.min(10, G.p2Elixir + 1.1 * (currentDiff ? currentDiff.elixirMult : 1) * dt);

    // ── Music intensity ────────────────────────────────────────
    if (G.units) {
      MUSIC.setIntensity(G.time > 150 ? 0 : (G.units.length > 4 || G.time < 90) ? 2 : 1);
    }

    // ── Logic ticks ────────────────────────────────────────────
    updateAI(dt);
    updateUnits(dt, time);
    updateTowers(time);
    updateProjectiles(dt);
    updateShake(dt);
    checkWin();

    // ── Tween dispHp for smooth HP bars ────────────────────────
    if (G.units) {
      G.units.forEach(u => {
        if (u.dispHp === undefined) u.dispHp = u.hp;
        u.dispHp += (u.hp - u.dispHp) * Math.min(1, dt * 8);
      });
    }

    // ── Render everything to offscreen canvas ──────────────────
    this._renderFrame(dt);

    // ── Camera shake via Phaser ────────────────────────────────
    if (shakeAmt > 0) {
      this.cameras.main.shake(80, shakeAmt * 0.003);
    }
  }

  // ================================================================
  //  CORE RENDER — draws everything to offscreen Canvas2D
  // ================================================================
  _renderFrame(dt) {
    const ctx = this._ctx;
    if (!ctx || !G) return;

    // Clear entire canvas
    ctx.clearRect(0, 0, W, H);

    // ── P2 UI background (top bar) ─────────────────────────────
    drawP2UI(ctx, G, (APP && APP.mode) || 'solo', getOpponentName());

    // ── Arena clip region ──────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, ARENA_TOP, W, ARENA_H);
    ctx.clip();

    // ── Camera shake offset ────────────────────────────────────
    if (shakeAmt > 0) {
      ctx.translate(
        rnd(shakeAmt * 2) - shakeAmt,
        rnd(shakeAmt * 2) - shakeAmt
      );
    }

    // ── Arena background ───────────────────────────────────────
    drawArena(ctx, currentTheme, G.obstacles);

    // ── Vignette (radial gradient — the original effect) ───────
    const _vgCx = W / 2;
    const _vgCy = (ARENA_TOP + ARENA_BOT) / 2;
    const _vg = ctx.createRadialGradient(
      _vgCx, _vgCy, ARENA_H * 0.18,
      _vgCx, _vgCy, ARENA_H * 0.75
    );
    _vg.addColorStop(0, 'rgba(0,0,0,0)');
    _vg.addColorStop(1, 'rgba(0,0,0,.5)');
    ctx.fillStyle = _vg;
    ctx.fillRect(0, ARENA_TOP, W, ARENA_H);

    // ── Towers ─────────────────────────────────────────────────
    if (G.towers) {
      G.towers.forEach(t => {
        if (t) drawTower(ctx, t);
      });
    }

    // ── Deploy zone indicator ──────────────────────────────────
    drawDeployZone(ctx, G, this.cursorX, this.cursorY);

    // ── Dying ghosts ───────────────────────────────────────────
    // Note: BattleLogic.updateUnits already manages G.dying lifecycle
    // (push, decay deathT, filter). We only draw them here.
    if (G.dying) {
      G.dying.forEach(d => {
        if (!d) return;
        const progress = 1 - (d.deathT / (d.deathMax || 1));
        const scale = 1 - progress;
        const alpha = scale;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(d.x, d.y);
        ctx.scale(scale, scale);
        ctx.translate(-d.x, -d.y);

        // Draw unit at its position with shrink/fade
        drawUnit(ctx, d, getCardLevel);

        ctx.restore();
      });
    }

    // ── Units ──────────────────────────────────────────────────
    if (G.units) {
      G.units.forEach(u => {
        if (u && u.alive) {
          drawUnit(ctx, u, getCardLevel);
        }
      });
    }

    // ── Projectiles ────────────────────────────────────────────
    if (G.projs) {
      G.projs.forEach(p => {
        if (p && p.alive) {
          drawProjectile(ctx, p);
        }
      });
    }

    ctx.restore(); // end arena clip

    // ── Effects (drawn outside clip so flash covers full arena) ─
    drawEffects(ctx, G, dt);

    // ── HUD (timer, difficulty, forfeit) ───────────────────────
    drawHUD(ctx, G, (APP && APP.mode) || 'solo', currentDiff);

    // ── P1 UI (bottom: elixir, cards, mute) ────────────────────
    drawP1UI(ctx, G, this.cursorX, this.cursorY, getCardLevel, isMuted());

    // ── Battle over overlay ────────────────────────────────────
    if (G.phase !== 'playing') {
      drawBattleOver(ctx, G, getOpponentName());
    }

    // ── Refresh the Phaser texture ─────────────────────────────
    const tex = this.textures.get('battleFrame');
    if (tex) {
      tex.refresh();
    }
  }

  // ================================================================
  //  INPUT HANDLING
  // ================================================================
  handlePointerDown(mx, my) {
    if (!G) return;

    // ── Forfeit confirmation dialog ────────────────────────────
    if (G.showForfeitConfirm) {
      // Confirm button (left)
      if (mx >= W / 2 - 115 && mx <= W / 2 - 10 &&
          my >= H / 2 + 14 && my <= H / 2 + 46) {
        this.doForfeit();
        return;
      }
      // Cancel button (right)
      if (mx >= W / 2 + 10 && mx <= W / 2 + 115 &&
          my >= H / 2 + 14 && my <= H / 2 + 46) {
        G.showForfeitConfirm = false;
        return;
      }
      return; // block all other input during forfeit dialog
    }

    // ── Battle over — ignore input ─────────────────────────────
    if (G.phase !== 'playing') return;

    // ── Mute button (top-right of P1 UI area) ──────────────────
    if (mx >= W - 38 && mx <= W - 8 &&
        my >= ARENA_BOT + 5 && my <= ARENA_BOT + 27) {
      setMuted(!isMuted());
      MUSIC.syncMute();
      return;
    }

    // ── Forfeit button (bottom-left of arena) ──────────────────
    if (mx >= 4 && mx <= 32 &&
        my >= ARENA_BOT - 26 && my <= ARENA_BOT - 4) {
      G.showForfeitConfirm = true;
      return;
    }

    // ── Card selection (bottom panel) ──────────────────────────
    const CW = 84, CH = 74, CS = 5;
    const total = 4 * CW + 3 * CS;
    const CX0 = (W - total) / 2;
    const CY = ARENA_BOT + 36;

    if (my >= CY && my <= CY + CH && G.p1Hand) {
      for (let i = 0; i < 4; i++) {
        const cx = CX0 + i * (CW + CS);
        if (mx >= cx && mx <= cx + CW) {
          this.selectCard(i);
          return;
        }
      }
    }

    // ── Arena deploy ───────────────────────────────────────────
    if (G.p1Sel !== null && G.p1Hand && my >= RIVER_Y - 28 && my <= ARENA_BOT) {
      const key = G.p1Hand[G.p1Sel];
      const d = CARDS[key];
      if (d && G.p1Elixir >= d.cost) {
        G.p1Elixir -= d.cost;
        spawnUnit(key, mx, my, 'player');
        if (APP && APP.mode === 'online') {
          sendOnlineDeploy(key, mx, my);
        }
        const _da = d.deckAdvance || 1;
        if (G.p1Deck && G.p1Deck.length > 0) {
          G.p1Hand[G.p1Sel] = G.p1Deck[G.p1DeckIdx % G.p1Deck.length];
          G.p1DeckIdx += _da;
        }
        G.p1Sel = null;
        SFX.deploy();
      }
    }
  }

  // ── Card selection ───────────────────────────────────────────
  selectCard(index) {
    if (!G) return;
    if (G.showForfeitConfirm) return;
    const hand = G.p1Hand;
    if (!hand || index < 0 || index >= hand.length) return;
    const key = hand[index];
    const d = CARDS[key];
    if (d && G.p1Elixir >= d.cost) {
      G.p1Sel = (G.p1Sel === index) ? null : index;
      SFX.select();
    }
  }

  // ── Forfeit ──────────────────────────────────────────────────
  doForfeit() {
    if (!G) return;
    G.showForfeitConfirm = false;
    G.forfeited = true;
    G.phase = 'lose';
  }

  // ── Cleanup on scene shutdown ────────────────────────────────
  shutdown() {
    // Clean up the offscreen canvas texture
    if (this.textures.exists('battleFrame')) {
      this.textures.remove('battleFrame');
    }
    this._offscreen = null;
    this._ctx = null;
    this._battleOverShown = false;
  }
}
