// ════════════════════════════════════════════════════════════
//  DrawScreens.js — Menu, DeckSelect, Tutorial, Result, Ranking, Shop
//  MELHORADO: glow, particulas, gradientes ricos, animacoes
// ════════════════════════════════════════════════════════════
import { W, H, TUT_STEPS } from '../config/constants.js';
import { CARDS, SHOP_CARD_KEYS, BASE_KEYS } from '../config/cards.js';
import { drawCharacter } from './CharacterRenderer.js';

// ══════════════════════════════════════════════════════════
//  MENU PRINCIPAL — glow dourado, particulas, botoes ricos
// ══════════════════════════════════════════════════════════
export function drawMenu(ctx, APP, mouseX, mouseY, soundMuted, currentDiff, menuBtn) {
  menuBtn.length = 0;
  const t = Date.now() * .0005;

  // Fundo gradiente animado com cores mais ricas
  const g1 = ctx.createRadialGradient(W/2 + Math.sin(t)*40, H/2 + Math.cos(t)*25, 30, W/2, H/2, 380);
  g1.addColorStop(0, '#1f1050');
  g1.addColorStop(0.5, '#120a30');
  g1.addColorStop(1, '#050510');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  // Particulas flutuantes douradas
  for (let i = 0; i < 40; i++) {
    const px = (Math.sin(i * 127.1 + t * 0.3) * 0.5 + 0.5) * W;
    const py = (Math.sin(i * 311.7 + t * 0.2) * 0.5 + 0.5) * H;
    const pr = 0.6 + Math.sin(t * 2.5 + i) * 0.4;
    const pa = 0.15 + Math.sin(t * 1.8 + i * 2) * 0.1;
    ctx.fillStyle = `rgba(241,196,15,${pa})`;
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
  }

  // Estrelas cintilantes
  for (let i = 0; i < 60; i++) {
    const sx = Math.sin(i * 127.1) * W * .5 + W * .5;
    const sy = Math.sin(i * 311.7) * H * .5 + H * .5;
    const sr = .4 + Math.sin(t * 3 + i) * .35;
    const sa = 0.3 + Math.sin(t * 2 + i) * 0.3;
    ctx.fillStyle = `rgba(255,255,255,${sa})`;
    ctx.beginPath(); ctx.arc(sx, sy, Math.max(0.2, sr), 0, Math.PI * 2); ctx.fill();
  }

  // Espada com glow forte pulsante
  const swordGlow = 15 + Math.sin(t * 4) * 8;
  ctx.font = 'bold 48px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = swordGlow;
  ctx.fillStyle = '#f1c40f';
  ctx.fillText('\u2694\uFE0F', W/2, 75);
  ctx.fillText('\u2694\uFE0F', W/2, 75); // double pass for stronger glow
  ctx.shadowBlur = 0;

  // Titulo com outline + glow dourado
  ctx.font = 'bold 30px Arial';
  // Glow layer
  ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 20;
  ctx.fillStyle = '#f1c40f';
  ctx.fillText('CLASH QUEBRADA', W/2, 125);
  ctx.shadowBlur = 0;
  // Outline escuro
  ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
  ctx.strokeText('CLASH QUEBRADA', W/2, 125);
  // Texto branco principal
  ctx.fillStyle = '#fff';
  ctx.fillText('CLASH QUEBRADA', W/2, 125);

  // Subtitulo
  ctx.fillStyle = '#b8860b'; ctx.font = 'italic 13px Arial';
  ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 6;
  ctx.fillText(`Ola, ${APP.account?.name || 'Guerreiro'}! \u{1F44B}`, W/2, 152);
  ctx.shadowBlur = 0;

  // Trofeus com glow
  ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 8;
  ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 18px Arial';
  ctx.fillText(`\u{1F3C6} ${APP.progress.trophies} trofeus`, W/2, 175);
  ctx.shadowBlur = 0;

  // Diamantes com glow cyan
  ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 6;
  ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 14px Arial';
  ctx.fillText(`\u{1F48E} ${APP.progress.diamonds || 0} diamantes`, W/2, 197);
  ctx.shadowBlur = 0;

  // Stats
  ctx.fillStyle = '#777'; ctx.font = '12px Arial';
  ctx.fillText(`${APP.progress.wins}V  ${APP.progress.losses}D  ${APP.progress.draws}E`, W/2, 215);

  // Botoes com gradiente, borda glow, hover
  const btns = [
    { label: '\u2694\uFE0F  Jogar Solo',              color: '#e67e22', hover: '#f39c12', glow: '#e67e22', id: 0 },
    { label: '\u{1F3DF}\uFE0F  Sala de Desafios',     color: '#27ae60', hover: '#2ecc71', glow: '#27ae60', id: 2 },
    { label: '\u{1F0CF}  Meu Deck',                    color: '#8e44ad', hover: '#ab47bc', glow: '#8e44ad', id: 3 },
    { label: '\u{1F3C6}  Ranking',                     color: '#16a085', hover: '#1abc9c', glow: '#16a085', id: 4 },
    { label: '\u{1F48E}  Loja',                        color: '#9b59b6', hover: '#c39bd3', glow: '#9b59b6', id: 5 },
    ...(APP.isAdmin ? [{ label: '\u2699\uFE0F  Admin  [' + (currentDiff.label || 'Medio') + ']', color: '#922b21', hover: '#c0392b', glow: '#e74c3c', id: 6 }] : []),
  ];

  btns.forEach((b, i) => {
    const bx = W/2 - 135, by = 230 + i * 58, bw = 270, bh = 48;
    const isHover = mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh;

    // Sombra do botao
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.roundRect(bx + 3, by + 3, bw, bh, 14); ctx.fill();

    // Gradiente do botao
    const bg = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    bg.addColorStop(0, isHover ? b.hover : b.color);
    bg.addColorStop(0.6, isHover ? b.color : _darken(b.color, 0.3));
    bg.addColorStop(1, _darken(b.color, 0.5));
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 14); ctx.fill();

    // Shine no topo
    const sg = ctx.createLinearGradient(bx, by, bx, by + bh * 0.45);
    sg.addColorStop(0, 'rgba(255,255,255,.25)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.roundRect(bx + 2, by + 1, bw - 4, bh * 0.45, 12); ctx.fill();

    // Borda
    if (isHover) {
      ctx.shadowColor = b.glow; ctx.shadowBlur = 12;
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
    }
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 14); ctx.stroke();
    ctx.shadowBlur = 0;

    // Texto com sombra
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 3;
    ctx.fillText(b.label, W/2, by + bh / 2);
    ctx.shadowBlur = 0;

    menuBtn.push({ x: bx, y: by, w: bw, h: bh, id: b.id });
  });

  // Footer mute com estilo
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.beginPath(); ctx.roundRect(W/2 - 40, H - 42, 80, 30, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(W/2 - 40, H - 42, 80, 30, 10); ctx.stroke();
  ctx.font = '15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#aaa';
  ctx.fillText(soundMuted ? '\u{1F507} Mudo' : '\u{1F50A} Som', W/2, H - 27);
  menuBtn.push({ x: W/2 - 40, y: H - 42, w: 80, h: 30, id: 99 });
}

// ══════════════════════════════════════════════════════════
//  DECK SELECT — melhorado com preview de personagem
// ══════════════════════════════════════════════════════════
export function drawDeckSelect(ctx, APP, mouseX, mouseY, getAllKeys, getCardLevel, deckBtn) {
  deckBtn.length = 0;

  // Fundo
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0a0a20'); bg.addColorStop(1, '#060612');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Titulo
  ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 10;
  ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('\u{1F0CF} Monte Seu Deck', W/2, 14);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#aaa'; ctx.font = '13px Arial';
  ctx.fillText(`Escolha 8 cartas \u2022 Tempo: ${APP.deckTimer}s \u2022 ${APP.tmpDeck.length}/8`, W/2, 42);

  // Timer badge
  const tRatio = APP.deckTimer >= 9999 ? 1 : APP.deckTimer / 30;
  const rx = W - 38, ry = 55, rr = 22;
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.stroke();
  const timerColor = tRatio > .5 ? '#27ae60' : tRatio > .25 ? '#f39c12' : '#e74c3c';
  ctx.strokeStyle = timerColor; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(rx, ry, rr, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * tRatio, false); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(APP.deckTimer >= 9999 ? '\u221E' : APP.deckTimer, rx, ry);

  // Grid de cartas
  const cols = 4, CW = 88, CH = 76, GAP = 6;
  const totalW = cols * CW + (cols - 1) * GAP, startX = (W - totalW) / 2, startY = 68;
  const displayKeys = getAllKeys();
  let hoveredCard = null;

  displayKeys.forEach((key, i) => {
    const d = CARDS[key]; if (!d) return;
    const col = i % cols, row = Math.floor(i / cols);
    const cx = startX + col * (CW + GAP), cy = startY + row * (CH + GAP);
    const isOwned = APP.progress.owned && APP.progress.owned.includes(key);
    const isLocked = d.locked && !isOwned;
    const sel = APP.tmpDeck.includes(key), lvl = getCardLevel(key);
    if (mouseX >= cx && mouseX <= cx + CW && mouseY >= cy && mouseY <= cy + CH) hoveredCard = key;

    // Card background com gradiente
    const cardBg = ctx.createLinearGradient(cx, cy, cx, cy + CH);
    if (isLocked) { cardBg.addColorStop(0, '#0d0d16'); cardBg.addColorStop(1, '#080810'); }
    else if (sel) { cardBg.addColorStop(0, '#1a3a1a'); cardBg.addColorStop(1, '#0d1f0d'); }
    else { cardBg.addColorStop(0, '#18182a'); cardBg.addColorStop(1, '#0e0e1a'); }
    ctx.fillStyle = cardBg;

    if (sel) { ctx.shadowColor = '#27ae60'; ctx.shadowBlur = 8; }
    ctx.strokeStyle = isLocked ? '#1a1a2a' : sel ? '#27ae60' : '#2a2a3a'; ctx.lineWidth = sel ? 2.5 : 1;
    ctx.beginPath(); ctx.roundRect(cx, cy, CW, CH, 8); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    if (sel) { ctx.fillStyle = 'rgba(39,174,96,.1)'; ctx.beginPath(); ctx.roundRect(cx, cy, CW, CH, 8); ctx.fill(); }

    // Personagem mini (em vez de emoji)
    ctx.globalAlpha = isLocked ? .25 : (sel ? 1 : .85);
    drawCharacter(ctx, cx + CW/2, cy + 22, key, 'player', 10);
    ctx.globalAlpha = 1;

    // Nome
    const fs = d.name.length > 10 ? 6.5 : 7.5;
    ctx.fillStyle = isLocked ? '#444' : '#ccc'; ctx.font = `${fs}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(d.name, cx + CW/2, cy + 38);

    // Custo badge
    ctx.fillStyle = '#6c3483'; ctx.beginPath(); ctx.arc(cx + 11, cy + 11, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(d.cost, cx + 11, cy + 11);

    // Level badge
    if (lvl > 1 && !isLocked) {
      ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(cx + CW - 11, cy + 11, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.font = 'bold 7px Arial'; ctx.fillText('Lv' + lvl, cx + CW - 11, cy + 11);
    }

    // Check mark
    if (sel) {
      ctx.fillStyle = '#2ecc71'; ctx.font = '16px Arial'; ctx.fillText('\u2713', cx + CW - 14, cy + CH - 14);
    }

    // Lock
    if (isLocked) {
      ctx.font = '16px Arial'; ctx.fillText('\u{1F512}', cx + CW/2, cy + CH/2);
    }

    if (!isLocked) deckBtn.push({ x: cx, y: cy, w: CW, h: CH, key });
  });

  // Confirm button
  const rdy = APP.tmpDeck.length >= 1;
  const bx = W/2 - 110, by = H - 50, bw = 220, bh = 40;
  if (rdy) { ctx.shadowColor = '#27ae60'; ctx.shadowBlur = 8; }
  ctx.fillStyle = rdy ? '#27ae60' : '#333';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 12); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = rdy ? 'rgba(46,204,113,.4)' : '#222'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 12); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(rdy ? `Confirmar (${APP.tmpDeck.length}/8)` : 'Selecione cartas', W/2, by + bh/2);
  deckBtn.push({ x: bx, y: by, w: bw, h: bh, key: '__confirm' });

  // Tooltip
  if (hoveredCard) {
    const d = CARDS[hoveredCard];
    const isOwned = APP.progress.owned && APP.progress.owned.includes(hoveredCard);
    const isLocked = d.locked && !isOwned;
    ctx.fillStyle = 'rgba(0,0,0,.92)'; ctx.beginPath(); ctx.roundRect(4, H - 78, W - 8, 75, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(241,196,15,.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(4, H - 78, W - 8, 75, 8); ctx.stroke();
    ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(`${d.emoji} ${d.name}  \u2022  Custo: ${d.cost}\u{1F49C}`, W/2, H - 74);
    if (d.type === 'spell') {
      ctx.fillStyle = '#aaa'; ctx.font = '11px Arial';
      ctx.fillText(`\u{1F4A5} DMG:${d.dmg}  \u{1F4CF} AOE:${d.aoe}`, W/2, H - 54);
    } else {
      ctx.fillStyle = '#aaa'; ctx.font = '11px Arial';
      ctx.fillText(`\u2764\uFE0F${d.hp}  \u2694\uFE0F${d.dmg}  \u{1F4A8}${Math.round(d.spd)}  \u{1F4CF}${d.range}`, W/2, H - 54);
    }
    ctx.fillStyle = isLocked ? '#e74c3c' : '#bbb'; ctx.font = '12px Arial';
    ctx.fillText(isLocked ? '\u{1F512} Disponivel na Loja' : d.desc, W/2, H - 32);
  }
}

// ══════════════════════════════════════════════════════════
//  TUTORIAL — melhorado com gradiente e glow
// ══════════════════════════════════════════════════════════
export function drawTutorial(ctx, APP) {
  // Fundo escuro com gradiente sutil
  const tbg = ctx.createRadialGradient(W/2, H/2, 50, W/2, H/2, 400);
  tbg.addColorStop(0, 'rgba(13,27,46,.95)'); tbg.addColorStop(1, 'rgba(0,0,0,.95)');
  ctx.fillStyle = tbg; ctx.fillRect(0, 0, W, H);

  const s = TUT_STEPS[APP.tutStep];
  const bx = 20, by = H/2 - 160, bw = W - 40, bh = 320;

  // Modal com gradiente
  const mbg = ctx.createLinearGradient(bx, by, bx, by + bh);
  mbg.addColorStop(0, '#0f2240'); mbg.addColorStop(1, '#0a1528');
  ctx.fillStyle = mbg;
  ctx.shadowColor = '#3498db'; ctx.shadowBlur = 15;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 16); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#3498db'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 16); ctx.stroke();

  // Emoji grande
  ctx.font = '60px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(s.emoji, W/2, by + 80);

  // Titulo com glow
  ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 8;
  ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 20px Arial'; ctx.textBaseline = 'top';
  ctx.fillText(s.title, W/2, by + 130);
  ctx.shadowBlur = 0;

  // Body text
  ctx.fillStyle = '#ccc'; ctx.font = '14px Arial';
  const words = s.body.split(' '); let line = '', lineY = by + 168;
  words.forEach(w => {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > bw - 40 && line) {
      ctx.fillText(line.trim(), W/2, lineY); line = w + ' '; lineY += 22;
    } else line = test;
  });
  ctx.fillText(line.trim(), W/2, lineY);

  // Paginacao com glow
  for (let i = 0; i < TUT_STEPS.length; i++) {
    const active = i === APP.tutStep;
    if (active) { ctx.shadowColor = '#3498db'; ctx.shadowBlur = 6; }
    ctx.fillStyle = active ? '#3498db' : '#333';
    ctx.beginPath(); ctx.arc(W/2 + (i - 2.5) * 20, by + bh - 28, active ? 6 : 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Botao com gradiente
  const bbx = W/2 - 90, bby = by + bh - 60, bbw = 180, bbh = 40;
  const bbg = ctx.createLinearGradient(bbx, bby, bbx + bbw, bby + bbh);
  bbg.addColorStop(0, '#2980b9'); bbg.addColorStop(1, '#1a5276');
  ctx.fillStyle = bbg;
  ctx.beginPath(); ctx.roundRect(bbx, bby, bbw, bbh, 10); ctx.fill();
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,.15)';
  ctx.beginPath(); ctx.roundRect(bbx + 2, bby + 1, bbw - 4, bbh * 0.4, 8); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(APP.tutStep < TUT_STEPS.length - 1 ? 'Proximo \u2192' : 'Batalhar! \u2694\uFE0F', W/2, bby + bbh/2);
}

// ══════════════════════════════════════════════════════════
//  RESULTADO — confetti na vitoria, animacao de trofeu
// ══════════════════════════════════════════════════════════
export function drawResult(ctx, APP, G, wasOnline, opponentName, rematchPending) {
  const r = APP.battleResult;
  const isOnline = wasOnline || APP.mode === 'online';
  const myName = APP.account?.name || 'Voce';
  const oppName = isOnline ? opponentName : 'IA';
  const winName = r === 'win' ? myName : r === 'lose' ? oppName : null;
  const loseName = r === 'win' ? oppName : r === 'lose' ? myName : null;
  const t = Date.now() * 0.001;

  // Fundo gradiente
  const g = ctx.createLinearGradient(0, 0, W, H);
  if (r === 'win') { g.addColorStop(0, '#0a2a12'); g.addColorStop(0.5, '#071a0e'); g.addColorStop(1, '#050510'); }
  else if (r === 'draw') { g.addColorStop(0, '#0a0a20'); g.addColorStop(1, '#060610'); }
  else { g.addColorStop(0, '#2a0a0a'); g.addColorStop(0.5, '#1a0707'); g.addColorStop(1, '#050510'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // Confetti na vitoria
  if (r === 'win') {
    for (let i = 0; i < 30; i++) {
      const cx = (Math.sin(i * 73.1 + t * 0.5) * 0.5 + 0.5) * W;
      const cy = ((t * 30 + i * 23) % (H + 20)) - 10;
      const colors = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#e67e22'];
      ctx.fillStyle = colors[i % colors.length];
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(t * 2 + i);
      ctx.fillRect(-3, -1.5, 6, 3);
      ctx.restore();
    }
  }

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  if (r === 'draw') {
    ctx.font = '64px Arial'; ctx.fillText('\u{1F91D}', W/2, 85);
    ctx.shadowColor = '#bdc3c7'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#bdc3c7'; ctx.font = 'bold 34px Arial'; ctx.fillText('EMPATE!', W/2, 148);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.roundRect(W/2 - 130, 170, 260, 30, 8); ctx.fill();
    ctx.fillStyle = '#aaa'; ctx.font = '14px Arial'; ctx.fillText(myName + ' \u2694\uFE0F ' + oppName, W/2, 185);
  } else {
    // Trofeu com glow pulsante
    const trophyGlow = 15 + Math.sin(t * 3) * 10;
    ctx.shadowColor = r === 'win' ? '#f1c40f' : '#e74c3c'; ctx.shadowBlur = trophyGlow;
    ctx.font = '62px Arial'; ctx.fillText(r === 'win' ? '\u{1F3C6}' : '\u{1F480}', W/2, 78);
    ctx.shadowBlur = 0;

    // Faixa de vencedor
    const wg = ctx.createLinearGradient(0, 100, W, 140);
    wg.addColorStop(0, 'rgba(241,196,15,0)'); wg.addColorStop(.3, 'rgba(241,196,15,.2)');
    wg.addColorStop(.7, 'rgba(241,196,15,.2)'); wg.addColorStop(1, 'rgba(241,196,15,0)');
    ctx.fillStyle = wg; ctx.fillRect(0, 100, W, 40);

    ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 13px Arial'; ctx.textBaseline = 'top';
    ctx.fillText('\u{1F3C6}  VENCEDOR', W/2, 104);
    ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 32px Arial'; ctx.textBaseline = 'middle';
    ctx.fillText(winName, W/2, 150);
    ctx.shadowBlur = 0;

    // Derrotado
    ctx.fillStyle = 'rgba(231,76,60,.12)'; ctx.beginPath(); ctx.roundRect(W/2 - 130, 174, 260, 38, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(231,76,60,.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(W/2 - 130, 174, 260, 38, 8); ctx.stroke();
    ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 12px Arial'; ctx.textBaseline = 'top';
    ctx.fillText('\u{1F480}  DERROTADO', W/2, 178);
    ctx.fillStyle = '#888'; ctx.font = 'bold 15px Arial'; ctx.textBaseline = 'middle';
    ctx.fillText(loseName, W/2, 202);
  }

  // Stats panel
  const statsY = 228;
  const tChange = r === 'win' ? +30 : r === 'draw' ? +5 : -20;
  ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.beginPath(); ctx.roundRect(W/2 - 140, statsY - 6, 280, 92, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(W/2 - 140, statsY - 6, 280, 92, 10); ctx.stroke();

  ctx.fillStyle = r === 'win' ? '#2ecc71' : r === 'draw' ? '#bdc3c7' : '#e74c3c';
  ctx.font = 'bold 15px Arial'; ctx.textBaseline = 'middle';
  ctx.fillText(`\u{1F3C6} ${APP.progress.trophies} trofeus  (${tChange > 0 ? '+' : ''}${tChange})`, W/2, statsY + 12);
  ctx.fillStyle = '#aaa'; ctx.font = '12px Arial';
  ctx.fillText(`${APP.progress.wins}V  ${APP.progress.losses}D  ${APP.progress.draws}E`, W/2, statsY + 34);
  ctx.fillStyle = '#f1c40f'; ctx.font = '12px Arial';
  ctx.fillText(`+${r === 'win' ? 25 : r === 'draw' ? 12 : 10} XP`, W/2, statsY + 54);
  const earnedD = G.earnedDiamonds || 0;
  if (earnedD > 0) {
    ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 5;
    ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 13px Arial';
    ctx.fillText(`\u{1F48E} +${earnedD} diamantes! (Total: ${APP.progress.diamonds || 0})`, W/2, statsY + 74);
    ctx.shadowBlur = 0;
  }

  // Botoes
  const btnY = statsY + 100;
  if (isOnline) {
    if (rematchPending) {
      ctx.fillStyle = 'rgba(241,196,15,.08)'; ctx.beginPath(); ctx.roundRect(W/2 - 110, btnY, 220, 48, 12); ctx.fill();
      ctx.strokeStyle = 'rgba(241,196,15,.3)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(W/2 - 110, btnY, 220, 48, 12); ctx.stroke();
      const dots = '.'.repeat(Math.floor(Date.now() / 400) % 4);
      ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 13px Arial'; ctx.textBaseline = 'middle';
      ctx.fillText('\u23F3 Aguardando ' + opponentName + dots, W/2, btnY + 24);
      _drawStyledBtn(ctx, W/2 - 110, btnY + 58, 220, 44, '#c0392b', '\u{1F6AA} Cancelar e Sair');
    } else {
      _drawStyledBtn(ctx, W/2 - 110, btnY, 220, 48, '#e67e22', '\u{1F504} Revanche!');
      _drawStyledBtn(ctx, W/2 - 110, btnY + 58, 220, 44, '#2c3e50', '\u{1F6AA} Sair da Sala');
    }
  } else {
    _drawStyledBtn(ctx, W/2 - 110, btnY, 220, 50, '#e67e22', '\u2694\uFE0F Jogar Novamente');
    _drawStyledBtn(ctx, W/2 - 110, btnY + 60, 220, 50, '#2980b9', '\u{1F3E0} Menu Principal');
  }
}

// ══════════════════════════════════════════════════════════
//  RANKING — medalhas, highlight, gradiente
// ══════════════════════════════════════════════════════════
export function drawRanking(ctx, APP, rkOnline, rkLoading) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0a0a1a'); bg.addColorStop(1, '#050510');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 10;
  ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('\u{1F3C6} Ranking Global', W/2, 14);
  ctx.shadowBlur = 0;

  const rkStatus = rkLoading ? '\u{1F504} carregando...' : rkOnline ? '\u{1F310} Firebase \u00b7 ao vivo' : '\u{1F4F4} offline';
  ctx.fillStyle = rkOnline ? '#27ae60' : rkLoading ? '#f39c12' : '#666'; ctx.font = '12px Arial';
  ctx.fillText(rkStatus, W/2, 44);

  const list = APP.ranking.length ? APP.ranking : [{ name: 'Nenhum jogador ainda', trophies: 0, wins: 0 }];
  list.slice(0, 12).forEach((p, i) => {
    const by = 70 + i * 48, isME = p.id === APP.account?.id;
    const rowBg = ctx.createLinearGradient(12, by, W - 12, by);
    if (isME) { rowBg.addColorStop(0, 'rgba(241,196,15,.15)'); rowBg.addColorStop(1, 'rgba(241,196,15,.05)'); }
    else { rowBg.addColorStop(0, 'rgba(255,255,255,.04)'); rowBg.addColorStop(1, 'rgba(255,255,255,.01)'); }
    ctx.fillStyle = rowBg; ctx.beginPath(); ctx.roundRect(12, by, W - 24, 42, 8); ctx.fill();
    if (isME) { ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(12, by, W - 24, 42, 8); ctx.stroke(); }
    if (i < 3) { ctx.strokeStyle = ['#f1c40f', '#bdc3c7', '#cd7f32'][i]; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(12, by, W - 24, 42, 8); ctx.stroke(); }

    const medal = i === 0 ? '\u{1F947}' : i === 1 ? '\u{1F948}' : i === 2 ? '\u{1F949}' : `${i + 1}.`;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`${medal} ${p.name}`, 22, by + 21);
    ctx.fillStyle = '#f1c40f'; ctx.textAlign = 'right'; ctx.fillText(`\u{1F3C6} ${p.trophies}`, W - 20, by + 14);
    ctx.fillStyle = '#777'; ctx.font = '11px Arial'; ctx.fillText(`${p.wins || 0} vitorias`, W - 20, by + 30);
  });

  // Voltar
  _drawStyledBtn(ctx, W/2 - 80, H - 52, 160, 40, '#2980b9', '\u2190 Voltar');
}

// ══════════════════════════════════════════════════════════
//  LOJA — lendarios com borda animada, scroll
// ══════════════════════════════════════════════════════════
export function drawShop(ctx, APP, shopScrollY, shopBtn, mouseX, mouseY) {
  shopBtn.length = 0;
  const sg = ctx.createLinearGradient(0, 0, W, H);
  sg.addColorStop(0, '#0d0820'); sg.addColorStop(0.5, '#100a28'); sg.addColorStop(1, '#1a0830');
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);

  // Particulas
  for (let i = 0; i < 25; i++) {
    const sx = Math.sin(i * 137.5) * W * .5 + W * .5;
    const sy = Math.sin(i * 211.3) * H * .5 + H * .5;
    ctx.fillStyle = `rgba(180,100,255,${0.12 + Math.sin(Date.now() * .002 + i) * .1})`;
    ctx.beginPath(); ctx.arc(sx, sy, .7 + Math.sin(Date.now() * .003 + i) * .35, 0, Math.PI * 2); ctx.fill();
  }

  ctx.shadowColor = '#d7bde2'; ctx.shadowBlur = 8;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('\u{1F48E} Loja de Cartas', W/2, 10);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 13px Arial';
  ctx.fillText(`Seus diamantes: \u{1F48E} ${APP.progress.diamonds || 0}`, W/2, 38);

  const AREA_TOP = 58, AREA_BOT = H - 42;
  const cols = 4, CW = 90, CH = 111, GAP = 4;
  const totalW = cols * CW + (cols - 1) * GAP, startX = (W - totalW) / 2;
  const viewH = AREA_BOT - AREA_TOP;
  const rows = Math.ceil(SHOP_CARD_KEYS.length / cols);
  const totalContentH = rows * (CH + GAP);
  const maxScroll = Math.max(0, totalContentH - viewH);
  const clampedScroll = Math.max(0, Math.min(maxScroll, shopScrollY));

  ctx.save(); ctx.beginPath(); ctx.rect(0, AREA_TOP, W, viewH); ctx.clip();

  SHOP_CARD_KEYS.forEach((key, i) => {
    const d = CARDS[key]; if (!d) return;
    const col = i % cols, row = Math.floor(i / cols);
    const cx = startX + col * (CW + GAP);
    const cy = AREA_TOP + row * (CH + GAP) - clampedScroll;
    if (cy + CH < AREA_TOP - 2 || cy > AREA_BOT + 2) return;
    const owned = (APP.progress.owned || []).includes(key);
    const canBuy = !owned && (APP.progress.diamonds || 0) >= (d.shopCost || 0);
    const isLeg = !!d.legendary;

    // Card background
    if (isLeg) {
      const lg = ctx.createLinearGradient(cx, cy, cx + CW, cy + CH);
      lg.addColorStop(0, '#2a1800'); lg.addColorStop(0.5, '#1a0c00'); lg.addColorStop(1, '#2a1800');
      ctx.fillStyle = lg;
    } else ctx.fillStyle = owned ? '#142814' : canBuy ? '#1a0d2e' : '#0d0818';

    if (isLeg) {
      ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10;
    }
    ctx.strokeStyle = isLeg ? `hsl(${(Date.now() * .08) % 360},90%,58%)` : (owned ? '#27ae60' : canBuy ? '#8e44ad' : '#1a1a2a');
    ctx.lineWidth = isLeg ? 2.5 : (owned ? 1.5 : 1);
    ctx.beginPath(); ctx.roundRect(cx, cy, CW, CH, 7); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    // Emoji
    ctx.globalAlpha = (!owned && !canBuy && !isLeg) ? .35 : 1;
    ctx.font = isLeg ? '22px Arial' : '19px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(d.emoji, cx + CW/2, cy + 19); ctx.globalAlpha = 1;

    // Nome
    ctx.fillStyle = isLeg ? '#ffd700' : (owned ? '#2ecc71' : canBuy ? '#d7b8f5' : '#555');
    const nLen = d.name.length, nfs = nLen > 13 ? 6 : nLen > 10 ? 7 : 8.5;
    ctx.font = `bold ${nfs}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(d.name, cx + CW/2, cy + 36);

    if (isLeg) {
      ctx.fillStyle = 'rgba(255,200,0,0.15)'; ctx.beginPath(); ctx.roundRect(cx + 7, cy + 47, CW - 14, 11, 3); ctx.fill();
      ctx.fillStyle = '#ffd700'; ctx.font = 'bold 6px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('\u2B50 LENDARIO \u2B50', cx + CW/2, cy + 53);
    }

    const statY = isLeg ? 62 : 47;
    ctx.fillStyle = isLeg ? '#ffcc44' : '#666'; ctx.font = '6.5px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    if (d.hp) ctx.fillText(`\u2764\uFE0F${d.hp} \u2694\uFE0F${d.dmg} \u{1F4A8}${d.spd}`, cx + CW/2, cy + statY);
    ctx.fillStyle = isLeg ? '#ff9999' : '#9b9'; ctx.font = '6px Arial';
    ctx.fillText(`\u2728${d.cost} elixir`, cx + CW/2, cy + statY + 10);
    ctx.fillStyle = isLeg ? '#ffddaa' : '#777'; ctx.font = '6px Arial';
    const desc = d.desc.length > 24 ? d.desc.substr(0, 22) + '\u2026' : d.desc;
    ctx.fillText(desc, cx + CW/2, cy + statY + 20);

    const btnY = cy + CH - 21, btnH = 18;
    if (owned) {
      ctx.fillStyle = 'rgba(39,174,96,.25)'; ctx.beginPath(); ctx.roundRect(cx + 5, btnY, CW - 10, btnH, 4); ctx.fill();
      ctx.fillStyle = '#2ecc71'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('\u2705 Possuida', cx + CW/2, btnY + btnH/2);
    } else {
      ctx.fillStyle = isLeg ? (canBuy ? '#b8860b' : '#3a2200') : (canBuy ? '#7b2fbe' : '#252535');
      ctx.beginPath(); ctx.roundRect(cx + 5, btnY, CW - 10, btnH, 4); ctx.fill();
      ctx.fillStyle = canBuy ? '#fff' : '#444'; ctx.font = `bold ${isLeg ? 7 : 8}px Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${isLeg ? '\u{1F3AC} ' : ''}${d.shopCost}\u{1F48E}`, cx + CW/2, btnY + btnH/2);
      if (canBuy) shopBtn.push({ x: cx + 5, y: btnY, w: CW - 10, h: btnH, key });
    }
  });
  ctx.restore();

  // Scrollbar
  if (maxScroll > 0) {
    const frac = clampedScroll / maxScroll;
    const sbH = Math.max(20, viewH * (viewH / totalContentH));
    const sbY = AREA_TOP + (viewH - sbH) * frac;
    ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.beginPath(); ctx.roundRect(W - 6, AREA_TOP, 4, viewH, 2); ctx.fill();
    ctx.fillStyle = 'rgba(200,150,255,.5)'; ctx.beginPath(); ctx.roundRect(W - 6, sbY, 4, sbH, 2); ctx.fill();
  }

  // Voltar
  _drawStyledBtn(ctx, W/2 - 70, H - 39, 140, 32, '#2c3e50', '\u2190 Voltar');
  shopBtn.push({ x: W/2 - 70, y: H - 39, w: 140, h: 32, key: '__back' });
}

// ══════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════
function _drawStyledBtn(ctx, x, y, w, h, color, label) {
  const bg = ctx.createLinearGradient(x, y, x + w, y + h);
  bg.addColorStop(0, color); bg.addColorStop(1, _darken(color, 0.4));
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill();
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,.15)';
  ctx.beginPath(); ctx.roundRect(x + 2, y + 1, w - 4, h * 0.4, 10); ctx.fill();
  // Border
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.stroke();
  // Text
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w/2, y + h/2);
}

function _darken(hex, amt) {
  if (!hex || hex[0] !== '#') return hex;
  let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, Math.floor(r * (1 - amt))); g = Math.max(0, Math.floor(g * (1 - amt))); b = Math.max(0, Math.floor(b * (1 - amt)));
  return `rgb(${r},${g},${b})`;
}
