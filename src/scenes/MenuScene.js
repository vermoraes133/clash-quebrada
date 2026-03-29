// ================================================================
//  MenuScene.js — Main menu (replaces drawMenu from DrawScreens.js)
//  Phaser 3 scene with animated background, starfield, buttons
//  Enhanced: polished title with shadow/glow, styled subtitle
// ================================================================
import Phaser from 'phaser';
import { W, H } from '../config/constants.js';
import { APP } from '../state/GameState.js';
import { SFX, MUSIC, isMuted, setMuted } from '../systems/AudioSystem.js';
import { currentDiff } from '../systems/BattleLogic.js';
import { enterMatchLobby, _gpUpdate } from '../systems/OnlineSync.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    // Stop any lingering music and update presence
    MUSIC.stop();
    _gpUpdate('menu');

    // ── Animated gradient background (via Graphics) ───────────
    this.bgGfx = this.add.graphics();

    // ── Starfield particles ──────────────────────────────────
    // We create 60 small circle textures for stars
    this._stars = [];
    for (let i = 0; i < 60; i++) {
      const sx = Math.sin(i * 127.1) * W * 0.5 + W * 0.5;
      const sy = Math.sin(i * 311.7) * H * 0.5 + H * 0.5;
      const star = this.add.circle(sx, sy, 1, 0xffffff, 0.6);
      star._idx = i;
      this._stars.push(star);
    }

    // ── Sword emoji at top ───────────────────────────────────
    this.add.text(W / 2, 80, '\u2694\uFE0F', {
      fontSize: '44px',
      fontFamily: 'Arial',
    }).setOrigin(0.5).setShadow(0, 0, '#f1c40f', 20, true, true);

    // ── Title with shadow/glow effect ────────────────────────
    // Layer 1: Dark drop shadow
    this.add.text(W / 2 + 2, 130, 'CLASH QUEBRADA', {
      fontSize: '28px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#000000',
    }).setOrigin(0.5).setAlpha(0.5);

    // Layer 2: Golden glow (behind main text)
    this._titleGlow = this.add.text(W / 2, 128, 'CLASH QUEBRADA', {
      fontSize: '28px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#f1c40f',
    }).setOrigin(0.5).setAlpha(0.3);

    // Layer 3: Main title (white with gold shadow)
    this.add.text(W / 2, 128, 'CLASH QUEBRADA', {
      fontSize: '28px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5).setShadow(0, 0, '#f1c40f', 12, true, true);

    // ── Subtitle (styled) ────────────────────────────────────
    const playerName = (APP && APP.account) ? APP.account.name : 'Guerreiro';
    this.add.text(W / 2, 155, `Ola, ${playerName}!`, {
      fontSize: '14px',
      fontFamily: 'Arial',
      fontStyle: 'italic',
      color: '#b8860b',
    }).setOrigin(0.5).setShadow(0, 1, '#000000', 3, true, true);

    // ── Trophies ─────────────────────────────────────────────
    const trophies = (APP && APP.progress) ? APP.progress.trophies : 0;
    this.add.text(W / 2, 178, `\u{1F3C6} ${trophies} trofeus`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#f1c40f',
    }).setOrigin(0.5).setShadow(0, 1, '#000000', 4, true, true);

    // ── Diamonds ─────────────────────────────────────────────
    const diamonds = (APP && APP.progress) ? (APP.progress.diamonds || 0) : 0;
    this.add.text(W / 2, 200, `\u{1F48E} ${diamonds} diamantes`, {
      fontSize: '14px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#00e5ff',
    }).setOrigin(0.5).setShadow(0, 1, '#000000', 3, true, true);

    // ── Stats W/L/D ──────────────────────────────────────────
    const wins = (APP && APP.progress) ? APP.progress.wins : 0;
    const losses = (APP && APP.progress) ? APP.progress.losses : 0;
    const draws = (APP && APP.progress) ? APP.progress.draws : 0;
    this.add.text(W / 2, 218, `${wins}V  ${losses}D  ${draws}E`, {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#888888',
    }).setOrigin(0.5);

    // ── Buttons ──────────────────────────────────────────────
    const diffLabel = currentDiff ? (currentDiff.label || 'Medio') : 'Medio';
    const btnDefs = [
      { label: '\u2694\uFE0F  Jogar Solo',          color: 0xe67e22, hover: 0xe74c3c, id: 0 },
      { label: '\u{1F3DF}\uFE0F  Sala de Desafios', color: 0x27ae60, hover: 0x2ecc71, id: 2 },
      { label: '\u{1F0CF}  Meu Deck',               color: 0x8e44ad, hover: 0x9b59b6, id: 3 },
      { label: '\u{1F3C6}  Ranking',                color: 0x16a085, hover: 0x1abc9c, id: 4 },
      { label: '\u{1F48E}  Loja',                   color: 0x8e44ad, hover: 0xab47bc, id: 5 },
    ];
    if (APP && APP.isAdmin) {
      btnDefs.push({
        label: '\u2699\uFE0F  Admin  [' + diffLabel + ']',
        color: 0x922b21,
        hover: 0xc0392b,
        id: 6,
      });
    }

    this._btnObjects = [];
    btnDefs.forEach((b, i) => {
      const bx = W / 2 - 130;
      const by = 232 + i * 60;
      const bw = 260;
      const bh = 48;

      // Button background (Graphics object per button for gradient look)
      const gfx = this.add.graphics();
      this._drawButton(gfx, bx, by, bw, bh, b.color, false);

      // Label
      const label = this.add.text(W / 2, by + bh / 2, b.label, {
        fontSize: '17px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5);

      // Interactive hit zone
      const hitZone = this.add.zone(bx + bw / 2, by + bh / 2, bw, bh)
        .setInteractive({ useHandCursor: true });

      hitZone.on('pointerover', () => {
        this._drawButton(gfx, bx, by, bw, bh, b.hover, true);
      });

      hitZone.on('pointerout', () => {
        this._drawButton(gfx, bx, by, bw, bh, b.color, false);
      });

      hitZone.on('pointerdown', () => {
        SFX.click();
        this._handleButton(b.id);
      });

      this._btnObjects.push({ gfx, label, hitZone, def: b, x: bx, y: by, w: bw, h: bh });
    });

    // ── Mute toggle button at bottom ─────────────────────────
    const muteGfx = this.add.graphics();
    this._drawMuteBtn(muteGfx);

    this._muteLabel = this.add.text(W / 2, H - 26, isMuted() ? '\u{1F507} Mudo' : '\u{1F50A} Som', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    const muteZone = this.add.zone(W / 2, H - 26, 60, 28)
      .setInteractive({ useHandCursor: true });

    muteZone.on('pointerdown', () => {
      SFX.click();
      setMuted(!isMuted());
      MUSIC.syncMute();
      this._muteLabel.setText(isMuted() ? '\u{1F507} Mudo' : '\u{1F50A} Som');
    });

    this._muteGfx = muteGfx;

    // ── Update loop for background animation ─────────────────
    this._startTime = this.time.now;
  }

  update(time, _delta) {
    // Animated radial gradient background
    const t = time * 0.0005;
    const cx = W / 2 + Math.sin(t) * 30;
    const cy = H / 2 + Math.cos(t) * 20;

    this.bgGfx.clear();
    this.bgGfx.setDepth(-10);

    // Fill entire screen with dark edge color first
    this.bgGfx.fillStyle(0x060610, 1);
    this.bgGfx.fillRect(0, 0, W, H);

    // Simulate radial gradient with concentric circles
    // Draw from largest (edge color) to smallest (center color)
    const steps = 12;
    for (let i = steps; i >= 0; i--) {
      const frac = i / steps;
      const radius = 50 + (350 - 50) * frac;
      // Lerp: frac=1 is outer (edge #060610), frac=0 is inner (center #1a1040)
      const r = Math.floor(0x06 + (0x1a - 0x06) * (1 - frac));
      const g = Math.floor(0x06 + (0x10 - 0x06) * (1 - frac));
      const b = Math.floor(0x10 + (0x40 - 0x10) * (1 - frac));
      const color = (r << 16) | (g << 8) | b;
      this.bgGfx.fillStyle(color, 1);
      this.bgGfx.fillCircle(cx, cy, radius);
    }

    // Animate star twinkling
    for (const star of this._stars) {
      const sr = 0.5 + Math.sin(t * 2 + star._idx) * 0.3;
      star.setRadius(Math.max(0.3, sr));
      star.setAlpha(0.4 + Math.sin(t * 2 + star._idx) * 0.3);
    }

    // Animate title glow pulse
    if (this._titleGlow) {
      const glowAlpha = 0.2 + Math.sin(t * 3) * 0.15;
      this._titleGlow.setAlpha(Math.max(0.05, glowAlpha));
      const scl = 1 + Math.sin(t * 3) * 0.008;
      this._titleGlow.setScale(scl);
    }
  }

  // ── Draw a rounded button rectangle ────────────────────────
  _drawButton(gfx, x, y, w, h, color, hovered) {
    gfx.clear();
    // Main fill
    gfx.fillStyle(color, hovered ? 1 : 0.85);
    gfx.fillRoundedRect(x, y, w, h, 12);
    // Subtle dark overlay on the right half for gradient look
    if (!hovered) {
      gfx.fillStyle(0x000000, 0.35);
      gfx.fillRoundedRect(x + w * 0.4, y, w * 0.6, h, { tl: 0, tr: 12, bl: 0, br: 12 });
    }
    // Border
    gfx.lineStyle(1.5, 0xffffff, 0.15);
    gfx.strokeRoundedRect(x, y, w, h, 12);
    // Glow effect when hovered
    if (hovered) {
      gfx.lineStyle(2, color, 0.5);
      gfx.strokeRoundedRect(x - 1, y - 1, w + 2, h + 2, 13);
    }
  }

  // ── Draw the mute button ──────────────────────────────────
  _drawMuteBtn(gfx) {
    gfx.clear();
    gfx.fillStyle(0xffffff, 0.1);
    gfx.fillRoundedRect(W / 2 - 30, H - 40, 60, 28, 8);
  }

  // ── Handle button clicks ──────────────────────────────────
  _handleButton(id) {
    switch (id) {
      case 0: // Jogar Solo
        APP.mode = 'solo';
        APP.tmpDeck = [...((APP.progress && APP.progress.deck) || [])];
        APP.deckTimer = 30;
        this.scene.start('DeckSelectScene', { fromSolo: true });
        break;

      case 2: // Sala de Desafios
        enterMatchLobby();
        break;

      case 3: // Meu Deck
        APP.tmpDeck = [...((APP.progress && APP.progress.deck) || [])];
        APP.deckTimer = 9999;
        this.scene.start('DeckSelectScene', { fromDeck: true });
        break;

      case 4: // Ranking
        this.scene.start('RankingScene');
        break;

      case 5: // Loja
        this.scene.start('ShopScene');
        break;

      case 6: // Admin
        this._showAdminOverlay();
        break;
    }
  }

  // ── Admin overlay (uses DOM since it has sliders) ──────────
  _showAdminOverlay() {
    // Use the full showAdmin() from main.js which also populates slider values
    if (window._showAdmin) {
      window._showAdmin();
    } else {
      const el = document.getElementById('admin');
      if (el) {
        el.classList.add('show');
      }
    }
  }
}
