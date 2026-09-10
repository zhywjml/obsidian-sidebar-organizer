// ==================== 快捷键解析与格式化 ====================
// 数据来源为 Obsidian 未公开的运行时 API（app.commands / app.hotkeyManager），
// 读取失败时静默降级为「不显示」，不影响弹窗本身。

import type { CommandEntry, HotkeyBinding } from './types';
import { extractActionLabel } from './sidebar';

/** 名称归一化：去首尾空白并转小写，用于命令名匹配 */
function normalizeName(value: string): string {
	return value.trim().toLowerCase();
}

/** 候选名：完整显示名 + 剥离「插件名: 」前缀后的短名，去重 */
function nameCandidates(displayName: string): string[] {
	const candidates: string[] = [];
	for (const name of [displayName, extractActionLabel(displayName)]) {
		const trimmed = name.trim();
		if (trimmed && !candidates.includes(trimmed)) candidates.push(trimmed);
	}
	return candidates;
}

function isSamePluginCommand(command: CommandEntry, pluginId: string): boolean {
	return !!pluginId && (command.id === pluginId || command.id.startsWith(`${pluginId}:`));
}

/**
 * 去掉命令名中的「插件/分类名: 」前缀。
 * Obsidian 注册命令时会统一加前缀（内部插件与社区插件都一样），
 * 如 "Quick switcher: Open quick switcher"，而 ribbon 图标的 aria-label
 * 只有后半段 "Open quick switcher"，因此精确匹配需要先剥前缀。
 */
function stripCommandPrefix(name: string): string {
	const trimmed = name.trim();
	const match = trimmed.match(/^[^:：]+[:：]\s*(.+)$/);
	return match ? match[1].trim() : trimmed;
}

function commandEntries(commands: Record<string, CommandEntry>): CommandEntry[] {
	return Object.values(commands).filter(
		(c): c is CommandEntry => !!c && typeof c.name === 'string' && c.name.trim().length > 0
	);
}

/**
 * 严格匹配：命令名完全相等（含自动剥离「插件名: 」前缀后再比一次）。
 * 用于生成稳定 actionId 与快捷键解析，不做宽松匹配以免张冠李戴。
 */
export function findExactCommand(
	displayName: string,
	pluginId: string,
	commands: Record<string, CommandEntry>
): CommandEntry | null {
	const entries = commandEntries(commands);
	for (const name of nameCandidates(displayName)) {
		const target = normalizeName(name);
		if (!target) continue;
		const exact = entries.filter(c =>
			normalizeName(c.name) === target || normalizeName(stripCommandPrefix(c.name)) === target
		);
		const hit = exact.find(c => isSamePluginCommand(c, pluginId)) ?? exact[0];
		if (hit) return hit;
	}
	return null;
}

/** 宽松匹配：子串包含（目标名 >= 2 字符），同插件优先、长名优先减少误配 */
export function findLooseCommand(
	displayName: string,
	pluginId: string,
	commands: Record<string, CommandEntry>
): CommandEntry | null {
	const byLengthDesc = commandEntries(commands).sort((a, b) => b.name.length - a.name.length);

	for (const name of nameCandidates(displayName)) {
		const target = normalizeName(name);
		if (target.length < 2) continue;
		const loose = byLengthDesc.filter(c => {
			const commandName = normalizeName(c.name);
			return commandName.includes(target) || target.includes(commandName);
		});
		const hit = loose.find(c => isSamePluginCommand(c, pluginId)) ?? loose[0];
		if (hit) return hit;
	}
	return null;
}

/** 在命令注册表中按显示名匹配命令：精确优先，宽松兜底 */
export function matchCommand(
	displayName: string,
	pluginId: string,
	commands: Record<string, CommandEntry>
): CommandEntry | null {
	return findExactCommand(displayName, pluginId, commands) ?? findLooseCommand(displayName, pluginId, commands);
}

/**
 * 解析某个侧边栏功能对应的快捷键（取第一条绑定）。
 * 命中命令后：hotkeyManager 的实际绑定优先，其次命令对象自带的 hotkeys。
 */
export function resolveActionHotkey(
	displayName: string,
	pluginId: string,
	commands: Record<string, CommandEntry>,
	getHotkeys?: (commandId: string) => HotkeyBinding[] | null
): HotkeyBinding | null {
	const command = findExactCommand(displayName, pluginId, commands) ??
		findLooseCommand(displayName, pluginId, commands);
	if (!command) return null;
	const managed = getHotkeys?.(command.id);
	const bound = managed && managed.length > 0 ? managed : command.hotkeys;
	return bound && bound.length > 0 ? bound[0] : null;
}

// ---- 快捷键文本格式化 ----

const MODIFIER_ORDER = ['mod', 'meta', 'cmd', 'command', 'ctrl', 'control', 'alt', 'opt', 'option', 'shift'];

const MAC_MODIFIER_SYMBOLS: Record<string, string> = {
	mod: '\u2318', meta: '\u2318', cmd: '\u2318', command: '\u2318',
	ctrl: '\u2303', control: '\u2303',
	alt: '\u2325', opt: '\u2325', option: '\u2325',
	shift: '\u21E7',
};

const PC_MODIFIER_LABELS: Record<string, string> = {
	mod: 'Ctrl', ctrl: 'Ctrl', control: 'Ctrl', cmd: 'Ctrl', command: 'Ctrl',
	meta: 'Meta',
	alt: 'Alt', opt: 'Alt', option: 'Alt',
	shift: 'Shift',
};

const MAC_KEY_SYMBOLS: Record<string, string> = {
	enter: '↩', return: '↩',
	backspace: '⌫',
	delete: '⌦', del: '⌦',
	tab: '⇥',
	escape: '⎋', esc: '⎋',
	arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→',
	up: '↑', down: '↓', left: '←', right: '→',
	' ': 'Space', space: 'Space', spacebar: 'Space',
	pageup: 'PgUp', pagedown: 'PgDn',
	home: 'Home', end: 'End',
};

const PC_KEY_LABELS: Record<string, string> = {
	enter: 'Enter', return: 'Enter',
	backspace: 'Backspace',
	delete: 'Del', del: 'Del',
	tab: 'Tab',
	escape: 'Esc', esc: 'Esc',
	arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→',
	up: '↑', down: '↓', left: '←', right: '→',
	' ': 'Space', space: 'Space', spacebar: 'Space',
	pageup: 'PgUp', pagedown: 'PgDn',
	home: 'Home', end: 'End',
};

function formatKey(key: string, isMac: boolean): string {
	if (!key) return '';
	const special = (isMac ? MAC_KEY_SYMBOLS : PC_KEY_LABELS)[key.toLowerCase()];
	if (special) return special;
	const trimmed = key.trim();
	if (!trimmed) return '';
	return trimmed.length === 1 ? trimmed.toUpperCase() : trimmed;
}

/**
 * 将一条快捷键格式化为展示文本。
 * macOS：符号风格，如 "⌘ ⇧ P"；其他平台：文字风格，如 "Ctrl + Shift + P"。
 */
export function formatHotkey(hotkey: HotkeyBinding, isMac: boolean): string {
	if (!hotkey || !hotkey.key) return '';
	const key = formatKey(hotkey.key, isMac);
	if (!key) return '';

	const rawModifiers = Array.isArray(hotkey.modifiers) ? hotkey.modifiers : [];
	const ordered = [...rawModifiers].sort((a, b) => {
		const indexA = MODIFIER_ORDER.indexOf(normalizeName(a));
		const indexB = MODIFIER_ORDER.indexOf(normalizeName(b));
		return (indexA === -1 ? MODIFIER_ORDER.length : indexA) - (indexB === -1 ? MODIFIER_ORDER.length : indexB);
	});

	const seen = new Set<string>();
	const modifiers: string[] = [];
	for (const modifier of ordered) {
		const lower = normalizeName(modifier);
		const label = (isMac ? MAC_MODIFIER_SYMBOLS : PC_MODIFIER_LABELS)[lower] ?? modifier.trim();
		// Mod 与 Meta/Ctrl 在 macOS 上会映射为同一符号，需去重
		if (label && !seen.has(label)) {
			seen.add(label);
			modifiers.push(label);
		}
	}

	if (modifiers.length === 0) return key;
	return [...modifiers, key].join(isMac ? ' ' : ' + ');
}
