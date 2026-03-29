// ================================================================
//  TutorialScene.js — Interactive 6-step tutorial overlay
//  Replaces drawTutorial() from DrawScreens.js
//  Enhanced: init(data) safety, scene transition guards
// ================================================================
import Phaser from 'phaser';
import { W, H, TUT_STEPS } from '../config/constants.js';
import { APP } from '../state/GameState.js';
import { SFX } from '../systems/AudioSystem.js';

export default class TutorialScene extends Phaser.Scene {
  constructor() {
    super('TutorialScene');
  }

  init(data) {
    // data may be undefined/null — safe defaults
    data = data || {};
    this._goScreen = data.goScreen || this.registry.get('goScreen') || null;
    this._saveData = data.saveData || this.registry.get('saveData') || null;
  }

  create() {
    this.step = 0;
    this._buildStep();
  }

  // ── Rebuild entire step UI ──────────────────────────────────
  _buildStep() {
    // Clear all previous children
    this.children.removeAll(true);

    // Guard: TUT_STEPS may be empty
    if (!TUT_STEPS || TUT_STEPS.length === 0) {
      // No tutorial steps — skip directly to battle
      this._finishTutorial();
      return;
    }

    const s = TUT_STEPS[this.step];
    if (!s) {
      this._finishTutorial();
      return;
    }

    // ── Dark overlay background ─────────────────────────────
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.88);

    // ── Modal box ───────────────────────────────────────────
    const bx = 20;
    const by = H / 2 - 160;
    const bw = W - 40;
    const bh = 320;

    const modal = this.add.graphics();
    // Fill
    modal.fillStyle(0x0d1b2e, 1);
    modal.fillRoundedRect(bx, by, bw, bh, 16);
    // Border
    modal.lineStyle(2, 0x3498db, 1);
    modal.strokeRoundedRect(bx, by, bw, bh, 16);

    // ── Large emoji icon ────────────────────────────────────
    this.add.text(W / 2, by + 80, s.emoji || '', {
      fontSize: '60px',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // ── Title in gold ───────────────────────────────────────
    this.add.text(W / 2, by + 130, s.title || '', {
      fontSize: '20px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#f1c40f',
    }).setOrigin(0.5, 0);

    // ── Body text with word wrapping ────────────────────────
    this.add.text(W / 2, by + 168, s.body || '', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#cccccc',
      wordWrap: { width: bw - 40 },
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5, 0);

    // ── Pagination dots ─────────────────────────────────────
    const totalDots = TUT_STEPS.length;
    const dotSpacing = 18;
    const dotsStartX = W / 2 - ((totalDots - 1) / 2) * dotSpacing;
    for (let i = 0; i < totalDots; i++) {
      const dotColor = i === this.step ? 0x3498db : 0x444444;
      this.add.circle(dotsStartX + i * dotSpacing, by + bh - 28, 5, dotColor);
    }

    // ── Navigation button ───────────────────────────────────
    const isLast = this.step >= TUT_STEPS.length - 1;
    const btnText = isLast ? 'Batalhar! \u2694\uFE0F' : 'Proximo \u2192';
    const btnW = 180;
    const btnH = 40;
    const btnX = W / 2;
    const btnY = by + bh - 60;

    // Button background
    const btnGfx = this.add.graphics();
    btnGfx.fillStyle(0x2980b9, 1);
    btnGfx.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);

    // Button label
    this.add.text(btnX, btnY, btnText, {
      fontSize: '15px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Hit zone for button
    const hitZone = this.add.zone(btnX, btnY, btnW, btnH)
      .setInteractive({ useHandCursor: true });

    // Hover effect
    hitZone.on('pointerover', () => {
      btnGfx.clear();
      btnGfx.fillStyle(0x3498db, 1);
      btnGfx.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);
      btnGfx.lineStyle(1.5, 0xffffff, 0.25);
      btnGfx.strokeRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);
    });

    hitZone.on('pointerout', () => {
      btnGfx.clear();
      btnGfx.fillStyle(0x2980b9, 1);
      btnGfx.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);
    });

    hitZone.on('pointerdown', () => {
      SFX.click();
      if (!isLast) {
        this.step++;
        if (APP) APP.tutStep = this.step;
        this._buildStep();
      } else {
        this._finishTutorial();
      }
    });
  }

  _finishTutorial() {
    // Tutorial complete — start battle
    if (APP) {
      APP.tutDone = true;
      APP.tutStep = 0;
    }
    if (APP && APP._startBattle) {
      APP._startBattle();
    } else if (this.scene.manager.getScene('BattleScene')) {
      this.scene.start('BattleScene');
    } else {
      // Fallback — go to menu
      this.scene.start('MenuScene');
    }
  }
}
