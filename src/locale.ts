// ==================== Obsidian 界面语言获取 ====================
// 历史实现读取的是 vault.config.locale（.obsidian/app.json 里的字段），
// 该字段通常为空，导致「自动」语言永远回落英语。
//
// Obsidian 的真实语言来源（按其内部实现）：
//   localStorage['language'] || navigator.language（归一化） || 'en'
// 公开 API getLanguage()（Obsidian 1.8.7+）即是上述逻辑的封装，用 requireApiVersion 守卫后调用。
// 这里按「公开 API → localStorage → 系统语言 → 旧字段」的顺序解析，兼容旧版本。

import { App, getLanguage, requireApiVersion } from 'obsidian';
import type { VaultConfig } from './types';

/**
 * 获取 Obsidian 当前界面语言（如 'zh'、'zh-TW'、'en'）。
 * 取不到时返回 undefined（调用方回落到 'en'）。
 */
export function getObsidianLocale(app: App): string | undefined {
	// getLanguage() 需要 Obsidian 1.8.7+：用 requireApiVersion 内联守卫调用。
	// 既是语义正确的运行时版本检查，也满足社区审核规则 obsidianmd/no-unsupported-api。
	if (requireApiVersion('1.8.7')) {
		try {
			const language = getLanguage();
			if (language) return language;
		} catch {
			// 防御性兜底：异常时继续走下面的回退
		}
	}

	try {
		const stored = window.localStorage.getItem('language');
		if (stored) return stored;
	} catch {
		// localStorage 不可用（极少数环境）
	}

	try {
		const navigatorLanguage = window.navigator.language;
		if (navigatorLanguage) return navigatorLanguage;
	} catch {
		// 忽略
	}

	try {
		return (app.vault as unknown as { config?: VaultConfig }).config?.locale;
	} catch {
		return undefined;
	}
}
