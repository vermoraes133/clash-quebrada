// ================================================================
//  BootScene.js — Loading screen with procedural logo, progress bar,
//  animated golden title, shield + swords visual, smooth transition.
//  Part of Clash Quebrada v2 (Phaser 3 + Vite)
// ================================================================
import Phaser from 'phaser';
import { W, H } from '../config/constants.js';
import { generateAllTextures } from '../rendering/TextureGenerator.js';
import { generateArenaTextures } from '../rendering/ArenaRenderer.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    const width = W;
    const height = H;

    // Dark background
    this.cameras.main.setBackgroundColor('#060610');

    // ── Animated background particles (subtle floating motes) ──
    this._bgParticles = [];
    for (let i = 0; i < 30; i++) {
      const px = Math.random() * width;
      const py = Math.random() * height;
      const dot = this.add.circle(px, py, Math.random() * 1.5 + 0.5, 0xf1c40f, Math.random() * 0.15 + 0.05);
      dot.setDepth(0);
      dot._vx = (Math.random() - 0.5) * 8;
      dot._vy = (Math.random() - 0.5) * 8;
      dot._idx = i;
      this._bgParticles.push(dot);
    }

    // ── Shield emblem (drawn procedurally via Graphics) ─────────
    this._shieldGfx = this.add.graphics().setDepth(5);
    this._drawShield(this._shieldGfx, width / 2, height * 0.28, 52);

    // ── Crossed swords behind the shield ────────────────────────
    this._swordsGfx = this.add.graphics().setDepth(4);
    this._drawCrossedSwords(this._swordsGfx, width / 2, height * 0.28, 52);

    // ── Sword emoji accents ─────────────────────────────────────
    this.add.text(width / 2 - 72, height * 0.28 - 8, '\u2694\uFE0F', {
      fontSize: '22px', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(6).setAlpha(0.7);

    this.add.text(width / 2 + 72, height * 0.28 - 8, '\u2694\uFE0F', {
      fontSize: '22px', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(6).setAlpha(0.7);

    // ── Title: "CLASH QUEBRADA" with golden glow ────────────────
    // Shadow / glow layers (drawn behind main text)
    this._titleGlow = this.add.text(width / 2, height * 0.45, 'CLASH QUEBRADA', {
      fontSize: '30px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#f1c40f',
    }).setOrigin(0.5).setDepth(9).setAlpha(0);

    // Outer glow (blurred with shadow)
    this._titleShadow = this.add.text(width / 2, height * 0.45 + 2, 'CLASH QUEBRADA', {
      fontSize: '30px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#b8860b',
    }).setOrigin(0.5).setDepth(8).setAlpha(0);

    // Main title
    this._titleMain = this.add.text(width / 2, height * 0.45, 'CLASH QUEBRADA', {
      fontSize: '30px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    // ── Subtitle ────────────────────────────────────────────────
    this._subtitle = this.add.text(width / 2, height * 0.52, 'Batalha de Quebrada', {
      fontSize: '13px',
      fontFamily: 'Arial',
      fontStyle: 'italic',
      color: '#b8860b',
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    // ── Progress bar background ─────────────────────────────────
    const barW = 260;
    const barH = 14;
    const barX = width / 2 - barW / 2;
    const barY = height * 0.62;

    this._progressBg = this.add.graphics().setDepth(10);
    this._progressBg.fillStyle(0x111122, 1);
    this._progressBg.fillRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 8);
    this._progressBg.lineStyle(1, 0xf1c40f, 0.3);
    this._progressBg.strokeRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 8);

    this._progressFill = this.add.graphics().setDepth(11);
    this._progressShine = this.add.graphics().setDepth(12);

    this._barX = barX;
    this._barY = barY;
    this._barW = barW;
    this._barH = barH;

    // ── Progress label ──────────────────────────────────────────
    this._progressLabel = this.add.text(width / 2, barY + barH + 14, 'Gerando texturas...', {
      fontSize: '11px',
      fontFamily: 'Arial',
      color: '#888888',
    }).setOrigin(0.5).setDepth(10);

    // ── Progress percentage ─────────────────────────────────────
    this._progressPct = this.add.text(width / 2, barY + barH / 2, '0%', {
      fontSize: '9px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(13);

    // ── Track generation progress ───────────────────────────────
    this._progress = 0;
    this._totalSteps = 4;
    this._generationDone = false;
    this._titleFadeProgress = 0;

    // Start title fade-in immediately
    this._titleFadeProgress = 0;

    // Start generation steps with delays for visual progress
    this.time.delayedCall(300, () => this._runGenStep(0));
  }

  // ── Run a generation step ───────────────────────────────────────
  _runGenStep(step) {
    const stepLabels = [
      'Gerando personagens...',
      'Gerando particulas...',
      'Gerando arenas...',
      'Finalizando...',
    ];

    if (this._progressLabel) {
      this._progressLabel.setText(stepLabels[step] || 'Preparando...');
    }

    try {
      if (step === 0) {
        // Character + particle + projectile + UI textures
        try {
          generateAllTextures(this);
        } catch (err) {
          console.warn('[BootScene] TextureGenerator erro:', err.message || err);
        }
        this._updateProgress(1);
        this.time.delayedCall(200, () => this._runGenStep(1));
      } else if (step === 1) {
        // Particle textures (already done in generateAllTextures, progress visual)
        this._updateProgress(2);
        this.time.delayedCall(200, () => this._runGenStep(2));
      } else if (step === 2) {
        // Arena textures
        try {
          generateArenaTextures(this);
        } catch (err) {
          console.warn('[BootScene] ArenaRenderer erro:', err.message || err);
        }
        this._updateProgress(3);
        this.time.delayedCall(200, () => this._runGenStep(3));
      } else if (step === 3) {
        // Finalize
        this._updateProgress(4);
        this._generationDone = true;
        if (this._progressLabel) {
          this._progressLabel.setText('Pronto! Aguardando login...');
        }
        if (this._progressPct) {
          this._progressPct.setText('100%');
        }
      }
    } catch (err) {
      console.warn('[BootScene] Erro na geracao (step ' + step + '):', err.message || err);
      // Continue to next step even if current fails
      this._updateProgress(step + 1);
      if (step < 3) {
        this.time.delayedCall(100, () => this._runGenStep(step + 1));
      } else {
        this._generationDone = true;
        if (this._progressLabel) {
          this._progressLabel.setText('Pronto (com avisos). Aguardando login...');
        }
      }
    }
  }

  // ── Update progress bar fill ────────────────────────────────────
  _updateProgress(completedSteps) {
    const ratio = Math.min(1, completedSteps / this._totalSteps);
    const fillW = Math.max(0, this._barW * ratio);

    if (this._progressFill) {
      this._progressFill.clear();
      if (fillW > 0) {
        this._progressFill.fillStyle(0xf1c40f, 1);
        this._progressFill.fillRoundedRect(this._barX, this._barY, fillW, this._barH, 6);
      }
    }

    if (this._progressShine) {
      this._progressShine.clear();
      if (fillW > 4) {
        this._progressShine.fillStyle(0xffffff, 0.25);
        this._progressShine.fillRoundedRect(this._barX + 2, this._barY + 1, fillW - 4, this._barH / 2 - 1, 4);
      }
    }

    const pct = Math.floor(ratio * 100);
    if (this._progressPct) {
      this._progressPct.setText(pct + '%');
    }
  }

  // ── Draw a shield shape procedurally ────────────────────────────
  _drawShield(gfx, cx, cy, size) {
    // Shield outline
    gfx.lineStyle(3, 0xf1c40f, 0.9);
    gfx.fillStyle(0x0d1a2e, 0.95);

    gfx.beginPath();
    gfx.moveTo(cx, cy - size);
    gfx.lineTo(cx + size * 0.7, cy - size * 0.7);
    gfx.lineTo(cx + size * 0.75, cy - size * 0.1);
    gfx.lineTo(cx + size * 0.55, cy + size * 0.4);
    gfx.lineTo(cx, cy + size * 0.85);
    gfx.lineTo(cx - size * 0.55, cy + size * 0.4);
    gfx.lineTo(cx - size * 0.75, cy - size * 0.1);
    gfx.lineTo(cx - size * 0.7, cy - size * 0.7);
    gfx.closePath();
    gfx.fillPath();
    gfx.strokePath();

    // Inner shield detail: vertical stripe
    gfx.fillStyle(0xf1c40f, 0.15);
    gfx.fillRect(cx - 4, cy - size * 0.8, 8, size * 1.4);

    // Inner shield detail: horizontal stripe
    gfx.fillRect(cx - size * 0.45, cy - size * 0.15, size * 0.9, 6);

    // Center diamond emblem
    gfx.fillStyle(0xf1c40f, 0.8);
    gfx.beginPath();
    gfx.moveTo(cx, cy - 14);
    gfx.lineTo(cx + 10, cy);
    gfx.lineTo(cx, cy + 14);
    gfx.lineTo(cx - 10, cy);
    gfx.closePath();
    gfx.fillPath();

    // Diamond inner highlight
    gfx.fillStyle(0xffffff, 0.3);
    gfx.beginPath();
    gfx.moveTo(cx, cy - 8);
    gfx.lineTo(cx + 5, cy);
    gfx.lineTo(cx, cy + 8);
    gfx.lineTo(cx - 5, cy);
    gfx.closePath();
    gfx.fillPath();
  }

  // ── Draw crossed swords behind the shield ───────────────────────
  _drawCrossedSwords(gfx, cx, cy, size) {
    const sLen = size * 1.4;
    const angle = 0.45;

    // Sword 1 (top-left to bottom-right)
    gfx.lineStyle(4, 0x888888, 0.7);
    gfx.beginPath();
    gfx.moveTo(cx - Math.cos(angle) * sLen, cy - Math.sin(angle) * sLen);
    gfx.lineTo(cx + Math.cos(angle) * sLen, cy + Math.sin(angle) * sLen);
    gfx.strokePath();

    // Sword 2 (top-right to bottom-left)
    gfx.beginPath();
    gfx.moveTo(cx + Math.cos(angle) * sLen, cy - Math.sin(angle) * sLen);
    gfx.lineTo(cx - Math.cos(angle) * sLen, cy + Math.sin(angle) * sLen);
    gfx.strokePath();

    // Sword handles (cross guards)
    gfx.lineStyle(3, 0xb8860b, 0.8);

    const h1x = cx - Math.cos(angle) * sLen * 0.65;
    const h1y = cy - Math.sin(angle) * sLen * 0.65;
    gfx.beginPath();
    gfx.moveTo(h1x - 8, h1y + 4);
    gfx.lineTo(h1x + 8, h1y - 4);
    gfx.strokePath();

    const h2x = cx + Math.cos(angle) * sLen * 0.65;
    const h2y = cy - Math.sin(angle) * sLen * 0.65;
    gfx.beginPath();
    gfx.moveTo(h2x - 8, h2y - 4);
    gfx.lineTo(h2x + 8, h2y + 4);
    gfx.strokePath();

    // Sword tips (brighter)
    gfx.lineStyle(2, 0xcccccc, 0.9);

    const t1x = cx + Math.cos(angle) * sLen;
    const t1y = cy + Math.sin(angle) * sLen;
    gfx.beginPath();
    gfx.moveTo(t1x - 3, t1y);
    gfx.lineTo(t1x + 3, t1y);
    gfx.strokePath();

    const t2x = cx - Math.cos(angle) * sLen;
    const t2y = cy + Math.sin(angle) * sLen;
    gfx.beginPath();
    gfx.moveTo(t2x - 3, t2y);
    gfx.lineTo(t2x + 3, t2y);
    gfx.strokePath();
  }

  // ── Update loop (animate particles, title glow, etc.) ───────────
  update(time, delta) {
    const t = time * 0.001;
    const dt = delta / 1000;

    // Animate background particles
    if (this._bgParticles) {
      for (const p of this._bgParticles) {
        p.x += p._vx * dt;
        p.y += p._vy * dt;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
        const alpha = 0.05 + Math.sin(t * 1.5 + p._idx * 0.8) * 0.1;
        p.setAlpha(Math.max(0.02, alpha));
      }
    }

    // Title fade-in animation
    if (this._titleFadeProgress < 1) {
      this._titleFadeProgress = Math.min(1, this._titleFadeProgress + dt * 1.2);
      const a = this._titleFadeProgress;
      const ease = a * a * (3 - 2 * a); // smoothstep

      if (this._titleMain) this._titleMain.setAlpha(ease);
      if (this._titleShadow) this._titleShadow.setAlpha(ease * 0.6);
      if (this._subtitle) this._subtitle.setAlpha(ease * 0.8);
    }

    // Animated golden glow pulse on title
    if (this._titleGlow) {
      const glowAlpha = 0.15 + Math.sin(t * 2.5) * 0.12;
      this._titleGlow.setAlpha(glowAlpha);
      const scl = 1 + Math.sin(t * 2.5) * 0.012;
      this._titleGlow.setScale(scl);
    }

    // Shield glow pulse
    if (this._shieldGfx) {
      const shieldAlpha = 0.85 + Math.sin(t * 1.8) * 0.15;
      this._shieldGfx.setAlpha(shieldAlpha);
    }
  }
}
