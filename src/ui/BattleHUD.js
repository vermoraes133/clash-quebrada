// ================================================================
//  BattleHUD.js — Phaser 3 Container
//  Timer, difficulty badge, forfeit button with confirmation
//  dialog, and card-selected tooltip indicator.
//
//  Constructor options:
//    { onForfeitConfirm, onForfeitCancel }
//
//  Call .update(time, showForfeitConfirm, selIndex, hand) each frame.
// ================================================================

import Phaser from 'phaser';
import { APP } from '../state/GameState.js';
import {
  W, H, ARENA_TOP, ARENA_BOT,
} from '../config/constants.js';
import { currentDiff, G } from '../systems/BattleLogic.js';

// ── Layout constants ──────────────────────────────────────────
const TIMER_X = W / 2;
const TIMER_Y = ARENA_TOP + 17;
const TIMER_BG_W = 80;
const TIMER_BG_H = 26;

const DIFF_X = 39;
const DIFF_Y = ARENA_TOP + 13;
const DIFF_W = 70;
const DIFF_H = 18;

const FORFEIT_X = 18;
const FORFEIT_Y = ARENA_BOT - 15;
const FORFEIT_W = 28;
const FORFEIT_H = 22;

const DIALOG_W = 260;
const DIALOG_H = 120;
const DIALOG_X = W / 2 - DIALOG_W / 2;
const DIALOG_Y = H / 2 - DIALOG_H / 2;

const BTN_W = 105;
const BTN_H = 32;
const BTN_Y = H / 2 + 14;

export default class BattleHUD extends Phaser.GameObjects.Container {
  constructor(scene, opts) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(60);

    this.onForfeitConfirm = opts.onForfeitConfirm || (() => {});
    this.onForfeitCancel = opts.onForfeitCancel || (() => {});

    // ── Timer ────────────────────────────────────────────
    this.timerBg = scene.add.rectangle(TIMER_X, TIMER_Y, TIMER_BG_W, TIMER_BG_H, 0x000000, 0.55)
      .setDepth(59);
    this.add(this.timerBg);

    this.timerBg.setStrokeStyle(1, 0x333333, 0.4);

    this.timerText = scene.add.text(TIMER_X, TIMER_Y, '3:00', {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ecf0f1',
      fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(60);
    this.add(this.timerText);

    // ── Difficulty badge (solo mode only) ────────────────
    this.diffBg = scene.add.graphics().setDepth(59);
    this.add(this.diffBg);

    this.diffText = scene.add.text(DIFF_X, DIFF_Y, '', {
      fontSize: '9px',
      color: '#f1c40f',
      fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(60);
    this.add(this.diffText);

    if (APP.mode === 'solo') {
      this.diffBg.fillStyle(0x000000, 0.5);
      this.diffBg.fillRoundedRect(4, ARENA_TOP + 4, DIFF_W, DIFF_H, 5);
      this.diffText.setText(currentDiff.label || 'Medio');
    } else {
      this.diffBg.setVisible(false);
      this.diffText.setVisible(false);
    }

    // ── Forfeit button ──────────────────────────────────
    this.forfeitBg = scene.add.rectangle(FORFEIT_X, FORFEIT_Y, FORFEIT_W, FORFEIT_H, 0xb41e1e, 1)
      .setDepth(60)
      .setInteractive({ useHandCursor: true });
    this.add(this.forfeitBg);

    // Round the corners visually with a graphics overlay
    this.forfeitGfx = scene.add.graphics().setDepth(60);
    this.forfeitGfx.fillStyle(0xb41e1e, 0.8);
    this.forfeitGfx.fillRoundedRect(FORFEIT_X - FORFEIT_W / 2, FORFEIT_Y - FORFEIT_H / 2, FORFEIT_W, FORFEIT_H, 5);
    this.add(this.forfeitGfx);
    // Hide the raw rect behind the rounded one
    this.forfeitBg.setAlpha(0);

    this.forfeitIcon = scene.add.text(FORFEIT_X, FORFEIT_Y, 'FF', {
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ffffff',
      fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(61);
    this.add(this.forfeitIcon);

    this.forfeitBg.on('pointerdown', () => {
      G.showForfeitConfirm = !G.showForfeitConfirm;
    });

    // ── Forfeit confirmation dialog ─────────────────────
    this.dialogContainer = scene.add.container(0, 0).setDepth(90).setVisible(false);
    this.add(this.dialogContainer);
    this._createForfeitDialog(scene);

    // Cache last state to avoid redundant updates
    this._lastTimerStr = '';
    this._lastUrgent = false;
    this._lastForfeitVisible = false;
  }

  // ── Forfeit confirmation dialog ────────────────────────
  _createForfeitDialog(scene) {
    // Backdrop
    const backdrop = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6);
    backdrop.setInteractive(); // blocks clicks through
    this.dialogContainer.add(backdrop);

    // Dialog box
    const boxGfx = scene.add.graphics();
    boxGfx.fillStyle(0x000000, 0.88);
    boxGfx.fillRoundedRect(DIALOG_X, DIALOG_Y, DIALOG_W, DIALOG_H, 12);
    boxGfx.lineStyle(2, 0xe74c3c, 1);
    boxGfx.strokeRoundedRect(DIALOG_X, DIALOG_Y, DIALOG_W, DIALOG_H, 12);
    this.dialogContainer.add(boxGfx);

    // Title
    const title = scene.add.text(W / 2, H / 2 - 48, 'Desistir da partida?', {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0);
    this.dialogContainer.add(title);

    // Body text line 1
    const body1 = scene.add.text(W / 2, H / 2 - 26, 'Seu adversario leva a vitoria', {
      fontSize: '11px',
      color: '#bbbbbb',
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0);
    this.dialogContainer.add(body1);

    // Body text line 2
    const body2 = scene.add.text(W / 2, H / 2 - 10, 'mas nao ganha diamantes.', {
      fontSize: '11px',
      color: '#bbbbbb',
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0);
    this.dialogContainer.add(body2);

    // ── Confirm button ──────────────────────────────────
    const confirmBtnGfx = scene.add.graphics();
    confirmBtnGfx.fillStyle(0xc0392b, 1);
    confirmBtnGfx.fillRoundedRect(W / 2 - 115, BTN_Y, BTN_W, BTN_H, 8);
    this.dialogContainer.add(confirmBtnGfx);

    const confirmHit = scene.add.rectangle(W / 2 - 115 + BTN_W / 2, BTN_Y + BTN_H / 2, BTN_W, BTN_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.dialogContainer.add(confirmHit);

    const confirmText = scene.add.text(W / 2 - 62, BTN_Y + BTN_H / 2, 'Confirmar', {
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);
    this.dialogContainer.add(confirmText);

    confirmHit.on('pointerdown', () => {
      this.dialogContainer.setVisible(false);
      this.onForfeitConfirm();
    });

    // ── Cancel button ───────────────────────────────────
    const cancelBtnGfx = scene.add.graphics();
    cancelBtnGfx.fillStyle(0x2c3e50, 1);
    cancelBtnGfx.fillRoundedRect(W / 2 + 10, BTN_Y, BTN_W, BTN_H, 8);
    this.dialogContainer.add(cancelBtnGfx);

    const cancelHit = scene.add.rectangle(W / 2 + 10 + BTN_W / 2, BTN_Y + BTN_H / 2, BTN_W, BTN_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.dialogContainer.add(cancelHit);

    const cancelText = scene.add.text(W / 2 + 62, BTN_Y + BTN_H / 2, 'Cancelar', {
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);
    this.dialogContainer.add(cancelText);

    cancelHit.on('pointerdown', () => {
      this.dialogContainer.setVisible(false);
      this.onForfeitCancel();
    });
  }

  // ── Per-frame update ────────────────────────────────────
  update(time, showForfeitConfirm, selIndex, hand) {
    // ── Timer ────────────────────────────────────────────
    const m = Math.floor(Math.max(0, time) / 60);
    const s = Math.floor(Math.max(0, time) % 60).toString().padStart(2, '0');
    const timerStr = `${m}:${s}`;
    const urgent = time < 30 && Math.floor(Date.now() / 500) % 2 === 0;

    if (timerStr !== this._lastTimerStr || urgent !== this._lastUrgent) {
      this._lastTimerStr = timerStr;
      this._lastUrgent = urgent;
      this.timerText.setText(timerStr);
      this.timerText.setColor(urgent ? '#e74c3c' : '#ecf0f1');

      // Pulse the timer background when urgent
      if (urgent) {
        this.timerBg.setFillStyle(0x3c0000, 0.7);
      } else {
        this.timerBg.setFillStyle(0x000000, 0.55);
      }
    }

    // ── Overtime indicator ───────────────────────────────
    if (time < 60 && time > 0) {
      // Extra time visual cue: timer border turns red
      this.timerBg.setStrokeStyle(1.5, 0xe74c3c, 0.6);
    } else {
      this.timerBg.setStrokeStyle(1, 0x333333, 0.4);
    }

    // ── Forfeit dialog ──────────────────────────────────
    if (showForfeitConfirm !== this._lastForfeitVisible) {
      this._lastForfeitVisible = showForfeitConfirm;
      this.dialogContainer.setVisible(showForfeitConfirm);
    }
  }

  // ── Cleanup ─────────────────────────────────────────────
  destroy() {
    if (this.timerBg) this.timerBg.destroy();
    if (this.timerText) this.timerText.destroy();
    if (this.diffBg) this.diffBg.destroy();
    if (this.diffText) this.diffText.destroy();
    if (this.forfeitBg) this.forfeitBg.destroy();
    if (this.forfeitGfx) this.forfeitGfx.destroy();
    if (this.forfeitIcon) this.forfeitIcon.destroy();
    if (this.dialogContainer) this.dialogContainer.destroy();
    super.destroy();
  }
}
