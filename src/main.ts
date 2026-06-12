import { Plugin, Notice, PluginManifest, Platform } from 'obsidian';
import { SidebarOrganizerSettings, DEFAULT_SETTINGS, SidebarAction, VaultConfig, PluginsContainer, Language } from './types';
import { getPluginLanguage, translate } from './i18n';
import { parseSvg, sanitizeSvgColors, setSvgContent } from './sidebar';
import { SidebarOrganizerSettingTab } from './settings';
import { SimpleGroupModal } from './modal';

interface BoundEventHandlers {
	mouseEnter: () => void;
	mouseLeave: () => void;
	click?: (e: MouseEvent) => void;
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
	private documentClickHandler: ((e: MouseEvent) => void) | null = null;

	// 移动端侧边栏图标容器选择器（按优先级）
	private static readonly MOBILE_RIBBON_SELECTORS = [
		'.workspace-drawer-ribbon .side-dock-actions',
		'.workspace-drawer-ribbon',
		'.workspace-drawer .side-dock-actions',
	];

	// 移动端图标元素选择器
	private static readonly MOBILE_ICON_SELECTORS =
		'.side-dock-ribbon-action, .clickable-icon';

	// 需要排除的容器（避免匹配非侧边栏元素）
	private static readonly MOBILE_EXCLUDE_ANCESTORS = [
		'.workspace-leaf',
		'.view-header',
		'.status-bar',
		'.mobile-navbar',
		'.modal-container',
		'.menu',
		'.workspace-tab-header-container',
		'.setting-item',
	];

	/**
	 * 检测当前 DOM 是否包含桌面端 ribbon 结构。
	 * 平板设备通常使用桌面布局，因此不依赖 Platform.isMobile，
	 * 而是根据实际 DOM 结构决定走哪条路径。
	 */
	private hasDesktopRibbon(): boolean {
		return !!activeDocument.querySelector('.workspace-ribbon.mod-left') ||
			!!activeDocument.querySelector('.workspace-ribbon.mod-right');
	}

	/**
	 * 判断当前是否应使用移动端交互方式（点击而非悬停）。
	 * 使用 Platform.isMobile 因为即使平板有桌面布局，交互仍偏触控。
	 */
	private useMobileInteraction(): boolean {
		return Platform.isMobile;
	}

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
			window.setTimeout(() => {
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
			window.clearTimeout(this.showTimeout);
			this.showTimeout = null;
		}
		this.restoreOriginalIcons();
	}

	private startMutationObserver(): void {
		this.stopMutationObserver();
		this.mutationObserver = new MutationObserver(() => {
			if (this.observerDebounceTimer) {
				window.clearTimeout(this.observerDebounceTimer);
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

		if (this.hasDesktopRibbon()) {
			// 桌面端布局：观察左右 ribbon
			['left', 'right'].forEach(side => {
				const ribbon = activeDocument.querySelector(`.workspace-ribbon.mod-${side}`);
				if (ribbon) {
					this.mutationObserver!.observe(ribbon, { childList: true, subtree: true });
				}
			});
		} else {
			// 移动端布局：依次尝试多个容器
			const mobileTargets = [
				'.workspace-drawer-ribbon',
				'.workspace-drawer',
				'.side-dock-actions',
			];
			let observed = false;
			for (const selector of mobileTargets) {
				const el = activeDocument.querySelector(selector);
				if (el) {
					this.mutationObserver!.observe(el, { childList: true, subtree: true });
					observed = true;
					break;
				}
			}
			// 回退：观察 body 顶层，当抽屉出现时触发重新扫描
			if (!observed) {
				this.mutationObserver!.observe(activeDocument.body, { childList: true, subtree: false });
			}
		}
	}

	private stopMutationObserver(): void {
		if (this.observerDebounceTimer) {
			window.clearTimeout(this.observerDebounceTimer);
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
		// Clean up document-level click handler (mobile)
		if (this.documentClickHandler) {
			activeDocument.removeEventListener('click', this.documentClickHandler);
			this.documentClickHandler = null;
		}
	}

	private cleanupAllListeners(): void {
		for (const [el, handlers] of this.boundElements) {
			el.removeEventListener('mouseenter', handlers.mouseEnter);
			el.removeEventListener('mouseleave', handlers.mouseLeave);
			if (handlers.click) {
				el.removeEventListener('click', handlers.click);
				el.removeEventListener('click', handlers.click, { capture: true });
			}
			el.removeAttribute('data-popup-bound');
		}
		this.boundElements.clear();
		this.cleanupPopupHandlers();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<SidebarOrganizerSettings>);
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
			this.stopMutationObserver();
			this.restoreOriginalIcons();
			// 统一路径：根据 DOM 结构决定走桌面端还是移动端
			if (this.hasDesktopRibbon()) {
				this.processRibbon('left');
				this.processRibbon('right');
			} else {
				this.processRibbonMobile();
			}
		} finally {
			this.isOrganizing = false;
			this.startMutationObserver();
		}
	}

	private processRibbon(side: 'left' | 'right') {
		const ribbon = activeDocument.querySelector(`.workspace-ribbon.mod-${side}`);
		if (!ribbon) return;
		this.processIconList(
			Array.from(ribbon.querySelectorAll('.side-dock-ribbon-action, .clickable-icon, .workspace-ribbon-action'))
		);
	}

	private processRibbonMobile() {
		// 策略1：尝试在已知的移动端 ribbon 容器中查找图标
		for (const selector of SidebarOrganizerPlugin.MOBILE_RIBBON_SELECTORS) {
			const container = activeDocument.querySelector(selector);
			if (container) {
				const icons = container.querySelectorAll(
					SidebarOrganizerPlugin.MOBILE_ICON_SELECTORS
				);
				if (icons.length > 0) {
					this.processIconList(Array.from(icons));
					return;
				}
			}
		}

		// 策略2：回退 — 查找所有 .side-dock-ribbon-action（不限容器但类名精确）
		const ribbonActions = activeDocument.querySelectorAll('.side-dock-ribbon-action');
		if (ribbonActions.length > 0) {
			this.processIconList(Array.from(ribbonActions));
			return;
		}

		// 策略3：最终回退 — 使用 .clickable-icon 但排除已知非侧边栏容器
		const allClickable = activeDocument.querySelectorAll('.clickable-icon');
		const filtered = Array.from(allClickable).filter(el =>
			!SidebarOrganizerPlugin.MOBILE_EXCLUDE_ANCESTORS.some(
				ancestor => el.closest(ancestor) !== null
			)
		);
		if (filtered.length > 0) {
			this.processIconList(filtered);
		}
	}

	private processIconList(icons: Element[]) {
		const actionMap = new Map<string, SidebarAction>();

		icons.forEach((el) => {
			try {
				const element = el as HTMLElement;
				const action = this.identifyAction(element);
				if (!action) return;
				actionMap.set(action.actionId, action);
			} catch (e) {
				console.warn('Sidebar Organizer: failed to process icon', e);
			}
		});

		if (actionMap.size === 0) return;

		const assignedActionIds = new Set<string>();

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
	}

	private addBadge(element: HTMLElement, count: number) {
		if (element.querySelector('.sidebar-organizer-badge')) return;

		const badge = activeDocument.createElement('span');
		badge.className = 'sidebar-organizer-badge';
		badge.textContent = String(count);
		element.appendChild(badge);
	}

	private bindPopupMenu(mainElement: HTMLElement, title: string, actions: SidebarAction[]) {
		if (mainElement.hasAttribute('data-popup-bound')) return;
		mainElement.setAttribute('data-popup-bound', 'true');

		if (this.useMobileInteraction()) {
			// Mobile: click to toggle, no hover
			const clickHandler = (e: MouseEvent) => {
				// 允许由代码触发的点击（e.isTrusted 为 false）透传
				// 这样在弹窗中点击原本所在位置的项时，action.element.click() 能够触发原生逻辑
				if (!e.isTrusted) return;

				e.preventDefault();
				e.stopImmediatePropagation();
				e.stopPropagation();
				if (!mainElement.hasAttribute('data-popup-bound')) return;
				if (this.popupEl && this.currentPopupAnchor === mainElement) {
					this.hideMenu();
				} else {
					if (this.popupEl) {
						this.cleanupPopupHandlers();
						this.popupEl.remove();
						this.popupEl = null;
					}
					this.showMenu(mainElement, title, actions);
				}
			};
			mainElement.addEventListener('click', clickHandler, { capture: true });
			this.boundElements.set(mainElement, {
				mouseEnter: () => {},
				mouseLeave: () => {},
				click: clickHandler
			});
			return;
		}

		// Desktop: hover interaction
		const mouseEnterHandler = () => {
			if (!mainElement.hasAttribute('data-popup-bound')) return;
			this.hoveredIconEl = mainElement;

			if (this.hideTimeout) {
				window.clearTimeout(this.hideTimeout);
				this.hideTimeout = null;
			}

			// If popup already showing for THIS icon, just keep it
			if (this.popupEl && this.currentPopupAnchor === mainElement) return;

			// If popup is animating away for a different icon, wait
			if (this.isHiding) return;

			if (this.showTimeout) {
				window.clearTimeout(this.showTimeout);
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
				window.clearTimeout(this.showTimeout);
				this.showTimeout = null;
			}
			this.scheduleHide();
		};

		mainElement.addEventListener('mouseenter', mouseEnterHandler);
		mainElement.addEventListener('mouseleave', mouseLeaveHandler);

		this.boundElements.set(mainElement, { mouseEnter: mouseEnterHandler, mouseLeave: mouseLeaveHandler });
	}

	private scheduleHide() {
		if (this.hideTimeout) window.clearTimeout(this.hideTimeout);
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
			window.clearTimeout(this.hideTimeout);
			this.hideTimeout = null;
		}
		if (this.showTimeout) {
			window.clearTimeout(this.showTimeout);
			this.showTimeout = null;
		}

		this.popupEl = activeDocument.createElement('div');
		this.popupEl.className = 'sidebar-organizer-popup';
		activeDocument.body.appendChild(this.popupEl);
		this.currentPopupAnchor = mainElement;

		const popup = this.popupEl;

		if (this.useMobileInteraction()) {
			// Mobile: close popup when tapping outside
			this.documentClickHandler = (e: MouseEvent) => {
				const target = e.target as HTMLElement;
				if (!this.popupEl) return;
				if (!this.popupEl.contains(target) && target !== mainElement && !mainElement.contains(target)) {
					this.hideMenu();
				}
			};
			// Defer to avoid the same click that opened the popup from closing it
			window.setTimeout(() => {
				activeDocument.addEventListener('click', this.documentClickHandler!);
			}, 0);
		} else {
			this.popupMouseEnterHandler = () => {
				this.popupHovered = true;
				if (this.hideTimeout) {
					window.clearTimeout(this.hideTimeout);
					this.hideTimeout = null;
				}
			};
			this.popupMouseLeaveHandler = () => {
				this.popupHovered = false;
				this.scheduleHide();
			};

			popup.addEventListener('mouseenter', this.popupMouseEnterHandler);
			popup.addEventListener('mouseleave', this.popupMouseLeaveHandler);
		}

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

		window.requestAnimationFrame(() => {
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

		window.setTimeout(() => {
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
		const popupWidth = Math.max(popup.offsetWidth, 190);

		// 统一使用靠侧边弹出的逻辑（移除移动端强制居中）
		const isLeftSide = rect.left < window.innerWidth / 2;
		
		if (isLeftSide) {
			popup.style.left = `${rect.right + 8}px`;
			popup.classList.remove('popup-right');
		} else {
			// 如果在右侧，确保弹窗不会溢出屏幕左侧
			const leftPos = Math.max(8, rect.left - popupWidth - 8);
			popup.style.left = `${leftPos}px`;
			popup.classList.add('popup-right');
		}

		// 垂直方向的安全检查：如果按原来的 top 弹出超出了屏幕底部，就往上挪
		const popupHeight = Math.max(popup.offsetHeight, 100);
		let top = rect.top;
		if (top + popupHeight > window.innerHeight - 8) {
			top = Math.max(8, window.innerHeight - popupHeight - 8);
		}
		popup.style.top = `${top}px`;
		
		if (this.useMobileInteraction()) {
			// 在移动端确保不会超出屏幕宽度
			popup.style.maxWidth = `${window.innerWidth - 16}px`;
		}
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
				newSvg.classList.add('svg-icon');
				newSvg.removeAttribute('width');
				newSvg.removeAttribute('height');
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
			window.clearTimeout(this.hideTimeout);
			this.hideTimeout = null;
		}
		if (this.showTimeout) {
			window.clearTimeout(this.showTimeout);
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

		activeDocument.querySelectorAll('[data-original-svg]').forEach(el => {
			try {
				this.restoreOriginalIcon(el as HTMLElement);
			} catch (e) {
				console.warn('Sidebar Organizer: failed to restore icon', e);
			}
		});

		activeDocument.querySelectorAll('.sidebar-organizer-hidden').forEach(el => {
			el.classList.remove('sidebar-organizer-hidden');
		});

		activeDocument.querySelectorAll('.sidebar-organizer-badge').forEach(el => {
			try { el.remove(); } catch (e) { /* element may already be detached */ }
		});

		activeDocument.querySelectorAll('[data-popup-bound]').forEach(el => {
			el.removeAttribute('data-popup-bound');
		});
	}

	getAllActions(): SidebarAction[] {
		const actions: SidebarAction[] = [];
		const seen = new Set<string>();

		const addAction = (el: Element) => {
			const action = this.identifyAction(el as HTMLElement);
			if (!action) return;
			if (!seen.has(action.actionId)) {
				seen.add(action.actionId);
				actions.push(action);
			}
		};

		if (this.hasDesktopRibbon()) {
			// 桌面端布局：从左右 ribbon 中获取
			['left', 'right'].forEach(side => {
				const ribbon = activeDocument.querySelector(`.workspace-ribbon.mod-${side}`);
				if (!ribbon) return;
				ribbon.querySelectorAll('.side-dock-ribbon-action, .clickable-icon, .workspace-ribbon-action').forEach(addAction);
			});
		} else {
			// 移动端布局：与 processRibbonMobile 使用相同的精确选择器
			this.collectMobileActions(addAction);
		}

		return actions;
	}

	private collectMobileActions(addAction: (el: Element) => void) {
		// 策略1：尝试精确容器
		for (const selector of SidebarOrganizerPlugin.MOBILE_RIBBON_SELECTORS) {
			const container = activeDocument.querySelector(selector);
			if (container) {
				const icons = container.querySelectorAll(
					SidebarOrganizerPlugin.MOBILE_ICON_SELECTORS
				);
				if (icons.length > 0) {
					icons.forEach(addAction);
					return;
				}
			}
		}

		// 策略2：回退到 .side-dock-ribbon-action
		const ribbonActions = activeDocument.querySelectorAll('.side-dock-ribbon-action');
		if (ribbonActions.length > 0) {
			ribbonActions.forEach(addAction);
			return;
		}

		// 策略3：过滤后的 .clickable-icon
		const allClickable = activeDocument.querySelectorAll('.clickable-icon');
		Array.from(allClickable)
			.filter(el => !SidebarOrganizerPlugin.MOBILE_EXCLUDE_ANCESTORS.some(
				ancestor => el.closest(ancestor) !== null
			))
			.forEach(addAction);
	}
}

export default SidebarOrganizerPlugin;
