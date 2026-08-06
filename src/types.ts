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
	legacyId: string;
}

export interface CustomGroup {
	id: string;
	name: string;
	icon: string;
	actionIds: string[];
	order: number;
}

export interface SidebarOrganizerSettings {
	enabled: boolean;
	blurEffect: boolean;
	blurIntensity: number;
	popupRounded: boolean;
	popupRadius: number;
	liquidGlass: boolean;
	liquidGlassBlur: number;
	waterDrop: boolean;
	customGroups: CustomGroup[];
	language: string;
}

export const DEFAULT_SETTINGS: SidebarOrganizerSettings = {
	enabled: true,
	blurEffect: true,
	blurIntensity: 16,
	popupRounded: true,
	popupRadius: 12,
	liquidGlass: false,
	liquidGlassBlur: 1.5,
	waterDrop: false,
	customGroups: [],
	language: 'auto',
};
