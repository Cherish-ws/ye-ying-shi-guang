/* Minimal DOM bridge so the browser game.js can run under Douyin mini-game.
   Virtual nodes + canvas layout/hit-test. Enough for HUD, title, choice cards, shop. */
"use strict";

function createDomBridge(platform) {
  const { canvas, ctx, width: W, height: H } = platform;
  const byId = Object.create(null);
  const listeners = { touch: [] };

  function classListFactory(node) {
    const set = new Set();
    return {
      add(c) {
        if (c) set.add(String(c));
      },
      remove(c) {
        set.delete(String(c));
      },
      contains(c) {
        return set.has(String(c));
      },
      toggle(c, force) {
        const on = force == null ? !set.has(c) : !!force;
        if (on) set.add(c);
        else set.delete(c);
        return on;
      },
      _set: set,
    };
  }

  function makeNode(tag, id) {
    const node = {
      tagName: (tag || "div").toUpperCase(),
      id: id || "",
      children: [],
      parent: null,
      style: {},
      classList: null,
      textContent: "",
      value: "",
      disabled: false,
      _listeners: Object.create(null),
      _isCanvas: tag === "canvas",
      width: 0,
      height: 0,
      addEventListener(type, fn) {
        (this._listeners[type] || (this._listeners[type] = [])).push(fn);
      },
      removeEventListener() {},
      appendChild(child) {
        child.parent = this;
        this.children.push(child);
        return child;
      },
      querySelector() {
        return null;
      },
      getBoundingClientRect() {
        return this._rect || { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 };
      },
      setPointerCapture() {},
      releasePointerCapture() {},
      getContext() {
        if (this.id === "game" || this._realCanvas) return platform.ctx;
        if (this.id === "minimap") return platform.minimapCtx || dummyCtx();
        return dummyCtx();
      },
      fire(type, ev) {
        const ls = this._listeners[type] || [];
        for (const fn of ls) fn(ev);
      },
    };
    node.classList = classListFactory(node);
    Object.defineProperty(node, "innerHTML", {
      get() {
        return this._html || "";
      },
      set(v) {
        this._html = String(v);
        // 浏览器版会 innerHTML="" 清空列表；桥接层要同步 children
        if (v === "" || v == null) this.children = [];
      },
    });
    return node;
  }

  function dummyCtx() {
    const noop = () => {};
    const grad = { addColorStop: noop };
    return {
      canvas: { width: 0, height: 0 },
      clearRect: noop,
      fillRect: noop,
      strokeRect: noop,
      beginPath: noop,
      closePath: noop,
      moveTo: noop,
      lineTo: noop,
      arc: noop,
      arcTo: noop,
      ellipse: noop,
      fill: noop,
      stroke: noop,
      save: noop,
      restore: noop,
      translate: noop,
      rotate: noop,
      scale: noop,
      setTransform: noop,
      fillText: noop,
      strokeText: noop,
      measureText: () => ({ width: 10 }),
      createRadialGradient: () => grad,
      createLinearGradient: () => grad,
      drawImage: noop,
      setLineDash: noop,
      get fillStyle() {
        return "#000";
      },
      set fillStyle(v) {},
      get strokeStyle() {
        return "#000";
      },
      set strokeStyle(v) {},
      get lineWidth() {
        return 1;
      },
      set lineWidth(v) {},
      get font() {
        return "10px sans-serif";
      },
      set font(v) {},
      get textAlign() {
        return "left";
      },
      set textAlign(v) {},
      get globalAlpha() {
        return 1;
      },
      set globalAlpha(v) {},
      get globalCompositeOperation() {
        return "source-over";
      },
      set globalCompositeOperation(v) {},
    };
  }

  function el(id, tag) {
    if (byId[id]) return byId[id];
    const n = makeNode(tag || "div", id);
    byId[id] = n;
    return n;
  }

  // seed known ids
  const game = el("game", "canvas");
  game._isCanvas = true;
  // firefly resize() 写 canvas.width 时必须落到真实画布，否则缓冲区对不齐
  Object.defineProperty(game, "width", {
    get() {
      return canvas.width;
    },
    set(v) {
      canvas.width = v;
    },
  });
  Object.defineProperty(game, "height", {
    get() {
      return canvas.height;
    },
    set(v) {
      canvas.height = v;
    },
  });
  game.style = game.style || {};
  // 代理 style 到真实 canvas（若支持）
  Object.defineProperty(game, "style", {
    get() {
      return canvas.style || {};
    },
    set(v) {
      if (canvas.style && v) {
        try {
          if (v.width != null) canvas.style.width = v.width;
          if (v.height != null) canvas.style.height = v.height;
        } catch (_) {}
      }
    },
  });
  el("minimap", "canvas");
  el("overlay");
  el("title");
  el("subtitle");
  el("intro-copy");
  el("score-summary").classList.add("hidden");
  el("final-score");
  el("final-level");
  el("final-blooms");
  el("final-build");
  el("best-score");
  el("best-level");
  el("best-embers");
  el("death-reason");
  el("btn-start", "button").textContent = "开始夜行";
  el("btn-shop", "button").textContent = "余烬商店";
  el("mode-normal", "button");
  el("mode-sprint", "button");
  el("title").textContent = "夜萤拾光";
  el("subtitle").textContent = "拾光进阶构筑，挑战暗影君王";
  el("hud").classList.add("hidden");
  el("score");
  el("combo");
  el("glow-bar");
  el("xp-bar");
  el("xp-text");
  el("level-label");
  el("night-label");
  el("hearts");
  el("build-tags");
  el("pause-badge");
  el("level-toast");
  el("toast-title");
  el("toast-sub");
  el("choice-overlay").classList.add("hidden");
  el("choice-cards");
  el("choice-kicker");
  el("boss-bar").classList.add("hidden");
  el("boss-fill");
  el("boss-name");
  el("shop-overlay").classList.add("hidden");
  el("shop-grid");
  el("ember-count");
  el("btn-shop", "button");
  el("btn-shop-close", "button");
  el("ember-gain");
  el("meta-summary");
  el("glimmer-pick");
  el("glimmer-row");
  el("glimmer-detail");
  el("pulse-bar");
  el("danger-flash");
  el("touch-ui");
  el("joystick");
  el("stick");
  el("btn-touch-flare", "button");
  el("btn-touch-pulse", "button");
  el("btn-touch-dash", "button");
  el("xp-wrap");
  el("pulse-hint");
  el("pause-badge").classList.add("hidden");
  el("level-toast").classList.add("hidden");

  byId["game"]._realCanvas = canvas;

  function hidden(n) {
    if (!n) return true;
    try {
      if (n.classList && n.classList.contains("hidden")) return true;
      const st = n.style;
      if (st && st.display === "none") return true;
    } catch (_) {}
    return false;
  }

  // Layout for portrait mini-game
  function layout() {
    const pad = 14;
    const topH = 78;

    byId["hud"]._rect = { left: pad, top: 10, width: W - pad * 2, height: topH };

    // title overlay
    const panelW = Math.min(W - 36, 400);
    const panelH = Math.min(H - 40, 640);
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;
    byId["overlay"]._rect = { left: panelX, top: panelY, width: panelW, height: panelH };

    byId["btn-start"]._rect = {
      left: panelX + 28,
      top: panelY + panelH - 120,
      width: panelW - 56,
      height: 48,
    };
    byId["btn-shop"]._rect = {
      left: panelX + 28,
      top: panelY + panelH - 64,
      width: panelW - 56,
      height: 40,
    };
    const modeY = panelY + panelH - 170;
    const modeW = (panelW - 64) / 2;
    byId["mode-normal"]._rect = { left: panelX + 28, top: modeY, width: modeW, height: 36 };
    byId["mode-sprint"]._rect = {
      left: panelX + 28 + modeW + 8,
      top: modeY,
      width: modeW,
      height: 36,
    };

    // choice cards 3-col
    const cw = (W - 40) / 3;
    for (let i = 0; i < 3; i++) {
      // assigned when cards created — stored on card._rect
    }
    byId["choice-overlay"]._rect = { left: 0, top: 0, width: W, height: H };

    // shop
    byId["shop-overlay"]._rect = { left: 0, top: 0, width: W, height: H };
    byId["btn-shop-close"]._rect = {
      left: W / 2 - 80,
      top: H - 70,
      width: 160,
      height: 44,
    };

    // touch controls — 单手：摇杆右下，技能键在左侧
    const joySize = Math.min(132, W * 0.32);
    const joyRight = 16;
    const joyBottom = 24;
    const joyLeft = W - joyRight - joySize;
    const joyTop = H - joyBottom - joySize;
    byId["joystick"]._rect = { left: joyLeft, top: joyTop, width: joySize, height: joySize };
    byId["stick"]._rect = {
      left: joyLeft + joySize / 2 - 26,
      top: joyTop + joySize / 2 - 26,
      width: 52,
      height: 52,
    };
    const btnR = 32;
    // 三个技能横排在左下
    const skillY = H - 36 - btnR * 2;
    byId["btn-touch-flare"]._rect = { left: 18, top: skillY, width: btnR * 2, height: btnR * 2 };
    byId["btn-touch-pulse"]._rect = {
      left: 18 + btnR * 2 + 12,
      top: skillY + 6,
      width: btnR * 1.75,
      height: btnR * 1.75,
    };
    byId["btn-touch-dash"]._rect = {
      left: 18 + btnR * 2 + 12 + btnR * 1.75 + 10,
      top: skillY + 10,
      width: btnR * 1.6,
      height: btnR * 1.6,
    };

    // layout dynamic button lists
    layoutButtonRow(byId["choice-cards"], 12, H * 0.42, W - 24, 110);
    layoutButtonGrid(byId["shop-grid"], 12, 100, W - 24, H - 180);
    layoutButtonRow(byId["glimmer-row"], 12, H * 0.55, W - 24, 64);
  }

  function layoutButtonRow(parent, x, y, w, h) {
    if (!parent || !parent.children) return;
    const n = parent.children.length;
    if (!n) return;
    const gap = 8;
    const cw = (w - gap * (n - 1)) / n;
    parent.children.forEach((c, i) => {
      if (!c) return;
      c._rect = { left: x + i * (cw + gap), top: y, width: cw, height: h };
    });
  }

  function layoutButtonGrid(parent, x, y, w, h) {
    if (!parent || !parent.children) return;
    const n = parent.children.length;
    if (!n) return;
    const cols = 2;
    const rows = Math.ceil(n / cols);
    const gap = 8;
    const cw = (w - gap) / cols;
    const ch = Math.min(88, (h - gap * (rows - 1)) / Math.max(rows, 1));
    parent.children.forEach((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      c._rect = {
        left: x + col * (cw + gap),
        top: y + row * (ch + gap),
        width: cw,
        height: ch,
      };
    });
  }

  const GLIMMER_UI = [
    { id: "spark", name: "初萤", shape: "orb", color: "#f0d48a", color2: "#7dffc3", desc: "均衡，适合初次夜行" },
    { id: "weaver", name: "织夜", shape: "teardrop", color: "#8dffc4", color2: "#5ee0ff", desc: "经验+12% 连击更久" },
    { id: "stardust", name: "星屑", shape: "star", color: "#9ef0ff", color2: "#c4a1ff", desc: "移速+14% 更灵活" },
    { id: "moonkin", name: "月眷", shape: "crescent", color: "#c4a1ff", color2: "#ffd6ea", desc: "体力+1 掉经验更慢" },
    { id: "flareborn", name: "光爆", shape: "diamond", color: "#ffe08a", color2: "#ff9ecb", desc: "闪耀更大更快" },
    { id: "emberwing", name: "烬尾", shape: "wedge", color: "#ffb0c0", color2: "#ffe08a", desc: "尾迹驱影 移速+6%" },
  ];

  function drawGlimmerShapeIcon(x, y, r, g) {
    const grad = ctx.createRadialGradient(x - r * 0.2, y - r * 0.25, 1, x, y, r * 1.2);
    grad.addColorStop(0, "#fff6c8");
    grad.addColorStop(0.45, g.color);
    grad.addColorStop(1, g.color2);
    ctx.fillStyle = grad;
    ctx.beginPath();
    switch (g.shape) {
      case "teardrop":
        ctx.moveTo(x, y - r * 1.1);
        ctx.bezierCurveTo(x + r * 0.9, y - r * 0.2, x + r * 0.65, y + r * 0.85, x, y + r * 1.15);
        ctx.bezierCurveTo(x - r * 0.65, y + r * 0.85, x - r * 0.9, y - r * 0.2, x, y - r * 1.1);
        break;
      case "star":
        for (let i = 0; i < 8; i++) {
          const a = -Math.PI / 2 + (i / 8) * Math.PI * 2;
          const rr = i % 2 === 0 ? r * 1.2 : r * 0.4;
          const px = x + Math.cos(a) * rr;
          const py = y + Math.sin(a) * rr;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        break;
      case "crescent":
        ctx.arc(x, y, r * 1.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + r * 0.48, y - r * 0.12, r * 0.85, 0, Math.PI * 2, true);
        break;
      case "diamond":
        ctx.moveTo(x, y - r * 1.2);
        ctx.lineTo(x + r * 0.8, y);
        ctx.lineTo(x, y + r * 1.2);
        ctx.lineTo(x - r * 0.8, y);
        break;
      case "wedge":
        ctx.moveTo(x + r * 1.25, y);
        ctx.lineTo(x - r * 0.65, y - r * 0.9);
        ctx.lineTo(x - r * 0.3, y);
        ctx.lineTo(x - r * 0.65, y + r * 0.9);
        break;
      default:
        ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.closePath();
    ctx.fill();
  }

  function draw() {
    try {
      layout();
    } catch (e) {
      console.error("[layout]", e);
    }
    // 每帧重设变换，避免 resize 后错位
    try {
      ctx.setTransform(platform.pixelRatio, 0, 0, platform.pixelRatio, 0, 0);
    } catch (_) {}
    // HUD
    if (!hidden(byId["hud"])) {
      ctx.save();
      ctx.fillStyle = "rgba(4,6,12,0.45)";
      ctx.fillRect(0, 0, W, 70);
      ctx.fillStyle = "#e8e4d8";
      ctx.font = "600 20px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(String(byId["score"].textContent || "0"), 16, 32);
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "#9a968a";
      ctx.fillText("光尘", 16, 48);
      ctx.font = "600 14px sans-serif";
      ctx.fillStyle = "#e8e4d8";
      ctx.textAlign = "center";
      ctx.fillText(String(byId["level-label"].textContent || ""), W / 2, 24);
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "#9a968a";
      ctx.fillText(String(byId["xp-text"].textContent || ""), W / 2, 42);
      // xp bar
      const barW = Math.min(220, W * 0.5);
      const barX = W / 2 - barW / 2;
      ctx.fillStyle = "rgba(125,255,195,0.15)";
      ctx.fillRect(barX, 50, barW, 8);
      const xpW = parseFloat(byId["xp-bar"].style.width || "0") / 100;
      ctx.fillStyle = "#7dffc3";
      ctx.fillRect(barX, 50, barW * (isNaN(xpW) ? 0 : xpW), 8);

      // hearts right
      const hearts = byId["hearts"].children;
      hearts.forEach((h, i) => {
        const lost = h.classList.contains("lost");
        ctx.fillStyle = lost ? "#6a4050" : "#ff6b7a";
        ctx.beginPath();
        ctx.arc(W - 24 - i * 16, 28, 5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // boss bar
    if (!hidden(byId["boss-bar"])) {
      const bw = W - 48;
      const bx = 24;
      const by = 78;
      ctx.fillStyle = "rgba(255,77,109,0.15)";
      ctx.fillRect(bx, by, bw, 10);
      const p = parseFloat(byId["boss-fill"].style.width || "100") / 100;
      ctx.fillStyle = "#ff4d6d";
      ctx.fillRect(bx, by, bw * (isNaN(p) ? 1 : p), 10);
      ctx.fillStyle = "#ff8a9a";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(byId["boss-name"].textContent || ""), W / 2, by - 4);
    }

    // choice overlay
    if (!hidden(byId["choice-overlay"])) {
      ctx.fillStyle = "rgba(4,6,12,0.72)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#f0d48a";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(byId["choice-kicker"].textContent || ""), W / 2, H * 0.32);
      ctx.fillStyle = "#e8e4d8";
      ctx.font = "600 22px sans-serif";
      ctx.fillText("选择一道微光", W / 2, H * 0.32 + 32);
      byId["choice-cards"].children.forEach((c) => {
        const r = c._rect;
        if (!r) return;
        ctx.fillStyle = c.classList.contains("rare")
          ? "rgba(40,28,64,0.95)"
          : "rgba(12,18,32,0.92)";
        roundRect(r.left, r.top, r.width, r.height, 12);
        ctx.fill();
        ctx.strokeStyle = "rgba(232,228,216,0.2)";
        ctx.stroke();
        // name / desc from child text nodes if any, else _labels
        const name = c._name || "";
        const desc = c._desc || "";
        ctx.fillStyle = "#e8e4d8";
        ctx.font = "600 15px sans-serif";
        ctx.textAlign = "left";
        wrapText(name, r.left + 12, r.top + 28, r.width - 24, 18);
        ctx.fillStyle = "#9a968a";
        ctx.font = "12px sans-serif";
        wrapText(desc, r.left + 12, r.top + 56, r.width - 24, 16);
        ctx.fillStyle = "#7dffc3";
        ctx.font = "11px sans-serif";
        ctx.fillText(String(c._key || ""), r.left + r.width - 22, r.top + 20);
      });
    }

    // title overlay
    if (!hidden(byId["overlay"])) {
      const r =
        byId["overlay"]._rect || {
          left: (W - Math.min(W - 36, 400)) / 2,
          top: (H - Math.min(H - 40, 640)) / 2,
          width: Math.min(W - 36, 400),
          height: Math.min(H - 40, 640),
        };
      byId["overlay"]._rect = r;
      // ensure buttons have rects even if layout skipped
      if (!byId["btn-start"]._rect) {
        byId["btn-start"]._rect = {
          left: r.left + 28,
          top: r.top + r.height - 120,
          width: r.width - 56,
          height: 48,
        };
      }
      if (!byId["btn-shop"]._rect) {
        byId["btn-shop"]._rect = {
          left: r.left + 28,
          top: r.top + r.height - 64,
          width: r.width - 56,
          height: 40,
        };
      }
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(4,6,12,0.62)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(12,18,32,0.94)";
      roundRect(r.left, r.top, r.width, r.height, 16);
      ctx.fill();
      ctx.strokeStyle = "rgba(232,228,216,0.14)";
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = "#f0d48a";
      ctx.font = "18px sans-serif";
      ctx.fillText("✦", W / 2, r.top + 36);
      ctx.fillStyle = "#e8e4d8";
      ctx.font = "600 28px sans-serif";
      const titleTxt = byId["title"].textContent || "夜萤拾光";
      ctx.fillText(titleTxt, W / 2, r.top + 78);
      ctx.fillStyle = "#9a968a";
      ctx.font = "13px sans-serif";
      wrapCenter(
        byId["subtitle"].textContent || "拾光进阶构筑",
        W / 2,
        r.top + 108,
        r.width - 40,
        18
      );

      // death summary
      if (!hidden(byId["score-summary"])) {
        ctx.fillStyle = "#f0d48a";
        ctx.font = "600 36px sans-serif";
        ctx.fillText(String(byId["final-score"].textContent || "0"), W / 2, r.top + 200);
        ctx.fillStyle = "#9a968a";
        ctx.font = "12px sans-serif";
        ctx.fillText(String(byId["ember-gain"].textContent || ""), W / 2, r.top + 230);
        ctx.fillStyle = "#e8e4d8";
        ctx.font = "13px sans-serif";
        ctx.fillText(String(byId["final-level"].textContent || ""), W / 2, r.top + 260);
        wrapCenter(String(byId["death-reason"].textContent || ""), W / 2, r.top + 290, r.width - 40, 18);
      }

      // buttons — force text
      if (!byId["btn-start"].textContent) byId["btn-start"].textContent = "开始夜行";
      if (!byId["btn-shop"].textContent) byId["btn-shop"].textContent = "余烬商店";
      drawBtn(byId["btn-start"], "#f0d48a", "#0a1020");
      if (!hidden(byId["btn-shop"])) drawBtn(byId["btn-shop"], "rgba(232,228,216,0.08)", "#e8e4d8");
      ctx.restore();
    }

    // shop overlay
    if (!hidden(byId["shop-overlay"])) {
      ctx.fillStyle = "rgba(4,6,12,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#e8e4d8";
      ctx.font = "600 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("余烬商店", W / 2, 48);
      ctx.fillStyle = "#f0d48a";
      ctx.font = "14px sans-serif";
      ctx.fillText("余烬 " + (byId["ember-count"].textContent || "0"), W / 2, 72);
      byId["shop-grid"].children.forEach((c) => {
        const r = c._rect;
        if (!r) return;
        ctx.fillStyle = c.disabled ? "rgba(12,18,32,0.55)" : "rgba(12,18,32,0.92)";
        roundRect(r.left, r.top, r.width, r.height, 10);
        ctx.fill();
        ctx.strokeStyle = "rgba(232,228,216,0.16)";
        ctx.stroke();
        ctx.fillStyle = "#e8e4d8";
        ctx.font = "600 14px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(c._name || "", r.left + 10, r.top + 22);
        ctx.fillStyle = "#9a968a";
        ctx.font = "11px sans-serif";
        wrapText(c._desc || "", r.left + 10, r.top + 42, r.width - 20, 14);
        ctx.fillStyle = "#f0d48a";
        ctx.fillText(c._cost || "", r.left + 10, r.top + r.height - 12);
      });
      drawBtn(byId["btn-shop-close"], "#f0d48a", "#0a1020");
    }

    // glimmer pick on title — icon + name + selected desc
    if (!hidden(byId["glimmer-pick"]) && !hidden(byId["overlay"]) && byId["overlay"]._rect) {
      const pr = byId["overlay"]._rect;
      const startY = pr.top + 128;
      ctx.fillStyle = "#9a968a";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("选择微光", pr.left + 20, startY);

      const cols = 3;
      const gap = 8;
      const cellW = (pr.width - 40 - gap * (cols - 1)) / cols;
      const cellH = 82;
      for (let gi = 0; gi < GLIMMER_UI.length; gi++) {
        const g = GLIMMER_UI[gi];
        const col = gi % cols;
        const row = Math.floor(gi / cols);
        const bx = pr.left + 20 + col * (cellW + gap);
        const by = startY + 12 + row * (cellH + 8);
        if (byId["glimmer-row"].children[gi]) {
          byId["glimmer-row"].children[gi]._rect = {
            left: bx,
            top: by,
            width: cellW,
            height: cellH,
          };
        }
        const active =
          !!byId["glimmer-row"].children[gi] &&
          byId["glimmer-row"].children[gi].classList.contains("active");
        ctx.fillStyle = active ? "rgba(240,212,138,0.16)" : "rgba(8,12,22,0.85)";
        roundRect(bx, by, cellW, cellH, 10);
        ctx.fill();
        ctx.strokeStyle = active ? "rgba(240,212,138,0.75)" : "rgba(232,228,216,0.18)";
        ctx.stroke();
        drawGlimmerShapeIcon(bx + cellW / 2, by + 28, 13, g);
        ctx.fillStyle = active ? "#f0d48a" : "#e8e4d8";
        ctx.font = "600 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(g.name, bx + cellW / 2, by + cellH - 28);
        ctx.fillStyle = "#9a968a";
        ctx.font = "10px sans-serif";
        wrapCenter(g.desc, bx + cellW / 2, by + cellH - 12, cellW - 8, 12);
      }
      ctx.fillStyle = "#7dffc3";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      const selId = byId["glimmer-row"]._selectedId || "spark";
      const sel =
        GLIMMER_UI.find(function (gg) {
          return gg.id === selId;
        }) || GLIMMER_UI[0];
      ctx.fillText(
        "当前：" + sel.name + " · " + sel.desc,
        W / 2,
        startY + 12 + 2 * (cellH + 8) + 16
      );
    }

    // mode buttons on title
    if (!hidden(byId["overlay"]) && byId["mode-normal"] && byId["mode-normal"]._rect) {
      const mn = byId["mode-normal"]._rect;
      const ms = byId["mode-sprint"]._rect;
      const sprintOn = byId["mode-sprint"].classList.contains("active");
      const normalOn = !sprintOn;
      ctx.fillStyle = normalOn ? "rgba(125,255,195,0.14)" : "rgba(8,12,22,0.75)";
      roundRect(mn.left, mn.top, mn.width, mn.height, 8);
      ctx.fill();
      ctx.strokeStyle = normalOn ? "rgba(125,255,195,0.6)" : "rgba(232,228,216,0.18)";
      ctx.stroke();
      ctx.fillStyle = "#e8e4d8";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("标准夜行", mn.left + mn.width / 2, mn.top + mn.height / 2 + 4);

      ctx.fillStyle = sprintOn ? "rgba(240,212,138,0.16)" : "rgba(8,12,22,0.75)";
      roundRect(ms.left, ms.top, ms.width, ms.height, 8);
      ctx.fill();
      ctx.strokeStyle = sprintOn ? "rgba(240,212,138,0.65)" : "rgba(232,228,216,0.18)";
      ctx.stroke();
      ctx.fillStyle = "#e8e4d8";
      ctx.fillText("极速 3分钟", ms.left + ms.width / 2, ms.top + ms.height / 2 + 4);
    }

    // pause
    if (!hidden(byId["pause-badge"])) {
      ctx.fillStyle = "rgba(12,18,32,0.9)";
      roundRect(W / 2 - 90, H / 2 - 22, 180, 44, 999);
      ctx.fill();
      ctx.fillStyle = "#e8e4d8";
      ctx.font = "13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("已暂停 · 点此继续", W / 2, H / 2 + 4);
    }

    // touch controls
    if (byId["touch-ui"].classList.contains("on") && !hidden(byId["touch-ui"])) {
      const j = byId["joystick"]._rect;
      ctx.strokeStyle = "rgba(232,228,216,0.25)";
      ctx.fillStyle = "rgba(8,12,22,0.4)";
      ctx.beginPath();
      ctx.arc(j.left + j.width / 2, j.top + j.height / 2, j.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const s = byId["stick"]._rect;
      ctx.fillStyle = "rgba(240,212,138,0.4)";
      ctx.beginPath();
      ctx.arc(s.left + s.width / 2, s.top + s.height / 2, s.width / 2, 0, Math.PI * 2);
      ctx.fill();
      drawCircleBtn(byId["btn-touch-flare"], "闪耀");
      drawCircleBtn(byId["btn-touch-pulse"], "光脉");
      drawCircleBtn(byId["btn-touch-dash"], "冲刺");
    }
  }

  function drawCircleBtn(node, label) {
    const r = node._rect;
    if (!r) return;
    ctx.fillStyle = "rgba(10,16,28,0.55)";
    ctx.strokeStyle = "rgba(240,212,138,0.5)";
    ctx.beginPath();
    ctx.arc(r.left + r.width / 2, r.top + r.height / 2, r.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#e8e4d8";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, r.left + r.width / 2, r.top + r.height / 2 + 4);
  }

  function drawBtn(node, bg, fg) {
    if (!node || hidden(node) || !node._rect) return;
    const r = node._rect;
    ctx.fillStyle = bg;
    roundRect(r.left, r.top, r.width, r.height, 999);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.font = "600 15px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(node.textContent || "", r.left + r.width / 2, r.top + r.height / 2 + 5);
  }

  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function wrapText(text, x, y, maxW, lineH) {
    const chars = String(text || "").split("");
    let line = "";
    let yy = y;
    for (const ch of chars) {
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) {
        ctx.fillText(line, x, yy);
        line = ch;
        yy += lineH;
      } else line = t;
    }
    if (line) ctx.fillText(line, x, yy);
  }

  function wrapCenter(text, cx, y, maxW, lineH) {
    const chars = String(text || "").split("");
    let line = "";
    let yy = y;
    for (const ch of chars) {
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) {
        ctx.fillText(line, cx, yy);
        line = ch;
        yy += lineH;
      } else line = t;
    }
    if (line) ctx.fillText(line, cx, yy);
  }

  function hit(x, y) {
    const list = [];
    const push = (n) => {
      if (!n || hidden(n) || !n._rect) return;
      const r = n._rect;
      if (x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height)
        list.push(n);
    };
    if (!hidden(byId["choice-overlay"]) && byId["choice-cards"] && byId["choice-cards"].children) {
      byId["choice-cards"].children.forEach(push);
    }
    if (!hidden(byId["shop-overlay"])) {
      if (byId["shop-grid"] && byId["shop-grid"].children) byId["shop-grid"].children.forEach(push);
      push(byId["btn-shop-close"]);
    }
    if (!hidden(byId["overlay"])) {
      push(byId["btn-start"]);
      push(byId["btn-shop"]);
      push(byId["mode-normal"]);
      push(byId["mode-sprint"]);
      if (!hidden(byId["glimmer-pick"]) && byId["glimmer-row"] && byId["glimmer-row"].children)
        byId["glimmer-row"].children.forEach(push);
    }
    if (!hidden(byId["pause-badge"])) {
      // whole center dismisses
      if (Math.hypot(x - W / 2, y - H / 2) < 50) list.push(byId["pause-badge"]);
    }
    if (byId["touch-ui"].classList.contains("on") && !hidden(byId["touch-ui"])) {
      push(byId["btn-touch-flare"]);
      push(byId["btn-touch-pulse"]);
      push(byId["btn-touch-dash"]);
    }
    return list;
  }

  // wire tt touch → virtual buttons + joystick
  let joyPid = -1;
  tt.onTouchStart((e) => {
    const t = e.touches[0] || e.changedTouches[0];
    if (!t) return;
    const x = t.clientX;
    const y = t.clientY;
    const nodes = hit(x, y);
    const ev = {
      preventDefault() {},
      stopPropagation() {},
      clientX: x,
      clientY: y,
      pointerId: t.identifier || 0,
    };
    for (const n of nodes) {
      // firefly 按钮用的是 click，不是 pointerdown
      n.fire("pointerdown", ev);
      n.fire("click", ev);
    }
    // joystick
    if (!hidden(byId["touch-ui"]) && byId["touch-ui"].classList.contains("on")) {
      const j = byId["joystick"];
      const r = j._rect;
      if (
        r &&
        x >= r.left &&
        x <= r.left + r.width &&
        y >= r.top &&
        y <= r.top + r.height
      ) {
        joyPid = t.identifier || 0;
        j.fire("pointerdown", {
          preventDefault() {},
          stopPropagation() {},
          clientX: x,
          clientY: y,
          pointerId: joyPid,
        });
      }
    }
  });
  tt.onTouchMove((e) => {
    const t = e.touches[0];
    if (!t) return;
    const id = t.identifier || 0;
    if (id === joyPid) {
      byId["joystick"].fire("pointermove", {
        preventDefault() {},
        stopPropagation() {},
        clientX: t.clientX,
        clientY: t.clientY,
        pointerId: id,
      });
    }
  });
  tt.onTouchEnd((e) => {
    const t = e.changedTouches[0];
    if (!t) return;
    const id = t.identifier || 0;
    if (id === joyPid) {
      byId["joystick"].fire("pointerup", { pointerId: id });
      joyPid = -1;
    }
  });

  return {
    document: {
      getElementById(id) {
        return el(id);
      },
      querySelector(sel) {
        if (sel === ".xp-wrap") return el("xp-wrap");
        return null;
      },
      createElement(tag) {
        return makeNode(tag);
      },
      addEventListener() {},
      removeEventListener() {},
      body: { appendChild() {} },
    },
    window: {
      innerWidth: W,
      innerHeight: H,
      devicePixelRatio: platform.pixelRatio,
      addEventListener() {},
      removeEventListener() {},
      location: { search: "" },
      requestAnimationFrame: (fn) => requestAnimationFrame(fn),
    },
    drawUi: draw,
    byId,
  };
}

module.exports = { createDomBridge };
