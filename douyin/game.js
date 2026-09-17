/* 夜萤拾光 · 抖音小游戏入口
   游戏帧内同帧绘制 UI，避免闪屏
*/
"use strict";

const { createPlatform } = require("./js/platform");
const { createDomBridge } = require("./js/dom-bridge");

const G =
  typeof GameGlobal !== "undefined"
    ? GameGlobal
    : typeof globalThis !== "undefined"
      ? globalThis
      : typeof global !== "undefined"
        ? global
        : {};

const platform = createPlatform();
const bridge = createDomBridge(platform);

const storageShim = {
  getItem(k) {
    const v = platform.storage.get(k, null);
    return v == null ? null : String(v);
  },
  setItem(k, v) {
    platform.storage.set(k, String(v));
  },
  removeItem(k) {
    try {
      tt.removeStorageSync(k);
    } catch (_) {}
  },
};

function rawRaf(fn) {
  return setTimeout(() => fn(Date.now()), 16);
}

// UI 必须在游戏 render 之后、同一帧内画，绝不能另开定时器抢画布（会闪）
const wrappedRaf = (fn) =>
  rawRaf((ts) => {
    try {
      fn(ts);
    } catch (err) {
      console.error("[firefly]", err && err.stack ? err.stack : err);
    }
  });

G.requestAnimationFrame = wrappedRaf;
G.cancelAnimationFrame = (id) => clearTimeout(id);
G.document = bridge.document;
G.window = bridge.window;
G.localStorage = storageShim;

// firefly frame() 末尾会调这个钩子
G.__DOUYIN_DRAW_UI__ = function drawUiHook() {
  bridge.drawUi();
};

bridge.window.requestAnimationFrame = wrappedRaf;
bridge.window.cancelAnimationFrame = G.cancelAnimationFrame;
bridge.window.localStorage = storageShim;
bridge.window.innerWidth = platform.width;
bridge.window.innerHeight = platform.height;
bridge.window.devicePixelRatio = platform.pixelRatio;

if (tt && tt.onTouchStart) {
  tt.onTouchStart(function unlock() {
    if (tt.offTouchStart) tt.offTouchStart(unlock);
  });
}

require("./js/firefly.js");

// 若钩子未挂上，补一次首帧 UI
try {
  bridge.drawUi();
} catch (e) {
  console.error("[ui-first]", e);
}

console.log(
  "[douyin] boot ok",
  platform.width + "x" + platform.height,
  "dpr=" + platform.pixelRatio
);
