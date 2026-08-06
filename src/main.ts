import { Plugin, Notice, PluginManifest, Platform } from 'obsidian';
import { SidebarOrganizerSettings, DEFAULT_SETTINGS, SidebarAction, VaultConfig, PluginsContainer } from './types';
import { createTranslator } from './i18n';
import { parseSvg, sanitizeSvgColors, setSvgContent, extractActionLabel } from './sidebar';
import { SidebarOrganizerSettingTab } from './settings';

interface BoundEventHandlers {
	mouseEnter: () => void;
	mouseLeave: () => void;
	click?: (e: MouseEvent) => void;
	touchBlocker?: (e: Event) => void;
}

export class SidebarOrganizerPlugin extends Plugin {
	settings!: SidebarOrganizerSettings;
	private installedPlugins: Map<string, PluginManifest> = new Map();
	private isOrganizing = false;
	private popupEl: HTMLElement | null = null;
	private hideTimeout: number | null = null;
	private showTimeout: number | null = null;
	private hideTimer: number | null = null;
	private pendingShow: { anchor: HTMLElement; title: string; actions: SidebarAction[] } | null = null;
	private boundElements: Map<HTMLElement, BoundEventHandlers> = new Map();
	private popupMouseEnterHandler: (() => void) | null = null;
	private popupMouseLeaveHandler: (() => void) | null = null;
	private escKeyHandler: ((e: KeyboardEvent) => void) | null = null;
	private mutationObserver: MutationObserver | null = null;
	private observerDebounceTimer: number | null = null;
	private hoveredIconEl: HTMLElement | null = null;
	private popupHovered = false;
	private isHiding = false;
	private currentPopupAnchor: HTMLElement | null = null;
	private documentClickHandler: ((e: MouseEvent) => void) | null = null;
	private clickDeferTimer: number | null = null;
	private mobileClickBound = false;
	private unloaded = false;
	private layoutReadyTimer: number | null = null;
	private observedTargets: Element[] = [];

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
	// 1.13+ 设置窗口是独立窗口，activeDocument 会指向设置窗口；
	// ribbon/popup 都在主工作区窗口，统一用 workspace 所在窗口的 document
	private get rootDoc(): Document {
		return this.app.workspace.containerEl.ownerDocument;
	}

	private hasDesktopRibbon(): boolean {
		return !!this.rootDoc.querySelector('.workspace-ribbon.mod-left') ||
			!!this.rootDoc.querySelector('.workspace-ribbon.mod-right');
	}

	/**
	 * 判断当前是否应使用移动端交互方式（点击而非悬停）。
	 * 使用 Platform.isMobile 因为即使平板有桌面布局，交互仍偏触控。
	 */
	private useMobileInteraction(): boolean {
		return Platform.isMobile;
	}

	t = createTranslator(
		() => this.settings,
		() => (this.app.vault as unknown as { config?: VaultConfig }).config?.locale
	);

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SidebarOrganizerSettingTab(this.app, this));

		this.addCommand({
			id: 'toggle',
			name: this.t('commandToggle'),
			callback: () => {
				this.settings.enabled = !this.settings.enabled;
				void this.saveSettings();
				this.applyOrganizerState();
				new Notice(this.t(this.settings.enabled ? 'toggleEnabled' : 'toggleDisabled'));
			}
		});

		this.addCommand({
			id: 'refresh',
			name: this.t('commandRefresh'),
			callback: () => {
				this.restoreOriginalIcons();
				this.loadInstalledPlugins();
				this.organizeSidebars();
				new Notice(this.t('refreshNotice'));
			}
		});

		this.app.workspace.onLayoutReady(() => {
			this.loadInstalledPlugins();
			this.layoutReadyTimer = window.setTimeout(() => {
				if (this.unloaded) return;
				if (this.settings.enabled) {
					this.organizeSidebars();
				}
				this.startMutationObserver();
			}, 1000);
		});
	}

	// ---- 液态玻璃（实验性）：SVG feDisplacementMap 边缘折射 ----
	private liquidGlassFilterId: string | null = null;
	private liquidGlassSvg: SVGSVGElement | null = null;
	private liquidGlassFeImage: SVGFEImageElement | null = null;
	private liquidGlassMapSize = 0;

	/**
	 * 确保 SVG 折射滤镜存在（挂到主窗口 body，全局复用）
	 */
	private ensureLiquidGlassFilter(doc: Document): string {
		if (this.liquidGlassFilterId) return this.liquidGlassFilterId;

		const NS = 'http://www.w3.org/2000/svg';
		const svg = doc.createElementNS(NS, 'svg');
		svg.setAttribute('class', 'sidebar-organizer-lg-filter');
		svg.setAttribute('width', '0');
		svg.setAttribute('height', '0');

		const defs = doc.createElementNS(NS, 'defs');
		const filter = doc.createElementNS(NS, 'filter');
		this.liquidGlassFilterId = 'sidebar-organizer-lg-' + Math.random().toString(36).slice(2, 9);
		filter.setAttribute('id', this.liquidGlassFilterId);
		filter.setAttribute('filterUnits', 'userSpaceOnUse');
		filter.setAttribute('colorInterpolationFilters', 'sRGB');
		filter.setAttribute('x', '0');
		filter.setAttribute('y', '0');
		filter.setAttribute('width', '1');
		filter.setAttribute('height', '1');

		const feImage = doc.createElementNS(NS, 'feImage');
		feImage.setAttribute('width', '1');
		feImage.setAttribute('height', '1');

		const feDisplacementMap = doc.createElementNS(NS, 'feDisplacementMap');
		feDisplacementMap.setAttribute('in', 'SourceGraphic');
		feDisplacementMap.setAttribute('in2', 'lg-map');
		feDisplacementMap.setAttribute('xChannelSelector', 'R');
		feDisplacementMap.setAttribute('yChannelSelector', 'G');

		filter.appendChild(feImage);
		filter.appendChild(feDisplacementMap);
		defs.appendChild(filter);
		svg.appendChild(defs);
		doc.body.appendChild(svg);

		this.liquidGlassSvg = svg;
		this.liquidGlassFeImage = feImage;
		return this.liquidGlassFilterId;
	}

	/**
	 * 生成 SDF 边缘折射贴图（仅边缘带位移，中间不变形），
	 * 尺寸相同则复用缓存。
	 */
	private updateLiquidGlassMap(w: number, h: number): void {
		if (!this.liquidGlassFeImage || this.liquidGlassMapSize === w * h) return;
		this.liquidGlassMapSize = w * h;

		const canvas = this.rootDoc.createEl('canvas');
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const smoothStep = (a: number, b: number, t: number): number => {
			t = Math.max(0, Math.min(1, (t - a) / (b - a)));
			return t * t * (3 - 2 * t);
		};
		const roundedRectSDF = (x: number, y: number, hw: number, hh: number, r: number): number => {
			const qx = Math.abs(x) - hw + r;
			const qy = Math.abs(y) - hh + r;
			return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
		};

		const data = new Uint8ClampedArray(w * h * 4);
		let maxScale = 0;
		const raw: number[] = [];

		for (let i = 0; i < data.length; i += 4) {
			const x = (i / 4) % w;
			const y = Math.floor(i / 4 / w);
			const ux = x / w - 0.5;
			const uy = y / h - 0.5;
			// 照搬 shuding/liquid-glass：SDF 半宽 0.3、大圆角 0.6，折射带 d∈(0.15,0.95)
			// 落在元素边缘内侧约 20%，中间 60% 完全不变形
			const d = roundedRectSDF(ux, uy, 0.3, 0.3, 0.6);
			const disp = smoothStep(0.8, 0, d - 0.15);
			const scaled = smoothStep(0, 1, disp);
			const dx = (ux * scaled + 0.5) * w - x;
			const dy = (uy * scaled + 0.5) * h - y;
			maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy));
			raw.push(dx, dy);
		}

		maxScale *= 0.5;
		let idx = 0;
		for (let i = 0; i < data.length; i += 4) {
			const r = raw[idx++] / maxScale + 0.5;
			const g = raw[idx++] / maxScale + 0.5;
			data[i] = r * 255;
			data[i + 1] = g * 255;
			data[i + 2] = 0;
			data[i + 3] = 255;
		}
		ctx.putImageData(new ImageData(data, w, h), 0, 0);

		this.liquidGlassFeImage.setAttributeNS(
			'http://www.w3.org/1999/xlink', 'href', canvas.toDataURL()
		);
		const feDisplacementMap = this.liquidGlassFeImage.nextElementSibling;
		feDisplacementMap?.setAttribute('scale', String(Math.max(1, Math.round(maxScale))));
		// 同步滤镜区域尺寸（userSpaceOnUse 下与元素同尺寸）
		const filter = this.liquidGlassFeImage.parentElement;
		filter?.setAttribute('width', String(w));
		filter?.setAttribute('height', String(h));
	}

	private applyLiquidGlass(popup: HTMLElement): void {
		const id = this.ensureLiquidGlassFilter(this.rootDoc);
		popup.classList.add('liquid-glass');
		// 内容渲染完成后测量尺寸并生成贴图
		window.requestAnimationFrame(() => {
			const w = popup.offsetWidth;
			const h = popup.offsetHeight;
			if (w > 0 && h > 0) {
				this.updateLiquidGlassMap(w, h);
			}
			// 折射是主角：轻模糊 + 对比/亮度微调（照搬原版参数，去掉 20px 磨砂）
			popup.style.backdropFilter = `url(#${id}) blur(${this.settings.liquidGlassBlur}px) contrast(1.2) brightness(1.05) saturate(1.2)`;
			(popup.style as unknown as Record<string, string>).webkitBackdropFilter = popup.style.backdropFilter;
		});
	}

	private destroyLiquidGlass(): void {
		if (this.liquidGlassSvg) {
			this.liquidGlassSvg.remove();
			this.liquidGlassSvg = null;
		}
		this.liquidGlassFilterId = null;
		this.liquidGlassFeImage = null;
		this.liquidGlassMapSize = 0;
	}

	onunload() {
		this.unloaded = true;
		this.stopMutationObserver();
		this.cleanupPopupHandlers();
		this.cleanupAllListeners();
		this.destroyLiquidGlass();
		if (this.layoutReadyTimer) {
			window.clearTimeout(this.layoutReadyTimer);
			this.layoutReadyTimer = null;
		}
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
				if (this.unloaded) return;
				if (this.settings.enabled) {
					try {
						// 观察目标可能被 Obsidian 重建替换，目标全部失效时重启观察器
						if (!this.observedTargets.some(el => el.isConnected)) {
							this.startMutationObserver();
							return;
						}
						this.loadInstalledPlugins();
						this.organizeSidebars();
					} catch (e) {
						console.error('Sidebar Organizer: error during mutation re-scan', e);
					}
				}
			}, 500);
		});

		this.observedTargets = [];
		if (this.hasDesktopRibbon()) {
			// 桌面端布局：观察左右 ribbon
			['left', 'right'].forEach(side => {
				const ribbon = this.rootDoc.querySelector(`.workspace-ribbon.mod-${side}`);
				if (ribbon) {
					this.mutationObserver!.observe(ribbon, { childList: true, subtree: true });
					this.observedTargets.push(ribbon);
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
				const el = this.rootDoc.querySelector(selector);
				if (el) {
					this.mutationObserver.observe(el, { childList: true, subtree: true });
					this.observedTargets.push(el);
					observed = true;
					break;
				}
			}
			// 回退：观察 body 顶层，当抽屉出现时触发重新扫描
			if (!observed) {
				this.mutationObserver.observe(this.rootDoc.body, { childList: true, subtree: false });
				this.observedTargets.push(this.rootDoc.body);
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
		this.observedTargets = [];
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
		if (this.clickDeferTimer) {
			window.clearTimeout(this.clickDeferTimer);
			this.clickDeferTimer = null;
		}
		if (this.documentClickHandler && this.mobileClickBound) {
			this.rootDoc.removeEventListener('click', this.documentClickHandler);
		}
		this.documentClickHandler = null;
		this.mobileClickBound = false;
		// Clean up Esc key handler
		if (this.escKeyHandler) {
			this.rootDoc.removeEventListener('keydown', this.escKeyHandler, true);
			this.escKeyHandler = null;
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
			if (handlers.touchBlocker) {
				el.removeEventListener('touchstart', handlers.touchBlocker, { capture: true });
				el.removeEventListener('touchend', handlers.touchBlocker, { capture: true });
				el.removeEventListener('pointerdown', handlers.touchBlocker, { capture: true });
				el.removeEventListener('pointerup', handlers.touchBlocker, { capture: true });
			}
			el.removeAttribute('data-popup-bound');
		}
		this.boundElements.clear();
		this.cleanupPopupHandlers();
	}

	async loadSettings() {
		try {
			this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<SidebarOrganizerSettings>);
		} catch (e) {
			// data.json 损坏时不阻塞插件加载
			console.warn('Sidebar Organizer: failed to load settings, using defaults', e);
			this.settings = Object.assign({}, DEFAULT_SETTINGS);
		}
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
		if (this.isOrganizing || !this.settings.enabled || this.unloaded) return;
		this.isOrganizing = true;

		try {
			this.stopMutationObserver();
			this.restoreOriginalIcons();
			// 统一路径：根据 DOM 结构决定走桌面端还是移动端
			if (this.hasDesktopRibbon()) {
				this.processRibbon();
			} else {
				this.processRibbonMobile();
			}
		} finally {
			this.isOrganizing = false;
			if (!this.unloaded) {
				this.startMutationObserver();
			}
		}
	}

	private processRibbon() {
		// 两侧图标共用同一个 actionMap，保证跨左右 ribbon 的自定义分组也能正确合并
		const icons: Element[] = [];
		['left', 'right'].forEach(side => {
			const ribbon = this.rootDoc.querySelector(`.workspace-ribbon.mod-${side}`);
			if (!ribbon) return;
			ribbon.querySelectorAll('.side-dock-ribbon-action, .clickable-icon, .workspace-ribbon-action')
				.forEach(el => icons.push(el));
		});
		this.processIconList(icons);
	}

	private processRibbonMobile() {
		const icons = this.collectMobileIcons();
		if (icons.length > 0) {
			this.processIconList(icons);
		}
	}

	private collectMobileIcons(): Element[] {
		// 策略1：尝试在已知的移动端 ribbon 容器中查找图标
		for (const selector of SidebarOrganizerPlugin.MOBILE_RIBBON_SELECTORS) {
			const container = this.rootDoc.querySelector(selector);
			if (container) {
				const icons = container.querySelectorAll(
					SidebarOrganizerPlugin.MOBILE_ICON_SELECTORS
				);
				if (icons.length > 0) {
					return Array.from(icons);
				}
			}
		}

		// 策略2：回退 — 查找所有 .side-dock-ribbon-action（不限容器但类名精确）
		const ribbonActions = this.rootDoc.querySelectorAll('.side-dock-ribbon-action');
		if (ribbonActions.length > 0) {
			return Array.from(ribbonActions);
		}

		// 策略3：最终回退 — 使用 .clickable-icon 但排除已知非侧边栏容器
		const allClickable = this.rootDoc.querySelectorAll('.clickable-icon');
		return Array.from(allClickable).filter(el =>
			!SidebarOrganizerPlugin.MOBILE_EXCLUDE_ANCESTORS.some(
				ancestor => el.closest(ancestor) !== null
			)
		);
	}

	private processIconList(icons: Element[]) {
		const actionMap = new Map<string, SidebarAction>();

		icons.forEach((el) => {
			try {
				const element = el as HTMLElement;
				const action = this.identifyAction(element);
				if (!action) return;
				actionMap.set(action.actionId, action);
				// 兼容旧版本保存的分组数据：无 pluginId 前缀的 actionId 也能命中
				if (!actionMap.has(action.legacyId)) {
					actionMap.set(action.legacyId, action);
				}
			} catch (e) {
				console.warn('Sidebar Organizer: failed to process icon', e);
			}
		});

		if (actionMap.size === 0) return;

		const assignedActionIds = new Set<string>();

		const sortedCustomGroups = [...this.settings.customGroups].sort((a, b) => a.order - b.order);
		for (const customGroup of sortedCustomGroups) {
			try {
				// 跳过已被其他分组占用的 action，防止重复图标、图标覆盖和弹窗静默失效
				const groupActions = customGroup.actionIds
					.map(id => actionMap.get(id))
					.filter((a): a is SidebarAction => !!a && !assignedActionIds.has(a.actionId));

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

	private bindPopupMenu(mainElement: HTMLElement, title: string, actions: SidebarAction[]) {
		if (mainElement.hasAttribute('data-popup-bound')) return;
		mainElement.setAttribute('data-popup-bound', 'true');

		// 摘掉 aria-label，避免 Obsidian 原生 tooltip 与弹出菜单重叠；
		// 分组名仍会显示在菜单标题中，还原时恢复该属性
		if (mainElement.hasAttribute('aria-label')) {
			mainElement.setAttribute('data-original-label', mainElement.getAttribute('aria-label') || '');
			mainElement.removeAttribute('aria-label');
		}

		// 点击图标：打开/关闭菜单，而不是触发合集里的第一个功能
		// 允许由代码触发的点击（e.isTrusted 为 false）透传，
		// 这样在弹窗中点击原本所在位置的项时，action.element.click() 能够触发原生逻辑
		const clickHandler = (e: MouseEvent) => {
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

		if (this.useMobileInteraction()) {
			// 拦截原生触摸事件，防止 Obsidian 提前触发底层逻辑
			const touchBlocker = (e: Event) => {
				if (!e.isTrusted) return;
				e.stopImmediatePropagation();
				e.stopPropagation();
				// 不调用 e.preventDefault()，以允许浏览器后续触发 click 事件
			};

			mainElement.addEventListener('click', clickHandler, { capture: true });
			mainElement.addEventListener('touchstart', touchBlocker, { capture: true });
			mainElement.addEventListener('touchend', touchBlocker, { capture: true });
			mainElement.addEventListener('pointerdown', touchBlocker, { capture: true });
			mainElement.addEventListener('pointerup', touchBlocker, { capture: true });

			this.boundElements.set(mainElement, {
				mouseEnter: () => {},
				mouseLeave: () => {},
				click: clickHandler,
				touchBlocker: touchBlocker
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

			// If popup is animating away for a different icon, queue the show
			if (this.isHiding) {
				this.pendingShow = { anchor: mainElement, title, actions };
				return;
			}

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
		mainElement.addEventListener('click', clickHandler, { capture: true });

		this.boundElements.set(mainElement, {
			mouseEnter: mouseEnterHandler,
			mouseLeave: mouseLeaveHandler,
			click: clickHandler
		});
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
		if (this.unloaded) return;
		// If popup is animating away, queue the show instead of dropping it
		if (this.isHiding) {
			this.pendingShow = { anchor: mainElement, title, actions };
			return;
		}

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

		this.popupEl = this.rootDoc.createEl('div');
		this.popupEl.className = 'sidebar-organizer-popup';
		if (this.settings.popupRounded) {
			this.popupEl.style.setProperty('--popup-radius', `${this.settings.popupRadius}px`);
		} else {
			this.popupEl.classList.add('square');
		}
		if (this.settings.waterDrop) {
			this.popupEl.classList.add('water-drop');
		}
		this.rootDoc.body.appendChild(this.popupEl);
		this.currentPopupAnchor = mainElement;

		// Esc 关闭弹窗（桌面/移动端通用）
		this.escKeyHandler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				this.hideMenu();
			}
		};
		this.rootDoc.addEventListener('keydown', this.escKeyHandler, true);

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
			this.clickDeferTimer = window.setTimeout(() => {
				this.clickDeferTimer = null;
				const h = this.documentClickHandler;
				if (h && !this.mobileClickBound) {
					this.rootDoc.addEventListener('click', h);
					this.mobileClickBound = true;
				}
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
			labelEl.textContent = extractActionLabel(action.actionName);

			itemEl.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				this.hideMenu();
				action.element.click();
			});
		}

		this.positionPopup(popup, mainElement);

		if (this.settings.liquidGlass) {
			// 液态玻璃：SVG 边缘折射 + 模糊，与毛玻璃互斥
			this.applyLiquidGlass(popup);
		} else if (this.settings.blurEffect) {
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

		if (this.hideTimer) window.clearTimeout(this.hideTimer);
		this.hideTimer = window.setTimeout(() => {
			this.hideTimer = null;
			this.popupHovered = false;
			if (popup && popup.parentElement) {
				popup.remove();
			}
			if (this.popupEl === popup) {
				this.popupEl = null;
				this.currentPopupAnchor = null;
			}
			this.isHiding = false;

			// 动画结束后，显示隐藏动画期间排队的待显示菜单
			const pending = this.pendingShow;
			this.pendingShow = null;
			if (pending) {
				this.showMenu(pending.anchor, pending.title, pending.actions);
			}
		}, 250);
	}

	private positionPopup(popup: HTMLElement, anchor: HTMLElement) {
		const rect = anchor.getBoundingClientRect();
		const popupWidth = Math.max(popup.offsetWidth, 190);

		// 统一使用靠侧边弹出的逻辑（移除移动端强制居中）
		const isLeftSide = rect.left < window.innerWidth / 2;
		
		if (isLeftSide) {
			// 左侧锚点也要做右侧钳制，防止窄窗口/抽屉下溢出屏幕
			const left = Math.min(rect.right + 8, window.innerWidth - popupWidth - 8);
			popup.style.left = `${Math.max(8, left)}px`;
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
		const dataView = element.getAttribute('data-view') || '';
		const svgIcon = element.querySelector('svg')?.outerHTML || '';

		const displayName = ariaLabel;
		if (!displayName) return null;

		const pluginInfo = this.matchPlugin(displayName, dataView);
		if (!pluginInfo) return null;

		// actionId 带 pluginId 前缀，避免不同插件同名 aria-label 互相覆盖
		const baseId = dataView || displayName.toLowerCase().replace(/\s+/g, '-');
		const actionId = `${pluginInfo.pluginId}:${baseId}`;

		return {
			element,
			pluginId: pluginInfo.pluginId,
			pluginName: pluginInfo.pluginName,
			actionName: displayName,
			icon: svgIcon,
			actionId,
			legacyId: baseId
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
		// 名称越长越具体，按长度降序匹配，减少 "Git" vs "Obsidian Git" 这类子串误配
		const sortedPlugins = [...this.installedPlugins.entries()]
			.sort((a, b) => b[1].name.length - a[1].name.length);

		// 1) 完全相等优先
		for (const [id, manifest] of sortedPlugins) {
			if (manifest.name.toLowerCase() === nameLower) {
				return { pluginId: id, pluginName: manifest.name };
			}
		}

		// 2) 显示名包含插件名
		for (const [id, manifest] of sortedPlugins) {
			const pluginName = manifest.name.toLowerCase();
			if (pluginName && nameLower.includes(pluginName)) {
				return { pluginId: id, pluginName: manifest.name };
			}
		}

		// 3) 显示名首词与插件名互相包含
		const firstPart = nameLower.split(/[\s:：\-–—]+/)[0];
		if (firstPart && firstPart.length > 1) {
			for (const [id, manifest] of sortedPlugins) {
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
		if (this.hideTimer) {
			window.clearTimeout(this.hideTimer);
			this.hideTimer = null;
		}
		this.pendingShow = null;

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

		this.rootDoc.querySelectorAll('[data-original-svg]').forEach(el => {
			try {
				this.restoreOriginalIcon(el as HTMLElement);
			} catch (e) {
				console.warn('Sidebar Organizer: failed to restore icon', e);
			}
		});

		this.rootDoc.querySelectorAll('.sidebar-organizer-hidden').forEach(el => {
			el.classList.remove('sidebar-organizer-hidden');
		});

		this.rootDoc.querySelectorAll('.sidebar-organizer-badge').forEach(el => {
			try { el.remove(); } catch { /* element may already be detached */ }
		});

		this.rootDoc.querySelectorAll('[data-popup-bound]').forEach(el => {
			el.removeAttribute('data-popup-bound');
		});

		// 恢复被摘除的 aria-label（Obsidian 原生 tooltip）
		this.rootDoc.querySelectorAll('[data-original-label]').forEach(el => {
			el.setAttribute('aria-label', el.getAttribute('data-original-label') || '');
			el.removeAttribute('data-original-label');
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
				const ribbon = this.rootDoc.querySelector(`.workspace-ribbon.mod-${side}`);
				if (!ribbon) return;
				ribbon.querySelectorAll('.side-dock-ribbon-action, .clickable-icon, .workspace-ribbon-action').forEach(addAction);
			});
		} else {
			// 移动端布局：与 processRibbonMobile 使用相同的精确选择器
			this.collectMobileIcons().forEach(addAction);
		}

		return actions;
	}
}

export default SidebarOrganizerPlugin;
