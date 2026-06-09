import { PluginManifest } from 'obsidian';

// ==================== 类型定义 ====================

export interface VaultConfig {
	locale?: string;
}

export interface PluginsContainer {
	manifests?: Record<string, PluginManifest>;
}

export type Language = 'zh' | 'en' | 'ja' | 'ko' | 'de' | 'ru' | 'es' | 'fr';

export interface SidebarAction {
	element: HTMLElement;
	pluginId: string;
	pluginName: string;
	actionName: string;
	icon: string;
	actionId: string;
}

export interface CustomGroup {
	id: string;
	name: string;
	icon: string;
	actionIds: string[];
	order: number;
	autoGroup?: boolean;
}

export interface SidebarOrganizerSettings {
	enabled: boolean;
	blurEffect: boolean;
	blurIntensity: number;
	customGroups: CustomGroup[];
	language: string;
}

export const DEFAULT_SETTINGS: SidebarOrganizerSettings = {
	enabled: true,
	blurEffect: true,
	blurIntensity: 16,
	customGroups: [],
	language: 'auto',
};
