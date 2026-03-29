// ════════════════════════════════════════════════════════════
//  ProjectileSprite.js — Phaser Container for projectiles
//  Glowing circle with a comet-like trail of 9 points.
//  Replicates drawProjectile() from DrawEntities.js:
//    - Trail of 9 line segments with increasing alpha/width
//    - Bright glowing core circle
//    - White center dot
//    - Tower projectiles are larger than unit projectiles
// ════════════════════════════════════════════════════════════
import Phaser from 'phaser';

// How many past positions we track for the trail
const TRAIL_LENGTH = 9;

export default class ProjectileSprite extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} proj — { x, y, color, isTower, alive, trail, ... }
   */
  constructor(scene, proj) {
    super(scene, proj.x, proj.y);
    this.projId    = proj._spriteId || null;  // optional tracking id
    this.isTower   = !!proj.isTower;
    this.projColor = proj.color || '#ff6600';

    const pr = this.isTower ? 6 : 4.5;
    this._coreRadius = pr;

    // Parse the CSS color string into a Phaser color integer
    this._colorInt = this._parseColor(this.projColor);
    this._trailColorInt = 0xffd250; // gold trail

    // ── Pre-render glow texture (core + halo) ────────────────
    this._glowTexKey = this._createGlowTexture(pr);

    // ── Core image (the bright projectile ball with glow) ────
    this.coreImg = scene.add.image(0, 0, this._glowTexKey);
    this.add(this.coreImg);

    // ── White center dot ─────────────────────────────────────
    this.centerDot = scene.add.circle(0, 0, pr * 0.38, 0xffffff, 0.9);
    this.add(this.centerDot);

    // ── Trail graphics (drawn fresh each frame) ──────────────
    this.trailGfx = scene.add.graphics();
    // Trail is drawn in world space (not relative to container) so
    // we do NOT add it to this container; it is managed separately.
    this.trailGfx.setDepth(14); // just below projectile (depth 15)

    // Trail history: array of {x, y}
    this._trailHistory = [];
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      this._trailHistory.push({ x: proj.x, y: proj.y });
    }

    scene.add.existing(this);
    this.setDepth(15);
  }

  // ══════════════════════════════════════════════════════════════
  //  Pre-render the glowing core as a canvas texture
  //  (radial gradient with bright center and soft halo)
  // ══════════════════════════════════════════════════════════════
  _createGlowTexture(pr) {
    const size = Math.ceil(pr * 5);
    const texKey = `_projGlow_${this.isTower ? 'T' : 'U'}_${this._colorInt}`;

    if (this.scene.textures.exists(texKey)) return texKey;

    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const ctx = cv.getContext('2d');
    const cx = size / 2, cy = size / 2;

    // Outer glow halo (gold/warm)
    const glowR = pr * 2.2;
    const gOuter = ctx.createRadialGradient(cx, cy, pr * 0.3, cx, cy, glowR);
    gOuter.addColorStop(0,   'rgba(255,220,60,0.65)');
    gOuter.addColorStop(0.4, 'rgba(255,200,40,0.25)');
    gOuter.addColorStop(1,   'rgba(255,180,20,0)');
    ctx.fillStyle = gOuter;
    ctx.fillRect(0, 0, size, size);

    // Core circle (projectile color)
    ctx.fillStyle = this.projColor;
    ctx.beginPath();
    ctx.arc(cx, cy, pr, 0, Math.PI * 2);
    ctx.fill();

    // Inner specular highlight
    const gSpec = ctx.createRadialGradient(cx - pr * 0.2, cy - pr * 0.2, pr * 0.1, cx, cy, pr);
    gSpec.addColorStop(0,   'rgba(255,255,255,0.55)');
    gSpec.addColorStop(0.5, 'rgba(255,255,255,0.1)');
    gSpec.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = gSpec;
    ctx.beginPath();
    ctx.arc(cx, cy, pr, 0, Math.PI * 2);
    ctx.fill();

    this.scene.textures.addCanvas(texKey, cv);
    return texKey;
  }

  // ══════════════════════════════════════════════════════════════
  //  sync() — called every frame from BattleScene
  //  Updates position and redraws trail
  // ══════════════════════════════════════════════════════════════
  /**
   * @param {object} proj — live projectile data from G.projs
   */
  sync(proj) {
    // ── Update trail history ─────────────────────────────────
    // Shift entries: oldest out, newest at end
    this._trailHistory.push({ x: proj.x, y: proj.y });
    if (this._trailHistory.length > TRAIL_LENGTH) {
      this._trailHistory.shift();
    }

    // ── Update main position ─────────────────────────────────
    this.setPosition(proj.x, proj.y);

    // ── Redraw trail ─────────────────────────────────────────
    this._drawTrail();
  }

  // ── Internal: draw the comet trail ─────────────────────────
  // Replicates the original Canvas2D trail:
  //   - 9 segments from oldest to newest
  //   - alpha increases: (i/length)*0.55
  //   - lineWidth increases: (i/length) * (isTower?5:3)
  //   - color: rgba(255,210,80, alpha)
  //   - lineCap: round
  _drawTrail() {
    const g = this.trailGfx;
    g.clear();

    const trail = this._trailHistory;
    if (trail.length < 2) return;

    const maxWidth = this.isTower ? 5 : 3;

    for (let i = 1; i < trail.length; i++) {
      const ta = i / trail.length;
      const alpha = ta * 0.55;
      const width = ta * maxWidth;

      if (width < 0.2) continue; // skip imperceptible segments

      g.lineStyle(width, this._trailColorInt, alpha);
      g.beginPath();
      g.moveTo(trail[i - 1].x, trail[i - 1].y);
      g.lineTo(trail[i].x, trail[i].y);
      g.strokePath();
    }

    // Add a soft glow dot at each trail point for extra richness
    for (let i = 0; i < trail.length; i++) {
      const ta = i / trail.length;
      const dotR = (this.isTower ? 2.5 : 1.5) * ta;
      const dotAlpha = ta * 0.3;
      if (dotR < 0.3) continue;

      g.fillStyle(this._trailColorInt, dotAlpha);
      g.fillCircle(trail[i].x, trail[i].y, dotR);
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  playImpact() — optional hit effect when projectile reaches target
  //  Small flash + ring expansion
  // ══════════════════════════════════════════════════════════════
  playImpact() {
    const scene = this.scene;
    if (!scene) return;

    // Impact flash circle
    const flash = scene.add.circle(this.x, this.y, this._coreRadius * 2, 0xffffff, 0.7)
      .setDepth(16);
    scene.tweens.add({
      targets: flash,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 180,
      ease: 'Power2',
      onComplete: () => flash.destroy()
    });

    // Impact ring
    const ring = scene.add.circle(this.x, this.y, this._coreRadius)
      .setStrokeStyle(2, this._colorInt, 0.8)
      .setFillStyle(0x000000, 0)
      .setDepth(16);
    scene.tweens.add({
      targets: ring,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 250,
      ease: 'Power1',
      onComplete: () => ring.destroy()
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  destroyAll() — clean up container + trail graphics
  //  Must be called instead of plain destroy() since trailGfx
  //  lives outside the container (in world space)
  // ══════════════════════════════════════════════════════════════
  destroyAll(playImpact = false) {
    if (playImpact) this.playImpact();
    if (this.trailGfx) {
      this.trailGfx.destroy();
      this.trailGfx = null;
    }
    this.destroy();
  }

  // ── Parse CSS color string to Phaser integer ───────────────
  _parseColor(colorStr) {
    try {
      if (typeof colorStr === 'number') return colorStr;
      const c = Phaser.Display.Color.HexStringToColor(colorStr);
      return c ? c.color : 0xff6600;
    } catch (e) {
      return 0xff6600;
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  Cleanup
  // ══════════════════════════════════════════════════════════════
  destroy(fromScene) {
    // Safety: ensure trail is cleaned up even if destroyAll wasn't called
    if (this.trailGfx && this.trailGfx.scene) {
      this.trailGfx.destroy();
      this.trailGfx = null;
    }
    super.destroy(fromScene);
  }
}
