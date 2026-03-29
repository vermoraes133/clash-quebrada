// ════════════════════════════════════════════════════════════
//  TextureGenerator.js — Generates ALL Phaser textures from
//  procedural Canvas2D drawings at boot time.
//
//  Call generateAllTextures(scene) once during BootScene.create()
//  to register character, particle, projectile and UI textures.
//
//  Enhanced: try-catch around each texture generation step.
//  If one fails, the rest continue and a console.warn is emitted.
// ════════════════════════════════════════════════════════════

import { CARDS } from '../config/cards.js';
import { getCharCanvas, clearCharCache } from '../ui/CharacterRenderer.js';

// ── PUBLIC API ──────────────────────────────────────────────

/**
 * Master function — generates every procedural texture the game needs.
 * Safe to call multiple times (skips textures that already exist).
 * Each step is wrapped in try-catch so a single failure does not
 * prevent remaining textures from being generated.
 * @param {Phaser.Scene} scene - any active Phaser scene
 */
export function generateAllTextures(scene) {
  if (!scene || !scene.textures) {
    console.warn('[TextureGenerator] Cena ou textures invalida, pulando geracao.');
    return;
  }

  const textures = scene.textures;

  // 1. Character sprites (37 cards x 2 teams = 74 textures)
  try {
    generateCharacterTextures(textures);
  } catch (err) {
    console.warn('[TextureGenerator] Falha ao gerar texturas de personagens:', err.message || err);
  }

  // 2. Particle effects
  try {
    generateParticleTextures(textures);
  } catch (err) {
    console.warn('[TextureGenerator] Falha ao gerar texturas de particulas:', err.message || err);
  }

  // 3. Projectile
  try {
    generateProjectileTexture(textures);
  } catch (err) {
    console.warn('[TextureGenerator] Falha ao gerar textura de projetil:', err.message || err);
  }

  // 4. UI elements
  try {
    generateUITextures(textures);
  } catch (err) {
    console.warn('[TextureGenerator] Falha ao gerar texturas de UI:', err.message || err);
  }

  // Free the Canvas2D cache used by CharacterRenderer since the
  // textures now live in Phaser's TextureManager.
  try {
    clearCharCache();
  } catch (_e) {
    // Non-critical — ignore
  }
}

// ── CHARACTER TEXTURES ─────────────────────────────────────

function generateCharacterTextures(textures) {
  const allKeys = Object.keys(CARDS);

  allKeys.forEach(key => {
    try {
      const card = CARDS[key];
      if (!card) return;
      const r = card.r || 14;

      ['player', 'enemy'].forEach(team => {
        const texKey = `char_${key}_${team}`;
        if (textures.exists(texKey)) return;

        const canvas = getCharCanvas(key, team, r);
        if (canvas) {
          textures.addCanvas(texKey, canvas);
        }
      });
    } catch (err) {
      console.warn(`[TextureGenerator] Falha ao gerar textura para carta "${key}":`, err.message || err);
    }
  });
}

// ── PARTICLE TEXTURES ──────────────────────────────────────

function generateParticleTextures(textures) {
  // ─ Spark (small glowing dot — tower destruction, hit sparks)
  _safeGenerate(textures, 'particle_spark', () => {
    const size = 8;
    const cv = createCanvas(size, size);
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(4, 4, 0, 4, 4, 4);
    g.addColorStop(0, 'rgba(255,220,50,1)');
    g.addColorStop(0.5, 'rgba(255,150,0,0.6)');
    g.addColorStop(1, 'rgba(255,80,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
    return cv;
  });

  // ─ Puff / dust (death cloud, landing impact)
  _safeGenerate(textures, 'particle_puff', () => {
    const size = 16;
    const cv = createCanvas(size, size);
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(190,170,145,0.6)');
    g.addColorStop(1, 'rgba(190,170,145,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
    return cv;
  });

  // ─ Heal (green glow — cabeleireiro, medico, veterinario)
  _safeGenerate(textures, 'particle_heal', () => {
    const size = 12;
    const cv = createCanvas(size, size);
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(6, 6, 0, 6, 6, 6);
    g.addColorStop(0, 'rgba(0,255,100,0.8)');
    g.addColorStop(1, 'rgba(0,255,100,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
    return cv;
  });

  // ─ Generic glow (white, tintable via Phaser setTint)
  _safeGenerate(textures, 'particle_glow', () => {
    const size = 16;
    const cv = createCanvas(size, size);
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.4)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
    return cv;
  });

  // ─ Stun stars (yellow star outline for stun feedback)
  _safeGenerate(textures, 'particle_stun', () => {
    const size = 12;
    const cv = createCanvas(size, size);
    const c = cv.getContext('2d');
    c.translate(6, 6);
    c.fillStyle = '#f1c40f';
    drawStar(c, 0, 0, 5, 5, 2.2);
    return cv;
  });

  // ─ Smoke (dark semi-transparent — gas specials)
  _safeGenerate(textures, 'particle_smoke', () => {
    const size = 20;
    const cv = createCanvas(size, size);
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(10, 10, 0, 10, 10, 10);
    g.addColorStop(0, 'rgba(80,80,80,0.5)');
    g.addColorStop(0.6, 'rgba(60,60,60,0.25)');
    g.addColorStop(1, 'rgba(50,50,50,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
    return cv;
  });

  // ─ Fire particle (churrasco spell, tower explosions)
  _safeGenerate(textures, 'particle_fire', () => {
    const size = 14;
    const cv = createCanvas(size, size);
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(7, 7, 0, 7, 7, 7);
    g.addColorStop(0, 'rgba(255,200,50,1)');
    g.addColorStop(0.35, 'rgba(255,100,0,0.8)');
    g.addColorStop(0.7, 'rgba(200,30,0,0.4)');
    g.addColorStop(1, 'rgba(150,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
    return cv;
  });

  // ─ Water drop (bombeiro slow, river splash)
  _safeGenerate(textures, 'particle_water', () => {
    const size = 10;
    const cv = createCanvas(size, size);
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(5, 5, 0, 5, 5, 5);
    g.addColorStop(0, 'rgba(52,152,219,0.9)');
    g.addColorStop(0.6, 'rgba(41,128,185,0.4)');
    g.addColorStop(1, 'rgba(41,128,185,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
    return cv;
  });

  // ─ Sonic ring (funkeiro, cantor, influencer)
  _safeGenerate(textures, 'particle_sonic', () => {
    const size = 24;
    const cv = createCanvas(size, size);
    const c = cv.getContext('2d');
    c.strokeStyle = 'rgba(180,80,255,0.6)';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(12, 12, 9, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = 'rgba(180,80,255,0.3)';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(12, 12, 11, 0, Math.PI * 2);
    c.stroke();
    return cv;
  });
}

// ── PROJECTILE TEXTURE ─────────────────────────────────────

function generateProjectileTexture(textures) {
  _safeGenerate(textures, 'projectile', () => {
    const size = 12;
    const cv = createCanvas(size, size);
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(6, 6, 0, 6, 6, 6);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,220,60,0.9)');
    g.addColorStop(1, 'rgba(255,150,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
    return cv;
  });
}

// ── UI TEXTURES ────────────────────────────────────────────

function generateUITextures(textures) {
  // ─ Card back (deck placeholder)
  _safeGenerate(textures, 'card_back', () => {
    const w = 60, h = 80;
    const cv = createCanvas(w, h);
    const c = cv.getContext('2d');
    // Border
    c.fillStyle = '#2c3e50';
    roundRect(c, 0, 0, w, h, 6);
    c.fill();
    // Inner
    c.fillStyle = '#34495e';
    roundRect(c, 3, 3, w - 6, h - 6, 4);
    c.fill();
    // Diamond icon
    c.fillStyle = '#f1c40f';
    c.beginPath();
    c.moveTo(w / 2, 20);
    c.lineTo(w / 2 + 12, h / 2);
    c.lineTo(w / 2, h - 20);
    c.lineTo(w / 2 - 12, h / 2);
    c.closePath();
    c.fill();
    return cv;
  });

  // ─ Elixir drop (single segment icon)
  _safeGenerate(textures, 'elixir_drop', () => {
    const size = 16;
    const cv = createCanvas(size, size);
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(8, 9, 0, 8, 9, 7);
    g.addColorStop(0, 'rgba(180,60,255,1)');
    g.addColorStop(0.6, 'rgba(120,30,200,0.8)');
    g.addColorStop(1, 'rgba(80,10,160,0)');
    c.fillStyle = g;
    // Drop shape
    c.beginPath();
    c.moveTo(8, 2);
    c.bezierCurveTo(2, 8, 2, 13, 8, 15);
    c.bezierCurveTo(14, 13, 14, 8, 8, 2);
    c.fill();
    // Shine
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath();
    c.ellipse(6, 7, 2, 3, -0.3, 0, Math.PI * 2);
    c.fill();
    return cv;
  });

  // ─ Elixir bar segment (for the 10-segment bar)
  _safeGenerate(textures, 'elixir_segment', () => {
    const w = 28, h = 10;
    const cv = createCanvas(w, h);
    const c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#c060ff');
    g.addColorStop(0.5, '#9030d0');
    g.addColorStop(1, '#6010a0');
    c.fillStyle = g;
    roundRect(c, 0, 0, w, h, 2);
    c.fill();
    // Shine highlight on top
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.fillRect(2, 1, w - 4, 3);
    return cv;
  });

  // ─ Elixir bar empty segment
  _safeGenerate(textures, 'elixir_segment_empty', () => {
    const w = 28, h = 10;
    const cv = createCanvas(w, h);
    const c = cv.getContext('2d');
    c.fillStyle = 'rgba(40,10,60,0.6)';
    roundRect(c, 0, 0, w, h, 2);
    c.fill();
    c.strokeStyle = 'rgba(120,60,180,0.3)';
    c.lineWidth = 1;
    roundRect(c, 0.5, 0.5, w - 1, h - 1, 2);
    c.stroke();
    return cv;
  });

  // ─ Tower base (white, tintable per team)
  _safeGenerate(textures, 'tower_base', () => {
    const size = 48;
    const cv = createCanvas(size, size);
    const c = cv.getContext('2d');
    // Base shadow
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath();
    c.ellipse(24, 42, 20, 6, 0, 0, Math.PI * 2);
    c.fill();
    // Tower body (drawn white so Phaser tint works)
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(8, 40);
    c.lineTo(12, 8);
    c.lineTo(36, 8);
    c.lineTo(40, 40);
    c.closePath();
    c.fill();
    // Battlements
    for (let bx = 10; bx < 40; bx += 8) {
      c.fillRect(bx, 4, 5, 6);
    }
    // Door
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.beginPath();
    c.arc(24, 38, 6, Math.PI, 0);
    c.fillRect(18, 32, 12, 8);
    c.fill();
    return cv;
  });

  // ─ Crown icon (king tower marker)
  _safeGenerate(textures, 'crown_icon', () => {
    const size = 20;
    const cv = createCanvas(size, size);
    const c = cv.getContext('2d');
    c.fillStyle = '#f1c40f';
    c.beginPath();
    c.moveTo(2, 16);
    c.lineTo(4, 6);
    c.lineTo(7, 12);
    c.lineTo(10, 3);
    c.lineTo(13, 12);
    c.lineTo(16, 6);
    c.lineTo(18, 16);
    c.closePath();
    c.fill();
    // Band
    c.fillStyle = '#e67e22';
    c.fillRect(2, 14, 16, 4);
    return cv;
  });
}

// ── HELPERS ────────────────────────────────────────────────

/**
 * Safely generate a single texture. If it already exists, skip.
 * If generation fails, log a warning and continue.
 */
function _safeGenerate(textures, texKey, generatorFn) {
  if (textures.exists(texKey)) return;
  try {
    const cv = generatorFn();
    if (cv) {
      textures.addCanvas(texKey, cv);
    }
  } catch (err) {
    console.warn(`[TextureGenerator] Falha ao gerar textura "${texKey}":`, err.message || err);
  }
}

/** Create an off-screen canvas with the given dimensions. */
function createCanvas(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  return cv;
}

/** Draw a 5-pointed star (used for stun particle). */
function drawStar(c, cx, cy, points, outerR, innerR) {
  c.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
  c.fill();
}

/** Canvas2D roundRect polyfill (for environments without native support). */
function roundRect(c, x, y, w, h, r) {
  if (typeof c.roundRect === 'function') {
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    return;
  }
  // Manual fallback
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.arcTo(x + w, y, x + w, y + r, r);
  c.lineTo(x + w, y + h - r);
  c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(x + r, y + h);
  c.arcTo(x, y + h, x, y + h - r, r);
  c.lineTo(x, y + r);
  c.arcTo(x, y, x + r, y, r);
  c.closePath();
}
