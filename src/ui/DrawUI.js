// ════════════════════════════════════════════════════════════
//  DrawUI.js — P1 UI, P2 UI, HUD, Deploy Zone, Battle Over
// ════════════════════════════════════════════════════════════
import { W, H, ARENA_TOP, ARENA_BOT, ARENA_H, P1_UI_H, P2_UI_H, RIVER_Y } from '../config/constants.js';
import { CARDS } from '../config/cards.js';
import { drawCharacter } from './CharacterRenderer.js';

export function drawP1UI(ctx, G, mouseX, mouseY, getCardLevel, soundMuted) {
  // Fundo
  ctx.fillStyle='#08080f';ctx.fillRect(0,ARENA_BOT,W,P1_UI_H);
  // Elixir
  const EW=W-20,EH=20,EX=10,EY=ARENA_BOT+7;
  ctx.fillStyle='#12082a';ctx.beginPath();ctx.roundRect(EX,EY,EW,EH,5);ctx.fill();
  ctx.strokeStyle='rgba(155,89,182,.3)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(EX,EY,EW,EH,5);ctx.stroke();
  for(let i=0;i<10;i++){
    const seg=(EW-2)/10-1,sx=EX+1+i*(seg+1);
    const filled=G.p1Elixir>=i+1,part=!filled&&G.p1Elixir>i;
    if(filled){ctx.shadowColor='#b06ad4';ctx.shadowBlur=8;}else ctx.shadowBlur=0;
    ctx.fillStyle=filled?'#9b59b6':part?`rgba(155,89,182,${G.p1Elixir-i})`:'#2c1654';
    ctx.beginPath();ctx.roundRect(sx,EY+1,seg,EH-2,2);ctx.fill();
    // shine no segmento preenchido
    if(filled){ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.roundRect(sx,EY+1,seg,EH/2-1,2);ctx.fill();}
  }
  ctx.shadowBlur=0;
  ctx.fillStyle='#d7bde2';ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(`\u26a1 ${Math.floor(G.p1Elixir)}`,W/2,EY+EH+3);
  // Cartas
  const CW=84,CH=74,CS=5,total=4*CW+3*CS,CX0=(W-total)/2,CY=ARENA_BOT+36;
  G.p1Hand.forEach((key,i)=>{
    const d=CARDS[key];if(!d)return;
    const cx=CX0+i*(CW+CS),sel=G.p1Sel===i,can=G.p1Elixir>=d.cost,lvl=getCardLevel(key);
    if(sel){ctx.shadowColor='#f39c12';ctx.shadowBlur=18;}
    else if(can){ctx.shadowColor='#3498db';ctx.shadowBlur=6;}
    ctx.fillStyle=sel?'#b7770d':can?'#1a2535':'#101620';
    ctx.strokeStyle=sel?'#f5b041':can?'#2e86c1':'#333';ctx.lineWidth=sel?3:1.5;
    ctx.beginPath();ctx.roundRect(cx,CY,CW,CH,8);ctx.fill();ctx.stroke();
    ctx.shadowBlur=0;
    // Linha de brilho no topo do card
    if(can){ctx.fillStyle=sel?'rgba(255,200,50,.22)':'rgba(52,152,219,.12)';ctx.beginPath();ctx.roundRect(cx+2,CY+2,CW-4,10,4);ctx.fill();}
    ctx.globalAlpha=can?1:.4;
    // Mini personagem no card (substituindo emoji)
    drawCharacter(ctx, cx+CW/2, CY+24, key, 'player', 12);
    ctx.globalAlpha=1;
    const fs=d.name.length>10?7:d.name.length>7?8:9;ctx.fillStyle=can?'#ecf0f1':'#555';ctx.font=`${fs}px Arial`;ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(d.name,cx+CW/2,CY+46);
    ctx.fillStyle='#6c3483';ctx.beginPath();ctx.arc(cx+CW-13,CY+13,11,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e8daef';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(d.cost,cx+CW-13,CY+13);
    // Nivel badge
    if(lvl>1){ctx.fillStyle='#f1c40f';ctx.beginPath();ctx.arc(cx+12,CY+13,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#000';ctx.font='bold 8px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('Lv'+lvl,cx+12,CY+13);}
  });
  // Mute button
  ctx.fillStyle='rgba(255,255,255,.1)';ctx.beginPath();ctx.roundRect(W-38,ARENA_BOT+5,30,22,5);ctx.fill();ctx.font='14px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(soundMuted?'\u{1F507}':'\u{1F50A}',W-23,ARENA_BOT+16);
}

export function drawP2UI(ctx, G, mode, opponentName) {
  // P2 / AI info bar at top
  ctx.fillStyle='#0a080e';ctx.fillRect(0,0,W,P2_UI_H);
  ctx.strokeStyle='#222';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,P2_UI_H);ctx.lineTo(W,P2_UI_H);ctx.stroke();
  // Solo/online — mostrar elixir do inimigo/oponente
  const _p2label=mode==='online'?('\u{1F310} '+(opponentName||'Oponente')):'\u{1F916} INIMIGO IA';
  ctx.fillStyle='#333';ctx.font='bold 11px Arial';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(_p2label,10,P2_UI_H/2);
  const EW=100,EH=12,EX=W-EW-10,EY=(P2_UI_H-EH)/2;
  ctx.fillStyle='#1a0d2e';ctx.fillRect(EX,EY,EW,EH);
  for(let i=0;i<10;i++){const seg=(EW-2)/10-1,sx=EX+1+i*(seg+1);ctx.fillStyle=G.p2Elixir>=i+1?'#c0392b':'#2c0808';ctx.fillRect(sx,EY+1,seg,EH-2);}
  ctx.fillStyle='#f1948a';ctx.font='10px Arial';ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillText(`\u26a1${Math.floor(G.p2Elixir)}`,EX-4,P2_UI_H/2);
}

export function drawHUD(ctx, G, mode, currentDiff) {
  const m=Math.floor(G.time/60),s=Math.floor(G.time%60).toString().padStart(2,'0');
  const urgent=G.time<30&&Math.floor(Date.now()/500)%2;
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.beginPath();ctx.roundRect(W/2-40,ARENA_TOP+4,80,26,6);ctx.fill();
  ctx.fillStyle=urgent?'#e74c3c':'#ecf0f1';ctx.font='bold 16px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(`${m}:${s}`,W/2,ARENA_TOP+17);
  // Badge de dificuldade (modo solo)
  if(mode==='solo'){
    const dl=currentDiff.label||'Medio';
    ctx.fillStyle='rgba(0,0,0,.5)';ctx.beginPath();ctx.roundRect(4,ARENA_TOP+4,70,18,5);ctx.fill();
    ctx.fillStyle='#f1c40f';ctx.font='9px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(dl,39,ARENA_TOP+13);
  }
  // Botao sair canto inferior esquerdo da arena — todos os modos
  ctx.fillStyle='rgba(180,30,30,.8)';ctx.beginPath();ctx.roundRect(4,ARENA_BOT-26,28,22,5);ctx.fill();
  ctx.font='14px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('\u{1F3F3}\uFE0F',18,ARENA_BOT-15);
  // Confirmacao de desistencia
  if(G.showForfeitConfirm){
    ctx.fillStyle='rgba(0,0,0,.88)';ctx.beginPath();ctx.roundRect(W/2-130,H/2-60,260,120,12);ctx.fill();
    ctx.strokeStyle='#e74c3c';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(W/2-130,H/2-60,260,120,12);ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='bold 14px Arial';ctx.textAlign='center';ctx.textBaseline='top';
    ctx.fillText('Desistir da partida?',W/2,H/2-48);
    ctx.fillStyle='#bbb';ctx.font='11px Arial';
    ctx.fillText('Seu adversario leva a vitoria',W/2,H/2-26);
    ctx.fillText('mas nao ganha diamantes.',W/2,H/2-10);
    // Botao Confirmar
    ctx.fillStyle='#c0392b';ctx.beginPath();ctx.roundRect(W/2-115,H/2+14,105,32,8);ctx.fill();
    ctx.fillStyle='#fff';ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('\u2714 Confirmar',W/2-62,H/2+30);
    // Botao Cancelar
    ctx.fillStyle='#2c3e50';ctx.beginPath();ctx.roundRect(W/2+10,H/2+14,105,32,8);ctx.fill();
    ctx.fillStyle='#fff';ctx.fillText('\u2717 Cancelar',W/2+62,H/2+30);
  }
  // Tooltip da carta selecionada
  if(G.p1Sel!==null&&!G.showForfeitConfirm){
    const d=CARDS[G.p1Hand[G.p1Sel]];
    ctx.fillStyle='rgba(0,0,0,.7)';ctx.beginPath();ctx.roundRect(8,ARENA_BOT-30,W-16,26,5);ctx.fill();
    ctx.fillStyle='#ecf0f1';ctx.font='10px Arial';ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.fillText(`${d.emoji} ${d.name}: ${d.desc}`,14,ARENA_BOT-17);
  }
}

export function drawDeployZone(ctx, G, mouseX, mouseY) {
  if(G.p1Sel===null)return;
  const key=G.p1Hand[G.p1Sel];const d=CARDS[key];
  const zoneTop=RIVER_Y-28;
  const zoneH=ARENA_BOT-RIVER_Y+28;
  ctx.strokeStyle='rgba(52,152,219,.5)';ctx.lineWidth=2;ctx.setLineDash([6,4]);
  ctx.strokeRect(8,zoneTop,W-16,zoneH);ctx.setLineDash([]);
  ctx.fillStyle='rgba(52,152,219,.06)';ctx.fillRect(8,zoneTop,W-16,zoneH);
  const inZone=(mouseY>=zoneTop&&mouseY<=ARENA_BOT);
  if(inZone){
    if(d.type==='spell'){ctx.strokeStyle='rgba(255,80,0,.85)';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.beginPath();ctx.arc(mouseX,mouseY,d.aoe,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='rgba(255,60,0,.12)';ctx.fill();}
    else{ctx.globalAlpha=.55;ctx.fillStyle=d.color;ctx.beginPath();ctx.arc(mouseX,mouseY,14,0,Math.PI*2);ctx.fill();ctx.font='14px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(d.emoji,mouseX,mouseY);ctx.globalAlpha=1;}
  }
}

export function drawBattleOver(ctx, G, opponentName) {
  const r=G.phase;if(r==='playing')return;
  ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(0,0,W,H);
  if(G._dcBanner){
    ctx.font='40px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('\u{1F4E1}',W/2,H/2-55);
    ctx.fillStyle='#f1c40f';ctx.font='bold 22px Arial';ctx.fillText('VITORIA!',W/2,H/2-10);
    ctx.fillStyle='#aaa';ctx.font='14px Arial';ctx.fillText(opponentName+' desconectou \u2014 W.O.',W/2,H/2+24);
    ctx.fillStyle='#00e5ff';ctx.font='13px Arial';ctx.fillText('+2 \u{1F48E}  por W.O.',W/2,H/2+48);
    return;
  }
  ctx.font='56px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(r==='win'?'\u{1F3C6}':r==='draw'?'\u{1F91D}':'\u{1F480}',W/2,H/2-65);
  ctx.fillStyle=r==='win'?'#f1c40f':r==='draw'?'#bdc3c7':'#e74c3c';ctx.font='bold 34px Arial';ctx.fillText(r==='win'?'VITORIA!':r==='draw'?'EMPATE!':'DERROTA!',W/2,H/2);
  ctx.fillStyle='#bdc3c7';ctx.font='15px Arial';ctx.fillText('indo para resultado\u2026',W/2,H/2+45);
}
