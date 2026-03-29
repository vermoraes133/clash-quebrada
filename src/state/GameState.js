// ════════════════════════════════════════════════════════════
//  GAME STATE — Shared application state + persistence
//  Extracted from main.js for use across Phaser scenes
// ════════════════════════════════════════════════════════════

import { DEFAULT_DECK, SAVE_KEY } from '../config/constants.js';

// ── Central application state ────────────────────────────────
// All scenes and systems reference this single object.
// Mutate properties directly — never reassign the APP object itself.
export const APP = {
  screen: 'login',
  account: null,
  progress: null,
  ranking: [],
  mode: 'solo',
  deckTimer: 30,
  deckTick: null,
  tmpDeck: [],
  battleResult: null,
  tutStep: 0,
  tutDone: false,
  p2Account: null,
  isAdmin: false,
  wasOnline: false,
};

// ── Default progress for new accounts ────────────────────────
export function defaultProgress() {
  return {
    trophies: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    cardXP: {},
    deck: [...DEFAULT_DECK],
    isNew: true,
    diamonds: 0,
    owned: [],
  };
}

// ── Local persistence (localStorage) ─────────────────────────
export function loadData() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function saveData() {
  localStorage.setItem(
    SAVE_KEY,
    JSON.stringify({
      account: APP.account,
      progress: APP.progress,
      ranking: APP.ranking,
    })
  );
}
