// ================================================================
//  ShopScene.js — Card shop with scrollable grid
//  Replaces drawShop() from DrawScreens.js
//  4-column grid, legendary glow, scroll via drag/wheel, buy flow
// ================================================================
import Phaser from 'phaser';
import { W, H } from '../config/constants.js';
import { CARDS, SHOP_CARD_KEYS } from '../config/cards.js';
import { APP, saveData } from '../state/GameState.js';
import { SFX } from '../systems/AudioSystem.js';
import { fbSaveUser } from '../systems/OnlineSync.js';

export default class ShopScene extends Phaser.Scene {
  constructor() {
    super('ShopScene');
  }

  init(data) {
    // data may be undefined/null — safe defaults
    data = data || {};
    this._goScreen = data.goScreen || this.registry.get('goScreen') || null;
  }

  create() {
    this._scrollY = 0;
    this._isDragging = false;
    this._dragStartY = 0;
    this._dragStartScroll = 0;

    // Layout constants
    this._AREA_TOP = 58;
    this._AREA_BOT = H - 42;
    this._COLS = 4;
    this._CW = 90;
    this._CH = 111;
    this._GAP = 4;
    this._totalW = this._COLS * this._CW + (this._COLS - 1) * this._GAP;
    this._startX = (W - this._totalW) / 2;
    this._viewH = this._AREA_BOT - this._AREA_TOP;
    this._rows = Math.ceil(SHOP_CARD_KEYS.length / this._COLS);
    this._totalContentH = this._rows * (this._CH + this._GAP);
    this._maxScroll = Math.max(0, this._totalContentH - this._viewH);

    this._buildUI();

    // ── Scroll via mouse wheel ──────────────────────────────
    this.input.on('wheel', (_pointer, _gos, _dx, dy) => {
      this._scrollY = Phaser.Math.Clamp(this._scrollY + dy * 0.5, 0, this._maxScroll);
      this._updateCardPositions();
      this._updateScrollbar();
    });

    // ── Scroll via drag ─────────────────────────────────────
    this.input.on('pointerdown', (pointer) => {
      // Only drag within the card area
      if (pointer.y >= this._AREA_TOP && pointer.y <= this._AREA_BOT) {
        this._isDragging = true;
        this._dragStartY = pointer.y;
        this._dragStartScroll = this._scrollY;
      }
    });

    this.input.on('pointermove', (pointer) => {
      if (this._isDragging && pointer.isDown) {
        const dy = this._dragStartY - pointer.y;
        this._scrollY = Phaser.Math.Clamp(this._dragStartScroll + dy, 0, this._maxScroll);
        this._updateCardPositions();
        this._updateScrollbar();
      }
    });

    this.input.on('pointerup', () => {
      this._isDragging = false;
    });
  }

  // ── Build all UI elements ───────────────────────────────────
  _buildUI() {
    this.children.removeAll(true);
    this._cardContainers = [];

    // ── Background gradient (purple dark) ───────────────────
    const bgGfx = this.add.graphics();
    const steps = 16;
    for (let i = 0; i < steps; i++) {
      const frac = i / (steps - 1);
      // #0d0820 to #1a0830
      const r = Math.floor(0x0d + (0x1a - 0x0d) * frac);
      const g = Math.floor(0x08 + (0x08) * frac);
      const b = Math.floor(0x20 + (0x30 - 0x20) * frac);
      const color = (r << 16) | (g << 8) | b;
      bgGfx.fillStyle(color, 1);
      bgGfx.fillRect(0, Math.floor(i * H / steps), W, Math.ceil(H / steps) + 1);
    }
    bgGfx.setDepth(-10);

    // ── Sparkle particles ───────────────────────────────────
    this._sparkles = [];
    for (let i = 0; i < 25; i++) {
      const sx = Math.sin(i * 137.5) * W * 0.5 + W * 0.5;
      const sy = Math.sin(i * 211.3) * H * 0.5 + H * 0.5;
      const sparkle = this.add.circle(sx, sy, 1, 0xb464ff, 0.2);
      sparkle._idx = i;
      sparkle.setDepth(-5);
      this._sparkles.push(sparkle);
    }

    // ── Header ──────────────────────────────────────────────
    this.add.text(W / 2, 10, '\u{1F48E} Loja de Cartas', {
      fontSize: '22px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5, 0).setDepth(5);

    this._diamondLabel = this.add.text(W / 2, 38, '', {
      fontSize: '13px', fontFamily: 'Arial', fontStyle: 'bold', color: '#00e5ff',
    }).setOrigin(0.5, 0).setDepth(5);
    this._updateDiamondLabel();

    // ── Clip mask for card area ─────────────────────────────
    // Phaser geometric mask: create a Graphics shape for the visible area
    const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, this._AREA_TOP, W, this._viewH);
    const mask = maskShape.createGeometryMask();

    // ── Card grid ───────────────────────────────────────────
    SHOP_CARD_KEYS.forEach((key, i) => {
      const d = CARDS[key];
      if (!d) return;

      const col = i % this._COLS;
      const row = Math.floor(i / this._COLS);
      const cx = this._startX + col * (this._CW + this._GAP);
      const cy = this._AREA_TOP + row * (this._CH + this._GAP);

      const container = this._createCardContainer(key, d, cx, cy);
      container.setMask(mask);
      this._cardContainers.push({ container, baseY: cy, row, col, key });
    });

    // ── Scrollbar ───────────────────────────────────────────
    this._scrollTrackGfx = this.add.graphics().setDepth(10);
    this._scrollThumbGfx = this.add.graphics().setDepth(10);
    this._updateScrollbar();

    // ── Scroll hint ─────────────────────────────────────────
    if (this._maxScroll > 0) {
      this._scrollHint = this.add.text(W / 2, this._AREA_BOT - 4, '\u2195 role para ver mais', {
        fontSize: '9px', fontFamily: 'Arial', color: 'rgba(255,255,255,0.35)',
      }).setOrigin(0.5, 1).setDepth(10);
    }

    // ── Back button ─────────────────────────────────────────
    const backW = 140;
    const backH = 32;
    const backY = H - 39;
    const backX = W / 2 - backW / 2;

    const backGfx = this.add.graphics().setDepth(10);
    backGfx.fillStyle(0x2c3e50, 0.95);
    backGfx.fillRoundedRect(backX, backY, backW, backH, 8);
    backGfx.lineStyle(1, 0x4a6a8a, 1);
    backGfx.strokeRoundedRect(backX, backY, backW, backH, 8);

    this.add.text(W / 2, backY + backH / 2, '\u2190 Voltar', {
      fontSize: '13px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(10);

    const backZone = this.add.zone(W / 2, backY + backH / 2, backW, backH)
      .setInteractive({ useHandCursor: true }).setDepth(11);

    backZone.on('pointerover', () => {
      backGfx.clear();
      backGfx.fillStyle(0x34495e, 1);
      backGfx.fillRoundedRect(backX, backY, backW, backH, 8);
      backGfx.lineStyle(1, 0x5dade2, 1);
      backGfx.strokeRoundedRect(backX, backY, backW, backH, 8);
    });

    backZone.on('pointerout', () => {
      backGfx.clear();
      backGfx.fillStyle(0x2c3e50, 0.95);
      backGfx.fillRoundedRect(backX, backY, backW, backH, 8);
      backGfx.lineStyle(1, 0x4a6a8a, 1);
      backGfx.strokeRoundedRect(backX, backY, backW, backH, 8);
    });

    backZone.on('pointerdown', () => {
      SFX.click();
      if (this.scene.manager.getScene('MenuScene')) {
        this.scene.start('MenuScene');
      }
    });

    // ── Header/footer covers (hide cards scrolling above/below) ──
    const headerCover = this.add.graphics().setDepth(4);
    headerCover.fillStyle(0x0d0820, 1);
    headerCover.fillRect(0, 0, W, this._AREA_TOP);

    const footerCover = this.add.graphics().setDepth(4);
    footerCover.fillStyle(0x1a0830, 1);
    footerCover.fillRect(0, this._AREA_BOT, W, H - this._AREA_BOT);
  }

  // ── Create a single card container ──────────────────────────
  _createCardContainer(key, d, cx, cy) {
    const CW = this._CW;
    const CH = this._CH;
    const owned = (APP.progress.owned || []).includes(key);
    const canBuy = !owned && (APP.progress.diamonds || 0) >= (d.shopCost || 0);
    const isLeg = !!d.legendary;

    // Container to group all elements for this card
    const container = this.add.container(cx, cy);

    // ── Card background ─────────────────────────────────
    const cardGfx = this.add.graphics();

    if (isLeg) {
      // Animated legendary border handled in update() via hue shift
      cardGfx.fillStyle(0x2a1800, 1);
      cardGfx.fillRoundedRect(0, 0, CW, CH, 7);
      // Inner glow rectangle
      cardGfx.lineStyle(1, 0xffd700, 0.4);
      cardGfx.strokeRoundedRect(2, 2, CW - 4, CH - 4, 6);
    } else {
      const bgColor = owned ? 0x142814 : canBuy ? 0x1a0d2e : 0x0d0818;
      cardGfx.fillStyle(bgColor, 1);
      cardGfx.fillRoundedRect(0, 0, CW, CH, 7);
    }

    const borderColor = isLeg ? 0xffd700 : owned ? 0x27ae60 : canBuy ? 0x8e44ad : 0x252535;
    const borderWidth = isLeg ? 2 : owned ? 1.5 : 1;
    cardGfx.lineStyle(borderWidth, borderColor, 1);
    cardGfx.strokeRoundedRect(0, 0, CW, CH, 7);

    container.add(cardGfx);

    // ── Emoji ───────────────────────────────────────────
    const emojiAlpha = (!owned && !canBuy && !isLeg) ? 0.38 : 1;
    const emojiSize = isLeg ? '22px' : '19px';
    const emojiText = this.add.text(CW / 2, 19, d.emoji, {
      fontSize: emojiSize, fontFamily: 'Arial',
    }).setOrigin(0.5).setAlpha(emojiAlpha);
    container.add(emojiText);

    // ── Name ────────────────────────────────────────────
    const nameColor = isLeg ? '#ffd700' : owned ? '#2ecc71' : canBuy ? '#d7b8f5' : '#555555';
    const nLen = d.name.length;
    const nfs = nLen > 13 ? 6 : nLen > 10 ? 7 : 8.5;
    const nameText = this.add.text(CW / 2, 36, d.name, {
      fontSize: `${nfs}px`, fontFamily: 'Arial', fontStyle: 'bold', color: nameColor,
    }).setOrigin(0.5, 0);
    container.add(nameText);

    // ── Legendary badge ─────────────────────────────────
    if (isLeg) {
      const legBadgeGfx = this.add.graphics();
      legBadgeGfx.fillStyle(0xffc800, 0.15);
      legBadgeGfx.fillRoundedRect(7, 47, CW - 14, 11, 3);
      container.add(legBadgeGfx);

      const legLabel = this.add.text(CW / 2, 53, '\u2B50 LENDARIO \u2B50', {
        fontSize: '6px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffd700',
      }).setOrigin(0.5);
      container.add(legLabel);
    }

    // ── Stats ───────────────────────────────────────────
    const statY = isLeg ? 62 : 47;
    const statColor = isLeg ? '#ffcc44' : '#666666';
    const statsStr = d.type === 'spell'
      ? `\u{1F4A5}${d.dmg} \u{1F4CF}${d.aoe}`
      : `\u2764\uFE0F${d.hp} \u2694\uFE0F${d.dmg} \u{1F4A8}${d.spd}`;
    const statsText = this.add.text(CW / 2, statY, statsStr, {
      fontSize: '6.5px', fontFamily: 'Arial', color: statColor,
    }).setOrigin(0.5, 0);
    container.add(statsText);

    // ── Elixir cost ─────────────────────────────────────
    const elixirColor = isLeg ? '#ff9999' : '#9b9';
    const elixirStr = `\u2728${d.cost} elixir${isLeg ? ' (maximo!)' : ''}`;
    const elixirText = this.add.text(CW / 2, statY + 10, elixirStr, {
      fontSize: '6px', fontFamily: 'Arial', color: elixirColor,
    }).setOrigin(0.5, 0);
    container.add(elixirText);

    // ── Description ─────────────────────────────────────
    const descColor = isLeg ? '#ffddaa' : '#777777';
    const desc = d.desc.length > 24 ? d.desc.substr(0, 22) + '\u2026' : d.desc;
    const descText = this.add.text(CW / 2, statY + 20, desc, {
      fontSize: '6px', fontFamily: 'Arial', color: descColor,
    }).setOrigin(0.5, 0);
    container.add(descText);

    // ── Buy button / Owned badge ────────────────────────
    const btnY = CH - 21;
    const btnH = 18;
    const btnGfx = this.add.graphics();

    if (owned) {
      btnGfx.fillStyle(0x27ae60, 0.25);
      btnGfx.fillRoundedRect(5, btnY, CW - 10, btnH, 4);
      container.add(btnGfx);

      const ownedLabel = this.add.text(CW / 2, btnY + btnH / 2, '\u2705 Possuida', {
        fontSize: '8px', fontFamily: 'Arial', fontStyle: 'bold', color: '#2ecc71',
      }).setOrigin(0.5);
      container.add(ownedLabel);
    } else {
      const buyBgColor = isLeg ? (canBuy ? 0xb8860b : 0x3a2200) : (canBuy ? 0x7b2fbe : 0x252535);
      btnGfx.fillStyle(buyBgColor, 1);
      btnGfx.fillRoundedRect(5, btnY, CW - 10, btnH, 4);
      container.add(btnGfx);

      const priceColor = canBuy ? '#ffffff' : '#444444';
      const priceStr = `${isLeg ? '\u{1F3AC} ' : ''}${d.shopCost}\u{1F48E}`;
      const priceFSize = isLeg ? '7px' : '8px';
      const priceLabel = this.add.text(CW / 2, btnY + btnH / 2, priceStr, {
        fontSize: priceFSize, fontFamily: 'Arial', fontStyle: 'bold', color: priceColor,
      }).setOrigin(0.5);
      container.add(priceLabel);

      // Make buy button interactive only if affordable
      if (canBuy) {
        // Create a zone relative to the container position for the buy button
        const buyZone = this.add.zone(cx + 5 + (CW - 10) / 2, cy + btnY + btnH / 2, CW - 10, btnH)
          .setInteractive({ useHandCursor: true });

        // Store reference so we can update position on scroll
        container._buyZone = buyZone;
        container._buyZoneBaseY = cy + btnY + btnH / 2;

        buyZone.on('pointerover', () => {
          btnGfx.clear();
          const hoverColor = isLeg ? 0xdaa520 : 0x9b59b6;
          btnGfx.fillStyle(hoverColor, 1);
          btnGfx.fillRoundedRect(5, btnY, CW - 10, btnH, 4);
        });

        buyZone.on('pointerout', () => {
          btnGfx.clear();
          btnGfx.fillStyle(buyBgColor, 1);
          btnGfx.fillRoundedRect(5, btnY, CW - 10, btnH, 4);
        });

        buyZone.on('pointerdown', () => {
          // Prevent buy if dragging
          if (this._isDragging) return;
          this._buyCard(key);
        });
      }
    }

    // Store the card graphics reference for legendary animation
    if (isLeg) {
      container._isLeg = true;
      container._cardGfx = cardGfx;
    }

    return container;
  }

  // ── Buy a card ──────────────────────────────────────────────
  _buyCard(key) {
    const d = CARDS[key];
    if (!d || !d.shopCost) return;

    const diamonds = APP.progress.diamonds || 0;
    if (diamonds < d.shopCost) return;

    // Already owned check
    if ((APP.progress.owned || []).includes(key)) return;

    // Deduct diamonds
    APP.progress.diamonds = diamonds - d.shopCost;

    // Add to owned
    if (!APP.progress.owned) APP.progress.owned = [];
    APP.progress.owned.push(key);

    // Sound + save
    SFX.levelUp();
    saveData();
    fbSaveUser();

    // Rebuild the shop UI to reflect changes
    this._buildUI();
  }

  // ── Update card positions on scroll ─────────────────────────
  _updateCardPositions() {
    const scroll = Phaser.Math.Clamp(this._scrollY, 0, this._maxScroll);

    this._cardContainers.forEach(entry => {
      const newY = entry.baseY - scroll;
      entry.container.setY(newY);

      // Also update the buy zone position if it exists
      if (entry.container._buyZone) {
        const baseZoneY = entry.container._buyZoneBaseY;
        entry.container._buyZone.setY(baseZoneY - scroll);
      }
    });

    // Hide scroll hint after scrolling
    if (this._scrollHint && scroll > 5) {
      this._scrollHint.setAlpha(0);
    } else if (this._scrollHint) {
      this._scrollHint.setAlpha(0.35);
    }
  }

  // ── Draw/update scrollbar ───────────────────────────────────
  _updateScrollbar() {
    if (this._maxScroll <= 0) return;

    this._scrollTrackGfx.clear();
    this._scrollThumbGfx.clear();

    const scroll = Phaser.Math.Clamp(this._scrollY, 0, this._maxScroll);
    const frac = scroll / this._maxScroll;
    const sbH = Math.max(20, this._viewH * (this._viewH / this._totalContentH));
    const sbY = this._AREA_TOP + (this._viewH - sbH) * frac;

    // Track
    this._scrollTrackGfx.fillStyle(0xffffff, 0.07);
    this._scrollTrackGfx.fillRoundedRect(W - 5, this._AREA_TOP, 3, this._viewH, 1);

    // Thumb
    this._scrollThumbGfx.fillStyle(0xc896ff, 0.5);
    this._scrollThumbGfx.fillRoundedRect(W - 5, sbY, 3, sbH, 1);
  }

  // ── Update diamond label ────────────────────────────────────
  _updateDiamondLabel() {
    const diamonds = APP.progress ? (APP.progress.diamonds || 0) : 0;
    this._diamondLabel.setText(`Seus diamantes: \u{1F48E} ${diamonds}`);
  }

  // ── Update loop (sparkles + legendary border animation) ─────
  update(time, _delta) {
    const t = time * 0.001;

    // Animate sparkles
    if (this._sparkles) {
      for (const sparkle of this._sparkles) {
        const alpha = 0.15 + Math.sin(t * 2 + sparkle._idx) * 0.12;
        const radius = 0.7 + Math.sin(t * 3 + sparkle._idx) * 0.35;
        sparkle.setAlpha(Math.max(0, alpha));
        sparkle.setRadius(Math.max(0.2, radius));
      }
    }

    // Animate legendary card borders (hue shift)
    if (this._cardContainers) {
      this._cardContainers.forEach(entry => {
        if (entry.container._isLeg && entry.container._cardGfx) {
          const gfx = entry.container._cardGfx;
          const hue = (time * 0.08) % 360;
          // Convert HSL to RGB for the border color
          const rgb = Phaser.Display.Color.HSLToColor(hue / 360, 0.9, 0.58);
          const borderColor = Phaser.Display.Color.GetColor(rgb.r, rgb.g, rgb.b);

          gfx.clear();
          gfx.fillStyle(0x2a1800, 1);
          gfx.fillRoundedRect(0, 0, this._CW, this._CH, 7);
          gfx.lineStyle(2, borderColor, 1);
          gfx.strokeRoundedRect(0, 0, this._CW, this._CH, 7);
          // Inner glow
          gfx.lineStyle(1, 0xffd700, 0.4);
          gfx.strokeRoundedRect(2, 2, this._CW - 4, this._CH - 4, 6);
        }
      });
    }
  }
}
