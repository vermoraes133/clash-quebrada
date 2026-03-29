// ════════════════════════════════════════════════════════════
//  TowerSprite.js — Phaser Container representing a tower
//  Pre-renders the tower body via Canvas2D (castle with bricks,
//  battlements, windows, flag), then displays as Phaser Image.
//  Dynamic overlays: HP bar, damage cracks, fire, destruction
//  sparks, dead state (rubble + skull).
// ════════════════════════════════════════════════════════════
import Phaser from 'phaser';

export default class TowerSprite extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} tower — { x, y, hp, maxHp, team, kind, alive, range, r }
   */
  constructor(scene, tower) {
    super(scene, tower.x, tower.y);
    this.towerTeam = tower.team;
    this.towerKind = tower.kind; // 'king' or 'side'
    this.towerR    = tower.r;
    this._maxHp    = tower.maxHp;
    this._prevAlive = tower.alive;

    // Tower body dimensions (from drawTower original logic)
    const isK  = tower.kind === 'king';
    this._isKing = isK;
    this._tw = isK ? 54 : 42;
    this._th = isK ? 88 : 68;
    this._nb = isK ? 5  : 4;   // number of battlements
    this._bh = isK ? 14 : 11;  // battlement height
    this._bw = Math.floor((this._tw - 2) / this._nb * 0.52);

    // Visual offset: tower draws from y + r*0.2 as base
    this._baseOffsetY = tower.r * 0.2;

    // Pre-render the static tower body as a canvas texture
    this._bodyTexKey = this._renderTowerTexture(tower);

    // ── Build child objects ──────────────────────────────────

    // Shadow
    this.shadow = scene.add.ellipse(
      6, this._baseOffsetY + 5,
      this._tw * 0.52, 9,
      0x000000, 0.32
    );
    this.add(this.shadow);

    // Tower body image
    this.bodyImg = scene.add.image(0, this._baseOffsetY - this._th / 2, this._bodyTexKey);
    this.add(this.bodyImg);

    // Flag (animated separately because it waves)
    this._createFlag(tower);

    // Crown emoji for king tower
    if (isK) {
      this.crownText = scene.add.text(
        0, this._baseOffsetY - this._th - this._bh - 4 - (isK ? 22 : 17) - 10,
        '\u{1F451}',
        { fontFamily: 'Arial', fontSize: '14px', align: 'center' }
      ).setOrigin(0.5, 0.5);
      this.add(this.crownText);
    }

    // Damage cracks overlay (drawn dynamically)
    this.cracksGfx = scene.add.graphics();
    this.add(this.cracksGfx);

    // Fire particles container (for HP < 30%)
    this.fireGfx = scene.add.graphics();
    this.add(this.fireGfx);

    // HP bar
    this._createHPBar(tower);

    // HP text
    this.hpText = scene.add.text(
      0, this._baseOffsetY + 8 + 7 + 2,
      String(Math.ceil(tower.hp)),
      { fontFamily: 'Arial', fontSize: '8px', color: '#ffffff', align: 'center' }
    ).setOrigin(0.5, 0);
    this.add(this.hpText);

    // Rubble + skull for dead state (hidden initially)
    this._createRubble(tower);

    scene.add.existing(this);
    this.setDepth(5);
  }

  // ══════════════════════════════════════════════════════════════
  //  Pre-render tower body on an offscreen canvas
  // ══════════════════════════════════════════════════════════════
  _renderTowerTexture(tower) {
    const texKey = `tower_${tower.team}_${tower.kind}_body`;
    if (this.scene.textures.exists(texKey)) return texKey;

    const { team, kind } = tower;
    const isK = kind === 'king';
    const tw = this._tw, th = this._th, nb = this._nb, bh = this._bh, bw = this._bw;

    // Canvas slightly larger than tower to fit battlements + margins
    const pad = 20;
    const cw = tw + pad * 2;
    const ch = th + bh + pad * 2;
    const cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    const ctx = cv.getContext('2d');

    // Coordinate system: tower top-left at (pad, pad)
    const ox = cw / 2;  // center x
    const topY = pad;
    const baseY = topY + th;

    // Color palette by team
    const s1 = team === 'player' ? '#1a3a5c' : '#5c1a1a';
    const s2 = team === 'player' ? '#2a5a8c' : '#8c2a2a';
    const s3 = team === 'player' ? '#4a8abc' : '#bc4a4a';
    const sm = team === 'player' ? '#0d2040' : '#40100d';

    // ── Main tower body ──────────────────────────────────────
    ctx.fillStyle = s2;
    ctx.fillRect(ox - tw / 2, topY, tw, th);

    // Lateral shading gradient
    const bg = ctx.createLinearGradient(ox - tw / 2, 0, ox + tw / 2, 0);
    bg.addColorStop(0,    'rgba(0,0,0,0.32)');
    bg.addColorStop(0.18, 'rgba(0,0,0,0)');
    bg.addColorStop(0.78, 'rgba(0,0,0,0)');
    bg.addColorStop(1,    'rgba(0,0,0,0.22)');
    ctx.fillStyle = bg;
    ctx.fillRect(ox - tw / 2, topY, tw, th);

    // ── Brick pattern ────────────────────────────────────────
    ctx.strokeStyle = sm;
    ctx.lineWidth = 0.8;
    const bkH = 9;
    for (let row = 0; topY + row * bkH < baseY; row++) {
      const ry = topY + row * bkH;
      ctx.beginPath(); ctx.moveTo(ox - tw / 2, ry); ctx.lineTo(ox + tw / 2, ry); ctx.stroke();
      const off = (row % 2) * (tw / 4);
      for (let col = tw / 4; col < tw; col += tw / 2) {
        const vx = ox - tw / 2 + ((col + off) % tw);
        ctx.beginPath(); ctx.moveTo(vx, ry); ctx.lineTo(vx, Math.min(ry + bkH, baseY)); ctx.stroke();
      }
    }

    // ── Windows ──────────────────────────────────────────────
    const ns = isK ? 2 : 1;
    for (let si = 0; si < ns; si++) {
      const wy = topY + th * (ns === 1 ? 0.44 : (si === 0 ? 0.27 : 0.57));
      const sw = 6, sh = isK ? 14 : 11;
      ctx.fillStyle = '#000';
      ctx.fillRect(ox - sw / 2 - 1, wy - sh / 2 - 1, sw + 2, sh + 2);
      ctx.fillStyle = 'rgba(20,20,40,0.85)';
      ctx.fillRect(ox - sw / 2, wy - sh / 2, sw, sh);
      ctx.fillStyle = 'rgba(255,200,80,0.18)';
      ctx.fillRect(ox - sw / 2 + 1, wy - sh / 2 + 1, sw - 2, sh - 2);
    }

    // ── Battlements (crenellations) ──────────────────────────
    const sp = tw / nb;
    // Ledge bar
    ctx.fillStyle = s1;
    ctx.fillRect(ox - tw / 2 - 2, topY - 4, tw + 4, 4);
    // Individual merlons
    for (let i = 0; i < nb; i++) {
      const ax = ox - tw / 2 + i * sp + (sp - bw) / 2;
      ctx.fillStyle = s1;
      ctx.fillRect(ax, topY - bh - 4, bw, bh + 4);
      // Top highlight
      ctx.fillStyle = s3;
      ctx.fillRect(ax, topY - bh - 4, bw, 2);
      // Left edge highlight
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(ax, topY - bh - 4, 2, bh + 4);
    }

    // ── Flag pole (static part — flag itself is animated in Phaser) ──
    const fpx = ox + tw / 2 - 3;
    const fpBase = topY - bh - 4;
    const fpTop = fpBase - (isK ? 22 : 17);
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(fpx, fpBase); ctx.lineTo(fpx, fpTop); ctx.stroke();

    this.scene.textures.addCanvas(texKey, cv);

    // Store layout info for overlays
    this._texPad   = pad;
    this._texCW    = cw;
    this._texCH    = ch;
    this._fpx      = tw / 2 - 3;              // flag pole x relative to tower center
    this._fpBase   = -this._th / 2 - bh - 4;  // relative to body center y
    this._fpTop    = this._fpBase - (isK ? 22 : 17);

    return texKey;
  }

  // ── Animated flag (waves with sine) ────────────────────────
  _createFlag(tower) {
    const isK = this._isKing;
    const fl = isK ? 14 : 11;
    const fh = isK ?  9 :  7;
    const flagColor = tower.team === 'player' ? 0x1565c0 : 0xb71c1c;

    // Use a Graphics object for the flag; redrawn each frame for wave
    this.flagGfx = this.scene.add.graphics();
    this.add(this.flagGfx);

    // Store flag params
    this._flagFL = fl;
    this._flagFH = fh;
    this._flagColor = flagColor;
    this._flagColorCSS = tower.team === 'player' ? '#1565c0' : '#b71c1c';
  }

  // ── HP bar ─────────────────────────────────────────────────
  _createHPBar(tower) {
    const bw = this._tw * 1.2;
    this.hpBarWidth = bw;
    this.hpBarGfx = this.scene.add.graphics();
    this.hpBarGfx.setPosition(-bw / 2, this._baseOffsetY + 8);
    this.add(this.hpBarGfx);
  }

  // ── Rubble + skull (dead state) ────────────────────────────
  _createRubble(tower) {
    this.rubbleContainer = this.scene.add.container(0, 0);
    this.rubbleContainer.setVisible(false);

    const rubbleColor = tower.team === 'player' ? 0x2a5a8c : 0x8c2a2a;
    // 4 rubble blocks at scattered positions
    const rubbleData = [
      { dx:   0, dy:  6, rw: 14, rh: 9, rot:  0.00 },
      { dx: -11, dy: -4, rw: 10, rh: 8, rot: -1.98 },
      { dx:   9, dy: -7, rw: 15, rh: 7, rot:  1.62 },
      { dx:  -4, dy: 11, rw:  9, rh: 11, rot: -0.72 },
    ];
    rubbleData.forEach(rb => {
      const block = this.scene.add.rectangle(rb.dx, rb.dy, rb.rw, rb.rh, rubbleColor, 1);
      block.setRotation(rb.rot);
      this.rubbleContainer.add(block);
    });

    // Skull emoji
    this.skullText = this.scene.add.text(
      0, -this.towerR * 0.2,
      '\u{1F480}',
      { fontFamily: 'Arial', fontSize: `${Math.round(this.towerR * 0.9)}px`, align: 'center' }
    ).setOrigin(0.5, 0.5);
    this.rubbleContainer.add(this.skullText);

    this.add(this.rubbleContainer);
  }

  // ══════════════════════════════════════════════════════════════
  //  sync() — called every frame from BattleScene
  // ══════════════════════════════════════════════════════════════
  /**
   * @param {object} tower — live tower data from G.towers
   */
  sync(tower) {
    this._maxHp = tower.maxHp;
    const hpRatio = tower.hp / tower.maxHp;
    const time = this.scene.time.now;

    // ── Dead state ───────────────────────────────────────────
    if (!tower.alive) {
      // Trigger destruction effect on state change
      if (this._prevAlive) {
        this._prevAlive = false;
        this.playDestruction();
      }
      // Show rubble, hide everything else
      this.rubbleContainer.setVisible(true);
      if (this.bodyImg) this.bodyImg.setVisible(false);
      if (this.shadow)  this.shadow.setVisible(false);
      this.flagGfx.setVisible(false);
      this.cracksGfx.setVisible(false);
      this.fireGfx.setVisible(false);
      this.hpBarGfx.setVisible(false);
      this.hpText.setVisible(false);
      if (this.crownText) this.crownText.setVisible(false);
      return;
    }

    this._prevAlive = true;

    // ── Animated flag (wave with sine) ───────────────────────
    this._drawFlag(time);

    // ── HP bar ───────────────────────────────────────────────
    this._drawTowerHPBar(tower.hp, tower.maxHp);
    this.hpText.setText(String(Math.ceil(tower.hp)));

    // ── Damage cracks (HP < 65%) ─────────────────────────────
    this._drawCracks(hpRatio);

    // ── Fire particles (HP < 30%) ────────────────────────────
    this._drawFire(hpRatio, time);
  }

  // ── Internal: draw animated flag ───────────────────────────
  _drawFlag(time) {
    const g = this.flagGfx;
    g.clear();

    const fpx = this._fpx;
    const fpTop = this._fpTop + this._baseOffsetY;
    const fl = this._flagFL;
    const fh = this._flagFH;
    const wave = Math.sin(time * 0.004) * 3;

    // Flag pole
    g.lineStyle(1.5, 0xaaaaaa, 1);
    g.beginPath();
    g.moveTo(fpx, this._fpBase + this._baseOffsetY);
    g.lineTo(fpx, fpTop);
    g.strokePath();

    // Flag shape (quadratic bezier approximation with triangles)
    g.fillStyle(this._flagColor, 1);
    g.beginPath();
    g.moveTo(fpx, fpTop);
    // Approximate quadratic curve with line segments
    const steps = 8;
    // Top edge
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // quadraticCurveTo(fpx+fl/2, fpTop+fh/2+wave, fpx+fl, fpTop+fh/2)
      const qx = (1-t)*(1-t)*fpx + 2*(1-t)*t*(fpx+fl/2) + t*t*(fpx+fl);
      const qy = (1-t)*(1-t)*fpTop + 2*(1-t)*t*(fpTop+fh/2+wave) + t*t*(fpTop+fh/2);
      g.lineTo(qx, qy);
    }
    // Bottom edge (reverse)
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      // quadraticCurveTo(fpx+fl/2, fpTop+fh+wave, fpx, fpTop+fh)
      const qx = (1-t)*(1-t)*(fpx+fl) + 2*(1-t)*t*(fpx+fl/2) + t*t*fpx;
      const qy = (1-t)*(1-t)*(fpTop+fh/2) + 2*(1-t)*t*(fpTop+fh+wave) + t*t*(fpTop+fh);
      g.lineTo(qx, qy);
    }
    g.closePath();
    g.fillPath();
  }

  // ── Internal: tower HP bar ─────────────────────────────────
  _drawTowerHPBar(hp, maxHp) {
    const g = this.hpBarGfx;
    const bw = this.hpBarWidth;
    const ratio = hp / maxHp;
    const bh = 7;

    g.clear();

    // Background
    g.fillStyle(0x111111, 1);
    g.fillRect(-1, -1, bw + 2, bh + 2);

    // Fill
    const fillColor = ratio > 0.6 ? 0x27ae60
                    : ratio > 0.3 ? 0xf39c12
                    :                0xe74c3c;
    g.fillStyle(fillColor, 1);
    g.fillRect(0, 0, bw * ratio, bh);
  }

  // ── Internal: damage cracks overlay ────────────────────────
  _drawCracks(hpRatio) {
    const g = this.cracksGfx;
    g.clear();

    if (hpRatio >= 0.65) return;

    const tw = this._tw;
    const th = this._th;
    const topY = this._baseOffsetY - this._th;
    const alpha = 0.75 * (0.65 - hpRatio) / 0.65;

    // First crack
    g.lineStyle(1.5, 0x000000, alpha);
    g.beginPath();
    g.moveTo(-tw * 0.1,  topY + th * 0.14);
    g.lineTo( tw * 0.14, topY + th * 0.34);
    g.lineTo(-tw * 0.05, topY + th * 0.54);
    g.strokePath();

    // Second crack (deeper damage, HP < 32%)
    if (hpRatio < 0.32) {
      g.beginPath();
      g.moveTo( tw * 0.2,  topY + th * 0.1);
      g.lineTo( tw * 0.05, topY + th * 0.38);
      g.lineTo( tw * 0.18, topY + th * 0.55);
      g.strokePath();
    }
  }

  // ── Internal: fire particles on heavily damaged tower ──────
  _drawFire(hpRatio, time) {
    const g = this.fireGfx;
    g.clear();

    if (hpRatio >= 0.3) return;

    const tw = this._tw;
    const th = this._th;
    const topY = this._baseOffsetY - th;
    const ft = time * 0.005;

    for (let fi = 0; fi < 3; fi++) {
      const fx = Math.sin(ft + fi * 2.1) * tw * 0.28;
      const fy = topY + Math.sin(ft * 1.4 + fi) * th * 0.08;
      const fireR = 4 + Math.sin(ft * 3 + fi) * 2;

      // Approximate fire color: orange/red with flickering alpha
      const greenVal = Math.round(80 + Math.sin(ft + fi) * 60);
      const fireAlpha = 0.6 + Math.sin(ft * 2 + fi) * 0.3;
      const fireColor = Phaser.Display.Color.GetColor(255, greenVal, 0);

      g.fillStyle(fireColor, fireAlpha);
      g.fillCircle(fx, fy, fireR);
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  playDestruction() — 22 sparks + screen flash
  //  Replicates the tower destruction effect from BattleLogic
  // ══════════════════════════════════════════════════════════════
  playDestruction() {
    const scene = this.scene;
    if (!scene) return;

    // ── Screen flash (white/gold overlay) ────────────────────
    const flash = scene.add.rectangle(
      scene.cameras.main.centerX, scene.cameras.main.centerY,
      scene.cameras.main.width, scene.cameras.main.height,
      0xffe678, 0.35
    ).setDepth(100).setScrollFactor(0);
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 220,
      ease: 'Power2',
      onComplete: () => flash.destroy()
    });

    // ── Camera shake ─────────────────────────────────────────
    scene.cameras.main.shake(550, 0.018);

    // ── 22 sparks flying outward ─────────────────────────────
    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 55 + Math.random() * 110;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 40;
      const sparkColor = (i % 2) ? 0xf39c12 : 0xe74c3c;

      const spark = scene.add.circle(this.x, this.y, 3, sparkColor, 1)
        .setDepth(50);

      // Animate spark with physics-like arc (gravity)
      const startX = this.x;
      const startY = this.y;
      const duration = 700;

      scene.tweens.add({
        targets: spark,
        alpha: 0,
        duration: duration,
        ease: 'Linear',
        onUpdate: (tween) => {
          const t = tween.progress;
          const elapsed = t * duration / 1000;
          // Position = start + velocity*t + 0.5*gravity*t^2
          spark.x = startX + vx * elapsed;
          spark.y = startY + vy * elapsed + 0.5 * 120 * elapsed * elapsed;
          spark.setScale(1 - t); // shrink over time
        },
        onComplete: () => spark.destroy()
      });
    }

    // ── 6 dust puffs ─────────────────────────────────────────
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 40;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 30;
      const puffR = this.towerR * 0.9;

      const puff = scene.add.circle(this.x, this.y, puffR, 0xbeaa91, 0.42)
        .setDepth(49);

      scene.tweens.add({
        targets: puff,
        x: this.x + vx * 0.5,
        y: this.y + vy * 0.5,
        alpha: 0,
        scaleX: 1.8,
        scaleY: 1.8,
        duration: 500,
        ease: 'Power1',
        onComplete: () => puff.destroy()
      });
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  Cleanup
  // ══════════════════════════════════════════════════════════════
  destroy(fromScene) {
    super.destroy(fromScene);
  }
}
