// 最小测试集：i18n 8 语言 key 一致性 + 翻译行为 + extractActionLabel
// 运行：npm test
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import esbuild from 'esbuild';

// ---- 1. i18n 各语言块 key 集合一致性（直接解析源码）----
const src = readFileSync(new URL('../src/i18n.ts', import.meta.url), 'utf-8');
const blockRe = /^\t(\w+): \{([\s\S]*?)^\t\},$/gm;
const blocks = [...src.matchAll(blockRe)].map(m => [m[1], m[2]]);
assert.ok(blocks.length >= 8, `expected >=8 language blocks, got ${blocks.length}`);

const keySets = blocks.map(([, body]) => new Set(
	[...body.matchAll(/^\t\t(\w+):/gm)].map(m => m[1])
));
const base = keySets[0];
for (let i = 1; i < keySets.length; i++) {
	const diff = [...base].filter(k => !keySets[i].has(k));
	assert.deepEqual(diff, [], `language block ${i} missing keys`);
	const extra = [...keySets[i]].filter(k => !base.has(k));
	assert.deepEqual(extra, [], `language block ${i} has extra keys`);
}

// ---- 2. bundle 后行为测试（i18n / sidebar / hotkeys / actionIndex 均无外部依赖）----
const dir = mkdtempSync(join(tmpdir(), 'sso-test-'));
try {
	await esbuild.build({
		entryPoints: ['src/i18n.ts', 'src/sidebar.ts', 'src/hotkeys.ts', 'src/actionIndex.ts'],
		bundle: true,
		format: 'esm',
		outdir: dir,
		logLevel: 'silent',
	});
	const i18n = await import(pathToFileURL(join(dir, 'i18n.js')).href);
	const sidebar = await import(pathToFileURL(join(dir, 'sidebar.js')).href);
	const hotkeys = await import(pathToFileURL(join(dir, 'hotkeys.js')).href);
	const actionIndex = await import(pathToFileURL(join(dir, 'actionIndex.js')).href);

	// getLanguageCode
	assert.equal(i18n.getLanguageCode('zh-CN'), 'zh');
	assert.equal(i18n.getLanguageCode('zh-TW'), 'zh');
	assert.equal(i18n.getLanguageCode('ZH'), 'zh');
	assert.equal(i18n.getLanguageCode('en-US'), 'en');
	assert.equal(i18n.getLanguageCode('fr'), 'fr');
	assert.equal(i18n.getLanguageCode('xx'), 'en');

	// getPluginLanguage：auto 跟随 Obsidian 界面语言，显式选择优先
	assert.equal(i18n.getPluginLanguage({ language: 'auto' }, 'zh'), 'zh');
	assert.equal(i18n.getPluginLanguage({ language: 'auto' }, 'de-DE'), 'de');
	assert.equal(i18n.getPluginLanguage({ language: 'auto' }, undefined), 'en');
	assert.equal(i18n.getPluginLanguage({ language: 'ja' }, 'de'), 'ja');

	// translate：参数替换 + 缺失 key 回退
	assert.equal(i18n.translate('zh', 'blurIntensityDesc', { value: 12 }), '调整背景模糊程度 (当前: 12px)');
	assert.equal(i18n.translate('de', 'groupName'), 'Gruppenname');
	assert.equal(i18n.translate('ja', 'missing-key-xyz'), 'missing-key-xyz');

	// extractActionLabel
	assert.equal(sidebar.extractActionLabel('Obsidian Git: Open commit'), 'Open commit');
	assert.equal(sidebar.extractActionLabel('模板：插入日期'), '插入日期');
	assert.equal(sidebar.extractActionLabel('no separator'), 'no separator');
	assert.equal(sidebar.extractActionLabel('A - B - C'), 'B - C');
	// 词内连字符不应被切成两半；带空格的连字符仍是分隔符；冒号优先级更高
	assert.equal(sidebar.extractActionLabel('Read-only mode'), 'Read-only mode');
	assert.equal(sidebar.extractActionLabel('well-known'), 'well-known');
	assert.equal(sidebar.extractActionLabel('Read-only mode: Enable'), 'Enable');
	assert.equal(sidebar.extractActionLabel('well-known - plugin'), 'plugin');
	assert.equal(sidebar.extractActionLabel('A – B'), 'B');

	// ---- hotkeys：格式化 ----
	assert.equal(hotkeys.formatHotkey({ modifiers: ['Mod'], key: 'k' }, true), '⌘ K');
	assert.equal(hotkeys.formatHotkey({ modifiers: ['Shift', 'Mod'], key: 'p' }, true), '⌘ ⇧ P');
	assert.equal(hotkeys.formatHotkey({ modifiers: ['Meta', 'Mod'], key: 'k' }, true), '⌘ K');
	assert.equal(hotkeys.formatHotkey({ modifiers: ['Mod'], key: 'Enter' }, true), '⌘ ↩');
	assert.equal(hotkeys.formatHotkey({ modifiers: ['Mod', 'Shift'], key: 'p' }, false), 'Ctrl + Shift + P');
	assert.equal(hotkeys.formatHotkey({ modifiers: [], key: ' ' }, false), 'Space');
	assert.equal(hotkeys.formatHotkey({ modifiers: [], key: '' }, true), '');

	// ---- hotkeys：命令匹配与解析 ----
	const commands = {
		'app:quick-switcher': { id: 'app:quick-switcher', name: 'Quick switcher' },
		'obsidian-git:commit': { id: 'obsidian-git:commit', name: 'Commit', hotkeys: [{ modifiers: ['Mod'], key: 'k' }] },
		'other-plugin:commit': { id: 'other-plugin:commit', name: 'Commit' },
	};
	assert.equal(hotkeys.matchCommand('commit', 'other-plugin', commands).id, 'other-plugin:commit');
	assert.equal(hotkeys.matchCommand('Quick switcher', '', commands).id, 'app:quick-switcher');
	assert.equal(hotkeys.matchCommand('Git: Commit', 'obsidian-git', commands).id, 'obsidian-git:commit');
	assert.equal(hotkeys.matchCommand('xyzzy', '', commands), null);

	// findExactCommand：只做精确匹配（用于生成稳定 actionId，不允许宽松匹配）
	assert.equal(hotkeys.findExactCommand('Quick switcher', '', commands).id, 'app:quick-switcher');
	assert.equal(hotkeys.findExactCommand('Git: Commit', 'obsidian-git', commands).id, 'obsidian-git:commit');
	assert.equal(hotkeys.findExactCommand('comm', '', commands), null);
	assert.equal(hotkeys.findExactCommand('xyzzy', '', commands), null);

	// 真实注册格式：命令名带「分类/插件名: 」前缀，ribbon 的 aria-label 不带 —— 剥前缀后需精确命中
	const prefixed = {
		'switcher:open': { id: 'switcher:open', name: 'Quick switcher: Open quick switcher' },
		'graph:open': { id: 'graph:open', name: 'Graph view: Open graph view' },
		'canvas:new-file': { id: 'canvas:new-file', name: 'Canvas: Create new canvas' },
	};
	assert.equal(hotkeys.findExactCommand('Open quick switcher', '', prefixed).id, 'switcher:open');
	assert.equal(hotkeys.findExactCommand('Open graph view', '', prefixed).id, 'graph:open');
	assert.equal(hotkeys.findExactCommand('Create new canvas', '', prefixed).id, 'canvas:new-file');
	assert.equal(hotkeys.findExactCommand('Quick switcher', '', prefixed), null);

	const managed = (id) => id === 'obsidian-git:commit'
		? [{ modifiers: ['Mod', 'Shift'], key: 'p' }]
		: null;
	// hotkeyManager 的实际绑定优先
	assert.deepEqual(
		hotkeys.resolveActionHotkey('Git: Commit', 'obsidian-git', commands, managed),
		{ modifiers: ['Mod', 'Shift'], key: 'p' }
	);
	// 无 manager 时回退到命令对象上的 hotkeys
	assert.deepEqual(
		hotkeys.resolveActionHotkey('Commit', 'obsidian-git', commands),
		{ modifiers: ['Mod'], key: 'k' }
	);
	assert.equal(hotkeys.resolveActionHotkey('xyzzy', '', commands), null);

	// ---- actionIndex：稳定 id 与旧格式别名解析 ----
	assert.equal(actionIndex.normalizeSignature("Open today's daily note"), 'opentodaysdailynote');
	assert.equal(actionIndex.normalizeSignature('打开快速切换'), '打开快速切换');

	assert.equal(actionIndex.isLegacyFallbackId('-:打开快速切换'), true);
	assert.equal(actionIndex.isLegacyFallbackId(':空前缀'), false);
	assert.equal(actionIndex.isLegacyFallbackId('open-quick-switcher:open-quick-switcher'), false);
	assert.equal(actionIndex.isLegacyFallbackId('cmd:app:quick-switcher'), false);
	assert.equal(actionIndex.isLegacyFallbackId('打开快速切换'), false);

	const quickSwitcher = {
		actionId: 'cmd:app:quick-switcher',
		legacyId: 'open-quick-switcher',
		actionName: 'Open quick switcher',
	};
	const graphView = {
		actionId: 'cmd:app:graph:open',
		legacyId: 'open-graph-view',
		actionName: 'Open graph view',
	};
	const aliasIndex = actionIndex.buildActionAliasIndex([quickSwitcher, graphView]);
	// 精确 id / legacyId / 旧格式（换语言前保存的 "name:name"）都能解析到同一 action
	assert.equal(actionIndex.resolveStoredActionId('cmd:app:quick-switcher', aliasIndex), quickSwitcher);
	assert.equal(actionIndex.resolveStoredActionId('open-quick-switcher', aliasIndex), quickSwitcher);
	assert.equal(
		actionIndex.resolveStoredActionId('open-quick-switcher:open-quick-switcher', aliasIndex),
		quickSwitcher
	);
	assert.equal(actionIndex.resolveStoredActionId('other-plugin:unknown-action', aliasIndex), null);
	assert.equal(actionIndex.resolveStoredActionId('cmd:app:not-installed', aliasIndex), null);

	// 中文旧格式 id 在同语言下可解析（跨语言无法解析属预期降级）
	const zhAction = { actionId: 'cmd:app:zh', legacyId: '打开快速切换', actionName: '打开快速切换' };
	const zhIndex = actionIndex.buildActionAliasIndex([zhAction]);
	assert.equal(actionIndex.resolveStoredActionId('-:打开快速切换', zhIndex), zhAction);
	assert.equal(actionIndex.resolveStoredActionId('cmd:app:zh', zhIndex), zhAction);
	// v1.0~v1.5.7 裸 id（无前缀、无 pluginId）
	assert.equal(actionIndex.resolveStoredActionId('打开快速切换', zhIndex), zhAction);

	// dataView 型历史 id：baseId 是 dataView，不是显示名 slug（名称签名匹配不到，靠后缀命中 legacyId）
	const viewAction = { actionId: 'cmd:graph:open-view', legacyId: 'view.graph', actionName: 'Graph View' };
	const viewIndex = actionIndex.buildActionAliasIndex([viewAction]);
	assert.equal(actionIndex.resolveStoredActionId('view.graph', viewIndex), viewAction); // v1.0~v1.5.7 裸 dataView
	assert.equal(actionIndex.resolveStoredActionId('graph-view:view.graph', viewIndex), viewAction); // v1.6.x pluginId:dataView

	// 保留/清理判定
	const installedIds = new Set(['sidebar-organizer']);
	assert.equal(actionIndex.shouldKeepUnresolvedId('cmd:switcher:open', installedIds), true);
	assert.equal(actionIndex.shouldKeepUnresolvedId('obsidian-git:commit', new Set(['obsidian-git'])), true);
	assert.equal(actionIndex.shouldKeepUnresolvedId('obsidian-git:commit', installedIds), false);
	assert.equal(actionIndex.shouldKeepUnresolvedId('-:打开快速切换', installedIds), false);
	// v1.0~v1.5 的裸 id：无法归属插件，一律保留（避免误删）
	assert.equal(actionIndex.shouldKeepUnresolvedId('打开快速切换', installedIds), true);
	assert.equal(actionIndex.shouldKeepUnresolvedId('view.graph', installedIds), true);
	assert.equal(actionIndex.shouldKeepUnresolvedId('', installedIds), false);

	// 回归（实测场景）：切换语言后新旧两套脏 id 应整体归一到 7 条稳定 id，旧格式残留被清理
	const dirtyActions = [
		{ actionId: 'cmd:switcher:open', legacyId: '打开快速切换', actionName: '打开快速切换' },
		{ actionId: 'cmd:graph:open', legacyId: '查看关系图谱', actionName: '查看关系图谱' },
		{ actionId: 'cmd:canvas:new-file', legacyId: '新建白板', actionName: '新建白板' },
		{ actionId: 'cmd:daily-notes', legacyId: '打开/创建今天的日记', actionName: '打开/创建今天的日记' },
		{ actionId: 'cmd:templates:insert', legacyId: '插入模板', actionName: '插入模板' },
		{ actionId: 'cmd:command-palette:open', legacyId: '打开命令面板', actionName: '打开命令面板' },
		{ actionId: 'cmd:bases:create', legacyId: '新建数据库', actionName: '新建数据库' },
	];
	const dirtyIndex = actionIndex.buildActionAliasIndex(dirtyActions);
	const dirtyStoredIds = [
		'open-quick-switcher:open-quick-switcher',
		'open-graph-view:open-graph-view',
		'create-new-canvas:create-new-canvas',
		"open-today-s-daily-note:open-today's-daily-note",
		'insert-template:insert-template',
		'open-command-palette:open-command-palette',
		'create-new-base:create-new-base',
		'-:打开快速切换',
		'-:查看关系图谱',
		'-:新建白板',
		'-:打开/创建今天的日记',
		'-:插入模板',
		'-:打开命令面板',
		'-:新建数据库',
	];
	const migrated = [];
	const migratedSeen = new Set();
	for (const id of dirtyStoredIds) {
		const hit = actionIndex.resolveStoredActionId(id, dirtyIndex);
		if (hit) {
			if (!migratedSeen.has(hit.actionId)) {
				migratedSeen.add(hit.actionId);
				migrated.push(hit.actionId);
			}
		} else if (actionIndex.shouldKeepUnresolvedId(id, installedIds)) {
			migrated.push(id);
		}
	}
	assert.deepEqual(migrated, dirtyActions.map(a => a.actionId));

	console.log(`OK: ${blocks.length} language blocks consistent, ${keySets[0].size} keys each`);
} finally {
	rmSync(dir, { recursive: true, force: true });
}
