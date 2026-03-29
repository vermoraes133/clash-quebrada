// ════════════════════════════════════════════════════════════
//  DrawArena.js — Arena rendering (river, bridges, trees, obstacles, themes)
//  Enhanced version with rich detail per theme, ambient particles, lane markings
// ════════════════════════════════════════════════════════════
import { W, ARENA_TOP, ARENA_BOT, ARENA_H, RIVER_Y, BRIDGES } from '../config/constants.js';

// ──── Seeded pseudo-random for deterministic decoration placement ────
function seededRand(seed) {
  let s = seed | 0;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s & 0x7fffffff) / 2147483647;
  };
}

// ──── Ambient particle system (per-theme floating particles) ────
const _ambientParticles = {};

function getAmbientParticles(theme) {
  if (_ambientParticles[theme]) return _ambientParticles[theme];
  const rng = seededRand(42);
  const particles = [];
  const count = 35;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: rng() * W,
      y: ARENA_TOP + rng() * ARENA_H,
      vx: (rng() - 0.5) * 12,
      vy: (rng() - 0.5) * 8 - 3,
      size: 1 + rng() * 2.5,
      phase: rng() * Math.PI * 2,
      life: rng(),
    });
  }
  _ambientParticles[theme] = particles;
  return particles;
}

function drawAmbientParticles(ctx, theme) {
  const t = Date.now() * 0.001;
  const parts = getAmbientParticles(theme);
  parts.forEach((p) => {
    // Cycle position with time
    const px = ((p.x + p.vx * t * 0.3 + Math.sin(t * 0.5 + p.phase) * 8) % (W + 20)) - 10;
    const py = ((p.y + p.vy * t * 0.2 + Math.cos(t * 0.7 + p.phase) * 6 - ARENA_TOP + ARENA_H) % ARENA_H) + ARENA_TOP;
    const flicker = 0.4 + 0.6 * Math.sin(t * 2 + p.phase);

    ctx.save();
    if (theme === 'favela') {
      // Smoke wisps + leaves
      if (p.life > 0.5) {
        ctx.fillStyle = `rgba(160,150,140,${flicker * 0.12})`;
        ctx.beginPath(); ctx.arc(px, py, p.size * 2.5, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = `rgba(80,150,40,${flicker * 0.5})`;
        ctx.beginPath();
        ctx.ellipse(px, py, p.size * 1.5, p.size * 0.8, t + p.phase, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (theme === 'predio') {
      // Light dust motes from windows
      ctx.fillStyle = `rgba(255,230,150,${flicker * 0.18})`;
      ctx.shadowColor = 'rgba(255,220,100,.3)';
      ctx.shadowBlur = 4;
      ctx.beginPath(); ctx.arc(px, py, p.size * 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    } else if (theme === 'bosque') {
      // Pollen / spores floating
      ctx.fillStyle = `rgba(220,255,100,${flicker * 0.35})`;
      ctx.shadowColor = 'rgba(200,255,80,.4)';
      ctx.shadowBlur = 3;
      ctx.beginPath(); ctx.arc(px, py, p.size * 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    } else if (theme === 'rua') {
      // Trash / paper blowing
      ctx.fillStyle = `rgba(180,170,150,${flicker * 0.25})`;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(t * 1.5 + p.phase);
      ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
      ctx.restore();
    }
    ctx.restore();
  });
}

// ──── Tree drawing (enhanced with moss option) ────
export function drawTree(ctx, x, y, r, d1, d2, withMoss) {
  // Trunk
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(x - 3, y + r * 0.3, 6, r * 0.7);

  // Trunk detail — bark texture
  ctx.fillStyle = 'rgba(0,0,0,.12)';
  ctx.fillRect(x - 2, y + r * 0.35, 1, r * 0.3);
  ctx.fillRect(x + 1, y + r * 0.5, 1, r * 0.2);

  // Shadow on ground
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath(); ctx.ellipse(x + 3, y + r * 0.55, r * 0.75, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();

  // Foliage layers
  ctx.fillStyle = d1;
  ctx.beginPath(); ctx.arc(x - r * 0.3, y + r * 0.1, r * 0.68, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.32, y + r * 0.12, r * 0.62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = d2;
  ctx.beginPath(); ctx.arc(x, y - r * 0.08, r * 0.78, 0, Math.PI * 2); ctx.fill();

  // Light highlight
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.beginPath(); ctx.arc(x - r * 0.22, y - r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fill();

  // Extra leaf detail — small dark spots
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  ctx.beginPath(); ctx.arc(x + r * 0.15, y + r * 0.05, r * 0.2, 0, Math.PI * 2); ctx.fill();

  // Moss on trunk (bosque)
  if (withMoss) {
    ctx.fillStyle = 'rgba(60,140,50,.5)';
    ctx.beginPath(); ctx.ellipse(x - 2, y + r * 0.6, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 1, y + r * 0.45, 3, 2, 0.3, 0, Math.PI * 2); ctx.fill();
  }
}

// ──── Bird on branch ────
function drawBird(ctx, x, y, color) {
  const t = Date.now() * 0.003;
  const bob = Math.sin(t + x * 0.1) * 1;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, y + bob, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
  // Wing
  const wingUp = Math.sin(t * 3 + x) > 0.5;
  ctx.beginPath();
  ctx.moveTo(x - 1, y + bob - 1);
  ctx.quadraticCurveTo(x + 2, y + bob - (wingUp ? 5 : 2), x + 5, y + bob);
  ctx.stroke();
  // Beak
  ctx.fillStyle = '#f39c12';
  ctx.beginPath(); ctx.moveTo(x - 3, y + bob); ctx.lineTo(x - 5, y + bob - 0.5); ctx.lineTo(x - 3, y + bob + 0.5); ctx.fill();
}

// ──── River rendering (enhanced) ────
export function drawRiver(ctx, waterColor, waveColor, bridgeColor) {
  const t = Date.now();

  // Main river body
  ctx.fillStyle = waterColor;
  ctx.fillRect(0, RIVER_Y - 12, W, 24);

  // Depth gradient
  const wg = ctx.createLinearGradient(0, RIVER_Y - 12, 0, RIVER_Y + 12);
  wg.addColorStop(0, 'rgba(255,255,255,.15)');
  wg.addColorStop(0.5, waterColor);
  wg.addColorStop(1, 'rgba(0,0,0,.25)');
  ctx.fillStyle = wg;
  ctx.fillRect(0, RIVER_Y - 12, W, 24);

  // Fish shadows (subtle dark shapes that drift)
  const fishT = t * 0.0003;
  for (let fi = 0; fi < 3; fi++) {
    const fx = ((fishT * 40 + fi * 150) % (W + 40)) - 20;
    const fy = RIVER_Y - 4 + Math.sin(fishT * 2 + fi * 3) * 5;
    ctx.fillStyle = 'rgba(0,0,0,.08)';
    ctx.save();
    ctx.translate(fx, fy);
    ctx.scale(1, 0.5);
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
    // Tail
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(7, -3); ctx.lineTo(7, 3); ctx.fill();
    ctx.restore();
  }

  // Floating debris (small dark spots)
  for (let di = 0; di < 5; di++) {
    const dx = ((t * 0.015 + di * 87) % (W + 20)) - 10;
    const dy = RIVER_Y - 6 + Math.sin(t * 0.002 + di * 2) * 7;
    ctx.fillStyle = `rgba(30,20,10,.12)`;
    ctx.beginPath(); ctx.arc(dx, dy, 1.5, 0, Math.PI * 2); ctx.fill();
  }

  // Light reflections (bright ripple spots)
  for (let ri = 0; ri < 6; ri++) {
    const rx = (ri * 72 + Math.sin(t * 0.001 + ri) * 12) % W;
    const ry = RIVER_Y + Math.cos(t * 0.0015 + ri * 1.7) * 4;
    const ra = 0.08 + 0.06 * Math.sin(t * 0.003 + ri);
    ctx.fillStyle = `rgba(255,255,255,${ra})`;
    ctx.beginPath(); ctx.ellipse(rx, ry, 6, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Wave lines
  const wo = (t * 0.0008) % 45;
  ctx.strokeStyle = waveColor;
  ctx.lineWidth = 1.2;
  for (let wx = -45 + wo; wx < W + 10; wx += 45) {
    ctx.beginPath();
    ctx.moveTo(wx, RIVER_Y - 4);
    ctx.bezierCurveTo(wx + 10, RIVER_Y - 8, wx + 25, RIVER_Y - 2, wx + 35, RIVER_Y - 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wx + 18, RIVER_Y + 4);
    ctx.bezierCurveTo(wx + 28, RIVER_Y + 8, wx + 42, RIVER_Y + 2, wx + 52, RIVER_Y + 5);
    ctx.stroke();
  }

  // ──── Bridges (enhanced with wood planks, rope railings, shadows) ────
  BRIDGES.forEach(({ cx }) => {
    // Shadow under bridge
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(cx, RIVER_Y + 2, 28, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bridge base
    ctx.fillStyle = bridgeColor;
    ctx.fillRect(cx - 24, RIVER_Y - 12, 48, 24);

    // Wood plank texture with gaps
    for (let py = RIVER_Y - 12; py < RIVER_Y + 12; py += 6) {
      const plankDark = ((py - RIVER_Y + 12) % 12 < 6);
      ctx.fillStyle = plankDark ? '#a0522d' : '#8b4513';
      ctx.fillRect(cx - 24, py, 48, 5);

      // Gap between planks (dark line)
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(cx - 24, py + 4.5, 48, 1);

      // Wood grain lines
      ctx.strokeStyle = 'rgba(0,0,0,.12)';
      ctx.lineWidth = 0.5;
      for (let gx = cx - 22; gx < cx + 22; gx += 8) {
        ctx.beginPath();
        ctx.moveTo(gx, py + 1);
        ctx.lineTo(gx + 3, py + 4);
        ctx.stroke();
      }
    }

    // Vertical plank divisions (nail boards)
    ctx.strokeStyle = 'rgba(0,0,0,.15)';
    ctx.lineWidth = 0.5;
    for (let vx = cx - 18; vx < cx + 22; vx += 12) {
      ctx.beginPath();
      ctx.moveTo(vx, RIVER_Y - 12);
      ctx.lineTo(vx, RIVER_Y + 12);
      ctx.stroke();
    }

    // Side posts (thicker)
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(cx - 24, RIVER_Y - 14, 4, 28);
    ctx.fillRect(cx + 20, RIVER_Y - 14, 4, 28);

    // Rope railings
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 2]);
    // Left rope
    ctx.beginPath();
    ctx.moveTo(cx - 24, RIVER_Y - 13);
    ctx.quadraticCurveTo(cx - 24, RIVER_Y, cx - 24, RIVER_Y + 13);
    ctx.stroke();
    // Right rope
    ctx.beginPath();
    ctx.moveTo(cx + 24, RIVER_Y - 13);
    ctx.quadraticCurveTo(cx + 24, RIVER_Y, cx + 24, RIVER_Y + 13);
    ctx.stroke();
    ctx.setLineDash([]);

    // Border outline
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 24, RIVER_Y - 12, 48, 24);

    // Foam at bridge edges (where water meets bridge)
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    // Top foam
    ctx.beginPath();
    for (let fx = cx - 26; fx < cx + 26; fx += 5) {
      ctx.arc(fx, RIVER_Y - 12, 2 + Math.sin(t * 0.003 + fx) * 1, 0, Math.PI * 2);
    }
    ctx.fill();
    // Bottom foam
    ctx.beginPath();
    for (let fx = cx - 26; fx < cx + 26; fx += 5) {
      ctx.arc(fx, RIVER_Y + 12, 2 + Math.cos(t * 0.003 + fx) * 1, 0, Math.PI * 2);
    }
    ctx.fill();
  });
}

// ──── Obstacles ────
export function drawObstacles(ctx, obstacles) {
  if (!obstacles) return;
  obstacles.forEach((ob) => {
    ctx.fillStyle = 'rgba(40,30,20,.7)';
    ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
    // Top highlight
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.fillRect(ob.x, ob.y, ob.w, 2);
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
  });
}

// ──── Lane path markings (worn dirt/grass texture on common paths) ────
function drawLanes(ctx, style) {
  BRIDGES.forEach(({ cx }) => {
    if (style === 'dirt') {
      // Dirt path — worn grass
      const pg = ctx.createLinearGradient(cx - 30, 0, cx + 30, 0);
      pg.addColorStop(0, 'transparent');
      pg.addColorStop(0.15, 'rgba(110,75,30,.18)');
      pg.addColorStop(0.35, 'rgba(130,90,40,.32)');
      pg.addColorStop(0.5, 'rgba(140,100,45,.38)');
      pg.addColorStop(0.65, 'rgba(130,90,40,.32)');
      pg.addColorStop(0.85, 'rgba(110,75,30,.18)');
      pg.addColorStop(1, 'transparent');
      ctx.fillStyle = pg;
      ctx.fillRect(cx - 30, ARENA_TOP, 60, ARENA_H);

      // Footprint-like worn spots along path
      const rng = seededRand(cx);
      for (let fy = ARENA_TOP + 15; fy < ARENA_BOT - 15; fy += 18) {
        const fx = cx + (rng() - 0.5) * 16;
        ctx.fillStyle = 'rgba(90,65,25,.1)';
        ctx.beginPath(); ctx.ellipse(fx, fy, 3, 1.5, rng() * 0.5, 0, Math.PI * 2); ctx.fill();
      }
    } else if (style === 'asphalt') {
      // Asphalt road markings
      ctx.fillStyle = 'rgba(80,80,90,.18)';
      ctx.fillRect(cx - 28, ARENA_TOP, 56, ARENA_H);

      // Worn tire marks
      ctx.strokeStyle = 'rgba(0,0,0,.06)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 6, ARENA_TOP);
      ctx.lineTo(cx - 6, ARENA_BOT);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 6, ARENA_TOP);
      ctx.lineTo(cx + 6, ARENA_BOT);
      ctx.stroke();
    }
  });
}

// ──── Graffiti art shapes (not just text) ────
function drawGraffitiArt(ctx, x, y, type, color, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  if (type === 'star') {
    const s = size;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const px = Math.cos(angle) * s;
      const py = Math.sin(angle) * s;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else if (type === 'crown') {
    const s = size;
    ctx.beginPath();
    ctx.moveTo(-s, s * 0.5);
    ctx.lineTo(-s, -s * 0.3);
    ctx.lineTo(-s * 0.5, 0);
    ctx.lineTo(0, -s * 0.5);
    ctx.lineTo(s * 0.5, 0);
    ctx.lineTo(s, -s * 0.3);
    ctx.lineTo(s, s * 0.5);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'heart') {
    const s = size * 0.6;
    ctx.beginPath();
    ctx.moveTo(0, s);
    ctx.bezierCurveTo(-s * 1.5, -s * 0.5, -s * 0.5, -s * 1.5, 0, -s * 0.5);
    ctx.bezierCurveTo(s * 0.5, -s * 1.5, s * 1.5, -s * 0.5, 0, s);
    ctx.fill();
  } else if (type === 'lightning') {
    const s = size;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s);
    ctx.lineTo(s * 0.3, -s * 0.15);
    ctx.lineTo(-s * 0.1, -s * 0.15);
    ctx.lineTo(s * 0.2, s);
    ctx.lineTo(-s * 0.3, s * 0.15);
    ctx.lineTo(s * 0.1, s * 0.15);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'eye') {
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ──── Street lamp with glow ────
function drawStreetLamp(ctx, x, y, glowColor) {
  // Pole
  ctx.fillStyle = '#555';
  ctx.fillRect(x - 1.5, y, 3, 34);
  // Arm
  ctx.fillStyle = '#555';
  ctx.fillRect(x - 1, y, 12, 2);
  // Lamp head
  ctx.fillStyle = '#777';
  ctx.fillRect(x + 8, y - 2, 6, 5);
  // Glow cone
  ctx.save();
  const grd = ctx.createRadialGradient(x + 11, y + 6, 2, x + 11, y + 20, 25);
  grd.addColorStop(0, glowColor || 'rgba(255,220,80,.25)');
  grd.addColorStop(1, 'rgba(255,220,80,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 3);
  ctx.lineTo(x - 6, y + 35);
  ctx.lineTo(x + 28, y + 35);
  ctx.lineTo(x + 16, y + 3);
  ctx.fill();
  ctx.restore();
  // Bulb glow
  ctx.fillStyle = 'rgba(255,220,80,.6)';
  ctx.beginPath(); ctx.arc(x + 11, y + 2, 3, 0, Math.PI * 2); ctx.fill();
}

// ──── Washing line between buildings ────
function drawWashingLine(ctx, x1, y, x2) {
  const sag = 6;
  ctx.strokeStyle = 'rgba(160,160,160,.5)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.quadraticCurveTo((x1 + x2) / 2, y + sag, x2, y);
  ctx.stroke();

  // Clothes on line
  const rng = seededRand(x1 * 100 + y);
  const clothColors = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#fff', '#ff6b81'];
  const items = 3 + Math.floor(rng() * 2);
  for (let i = 0; i < items; i++) {
    const t2 = (i + 0.5) / items;
    const cx = x1 + (x2 - x1) * t2;
    const cy = y + sag * Math.sin(t2 * Math.PI) * 0.8;
    ctx.fillStyle = clothColors[Math.floor(rng() * clothColors.length)] + 'aa';
    // Little rectangle (shirt/pants shape)
    if (rng() > 0.5) {
      ctx.fillRect(cx - 2, cy, 4, 6); // shirt
    } else {
      ctx.fillRect(cx - 2, cy, 5, 8); // pants
      ctx.clearRect(cx, cy + 4, 1, 4);
    }
  }
}

// ──── Satellite dish ────
function drawSatelliteDish(ctx, x, y) {
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  // Pole
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 6); ctx.stroke();
  // Dish
  ctx.beginPath();
  ctx.arc(x, y, 4, Math.PI * 0.8, Math.PI * 2.2);
  ctx.stroke();
  ctx.fillStyle = '#aaa';
  ctx.beginPath();
  ctx.arc(x, y, 3.5, Math.PI * 0.8, Math.PI * 2.2);
  ctx.fill();
  // Receiver arm
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y - 3); ctx.stroke();
  ctx.fillStyle = '#ccc';
  ctx.beginPath(); ctx.arc(x + 3, y - 3, 1, 0, Math.PI * 2); ctx.fill();
}

// ──── Animal silhouettes ────
function drawDogSilhouette(ctx, x, y) {
  ctx.fillStyle = 'rgba(40,30,20,.35)';
  ctx.save();
  ctx.translate(x, y);
  // Body
  ctx.beginPath(); ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
  // Head
  ctx.beginPath(); ctx.arc(-5, -2, 2.5, 0, Math.PI * 2); ctx.fill();
  // Ears
  ctx.beginPath(); ctx.ellipse(-6, -4, 1.5, 1, -0.3, 0, Math.PI * 2); ctx.fill();
  // Tail
  ctx.strokeStyle = 'rgba(40,30,20,.35)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(6, -1); ctx.quadraticCurveTo(8, -4, 9, -3); ctx.stroke();
  // Legs
  ctx.fillRect(-3, 2, 1.5, 3);
  ctx.fillRect(2, 2, 1.5, 3);
  ctx.restore();
}

function drawCatSilhouette(ctx, x, y) {
  ctx.fillStyle = 'rgba(50,40,35,.3)';
  ctx.save();
  ctx.translate(x, y);
  // Body
  ctx.beginPath(); ctx.ellipse(0, 0, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  // Head
  ctx.beginPath(); ctx.arc(-4, -1, 2, 0, Math.PI * 2); ctx.fill();
  // Ears (triangles)
  ctx.beginPath(); ctx.moveTo(-5, -2.5); ctx.lineTo(-6, -5); ctx.lineTo(-4, -3); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-3, -2.5); ctx.lineTo(-2.5, -5); ctx.lineTo(-1.5, -2.5); ctx.fill();
  // Tail (curved up)
  ctx.strokeStyle = 'rgba(50,40,35,.3)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(4, 0); ctx.quadraticCurveTo(7, -2, 6, -5); ctx.stroke();
  ctx.restore();
}

// ──── Puddle with reflection ────
function drawPuddle(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(80,120,160,.2)';
  ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2); ctx.fill();
  // Reflection highlight
  ctx.fillStyle = 'rgba(200,220,255,.12)';
  ctx.beginPath(); ctx.ellipse(x - w * 0.2, y - h * 0.2, w * 0.4, h * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ──── Mushroom ────
function drawMushroom(ctx, x, y, capColor) {
  // Stem
  ctx.fillStyle = '#f5f0e0';
  ctx.fillRect(x - 1.5, y - 1, 3, 5);
  // Cap
  ctx.fillStyle = capColor || '#c0392b';
  ctx.beginPath(); ctx.arc(x, y - 1, 4, Math.PI, 0); ctx.fill();
  // White spots
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.beginPath(); ctx.arc(x - 1.5, y - 2.5, 1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 1, y - 3, 0.8, 0, Math.PI * 2); ctx.fill();
}

// ──── Flower ────
function drawFlower(ctx, x, y, petalColor) {
  // Stem
  ctx.strokeStyle = '#2d5a1e';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 5); ctx.stroke();
  // Petals
  ctx.fillStyle = petalColor;
  for (let p = 0; p < 5; p++) {
    const a = (p / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 2.5, y + Math.sin(a) * 2.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // Center
  ctx.fillStyle = '#f1c40f';
  ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill();
}

// ──── Fallen log ────
function drawFallenLog(ctx, x, y, len, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle || 0);
  ctx.fillStyle = '#5d4037';
  ctx.beginPath();
  ctx.ellipse(0, 0, len / 2, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Bark detail
  ctx.strokeStyle = 'rgba(0,0,0,.15)';
  ctx.lineWidth = 0.5;
  for (let lx = -len / 2 + 3; lx < len / 2; lx += 5) {
    ctx.beginPath(); ctx.moveTo(lx, -2); ctx.lineTo(lx + 1, 2); ctx.stroke();
  }
  // Cross section
  ctx.fillStyle = '#8d6e63';
  ctx.beginPath(); ctx.ellipse(len / 2, 0, 3, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#a1887f';
  ctx.beginPath(); ctx.arc(len / 2, 0, 1.5, 0, Math.PI * 2); ctx.fill();
  // Moss
  ctx.fillStyle = 'rgba(60,120,40,.4)';
  ctx.beginPath(); ctx.ellipse(-len / 4, -3, 4, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ──── Fireflies (animated glow dots for bosque) ────
function drawFireflies(ctx) {
  const t = Date.now() * 0.001;
  const rng = seededRand(999);
  for (let i = 0; i < 12; i++) {
    const baseX = rng() * W;
    const baseY = ARENA_TOP + rng() * ARENA_H;
    const fx = baseX + Math.sin(t * 0.8 + i * 1.7) * 15;
    const fy = baseY + Math.cos(t * 0.6 + i * 2.3) * 10;
    const brightness = 0.3 + 0.5 * Math.max(0, Math.sin(t * 2.5 + i * 1.3));

    ctx.save();
    ctx.shadowColor = 'rgba(180,255,60,.6)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = `rgba(200,255,80,${brightness})`;
    ctx.beginPath(); ctx.arc(fx, fy, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ──── Neon sign ────
function drawNeonSign(ctx, x, y, text, color) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fillStyle = color;
  ctx.font = 'bold 8px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  // Double glow
  ctx.shadowBlur = 14;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ──── Hydrant ────
function drawHydrant(ctx, x, y) {
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(x - 3, y - 8, 6, 10);
  // Cap
  ctx.fillRect(x - 4, y - 9, 8, 2);
  // Side nozzles
  ctx.fillRect(x - 6, y - 5, 3, 3);
  ctx.fillRect(x + 3, y - 5, 3, 3);
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,.15)';
  ctx.fillRect(x - 1, y - 7, 2, 8);
  // Base
  ctx.fillStyle = '#8b1a1a';
  ctx.fillRect(x - 4, y, 8, 3);
}

// ──── Newspaper ────
function drawNewspaper(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(240,230,210,.45)';
  ctx.fillRect(-6, -4, 12, 8);
  // Text lines
  ctx.fillStyle = 'rgba(0,0,0,.15)';
  for (let ly = -2; ly < 3; ly += 2) {
    ctx.fillRect(-4, ly, 8, 0.8);
  }
  // Header
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.fillRect(-5, -3.5, 10, 1.5);
  ctx.restore();
}

// ──── Broken bottle ────
function drawBrokenBottle(ctx, x, y) {
  ctx.fillStyle = 'rgba(100,180,100,.3)';
  // Bottom half
  ctx.beginPath();
  ctx.moveTo(x - 2, y); ctx.lineTo(x - 2, y - 4); ctx.lineTo(x - 1, y - 5);
  ctx.lineTo(x + 1, y - 4.5); ctx.lineTo(x + 2, y - 5.5);
  ctx.lineTo(x + 2, y); ctx.closePath(); ctx.fill();
  // Glass shards nearby
  ctx.fillStyle = 'rgba(130,200,130,.2)';
  ctx.beginPath(); ctx.moveTo(x + 3, y - 1); ctx.lineTo(x + 5, y - 3); ctx.lineTo(x + 4, y); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 3, y - 1); ctx.lineTo(x - 4, y - 3); ctx.lineTo(x - 5, y - 1); ctx.fill();
}

// ════════════════════════════════════════════════════════════
//  MAIN drawArena — dispatches to themed sub-renderers
// ════════════════════════════════════════════════════════════
export function drawArena(ctx, currentTheme, obstacles) {
  if (currentTheme === 'predio') {
    drawArenaPredio(ctx);
  } else if (currentTheme === 'bosque') {
    drawArenaBosque(ctx);
  } else if (currentTheme === 'rua') {
    drawArenaRua(ctx);
  } else {
    drawArenaFavela(ctx);
  }

  // Center line
  ctx.strokeStyle = 'rgba(255,255,255,.1)';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 8]);
  ctx.beginPath(); ctx.moveTo(0, RIVER_Y); ctx.lineTo(W, RIVER_Y); ctx.stroke();
  ctx.setLineDash([]);

  // Obstacles
  drawObstacles(ctx, obstacles);

  // Ambient particles (drawn last, on top)
  drawAmbientParticles(ctx, currentTheme);
}

// ════════════════════════════════════════════════════════════
//  FAVELA theme
// ════════════════════════════════════════════════════════════
function drawArenaFavela(ctx) {
  // Background gradient — lush green
  const gg = ctx.createLinearGradient(0, ARENA_TOP, 0, ARENA_BOT);
  gg.addColorStop(0, '#1c5435');
  gg.addColorStop(0.48, '#256843');
  gg.addColorStop(0.52, '#256843');
  gg.addColorStop(1, '#1c5435');
  ctx.fillStyle = gg;
  ctx.fillRect(0, ARENA_TOP, W, ARENA_H);

  // Diagonal grass stripes
  ctx.strokeStyle = 'rgba(0,0,0,.07)';
  ctx.lineWidth = 1;
  for (let i = -ARENA_H; i < W + ARENA_H; i += 18) {
    ctx.beginPath(); ctx.moveTo(i, ARENA_TOP); ctx.lineTo(i + ARENA_H, ARENA_BOT); ctx.stroke();
  }

  // Lane paths (worn dirt)
  drawLanes(ctx, 'dirt');

  // Zone tints (team color)
  ctx.fillStyle = 'rgba(200,0,0,.05)';
  ctx.fillRect(0, ARENA_TOP, W, ARENA_H / 2);
  ctx.fillStyle = 'rgba(0,80,220,.05)';
  ctx.fillRect(0, RIVER_Y, W, ARENA_H / 2);

  // Houses (favela — many with varied colors)
  const houseColors = ['#e74c3c', '#f39c12', '#3498db', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c', '#d35400'];
  const houses = [
    [0, ARENA_TOP, 36, 39], [0, ARENA_TOP + 42, 30, 33], [0, ARENA_TOP + 78, 26, 30],
    [384, ARENA_TOP, 36, 39], [384, ARENA_TOP + 42, 34, 35], [390, ARENA_TOP + 80, 30, 28],
    [0, ARENA_BOT - 90, 32, 36], [0, ARENA_BOT - 50, 28, 46],
    [384, ARENA_BOT - 90, 36, 36], [388, ARENA_BOT - 50, 32, 46],
  ];
  houses.forEach(([hx, hy, hw, hh], idx) => {
    const col = houseColors[idx % houseColors.length];
    ctx.fillStyle = col;
    ctx.fillRect(hx, hy, hw, hh);

    // Wall cracks / texture
    ctx.fillStyle = 'rgba(0,0,0,.08)';
    ctx.fillRect(hx + hw * 0.3, hy + hh * 0.2, 1, hh * 0.4);

    // Roof
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + hw / 2, hy - 10);
    ctx.lineTo(hx + hw, hy);
    ctx.fill();
    // Roof tiles
    ctx.fillStyle = 'rgba(100,50,20,.3)';
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + hw / 2, hy - 10);
    ctx.lineTo(hx + hw, hy);
    ctx.fill();

    // Window(s)
    const numWin = hw > 30 ? 2 : 1;
    for (let wi = 0; wi < numWin; wi++) {
      const wx = hx + (hw / (numWin + 1)) * (wi + 1) - 4;
      ctx.fillStyle = 'rgba(255,230,80,.7)';
      ctx.fillRect(wx, hy + 8, 8, 8);
      // Window frame
      ctx.strokeStyle = 'rgba(0,0,0,.3)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(wx, hy + 8, 8, 8);
      // Cross in window
      ctx.beginPath(); ctx.moveTo(wx + 4, hy + 8); ctx.lineTo(wx + 4, hy + 16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(wx, hy + 12); ctx.lineTo(wx + 8, hy + 12); ctx.stroke();
    }

    // Door on some houses
    if (idx % 3 === 0) {
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(hx + hw / 2 - 3, hy + hh - 12, 6, 12);
    }

    // Antenna or satellite dish
    if (idx % 2 === 0) {
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(hx + hw * 0.7, hy); ctx.lineTo(hx + hw * 0.7, hy - 14); ctx.stroke();
    } else {
      drawSatelliteDish(ctx, hx + hw * 0.5, hy - 8);
    }
  });

  // Washing lines between close houses
  drawWashingLine(ctx, 36, ARENA_TOP + 30, 60);
  drawWashingLine(ctx, 360, ARENA_TOP + 55, 384);
  drawWashingLine(ctx, 36, ARENA_BOT - 65, 55);

  // Street lamps with glow
  drawStreetLamp(ctx, 65, ARENA_TOP + 15, 'rgba(255,200,60,.2)');
  drawStreetLamp(ctx, 340, ARENA_BOT - 85, 'rgba(255,200,60,.2)');

  // Puddles with reflections
  drawPuddle(ctx, 110, ARENA_TOP + 90, 8, 3);
  drawPuddle(ctx, 300, ARENA_BOT - 100, 10, 4);
  drawPuddle(ctx, 200, RIVER_Y + 40, 6, 2.5);

  // Dog/cat silhouettes
  drawDogSilhouette(ctx, 55, ARENA_TOP + 140);
  drawCatSilhouette(ctx, 370, ARENA_BOT - 130);
  drawDogSilhouette(ctx, 350, ARENA_TOP + 100);

  // Graffiti art (shapes, not just text)
  drawGraffitiArt(ctx, 12, RIVER_Y - 40, 'star', 'rgba(231,76,60,.2)', 6);
  drawGraffitiArt(ctx, W - 15, RIVER_Y + 30, 'crown', 'rgba(241,196,15,.18)', 7);
  drawGraffitiArt(ctx, 8, ARENA_BOT - 40, 'heart', 'rgba(255,100,100,.15)', 6);
  drawGraffitiArt(ctx, W - 10, ARENA_TOP + 40, 'lightning', 'rgba(52,152,219,.2)', 8);

  // Graffiti text
  ctx.fillStyle = 'rgba(231,76,60,.15)';
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('\u26a1QUEBRADA\u26a1', 4, RIVER_Y - 46);
  ctx.fillText('\u{1F480}RUA\u{1F480}', W - 65, RIVER_Y + 28);

  // Trees
  [
    [28, ARENA_TOP + 55, 20], [W - 28, ARENA_TOP + 55, 20],
    [28, ARENA_BOT - 55, 20], [W - 28, ARENA_BOT - 55, 20],
    [45, RIVER_Y - 52, 13], [W - 45, RIVER_Y - 52, 13],
    [45, RIVER_Y + 52, 13], [W - 45, RIVER_Y + 52, 13],
  ].forEach(([x, y, r]) => drawTree(ctx, x, y, r, '#145022', '#1e8449', false));

  // River (favela: blue-green)
  drawRiver(ctx, '#1a6b4a', 'rgba(100,255,180,.25)', '#6d4c41');
}

// ════════════════════════════════════════════════════════════
//  PREDIO theme
// ════════════════════════════════════════════════════════════
function drawArenaPredio(ctx) {
  // Dark urban background
  const bg = ctx.createLinearGradient(0, ARENA_TOP, 0, ARENA_BOT);
  bg.addColorStop(0, '#1a1f2e');
  bg.addColorStop(1, '#0d1017');
  ctx.fillStyle = bg;
  ctx.fillRect(0, ARENA_TOP, W, ARENA_H);

  // Asphalt lanes
  drawLanes(ctx, 'asphalt');

  // Buildings left side
  const bldgs = [
    { x: 0, w: 44, floors: 12, baseColor: '#2c3e50', detailColor: '#34495e' },
    { x: 376, w: 44, floors: 12, baseColor: '#2c3e50', detailColor: '#34495e' },
  ];
  bldgs.forEach((b) => {
    ctx.fillStyle = b.baseColor;
    ctx.fillRect(b.x, ARENA_TOP, b.w, ARENA_H);
    ctx.fillStyle = b.detailColor;
    ctx.fillRect(b.x + 4, ARENA_TOP, b.w - 8, ARENA_H);

    // Windows with varied lighting (some yellow, some TV-blue)
    for (let wy = ARENA_TOP + 12; wy < ARENA_BOT - 12; wy += 18) {
      for (let wx2 = b.x + 6; wx2 < b.x + b.w - 12; wx2 += 14) {
        const hash = Math.sin(wx2 * 31 + wy * 17);
        const lit = hash > 0.2;
        const isTVglow = hash > 0.5 && hash < 0.7;
        if (lit) {
          ctx.fillStyle = isTVglow ? 'rgba(80,140,255,.65)' : 'rgba(255,230,80,.85)';
        } else {
          ctx.fillStyle = 'rgba(20,30,50,.9)';
        }
        ctx.fillRect(wx2, wy, 9, 13);
        // Window frame
        ctx.strokeStyle = 'rgba(0,0,0,.3)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(wx2, wy, 9, 13);

        // Light spill from lit windows
        if (lit) {
          ctx.fillStyle = isTVglow ? 'rgba(80,140,255,.04)' : 'rgba(255,230,80,.04)';
          ctx.beginPath();
          ctx.arc(wx2 + 4.5, wy + 6.5, 12, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Balconies with plants
    for (let by = ARENA_TOP + 30; by < ARENA_BOT - 30; by += 54) {
      const bx = b.x < W / 2 ? b.x + b.w - 2 : b.x - 6;
      // Balcony floor
      ctx.fillStyle = '#3e4f60';
      ctx.fillRect(bx, by, 8, 2);
      // Railing
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(bx, by - 8, 8, 8);
      // Plant
      ctx.fillStyle = 'rgba(40,160,60,.6)';
      ctx.beginPath(); ctx.arc(bx + 4, by - 3, 3, 0, Math.PI * 2); ctx.fill();
      // Pot
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(bx + 2, by - 1, 4, 2);
    }

    // AC units
    for (let ay = ARENA_TOP + 50; ay < ARENA_BOT - 50; ay += 70) {
      const ax = b.x < W / 2 ? b.x + b.w - 1 : b.x - 5;
      ctx.fillStyle = '#ccc';
      ctx.fillRect(ax, ay, 6, 4);
      ctx.fillStyle = '#aaa';
      ctx.fillRect(ax, ay, 6, 1);
      // Drip
      if (Math.sin(ay * 13) > 0.3) {
        ctx.fillStyle = 'rgba(100,150,200,.3)';
        ctx.beginPath(); ctx.arc(ax + 3, ay + 6, 1, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Fire escape (zig-zag on one side)
    if (b.x < W / 2) {
      ctx.strokeStyle = 'rgba(120,120,120,.3)';
      ctx.lineWidth = 1;
      let feY = ARENA_TOP + 20;
      let feDir = 1;
      while (feY < ARENA_BOT - 20) {
        ctx.beginPath();
        ctx.moveTo(b.x + b.w, feY);
        ctx.lineTo(b.x + b.w + 8 * feDir, feY + 20);
        ctx.stroke();
        // Platform
        ctx.fillStyle = 'rgba(100,100,100,.2)';
        ctx.fillRect(b.x + b.w + (feDir > 0 ? 0 : -8), feY + 20, 8, 1.5);
        feY += 22;
        feDir *= -1;
      }
    }
  });

  // Parked cars at bottom (silhouettes)
  const carY = ARENA_BOT - 15;
  const carPositions = [60, 160, 260, 350];
  const carColors = ['#2c3e50', '#7f8c8d', '#2c3e50', '#34495e'];
  carPositions.forEach((cx, ci) => {
    ctx.fillStyle = carColors[ci];
    // Body
    ctx.beginPath();
    ctx.roundRect(cx - 12, carY - 5, 24, 8, 2);
    ctx.fill();
    // Roof
    ctx.beginPath();
    ctx.roundRect(cx - 7, carY - 10, 14, 6, 2);
    ctx.fill();
    // Wheels
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx - 7, carY + 3, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 7, carY + 3, 2.5, 0, Math.PI * 2); ctx.fill();
    // Headlights
    ctx.fillStyle = 'rgba(255,230,150,.3)';
    ctx.beginPath(); ctx.arc(cx + 12, carY - 2, 1.5, 0, Math.PI * 2); ctx.fill();
    // Taillight
    ctx.fillStyle = 'rgba(255,50,50,.3)';
    ctx.beginPath(); ctx.arc(cx - 12, carY - 2, 1.5, 0, Math.PI * 2); ctx.fill();
  });

  // Road dashes
  ctx.strokeStyle = 'rgba(255,255,200,.12)';
  ctx.lineWidth = 1;
  ctx.setLineDash([12, 12]);
  BRIDGES.forEach(({ cx }) => {
    ctx.beginPath(); ctx.moveTo(cx, ARENA_TOP); ctx.lineTo(cx, ARENA_BOT); ctx.stroke();
  });
  ctx.setLineDash([]);

  // Street lamps (better)
  [80, 200, 340].forEach((px) => {
    drawStreetLamp(ctx, px, ARENA_TOP + 6, 'rgba(255,220,80,.2)');
  });

  // River: urban canal
  drawRiver(ctx, '#2d4a3e', 'rgba(100,180,120,.3)', '#607d8b');
}

// ════════════════════════════════════════════════════════════
//  BOSQUE theme
// ════════════════════════════════════════════════════════════
function drawArenaBosque(ctx) {
  // Deep forest gradient
  const bg = ctx.createLinearGradient(0, ARENA_TOP, 0, ARENA_BOT);
  bg.addColorStop(0, '#0a2a10');
  bg.addColorStop(0.5, '#143a1a');
  bg.addColorStop(1, '#0a2a10');
  ctx.fillStyle = bg;
  ctx.fillRect(0, ARENA_TOP, W, ARENA_H);

  // Dirt trail lanes
  drawLanes(ctx, 'dirt');

  // Grass stripes (diagonal texture)
  ctx.strokeStyle = 'rgba(0,0,0,.08)';
  ctx.lineWidth = 1;
  for (let i = -ARENA_H; i < W + ARENA_H; i += 16) {
    ctx.beginPath(); ctx.moveTo(i, ARENA_TOP); ctx.lineTo(i + ARENA_H, ARENA_BOT); ctx.stroke();
  }

  // Grass clumps texture
  const rng = seededRand(777);
  for (let gi = 0; gi < 40; gi++) {
    const gx = rng() * W;
    const gy = ARENA_TOP + rng() * ARENA_H;
    ctx.strokeStyle = 'rgba(30,80,20,.2)';
    ctx.lineWidth = 0.8;
    for (let bl = 0; bl < 3; bl++) {
      ctx.beginPath();
      ctx.moveTo(gx + bl * 2, gy);
      ctx.quadraticCurveTo(gx + bl * 2 - 1, gy - 5, gx + bl * 2 + 1, gy - 8);
      ctx.stroke();
    }
  }

  // Trees on edges (with moss)
  [
    [18, ARENA_TOP + 50, 22], [W - 18, ARENA_TOP + 50, 22],
    [18, ARENA_TOP + 120, 18], [W - 18, ARENA_TOP + 120, 18],
    [18, ARENA_BOT - 50, 22], [W - 18, ARENA_BOT - 50, 22],
    [18, ARENA_BOT - 120, 18], [W - 18, ARENA_BOT - 120, 18],
    [35, RIVER_Y - 55, 14], [W - 35, RIVER_Y - 55, 14],
    [35, RIVER_Y + 55, 14], [W - 35, RIVER_Y + 55, 14],
    // Extra trees for density
    [8, ARENA_TOP + 85, 15], [W - 8, ARENA_TOP + 85, 15],
    [8, ARENA_BOT - 85, 15], [W - 8, ARENA_BOT - 85, 15],
  ].forEach(([x, y, r]) => drawTree(ctx, x, y, r, '#1b5e20', '#2e7d32', true));

  // Birds on branches
  drawBird(ctx, 25, ARENA_TOP + 38, '#5d4037');
  drawBird(ctx, W - 30, ARENA_TOP + 108, '#3e2723');
  drawBird(ctx, 30, ARENA_BOT - 38, '#795548');

  // Mushrooms
  drawMushroom(ctx, 50, ARENA_TOP + 90, '#c0392b');
  drawMushroom(ctx, W - 55, ARENA_BOT - 95, '#f39c12');
  drawMushroom(ctx, 70, RIVER_Y + 45, '#8e44ad');
  drawMushroom(ctx, W - 70, RIVER_Y - 45, '#c0392b');
  drawMushroom(ctx, 42, ARENA_TOP + 170, '#e67e22');

  // Flowers
  drawFlower(ctx, 90, ARENA_TOP + 60, '#e74c3c');
  drawFlower(ctx, W - 80, ARENA_TOP + 75, '#9b59b6');
  drawFlower(ctx, 75, ARENA_BOT - 70, '#f1c40f');
  drawFlower(ctx, W - 90, ARENA_BOT - 55, '#3498db');
  drawFlower(ctx, 55, RIVER_Y + 60, '#e91e63');
  drawFlower(ctx, W - 60, RIVER_Y - 60, '#ff9800');

  // Fallen logs
  drawFallenLog(ctx, 60, ARENA_TOP + 150, 20, 0.2);
  drawFallenLog(ctx, W - 65, ARENA_BOT - 150, 18, -0.15);

  // Animal tracks (subtle paw prints)
  const trackColor = 'rgba(60,40,20,.1)';
  for (let ti = 0; ti < 6; ti++) {
    const tx = 130 + ti * 15;
    const ty = ARENA_TOP + 100 + ti * 8;
    ctx.fillStyle = trackColor;
    ctx.beginPath(); ctx.ellipse(tx, ty, 2, 1.5, ti * 0.3, 0, Math.PI * 2); ctx.fill();
    // Toes
    ctx.beginPath(); ctx.arc(tx - 1.5, ty - 2, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(tx + 1.5, ty - 2, 0.8, 0, Math.PI * 2); ctx.fill();
  }

  // Rocks / stones
  [
    [60, RIVER_Y - 45, 8, 6], [350, RIVER_Y + 38, 9, 7],
    [25, ARENA_TOP + 200, 7, 5], [395, ARENA_BOT - 200, 6, 5],
    [80, RIVER_Y + 55, 5, 4], [W - 80, RIVER_Y - 50, 6, 4],
  ].forEach(([rx, ry, rw, rh]) => {
    ctx.fillStyle = '#78909c';
    ctx.beginPath(); ctx.ellipse(rx, ry, rw, rh, 0, 0, Math.PI * 2); ctx.fill();
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.beginPath(); ctx.ellipse(rx - rw * 0.2, ry - rh * 0.3, rw * 0.4, rh * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    // Moss on rocks
    ctx.fillStyle = 'rgba(50,120,40,.25)';
    ctx.beginPath(); ctx.ellipse(rx + rw * 0.2, ry - rh * 0.1, rw * 0.3, rh * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  });

  // Fireflies
  drawFireflies(ctx);

  // River natural
  drawRiver(ctx, '#1a6b42', 'rgba(180,255,200,.3)', '#5d4037');
}

// ════════════════════════════════════════════════════════════
//  RUA theme
// ════════════════════════════════════════════════════════════
function drawArenaRua(ctx) {
  // Dark asphalt background
  const bg = ctx.createLinearGradient(0, ARENA_TOP, 0, ARENA_BOT);
  bg.addColorStop(0, '#111118');
  bg.addColorStop(1, '#0a0a12');
  ctx.fillStyle = bg;
  ctx.fillRect(0, ARENA_TOP, W, ARENA_H);

  // Lane markings
  drawLanes(ctx, 'asphalt');

  // Road dashes
  ctx.strokeStyle = 'rgba(255,255,100,.09)';
  ctx.lineWidth = 2;
  ctx.setLineDash([15, 10]);
  BRIDGES.forEach(({ cx }) => {
    ctx.beginPath(); ctx.moveTo(cx, ARENA_TOP); ctx.lineTo(cx, ARENA_BOT); ctx.stroke();
  });
  ctx.setLineDash([]);

  // Sidewalk edges
  ctx.fillStyle = 'rgba(80,80,80,.2)';
  ctx.fillRect(0, ARENA_TOP, 50, ARENA_H);
  ctx.fillRect(W - 50, ARENA_TOP, 50, ARENA_H);
  // Curb lines
  ctx.fillStyle = 'rgba(120,120,120,.15)';
  ctx.fillRect(49, ARENA_TOP, 2, ARENA_H);
  ctx.fillRect(W - 51, ARENA_TOP, 2, ARENA_H);

  // Graffiti art shapes
  drawGraffitiArt(ctx, 20, ARENA_TOP + 60, 'star', 'rgba(231,76,60,.25)', 8);
  drawGraffitiArt(ctx, W - 20, ARENA_TOP + 90, 'crown', 'rgba(241,196,15,.2)', 9);
  drawGraffitiArt(ctx, 15, ARENA_BOT - 60, 'eye', 'rgba(52,152,219,.2)', 7);
  drawGraffitiArt(ctx, W - 15, ARENA_BOT - 80, 'heart', 'rgba(255,50,100,.2)', 7);
  drawGraffitiArt(ctx, 25, RIVER_Y - 55, 'lightning', 'rgba(46,204,113,.25)', 10);

  // Graffiti tags (text pixos)
  const tags = ['\u{1F480}', '\u{1F525}', '\u2717', '\u2605', 'Z', 'K', 'RUA', 'FLW', '\u2606'];
  for (let ti = 0; ti < 14; ti++) {
    const tx = 5 + Math.abs(Math.sin(ti * 137) * 400);
    const ty = ARENA_TOP + 20 + Math.abs(Math.sin(ti * 211) * ARENA_H * 0.85);
    const cols2 = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6'];
    ctx.fillStyle = cols2[ti % cols2.length] + '88';
    ctx.font = `${10 + (ti % 8)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tags[ti % tags.length], tx, ty);
  }

  // Neon signs on buildings
  drawNeonSign(ctx, 22, ARENA_TOP + 30, 'BAR', '#ff3366');
  drawNeonSign(ctx, W - 22, ARENA_TOP + 35, 'OPEN', '#33ff99');
  drawNeonSign(ctx, 20, ARENA_BOT - 40, '24H', '#ffcc00');
  drawNeonSign(ctx, W - 18, ARENA_BOT - 35, 'DJ', '#cc33ff');

  // Lixeiras (trash cans)
  [55, 365].forEach((lx) => {
    ctx.fillStyle = '#444';
    ctx.fillRect(lx - 8, ARENA_BOT - 70, 16, 30);
    ctx.fillStyle = '#333';
    ctx.fillRect(lx - 10, ARENA_BOT - 72, 20, 5);
    // Trash spilling
    ctx.fillStyle = 'rgba(160,140,100,.3)';
    ctx.beginPath(); ctx.arc(lx + 10, ARENA_BOT - 42, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(200,180,140,.2)';
    ctx.beginPath(); ctx.arc(lx - 6, ARENA_BOT - 41, 2, 0, Math.PI * 2); ctx.fill();
  });

  // Bueiros (manholes)
  [120, 300].forEach((bx) => {
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.ellipse(bx, ARENA_TOP + 80, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Grate lines
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 0.5;
    for (let gl = -6; gl < 7; gl += 3) {
      ctx.beginPath(); ctx.moveTo(bx + gl, ARENA_TOP + 77); ctx.lineTo(bx + gl, ARENA_TOP + 83); ctx.stroke();
    }
  });

  // Hydrant
  drawHydrant(ctx, 370, ARENA_TOP + 120);
  drawHydrant(ctx, 50, ARENA_BOT - 130);

  // Newspapers on ground
  drawNewspaper(ctx, 130, ARENA_TOP + 130, 0.3);
  drawNewspaper(ctx, 280, ARENA_BOT - 120, -0.2);
  drawNewspaper(ctx, 200, RIVER_Y + 50, 0.8);

  // Broken bottles
  drawBrokenBottle(ctx, 160, ARENA_TOP + 110);
  drawBrokenBottle(ctx, 250, ARENA_BOT - 100);

  // Stray cat
  drawCatSilhouette(ctx, 370, ARENA_TOP + 160);
  drawCatSilhouette(ctx, 55, ARENA_BOT - 160);

  // Street lamps
  drawStreetLamp(ctx, 60, ARENA_TOP + 10, 'rgba(255,180,50,.15)');
  drawStreetLamp(ctx, 200, ARENA_TOP + 10, 'rgba(255,180,50,.15)');
  drawStreetLamp(ctx, 350, ARENA_TOP + 10, 'rgba(255,180,50,.15)');

  // River: dark sewer
  drawRiver(ctx, '#1a2a1a', 'rgba(80,120,60,.3)', '#37474f');

  // Steam/vapor from manholes
  const t = Date.now();
  [100, 315].forEach((vx) => {
    for (let vi = 0; vi < 3; vi++) {
      const phase = t * 0.001 + vi * 2;
      const vy = RIVER_Y - 18 - Math.abs(Math.sin(phase)) * 12;
      const vr = 4 + Math.sin(phase * 0.7) * 3;
      ctx.fillStyle = `rgba(150,200,150,${0.04 + Math.sin(phase) * 0.02})`;
      ctx.beginPath(); ctx.arc(vx + Math.sin(phase * 1.3) * 5, vy - vi * 8, vr, 0, Math.PI * 2); ctx.fill();
    }
  });
}
