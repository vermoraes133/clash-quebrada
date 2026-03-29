// ================================================================
//  DeckSelectScene.js — Deck selection screen (replaces drawDeckSelect)
//  Phaser 3 scene: card grid, selection, timer, confirm
//  Enhanced: init(data) safety, null guards, scene transition checks
// ================================================================
import Phaser from 'phaser';
import { W, H } from '../config/constants.js';
import { CARDS } from '../config/cards.js';
import { APP, saveData } from '../state/GameState.js';
import { SFX } from '../systems/AudioSystem.js';
import { getAllKeys, getCardLevel, newBattle } from '../systems/BattleLogic.js';

// Grid layout constants (match original drawDeckSelect)
const COLS = 4;
const CW = 88;
const CH = 76;
const GAP = 6;
const TOTAL_W = COLS * CW + (COLS - 1) * GAP;
const START_X = (W - TOTAL_W) / 2;
const START_Y = 68;

export default class DeckSelectScene extends Phaser.Scene {
  constructor() {
    super('DeckSelectScene');
  }

  init(data) {
    // data may be undefined/null — safe defaults
    data = data || {};
    this._fromDeck = !!data.fromDeck;
    this._fromSolo = !!data.fromSolo;
  }

  create() {
    this.cameras.main.setBackgroundColor('#080818');

    // ── Container for all card elements (for potential scrolling) ──
    this._cardContainers = [];
    this._hoveredKey = null;

    // ── Title ────────────────────────────────────────────────
    this.add.text(W / 2, 14, '\u{1F0CF} Monte Seu Deck', {
      fontSize: '22px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#f1c40f',
    }).setOrigin(0.5, 0);

    // ── Subtitle (updated each frame) ────────────────────────
    this._subtitle = this.add.text(W / 2, 42, '', {
      fontSize: '13px',
      fontFamily: 'Arial',
      color: '#aaaaaa',
    }).setOrigin(0.5, 0);

    // ── Timer badge (top-right corner) ───────────────────────
    this._timerGfx = this.add.graphics();
    this._timerText = this.add.text(W - 38, 55, '', {
      fontSize: '13px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    // ── Timer tick (every second) ────────────────────────────
    if (APP && APP.deckTimer < 9999) {
      this._timerEvent = this.time.addEvent({
        delay: 1000,
        loop: true,
        callback: () => {
          if (!APP || APP.deckTimer <= 0) return;
          APP.deckTimer--;
          if (APP.deckTimer <= 0) {
            this._timerEvent.remove();
            this._autoConfirm();
          }
        },
      });
    }

    // ── Build card grid ──────────────────────────────────────
    this._displayKeys = getAllKeys();
    this._buildCardGrid();

    // ── Confirm button at bottom ─────────────────────────────
    this._confirmGfx = this.add.graphics();
    this._confirmLabel = this.add.text(W / 2, H - 50 + 19, 'Selecione cartas', {
      fontSize: '15px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    const confirmZone = this.add.zone(W / 2, H - 50 + 19, 200, 38)
      .setInteractive({ useHandCursor: true });
    confirmZone.on('pointerdown', () => {
      this._onConfirm();
    });

    // ── Tooltip overlay at bottom ────────────────────────────
    this._tooltipGfx = this.add.graphics().setDepth(100);
    this._tooltipTitle = this.add.text(W / 2, H - 72, '', {
      fontSize: '13px', fontFamily: 'Arial', fontStyle: 'bold', color: '#f1c40f',
    }).setOrigin(0.5, 0).setDepth(101);
    this._tooltipStats = this.add.text(W / 2, H - 52, '', {
      fontSize: '11px', fontFamily: 'Arial', color: '#aaaaaa',
    }).setOrigin(0.5, 0).setDepth(101);
    this._tooltipDesc = this.add.text(W / 2, H - 30, '', {
      fontSize: '12px', fontFamily: 'Arial', color: '#cccccc',
    }).setOrigin(0.5, 0).setDepth(101);
    this._hideTooltip();
  }

  update(_time, _delta) {
    if (!APP) return;

    // ── Update subtitle ──────────────────────────────────────
    const tmpLen = (APP.tmpDeck || []).length;
    this._subtitle.setText(
      `Escolha 8 cartas \u2022 Tempo: ${APP.deckTimer >= 9999 ? '\u221E' : APP.deckTimer}s \u2022 ${tmpLen}/8 selecionadas`
    );

    // ── Update timer badge ───────────────────────────────────
    this._drawTimerBadge();

    // ── Update confirm button ────────────────────────────────
    this._drawConfirmBtn();

    // ── Update card selection visuals ─────────────────────────
    this._updateCardVisuals();
  }

  // ════════════════════════════════════════════════════════════
  //  BUILD CARD GRID
  // ════════════════════════════════════════════════════════════
  _buildCardGrid() {
    this._displayKeys.forEach((key, i) => {
      const d = CARDS[key];
      if (!d) return;

      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx = START_X + col * (CW + GAP);
      const cy = START_Y + row * (CH + GAP);

      const isOwned = APP && APP.progress && APP.progress.owned && APP.progress.owned.includes(key);
      const isLocked = d.locked && !isOwned;

      // Card background graphics
      const cardGfx = this.add.graphics();

      // Emoji / character
      const emoji = this.add.text(cx + CW / 2, cy + 22, d.emoji, {
        fontSize: '24px',
        fontFamily: 'Arial',
      }).setOrigin(0.5);

      // Name
      const fs = d.name.length > 10 ? 6.5 : 7.5;
      const nameText = this.add.text(cx + CW / 2, cy + 38, d.name, {
        fontSize: `${fs}px`,
        fontFamily: 'Arial',
        color: isLocked ? '#555555' : '#cccccc',
      }).setOrigin(0.5, 0);

      // Cost badge (purple circle top-left)
      const costGfx = this.add.graphics();
      costGfx.fillStyle(0x6c3483, 1);
      costGfx.fillCircle(cx + 11, cy + 11, 9);
      const costText = this.add.text(cx + 11, cy + 11, `${d.cost}`, {
        fontSize: '9px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5);

      // Level badge (yellow circle top-right) — only if > 1 and not locked
      const lvl = getCardLevel(key);
      let lvlGfx = null;
      let lvlText = null;
      if (lvl > 1 && !isLocked) {
        lvlGfx = this.add.graphics();
        lvlGfx.fillStyle(0xf1c40f, 1);
        lvlGfx.fillCircle(cx + CW - 11, cy + 11, 9);
        lvlText = this.add.text(cx + CW - 11, cy + 11, 'Lv' + lvl, {
          fontSize: '7px',
          fontFamily: 'Arial',
          fontStyle: 'bold',
          color: '#000000',
        }).setOrigin(0.5);
      }

      // Checkmark (shown when selected)
      const checkText = this.add.text(cx + CW - 14, cy + CH - 14, '\u2713', {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#27ae60',
      }).setOrigin(0.5).setAlpha(0);

      // Lock icon (shown when locked)
      let lockText = null;
      if (isLocked) {
        lockText = this.add.text(cx + CW / 2, cy + CH / 2, '\u{1F512}', {
          fontSize: '16px',
          fontFamily: 'Arial',
        }).setOrigin(0.5);
      }

      // Interactive zone for this card (only if not locked)
      if (!isLocked) {
        const cardZone = this.add.zone(cx + CW / 2, cy + CH / 2, CW, CH)
          .setInteractive({ useHandCursor: true });

        cardZone.on('pointerdown', () => {
          SFX.select();
          this._toggleCard(key);
        });

        cardZone.on('pointerover', () => {
          this._hoveredKey = key;
          this._showTooltip(key);
        });

        cardZone.on('pointerout', () => {
          if (this._hoveredKey === key) {
            this._hoveredKey = null;
            this._hideTooltip();
          }
        });
      }

      this._cardContainers.push({
        key,
        gfx: cardGfx,
        emoji,
        nameText,
        costGfx,
        costText,
        lvlGfx,
        lvlText,
        checkText,
        lockText,
        x: cx,
        y: cy,
        isLocked,
      });
    });
  }

  // ════════════════════════════════════════════════════════════
  //  UPDATE CARD VISUALS (selection state)
  // ════════════════════════════════════════════════════════════
  _updateCardVisuals() {
    if (!APP || !APP.tmpDeck) return;

    for (const card of this._cardContainers) {
      const d = CARDS[card.key];
      if (!d) continue;

      const sel = APP.tmpDeck.includes(card.key);
      const cx = card.x;
      const cy = card.y;

      // Redraw card background
      card.gfx.clear();

      // Fill color
      let fillColor;
      if (card.isLocked) {
        fillColor = 0x0d0d16;
      } else if (sel) {
        fillColor = 0x1a3a1a;
      } else if (d.type === 'spell') {
        fillColor = 0x1a0d22;
      } else {
        fillColor = 0x12121e;
      }
      card.gfx.fillStyle(fillColor, 1);
      card.gfx.fillRoundedRect(cx, cy, CW, CH, 8);

      // Border
      let borderColor;
      let borderWidth;
      if (card.isLocked) {
        borderColor = 0x222222;
        borderWidth = 1.5;
      } else if (sel) {
        borderColor = 0x27ae60;
        borderWidth = 2.5;
      } else {
        borderColor = 0x333333;
        borderWidth = 1.5;
      }
      card.gfx.lineStyle(borderWidth, borderColor, 1);
      card.gfx.strokeRoundedRect(cx, cy, CW, CH, 8);

      // Green overlay when selected
      if (sel && !card.isLocked) {
        card.gfx.fillStyle(0x27ae60, 0.15);
        card.gfx.fillRoundedRect(cx, cy, CW, CH, 8);
      }

      // Emoji alpha
      card.emoji.setAlpha(card.isLocked ? 0.3 : (sel ? 1 : 0.8));

      // Checkmark visibility
      card.checkText.setAlpha(sel ? 1 : 0);
    }
  }

  // ════════════════════════════════════════════════════════════
  //  TIMER BADGE (top-right arc)
  // ════════════════════════════════════════════════════════════
  _drawTimerBadge() {
    if (!APP) return;
    const rx = W - 38;
    const ry = 55;
    const rr = 22;
    const tRatio = APP.deckTimer >= 9999 ? 1 : APP.deckTimer / 30;

    this._timerGfx.clear();

    // Background circle
    this._timerGfx.lineStyle(4, 0xffffff, 0.15);
    this._timerGfx.strokeCircle(rx, ry, rr);

    // Progress arc color
    let arcColor;
    if (tRatio > 0.5) arcColor = 0x27ae60;
    else if (tRatio > 0.25) arcColor = 0xf39c12;
    else arcColor = 0xe74c3c;

    // Draw progress arc
    if (tRatio > 0) {
      this._timerGfx.lineStyle(4, arcColor, 1);
      const startAngle = -Math.PI / 2;
      const endAngle = -Math.PI / 2 + Math.PI * 2 * tRatio;
      this._timerGfx.beginPath();
      this._timerGfx.arc(rx, ry, rr, startAngle, endAngle, false);
      this._timerGfx.strokePath();
    }

    // Timer text
    this._timerText.setText(APP.deckTimer >= 9999 ? '\u221E' : `${APP.deckTimer}`);
  }

  // ════════════════════════════════════════════════════════════
  //  CONFIRM BUTTON
  // ════════════════════════════════════════════════════════════
  _drawConfirmBtn() {
    if (!APP || !APP.tmpDeck) return;
    const ready = APP.tmpDeck.length >= 1;
    const bx = W / 2 - 100;
    const by = H - 50;
    const bw = 200;
    const bh = 38;

    this._confirmGfx.clear();
    this._confirmGfx.fillStyle(ready ? 0x27ae60 : 0x444444, 1);
    this._confirmGfx.fillRoundedRect(bx, by, bw, bh, 10);

    this._confirmLabel.setText(
      ready ? `Confirmar (${APP.tmpDeck.length}/8)` : 'Selecione cartas'
    );
  }

  // ════════════════════════════════════════════════════════════
  //  TOOLTIP
  // ════════════════════════════════════════════════════════════
  _showTooltip(key) {
    const d = CARDS[key];
    if (!d) return;

    const isOwned = APP && APP.progress && APP.progress.owned && APP.progress.owned.includes(key);
    const isLocked = d.locked && !isOwned;

    // Background bar
    this._tooltipGfx.clear();
    this._tooltipGfx.fillStyle(0x000000, 0.88);
    this._tooltipGfx.fillRect(0, H - 75, W, 75);

    // Title line
    this._tooltipTitle.setText(`${d.emoji} ${d.name}  \u2022  Custo: ${d.cost}\u{1F49C}`);
    this._tooltipTitle.setVisible(true);

    // Stats line
    if (d.type === 'spell') {
      this._tooltipStats.setText(`\u{1F4A5} DMG:${d.dmg}  \u{1F4CF} AOE:${d.aoe}`);
    } else {
      this._tooltipStats.setText(`\u2764\uFE0F${d.hp}  \u2694\uFE0F${d.dmg}  \u{1F4A8}${Math.round(d.spd)}  \u{1F4CF}${d.range}`);
    }
    this._tooltipStats.setVisible(true);

    // Description line
    if (isLocked) {
      this._tooltipDesc.setText('\u{1F512} Disponivel na Loja');
      this._tooltipDesc.setColor('#e74c3c');
    } else {
      this._tooltipDesc.setText(d.desc);
      this._tooltipDesc.setColor('#cccccc');
    }
    this._tooltipDesc.setVisible(true);
  }

  _hideTooltip() {
    this._tooltipGfx.clear();
    this._tooltipTitle.setVisible(false);
    this._tooltipStats.setVisible(false);
    this._tooltipDesc.setVisible(false);
  }

  // ════════════════════════════════════════════════════════════
  //  CARD TOGGLE
  // ════════════════════════════════════════════════════════════
  _toggleCard(key) {
    if (!APP || !APP.tmpDeck) return;
    const idx = APP.tmpDeck.indexOf(key);
    if (idx >= 0) {
      APP.tmpDeck.splice(idx, 1);
    } else if (APP.tmpDeck.length < 8) {
      APP.tmpDeck.push(key);
    }
  }

  // ════════════════════════════════════════════════════════════
  //  CONFIRM / AUTO-CONFIRM
  // ════════════════════════════════════════════════════════════
  _onConfirm() {
    if (!APP || !APP.tmpDeck || APP.tmpDeck.length < 1) return;
    SFX.select();
    this._finalize();
  }

  _autoConfirm() {
    // Timer ran out — pad deck to 8 with random cards
    this._finalize();
  }

  _finalize() {
    if (!APP) return;
    if (!APP.tmpDeck) APP.tmpDeck = [];

    // Pad deck to 8 if needed
    const allKeys = getAllKeys().filter(k => CARDS[k]);
    while (APP.tmpDeck.length < 8) {
      const rk = allKeys[Math.floor(Math.random() * allKeys.length)];
      if (!APP.tmpDeck.includes(rk)) {
        APP.tmpDeck.push(rk);
      } else {
        // Allow duplicates if we run out of unique cards
        APP.tmpDeck.push(rk);
      }
    }

    if (APP.progress) {
      APP.progress.deck = [...APP.tmpDeck];
    }
    saveData();

    // If came from "Meu Deck" (timer=9999), go back to menu
    if (APP.deckTimer >= 9999 || this._fromDeck) {
      if (this.scene.manager.getScene('MenuScene')) {
        this.scene.start('MenuScene');
      }
      return;
    }

    // If new player, show tutorial first
    if (APP.progress && APP.progress.isNew) {
      APP.progress.isNew = false;
      saveData();
      if (this.scene.manager.getScene('TutorialScene')) {
        this.scene.start('TutorialScene');
      }
      return;
    }

    // Otherwise start battle
    this._startBattle();
  }

  _startBattle() {
    if (this._timerEvent) {
      this._timerEvent.remove();
    }
    if (APP) clearInterval(APP.deckTick);
    if (APP) APP.tutStep = 0;

    try {
      newBattle();
    } catch (err) {
      console.warn('[DeckSelectScene] newBattle falhou:', err.message || err);
    }

    if (this.scene.manager.getScene('BattleScene')) {
      this.scene.start('BattleScene');
    }
  }

  shutdown() {
    // Clean up timer if scene switches
    if (this._timerEvent) {
      this._timerEvent.remove();
      this._timerEvent = null;
    }
  }
}
