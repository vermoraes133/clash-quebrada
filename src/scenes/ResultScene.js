// ================================================================
//  ResultScene.js — Post-battle result screen
//  Replaces drawResult() from DrawScreens.js
//  Shows victory/defeat/draw with stats, trophies, diamonds, XP
//  Online: rematch / leave room buttons with waiting state
//  Solo: play again / main menu buttons
//  Enhanced: init(data) safety, null guards
// ================================================================
import Phaser from 'phaser';
import { W, H } from '../config/constants.js';
import { APP, saveData } from '../state/GameState.js';
import { SFX } from '../systems/AudioSystem.js';
import { G } from '../systems/BattleLogic.js';
import {
  getOpponentName,
  getRematchPending,
  requestRematch,
  declineRematch,
  cleanupOnline,
} from '../systems/OnlineSync.js';

export default class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
  }

  init(data) {
    // data may be undefined/null — safe defaults
    data = data || {};
    this._goScreen = data.goScreen || this.registry.get('goScreen') || null;
    this._saveData = data.saveData || this.registry.get('saveData') || null;
  }

  create() {
    this._isOnline = (APP && APP.wasOnline) || (APP && APP.mode === 'online');
    this._rematchRequested = false;
    this._waitingDots = 0;
    this._dotTimer = null;

    this._buildUI();
  }

  // ── Full UI build ───────────────────────────────────────────
  _buildUI() {
    this.children.removeAll(true);
    if (this._dotTimer) { this._dotTimer.remove(false); this._dotTimer = null; }

    const r = (APP && APP.battleResult) ? APP.battleResult : 'draw';
    const isOnline = this._isOnline;
    const myName = (APP && APP.account) ? APP.account.name : 'Voce';
    const oppName = isOnline ? (getOpponentName() || 'Oponente') : 'IA';
    const winName = r === 'win' ? myName : r === 'lose' ? oppName : null;
    const loseName = r === 'win' ? oppName : r === 'lose' ? myName : null;
    const rematchPending = getRematchPending() || this._rematchRequested;

    // ── Gradient background ───────────────────────────────
    const bgGfx = this.add.graphics();
    const topColor = r === 'win' ? 0x071a0e : r === 'draw' ? 0x0a0a20 : 0x1a0707;
    const botColor = 0x060610;
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const frac = i / (steps - 1);
      const tr = (topColor >> 16) & 0xff;
      const tg = (topColor >> 8) & 0xff;
      const tb = topColor & 0xff;
      const br = (botColor >> 16) & 0xff;
      const bg2 = (botColor >> 8) & 0xff;
      const bb = botColor & 0xff;
      const cr = Math.floor(tr + (br - tr) * frac);
      const cg = Math.floor(tg + (bg2 - tg) * frac);
      const cb = Math.floor(tb + (bb - tb) * frac);
      const color = (cr << 16) | (cg << 8) | cb;
      const sliceH = Math.ceil(H / steps) + 1;
      bgGfx.fillStyle(color, 1);
      bgGfx.fillRect(0, Math.floor(i * H / steps), W, sliceH);
    }
    bgGfx.setDepth(-10);

    // ── Draw result ───────────────────────────────────────
    if (r === 'draw') {
      this.add.text(W / 2, 88, '\u{1F91D}', {
        fontSize: '64px', fontFamily: 'Arial',
      }).setOrigin(0.5);

      this.add.text(W / 2, 150, 'EMPATE!', {
        fontSize: '32px', fontFamily: 'Arial', fontStyle: 'bold', color: '#bdc3c7',
      }).setOrigin(0.5);

      const namesGfx = this.add.graphics();
      namesGfx.fillStyle(0xffffff, 0.08);
      namesGfx.fillRoundedRect(W / 2 - 130, 170, 260, 30, 8);

      this.add.text(W / 2, 185, myName + ' \u2694\uFE0F ' + oppName, {
        fontSize: '14px', fontFamily: 'Arial', color: '#aaaaaa',
      }).setOrigin(0.5);

    } else {
      this.add.text(W / 2, 80, '\u{1F3C6}', {
        fontSize: '58px', fontFamily: 'Arial',
      }).setOrigin(0.5);

      const bannerGfx = this.add.graphics();
      for (let i = 0; i < 10; i++) {
        const frac = i / 9;
        const alpha = 0.18 * (1 - Math.pow(2 * frac - 1, 2));
        bannerGfx.fillStyle(0xf1c40f, alpha);
        const sliceW = Math.ceil(W / 10) + 1;
        bannerGfx.fillRect(Math.floor(i * W / 10), 102, sliceW, 38);
      }

      this.add.text(W / 2, 108, '\u{1F3C6}  VENCEDOR', {
        fontSize: '13px', fontFamily: 'Arial', fontStyle: 'bold', color: '#f1c40f',
      }).setOrigin(0.5, 0);

      this.add.text(W / 2, 150, winName || '', {
        fontSize: '30px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5);

      const loserGfx = this.add.graphics();
      loserGfx.fillStyle(0xe74c3c, 0.12);
      loserGfx.fillRoundedRect(W / 2 - 130, 174, 260, 38, 8);
      loserGfx.lineStyle(1, 0xe74c3c, 0.22);
      loserGfx.strokeRoundedRect(W / 2 - 130, 174, 260, 38, 8);

      this.add.text(W / 2, 180, '\u{1F480}  DERROTADO', {
        fontSize: '12px', fontFamily: 'Arial', fontStyle: 'bold', color: '#e74c3c',
      }).setOrigin(0.5, 0);

      this.add.text(W / 2, 202, loseName || '', {
        fontSize: '15px', fontFamily: 'Arial', fontStyle: 'bold', color: '#999999',
      }).setOrigin(0.5);
    }

    // ── Stats panel ─────────────────────────────────────────
    const statsY = 228;
    const tChange = r === 'win' ? +30 : r === 'draw' ? +5 : -20;

    const statsGfx = this.add.graphics();
    statsGfx.fillStyle(0xffffff, 0.06);
    statsGfx.fillRoundedRect(W / 2 - 130, statsY - 4, 260, 88, 8);

    const trophyColor = r === 'win' ? '#2ecc71' : r === 'draw' ? '#bdc3c7' : '#e74c3c';
    const trophies = (APP && APP.progress) ? APP.progress.trophies : 0;
    const tChangeStr = (tChange > 0 ? '+' : '') + tChange;
    this.add.text(W / 2, statsY + 12, `\u{1F3C6} ${trophies} trofeus  (${tChangeStr})`, {
      fontSize: '14px', fontFamily: 'Arial', fontStyle: 'bold', color: trophyColor,
    }).setOrigin(0.5);

    const wins = (APP && APP.progress) ? APP.progress.wins : 0;
    const losses = (APP && APP.progress) ? APP.progress.losses : 0;
    const draws = (APP && APP.progress) ? APP.progress.draws : 0;
    this.add.text(W / 2, statsY + 34, `${wins}V  ${losses}D  ${draws}E`, {
      fontSize: '12px', fontFamily: 'Arial', color: '#aaaaaa',
    }).setOrigin(0.5);

    const xpAmount = r === 'win' ? 25 : r === 'draw' ? 12 : 10;
    this.add.text(W / 2, statsY + 54, `+${xpAmount} XP`, {
      fontSize: '11px', fontFamily: 'Arial', color: '#f1c40f',
    }).setOrigin(0.5);

    const earnedD = (G && G.earnedDiamonds) ? G.earnedDiamonds : 0;
    if (earnedD > 0) {
      const totalD = (APP && APP.progress) ? (APP.progress.diamonds || 0) : 0;
      this.add.text(W / 2, statsY + 74, `\u{1F48E} +${earnedD} diamantes! (Total: ${totalD})`, {
        fontSize: '12px', fontFamily: 'Arial', fontStyle: 'bold', color: '#00e5ff',
      }).setOrigin(0.5);
    } else if (r === 'win') {
      const totalD = (APP && APP.progress) ? (APP.progress.diamonds || 0) : 0;
      this.add.text(W / 2, statsY + 74, `\u{1F48E} ${totalD} diamantes`, {
        fontSize: '11px', fontFamily: 'Arial', color: '#555555',
      }).setOrigin(0.5);
    }

    // ── Action buttons ──────────────────────────────────────
    const btnY = statsY + 98;

    if (isOnline) {
      this._buildOnlineButtons(btnY, rematchPending, oppName);
    } else {
      this._buildSoloButtons(btnY);
    }
  }

  // ── Solo buttons: Play again + Main menu ──────────────────
  _buildSoloButtons(btnY) {
    const btns = [
      { label: '\u2694\uFE0F Jogar Novamente', id: 'again', color: 0xe67e22, hoverColor: 0xe74c3c },
      { label: '\u{1F3E0} Menu Principal', id: 'menu', color: 0x2980b9, hoverColor: 0x3498db },
    ];

    btns.forEach((b, i) => {
      const bx = W / 2 - 110;
      const by = btnY + i * 60;
      const bw = 220;
      const bh = 50;

      const gfx = this.add.graphics();
      gfx.fillStyle(b.color, 1);
      gfx.fillRoundedRect(bx, by, bw, bh, 12);

      this.add.text(W / 2, by + bh / 2, b.label, {
        fontSize: '16px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5);

      const zone = this.add.zone(bx + bw / 2, by + bh / 2, bw, bh)
        .setInteractive({ useHandCursor: true });

      zone.on('pointerover', () => {
        gfx.clear();
        gfx.fillStyle(b.hoverColor, 1);
        gfx.fillRoundedRect(bx, by, bw, bh, 12);
      });

      zone.on('pointerout', () => {
        gfx.clear();
        gfx.fillStyle(b.color, 1);
        gfx.fillRoundedRect(bx, by, bw, bh, 12);
      });

      zone.on('pointerdown', () => {
        SFX.click();
        if (b.id === 'again') {
          if (APP) APP.mode = 'solo';
          if (APP && APP._startDeckSelect) {
            APP._startDeckSelect();
          } else if (this.scene.manager.getScene('DeckSelectScene')) {
            this.scene.start('DeckSelectScene');
          }
        } else {
          if (this.scene.manager.getScene('MenuScene')) {
            this.scene.start('MenuScene');
          }
        }
      });
    });
  }

  // ── Online buttons: Rematch / Leave room ──────────────────
  _buildOnlineButtons(btnY, rematchPending, oppName) {
    if (rematchPending) {
      const waitGfx = this.add.graphics();
      waitGfx.fillStyle(0xf1c40f, 0.1);
      waitGfx.fillRoundedRect(W / 2 - 110, btnY, 220, 48, 12);
      waitGfx.lineStyle(1.5, 0xf1c40f, 0.33);
      waitGfx.strokeRoundedRect(W / 2 - 110, btnY, 220, 48, 12);

      const waitLabel = this.add.text(W / 2, btnY + 24, '\u23F3 Aguardando ' + oppName, {
        fontSize: '13px', fontFamily: 'Arial', fontStyle: 'bold', color: '#f1c40f',
      }).setOrigin(0.5);

      this._waitingDots = 0;
      this._dotTimer = this.time.addEvent({
        delay: 400,
        loop: true,
        callback: () => {
          this._waitingDots = (this._waitingDots + 1) % 4;
          const dots = '.'.repeat(this._waitingDots);
          waitLabel.setText('\u23F3 Aguardando ' + oppName + dots);
        },
      });

      const cancelGfx = this.add.graphics();
      cancelGfx.fillStyle(0xe74c3c, 0.85);
      cancelGfx.fillRoundedRect(W / 2 - 110, btnY + 58, 220, 44, 12);

      this.add.text(W / 2, btnY + 80, '\u{1F6AA} Cancelar e Sair', {
        fontSize: '14px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5);

      const cancelZone = this.add.zone(W / 2, btnY + 80, 220, 44)
        .setInteractive({ useHandCursor: true });

      cancelZone.on('pointerover', () => {
        cancelGfx.clear();
        cancelGfx.fillStyle(0xc0392b, 1);
        cancelGfx.fillRoundedRect(W / 2 - 110, btnY + 58, 220, 44, 12);
      });

      cancelZone.on('pointerout', () => {
        cancelGfx.clear();
        cancelGfx.fillStyle(0xe74c3c, 0.85);
        cancelGfx.fillRoundedRect(W / 2 - 110, btnY + 58, 220, 44, 12);
      });

      cancelZone.on('pointerdown', () => {
        SFX.click();
        this._rematchRequested = false;
        declineRematch();
        if (this.scene.manager.getScene('MenuScene')) {
          this.scene.start('MenuScene');
        }
      });

    } else {
      const rematchGfx = this.add.graphics();
      rematchGfx.fillStyle(0xe67e22, 1);
      rematchGfx.fillRoundedRect(W / 2 - 110, btnY, 220, 48, 12);

      this.add.text(W / 2, btnY + 24, '\u{1F504} Revanche!', {
        fontSize: '16px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5);

      const rematchZone = this.add.zone(W / 2, btnY + 24, 220, 48)
        .setInteractive({ useHandCursor: true });

      rematchZone.on('pointerover', () => {
        rematchGfx.clear();
        rematchGfx.fillStyle(0xf39c12, 1);
        rematchGfx.fillRoundedRect(W / 2 - 110, btnY, 220, 48, 12);
      });

      rematchZone.on('pointerout', () => {
        rematchGfx.clear();
        rematchGfx.fillStyle(0xe67e22, 1);
        rematchGfx.fillRoundedRect(W / 2 - 110, btnY, 220, 48, 12);
      });

      rematchZone.on('pointerdown', () => {
        SFX.click();
        this._rematchRequested = true;
        requestRematch();
        this._buildUI();
      });

      const leaveGfx = this.add.graphics();
      leaveGfx.fillStyle(0xffffff, 0.09);
      leaveGfx.fillRoundedRect(W / 2 - 110, btnY + 58, 220, 44, 12);
      leaveGfx.lineStyle(1, 0xffffff, 0.15);
      leaveGfx.strokeRoundedRect(W / 2 - 110, btnY + 58, 220, 44, 12);

      this.add.text(W / 2, btnY + 80, '\u{1F6AA} Sair da Sala', {
        fontSize: '14px', fontFamily: 'Arial', fontStyle: 'bold', color: '#aaaaaa',
      }).setOrigin(0.5);

      const leaveZone = this.add.zone(W / 2, btnY + 80, 220, 44)
        .setInteractive({ useHandCursor: true });

      leaveZone.on('pointerover', () => {
        leaveGfx.clear();
        leaveGfx.fillStyle(0xffffff, 0.15);
        leaveGfx.fillRoundedRect(W / 2 - 110, btnY + 58, 220, 44, 12);
        leaveGfx.lineStyle(1, 0xffffff, 0.25);
        leaveGfx.strokeRoundedRect(W / 2 - 110, btnY + 58, 220, 44, 12);
      });

      leaveZone.on('pointerout', () => {
        leaveGfx.clear();
        leaveGfx.fillStyle(0xffffff, 0.09);
        leaveGfx.fillRoundedRect(W / 2 - 110, btnY + 58, 220, 44, 12);
        leaveGfx.lineStyle(1, 0xffffff, 0.15);
        leaveGfx.strokeRoundedRect(W / 2 - 110, btnY + 58, 220, 44, 12);
      });

      leaveZone.on('pointerdown', () => {
        SFX.click();
        declineRematch();
        if (this.scene.manager.getScene('MenuScene')) {
          this.scene.start('MenuScene');
        }
      });
    }
  }
}
