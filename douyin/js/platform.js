/* Douyin mini-game platform: canvas, storage, safe area, input */
"use strict";

function createPlatform() {
  const info = tt.getSystemInfoSync();
  const canvas = tt.createCanvas();

  const logicalW = info.windowWidth;
  const logicalH = info.windowHeight;
  // 必须与 firefly.js 的 Math.min(devicePixelRatio, 2) 一致，否则只画满左上角
  const dpr = Math.min(info.pixelRatio || 1, 2);

  canvas.width = Math.floor(logicalW * dpr);
  canvas.height = Math.floor(logicalH * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const storage = {
    get(key, fallback) {
      try {
        const v = tt.getStorageSync(key);
        if (v === "" || v == null) return fallback;
        return v;
      } catch (_) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        tt.setStorageSync(key, value);
      } catch (_) {}
    },
  };

  return {
    canvas,
    ctx,
    info,
    width: logicalW,
    height: logicalH,
    pixelRatio: dpr,
    storage,
    safeArea: info.safeArea || {
      top: 0,
      left: 0,
      right: logicalW,
      bottom: logicalH,
      width: logicalW,
      height: logicalH,
    },
  };
}

module.exports = { createPlatform };
