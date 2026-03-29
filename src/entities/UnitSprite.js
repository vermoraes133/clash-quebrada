// ════════════════════════════════════════════════════════════
//  UnitSprite.js — Phaser Container representing a battle unit
//  Replaces Canvas2D drawUnit() from DrawEntities.js
//  Contains: shadow, glow ring, body circle, radial highlight,
//  character image, HP bar (smooth dispHp), status rings,
//  hit flash, level badge, bobbing animation, death animation
// ════════════════════════════════════════════════════════════
import Phaser from 'phaser';
import { getCharCanvas } from '../ui/CharacterRenderer.js';

export default class UnitSprite extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} unit — unit data from BattleLogic (id, key, team, x, y, r, color, hp, maxHp, etc.)
   */
  constructor(scene, unit) {
    super(scene, unit.x, unit.y);
    this.unitId   = unit.id;
    this.unitKey  = unit.key;
    this.team     = unit.team;
    this.baseR    = unit.r;
    this.unitColor = unit.color;

    // Internal state for smooth HP display
    this._dispHp  = unit.hp;
    this._prevHp  = unit.hp;
    this._maxHp   = unit.maxHp;

    // Build visual layers bottom-to-top
    this._createShadow();
    this._createStatusRings();
    this._createGlowRing();
    this._createBodyCircle();
    this._createRadialHighlight();
    this._createCharacterImage(unit);
    this._createHitFlashOverlay();
    this._createHPBar();
    this._createLevelBadge();

    scene.add.existing(this);
    this.setDepth(10);
  }

  // ── Shadow ellipse beneath the unit ────────────────────────
  _createShadow() {
    this.shadow = this.scene.add.ellipse(
      3, this.baseR * 0.78,
      this.baseR * 1.36, this.baseR * 0.48,
      0x000000, 0.3
    );
    this.add(this.shadow);
  }

  // ── Status effect rings (stun yellow / slow cyan) ──────────
  // Created once, hidden by default; toggled in sync()
  _createStatusRings() {
    // Stun ring — yellow, thick
    this.stunRing = this.scene.add.circle(0, 0, this.baseR + 6)
      .setStrokeStyle(3.5, 0xffe600, 0.9)
      .setFillStyle(0x000000, 0);
    this.stunRing.setVisible(false);
    this.add(this.stunRing);

    // Slow ring — cyan, slightly thinner
    this.slowRing = this.scene.add.circle(0, 0, this.baseR + 4)
      .setStrokeStyle(2.5, 0x00e6ff, 0.8)
      .setFillStyle(0x000000, 0);
    this.slowRing.setVisible(false);
    this.add(this.slowRing);
  }

  // ── Team glow ring (blue for player, red for enemy) ────────
  _createGlowRing() {
    const isPlayer = this.team === 'player';
    const strokeColor = isPlayer ? 0x85c1e9 : 0xf1948a;
    const glowColor   = isPlayer ? 0x5dade2 : 0xe74c3c;

    // Outer glow — a slightly larger translucent circle behind stroke
    this.glowOuter = this.scene.add.circle(0, 0, this.baseR + 4, glowColor, 0.15);
    this.add(this.glowOuter);

    // Stroke ring
    this.glowRing = this.scene.add.circle(0, 0, this.baseR)
      .setStrokeStyle(2.5, strokeColor, 1)
      .setFillStyle(0x000000, 0);
    this.add(this.glowRing);
  }

  // ── Solid body circle (unit color) ─────────────────────────
  _createBodyCircle() {
    const color = Phaser.Display.Color.ValueToColor(this.unitColor).color;
    this.bodyCircle = this.scene.add.circle(0, 0, this.baseR, color, 1);
    this.add(this.bodyCircle);
  }

  // ── 3D radial highlight (sphere illusion) ──────────────────
  // Phaser doesn't have native radialGradient on Graphics,
  // so we use a pre-rendered Canvas texture for the highlight.
  _createRadialHighlight() {
    const r = this.baseR;
    const size = Math.ceil(r * 2.2);
    const texKey = `_unitHL_${size}`;

    if (!this.scene.textures.exists(texKey)) {
      const cv = document.createElement('canvas');
      cv.width = size; cv.height = size;
      const c = cv.getContext('2d');
      const cx = size / 2, cy = size / 2;
      // Specular highlight top-left
      const g = c.createRadialGradient(
        cx - r * 0.32, cy - r * 0.38, r * 0.06,
        cx, cy, r
      );
      g.addColorStop(0,   'rgba(255,255,255,0.42)');
      g.addColorStop(0.45,'rgba(255,255,255,0.08)');
      g.addColorStop(1,   'rgba(0,0,0,0.18)');
      c.fillStyle = g;
      c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      this.scene.textures.addCanvas(texKey, cv);
    }

    this.radialHL = this.scene.add.image(0, 0, texKey);
    this.add(this.radialHL);
  }

  // ── Character procedural image (from CharacterRenderer cache) ─
  _createCharacterImage(unit) {
    const r = this.baseR;
    const texKey = `char_${this.unitKey}_${this.team}_${Math.round(r)}`;

    if (!this.scene.textures.exists(texKey)) {
      // Generate canvas via CharacterRenderer
      const charCanvas = getCharCanvas(this.unitKey, this.team, r);
      if (charCanvas) {
        this.scene.textures.addCanvas(texKey, charCanvas);
      }
    }

    if (this.scene.textures.exists(texKey)) {
      this.charImg = this.scene.add.image(0, 0, texKey);
      this.add(this.charImg);
    }
  }

  // ── Hit flash overlay (red circle shown briefly on damage) ──
  _createHitFlashOverlay() {
    this.hitOverlay = this.scene.add.circle(0, 0, this.baseR + 1, 0xff3c3c, 0);
    this.add(this.hitOverlay);
  }

  // ── HP bar (background + dark real + bright display + shine) ─
  _createHPBar() {
    const bw = this.baseR * 2.4;
    this.hpBarWidth = bw;
    this.hpBarGfx = this.scene.add.graphics();
    this.hpBarGfx.setPosition(-bw / 2, -this.baseR - 12);
    this.add(this.hpBarGfx);
  }

  // ── Level badge (gold circle + number, player-only, lvl > 1) ─
  _createLevelBadge() {
    // Created on demand during sync since level info comes from getCardLevel
    this.badgeCircle = null;
    this.badgeText   = null;
    this._badgeLvl   = 0;
  }

  // ══════════════════════════════════════════════════════════════
  //  sync() — called every frame from BattleScene
  //  Updates position, HP, status effects, hit flash, badge
  // ══════════════════════════════════════════════════════════════
  /**
   * @param {object} unit — live unit data from G.units
   * @param {number} time — scene time (ms) for bobbing
   * @param {function} getCardLevel — (key) => number
   */
  sync(unit, time, getCardLevel) {
    // ── Position with sine-wave bobbing ──────────────────────
    const tSec = time / 1000;
    const bob = Math.sin(tSec * 2.8 + (unit.id || 0) * 0.9) * 1.6;
    this.setPosition(unit.x, unit.y + bob);

    // ── HP bar (smooth dispHp tween) ─────────────────────────
    this._maxHp = unit.maxHp;
    this._prevHp = unit.hp;
    // Smooth dispHp lerp (same logic as original: dispHp -> hp over frames)
    if (unit.dispHp !== undefined) {
      this._dispHp = unit.dispHp;
    } else {
      this._dispHp = unit.hp;
    }
    this._drawHPBar(unit.hp, this._dispHp, unit.maxHp);

    // ── Hit flash ────────────────────────────────────────────
    if (unit.hitFlash > 0) {
      this.hitOverlay.setAlpha(Math.min(1, unit.hitFlash / 0.1) * 0.6);
    } else {
      this.hitOverlay.setAlpha(0);
    }

    // ── Status rings ─────────────────────────────────────────
    this.stunRing.setVisible(unit.stun > 0);
    this.slowRing.setVisible(unit.slow > 0);

    // Pulsing stun ring animation
    if (unit.stun > 0) {
      const pulse = 1 + Math.sin(tSec * 12) * 0.06;
      this.stunRing.setScale(pulse);
    }

    // ── Level badge (player-only, lvl > 1) ───────────────────
    if (this.team === 'player' && getCardLevel) {
      const lvl = getCardLevel(unit.key);
      if (lvl > 1) {
        this._showBadge(lvl);
      } else {
        this._hideBadge();
      }
    }

    // ── Visibility ───────────────────────────────────────────
    this.setVisible(unit.alive);
  }

  // ── Internal: draw HP bar ──────────────────────────────────
  _drawHPBar(hp, dispHp, maxHp) {
    const g = this.hpBarGfx;
    const w = this.hpBarWidth;
    const ratio     = Math.max(0, hp / maxHp);
    const dispRatio = Math.max(0, dispHp / maxHp);

    g.clear();

    // Background (dark rounded rect)
    g.fillStyle(0x000000, 0.75);
    g.fillRoundedRect(-1, -1, w + 2, 8, 4);

    // Real HP fill (darker shade)
    if (ratio > 0) {
      const darkColor = ratio > 0.6 ? 0x1a8a4a
                      : ratio > 0.3 ? 0xa06010
                      :                0x8c1a1a;
      g.fillStyle(darkColor, 1);
      g.fillRoundedRect(0, 0, w * ratio, 6, 3);
    }

    // Display HP fill (bright, smooth-tweened value)
    if (dispRatio > 0) {
      const brightColor = dispRatio > 0.6 ? 0x2ecc71
                        : dispRatio > 0.3 ? 0xf39c12
                        :                    0xe74c3c;
      g.fillStyle(brightColor, 1);
      g.fillRoundedRect(0, 0, w * dispRatio, 6, 3);
    }

    // Shine highlight (top half of display bar)
    if (dispRatio > 0) {
      g.fillStyle(0xffffff, 0.22);
      g.fillRoundedRect(0, 0, w * dispRatio, 3, 2);
    }
  }

  // ── Internal: show / update level badge ────────────────────
  _showBadge(lvl) {
    const r = this.baseR;
    const bx = r * 0.7;
    const by = -r * 0.7;

    if (this._badgeLvl === lvl) return; // already showing correct level
    this._badgeLvl = lvl;

    // Clean up old badge if exists
    this._hideBadge();

    // Gold circle
    this.badgeCircle = this.scene.add.circle(bx, by, 7, 0xf1c40f, 1);
    this.add(this.badgeCircle);

    // Level number
    this.badgeText = this.scene.add.text(bx, by, String(lvl), {
      fontFamily: 'Arial',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#000000',
      align: 'center',
    }).setOrigin(0.5, 0.5);
    this.add(this.badgeText);
  }

  _hideBadge() {
    if (this.badgeCircle) { this.badgeCircle.destroy(); this.badgeCircle = null; }
    if (this.badgeText)   { this.badgeText.destroy();   this.badgeText = null;   }
    this._badgeLvl = 0;
  }

  // ══════════════════════════════════════════════════════════════
  //  playDeath() — shrink + fade out (280ms), then destroy
  //  Replicates the G.dying ghost animation from the original:
  //  scale(a,a) + globalAlpha=a where a goes from 1 to 0 in 280ms
  // ══════════════════════════════════════════════════════════════
  playDeath() {
    // Emit dust puff particles around death point
    this._emitDeathPuffs();

    // Shrink and fade
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 280,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
      }
    });
  }

  // ── Dust puff particles on death ───────────────────────────
  // Replicates the 7 puff particles from BattleLogic dealDmg
  _emitDeathPuffs() {
    const r = this.baseR;
    for (let i = 0; i < 7; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 16 + Math.random() * 28;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 18;
      const puffR = r * 0.7;

      const puff = this.scene.add.circle(this.x, this.y, puffR, 0xbeaa91, 0.42);
      puff.setDepth(this.depth - 1);

      this.scene.tweens.add({
        targets: puff,
        x: puff.x + vx * 0.32,
        y: puff.y + vy * 0.32,
        alpha: 0,
        scaleX: 1.6,
        scaleY: 1.6,
        duration: 320,
        ease: 'Power1',
        onUpdate: (tween) => {
          // Decelerate (multiply velocity by 0.86 per frame approx)
          const progress = tween.progress;
          const decel = Math.pow(0.86, progress * 20);
          puff.x = this.x + vx * 0.32 * (1 - decel * (1 - progress));
          puff.y = this.y + vy * 0.32 * (1 - decel * (1 - progress));
        },
        onComplete: () => puff.destroy()
      });
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  Cleanup
  // ══════════════════════════════════════════════════════════════
  destroy(fromScene) {
    this._hideBadge();
    super.destroy(fromScene);
  }
}
