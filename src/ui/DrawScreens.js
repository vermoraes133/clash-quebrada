// ════════════════════════════════════════════════════════════
//  DrawScreens.js — Menu, DeckSelect, Tutorial, Result, Ranking, Shop
// ════════════════════════════════════════════════════════════
import { W, H, TUT_STEPS } from '../config/constants.js';
import { CARDS, SHOP_CARD_KEYS, BASE_KEYS } from '../config/cards.js';

// ── Menu Principal ────────────────────────────────────────
export function drawMenu(ctx, APP, mouseX, mouseY, soundMuted, currentDiff, menuBtn) {
  menuBtn.length = 0;
  // Fundo gradiente animado
  const t=Date.now()*.0005;
  const g1=ctx.createRadialGradient(W/2+Math.sin(t)*30,H/2+Math.cos(t)*20,50,W/2,H/2,350);
  g1.addColorStop(0,'#1a1040');g1.addColorStop(1,'#060610');
  ctx.fillStyle=g1;ctx.fillRect(0,0,W,H);
  // Estrelas
  ctx.fillStyle='rgba(255,255,255,.6)';
  for(let i=0;i<60;i++){const sx=Math.sin(i*127.1)*W*.5+W*.5,sy=Math.sin(i*311.7)*H*.5+H*.5,sr=.5+Math.sin(t*2+i)*.3;ctx.beginPath();ctx.arc(sx,sy,sr,0,Math.PI*2);ctx.fill();}
  // Logo
  ctx.font='bold 44px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#f1c40f';ctx.shadowColor='#f1c40f';ctx.shadowBlur=20;ctx.fillText('\u2694\uFE0F',W/2,80);ctx.shadowBlur=0;
  ctx.fillStyle='#fff';ctx.font='bold 28px Arial';ctx.fillText('CLASH QUEBRADA',W/2,128);
  ctx.fillStyle='#888';ctx.font='13px Arial';ctx.fillText(`Ola, ${APP.account?.name||'Guerreiro'}! \u{1F44B}`,W/2,155);
  // Trofeus e diamantes
  ctx.fillStyle='#f1c40f';ctx.font='bold 18px Arial';ctx.fillText(`\u{1F3C6} ${APP.progress.trophies} trofeus`,W/2,178);
  ctx.fillStyle='#00e5ff';ctx.font='bold 14px Arial';ctx.fillText(`\u{1F48E} ${APP.progress.diamonds||0} diamantes`,W/2,200);
  ctx.fillStyle='#888';ctx.font='12px Arial';ctx.fillText(`${APP.progress.wins}V  ${APP.progress.losses}D  ${APP.progress.draws}E`,W/2,218);

  const btns=[
    {label:'\u2694\uFE0F  Jogar Solo',    color:'#e67e22',hover:'#e74c3c', id:0},
    {label:'\u{1F3DF}\uFE0F  Sala de Desafios', color:'#27ae60',hover:'#2ecc71', id:2},
    {label:'\u{1F0CF}  Meu Deck',      color:'#8e44ad',hover:'#9b59b6', id:3},
    {label:'\u{1F3C6}  Ranking',       color:'#16a085',hover:'#1abc9c', id:4},
    {label:'\u{1F48E}  Loja',          color:'#8e44ad',hover:'#ab47bc', id:5},
    ...(APP.isAdmin?[{label:'\u2699\uFE0F  Admin  ['+(currentDiff.label||'Medio')+']', color:'#922b21',hover:'#c0392b', id:6}]:[]),
  ];
  btns.forEach((b,i)=>{
    const bx=W/2-130,by=232+i*60,bw=260,bh=48;
    const hover=mouseX>=bx&&mouseX<=bx+bw&&mouseY>=by&&mouseY<=by+bh;
    const g=ctx.createLinearGradient(bx,by,bx+bw,by+bh);
    g.addColorStop(0,hover?b.hover:b.color);g.addColorStop(1,hover?b.color:'rgba(0,0,0,.4)');
    ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(bx,by,bw,bh,12);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(bx,by,bw,bh,12);ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='bold 17px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(b.label,W/2,by+bh/2);
    menuBtn.push({x:bx,y:by,w:bw,h:bh,id:b.id});
  });
  // Footer mute
  ctx.fillStyle='rgba(255,255,255,.1)';ctx.beginPath();ctx.roundRect(W/2-30,H-40,60,28,8);ctx.fill();
  ctx.font='18px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(soundMuted?'\u{1F507} Mudo':'\u{1F50A} Som',W/2,H-26);
  menuBtn.push({x:W/2-30,y:H-40,w:60,h:28,id:99});
}

// ── Deck Select ───────────────────────────────────────────
export function drawDeckSelect(ctx, APP, mouseX, mouseY, getAllKeys, getCardLevel, deckBtn) {
  deckBtn.length = 0;
  ctx.fillStyle='#080818';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#f1c40f';ctx.font='bold 22px Arial';ctx.textAlign='center';ctx.textBaseline='top';
  ctx.fillText('\u{1F0CF} Monte Seu Deck',W/2,14);
  ctx.fillStyle='#aaa';ctx.font='13px Arial';
  ctx.fillText(`Escolha 8 cartas \u2022 Tempo: ${APP.deckTimer}s \u2022 ${APP.tmpDeck.length}/8 selecionadas`,W/2,42);
  // Timer badge (canto superior direito)
  const tRatio=APP.deckTimer>=9999?1:APP.deckTimer/30;
  const rx=W-38,ry=55,rr=22;
  ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=4;ctx.beginPath();ctx.arc(rx,ry,rr,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle=tRatio>.5?'#27ae60':tRatio>.25?'#f39c12':'#e74c3c';ctx.lineWidth=4;
  ctx.beginPath();ctx.arc(rx,ry,rr,-Math.PI/2,-Math.PI/2+Math.PI*2*tRatio,false);ctx.stroke();
  ctx.fillStyle='#fff';ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(APP.deckTimer>=9999?'\u221E':APP.deckTimer,rx,ry);

  const cols=4,CW=88,CH=76,GAP=6;
  const totalW=cols*CW+(cols-1)*GAP,startX=(W-totalW)/2,startY=68;
  const displayKeys=getAllKeys();
  let hoveredCard=null;
  displayKeys.forEach((key,i)=>{
    const d=CARDS[key];if(!d)return;
    const col=i%cols,row=Math.floor(i/cols);
    const cx=startX+col*(CW+GAP),cy=startY+row*(CH+GAP);
    const isOwned=APP.progress.owned&&APP.progress.owned.includes(key);
    const isLocked=d.locked&&!isOwned;
    const sel=APP.tmpDeck.includes(key),lvl=getCardLevel(key);
    if(mouseX>=cx&&mouseX<=cx+CW&&mouseY>=cy&&mouseY<=cy+CH) hoveredCard=key;
    ctx.fillStyle=isLocked?'#0d0d16':sel?'#1a3a1a':d.type==='spell'?'#1a0d22':'#12121e';
    ctx.strokeStyle=isLocked?'#222':sel?'#27ae60':'#333';ctx.lineWidth=sel?2.5:1.5;
    ctx.beginPath();ctx.roundRect(cx,cy,CW,CH,8);ctx.fill();ctx.stroke();
    if(sel){ctx.fillStyle='rgba(39,174,96,.15)';ctx.fillRect(cx,cy,CW,CH);}
    ctx.globalAlpha=isLocked?.3:(sel?1:.8);ctx.font='24px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(d.emoji,cx+CW/2,cy+22);ctx.globalAlpha=1;
    const fs=d.name.length>10?6.5:7.5;ctx.fillStyle=isLocked?'#555':'#ccc';ctx.font=`${fs}px Arial`;ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(d.name,cx+CW/2,cy+38);
    // Custo
    ctx.fillStyle='#6c3483';ctx.beginPath();ctx.arc(cx+11,cy+11,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 9px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(d.cost,cx+11,cy+11);
    // Nivel
    if(lvl>1&&!isLocked){ctx.fillStyle='#f1c40f';ctx.beginPath();ctx.arc(cx+CW-11,cy+11,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#000';ctx.font='bold 7px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('Lv'+lvl,cx+CW-11,cy+11);}
    // Check
    if(sel){ctx.fillStyle='rgba(39,174,96,.9)';ctx.font='16px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('\u2713',cx+CW-14,cy+CH-14);}
    // Cadeado para locked
    if(isLocked){ctx.font='16px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('\u{1F512}',cx+CW/2,cy+CH/2);}
    if(!isLocked) deckBtn.push({x:cx,y:cy,w:CW,h:CH,key});
  });
  // Confirm button
  const rdy=APP.tmpDeck.length>=1;
  const bx=W/2-100,by=H-50,bw=200,bh=38;
  ctx.fillStyle=rdy?'#27ae60':'#444';ctx.beginPath();ctx.roundRect(bx,by,bw,bh,10);ctx.fill();
  ctx.fillStyle='#fff';ctx.font='bold 15px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(rdy?`Confirmar (${APP.tmpDeck.length}/8)`:'Selecione cartas',W/2,by+bh/2);
  deckBtn.push({x:bx,y:by,w:bw,h:bh,key:'__confirm'});
  // Tooltip card info
  if(hoveredCard){
    const d=CARDS[hoveredCard];
    const isOwned=APP.progress.owned&&APP.progress.owned.includes(hoveredCard);
    const isLocked=d.locked&&!isOwned;
    ctx.fillStyle='rgba(0,0,0,.88)';ctx.fillRect(0,H-75,W,75);
    ctx.fillStyle='#f1c40f';ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.textBaseline='top';
    ctx.fillText(`${d.emoji} ${d.name}  \u2022  Custo: ${d.cost}\u{1F49C}`,W/2,H-72);
    if(d.type==='spell'){
      ctx.fillStyle='#aaa';ctx.font='11px Arial';
      ctx.fillText(`\u{1F4A5} DMG:${d.dmg}  \u{1F4CF} AOE:${d.aoe}`,W/2,H-52);
    }else{
      ctx.fillStyle='#aaa';ctx.font='11px Arial';
      ctx.fillText(`\u2764\uFE0F${d.hp}  \u2694\uFE0F${d.dmg}  \u{1F4A8}${Math.round(d.spd)}  \u{1F4CF}${d.range}`,W/2,H-52);
    }
    ctx.fillStyle=isLocked?'#e74c3c':'#ccc';ctx.font='12px Arial';
    ctx.fillText(isLocked?'\u{1F512} Disponivel na Loja':d.desc,W/2,H-30);
  }
}

// ── Tutorial ──────────────────────────────────────────────
export function drawTutorial(ctx, APP) {
  ctx.fillStyle='rgba(0,0,0,.88)';ctx.fillRect(0,0,W,H);
  const s=TUT_STEPS[APP.tutStep];
  const bx=20,by=H/2-160,bw=W-40,bh=320;
  ctx.fillStyle='#0d1b2e';ctx.strokeStyle='#3498db';ctx.lineWidth=2;
  ctx.beginPath();ctx.roundRect(bx,by,bw,bh,16);ctx.fill();ctx.stroke();
  ctx.font='60px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s.emoji,W/2,by+80);
  ctx.fillStyle='#f1c40f';ctx.font='bold 20px Arial';ctx.textBaseline='top';ctx.fillText(s.title,W/2,by+130);
  ctx.fillStyle='#ccc';ctx.font='14px Arial';
  // Quebra de linha no texto
  const words=s.body.split(' ');let line='',lineY=by+168;
  words.forEach(w=>{const test=line+w+' ';if(ctx.measureText(test).width>bw-40&&line){ctx.fillText(line.trim(),W/2,lineY);line=w+' ';lineY+=22;}else line=test;});
  ctx.fillText(line.trim(),W/2,lineY);
  // Paginacao
  for(let i=0;i<TUT_STEPS.length;i++){ctx.fillStyle=i===APP.tutStep?'#3498db':'#444';ctx.beginPath();ctx.arc(W/2+(i-2)*18,by+bh-28,5,0,Math.PI*2);ctx.fill();}
  // Botao
  const bbx=W/2-90,bby=by+bh-60,bbw=180,bbh=40;
  ctx.fillStyle='#2980b9';ctx.beginPath();ctx.roundRect(bbx,bby,bbw,bbh,10);ctx.fill();
  ctx.fillStyle='#fff';ctx.font='bold 15px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(APP.tutStep<TUT_STEPS.length-1?'Proximo \u2192':'Batalhar! \u2694\uFE0F',W/2,bby+bbh/2);
}

// ── Resultado ─────────────────────────────────────────────
export function drawResult(ctx, APP, G, wasOnline, opponentName, rematchPending) {
  const r=APP.battleResult;
  const isOnline=wasOnline||APP.mode==='online';
  const myName=APP.account?.name||'Voce';
  const oppName=isOnline?opponentName:'IA';
  const winName=r==='win'?myName:r==='lose'?oppName:null;
  const loseName=r==='win'?oppName:r==='lose'?myName:null;

  // Fundo gradiente
  const g=ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0,r==='win'?'#071a0e':r==='draw'?'#0a0a20':'#1a0707');
  g.addColorStop(1,'#060610');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);

  ctx.textAlign='center';ctx.textBaseline='middle';

  if(r==='draw'){
    ctx.font='64px Arial';ctx.fillText('\u{1F91D}',W/2,88);
    ctx.fillStyle='#bdc3c7';ctx.font='bold 32px Arial';ctx.fillText('EMPATE!',W/2,150);
    ctx.fillStyle='rgba(255,255,255,.08)';ctx.beginPath();ctx.roundRect(W/2-130,170,260,30,8);ctx.fill();
    ctx.fillStyle='#aaa';ctx.font='14px Arial';ctx.fillText(myName+' \u2694\uFE0F '+oppName,W/2,185);
  } else {
    // Bloco VENCEDOR
    ctx.font='58px Arial';ctx.fillText('\u{1F3C6}',W/2,80);
    // Faixa dourada de vencedor
    const wg=ctx.createLinearGradient(0,102,W,128);
    wg.addColorStop(0,'rgba(241,196,15,0)');wg.addColorStop(.3,'rgba(241,196,15,.18)');
    wg.addColorStop(.7,'rgba(241,196,15,.18)');wg.addColorStop(1,'rgba(241,196,15,0)');
    ctx.fillStyle=wg;ctx.fillRect(0,102,W,38);
    ctx.fillStyle='#f1c40f';ctx.font='bold 13px Arial';ctx.textBaseline='top';
    ctx.fillText('\u{1F3C6}  VENCEDOR',W/2,106);
    ctx.fillStyle='#fff';ctx.font='bold 30px Arial';ctx.textBaseline='middle';
    ctx.fillText(winName,W/2,150);

    // Bloco DERROTADO
    ctx.fillStyle='rgba(231,76,60,.12)';ctx.beginPath();ctx.roundRect(W/2-130,174,260,38,8);ctx.fill();
    ctx.strokeStyle='rgba(231,76,60,.22)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(W/2-130,174,260,38,8);ctx.stroke();
    ctx.fillStyle='#e74c3c';ctx.font='bold 12px Arial';ctx.textBaseline='top';
    ctx.fillText('\u{1F480}  DERROTADO',W/2,178);
    ctx.fillStyle='#999';ctx.font='bold 15px Arial';ctx.textBaseline='middle';
    ctx.fillText(loseName,W/2,202);
  }

  // Stats
  const statsY=228;
  const tChange=r==='win'?+30:r==='draw'?+5:-20;
  ctx.fillStyle='rgba(255,255,255,.06)';ctx.beginPath();ctx.roundRect(W/2-130,statsY-4,260,88,8);ctx.fill();
  ctx.fillStyle=r==='win'?'#2ecc71':r==='draw'?'#bdc3c7':'#e74c3c';ctx.font='bold 14px Arial';ctx.textBaseline='middle';
  ctx.fillText(`\u{1F3C6} ${APP.progress.trophies} trofeus  (${tChange>0?'+':''}${tChange})`,W/2,statsY+12);
  ctx.fillStyle='#aaa';ctx.font='12px Arial';
  ctx.fillText(`${APP.progress.wins}V  ${APP.progress.losses}D  ${APP.progress.draws}E`,W/2,statsY+34);
  ctx.fillStyle='#f1c40f';ctx.font='11px Arial';
  ctx.fillText(`+${r==='win'?25:r==='draw'?12:10} XP`,W/2,statsY+54);
  const earnedD=G.earnedDiamonds||0;
  if(earnedD>0){ctx.fillStyle='#00e5ff';ctx.font='bold 12px Arial';ctx.fillText(`\u{1F48E} +${earnedD} diamantes! (Total: ${APP.progress.diamonds||0})`,W/2,statsY+74);}
  else if(r==='win'){ctx.fillStyle='#555';ctx.font='11px Arial';ctx.fillText(`\u{1F48E} ${APP.progress.diamonds||0} diamantes`,W/2,statsY+74);}

  // Botoes
  const btnY=statsY+98;
  if(isOnline){
    if(rematchPending){
      ctx.fillStyle='rgba(241,196,15,.1)';ctx.beginPath();ctx.roundRect(W/2-110,btnY,220,48,12);ctx.fill();
      ctx.strokeStyle='#f1c40f55';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(W/2-110,btnY,220,48,12);ctx.stroke();
      const dots='.'.repeat(Math.floor(Date.now()/400)%4);
      ctx.fillStyle='#f1c40f';ctx.font='bold 13px Arial';ctx.textBaseline='middle';
      ctx.fillText('\u23F3 Aguardando '+opponentName+dots,W/2,btnY+24);
      ctx.fillStyle='rgba(231,76,60,.85)';ctx.beginPath();ctx.roundRect(W/2-110,btnY+58,220,44,12);ctx.fill();
      ctx.fillStyle='#fff';ctx.font='bold 14px Arial';ctx.fillText('\u{1F6AA} Cancelar e Sair',W/2,btnY+80);
    } else {
      ctx.fillStyle='#e67e22';ctx.beginPath();ctx.roundRect(W/2-110,btnY,220,48,12);ctx.fill();
      ctx.fillStyle='#fff';ctx.font='bold 16px Arial';ctx.textBaseline='middle';ctx.fillText('\u{1F504} Revanche!',W/2,btnY+24);
      ctx.fillStyle='rgba(255,255,255,.09)';ctx.beginPath();ctx.roundRect(W/2-110,btnY+58,220,44,12);ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(W/2-110,btnY+58,220,44,12);ctx.stroke();
      ctx.fillStyle='#aaa';ctx.font='bold 14px Arial';ctx.fillText('\u{1F6AA} Sair da Sala',W/2,btnY+80);
    }
  } else {
    const btns2=[{label:'\u2694\uFE0F Jogar Novamente',id:'again'},{label:'\u{1F3E0} Menu Principal',id:'menu'}];
    btns2.forEach((b,i)=>{
      const bx2=W/2-110,by2=btnY+i*60,bw2=220,bh2=50;
      ctx.fillStyle=i===0?'#e67e22':'#2980b9';ctx.beginPath();ctx.roundRect(bx2,by2,bw2,bh2,12);ctx.fill();
      ctx.fillStyle='#fff';ctx.font='bold 16px Arial';ctx.textBaseline='middle';ctx.fillText(b.label,W/2,by2+bh2/2);
    });
  }
}

// ── Ranking ───────────────────────────────────────────────
export function drawRanking(ctx, APP, rkOnline, rkLoading) {
  ctx.fillStyle='#060610';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#f1c40f';ctx.font='bold 24px Arial';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText('\u{1F3C6} Ranking Global',W/2,14);
  const rkStatus=rkLoading?'\u{1F504} carregando...':rkOnline?'\u{1F310} Firebase \u00b7 ao vivo':'\u{1F4F4} offline \u00b7 cache local';
  ctx.fillStyle=rkOnline?'#27ae60':rkLoading?'#f39c12':'#888';ctx.font='12px Arial';ctx.fillText(rkStatus,W/2,44);
  const list=APP.ranking.length?APP.ranking:[{name:'Nenhum jogador ainda',trophies:0,wins:0}];
  list.slice(0,12).forEach((p,i)=>{
    const by=70+i*48,isME=p.id===APP.account?.id;
    ctx.fillStyle=isME?'rgba(241,196,15,.15)':'rgba(255,255,255,.04)';ctx.beginPath();ctx.roundRect(12,by,W-24,42,8);ctx.fill();
    if(isME){ctx.strokeStyle='#f1c40f';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(12,by,W-24,42,8);ctx.stroke();}
    const medal=i===0?'\u{1F947}':i===1?'\u{1F948}':i===2?'\u{1F949}':`${i+1}.`;
    ctx.fillStyle='#fff';ctx.font='bold 14px Arial';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(`${medal} ${p.name}`,22,by+21);
    ctx.fillStyle='#f1c40f';ctx.textAlign='right';ctx.fillText(`\u{1F3C6} ${p.trophies}`,W-20,by+14);
    ctx.fillStyle='#888';ctx.font='11px Arial';ctx.fillText(`${p.wins||0} vitorias`,W-20,by+30);
  });
  // Voltar
  ctx.fillStyle='#2980b9';ctx.beginPath();ctx.roundRect(W/2-80,H-52,160,40,10);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 15px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('\u2190 Voltar',W/2,H-32);
}

// ── Loja ──────────────────────────────────────────────────
export function drawShop(ctx, APP, shopScrollY, shopBtn, mouseX, mouseY) {
  shopBtn.length = 0;
  // Fundo gradiente roxo escuro
  const sg=ctx.createLinearGradient(0,0,W,H);
  sg.addColorStop(0,'#0d0820');sg.addColorStop(1,'#1a0830');
  ctx.fillStyle=sg;ctx.fillRect(0,0,W,H);
  // Particulas de brilho
  for(let i=0;i<25;i++){const sx=Math.sin(i*137.5)*W*.5+W*.5,sy=Math.sin(i*211.3)*H*.5+H*.5;ctx.fillStyle=`rgba(180,100,255,${0.15+Math.sin(Date.now()*.002+i)*.12})`;ctx.beginPath();ctx.arc(sx,sy,.7+Math.sin(Date.now()*.003+i)*.35,0,Math.PI*2);ctx.fill();}
  // Cabecalho
  ctx.fillStyle='#fff';ctx.font='bold 22px Arial';ctx.textAlign='center';ctx.textBaseline='top';
  ctx.fillText('\u{1F48E} Loja de Cartas',W/2,10);
  ctx.fillStyle='#00e5ff';ctx.font='bold 13px Arial';
  ctx.fillText(`Seus diamantes: \u{1F48E} ${APP.progress.diamonds||0}`,W/2,38);
  // Layout grid 4 colunas
  const AREA_TOP=58,AREA_BOT=H-42;
  const cols=4,CW=90,CH=111,GAP=4;
  const totalW=cols*CW+(cols-1)*GAP,startX=(W-totalW)/2;
  const viewH=AREA_BOT-AREA_TOP;
  const rows=Math.ceil(SHOP_CARD_KEYS.length/cols);
  const totalContentH=rows*(CH+GAP);
  const maxScroll=Math.max(0,totalContentH-viewH);
  const clampedScroll=Math.max(0,Math.min(maxScroll,shopScrollY));
  // Clip area de cartas
  ctx.save();ctx.beginPath();ctx.rect(0,AREA_TOP,W,viewH);ctx.clip();
  SHOP_CARD_KEYS.forEach((key,i)=>{
    const d=CARDS[key];if(!d)return;
    const col=i%cols,row=Math.floor(i/cols);
    const cx=startX+col*(CW+GAP);
    const cy=AREA_TOP+row*(CH+GAP)-clampedScroll;
    if(cy+CH<AREA_TOP-2||cy>AREA_BOT+2)return;
    const owned=(APP.progress.owned||[]).includes(key);
    const canBuy=!owned&&(APP.progress.diamonds||0)>=(d.shopCost||0);
    const isLeg=!!d.legendary;
    // Fundo carta
    if(isLeg){const lg=ctx.createLinearGradient(cx,cy,cx+CW,cy+CH);lg.addColorStop(0,'#2a1800');lg.addColorStop(1,'#150c00');ctx.fillStyle=lg;}
    else ctx.fillStyle=owned?'#142814':canBuy?'#1a0d2e':'#0d0818';
    ctx.strokeStyle=isLeg?`hsl(${(Date.now()*.08)%360},90%,58%)`:(owned?'#27ae60':canBuy?'#8e44ad':'#252535');
    ctx.lineWidth=isLeg?2:(owned?1.5:1);
    ctx.beginPath();ctx.roundRect(cx,cy,CW,CH,7);ctx.fill();ctx.stroke();
    // Brilho lendario
    if(isLeg){ctx.save();ctx.shadowColor='#ffd700';ctx.shadowBlur=8;ctx.strokeStyle='rgba(255,215,0,0.4)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(cx+2,cy+2,CW-4,CH-4,6);ctx.stroke();ctx.restore();}
    // Emoji
    ctx.globalAlpha=(!owned&&!canBuy&&!isLeg)?.38:1;
    ctx.font=isLeg?'22px Arial':'19px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(d.emoji,cx+CW/2,cy+19);ctx.globalAlpha=1;
    // Nome
    ctx.fillStyle=isLeg?'#ffd700':(owned?'#2ecc71':canBuy?'#d7b8f5':'#555');
    const nLen=d.name.length,nfs=nLen>13?6:nLen>10?7:8.5;
    ctx.font=`bold ${nfs}px Arial`;ctx.textAlign='center';ctx.textBaseline='top';
    ctx.fillText(d.name,cx+CW/2,cy+36);
    // Badge lendario
    if(isLeg){ctx.fillStyle='rgba(255,200,0,0.15)';ctx.beginPath();ctx.roundRect(cx+7,cy+47,CW-14,11,3);ctx.fill();ctx.fillStyle='#ffd700';ctx.font='bold 6px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('\u2B50 LENDARIO \u2B50',cx+CW/2,cy+53);}
    // Stats
    const statY=isLeg?62:47;
    ctx.fillStyle=isLeg?'#ffcc44':'#666';ctx.font='6.5px Arial';ctx.textAlign='center';ctx.textBaseline='top';
    ctx.fillText(`\u2764\uFE0F${d.hp} \u2694\uFE0F${d.dmg} \u{1F4A8}${d.spd}`,cx+CW/2,cy+statY);
    // Custo elixir
    ctx.fillStyle=isLeg?'#ff9999':'#9b9';ctx.font='6px Arial';
    ctx.fillText(`\u2728${d.cost} elixir${isLeg?' (maximo!)':''}`,cx+CW/2,cy+statY+10);
    // Desc
    ctx.fillStyle=isLeg?'#ffddaa':'#777';ctx.font='6px Arial';
    const desc=d.desc.length>24?d.desc.substr(0,22)+'\u2026':d.desc;
    ctx.fillText(desc,cx+CW/2,cy+statY+20);
    // Botao comprar / possuida
    const btnY=cy+CH-21,btnH=18;
    if(owned){
      ctx.fillStyle='rgba(39,174,96,.25)';ctx.beginPath();ctx.roundRect(cx+5,btnY,CW-10,btnH,4);ctx.fill();
      ctx.fillStyle='#2ecc71';ctx.font='bold 8px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('\u2705 Possuida',cx+CW/2,btnY+btnH/2);
    }else{
      ctx.fillStyle=isLeg?(canBuy?'#b8860b':'#3a2200'):(canBuy?'#7b2fbe':'#252535');
      ctx.beginPath();ctx.roundRect(cx+5,btnY,CW-10,btnH,4);ctx.fill();
      ctx.fillStyle=canBuy?'#fff':'#444';ctx.font=`bold ${isLeg?7:8}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(`${isLeg?'\u{1F3AC} ':''}${d.shopCost}\u{1F48E}`,cx+CW/2,btnY+btnH/2);
      if(canBuy)shopBtn.push({x:cx+5,y:btnY,w:CW-10,h:btnH,key});
    }
  });
  ctx.restore();
  // Scrollbar
  if(maxScroll>0){
    const frac=clampedScroll/maxScroll;
    const sbH=Math.max(20,viewH*(viewH/totalContentH));
    const sbY=AREA_TOP+(viewH-sbH)*frac;
    ctx.fillStyle='rgba(255,255,255,.07)';ctx.beginPath();ctx.roundRect(W-5,AREA_TOP,3,viewH,1);ctx.fill();
    ctx.fillStyle='rgba(200,150,255,.5)';ctx.beginPath();ctx.roundRect(W-5,sbY,3,sbH,1);ctx.fill();
    if(clampedScroll<5){ctx.fillStyle='rgba(255,255,255,0.35)';ctx.font='9px Arial';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText('\u2195 role para ver mais',W/2,AREA_BOT-2);}
  }
  // Botao voltar
  const backY=H-39,backW=140,backH=32;
  ctx.fillStyle='rgba(44,62,80,0.95)';ctx.beginPath();ctx.roundRect(W/2-backW/2,backY,backW,backH,8);ctx.fill();
  ctx.strokeStyle='#4a6a8a';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(W/2-backW/2,backY,backW,backH,8);ctx.stroke();
  ctx.fillStyle='#fff';ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('\u2190 Voltar',W/2,backY+backH/2);
  shopBtn.push({x:W/2-backW/2,y:backY,w:backW,h:backH,key:'__back'});
}
