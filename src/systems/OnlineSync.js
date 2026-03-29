// ════════════════════════════════════════════════════════════
//  ONLINE SYNC — Rooms, challenges, presence, rematch,
//                Firebase user/ranking, presence system
//  Ported from index.html
// ════════════════════════════════════════════════════════════

import { initFirebase, getDb, fbKey } from '../config/firebase.js';
import { ARENA_TOP, ARENA_BOT, DEFAULT_DECK, ADMIN_EMAILS } from '../config/constants.js';
import { CARDS, BASE_KEYS } from '../config/cards.js';
import { SFX, MUSIC } from './AudioSystem.js';
import { spawnUnit, newBattle, addXPtoCards } from './BattleLogic.js';
import * as BattleLogic from './BattleLogic.js';

// ── APP reference (set via setApp) ───────────────────────────
let APP = null;
export function setApp(app) { APP = app; }

// ── Scene navigation callback ────────────────────────────────
let _goScreen = null;
export function setGoScreen(fn) { _goScreen = fn; }
function goScreen(s) { if (_goScreen) _goScreen(s); }

// ── Save data callback ──────────────────────────────────────
let _saveDataFn = null;
export function setSaveDataFn(fn) { _saveDataFn = fn; }
function saveData() { if (_saveDataFn) _saveDataFn(); }

// ── Module-level state ───────────────────────────────────────
let _roomId = null, _myRole = null, _opponentName = 'Oponente';
let _opponentDeck = [], _rematchPending = false;

// Lobby/presence state
let _presenceRef = null, _playersRef = null, _challengeRef = null, _lobbyHB = null;
let _mlPlayers = [], _incomingCh = null, _outgoingCh = null;
let _challengeTimeout = null, _acceptTimeout = null, _roomPresenceRef = null;
// Presenca global
let _globalPresRef = null;

// Ranking state
let _rkOnline = false, _rkLoading = false;

// ── Getters ──────────────────────────────────────────────────
export function getRoomId() { return _roomId; }
export function getMyRole() { return _myRole; }
export function getOpponentName() { return _opponentName; }
export function getRematchPending() { return _rematchPending; }
export function getOpponentDeck() { return _opponentDeck; }
export function isRankingOnline() { return _rkOnline; }
export function isRankingLoading() { return _rkLoading; }

// ── Flip Y for online (show opponent units on correct side) ──
export function flipY(y) { return ARENA_TOP + ARENA_BOT - y; }

// ════════════════════════════════════════════════════════════
//  GLOBAL PRESENCE SYSTEM
// ════════════════════════════════════════════════════════════

export function _gpUpdate(status) {
  if (!_globalPresRef || !getDb()) return;
  _globalPresRef.update({ status, ts: Date.now(), trophies: APP && APP.progress ? APP.progress.trophies || 0 : 0 });
}

export function _gpRegister() {
  const db = getDb();
  if (!db || !APP || !APP.account) return;
  const key = fbKey(APP.account.email);
  _globalPresRef = db.ref('presence/' + key);
  _globalPresRef.set({ name: APP.account.name, email: APP.account.email, status: 'menu', ts: Date.now(), trophies: APP.progress ? APP.progress.trophies || 0 : 0 });
  _globalPresRef.onDisconnect().remove();
}

// ════════════════════════════════════════════════════════════
//  FIREBASE: Users & Ranking
// ════════════════════════════════════════════════════════════

// Salva progresso do jogador no Firebase
export async function fbSaveUser() {
  const db = getDb();
  if (!db || !APP || !APP.account) return;
  try {
    await db.ref('users/' + fbKey(APP.account.email)).set({
      id: APP.account.id, name: APP.account.name, email: APP.account.email,
      trophies: APP.progress.trophies, wins: APP.progress.wins,
      losses: APP.progress.losses || 0, draws: APP.progress.draws || 0,
      cardXP: APP.progress.cardXP || {}, deck: APP.progress.deck || [...DEFAULT_DECK],
      diamonds: APP.progress.diamonds || 0, owned: APP.progress.owned || [],
      updated: Date.now()
    });
  } catch (e) {}
}

// Carrega dados de um jogador pelo email
export async function fbLoadAccount(email) {
  const db = getDb();
  if (!db && !initFirebase()) return null;
  try {
    const snap = await (getDb()).ref('users/' + fbKey(email)).once('value');
    return snap.val();
  } catch (e) { return null; }
}

// Busca top-20 do ranking global ordenado por trofeus
export async function fbLoadRanking() {
  const db = getDb();
  if (!db && !initFirebase()) return;
  _rkLoading = true;
  try {
    const snap = await (getDb()).ref('users').orderByChild('trophies').limitToLast(20).once('value');
    const list = [];
    snap.forEach(c => { const d = c.val(); if (d && d.name) list.push({ id: d.id, name: d.name, trophies: d.trophies || 0, wins: d.wins || 0 }); });
    list.sort((a, b) => b.trophies - a.trophies);
    if (list.length) { APP.ranking = list; _rkOnline = true; saveData(); }
  } catch (e) { _rkOnline = false; }
  _rkLoading = false;
}

// Salva e depois atualiza ranking
export async function fbUpdateRanking() {
  await fbSaveUser();
  await fbLoadRanking();
}

// updateRanking: atualiza local + Firebase
export function updateRanking() {
  if (!APP || !APP.account) return;
  const me = { name: APP.account.name, trophies: APP.progress.trophies, wins: APP.progress.wins, id: APP.account.id };
  const idx = APP.ranking.findIndex(r => r.id === me.id);
  if (idx >= 0) APP.ranking[idx] = me; else APP.ranking.push(me);
  APP.ranking.sort((a, b) => b.trophies - a.trophies);
  APP.ranking = APP.ranking.slice(0, 20);
  saveData();
  fbUpdateRanking();
}

// ════════════════════════════════════════════════════════════
//  DIFFICULTY CONFIG (Firebase listener)
// ════════════════════════════════════════════════════════════

export function loadDifficultyConfig() {
  const db = getDb();
  if (!db) return;
  db.ref('config/difficulty').on('value', snap => {
    const d = snap.val();
    if (d && typeof d.aiMin === 'number') {
      BattleLogic.setCurrentDiff({
        aiMin: d.aiMin, aiMax: d.aiMax,
        statMult: d.statMult, elixirMult: d.elixirMult,
        aiSmart: !!d.aiSmart, label: d.label || 'Customizado'
      });
    }
  });
}

export async function saveDifficultyConfig(diff) {
  const db = getDb();
  if (!db || !APP || !APP.isAdmin) return;
  try {
    await db.ref('config/difficulty').set({
      ...diff, updatedBy: APP.account.name, updatedAt: Date.now()
    });
  } catch (e) {}
}

// ════════════════════════════════════════════════════════════
//  ROOM MANAGEMENT (private code rooms)
// ════════════════════════════════════════════════════════════

export function createRoom() {
  if (!initFirebase()) return;
  const db = getDb();
  const code = Math.random().toString(36).substr(2, 6).toUpperCase();
  _roomId = code; _myRole = 'host';
  const myDeckStr = JSON.stringify(APP.progress.deck);
  db.ref('rooms/' + code).set({
    host: { name: APP.account.name, id: APP.account.id, deck: myDeckStr },
    status: 'waiting', created: Date.now()
  });
  // Show code in UI
  const lbMenu = document.getElementById('lbMenu');
  const lbWait = document.getElementById('lbWait');
  const lbCode = document.getElementById('lbCode');
  const lbStatus = document.getElementById('lbStatus');
  if (lbMenu) lbMenu.style.display = 'none';
  if (lbWait) lbWait.style.display = 'flex';
  if (lbCode) lbCode.textContent = code;
  if (lbStatus) lbStatus.textContent = 'Aguardando adversario...';
  // Listen for guest
  db.ref('rooms/' + code + '/guest').on('value', snap => {
    const g = snap.val(); if (!g) return;
    _opponentName = g.name || 'Oponente';
    if (lbStatus) lbStatus.textContent = _opponentName + ' entrou! Iniciando...';
    setTimeout(() => {
      db.ref('rooms/' + code + '/status').set('playing');
      _startOnlineBattle(JSON.parse(g.deck || '[]'));
    }, 1800);
  });
}

export function joinRoom() {
  const iCode = document.getElementById('iCode');
  const code = iCode ? iCode.value.trim().toUpperCase() : '';
  if (code.length < 4) { showLobbyErr('Codigo invalido'); return; }
  if (!initFirebase()) return;
  const db = getDb();
  db.ref('rooms/' + code + '/host').once('value', snap => {
    const h = snap.val();
    if (!h) { showLobbyErr('Sala "' + code + '" nao encontrada'); return; }
    _roomId = code; _myRole = 'guest'; _opponentName = h.name || 'Oponente';
    const lbMenu = document.getElementById('lbMenu');
    const lbWait = document.getElementById('lbWait');
    const lbLabel = document.getElementById('lbLabel');
    const lbCode = document.getElementById('lbCode');
    const lbStatus = document.getElementById('lbStatus');
    if (lbMenu) lbMenu.style.display = 'none';
    if (lbWait) lbWait.style.display = 'flex';
    if (lbLabel) lbLabel.textContent = 'Entrando na sala de ' + _opponentName + ':';
    if (lbCode) lbCode.textContent = code;
    if (lbStatus) lbStatus.textContent = 'Conectando...';
    // Register as guest
    db.ref('rooms/' + code + '/guest').set({
      name: APP.account.name, id: APP.account.id, deck: JSON.stringify(APP.progress.deck)
    });
    // Wait for host to set status 'playing'
    db.ref('rooms/' + code + '/status').on('value', snap2 => {
      if (snap2.val() === 'playing') {
        if (lbStatus) lbStatus.textContent = 'Conectado! Iniciando...';
        setTimeout(() => _startOnlineBattle(JSON.parse(h.deck || '[]')), 500);
      }
    });
  });
}

function _startOnlineBattle(opponentDeck) {
  hideLobby();
  APP.mode = 'online';
  APP.wasOnline = false;
  _opponentDeck = [...opponentDeck];
  _rematchPending = false;
  newBattle(APP.progress.deck, opponentDeck);
  goScreen('battle');
  _listenOnlineEvents();
  _listenOpponentPresence();
}

function _listenOnlineEvents() {
  const db = getDb();
  if (!db || !_roomId) return;
  db.ref('rooms/' + _roomId + '/events').on('child_added', snap => {
    const e = snap.val(); if (!e || e.role === _myRole || APP.screen !== 'battle') return;
    spawnUnit(e.card, e.x, flipY(e.y), 'enemy');
  });
}

function _listenOpponentPresence() {
  const db = getDb();
  if (!_roomId || !db) return;
  _roomPresenceRef = db.ref('rooms/' + _roomId + '/host');
  _roomPresenceRef.on('value', snap => {
    if (APP.screen !== 'battle' && APP.screen !== 'result') return;
    if (snap.val() === null && APP.screen === 'battle') {
      // Sala destruida — oponente desconectou
      _roomPresenceRef.off();
      const G = BattleLogic.getG();
      G.phase = 'win'; // vitoria por W.O.
      APP.battleResult = 'win';
      MUSIC.stop(); SFX.win();
      APP.wasOnline = true;
      APP.progress.wins++;
      APP.progress.trophies += 30;
      addXPtoCards(APP.progress.deck, 25);
      G.earnedDiamonds = 2;
      APP.progress.diamonds = (APP.progress.diamonds || 0) + 2;
      updateRanking();
      // Banner de desconexao antes do resultado
      G._dcBanner = true;
      setTimeout(() => { G._dcBanner = false; goScreen('result'); }, 3000);
    }
  });
}

// ════════════════════════════════════════════════════════════
//  REMATCH
// ════════════════════════════════════════════════════════════

export function requestRematch() {
  const db = getDb();
  if (!db || !_roomId) { goScreen('menu'); return; }
  _rematchPending = true;
  db.ref('rooms/' + _roomId + '/rematch/' + _myRole).set('ready');
  const opRole = _myRole === 'host' ? 'guest' : 'host';
  db.ref('rooms/' + _roomId + '/rematch/' + opRole).on('value', snap => {
    const v = snap.val();
    if (v === 'ready') {
      // Ambos prontos — reinicia a batalha!
      db.ref('rooms/' + _roomId + '/rematch/' + opRole).off();
      db.ref('rooms/' + _roomId + '/rematch').remove();
      db.ref('rooms/' + _roomId + '/events').remove();
      _rematchPending = false; APP.wasOnline = false; APP.mode = 'online';
      newBattle(APP.progress.deck, _opponentDeck);
      goScreen('battle');
      _listenOnlineEvents();
    } else if (v === 'left') {
      db.ref('rooms/' + _roomId + '/rematch/' + opRole).off();
      _rematchPending = false;
      cleanupOnline();
      goScreen('menu');
    }
  });
}

export function declineRematch() {
  const db = getDb();
  if (db && _roomId) {
    db.ref('rooms/' + _roomId + '/rematch/' + _myRole).set('left');
    const opRole = _myRole === 'host' ? 'guest' : 'host';
    db.ref('rooms/' + _roomId + '/rematch/' + opRole).off();
  }
  _rematchPending = false;
  APP.wasOnline = false;
  cleanupOnline();
  goScreen('menu');
}

// ════════════════════════════════════════════════════════════
//  SEND DEPLOY (online)
// ════════════════════════════════════════════════════════════

export function sendOnlineDeploy(card, x, y) {
  const db = getDb();
  if (!db || !_roomId || !APP || APP.mode !== 'online') return;
  db.ref('rooms/' + _roomId + '/events').push({ role: _myRole, card, x, y, t: Date.now() });
}

// ════════════════════════════════════════════════════════════
//  CLEANUP ONLINE
// ════════════════════════════════════════════════════════════

export function cleanupOnline() {
  const db = getDb();
  if (db && _roomId) {
    db.ref('rooms/' + _roomId + '/events').off();
    db.ref('rooms/' + _roomId + '/guest').off();
    db.ref('rooms/' + _roomId + '/status').off();
    db.ref('rooms/' + _roomId + '/rematch').off();
    db.ref('rooms/' + _roomId + '/host').off();
  }
  if (_roomPresenceRef) { _roomPresenceRef.off(); _roomPresenceRef = null; }
  clearTimeout(_challengeTimeout); _challengeTimeout = null;
  clearTimeout(_acceptTimeout); _acceptTimeout = null;
  _roomId = null; _myRole = null;
  if (APP) { APP.mode = 'solo'; APP.wasOnline = false; }
  _rematchPending = false;
}

// Called from checkWin in BattleLogic when online battle ends
export function onOnlineBattleEnd() {
  const db = getDb();
  _rematchPending = false;
  if (db && _roomId) {
    db.ref('rooms/' + _roomId + '/events').off();
    db.ref('rooms/' + _roomId + '/rematch').remove();
  }
  // Limpa todos os challenges pendentes desta sessao
  if (db && APP && APP.account) {
    const _ck = fbKey(APP.account.email);
    db.ref('matchlobby/challenges/' + _ck).remove();
  }
  _gpUpdate('menu');
}

// ════════════════════════════════════════════════════════════
//  LOBBY UI — show / hide
// ════════════════════════════════════════════════════════════

export function showLobby() {
  const lbMenu = document.getElementById('lbMenu');
  const lbWait = document.getElementById('lbWait');
  const lbLabel = document.getElementById('lbLabel');
  const lbErr = document.getElementById('lbErr');
  const iCode = document.getElementById('iCode');
  const lobby = document.getElementById('lobby');
  if (lbMenu) lbMenu.style.display = 'flex';
  if (lbWait) lbWait.style.display = 'none';
  if (lbLabel) lbLabel.textContent = 'Codigo da sua sala — compartilhe:';
  if (lbErr) lbErr.textContent = '';
  if (iCode) iCode.value = '';
  if (lobby) lobby.classList.add('show');
}

export function hideLobby() {
  const lobby = document.getElementById('lobby');
  if (lobby) lobby.classList.remove('show');
}

export function showLobbyErr(msg) {
  const lbErr = document.getElementById('lbErr');
  if (lbErr) lbErr.textContent = msg;
}

// ════════════════════════════════════════════════════════════
//  MATCH LOBBY — Sala de Desafios (presence + challenges)
// ════════════════════════════════════════════════════════════

export function enterMatchLobby() {
  if (!initFirebase()) return;
  const db = getDb();
  const myKey = fbKey(APP.account.email);
  // Atualiza presenca global para 'lobby'
  _gpUpdate('lobby');
  // Heartbeat a cada 15s para manter presenca viva
  _lobbyHB = setInterval(() => { if (_globalPresRef) _globalPresRef.update({ ts: Date.now() }); }, 15000);
  // Escuta TODOS os jogadores logados via /presence
  _playersRef = db.ref('presence');
  _playersRef.on('value', snap => {
    _mlPlayers = [];
    snap.forEach(c => {
      const d = c.val();
      if (d && d.name && Date.now() - d.ts < 45000)
        _mlPlayers.push({ key: c.key, ...d, isMe: c.key === myKey });
    });
    _renderMLPlayers();
  });
  // Escuta desafios recebidos
  _challengeRef = db.ref('matchlobby/challenges/' + myKey);
  _challengeRef.on('child_added', snap => {
    const ch = snap.val(); if (!ch || !ch.from) return;
    if (_incomingCh || _outgoingCh) return;
    _incomingCh = { ...ch, fromKey: snap.key };
    const mlChFrom = document.getElementById('mlChFrom');
    const mlChTrophies = document.getElementById('mlChTrophies');
    const mlIncoming = document.getElementById('mlIncoming');
    if (mlChFrom) mlChFrom.textContent = ch.from;
    if (mlChTrophies) mlChTrophies.textContent = ch.trophies || 0;
    if (mlIncoming) mlIncoming.style.display = '';
  });
  _challengeRef.on('child_removed', snap => {
    if (_incomingCh && snap.key === _incomingCh.fromKey) {
      _incomingCh = null;
      const mlIncoming = document.getElementById('mlIncoming');
      const mlSubtitle = document.getElementById('mlSubtitle');
      if (mlIncoming) mlIncoming.style.display = 'none';
      if (mlSubtitle) mlSubtitle.textContent = 'Desafio cancelado pelo oponente.';
    }
  });
  const matchlobby = document.getElementById('matchlobby');
  if (matchlobby) matchlobby.classList.add('show');
  _renderMLPlayers();
}

export function leaveMatchLobby() {
  const db = getDb();
  // Limpa challenges pendentes no Firebase
  if (db && APP && APP.account) {
    const myKey = fbKey(APP.account.email);
    db.ref('matchlobby/challenges/' + myKey).remove();
  }
  if (_playersRef) { _playersRef.off(); _playersRef = null; }
  if (_challengeRef) { _challengeRef.off(); _challengeRef = null; }
  if (_lobbyHB) { clearInterval(_lobbyHB); _lobbyHB = null; }
  _mlPlayers = []; _incomingCh = null; _outgoingCh = null;
  _gpUpdate('menu');
  const matchlobby = document.getElementById('matchlobby');
  const mlIncoming = document.getElementById('mlIncoming');
  const mlOutgoing = document.getElementById('mlOutgoing');
  if (matchlobby) matchlobby.classList.remove('show');
  if (mlIncoming) mlIncoming.style.display = 'none';
  if (mlOutgoing) mlOutgoing.style.display = 'none';
}

function _renderMLPlayers() {
  const myKey = fbKey(APP && APP.account ? APP.account.email || '' : '');
  const others = _mlPlayers.filter(p => !p.isMe);
  const online = others.filter(p => p.status !== 'online').length;
  const mlSubtitle = document.getElementById('mlSubtitle');
  if (mlSubtitle) {
    mlSubtitle.textContent = others.length === 0 ? 'Nenhum jogador online agora...' : `${others.length} online - ${online} disponive${online === 1 ? 'l' : 'is'}`;
  }
  const list = document.getElementById('mlPlayerList');
  if (!list) return;
  if (others.length === 0) {
    list.innerHTML = '<p class="ml-empty">Nenhum jogador online agora.<br>Compartilhe o link e convide alguem!</p>';
    return;
  }
  // Desabilita "Desafiar" se ja ha desafio em andamento
  const meBusy = !!_outgoingCh || !!_incomingCh;
  const statusLabel = { menu: 'No menu', lobby: 'Na sala', solo: 'Jogando solo', online: 'Em batalha', busy: 'Aguardando' };
  const statusColor = { menu: '#27ae60', lobby: '#3498db', solo: '#e67e22', online: '#e74c3c', busy: '#9b59b6' };
  list.innerHTML = others.map(p => {
    const colors = ['#e74c3c', '#3498db', '#27ae60', '#9b59b6', '#e67e22', '#1abc9c', '#e91e63', '#ff5722'];
    const avatarColor = colors[p.name.charCodeAt(0) % colors.length];
    const st = p.status || 'menu';
    const inBattle = st === 'online';
    const canChallenge = !inBattle && !meBusy;
    const sLabel = statusLabel[st] || st;
    const sColor = statusColor[st] || '#888';
    return `<div class="ml-player">
      <div class="ml-avatar" style="background:${avatarColor}">${p.name[0].toUpperCase()}</div>
      <div class="ml-info">
        <div class="ml-name">${p.name}</div>
        <div class="ml-trophies">T ${p.trophies || 0} - <span style="color:${sColor};font-size:.75rem">${sLabel}</span></div>
      </div>
      <button class="ml-ch-btn" ${canChallenge ? '' : 'disabled'} data-challenge-key="${p.key}" data-challenge-name="${p.name.replace(/"/g, '&quot;')}" >
        ${inBattle ? 'Em batalha' : 'Desafiar'}
      </button>
    </div>`;
  }).join('');

  // Attach click handlers via event delegation
  list.querySelectorAll('.ml-ch-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      challengePlayer(btn.dataset.challengeKey, btn.dataset.challengeName);
    });
  });
}

// ════════════════════════════════════════════════════════════
//  CHALLENGE SYSTEM
// ════════════════════════════════════════════════════════════

export function challengePlayer(targetKey, targetName) {
  const db = getDb();
  if (_outgoingCh || !db) return;
  // Verificacao de presenca antes de desafiar
  db.ref('matchlobby/players/' + targetKey + '/ts').once('value', tsSnap => {
    const ts = tsSnap.val();
    if (!ts || Date.now() - ts > 30000) {
      const mlSubtitle = document.getElementById('mlSubtitle');
      if (mlSubtitle) mlSubtitle.textContent = targetName + ' saiu da sala.';
      _renderMLPlayers();
      return;
    }
    _doChallengePlayer(targetKey, targetName);
  });
}

function _doChallengePlayer(targetKey, targetName) {
  const db = getDb();
  // Cria sala silenciosamente
  const code = Math.random().toString(36).substr(2, 6).toUpperCase();
  _roomId = code; _myRole = 'host'; _opponentName = targetName;
  db.ref('rooms/' + code).set({
    host: { name: APP.account.name, id: APP.account.id, deck: JSON.stringify(APP.progress.deck) },
    status: 'waiting', created: Date.now()
  });
  db.ref('rooms/' + code).onDisconnect().remove();
  // Envia desafio
  const myKey = fbKey(APP.account.email);
  _outgoingCh = { targetKey, targetName, code, myKey };
  db.ref('matchlobby/challenges/' + targetKey + '/' + myKey).set({
    from: APP.account.name, fromKey: myKey, trophies: APP.progress.trophies || 0,
    roomCode: code, deck: JSON.stringify(APP.progress.deck), sent: Date.now()
  });
  if (_presenceRef) _presenceRef.update({ status: 'challenging' });
  const mlOutName = document.getElementById('mlOutName');
  const mlOutgoing = document.getElementById('mlOutgoing');
  if (mlOutName) mlOutName.textContent = targetName;
  if (mlOutgoing) mlOutgoing.style.display = '';
  _renderMLPlayers();

  // Timeout de 30s
  _challengeTimeout = setTimeout(() => {
    if (_outgoingCh) {
      cancelChallenge();
      const mlSubtitle = document.getElementById('mlSubtitle');
      if (mlSubtitle) mlSubtitle.textContent = targetName + ' nao respondeu a tempo.';
    }
  }, 30000);

  // Escuta resposta
  db.ref('matchlobby/challenges/' + targetKey + '/' + myKey + '/status').on('value', snap => {
    const v = snap.val();
    if (v === 'accepted') {
      db.ref('matchlobby/challenges/' + targetKey + '/' + myKey + '/status').off();
      clearTimeout(_challengeTimeout); _challengeTimeout = null;
      if (_presenceRef) _presenceRef.update({ status: 'busy' });
      // Espera guest entrar na sala (timeout 10s)
      let _guestWait = true;
      _acceptTimeout = setTimeout(() => {
        if (_guestWait) {
          db.ref('rooms/' + code + '/guest').off();
          _roomId = null; _myRole = null; _outgoingCh = null;
          if (_presenceRef) _presenceRef.update({ status: 'waiting' });
          const mlOutgoing2 = document.getElementById('mlOutgoing');
          const mlSubtitle2 = document.getElementById('mlSubtitle');
          if (mlOutgoing2) mlOutgoing2.style.display = 'none';
          if (mlSubtitle2) mlSubtitle2.textContent = 'Falha ao conectar. Tente novamente.';
        }
      }, 10000);
      db.ref('rooms/' + code + '/guest').on('value', snap2 => {
        const g = snap2.val(); if (!g) return;
        _guestWait = false;
        clearTimeout(_acceptTimeout); _acceptTimeout = null;
        db.ref('rooms/' + code + '/guest').off();
        db.ref('rooms/' + code + '/status').set('playing');
        leaveMatchLobby();
        _startOnlineBattle(JSON.parse(g.deck || '[]'));
      });
    } else if (v === 'declined') {
      db.ref('matchlobby/challenges/' + targetKey + '/' + myKey + '/status').off();
      clearTimeout(_challengeTimeout); _challengeTimeout = null;
      db.ref('matchlobby/challenges/' + targetKey + '/' + myKey).remove();
      if (_roomId) { db.ref('rooms/' + _roomId).onDisconnect().cancel(); db.ref('rooms/' + _roomId).remove(); }
      _roomId = null; _myRole = null; _outgoingCh = null;
      if (_presenceRef) _presenceRef.update({ status: 'waiting' });
      const mlOutgoing3 = document.getElementById('mlOutgoing');
      const mlSubtitle3 = document.getElementById('mlSubtitle');
      if (mlOutgoing3) mlOutgoing3.style.display = 'none';
      if (mlSubtitle3) mlSubtitle3.textContent = targetName + ' recusou o desafio.';
      _renderMLPlayers();
    }
  });
}

export function acceptChallenge() {
  const db = getDb();
  if (!_incomingCh || !db) return;
  const ch = _incomingCh;
  const code = ch.roomCode;
  // Verifica primeiro se a sala ainda existe
  db.ref('rooms/' + code + '/host').once('value', hSnap => {
    if (!hSnap.val()) {
      _incomingCh = null;
      const mlIncoming = document.getElementById('mlIncoming');
      const mlSubtitle = document.getElementById('mlSubtitle');
      if (mlIncoming) mlIncoming.style.display = 'none';
      if (mlSubtitle) mlSubtitle.textContent = 'Sala expirou — o desafiante saiu.';
      return;
    }
    _roomId = code; _myRole = 'guest'; _opponentName = ch.from;
    db.ref('rooms/' + code + '/guest').set({
      name: APP.account.name, id: APP.account.id, deck: JSON.stringify(APP.progress.deck)
    });
    const myKey = fbKey(APP.account.email);
    // Sinaliza 'accepted' e remove o challenge imediatamente
    db.ref('matchlobby/challenges/' + myKey + '/' + ch.fromKey + '/status').set('accepted');
    setTimeout(() => db.ref('matchlobby/challenges/' + myKey + '/' + ch.fromKey).remove(), 1500);
    _gpUpdate('busy');
    const mlIncoming2 = document.getElementById('mlIncoming');
    const mlSubtitle2 = document.getElementById('mlSubtitle');
    if (mlIncoming2) mlIncoming2.style.display = 'none';
    if (mlSubtitle2) mlSubtitle2.textContent = 'Conectando...';
    // Timeout de 12s para o host iniciar a partida
    _acceptTimeout = setTimeout(() => {
      db.ref('rooms/' + code + '/status').off();
      _roomId = null; _myRole = null; _incomingCh = null;
      _gpUpdate('lobby');
      const mlSubtitle3 = document.getElementById('mlSubtitle');
      if (mlSubtitle3) mlSubtitle3.textContent = 'Host demorou — tente novamente.';
    }, 12000);
    db.ref('rooms/' + code + '/status').on('value', snap => {
      if (snap.val() === 'playing') {
        clearTimeout(_acceptTimeout); _acceptTimeout = null;
        db.ref('rooms/' + code + '/status').off();
        leaveMatchLobby();
        _startOnlineBattle(JSON.parse(ch.deck || '[]'));
      }
    });
  });
}

export function declineChallenge() {
  const db = getDb();
  if (!_incomingCh || !db) return;
  const ch = _incomingCh;
  const myKey = fbKey(APP.account.email);
  db.ref('matchlobby/challenges/' + myKey + '/' + ch.fromKey + '/status').set('declined');
  setTimeout(() => db.ref('matchlobby/challenges/' + myKey + '/' + ch.fromKey).remove(), 2000);
  _incomingCh = null;
  const mlIncoming = document.getElementById('mlIncoming');
  if (mlIncoming) mlIncoming.style.display = 'none';
}

export function cancelChallenge() {
  const db = getDb();
  if (!_outgoingCh || !db) return;
  const { targetKey, myKey, code } = _outgoingCh;
  clearTimeout(_challengeTimeout); _challengeTimeout = null;
  clearTimeout(_acceptTimeout); _acceptTimeout = null;
  db.ref('matchlobby/challenges/' + targetKey + '/' + myKey + '/status').off();
  db.ref('matchlobby/challenges/' + targetKey + '/' + myKey).remove();
  if (code) { db.ref('rooms/' + code).onDisconnect().cancel(); db.ref('rooms/' + code).remove(); }
  _roomId = null; _myRole = null; _outgoingCh = null;
  if (_presenceRef) _presenceRef.update({ status: 'waiting' });
  const mlOutgoing = document.getElementById('mlOutgoing');
  if (mlOutgoing) mlOutgoing.style.display = 'none';
  _renderMLPlayers();
}

// ════════════════════════════════════════════════════════════
//  ADMIN ACCESS CHECK
// ════════════════════════════════════════════════════════════

function _setAdminDeck() {
  const ADMIN_CARDS = ['diretor_producao', 'seguranca', 'motorista_onibus', 'engenheiro', 'piloto', 'cientista', 'pedreiro', 'carpinteiro'];
  const valid = ADMIN_CARDS.filter(k => !!CARDS[k]);
  if (!APP.progress.owned) APP.progress.owned = [];
  valid.forEach(k => { if (!APP.progress.owned.includes(k)) APP.progress.owned.push(k); });
  // Deck de 8: completa com cartas base se faltar
  const deck = [...valid];
  const base = BASE_KEYS.filter(k => !deck.includes(k));
  while (deck.length < 8 && base.length) deck.push(base.shift());
  APP.progress.deck = deck.slice(0, 8);
  APP.progress.diamonds = Math.max(APP.progress.diamonds || 0, 9999);
}

export async function checkAdminAccess() {
  if (!APP || !APP.account) { APP.isAdmin = false; return false; }
  // Verificacao local imediata
  if (ADMIN_EMAILS.includes(APP.account.email.toLowerCase().trim())) {
    APP.isAdmin = true;
    _setAdminDeck();
    return true;
  }
  // Verificacao Firebase
  const db = getDb();
  if (!db) { APP.isAdmin = false; return false; }
  try {
    const snap = await db.ref('config/admins/' + fbKey(APP.account.email)).once('value');
    APP.isAdmin = snap.val() === true;
    if (APP.isAdmin) _setAdminDeck();
    return APP.isAdmin;
  } catch (e) { APP.isAdmin = false; return false; }
}

// ════════════════════════════════════════════════════════════
//  BIND DOM EVENTS (call after DOM is ready)
// ════════════════════════════════════════════════════════════

export function bindLobbyEvents() {
  const btnCreate = document.getElementById('btnCreate');
  const btnJoin = document.getElementById('btnJoin');
  const iCode = document.getElementById('iCode');
  const btnLobbyBack = document.getElementById('btnLobbyBack');
  const btnAcceptCh = document.getElementById('btnAcceptCh');
  const btnDeclineCh = document.getElementById('btnDeclineCh');
  const btnCancelCh = document.getElementById('btnCancelCh');
  const btnUseCode = document.getElementById('btnUseCode');
  const btnMatchLobbyBack = document.getElementById('btnMatchLobbyBack');

  if (btnCreate) btnCreate.addEventListener('click', createRoom);
  if (btnJoin) btnJoin.addEventListener('click', joinRoom);
  if (iCode) iCode.addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom(); });
  if (btnLobbyBack) btnLobbyBack.addEventListener('click', () => { cleanupOnline(); hideLobby(); });
  if (btnAcceptCh) btnAcceptCh.addEventListener('click', acceptChallenge);
  if (btnDeclineCh) btnDeclineCh.addEventListener('click', declineChallenge);
  if (btnCancelCh) btnCancelCh.addEventListener('click', cancelChallenge);
  if (btnUseCode) btnUseCode.addEventListener('click', () => { leaveMatchLobby(); showLobby(); });
  if (btnMatchLobbyBack) btnMatchLobbyBack.addEventListener('click', () => {
    if (_outgoingCh) cancelChallenge();
    leaveMatchLobby();
  });
}
