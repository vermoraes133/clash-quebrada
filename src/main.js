// ╔══════════════════════════════════════════════════════════╗
// ║   CLASH QUEBRADA v2 — Phaser 3 + Vite entry point      ║
// ║   No game loop, no Canvas2D — Phaser handles rendering  ║
// ╚══════════════════════════════════════════════════════════╝

// ════════════════════════════════════════════════════════════
//  GLOBAL ERROR HANDLERS
//  Shows a user-friendly overlay if an unhandled error occurs.
// ════════════════════════════════════════════════════════════

function _showErrorOverlay(title, detail) {
  // Avoid stacking multiple overlays
  if (document.getElementById('cq-error-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'cq-error-overlay';
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:99999',
    'background:rgba(0,0,0,0.88)',
    'display:flex', 'flex-direction:column',
    'align-items:center', 'justify-content:center',
    'font-family:Arial,sans-serif', 'color:#fff',
    'padding:24px', 'text-align:center',
  ].join(';');

  overlay.innerHTML = `
    <div style="font-size:40px;margin-bottom:12px">\u26A0\uFE0F</div>
    <h2 style="color:#e74c3c;margin:0 0 8px">${title}</h2>
    <p style="color:#aaa;font-size:13px;max-width:340px;line-height:1.5;margin:0 0 16px">
      ${detail || 'Um erro inesperado ocorreu. Tente recarregar a pagina.'}
    </p>
    <button onclick="location.reload()" style="
      padding:10px 28px;border:none;border-radius:8px;
      background:#e67e22;color:#fff;font-size:15px;
      font-weight:bold;cursor:pointer;
    ">Recarregar</button>
    <p style="color:#555;font-size:10px;margin-top:12px">Clash Quebrada v2</p>
  `;

  document.body.appendChild(overlay);
}

window.onerror = function (msg, source, line, col, error) {
  console.error('[GLOBAL ERROR]', msg, source, line, col, error);
  _showErrorOverlay(
    'Erro no Jogo',
    `${msg || 'Erro desconhecido'}<br><span style="color:#666;font-size:11px">${source || ''}:${line || '?'}</span>`
  );
  // Return true to suppress the default browser error dialog
  return true;
};

window.onunhandledrejection = function (event) {
  const reason = event.reason;
  const msg = reason instanceof Error ? reason.message : String(reason || 'Promise rejeitada');
  console.error('[UNHANDLED REJECTION]', reason);
  _showErrorOverlay(
    'Erro Assíncrono',
    msg
  );
};

// ════════════════════════════════════════════════════════════

import Phaser from 'phaser';

// ── Scene (unified Canvas2D rendering) ──────────────────────
import GameScene from './scenes/GameScene.js';

// ── Config & State ───────────────────────────────────────────
import { W, H, DEFAULT_DECK, DIFF_PRESETS, ADMIN_EMAILS } from './config/constants.js';
import { CARDS, SHOP_CARD_KEYS, BASE_KEYS } from './config/cards.js';
import { initFirebase, getDb, getAuth, fbKey } from './config/firebase.js';
import { APP, defaultProgress, loadData, saveData } from './state/GameState.js';

// ── Systems ──────────────────────────────────────────────────
import { SFX, MUSIC, getAC, isMuted, setMuted } from './systems/AudioSystem.js';
import {
  G, shakeAmt, shakeT, triggerShake, resetShake, updateShake, rnd, rand, dst,
  currentTheme, currentDiff, setCurrentDiff, setCurrentTheme,
  getCardLevel, levelMult, getAllKeys, addXPtoCards, getCardScaled,
  makeTowers, setupThemeObstacles, newBattle,
  spawnUnit, doSpell, dealDmg, applySpecial, findTarget,
  updateUnits, updateProjectiles, updateTowers, updateAI, checkWin,
  setApp, setOnBattleEnd
} from './systems/BattleLogic.js';
import {
  createRoom, joinRoom, cleanupOnline, showLobby, hideLobby, showLobbyErr,
  enterMatchLobby, leaveMatchLobby, challengePlayer, acceptChallenge,
  declineChallenge, cancelChallenge, requestRematch, declineRematch,
  sendOnlineDeploy, _gpRegister, _gpUpdate, flipY,
  fbSaveUser, fbLoadAccount, fbLoadRanking, fbUpdateRanking, updateRanking,
  checkAdminAccess, loadDifficultyConfig, saveDifficultyConfig,
  getRoomId, getMyRole, getOpponentName, getRematchPending, getOpponentDeck,
  setGoScreen as setOnlineGoScreen, setSaveDataFn as setOnlineSaveDataFn,
  setApp as setOnlineApp, bindLobbyEvents
} from './systems/OnlineSync.js';

// ════════════════════════════════════════════════════════════
//  PHASER GAME CONFIG
// ════════════════════════════════════════════════════════════

const config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game-container',
  backgroundColor: '#060610',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene],
};

// Game instance — created after login
let game = null;

// Track current active scene key for transitions
let _currentSceneKey = null;

// ════════════════════════════════════════════════════════════
//  SCREEN MANAGEMENT (goScreen)
// ════════════════════════════════════════════════════════════

// goScreen — just sets APP.screen, the GameScene reads it each frame
export function goScreen(s) {
  APP.screen = s;
  if (s === 'battle') { MUSIC.start(); _gpUpdate(APP.mode === 'online' ? 'online' : 'solo'); }
  if (s === 'menu') { MUSIC.stop(); _gpUpdate('menu'); }
  if (s === 'ranking') fbLoadRanking();
  if (s === 'shop') { /* shopScrollY reset handled in GameScene */ }
  if (s === 'result') setTimeout(showFeedback, 3500);
}

// ════════════════════════════════════════════════════════════
//  WIRE UP SYSTEMS
// ════════════════════════════════════════════════════════════

setApp(APP);
setOnlineApp(APP);
setOnBattleEnd(onBattleEnd);
setOnlineGoScreen(goScreen);
setOnlineSaveDataFn(saveData);

// Make challengePlayer available globally for onclick in HTML
window.challengePlayer = challengePlayer;

// ════════════════════════════════════════════════════════════
//  BATTLE END HANDLER
// ════════════════════════════════════════════════════════════

function onBattleEnd(phase) {
  MUSIC.stop();
  G.earnedDiamonds = 0;

  if (phase === 'win') {
    SFX.win();
    APP.battleResult = 'win';
    APP.progress.wins++;
    APP.progress.trophies += 30;
    addXPtoCards(APP.progress.deck, 25);
    if (APP.mode === 'solo' || APP.mode === 'online') {
      const t = G.time;
      G.earnedDiamonds = t >= 150 ? 5 : t >= 120 ? 4 : t >= 90 ? 3 : t >= 60 ? 2 : 1;
      if (!G.forfeited) {
        APP.progress.diamonds = (APP.progress.diamonds || 0) + G.earnedDiamonds;
      }
    }
  } else if (phase === 'lose') {
    SFX.lose();
    APP.battleResult = 'lose';
    APP.progress.losses++;
    APP.progress.trophies = Math.max(0, APP.progress.trophies - 20);
    addXPtoCards(APP.progress.deck, 10);
    G.earnedDiamonds = 0;
  } else {
    APP.battleResult = 'draw';
    APP.progress.draws++;
    APP.progress.trophies += 5;
    addXPtoCards(APP.progress.deck, 12);
    G.earnedDiamonds = 0;
  }

  updateRanking();

  if (APP.mode === 'online') {
    APP.wasOnline = true;
    const db = getDb();
    const roomId = getRoomId();
    if (db && roomId) {
      db.ref('rooms/' + roomId + '/events').off();
      db.ref('rooms/' + roomId + '/rematch').remove();
    }
    if (db && APP.account) {
      db.ref('matchlobby/challenges/' + fbKey(APP.account.email)).remove();
    }
    _gpUpdate('menu');
  }

  setTimeout(() => goScreen('result'), 2000);
}

// ════════════════════════════════════════════════════════════
//  FLOW — Deck select + Battle start
// ════════════════════════════════════════════════════════════

function startDeckSelect() {
  APP.deckTimer = 30;
  APP.tmpDeck = [...APP.progress.deck];
  clearInterval(APP.deckTick);

  APP.deckTick = setInterval(() => {
    if (APP.screen !== 'deckSelect') {
      clearInterval(APP.deckTick);
      return;
    }
    APP.deckTimer--;
    if (APP.deckTimer <= 0) {
      clearInterval(APP.deckTick);
      const allKeys = getAllKeys().filter(k => CARDS[k]);
      while (APP.tmpDeck.length < 8) {
        APP.tmpDeck.push(allKeys[Math.floor(Math.random() * allKeys.length)]);
      }
      APP.progress.deck = [...APP.tmpDeck];
      saveData();
      if (APP.progress.isNew) {
        APP.progress.isNew = false;
        goScreen('tutorial');
      } else {
        startBattle();
      }
    }
  }, 1000);

  goScreen('deckSelect');
}

function startBattle() {
  clearInterval(APP.deckTick);
  APP.tutStep = 0;
  newBattle();
  goScreen('battle');
}

// Make these available on APP for scenes that need them
APP._startDeckSelect = startDeckSelect;
APP._startBattle = startBattle;

// ════════════════════════════════════════════════════════════
//  ADMIN PANEL (DOM handlers — preserved from Canvas version)
// ════════════════════════════════════════════════════════════

function showAdmin() {
  document.getElementById('sldAiMin').value = currentDiff.aiMin;
  document.getElementById('sldAiMax').value = currentDiff.aiMax;
  document.getElementById('sldStat').value = currentDiff.statMult;
  document.getElementById('sldElixir').value = currentDiff.elixirMult;
  document.getElementById('chkSmart').checked = currentDiff.aiSmart || false;
  document.getElementById('admCurrent').textContent = currentDiff.label || 'Customizado';
  document.getElementById('admStatus').textContent = '';
  _updateAdmLabels();
  document.getElementById('admin').classList.add('show');
}

function hideAdmin() {
  document.getElementById('admin').classList.remove('show');
}

function _updateAdmLabels() {
  document.getElementById('valAiMin').textContent = parseFloat(document.getElementById('sldAiMin').value).toFixed(1);
  document.getElementById('valAiMax').textContent = parseFloat(document.getElementById('sldAiMax').value).toFixed(1);
  document.getElementById('valStat').textContent = parseFloat(document.getElementById('sldStat').value).toFixed(2) + '\u00d7';
  document.getElementById('valElixir').textContent = parseFloat(document.getElementById('sldElixir').value).toFixed(2) + '\u00d7';
}

['sldAiMin', 'sldAiMax', 'sldStat', 'sldElixir'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', _updateAdmLabels);
});

function _applyPreset(name) {
  const p = DIFF_PRESETS[name];
  if (!p) return;
  document.getElementById('sldAiMin').value = p.aiMin;
  document.getElementById('sldAiMax').value = p.aiMax;
  document.getElementById('sldStat').value = p.statMult;
  document.getElementById('sldElixir').value = p.elixirMult;
  document.getElementById('chkSmart').checked = p.aiSmart;
  document.getElementById('admCurrent').textContent = p.label;
  _updateAdmLabels();
}

const btnDiffFacil = document.getElementById('btnDiffFacil');
const btnDiffMedio = document.getElementById('btnDiffMedio');
const btnDiffDificil = document.getElementById('btnDiffDificil');
const btnDiffImpossivel = document.getElementById('btnDiffImpossivel');
if (btnDiffFacil) btnDiffFacil.addEventListener('click', () => _applyPreset('facil'));
if (btnDiffMedio) btnDiffMedio.addEventListener('click', () => _applyPreset('medio'));
if (btnDiffDificil) btnDiffDificil.addEventListener('click', () => _applyPreset('dificil'));
if (btnDiffImpossivel) btnDiffImpossivel.addEventListener('click', () => _applyPreset('impossivel'));

const btnSaveDiff = document.getElementById('btnSaveDiff');
if (btnSaveDiff) {
  btnSaveDiff.addEventListener('click', async () => {
    const diff = {
      aiMin: parseFloat(document.getElementById('sldAiMin').value),
      aiMax: parseFloat(document.getElementById('sldAiMax').value),
      statMult: parseFloat(document.getElementById('sldStat').value),
      elixirMult: parseFloat(document.getElementById('sldElixir').value),
      aiSmart: document.getElementById('chkSmart').checked,
      label: document.getElementById('admCurrent').textContent,
    };
    document.getElementById('admStatus').textContent = 'Salvando...';
    await saveDifficultyConfig(diff);
    document.getElementById('admStatus').textContent = 'Salvo! Todos os jogadores ja receberam a atualizacao.';
  });
}

const btnAdminBack = document.getElementById('btnAdminBack');
if (btnAdminBack) btnAdminBack.addEventListener('click', hideAdmin);

// ── Admin Feedbacks ──────────────────────────────────────────
let _fbAdmOpen = false;
const btnAdminFeedbacks = document.getElementById('btnAdminFeedbacks');
if (btnAdminFeedbacks) {
  btnAdminFeedbacks.addEventListener('click', async () => {
    _fbAdmOpen = !_fbAdmOpen;
    const wrap = document.getElementById('admFbWrap');
    const btn = document.getElementById('btnAdminFeedbacks');
    if (!_fbAdmOpen) {
      wrap.style.display = 'none';
      btn.textContent = 'Ver Feedbacks dos Jogadores';
      return;
    }
    wrap.style.display = 'block';
    btn.textContent = 'Fechar Feedbacks';

    const listEl = document.getElementById('admFbList');
    const statsEl = document.getElementById('admFbStats');
    listEl.innerHTML = '<p style="color:#aaa;text-align:center">Carregando...</p>';
    statsEl.innerHTML = '';

    const db = getDb();
    if (!db) {
      listEl.innerHTML = '<p style="color:#e74c3c;text-align:center">Firebase nao conectado.</p>';
      return;
    }

    try {
      const snap = await db.ref('feedback').orderByChild('ts').limitToLast(50).once('value');
      const items = [];
      snap.forEach(c => items.unshift(c.val()));
      if (!items.length) {
        listEl.innerHTML = '<p style="color:#888;text-align:center">Nenhum feedback ainda.</p>';
        return;
      }
      const total = items.length;
      const avg = (items.reduce((s, f) => s + (f.rating || 0), 0) / total).toFixed(1);
      statsEl.innerHTML = `<span>${total} avaliacoes</span><span>Media: <strong>${avg}/5</strong></span>`;

      const modeLabel = { solo: 'Solo', online: 'Online' };
      listEl.innerHTML = items.map(f => {
        const stars = '\u2b50'.repeat(Math.max(0, Math.min(5, f.rating || 0)));
        const empty = '\u2606'.repeat(5 - (f.rating || 0));
        const dt = f.ts
          ? new Date(f.ts).toLocaleDateString('pt-BR', {
              day: '2-digit', month: '2-digit', year: '2-digit',
              hour: '2-digit', minute: '2-digit',
            })
          : '';
        return `<div class="adm-fb-item">
          <div class="adm-fb-header">
            <span class="adm-fb-stars">${stars}<span style="color:#444">${empty}</span></span>
            <span class="adm-fb-name">${f.player || 'Anonimo'}</span>
            <span class="adm-fb-mode">${modeLabel[f.mode] || f.mode || '?'}</span>
            <span class="adm-fb-date">${dt}</span>
          </div>
          ${f.comment ? `<p class="adm-fb-comment">"${f.comment}"</p>` : ''}
        </div>`;
      }).join('');
    } catch (e) {
      listEl.innerHTML = '<p style="color:#e74c3c;text-align:center">Erro ao carregar: ' + e.message + '</p>';
    }
  });
}

// Make showAdmin accessible for MenuScene
window._showAdmin = showAdmin;

// ════════════════════════════════════════════════════════════
//  FEEDBACK OVERLAY (DOM handlers — preserved)
// ════════════════════════════════════════════════════════════

let _fbRating = 0;

function showFeedback() {
  _fbRating = 0;
  document.querySelectorAll('.fb-stars span').forEach(s => s.classList.remove('lit'));
  const fbText = document.getElementById('fbText');
  if (fbText) fbText.value = '';
  const overlay = document.getElementById('feedbackOverlay');
  if (overlay) overlay.classList.add('show');
}

function hideFeedback() {
  const overlay = document.getElementById('feedbackOverlay');
  if (overlay) overlay.classList.remove('show');
}

document.querySelectorAll('#fbStars span').forEach(s => {
  s.addEventListener('click', () => {
    _fbRating = parseInt(s.dataset.v);
    document.querySelectorAll('#fbStars span').forEach(el => {
      el.classList.toggle('lit', parseInt(el.dataset.v) <= _fbRating);
    });
  });
});

const btnFbSend = document.getElementById('btnFbSend');
if (btnFbSend) {
  btnFbSend.addEventListener('click', async () => {
    if (_fbRating === 0) {
      const pEl = document.getElementById('feedbackOverlay').querySelector('p');
      if (pEl) {
        pEl.style.color = '#e74c3c';
        setTimeout(() => { pEl.style.color = ''; }, 1200);
      }
      return;
    }
    const fbData = {
      rating: _fbRating,
      text: document.getElementById('fbText').value.trim(),
      name: APP.account?.name || 'Anonimo',
      mode: APP.mode || 'solo',
      result: APP.battleResult || '?',
      ts: Date.now(),
    };
    const db = getDb();
    if (db) {
      try { await db.ref('feedback').push(fbData); } catch (e) { /* silent */ }
    }
    hideFeedback();
  });
}

const btnFbSkip = document.getElementById('btnFbSkip');
if (btnFbSkip) btnFbSkip.addEventListener('click', hideFeedback);

// ════════════════════════════════════════════════════════════
//  LOGIN (DOM handler — preserved, starts Phaser after auth)
//  Firebase operations are wrapped in try-catch.
// ════════════════════════════════════════════════════════════

const btnEnter = document.getElementById('btnEnter');
if (btnEnter) {
  btnEnter.addEventListener('click', async () => {
    const name = document.getElementById('iName').value.trim();
    const email = document.getElementById('iEmail').value.trim();
    const pass = document.getElementById('iPass').value;
    const err = document.getElementById('loginErr');
    if (!name) { err.textContent = 'Digite seu apelido!'; return; }
    if (!email || !email.includes('@')) { err.textContent = 'Email invalido!'; return; }
    if (!pass || pass.length < 6) { err.textContent = 'Senha deve ter no minimo 6 caracteres!'; return; }

    err.textContent = 'Verificando conta...';
    document.getElementById('btnEnter').disabled = true;

    try {
      initFirebase();
    } catch (fbInitErr) {
      console.warn('[Login] Firebase init falhou:', fbInitErr.message || fbInitErr);
      // Continue anyway — offline mode
    }

    const _AUTH_BYPASS = [
      'auth/operation-not-allowed',
      'auth/configuration-not-found',
      'auth/network-request-failed',
      'auth/internal-error',
      'auth/too-many-requests',
    ];

    const auth = getAuth();
    if (auth) {
      try {
        await auth.signInWithEmailAndPassword(email, pass);
      } catch (authErr) {
        const c = authErr.code || '';
        const needsCreate = c === 'auth/user-not-found' || c === 'auth/invalid-credential';
        if (needsCreate) {
          try {
            err.textContent = 'Verificando conta...';
            await auth.createUserWithEmailAndPassword(email, pass);
          } catch (regErr) {
            const rc = regErr.code || '';
            if (rc === 'auth/email-already-in-use') {
              document.getElementById('btnEnter').disabled = false;
              err.textContent = 'Senha incorreta!';
              return;
            }
            if (rc === 'auth/weak-password') {
              document.getElementById('btnEnter').disabled = false;
              err.textContent = 'Senha fraca (min. 6 caracteres)!';
              return;
            }
            if (rc === 'auth/invalid-email') {
              document.getElementById('btnEnter').disabled = false;
              err.textContent = 'Email invalido!';
              return;
            }
            if (!_AUTH_BYPASS.includes(rc) && !rc.startsWith('auth/')) {
              console.warn('Auth create aviso:', rc);
            }
          }
        } else if (c === 'auth/wrong-password') {
          document.getElementById('btnEnter').disabled = false;
          err.textContent = 'Senha incorreta!';
          return;
        } else if (!_AUTH_BYPASS.includes(c) && !c.startsWith('auth/')) {
          console.warn('Firebase Auth indisponivel (' + c + ')');
        }
      }
    }

    // Load account from Firebase or local storage
    let fbUser = null;
    try {
      fbUser = await fbLoadAccount(email);
    } catch (loadErr) {
      console.warn('[Login] fbLoadAccount falhou:', loadErr.message || loadErr);
    }

    if (fbUser) {
      APP.account = { name: fbUser.name, email: fbUser.email, id: fbUser.id };
      APP.progress = {
        trophies: fbUser.trophies || 0,
        wins: fbUser.wins || 0,
        losses: fbUser.losses || 0,
        draws: fbUser.draws || 0,
        cardXP: fbUser.cardXP || {},
        deck: fbUser.deck || [...DEFAULT_DECK],
        diamonds: fbUser.diamonds || 0,
        owned: fbUser.owned || [],
        isNew: false,
      };
      APP.ranking = [];
    } else {
      const saved = loadData();
      if (saved && saved.account && saved.account.email === email) {
        APP.account = saved.account;
        const sp = saved.progress || defaultProgress();
        if (sp.diamonds === undefined) sp.diamonds = 0;
        if (!sp.owned) sp.owned = [];
        APP.progress = sp;
        APP.ranking = saved.ranking || [];
      } else {
        APP.account = { name, email, id: Date.now().toString(36) };
        APP.progress = defaultProgress();
        APP.ranking = [];
        saveData();
      }
    }

    APP.account.name = name;

    try {
      await checkAdminAccess();
    } catch (_e) {
      console.warn('[Login] checkAdminAccess falhou:', _e.message || _e);
    }
    try {
      loadDifficultyConfig();
    } catch (_e) {
      console.warn('[Login] loadDifficultyConfig falhou:', _e.message || _e);
    }
    try {
      _gpRegister();
    } catch (_e) {
      console.warn('[Login] _gpRegister falhou:', _e.message || _e);
    }

    // Bind lobby DOM events (challenge accept/decline buttons etc.)
    try {
      bindLobbyEvents();
    } catch (_e) {
      console.warn('[Login] bindLobbyEvents falhou:', _e.message || _e);
    }

    document.getElementById('btnEnter').disabled = false;
    err.textContent = '';
    document.getElementById('login').classList.add('hide');

    // Create Phaser game instance (only once, after first login)
    if (!game) {
      try {
        APP.screen = 'menu'; // Start at menu
        game = new Phaser.Game(config);
      } catch (phaserErr) {
        console.error('[Login] Phaser Game creation falhou:', phaserErr);
        _showErrorOverlay(
          'Erro ao Iniciar o Jogo',
          'Nao foi possivel criar a instancia do Phaser. Verifique se seu navegador suporta WebGL/Canvas.'
        );
        return;
      }
    } else {
      APP.screen = 'menu';
    }
  });
}

// ── Login keyboard navigation ────────────────────────────────
const iName = document.getElementById('iName');
const iEmail = document.getElementById('iEmail');
const iPass = document.getElementById('iPass');
if (iName) iName.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('iEmail').focus(); });
if (iEmail) iEmail.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('iPass').focus(); });
if (iPass) iPass.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btnEnter').click(); });

// ── Pre-load saved data into login fields ────────────────────
(() => {
  const saved = loadData();
  if (saved && saved.account) {
    const nameEl = document.getElementById('iName');
    const emailEl = document.getElementById('iEmail');
    if (nameEl) nameEl.value = saved.account.name || '';
    if (emailEl) emailEl.value = saved.account.email || '';
  }
})();
