// ════════════════════════════════════════════════════════════
//  CharacterRenderer.js — High-quality procedural chibi sprites
//  Canvas2D with outlines, 3-tone shading, detailed accessories
// ════════════════════════════════════════════════════════════

// ── Skin Palette ──
const SKIN      = '#f4c896';
const SKIN_HI   = '#fce0b8'; // forehead highlight
const SKIN_DARK = '#d4a46a'; // shadow
const SKIN_OUT  = '#a87840'; // outline

// ── Team Colors ──
const TEAM_BLUE     = '#2980b9';
const TEAM_BLUE_HI  = '#5dade2';
const TEAM_BLUE_DK  = '#1a5276';
const TEAM_RED      = '#c0392b';
const TEAM_RED_HI   = '#e74c3c';
const TEAM_RED_DK   = '#922b21';

// ── Outline color ──
const OL = '#1a1210'; // dark outline

// Cache
const _charCache = {};

function getCacheKey(key, team, r) {
  return `${key}_${team}_${Math.round(r)}`;
}

// ══════════════════════════════════════════════════════════
//  PUBLIC API
// ══════════════════════════════════════════════════════════
export function getCharCanvas(key, team, r) {
  const ck = getCacheKey(key, team, r);
  if (_charCache[ck]) return _charCache[ck];

  const size = Math.ceil(r * 4); // larger canvas for crisp detail
  const cv = document.createElement('canvas');
  cv.width  = size;
  cv.height = size;
  const c  = cv.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const s  = r / 14; // scale factor (base radius = 14)

  c.save();
  c.translate(cx, cy);

  // ── Team glow outline behind the character ──
  const glowColor = team === 'player' ? 'rgba(41,128,185,0.55)' : 'rgba(192,57,43,0.55)';
  c.save();
  c.translate(0, 0);
  c.scale(1.07, 1.07);
  c.globalAlpha = 0.5;
  const glowRenderer = CHAR_RENDERERS[key];
  if (glowRenderer) {
    // Draw solid silhouette in team color
    c.globalCompositeOperation = 'source-over';
    glowRenderer(c, s, team, true); // true = silhouette mode
  }
  c.globalAlpha = 1.0;
  c.restore();

  // ── Main character ──
  const renderer = CHAR_RENDERERS[key];
  if (renderer) {
    renderer(c, s, team, false);
  } else {
    drawGenericChar(c, s, team, '#888');
  }

  c.restore();

  _charCache[ck] = cv;
  return cv;
}

export function drawCharacter(ctx, x, y, key, team, r) {
  const charCanvas = getCharCanvas(key, team, r);
  ctx.drawImage(charCanvas, x - charCanvas.width / 2, y - charCanvas.height / 2);
}

export function clearCharCache() {
  for (const k in _charCache) delete _charCache[k];
}

// ══════════════════════════════════════════════════════════
//  HELPER: Team accent colors
// ══════════════════════════════════════════════════════════
function tc(team)   { return team === 'player' ? TEAM_BLUE    : TEAM_RED; }
function tcHi(team) { return team === 'player' ? TEAM_BLUE_HI : TEAM_RED_HI; }
function tcDk(team) { return team === 'player' ? TEAM_BLUE_DK : TEAM_RED_DK; }

// ══════════════════════════════════════════════════════════
//  OUTLINE HELPERS
// ══════════════════════════════════════════════════════════
function ol(c, s) {
  c.strokeStyle = OL;
  c.lineWidth = 1.5 * s;
  c.lineJoin = 'round';
}

function strokeOutline(c, s) {
  c.strokeStyle = OL;
  c.lineWidth = 1.5 * s;
  c.lineJoin = 'round';
  c.stroke();
}

// ══════════════════════════════════════════════════════════
//  BODY PARTS — Chibi proportions
//  Head: 40% height, Body: 35%, Legs: 25%
//  Total height roughly: -16s (top head) to +14s (feet)
//  Head center: -8s, Body: -1s to 8s, Legs: 8s to 14s
// ══════════════════════════════════════════════════════════

// ── HEAD (big chibi head) ──
function drawHead(c, s, hairColor, sil) {
  const headR = 7.5 * s; // bigger head
  const headY = -7 * s;

  if (sil) {
    c.beginPath();
    c.arc(0, headY, headR + 1 * s, 0, Math.PI * 2);
    c.fill();
    return;
  }

  // Hair back (drawn first so head overlaps)
  if (hairColor) {
    c.fillStyle = hairColor;
    c.beginPath();
    c.arc(0, headY - 1 * s, headR + 0.5 * s, Math.PI + 0.2, -0.2);
    c.fill();
    ol(c, s);
    c.beginPath();
    c.arc(0, headY - 1 * s, headR + 0.5 * s, Math.PI + 0.2, -0.2);
    c.stroke();
  }

  // Head circle
  c.fillStyle = SKIN;
  c.beginPath();
  c.arc(0, headY, headR, 0, Math.PI * 2);
  c.fill();

  // Forehead highlight
  c.fillStyle = SKIN_HI;
  c.beginPath();
  c.arc(0, headY - 2 * s, headR * 0.55, 0, Math.PI * 2);
  c.fill();

  // Head outline
  ol(c, s);
  c.beginPath();
  c.arc(0, headY, headR, 0, Math.PI * 2);
  c.stroke();

  // Chin shadow
  c.fillStyle = SKIN_DARK;
  c.beginPath();
  c.arc(0, headY + 1.5 * s, headR * 0.75, 0.3, Math.PI - 0.3);
  c.fill();
}

// ── EYES — detailed with sclera, iris, pupil, specular ──
function drawEyes(c, s, eyeType, irisColor) {
  const ey = -8 * s;
  const lx = -2.8 * s;
  const rx =  2.8 * s;
  const iris = irisColor || '#3e2723';

  if (eyeType === 'angry') {
    drawAngryEyes(c, s, lx, rx, ey, iris);
  } else if (eyeType === 'kind') {
    drawKindEyes(c, s, lx, rx, ey, iris);
  } else if (eyeType === 'sinister') {
    drawSinisterEyes(c, s, lx, rx, ey, iris);
  } else if (eyeType === 'cool') {
    drawCoolEyes(c, s, lx, rx, ey, iris);
  } else {
    drawNormalEyes(c, s, lx, rx, ey, iris);
  }
}

function drawNormalEyes(c, s, lx, rx, ey, iris) {
  // Sclera
  c.fillStyle = '#fff';
  c.beginPath();
  c.ellipse(lx, ey, 2.0 * s, 1.8 * s, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(rx, ey, 2.0 * s, 1.8 * s, 0, 0, Math.PI * 2);
  c.fill();

  // Iris
  c.fillStyle = iris;
  c.beginPath();
  c.arc(lx + 0.3 * s, ey, 1.2 * s, 0, Math.PI * 2);
  c.arc(rx + 0.3 * s, ey, 1.2 * s, 0, Math.PI * 2);
  c.fill();

  // Pupil
  c.fillStyle = '#111';
  c.beginPath();
  c.arc(lx + 0.4 * s, ey + 0.1 * s, 0.7 * s, 0, Math.PI * 2);
  c.arc(rx + 0.4 * s, ey + 0.1 * s, 0.7 * s, 0, Math.PI * 2);
  c.fill();

  // Specular highlights
  c.fillStyle = '#fff';
  c.beginPath();
  c.arc(lx - 0.2 * s, ey - 0.6 * s, 0.55 * s, 0, Math.PI * 2);
  c.arc(rx - 0.2 * s, ey - 0.6 * s, 0.55 * s, 0, Math.PI * 2);
  c.fill();
  // Small secondary highlight
  c.beginPath();
  c.arc(lx + 0.7 * s, ey + 0.5 * s, 0.25 * s, 0, Math.PI * 2);
  c.arc(rx + 0.7 * s, ey + 0.5 * s, 0.25 * s, 0, Math.PI * 2);
  c.fill();

  // Outline
  ol(c, s);
  c.beginPath();
  c.ellipse(lx, ey, 2.0 * s, 1.8 * s, 0, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.ellipse(rx, ey, 2.0 * s, 1.8 * s, 0, 0, Math.PI * 2);
  c.stroke();
}

function drawAngryEyes(c, s, lx, rx, ey, iris) {
  // Sclera (narrower, angled brow)
  c.fillStyle = '#fff';
  c.beginPath();
  c.ellipse(lx, ey, 2.0 * s, 1.5 * s, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(rx, ey, 2.0 * s, 1.5 * s, 0, 0, Math.PI * 2);
  c.fill();

  // Iris
  c.fillStyle = iris;
  c.beginPath();
  c.arc(lx + 0.3 * s, ey + 0.2 * s, 1.1 * s, 0, Math.PI * 2);
  c.arc(rx + 0.3 * s, ey + 0.2 * s, 1.1 * s, 0, Math.PI * 2);
  c.fill();

  // Pupil
  c.fillStyle = '#111';
  c.beginPath();
  c.arc(lx + 0.3 * s, ey + 0.3 * s, 0.6 * s, 0, Math.PI * 2);
  c.arc(rx + 0.3 * s, ey + 0.3 * s, 0.6 * s, 0, Math.PI * 2);
  c.fill();

  // Specular
  c.fillStyle = '#fff';
  c.beginPath();
  c.arc(lx - 0.2 * s, ey - 0.5 * s, 0.45 * s, 0, Math.PI * 2);
  c.arc(rx - 0.2 * s, ey - 0.5 * s, 0.45 * s, 0, Math.PI * 2);
  c.fill();

  // Angry brow
  c.strokeStyle = OL;
  c.lineWidth = 1.8 * s;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(lx - 2.2 * s, ey - 2.5 * s);
  c.lineTo(lx + 1.5 * s, ey - 1.8 * s);
  c.stroke();
  c.beginPath();
  c.moveTo(rx + 2.2 * s, ey - 2.5 * s);
  c.lineTo(rx - 1.5 * s, ey - 1.8 * s);
  c.stroke();
  c.lineCap = 'butt';

  // Outline
  ol(c, s);
  c.beginPath();
  c.ellipse(lx, ey, 2.0 * s, 1.5 * s, 0, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.ellipse(rx, ey, 2.0 * s, 1.5 * s, 0, 0, Math.PI * 2);
  c.stroke();
}

function drawKindEyes(c, s, lx, rx, ey, iris) {
  // Larger rounder eyes
  c.fillStyle = '#fff';
  c.beginPath();
  c.ellipse(lx, ey, 2.2 * s, 2.2 * s, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(rx, ey, 2.2 * s, 2.2 * s, 0, 0, Math.PI * 2);
  c.fill();

  // Iris
  c.fillStyle = iris;
  c.beginPath();
  c.arc(lx + 0.2 * s, ey + 0.2 * s, 1.3 * s, 0, Math.PI * 2);
  c.arc(rx + 0.2 * s, ey + 0.2 * s, 1.3 * s, 0, Math.PI * 2);
  c.fill();

  // Pupil
  c.fillStyle = '#111';
  c.beginPath();
  c.arc(lx + 0.3 * s, ey + 0.3 * s, 0.7 * s, 0, Math.PI * 2);
  c.arc(rx + 0.3 * s, ey + 0.3 * s, 0.7 * s, 0, Math.PI * 2);
  c.fill();

  // Large specular
  c.fillStyle = '#fff';
  c.beginPath();
  c.arc(lx - 0.4 * s, ey - 0.7 * s, 0.65 * s, 0, Math.PI * 2);
  c.arc(rx - 0.4 * s, ey - 0.7 * s, 0.65 * s, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(lx + 0.6 * s, ey + 0.5 * s, 0.3 * s, 0, Math.PI * 2);
  c.arc(rx + 0.6 * s, ey + 0.5 * s, 0.3 * s, 0, Math.PI * 2);
  c.fill();

  // Soft lower arc (kind look)
  c.strokeStyle = '#a0522d';
  c.lineWidth = 0.6 * s;
  c.beginPath();
  c.arc(lx, ey + 1.5 * s, 1.5 * s, 0.3, Math.PI - 0.3);
  c.stroke();
  c.beginPath();
  c.arc(rx, ey + 1.5 * s, 1.5 * s, 0.3, Math.PI - 0.3);
  c.stroke();

  // Outline
  ol(c, s);
  c.beginPath();
  c.ellipse(lx, ey, 2.2 * s, 2.2 * s, 0, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.ellipse(rx, ey, 2.2 * s, 2.2 * s, 0, 0, Math.PI * 2);
  c.stroke();
}

function drawSinisterEyes(c, s, lx, rx, ey, iris) {
  // Narrow slits
  c.fillStyle = iris || '#e74c3c';
  c.beginPath();
  c.ellipse(lx, ey, 2.0 * s, 1.0 * s, 0, 0, Math.PI * 2);
  c.ellipse(rx, ey, 2.0 * s, 1.0 * s, 0, 0, Math.PI * 2);
  c.fill();

  // Pupil slit
  c.fillStyle = '#111';
  c.beginPath();
  c.ellipse(lx + 0.2 * s, ey, 0.5 * s, 0.9 * s, 0, 0, Math.PI * 2);
  c.ellipse(rx + 0.2 * s, ey, 0.5 * s, 0.9 * s, 0, 0, Math.PI * 2);
  c.fill();

  // Specular
  c.fillStyle = 'rgba(255,255,255,0.7)';
  c.beginPath();
  c.arc(lx - 0.5 * s, ey - 0.3 * s, 0.4 * s, 0, Math.PI * 2);
  c.arc(rx - 0.5 * s, ey - 0.3 * s, 0.4 * s, 0, Math.PI * 2);
  c.fill();

  // Outline
  ol(c, s);
  c.beginPath();
  c.ellipse(lx, ey, 2.0 * s, 1.0 * s, 0, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.ellipse(rx, ey, 2.0 * s, 1.0 * s, 0, 0, Math.PI * 2);
  c.stroke();
}

function drawCoolEyes(c, s, lx, rx, ey, iris) {
  // Slightly squinted, determined
  c.fillStyle = '#fff';
  c.beginPath();
  c.ellipse(lx, ey, 2.0 * s, 1.4 * s, -0.1, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(rx, ey, 2.0 * s, 1.4 * s, 0.1, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = iris;
  c.beginPath();
  c.arc(lx + 0.3 * s, ey + 0.1 * s, 1.1 * s, 0, Math.PI * 2);
  c.arc(rx + 0.3 * s, ey + 0.1 * s, 1.1 * s, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = '#111';
  c.beginPath();
  c.arc(lx + 0.3 * s, ey + 0.2 * s, 0.6 * s, 0, Math.PI * 2);
  c.arc(rx + 0.3 * s, ey + 0.2 * s, 0.6 * s, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = '#fff';
  c.beginPath();
  c.arc(lx - 0.2 * s, ey - 0.4 * s, 0.45 * s, 0, Math.PI * 2);
  c.arc(rx - 0.2 * s, ey - 0.4 * s, 0.45 * s, 0, Math.PI * 2);
  c.fill();

  // Subtle confident brow
  c.strokeStyle = OL;
  c.lineWidth = 1.4 * s;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(lx - 2 * s, ey - 2.8 * s);
  c.lineTo(lx + 2 * s, ey - 2.4 * s);
  c.stroke();
  c.beginPath();
  c.moveTo(rx + 2 * s, ey - 2.8 * s);
  c.lineTo(rx - 2 * s, ey - 2.4 * s);
  c.stroke();
  c.lineCap = 'butt';

  ol(c, s);
  c.beginPath();
  c.ellipse(lx, ey, 2.0 * s, 1.4 * s, -0.1, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.ellipse(rx, ey, 2.0 * s, 1.4 * s, 0.1, 0, Math.PI * 2);
  c.stroke();
}

// ── MOUTH ──
function drawMouth(c, s, type) {
  const my = -4.2 * s;
  if (type === 'grin') {
    c.strokeStyle = '#8b4513';
    c.lineWidth = 0.9 * s;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(0, my, 2.2 * s, 0.15, Math.PI - 0.15);
    c.stroke();
    // Teeth
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(0, my + 0.5 * s, 1.5 * s, 0.3, Math.PI - 0.3);
    c.fill();
    c.lineCap = 'butt';
  } else if (type === 'smirk') {
    c.strokeStyle = '#8b4513';
    c.lineWidth = 0.9 * s;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(1 * s, my, 1.8 * s, 0.2, Math.PI - 0.5);
    c.stroke();
    c.lineCap = 'butt';
  } else if (type === 'open') {
    c.fillStyle = '#5a1a00';
    c.beginPath();
    c.ellipse(0, my + 0.5 * s, 2 * s, 1.5 * s, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(0, my, 1.5 * s, Math.PI + 0.3, -0.3);
    c.fill();
  } else if (type === 'serious') {
    c.strokeStyle = '#8b4513';
    c.lineWidth = 1.0 * s;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-1.5 * s, my + 0.5 * s);
    c.lineTo(1.5 * s, my + 0.5 * s);
    c.stroke();
    c.lineCap = 'butt';
  } else {
    // Default smile
    c.strokeStyle = '#8b4513';
    c.lineWidth = 0.8 * s;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(0, my, 1.8 * s, 0.15, Math.PI - 0.15);
    c.stroke();
    c.lineCap = 'butt';
  }
}

// ── BODY (3-tone shading) ──
function drawBody(c, s, baseColor, sil) {
  const bx = -6.5 * s;
  const by = 0;
  const bw = 13 * s;
  const bh = 10 * s;

  if (sil) {
    c.beginPath();
    c.roundRect(bx - 1 * s, by - 1 * s, bw + 2 * s, bh + 2 * s, 3 * s);
    c.fill();
    return;
  }

  // Shadow (bottom)
  c.fillStyle = darken(baseColor, 0.25);
  c.beginPath();
  c.roundRect(bx, by, bw, bh, 3 * s);
  c.fill();

  // Base
  c.fillStyle = baseColor;
  c.beginPath();
  c.roundRect(bx, by, bw, bh * 0.75, 3 * s);
  c.fill();

  // Highlight (top)
  c.fillStyle = lighten(baseColor, 0.2);
  c.beginPath();
  c.roundRect(bx + 1 * s, by + 0.5 * s, bw - 2 * s, bh * 0.3, 2 * s);
  c.fill();

  // Outline
  ol(c, s);
  c.beginPath();
  c.roundRect(bx, by, bw, bh, 3 * s);
  c.stroke();
}

// ── ARMS (with 3-tone shading + hands) ──
function drawArms(c, s, baseColor, sil) {
  const armW = 3.8 * s;
  const armH = 8 * s;
  const lx = -6.5 * s - armW;
  const rx = 6.5 * s;
  const ay = 0.5 * s;

  if (sil) {
    c.fillRect(lx - 1 * s, ay - 1 * s, armW + 2 * s, armH + 2 * s);
    c.fillRect(rx - 1 * s, ay - 1 * s, armW + 2 * s, armH + 2 * s);
    return;
  }

  // Left arm
  c.fillStyle = baseColor;
  c.beginPath();
  c.roundRect(lx, ay, armW, armH, 2 * s);
  c.fill();
  c.fillStyle = darken(baseColor, 0.2);
  c.beginPath();
  c.roundRect(lx, ay + armH * 0.5, armW, armH * 0.5, 2 * s);
  c.fill();
  ol(c, s);
  c.beginPath();
  c.roundRect(lx, ay, armW, armH, 2 * s);
  c.stroke();

  // Right arm
  c.fillStyle = baseColor;
  c.beginPath();
  c.roundRect(rx, ay, armW, armH, 2 * s);
  c.fill();
  c.fillStyle = darken(baseColor, 0.2);
  c.beginPath();
  c.roundRect(rx, ay + armH * 0.5, armW, armH * 0.5, 2 * s);
  c.fill();
  ol(c, s);
  c.beginPath();
  c.roundRect(rx, ay, armW, armH, 2 * s);
  c.stroke();

  // Hands
  const handR = 2.2 * s;
  const handY = ay + armH - 0.5 * s;
  c.fillStyle = SKIN;
  c.beginPath();
  c.arc(lx + armW / 2, handY, handR, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = SKIN_HI;
  c.beginPath();
  c.arc(lx + armW / 2 - 0.3 * s, handY - 0.5 * s, handR * 0.45, 0, Math.PI * 2);
  c.fill();
  ol(c, s);
  c.beginPath();
  c.arc(lx + armW / 2, handY, handR, 0, Math.PI * 2);
  c.stroke();

  c.fillStyle = SKIN;
  c.beginPath();
  c.arc(rx + armW / 2, handY, handR, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = SKIN_HI;
  c.beginPath();
  c.arc(rx + armW / 2 - 0.3 * s, handY - 0.5 * s, handR * 0.45, 0, Math.PI * 2);
  c.fill();
  ol(c, s);
  c.beginPath();
  c.arc(rx + armW / 2, handY, handR, 0, Math.PI * 2);
  c.stroke();
}

// ── FEET/LEGS (short, stubby chibi legs) ──
function drawFeet(c, s, color, sil) {
  const fy = 9.5 * s;
  const fh = 4 * s;
  const fw = 5 * s;

  if (sil) {
    c.fillRect(-6 * s, fy - 1 * s, fw + 2 * s, fh + 2 * s);
    c.fillRect(1 * s - 1 * s, fy - 1 * s, fw + 2 * s, fh + 2 * s);
    return;
  }

  // Left shoe
  c.fillStyle = color || '#333';
  c.beginPath();
  c.roundRect(-6 * s, fy, fw, fh, [0, 0, 2 * s, 2 * s]);
  c.fill();
  c.fillStyle = lighten(color || '#333', 0.15);
  c.beginPath();
  c.roundRect(-5.5 * s, fy + 0.3 * s, fw - 1.5 * s, fh * 0.4, 1 * s);
  c.fill();
  ol(c, s);
  c.beginPath();
  c.roundRect(-6 * s, fy, fw, fh, [0, 0, 2 * s, 2 * s]);
  c.stroke();

  // Right shoe
  c.fillStyle = color || '#333';
  c.beginPath();
  c.roundRect(1 * s, fy, fw, fh, [0, 0, 2 * s, 2 * s]);
  c.fill();
  c.fillStyle = lighten(color || '#333', 0.15);
  c.beginPath();
  c.roundRect(1.5 * s, fy + 0.3 * s, fw - 1.5 * s, fh * 0.4, 1 * s);
  c.fill();
  ol(c, s);
  c.beginPath();
  c.roundRect(1 * s, fy, fw, fh, [0, 0, 2 * s, 2 * s]);
  c.stroke();
}

// ── GENERIC CHARACTER (fallback) ──
function drawGenericChar(c, s, team, accentColor) {
  const teamAccent = tc(team);
  drawFeet(c, s, '#333');
  drawBody(c, s, teamAccent);
  drawArms(c, s, teamAccent);
  drawHead(c, s, '#4a2800');
  drawEyes(c, s, 'normal', '#3e2723');
  drawMouth(c, s, 'smile');
}

// ══════════════════════════════════════════════════════════
//  COLOR UTILITIES
// ══════════════════════════════════════════════════════════
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  return {
    r: parseInt(hex.substring(0,2), 16),
    g: parseInt(hex.substring(2,4), 16),
    b: parseInt(hex.substring(4,6), 16)
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r,g,b].map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}

function darken(hex, amt) {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  const {r,g,b} = hexToRgb(hex);
  return rgbToHex(r*(1-amt), g*(1-amt), b*(1-amt));
}

function lighten(hex, amt) {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  const {r,g,b} = hexToRgb(hex);
  return rgbToHex(r+(255-r)*amt, g+(255-g)*amt, b+(255-b)*amt);
}

function tintTeam(baseHex, team, amt) {
  if (baseHex.startsWith('rgba') || baseHex.startsWith('rgb')) return baseHex;
  const base = hexToRgb(baseHex);
  const tint = team === 'player' ? {r:41,g:128,b:185} : {r:192,g:57,b:43};
  return rgbToHex(
    base.r + (tint.r - base.r) * amt,
    base.g + (tint.g - base.g) * amt,
    base.b + (tint.b - base.b) * amt
  );
}

// ══════════════════════════════════════════════════════════
//  RENDERERS POR PERSONAGEM
// ══════════════════════════════════════════════════════════

const CHAR_RENDERERS = {

  // ═════════════════════════════════════════════
  //  PADEIRO — Chef hat with pleats, golden baguette
  // ═════════════════════════════════════════════
  padeiro(c, s, team, sil) {
    const accent = tintTeam('#f5f5f5', team, 0.1);
    const armColor = tintTeam('#d4a46a', team, 0.15);

    if (sil) { _silhouette(c, s, team); return; }

    drawFeet(c, s, '#5d4037');
    drawBody(c, s, accent);
    drawArms(c, s, armColor);

    // Apron strings
    c.strokeStyle = '#ddd';
    c.lineWidth = 1 * s;
    c.beginPath();
    c.moveTo(-4 * s, 1 * s);
    c.lineTo(-6 * s, 4 * s);
    c.moveTo(4 * s, 1 * s);
    c.lineTo(6 * s, 4 * s);
    c.stroke();

    // Apron front detail
    c.fillStyle = '#eee';
    c.beginPath();
    c.roundRect(-4 * s, 2 * s, 8 * s, 6 * s, 2 * s);
    c.fill();
    ol(c, s);
    c.beginPath();
    c.roundRect(-4 * s, 2 * s, 8 * s, 6 * s, 2 * s);
    c.stroke();

    drawHead(c, s, '#4a2800');
    drawEyes(c, s, 'kind', '#6b4226');
    drawMouth(c, s, 'grin');

    // Chef hat — tall with pleats
    c.fillStyle = '#fff';
    c.beginPath();
    c.roundRect(-7 * s, -17 * s, 14 * s, 4 * s, 1 * s);
    c.fill();
    // Hat puff top
    c.beginPath();
    c.arc(-3 * s, -20 * s, 4.5 * s, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(3 * s, -20 * s, 4.5 * s, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(0, -22 * s, 4 * s, 0, Math.PI * 2);
    c.fill();
    // Hat pleats
    c.strokeStyle = '#ddd';
    c.lineWidth = 0.6 * s;
    for (let i = -2; i <= 2; i++) {
      c.beginPath();
      c.moveTo(i * 2.5 * s, -17 * s);
      c.lineTo(i * 2 * s, -22 * s);
      c.stroke();
    }
    // Hat outline
    ol(c, s);
    c.beginPath();
    c.moveTo(-7 * s, -13 * s);
    c.lineTo(-7 * s, -17 * s);
    c.arc(-3 * s, -20 * s, 4.5 * s, Math.PI, Math.PI * 1.5);
    c.arc(0, -22 * s, 4 * s, Math.PI * 1.2, Math.PI * 1.8);
    c.arc(3 * s, -20 * s, 4.5 * s, Math.PI * 1.5, 0);
    c.lineTo(7 * s, -13 * s);
    c.stroke();

    // Golden baguette in right hand
    c.fillStyle = '#d4a017';
    c.beginPath();
    c.ellipse(9 * s, 6 * s, 5 * s, 2.5 * s, -0.4, 0, Math.PI * 2);
    c.fill();
    // Bread scoring
    c.strokeStyle = '#c49000';
    c.lineWidth = 0.6 * s;
    for (let i = -2; i <= 2; i++) {
      c.beginPath();
      c.moveTo((7 + i * 1.5) * s, 5 * s);
      c.lineTo((7.5 + i * 1.5) * s, 7 * s);
      c.stroke();
    }
    // Bread shine
    c.fillStyle = 'rgba(255,255,200,0.4)';
    c.beginPath();
    c.ellipse(8.5 * s, 5 * s, 3 * s, 1 * s, -0.4, 0, Math.PI * 2);
    c.fill();
    // Bread outline
    ol(c, s);
    c.beginPath();
    c.ellipse(9 * s, 6 * s, 5 * s, 2.5 * s, -0.4, 0, Math.PI * 2);
    c.stroke();
  },

  // ═════════════════════════════════════════════
  //  MOTOTAXISTA — Detailed helmet, visor reflection, leather jacket
  // ═════════════════════════════════════════════
  mototaxista(c, s, team, sil) {
    if (sil) { _silhouette(c, s, team); return; }
    const jacketColor = tintTeam('#1a1a2e', team, 0.12);

    drawFeet(c, s, '#222');
    drawBody(c, s, jacketColor);

    // Jacket zipper
    c.strokeStyle = '#666';
    c.lineWidth = 0.8 * s;
    c.beginPath();
    c.moveTo(0, 0.5 * s);
    c.lineTo(0, 9 * s);
    c.stroke();
    // Jacket collar
    c.fillStyle = darken(jacketColor, 0.1);
    c.beginPath();
    c.moveTo(-5 * s, 0);
    c.lineTo(-2 * s, -1 * s);
    c.lineTo(0, 0.5 * s);
    c.lineTo(2 * s, -1 * s);
    c.lineTo(5 * s, 0);
    c.lineTo(5 * s, 2 * s);
    c.lineTo(-5 * s, 2 * s);
    c.closePath();
    c.fill();

    // Orange stripe on body
    c.fillStyle = '#e67e22';
    c.fillRect(-6.5 * s, 5 * s, 13 * s, 2 * s);
    c.fillStyle = '#f39c12';
    c.fillRect(-6.5 * s, 5 * s, 13 * s, 0.7 * s);

    drawArms(c, s, jacketColor);
    drawHead(c, s, '#2c1810');
    drawEyes(c, s, 'cool', '#3e2723');
    drawMouth(c, s, 'smirk');

    // Helmet
    const hx = 0, hy = -9 * s;
    c.fillStyle = '#e67e22';
    c.beginPath();
    c.arc(hx, hy, 8 * s, Math.PI + 0.15, -0.15);
    c.fill();
    // Helmet shine
    c.fillStyle = '#f0a050';
    c.beginPath();
    c.arc(hx - 2 * s, hy - 2 * s, 4 * s, Math.PI + 0.5, -0.3);
    c.fill();
    // Helmet stripe
    c.fillStyle = darken('#e67e22', 0.2);
    c.beginPath();
    c.arc(hx, hy - 0.5 * s, 7 * s, Math.PI + 0.8, -0.8);
    c.lineWidth = 1.5 * s;
    c.strokeStyle = darken('#e67e22', 0.3);
    c.stroke();
    // Visor
    c.fillStyle = 'rgba(100,200,255,0.45)';
    c.beginPath();
    c.arc(hx, -7 * s, 7 * s, -0.5, 0.5);
    c.lineTo(hx, -7 * s);
    c.fill();
    // Visor reflection
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.beginPath();
    c.arc(hx + 2 * s, -7.5 * s, 3 * s, -0.3, 0.3);
    c.lineTo(hx + 2 * s, -7.5 * s);
    c.fill();
    // Helmet outline
    ol(c, s);
    c.beginPath();
    c.arc(hx, hy, 8 * s, Math.PI + 0.15, -0.15);
    c.stroke();
  },

  // ═════════════════════════════════════════════
  //  CABELEIREIRO — Scissors, healing aura
  // ═════════════════════════════════════════════
  cabeleireiro(c, s, team, sil) {
    if (sil) { _silhouette(c, s, team); return; }
    const bodyC = tintTeam('#e91e63', team, 0.1);

    drawFeet(c, s, '#880e4f');
    drawBody(c, s, bodyC);
    drawArms(c, s, bodyC);
    drawHead(c, s, '#d81b60');
    drawEyes(c, s, 'kind', '#6b2c4a');
    drawMouth(c, s, 'smile');

    // Styled hair (bigger)
    c.fillStyle = '#d81b60';
    c.beginPath();
    c.arc(-5 * s, -10 * s, 4 * s, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(5 * s, -10 * s, 4 * s, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(0, -14 * s, 3.5 * s, 0, Math.PI * 2);
    c.fill();

    // Scissors in right hand
    c.strokeStyle = '#ccc';
    c.lineWidth = 1.5 * s;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(9 * s, 4 * s);
    c.lineTo(13 * s, 0);
    c.stroke();
    c.beginPath();
    c.moveTo(9 * s, 4 * s);
    c.lineTo(13 * s, 8 * s);
    c.stroke();
    // Scissors pivot
    c.fillStyle = '#999';
    c.beginPath();
    c.arc(9 * s, 4 * s, 1.5 * s, 0, Math.PI * 2);
    c.fill();
    // Blade tips
    c.fillStyle = '#ddd';
    c.beginPath();
    c.ellipse(13.5 * s, -0.5 * s, 1.5 * s, 0.8 * s, -0.5, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(13.5 * s, 8.5 * s, 1.5 * s, 0.8 * s, 0.5, 0, Math.PI * 2);
    c.fill();
    c.lineCap = 'butt';

    // Healing aura
    c.strokeStyle = 'rgba(0,255,100,0.35)';
    c.lineWidth = 1.2 * s;
    c.beginPath();
    c.arc(0, 0, 12 * s, 0, Math.PI * 2);
    c.stroke();
    // Healing cross
    c.fillStyle = 'rgba(0,255,100,0.3)';
    c.fillRect(-1.5 * s, -1 * s, 3 * s, 7 * s);
    c.fillRect(-3 * s, 1.5 * s, 6 * s, 2.5 * s);
  },

  // ═════════════════════════════════════════════
  //  VEREADOR — Pinstripe suit, gold cufflinks, briefcase
  // ═════════════════════════════════════════════
  vereador(c, s, team, sil) {
    if (sil) { _silhouette(c, s, team); return; }
    const suitColor = tintTeam('#2c3e50', team, 0.08);

    drawFeet(c, s, '#1a1a1a');
    drawBody(c, s, suitColor);

    // Pinstripes
    c.strokeStyle = 'rgba(255,255,255,0.08)';
    c.lineWidth = 0.5 * s;
    for (let i = -5; i <= 5; i += 2) {
      c.beginPath();
      c.moveTo(i * s, 0.5 * s);
      c.lineTo(i * s, 9.5 * s);
      c.stroke();
    }

    // Shirt + tie
    c.fillStyle = '#ecf0f1';
    c.beginPath();
    c.moveTo(-2 * s, 0);
    c.lineTo(2 * s, 0);
    c.lineTo(2 * s, 6 * s);
    c.lineTo(-2 * s, 6 * s);
    c.closePath();
    c.fill();
    // Tie
    c.fillStyle = '#c0392b';
    c.beginPath();
    c.moveTo(0, -0.5 * s);
    c.lineTo(-1.8 * s, 4 * s);
    c.lineTo(0, 6.5 * s);
    c.lineTo(1.8 * s, 4 * s);
    c.closePath();
    c.fill();
    // Tie shine
    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-0.8 * s, 3 * s);
    c.lineTo(0, 4.5 * s);
    c.lineTo(0.5 * s, 2 * s);
    c.closePath();
    c.fill();
    ol(c, s);
    c.beginPath();
    c.moveTo(0, -0.5 * s);
    c.lineTo(-1.8 * s, 4 * s);
    c.lineTo(0, 6.5 * s);
    c.lineTo(1.8 * s, 4 * s);
    c.closePath();
    c.stroke();

    drawArms(c, s, suitColor);

    // Gold cufflinks
    c.fillStyle = '#f1c40f';
    c.beginPath();
    c.arc(-8.5 * s, 7 * s, 1 * s, 0, Math.PI * 2);
    c.arc(8.5 * s, 7 * s, 1 * s, 0, Math.PI * 2);
    c.fill();

    drawHead(c, s, '#333');
    drawEyes(c, s, 'cool', '#2c3e50');
    drawMouth(c, s, 'smirk');

    // Briefcase
    c.fillStyle = '#5d4037';
    c.beginPath();
    c.roundRect(-12 * s, 4 * s, 6 * s, 5 * s, 1.5 * s);
    c.fill();
    c.fillStyle = darken('#5d4037', 0.2);
    c.beginPath();
    c.roundRect(-12 * s, 7 * s, 6 * s, 2 * s, 1 * s);
    c.fill();
    // Briefcase latch
    c.fillStyle = '#f1c40f';
    c.beginPath();
    c.roundRect(-10 * s, 3.2 * s, 2 * s, 1.2 * s, 0.5 * s);
    c.fill();
    // Briefcase handle
    c.strokeStyle = '#4e342e';
    c.lineWidth = 1 * s;
    c.beginPath();
    c.arc(-9 * s, 3.5 * s, 2 * s, Math.PI, 0);
    c.stroke();
    ol(c, s);
    c.beginPath();
    c.roundRect(-12 * s, 4 * s, 6 * s, 5 * s, 1.5 * s);
    c.stroke();
  },

  // ═════════════════════════════════════════════
  //  GAUCHO — Wide hat, poncho, lasso
  // ═════════════════════════════════════════════
  gaucho(c, s, team, sil) {
    if (sil) { _silhouette(c, s, team); return; }
    const poncho = tintTeam('#795548', team, 0.1);

    drawFeet(c, s, '#4e342e');
    drawBody(c, s, poncho);
    // Poncho fringe
    c.fillStyle = darken(poncho, 0.1);
    for (let i = -5; i <= 5; i += 2) {
      c.beginPath();
      c.moveTo(i * s, 9 * s);
      c.lineTo((i - 0.5) * s, 11 * s);
      c.lineTo((i + 0.5) * s, 11 * s);
      c.closePath();
      c.fill();
    }

    drawArms(c, s, '#a0522d');
    drawHead(c, s, '#3e2723');
    drawEyes(c, s, 'cool', '#5d4037');
    drawMouth(c, s, 'serious');

    // Wide brim hat
    c.fillStyle = '#5d4037';
    c.beginPath();
    c.ellipse(0, -13 * s, 10 * s, 2.5 * s, 0, 0, Math.PI * 2);
    c.fill();
    // Hat crown
    c.fillStyle = '#6d4c41';
    c.beginPath();
    c.roundRect(-5.5 * s, -20 * s, 11 * s, 8 * s, 3 * s);
    c.fill();
    // Hat band
    c.fillStyle = '#d4a017';
    c.fillRect(-5.5 * s, -14 * s, 11 * s, 1.5 * s);
    // Hat highlight
    c.fillStyle = lighten('#6d4c41', 0.15);
    c.beginPath();
    c.roundRect(-4 * s, -19 * s, 8 * s, 3 * s, 2 * s);
    c.fill();
    // Hat outline
    ol(c, s);
    c.beginPath();
    c.ellipse(0, -13 * s, 10 * s, 2.5 * s, 0, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.roundRect(-5.5 * s, -20 * s, 11 * s, 8 * s, 3 * s);
    c.stroke();

    // Lasso in right hand
    c.strokeStyle = '#d4a017';
    c.lineWidth = 1.8 * s;
    c.beginPath();
    c.arc(10 * s, 2 * s, 4.5 * s, 0, Math.PI * 2);
    c.stroke();
    c.lineWidth = 1.2 * s;
    c.beginPath();
    c.moveTo(10 * s, 6.5 * s);
    c.lineTo(9 * s, 9 * s);
    c.stroke();
  },

  // ═════════════════════════════════════════════
  //  ZELADOR — Cap, broom with detailed bristles
  // ═════════════════════════════════════════════
  zelador(c, s, team, sil) {
    if (sil) { _silhouette(c, s, team); return; }
    const bodyC = tintTeam('#607d8b', team, 0.1);

    drawFeet(c, s, '#333');
    drawBody(c, s, bodyC);
    // Name tag
    c.fillStyle = '#fff';
    c.beginPath();
    c.roundRect(-3 * s, 2 * s, 6 * s, 3 * s, 1 * s);
    c.fill();
    c.fillStyle = '#333';
    c.font = `bold ${2 * s}px Arial`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('ZEL', 0, 3.5 * s);

    drawArms(c, s, '#455a64');
    drawHead(c, s, '#555');
    drawEyes(c, s, 'normal', '#607d8b');
    drawMouth(c, s, 'serious');

    // Cap
    c.fillStyle = '#37474f';
    c.beginPath();
    c.roundRect(-6.5 * s, -14 * s, 13 * s, 4 * s, 1 * s);
    c.fill();
    c.fillRect(-2 * s, -15 * s, 10 * s, 2.5 * s);
    ol(c, s);
    c.beginPath();
    c.roundRect(-6.5 * s, -14 * s, 13 * s, 4 * s, 1 * s);
    c.stroke();

    // Broom handle
    c.strokeStyle = '#8d6e63';
    c.lineWidth = 2 * s;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(9 * s, -5 * s);
    c.lineTo(9 * s, 11 * s);
    c.stroke();
    c.lineCap = 'butt';
    // Broom head
    c.fillStyle = '#4e342e';
    c.beginPath();
    c.roundRect(6 * s, 10 * s, 6 * s, 3.5 * s, 1 * s);
    c.fill();
    ol(c, s);
    c.beginPath();
    c.roundRect(6 * s, 10 * s, 6 * s, 3.5 * s, 1 * s);
    c.stroke();
    // Bristles
    c.strokeStyle = '#795548';
    c.lineWidth = 0.7 * s;
    for (let i = 0; i < 7; i++) {
      c.beginPath();
      c.moveTo((6.5 + i * 0.8) * s, 13 * s);
      c.lineTo((6 + i * 0.9) * s, 16.5 * s);
      c.stroke();
    }
  },

  // ═════════════════════════════════════════════
  //  DANCARINA — Flower in hair, detailed skirt with sparkles
  // ═════════════════════════════════════════════
  dancarina(c, s, team, sil) {
    if (sil) { _silhouette(c, s, team); return; }
    const dressColor = tintTeam('#ff69b4', team, 0.08);

    drawFeet(c, s, '#c2185b');
    drawBody(c, s, dressColor);

    // Flowing skirt
    c.fillStyle = dressColor;
    c.beginPath();
    c.moveTo(-7 * s, 7 * s);
    c.quadraticCurveTo(-9 * s, 11 * s, -10 * s, 13 * s);
    c.lineTo(10 * s, 13 * s);
    c.quadraticCurveTo(9 * s, 11 * s, 7 * s, 7 * s);
    c.closePath();
    c.fill();
    // Skirt shadow
    c.fillStyle = darken(dressColor, 0.2);
    c.beginPath();
    c.moveTo(-3 * s, 7 * s);
    c.quadraticCurveTo(-5 * s, 11 * s, -6 * s, 13 * s);
    c.lineTo(0, 13 * s);
    c.quadraticCurveTo(-1 * s, 10 * s, -3 * s, 7 * s);
    c.closePath();
    c.fill();
    // Skirt sparkles
    c.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 5; i++) {
      const sx = (-4 + i * 2.2) * s;
      const sy = (9 + (i % 2) * 2) * s;
      c.beginPath();
      c.arc(sx, sy, 0.7 * s, 0, Math.PI * 2);
      c.fill();
    }
    ol(c, s);
    c.beginPath();
    c.moveTo(-7 * s, 7 * s);
    c.quadraticCurveTo(-9 * s, 11 * s, -10 * s, 13 * s);
    c.lineTo(10 * s, 13 * s);
    c.quadraticCurveTo(9 * s, 11 * s, 7 * s, 7 * s);
    c.stroke();

    drawArms(c, s, SKIN);
    drawHead(c, s, '#1a0a00');
    drawEyes(c, s, 'kind', '#8b4513');
    drawMouth(c, s, 'grin');

    // Flower in hair
    const fx = 6 * s, fy = -12 * s;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      c.fillStyle = '#f44336';
      c.beginPath();
      c.arc(fx + Math.cos(a) * 1.8 * s, fy + Math.sin(a) * 1.8 * s, 1.5 * s, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#ffeb3b';
    c.beginPath();
    c.arc(fx, fy, 1.2 * s, 0, Math.PI * 2);
    c.fill();
    // Earring
    c.fillStyle = '#f1c40f';
    c.beginPath();
    c.arc(-6 * s, -4 * s, 1 * s, 0, Math.PI * 2);
    c.fill();
  },

  // ═════════════════════════════════════════════
  //  POLICIAL — Badge, cap, pepper spray, utility belt
  // ═════════════════════════════════════════════
  policia(c, s, team, sil) {
    if (sil) { _silhouette(c, s, team); return; }
    const uniformColor = tintTeam('#1a237e', team, 0.08);

    drawFeet(c, s, '#111');
    drawBody(c, s, uniformColor);

    // Utility belt
    c.fillStyle = '#333';
    c.fillRect(-6.5 * s, 7 * s, 13 * s, 2 * s);
    c.fillStyle = '#f1c40f';
    c.beginPath();
    c.roundRect(-1 * s, 7.2 * s, 2 * s, 1.6 * s, 0.5 * s);
    c.fill();
    // Belt pouches
    c.fillStyle = '#444';
    c.beginPath();
    c.roundRect(-5 * s, 7 * s, 2.5 * s, 2.5 * s, 0.5 * s);
    c.fill();
    c.beginPath();
    c.roundRect(3 * s, 7 * s, 2.5 * s, 2.5 * s, 0.5 * s);
    c.fill();

    drawArms(c, s, uniformColor);
    drawHead(c, s, '#1a0a00');
    drawEyes(c, s, 'angry', '#1a3c6e');
    drawMouth(c, s, 'serious');

    // Police cap
    c.fillStyle = '#0d47a1';
    c.beginPath();
    c.roundRect(-7.5 * s, -14 * s, 15 * s, 4 * s, 1 * s);
    c.fill();
    c.beginPath();
    c.roundRect(-5.5 * s, -18 * s, 11 * s, 5 * s, 2.5 * s);
    c.fill();
    // Cap brim
    c.fillStyle = '#0a3d91';
    c.beginPath();
    c.ellipse(0, -14 * s, 8 * s, 1.5 * s, 0, 0, Math.PI);
    c.fill();
    // Badge on cap
    c.fillStyle = '#f1c40f';
    c.beginPath();
    c.moveTo(0, -16.5 * s);
    c.lineTo(-1.5 * s, -14.5 * s);
    c.lineTo(0, -13.5 * s);
    c.lineTo(1.5 * s, -14.5 * s);
    c.closePath();
    c.fill();
    c.fillStyle = '#ffd54f';
    c.beginPath();
    c.arc(0, -15 * s, 0.8 * s, 0, Math.PI * 2);
    c.fill();
    ol(c, s);
    c.beginPath();
    c.roundRect(-5.5 * s, -18 * s, 11 * s, 5 * s, 2.5 * s);
    c.stroke();

    // Pepper spray in right hand
    c.fillStyle = '#e74c3c';
    c.beginPath();
    c.roundRect(8 * s, 1 * s, 3.5 * s, 7 * s, 1.5 * s);
    c.fill();
    c.fillStyle = '#f44336';
    c.beginPath();
    c.roundRect(8.5 * s, -1 * s, 2.5 * s, 3 * s, 1 * s);
    c.fill();
    // Spray nozzle
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(9.7 * s, -1.5 * s, 0.8 * s, 0, Math.PI * 2);
    c.fill();
    ol(c, s);
    c.beginPath();
    c.roundRect(8 * s, 1 * s, 3.5 * s, 7 * s, 1.5 * s);
    c.stroke();
  },

  // ═════════════════════════════════════════════
  //  PROFESSORA — Glasses, book, scholarly look
  // ═════════════════════════════════════════════
  professora(c, s, team, sil) {
    if (sil) { _silhouette(c, s, team); return; }
    const bodyC = tintTeam('#7b1fa2', team, 0.08);

    drawFeet(c, s, '#4a0072');
    drawBody(c, s, bodyC);

    // Collar
    c.fillStyle = '#ecf0f1';
    c.beginPath();
    c.moveTo(-3 * s, 0);
    c.lineTo(0, 1.5 * s);
    c.lineTo(3 * s, 0);
    c.lineTo(3 * s, 2 * s);
    c.lineTo(-3 * s, 2 * s);
    c.closePath();
    c.fill();

    drawArms(c, s, bodyC);
    drawHead(c, s, '#3e2723');
    drawEyes(c, s, 'kind', '#7b1fa2');
    drawMouth(c, s, 'smile');

    // Glasses (detailed)
    c.strokeStyle = '#555';
    c.lineWidth = 1 * s;
    c.beginPath();
    c.roundRect(-5 * s, -9.8 * s, 4.5 * s, 3.5 * s, 1 * s);
    c.stroke();
    c.beginPath();
    c.roundRect(0.5 * s, -9.8 * s, 4.5 * s, 3.5 * s, 1 * s);
    c.stroke();
    // Bridge
    c.beginPath();
    c.moveTo(-0.5 * s, -8 * s);
    c.lineTo(0.5 * s, -8 * s);
    c.stroke();
    // Temple arms
    c.beginPath();
    c.moveTo(-5 * s, -8 * s);
    c.lineTo(-7 * s, -8.5 * s);
    c.stroke();
    c.beginPath();
    c.moveTo(5 * s, -8 * s);
    c.lineTo(7 * s, -8.5 * s);
    c.stroke();
    // Lens reflection
    c.fillStyle = 'rgba(255,255,255,0.15)';
    c.beginPath();
    c.arc(-3.5 * s, -8.5 * s, 1 * s, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(2 * s, -8.5 * s, 1 * s, 0, Math.PI * 2);
    c.fill();

    // Book in left hand
    c.fillStyle = '#f44336';
    c.beginPath();
    c.roundRect(-13 * s, 2 * s, 5.5 * s, 7.5 * s, 1 * s);
    c.fill();
    // Book spine
    c.fillStyle = darken('#f44336', 0.3);
    c.fillRect(-13 * s, 2 * s, 1.2 * s, 7.5 * s);
    // Book pages
    c.fillStyle = '#fff';
    c.fillRect(-11.5 * s, 2.5 * s, 3.5 * s, 6.5 * s);
    // Text lines
    c.fillStyle = '#ccc';
    for (let i = 0; i < 4; i++) {
      c.fillRect(-11 * s, (3.5 + i * 1.3) * s, 2.5 * s, 0.4 * s);
    }
    ol(c, s);
    c.beginPath();
    c.roundRect(-13 * s, 2 * s, 5.5 * s, 7.5 * s, 1 * s);
    c.stroke();

    // Hair bun
    c.fillStyle = '#3e2723';
    c.beginPath();
    c.arc(0, -14.5 * s, 3 * s, 0, Math.PI * 2);
    c.fill();
    ol(c, s);
    c.beginPath();
    c.arc(0, -14.5 * s, 3 * s, 0, Math.PI * 2);
    c.stroke();
  },

  // ═════════════════════════════════════════════
  //  VENDEDOR — Cap backwards, tray with drinks
  // ═════════════════════════════════════════════
  vendedor(c, s, team, sil) {
    if (sil) { _silhouette(c, s, team); return; }
    const bodyC = tintTeam('#16a085', team, 0.1);

    drawFeet(c, s, '#0d5c4a');
    drawBody(c, s, bodyC);
    drawArms(c, s, bodyC);
    drawHead(c, s, '#2c1810');
    drawEyes(c, s, 'normal', '#16a085');
    drawMouth(c, s, 'grin');

    // Backwards cap
    c.fillStyle = '#e74c3c';
    c.beginPath();
    c.roundRect(-7 * s, -14 * s, 14 * s, 4 * s, 1 * s);
    c.fill();
    // Brim (backwards)
    c.fillStyle = darken('#e74c3c', 0.2);
    c.fillRect(-9 * s, -12 * s, 4 * s, 2.5 * s);
    // Cap button
    c.fillStyle = '#c0392b';
    c.beginPath();
    c.arc(0, -14 * s, 1 * s, 0, Math.PI * 2);
    c.fill();
    ol(c, s);
    c.beginPath();
    c.roundRect(-7 * s, -14 * s, 14 * s, 4 * s, 1 * s);
    c.stroke();

    // Tray held in front
    c.fillStyle = '#f39c12';
    c.beginPath();
    c.roundRect(-5 * s, -1 * s, 10 * s, 3 * s, 1 * s);
    c.fill();
    c.fillStyle = '#e8960b';
    c.beginPath();
    c.roundRect(-5 * s, 1 * s, 10 * s, 1 * s, 0.5 * s);
    c.fill();
    ol(c, s);
    c.beginPath();
    c.roundRect(-5 * s, -1 * s, 10 * s, 3 * s, 1 * s);
    c.stroke();

    // Juice boxes on tray
    const colors = ['#e74c3c', '#2ecc71', '#3498db', '#f1c40f'];
    for (let i = 0; i < 4; i++) {
      const bx = (-4 + i * 2.3) * s;
      c.fillStyle = colors[i];
      c.beginPath();
      c.roundRect(bx, -3.5 * s, 2 * s, 3 * s, 0.5 * s);
      c.fill();
      // Straw
      c.strokeStyle = '#fff';
      c.lineWidth = 0.4 * s;
      c.beginPath();
      c.moveTo(bx + 1.2 * s, -3.5 * s);
      c.lineTo(bx + 1.5 * s, -5 * s);
      c.stroke();
      ol(c, s);
      c.lineWidth = 0.8 * s;
      c.beginPath();
      c.roundRect(bx, -3.5 * s, 2 * s, 3 * s, 0.5 * s);
      c.stroke();
    }
  },

  // ═════════════════════════════════════════════
  //  FUNKEIRO — Gold chain with pendant, mic with sparkle
  // ═════════════════════════════════════════════
  funkeiro(c, s, team, sil) {
    if (sil) { _silhouette(c, s, team); return; }
    const bodyC = tintTeam('#4a148c', team, 0.1);

    drawFeet(c, s, '#311b92');
    drawBody(c, s, bodyC);

    // Oversized jacket detail
    c.fillStyle = lighten(bodyC, 0.1);
    c.fillRect(-6.5 * s, 0, 3 * s, 10 * s);

    drawArms(c, s, bodyC);
    drawHead(c, s, '#1a0a00');
    drawEyes(c, s, 'cool', '#9b59b6');
    drawMouth(c, s, 'open');

    // Gold chain necklace
    c.strokeStyle = '#f1c40f';
    c.lineWidth = 1.8 * s;
    c.beginPath();
    c.arc(0, 0, 4.5 * s, -0.4, Math.PI + 0.4);
    c.stroke();
    // Chain pendant (star/diamond)
    c.fillStyle = '#f1c40f';
    c.beginPath();
    c.moveTo(0, 4 * s);
    c.lineTo(-1.5 * s, 6 * s);
    c.lineTo(0, 8 * s);
    c.lineTo(1.5 * s, 6 * s);
    c.closePath();
    c.fill();
    c.fillStyle = '#ffd54f';
    c.beginPath();
    c.arc(0, 6 * s, 0.8 * s, 0, Math.PI * 2);
    c.fill();
    ol(c, s);
    c.beginPath();
    c.moveTo(0, 4 * s);
    c.lineTo(-1.5 * s, 6 * s);
    c.lineTo(0, 8 * s);
    c.lineTo(1.5 * s, 6 * s);
    c.closePath();
    c.stroke();

    // Microphone in right hand
    c.fillStyle = '#444';
    c.beginPath();
    c.roundRect(8 * s, -4 * s, 2.5 * s, 9 * s, 1 * s);
    c.fill();
    // Mic head (mesh)
    c.fillStyle = '#888';
    c.beginPath();
    c.arc(9.2 * s, -5 * s, 2.8 * s, 0, Math.PI * 2);
    c.fill();
    // Mic mesh dots
    c.fillStyle = '#666';
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        c.beginPath();
        c.arc((8 + i * 0.8) * s, (-6.5 + j * 0.8) * s, 0.25 * s, 0, Math.PI * 2);
        c.fill();
      }
    }
    ol(c, s);
    c.beginPath();
    c.arc(9.2 * s, -5 * s, 2.8 * s, 0, Math.PI * 2);
    c.stroke();

    // Sparkle on mic
    c.fillStyle = '#fff';
    _drawSparkle(c, 12 * s, -7 * s, 2 * s);

    // Sound waves
    c.strokeStyle = 'rgba(180,80,255,0.4)';
    c.lineWidth = 0.9 * s;
    for (let i = 1; i <= 3; i++) {
      c.beginPath();
      c.arc(12 * s, -5 * s, (2 + i * 2.2) * s, -0.5, 0.5);
      c.stroke();
    }
  },

  // ═════════════════════════════════════════════
  //  BOMBEIRO — Fire helmet, hose with water
  // ═════════════════════════════════════════════
  bombeiro(c, s, team, sil) {
    if (sil) { _silhouette(c, s, team); return; }
    const bodyC = tintTeam('#d32f2f', team, 0.08);

    drawFeet(c, s, '#333');
    drawBody(c, s, bodyC);

    // Reflective stripes
    c.fillStyle = '#f1c40f';
    c.fillRect(-6.5 * s, 3 * s, 13 * s, 1 * s);
    c.fillRect(-6.5 * s, 6 * s, 13 * s, 1 * s);

    drawArms(c, s, bodyC);
    drawHead(c, s, '#2c1810');
    drawEyes(c, s, 'angry', '#d32f2f');
    drawMouth(c, s, 'serious');

    // Fire helmet
    c.fillStyle = '#f44336';
    c.beginPath();
    c.roundRect(-8 * s, -15 * s, 16 * s, 5 * s, 2 * s);
    c.fill();
    c.beginPath();
    c.roundRect(-5.5 * s, -19 * s, 11 * s, 6 * s, 3 * s);
    c.fill();
    // Helmet front shield
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(0, -18 * s);
    c.lineTo(-2 * s, -15.5 * s);
    c.lineTo(0, -14 * s);
    c.lineTo(2 * s, -15.5 * s);
    c.closePath();
    c.fill();
    // Helmet number
    c.fillStyle = '#d32f2f';
    c.font = `bold ${2.5 * s}px Arial`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('1', 0, -16 * s);
    // Back of helmet (neck guard)
    c.fillStyle = darken('#f44336', 0.15);
    c.beginPath();
    c.roundRect(-7 * s, -11 * s, 14 * s, 3 * s, 1 * s);
    c.fill();
    ol(c, s);
    c.beginPath();
    c.roundRect(-5.5 * s, -19 * s, 11 * s, 6 * s, 3 * s);
    c.stroke();

    // Fire hose
    c.strokeStyle = '#777';
    c.lineWidth = 2.5 * s;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(9 * s, 2 * s);
    c.quadraticCurveTo(13 * s, 0, 13 * s, -5 * s);
    c.stroke();
    // Nozzle
    c.fillStyle = '#999';
    c.beginPath();
    c.roundRect(11.5 * s, -7 * s, 3 * s, 3 * s, 1 * s);
    c.fill();
    // Water spray
    c.strokeStyle = 'rgba(52,152,219,0.6)';
    c.lineWidth = 2 * s;
    c.beginPath();
    c.moveTo(13 * s, -6 * s);
    c.lineTo(15 * s, -10 * s);
    c.stroke();
    c.strokeStyle = 'rgba(52,152,219,0.3)';
    c.lineWidth = 3 * s;
    c.beginPath();
    c.moveTo(15 * s, -10 * s);
    c.lineTo(17 * s, -13 * s);
    c.stroke();
    c.lineCap = 'butt';
  },

  // ═════════════════════════════════════════════
  //  PESCADOR — Straw hat, fishing rod, hook
  // ═════════════════════════════════════════════
  pescador(c, s, team, sil) {
    if (sil) { _silhouette(c, s, team); return; }
    const bodyC = tintTeam('#00695c', team, 0.1);

    drawFeet(c, s, '#333');
    drawBody(c, s, bodyC);

    // Vest
    c.fillStyle = '#00838f';
    c.beginPath();
    c.roundRect(-6 * s, 0, 4 * s, 8 * s, 1 * s);
    c.fill();
    c.beginPath();
    c.roundRect(2 * s, 0, 4 * s, 8 * s, 1 * s);
    c.fill();

    drawArms(c, s, '#00838f');
    drawHead(c, s, '#3e2723');
    drawEyes(c, s, 'kind', '#00695c');
    drawMouth(c, s, 'smile');

    // Straw hat
    c.fillStyle = '#d4a017';
    c.beginPath();
    c.ellipse(0, -13 * s, 9 * s, 2.5 * s, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(0, -15 * s, 5.5 * s, Math.PI, 0);
    c.lineTo(5.5 * s, -13 * s);
    c.lineTo(-5.5 * s, -13 * s);
    c.closePath();
    c.fill();
    // Straw texture
    c.strokeStyle = '#c49000';
    c.lineWidth = 0.4 * s;
    for (let i = -4; i <= 4; i += 2) {
      c.beginPath();
      c.moveTo(i * s, -18 * s);
      c.lineTo(i * s, -13 * s);
      c.stroke();
    }
    // Hat band
    c.fillStyle = '#8d6e63';
    c.fillRect(-5.5 * s, -14 * s, 11 * s, 1.2 * s);
    ol(c, s);
    c.beginPath();
    c.ellipse(0, -13 * s, 9 * s, 2.5 * s, 0, 0, Math.PI * 2);
    c.stroke();

    // Fishing rod
    c.strokeStyle = '#795548';
    c.lineWidth = 1.5 * s;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(9 * s, 0);
    c.lineTo(13 * s, -14 * s);
    c.stroke();
    // Rod tip ring
    c.strokeStyle = '#aaa';
    c.lineWidth = 0.8 * s;
    c.beginPath();
    c.arc(13 * s, -14 * s, 1 * s, 0, Math.PI * 2);
    c.stroke();
    // Fishing line
    c.strokeStyle = 'rgba(200,200,200,0.6)';
    c.lineWidth = 0.4 * s;
    c.beginPath();
    c.moveTo(13 * s, -13 * s);
    c.quadraticCurveTo(15 * s, -8 * s, 14 * s, -5 * s);
    c.stroke();
    // Hook
    c.strokeStyle = '#bbb';
    c.lineWidth = 1 * s;
    c.beginPath();
    c.arc(14 * s, -4 * s, 1.5 * s, -0.5, Math.PI + 0.5);
    c.stroke();
    // Hook barb
    c.beginPath();
    c.moveTo(12.8 * s, -3.5 * s);
    c.lineTo(12 * s, -4.5 * s);
    c.stroke();
    c.lineCap = 'butt';
  },

  // ═════════════════════════════════════════════
  //  ESTUDANTE — Glasses, backpack, book
  // ═════════════════════════════════════════════
  estudante(c, s, team, sil) {
    if (sil) { _silhouette(c, s, team); return; }
    const bodyC = tintTeam('#6a1b9a', team, 0.08);

    drawFeet(c, s, '#333');
    drawBody(c, s, bodyC);

    // School uniform collar
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(-4 * s, 0);
    c.lineTo(0, 1.5 * s);
    c.lineTo(4 * s, 0);
    c.lineTo(4 * s, 2 * s);
    c.lineTo(-4 * s, 2 * s);
    c.closePath();
    c.fill();

    drawArms(c, s, bodyC);
    drawHead(c, s, '#1a0a00');
    drawEyes(c, s, 'kind', '#6a1b9a');
    drawMouth(c, s, 'smile');

    // Glasses
    c.strokeStyle = '#444';
    c.lineWidth = 0.9 * s;
    c.beginPath();
    c.roundRect(-5 * s, -9.5 * s, 4 * s, 3 * s, 1 * s);
    c.stroke();
    c.beginPath();
    c.roundRect(1 * s, -9.5 * s, 4 * s, 3 * s, 1 * s);
    c.stroke();
    c.beginPath();
    c.moveTo(-1 * s, -8 * s);
    c.lineTo(1 * s, -8 * s);
    c.stroke();

    // Backpack (on back, peeking from sides)
    c.fillStyle = '#ff9800';
    c.beginPath();
    c.roundRect(-9 * s, -1 * s, 4.5 * s, 9 * s, 2 * s);
    c.fill();
    // Backpack strap
    c.strokeStyle = darken('#ff9800', 0.2);
    c.lineWidth = 1 * s;
    c.beginPath();
    c.moveTo(-7 * s, -1 * s);
    c.lineTo(-5 * s, -3 * s);
    c.stroke();
    // Backpack zipper
    c.strokeStyle = '#666';
    c.lineWidth = 0.5 * s;
    c.beginPath();
    c.moveTo(-7 * s, 2 * s);
    c.lineTo(-5 * s, 2 * s);
    c.stroke();
    ol(c, s);
    c.beginPath();
    c.roundRect(-9 * s, -1 * s, 4.5 * s, 9 * s, 2 * s);
    c.stroke();

    // Book in right hand
    c.fillStyle = '#3f51b5';
    c.beginPath();
    c.roundRect(8 * s, 1 * s, 4 * s, 6 * s, 1 * s);
    c.fill();
    c.fillStyle = '#fff';
    c.fillRect(8.5 * s, 1.8 * s, 3 * s, 0.5 * s);
    c.fillRect(8.5 * s, 3 * s, 2 * s, 0.5 * s);
    ol(c, s);
    c.beginPath();
    c.roundRect(8 * s, 1 * s, 4 * s, 6 * s, 1 * s);
    c.stroke();
  },

  // ═════════════════════════════════════════════
  //  CHURRASCO (Fireball spell)
  // ═════════════════════════════════════════════
  churrasco(c, s, team, sil) {
    if (sil) {
      const col = team === 'player' ? 'rgba(41,128,185,0.6)' : 'rgba(192,57,43,0.6)';
      c.fillStyle = col;
      c.beginPath();
      c.arc(0, 0, 10 * s, 0, Math.PI * 2);
      c.fill();
      return;
    }

    // Outer glow
    const grad = c.createRadialGradient(0, 0, 2 * s, 0, 0, 10 * s);
    grad.addColorStop(0, '#f1c40f');
    grad.addColorStop(0.3, '#e74c3c');
    grad.addColorStop(0.7, 'rgba(231,76,60,0.6)');
    grad.addColorStop(1, 'rgba(231,76,60,0)');
    c.fillStyle = grad;
    c.beginPath();
    c.arc(0, 0, 10 * s, 0, Math.PI * 2);
    c.fill();

    // Core ball
    c.fillStyle = '#e74c3c';
    c.beginPath();
    c.arc(0, 0, 7 * s, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#f39c12';
    c.beginPath();
    c.arc(0, 0, 5 * s, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#f1c40f';
    c.beginPath();
    c.arc(-1 * s, -1 * s, 3 * s, 0, Math.PI * 2);
    c.fill();
    // White hot center
    c.fillStyle = 'rgba(255,255,230,0.5)';
    c.beginPath();
    c.arc(-0.5 * s, -0.5 * s, 1.5 * s, 0, Math.PI * 2);
    c.fill();

    // Flames
    const flames = [
      {x:0, y:-7, cp1x:4, cp1y:-13, ep:{ x:1, y:-16}},
      {x:-5, y:-4, cp1x:-10, cp1y:-9, ep:{x:-6, y:-12}},
      {x:5, y:-4, cp1x:10, cp1y:-8, ep:{x:7, y:-11}},
      {x:-3, y:-6, cp1x:-7, cp1y:-12, ep:{x:-2, y:-14}},
    ];
    c.fillStyle = '#ff5722';
    for (const f of flames) {
      c.beginPath();
      c.moveTo(f.x * s, f.y * s);
      c.quadraticCurveTo(f.cp1x * s, f.cp1y * s, f.ep.x * s, f.ep.y * s);
      c.quadraticCurveTo((f.x - f.cp1x * 0.3) * s, (f.cp1y + 2) * s, f.x * s, f.y * s);
      c.fill();
    }
  },

  // ═════════════════════════════════════════════
  //  RONDA (Police lights spell)
  // ═════════════════════════════════════════════
  ronda(c, s, team, sil) {
    if (sil) {
      const col = team === 'player' ? 'rgba(41,128,185,0.6)' : 'rgba(192,57,43,0.6)';
      c.fillStyle = col;
      c.beginPath();
      c.arc(0, 0, 10 * s, 0, Math.PI * 2);
      c.fill();
      return;
    }

    // Outer glow
    const grad = c.createRadialGradient(0, 0, 2 * s, 0, 0, 10 * s);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.3, '#1565c0');
    grad.addColorStop(0.7, 'rgba(21,101,192,0.5)');
    grad.addColorStop(1, 'rgba(21,101,192,0)');
    c.fillStyle = grad;
    c.beginPath();
    c.arc(0, 0, 10 * s, 0, Math.PI * 2);
    c.fill();

    // Main circle
    c.fillStyle = '#1565c0';
    c.beginPath();
    c.arc(0, 0, 7 * s, 0, Math.PI * 2);
    c.fill();

    // Sirene lights
    c.fillStyle = '#e74c3c';
    c.beginPath();
    c.arc(-3 * s, -2 * s, 3 * s, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#2196f3';
    c.beginPath();
    c.arc(3 * s, -2 * s, 3 * s, 0, Math.PI * 2);
    c.fill();
    // Light glare
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.beginPath();
    c.arc(-3.5 * s, -3 * s, 1.2 * s, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(2.5 * s, -3 * s, 1.2 * s, 0, Math.PI * 2);
    c.fill();

    // Light rays
    c.strokeStyle = 'rgba(255,255,255,0.5)';
    c.lineWidth = 1.2 * s;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.beginPath();
      c.moveTo(Math.cos(a) * 5 * s, Math.sin(a) * 5 * s);
      c.lineTo(Math.cos(a) * 10 * s, Math.sin(a) * 10 * s);
      c.stroke();
    }
  },

  // ═════════════════════════════════════════════
  //  LADRAO — Mask with eye holes, money bag with $ sign
  // ═════════════════════════════════════════════
  ladrao(c, s, team, sil) {
    if (sil) { _silhouette(c, s, team); return; }
    const bodyC = tintTeam('#1a0033', team, 0.1);

    drawFeet(c, s, '#111');
    drawBody(c, s, bodyC);

    // Stealth stripes
    c.fillStyle = 'rgba(0,0,0,0.15)';
    c.fillRect(-6.5 * s, 2 * s, 13 * s, 1.5 * s);
    c.fillRect(-6.5 * s, 5 * s, 13 * s, 1.5 * s);

    drawArms(c, s, bodyC);
    drawHead(c, s, '#111');

    // Mask (balaclava)
    c.fillStyle = '#0a0a0a';
    c.beginPath();
    c.arc(0, -7 * s, 7.8 * s, 0, Math.PI * 2);
    c.fill();
    // Eye holes
    c.fillStyle = '#1a0033';
    c.beginPath();
    c.ellipse(-2.8 * s, -8 * s, 2.5 * s, 1.8 * s, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(2.8 * s, -8 * s, 2.5 * s, 1.8 * s, 0, 0, Math.PI * 2);
    c.fill();
    ol(c, s);
    c.beginPath();
    c.ellipse(-2.8 * s, -8 * s, 2.5 * s, 1.8 * s, 0, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.ellipse(2.8 * s, -8 * s, 2.5 * s, 1.8 * s, 0, 0, Math.PI * 2);
    c.stroke();

    // Sinister eyes in holes
    drawSinisterEyes(c, s, -2.8 * s, 2.8 * s, -8 * s, '#e74c3c');

    // Mouth slit
    c.fillStyle = '#1a0033';
    c.beginPath();
    c.ellipse(0, -4 * s, 2 * s, 0.8 * s, 0, 0, Math.PI * 2);
    c.fill();

    // Money bag in left hand
    c.fillStyle = '#8d6e63';
    c.beginPath();
    c.arc(-9 * s, 4 * s, 4.5 * s, 0, Math.PI * 2);
    c.fill();
    // Bag tie
    c.fillStyle = '#6d4c41';
    c.beginPath();
    c.roundRect(-11 * s, 0, 4 * s, 2 * s, 1 * s);
    c.fill();
    // Bag shadow
    c.fillStyle = darken('#8d6e63', 0.2);
    c.beginPath();
    c.arc(-9 * s, 5 * s, 3.5 * s, 0.2, Math.PI - 0.2);
    c.fill();
    // $ sign
    c.fillStyle = '#f1c40f';
    c.font = `bold ${6 * s}px Arial`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('$', -9 * s, 4.5 * s);
    ol(c, s);
    c.beginPath();
    c.arc(-9 * s, 4 * s, 4.5 * s, 0, Math.PI * 2);
    c.stroke();
  },

  // ═════════════════════════════════════════════
  //  ZE PELINTRA — Legendary, white suit, fedora with red band, cane, mystic aura
  // ═════════════════════════════════════════════
  ze_pelintra(c, s, team, sil) {
    if (sil) { _silhouette(c, s, team); return; }

    // Mystic aura (drawn first, behind)
    c.strokeStyle = 'rgba(156,39,176,0.25)';
    c.lineWidth = 1.5 * s;
    c.beginPath();
    c.arc(0, 0, 15 * s, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = 'rgba(156,39,176,0.15)';
    c.beginPath();
    c.arc(0, 0, 17 * s, 0, Math.PI * 2);
    c.stroke();

    drawFeet(c, s, '#111');
    drawBody(c, s, '#fff');

    // Pinstripe suit
    c.strokeStyle = 'rgba(0,0,0,0.07)';
    c.lineWidth = 0.5 * s;
    for (let i = -5; i <= 5; i += 1.5) {
      c.beginPath();
      c.moveTo(i * s, 0.5 * s);
      c.lineTo(i * s, 9.5 * s);
      c.stroke();
    }

    // White shirt + red tie
    c.fillStyle = '#f5f5f5';
    c.beginPath();
    c.moveTo(-2 * s, 0);
    c.lineTo(2 * s, 0);
    c.lineTo(2 * s, 6 * s);
    c.lineTo(-2 * s, 6 * s);
    c.closePath();
    c.fill();
    c.fillStyle = '#c0392b';
    c.beginPath();
    c.moveTo(0, -0.5 * s);
    c.lineTo(-2 * s, 5 * s);
    c.lineTo(0, 7.5 * s);
    c.lineTo(2 * s, 5 * s);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-0.8 * s, 3 * s);
    c.lineTo(0, 5 * s);
    c.lineTo(0.5 * s, 2 * s);
    c.closePath();
    c.fill();

    drawArms(c, s, '#fff');
    drawHead(c, s, '#1a0a00');
    drawEyes(c, s, 'cool', '#7b1fa2');
    drawMouth(c, s, 'smirk');

    // Goatee
    c.fillStyle = '#111';
    c.beginPath();
    c.moveTo(-1 * s, -3 * s);
    c.lineTo(0, -1.5 * s);
    c.lineTo(1 * s, -3 * s);
    c.closePath();
    c.fill();

    // Panama hat / fedora
    c.fillStyle = '#f5f5f5';
    c.beginPath();
    c.ellipse(0, -13.5 * s, 9.5 * s, 2.5 * s, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.roundRect(-6 * s, -21 * s, 12 * s, 8.5 * s, 3 * s);
    c.fill();
    // Hat dent
    c.fillStyle = '#eee';
    c.beginPath();
    c.roundRect(-3 * s, -21 * s, 6 * s, 3 * s, 2 * s);
    c.fill();
    // Red hat band (detailed)
    c.fillStyle = '#c0392b';
    c.fillRect(-6 * s, -14.5 * s, 12 * s, 2 * s);
    c.fillStyle = darken('#c0392b', 0.2);
    c.fillRect(-6 * s, -13 * s, 12 * s, 0.5 * s);
    // Hat shine
    c.fillStyle = 'rgba(255,255,255,0.15)';
    c.beginPath();
    c.roundRect(-4 * s, -20 * s, 8 * s, 3 * s, 2 * s);
    c.fill();
    ol(c, s);
    c.beginPath();
    c.ellipse(0, -13.5 * s, 9.5 * s, 2.5 * s, 0, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.roundRect(-6 * s, -21 * s, 12 * s, 8.5 * s, 3 * s);
    c.stroke();

    // Cane in right hand
    c.strokeStyle = '#111';
    c.lineWidth = 2 * s;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(10 * s, -2 * s);
    c.lineTo(10 * s, 13 * s);
    c.stroke();
    // Cane handle (curved)
    c.strokeStyle = '#f1c40f';
    c.lineWidth = 2.2 * s;
    c.beginPath();
    c.arc(8 * s, -2 * s, 3 * s, -Math.PI * 0.5, Math.PI * 0.5);
    c.stroke();
    c.lineCap = 'butt';

    // Legendary sparkles
    c.fillStyle = 'rgba(255,215,0,0.6)';
    _drawSparkle(c, -8 * s, -15 * s, 2 * s);
    _drawSparkle(c, 12 * s, -8 * s, 1.5 * s);
    _drawSparkle(c, -10 * s, 5 * s, 1.8 * s);
  },

  // ═════════════════════════════════════════════
  //  DIRETOR DE PRODUCAO — Legendary, beret, clapperboard, golden aura
  // ═════════════════════════════════════════════
  diretor_producao(c, s, team, sil) {
    if (sil) { _silhouette(c, s, team); return; }

    // Golden aura (legendary)
    c.strokeStyle = 'rgba(255,215,0,0.3)';
    c.lineWidth = 1.5 * s;
    c.beginPath();
    c.arc(0, 0, 15 * s, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = 'rgba(255,215,0,0.15)';
    c.beginPath();
    c.arc(0, 0, 17 * s, 0, Math.PI * 2);
    c.stroke();

    drawFeet(c, s, '#111');
    drawBody(c, s, '#333');

    // Director's scarf
    c.fillStyle = '#c0392b';
    c.beginPath();
    c.moveTo(-3 * s, 0);
    c.lineTo(-5 * s, 4 * s);
    c.lineTo(-2 * s, 5 * s);
    c.lineTo(0, 1 * s);
    c.closePath();
    c.fill();

    drawArms(c, s, '#222');
    drawHead(c, s, '#1a0a00');
    drawEyes(c, s, 'cool', '#ffd700');
    drawMouth(c, s, 'serious');

    // Director beret
    c.fillStyle = '#1a1a1a';
    c.beginPath();
    c.arc(0, -11 * s, 7 * s, Math.PI + 0.4, -0.4);
    c.fill();
    c.beginPath();
    c.arc(-2 * s, -14 * s, 4 * s, 0, Math.PI * 2);
    c.fill();
    ol(c, s);
    c.beginPath();
    c.arc(0, -11 * s, 7 * s, Math.PI + 0.4, -0.4);
    c.stroke();

    // "D" on chest
    c.fillStyle = '#f1c40f';
    c.font = `bold ${6 * s}px Arial`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('D', 0, 4 * s);

    // Clapperboard in right hand
    c.fillStyle = '#444';
    c.beginPath();
    c.roundRect(7 * s, -2 * s, 7 * s, 5.5 * s, 1 * s);
    c.fill();
    // Clapper top
    c.fillStyle = '#222';
    c.beginPath();
    c.roundRect(7 * s, -5 * s, 7 * s, 3.5 * s, 1 * s);
    c.fill();
    // Clapper stripes
    c.fillStyle = '#fff';
    for (let i = 0; i < 3; i++) {
      c.fillRect((8 + i * 2) * s, -4.5 * s, 1 * s, 2 * s);
    }
    // Clapper text area
    c.fillStyle = '#eee';
    c.fillRect(8 * s, -0.5 * s, 5 * s, 3 * s);
    c.fillStyle = '#333';
    c.font = `${2 * s}px Arial`;
    c.fillText('TAKE', 10.5 * s, 1 * s);
    ol(c, s);
    c.beginPath();
    c.roundRect(7 * s, -5 * s, 7 * s, 8.5 * s, 1 * s);
    c.stroke();

    // Legendary sparkles
    c.fillStyle = 'rgba(255,215,0,0.7)';
    _drawSparkle(c, -10 * s, -14 * s, 2.5 * s);
    _drawSparkle(c, 14 * s, -8 * s, 2 * s);
    _drawSparkle(c, -12 * s, 6 * s, 1.8 * s);
  },
};

// ══════════════════════════════════════════════════════════
//  SHOP / ADDITIONAL CHARACTER RENDERERS
// ══════════════════════════════════════════════════════════

// ── MEDICO — White coat, red cross, stethoscope ──
CHAR_RENDERERS.medico = function(c, s, team, sil) {
  if (sil) { _silhouette(c, s, team); return; }
  const bodyC = tintTeam('#fff', team, 0.05);

  drawFeet(c, s, '#333');
  drawBody(c, s, bodyC);

  // Lab coat buttons
  c.fillStyle = '#ddd';
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.arc(0, (2 + i * 2.5) * s, 0.6 * s, 0, Math.PI * 2);
    c.fill();
  }

  // Red cross on chest
  c.fillStyle = '#e74c3c';
  c.fillRect(-1.5 * s, 0.5 * s, 3 * s, 7 * s);
  c.fillRect(-3.5 * s, 2.5 * s, 7 * s, 3 * s);

  drawArms(c, s, bodyC);
  drawHead(c, s, '#3e2723');
  drawEyes(c, s, 'kind', '#1976d2');
  drawMouth(c, s, 'smile');

  // Head mirror
  c.fillStyle = '#ccc';
  c.beginPath();
  c.arc(0, -14.5 * s, 2 * s, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.4)';
  c.beginPath();
  c.arc(-0.5 * s, -15 * s, 1 * s, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#999';
  c.lineWidth = 0.8 * s;
  c.beginPath();
  c.arc(0, -14.5 * s, 2 * s, 0, Math.PI * 2);
  c.stroke();
  // Headband
  c.strokeStyle = '#aaa';
  c.lineWidth = 1 * s;
  c.beginPath();
  c.arc(0, -10 * s, 7 * s, Math.PI + 0.6, -0.6);
  c.stroke();

  // Stethoscope
  c.strokeStyle = '#444';
  c.lineWidth = 1.2 * s;
  c.beginPath();
  c.moveTo(-3 * s, -1 * s);
  c.quadraticCurveTo(-4 * s, 3 * s, 0, 5 * s);
  c.quadraticCurveTo(4 * s, 3 * s, 3 * s, -1 * s);
  c.stroke();
  // Chest piece
  c.fillStyle = '#777';
  c.beginPath();
  c.arc(0, 5.5 * s, 1.8 * s, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#999';
  c.beginPath();
  c.arc(0, 5.5 * s, 1 * s, 0, Math.PI * 2);
  c.fill();
};

// ── ADVOGADO — Dark suit, scales of justice ──
CHAR_RENDERERS.advogado = function(c, s, team, sil) {
  if (sil) { _silhouette(c, s, team); return; }
  const bodyC = tintTeam('#37474f', team, 0.08);

  drawFeet(c, s, '#111');
  drawBody(c, s, bodyC);

  // Shirt + tie
  c.fillStyle = '#ecf0f1';
  c.fillRect(-1.5 * s, 0, 3 * s, 6 * s);
  c.fillStyle = '#c0392b';
  c.beginPath();
  c.moveTo(0, -0.5 * s);
  c.lineTo(-1.5 * s, 3.5 * s);
  c.lineTo(0, 5.5 * s);
  c.lineTo(1.5 * s, 3.5 * s);
  c.closePath();
  c.fill();

  drawArms(c, s, bodyC);
  drawHead(c, s, '#333');
  drawEyes(c, s, 'cool', '#37474f');
  drawMouth(c, s, 'serious');

  // Scales of justice in left hand
  c.strokeStyle = '#f1c40f';
  c.lineWidth = 1.2 * s;
  // Vertical post
  c.beginPath();
  c.moveTo(-9 * s, -2 * s);
  c.lineTo(-9 * s, 5 * s);
  c.stroke();
  // Balance beam
  c.beginPath();
  c.moveTo(-13 * s, 0);
  c.lineTo(-5 * s, -1 * s);
  c.stroke();
  // Left plate
  c.beginPath();
  c.arc(-13 * s, 1 * s, 2 * s, 0, Math.PI);
  c.stroke();
  // Right plate
  c.beginPath();
  c.arc(-5 * s, 0, 2 * s, 0, Math.PI);
  c.stroke();
  // Top ornament
  c.fillStyle = '#f1c40f';
  c.beginPath();
  c.arc(-9 * s, -2.5 * s, 1.2 * s, 0, Math.PI * 2);
  c.fill();
};

// ── ENGENHEIRO — Hard hat, blueprints ──
CHAR_RENDERERS.engenheiro = function(c, s, team, sil) {
  if (sil) { _silhouette(c, s, team); return; }
  const bodyC = tintTeam('#f57f17', team, 0.08);

  drawFeet(c, s, '#333');
  drawBody(c, s, bodyC);
  // Safety vest stripes
  c.fillStyle = '#f1c40f';
  c.fillRect(-6.5 * s, 3 * s, 13 * s, 1.2 * s);
  c.fillRect(-6.5 * s, 6 * s, 13 * s, 1.2 * s);

  drawArms(c, s, '#f9a825');
  drawHead(c, s, '#3e2723');
  drawEyes(c, s, 'normal', '#f57f17');
  drawMouth(c, s, 'smile');

  // Hard hat
  c.fillStyle = '#fdd835';
  c.beginPath();
  c.arc(0, -10 * s, 8 * s, Math.PI + 0.2, -0.2);
  c.fill();
  // Hat brim
  c.fillRect(-8 * s, -11 * s, 16 * s, 2.5 * s);
  // Hat ridge
  c.fillStyle = darken('#fdd835', 0.1);
  c.fillRect(-5 * s, -16 * s, 10 * s, 1.5 * s);
  // Shine
  c.fillStyle = 'rgba(255,255,255,0.25)';
  c.beginPath();
  c.arc(-2 * s, -13 * s, 3.5 * s, Math.PI + 0.5, -0.3);
  c.fill();
  ol(c, s);
  c.beginPath();
  c.arc(0, -10 * s, 8 * s, Math.PI + 0.2, -0.2);
  c.stroke();

  // Blueprint in hand
  c.fillStyle = '#1565c0';
  c.beginPath();
  c.roundRect(8 * s, 0, 5 * s, 7 * s, 1 * s);
  c.fill();
  c.strokeStyle = '#fff';
  c.lineWidth = 0.4 * s;
  c.strokeRect(9 * s, 1 * s, 3 * s, 2.5 * s);
  c.beginPath();
  c.moveTo(9 * s, 4.5 * s);
  c.lineTo(12 * s, 4.5 * s);
  c.stroke();
};

// ── GARCOM — White shirt, black apron, serving tray ──
CHAR_RENDERERS.garcom = function(c, s, team, sil) {
  if (sil) { _silhouette(c, s, team); return; }

  drawFeet(c, s, '#111');
  drawBody(c, s, '#fff');

  // Black apron (lower body)
  c.fillStyle = '#1a1a1a';
  c.beginPath();
  c.roundRect(-5.5 * s, 5 * s, 11 * s, 5 * s, 1 * s);
  c.fill();
  ol(c, s);
  c.beginPath();
  c.roundRect(-5.5 * s, 5 * s, 11 * s, 5 * s, 1 * s);
  c.stroke();

  // Bow tie
  c.fillStyle = '#1a1a1a';
  c.beginPath();
  c.moveTo(0, -0.5 * s);
  c.lineTo(-2.5 * s, -1.5 * s);
  c.lineTo(-2.5 * s, 0.5 * s);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(0, -0.5 * s);
  c.lineTo(2.5 * s, -1.5 * s);
  c.lineTo(2.5 * s, 0.5 * s);
  c.closePath();
  c.fill();

  drawArms(c, s, '#fff');
  drawHead(c, s, '#3e2723');
  drawEyes(c, s, 'normal', '#4e342e');
  drawMouth(c, s, 'smile');

  // Serving tray in right hand (held high)
  c.fillStyle = '#bbb';
  c.beginPath();
  c.ellipse(9 * s, -3 * s, 5.5 * s, 2 * s, 0, 0, Math.PI * 2);
  c.fill();
  // Tray shine
  c.fillStyle = 'rgba(255,255,255,0.3)';
  c.beginPath();
  c.ellipse(8 * s, -3.5 * s, 3 * s, 1 * s, 0, 0, Math.PI * 2);
  c.fill();
  // Tray stand
  c.fillStyle = '#999';
  c.fillRect(8.5 * s, -1.5 * s, 1 * s, 4 * s);
  ol(c, s);
  c.beginPath();
  c.ellipse(9 * s, -3 * s, 5.5 * s, 2 * s, 0, 0, Math.PI * 2);
  c.stroke();

  // Dishes on tray
  c.fillStyle = '#fff';
  c.beginPath();
  c.ellipse(7 * s, -4 * s, 2 * s, 0.8 * s, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(11 * s, -4 * s, 2 * s, 0.8 * s, 0, 0, Math.PI * 2);
  c.fill();
};

// ── MOTORISTA DE ONIBUS — Blue uniform, cap, steering wheel ──
CHAR_RENDERERS.motorista_onibus = function(c, s, team, sil) {
  if (sil) { _silhouette(c, s, team); return; }
  const bodyC = tintTeam('#1565c0', team, 0.08);

  drawFeet(c, s, '#222');
  drawBody(c, s, bodyC);

  // Uniform pockets
  c.fillStyle = darken(bodyC, 0.1);
  c.beginPath();
  c.roundRect(-5 * s, 4 * s, 4 * s, 3.5 * s, 1 * s);
  c.fill();
  c.beginPath();
  c.roundRect(1 * s, 4 * s, 4 * s, 3.5 * s, 1 * s);
  c.fill();
  // Pocket flaps
  c.fillStyle = darken(bodyC, 0.15);
  c.fillRect(-5 * s, 4 * s, 4 * s, 1 * s);
  c.fillRect(1 * s, 4 * s, 4 * s, 1 * s);

  drawArms(c, s, '#0d47a1');
  drawHead(c, s, '#2c1810');
  drawEyes(c, s, 'normal', '#1565c0');
  drawMouth(c, s, 'smile');

  // Cap
  c.fillStyle = '#0d47a1';
  c.beginPath();
  c.roundRect(-7 * s, -14 * s, 14 * s, 4 * s, 1.5 * s);
  c.fill();
  c.beginPath();
  c.roundRect(-5 * s, -17 * s, 10 * s, 4.5 * s, 2 * s);
  c.fill();
  // Cap emblem
  c.fillStyle = '#f1c40f';
  c.beginPath();
  c.arc(0, -14.5 * s, 1.5 * s, 0, Math.PI * 2);
  c.fill();
  ol(c, s);
  c.beginPath();
  c.roundRect(-5 * s, -17 * s, 10 * s, 4.5 * s, 2 * s);
  c.stroke();

  // Steering wheel in front
  c.strokeStyle = '#555';
  c.lineWidth = 2 * s;
  c.beginPath();
  c.arc(0, 5 * s, 4.5 * s, 0, Math.PI * 2);
  c.stroke();
  // Wheel spokes
  c.lineWidth = 1 * s;
  c.beginPath();
  c.moveTo(-4.5 * s, 5 * s);
  c.lineTo(4.5 * s, 5 * s);
  c.stroke();
  c.beginPath();
  c.moveTo(0, 0.5 * s);
  c.lineTo(0, 9.5 * s);
  c.stroke();
  // Hub
  c.fillStyle = '#444';
  c.beginPath();
  c.arc(0, 5 * s, 1.2 * s, 0, Math.PI * 2);
  c.fill();
};

// ── CANTOR — Like funkeiro but with red/pink theme, open mouth ──
CHAR_RENDERERS.cantor = function(c, s, team, sil) {
  if (sil) { _silhouette(c, s, team); return; }
  const bodyC = tintTeam('#ad1457', team, 0.1);

  drawFeet(c, s, '#6a0032');
  drawBody(c, s, bodyC);

  // Leather jacket open
  c.fillStyle = lighten(bodyC, 0.1);
  c.fillRect(-6 * s, 0, 3 * s, 9 * s);
  c.fillRect(3 * s, 0, 3 * s, 9 * s);

  drawArms(c, s, bodyC);
  drawHead(c, s, '#1a0a00');
  drawEyes(c, s, 'normal', '#ad1457');
  drawMouth(c, s, 'open');

  // Headband
  c.fillStyle = '#f1c40f';
  c.fillRect(-7 * s, -12 * s, 14 * s, 1.5 * s);

  // Microphone (held up)
  c.fillStyle = '#444';
  c.beginPath();
  c.roundRect(8 * s, -6 * s, 2.5 * s, 10 * s, 1 * s);
  c.fill();
  c.fillStyle = '#888';
  c.beginPath();
  c.arc(9.2 * s, -7 * s, 2.5 * s, 0, Math.PI * 2);
  c.fill();
  ol(c, s);
  c.beginPath();
  c.arc(9.2 * s, -7 * s, 2.5 * s, 0, Math.PI * 2);
  c.stroke();

  // Sound waves
  c.strokeStyle = 'rgba(255,80,150,0.4)';
  c.lineWidth = 0.9 * s;
  for (let i = 1; i <= 3; i++) {
    c.beginPath();
    c.arc(12 * s, -7 * s, (2 + i * 2) * s, -0.5, 0.5);
    c.stroke();
  }
};

// ── ATOR — Theatre masks theme, dodge specialist ──
CHAR_RENDERERS.ator = function(c, s, team, sil) {
  if (sil) { _silhouette(c, s, team); return; }
  const bodyC = tintTeam('#6a1b9a', team, 0.1);

  drawFeet(c, s, '#4a148c');
  drawBody(c, s, bodyC);

  // Dramatic cape
  c.fillStyle = darken(bodyC, 0.3);
  c.beginPath();
  c.moveTo(-7 * s, 0);
  c.lineTo(-9 * s, 11 * s);
  c.lineTo(-3 * s, 10 * s);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(7 * s, 0);
  c.lineTo(9 * s, 11 * s);
  c.lineTo(3 * s, 10 * s);
  c.closePath();
  c.fill();

  drawArms(c, s, bodyC);
  drawHead(c, s, '#1a0a00');
  drawEyes(c, s, 'normal', '#6a1b9a');
  drawMouth(c, s, 'grin');

  // Theatre masks held up
  // Happy mask
  c.fillStyle = '#f1c40f';
  c.beginPath();
  c.arc(9 * s, -3 * s, 3.5 * s, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#111';
  c.beginPath();
  c.arc(8 * s, -4 * s, 0.7 * s, 0, Math.PI * 2);
  c.arc(10 * s, -4 * s, 0.7 * s, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#111';
  c.lineWidth = 0.6 * s;
  c.beginPath();
  c.arc(9 * s, -2.5 * s, 1.5 * s, 0.2, Math.PI - 0.2);
  c.stroke();
  ol(c, s);
  c.beginPath();
  c.arc(9 * s, -3 * s, 3.5 * s, 0, Math.PI * 2);
  c.stroke();

  // Sad mask
  c.fillStyle = '#90caf9';
  c.beginPath();
  c.arc(-9 * s, -1 * s, 3.5 * s, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#111';
  c.beginPath();
  c.arc(-10 * s, -2 * s, 0.7 * s, 0, Math.PI * 2);
  c.arc(-8 * s, -2 * s, 0.7 * s, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#111';
  c.lineWidth = 0.6 * s;
  c.beginPath();
  c.arc(-9 * s, 1 * s, 1.5 * s, Math.PI + 0.2, -0.2);
  c.stroke();
  ol(c, s);
  c.beginPath();
  c.arc(-9 * s, -1 * s, 3.5 * s, 0, Math.PI * 2);
  c.stroke();
};

// ── PEDREIRO — Hard hat, brick in hand ──
CHAR_RENDERERS.pedreiro = function(c, s, team, sil) {
  if (sil) { _silhouette(c, s, team); return; }
  const bodyC = tintTeam('#bf360c', team, 0.08);

  drawFeet(c, s, '#333');
  drawBody(c, s, bodyC);

  // Dusty overalls look
  c.fillStyle = 'rgba(255,255,255,0.05)';
  c.fillRect(-6 * s, 2 * s, 12 * s, 6 * s);

  drawArms(c, s, bodyC);
  drawHead(c, s, '#3e2723');
  drawEyes(c, s, 'angry', '#bf360c');
  drawMouth(c, s, 'serious');

  // Hard hat (orange)
  c.fillStyle = '#ff8f00';
  c.beginPath();
  c.arc(0, -10 * s, 8 * s, Math.PI + 0.2, -0.2);
  c.fill();
  c.fillRect(-8 * s, -11 * s, 16 * s, 2.5 * s);
  c.fillStyle = lighten('#ff8f00', 0.2);
  c.beginPath();
  c.arc(-2 * s, -13 * s, 3 * s, Math.PI + 0.5, -0.3);
  c.fill();
  ol(c, s);
  c.beginPath();
  c.arc(0, -10 * s, 8 * s, Math.PI + 0.2, -0.2);
  c.stroke();

  // Brick in right hand
  c.fillStyle = '#d84315';
  c.beginPath();
  c.roundRect(7 * s, 2 * s, 6 * s, 3.5 * s, 0.5 * s);
  c.fill();
  // Mortar line
  c.fillStyle = '#bbb';
  c.fillRect(7 * s, 3.5 * s, 6 * s, 0.5 * s);
  // Brick highlight
  c.fillStyle = lighten('#d84315', 0.15);
  c.fillRect(7.5 * s, 2.3 * s, 5 * s, 1 * s);
  ol(c, s);
  c.beginPath();
  c.roundRect(7 * s, 2 * s, 6 * s, 3.5 * s, 0.5 * s);
  c.stroke();
};

// ── FAXINEIRO — Mop, bucket ──
CHAR_RENDERERS.faxineiro = function(c, s, team, sil) {
  if (sil) { _silhouette(c, s, team); return; }
  const bodyC = tintTeam('#00695c', team, 0.1);

  drawFeet(c, s, '#333');
  drawBody(c, s, bodyC);

  // Apron
  c.fillStyle = lighten(bodyC, 0.1);
  c.beginPath();
  c.roundRect(-4.5 * s, 2 * s, 9 * s, 7 * s, 1.5 * s);
  c.fill();

  drawArms(c, s, '#455a64');
  drawHead(c, s, '#3e2723');
  drawEyes(c, s, 'normal', '#00695c');
  drawMouth(c, s, 'serious');

  // Bandana
  c.fillStyle = '#00838f';
  c.fillRect(-7 * s, -13 * s, 14 * s, 3 * s);
  c.fillStyle = darken('#00838f', 0.2);
  c.fillRect(-7 * s, -11 * s, 14 * s, 1 * s);

  // Mop in right hand
  c.strokeStyle = '#8d6e63';
  c.lineWidth = 2 * s;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(9 * s, -5 * s);
  c.lineTo(9 * s, 11 * s);
  c.stroke();
  c.lineCap = 'butt';
  // Mop head (wet strings)
  c.strokeStyle = '#90a4ae';
  c.lineWidth = 0.7 * s;
  for (let i = 0; i < 8; i++) {
    c.beginPath();
    c.moveTo((7 + i * 0.5) * s, 10 * s);
    c.quadraticCurveTo((6.5 + i * 0.6) * s, 13 * s, (6 + i * 0.7) * s, 15 * s);
    c.stroke();
  }
  // Water drips
  c.fillStyle = 'rgba(52,152,219,0.4)';
  c.beginPath();
  c.arc(8 * s, 16 * s, 0.8 * s, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(10 * s, 15.5 * s, 0.6 * s, 0, Math.PI * 2);
  c.fill();
};

// ── ENCANADOR — Cap, wrench ──
CHAR_RENDERERS.encanador = function(c, s, team, sil) {
  if (sil) { _silhouette(c, s, team); return; }
  const bodyC = tintTeam('#0277bd', team, 0.08);

  drawFeet(c, s, '#333');
  drawBody(c, s, bodyC);

  // Overalls straps
  c.fillStyle = darken(bodyC, 0.15);
  c.fillRect(-4 * s, 0, 2 * s, 5 * s);
  c.fillRect(2 * s, 0, 2 * s, 5 * s);

  drawArms(c, s, '#01579b');
  drawHead(c, s, '#3e2723');
  drawEyes(c, s, 'normal', '#0277bd');
  drawMouth(c, s, 'smile');

  // Cap
  c.fillStyle = '#0277bd';
  c.beginPath();
  c.roundRect(-7 * s, -14 * s, 14 * s, 4 * s, 1 * s);
  c.fill();
  c.fillRect(-2 * s, -15 * s, 9 * s, 2.5 * s);
  ol(c, s);
  c.beginPath();
  c.roundRect(-7 * s, -14 * s, 14 * s, 4 * s, 1 * s);
  c.stroke();

  // Big wrench in right hand
  c.fillStyle = '#90a4ae';
  c.beginPath();
  c.roundRect(8 * s, -3 * s, 2.5 * s, 12 * s, 1 * s);
  c.fill();
  // Wrench head
  c.beginPath();
  c.arc(9.2 * s, -3 * s, 3.5 * s, 0, Math.PI * 2);
  c.fill();
  // Wrench jaw opening
  c.fillStyle = bodyC;
  c.beginPath();
  c.arc(9.2 * s, -3 * s, 1.5 * s, 0, Math.PI * 2);
  c.fill();
  ol(c, s);
  c.beginPath();
  c.arc(9.2 * s, -3 * s, 3.5 * s, 0, Math.PI * 2);
  c.stroke();

  // Pipe (held in left hand)
  c.fillStyle = '#78909c';
  c.beginPath();
  c.roundRect(-13 * s, 2 * s, 3 * s, 7 * s, 1 * s);
  c.fill();
  c.beginPath();
  c.roundRect(-14 * s, 1 * s, 5 * s, 2 * s, 0.5 * s);
  c.fill();
  // Water drip
  c.fillStyle = 'rgba(52,152,219,0.5)';
  c.beginPath();
  c.ellipse(-11.5 * s, 10 * s, 1 * s, 1.5 * s, 0, 0, Math.PI * 2);
  c.fill();
};

// ── VETERINARIO — Green scrubs, paw print, healing ──
CHAR_RENDERERS.veterinario = function(c, s, team, sil) {
  if (sil) { _silhouette(c, s, team); return; }
  const bodyC = tintTeam('#2e7d32', team, 0.08);

  drawFeet(c, s, '#333');
  drawBody(c, s, bodyC);

  // White coat overlay
  c.fillStyle = '#fff';
  c.beginPath();
  c.roundRect(-6 * s, 0, 12 * s, 3 * s, 1 * s);
  c.fill();

  // Green cross
  c.fillStyle = '#4caf50';
  c.fillRect(-1 * s, 1 * s, 2 * s, 5.5 * s);
  c.fillRect(-3 * s, 3 * s, 6 * s, 2 * s);

  drawArms(c, s, '#1b5e20');
  drawHead(c, s, '#3e2723');
  drawEyes(c, s, 'kind', '#2e7d32');
  drawMouth(c, s, 'smile');

  // Paw print accessory (on left side)
  c.fillStyle = '#795548';
  c.beginPath();
  c.arc(-9 * s, 6 * s, 3 * s, 0, Math.PI * 2);
  c.fill();
  // Toe beans
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.arc((-10.5 + i * 1.5) * s, 3.5 * s, 1.2 * s, 0, Math.PI * 2);
    c.fill();
  }
  c.beginPath();
  c.arc(-9 * s, 2 * s, 1 * s, 0, Math.PI * 2);
  c.fill();

  // Healing aura
  c.strokeStyle = 'rgba(76,175,80,0.3)';
  c.lineWidth = 1 * s;
  c.beginPath();
  c.arc(0, 0, 13 * s, 0, Math.PI * 2);
  c.stroke();
};

// ── SEGURANCA — Dark suit, sunglasses, shield ──
CHAR_RENDERERS.seguranca = function(c, s, team, sil) {
  if (sil) { _silhouette(c, s, team); return; }
  const bodyC = tintTeam('#263238', team, 0.08);

  drawFeet(c, s, '#111');
  drawBody(c, s, bodyC);

  // Earpiece
  c.strokeStyle = '#555';
  c.lineWidth = 0.8 * s;
  c.beginPath();
  c.moveTo(5 * s, -5 * s);
  c.quadraticCurveTo(7 * s, -3 * s, 6 * s, 0);
  c.stroke();

  drawArms(c, s, bodyC);
  drawHead(c, s, '#1a0a00');

  // Sunglasses (covering eyes)
  c.fillStyle = '#111';
  c.beginPath();
  c.roundRect(-5.5 * s, -10 * s, 4.5 * s, 3 * s, 1 * s);
  c.fill();
  c.beginPath();
  c.roundRect(1 * s, -10 * s, 4.5 * s, 3 * s, 1 * s);
  c.fill();
  // Lens shine
  c.fillStyle = 'rgba(255,255,255,0.15)';
  c.beginPath();
  c.arc(-4 * s, -9 * s, 1 * s, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(2.5 * s, -9 * s, 1 * s, 0, Math.PI * 2);
  c.fill();
  // Bridge
  c.fillStyle = '#222';
  c.fillRect(-1.5 * s, -9.5 * s, 3 * s, 1.5 * s);
  ol(c, s);
  c.beginPath();
  c.roundRect(-5.5 * s, -10 * s, 11 * s, 3 * s, 1 * s);
  c.stroke();

  drawMouth(c, s, 'serious');

  // Flat top (bald/buzz)
  c.fillStyle = '#37474f';
  c.beginPath();
  c.roundRect(-7 * s, -14 * s, 14 * s, 4 * s, 1 * s);
  c.fill();

  // Shield in left hand
  c.fillStyle = '#455a64';
  c.beginPath();
  c.moveTo(-12 * s, -2 * s);
  c.lineTo(-12 * s, 7 * s);
  c.lineTo(-8 * s, 10 * s);
  c.lineTo(-4 * s, 7 * s);
  c.lineTo(-4 * s, -2 * s);
  c.closePath();
  c.fill();
  // Shield emblem
  c.fillStyle = '#78909c';
  c.beginPath();
  c.arc(-8 * s, 3 * s, 2 * s, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#90a4ae';
  c.lineWidth = 0.8 * s;
  c.beginPath();
  c.moveTo(-12 * s, -2 * s);
  c.lineTo(-12 * s, 7 * s);
  c.lineTo(-8 * s, 10 * s);
  c.lineTo(-4 * s, 7 * s);
  c.lineTo(-4 * s, -2 * s);
  c.closePath();
  c.stroke();
};

// ── CORRETOR — Orange suit, "VENDE" sign ──
CHAR_RENDERERS.corretor = function(c, s, team, sil) {
  if (sil) { _silhouette(c, s, team); return; }
  const bodyC = tintTeam('#e65100', team, 0.08);

  drawFeet(c, s, '#333');
  drawBody(c, s, bodyC);

  // Shirt + tie
  c.fillStyle = '#fff';
  c.fillRect(-1.5 * s, 0, 3 * s, 5 * s);
  c.fillStyle = '#c0392b';
  c.beginPath();
  c.moveTo(0, -0.5 * s);
  c.lineTo(-1.5 * s, 3 * s);
  c.lineTo(0, 5 * s);
  c.lineTo(1.5 * s, 3 * s);
  c.closePath();
  c.fill();

  drawArms(c, s, '#bf360c');
  drawHead(c, s, '#3e2723');
  drawEyes(c, s, 'normal', '#e65100');
  drawMouth(c, s, 'grin');

  // Slicked back hair
  c.fillStyle = '#2c1810';
  c.beginPath();
  c.arc(0, -9 * s, 7 * s, Math.PI + 0.4, -0.4);
  c.fill();

  // "VENDE" sign in right hand
  c.fillStyle = '#fff';
  c.beginPath();
  c.roundRect(6 * s, -2 * s, 7 * s, 9 * s, 1 * s);
  c.fill();
  c.fillStyle = '#e65100';
  c.font = `bold ${3 * s}px Arial`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('V', 9.5 * s, 0.5 * s);
  c.fillText('E', 9.5 * s, 3 * s);
  c.fillText('N', 9.5 * s, 5.5 * s);
  ol(c, s);
  c.beginPath();
  c.roundRect(6 * s, -2 * s, 7 * s, 9 * s, 1 * s);
  c.stroke();
  // Sign pole
  c.strokeStyle = '#8d6e63';
  c.lineWidth = 1 * s;
  c.beginPath();
  c.moveTo(9.5 * s, 7 * s);
  c.lineTo(9.5 * s, 13 * s);
  c.stroke();
};

// ── NUTRICIONISTA — Green theme, salad bowl, leaves ──
CHAR_RENDERERS.nutricionista = function(c, s, team, sil) {
  if (sil) { _silhouette(c, s, team); return; }
  const bodyC = tintTeam('#558b2f', team, 0.08);

  drawFeet(c, s, '#333');
  drawBody(c, s, bodyC);

  // Apron
  c.fillStyle = '#fff';
  c.beginPath();
  c.roundRect(-4 * s, 2 * s, 8 * s, 7 * s, 1.5 * s);
  c.fill();

  drawArms(c, s, '#33691e');
  drawHead(c, s, '#3e2723');
  drawEyes(c, s, 'kind', '#558b2f');
  drawMouth(c, s, 'smile');

  // Chef's headband
  c.fillStyle = '#fff';
  c.fillRect(-7 * s, -13 * s, 14 * s, 2.5 * s);

  // Salad bowl
  c.fillStyle = '#8d6e63';
  c.beginPath();
  c.arc(0, 6 * s, 5 * s, 0, Math.PI);
  c.fill();
  // Bowl top
  c.fillStyle = '#a1887f';
  c.beginPath();
  c.ellipse(0, 6 * s, 5 * s, 1.5 * s, 0, 0, Math.PI * 2);
  c.fill();
  // Salad greens
  c.fillStyle = '#4caf50';
  c.beginPath();
  c.ellipse(-2 * s, 5 * s, 2.5 * s, 1.5 * s, -0.3, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#66bb6a';
  c.beginPath();
  c.ellipse(2 * s, 5 * s, 2 * s, 1.2 * s, 0.2, 0, Math.PI * 2);
  c.fill();
  // Tomato
  c.fillStyle = '#f44336';
  c.beginPath();
  c.arc(0, 4.5 * s, 1.2 * s, 0, Math.PI * 2);
  c.fill();
  // Carrot stick
  c.fillStyle = '#ff9800';
  c.beginPath();
  c.roundRect(1.5 * s, 3.5 * s, 0.8 * s, 3 * s, 0.3 * s);
  c.fill();
  ol(c, s);
  c.beginPath();
  c.ellipse(0, 6 * s, 5 * s, 1.5 * s, 0, 0, Math.PI * 2);
  c.stroke();
};

// ── MECANICO — Wrench, greasy overalls ──
CHAR_RENDERERS.mecanico = function(c, s, team, sil) {
  if (sil) { _silhouette(c, s, team); return; }
  const bodyC = tintTeam('#455a64', team, 0.08);

  drawFeet(c, s, '#222');
  drawBody(c, s, bodyC);

  // Grease stains
  c.fillStyle = 'rgba(0,0,0,0.15)';
  c.beginPath();
  c.arc(-3 * s, 4 * s, 2 * s, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(4 * s, 6 * s, 1.5 * s, 0, Math.PI * 2);
  c.fill();

  // Name patch
  c.fillStyle = '#fff';
  c.beginPath();
  c.roundRect(-5 * s, 1 * s, 4 * s, 2 * s, 0.5 * s);
  c.fill();

  drawArms(c, s, '#37474f');
  drawHead(c, s, '#2c1810');
  drawEyes(c, s, 'normal', '#546e7a');
  drawMouth(c, s, 'smirk');

  // Cap
  c.fillStyle = '#546e7a';
  c.beginPath();
  c.roundRect(-7 * s, -14 * s, 14 * s, 4 * s, 1 * s);
  c.fill();
  c.fillRect(-2 * s, -15 * s, 9 * s, 2.5 * s);
  ol(c, s);
  c.beginPath();
  c.roundRect(-7 * s, -14 * s, 14 * s, 4 * s, 1 * s);
  c.stroke();

  // Big wrench
  c.fillStyle = '#78909c';
  c.beginPath();
  c.roundRect(7 * s, -5 * s, 2.5 * s, 14 * s, 1 * s);
  c.fill();
  c.beginPath();
  c.arc(8.2 * s, -5 * s, 4 * s, 0, Math.PI * 2);
  c.fill();
  // Opening
  c.fillStyle = bodyC;
  c.beginPath();
  c.arc(8.2 * s, -5 * s, 1.8 * s, 0, Math.PI * 2);
  c.fill();
  // Shine
  c.fillStyle = 'rgba(255,255,255,0.15)';
  c.beginPath();
  c.arc(7 * s, -6 * s, 2 * s, 0, Math.PI * 2);
  c.fill();
  ol(c, s);
  c.beginPath();
  c.arc(8.2 * s, -5 * s, 4 * s, 0, Math.PI * 2);
  c.stroke();
};

// ── CARPINTEIRO — Apron, hammer, saw ──
CHAR_RENDERERS.carpinteiro = function(c, s, team, sil) {
  if (sil) { _silhouette(c, s, team); return; }
  const bodyC = tintTeam('#5d4037', team, 0.08);

  drawFeet(c, s, '#333');
  drawBody(c, s, bodyC);

  // Leather apron
  c.fillStyle = '#795548';
  c.beginPath();
  c.roundRect(-5 * s, 2 * s, 10 * s, 8 * s, 2 * s);
  c.fill();
  // Apron pocket
  c.fillStyle = darken('#795548', 0.15);
  c.beginPath();
  c.roundRect(-3 * s, 5 * s, 6 * s, 3 * s, 1 * s);
  c.fill();
  // Nails sticking out of pocket
  c.fillStyle = '#999';
  c.fillRect(-1 * s, 4 * s, 0.5 * s, 2 * s);
  c.fillRect(1 * s, 4.5 * s, 0.5 * s, 1.5 * s);
  ol(c, s);
  c.beginPath();
  c.roundRect(-5 * s, 2 * s, 10 * s, 8 * s, 2 * s);
  c.stroke();

  drawArms(c, s, '#4e342e');
  drawHead(c, s, '#3e2723');
  drawEyes(c, s, 'angry', '#5d4037');
  drawMouth(c, s, 'serious');

  // Hammer in right hand
  c.fillStyle = '#8d6e63';
  c.beginPath();
  c.roundRect(8 * s, -3 * s, 2 * s, 11 * s, 0.5 * s);
  c.fill();
  // Hammer head
  c.fillStyle = '#616161';
  c.beginPath();
  c.roundRect(6 * s, -5 * s, 6 * s, 4 * s, 1 * s);
  c.fill();
  c.fillStyle = '#777';
  c.fillRect(6.5 * s, -4.5 * s, 5 * s, 1.5 * s);
  ol(c, s);
  c.beginPath();
  c.roundRect(6 * s, -5 * s, 6 * s, 4 * s, 1 * s);
  c.stroke();

  // Pencil behind ear
  c.fillStyle = '#f1c40f';
  c.save();
  c.translate(6 * s, -11 * s);
  c.rotate(0.3);
  c.fillRect(-0.4 * s, -3 * s, 0.8 * s, 4 * s);
  c.fillStyle = '#ff9800';
  c.fillRect(-0.4 * s, -3.5 * s, 0.8 * s, 0.8 * s);
  c.restore();
};

// ── PILOTO — Navy uniform, aviator goggles, golden wings ──
CHAR_RENDERERS.piloto = function(c, s, team, sil) {
  if (sil) { _silhouette(c, s, team); return; }
  const bodyC = tintTeam('#1a237e', team, 0.08);

  drawFeet(c, s, '#111');
  drawBody(c, s, bodyC);

  // Gold epaulettes
  c.fillStyle = '#f1c40f';
  c.beginPath();
  c.roundRect(-6.5 * s, -0.5 * s, 3 * s, 1.5 * s, 0.5 * s);
  c.fill();
  c.beginPath();
  c.roundRect(3.5 * s, -0.5 * s, 3 * s, 1.5 * s, 0.5 * s);
  c.fill();

  // Golden wings badge on chest
  c.fillStyle = '#f1c40f';
  c.beginPath();
  c.moveTo(0, 2 * s);
  c.lineTo(-4 * s, 1 * s);
  c.quadraticCurveTo(-5.5 * s, 1 * s, -5 * s, 2.5 * s);
  c.lineTo(0, 3.5 * s);
  c.lineTo(5 * s, 2.5 * s);
  c.quadraticCurveTo(5.5 * s, 1 * s, 4 * s, 1 * s);
  c.closePath();
  c.fill();
  // Wing center
  c.fillStyle = '#ffd54f';
  c.beginPath();
  c.arc(0, 2.5 * s, 1 * s, 0, Math.PI * 2);
  c.fill();

  drawArms(c, s, '#0d47a1');
  drawHead(c, s, '#2c1810');
  drawEyes(c, s, 'cool', '#1a237e');
  drawMouth(c, s, 'smirk');

  // Aviator goggles on forehead
  c.fillStyle = 'rgba(255,200,0,0.35)';
  c.beginPath();
  c.ellipse(-2.8 * s, -11 * s, 2.8 * s, 2.2 * s, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(2.8 * s, -11 * s, 2.8 * s, 2.2 * s, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#8d6e63';
  c.lineWidth = 0.8 * s;
  c.beginPath();
  c.ellipse(-2.8 * s, -11 * s, 2.8 * s, 2.2 * s, 0, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.ellipse(2.8 * s, -11 * s, 2.8 * s, 2.2 * s, 0, 0, Math.PI * 2);
  c.stroke();
  // Strap
  c.beginPath();
  c.arc(0, -10 * s, 7.5 * s, Math.PI + 0.5, -0.5);
  c.stroke();

  // Pilot cap
  c.fillStyle = '#1a237e';
  c.beginPath();
  c.roundRect(-7 * s, -15 * s, 14 * s, 3 * s, 1 * s);
  c.fill();
  c.beginPath();
  c.roundRect(-5.5 * s, -18 * s, 11 * s, 4.5 * s, 2 * s);
  c.fill();
  // Cap gold emblem
  c.fillStyle = '#f1c40f';
  c.beginPath();
  c.arc(0, -16 * s, 1.5 * s, 0, Math.PI * 2);
  c.fill();
  ol(c, s);
  c.beginPath();
  c.roundRect(-5.5 * s, -18 * s, 11 * s, 4.5 * s, 2 * s);
  c.stroke();
};

// ── CIENTISTA — Lab coat, bubbling flask ──
CHAR_RENDERERS.cientista = function(c, s, team, sil) {
  if (sil) { _silhouette(c, s, team); return; }

  drawFeet(c, s, '#333');
  drawBody(c, s, '#fff');

  // Lab coat pockets
  c.fillStyle = '#eee';
  c.beginPath();
  c.roundRect(-5 * s, 5 * s, 4 * s, 3 * s, 1 * s);
  c.fill();
  c.beginPath();
  c.roundRect(1 * s, 5 * s, 4 * s, 3 * s, 1 * s);
  c.fill();
  // Pen in pocket
  c.fillStyle = '#1565c0';
  c.fillRect(-3 * s, 4 * s, 0.6 * s, 2 * s);

  drawArms(c, s, '#fff');
  drawHead(c, s, '#888');
  drawEyes(c, s, 'kind', '#00838f');
  drawMouth(c, s, 'smile');

  // Wild hair
  c.fillStyle = '#999';
  c.beginPath();
  c.arc(-5 * s, -12 * s, 4 * s, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(5 * s, -12 * s, 4 * s, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(0, -14 * s, 3.5 * s, 0, Math.PI * 2);
  c.fill();

  // Big glasses
  c.strokeStyle = '#444';
  c.lineWidth = 1.2 * s;
  c.beginPath();
  c.arc(-2.8 * s, -8 * s, 2.8 * s, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.arc(2.8 * s, -8 * s, 2.8 * s, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.moveTo(-0.2 * s, -8 * s);
  c.lineTo(0.2 * s, -8 * s);
  c.stroke();
  // Lens glare
  c.fillStyle = 'rgba(255,255,255,0.2)';
  c.beginPath();
  c.arc(-3.5 * s, -8.8 * s, 1 * s, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(2 * s, -8.8 * s, 1 * s, 0, Math.PI * 2);
  c.fill();

  // Bubbling flask in right hand
  c.fillStyle = 'rgba(0,255,100,0.35)';
  c.beginPath();
  c.roundRect(7.5 * s, -1 * s, 4.5 * s, 8 * s, 2 * s);
  c.fill();
  c.strokeStyle = '#aaa';
  c.lineWidth = 1 * s;
  c.beginPath();
  c.roundRect(7.5 * s, -1 * s, 4.5 * s, 8 * s, 2 * s);
  c.stroke();
  // Flask neck
  c.fillStyle = '#bbb';
  c.fillRect(8.5 * s, -3.5 * s, 2.5 * s, 3 * s);
  c.strokeRect(8.5 * s, -3.5 * s, 2.5 * s, 3 * s);
  // Bubbles
  c.fillStyle = 'rgba(0,255,100,0.5)';
  c.beginPath();
  c.arc(8.5 * s, -4 * s, 1.2 * s, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(10.5 * s, -5 * s, 0.8 * s, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(9.5 * s, -6.5 * s, 0.6 * s, 0, Math.PI * 2);
  c.fill();
};

// ── INFLUENCER — Phone with selfie, heart likes ──
CHAR_RENDERERS.influencer = function(c, s, team, sil) {
  if (sil) { _silhouette(c, s, team); return; }
  const bodyC = tintTeam('#e91e63', team, 0.08);

  drawFeet(c, s, '#880e4f');
  drawBody(c, s, bodyC);

  // Trendy crop top look
  c.fillStyle = lighten(bodyC, 0.15);
  c.fillRect(-6 * s, 0, 12 * s, 4 * s);

  drawArms(c, s, '#c2185b');
  drawHead(c, s, '#1a0a00');
  drawEyes(c, s, 'kind', '#e91e63');
  drawMouth(c, s, 'grin');

  // Fashionable hair
  c.fillStyle = '#1a0a00';
  c.beginPath();
  c.arc(-4 * s, -11 * s, 5 * s, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(4 * s, -11 * s, 5 * s, 0, Math.PI * 2);
  c.fill();

  // Phone in right hand (selfie pose)
  c.fillStyle = '#222';
  c.beginPath();
  c.roundRect(7 * s, -3 * s, 5.5 * s, 10 * s, 1.5 * s);
  c.fill();
  // Phone screen
  c.fillStyle = '#4fc3f7';
  c.fillRect(7.8 * s, -1.5 * s, 4 * s, 7 * s);
  // Camera notch
  c.fillStyle = '#111';
  c.beginPath();
  c.arc(9.8 * s, -2.2 * s, 0.6 * s, 0, Math.PI * 2);
  c.fill();
  ol(c, s);
  c.beginPath();
  c.roundRect(7 * s, -3 * s, 5.5 * s, 10 * s, 1.5 * s);
  c.stroke();

  // Floating heart likes
  c.fillStyle = '#e74c3c';
  _drawHeart(c, -7 * s, -14 * s, 2 * s);
  _drawHeart(c, -10 * s, -10 * s, 1.5 * s);
  _drawHeart(c, 13 * s, -6 * s, 1.8 * s);
};

// ══════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════

// Silhouette mode — draw basic shape in team color for glow outline
function _silhouette(c, s, team) {
  const col = team === 'player' ? 'rgba(41,128,185,0.6)' : 'rgba(192,57,43,0.6)';
  c.fillStyle = col;

  // Head
  c.beginPath();
  c.arc(0, -7 * s, 8.5 * s, 0, Math.PI * 2);
  c.fill();

  // Body
  c.beginPath();
  c.roundRect(-7.5 * s, -1 * s, 15 * s, 12 * s, 3 * s);
  c.fill();

  // Arms
  c.fillRect(-11.5 * s, 0, 5 * s, 10 * s);
  c.fillRect(6.5 * s, 0, 5 * s, 10 * s);

  // Feet
  c.fillRect(-7 * s, 9 * s, 6 * s, 5 * s);
  c.fillRect(1 * s, 9 * s, 6 * s, 5 * s);
}

// Draw a 4-pointed sparkle
function _drawSparkle(c, x, y, size) {
  c.beginPath();
  c.moveTo(x, y - size);
  c.lineTo(x + size * 0.3, y - size * 0.3);
  c.lineTo(x + size, y);
  c.lineTo(x + size * 0.3, y + size * 0.3);
  c.lineTo(x, y + size);
  c.lineTo(x - size * 0.3, y + size * 0.3);
  c.lineTo(x - size, y);
  c.lineTo(x - size * 0.3, y - size * 0.3);
  c.closePath();
  c.fill();
}

// Draw a heart shape
function _drawHeart(c, x, y, size) {
  c.save();
  c.translate(x, y);
  c.beginPath();
  c.moveTo(0, size * 0.3);
  c.bezierCurveTo(-size, -size * 0.5, -size, -size * 1.2, 0, -size * 0.5);
  c.bezierCurveTo(size, -size * 1.2, size, -size * 0.5, 0, size * 0.3);
  c.fill();
  c.restore();
}
