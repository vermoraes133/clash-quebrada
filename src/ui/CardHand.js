// ================================================================
//  CardHand.js — Phaser 3 Container
//  4 card slots at the bottom of the battle screen.
//  Shows character preview, name, cost badge, level badge,
//  selection highlight, and availability glow.
//
//  Call .update(hand, selIndex, elixir, getCardLevel) each frame.
// ================================================================

import Phaser from 'phaser';
import { CARDS } from '../config/cards.js';
import { W, ARENA_BOT } from '../config/constants.js';

const CARD_COUNT = 4;
const CW = 84;       // card width
const CH = 74;       // card height
const CS = 5;        // card spacing
const TOTAL_W = CARD_COUNT * CW + (CARD_COUNT - 1) * CS;
const CX0 = (W - TOTAL_W) / 2;  // x start
const CY = ARENA_BOT + 36;       // y start

// Colors
const BG_NORMAL    = 0x1a2535;
const BG_SELECTED  = 0xb7770d;
const BG_DISABLED  = 0x101620;
const BORDER_NORMAL   = 0x2e86c1;
const BORDER_SELECTED = 0xf5b041;
const BORDER_DISABLED = 0x333333;
const COST_BG = 0x6c3483;
const COST_FG = '#e8daef';
const LEVEL_BG = 0xf1c40f;
const LEVEL_FG = '#000000';
const NAME_COLOR_ACTIVE = '#ecf0f1';
const NAME_COLOR_DISABLED = '#555555';
const GLOW_SELECTED = 0xf39c12;
const GLOW_AVAILABLE = 0x3498db;

export default class CardHand extends Phaser.GameObjects.Container {
  constructor(scene, onSelectCard) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(52);

    this.onSelectCard = onSelectCard;
    this.cards = [];

    for (let i = 0; i < CARD_COUNT; i++) {
      const cx = CX0 + i * (CW + CS);

      // ── Card background graphics ─────────────────────
      const cardGfx = scene.add.graphics();
      this.add(cardGfx);

      // ── Character preview image (if texture exists) ──
      const charImg = scene.add.image(cx + CW / 2, CY + 24, '__DEFAULT')
        .setDisplaySize(24, 24)
        .setVisible(false);
      this.add(charImg);

      // ── Emoji fallback text ──────────────────────────
      const emojiText = scene.add.text(cx + CW / 2, CY + 24, '', {
        fontSize: '20px', fontFamily: 'Arial',
      }).setOrigin(0.5).setVisible(false);
      this.add(emojiText);

      // ── Card name ────────────────────────────────────
      const nameText = scene.add.text(cx + CW / 2, CY + 46, '', {
        fontSize: '9px', color: NAME_COLOR_ACTIVE, fontFamily: 'Arial',
      }).setOrigin(0.5, 0);
      this.add(nameText);

      // ── Cost badge ───────────────────────────────────
      const costGfx = scene.add.graphics();
      this.add(costGfx);
      const costText = scene.add.text(cx + CW - 13, CY + 13, '', {
        fontSize: '12px', fontStyle: 'bold', color: COST_FG, fontFamily: 'Arial',
      }).setOrigin(0.5);
      this.add(costText);

      // ── Level badge ──────────────────────────────────
      const lvlGfx = scene.add.graphics();
      this.add(lvlGfx);
      const lvlText = scene.add.text(cx + 12, CY + 13, '', {
        fontSize: '8px', fontStyle: 'bold', color: LEVEL_FG, fontFamily: 'Arial',
      }).setOrigin(0.5);
      this.add(lvlText);

      // ── Hit zone (invisible interactive rect) ────────
      const hitZone = scene.add.rectangle(cx + CW / 2, CY + CH / 2, CW, CH, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(53);
      hitZone.on('pointerdown', () => {
        if (this.onSelectCard) this.onSelectCard(i);
      });
      // hitZone is NOT added to this container so it can receive input normally
      // (containers can complicate input). It lives in the scene directly.

      this.cards.push({
        index: i,
        cx: cx,
        cardGfx,
        charImg,
        emojiText,
        nameText,
        costGfx,
        costText,
        lvlGfx,
        lvlText,
        hitZone,
        _lastKey: null,
        _lastSel: false,
        _lastCan: false,
        _lastLvl: 0,
      });
    }
  }

  // ── Per-frame update ────────────────────────────────────
  update(hand, selIndex, elixir, getCardLevel) {
    for (let i = 0; i < CARD_COUNT; i++) {
      const c = this.cards[i];
      const key = hand[i];
      const d = key ? CARDS[key] : null;

      if (!d) {
        // Empty slot
        if (c._lastKey !== null) {
          c.cardGfx.clear();
          c.charImg.setVisible(false);
          c.emojiText.setVisible(false);
          c.nameText.setText('');
          c.costGfx.clear();
          c.costText.setText('');
          c.lvlGfx.clear();
          c.lvlText.setText('');
          c._lastKey = null;
        }
        continue;
      }

      const sel = selIndex === i;
      const can = elixir >= d.cost;
      const lvl = getCardLevel(key);

      // Skip full redraw if nothing changed
      if (key === c._lastKey && sel === c._lastSel && can === c._lastCan && lvl === c._lastLvl) {
        continue;
      }
      c._lastKey = key;
      c._lastSel = sel;
      c._lastCan = can;
      c._lastLvl = lvl;

      const cx = c.cx;

      // ── Card background ──────────────────────────────
      const cg = c.cardGfx;
      cg.clear();

      // Glow behind card
      if (sel) {
        cg.fillStyle(GLOW_SELECTED, 0.35);
        cg.fillRoundedRect(cx - 3, CY - 3, CW + 6, CH + 6, 10);
      } else if (can) {
        cg.fillStyle(GLOW_AVAILABLE, 0.15);
        cg.fillRoundedRect(cx - 2, CY - 2, CW + 4, CH + 4, 9);
      }

      // Card fill
      const bgColor = sel ? BG_SELECTED : can ? BG_NORMAL : BG_DISABLED;
      cg.fillStyle(bgColor, 1);
      cg.fillRoundedRect(cx, CY, CW, CH, 8);

      // Card border
      const borderColor = sel ? BORDER_SELECTED : can ? BORDER_NORMAL : BORDER_DISABLED;
      const borderW = sel ? 3 : 1.5;
      cg.lineStyle(borderW, borderColor, 1);
      cg.strokeRoundedRect(cx, CY, CW, CH, 8);

      // Top shine line
      if (can) {
        const shineColor = sel ? 0xffc832 : 0x3498db;
        const shineAlpha = sel ? 0.22 : 0.12;
        cg.fillStyle(shineColor, shineAlpha);
        cg.fillRoundedRect(cx + 2, CY + 2, CW - 4, 10, 4);
      }

      // ── Character preview ────────────────────────────
      const charTexKey = `char_${key}_player`;
      if (this.scene.textures.exists(charTexKey)) {
        c.charImg.setTexture(charTexKey);
        c.charImg.setPosition(cx + CW / 2, CY + 24);
        c.charImg.setDisplaySize(24, 24);
        c.charImg.setAlpha(can ? 1 : 0.4);
        c.charImg.setVisible(true);
        c.emojiText.setVisible(false);
      } else {
        // Fallback: emoji text
        c.charImg.setVisible(false);
        c.emojiText.setPosition(cx + CW / 2, CY + 24);
        c.emojiText.setText(d.emoji || '?');
        c.emojiText.setAlpha(can ? 1 : 0.4);
        c.emojiText.setVisible(true);
      }

      // ── Name ─────────────────────────────────────────
      const fs = d.name.length > 10 ? 7 : d.name.length > 7 ? 8 : 9;
      c.nameText.setFontSize(fs);
      c.nameText.setColor(can ? NAME_COLOR_ACTIVE : NAME_COLOR_DISABLED);
      c.nameText.setText(d.name);
      c.nameText.setPosition(cx + CW / 2, CY + 46);

      // ── Cost badge ───────────────────────────────────
      const costG = c.costGfx;
      costG.clear();
      costG.fillStyle(COST_BG, 1);
      costG.fillCircle(cx + CW - 13, CY + 13, 11);
      c.costText.setText(String(d.cost));
      c.costText.setPosition(cx + CW - 13, CY + 13);

      // ── Level badge ──────────────────────────────────
      const lvlG = c.lvlGfx;
      lvlG.clear();
      if (lvl > 1) {
        lvlG.fillStyle(LEVEL_BG, 1);
        lvlG.fillCircle(cx + 12, CY + 13, 9);
        c.lvlText.setText('Lv' + lvl);
        c.lvlText.setPosition(cx + 12, CY + 13);
        c.lvlText.setVisible(true);
      } else {
        c.lvlText.setVisible(false);
      }
    }
  }

  // ── Cleanup ─────────────────────────────────────────────
  destroy() {
    this.cards.forEach(c => {
      c.cardGfx.destroy();
      c.charImg.destroy();
      c.emojiText.destroy();
      c.nameText.destroy();
      c.costGfx.destroy();
      c.costText.destroy();
      c.lvlGfx.destroy();
      c.lvlText.destroy();
      c.hitZone.destroy();
    });
    super.destroy();
  }
}
