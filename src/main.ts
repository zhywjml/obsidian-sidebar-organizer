import { App, Plugin, Notice, PluginManifest } from 'obsidian';
import { SidebarOrganizerSettings, DEFAULT_SETTINGS, SidebarAction, CustomGroup, VaultConfig, PluginsContainer, Language } from './types';
import { getPluginLanguage, translate } from './i18n';
import { parseSvg, sanitizeSvgColors, setSvgContent } from './sidebar';
import { SidebarOrganizerSettingTab } from './settings';
import { SimpleGroupModal } from './modal';

interface BoundEventHandlers {
	mouseEnter: () => void;
	mouseLeave: () => void;
}

export class SidebarOrganizerPlugin extends Plugin {
	settings!: SidebarOrganizerSettings;
	private installedPlugins: Map<string, PluginManifest> = new Map();
	private isOrganizing = false;
	private popupEl: HTMLElement | null = null;
	private hideTimeout: number | null = null;
	private showTimeout: number | null = null;
	private boundElements: Map<HTMLElement, BoundEventHandlers> = new Map();
	private popupMouseEnterHandler: (() => void) | null = null;
	private popupMouseLeaveHandler: (() => void) | null = null;
	private mutationObserver: MutationObserver | null = null;
	private observerDebounceTimer: number | null = null;
	private hoveredIconEl: HTMLElement | null = null;
	private popupHovered = false;
	private isHiding = false;
	private currentPopupAnchor: HTMLElement | null = null;

	t(key: string, params?: Record<string, string | number>): string {
		const vaultConfig = (this.app.vault as unknown as { config?: VaultConfig }).config;
		const lang = getPluginLanguage(this.settings, vaultConfig?.locale);
		return translate(lang, key, params);
	}

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SidebarOrganizerSettingTab(this.app, this));

		this.addCommand({
			id: 'toggle',
			name: 'Toggle',
			callback: () => {
				this.settings.enabled = !this.settings.enabled;
				void this.saveSettings();
				this.applyOrganizerState();
				new Notice(`Sidebar Organizer ${this.settings.enabled ? 'enabled' : 'disabled'}`);
			}
		});

		this.addCommand({
			id: 'refresh',
			name: 'Refresh',
			callback: () => {
				this.restoreOriginalIcons();
				this.loadInstalledPlugins();
				this.organizeSidebars();
				new Notice('Sidebar refreshed');
			}
		});

		this.app.workspace.onLayoutReady(() => {
			this.loadInstalledPlugins();
			setTimeout(() => {
				if (this.settings.enabled) {
					this.organizeSidebars();
				}
				this.startMutationObserver();
			}, 1000);
		});
	}

	onunload() {
		this.stopMutationObserver();
		this.cleanupPopupHandlers();
		this.cleanupAllListeners();
		if (this.showTimeout) {
			clearTimeout(this.showTimeout);
			this.showTimeout = null;
		}
		this.restoreOriginalIcons();
	}

	private startMutationObserver(): void {
		this.stopMutationObserver();
		this.mutationObserver = new MutationObserver(() => {
			if (this.observerDebounceTimer) {
				clearTimeout(this.observerDebounceTimer);
			}
			this.observerDebounceTimer = window.setTimeout(() => {
				if (this.settings.enabled) {
					try {
						this.loadInstalledPlugins();
						this.organizeSidebars();
					} catch (e) {
						console.error('Sidebar Organizer: error during mutation re-scan', e);
					}
				}
			}, 500);
		});

		['left', 'right'].forEach(side => {
			const ribbon = document.querySelector(`.workspace-ribbon.mod-${side}`);
			if (ribbon) {
				this.mutationObserver!.observe(ribbon, { childList: true, subtree: true });
			}
		});
	}

	private stopMutationObserver(): void {
		if (this.observerDebounceTimer) {
			clearTimeout(this.observerDebounceTimer);
			this.observerDebounceTimer = null;
		}
		if (this.mutationObserver) {
			this.mutationObserver.disconnect();
			this.mutationObserver = null;
		}
	}

	private cleanupPopupHandlers(): void {
		if (this.popupMouseEnterHandler && this.popupEl) {
			this.popupEl.removeEventListener('mouseenter', this.popupMouseEnterHandler);
		}
		if (this.popupMouseLeaveHandler && this.popupEl) {
			this.popupEl.removeEventListener('mouseleave', this.popupMouseLeaveHandler);
		}
		this.popupMouseEnterHandler = null;
		this.popupMouseLeaveHandler = null;
	}

	private cleanupAllListeners(): void {
		for (const [el, handlers] of this.boundElements) {
			el.removeEventListener('mouseenter', handlers.mouseEnter);
			el.removeEventListener('mouseleave', handlers.mouseLeave);
			el.removeAttribute('data-popup-bound');
		}
		this.boundElements.clear();
		this.cleanupPopupHandlers();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	loadInstalledPlugins() {
		this.installedPlugins.clear();
		const pluginsContainer = (this.app as unknown as { plugins?: PluginsContainer }).plugins;
		const plugins = pluginsContainer?.manifests;
		if (plugins) {
			for (const [id, manifest] of Object.entries(plugins)) {
				this.installedPlugins.set(id, manifest);
			}
		}
	}

	applyOrganizerState() {
		if (this.settings.enabled) {
			this.organizeSidebars();
		} else {
			this.restoreOriginalIcons();
		}
	}

	organizeSidebars() {
		if (this.isOrganizing || !this.settings.enabled) return;
		this.isOrganizing = true;

		try {
			// Disconnect observer to prevent self-triggering during our own DOM mutations
			this.stopMutationObserver();
			this.restoreOriginalIcons();
			this.processRibbon('left');
			this.processRibbon('right');
		} finally {
			this.isOrganizing = false;
			// Reconnect observer to watch for future dynamic sidebar changes
			this.startMutationObserver();
		}
	}

	private processRibbon(side: 'left' | 'right') {
		const ribbon = document.querySelector(`.workspace-ribbon.mod-${side}`);
		if (!ribbon) return;

		const allIcons = ribbon.querySelectorAll('.side-dock-ribbon-action, .clickable-icon, .workspace-ribbon-action');
		const allActions: SidebarAction[] = [];
		const actionMap = new Map<string, SidebarAction>();

		allIcons.forEach((el) => {
			try {
				const element = el as HTMLElement;
				const action = this.identifyAction(element);
				if (!action) return;

				allActions.push(action);
				actionMap.set(action.actionId, action);
			} catch (e) {
				console.warn('Sidebar Organizer: failed to process icon', e);
			}
		});

		if (allActions.length === 0) return;

		const assignedActionIds = new Set<string>();

		// 1. 自定义分组
		const sortedCustomGroups = [...this.settings.customGroups].sort((a, b) => a.order - b.order);
		for (const customGroup of sortedCustomGroups) {
			try {
				const groupActions = customGroup.actionIds
					.map(id => actionMap.get(id))
					.filter((a): a is SidebarAction => !!a);

				if (groupActions.length === 0) continue;

				groupActions.forEach(a => assignedActionIds.add(a.actionId));

				const mainAction = groupActions[0];
				const otherActions = groupActions.slice(1);

				otherActions.forEach(action => {
					action.element.classList.add('sidebar-organizer-hidden');
				});

				if (customGroup.icon) {
					this.applyCustomIcon(mainAction.element, customGroup.icon);
				}

				this.bindPopupMenu(mainAction.element, customGroup.name, groupActions);
			} catch (e) {
				console.warn(`Sidebar Organizer: failed to process group "${customGroup.name}"`, e);
			}
		}

		// 2. 自动分组
		const unassignedActions = allActions.filter(a => !assignedActionIds.has(a.actionId));
		this.autoGroupRemaining(unassignedActions, assignedActionIds, actionMap);
	}

	private autoGroupRemaining(
		unassignedActions: SidebarAction[],
		assignedActionIds: Set<string>,
		actionMap: Map<string, SidebarAction>
	) {
		const pluginGroups = new Map<string, SidebarAction[]>();
		for (const action of unassignedActions) {
			if (!pluginGroups.has(action.pluginId)) {
				pluginGroups.set(action.pluginId, []);
			}
			pluginGroups.get(action.pluginId)!.push(action);
		}

		for (const [pluginId, actions] of pluginGroups) {
			try {
				if (actions.length <= 1) continue;

				actions.forEach(a => assignedActionIds.add(a.actionId));

				const mainAction = actions[0];
				const otherActions = actions.slice(1);

				otherActions.forEach(action => {
					action.element.classList.add('sidebar-organizer-hidden');
				});

				this.addBadge(mainAction.element, actions.length);

				const groupName = actions[0].pluginName;
				this.bindPopupMenu(mainAction.element, groupName, actions);
			} catch (e) {
				console.warn(`Sidebar Organizer: failed to auto-group plugin "${pluginId}"`, e);
			}
		}
	}

	private addBadge(element: HTMLElement, count: number) {
		if (element.querySelector('.sidebar-organizer-badge')) return;

		const badge = document.createElement('span');
		badge.className = 'sidebar-organizer-badge';
		badge.textContent = String(count);
		element.appendChild(badge);
	}

	private bindPopupMenu(mainElement: HTMLElement, title: string, actions: SidebarAction[]) {
		if (mainElement.hasAttribute('data-popup-bound')) return;
		mainElement.setAttribute('data-popup-bound', 'true');

		const mouseEnterHandler = () => {
			if (!mainElement.hasAttribute('data-popup-bound')) return;
			this.hoveredIconEl = mainElement;

			if (this.hideTimeout) {
				clearTimeout(this.hideTimeout);
				this.hideTimeout = null;
			}

			// If popup already showing for THIS icon, just keep it
			if (this.popupEl && this.currentPopupAnchor === mainElement) return;

			// If popup is animating away for a different icon, wait
			if (this.isHiding) return;

			if (this.showTimeout) {
				clearTimeout(this.showTimeout);
			}
			this.showTimeout = window.setTimeout(() => {
				if (!mainElement.hasAttribute('data-popup-bound')) return;
				if (this.hoveredIconEl !== mainElement) return;
				this.showMenu(mainElement, title, actions);
			}, 180);
		};

		const mouseLeaveHandler = () => {
			if (!mainElement.hasAttribute('data-popup-bound')) return;
			this.hoveredIconEl = null;
			if (this.showTimeout) {
				clearTimeout(this.showTimeout);
				this.showTimeout = null;
			}
			this.scheduleHide();
		};

		mainElement.addEventListener('mouseenter', mouseEnterHandler);
		mainElement.addEventListener('mouseleave', mouseLeaveHandler);

		this.boundElements.set(mainElement, { mouseEnter: mouseEnterHandler, mouseLeave: mouseLeaveHandler });
	}

	private scheduleHide() {
		if (this.hideTimeout) clearTimeout(this.hideTimeout);
		this.hideTimeout = window.setTimeout(() => {
			// Don't hide if mouse is over the popup
			if (this.popupHovered) return;
			// Don't hide if mouse moved back to an icon
			if (this.hoveredIconEl) return;
			this.hideMenu();
		}, 300);
	}

	private showMenu(mainElement: HTMLElement, title: string, actions: SidebarAction[]) {
		if (this.isHiding) return;

		// If already showing for this element, no-op
		if (this.popupEl && this.currentPopupAnchor === mainElement) return;

		if (this.popupEl) {
			this.cleanupPopupHandlers();
			this.popupEl.remove();
			this.popupEl = null;
		}

		if (this.hideTimeout) {
			clearTimeout(this.hideTimeout);
			this.hideTimeout = null;
		}
		if (this.showTimeout) {
			clearTimeout(this.showTimeout);
			this.showTimeout = null;
		}

		this.popupEl = document.createElement('div');
		this.popupEl.className = 'sidebar-organizer-popup';
		document.body.appendChild(this.popupEl);
		this.currentPopupAnchor = mainElement;

		const popup = this.popupEl;

		this.popupMouseEnterHandler = () => {
			this.popupHovered = true;
			if (this.hideTimeout) {
				clearTimeout(this.hideTimeout);
				this.hideTimeout = null;
			}
		};
		this.popupMouseLeaveHandler = () => {
			this.popupHovered = false;
			this.scheduleHide();
		};

		popup.addEventListener('mouseenter', this.popupMouseEnterHandler);
		popup.addEventListener('mouseleave', this.popupMouseLeaveHandler);

		const bodyEl = popup.createDiv('sidebar-organizer-popup-body');

		const titleEl = bodyEl.createDiv('sidebar-organizer-plugin-name');
		titleEl.textContent = title;

		const listEl = bodyEl.createDiv('sidebar-organizer-actions-list');

		for (const action of actions) {
			const itemEl = listEl.createDiv('sidebar-organizer-action-item');

			const iconEl = itemEl.createDiv('sidebar-organizer-action-icon');
			setSvgContent(iconEl, action.icon);

			const labelEl = itemEl.createDiv('sidebar-organizer-action-label');
			labelEl.textContent = this.extractActionLabel(action.actionName, title);

			itemEl.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				this.hideMenu();
				action.element.click();
			});
		}

		this.positionPopup(popup, mainElement);

		if (this.settings.blurEffect) {
			popup.classList.add('blur-effect');
			popup.style.setProperty('--blur-amount', `${this.settings.blurIntensity}px`);
		}

		requestAnimationFrame(() => {
			popup.classList.add('visible');
		});
	}

	private hideMenu() {
		if (!this.popupEl) return;

		this.isHiding = true;
		this.cleanupPopupHandlers();

		const popup = this.popupEl;
		popup.classList.remove('visible');
		popup.classList.add('hiding');

		setTimeout(() => {
			this.popupHovered = false;
			if (popup && popup.parentElement) {
				popup.remove();
			}
			if (this.popupEl === popup) {
				this.popupEl = null;
				this.currentPopupAnchor = null;
			}
			this.isHiding = false;
		}, 250);
	}

	private positionPopup(popup: HTMLElement, anchor: HTMLElement) {
		const rect = anchor.getBoundingClientRect();
		const isLeftSide = rect.left < window.innerWidth / 2;
		const popupWidth = Math.max(popup.offsetWidth, 190);

		if (isLeftSide) {
			popup.style.left = `${rect.right + 8}px`;
			popup.classList.remove('popup-right');
		} else {
			popup.style.left = `${rect.left - popupWidth - 8}px`;
			popup.classList.add('popup-right');
		}
		popup.style.top = `${rect.top}px`;
	}

	private identifyAction(element: HTMLElement): SidebarAction | null {
		const ariaLabel = element.getAttribute('aria-label') || '';
		const tooltip = element.querySelector('.tooltip')?.textContent || '';
		const dataView = element.getAttribute('data-view') || '';
		const svgIcon = element.querySelector('svg')?.outerHTML || '';

		const displayName = ariaLabel || tooltip;
		if (!displayName) return null;

		const pluginInfo = this.matchPlugin(displayName, dataView);
		if (!pluginInfo) return null;

		const actionId = dataView || displayName.toLowerCase().replace(/\s+/g, '-');

		return {
			element,
			pluginId: pluginInfo.pluginId,
			pluginName: pluginInfo.pluginName,
			actionName: displayName,
			icon: svgIcon,
			actionId
		};
	}

	private matchPlugin(displayName: string, dataView: string): { pluginId: string; pluginName: string } | null {
		if (dataView) {
			const parts = dataView.split('-');
			for (let i = 1; i <= Math.min(parts.length, 3); i++) {
				const prefix = parts.slice(0, i).join('-');
				for (const [id, manifest] of this.installedPlugins) {
					if (id === prefix) {
						return { pluginId: id, pluginName: manifest.name };
					}
				}
				for (const [id, manifest] of this.installedPlugins) {
					if (id.startsWith(prefix) || prefix.startsWith(id)) {
						return { pluginId: id, pluginName: manifest.name };
					}
				}
			}
			const prefix = dataView.split('-').slice(0, 2).join('-');
			return { pluginId: prefix, pluginName: prefix };
		}

		const nameLower = displayName.toLowerCase();

		for (const [id, manifest] of this.installedPlugins) {
			const pluginName = manifest.name.toLowerCase();
			if (nameLower.includes(pluginName) || pluginName === nameLower) {
				return { pluginId: id, pluginName: manifest.name };
			}
		}

		const firstPart = nameLower.split(/[\s:：\-–—]+/)[0];
		if (firstPart && firstPart.length > 1) {
			for (const [id, manifest] of this.installedPlugins) {
				const pluginName = manifest.name.toLowerCase();
				if (pluginName.includes(firstPart) || firstPart.includes(pluginName)) {
					return { pluginId: id, pluginName: manifest.name };
				}
			}
		}

		const safeId = displayName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
		return {
			pluginId: safeId || 'unknown',
			pluginName: displayName
		};
	}

	private extractActionLabel(fullName: string, pluginName: string): string {
		let label = fullName;
		const separators = [':', '：', '-', '\u2013', '\u2014', '|'];
		for (const sep of separators) {
			if (fullName.includes(sep)) {
				const parts = fullName.split(sep);
				if (parts.length > 1) {
					label = parts.slice(1).join(sep).trim();
					break;
				}
			}
		}
		return label || fullName;
	}

	private applyCustomIcon(element: HTMLElement, svgContent: string): boolean {
		const svgEl = element.querySelector('svg');
		if (svgEl && svgContent) {
			if (!element.hasAttribute('data-original-svg')) {
				element.setAttribute('data-original-svg', svgEl.outerHTML);
			}

			const newSvg = parseSvg(svgContent);

			if (newSvg) {
				if (!newSvg.hasAttribute('viewBox')) {
					newSvg.setAttribute('viewBox', '0 0 24 24');
				}
				sanitizeSvgColors(newSvg);
				newSvg.classList.add('sidebar-organizer-custom-icon');
				newSvg.classList.add('sidebar-organizer-inherit-color');
				svgEl.replaceWith(newSvg);
				return true;
			}
		}
		return false;
	}

	private restoreOriginalIcon(element: HTMLElement): boolean {
		const originalSvg = element.getAttribute('data-original-svg');
		if (originalSvg) {
			const currentSvg = element.querySelector('svg');
			if (currentSvg) {
				const originalSvgEl = parseSvg(originalSvg);
				if (originalSvgEl) {
					currentSvg.replaceWith(originalSvgEl);
					element.removeAttribute('data-original-svg');
					return true;
				}
			}
		}
		return false;
	}

	restoreOriginalIcons() {
		if (this.hideTimeout) {
			clearTimeout(this.hideTimeout);
			this.hideTimeout = null;
		}
		if (this.showTimeout) {
			clearTimeout(this.showTimeout);
			this.showTimeout = null;
		}

		// Always clean up all listeners to prevent accumulation
		this.cleanupAllListeners();

		// Remove popup immediately (no animated hide during restore)
		if (this.popupEl) {
			this.popupEl.remove();
			this.popupEl = null;
		}
		this.cleanupPopupHandlers();

		this.popupHovered = false;
		this.isHiding = false;
		this.hoveredIconEl = null;
		this.currentPopupAnchor = null;

		document.querySelectorAll('[data-original-svg]').forEach(el => {
			try {
				this.restoreOriginalIcon(el as HTMLElement);
			} catch (e) {
				console.warn('Sidebar Organizer: failed to restore icon', e);
			}
		});

		document.querySelectorAll('.sidebar-organizer-hidden').forEach(el => {
			el.classList.remove('sidebar-organizer-hidden');
		});

		document.querySelectorAll('.sidebar-organizer-badge').forEach(el => {
			try { el.remove(); } catch (e) { /* element may already be detached */ }
		});

		document.querySelectorAll('[data-popup-bound]').forEach(el => {
			el.removeAttribute('data-popup-bound');
		});
	}

	getAllActions(): SidebarAction[] {
		const actions: SidebarAction[] = [];
		const seen = new Set<string>();

		['left', 'right'].forEach(side => {
			const ribbon = document.querySelector(`.workspace-ribbon.mod-${side}`);
			if (!ribbon) return;

			ribbon.querySelectorAll('.side-dock-ribbon-action, .clickable-icon, .workspace-ribbon-action').forEach((el) => {
				const element = el as HTMLElement;
				const action = this.identifyAction(element);
				if (!action) return;

				if (!seen.has(action.actionId)) {
					seen.add(action.actionId);
					actions.push(action);
				}
			});
		});

		return actions;
	}
}

export default SidebarOrganizerPlugin;
