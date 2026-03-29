// ════════════════════════════════════════════════════════════
//  AUDIO SYSTEM — SFX + MUSIC (procedural Web Audio API)
//  Ported from index.html — zero audio files
// ════════════════════════════════════════════════════════════

let _ac = null, _sfxBuf = null;
let soundMuted = false, _lHit = 0;

export function isMuted() { return soundMuted; }
export function setMuted(v) { soundMuted = v; }

export function getAC() {
  if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
  if (_ac.state === 'suspended') _ac.resume();
  return _ac;
}

function sfxBuf() {
  if (!_sfxBuf) {
    const a = getAC();
    _sfxBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = _sfxBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return _sfxBuf;
}

function osc(f, t, v, d, fe, dest) {
  if (soundMuted) return;
  try {
    const a = getAC(), dt = dest || a.destination;
    const o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(dt);
    o.type = t; o.frequency.value = f;
    if (fe) o.frequency.exponentialRampToValueAtTime(Math.max(fe, 1), a.currentTime + d);
    g.gain.setValueAtTime(v, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + d);
    o.start(); o.stop(a.currentTime + d + .02);
  } catch (e) {}
}

function nos(hz, type, v, d, dest) {
  if (soundMuted) return;
  try {
    const a = getAC(), dt = dest || a.destination;
    const s = a.createBufferSource(); s.buffer = sfxBuf();
    const f = a.createBiquadFilter(); f.type = type; f.frequency.value = hz;
    const g = a.createGain();
    s.connect(f); f.connect(g); g.connect(dt);
    g.gain.setValueAtTime(v, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + d);
    s.start(); s.stop(a.currentTime + d + .02);
  } catch (e) {}
}

export const SFX = {
  select() { osc(1200, 'sine', .1, .06); osc(1800, 'sine', .04, .04); },
  deploy() { osc(180, 'sine', .22, .1, 500); setTimeout(() => osc(580, 'sine', .28, .09, 280), 75); },
  shoot() { osc(820, 'square', .07, .07, 180); nos(3500, 'bandpass', .04, .05); },
  hit() { const n = Date.now(); if (n - _lHit < 65) return; _lHit = n; nos(280, 'bandpass', .42, .1); osc(100, 'sine', .24, .07, 50); },
  towerHit() { osc(260, 'triangle', .28, .38, 130); osc(390, 'triangle', .12, .22, 195); nos(2200, 'bandpass', .08, .12); },
  towerDown() { nos(75, 'lowpass', 1.3, .9); osc(52, 'sine', .7, .55, 16); osc(85, 'sine', .42, .38, 32); setTimeout(() => nos(180, 'lowpass', .45, .5), 110); },
  spell() { nos(180, 'lowpass', .55, .38); osc(75, 'sine', .42, .32, 32); setTimeout(() => { nos(100, 'lowpass', .85, .52); osc(50, 'sine', .6, .44, 18); }, 145); },
  win() { [[523, 'triangle', .28], [659, 'triangle', .28], [784, 'triangle', .28], [1047, 'triangle', .32]].forEach(([f, t, v], i) => setTimeout(() => osc(f, t, v, .55), i * 135)); setTimeout(() => { osc(523, 'sine', .18, .7); osc(659, 'sine', .18, .7); osc(784, 'sine', .18, .7); }, 610); },
  lose() { [[392, 'sawtooth', .2], [330, 'sawtooth', .2], [277, 'sawtooth', .2], [220, 'sawtooth', .22]].forEach(([f, t, v], i) => setTimeout(() => osc(f, t, v, .44), i * 225)); },
  click() { osc(800, 'sine', .08, .06, 600); },
  levelUp() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => osc(f, 'triangle', .25, .3), i * 80)); },
};

// ── Musica procedural (funk/baiao 2.0 — 145 BPM, 3 niveis de intensidade) ──
export const MUSIC = (() => {
  let BPM = 145;
  let S = 60 / BPM / 4;
  const LEN = 64;

  const C3 = 130.8, D3 = 146.8, Eb3 = 155.6, E3 = 164.8, F3 = 174.6, G3 = 196, Ab3 = 207.7, A3 = 220, B3 = 246.9,
        C4 = 261.6, D4 = 293.7, Eb4 = 311.1, E4 = 329.6, F4 = 349.2, G4 = 392, Ab4 = 415.3, A4 = 440, Bb4 = 466.2, B4 = 493.9,
        C5 = 523.3, D5 = 587.3, Eb5 = 622.3, E5 = 659.3, F5 = 698.5, G5 = 784, A5 = 880, _ = 0;

  // 64-step patterns (2 compassos x 4 grupos de 16)
  const KICK  = [1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0, 1,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0, 1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0, 1,0,0,0,0,0,1,0,1,0,1,0,0,0,0,1];
  const SNARE = [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0, 0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1, 0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0, 0,0,0,0,1,0,0,1,0,0,0,0,1,0,1,0];
  const HH    = [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0, 1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,0, 1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0, 1,1,1,0,1,0,1,0,1,1,1,0,1,0,1,0];
  const HHO   = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0];
  // Tamborim
  const TAMB  = [0,1,0,1,0,0,1,0,0,1,0,1,0,0,1,0, 0,1,0,1,0,0,1,0,0,1,0,0,1,0,1,0, 0,1,0,1,0,0,1,0,0,1,0,1,0,0,1,0, 0,0,1,0,1,0,1,0,0,1,0,1,0,0,1,0];
  // Clave 3-2 afro-brasileira
  const CLAVE = [1,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0, 1,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0, 1,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0, 1,0,0,1,0,0,1,0,0,0,1,0,0,1,0,1];

  // Baixo sincopado
  const BASS  = [C3,_,_,_,G3,_,_,_,A3,_,_,_,G3,_,E3,_, C3,_,_,G3,_,_,D3,_,G3,_,_,_,E3,_,_,_, C3,_,_,_,Ab3,_,_,_,G3,_,_,_,E3,_,D3,_, C3,_,D3,_,E3,_,G3,_,A3,_,G3,_,E3,_,_,_];
  // Melodia principal (nivel 1)
  const LEAD  = [C5,_,E5,_,G5,_,_,_,A5,_,G5,_,E5,_,D5,_, C5,_,_,_,E5,_,D5,_,C5,_,A4,_,G4,_,_,_, Eb5,_,_,_,D5,_,C5,_,Bb4,_,_,_,C5,_,D5,_, C5,_,E5,_,G5,_,A5,_,G5,_,E5,_,D5,_,_,_];
  // Harmonia — terca abaixo (nivel 2)
  const HARM  = [A4,_,C5,_,E5,_,_,_,F5,_,E5,_,C5,_,B4,_, A4,_,_,_,C5,_,B4,_,A4,_,F4,_,E4,_,_,_, C5,_,_,_,B4,_,A4,_,G4,_,_,_,A4,_,B4,_, A4,_,C5,_,E5,_,F5,_,E5,_,C5,_,B4,_,_,_];
  // Pads/acordes
  const PAD   = [[C4,E4,G4],_,_,_,_,_,_,_,[A3,C4,E4],_,_,_,_,_,_,_, [C4,E4,G4],_,_,_,_,_,_,_,[G3,B3,D4],_,_,_,_,_,_,_, [Eb4,G4,Bb4],_,_,_,_,_,_,_,[C4,E4,G4],_,_,_,_,_,_,_, [C4,E4,G4],_,_,_,_,_,_,_,[A3,C4,E4],_,_,_,_,_,_,_];
  // Metais/brass stabs (nivel 2)
  const BRASS = [_,_,_,_,_,_,_,G4,_,_,_,_,_,_,_,_, _,_,_,_,_,_,_,E4,_,_,_,_,_,_,G4,_, _,_,_,_,_,_,_,_,_,_,_,Ab4,_,_,_,_, _,_,_,_,_,_,_,G4,_,_,_,_,_,_,E4,_];

  // Configuracao musical por tema de arena
  const THEME_CFG = {
    favela: { bpm: 145, noTamb: false, noClave: false, noLead: false, noHarm: false, noBrass: false },
    predio: { bpm: 122, noTamb: true,  noClave: true,  noLead: false, noHarm: false, noBrass: true  },
    bosque: { bpm: 104, noTamb: false, noClave: true,  noLead: false, noHarm: false, noBrass: true  },
    rua:    { bpm: 160, noTamb: false, noClave: false, noLead: true,  noHarm: true,  noBrass: false },
  };
  let _tcfg = THEME_CFG.favela;

  let master = null, comp = null, rvb = null, nb = null, hb = null, step = 0, nextT = 0, timer = null, started = false, intensity = 0;

  function a() { return getAC(); }

  // Impulse response sintetico para reverb de sala
  function rvbIR(ac) {
    const len = Math.floor(ac.sampleRate * 1.6), buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4); }
    return buf;
  }

  function boot() {
    if (master) return;
    const ac = a();
    comp = ac.createDynamicsCompressor(); comp.threshold.value = -15; comp.knee.value = 9; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .22; comp.connect(ac.destination);
    rvb = ac.createConvolver(); rvb.buffer = rvbIR(ac);
    const rg = ac.createGain(); rg.gain.value = .16; rvb.connect(rg); rg.connect(comp);
    master = ac.createGain(); master.gain.value = soundMuted ? 0 : .42; master.connect(comp);
  }

  // Envia sinal para o reverb com gain reduzido
  function rv(node, amt) { if (!rvb) return; const ac = a(), g = ac.createGain(); g.gain.value = amt || .18; node.connect(g); g.connect(rvb); }

  function getNB() { if (!nb) { const ac = a(); nb = ac.createBuffer(1, Math.ceil(ac.sampleRate * .28), ac.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return nb; }
  function getHB() { if (!hb) { const ac = a(); hb = ac.createBuffer(1, Math.ceil(ac.sampleRate * .09), ac.sampleRate); const d = hb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return hb; }

  // Sintetizadores de percussao
  function kick(t) {
    const ac = a(), o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(master);
    o.type = 'sine'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(38, t + .38);
    g.gain.setValueAtTime(1.6, t); g.gain.linearRampToValueAtTime(.9, t + .04); g.gain.exponentialRampToValueAtTime(.001, t + .32);
    o.start(t); o.stop(t + .42);
    // Click de ataque
    const n = ac.createBufferSource(), nf = ac.createBiquadFilter(), ng = ac.createGain();
    n.buffer = getHB(); nf.type = 'highpass'; nf.frequency.value = 4500; n.connect(nf); nf.connect(ng); ng.connect(master);
    ng.gain.setValueAtTime(.45, t); ng.gain.exponentialRampToValueAtTime(.001, t + .011); n.start(t); n.stop(t + .02);
  }

  function snr(t) {
    const ac = a(), src = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = getNB(); fl.type = 'bandpass'; fl.frequency.value = 2300; fl.Q.value = .65; src.connect(fl); fl.connect(g); g.connect(master); rv(fl, .28);
    g.gain.setValueAtTime(.88, t); g.gain.exponentialRampToValueAtTime(.001, t + .17); src.start(t); src.stop(t + .21);
    const o = ac.createOscillator(), og = ac.createGain(); o.connect(og); og.connect(master);
    o.type = 'triangle'; o.frequency.value = 225; og.gain.setValueAtTime(.44, t); og.gain.exponentialRampToValueAtTime(.001, t + .082); o.start(t); o.stop(t + .1);
  }

  function hhC(t) { const ac = a(), src = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); src.buffer = getHB(); fl.type = 'highpass'; fl.frequency.value = 8500; src.connect(fl); fl.connect(g); g.connect(master); g.gain.setValueAtTime(.19, t); g.gain.exponentialRampToValueAtTime(.001, t + .04); src.start(t); src.stop(t + .06); }

  function hhO(t) { const ac = a(), src = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); src.buffer = getHB(); fl.type = 'highpass'; fl.frequency.value = 7000; src.connect(fl); fl.connect(g); g.connect(master); rv(fl, .14); g.gain.setValueAtTime(.34, t); g.gain.exponentialRampToValueAtTime(.001, t + .32); src.start(t); src.stop(t + .36); }

  function tamb(t) { const ac = a(), src = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); src.buffer = getHB(); fl.type = 'bandpass'; fl.frequency.value = 6800; fl.Q.value = 2.4; src.connect(fl); fl.connect(g); g.connect(master); g.gain.setValueAtTime(.27, t); g.gain.exponentialRampToValueAtTime(.001, t + .044); src.start(t); src.stop(t + .07); }

  function clave(t) { const ac = a(), o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(master); o.type = 'square'; o.frequency.value = 1520; g.gain.setValueAtTime(.3, t); g.gain.exponentialRampToValueAtTime(.001, t + .034); o.start(t); o.stop(t + .055); }

  // Sintetizadores melodicos
  function bss(t, f) {
    if (!f) return; const ac = a();
    const o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
    o.connect(fl); fl.connect(g); g.connect(master); o.type = 'sawtooth'; o.frequency.value = f;
    fl.type = 'lowpass'; fl.frequency.value = 560; fl.Q.value = 3;
    const dur = S * 3.4; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1.1, t + .007); g.gain.setValueAtTime(.82, t + dur * .4); g.gain.linearRampToValueAtTime(0, t + dur); o.start(t); o.stop(t + dur + .02);
    // Sub-octave para peso
    const s = ac.createOscillator(), sg = ac.createGain(); s.connect(sg); sg.connect(master); s.type = 'sine'; s.frequency.value = f * .5; sg.gain.setValueAtTime(0, t); sg.gain.linearRampToValueAtTime(.7, t + .014); sg.gain.linearRampToValueAtTime(0, t + dur * .72); s.start(t); s.stop(t + dur + .02);
  }

  function ld(t, f) {
    if (!f) return; const ac = a(), o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(master); rv(o, .22);
    o.type = 'square'; o.frequency.value = f;
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.connect(lg); lg.connect(o.frequency); lfo.frequency.value = 5.8; lg.gain.value = 6;
    const dur = S * 2.9; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.24, t + .013); g.gain.setValueAtTime(.19, t + dur * .72); g.gain.linearRampToValueAtTime(0, t + dur); o.start(t); lfo.start(t); o.stop(t + dur + .02); lfo.stop(t + dur + .02);
  }

  function hrm(t, f) {
    if (!f) return; const ac = a(), o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(master); rv(o, .14);
    o.type = 'triangle'; o.frequency.value = f; const dur = S * 2.9;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.11, t + .015); g.gain.setValueAtTime(.09, t + dur * .72); g.gain.linearRampToValueAtTime(0, t + dur); o.start(t); o.stop(t + dur + .02);
  }

  function pd(t, ns) {
    if (!ns || !Array.isArray(ns)) return; const ac = a(), dur = S * 16;
    ns.forEach(f => { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(master); rv(o, .28); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.08, t + S * 2); g.gain.setValueAtTime(.065, t + dur - S * 2); g.gain.linearRampToValueAtTime(0, t + dur); o.start(t); o.stop(t + dur + .02); });
  }

  function brass(t, f) {
    if (!f) return; const ac = a(), o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
    o.connect(fl); fl.connect(g); g.connect(master); rv(fl, .24);
    o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'bandpass'; fl.frequency.value = 2400; fl.Q.value = 1.3;
    const dur = S * 1.7; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.45, t + .009); g.gain.setValueAtTime(.32, t + dur * .38); g.gain.linearRampToValueAtTime(0, t + dur); o.start(t); o.stop(t + dur + .02);
  }

  function schedule() {
    const ac = a();
    while (nextT < ac.currentTime + .18) {
      const i = step % LEN;
      // Nivel 0: bateria + baixo + pads
      if (KICK[i]) kick(nextT); if (SNARE[i]) snr(nextT); if (HH[i]) hhC(nextT); if (HHO[i]) hhO(nextT);
      if (BASS[i]) bss(nextT, BASS[i]); if (PAD[i]) pd(nextT, PAD[i]);
      // Nivel 1: percussao brasileira + melodia
      if (intensity >= 1) {
        if (TAMB[i] && !_tcfg.noTamb) tamb(nextT);
        if (CLAVE[i] && !_tcfg.noClave) clave(nextT);
        if (LEAD[i] && !_tcfg.noLead) ld(nextT, LEAD[i]);
      }
      // Nivel 2: harmonia + metais
      if (intensity >= 2) {
        if (HARM[i] && !_tcfg.noHarm) hrm(nextT, HARM[i]);
        if (BRASS[i] && !_tcfg.noBrass) brass(nextT, BRASS[i]);
      }
      step++; nextT += S;
    }
    timer = setTimeout(schedule, 22);
  }

  return {
    start() {
      if (soundMuted) return;
      // Para limpo antes de reiniciar (garante troca de tema)
      if (timer) { clearTimeout(timer); timer = null; }
      started = true; intensity = 0; boot(); nextT = a().currentTime + .1; step = 0; schedule();
    },
    stop() { started = false; if (timer) { clearTimeout(timer); timer = null; } },
    setIntensity(v) { intensity = Math.max(0, Math.min(2, v | 0)); },
    setTheme(t) {
      _tcfg = THEME_CFG[t] || THEME_CFG.favela;
      BPM = _tcfg.bpm; S = 60 / BPM / 4;
    },
    syncMute() { if (!master) { if (!soundMuted) this.start(); return; } master.gain.linearRampToValueAtTime(soundMuted ? 0 : .42, a().currentTime + .3); if (!soundMuted && !started) this.start(); },
  };
})();
