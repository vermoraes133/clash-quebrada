// ================================================================
//  ElixirBar.js — Phaser 3 Container
//  10 glowing elixir segments at the bottom of the battle screen.
//  Call .update(elixir) each frame to sync with G.p1Elixir.
// ================================================================

import Phaser from 'phaser';
import { W, ARENA_BOT } from '../config/constants.js';

const EW = W - 20;   // total bar width
const EH = 20;       // bar height
const EX = 10;       // x offset
const EY = ARENA_BOT + 7; // y offset
const SEG_COUNT = 10;
const SEG_GAP = 1;
const SEG_W = (EW - 2) / SEG_COUNT - SEG_GAP;
const FULL_COLOR = 0x9b59b6;
const EMPTY_COLOR = 0x2c1654;
const BG_COLOR = 0x12082a;
const BORDER_COLOR = 0x9b59b6;
const SHINE_COLOR = 0xffffff;

export default class ElixirBar extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(52);

    // ── Background ─────────────────────────────────────────
    this.barGfx = scene.add.graphics();
    this.add(this.barGfx);

    // ── Segments ───────────────────────────────────────────
    this.segRects = [];
    for (let i = 0; i < SEG_COUNT; i++) {
      const sx = EX + 1 + i * (SEG_W + SEG_GAP);
      // Each segment is tracked by its x position
      this.segRects.push({ x: sx, y: EY + 1, w: SEG_W, h: EH - 2 });
    }

    // ── Segment graphics ──────────────────────────────────
    this.segGfx = scene.add.graphics();
    this.add(this.segGfx);

    // ── Glow graphics (shadowBlur simulation) ─────────────
    this.glowGfx = scene.add.graphics();
    this.add(this.glowGfx);

    // ── Elixir text ───────────────────────────────────────
    this.elixirText = scene.add.text(W / 2, EY + EH + 3, '', {
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#d7bde2',
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0);
    this.add(this.elixirText);

    // Initial draw of static background
    this._drawBackground();

    // Cache last rendered integer to skip redundant redraws
    this._lastInt = -1;
    this._lastFrac = -1;
  }

  // ── Static background (drawn once) ─────────────────────
  _drawBackground() {
    const g = this.barGfx;
    g.clear();

    // Rounded background
    g.fillStyle(BG_COLOR, 1);
    g.fillRoundedRect(EX, EY, EW, EH, 5);

    // Border
    g.lineStyle(1, BORDER_COLOR, 0.3);
    g.strokeRoundedRect(EX, EY, EW, EH, 5);
  }

  // ── Per-frame update ───────────────────────────────────
  update(elixir) {
    const intE = Math.floor(elixir);
    const fracE = Math.floor((elixir - intE) * 10); // 0-9 precision

    // Skip redraw if nothing visually changed
    if (intE === this._lastInt && fracE === this._lastFrac) return;
    this._lastInt = intE;
    this._lastFrac = fracE;

    const sg = this.segGfx;
    const gg = this.glowGfx;
    sg.clear();
    gg.clear();

    for (let i = 0; i < SEG_COUNT; i++) {
      const s = this.segRects[i];
      const filled = elixir >= i + 1;
      const partial = !filled && elixir > i;
      const frac = partial ? (elixir - i) : 0;

      if (filled) {
        // Glow behind filled segments
        gg.fillStyle(0xb06ad4, 0.25);
        gg.fillRoundedRect(s.x - 2, s.y - 2, s.w + 4, s.h + 4, 3);

        // Filled segment
        sg.fillStyle(FULL_COLOR, 1);
        sg.fillRoundedRect(s.x, s.y, s.w, s.h, 2);

        // Shine on top half
        sg.fillStyle(SHINE_COLOR, 0.18);
        sg.fillRoundedRect(s.x, s.y, s.w, s.h / 2 - 1, 2);
      } else if (partial) {
        // Partial fill (fractional elixir)
        sg.fillStyle(EMPTY_COLOR, 1);
        sg.fillRoundedRect(s.x, s.y, s.w, s.h, 2);

        // Partial overlay
        const pw = s.w * frac;
        if (pw > 0) {
          sg.fillStyle(FULL_COLOR, 0.7 + frac * 0.3);
          sg.fillRoundedRect(s.x, s.y, Math.max(2, pw), s.h, 2);

          // Partial shine
          sg.fillStyle(SHINE_COLOR, 0.1 * frac);
          sg.fillRoundedRect(s.x, s.y, Math.max(2, pw), s.h / 2 - 1, 2);
        }
      } else {
        // Empty segment
        sg.fillStyle(EMPTY_COLOR, 1);
        sg.fillRoundedRect(s.x, s.y, s.w, s.h, 2);
      }
    }

    // Update text
    this.elixirText.setText(`${intE}`);
  }

  // ── Cleanup ─────────────────────────────────────────────
  destroy() {
    if (this.barGfx) this.barGfx.destroy();
    if (this.segGfx) this.segGfx.destroy();
    if (this.glowGfx) this.glowGfx.destroy();
    if (this.elixirText) this.elixirText.destroy();
    super.destroy();
  }
}
