# Changelog

## [1.7.1] - 2026-09-10

### 🐛 修复 Fixes

- 修复社区审核警告（obsidianmd/no-unsupported-api）：`getLanguage()`（Obsidian 1.8.7+ 的公开 API）改用 `requireApiVersion('1.8.7')` 运行时守卫调用；`minAppVersion` 继续保持 0.15.0，旧版本行为与回退链完全不变

## [1.7.0] - 2026-09-10

### ✨ 新增 Features

- **快捷键徽标**：弹出菜单中每个功能项右侧直接显示已绑定的快捷键（macOS / iOS 显示 ⌘⇧P 符号风格，Windows / Linux 显示 Ctrl + Shift + P 文字风格；未绑定快捷键的功能不显示）
- **分组数据稳定化与自动迁移**：分组记录改用稳定的命令 ID（`cmd:<命令id>`），切换 Obsidian 界面语言后分组不再失效或重复；v1.0 以来所有历史格式的配置在插件加载时自动迁移，无需手动重新配置

### 🐛 修复 Fixes

- 修复切换界面语言后分组内项目重复堆积的问题（单个分组曾出现 14 条重复项）
- 修复界面语言选择「自动」时不跟随 Obsidian 实际语言、始终回退英语的问题（此前读取的 `app.vault.config.locale` 通常为空）
- 修复功能名称在词内连字符处被错误截断（`Read-only mode` 不再被解析成 `only mode`）

### 🧹 其他 Other

- 设置页重新整理：新增「通用」分类（启用开关 / 界面语言 / 刷新侧边栏）；外观设置改为「开关 + 从属滑块」成对排列并统一显隐逻辑；补充液态玻璃与毛玻璃的互斥说明
- README 移除未实际提供的「Auto Grouping」说明（四种语言）
- 回归测试补充数据迁移、标签解析、快捷键格式化用例；发布流水线增加测试门禁与 tag / manifest 版本一致性校验，并将 tag 触发限制为版本号格式

## [1.6.3] - 2026-08-06

### 🐛 修复 Fixes

- 修复第三方插件（如 enhance.js）patch `createEl` 后导致弹窗无法创建的问题：弹窗根节点与液态玻璃 canvas 恢复使用原生 `document.createElement`

## [1.6.1] - 2026-08-06

### 🧹 其他 Other

- 通过社区插件审核检查：液态玻璃滤镜容器内联样式改为 CSS 类（`sidebar-organizer-lg-filter`），清理不必要的类型断言 / `!` 断言 / `!important`，移除未使用的 `builtin-modules` 依赖
- 新增 GitHub Actions 发布流水线（含构建溯源 attestation）

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

## [1.7.1] - 2026-09-10

### 🐛 Fixes

- Fixed a community review warning (obsidianmd/no-unsupported-api): `getLanguage()` (a public API added in Obsidian 1.8.7) is now called behind a `requireApiVersion('1.8.7')` runtime guard; `minAppVersion` stays at 0.15.0 and older versions keep the exact same fallback chain

## [1.7.0] - 2026-09-10

### ✨ Features

- **Hotkey badges**: each action row in the popup now shows its bound keyboard shortcut (⌘⇧P symbol style on macOS/iOS, Ctrl + Shift + P text style on Windows/Linux; no badge when unbound)
- **Stable action IDs with automatic migration**: groups are stored against stable command IDs (`cmd:<command-id>`), so they no longer break or duplicate when switching the Obsidian interface language; configs in every historical format since v1.0 are migrated automatically on load

### 🐛 Fixes

- Fixed grouped entries piling up after switching the interface language (a single group could show 14 duplicated entries)
- Fixed the "Auto" language option not following the Obsidian interface language and always falling back to English (it previously read the usually-empty `app.vault.config.locale`)
- Fixed action labels being truncated at word-internal hyphens (`Read-only mode` is no longer parsed as `only mode`)

### 🧹 Other

- Reorganized settings: new "General" section (enable toggle / language / refresh sidebar); appearance options now pair each toggle with its dependent slider and share one visibility rule; clarified that liquid glass overrides the blur effect
- README: removed the non-existent "Auto Grouping" description (all four languages)
- Added regression tests for data migration, label parsing and hotkey formatting; the release workflow now runs the test suite, verifies the tag matches `manifest.json`, and only triggers on version-format tags

## [1.6.3] - 2026-08-06

### 🐛 Fixes

- Fixed popup creation breaking when a third-party plugin (e.g. enhance.js) patches `createEl`: popup root and liquid-glass canvas go back to native `document.createElement`

## [1.6.1] - 2026-08-06

### 🧹 Other

- Addressed community plugin review: inline style of the liquid-glass filter container replaced with a CSS class (`sidebar-organizer-lg-filter`), removed unnecessary type/`!` assertions and `!important`, dropped the unused `builtin-modules` dependency
- Added GitHub Actions release workflow with build provenance attestations

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
