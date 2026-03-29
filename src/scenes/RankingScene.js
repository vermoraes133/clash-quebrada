// ================================================================
//  RankingScene.js — Global ranking top-20 display
//  Replaces drawRanking() from DrawScreens.js
//  Shows Firebase-synced leaderboard with medals, highlight, status
// ================================================================
import Phaser from 'phaser';
import { W, H } from '../config/constants.js';
import { APP } from '../state/GameState.js';
import { SFX } from '../systems/AudioSystem.js';
import {
  fbLoadRanking,
  isRankingOnline,
  isRankingLoading,
} from '../systems/OnlineSync.js';

export default class RankingScene extends Phaser.Scene {
  constructor() {
    super('RankingScene');
  }

  init(data) {
    // data may be undefined/null — safe defaults
    data = data || {};
    this._goScreen = data.goScreen || this.registry.get('goScreen') || null;
  }

  create() {
    // Kick off ranking fetch
    fbLoadRanking().then(() => {
      this._buildUI();
    });

    this._buildUI();
  }

  // ── Full UI build ───────────────────────────────────────────
  _buildUI() {
    this.children.removeAll(true);

    // ── Dark background ───────────────────────────────────
    this.add.rectangle(W / 2, H / 2, W, H, 0x060610).setDepth(-10);

    // ── Title ─────────────────────────────────────────────
    this.add.text(W / 2, 14, '\u{1F3C6} Ranking Global', {
      fontSize: '24px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#f1c40f',
    }).setOrigin(0.5, 0);

    // ── Firebase status indicator ─────────────────────────
    const rkOnline = isRankingOnline();
    const rkLoading = isRankingLoading();
    let statusText, statusColor;
    if (rkLoading) {
      statusText = '\u{1F504} carregando...';
      statusColor = '#f39c12';
    } else if (rkOnline) {
      statusText = '\u{1F310} Firebase \u00b7 ao vivo';
      statusColor = '#27ae60';
    } else {
      statusText = '\u{1F4F4} offline \u00b7 cache local';
      statusColor = '#888888';
    }

    this.add.text(W / 2, 44, statusText, {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: statusColor,
    }).setOrigin(0.5, 0);

    // ── Player list (up to 12) ────────────────────────────
    const list = APP.ranking && APP.ranking.length
      ? APP.ranking
      : [{ name: 'Nenhum jogador ainda', trophies: 0, wins: 0 }];

    const displayList = list.slice(0, 12);
    const myId = APP.account ? APP.account.id : null;

    displayList.forEach((p, i) => {
      const by = 70 + i * 48;
      const isME = p.id === myId;
      const rowW = W - 24;
      const rowX = 12;

      // Row background
      const rowGfx = this.add.graphics();
      if (isME) {
        rowGfx.fillStyle(0xf1c40f, 0.15);
        rowGfx.fillRoundedRect(rowX, by, rowW, 42, 8);
        rowGfx.lineStyle(1.5, 0xf1c40f, 1);
        rowGfx.strokeRoundedRect(rowX, by, rowW, 42, 8);
      } else {
        rowGfx.fillStyle(0xffffff, 0.04);
        rowGfx.fillRoundedRect(rowX, by, rowW, 42, 8);
      }

      // Medal or rank number
      let medal;
      if (i === 0) medal = '\u{1F947}';
      else if (i === 1) medal = '\u{1F948}';
      else if (i === 2) medal = '\u{1F949}';
      else medal = `${i + 1}.`;

      // Player name with medal
      this.add.text(22, by + 21, `${medal} ${p.name}`, {
        fontSize: '14px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0, 0.5);

      // Trophies (right side, top)
      this.add.text(W - 20, by + 14, `\u{1F3C6} ${p.trophies}`, {
        fontSize: '14px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#f1c40f',
      }).setOrigin(1, 0.5);

      // Wins (right side, bottom)
      this.add.text(W - 20, by + 30, `${p.wins || 0} vitorias`, {
        fontSize: '11px',
        fontFamily: 'Arial',
        color: '#888888',
      }).setOrigin(1, 0.5);
    });

    // ── Back button ─────────────────────────────────────────
    const btnW = 160;
    const btnH = 40;
    const btnX = W / 2 - btnW / 2;
    const btnY = H - 52;

    const backGfx = this.add.graphics();
    backGfx.fillStyle(0x2980b9, 1);
    backGfx.fillRoundedRect(btnX, btnY, btnW, btnH, 10);

    this.add.text(W / 2, btnY + btnH / 2, '\u2190 Voltar', {
      fontSize: '15px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    const backZone = this.add.zone(W / 2, btnY + btnH / 2, btnW, btnH)
      .setInteractive({ useHandCursor: true });

    backZone.on('pointerover', () => {
      backGfx.clear();
      backGfx.fillStyle(0x3498db, 1);
      backGfx.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
    });

    backZone.on('pointerout', () => {
      backGfx.clear();
      backGfx.fillStyle(0x2980b9, 1);
      backGfx.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
    });

    backZone.on('pointerdown', () => {
      SFX.click();
      if (this.scene.manager.getScene('MenuScene')) {
        this.scene.start('MenuScene');
      }
    });

    // ── Refresh button (small) ──────────────────────────────
    const refGfx = this.add.graphics();
    refGfx.fillStyle(0x16a085, 0.8);
    refGfx.fillRoundedRect(W - 50, 8, 40, 26, 6);

    this.add.text(W - 30, 21, '\u{1F504}', {
      fontSize: '14px', fontFamily: 'Arial',
    }).setOrigin(0.5);

    const refZone = this.add.zone(W - 30, 21, 40, 26)
      .setInteractive({ useHandCursor: true });

    refZone.on('pointerdown', () => {
      SFX.click();
      fbLoadRanking().then(() => {
        this._buildUI();
      });
    });
  }
}
