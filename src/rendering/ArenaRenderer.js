// ════════════════════════════════════════════════════════════
//  ArenaRenderer.js — Generates full-arena-sized Phaser textures
//  for each of the 4 themes: favela, predio, bosque, rua.
//
//  Call generateArenaTextures(scene) once during BootScene.create().
//  The resulting textures can be used as:
//    this.add.image(W/2, ARENA_TOP + ARENA_H/2, 'arena_favela');
//
//  Each texture is W x ARENA_H pixels (420 x 494) and contains
//  the complete static arena background (ground, decorations,
//  river, bridges). Obstacles are NOT baked in — they vary per
//  match and should be drawn as separate GameObjects.
//
//  Enhanced: try-catch around each arena generation with fallback
//  solid color if drawArena fails.
// ════════════════════════════════════════════════════════════

import { W, ARENA_TOP, ARENA_BOT, ARENA_H, RIVER_Y, BRIDGES } from '../config/constants.js';
import { ARENA_THEMES } from '../config/constants.js';
import { drawArena } from '../ui/DrawArena.js';

// ── Fallback colors per theme if generation fails ────────────
const FALLBACK_COLORS = {
  favela: '#2a3a1a',
  predio: '#1a2a3a',
  bosque: '#1a3a1a',
  rua:    '#2a2a2a',
};
const DEFAULT_FALLBACK = '#1c5435';

// ── PUBLIC API ──────────────────────────────────────────────

/**
 * Generates one Phaser canvas texture per arena theme.
 * Texture keys: 'arena_favela', 'arena_predio', 'arena_bosque', 'arena_rua'
 *
 * Each theme generation is wrapped in try-catch. If drawArena()
 * fails for a theme, a solid fallback color is used instead.
 *
 * @param {Phaser.Scene} scene - any active Phaser scene
 */
export function generateArenaTextures(scene) {
  if (!scene || !scene.textures) {
    console.warn('[ArenaRenderer] Cena ou textures invalida, pulando geracao de arenas.');
    return;
  }

  const textures = scene.textures;

  ARENA_THEMES.forEach(theme => {
    const texKey = `arena_${theme}`;
    if (textures.exists(texKey)) return;

    try {
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = ARENA_H;
      const ctx = cv.getContext('2d');

      // DrawArena.drawArena() draws relative to ARENA_TOP (it uses
      // ctx.fillRect(0, ARENA_TOP, W, ARENA_H) etc.), but our canvas
      // starts at y=0. Shift the coordinate space up by ARENA_TOP so
      // everything lands at the correct position within the canvas.
      ctx.save();
      ctx.translate(0, -ARENA_TOP);

      // Pass empty obstacles array — obstacles are dynamic per match
      // and will be rendered as separate GameObjects on top.
      drawArena(ctx, theme, []);

      ctx.restore();

      textures.addCanvas(texKey, cv);
    } catch (err) {
      console.warn(`[ArenaRenderer] Falha ao gerar arena "${theme}", usando cor de fallback:`, err.message || err);
      _generateFallbackArena(textures, texKey, theme);
    }
  });
}

/**
 * Generates a single arena texture for a specific theme on demand.
 * Useful if you want to regenerate after window resize or if you
 * only need one theme at a time.
 *
 * @param {Phaser.Scene} scene - any active Phaser scene
 * @param {string} theme - one of 'favela', 'predio', 'bosque', 'rua'
 * @param {boolean} [force=false] - if true, removes existing texture first
 * @returns {string} the texture key
 */
export function generateSingleArenaTexture(scene, theme, force = false) {
  if (!scene || !scene.textures) {
    console.warn('[ArenaRenderer] Cena ou textures invalida para geracao individual.');
    return `arena_${theme}`;
  }

  const textures = scene.textures;
  const texKey = `arena_${theme}`;

  if (force && textures.exists(texKey)) {
    textures.remove(texKey);
  }

  if (!textures.exists(texKey)) {
    try {
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = ARENA_H;
      const ctx = cv.getContext('2d');

      ctx.save();
      ctx.translate(0, -ARENA_TOP);
      drawArena(ctx, theme, []);
      ctx.restore();

      textures.addCanvas(texKey, cv);
    } catch (err) {
      console.warn(`[ArenaRenderer] Falha ao gerar arena individual "${theme}":`, err.message || err);
      _generateFallbackArena(textures, texKey, theme);
    }
  }

  return texKey;
}

/**
 * Draws obstacle overlays onto a Phaser Graphics object.
 * Call this in BattleScene.create() after placing the arena background image.
 *
 * @param {Phaser.GameObjects.Graphics} graphics - a Graphics object from the scene
 * @param {Array} obstacles - array of {x, y, w, h} obstacle rects
 */
export function drawObstacleOverlays(graphics, obstacles) {
  if (!graphics || !obstacles || obstacles.length === 0) return;

  obstacles.forEach(ob => {
    if (!ob || typeof ob.x !== 'number') return;
    try {
      // Solid fill
      graphics.fillStyle(0x281e14, 0.7);
      graphics.fillRect(ob.x, ob.y - ARENA_TOP, ob.w, ob.h);
      // Stroke outline
      graphics.lineStyle(1.5, 0x000000, 0.5);
      graphics.strokeRect(ob.x, ob.y - ARENA_TOP, ob.w, ob.h);
    } catch (_e) {
      // Non-critical — skip this obstacle
    }
  });
}

// ── PRIVATE: Generate a solid-color fallback arena texture ───
function _generateFallbackArena(textures, texKey, theme) {
  try {
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = ARENA_H;
    const ctx = cv.getContext('2d');

    // Solid fill with theme-appropriate color
    ctx.fillStyle = FALLBACK_COLORS[theme] || DEFAULT_FALLBACK;
    ctx.fillRect(0, 0, W, ARENA_H);

    // Draw simple river line
    const riverLocalY = RIVER_Y - ARENA_TOP;
    ctx.fillStyle = 'rgba(52,152,219,0.4)';
    ctx.fillRect(0, riverLocalY - 10, W, 20);

    // Draw simple bridges
    BRIDGES.forEach(b => {
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(b.cx - b.half, riverLocalY - 12, b.half * 2, 24);
    });

    textures.addCanvas(texKey, cv);
  } catch (fallbackErr) {
    console.warn(`[ArenaRenderer] Ate o fallback falhou para "${theme}":`, fallbackErr.message || fallbackErr);
  }
}
