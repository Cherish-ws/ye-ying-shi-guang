# 夜萤拾光 · 抖音小游戏

## 立刻预览

1. 用抖音开发者工具打开本目录 `douyin/`
2. 点 **编译**
3. 应看到标题「夜萤拾光」+「开始夜行」
4. 点开始后：左下摇杆，右下闪耀/光脉/冲刺

若只有星空没有按钮：看 Console 是否有 `[ui]` / `[firefly]`，把日志发来。

## 目录

```
douyin/
  game.json           # 竖屏配置
  game.js             # 入口（canvas + DOM 桥 + 每帧 UI）
  js/platform.js      # tt 存档 / 画布 / DPR
  js/dom-bridge.js    # 无 DOM 时 Canvas 绘制 UI
  js/firefly.js       # 游戏逻辑（与根目录 game.js 同步）
  project.config.json # 填真实 appid
  README.md
```

## 同步游戏逻辑

根目录改了 `game.js` 后：

```powershell
Copy-Item ..\game.js js\firefly.js -Force
```

## 上线前

- 开放平台创建小游戏，把 AppID 写入 `project.config.json`
- 软著 / 隐私政策 / 适龄提示按审核要求补
- 真机测摇杆与性能

## 极速模式

标题页选「极速 · 3分钟」，适合抖音短局。
