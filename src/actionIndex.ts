// ==================== 分组内功能 ID 的稳定化与别名解析 ====================
// 历史版本的 actionId 由「本地化显示名」生成，切换 Obsidian 应用语言后
// 全部失效；用户重新配置一次就会在数据里留下新旧两套 id（数量翻倍）。
// 这里提供：
//   1) 稳定 id 前缀（cmd:<命令 id>，跨语言不变）；
//   2) 名称签名别名解析（兼容旧格式 id，如 "-:打开快速切换"、"a-b:a-b"）；
//   3) 失效旧 id 的清理判定。

/** 命令型稳定 actionId 前缀：cmd:<命令 id> */
export const COMMAND_ACTION_PREFIX = 'cmd:';

/** 由命令 id 生成稳定的 actionId（命令 id 不随界面语言变化） */
export function commandActionId(commandId: string): string {
	return COMMAND_ACTION_PREFIX + commandId;
}

/** 名称签名：小写、去空格与标点，仅保留 Unicode 字母/数字，用于跨格式别名比对 */
export function normalizeSignature(value: string): string {
	return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

/**
 * 判断是否为历史「无插件归属」的失效 id（如 "-:打开快速切换"）。
 * 这类 id 的插件前缀不含任何字母/数字（非 ASCII 名称全部被替换成 '-'），
 * 解析不到对应 action 时即可安全清理。
 */
export function isLegacyFallbackId(storedId: string): boolean {
	const colon = storedId.indexOf(':');
	if (colon <= 0) return false;
	return !/[a-z0-9]/i.test(storedId.slice(0, colon));
}

export interface AliasableAction {
	actionId: string;
	legacyId: string;
	actionName: string;
}

/**
 * 解析失败的存储 id 是否值得保留：
 * - cmd: 稳定 id（命令可能暂时不可用）→ 保留；
 * - 无冒号的早期裸 id（v1.0~v1.5，如 dataView 或显示名 slug）→ 保留（无法归属插件，宁可留不误删）；
 * - 前缀是已安装插件的 id（插件可能被禁用/未加载）→ 保留；
 * - 其余（换语言残留的旧格式 id）→ 可清理。
 */
export function shouldKeepUnresolvedId(storedId: string, installedIds: { has(id: string): boolean }): boolean {
	if (!storedId) return false;
	if (storedId.startsWith(COMMAND_ACTION_PREFIX)) return true;
	const colon = storedId.indexOf(':');
	if (colon === -1) return true; // 早期裸 id（dataView / 显示名 slug）：无法归属，保留
	if (colon === 0) return false; // 畸形 id（以冒号开头）：清理
	return installedIds.has(storedId.slice(0, colon));
}

export interface ActionAliasIndex<T extends AliasableAction> {
	byId: Map<string, T>;
	bySignature: Map<string, T>;
}

/** 构建别名索引：精确 id（actionId / legacyId）+ 名称签名 */
export function buildActionAliasIndex<T extends AliasableAction>(actions: T[]): ActionAliasIndex<T> {
	const byId = new Map<string, T>();
	const bySignature = new Map<string, T>();

	for (const action of actions) {
		if (action.actionId && !byId.has(action.actionId)) byId.set(action.actionId, action);
		if (action.legacyId && !byId.has(action.legacyId)) byId.set(action.legacyId, action);

		const signature = normalizeSignature(action.actionName);
		if (signature && !bySignature.has(signature)) bySignature.set(signature, action);
	}

	return { byId, bySignature };
}

/**
 * 将存储的 actionId 解析为当前 action，兼容全部历史格式：
 * - 新格式：cmd:<命令 id>（仅精确匹配）
 * - v1.6.x：pluginId:baseId（baseId = dataView 或显示名 slug）→ 后缀直接命中 legacyId / 名称签名
 * - v1.0 ~ v1.5：裸 id（dataView 或显示名 slug）→ 精确命中 legacyId / 名称签名
 */
export function resolveStoredActionId<T extends AliasableAction>(
	storedId: string,
	index: ActionAliasIndex<T>
): T | null {
	const direct = index.byId.get(storedId);
	if (direct) return direct;
	if (!storedId || storedId.startsWith(COMMAND_ACTION_PREFIX)) return null;

	const colon = storedId.indexOf(':');
	const suffix = colon >= 0 ? storedId.slice(colon + 1) : storedId;

	// 中间格式 "pluginId:baseId"：baseId 可能是 dataView（不是显示名 slug），
	// 签名匹配不到，但 legacyId 就是 baseId，用后缀可直接命中
	if (suffix !== storedId) {
		const byLegacy = index.byId.get(suffix);
		if (byLegacy) return byLegacy;
	}

	for (const candidate of [storedId, suffix]) {
		const signature = normalizeSignature(candidate);
		if (!signature) continue;
		const hit = index.bySignature.get(signature);
		if (hit) return hit;
	}
	return null;
}
