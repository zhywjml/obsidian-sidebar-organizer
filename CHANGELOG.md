# Changelog

## [1.6.0] - 2026-08-06

### ✨ 新增 Features

- **液态玻璃效果 (Liquid Glass)**：基于 SVG `feDisplacementMap` 的**边缘折射**渲染，弹出菜单像真实液态玻璃一样折射背景内容，并带可调节的模糊强度滑块（实验性，默认关闭）
- **水滴动效 (Water Drop)**：弹出菜单以水滴形态凝聚展开、收缩消失（默认关闭）
- **圆角弹窗**：圆角开关 + 半径滑块（0–24px，默认 12px 圆角开启）
- **设置页整理**：新增「弹出菜单外观」分类，毛玻璃 / 圆角 / 液态玻璃 / 水滴动效集中管理；「刷新侧边栏」移入通用区
- 按 **Esc** 键关闭弹出菜单

### 🐛 修复 Fixes

- 桌面端点击分组图标会误触发该组第一个功能 → 现在点击打开菜单（与移动端行为一致）
- 修复 250ms 隐藏窗口期内快速移动鼠标/点击被吞掉的问题
- 修复插件禁用/卸载竞态：延迟定时器与 MutationObserver 在卸载后不再复活
- 修复 Obsidian 1.13+ 设置页独立窗口导致桌面 ribbon 图标检测不到（改用 `workspace.containerEl.ownerDocument`）
- 修复左、右两侧 ribbon 的分组图标不合并的问题
- 修复分组图标被错误渲染为实心（毛玻璃 SVG 颜色处理逻辑）
- 修复分组图标悬浮时 Obsidian 原生 tooltip 与弹出菜单重叠
- 删除分组改为**两次点击确认**，不再使用系统弹窗

### 🔒 安全 Security

- SVG 消毒加固：移除 `on*` 事件属性、`script`/`foreignObject` 元素、`javascript:` 链接

### 🧹 其他 Other

- 清理死代码与废弃 CSS；收紧 tsconfig（`noUnusedLocals` 等）
- 新增 i18n 八语言 key 一致性测试（`npm test`）
- 升级 esbuild → 0.25.x、TypeScript → 5.x
- README 补充说明：本插件修改的是 Obsidian 的 **ribbon** 而非 sidebar
- `minAppVersion` 保持 0.15.0 不变

---

# Changelog

## [1.6.0] - 2026-08-06

### ✨ Features

- **Liquid Glass effect**: real **edge refraction** via SVG `feDisplacementMap`, the popup refracts the background like actual liquid glass, with adjustable blur slider (experimental, off by default)
- **Water Drop animation**: popup expands/shrinks like a water drop (off by default)
- **Rounded popup**: toggle + radius slider (0–24px, default 12px with rounded on)
- **Settings reorganization**: new "Popup Appearance" section groups blur / rounded corners / liquid glass / water drop; "Refresh Sidebar" moved to the general area
- Press **Esc** to close the popup menu

### 🐛 Fixes

- Desktop click on a grouped icon no longer triggers the group's first action — it opens the menu now (consistent with mobile)
- Fixed hover/clicks being swallowed during the 250ms hide window
- Fixed unload race: delayed timers and MutationObserver no longer resurrect after plugin disable/unload
- Fixed desktop ribbon not detected when settings open in a separate window (Obsidian 1.13+) — now uses `workspace.containerEl.ownerDocument`
- Fixed groups not merging across left/right ribbons
- Fixed grouped icons rendered solid (SVG color sanitization logic)
- Fixed Obsidian native tooltip overlapping the popup on grouped icons
- Deleting a group now uses a **two-click confirmation** instead of a system dialog

### 🔒 Security

- Hardened SVG sanitization: strips `on*` handlers, `script`/`foreignObject` elements, `javascript:` hrefs

### 🧹 Other

- Removed dead code and unused CSS; tightened tsconfig (`noUnusedLocals`, etc.)
- Added i18n 8-language key consistency test (`npm test`)
- Upgraded esbuild → 0.25.x, TypeScript → 5.x
- README clarifies the plugin modifies the Obsidian **ribbon**, not the sidebar
- `minAppVersion` stays 0.15.0
