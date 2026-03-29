// ════════════════════════════════════════════════════════════
//  DrawEntities.js — Tower, Unit, Projectile, Effects rendering
// ════════════════════════════════════════════════════════════
import { W, ARENA_TOP, ARENA_BOT, ARENA_H } from '../config/constants.js';
import { drawCharacter } from './CharacterRenderer.js';

export function drawTower(ctx, t) {
  const{x,y,r,alive,team,kind,hp,maxHp}=t;
  if(!alive){
    [[0,6,14,9],[-11,-4,10,8],[9,-7,15,7],[-4,11,9,11]].forEach(([dx,dy,rw,rh])=>{ctx.save();ctx.translate(x+dx,y+dy);ctx.rotate(dx*.18);ctx.fillStyle=team==='player'?'#2a5a8c':'#8c2a2a';ctx.fillRect(-rw/2,-rh/2,rw,rh);ctx.restore();});
    ctx.font=`${r*.9}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('\u{1F480}',x,y-r*.2);
    return;
  }
  const isK=kind==='king',tw=isK?54:42,th=isK?88:68,nb=isK?5:4,bh=isK?14:11,bw=Math.floor((tw-2)/nb*.52);
  const ty=y+r*.2,topY=ty-th;
  const s1=team==='player'?'#1a3a5c':'#5c1a1a',s2=team==='player'?'#2a5a8c':'#8c2a2a',s3=team==='player'?'#4a8abc':'#bc4a4a',sm=team==='player'?'#0d2040':'#40100d';
  ctx.fillStyle='rgba(0,0,0,.32)';ctx.beginPath();ctx.ellipse(x+6,ty+5,tw*.52,9,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=s2;ctx.fillRect(x-tw/2,topY,tw,th);
  const bg=ctx.createLinearGradient(x-tw/2,0,x+tw/2,0);bg.addColorStop(0,'rgba(0,0,0,.32)');bg.addColorStop(.18,'rgba(0,0,0,0)');bg.addColorStop(.78,'rgba(0,0,0,0)');bg.addColorStop(1,'rgba(0,0,0,.22)');ctx.fillStyle=bg;ctx.fillRect(x-tw/2,topY,tw,th);
  ctx.strokeStyle=sm;ctx.lineWidth=.8;const bkH=9;
  for(let row=0;topY+row*bkH<ty;row++){const ry=topY+row*bkH;ctx.beginPath();ctx.moveTo(x-tw/2,ry);ctx.lineTo(x+tw/2,ry);ctx.stroke();const off=(row%2)*(tw/4);for(let col=tw/4;col<tw;col+=tw/2){const vx=x-tw/2+((col+off)%tw);ctx.beginPath();ctx.moveTo(vx,ry);ctx.lineTo(vx,Math.min(ry+bkH,ty));ctx.stroke();}}
  const ns=isK?2:1;for(let si=0;si<ns;si++){const wy=topY+th*(ns===1?.44:(si===0?.27:.57)),sw=6,sh=isK?14:11;ctx.fillStyle='#000';ctx.fillRect(x-sw/2-1,wy-sh/2-1,sw+2,sh+2);ctx.fillStyle='rgba(20,20,40,.85)';ctx.fillRect(x-sw/2,wy-sh/2,sw,sh);ctx.fillStyle='rgba(255,200,80,.18)';ctx.fillRect(x-sw/2+1,wy-sh/2+1,sw-2,sh-2);}
  const sp=tw/nb;ctx.fillStyle=s1;ctx.fillRect(x-tw/2-2,topY-4,tw+4,4);for(let i=0;i<nb;i++){const ax=x-tw/2+i*sp+(sp-bw)/2;ctx.fillStyle=s1;ctx.fillRect(ax,topY-bh-4,bw,bh+4);ctx.fillStyle=s3;ctx.fillRect(ax,topY-bh-4,bw,2);ctx.fillStyle='rgba(255,255,255,.1)';ctx.fillRect(ax,topY-bh-4,2,bh+4);}
  const fpx=x+tw/2-3,fpBase=topY-bh-4,fpTop=fpBase-(isK?22:17);
  ctx.strokeStyle='#aaa';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(fpx,fpBase);ctx.lineTo(fpx,fpTop);ctx.stroke();
  const wave=Math.sin(Date.now()*.004)*3,fl=isK?14:11,fh=isK?9:7;
  ctx.fillStyle=team==='player'?'#1565c0':'#b71c1c';ctx.beginPath();ctx.moveTo(fpx,fpTop);ctx.quadraticCurveTo(fpx+fl/2,fpTop+fh/2+wave,fpx+fl,fpTop+fh/2);ctx.quadraticCurveTo(fpx+fl/2,fpTop+fh+wave,fpx,fpTop+fh);ctx.closePath();ctx.fill();
  if(isK){ctx.font='14px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('\u{1F451}',x,fpTop-10);}
  const hpr=hp/maxHp;
  if(hpr<.65){ctx.save();ctx.strokeStyle=`rgba(0,0,0,${.75*(.65-hpr)/.65})`;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x-tw*.1,topY+th*.14);ctx.lineTo(x+tw*.14,topY+th*.34);ctx.lineTo(x-tw*.05,topY+th*.54);ctx.stroke();if(hpr<.32){ctx.beginPath();ctx.moveTo(x+tw*.2,topY+th*.1);ctx.lineTo(x+tw*.05,topY+th*.38);ctx.lineTo(x+tw*.18,topY+th*.55);ctx.stroke();}ctx.restore();}
  if(hpr<.3){const ft=Date.now()*.005;for(let fi=0;fi<3;fi++){const fx=x+(Math.sin(ft+fi*2.1))*tw*.28,fy2=topY+Math.sin(ft*1.4+fi)*th*.08;ctx.fillStyle=`rgba(255,${80+Math.sin(ft+fi)*60|0},0,${.6+Math.sin(ft*2+fi)*.3})`;ctx.beginPath();ctx.arc(fx,fy2,4+Math.sin(ft*3+fi)*2,0,Math.PI*2);ctx.fill();}}
  // HP bar da torre melhorada
  const bw2=tw*1.3,bh2=8,bx=x-bw2/2,by=ty+8,ratio=hp/maxHp;
  ctx.fillStyle='rgba(0,0,0,.85)';ctx.beginPath();ctx.roundRect(bx-1,by-1,bw2+2,bh2+2,4);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.1)';ctx.lineWidth=.5;ctx.beginPath();ctx.roundRect(bx-1,by-1,bw2+2,bh2+2,4);ctx.stroke();
  const hpC=ratio>.6?'#27ae60':ratio>.3?'#f39c12':'#e74c3c';
  if(ratio>0){ctx.shadowColor=hpC;ctx.shadowBlur=4;ctx.fillStyle=hpC;ctx.beginPath();ctx.roundRect(bx,by,bw2*ratio,bh2,3);ctx.fill();ctx.shadowBlur=0;}
  // Shine
  if(ratio>0){ctx.fillStyle='rgba(255,255,255,.25)';ctx.beginPath();ctx.roundRect(bx,by,bw2*ratio,bh2*.4,2);ctx.fill();}
  ctx.fillStyle='#fff';ctx.font='bold 9px Arial';ctx.textAlign='center';ctx.textBaseline='top';
  ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=2;ctx.strokeText(Math.ceil(hp),x,by+bh2+2);
  ctx.fillText(Math.ceil(hp),x,by+bh2+2);
}

export function drawUnit(ctx, u, getCardLevel) {
  const{x,y,r,color,emoji,hp,maxHp,team,stun,slow}=u;
  const t=Date.now()/1000;
  const bob=Math.sin(t*2.8+(u.id||0)*.9)*1.6;
  const ry=y+bob;
  const pulse=Math.sin(t*3.5+(u.id||0)*1.2)*.15+.85;

  // Sombra colorida no chao (azul/vermelha sutil + preta)
  const shC=team==='player'?'rgba(41,128,185,.18)':'rgba(192,57,43,.18)';
  ctx.fillStyle=shC;ctx.beginPath();ctx.ellipse(x+2,y+r*.8,r*.75,r*.28,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(x+3,y+r*.78,r*.68,r*.24,0,0,Math.PI*2);ctx.fill();

  // Aneis de status
  if(stun>0){ctx.shadowColor='#ffe600';ctx.shadowBlur=12;ctx.strokeStyle='rgba(255,230,0,.9)';ctx.lineWidth=3.5;ctx.beginPath();ctx.arc(x,ry,r+6,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;}
  if(slow>0){ctx.shadowColor='#00e6ff';ctx.shadowBlur=10;ctx.strokeStyle='rgba(0,230,255,.8)';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(x,ry,r+4,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;}

  // Halo externo com glow FORTE pulsante (cor do time)
  const glowC=team==='player'?'#5dade2':'#e74c3c';
  ctx.shadowColor=glowC;ctx.shadowBlur=25*pulse;
  ctx.strokeStyle=team==='player'?'#85c1e9':'#f1948a';ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(x,ry,r,0,Math.PI*2);ctx.stroke();
  // Double glow pass for intensity
  ctx.shadowBlur=14*pulse;
  ctx.beginPath();ctx.arc(x,ry,r+1,0,Math.PI*2);ctx.stroke();
  ctx.shadowBlur=0;

  // Corpo com gradiente rico
  const bodyG=ctx.createRadialGradient(x-r*.2,ry-r*.3,r*.1,x,ry,r);
  bodyG.addColorStop(0,lightenColor(color,.3));
  bodyG.addColorStop(.6,color);
  bodyG.addColorStop(1,darkenColor(color,.3));
  ctx.fillStyle=bodyG;ctx.beginPath();ctx.arc(x,ry,r,0,Math.PI*2);ctx.fill();

  // Highlight radial 3D mais forte
  const hg=ctx.createRadialGradient(x-r*.3,ry-r*.35,r*.05,x,ry,r);
  hg.addColorStop(0,'rgba(255,255,255,.5)');
  hg.addColorStop(.35,'rgba(255,255,255,.12)');
  hg.addColorStop(.7,'rgba(0,0,0,.0)');
  hg.addColorStop(1,'rgba(0,0,0,.22)');
  ctx.fillStyle=hg;ctx.beginPath();ctx.arc(x,ry,r,0,Math.PI*2);ctx.fill();

  // Outline escuro no corpo para definicao
  ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.arc(x,ry,r,0,Math.PI*2);ctx.stroke();

  // Personagem procedural
  drawCharacter(ctx, x, ry, u.key, team, r);

  // Hit flash com glow
  if(u.hitFlash>0){
    const fa=Math.min(1,u.hitFlash/.1);
    ctx.shadowColor='#ff0000';ctx.shadowBlur=20*fa;
    ctx.fillStyle=`rgba(255,60,60,${fa*.65})`;ctx.beginPath();ctx.arc(x,ry,r+2,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
  }

  // Level badge com glow
  if(team==='player'){const lvl=getCardLevel(u.key);if(lvl>1){ctx.fillStyle='#f1c40f';ctx.shadowColor='#f1c40f';ctx.shadowBlur=8;ctx.beginPath();ctx.arc(x+r*.7,ry-r*.7,7,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#000';ctx.font='bold 8px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(lvl,x+r*.7,ry-r*.7);}}

  // HP bar melhorada
  const dispRatio=(u.dispHp!==undefined?u.dispHp:hp)/maxHp;
  const ratio=hp/maxHp,bw=r*2.6,bx=x-bw/2,by=ry-r-11;
  // Fundo com borda
  ctx.fillStyle='rgba(0,0,0,.85)';ctx.beginPath();ctx.roundRect(bx-1,by-1,bw+2,9,4);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=.5;ctx.beginPath();ctx.roundRect(bx-1,by-1,bw+2,9,4);ctx.stroke();
  // HP real (escuro)
  if(ratio>0){ctx.fillStyle=ratio>.6?'#1a8a4a':ratio>.3?'#a06010':'#8c1a1a';ctx.beginPath();ctx.roundRect(bx,by,bw*ratio,7,3);ctx.fill();}
  // HP display (brilhante com glow)
  if(dispRatio>0){
    const hpC=dispRatio>.6?'#2ecc71':dispRatio>.3?'#f39c12':'#e74c3c';
    ctx.shadowColor=hpC;ctx.shadowBlur=4;
    ctx.fillStyle=hpC;ctx.beginPath();ctx.roundRect(bx,by,bw*dispRatio,7,3);ctx.fill();
    ctx.shadowBlur=0;
  }
  // Shine
  if(dispRatio>0){ctx.fillStyle='rgba(255,255,255,.28)';ctx.beginPath();ctx.roundRect(bx,by,bw*dispRatio,3.5,2);ctx.fill();}
}

// Helpers para cores
function lightenColor(hex,amt){
  if(!hex||hex[0]!=='#')return hex;
  let r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  r=Math.min(255,r+Math.floor((255-r)*amt));g=Math.min(255,g+Math.floor((255-g)*amt));b=Math.min(255,b+Math.floor((255-b)*amt));
  return `rgb(${r},${g},${b})`;
}
function darkenColor(hex,amt){
  if(!hex||hex[0]!=='#')return hex;
  let r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  r=Math.max(0,Math.floor(r*(1-amt)));g=Math.max(0,Math.floor(g*(1-amt)));b=Math.max(0,Math.floor(b*(1-amt)));
  return `rgb(${r},${g},${b})`;
}

export function drawProjectile(ctx, p) {
  const pr=p.isTower?6:4.5;
  // Trail de rastro
  if(p.trail&&p.trail.length>1){
    for(let i=1;i<p.trail.length;i++){
      const ta=(i/p.trail.length);
      ctx.strokeStyle=`rgba(255,210,80,${ta*.55})`;
      ctx.lineWidth=ta*(p.isTower?5:3);
      ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(p.trail[i-1].x,p.trail[i-1].y);ctx.lineTo(p.trail[i].x,p.trail[i].y);ctx.stroke();
    }
    ctx.lineCap='butt'; // reset para nao vazar no resto do canvas
  }
  // Nucleo brilhante
  ctx.shadowColor='rgba(255,220,60,1)';ctx.shadowBlur=p.isTower?16:10;
  ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,pr,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;
  // Ponto branco no centro
  ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.arc(p.x,p.y,pr*.38,0,Math.PI*2);ctx.fill();
}

export function drawEffects(ctx, G, dt) {
  if(!G||!G.efx)return;
  G.efx.forEach(e=>{
    const a=e.life/e.maxLife;
    ctx.save();
    if(e.type==='boom'){
      // Multi-ring explosion com glow
      const er=e.r*(1.3-a*.5);
      ctx.shadowColor='rgba(255,100,0,.8)';ctx.shadowBlur=16*a;
      ctx.strokeStyle=`rgba(255,180,50,${a*.9})`;ctx.lineWidth=5;ctx.beginPath();ctx.arc(e.x,e.y,er,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle=`rgba(255,80,0,${a*.6})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,er*.7,0,Math.PI*2);ctx.stroke();
      const ig=ctx.createRadialGradient(e.x,e.y,0,e.x,e.y,er);
      ig.addColorStop(0,`rgba(255,255,200,${a*.4})`);ig.addColorStop(.4,`rgba(255,120,0,${a*.2})`);ig.addColorStop(1,'rgba(255,60,0,0)');
      ctx.fillStyle=ig;ctx.fill();
      ctx.shadowBlur=0;
    }
    else if(e.type==='hit'){
      ctx.shadowColor='#fff';ctx.shadowBlur=8*a;
      ctx.fillStyle=`rgba(255,255,200,${a})`;ctx.font='15px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('\u2726',e.x,e.y-(1-a)*14);ctx.shadowBlur=0;
    }
    else if(e.type==='gas'){
      const gg=ctx.createRadialGradient(e.x,e.y,0,e.x,e.y,e.r);
      gg.addColorStop(0,`rgba(150,255,50,${a*.45})`);gg.addColorStop(1,`rgba(150,255,50,0)`);
      ctx.fillStyle=gg;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,Math.PI*2);ctx.fill();
    }
    else if(e.type==='heal'){
      ctx.shadowColor='#00ff64';ctx.shadowBlur=10*a;
      const hr=e.r*(1.2-a*.4);
      ctx.strokeStyle=`rgba(0,255,100,${a*.9})`;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(e.x,e.y,hr,0,Math.PI*2);ctx.stroke();
      // Cruz de cura
      const cs=hr*.3;
      ctx.fillStyle=`rgba(0,255,100,${a*.6})`;
      ctx.fillRect(e.x-cs*.3,e.y-cs,cs*.6,cs*2);
      ctx.fillRect(e.x-cs,e.y-cs*.3,cs*2,cs*.6);
      ctx.shadowBlur=0;
    }
    else if(e.type==='buff'){
      ctx.shadowColor='#ffd700';ctx.shadowBlur=8*a;
      ctx.strokeStyle=`rgba(255,215,0,${a*.9})`;ctx.lineWidth=2.5;
      ctx.beginPath();ctx.arc(e.x,e.y,e.r*(1.2-a*.4),0,Math.PI*2);ctx.stroke();
      ctx.shadowBlur=0;
    }
    else if(e.type==='sonic'){
      // Ondas concentricas
      ctx.shadowColor='rgba(180,80,255,.6)';ctx.shadowBlur=10*a;
      for(let i=0;i<3;i++){
        const sr=e.r*(1.4-a*.6)*(1-i*.2);
        ctx.strokeStyle=`rgba(180,80,255,${a*.6*(1-i*.25)})`;ctx.lineWidth=3-i;
        ctx.beginPath();ctx.arc(e.x,e.y,sr,0,Math.PI*2);ctx.stroke();
      }
      ctx.shadowBlur=0;
    }
    else if(e.type==='spark'){
      e.x+=e.vx*dt;e.y+=e.vy*dt;e.vy+=120*dt;
      const sc=e.color||'#ffc832';
      ctx.shadowColor=sc;ctx.shadowBlur=6*a;
      ctx.fillStyle=`rgba(255,220,50,${a})`;ctx.beginPath();ctx.arc(e.x,e.y,3.5*a,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=`rgba(255,255,255,${a*.7})`;ctx.beginPath();ctx.arc(e.x,e.y,1.5*a,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
    }
    else if(e.type==='dmg'){
      e.y+=e.vy*dt;e.vy*=.94;
      const fs=e.big?16:11+Math.round(a*4);
      ctx.font=`bold ${fs}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';
      // Outline para legibilidade
      ctx.strokeStyle='rgba(0,0,0,.7)';ctx.lineWidth=3;ctx.strokeText(e.val,e.x,e.y);
      ctx.fillStyle=e.big?`rgba(255,80,80,${a})`:`rgba(255,230,60,${a})`;ctx.fillText(e.val,e.x,e.y);
    }
    else if(e.type==='text'){
      ctx.font='bold 14px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.globalAlpha=a;
      ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=2.5;ctx.strokeText(e.txt,e.x,e.y-(1-a)*20);
      ctx.fillStyle=e.color||'#fff';ctx.fillText(e.txt,e.x,e.y-(1-a)*20);
    }
    else if(e.type==='puff'){
      e.x+=e.vx*dt;e.y+=e.vy*dt;e.vx*=.86;e.vy*=.86;
      const pr=e.r*(1+.6*(1-a));
      const pg=ctx.createRadialGradient(e.x,e.y,0,e.x,e.y,pr);
      pg.addColorStop(0,`rgba(200,180,155,${a*.5})`);pg.addColorStop(1,`rgba(160,140,115,0)`);
      ctx.fillStyle=pg;ctx.beginPath();ctx.arc(e.x,e.y,pr,0,Math.PI*2);ctx.fill();
    }
    else if(e.type==='flash'){
      ctx.fillStyle=`rgba(255,240,140,${a*.45})`;ctx.fillRect(0,ARENA_TOP,W,ARENA_H);
    }
    ctx.restore();
  });
  G.efx.forEach(e=>e.life-=dt);
  G.efx=G.efx.filter(e=>e.life>0);
}
