// ════════════════════════════════════════════════════════════
//  DrawUI.js — P1 UI, P2 UI, HUD, Deploy Zone, Battle Over
//  MELHORADO: cards com preview, glow, HUD polido, battle over animado
// ════════════════════════════════════════════════════════════
import { W, H, ARENA_TOP, ARENA_BOT, ARENA_H, P1_UI_H, P2_UI_H, RIVER_Y } from '../config/constants.js';
import { CARDS } from '../config/cards.js';
import { drawCharacter } from './CharacterRenderer.js';

export function drawP1UI(ctx, G, mouseX, mouseY, getCardLevel, soundMuted) {
  // Fundo com gradiente sutil
  const uiBg = ctx.createLinearGradient(0, ARENA_BOT, 0, ARENA_BOT + P1_UI_H);
  uiBg.addColorStop(0, '#0c0c18'); uiBg.addColorStop(1, '#060610');
  ctx.fillStyle = uiBg; ctx.fillRect(0, ARENA_BOT, W, P1_UI_H);
  // Linha separadora
  ctx.strokeStyle = 'rgba(155,89,182,.2)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, ARENA_BOT); ctx.lineTo(W, ARENA_BOT); ctx.stroke();

  // Elixir bar
  const EW = W - 20, EH = 20, EX = 10, EY = ARENA_BOT + 7;
  ctx.fillStyle = '#12082a'; ctx.beginPath(); ctx.roundRect(EX, EY, EW, EH, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(155,89,182,.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(EX, EY, EW, EH, 6); ctx.stroke();

  for (let i = 0; i < 10; i++) {
    const seg = (EW - 2) / 10 - 1, sx = EX + 1 + i * (seg + 1);
    const filled = G.p1Elixir >= i + 1, part = !filled && G.p1Elixir > i;
    if (filled) { ctx.shadowColor = '#b06ad4'; ctx.shadowBlur = 10; } else ctx.shadowBlur = 0;
    ctx.fillStyle = filled ? '#9b59b6' : part ? `rgba(155,89,182,${G.p1Elixir - i})` : '#1a0d30';
    ctx.beginPath(); ctx.roundRect(sx, EY + 1, seg, EH - 2, 3); ctx.fill();
    if (filled) {
      ctx.fillStyle = 'rgba(255,255,255,.2)';
      ctx.beginPath(); ctx.roundRect(sx, EY + 1, seg, EH / 2 - 1, 2); ctx.fill();
    }
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#d7bde2'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(`\u26a1 ${Math.floor(G.p1Elixir)}`, W/2, EY + EH + 3);

  // Cards na mao
  const CW = 84, CH = 74, CS = 5, total = 4 * CW + 3 * CS, CX0 = (W - total) / 2, CY = ARENA_BOT + 36;
  G.p1Hand.forEach((key, i) => {
    const d = CARDS[key]; if (!d) return;
    const cx = CX0 + i * (CW + CS), sel = G.p1Sel === i, can = G.p1Elixir >= d.cost, lvl = getCardLevel(key);

    // Card glow
    if (sel) { ctx.shadowColor = '#f39c12'; ctx.shadowBlur = 20; }
    else if (can) { ctx.shadowColor = '#3498db'; ctx.shadowBlur = 8; }

    // Card background com gradiente
    const cardBg = ctx.createLinearGradient(cx, CY, cx, CY + CH);
    if (sel) { cardBg.addColorStop(0, '#3a2800'); cardBg.addColorStop(1, '#1a1400'); }
    else if (can) { cardBg.addColorStop(0, '#1a2540'); cardBg.addColorStop(1, '#0d1420'); }
    else { cardBg.addColorStop(0, '#151520'); cardBg.addColorStop(1, '#0a0a12'); }
    ctx.fillStyle = cardBg;

    ctx.strokeStyle = sel ? '#f5b041' : can ? '#2e86c1' : '#222'; ctx.lineWidth = sel ? 3 : 1.5;
    ctx.beginPath(); ctx.roundRect(cx, CY, CW, CH, 10); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    // Shine no topo
    if (can) {
      const shine = ctx.createLinearGradient(cx, CY, cx, CY + 14);
      shine.addColorStop(0, sel ? 'rgba(255,200,50,.25)' : 'rgba(52,152,219,.15)');
      shine.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = shine;
      ctx.beginPath(); ctx.roundRect(cx + 2, CY + 1, CW - 4, 14, 8); ctx.fill();
    }

    // Personagem preview (maior e centralizado)
    ctx.globalAlpha = can ? 1 : .35;
    drawCharacter(ctx, cx + CW/2, CY + 24, key, 'player', 13);
    ctx.globalAlpha = 1;

    // Nome com sombra
    const fs = d.name.length > 10 ? 7 : d.name.length > 7 ? 8 : 9;
    ctx.fillStyle = can ? '#ecf0f1' : '#444'; ctx.font = `${fs}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 2;
    ctx.fillText(d.name, cx + CW/2, CY + 48);
    ctx.shadowBlur = 0;

    // Stats mini (tipo e range)
    ctx.fillStyle = can ? '#777' : '#333'; ctx.font = '6px Arial';
    const typeLabel = d.type === 'melee' ? '\u2694' : d.type === 'ranged' ? '\u{1F3AF}' : '\u{1F4A5}';
    ctx.fillText(`${typeLabel} ${d.type}`, cx + CW/2, CY + 59);

    // Custo badge com gradiente
    const costGrad = ctx.createRadialGradient(cx + CW - 13, CY + 13, 0, cx + CW - 13, CY + 13, 11);
    costGrad.addColorStop(0, '#8e44ad'); costGrad.addColorStop(1, '#6c3483');
    ctx.fillStyle = costGrad; ctx.beginPath(); ctx.arc(cx + CW - 13, CY + 13, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = .5;
    ctx.beginPath(); ctx.arc(cx + CW - 13, CY + 13, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#e8daef'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(d.cost, cx + CW - 13, CY + 13);

    // Level badge
    if (lvl > 1) {
      ctx.fillStyle = '#f1c40f'; ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 4;
      ctx.beginPath(); ctx.arc(cx + 12, CY + 13, 9, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#000'; ctx.font = 'bold 8px Arial';
      ctx.fillText('Lv' + lvl, cx + 12, CY + 13);
    }
  });

  // Mute button
  ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.roundRect(W - 40, ARENA_BOT + 4, 34, 24, 6); ctx.fill();
  ctx.font = '14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(soundMuted ? '\u{1F507}' : '\u{1F50A}', W - 23, ARENA_BOT + 16);
}

export function drawP2UI(ctx, G, mode, opponentName) {
  const uiBg = ctx.createLinearGradient(0, 0, 0, P2_UI_H);
  uiBg.addColorStop(0, '#0a080e'); uiBg.addColorStop(1, '#0e0c14');
  ctx.fillStyle = uiBg; ctx.fillRect(0, 0, W, P2_UI_H);
  ctx.strokeStyle = 'rgba(231,76,60,.2)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, P2_UI_H); ctx.lineTo(W, P2_UI_H); ctx.stroke();

  const _p2label = mode === 'online' ? ('\u{1F310} ' + (opponentName || 'Oponente')) : '\u{1F916} INIMIGO IA';
  ctx.fillStyle = '#666'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(_p2label, 10, P2_UI_H / 2);

  // Enemy elixir bar
  const EW = 100, EH = 12, EX = W - EW - 10, EY = (P2_UI_H - EH) / 2;
  ctx.fillStyle = '#1a0d2e'; ctx.beginPath(); ctx.roundRect(EX, EY, EW, EH, 3); ctx.fill();
  for (let i = 0; i < 10; i++) {
    const seg = (EW - 2) / 10 - 1, sx = EX + 1 + i * (seg + 1);
    ctx.fillStyle = G.p2Elixir >= i + 1 ? '#c0392b' : '#1a0808';
    ctx.beginPath(); ctx.roundRect(sx, EY + 1, seg, EH - 2, 2); ctx.fill();
  }
  ctx.fillStyle = '#f1948a'; ctx.font = '10px Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText(`\u26a1${Math.floor(G.p2Elixir)}`, EX - 4, P2_UI_H / 2);
}

export function drawHUD(ctx, G, mode, currentDiff) {
  const m = Math.floor(G.time / 60), s = Math.floor(G.time % 60).toString().padStart(2, '0');
  const urgent = G.time < 30 && Math.floor(Date.now() / 500) % 2;

  // Timer com gradiente
  const timerBg = ctx.createLinearGradient(W/2 - 42, ARENA_TOP + 3, W/2 + 42, ARENA_TOP + 32);
  timerBg.addColorStop(0, 'rgba(0,0,0,.65)'); timerBg.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = timerBg; ctx.beginPath(); ctx.roundRect(W/2 - 42, ARENA_TOP + 3, 84, 28, 8); ctx.fill();
  if (urgent) { ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(W/2 - 42, ARENA_TOP + 3, 84, 28, 8); ctx.stroke(); }

  ctx.fillStyle = urgent ? '#e74c3c' : '#ecf0f1'; ctx.font = 'bold 17px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (urgent) { ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 8; }
  ctx.fillText(`${m}:${s}`, W/2, ARENA_TOP + 17);
  ctx.shadowBlur = 0;

  // Difficulty badge
  if (mode === 'solo') {
    const dl = currentDiff.label || 'Medio';
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.roundRect(4, ARENA_TOP + 4, 72, 18, 5); ctx.fill();
    ctx.fillStyle = '#f1c40f'; ctx.font = '9px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(dl, 40, ARENA_TOP + 13);
  }

  // Forfeit button
  ctx.fillStyle = 'rgba(180,30,30,.85)'; ctx.beginPath(); ctx.roundRect(4, ARENA_BOT - 27, 30, 24, 6); ctx.fill();
  ctx.font = '14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('\u{1F3F3}\uFE0F', 19, ARENA_BOT - 15);

  // Forfeit confirmation
  if (G.showForfeitConfirm) {
    ctx.fillStyle = 'rgba(0,0,0,.9)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(15,10,25,.95)'; ctx.beginPath(); ctx.roundRect(W/2 - 135, H/2 - 65, 270, 130, 14); ctx.fill();
    ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(W/2 - 135, H/2 - 65, 270, 130, 14); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('Desistir da partida?', W/2, H/2 - 52);
    ctx.fillStyle = '#999'; ctx.font = '11px Arial';
    ctx.fillText('Seu adversario leva a vitoria', W/2, H/2 - 28);
    ctx.fillText('mas nao ganha diamantes.', W/2, H/2 - 12);
    // Confirmar
    const cbg = ctx.createLinearGradient(W/2 - 118, H/2 + 14, W/2 - 13, H/2 + 46);
    cbg.addColorStop(0, '#c0392b'); cbg.addColorStop(1, '#922b21');
    ctx.fillStyle = cbg; ctx.beginPath(); ctx.roundRect(W/2 - 118, H/2 + 14, 108, 34, 8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial'; ctx.textBaseline = 'middle';
    ctx.fillText('\u2714 Confirmar', W/2 - 64, H/2 + 31);
    // Cancelar
    ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.roundRect(W/2 + 10, H/2 + 14, 108, 34, 8); ctx.fill();
    ctx.fillStyle = '#ccc'; ctx.fillText('\u2717 Cancelar', W/2 + 64, H/2 + 31);
  }

  // Tooltip
  if (G.p1Sel !== null && !G.showForfeitConfirm) {
    const d = CARDS[G.p1Hand[G.p1Sel]];
    if (d) {
      ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.beginPath(); ctx.roundRect(8, ARENA_BOT - 32, W - 16, 28, 6); ctx.fill();
      ctx.fillStyle = '#ecf0f1'; ctx.font = '10px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`${d.emoji} ${d.name}: ${d.desc}`, 14, ARENA_BOT - 18);
    }
  }
}

export function drawDeployZone(ctx, G, mouseX, mouseY) {
  if (G.p1Sel === null) return;
  const key = G.p1Hand[G.p1Sel]; const d = CARDS[key]; if (!d) return;
  const zoneTop = RIVER_Y - 28;
  const zoneH = ARENA_BOT - RIVER_Y + 28;

  // Zone indicator com glow
  ctx.shadowColor = 'rgba(52,152,219,.3)'; ctx.shadowBlur = 8;
  ctx.strokeStyle = 'rgba(52,152,219,.5)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
  ctx.strokeRect(8, zoneTop, W - 16, zoneH); ctx.setLineDash([]);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(52,152,219,.05)'; ctx.fillRect(8, zoneTop, W - 16, zoneH);

  const inZone = (mouseY >= zoneTop && mouseY <= ARENA_BOT);
  if (inZone) {
    if (d.type === 'spell') {
      ctx.strokeStyle = 'rgba(255,80,0,.85)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.arc(mouseX, mouseY, d.aoe, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,60,0,.12)'; ctx.fill();
    } else {
      ctx.globalAlpha = .6;
      drawCharacter(ctx, mouseX, mouseY, key, 'player', 14);
      ctx.globalAlpha = 1;
      // Range circle
      ctx.strokeStyle = 'rgba(52,152,219,.25)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(mouseX, mouseY, d.range || 25, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

export function drawBattleOver(ctx, G, opponentName) {
  const r = G.phase; if (r === 'playing') return;
  const t = Date.now() * 0.001;

  ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(0, 0, W, H);

  if (G._dcBanner) {
    ctx.font = '40px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('\u{1F4E1}', W/2, H/2 - 55);
    ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 22px Arial'; ctx.fillText('VITORIA!', W/2, H/2 - 10);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#aaa'; ctx.font = '14px Arial'; ctx.fillText(opponentName + ' desconectou \u2014 W.O.', W/2, H/2 + 24);
    ctx.fillStyle = '#00e5ff'; ctx.font = '13px Arial'; ctx.fillText('+2 \u{1F48E}  por W.O.', W/2, H/2 + 48);
    return;
  }

  // Emoji pulsante
  const pulse = 1 + Math.sin(t * 4) * 0.05;
  ctx.save(); ctx.translate(W/2, H/2 - 65); ctx.scale(pulse, pulse);
  ctx.font = '60px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(r === 'win' ? '\u{1F3C6}' : r === 'draw' ? '\u{1F91D}' : '\u{1F480}', 0, 0);
  ctx.restore();

  // Titulo com glow
  const glowColor = r === 'win' ? '#f1c40f' : r === 'draw' ? '#bdc3c7' : '#e74c3c';
  ctx.shadowColor = glowColor; ctx.shadowBlur = 18;
  ctx.fillStyle = glowColor; ctx.font = 'bold 36px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(r === 'win' ? 'VITORIA!' : r === 'draw' ? 'EMPATE!' : 'DERROTA!', W/2, H/2);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#999'; ctx.font = '15px Arial';
  ctx.fillText('indo para resultado\u2026', W/2, H/2 + 45);
}
