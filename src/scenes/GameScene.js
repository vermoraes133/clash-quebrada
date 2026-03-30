// ================================================================
//  GameScene.js — MAXIMUM QUALITY rendering pipeline
//  3x resolution, 6-layer multi-pass compositing, bloom,
//  color grading, chromatic aberration, slow-motion, camera
// ================================================================

import Phaser from 'phaser';
import { APP, saveData } from '../state/GameState.js';
import { CARDS, SHOP_CARD_KEYS } from '../config/cards.js';
import {
  W, H, ARENA_TOP, ARENA_BOT, ARENA_H, RIVER_Y, P1_UI_H, P2_UI_H,
  SAVE_KEY, DEFAULT_DECK, TUT_STEPS, ARENA_THEMES
} from '../config/constants.js';
import {
  G, newBattle, updateUnits, updateProjectiles, updateTowers,
  updateAI, checkWin, spawnUnit, getCardLevel, getAllKeys, getCardScaled,
  currentTheme, currentDiff, setCurrentDiff, addXPtoCards,
  triggerShake, shakeAmt, shakeT, updateShake, resetShake,
  rnd, rand, dst, makeTowers, setupThemeObstacles, getNextCard
} from '../systems/BattleLogic.js';
import { SFX, MUSIC, getAC, isMuted, setMuted } from '../systems/AudioSystem.js';
import {
  sendOnlineDeploy, getOpponentName, getRematchPending,
  requestRematch, declineRematch, cleanupOnline,
  enterMatchLobby, updateRanking, fbLoadRanking, fbSaveUser,
  _gpUpdate
} from '../systems/OnlineSync.js';
import { drawArena } from '../ui/DrawArena.js';
import { drawTower, drawUnit, drawProjectile, drawEffects } from '../ui/DrawEntities.js';
import { drawP1UI, drawP2UI, drawHUD, drawDeployZone, drawBattleOver } from '../ui/DrawUI.js';
import { drawMenu, drawDeckSelect, drawTutorial, drawResult, drawRanking, drawShop } from '../ui/DrawScreens.js';

// ── Rendering constants ──
const DPR = Math.min(window.devicePixelRatio || 1, 3); // Up to 3x
const RW = Math.round(W * DPR);
const RH = Math.round(H * DPR);

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    // ── Main canvas (high-res) ──
    this._cv = _makeCanvas(RW, RH);
    this._ctx = this._cv.getContext('2d');
    this._ctx.scale(DPR, DPR);

    // ── Bloom buffer ──
    this._bloomCv = _makeCanvas(RW / 2, RH / 2); // half-res for blur perf
    this._bloomCtx = this._bloomCv.getContext('2d');

    // ── Output canvas (display size) ──
    this._outCv = _makeCanvas(W, H);
    this._outCtx = this._outCv.getContext('2d');

    // Register as Phaser texture
    if (this.textures.exists('frame')) this.textures.remove('frame');
    this.textures.addCanvas('frame', this._outCv);
    this._img = this.add.image(W / 2, H / 2, 'frame');

    // ── State ──
    this.mouseX = 0; this.mouseY = 0;
    this.menuBtn = []; this.deckBtn = []; this.shopBtn = [];
    this.shopScrollY = 0; this._shopTouchStartY = null;

    // ── Camera state ──
    this.camZoom = 1; this.camTargetZoom = 1;
    this.camX = 0; this.camY = 0;
    this.camTargetX = 0; this.camTargetY = 0;

    // ── Slow-motion ──
    this.slowMo = 1; this.slowMoTimer = 0;

    // ── Cinematic bars ──
    this.cineBar = 0; this.cineBarTarget = 0;

    // ── Kill feed ──
    this.killFeed = []; // {text, time, color}
    this.comboCount = 0; this.comboTimer = 0;

    // ── Film grain seed ──
    this._grainSeed = 0;

    // ── Previous frame for temporal AA ──
    this._prevFrame = _makeCanvas(W, H);
    this._prevCtx = this._prevFrame.getContext('2d');

    // ── Audio analyser for reactive visuals ──
    try {
      const ac = getAC();
      this._analyser = ac.createAnalyser();
      this._analyser.fftSize = 256;
      this._freqData = new Uint8Array(this._analyser.frequencyBinCount);
      // Connect to destination (passive listen)
    } catch (e) { this._analyser = null; }

    // ── Input ──
    this._deckTouchStartY = null;
    this.input.on('pointermove', p => {
      this.mouseX = p.x; this.mouseY = p.y;
      // Touch drag scroll for shop
      if (APP.screen === 'shop' && this._shopTouchStartY !== null && p.isDown) {
        this.shopScrollY = Math.max(0, this.shopScrollY - (p.y - this._shopTouchStartY));
        this._shopTouchStartY = p.y;
      }
      // Touch drag scroll for deck select
      if (APP.screen === 'deckSelect' && this._deckTouchStartY !== null && p.isDown) {
        APP._deckScroll = Math.max(0, (APP._deckScroll || 0) - (p.y - this._deckTouchStartY));
        this._deckTouchStartY = p.y;
      }
    });
    this.input.on('pointerdown', p => {
      if (APP.screen === 'shop') this._shopTouchStartY = p.y;
      if (APP.screen === 'deckSelect') this._deckTouchStartY = p.y;
      this.handleClick(p.x, p.y);
    });
    this.input.on('wheel', (ptr, gos, dx, dy) => {
      if (APP.screen === 'shop') this.shopScrollY = Math.max(0, this.shopScrollY + dy * 0.45);
      if (APP.screen === 'deckSelect') APP._deckScroll = (APP._deckScroll || 0) + dy * 0.45;
    });
    this.input.on('pointerup', () => { this._shopTouchStartY = null; this._deckTouchStartY = null; });
    this.input.once('pointerdown', () => { try { getAC(); } catch(e){} });

    if (APP.screen === 'menu') { MUSIC.stop(); _gpUpdate('menu'); }
  }

  // ════════════════════════════════════════════════════════════
  //  UPDATE
  // ════════════════════════════════════════════════════════════
  update(time, delta) {
    let dt = Math.min(delta / 1000, 0.1);
    const ctx = this._ctx;
    if (!ctx) return;

    // ── Slow-motion ──
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt;
      this.slowMo = 0.25;
      if (this.slowMoTimer <= 0) this.slowMo = 1;
    }
    const gameDt = dt * this.slowMo;

    // ── Battle logic ──
    if (APP.screen === 'battle' && G && G.phase === 'playing') {
      G.time -= gameDt;
      G.p1Elixir = Math.min(10, G.p1Elixir + 1.1 * gameDt);
      G.p2Elixir = Math.min(10, G.p2Elixir + 1.1 * (currentDiff ? currentDiff.elixirMult : 1) * gameDt);
      if (G.units) MUSIC.setIntensity(G.time > 150 ? 0 : (G.units.length > 4 || G.time < 90) ? 2 : 1);
      updateAI(gameDt);
      updateUnits(gameDt, time);
      updateTowers(time);
      updateProjectiles(gameDt);
      updateShake(gameDt);
      checkWin();
      if (G.units) G.units.forEach(u => {
        if (u.dispHp === undefined) u.dispHp = u.hp;
        u.dispHp += (u.hp - u.dispHp) * Math.min(1, gameDt * 8);
      });
    }

    // ── Camera smooth ──
    this.camZoom += (this.camTargetZoom - this.camZoom) * 0.08;
    this.camX += (this.camTargetX - this.camX) * 0.06;
    this.camY += (this.camTargetY - this.camY) * 0.06;
    this.cineBar += (this.cineBarTarget - this.cineBar) * 0.1;

    // ── Camera logic ──
    if (APP.screen === 'battle' && G) {
      // Zoom in when 1 tower left
      const playerTowers = G.towers ? G.towers.filter(t => t.team === 'player' && t.alive).length : 3;
      const enemyTowers = G.towers ? G.towers.filter(t => t.team === 'enemy' && t.alive).length : 3;
      if (playerTowers <= 1 || enemyTowers <= 1) this.camTargetZoom = 1.08;
      else this.camTargetZoom = 1;
    }

    // ── Kill feed / combo decay ──
    this.killFeed = this.killFeed.filter(k => time - k.time < 3000);
    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.comboCount = 0; }

    // ── Audio analysis ──
    let bassLevel = 0, midLevel = 0;
    if (this._analyser && this._freqData) {
      try {
        this._analyser.getByteFrequencyData(this._freqData);
        for (let i = 0; i < 4; i++) bassLevel += this._freqData[i];
        bassLevel /= (4 * 255);
        for (let i = 4; i < 20; i++) midLevel += this._freqData[i];
        midLevel /= (16 * 255);
      } catch(e) { bassLevel = 0; midLevel = 0; }
    }

    // ════════════════════════════════════════════════════════════
    //  RENDER PIPELINE
    // ════════════════════════════════════════════════════════════

    // ── Pass 1: Main render at 3x ──
    ctx.save();
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
        this._drawBattle(ctx, gameDt, time, bassLevel);
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
    ctx.restore();

    // ── Pass 2: Downscale 3x to output ──
    const out = this._outCtx;
    out.clearRect(0, 0, W, H);
    out.imageSmoothingEnabled = true;
    out.imageSmoothingQuality = 'high';
    out.drawImage(this._cv, 0, 0, RW, RH, 0, 0, W, H);

    // ── Pass 3: Bloom SUTIL (battle only) ──
    if (APP.screen === 'battle') {
      this._applyBloom(out);
    }

    // ── Pass 4: Cinematic bars ──
    if (this.cineBar > 0.5) {
      const barH = this.cineBar;
      out.fillStyle = '#000';
      out.fillRect(0, 0, W, barH);
      out.fillRect(0, H - barH, W, barH);
    }

    // (Temporal AA and film grain removed — they caused haze)

    // ── Refresh Phaser texture ──
    const tex = this.textures.get('frame');
    if (tex) tex.refresh();

    // ── Phaser camera shake ──
    if (APP.screen === 'battle' && shakeAmt > 0) {
      this.cameras.main.shake(80, shakeAmt * 0.003);
    }

    // ── Phaser camera zoom ──
    if (Math.abs(this.camZoom - 1) > 0.001) {
      this.cameras.main.setZoom(this.camZoom);
    } else {
      this.cameras.main.setZoom(1);
    }
  }

  // ════════════════════════════════════════════════════════════
  //  BATTLE RENDER
  // ════════════════════════════════════════════════════════════
  _drawBattle(ctx, dt, time, bassLevel) {
    if (!G) return;

    ctx.save();
    ctx.beginPath(); ctx.rect(0, ARENA_TOP, W, ARENA_H); ctx.clip();

    // Shake
    if (shakeAmt > 0) {
      // Perlin-style shake (smoother than random)
      const sx = Math.sin(time * 0.05) * shakeAmt;
      const sy = Math.cos(time * 0.07) * shakeAmt;
      ctx.translate(sx, sy);
    }

    // Arena
    drawArena(ctx, currentTheme, G.obstacles);

    // Vignette arena
    const _vg = ctx.createRadialGradient(W/2, (ARENA_TOP+ARENA_BOT)/2, ARENA_H*.18, W/2, (ARENA_TOP+ARENA_BOT)/2, ARENA_H*.75);
    _vg.addColorStop(0, 'rgba(0,0,0,0)'); _vg.addColorStop(1, 'rgba(0,0,0,.5)');
    ctx.fillStyle = _vg; ctx.fillRect(0, ARENA_TOP, W, ARENA_H);

    // Towers
    if (G.towers) G.towers.forEach(t => { if (t) drawTower(ctx, t); });

    // Deploy zone
    drawDeployZone(ctx, G, this.mouseX, this.mouseY);

    // Dying ghosts
    if (G.dying) G.dying.forEach(d => {
      if (!d) return;
      const a = d.deathT / (d.deathMax || 1);
      ctx.save(); ctx.globalAlpha = a;
      ctx.translate(d.x, d.y); ctx.scale(a, a); ctx.translate(-d.x, -d.y);
      drawUnit(ctx, d, getCardLevel);
      ctx.restore();
    });

    // Units
    if (G.units) G.units.forEach(u => { if (u && u.alive) drawUnit(ctx, u, getCardLevel); });

    // Water reflections
    if (G.units) this._drawWaterReflections(ctx, time);

    // Projectiles
    if (G.projs) G.projs.forEach(p => { if (p && p.alive) drawProjectile(ctx, p); });

    ctx.restore();

    // Effects (outside clip)
    drawEffects(ctx, G, dt);

    // HUD & UI
    drawHUD(ctx, G, APP.mode || 'solo', currentDiff);
    drawP2UI(ctx, G, APP.mode || 'solo', getOpponentName());
    drawP1UI(ctx, G, this.mouseX, this.mouseY, getCardLevel, isMuted());

    // Kill feed
    this._drawKillFeed(ctx, time);

    // Combo counter
    if (this.comboCount >= 2) this._drawComboCounter(ctx, time);

    // Battle over
    if (G.phase !== 'playing') drawBattleOver(ctx, G, getOpponentName());
  }

  // ── Water reflections ──
  _drawWaterReflections(ctx, time) {
    const reflectY = RIVER_Y;
    ctx.save();
    ctx.globalAlpha = 0.2;
    if (G.units) G.units.forEach(u => {
      if (!u || !u.alive) return;
      const dist = Math.abs(u.y - reflectY);
      if (dist > 40) return;
      const ry = reflectY + (reflectY - u.y);
      const wave = Math.sin(time * 0.003 + u.x * 0.05) * 2;
      ctx.save();
      ctx.translate(u.x + wave, ry);
      ctx.scale(1, -0.6);
      ctx.translate(-u.x, -ry);
      ctx.globalAlpha = 0.15 * (1 - dist / 40);
      ctx.fillStyle = u.color || '#888';
      ctx.beginPath(); ctx.arc(u.x + wave, ry, u.r || 14, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  // ── Kill feed ──
  _drawKillFeed(ctx, time) {
    this.killFeed.forEach((k, i) => {
      const age = (time - k.time) / 1000;
      const alpha = Math.max(0, 1 - age / 3);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.beginPath(); ctx.roundRect(W - 155, ARENA_TOP + 35 + i * 18, 150, 16, 4); ctx.fill();
      ctx.fillStyle = k.color || '#fff';
      ctx.font = '8px Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(k.text, W - 10, ARENA_TOP + 43 + i * 18);
      ctx.globalAlpha = 1;
    });
  }

  // ── Combo counter ──
  _drawComboCounter(ctx, time) {
    const pulse = 1 + Math.sin(time * 0.008) * 0.1;
    ctx.save();
    ctx.translate(W/2, ARENA_TOP + 50);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 20;
    ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
    ctx.strokeText(`${this.comboCount}x COMBO!`, 0, 0);
    ctx.fillText(`${this.comboCount}x COMBO!`, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Bloom pass ──
  _applyBloom(out) {
    const bc = this._bloomCtx;
    if (!bc) return;
    const bw = this._bloomCv.width, bh = this._bloomCv.height;

    // Downscale + extract only very bright pixels
    bc.clearRect(0, 0, bw, bh);
    bc.filter = 'brightness(2.5) contrast(3)';
    bc.drawImage(this._outCv, 0, 0, W, H, 0, 0, bw, bh);
    bc.filter = 'none';

    // Single blur pass (lighter = less haze)
    bc.filter = 'blur(4px)';
    bc.drawImage(this._bloomCv, 0, 0);
    bc.filter = 'none';

    // Very subtle additive composite
    out.save();
    out.globalCompositeOperation = 'lighter';
    out.globalAlpha = 0.1;
    out.drawImage(this._bloomCv, 0, 0, bw, bh, 0, 0, W, H);
    out.globalAlpha = 1;
    out.globalCompositeOperation = 'source-over';
    out.restore();
  }

  // ── Color grading ──
  _applyColorGrade(out, theme) {
    out.save();
    out.globalCompositeOperation = 'overlay';
    out.globalAlpha = 0.06;
    switch (theme) {
      case 'favela': out.fillStyle = '#ff8c00'; break; // warm orange
      case 'predio': out.fillStyle = '#4488bb'; break; // cool blue
      case 'bosque': out.fillStyle = '#22aa44'; break; // green tint
      case 'rua':    out.fillStyle = '#666666'; break; // desaturated gray
      default:       out.fillStyle = '#000000'; break;
    }
    out.fillRect(0, 0, W, H);
    out.globalAlpha = 1;
    out.globalCompositeOperation = 'source-over';
    out.restore();
  }

  // ── Film grain ──
  _applyFilmGrain(out, dt) {
    this._grainSeed += dt;
    out.save();
    out.globalAlpha = 0.03;
    for (let i = 0; i < 80; i++) {
      const gx = Math.random() * W;
      const gy = Math.random() * H;
      const gs = Math.random() > 0.5 ? 255 : 0;
      out.fillStyle = `rgb(${gs},${gs},${gs})`;
      out.fillRect(gx, gy, 1, 1);
    }
    out.globalAlpha = 1;
    out.restore();
  }

  // ── Trigger slow-motion ──
  triggerSlowMo(duration) {
    this.slowMoTimer = duration || 0.3;
  }

  // ════════════════════════════════════════════════════════════
  //  INPUT (same as before)
  // ════════════════════════════════════════════════════════════
  handleClick(mx, my) {
    try { getAC(); } catch(e) {}

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
      const bbx = W/2 - 90, bby = H/2 - 160 + 320 - 60, bbw = 180, bbh = 40;
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
          if (mx >= W/2-110 && mx <= W/2+110 && my >= _btnY+58 && my <= _btnY+102) { SFX.click(); declineRematch(); }
        } else {
          if (mx >= W/2-110 && mx <= W/2+110 && my >= _btnY && my <= _btnY+48) { SFX.click(); requestRematch(); }
          if (mx >= W/2-110 && mx <= W/2+110 && my >= _btnY+58 && my <= _btnY+102) { SFX.click(); declineRematch(); }
        }
        return;
      }
      [{id:'again',by:_btnY},{id:'menu',by:_btnY+60}].forEach(b => {
        if (mx >= W/2-110 && mx <= W/2+110 && my >= b.by && my <= b.by+50) {
          SFX.click();
          if (b.id === 'again') { APP.tmpDeck = [...APP.progress.deck]; this.startDeckSelect(); }
          else this.goScreen('menu');
        }
      });
      return;
    }

    if (APP.screen === 'ranking') { if (my >= H-52) { SFX.click(); this.goScreen('menu'); } return; }

    if (APP.screen === 'shop') {
      // Se popup aberto, lidar com cliques do popup
      if (APP._shopPopup) {
        this.shopBtn.forEach(b => {
          if (mx >= b.x && mx <= b.x+b.w && my >= b.y && my <= b.y+b.h) {
            SFX.click();
            if (b.key === '__closePopup') { APP._shopPopup = null; return; }
            const d = CARDS[b.key]; if (!d) return;
            const owned = APP.progress.owned || [];
            if (!owned.includes(b.key) && (APP.progress.diamonds||0) >= (d.shopCost||0)) {
              APP.progress.diamonds -= d.shopCost;
              APP.progress.owned = [...owned, b.key];
              SFX.levelUp(); saveData(); fbSaveUser();
              APP._shopPopup = null; // fecha popup apos comprar
            }
          }
        });
        return;
      }
      // Cliques normais da loja
      this.shopBtn.forEach(b => {
        if (mx >= b.x && mx <= b.x+b.w && my >= b.y && my <= b.y+b.h) {
          SFX.click();
          if (b.key === '__back') { this.goScreen('menu'); return; }
          // Abre popup com detalhes da carta
          APP._shopPopup = b.key;
        }
      });
      return;
    }

    if (APP.screen === 'battle' && G && G.phase === 'playing') {
      if (mx >= W-38 && mx <= W-8 && my >= ARENA_BOT+5 && my <= ARENA_BOT+27) { setMuted(!isMuted()); MUSIC.syncMute(); return; }
      if (G.showForfeitConfirm) {
        if (mx >= W/2-115 && mx <= W/2-10 && my >= H/2+14 && my <= H/2+46) {
          G.showForfeitConfirm = false; G.forfeited = true; G.phase = 'lose';
          SFX.lose(); MUSIC.stop();
          APP.battleResult = 'lose'; APP.progress.losses++;
          APP.progress.trophies = Math.max(0, APP.progress.trophies-20);
          addXPtoCards(APP.progress.deck, 10); G.earnedDiamonds = 0;
          updateRanking(); if (APP.mode === 'online') cleanupOnline();
          setTimeout(() => this.goScreen('result'), 1200);
        }
        if (mx >= W/2+10 && mx <= W/2+115 && my >= H/2+14 && my <= H/2+46) G.showForfeitConfirm = false;
        return;
      }
      if (mx >= 4 && mx <= 32 && my >= ARENA_BOT-26 && my <= ARENA_BOT-4) { G.showForfeitConfirm = true; return; }
      const CW=84,CH=74,CS=5,total=4*CW+3*CS,CX0=(W-total)/2,CY=ARENA_BOT+36;
      for (let i = 0; i < 4; i++) {
        const cx = CX0+i*(CW+CS);
        if (mx >= cx && mx <= cx+CW && my >= CY && my <= CY+CH) {
          const d = CARDS[G.p1Hand[i]]; if (d && G.p1Elixir >= d.cost) { G.p1Sel = G.p1Sel===i?null:i; SFX.select(); } return;
        }
      }
      if (G.p1Sel !== null && my >= RIVER_Y-28 && my <= ARENA_BOT) {
        const key = G.p1Hand[G.p1Sel], d = CARDS[key];
        if (d && G.p1Elixir >= d.cost) {
          G.p1Elixir -= d.cost; spawnUnit(key, mx, my, 'player');
          if (APP.mode === 'online') sendOnlineDeploy(key, mx, my);
          // Próxima carta (cartas fortes aparecem menos)
          const _next = getNextCard(G.p1Deck, G.p1DeckIdx);
          G.p1Hand[G.p1Sel] = _next.key;
          G.p1DeckIdx = _next.newIdx + ((d.deckAdvance || 1) - 1);
          G.p1Sel = null;
        }
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  //  NAVIGATION
  // ════════════════════════════════════════════════════════════
  goScreen(s) {
    APP.screen = s;
    if (s === 'battle') { MUSIC.start(); _gpUpdate(APP.mode === 'online' ? 'online' : 'solo'); this.cineBarTarget = 25; setTimeout(() => { this.cineBarTarget = 0; }, 2000); }
    if (s === 'menu') { MUSIC.stop(); _gpUpdate('menu'); }
    if (s === 'shop') this.shopScrollY = 0;
    if (s === 'ranking') fbLoadRanking();
    if (s === 'result') { this.cineBarTarget = 20; setTimeout(() => { const el = document.getElementById('feedbackOverlay'); if (el) el.classList.add('show'); }, 3500); }
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
        while (APP.tmpDeck.length < 8) APP.tmpDeck.push(_ak[Math.floor(Math.random()*_ak.length)]);
        APP.progress.deck = [...APP.tmpDeck]; saveData();
        if (APP.progress.isNew) { APP.progress.isNew = false; this.goScreen('tutorial'); }
        else this.startBattle();
      }
    }, 1000);
    this.goScreen('deckSelect');
  }

  startBattle() {
    clearInterval(APP.deckTick); APP.tutStep = 0;
    newBattle(); this.goScreen('battle');
  }

  shutdown() {
    if (this.textures.exists('frame')) this.textures.remove('frame');
    this._cv = null; this._ctx = null; this._outCv = null; this._outCtx = null;
    this._bloomCv = null; this._bloomCtx = null;
  }
}

// ── Helper ──
function _makeCanvas(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  return cv;
}
