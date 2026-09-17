/* 夜萤拾光 v3 — roguelike-ish night garden
   2x world + camera, idle XP decay, tiered level curve,
   3-choice upgrade draft on level-up. */

(() => {
  "use strict";

  // ── DOM ──────────────────────────────────────────────
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const minimap = document.getElementById("minimap");
  const mctx = minimap.getContext("2d");
  const overlay = document.getElementById("overlay");
  const titleEl = document.getElementById("title");
  const subtitleEl = document.getElementById("subtitle");
  const introCopy = document.getElementById("intro-copy");
  const scoreSummary = document.getElementById("score-summary");
  const finalScoreEl = document.getElementById("final-score");
  const finalLevelEl = document.getElementById("final-level");
  const finalBloomsEl = document.getElementById("final-blooms");
  const finalBuildEl = document.getElementById("final-build");
  const bestScoreEl = document.getElementById("best-score");
  const bestLevelEl = document.getElementById("best-level");
  const deathReasonEl = document.getElementById("death-reason");
  const btnStart = document.getElementById("btn-start");
  const hud = document.getElementById("hud");
  const scoreEl = document.getElementById("score");
  const comboEl = document.getElementById("combo");
  const glowBar = document.getElementById("glow-bar");
  const xpBar = document.getElementById("xp-bar");
  const xpText = document.getElementById("xp-text");
  const levelLabel = document.getElementById("level-label");
  const nightLabel = document.getElementById("night-label");
  const heartsEl = document.getElementById("hearts");
  const buildTags = document.getElementById("build-tags");
  const pauseBadge = document.getElementById("pause-badge");
  const levelToast = document.getElementById("level-toast");
  const toastTitle = document.getElementById("toast-title");
  const toastSub = document.getElementById("toast-sub");
  const choiceOverlay = document.getElementById("choice-overlay");
  const choiceCards = document.getElementById("choice-cards");
  const choiceKicker = document.getElementById("choice-kicker");
  const xpWrap = document.querySelector(".xp-wrap");
  const bossBar = document.getElementById("boss-bar");
  const bossFill = document.getElementById("boss-fill");
  const bossName = document.getElementById("boss-name");
  const shopOverlay = document.getElementById("shop-overlay");
  const shopGrid = document.getElementById("shop-grid");
  const emberCountEl = document.getElementById("ember-count");
  const btnShop = document.getElementById("btn-shop");
  const btnShopClose = document.getElementById("btn-shop-close");
  const emberGainEl = document.getElementById("ember-gain");
  const bestEmbersEl = document.getElementById("best-embers");
  const metaSummaryEl = document.getElementById("meta-summary");
  const glimmerPick = document.getElementById("glimmer-pick");
  const glimmerRow = document.getElementById("glimmer-row");
  const glimmerDetail = document.getElementById("glimmer-detail");
  const pulseBar = document.getElementById("pulse-bar");
  const dangerFlash = document.getElementById("danger-flash");
  const modeNormalBtn = document.getElementById("mode-normal");
  const modeSprintBtn = document.getElementById("mode-sprint");
  const modeDetail = document.getElementById("mode-detail");
  const touchUi = document.getElementById("touch-ui");
  const joystickEl = document.getElementById("joystick");
  const stickEl = document.getElementById("stick");
  const btnTouchFlare = document.getElementById("btn-touch-flare");
  const btnTouchPulse = document.getElementById("btn-touch-pulse");
  const btnTouchDash = document.getElementById("btn-touch-dash");

  // ── Platform storage (localStorage / tt) ─────────────
  const store = {
    get(key, fallback) {
      try {
        if (typeof tt !== "undefined" && tt.getStorageSync) {
          const v = tt.getStorageSync(key);
          if (v === "" || v == null) return fallback;
          return v;
        }
      } catch (_) {}
      try {
        const v = localStorage.getItem(key);
        return v == null ? fallback : v;
      } catch (_) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        if (typeof tt !== "undefined" && tt.setStorageSync) {
          tt.setStorageSync(key, value);
          return;
        }
      } catch (_) {}
      try {
        localStorage.setItem(key, value);
      } catch (_) {}
    },
    getJson(key, fallback) {
      const raw = this.get(key, null);
      if (raw == null) return fallback;
      if (typeof raw === "object") return raw;
      try {
        return JSON.parse(raw);
      } catch (_) {
        return fallback;
      }
    },
    setJson(key, obj) {
      this.set(key, JSON.stringify(obj));
    },
  };

  const IS_TOUCH_UI =
    typeof tt !== "undefined" ||
    (typeof navigator !== "undefined" &&
      (navigator.maxTouchPoints > 0 || "ontouchstart" in window)) ||
    (typeof window !== "undefined" && window.innerWidth < 900);

  // ── Constants ────────────────────────────────────────
  const TAU = Math.PI * 2;
  const WORLD_SCALE = 2; // world is 2x viewport

  const LEVELS = [
    { lv: 1, name: "初萤" },
    { lv: 2, name: "微明" },
    { lv: 3, name: "引光" },
    { lv: 4, name: "花信" },
    { lv: 5, name: "织夜" },
    { lv: 6, name: "星屑" },
    { lv: 7, name: "月眷" },
    { lv: 8, name: "永明" },
    { lv: 9, name: "极光" },
    { lv: 10, name: "无尽" },
  ];

  // Tiered XP curve — early cheap, mid jumps, late expensive
  const XP_TABLE = [
    0,
    8, // 1→2
    12, // 2→3
    16, // 3→4
    24, // 4→5
    34, // 5→6
    48, // 6→7
    66, // 7→8
    90, // 8→9
    120, // 9→10
    156, // 10→11
    200, // 11→12
    252,
    312,
    380,
  ];

  const LEVEL_STYLES = [
    { core: "#fff6c8", mid: "#f0d48a", trail: "#7dffc3", rings: 0 },
    { core: "#fff2b0", mid: "#f5d878", trail: "#9dffc8", rings: 0 },
    { core: "#e8fff0", mid: "#8dffc4", trail: "#5ee0ff", rings: 1 },
    { core: "#d8fff4", mid: "#5ee0c8", trail: "#7ec8ff", rings: 1 },
    { core: "#d0f4ff", mid: "#6ecbff", trail: "#a78bfa", rings: 2 },
    { core: "#c8ecff", mid: "#7eb6ff", trail: "#c4a1ff", rings: 2 },
    { core: "#f0e6ff", mid: "#c4a1ff", trail: "#ffd6ea", rings: 2 },
    { core: "#ffe8f2", mid: "#ffb0d4", trail: "#ffe08a", rings: 3 },
    { core: "#fff8e0", mid: "#ffe08a", trail: "#ffffff", rings: 3 },
    { core: "#ffffff", mid: "#fff0b0", trail: "#e0ffff", rings: 4 },
  ];

  const COLORS = {
    night0: "#04060c",
    night1: "#0a1224",
    night2: "#12203a",
    mote: "#b8ffe0",
    flowerLit: "#ffd6ea",
    leaf: "#2a4a3a",
    leafDark: "#1a3028",
    wisp: "#6b3a58",
    wispEye: "#ff4d6d",
  };

  // ── Starting glimmers (shape + passive) ──────────────
  const GLIMMERS = [
    {
      id: "spark",
      name: "初萤",
      shape: "orb",
      color: "#f0d48a",
      color2: "#7dffc3",
      cost: 0,
      desc: "均衡微光，适合初次夜行。",
      passive: "无额外加成，但最稳。",
      apply() {},
    },
    {
      id: "weaver",
      name: "织夜",
      shape: "teardrop",
      color: "#8dffc4",
      color2: "#5ee0ff",
      cost: 0,
      desc: "身形细长，擅长连绵拾取。",
      passive: "经验 +12% · 连击持续 +40%",
      apply() {
        stats.xpGain *= 1.12;
        stats.comboKeep *= 1.4;
      },
    },
    {
      id: "stardust",
      name: "星屑",
      shape: "star",
      color: "#9ef0ff",
      color2: "#c4a1ff",
      cost: 0,
      desc: "四芒星形，迅捷而张扬。",
      passive: "移速 +14% · 辉光衰减略快",
      apply() {
        stats.speedMul *= 1.14;
        stats.glowKeep *= 1.2;
      },
    },
    {
      id: "moonkin",
      name: "月眷",
      shape: "crescent",
      color: "#c4a1ff",
      color2: "#ffd6ea",
      cost: 60,
      desc: "新月之形，夜里更沉得住气。",
      passive: "体力 +1 · 闲置经验衰减 -35%",
      apply() {
        player.maxHp += 1;
        player.hp = player.maxHp;
        stats.xpDecayMul *= 0.65;
      },
    },
    {
      id: "flareborn",
      name: "光爆",
      shape: "diamond",
      color: "#ffe08a",
      color2: "#ff9ecb",
      cost: 60,
      desc: "菱晶之体，闪耀如刃。",
      passive: "闪耀范围 +25% · 冷却 -15% · 磁吸 -12%",
      apply() {
        stats.flareRange *= 1.25;
        stats.flareCdMul *= 0.85;
        stats.magnet *= 0.88;
      },
    },
    {
      id: "emberwing",
      name: "烬尾",
      shape: "wedge",
      color: "#ffb0c0",
      color2: "#ffe08a",
      cost: 80,
      desc: "楔形尾焰，近身即可驱影。",
      passive: "开局尾迹驱影 · 移速 +6%",
      apply() {
        stats.trailRepel = 1;
        stats.speedMul *= 1.06;
      },
    },
  ];

  let selectedGlimmer = store.get("firefly-glimmer", "spark") || "spark";
  let gameMode = store.get("firefly-mode", "normal") || "normal"; // normal | sprint
  const SPRINT_TIME = 180;

  function glimmerById(id) {
    return GLIMMERS.find((g) => g.id === id) || GLIMMERS[0];
  }

  function isGlimmerUnlocked(id) {
    const g = glimmerById(id);
    if (g.cost <= 0) return true;
    return !!(meta["unlock_" + id] || 0);
  }

  function buyGlimmer(id) {
    const g = glimmerById(id);
    if (g.cost <= 0 || isGlimmerUnlocked(id)) return;
    if (meta.embers < g.cost) return;
    meta.embers -= g.cost;
    meta["unlock_" + id] = 1;
    saveMeta();
    SFX.gold();
    selectedGlimmer = id;
    store.set("firefly-glimmer", selectedGlimmer);
    renderGlimmerPick();
    refreshMetaUi();
  }

  function selectGlimmer(id) {
    if (!isGlimmerUnlocked(id)) {
      // try buy if enough embers
      const g = glimmerById(id);
      if (g.cost > 0 && meta.embers >= g.cost) buyGlimmer(id);
      else renderGlimmerPick();
      return;
    }
    selectedGlimmer = id;
    store.set("firefly-glimmer", selectedGlimmer);
    if (glimmerRow) glimmerRow._selectedId = selectedGlimmer;
    renderGlimmerPick();
    SFX.pick();
  }

  function setGameMode(mode) {
    gameMode = mode === "sprint" ? "sprint" : "normal";
    store.set("firefly-mode", gameMode);
    if (modeNormalBtn) modeNormalBtn.classList.toggle("active", gameMode === "normal");
    if (modeSprintBtn) modeSprintBtn.classList.toggle("active", gameMode === "sprint");
    if (modeDetail) {
      modeDetail.textContent =
        gameMode === "sprint"
          ? "约 3 分钟一局：经验更快、Boss 更早，适合抖音短局。"
          : "完整肉鸽节奏，适合长局挑战。";
    }
  }
  if (modeNormalBtn) modeNormalBtn.addEventListener("click", () => setGameMode("normal"));
  if (modeSprintBtn) modeSprintBtn.addEventListener("click", () => setGameMode("sprint"));
  setGameMode(gameMode);

  function applyGlimmerToRun() {
    const g = glimmerById(selectedGlimmer);
    player.glimmer = g.id;
    g.apply();
  }

  function renderGlimmerPick() {
    if (!glimmerRow) return;
    glimmerRow._selectedId = selectedGlimmer;
    glimmerRow.innerHTML = "";
    for (const g of GLIMMERS) {
      const unlocked = isGlimmerUnlocked(g.id);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "glimmer-btn" +
        (g.id === selectedGlimmer ? " active" : "") +
        (unlocked ? "" : " locked");
      btn._name = g.name;
      btn._id = g.id;
      btn._unlocked = unlocked;
      btn._desc = g.passive;
      const c = document.createElement("canvas");
      c.width = 72;
      c.height = 72;
      try {
        drawGlimmerIcon(c, g, unlocked);
      } catch (_) {}
      try {
        btn.appendChild(c);
        const name = document.createElement("div");
        name.className = "g-name";
        name.textContent = g.name;
        btn.appendChild(name);
        if (!unlocked) {
          const lock = document.createElement("div");
          lock.className = "g-lock";
          lock.textContent = g.cost + " 余烬";
          btn.appendChild(lock);
        }
      } catch (_) {}
      btn.addEventListener("click", () => selectGlimmer(g.id));
      btn.addEventListener("mouseenter", () => showGlimmerDetail(g));
      glimmerRow.appendChild(btn);
    }
    showGlimmerDetail(glimmerById(selectedGlimmer));
  }

  function showGlimmerDetail(g) {
    if (!glimmerDetail) return;
    const unlocked = isGlimmerUnlocked(g.id);
    glimmerDetail.innerHTML =
      "<strong>" +
      g.name +
      "</strong> — " +
      g.desc +
      "<br><span class='passive'>" +
      g.passive +
      "</span>" +
      (unlocked ? "" : "<br>解锁需要 " + g.cost + " 余烬（可点击购买）");
  }

  function drawGlimmerIcon(canvasEl, g, unlocked) {
    const c = canvasEl.getContext("2d");
    const w = canvasEl.width;
    const h = canvasEl.height;
    c.clearRect(0, 0, w, h);
    c.globalAlpha = unlocked ? 1 : 0.35;
    // glow
    const rg = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w * 0.42);
    rg.addColorStop(0, hexAlpha(g.color, 0.55));
    rg.addColorStop(1, hexAlpha(g.color2, 0));
    c.fillStyle = rg;
    c.beginPath();
    c.arc(w / 2, h / 2, w * 0.42, 0, TAU);
    c.fill();
    drawGlimmerShape(c, w / 2, h / 2, 14, g, 0);
    c.globalAlpha = 1;
  }

  // Roguelike upgrade pool
  const UPGRADE_POOL = [
    {
      id: "speed",
      name: "轻翼",
      icon: "翅",
      desc: "移动速度 +12%",
      max: 5,
      weight: 1.2,
      apply() {
        stats.speedMul *= 1.12;
      },
    },
    {
      id: "magnet",
      name: "磁蕊",
      icon: "吸",
      desc: "光尘磁吸范围 +20%",
      max: 5,
      weight: 1.2,
      apply() {
        stats.magnet *= 1.2;
      },
    },
    {
      id: "flareRange",
      name: "光爆",
      icon: "闪",
      desc: "闪耀范围 +22%",
      max: 3,
      weight: 1,
      apply() {
        stats.flareRange *= 1.22;
      },
    },
    {
      id: "flareCd",
      name: "疾闪",
      icon: "瞬",
      desc: "闪耀冷却 -15%",
      max: 3,
      weight: 1,
      apply() {
        stats.flareCdMul *= 0.85;
      },
    },
    {
      id: "glowKeep",
      name: "持光",
      icon: "守",
      desc: "辉光衰减 -25%",
      max: 3,
      weight: 1,
      apply() {
        stats.glowKeep *= 0.75;
      },
    },
    {
      id: "hp",
      name: "萤甲",
      icon: "甲",
      desc: "体力上限 +1，并回复 1",
      max: 3,
      weight: 0.95,
      apply() {
        player.maxHp += 1;
        player.hp = Math.min(player.maxHp, player.hp + 1);
      },
    },
    {
      id: "xpGain",
      name: "拾慧",
      icon: "慧",
      desc: "获得经验 +20%",
      max: 3,
      weight: 1.05,
      apply() {
        stats.xpGain *= 1.2;
      },
    },
    {
      id: "moteVal",
      name: "尘华",
      icon: "尘",
      desc: "光尘得分 +25%",
      max: 3,
      weight: 1,
      apply() {
        stats.moteVal *= 1.25;
      },
    },
    {
      id: "bloomVal",
      name: "花祭",
      icon: "花",
      desc: "绽放奖励 +40%",
      max: 2,
      weight: 0.9,
      apply() {
        stats.bloomVal *= 1.4;
      },
    },
    {
      id: "trail",
      name: "烬尾",
      icon: "尾",
      desc: "尾迹可击退近身暗影",
      max: 1,
      unique: true,
      weight: 0.85,
      apply() {
        stats.trailRepel = 1;
      },
    },
    {
      id: "comboKeep",
      name: "续焰",
      icon: "焰",
      desc: "连击持续时间 +50%",
      max: 2,
      weight: 0.95,
      apply() {
        stats.comboKeep *= 1.5;
      },
    },
    {
      id: "invuln",
      name: "夜庇",
      icon: "庇",
      desc: "受击无敌 +0.35s",
      max: 2,
      weight: 0.9,
      apply() {
        stats.invulnBonus += 0.35;
      },
    },
    {
      id: "xpHold",
      name: "凝光",
      icon: "凝",
      desc: "闲置经验衰减 -40%",
      max: 2,
      weight: 0.9,
      apply() {
        stats.xpDecayMul *= 0.6;
      },
    },
    {
      id: "collectR",
      name: "近拾",
      icon: "拾",
      desc: "拾取判定半径 +5",
      max: 2,
      weight: 1,
      apply() {
        stats.collectBonus += 5;
      },
    },
    {
      id: "pullScore",
      name: "共鸣",
      icon: "鸣",
      desc: "得分的 3% 转化为经验",
      max: 1,
      unique: true,
      rare: true,
      weight: 0.55,
      apply() {
        stats.scoreToXp += 0.03;
      },
    },
    {
      id: "bloomHeal",
      name: "回春",
      icon: "春",
      desc: "绽放时 50% 几率回复 1 体力",
      max: 1,
      unique: true,
      rare: true,
      weight: 0.5,
      apply() {
        stats.bloomHeal = 1;
      },
    },
    {
      id: "flareStun",
      name: "慑光",
      icon: "慑",
      desc: "闪耀命中的暗影更久失去警觉",
      max: 1,
      unique: true,
      rare: true,
      weight: 0.55,
      apply() {
        stats.flareStun = 1;
      },
    },
    {
      id: "dash",
      name: "瞬影",
      icon: "影",
      desc: "解锁冲刺（Shift），冷却 -20%",
      max: 3,
      weight: 0.75,
      apply() {
        stats.dashCdMul *= 0.8;
        if (!player.hasDash) {
          player.hasDash = 1;
          floatText(player.x, player.y - 36, "获得冲刺 · Shift", "#a78bfa");
        }
      },
    },
    {
      id: "bossDmg",
      name: "猎影",
      icon: "猎",
      desc: "对精英/Boss 伤害 +1",
      max: 3,
      weight: 0.85,
      apply() {
        stats.bossDmg += 1;
      },
    },
    {
      id: "starPath",
      name: "星轨",
      icon: "星",
      desc: "全部得分 +15%",
      max: 3,
      weight: 0.9,
      apply() {
        stats.scoreMul *= 1.15;
      },
    },
    {
      id: "chain",
      name: "连锁",
      icon: "连",
      desc: "短时间连续拾取会额外加分",
      max: 2,
      weight: 0.9,
      apply() {
        stats.chainBonus += 1;
      },
    },
    {
      id: "softLanding",
      name: "落羽",
      icon: "羽",
      desc: "受击后 2 秒内经验不再流失",
      max: 1,
      unique: true,
      weight: 0.7,
      apply() {
        stats.holdXpOnHit = 1;
      },
    },
    {
      id: "pulsePow",
      name: "脉冲",
      icon: "脉",
      desc: "光脉范围与推力 +25%",
      max: 3,
      weight: 0.95,
      apply() {
        stats.pulsePower *= 1.25;
      },
    },
    {
      id: "pulseCharge",
      name: "蓄辉",
      icon: "蓄",
      desc: "光脉充能速度 +25%",
      max: 3,
      weight: 1,
      apply() {
        stats.pulseCharge *= 1.25;
      },
    },
    {
      id: "calm",
      name: "余韵",
      icon: "韵",
      desc: "Boss 击杀后休整更久、更安全",
      max: 2,
      weight: 0.75,
      apply() {
        stats.calmMul *= 1.35;
      },
    },
  ];

  // ── State ────────────────────────────────────────────
  let W = 0;
  let H = 0;
  let DPR = 1;
  let worldW = 0;
  let worldH = 0;
  let state = "title"; // title | playing | choosing | paused | dead
  let lastTs = 0;
  let elapsed = 0;
  let shake = 0;
  let flash = 0;
  let hitStop = 0;
  let toastTimer = 0;
  let pendingLevelUps = 0;
  let currentChoices = [];
  let lastCollectAt = -999;
  // prevents Space-mash (flare) from instantly restarting after death
  let deathLock = 0;

  const cam = { x: 0, y: 0 };
  const keys = Object.create(null);
  const pointer = { x: 0, y: 0, down: false, active: false, wx: 0, wy: 0 };
  // 全屏拖拽摇杆：从按下点起算，半屏为满幅，拉远也不会丢控制
  const mouseDrag = {
    on: false,
    id: -1,
    ox: 0,
    oy: 0,
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
  };

  const stats = {
    magnet: 1,
    flareRange: 1,
    glowKeep: 1,
    flareCdMul: 1,
    speedMul: 1,
    trailRepel: 0,
    xpGain: 1,
    moteVal: 1,
    bloomVal: 1,
    comboKeep: 1,
    invulnBonus: 0,
    xpDecayMul: 1,
    collectBonus: 0,
    scoreToXp: 0,
    bloomHeal: 0,
    flareStun: 0,
    dashCdMul: 1,
    bossDmg: 0,
    scoreMul: 1,
    chainBonus: 0,
    holdXpOnHit: 0,
    pulsePower: 1,
    pulseCharge: 1,
    calmMul: 1,
  };

  const player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    r: 10,
    glow: 0.42,
    glowPulse: 0,
    flareCd: 0,
    flareActive: 0,
    invuln: 0,
    hp: 3,
    maxHp: 3,
    facing: 1,
    level: 1,
    xp: 0,
    xpNeed: 8,
    levelFlash: 0,
    dashCd: 0,
    dashActive: 0,
    hasDash: 0,
    glimmer: "spark",
    pulse: 0, // 0..1 light-pulse charge
  };

  const upgradeCounts = Object.create(null);
  const motes = [];
  const flowers = [];
  const wisps = [];
  const particles = [];
  const floatTexts = [];
  const grassBlades = [];
  const stars = [];
  const bgHills = [];
  const bgTrees = [];
  const fogBands = [];
  const ambientDust = [];

  let score = 0;
  let combo = 1;
  let comboTimer = 0;
  let blooms = 0;
  let collected = 0;
  let goldCollected = 0;
  let elitesKilled = 0;
  let bossesKilled = 0;
  let runTime = 0;
  let nextEliteAt = 5;
  let nextBossAt = 10;
  let nextMilestone = 500;
  let chainCount = 0;
  let chainTimer = 0;
  let hitHoldTimer = 0;
  let calmTimer = 0;
  let fieldTimer = 28;
  // rare flower-field event zone
  const flowerField = {
    active: false,
    x: 0,
    y: 0,
    r: 0,
    life: 0,
    maxLife: 0,
    seed: 0,
  };
  let best = Number(store.get("firefly-best", 0) || 0);
  let bestLevel = Number(store.get("firefly-best-level", 1) || 1);

  // Boss entity
  const boss = {
    active: false,
    x: 0,
    y: 0,
    r: 36,
    hp: 0,
    maxHp: 0,
    pulseT: 0,
    waveR: 0,
    waveActive: false,
    phase: 0,
    tier: 1,
    dead: false,
    enrage: 0, // 0 = P1, 1 = P2
    summonT: 0,
    // 快慢刀 rhythm
    atkState: "wait", // wait | tell | wave | recover
    atkKind: "fast", // fast | slow
    atkT: 0,
    atkTellDur: 0,
    atkQueue: [],
    atkFlash: 0,
  };

  // ── Meta progression (embers) ────────────────────────
  const META_KEY = "firefly-meta-v1";
  const META_DEFAULT = {
    embers: 0,
    hp: 0, // +1 max HP per rank, max 2
    magnet: 0, // +8% per rank, max 3
    xpGain: 0, // +8% per rank, max 3
    speed: 0, // +5% per rank, max 3
    startDash: 0, // 0/1 unlock dash at start
    startGlow: 0, // +0.08 start glow, max 2
    scoreMul: 0, // +6% per rank, max 3
    flareCd: 0, // -8% per rank, max 2
    luck: 0, // +2% gold/rare flower, max 2
  };

  let meta = loadMeta();

  function loadMeta() {
    try {
      const raw = store.getJson(META_KEY, null);
      if (!raw || typeof raw !== "object") return { ...META_DEFAULT };
      const m = { ...META_DEFAULT };
      for (const k of Object.keys(META_DEFAULT)) {
        if (typeof raw[k] === "number") m[k] = raw[k];
      }
      // preserve glimmer unlocks
      for (const k of Object.keys(raw)) {
        if (k.startsWith("unlock_") && typeof raw[k] === "number") m[k] = raw[k];
      }
      return m;
    } catch (_e) {
      return { ...META_DEFAULT };
    }
  }

  function saveMeta() {
    store.setJson(META_KEY, meta);
  }

  const META_SHOP = [
    {
      id: "hp",
      name: "萤甲残片",
      desc: "每级开局体力上限 +1",
      max: 2,
      cost: (r) => 40 + r * 35,
    },
    {
      id: "magnet",
      name: "磁蕊结晶",
      desc: "每级磁吸 +8%",
      max: 3,
      cost: (r) => 30 + r * 20,
    },
    {
      id: "xpGain",
      name: "拾慧余火",
      desc: "每级经验获取 +8%",
      max: 3,
      cost: (r) => 35 + r * 25,
    },
    {
      id: "speed",
      name: "轻翼残响",
      desc: "每级移速 +5%",
      max: 3,
      cost: (r) => 40 + r * 30,
    },
    {
      id: "startDash",
      name: "瞬影铭刻",
      desc: "开局自带冲刺（Shift）",
      max: 1,
      cost: () => 80,
    },
    {
      id: "startGlow",
      name: "初焰",
      desc: "每级开局辉光更盛",
      max: 2,
      cost: (r) => 25 + r * 20,
    },
    {
      id: "scoreMul",
      name: "星轨图",
      desc: "每级得分 +6%",
      max: 3,
      cost: (r) => 45 + r * 35,
    },
    {
      id: "flareCd",
      name: "疾闪拓本",
      desc: "每级闪耀冷却 -8%",
      max: 2,
      cost: (r) => 50 + r * 40,
    },
    {
      id: "luck",
      name: "金蕊引",
      desc: "每级金尘/神花概率 +2%",
      max: 2,
      cost: (r) => 55 + r * 40,
    },
  ];

  function metaSummaryText() {
    const parts = [];
    if (meta.hp) parts.push("体力+" + meta.hp);
    if (meta.magnet) parts.push("磁吸+" + meta.magnet * 8 + "%");
    if (meta.xpGain) parts.push("经验+" + meta.xpGain * 8 + "%");
    if (meta.speed) parts.push("移速+" + meta.speed * 5 + "%");
    if (meta.startDash) parts.push("开局冲刺");
    if (meta.startGlow) parts.push("初焰");
    if (meta.scoreMul) parts.push("得分+" + meta.scoreMul * 6 + "%");
    if (meta.flareCd) parts.push("闪耀CD-" + meta.flareCd * 8 + "%");
    if (meta.luck) parts.push("幸运+" + meta.luck);
    return parts.length ? parts.join(" · ") : "无";
  }

  function applyMetaToRun() {
    if (meta.hp) {
      player.maxHp = 3 + meta.hp;
      player.hp = player.maxHp;
    }
    if (meta.magnet) stats.magnet *= 1 + meta.magnet * 0.08;
    if (meta.xpGain) stats.xpGain *= 1 + meta.xpGain * 0.08;
    if (meta.speed) stats.speedMul *= 1 + meta.speed * 0.05;
    if (meta.scoreMul) stats.scoreMul *= 1 + meta.scoreMul * 0.06;
    if (meta.flareCd) stats.flareCdMul *= 1 - meta.flareCd * 0.08;
    if (meta.startDash) player.hasDash = 1;
    if (meta.startGlow) player.glow = clamp(0.42 + meta.startGlow * 0.08, 0.12, 1);
  }

  function computeEmbersEarned() {
    let e = 0;
    e += Math.floor(score / 120);
    e += Math.floor(player.level * 1.5);
    e += blooms * 2;
    e += elitesKilled * 3;
    e += bossesKilled * 25;
    e += goldCollected;
    // first clear bonus small
    if (player.level >= 10) e += 10;
    if (player.level >= 15) e += 15;
    return Math.max(1, Math.floor(e));
  }

  function awardEmbers() {
    const gained = computeEmbersEarned();
    meta.embers += gained;
    saveMeta();
    return gained;
  }

  function purchaseMeta(id) {
    const item = META_SHOP.find((s) => s.id === id);
    if (!item) return;
    const rank = meta[id] || 0;
    if (rank >= item.max) return;
    const cost = item.cost(rank);
    if (meta.embers < cost) return;
    meta.embers -= cost;
    meta[id] = rank + 1;
    saveMeta();
    SFX.gold();
    renderShop();
    refreshMetaUi();
  }

  function renderShop() {
    emberCountEl.textContent = String(meta.embers);
    shopGrid.innerHTML = "";
    for (const item of META_SHOP) {
      const rank = meta[item.id] || 0;
      const maxed = rank >= item.max;
      const cost = maxed ? 0 : item.cost(rank);
      const btn = document.createElement("button");
      btn.className = "shop-item";
      btn.type = "button";
      btn.disabled = maxed || meta.embers < cost;
      btn._name = item.name;
      btn._desc = item.desc;
      btn._cost = maxed ? "已满级" : "余烬 " + cost;
      try {
        btn.innerHTML =
          '<div class="s-name">' +
          item.name +
          '<span class="s-rank">' +
          rank +
          "/" +
          item.max +
          "</span></div>" +
          '<div class="s-desc">' +
          item.desc +
          "</div>" +
          '<div class="s-cost">' +
          btn._cost +
          "</div>";
      } catch (_) {}
      btn.addEventListener("click", () => purchaseMeta(item.id));
      shopGrid.appendChild(btn);
    }
  }

  function refreshMetaUi() {
    if (metaSummaryEl) metaSummaryEl.textContent = metaSummaryText();
    if (bestEmbersEl) bestEmbersEl.textContent = String(meta.embers);
  }

  function openShop() {
    renderShop();
    shopOverlay.classList.remove("hidden");
  }

  function closeShop() {
    shopOverlay.classList.add("hidden");
  }

  btnShop.addEventListener("click", () => openShop());
  btnShopClose.addEventListener("click", () => closeShop());

  // ── Tiny WebAudio SFX (procedural, no files) ─────────
  const SFX = {
    ctx: null,
    enabled: true,
    unlock() {
      if (!this.ctx) {
        try {
          this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (_e) {
          this.enabled = false;
        }
      }
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    },
    tone(freq, dur = 0.08, type = "sine", gain = 0.04, slide = 0) {
      if (!this.enabled || !this.ctx) return;
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
      g.gain.setValueAtTime(gain, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    },
    pick() {
      this.tone(880, 0.06, "sine", 0.035, 120);
    },
    gold() {
      this.tone(1040, 0.09, "triangle", 0.04, 200);
    },
    flare() {
      this.tone(220, 0.14, "sawtooth", 0.03, -80);
      this.tone(660, 0.08, "sine", 0.025, -200);
    },
    dash() {
      this.tone(420, 0.08, "square", 0.025, 300);
    },
    hurt() {
      this.tone(140, 0.18, "sawtooth", 0.045, -60);
    },
    bloom() {
      this.tone(520, 0.12, "sine", 0.035, 180);
      setTimeout(() => this.tone(780, 0.12, "sine", 0.03, 120), 70);
    },
    level() {
      this.tone(660, 0.1, "triangle", 0.04, 200);
      setTimeout(() => this.tone(990, 0.14, "triangle", 0.035, 80), 90);
    },
    boss() {
      this.tone(80, 0.35, "sawtooth", 0.05, 20);
      this.tone(120, 0.4, "square", 0.03, 0);
    },
    bossHit() {
      this.tone(180, 0.08, "square", 0.035, -40);
    },
    bossDie() {
      this.tone(100, 0.25, "sawtooth", 0.05, 200);
      setTimeout(() => this.tone(400, 0.2, "triangle", 0.04, 300), 120);
    },
    milestone() {
      this.tone(740, 0.08, "sine", 0.035, 0);
      setTimeout(() => this.tone(880, 0.1, "sine", 0.035, 0), 80);
      setTimeout(() => this.tone(1100, 0.14, "sine", 0.03, 0), 160);
    },
  };

  // unlock audio on first gesture
  const unlockAudio = () => {
    SFX.unlock();
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };
  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("keydown", unlockAudio);

  // ── Resize / world ───────────────────────────────────
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const prevW = worldW;
    const prevH = worldH;
    worldW = Math.floor(W * WORLD_SCALE);
    worldH = Math.floor(H * WORLD_SCALE);

    // keep player relative position if world resized mid-game
    if (prevW > 0 && prevH > 0 && state !== "title") {
      player.x = clamp((player.x / prevW) * worldW, 40, worldW - 40);
      player.y = clamp((player.y / prevH) * worldH, 40, worldH - 40);
    }

    // minimap backing store matches CSS size
    const mw = minimap.clientWidth || 120;
    const mh = minimap.clientHeight || 120;
    minimap.width = Math.floor(mw * DPR);
    minimap.height = Math.floor(mh * DPR);
    mctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function updatePointerWorld() {
    pointer.wx = pointer.x + cam.x;
    pointer.wy = pointer.y + cam.y;
  }

  function updateCamera(dt) {
    const tx = clamp(player.x - W * 0.5, 0, Math.max(0, worldW - W));
    const ty = clamp(player.y - H * 0.5, 0, Math.max(0, worldH - H));
    const k = 1 - Math.pow(0.00005, dt);
    cam.x = lerp(cam.x, tx, k);
    cam.y = lerp(cam.y, ty, k);
  }

  // ── Utils ────────────────────────────────────────────
  function rand(a = 0, b = 1) {
    return a + Math.random() * (b - a);
  }
  function randInt(a, b) {
    return Math.floor(rand(a, b + 1));
  }
  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function dist2(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  }
  function hexAlpha(hex, a) {
    const h = hex.replace("#", "");
    const full =
      h.length === 3
        ? h
            .split("")
            .map((c) => c + c)
            .join("")
        : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // Distinct body silhouettes for each starting glimmer
  function drawGlimmerShape(c, x, y, r, g, facing) {
    const grad = c.createRadialGradient(x - r * 0.2, y - r * 0.25, 1, x, y, r * 1.15);
    grad.addColorStop(0, "#fff6c8");
    grad.addColorStop(0.45, g.color);
    grad.addColorStop(1, g.color2);
    c.fillStyle = grad;

    switch (g.shape) {
      case "teardrop": {
        // elongated drop, tip down
        c.beginPath();
        c.moveTo(x, y - r * 1.15);
        c.bezierCurveTo(x + r * 0.95, y - r * 0.2, x + r * 0.7, y + r * 0.9, x, y + r * 1.2);
        c.bezierCurveTo(x - r * 0.7, y + r * 0.9, x - r * 0.95, y - r * 0.2, x, y - r * 1.15);
        c.closePath();
        c.fill();
        break;
      }
      case "star": {
        c.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = -Math.PI / 2 + (i / 8) * TAU;
          const rr = i % 2 === 0 ? r * 1.25 : r * 0.42;
          const px = x + Math.cos(a) * rr;
          const py = y + Math.sin(a) * rr;
          if (i === 0) c.moveTo(px, py);
          else c.lineTo(px, py);
        }
        c.closePath();
        c.fill();
        break;
      }
      case "crescent": {
        c.beginPath();
        c.arc(x, y, r * 1.08, 0, TAU);
        c.arc(x + r * 0.52, y - r * 0.12, r * 0.88, 0, TAU, true);
        c.fill("evenodd");
        break;
      }
      case "diamond": {
        c.beginPath();
        c.moveTo(x, y - r * 1.25);
        c.lineTo(x + r * 0.85, y);
        c.lineTo(x, y + r * 1.25);
        c.lineTo(x - r * 0.85, y);
        c.closePath();
        c.fill();
        break;
      }
      case "wedge": {
        // arrow / wedge pointing in facing dir
        const f = facing >= 0 ? 1 : -1;
        c.beginPath();
        c.moveTo(x + f * r * 1.3, y);
        c.lineTo(x - f * r * 0.7, y - r * 0.95);
        c.lineTo(x - f * r * 0.35, y);
        c.lineTo(x - f * r * 0.7, y + r * 0.95);
        c.closePath();
        c.fill();
        break;
      }
      default: {
        // orb
        c.beginPath();
        c.arc(x, y, r, 0, TAU);
        c.fill();
      }
    }

    // core spark
    c.fillStyle = "rgba(255,255,255,0.9)";
    c.beginPath();
    c.arc(x + (facing >= 0 ? 1 : -1) * r * 0.15, y - r * 0.1, r * 0.22, 0, TAU);
    c.fill();
  }

  function levelInfo(lv) {
    if (lv <= LEVELS.length) return LEVELS[lv - 1];
    return { lv, name: "无尽 · " + lv };
  }

  function levelStyle(lv) {
    return LEVEL_STYLES[Math.min(lv, LEVEL_STYLES.length) - 1];
  }

  function xpNeededFor(lv) {
    if (lv < XP_TABLE.length) return XP_TABLE[lv];
    // beyond table: keep rising steeply
    const last = XP_TABLE[XP_TABLE.length - 1];
    return Math.floor(last + (lv - XP_TABLE.length + 1) * 70);
  }

  function resetStats() {
    stats.magnet = 1;
    stats.flareRange = 1;
    stats.glowKeep = 1;
    stats.flareCdMul = 1;
    stats.speedMul = 1;
    stats.trailRepel = 0;
    stats.xpGain = 1;
    stats.moteVal = 1;
    stats.bloomVal = 1;
    stats.comboKeep = 1;
    stats.invulnBonus = 0;
    stats.xpDecayMul = 1;
    stats.collectBonus = 0;
    stats.scoreToXp = 0;
    stats.bloomHeal = 0;
    stats.flareStun = 0;
    stats.dashCdMul = 1;
    stats.bossDmg = 0;
    stats.scoreMul = 1;
    stats.chainBonus = 0;
    stats.holdXpOnHit = 0;
    stats.pulsePower = 1;
    stats.pulseCharge = 1;
    stats.calmMul = 1;
  }

  // ── World gen ────────────────────────────────────────
  function seedStars() {
    stars.length = 0;
    const n = Math.floor((worldW * worldH) / 22000);
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * worldW,
        y: Math.random() * worldH * 0.75,
        r: Math.random() * 1.2 + 0.3,
        tw: Math.random() * TAU,
        sp: rand(0.4, 1.6),
      });
    }
  }

  function seedGrass() {
    grassBlades.length = 0;
    const n = Math.floor(worldW / 16);
    for (let i = 0; i < n; i++) {
      grassBlades.push({
        x: Math.random() * worldW,
        h: rand(28, 90),
        lean: rand(-0.35, 0.35),
        phase: Math.random() * TAU,
        sway: rand(0.4, 1.2),
        tone: Math.random(),
      });
    }
  }

  function seedBackdrop() {
    bgHills.length = 0;
    bgTrees.length = 0;
    fogBands.length = 0;
    ambientDust.length = 0;

    // three parallax hill silhouettes across the world
    for (let layer = 0; layer < 3; layer++) {
      const pts = [];
      const step = 90 - layer * 12;
      const amp = 28 + layer * 22;
      const baseY = worldH * (0.52 + layer * 0.1);
      for (let x = -step; x <= worldW + step; x += step) {
        pts.push({
          x,
          y: baseY + Math.sin(x * 0.004 + layer * 1.7) * amp + rand(-10, 10),
        });
      }
      bgHills.push({ layer, pts, baseY, amp });
    }

    // distant tree silhouettes
    const treeN = Math.floor(worldW / 110);
    for (let i = 0; i < treeN; i++) {
      bgTrees.push({
        x: Math.random() * worldW,
        y: worldH * rand(0.5, 0.62),
        h: rand(40, 110),
        w: rand(18, 42),
        layer: Math.random() < 0.5 ? 1 : 2,
      });
    }

    // fog ribbons
    for (let i = 0; i < 6; i++) {
      fogBands.push({
        x: Math.random() * worldW,
        y: worldH * rand(0.4, 0.85),
        w: rand(180, 420),
        h: rand(18, 48),
        a: rand(0.03, 0.08),
        sp: rand(4, 14),
      });
    }

    // ambient drifting dust / tiny fireflies
    const dustN = Math.floor((worldW * worldH) / 28000);
    for (let i = 0; i < dustN; i++) {
      ambientDust.push({
        x: Math.random() * worldW,
        y: Math.random() * worldH,
        r: rand(0.8, 2.2),
        phase: Math.random() * TAU,
        sp: rand(6, 22),
        warm: Math.random() < 0.25,
      });
    }
  }

  function spawnMote(x, y, burst = false, forceGold = false) {
    // rare golden mote: more XP/score, slightly brighter
    const luck = (meta && meta.luck ? meta.luck : 0) * 0.02;
    const gold = forceGold || Math.random() < 0.08 + luck;
    motes.push({
      x: x != null ? x : rand(40, worldW - 40),
      y: y != null ? y : rand(50, worldH - 40),
      vx: burst ? rand(-80, 80) : rand(-8, 8),
      vy: burst ? rand(-80, 80) : rand(-8, 8),
      r: gold ? rand(5, 7) : rand(3, 5.5),
      phase: Math.random() * TAU,
      gold,
    });
  }

  function flowerNeed() {
    return 3 + Math.floor(player.level * 0.35);
  }

  function spawnFlower() {
    const margin = 56;
    let x = 0;
    let y = 0;
    let tries = 0;
    do {
      x = rand(margin, worldW - margin);
      y = rand(margin + 40, worldH - margin);
      tries++;
    } while (tries < 24 && dist2(x, y, player.x, player.y) < 140 * 140);

    const rare = Math.random() < 0.05 + (meta && meta.luck ? meta.luck : 0) * 0.02;
    flowers.push({
      x,
      y,
      r: rare ? rand(22, 28) : rand(16, 24),
      lit: 0,
      need: rare ? flowerNeed() + 2 : flowerNeed(),
      filled: 0,
      petals: rare ? 8 : randInt(5, 7),
      phase: Math.random() * TAU,
      pop: 0,
      dead: false,
      rare,
    });
  }

  function pickWispType() {
    const lv = player.level;
    const roll = Math.random();
    if (lv >= 9 && roll < 0.1) return "brute";
    if (lv >= 7 && roll < 0.22) return "lurker";
    if (lv >= 5 && roll < 0.38) return "splitter";
    if (lv >= 3 && roll < 0.55) return "dasher";
    return "normal";
  }

  function makeWisp(type, x, y, opts = {}) {
    const lv = player.level;
    const baseSpeed = 48 + lv * 6.5 + rand(0, 18);
    const elite = !!opts.elite;
    const config = {
      normal: { r: rand(11, 15), speed: baseSpeed },
      dasher: { r: rand(10, 13), speed: baseSpeed * 0.85 },
      splitter: { r: rand(12, 16), speed: baseSpeed * 0.9 },
      lurker: { r: rand(10, 13), speed: baseSpeed * 1.05 },
      brute: { r: rand(18, 24), speed: baseSpeed * 0.55 },
      mini: { r: rand(6, 9), speed: baseSpeed * 1.25 },
    }[type] || { r: 12, speed: baseSpeed };

    if (elite) {
      config.r *= 1.45;
      config.speed *= 0.92;
    }

    return {
      x,
      y,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      r: config.r,
      speed: config.speed,
      type,
      elite,
      dashT: rand(0.5, 1.8),
      phase: Math.random() * TAU,
      alert: elite ? 0.5 : 0,
      hitFlash: 0,
      dead: false,
      canSplit: type === "splitter" && !elite,
      hpMark: elite ? 2 : 1,
    };
  }

  function spawnWisp(forceElite = false) {
    const side = randInt(0, 3);
    let x, y;
    if (side === 0) {
      x = -40;
      y = rand(0, worldH);
    } else if (side === 1) {
      x = worldW + 40;
      y = rand(0, worldH);
    } else if (side === 2) {
      x = rand(0, worldW);
      y = -40;
    } else {
      x = rand(0, worldW);
      y = worldH + 40;
    }

    // if far from player and world is large, bias spawn toward camera edges
    const pd2 = dist2(x, y, player.x, player.y);
    if (pd2 > 900 * 900) {
      const a = Math.random() * TAU;
      const dist = Math.max(W, H) * 0.55 + rand(40, 160);
      x = clamp(player.x + Math.cos(a) * dist, -60, worldW + 60);
      y = clamp(player.y + Math.sin(a) * dist, -60, worldH + 60);
    }

    const type = forceElite ? pickWispType() : pickWispType();
    const w = makeWisp(type, x, y, { elite: forceElite });
    if (forceElite) {
      floatText(x, y - 20, "精英暗影", "#ff8a9a");
      spawnParticles(x, y, "#ff6b7a", 16, 140, 0.5);
    }
    wisps.push(w);
  }

  // ── Boss ─────────────────────────────────────────────
  function spawnBoss() {
    if (boss.active) return;
    const tier = Math.floor(player.level / 10);
    boss.tier = Math.max(1, tier);
    boss.active = true;
    boss.dead = false;
    boss.maxHp = 8 + boss.tier * 5 + Math.floor(player.level * 0.4);
    boss.hp = boss.maxHp;
    boss.r = 34 + boss.tier * 4;
    boss.phase = 0;
    boss.pulseT = 2.2;
    boss.waveActive = false;
    boss.waveR = 0;
    boss.enrage = 0;
    boss.summonT = 6;
    // idle beat before first 快慢刀 sequence
    boss.atkState = "wait";
    boss.atkKind = "fast";
    boss.atkT = 1.4;
    boss.atkTellDur = 0;
    boss.atkQueue = [];
    boss.atkFlash = 0;
    boss._opened = 0;
    boss.waveActive = false;
    boss.waveR = 0;
    // spawn off toward a random edge near player
    const a = Math.random() * TAU;
    const dist = Math.max(W, H) * 0.55;
    boss.x = clamp(player.x + Math.cos(a) * dist, 80, worldW - 80);
    boss.y = clamp(player.y + Math.sin(a) * dist, 80, worldH - 80);

    bossBar.classList.remove("hidden");
    bossName.textContent = "暗影君王 · " + boss.tier + " 阶";
    bossFill.style.width = "100%";
    SFX.boss();
    flash = Math.max(flash, 0.45);
    shake = Math.max(shake, 10);
    floatText(boss.x, boss.y - 40, "暗影君王降临", "#ff4d6d");
    spawnParticles(boss.x, boss.y, "#ff4d6d", 40, 220, 0.8);
  }

  function killBoss() {
    if (!boss.active || boss.dead) return;
    boss.dead = true;
    boss.active = false;
    bossesKilled++;
    bossBar.classList.add("hidden");
    const reward = 80 + boss.tier * 40;
    addScore(reward);
    gainXp(12 + boss.tier * 4, boss.x, boss.y);
    player.hp = Math.min(player.maxHp, player.hp + 1);
    player.glow = clamp(player.glow + 0.35, 0.12, 1);
    pendingLevelUps += 1;
    // clear nearby small wisps
    for (let i = wisps.length - 1; i >= 0; i--) {
      const w = wisps[i];
      if (dist2(w.x, w.y, boss.x, boss.y) < 280 * 280) {
        spawnParticles(w.x, w.y, "#ffe08a", 8, 120, 0.4);
        wisps.splice(i, 1);
      }
    }
    spawnParticles(boss.x, boss.y, "#ffe08a", 60, 260, 0.9);
    spawnParticles(boss.x, boss.y, "#ffffff", 30, 200, 0.5);
    floatText(boss.x, boss.y - 30, "君王溃散 · +" + reward, "#ffe08a");
    flash = Math.max(flash, 0.8);
    shake = Math.max(shake, 14);
    hitStop = 0.1;
    SFX.bossDie();
    // breathing room after boss
    calmTimer = (4 + boss.tier * 0.8) * stats.calmMul;
    floatText(player.x, player.y - 40, "休整片刻", "#7dffc3");
    if (state === "playing") openChoice();
  }

  function updateBoss(dt) {
    if (!boss.active || boss.dead) return;
    boss.phase += dt;

    // phase transition at 50%
    if (!boss.enrage && boss.hp <= boss.maxHp * 0.5) {
      boss.enrage = 1;
      flash = Math.max(flash, 0.7);
      shake = Math.max(shake, 12);
      SFX.boss();
      floatText(boss.x, boss.y - boss.r - 16, "君王狂暴！", "#ff4d6d");
      spawnParticles(boss.x, boss.y, "#ff4d6d", 50, 240, 0.8);
      bossName.textContent = "暗影君王 · " + boss.tier + " 阶 · 狂暴";
      // summon minions
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * TAU;
        const mini = makeWisp("mini", boss.x + Math.cos(a) * 40, boss.y + Math.sin(a) * 40, {
          vx: Math.cos(a) * 140,
          vy: Math.sin(a) * 140,
        });
        mini.alert = 0.8;
        mini.elite = false;
        wisps.push(mini);
      }
    }

    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const d = Math.hypot(dx, dy) || 1;
    const spdMul = boss.enrage ? 1.45 : 1;

    // slow chase
    const sp = (42 + boss.tier * 6) * spdMul;
    boss.x += (dx / d) * sp * dt;
    boss.y += (dy / d) * sp * dt;
    boss.x = clamp(boss.x, 40, worldW - 40);
    boss.y = clamp(boss.y, 40, worldH - 40);

    boss.atkFlash = Math.max(0, boss.atkFlash - dt * 4);

    // ── 快慢刀: wait → tell(fast|slow) → wave → recover ──
    // higher tier / level / enrage = denser rhythm, longer combos
    const density = boss.tier + Math.floor(player.level / 8) + (boss.enrage ? 1.5 : 0);

    if (boss.atkState === "wait") {
      boss.atkT -= dt;
      if (boss.atkT <= 0) {
        // build a short combo of fast/slow blades
        if (!boss._opened) {
          // opener is always a quick blade so the rhythm is readable
          boss._opened = 1;
          boss.atkQueue = [];
          boss.atkKind = "fast";
          boss.atkState = "tell";
          boss.atkTellDur = Math.max(0.22, 0.38 - density * 0.03);
          boss.atkT = boss.atkTellDur;
          boss.atkFlash = 1;
          boss.x -= (dx / d) * 8;
          boss.y -= (dy / d) * 8;
        } else {
          const len = density >= 4 ? randInt(2, 3) : density >= 2.5 ? randInt(1, 2) : 1;
          boss.atkQueue = [];
          let last = null;
          for (let i = 0; i < len; i++) {
            // avoid same kind thrice; bias slow more at higher density
            let kind = Math.random() < 0.45 + density * 0.04 ? "slow" : "fast";
            if (kind === last && Math.random() < 0.55) kind = kind === "fast" ? "slow" : "fast";
            boss.atkQueue.push(kind);
            last = kind;
          }
          const kind = boss.atkQueue.shift();
          boss.atkKind = kind;
          boss.atkState = "tell";
          boss.atkTellDur =
            kind === "fast"
              ? Math.max(0.22, 0.38 - density * 0.03)
              : Math.max(0.55, 0.95 - density * 0.04);
          boss.atkT = boss.atkTellDur;
          boss.atkFlash = 1;
          boss.x -= (dx / d) * 8;
          boss.y -= (dy / d) * 8;
        }
      }
    } else if (boss.atkState === "tell") {
      boss.atkT -= dt;
      if (boss.atkT <= 0) {
        // release blade wave
        boss.atkState = "wave";
        boss.waveActive = true;
        boss.waveR = boss.r * 0.6;
        boss.atkFlash = 1;
        SFX.bossHit();
        // slow blade: deceptive long tell then a faster wider ring
        boss._waveSpeed = boss.atkKind === "fast" ? 260 + density * 12 : 340 + density * 16;
        boss._waveBand = boss.atkKind === "fast" ? 14 : 20;
        boss._waveMax = boss.atkKind === "fast" ? 300 : 360;
      }
    } else if (boss.atkState === "wave") {
      if (boss.waveActive) {
        boss.waveR += boss._waveSpeed * dt;
        if (Math.abs(d - boss.waveR) < boss._waveBand + player.r && player.invuln <= 0) {
          hurtPlayer({ x: boss.x, y: boss.y, vx: 0, vy: 0, alert: 0, type: "brute", elite: true });
          boss.waveActive = false;
        }
        if (boss.waveR > boss._waveMax) boss.waveActive = false;
      } else {
        // recover then next in combo or wait
        if (boss.atkQueue.length > 0) {
          const kind = boss.atkQueue.shift();
          boss.atkKind = kind;
          boss.atkState = "tell";
          boss.atkTellDur =
            kind === "fast"
              ? Math.max(0.18, 0.32 - density * 0.025)
              : Math.max(0.5, 0.85 - density * 0.035);
          boss.atkT = boss.atkTellDur;
          boss.atkFlash = 0.8;
        } else {
          boss.atkState = "recover";
          boss.atkT = Math.max(0.35, 0.7 - density * 0.05) + Math.random() * 0.25;
        }
      }
    } else if (boss.atkState === "recover") {
      boss.atkT -= dt;
      if (boss.atkT <= 0) {
        boss.atkState = "wait";
        // gap between sequences — shorter when higher level / enrage
        boss.atkT = Math.max(0.55, 2.0 - density * 0.22) * rand(0.85, 1.15);
      }
    }

    // enrage: periodic summons
    if (boss.enrage) {
      boss.summonT -= dt;
      if (boss.summonT <= 0) {
        boss.summonT = 7;
        if (wisps.length < 14) {
          const a = Math.random() * TAU;
          const w = makeWisp(pickWispType(), boss.x + Math.cos(a) * 50, boss.y + Math.sin(a) * 50);
          w.alert = 0.7;
          wisps.push(w);
        }
      }
    }

    // contact damage
    if (player.invuln <= 0 && d < boss.r + player.r) {
      hurtPlayer({ x: boss.x, y: boss.y, vx: 0, vy: 0, alert: 1, type: "brute", elite: true });
    }

    bossFill.style.width = Math.max(0, (boss.hp / boss.maxHp) * 100) + "%";
  }

  function spawnParticles(x, y, color, n = 8, speed = 120, life = 0.5) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = speed * rand(0.3, 1);
      particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        r: rand(1.5, 3.5),
        life: 1,
        decay: 1 / life,
        color,
      });
    }
  }

  function floatText(x, y, text, color = "#f0d48a") {
    floatTexts.push({ x, y, text, color, life: 1, vy: -36 });
  }

  function markCollect() {
    lastCollectAt = elapsed;
  }

  function addPulse(n) {
    if (n <= 0) return;
    player.pulse = clamp(player.pulse + n * stats.pulseCharge, 0, 1);
  }

  function tryPulse() {
    if (state !== "playing" || player.pulse < 1) return;
    player.pulse = 0;
    const st = levelStyle(player.level);
    const range = 200 * stats.pulsePower;
    flash = Math.max(flash, 0.55);
    shake = Math.max(shake, 7);
    SFX.flare();
    spawnParticles(player.x, player.y, st.trail, 36, 220, 0.55);
    spawnParticles(player.x, player.y, "#ffffff", 16, 180, 0.35);
    floatText(player.x, player.y - 28, "光脉", "#c4a1ff");

    // pull motes hard
    for (const m of motes) {
      const d2 = dist2(m.x, m.y, player.x, player.y);
      if (d2 < range * range) {
        const d = Math.sqrt(d2) || 1;
        const pull = 900 * (1 - d / range) + 120;
        m.vx += ((player.x - m.x) / d) * pull;
        m.vy += ((player.y - m.y) / d) * pull;
      }
    }

    // push / stun wisps
    for (const w of wisps) {
      if (w.dead) continue;
      const d2 = dist2(w.x, w.y, player.x, player.y);
      if (d2 < range * range) {
        const d = Math.sqrt(d2) || 1;
        let force = (1 - d / range) * 520 * stats.pulsePower;
        if (w.type === "brute") force *= 0.4;
        w.vx += ((w.x - player.x) / d) * force;
        w.vy += ((w.y - player.y) / d) * force;
        w.alert = Math.max(0, w.alert - 0.6);
        w.hitFlash = 1;
        if (w.elite) {
          w.hpMark -= 1;
          if (w.hpMark <= 0) {
            w.dead = true;
            elitesKilled++;
            spawnParticles(w.x, w.y, "#ffe08a", 16, 140, 0.5);
          }
        }
      }
    }
    for (let i = wisps.length - 1; i >= 0; i--) if (wisps[i].dead) wisps.splice(i, 1);

    // boss chip
    if (boss.active && !boss.dead) {
      const bd2 = dist2(boss.x, boss.y, player.x, player.y);
      if (bd2 < (range + boss.r) * (range + boss.r)) {
        const dmg = 1 + Math.floor(stats.bossDmg * 0.5);
        boss.hp -= dmg;
        SFX.bossHit();
        floatText(boss.x, boss.y - boss.r - 10, "-" + dmg, "#ffb0c0");
        if (boss.hp <= 0) killBoss();
      }
    }

    markCollect();
    updateHud();
  }

  // ── Flower field event ───────────────────────────────
  function spawnFlowerField() {
    const margin = 160;
    flowerField.x = rand(margin, worldW - margin);
    flowerField.y = rand(margin + 40, worldH - margin);
    // keep away from player start cluster a bit
    if (dist2(flowerField.x, flowerField.y, player.x, player.y) < 120 * 120) {
      flowerField.x = clamp(flowerField.x + 200, margin, worldW - margin);
    }
    flowerField.r = rand(150, 220);
    flowerField.maxLife = 28 + rand(0, 10);
    flowerField.life = flowerField.maxLife;
    flowerField.active = true;
    flowerField.seed = Math.random();

    // seed dense motes + flowers inside
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * TAU;
      const rr = Math.sqrt(Math.random()) * flowerField.r * 0.85;
      spawnMote(
        flowerField.x + Math.cos(a) * rr,
        flowerField.y + Math.sin(a) * rr,
        false,
        Math.random() < 0.2
      );
    }
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * TAU;
      const rr = Math.sqrt(Math.random()) * flowerField.r * 0.7;
      // temporarily place flower near field by spawning then relocating last
      spawnFlower();
      const f = flowers[flowers.length - 1];
      if (f) {
        f.x = clamp(flowerField.x + Math.cos(a) * rr, 50, worldW - 50);
        f.y = clamp(flowerField.y + Math.sin(a) * rr, 50, worldH - 50);
      }
    }

    floatText(flowerField.x, flowerField.y - flowerField.r * 0.6, "花田显现", "#ffd6ea");
    SFX.milestone();
  }

  function updateFlowerField(dt) {
    fieldTimer -= dt;
    if (!flowerField.active && fieldTimer <= 0) {
      spawnFlowerField();
      fieldTimer = 55 + rand(0, 25);
    }
    if (flowerField.active) {
      flowerField.life -= dt;
      // ambient spawn inside
      if (Math.random() < dt * 1.2 && motes.length < 60) {
        const a = Math.random() * TAU;
        const rr = Math.sqrt(Math.random()) * flowerField.r;
        spawnMote(flowerField.x + Math.cos(a) * rr, flowerField.y + Math.sin(a) * rr, false, Math.random() < 0.15);
      }
      // bonus XP while inside
      const d2 = dist2(player.x, player.y, flowerField.x, flowerField.y);
      if (d2 < flowerField.r * flowerField.r && Math.random() < dt * 0.8) {
        addPulse(0.02);
      }
      if (flowerField.life <= 0) {
        flowerField.active = false;
        floatText(flowerField.x, flowerField.y, "花田散去", "#9a968a");
      }
    }
  }

  function addScore(n, alsoXpFromScore = true) {
    let gain = Math.round(n * stats.scoreMul);
    if (gain <= 0) return 0;
    // chain bonus: consecutive mote picks within 0.55s
    if (stats.chainBonus > 0 && chainTimer > 0 && chainCount >= 3) {
      gain += Math.round(gain * 0.08 * stats.chainBonus * Math.min(chainCount, 8));
    }
    score += gain;
    if (alsoXpFromScore && stats.scoreToXp > 0) {
      const bonus = gain * stats.scoreToXp;
      if (bonus >= 0.5) player.xp += bonus * stats.xpGain;
    }
    // milestones → free draft
    if (score >= nextMilestone) {
      const reached = nextMilestone;
      nextMilestone = Math.floor(nextMilestone * 2.2);
      pendingLevelUps += 1;
      SFX.milestone();
      floatText(player.x, player.y - 50, "里程碑 " + reached + " · 额外进阶", "#ffe08a");
      spawnParticles(player.x, player.y, "#ffe08a", 24, 180, 0.6);
      if (state === "playing") openChoice();
    }
    return gain;
  }

  // ── XP / Level / Draft ───────────────────────────────
  function gainXp(amount, srcX, srcY) {
    if (amount <= 0) return;
    markCollect();
    const scaled = amount * stats.xpGain;
    player.xp += scaled;
    if (amount >= 1) {
      floatText(
      srcX != null ? srcX : player.x,
      (srcY != null ? srcY : player.y) - 10,
      "+" + amount + " 阶",
      "#9ef0ff"
    );
    }

    while (player.xp >= player.xpNeed) {
      player.xp -= player.xpNeed;
      player.level += 1;
      player.xpNeed = xpNeededFor(player.level);
      pendingLevelUps += 1;
      SFX.level();
    }

    if (pendingLevelUps > 0 && state === "playing") {
      openChoice();
    }
    updateHud();
  }

  function openChoice() {
    if (pendingLevelUps <= 0) {
      state = "playing";
      choiceOverlay.classList.add("hidden");
      lastTs = performance.now();
      return;
    }

    state = "choosing";
    player.levelFlash = 1;
    // one-shot punch only — frame() decays it while choosing so bg stays still
    flash = Math.max(flash, 0.45);
    shake = Math.max(shake, 5);
    player.invuln = Math.max(player.invuln, 0.8);

    const info = levelInfo(player.level);
    const st = levelStyle(player.level);
    spawnParticles(player.x, player.y, st.core, 28, 200, 0.6);
    spawnParticles(player.x, player.y, st.trail, 18, 150, 0.5);

    // visual-only passive soft growth each level
    player.glow = clamp(player.glow + 0.12, 0.12, 1);

    toastTitle.textContent = "Lv." + player.level + " " + info.name;
    toastSub.textContent = "选择一道微光";
    levelToast.classList.remove("hidden");
    levelToast.style.animation = "none";
    void levelToast.offsetWidth;
    levelToast.style.animation = "";
    toastTimer = 1.4;

    if (player.level > bestLevel) {
      bestLevel = player.level;
      store.set("firefly-best-level", String(bestLevel));
    }

    currentChoices = rollChoices(3);
    renderChoices(currentChoices);
    choiceKicker.textContent =
      "进阶 · Lv." + player.level + " " + info.name + (pendingLevelUps > 1 ? " · 还剩 " + pendingLevelUps + " 次" : "");
    choiceOverlay.classList.remove("hidden");
    updateHud();
  }

  function rollChoices(n) {
    const available = UPGRADE_POOL.filter((u) => {
      const c = upgradeCounts[u.id] || 0;
      if (c >= u.max) return false;
      if (u.unique && c >= 1) return false;
      return true;
    });

    const picked = [];
    const bag = available.slice();
    while (picked.length < n && bag.length > 0) {
      // weighted pick
      let total = 0;
      for (const u of bag) total += u.weight * (u.rare ? 0.55 : 1);
      let r = Math.random() * total;
      let idx = 0;
      for (let i = 0; i < bag.length; i++) {
        r -= bag[i].weight * (bag[i].rare ? 0.55 : 1);
        if (r <= 0) {
          idx = i;
          break;
        }
      }
      picked.push(bag[idx]);
      bag.splice(idx, 1);
    }

    // fallback fillers if pool exhausted
    while (picked.length < n) {
      picked.push({
        id: "filler-" + picked.length,
        name: "微光",
        icon: "光",
        desc: "经验 +5",
        max: 99,
        weight: 1,
        apply() {
          player.xp = Math.min(player.xp + 5, player.xpNeed - 0.01);
        },
      });
    }
    return picked;
  }

  function renderChoices(list) {
    choiceCards.innerHTML = "";
    list.forEach((u, i) => {
      const btn = document.createElement("button");
      btn.className = "choice-card" + (u.rare ? " rare" : "");
      btn.type = "button";
      const owned = upgradeCounts[u.id] || 0;
      // labels for canvas mini-game UI
      btn._name = u.name;
      btn._desc = u.desc;
      btn._key = String(i + 1);
      btn._rare = !!u.rare;
      btn._cost =
        (u.rare ? "稀有" : "强化") +
        (u.max > 1 && u.max < 99 ? " · " + owned + "/" + u.max : "");
      try {
        btn.innerHTML =
          '<span class="key">' +
          (i + 1) +
          '</span><span class="icon">' +
          u.icon +
          '</span><span class="name">' +
          u.name +
          '</span><span class="desc">' +
          u.desc +
          '</span><span class="tag">' +
          btn._cost +
          "</span>";
      } catch (_) {}
      btn.addEventListener("click", () => pickChoice(i));
      choiceCards.appendChild(btn);
    });
  }

  function pickChoice(index) {
    if (state !== "choosing") return;
    const u = currentChoices[index];
    if (!u) return;

    upgradeCounts[u.id] = (upgradeCounts[u.id] || 0) + 1;
    u.apply();
    SFX.level();

    const st = levelStyle(player.level);
    spawnParticles(player.x, player.y, u.rare ? "#c4a1ff" : st.mid, 20, 160, 0.5);
    floatText(player.x, player.y - 28, u.name + "！", u.rare ? "#c4a1ff" : "#f0d48a");

    pendingLevelUps -= 1;
    choiceOverlay.classList.add("hidden");
    // never hop through "playing" between chained drafts — stay fully paused
    if (pendingLevelUps > 0) {
      openChoice();
    } else {
      state = "playing";
      shake = Math.max(0, shake);
      lastTs = performance.now();
    }

    updateBuildTags();
    updateHud();
  }

  function updateBuildTags() {
    const parts = [];
    for (const u of UPGRADE_POOL) {
      const c = upgradeCounts[u.id] || 0;
      if (c > 0) parts.push(u.name + (c > 1 ? "×" + c : ""));
    }
    buildTags.textContent = parts.length ? parts.slice(0, 4).join(" ") : "—";
  }

  // ── Game reset ───────────────────────────────────────
  function resetGame() {
    for (const k of Object.keys(upgradeCounts)) delete upgradeCounts[k];
    resetStats();

    player.x = worldW * 0.5;
    player.y = worldH * 0.55;
    player.vx = 0;
    player.vy = 0;
    player.glow = 0.42;
    player.glowPulse = 0;
    player.flareCd = 0;
    player.flareActive = 0;
    player.invuln = 0;
    player.hp = 3;
    player.maxHp = 3;
    player.facing = 1;
    player.level = 1;
    player.xp = 0;
    player.xpNeed = xpNeededFor(1);
    player.levelFlash = 0;
    player.dashCd = 0;
    player.dashActive = 0;
    player.hasDash = 0;
    player.glimmer = "spark";
    player.pulse = 0;

    applyMetaToRun();
    applyGlimmerToRun();
    // sprint tuning
    if (gameMode === "sprint") {
      stats.xpGain *= 1.35;
      stats.moteVal *= 1.15;
      nextBossAt = 5;
      nextEliteAt = 4;
      fieldTimer = 12;
    }

    cam.x = clamp(player.x - W * 0.5, 0, worldW - W);
    cam.y = clamp(player.y - H * 0.5, 0, worldH - H);

    motes.length = 0;
    flowers.length = 0;
    wisps.length = 0;
    particles.length = 0;
    floatTexts.length = 0;

    score = 0;
    combo = 1;
    comboTimer = 0;
    blooms = 0;
    collected = 0;
    goldCollected = 0;
    elitesKilled = 0;
    bossesKilled = 0;
    runTime = 0;
    nextEliteAt = 5;
    nextBossAt = 10;
    nextMilestone = 500;
    chainCount = 0;
    chainTimer = 0;
    hitHoldTimer = 0;
    calmTimer = 0;
    fieldTimer = 22 + rand(0, 12);
    flowerField.active = false;
    flowerField.life = 0;
    shake = 0;
    flash = 0;
    hitStop = 0;
    elapsed = 0;
    toastTimer = 0;
    pendingLevelUps = 0;
    currentChoices = [];
    lastCollectAt = 0;

    boss.active = false;
    boss.dead = false;
    boss.hp = 0;
    boss.maxHp = 0;
    boss.waveActive = false;
    boss.enrage = 0;
    boss.summonT = 0;
    boss.atkState = "wait";
    boss.atkQueue = [];
    boss.atkFlash = 0;
    boss._opened = 0;
    bossBar.classList.add("hidden");

    seedStars();
    seedGrass();
    seedBackdrop();

    // denser world for 2x map
    for (let i = 0; i < 36; i++) spawnMote();
    for (let i = 0; i < 8; i++) spawnFlower();
    wisps.push(makeWisp("normal", player.x + 280, player.y - 160, { vx: -20 }));

    levelToast.classList.add("hidden");
    choiceOverlay.classList.add("hidden");
    updateBuildTags();
    updateHud();
  }

  function startGame() {
    try {
      resize();
      closeShop();
      resetGame();
      state = "playing";
      overlay.classList.add("hidden");
      hud.classList.remove("hidden");
      if (minimap) minimap.classList.remove("hidden");
      pauseBadge.classList.add("hidden");
      setTouchUiVisible(true);
      lastTs = performance.now();
      updateHud();
      try {
        var drawUiFn =
          typeof __DOUYIN_DRAW_UI__ === "function"
            ? __DOUYIN_DRAW_UI__
            : typeof GameGlobal !== "undefined" && GameGlobal.__DOUYIN_DRAW_UI__
              ? GameGlobal.__DOUYIN_DRAW_UI__
              : null;
        if (drawUiFn) drawUiFn();
      } catch (_) {}
    } catch (err) {
      console.error("[startGame]", err && err.stack ? err.stack : err);
    }
  }

  function showTitle() {
    state = "title";
    titleEl.textContent = "夜萤拾光";
    subtitleEl.textContent = "拾光进阶构筑，挑战每十阶降临的暗影君王。";
    introCopy.classList.remove("hidden");
    scoreSummary.classList.add("hidden");
    btnStart.textContent = "开始夜行";
    overlay.classList.remove("hidden");
    hud.classList.add("hidden");
    minimap.classList.add("hidden");
    pauseBadge.classList.add("hidden");
    levelToast.classList.add("hidden");
    choiceOverlay.classList.add("hidden");
    closeShop();
    setTouchUiVisible(false);
    resetJoystick();
    if (glimmerPick) glimmerPick.classList.remove("hidden");
    renderGlimmerPick();
    refreshMetaUi();
  }

  function showDeath(reason) {
    state = "dead";
    deathLock = 1.2;
    boss.active = false;
    bossBar.classList.add("hidden");
    setTouchUiVisible(false);
    resetJoystick();
    const gained = awardEmbers();
    if (score > best) {
      best = score;
      store.set("firefly-best", String(best));
    }
    if (player.level > bestLevel) {
      bestLevel = player.level;
      store.set("firefly-best-level", String(bestLevel));
    }

    const info = levelInfo(player.level);
    const mins = Math.floor(runTime / 60);
    const secs = Math.floor(runTime % 60);
    titleEl.textContent = "夜色吞没了你";
    subtitleEl.textContent = "萤火暂歇，花园仍在呼吸。";
    introCopy.classList.add("hidden");
    if (glimmerPick) glimmerPick.classList.add("hidden");
    scoreSummary.classList.remove("hidden");
    finalScoreEl.textContent = String(score);
    finalLevelEl.textContent = "Lv." + player.level + " " + info.name;
    finalBloomsEl.textContent = String(blooms);

    const parts = [];
    for (const u of UPGRADE_POOL) {
      const c = upgradeCounts[u.id] || 0;
      if (c > 0) parts.push(u.name + (c > 1 ? "×" + c : ""));
    }
    finalBuildEl.textContent = parts.length ? "构筑：" + parts.join(" · ") : "构筑：（空手）";

    if (emberGainEl) emberGainEl.textContent = "获得余烬 +" + gained;
    bestScoreEl.textContent = String(best);
    bestLevelEl.textContent = "Lv." + bestLevel;
    if (bestEmbersEl) bestEmbersEl.textContent = String(meta.embers);
    deathReasonEl.textContent =
      reason +
      " · " +
      mins +
      "分" +
      String(secs).padStart(2, "0") +
      "秒 · 金尘 " +
      goldCollected +
      " · 精英 " +
      elitesKilled +
      " · Boss " +
      bossesKilled +
      (deathLock > 0 ? " · 稍候可按 Enter 再来" : " · 按 Enter 再来一局");
    btnStart.textContent = "再飞一次";
    overlay.classList.remove("hidden");
    choiceOverlay.classList.add("hidden");
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      shake = Math.max(0, shake * 0.25);
      const parts = [];
      for (const u of UPGRADE_POOL) {
        const c = upgradeCounts[u.id] || 0;
        if (c > 0) parts.push(u.name + (c > 1 ? "×" + c : ""));
      }
      pauseBadge.innerHTML =
        "已暂停 · 按 P 继续<br><span class='pause-build'>" +
        (parts.length ? parts.join(" · ") : "尚无构筑") +
        "</span>";
      pauseBadge.classList.remove("hidden");
    } else if (state === "paused") {
      state = "playing";
      pauseBadge.classList.add("hidden");
      lastTs = performance.now();
    }
  }

  // ── HUD ──────────────────────────────────────────────
  function updateHud() {
    scoreEl.textContent = String(score);
    comboEl.textContent = combo >= 1.1 ? "x" + Math.floor(combo * 10) / 10 : "x1";
    glowBar.style.width = Math.round(player.glow * 100) + "%";
    if (pulseBar) {
      pulseBar.style.width = Math.round(player.pulse * 100) + "%";
      pulseBar.classList.toggle("ready", player.pulse >= 1);
    }
    if (dangerFlash) {
      dangerFlash.classList.toggle("on", state === "playing" && player.hp === 1 && player.maxHp > 1);
    }

    const info = levelInfo(player.level);
    levelLabel.textContent = info.name + " · Lv." + player.level;
    const xpPct = clamp(player.xp / player.xpNeed, 0, 1);
    xpBar.style.width = Math.round(xpPct * 100) + "%";

    const idle = elapsed - lastCollectAt;
    const decaying = idle > 2.5 && player.xp > 0 && state === "playing";
    xpWrap.classList.toggle("decaying", decaying);
    if (decaying) {
      const left = Math.max(0, 3 - (idle - 2.5));
      xpText.textContent = Math.floor(player.xp) + " / " + player.xpNeed + " · 流失中";
    } else {
      xpText.textContent = Math.floor(player.xp) + " / " + player.xpNeed;
    }

    const nightPct = Math.min(100, Math.floor((elapsed / 150) * 100));
    const glName = glimmerById(player.glimmer || "spark").name;
    let extra = "";
    if (gameMode === "sprint") {
      const left = Math.max(0, SPRINT_TIME - runTime);
      const m = Math.floor(left / 60);
      const s = Math.floor(left % 60);
      extra = " · 极速 " + m + ":" + String(s).padStart(2, "0");
    } else if (calmTimer > 0) extra = " · 休整";
    else if (flowerField.active) extra = " · 花田";
    nightLabel.textContent =
      "夜深 " + nightPct + "% · " + glName + " · 园 " + WORLD_SCALE + "×" + extra;

    if (heartsEl.childElementCount !== player.maxHp) {
      heartsEl.innerHTML = "";
      for (let i = 0; i < player.maxHp; i++) {
        const d = document.createElement("div");
        d.className = "heart";
        heartsEl.appendChild(d);
      }
    }
    const hearts = heartsEl.children;
    for (let i = 0; i < player.maxHp; i++) {
      hearts[i].classList.toggle("lost", i >= player.hp);
    }
  }

  // ── Input ────────────────────────────────────────────
  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;

    if (state === "choosing") {
      if (e.code === "Digit1" || e.code === "Numpad1") pickChoice(0);
      if (e.code === "Digit2" || e.code === "Numpad2") pickChoice(1);
      if (e.code === "Digit3" || e.code === "Numpad3") pickChoice(2);
      if (e.code === "Enter") pickChoice(0);
      // never let Space/Enter leak into restart while drafting
      e.preventDefault();
      return;
    }

    if (e.code === "Enter" || e.code === "Space") {
      e.preventDefault();
      if (state === "title") {
        // Space/Enter starts from title is fine
        startGame();
        return;
      }
      if (state === "dead") {
        // BUGFIX: Space is flare during play. Mashing flare after death used to
        // instantly startGame(). Require a short lock; only Enter restarts.
        if (e.code === "Enter" && deathLock <= 0) startGame();
        return;
      }
      if (e.code === "Space" && state === "playing") {
        tryFlare();
      }
    }
    if ((e.code === "ShiftLeft" || e.code === "ShiftRight") && state === "playing") {
      tryDash();
    }
    if ((e.code === "KeyE" || e.code === "KeyQ") && state === "playing") {
      tryPulse();
    }
    if (e.code === "KeyP" || e.code === "Escape") {
      if (state === "playing" || state === "paused") togglePause();
    }
  });
  window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });

  function pointerPos(e) {
    const t = e.touches ? e.touches[0] || e.changedTouches[0] : e;
    if (!t) return;
    pointer.x = t.clientX;
    pointer.y = t.clientY;
    pointer.active = true;
    updatePointerWorld();
  }

  function dragMaxRadius() {
    // 半屏为满幅：鼠标从中心拖到边缘即可满速，拉得再远也只是满速，不会丢控制
    return Math.max(120, Math.min(W, H) * 0.48);
  }

  function updateDrag(x, y) {
    mouseDrag.x = x;
    mouseDrag.y = y;
    const maxR = dragMaxRadius();
    let dx = (x - mouseDrag.ox) / maxR;
    let dy = (y - mouseDrag.oy) / maxR;
    const m = Math.hypot(dx, dy);
    if (m > 1) {
      dx /= m;
      dy /= m;
    }
    mouseDrag.dx = dx;
    mouseDrag.dy = dy;
  }

  function endDrag() {
    mouseDrag.on = false;
    mouseDrag.id = -1;
    mouseDrag.dx = 0;
    mouseDrag.dy = 0;
  }

  function isUiTarget(el) {
    return (
      el &&
      (el.closest &&
        (el.closest("#overlay") ||
          el.closest("#choice-overlay") ||
          el.closest("#shop-overlay") ||
          el.closest("#hud") ||
          el.closest("#touch-ui") ||
          el.closest("#boss-bar")))
    );
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (isUiTarget(e.target)) return;
    pointer.down = true;
    pointerPos(e);
    if (state !== "playing") return;
    // 鼠标/笔：全屏拖拽移动；不在此处放闪耀（避免误触）
    if (e.pointerType === "mouse" || e.pointerType === "pen") {
      mouseDrag.on = true;
      mouseDrag.id = e.pointerId;
      mouseDrag.ox = e.clientX;
      mouseDrag.oy = e.clientY;
      updateDrag(e.clientX, e.clientY);
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (_) {}
    } else {
      // 触屏：点画布仍可闪耀；移动靠摇杆或右侧拖拽
      if (e.clientX > W * 0.4) {
        mouseDrag.on = true;
        mouseDrag.id = e.pointerId;
        mouseDrag.ox = e.clientX;
        mouseDrag.oy = e.clientY;
        updateDrag(e.clientX, e.clientY);
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch (_) {}
      } else {
        tryFlare();
      }
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    pointerPos(e);
    if (mouseDrag.on && e.pointerId === mouseDrag.id) {
      updateDrag(e.clientX, e.clientY);
    }
  });
  window.addEventListener("pointerup", (e) => {
    pointer.down = false;
    if (mouseDrag.on && (!e || e.pointerId === mouseDrag.id || e.pointerId == null)) {
      endDrag();
    }
  });
  window.addEventListener("pointercancel", () => {
    pointer.down = false;
    endDrag();
  });
  canvas.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      pointer.down = true;
      pointerPos(e);
      if (state === "playing") tryFlare();
    },
    { passive: false }
  );
  canvas.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
      pointerPos(e);
    },
    { passive: false }
  );
  window.addEventListener("touchend", () => {
    pointer.down = false;
  });

  btnStart.addEventListener("click", () => startGame());

  // ── Touch joystick + skill buttons ───────────────────
  const joy = { active: false, pid: -1, x: 0, y: 0 };

  function setTouchUiVisible(on) {
    if (!touchUi) return;
    const show =
      on &&
      (IS_TOUCH_UI ||
        (typeof location !== "undefined" && /touch=1/.test(location.search)));
    touchUi.classList.toggle("on", !!show);
    touchUi.classList.toggle("hidden", !show);
  }

  function resetJoystick() {
    joy.active = false;
    joy.pid = -1;
    joy.x = 0;
    joy.y = 0;
    if (stickEl) stickEl.style.transform = "translate(0px, 0px)";
  }

  function joyFromEvent(e, rect) {
    const t = e.touches ? e.touches[0] : e;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // 用屏幕对角线一半做满幅，手指拖出摇杆圈仍可控
    const maxR = Math.max(rect.width * 0.5, Math.min(window.innerWidth, window.innerHeight) * 0.35);
    let dx = (t.clientX - cx) / maxR;
    let dy = (t.clientY - cy) / maxR;
    const m = Math.hypot(dx, dy);
    if (m > 1) {
      dx /= m;
      dy /= m;
    }
    joy.x = dx;
    joy.y = dy;
    if (stickEl) {
      const r = rect.width * 0.28;
      stickEl.style.transform = "translate(" + dx * r + "px, " + dy * r + "px)";
    }
  }

  if (joystickEl) {
    joystickEl.addEventListener(
      "pointerdown",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        joy.active = true;
        joy.pid = e.pointerId;
        try {
          joystickEl.setPointerCapture(e.pointerId);
        } catch (_) {}
        joyFromEvent(e, joystickEl.getBoundingClientRect());
      },
      { passive: false }
    );
    joystickEl.addEventListener(
      "pointermove",
      (e) => {
        if (!joy.active || (joy.pid !== -1 && e.pointerId !== joy.pid)) return;
        e.preventDefault();
        e.stopPropagation();
        joyFromEvent(e, joystickEl.getBoundingClientRect());
      },
      { passive: false }
    );
    const joyEnd = (e) => {
      if (joy.pid !== -1 && e && e.pointerId !== joy.pid) return;
      resetJoystick();
    };
    joystickEl.addEventListener("pointerup", joyEnd);
    joystickEl.addEventListener("pointercancel", joyEnd);
  }

  function bindSkillBtn(el, fn) {
    if (!el) return;
    el.addEventListener(
      "pointerdown",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (state === "playing") fn();
      },
      { passive: false }
    );
  }
  bindSkillBtn(btnTouchFlare, () => tryFlare());
  bindSkillBtn(btnTouchPulse, () => tryPulse());
  bindSkillBtn(btnTouchDash, () => tryDash());

  // ── Dash (Shift) ─────────────────────────────────────
  function tryDash() {
    if (!player.hasDash || player.dashCd > 0 || state !== "playing") return;
    let ax = 0;
    let ay = 0;
    if (keys["ArrowLeft"] || keys["KeyA"]) ax -= 1;
    if (keys["ArrowRight"] || keys["KeyD"]) ax += 1;
    if (keys["ArrowUp"] || keys["KeyW"]) ay -= 1;
    if (keys["ArrowDown"] || keys["KeyS"]) ay += 1;
    if (pointer.down) {
      const dx = pointer.wx - player.x;
      const dy = pointer.wy - player.y;
      const d = Math.hypot(dx, dy) || 1;
      ax += dx / d;
      ay += dy / d;
    }
    let mag = Math.hypot(ax, ay);
    if (mag < 0.1) {
      ax = player.facing;
      ay = 0;
      mag = 1;
    }
    ax /= mag;
    ay /= mag;

    player.dashCd = 2.4 * stats.dashCdMul;
    player.dashActive = 0.22;
    player.invuln = Math.max(player.invuln, 0.28);
    player.vx = ax * 780 * stats.speedMul;
    player.vy = ay * 780 * stats.speedMul;
    player.facing = ax >= 0 ? 1 : -1;
    spawnParticles(player.x, player.y, levelStyle(player.level).trail, 14, 160, 0.35);
    floatText(player.x, player.y - 18, "瞬影", "#a78bfa");
    SFX.dash();
  }

  // ── Flare ────────────────────────────────────────────
  function tryFlare() {
    if (player.flareCd > 0 || player.glow < 0.22) return;
    player.flareCd = 2.2 * stats.flareCdMul;
    player.flareActive = 0.45;
    player.glow = Math.max(0.12, player.glow - 0.18);
    flash = Math.max(flash, 0.55);
    shake = Math.max(shake, 6);
    markCollect();
    SFX.flare();

    const st = levelStyle(player.level);
    spawnParticles(player.x, player.y, "#ffffff", 22, 180, 0.45);
    spawnParticles(player.x, player.y, st.mid, 14, 140, 0.6);

    const range = 160 * stats.flareRange;

    // boss damage
    if (boss.active && !boss.dead) {
      const bd2 = dist2(boss.x, boss.y, player.x, player.y);
      if (bd2 < (range + boss.r) * (range + boss.r)) {
        const dmg = 1 + stats.bossDmg;
        boss.hp -= dmg;
        boss.phase = 0;
        SFX.bossHit();
        shake = Math.max(shake, 8);
        spawnParticles(boss.x, boss.y, "#ff4d6d", 16, 160, 0.4);
        floatText(boss.x, boss.y - boss.r - 10, "-" + dmg, "#ffb0c0");
        addScore(30);
        gainXp(2, boss.x, boss.y);
        if (boss.hp <= 0) killBoss();
      }
    }

    for (const w of wisps) {
      if (w.dead) continue;
      const d2 = dist2(w.x, w.y, player.x, player.y);
      if (d2 < range * range) {
        const d = Math.sqrt(d2) || 1;
        let force = (1 - d / range) * 420;
        if (w.type === "brute") force *= 0.35;
        w.vx += ((w.x - player.x) / d) * force;
        w.vy += ((w.y - player.y) / d) * force;
        w.alert = stats.flareStun ? 0 : Math.max(0, w.alert - 0.8);
        w.hitFlash = 1;
        const pts = w.elite ? 20 : 5;
        addScore(pts);
        gainXp(w.elite ? 3 : 1, w.x, w.y);
        spawnParticles(w.x, w.y, w.elite ? "#ffd6ea" : "#ff6b7a", w.elite ? 12 : 6, 100, 0.35);
        floatText(w.x, w.y - 12, "+" + pts, w.elite ? "#ffd6ea" : "#7dffc3");
        if (w.elite) {
          w.hpMark -= 1 + stats.bossDmg;
          if (w.hpMark <= 0) {
            w.dead = true;
            elitesKilled++;
            spawnParticles(w.x, w.y, "#ffe08a", 20, 160, 0.55);
            floatText(w.x, w.y - 24, "精英击退", "#ffe08a");
          }
        }

        if (w.canSplit && w.type === "splitter") {
          w.canSplit = false;
          for (let i = 0; i < 2; i++) {
            const a = Math.random() * TAU;
            const mini = makeWisp("mini", w.x, w.y, {
              vx: Math.cos(a) * 120,
              vy: Math.sin(a) * 120,
            });
            mini.alert = 0.4;
            wisps.push(mini);
          }
          spawnParticles(w.x, w.y, "#c4a1ff", 12, 140, 0.4);
          w.dead = true;
        }
      }
    }
    for (let i = wisps.length - 1; i >= 0; i--) {
      if (wisps[i].dead) wisps.splice(i, 1);
    }
    updateHud();
  }

  // ── Update ───────────────────────────────────────────
  function update(dt) {
    elapsed += dt;
    runTime += dt;
    if (hitStop > 0) {
      hitStop -= dt;
      return;
    }

    // sprint countdown → score attack end
    if (gameMode === "sprint" && runTime >= SPRINT_TIME) {
      showDeath("极速通关 · 时间到 · 收集 " + collected + " 粒光尘");
      return;
    }

    // input
    let ax = 0;
    let ay = 0;
    if (keys["ArrowLeft"] || keys["KeyA"]) ax -= 1;
    if (keys["ArrowRight"] || keys["KeyD"]) ax += 1;
    if (keys["ArrowUp"] || keys["KeyW"]) ay -= 1;
    if (keys["ArrowDown"] || keys["KeyS"]) ay += 1;

    // 虚拟摇杆（触屏 DOM / 全屏鼠标拖拽）
    if (joy.active) {
      ax += joy.x * 1.25;
      ay += joy.y * 1.25;
    }
    if (mouseDrag.on) {
      ax += mouseDrag.dx * 1.35;
      ay += mouseDrag.dy * 1.35;
    }

    updatePointerWorld();

    const mag = Math.hypot(ax, ay);
    if (mag > 0) {
      ax /= mag;
      ay /= mag;
      if (ax !== 0) player.facing = ax > 0 ? 1 : -1;
    }

    // faster base feel
    const accel = 1700;
    const maxSpeed = 310 * stats.speedMul;
    const drag = Math.pow(0.0008, dt);

    player.vx += ax * accel * dt;
    player.vy += ay * accel * dt;
    player.vx *= drag;
    player.vy *= drag;

    const sp = Math.hypot(player.vx, player.vy);
    if (sp > maxSpeed) {
      player.vx = (player.vx / sp) * maxSpeed;
      player.vy = (player.vy / sp) * maxSpeed;
    }

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    // world bounds (2x map)
    const pad = 24;
    if (player.x < pad) {
      player.x = pad;
      player.vx *= -0.35;
    }
    if (player.x > worldW - pad) {
      player.x = worldW - pad;
      player.vx *= -0.35;
    }
    if (player.y < pad + 30) {
      player.y = pad + 30;
      player.vy *= -0.35;
    }
    if (player.y > worldH - pad) {
      player.y = worldH - pad;
      player.vy *= -0.35;
    }

    updateCamera(dt);

    player.glowPulse += dt * (3.2 + player.level * 0.08);
    player.flareCd = Math.max(0, player.flareCd - dt);
    player.flareActive = Math.max(0, player.flareActive - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    player.levelFlash = Math.max(0, player.levelFlash - dt * 1.4);
    player.dashCd = Math.max(0, player.dashCd - dt);
    player.dashActive = Math.max(0, player.dashActive - dt);

    // elite wave every 5 levels
    if (player.level >= nextEliteAt) {
      nextEliteAt = player.level + 5;
      spawnWisp(true);
      if (player.level >= 15) spawnWisp(true);
    }

    // boss every 10 levels
    if (player.level >= nextBossAt && !boss.active) {
      nextBossAt = player.level + 10;
      spawnBoss();
    }
    updateBoss(dt);

    if (calmTimer > 0) calmTimer = Math.max(0, calmTimer - dt);
    updateFlowerField(dt);

    // chain / hold timers
    if (chainTimer > 0) {
      chainTimer -= dt;
      if (chainTimer <= 0) chainCount = 0;
    }
    if (hitHoldTimer > 0) hitHoldTimer -= dt;

    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) levelToast.classList.add("hidden");
    }

    // idle XP decay
    const idle = elapsed - lastCollectAt;
    const holdXp = stats.holdXpOnHit && hitHoldTimer > 0;
    if (idle > 2.5 && player.xp > 0 && !holdXp) {
      const rate = (0.9 + player.level * 0.18) * stats.xpDecayMul;
      player.xp = Math.max(0, player.xp - rate * dt);
    }

    // trail
    const st = levelStyle(player.level);
    if (sp > 40 && Math.random() < 0.5 + player.level * 0.03) {
      particles.push({
        x: player.x + rand(-4, 4),
        y: player.y + rand(-4, 4),
        vx: -player.vx * 0.15 + rand(-12, 12),
        vy: -player.vy * 0.15 + rand(-12, 12),
        r: rand(1.2, 2.8),
        life: 1,
        decay: 1 / rand(0.35, 0.7),
        color: Math.random() < 0.5 ? st.trail : st.mid,
      });
    }

    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) combo = 1;
    }

    // motes
    const magnetBase = (70 + player.glow * 90) * stats.magnet;
    const collectR = 16 + player.glow * 10 + stats.collectBonus;
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.phase += dt * 4;
      m.vx *= Math.pow(0.12, dt);
      m.vy *= Math.pow(0.12, dt);
      m.x += m.vx * dt;
      m.y += m.vy * dt;

      const d2 = dist2(m.x, m.y, player.x, player.y);
      if (d2 < magnetBase * magnetBase) {
        const d = Math.sqrt(d2) || 1;
        const pull = 400 * (1 - d / magnetBase) + 48;
        m.vx += ((player.x - m.x) / d) * pull * dt * 60;
        m.vy += ((player.y - m.y) / d) * pull * dt * 60;
      }

      if (d2 < collectR * collectR) {
        motes.splice(i, 1);
        collected++;
        const isGold = !!m.gold;
        if (isGold) goldCollected++;
        chainCount = Math.min(20, chainCount + 1);
        chainTimer = 0.55;
        const base = isGold ? 28 : 8;
        const gain = addScore(base * combo * stats.moteVal);
        player.glow = clamp(player.glow + (isGold ? 0.08 : 0.035), 0.12, 1);
        combo = clamp(combo + (isGold ? 0.4 : 0.2), 1, 8);
        comboTimer = 2.4 * stats.comboKeep;
        markCollect();
        spawnParticles(m.x, m.y, isGold ? "#ffe08a" : COLORS.mote, isGold ? 18 : 10, isGold ? 130 : 90, 0.45);
        floatText(m.x, m.y - 8, "+" + gain, isGold ? "#ffe08a" : st.mid);
        gainXp(isGold ? 5 : 1, m.x, m.y - 14);
        addPulse(isGold ? 0.08 : 0.035);
        if (isGold) SFX.gold();
        else if (collected % 3 === 0) SFX.pick();

        for (const f of flowers) {
          if (f.dead) continue;
          const fd2 = dist2(f.x, f.y, m.x, m.y);
          if (fd2 < 58 * 58) {
            f.filled += isGold ? 2 : 1;
            f.pop = 1;
            if (f.filled >= f.need) bloomFlower(f);
            break;
          }
        }
        if (motes.length < 28 + Math.floor(player.level * 0.8)) spawnMote();
        updateHud();
        continue;
      }

      // keep motes in world
      if (m.x < 10) m.x = 10;
      if (m.x > worldW - 10) m.x = worldW - 10;
      if (m.y < 10) m.y = 10;
      if (m.y > worldH - 10) m.y = worldH - 10;
    }

    for (const f of flowers) {
      f.phase += dt * 1.5;
      f.pop = Math.max(0, f.pop - dt * 3);
    }

    // wisps
    const lightR = 50 + player.glow * 130 + (player.flareActive > 0 ? 140 : 0);
    const timeBonus = Math.min(3.5, elapsed / 45);
    let maxWisps = Math.min(14, 3 + Math.floor((player.level + timeBonus) * 0.8));
    let spawnInterval = Math.max(0.8, 3.6 - player.level * 0.2 - timeBonus * 0.08);
    if (calmTimer > 0) {
      maxWisps = Math.min(maxWisps, 2);
      spawnInterval *= 2.5;
    }

    if (update.spawnTimer == null) update.spawnTimer = 1.2;
    update.spawnTimer -= dt;
    if (update.spawnTimer <= 0 && wisps.length < maxWisps) {
      spawnWisp();
      update.spawnTimer = spawnInterval * rand(0.75, 1.2);
    }

    for (let i = wisps.length - 1; i >= 0; i--) {
      const w = wisps[i];
      w.phase += dt * 2.5;
      w.hitFlash = Math.max(0, w.hitFlash - dt * 3);

      const dx = player.x - w.x;
      const dy = player.y - w.y;
      const d = Math.hypot(dx, dy) || 1;
      const inLight = d < lightR;

      if (w.type === "lurker") {
        if (inLight) w.alert = Math.min(1, w.alert + dt * 0.8);
        else w.alert = Math.min(1, w.alert + dt * 1.6);
      } else if (player.flareActive > 0 && d < 170 * stats.flareRange) {
        w.alert = Math.max(0, w.alert - dt * 2);
      } else if (inLight) {
        w.alert = Math.min(1, w.alert + dt * (1.2 + player.glow));
      } else {
        w.alert = Math.max(0, w.alert - dt * 0.45);
      }

      let tx, ty, spW;
      if (w.type === "lurker" && inLight) {
        tx = 0;
        ty = 0;
        spW = 8;
      } else if (w.alert > 0.35) {
        if (w.type === "dasher") {
          w.dashT -= dt;
          if (w.dashT <= 0) {
            w.dashT = rand(1.6, 2.6);
            w.vx = (dx / d) * w.speed * 3.2;
            w.vy = (dy / d) * w.speed * 3.2;
            spawnParticles(w.x, w.y, "#ff8a9a", 8, 100, 0.3);
          }
          tx = dx / d;
          ty = dy / d;
          spW = w.speed * 0.7;
        } else {
          tx = dx / d;
          ty = dy / d;
          spW = w.speed * (0.85 + w.alert * 0.5);
        }
      } else {
        const wander = Math.sin(w.phase * 0.7 + w.x * 0.01) * 0.9;
        const wander2 = Math.cos(w.phase * 0.5 + w.y * 0.01);
        tx = wander;
        ty = wander2;
        const wm = Math.hypot(tx, ty) || 1;
        tx /= wm;
        ty /= wm;
        if (d < lightR * 1.4 && w.type !== "lurker") {
          tx = lerp(tx, dx / d, 0.25);
          ty = lerp(ty, dy / d, 0.25);
        }
        spW = w.speed * 0.55;
      }

      if (w.type !== "dasher" || w.alert <= 0.35) {
        w.vx = lerp(w.vx, tx * spW, 1 - Math.pow(0.001, dt));
        w.vy = lerp(w.vy, ty * spW, 1 - Math.pow(0.001, dt));
      } else {
        w.vx *= Math.pow(0.4, dt);
        w.vy *= Math.pow(0.4, dt);
      }

      if (stats.trailRepel && d < 40) {
        w.vx -= (dx / d) * 1.6;
        w.vy -= (dy / d) * 1.6;
      }

      w.x += w.vx * dt;
      w.y += w.vy * dt;

      const hitR = w.r + player.r + 2;
      if (player.invuln <= 0 && dist2(w.x, w.y, player.x, player.y) < hitR * hitR) {
        hurtPlayer(w);
      }

      // cull far + calm
      if (
        (w.x < -200 || w.x > worldW + 200 || w.y < -200 || w.y > worldH + 200) &&
        w.alert < 0.1
      ) {
        wisps.splice(i, 1);
      }
    }

    // ambient dust drift
    for (const d of ambientDust) {
      d.phase += dt * 0.4;
      d.x += Math.sin(d.phase) * 6 * dt;
      d.y += Math.cos(d.phase * 0.7) * 4 * dt - 3 * dt;
      if (d.y < 10) d.y = worldH - 10;
      if (d.x < 10) d.x = worldW - 10;
      if (d.x > worldW - 10) d.x = 10;
    }

    // particles / texts
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= p.decay * dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.2, dt);
      p.vy *= Math.pow(0.2, dt);
    }

    for (let i = floatTexts.length - 1; i >= 0; i--) {
      const f = floatTexts[i];
      f.life -= dt * 1.1;
      if (f.life <= 0) {
        floatTexts.splice(i, 1);
        continue;
      }
      f.y += f.vy * dt;
    }

    // density for larger map
    if (motes.length < 24 + Math.floor(player.level * 0.6)) {
      if (Math.random() < dt * 4) spawnMote();
    }
    const wantFlowers = Math.min(12, 6 + Math.floor(player.level / 2));
    if (flowers.filter((f) => !f.dead).length < wantFlowers && Math.random() < dt * 0.5) {
      spawnFlower();
    }

    shake = Math.max(0, shake - dt * 18);
    flash = Math.max(0, flash - dt * 2.4);

    const drain = 0.008 * (1 + player.level * 0.035) * stats.glowKeep;
    player.glow = clamp(player.glow - dt * drain, 0.12, 1);

    updateHud();
  }

  function bloomFlower(f) {
    if (f.dead) return;
    f.dead = true;
    f.lit = 1;
    blooms++;
    const rare = !!f.rare;
    const gain = addScore((40 + player.level * 10) * combo * stats.bloomVal * (rare ? 2 : 1));
    player.glow = clamp(player.glow + (rare ? 0.25 : 0.12), 0.12, 1);
    combo = clamp(combo + 0.5, 1, 8);
    comboTimer = 3 * stats.comboKeep;
    markCollect();
    spawnParticles(f.x, f.y, rare ? "#ffe08a" : COLORS.flowerLit, rare ? 40 : 28, 180, 0.7);
    spawnParticles(f.x, f.y, levelStyle(player.level).mid, 16, 120, 0.55);
    floatText(f.x, f.y - 20, "+" + gain + (rare ? " 神花绽放" : " 绽放"), rare ? "#ffe08a" : COLORS.flowerLit);
    shake = Math.max(shake, rare ? 8 : 4);
    flash = Math.max(flash, rare ? 0.4 : 0.25);
    gainXp((3 + Math.floor(player.level * 0.3)) * (rare ? 3 : 1), f.x, f.y - 28);
    addPulse(rare ? 0.35 : 0.15);
    SFX.bloom();

    if (rare) {
      // rare flower grants an extra draft
      pendingLevelUps += 1;
      floatText(f.x, f.y - 36, "神花馈赠 · 额外进阶", "#c4a1ff");
    }

    if (stats.bloomHeal && player.hp < player.maxHp && Math.random() < 0.5) {
      player.hp += 1;
      floatText(player.x, player.y - 40, "+1 萤甲", "#7dffc3");
    }

    setTimeout(() => {
      const idx = flowers.indexOf(f);
      if (idx >= 0) flowers.splice(idx, 1);
    }, 800);

    if (pendingLevelUps > 0 && state === "playing") openChoice();
  }

  function hurtPlayer(w) {
    player.hp -= 1;
    player.invuln = 1.35 + stats.invulnBonus;
    hitHoldTimer = 2;
    shake = 12;
    flash = 0.7;
    hitStop = 0.08;
    combo = 1;
    comboTimer = 0;
    chainCount = 0;
    player.glow = Math.max(0.15, player.glow - 0.2);
    spawnParticles(player.x, player.y, "#ff6b7a", 20, 160, 0.5);
    spawnParticles(player.x, player.y, "#ffffff", 8, 120, 0.3);
    SFX.hurt();

    const dx = player.x - w.x;
    const dy = player.y - w.y;
    const d = Math.hypot(dx, dy) || 1;
    player.vx += (dx / d) * 300;
    player.vy += (dy / d) * 300;
    w.vx -= (dx / d) * 200;
    w.vy -= (dy / d) * 200;
    w.alert = 0;

    player.xp = Math.max(0, player.xp - 2);

    updateHud();
    if (player.hp <= 0) {
      showDeath(
        "被暗影吞没 · 收集 " + collected + " 粒光尘 · 唤醒 " + blooms + " 花"
      );
    }
  }

  // ── Render ───────────────────────────────────────────
  function render() {
    const sx = shake > 0 ? rand(-shake, shake) : 0;
    const sy = shake > 0 ? rand(-shake, shake) : 0;

    ctx.save();
    ctx.translate(sx - cam.x, sy - cam.y);

    drawWorldBackdrop();

    // world border
    ctx.strokeStyle = "rgba(240,212,138,0.08)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, worldW - 2, worldH - 2);

    // stars (only near view)
    for (const s of stars) {
      if (s.x < cam.x - 20 || s.x > cam.x + W + 20 || s.y < cam.y - 20 || s.y > cam.y + H + 20)
        continue;
      const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(elapsed * s.sp + s.tw));
      ctx.globalAlpha = tw * 0.7;
      ctx.fillStyle = "#c8d4ff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    drawMoon();
    drawGrass();
    drawFlowerField();

    for (const f of flowers) drawFlower(f);
    for (const m of motes) drawMote(m);
    for (const w of wisps) drawWisp(w);
    drawBoss();
    drawPlayer();

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life) * 0.9;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.4 + p.life * 0.6), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // 抖音小游戏没有可用的 getComputedStyle(document.body)，会 Illegal invocation
    const font = "14px sans-serif";
    for (const f of floatTexts) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.color;
      ctx.font = "600 14px " + font;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    drawLightMask();

    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flash * 0.35})`;
      ctx.fillRect(cam.x - 40, cam.y - 40, W + 80, H + 80);
    }

    if (state === "playing" || state === "paused" || state === "choosing") {
      drawFlareRing();
      drawDashRing();
    }

    ctx.restore();

    // vignette in screen space (stable)
    drawScreenVignette();
    drawOffscreenThreats();
    drawMinimap();
  }

  function drawBoss() {
    if (!boss.active || boss.dead) return;
    if (
      boss.x < cam.x - 120 ||
      boss.x > cam.x + W + 120 ||
      boss.y < cam.y - 120 ||
      boss.y > cam.y + H + 120
    )
      return;

    const pulse = 1 + Math.sin(boss.phase * 3) * 0.06;
    const r = boss.r * pulse;

    // dark aura
    const ag = ctx.createRadialGradient(boss.x, boss.y, r * 0.3, boss.x, boss.y, r * 2.4);
    ag.addColorStop(0, "rgba(255,77,109,0.28)");
    ag.addColorStop(0.5, "rgba(90,30,60,0.2)");
    ag.addColorStop(1, "rgba(4,6,12,0)");
    ctx.fillStyle = ag;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, r * 2.4, 0, TAU);
    ctx.fill();

    // body
    ctx.fillStyle = boss.enrage ? "#3a0818" : "#2a1020";
    ctx.beginPath();
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const rr = r * (1 + 0.12 * Math.sin(boss.phase * 2 + i) + (boss.enrage ? 0.05 : 0));
      const px = boss.x + Math.cos(a) * rr;
      const py = boss.y + Math.sin(a) * rr * 0.9;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // core
    const cg = ctx.createRadialGradient(boss.x - 6, boss.y - 6, 2, boss.x, boss.y, r * 0.7);
    if (boss.enrage) {
      cg.addColorStop(0, "#ffe08a");
      cg.addColorStop(0.35, "#ff2a4a");
      cg.addColorStop(1, "#5a1028");
    } else {
      cg.addColorStop(0, "#ffb0c0");
      cg.addColorStop(0.4, "#ff4d6d");
      cg.addColorStop(1, "#4a1830");
    }
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, r * 0.55, 0, TAU);
    ctx.fill();

    if (boss.enrage) {
      ctx.strokeStyle = "rgba(255,42,74,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, r + 8 + Math.sin(boss.phase * 6) * 3, 0, TAU);
      ctx.stroke();
    }

    // eyes
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath();
    ctx.arc(boss.x - r * 0.22, boss.y - r * 0.08, 4, 0, TAU);
    ctx.arc(boss.x + r * 0.22, boss.y - r * 0.08, 4, 0, TAU);
    ctx.fill();

    // 快慢刀 telegraph — slow is a long expanding warning; fast is a tight flash
    if (boss.atkState === "tell") {
      const p = 1 - Math.max(0, boss.atkT) / Math.max(0.001, boss.atkTellDur);
      if (boss.atkKind === "slow") {
        // long windup: dark red disc grows to release radius
        const warnR = 20 + p * 110;
        ctx.strokeStyle = `rgba(255,42,74,${0.35 + p * 0.45})`;
        ctx.lineWidth = 3 + p * 4;
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, warnR, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = `rgba(255,42,74,${0.06 + p * 0.1})`;
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, warnR, 0, TAU);
        ctx.fill();
        // slow mark
        ctx.fillStyle = "rgba(255,180,180,0.9)";
        ctx.font = "700 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("慢", boss.x, boss.y - boss.r - 22);
      } else {
        // fast: sharp blink, small ring
        ctx.strokeStyle = `rgba(255,220,220,${0.5 + p * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, boss.r + 6 + p * 10, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,240,240,0.95)";
        ctx.font = "700 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("快", boss.x, boss.y - boss.r - 22);
      }
    }

    // shockwave ring
    if (boss.waveActive) {
      ctx.strokeStyle = `rgba(255,77,109,${Math.max(0.15, 0.85 - boss.waveR / 400)})`;
      ctx.lineWidth = boss._waveBand > 16 ? 5 : 3;
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, boss.waveR, 0, TAU);
      ctx.stroke();
    }

    if (boss.atkFlash > 0) {
      ctx.strokeStyle = `rgba(255,200,210,${boss.atkFlash * 0.7})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, r + 4, 0, TAU);
      ctx.stroke();
    }
  }

  function drawOffscreenThreats() {
    const margin = 30;
    // boss indicator
    if (boss.active && !boss.dead) {
      const bsx = boss.x - cam.x;
      const bsy = boss.y - cam.y;
      if (bsx < 8 || bsx > W - 8 || bsy < 8 || bsy > H - 8) {
        const dx = bsx - W * 0.5;
        const dy = bsy - H * 0.5;
        const ang = Math.atan2(dy, dx);
        const hx = W * 0.5 - margin;
        const hy = H * 0.5 - margin;
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);
        let t = Infinity;
        if (Math.abs(cos) > 1e-4) t = Math.min(t, hx / Math.abs(cos));
        if (Math.abs(sin) > 1e-4) t = Math.min(t, hy / Math.abs(sin));
        ctx.save();
        ctx.translate(W * 0.5 + cos * t, H * 0.5 + sin * t);
        ctx.rotate(ang);
        ctx.fillStyle = "rgba(255,77,109,0.95)";
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-7, 8);
        ctx.lineTo(-7, -8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    for (const w of wisps) {
      if (w.alert < 0.25 && !w.elite) continue;
      const sx = w.x - cam.x;
      const sy = w.y - cam.y;
      if (sx >= 8 && sx <= W - 8 && sy >= 8 && sy <= H - 8) continue;
      // project toward edge
      const dx = sx - W * 0.5;
      const dy = sy - H * 0.5;
      const ang = Math.atan2(dy, dx);
      // intersection with rect inset by margin
      const hx = W * 0.5 - margin;
      const hy = H * 0.5 - margin;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      let t = Infinity;
      if (Math.abs(cos) > 1e-4) t = Math.min(t, hx / Math.abs(cos));
      if (Math.abs(sin) > 1e-4) t = Math.min(t, hy / Math.abs(sin));
      const ix = W * 0.5 + cos * t;
      const iy = H * 0.5 + sin * t;

      ctx.save();
      ctx.translate(ix, iy);
      ctx.rotate(ang);
      ctx.fillStyle = w.elite ? "rgba(255,138,154,0.92)" : "rgba(255,77,109,0.55)";
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(-5, 6);
      ctx.lineTo(-5, -6);
      ctx.closePath();
      ctx.fill();
      if (w.elite) {
        ctx.strokeStyle = "rgba(255,214,234,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawWorldBackdrop() {
    // deep indigo sky, cooler than flat black — readable silhouettes
    const g = ctx.createLinearGradient(cam.x, cam.y, cam.x, cam.y + H);
    g.addColorStop(0, "#0a1428");
    g.addColorStop(0.35, "#0c1830");
    g.addColorStop(0.7, "#0a1524");
    g.addColorStop(1, "#070d18");
    ctx.fillStyle = g;
    ctx.fillRect(cam.x - 40, cam.y - 40, W + 80, H + 80);

    // soft moon glow band across upper world
    const mg = ctx.createRadialGradient(
      worldW * 0.78,
      worldH * 0.14,
      20,
      worldW * 0.78,
      worldH * 0.14,
      Math.max(W, H) * 0.55
    );
    mg.addColorStop(0, "rgba(180,200,255,0.12)");
    mg.addColorStop(1, "rgba(180,200,255,0)");
    ctx.fillStyle = mg;
    ctx.fillRect(0, 0, worldW, worldH * 0.55);

    // parallax hills (far → near)
    const layers = [
      { fill: "rgba(8,18,32,0.85)", px: 0.25 },
      { fill: "rgba(10,22,36,0.9)", px: 0.45 },
      { fill: "rgba(12,28,40,0.95)", px: 0.7 },
    ];
    for (const h of bgHills) {
      const metaL = layers[Math.min(h.layer, 2)];
      // draw with mild parallax offset so hills shift vs camera
      const ox = cam.x * (metaL.px - 1) * 0.15;
      ctx.fillStyle = metaL.fill;
      ctx.beginPath();
      const pts = h.pts;
      if (!pts.length) continue;
      ctx.moveTo(pts[0].x + ox, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const mx = (a.x + b.x) / 2 + ox;
        const my = (a.y + b.y) / 2;
        ctx.quadraticCurveTo(a.x + ox, a.y, mx, my);
      }
      ctx.lineTo(pts[pts.length - 1].x + ox, worldH + 20);
      ctx.lineTo(pts[0].x + ox, worldH + 20);
      ctx.closePath();
      ctx.fill();
    }

    // tree silhouettes on mid/near hills
    for (const t of bgTrees) {
      if (t.x < cam.x - 80 || t.x > cam.x + W + 80) continue;
      const ox = cam.x * (t.layer === 1 ? -0.08 : -0.14);
      ctx.fillStyle = t.layer === 1 ? "rgba(6,14,24,0.75)" : "rgba(8,18,28,0.9)";
      ctx.beginPath();
      ctx.moveTo(t.x + ox, t.y);
      ctx.lineTo(t.x + t.w * 0.5 + ox, t.y - t.h);
      ctx.lineTo(t.x + t.w + ox, t.y);
      ctx.closePath();
      ctx.fill();
      // trunk
      ctx.fillRect(t.x + t.w * 0.42 + ox, t.y - 4, t.w * 0.16, 10);
    }

    // ground wash
    const gg = ctx.createLinearGradient(0, worldH * 0.55, 0, worldH);
    gg.addColorStop(0, "rgba(8,16,28,0.15)");
    gg.addColorStop(1, "rgba(5,10,18,0.55)");
    ctx.fillStyle = gg;
    ctx.fillRect(0, worldH * 0.5, worldW, worldH * 0.5);

    // fog ribbons
    for (const f of fogBands) {
      const fx = f.x + Math.sin(elapsed * 0.15 + f.y * 0.01) * 30;
      if (fx + f.w < cam.x - 40 || fx > cam.x + W + 40) continue;
      const fg = ctx.createRadialGradient(fx + f.w / 2, f.y, 4, fx + f.w / 2, f.y, f.w * 0.55);
      fg.addColorStop(0, `rgba(140,170,200,${f.a})`);
      fg.addColorStop(1, "rgba(140,170,200,0)");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.ellipse(fx + f.w / 2, f.y, f.w * 0.5, f.h, 0, 0, TAU);
      ctx.fill();
    }

    // ambient dust
    for (const d of ambientDust) {
      if (d.x < cam.x - 20 || d.x > cam.x + W + 20 || d.y < cam.y - 20 || d.y > cam.y + H + 20)
        continue;
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(elapsed * d.sp * 0.2 + d.phase));
      ctx.globalAlpha = tw * 0.55;
      ctx.fillStyle = d.warm ? "#f0d48a" : "#9ad4ff";
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFlowerField() {
    if (!flowerField.active) return;
    const lifeP = flowerField.life / flowerField.maxLife;
    const a = 0.12 + lifeP * 0.12 + Math.sin(elapsed * 2 + flowerField.seed * 10) * 0.03;
    const rg = ctx.createRadialGradient(
      flowerField.x,
      flowerField.y,
      flowerField.r * 0.15,
      flowerField.x,
      flowerField.y,
      flowerField.r
    );
    rg.addColorStop(0, `rgba(255,180,220,${a})`);
    rg.addColorStop(0.45, `rgba(180,220,255,${a * 0.55})`);
    rg.addColorStop(1, "rgba(180,220,255,0)");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(flowerField.x, flowerField.y, flowerField.r, 0, TAU);
    ctx.fill();
    // ring
    ctx.strokeStyle = `rgba(255,214,234,${0.15 + lifeP * 0.2})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 10]);
    ctx.lineDashOffset = -elapsed * 20;
    ctx.beginPath();
    ctx.arc(flowerField.x, flowerField.y, flowerField.r * 0.92, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawMoon() {
    const mx = worldW * 0.82;
    const my = worldH * 0.12;
    const mr = Math.min(W, H) * 0.05;
    if (mx < cam.x - mr * 5 || mx > cam.x + W + mr * 5) return;
    const mg = ctx.createRadialGradient(mx, my, mr * 0.2, mx, my, mr * 4);
    mg.addColorStop(0, "rgba(220,230,255,0.2)");
    mg.addColorStop(1, "rgba(220,230,255,0)");
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(mx, my, mr * 4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(230,236,250,0.85)";
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = COLORS.night1;
    ctx.beginPath();
    ctx.arc(mx + mr * 0.35, my - mr * 0.15, mr * 0.85, 0, TAU);
    ctx.fill();
  }

  function drawGrass() {
    for (const b of grassBlades) {
      if (b.x < cam.x - 40 || b.x > cam.x + W + 40) continue;
      const sway = Math.sin(elapsed * b.sway + b.phase) * 10 * b.lean;
      const baseY = worldH;
      const tipX = b.x + sway + b.lean * b.h * 0.35;
      const tipY = baseY - b.h;
      ctx.strokeStyle = b.tone > 0.5 ? COLORS.leaf : COLORS.leafDark;
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(b.x, baseY);
      ctx.quadraticCurveTo(b.x + sway * 0.4, baseY - b.h * 0.5, tipX, tipY);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawFlower(f) {
    if (
      f.x < cam.x - 60 ||
      f.x > cam.x + W + 60 ||
      f.y < cam.y - 60 ||
      f.y > cam.y + H + 60
    )
      return;

    const pulse = f.pop * 0.25 + Math.sin(f.phase) * 0.04;
    const r = f.r * (1 + pulse);
    ctx.strokeStyle = COLORS.leaf;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(f.x, f.y + r * 0.3);
    ctx.quadraticCurveTo(f.x + 4, f.y + r * 0.9, f.x - 2, f.y + r * 1.4);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const filledRatio = f.filled / f.need;
    const petalCol = f.rare
      ? [Math.floor(lerp(255, 255, filledRatio)), Math.floor(lerp(180, 224, filledRatio)), Math.floor(lerp(100, 140, filledRatio))]
      : [255, Math.floor(lerp(120, 214, filledRatio)), Math.floor(lerp(150, 234, filledRatio))];
    for (let i = 0; i < f.petals; i++) {
      const a = (i / f.petals) * TAU + f.phase * 0.15;
      const px = f.x + Math.cos(a) * r * 0.55;
      const py = f.y + Math.sin(a) * r * 0.55;
      ctx.fillStyle = `rgb(${petalCol[0]},${petalCol[1]},${petalCol[2]})`;
      ctx.globalAlpha = 0.55 + filledRatio * 0.45;
      ctx.beginPath();
      ctx.ellipse(px, py, r * 0.38, r * 0.24, a, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = filledRatio > 0.6 ? "#fff2b0" : "#d8c48a";
    ctx.beginPath();
    ctx.arc(f.x, f.y, r * 0.22, 0, TAU);
    ctx.fill();

    if (filledRatio > 0 && filledRatio < 1) {
      ctx.strokeStyle = "rgba(255,214,234,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r * 0.95, -Math.PI / 2, -Math.PI / 2 + TAU * filledRatio);
      ctx.stroke();
    }

    if (f.lit > 0 || filledRatio > 0.5) {
      const rg = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, r * 2.2);
      rg.addColorStop(0, `rgba(255,214,234,${0.25 + f.lit * 0.3})`);
      rg.addColorStop(1, "rgba(255,214,234,0)");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r * 2.2, 0, TAU);
      ctx.fill();
    }
  }

  function drawMote(m) {
    if (
      m.x < cam.x - 30 ||
      m.x > cam.x + W + 30 ||
      m.y < cam.y - 30 ||
      m.y > cam.y + H + 30
    )
      return;
    const pulse = 0.7 + 0.3 * Math.sin(m.phase);
    const col = m.gold ? "255,224,138" : "184,255,224";
    const rg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * (m.gold ? 5 : 4));
    rg.addColorStop(0, `rgba(${col},${0.6 * pulse})`);
    rg.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r * (m.gold ? 5 : 4), 0, TAU);
    ctx.fill();
    ctx.fillStyle = m.gold ? "#fff6c8" : "#e8fff5";
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r * pulse, 0, TAU);
    ctx.fill();
  }

  function wispColor(type) {
    if (type === "dasher") return "#8a3a4a";
    if (type === "splitter") return "#5a3a78";
    if (type === "lurker") return "#2a4a5a";
    if (type === "brute") return "#4a3040";
    if (type === "mini") return "#9a5a88";
    return COLORS.wisp;
  }

  function drawWisp(w) {
    if (
      w.x < cam.x - 50 ||
      w.x > cam.x + W + 50 ||
      w.y < cam.y - 50 ||
      w.y > cam.y + H + 50
    )
      return;

    const alert = w.alert;
    const body = w.hitFlash > 0 ? "#ffb0c0" : wispColor(w.type);
    const rg = ctx.createRadialGradient(w.x, w.y, 2, w.x, w.y, w.r * 2.5);
    const glowCol =
      w.type === "lurker" ? "80,180,200" : w.type === "brute" ? "120,60,80" : "255,77,109";
    rg.addColorStop(0, `rgba(${glowCol},${0.12 + alert * 0.28})`);
    rg.addColorStop(1, `rgba(${glowCol},0)`);
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r * 2.5, 0, TAU);
    ctx.fill();

    ctx.fillStyle = body;
    ctx.beginPath();
    const n = w.type === "brute" ? 10 : 8;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const rr = w.r * (1 + 0.15 * Math.sin(w.phase + i));
      const px = w.x + Math.cos(a) * rr;
      const py = w.y + Math.sin(a) * rr * 0.92;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    if (w.type === "dasher" && alert > 0.5) {
      ctx.strokeStyle = "rgba(255,140,150,0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r + 4, 0, TAU);
      ctx.stroke();
    }
    if (w.type === "brute") {
      ctx.strokeStyle = "rgba(255,180,180,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r + 3, 0, TAU);
      ctx.stroke();
    }
    if (w.type === "lurker") {
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(w.phase * 2);
      ctx.strokeStyle = "#80d0e0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r + 6, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const lookX = Math.cos(w.phase * 0.3) * 2;
    ctx.fillStyle = COLORS.wispEye;
    ctx.beginPath();
    ctx.arc(w.x - 4 + lookX, w.y - 2, 2.2, 0, TAU);
    ctx.arc(w.x + 4 + lookX, w.y - 2, 2.2, 0, TAU);
    ctx.fill();

    if (w.elite) {
      ctx.strokeStyle = "rgba(255,138,154,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r + 5 + Math.sin(w.phase * 3) * 2, 0, TAU);
      ctx.stroke();
    }

    if (alert > 0.55) {
      ctx.fillStyle = `rgba(255,77,109,${alert})`;
      ctx.font = "700 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(w.elite ? "!!" : "!", w.x, w.y - w.r - 8);
    }
  }

  function drawPlayer() {
    const st = levelStyle(player.level);
    const glow = player.glow;
    const pulse = 0.85 + 0.15 * Math.sin(player.glowPulse);
    const baseR = 9 + Math.min(player.level, 10) * 0.45 + glow * 5;
    const r = baseR * pulse;

    const outer = 50 + glow * 140 + (player.flareActive > 0 ? 100 : 0) + player.level * 3;
    const og = ctx.createRadialGradient(player.x, player.y, r * 0.5, player.x, player.y, outer);
    og.addColorStop(0, hexAlpha(st.mid, 0.28 + glow * 0.2));
    og.addColorStop(0.35, hexAlpha(st.trail, 0.08 + glow * 0.08));
    og.addColorStop(1, hexAlpha(st.trail, 0));
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.arc(player.x, player.y, outer, 0, TAU);
    ctx.fill();

    const style = levelStyle(player.level);
    for (let i = 0; i < style.rings; i++) {
      const rr = r + 10 + i * 8 + Math.sin(elapsed * 2 + i) * 2;
      ctx.strokeStyle = hexAlpha(st.mid, 0.18 + player.levelFlash * 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(player.x, player.y, rr, 0, TAU);
      ctx.stroke();
    }

    if (player.invuln > 0 && Math.floor(player.invuln * 12) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }

    // body — distinct silhouette per starting glimmer
    const gl = glimmerById(player.glimmer || "spark");
    // blend glimmer colors with level style slightly
    const shaped = {
      shape: gl.shape,
      color: st.mid,
      color2: st.trail,
    };

    // ── wings: drawn under body, larger & more readable ──
    const wingFlap = Math.sin(elapsed * (18 + player.level * 0.8));
    const wingOpen = 0.55 + wingFlap * 0.35; // 0.2 .. 0.9
    const wingA = 0.42 + Math.min(player.level, 10) * 0.03;
    const wr = r * 1.35;
    // outer membrane glow
    for (const side of [-1, 1]) {
      const wx = player.x + side * r * 0.55;
      const wy = player.y - r * 0.35;
      const rot = side * (0.85 - wingOpen * 0.55);
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(rot);
      // soft glow
      const wg = ctx.createRadialGradient(0, 0, 2, 0, 0, wr);
      wg.addColorStop(0, hexAlpha(st.trail, wingA * 0.55));
      wg.addColorStop(1, hexAlpha(st.trail, 0));
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.ellipse(0, 0, wr * 0.9, wr * 0.55, 0, 0, TAU);
      ctx.fill();
      // membrane
      ctx.fillStyle = hexAlpha(st.trail, wingA);
      ctx.beginPath();
      ctx.ellipse(0, -wr * 0.05, wr * 0.78, wr * 0.42, 0, 0, TAU);
      ctx.fill();
      // vein stroke for readability
      ctx.strokeStyle = hexAlpha("#ffffff", 0.22 + wingA * 0.25);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, -wr * 0.05, wr * 0.78, wr * 0.42, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    // lower pair (always on, not only lv5+) — smaller
    const wingA2 = wingA * 0.55;
    for (const side of [-1, 1]) {
      const wx = player.x + side * r * 0.35;
      const wy = player.y + r * 0.35;
      const rot = side * (0.55 + wingOpen * 0.25);
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(rot);
      ctx.fillStyle = hexAlpha(st.mid, wingA2);
      ctx.beginPath();
      ctx.ellipse(0, 0, wr * 0.5, wr * 0.26, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = hexAlpha("#ffffff", 0.12);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    drawGlimmerShape(ctx, player.x, player.y, r, shaped, player.facing);

    ctx.globalAlpha = 1;
  }

  function drawLightMask() {
    const lightR = 90 + player.glow * 180 + (player.flareActive > 0 ? 160 : 0) + player.level * 2;
    const edge = 0.55 + Math.min(player.level, 10) * 0.01;
    const darkness = ctx.createRadialGradient(
      player.x,
      player.y,
      lightR * 0.35,
      player.x,
      player.y,
      Math.max(W, H) * 0.72
    );
    darkness.addColorStop(0, "rgba(4,6,12,0)");
    darkness.addColorStop(0.55, `rgba(4,6,12,${0.2 + player.level * 0.008})`);
    darkness.addColorStop(1, `rgba(4,6,12,${edge})`);
    ctx.fillStyle = darkness;
    // only cover view area in world space
    ctx.fillRect(cam.x - 10, cam.y - 10, W + 20, H + 20);
  }

  function drawScreenVignette() {
    // corner darkening independent of camera — helps large map feel
    const vg = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.35, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
    vg.addColorStop(0, "rgba(4,6,12,0)");
    vg.addColorStop(1, "rgba(4,6,12,0.35)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  function drawFlareRing() {
    if (player.flareCd <= 0) {
      ctx.strokeStyle = hexAlpha(levelStyle(player.level).trail, 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r + 10, 0, TAU);
      ctx.stroke();
      return;
    }
    const total = 2.2 * stats.flareCdMul;
    const t = 1 - player.flareCd / total;
    ctx.strokeStyle = "rgba(240,212,138,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r + 10, -Math.PI / 2, -Math.PI / 2 + TAU * t);
    ctx.stroke();
  }

  function drawDashRing() {
    if (!player.hasDash) return;
    const total = 2.4 * stats.dashCdMul;
    if (player.dashCd <= 0) {
      ctx.strokeStyle = "rgba(167,139,250,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r + 16, 0, TAU);
      ctx.stroke();
      return;
    }
    const t = 1 - player.dashCd / total;
    ctx.strokeStyle = "rgba(167,139,250,0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r + 16, -Math.PI / 2, -Math.PI / 2 + TAU * t);
    ctx.stroke();
  }

  function drawMinimap() {
    if (minimap.classList.contains("hidden")) return;
    const mw = minimap.clientWidth;
    const mh = minimap.clientHeight;
    mctx.clearRect(0, 0, mw, mh);
    mctx.fillStyle = "rgba(6,10,18,0.85)";
    mctx.fillRect(0, 0, mw, mh);

    const sx = mw / worldW;
    const sy = mh / worldH;

    // flowers
    for (const f of flowers) {
      mctx.fillStyle = f.dead ? "rgba(255,214,234,0.25)" : "rgba(255,158,203,0.85)";
      mctx.beginPath();
      mctx.arc(f.x * sx, f.y * sy, 2, 0, TAU);
      mctx.fill();
    }
    // motes sample
    mctx.fillStyle = "rgba(184,255,224,0.45)";
    for (let i = 0; i < motes.length; i += 3) {
      const m = motes[i];
      mctx.fillRect(m.x * sx, m.y * sy, 1.2, 1.2);
    }
    // wisps
    for (const w of wisps) {
      mctx.fillStyle = w.alert > 0.4 ? "rgba(255,77,109,0.95)" : "rgba(140,80,110,0.75)";
      mctx.beginPath();
      mctx.arc(w.x * sx, w.y * sy, 1.8, 0, TAU);
      mctx.fill();
    }
    // player
    mctx.fillStyle = "#f0d48a";
    mctx.beginPath();
    mctx.arc(player.x * sx, player.y * sy, 3, 0, TAU);
    mctx.fill();

    // boss
    if (boss.active && !boss.dead) {
      mctx.fillStyle = "#ff4d6d";
      mctx.beginPath();
      mctx.arc(boss.x * sx, boss.y * sy, 4, 0, TAU);
      mctx.fill();
    }

    // flower field
    if (flowerField.active) {
      mctx.strokeStyle = "rgba(255,214,234,0.7)";
      mctx.lineWidth = 1;
      mctx.beginPath();
      mctx.arc(flowerField.x * sx, flowerField.y * sy, Math.max(3, flowerField.r * sx), 0, TAU);
      mctx.stroke();
    }

    // viewport rect
    mctx.strokeStyle = "rgba(232,228,216,0.35)";
    mctx.lineWidth = 1;
    mctx.strokeRect(cam.x * sx, cam.y * sy, W * sx, H * sy);
  }

  // ── Title ambient ────────────────────────────────────
  function renderTitleAmbient() {
    const g = ctx.createRadialGradient(W * 0.5, H * 0.35, 40, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    g.addColorStop(0, COLORS.night2);
    g.addColorStop(0.45, COLORS.night1);
    g.addColorStop(1, COLORS.night0);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (!stars.length) seedStars();
    for (const s of stars) {
      const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(elapsed * s.sp + s.tw));
      ctx.globalAlpha = tw * 0.7;
      ctx.fillStyle = "#c8d4ff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // simple moon in title
    const mx = W * 0.82;
    const my = H * 0.18;
    const mr = Math.min(W, H) * 0.05;
    ctx.fillStyle = "rgba(230,236,250,0.85)";
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = COLORS.night1;
    ctx.beginPath();
    ctx.arc(mx + mr * 0.35, my - mr * 0.15, mr * 0.85, 0, TAU);
    ctx.fill();
  }

  // ── Loop ─────────────────────────────────────────────
  function frame(ts) {
    if (!lastTs) lastTs = ts;
    let dt = (ts - lastTs) / 1000;
    lastTs = ts;
    dt = Math.min(dt, 0.033);

    if (state === "playing") {
      update(dt);
      render();
    } else if (state === "paused" || state === "choosing") {
      // true freeze: no gameplay update, but screen-shake/flash must still settle
      // otherwise openChoice's punch sticks and the night jitters forever
      shake = Math.max(0, shake - dt * 22);
      flash = Math.max(0, flash - dt * 2.8);
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) levelToast.classList.add("hidden");
      }
      render();
    } else if (state === "dead") {
      deathLock = Math.max(0, deathLock - dt);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= p.decay * dt;
        if (p.life <= 0) particles.splice(i, 1);
        else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }
      }
      shake = Math.max(0, shake - dt * 18);
      flash = Math.max(0, flash - dt * 2.4);
      render();
    } else {
      elapsed += dt;
      renderTitleAmbient();
    }

    // Douyin: draw canvas UI after game frame (same tick — no flicker)
    try {
      var drawUiFn =
        typeof __DOUYIN_DRAW_UI__ === "function"
          ? __DOUYIN_DRAW_UI__
          : typeof GameGlobal !== "undefined" && GameGlobal.__DOUYIN_DRAW_UI__
            ? GameGlobal.__DOUYIN_DRAW_UI__
            : null;
      if (drawUiFn) drawUiFn();
    } catch (_) {}

    requestAnimationFrame(frame);
  }

  // ── Boot ─────────────────────────────────────────────
  resize();
  seedStars();
  seedGrass();
  seedBackdrop();
  window.addEventListener("resize", () => {
    resize();
    seedStars();
    seedGrass();
    seedBackdrop();
  });
  bestScoreEl.textContent = String(best);
  bestLevelEl.textContent = "Lv." + bestLevel;
  refreshMetaUi();
  renderGlimmerPick();
  showTitle();
  requestAnimationFrame(frame);

  window.__FIREFLY_TEST__ = {
    addXp(n) {
      if (state !== "playing" && state !== "choosing") return false;
      gainXp(n, player.x, player.y);
      updateHud();
      return true;
    },
    pick(i) {
      pickChoice(i);
    },
    snapshot() {
      return {
        state,
        level: player.level,
        xp: Math.floor(player.xp),
        need: player.xpNeed,
        score,
        hp: player.hp,
        maxHp: player.maxHp,
        blooms,
        collected,
        goldCollected,
        elitesKilled,
        bossesKilled,
        worldW,
        worldH,
        camX: Math.round(cam.x),
        camY: Math.round(cam.y),
        upgrades: { ...upgradeCounts },
        pending: pendingLevelUps,
        hasDash: player.hasDash,
        shake,
        runTime: Math.round(runTime * 10) / 10,
        goldMotes: motes.filter((m) => m.gold).length,
        eliteWisps: wisps.filter((w) => w.elite).length,
        bossActive: boss.active,
        bossHp: boss.hp,
        bossMax: boss.maxHp,
        rareFlowers: flowers.filter((f) => f.rare && !f.dead).length,
        deathLock: Math.round(deathLock * 100) / 100,
        pulse: Math.round(player.pulse * 100) / 100,
        calm: Math.round(calmTimer * 10) / 10,
        field: flowerField.active
          ? { x: Math.round(flowerField.x), y: Math.round(flowerField.y), life: Math.round(flowerField.life) }
          : null,
      };
    },
    spawnBossForTest() {
      spawnBoss();
    },
    damageBoss(n) {
      if (!boss.active) return false;
      boss.hp -= n;
      if (boss.hp <= 0) killBoss();
      else if (!boss.enrage && boss.hp <= boss.maxHp * 0.5) {
        // allow test/manual damage to trigger phase without waiting a frame
        boss.enrage = 0; // let updateBoss flip it next frame; force pulse
        boss.pulseT = Math.min(boss.pulseT, 0.01);
      }
      return true;
    },
    getMeta() {
      return { ...meta };
    },
    grantEmbers(n) {
      meta.embers += n;
      saveMeta();
      refreshMetaUi();
      if (!shopOverlay.classList.contains("hidden")) renderShop();
      return meta.embers;
    },
    buyMeta(id) {
      purchaseMeta(id);
      return { ...meta };
    },
    bossState() {
      return {
        active: boss.active,
        enrage: boss.enrage,
        hp: boss.hp,
        maxHp: boss.maxHp,
        atkState: boss.atkState,
        atkKind: boss.atkKind,
        atkT: Math.round(boss.atkT * 100) / 100,
        queueLen: boss.atkQueue.length,
      };
    },
    selectGlimmer(id) {
      selectGlimmer(id);
      return selectedGlimmer;
    },
    unlockAllGlimmers() {
      for (const g of GLIMMERS) {
        if (g.cost > 0) meta["unlock_" + g.id] = 1;
      }
      saveMeta();
      renderGlimmerPick();
      return { ...meta };
    },
    getGlimmer() {
      return { selected: selectedGlimmer, unlocked: GLIMMERS.map((g) => ({ id: g.id, ok: isGlimmerUnlocked(g.id) })) };
    },
    killPlayerForTest() {
      if (state !== "playing") return false;
      player.hp = 0;
      showDeath("测试熄灭");
      return true;
    },
    fillPulse() {
      player.pulse = 1;
      updateHud();
    },
    tryPulseForTest() {
      tryPulse();
      return player.pulse;
    },
    spawnFieldForTest() {
      spawnFlowerField();
      return { ...flowerField, life: Math.round(flowerField.life) };
    },
    setMode(m) {
      setGameMode(m);
      return gameMode;
    },
    getMode() {
      return gameMode;
    },
  };
})();
