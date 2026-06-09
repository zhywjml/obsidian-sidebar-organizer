import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type { SidebarOrganizerPlugin } from './main';
import type { CustomGroup, Language, SidebarAction } from './types';
import { translate, getPluginLanguage } from './i18n';
import { setSvgContent } from './sidebar';
import { SimpleGroupModal } from './modal';

export class SidebarOrganizerSettingTab extends PluginSettingTab {
	plugin: SidebarOrganizerPlugin;

	constructor(app: App, plugin: SidebarOrganizerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private t(key: string, params?: Record<string, string | number>): string {
		const vault = this.app.vault as unknown as { config?: { locale?: string } };
		const lang = getPluginLanguage(this.plugin.settings, vault?.config?.locale);
		return translate(lang, key, params);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName(this.t('pluginName'))
			.setHeading();
		containerEl.createEl('p', {
			text: this.t('pluginDesc'),
			cls: 'sidebar-organizer-desc'
		});

		// 语言设置
		new Setting(containerEl)
			.setName(this.t('language'))
			.setDesc(this.t('languageDesc'))
			.addDropdown(dropdown => dropdown
				.addOption('auto', this.t('auto'))
				.addOption('zh', '中文')
				.addOption('en', 'English')
				.addOption('ja', '日本語')
				.addOption('ko', '한국어')
				.addOption('de', 'Deutsch')
				.addOption('ru', 'Русский')
				.addOption('es', 'Español')
				.addOption('fr', 'Français')
				.setValue(this.plugin.settings.language)
				.onChange(async (value) => {
					this.plugin.settings.language = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		new Setting(containerEl)
			.setName(this.t('enableOrganizer'))
			.setDesc(this.t('enableOrganizerDesc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enabled)
				.onChange(async (value) => {
					this.plugin.settings.enabled = value;
					await this.plugin.saveSettings();
					this.plugin.applyOrganizerState();
				}));

		new Setting(containerEl)
			.setName(this.t('blurEffect'))
			.setDesc(this.t('blurEffectDesc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.blurEffect)
				.onChange(async (value) => {
					this.plugin.settings.blurEffect = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(this.t('blurIntensity'))
			.setDesc(this.t('blurIntensityDesc', { value: this.plugin.settings.blurIntensity }))
			.addSlider(slider => slider
				.setValue(this.plugin.settings.blurIntensity)
				.setLimits(0, 30, 1)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.blurIntensity = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(this.t('refreshSidebar'))
			.setDesc(this.t('refreshSidebarDesc'))
			.addButton(btn => btn
				.setButtonText(this.t('refreshBtn'))
				.onClick(() => {
					this.plugin.restoreOriginalIcons();
					this.plugin.loadInstalledPlugins();
					this.plugin.organizeSidebars();
					this.display();
					new Notice(this.t('refreshNotice'));
				}));

		// 自定义分组
		new Setting(containerEl)
			.setName(this.t('customGroups'))
			.setHeading();
		containerEl.createEl('p', {
			text: this.t('customGroupsDesc'),
			cls: 'sidebar-organizer-hint'
		});

		new Setting(containerEl)
			.setName(this.t('createGroup'))
			.setDesc(this.t('customGroupsDesc'))
			.addButton(btn => btn
				.setButtonText(this.t('createGroup'))
				.onClick(() => {
					const modal = new SimpleGroupModal(this.app, this.plugin, () => {
						this.plugin.restoreOriginalIcons();
						this.plugin.organizeSidebars();
						this.display();
					});
					modal.open();
				}));

		// 自定义分组列表
		if (this.plugin.settings.customGroups.length > 0) {
			const groupsContainer = containerEl.createDiv('sidebar-organizer-custom-groups');

			const sortedGroups = [...this.plugin.settings.customGroups].sort((a, b) => a.order - b.order);

			for (const group of sortedGroups) {
				const groupEl = groupsContainer.createDiv('sidebar-organizer-custom-group-item');

				const infoEl = groupEl.createDiv('group-header');

				const iconEl = infoEl.createDiv('group-icon');
				if (group.icon) {
					setSvgContent(iconEl, group.icon);
				} else {
					iconEl.createEl('span', { text: '\uD83D\uDCCB', cls: 'default-group-icon' });
				}

				const nameEl = infoEl.createDiv('group-title');
				nameEl.textContent = group.name;

				const countEl = infoEl.createDiv('group-count');
				countEl.textContent = this.t('actionCount', { count: group.actionIds.length });

				const actionsEl = infoEl.createDiv('group-actions');

				actionsEl.createEl('button', { text: this.t('editGroup') })
					.addEventListener('click', () => {
						const modal = new SimpleGroupModal(this.app, this.plugin, () => {
							this.plugin.restoreOriginalIcons();
							this.plugin.organizeSidebars();
							this.display();
						}, group);
						modal.open();
					});

				actionsEl.createEl('button', { text: this.t('deleteGroup'), cls: 'mod-warning' })
					.addEventListener('click', () => {
						void (async () => {
							this.plugin.settings.customGroups = this.plugin.settings.customGroups.filter(g => g.id !== group.id);
							await this.plugin.saveSettings();
							this.plugin.restoreOriginalIcons();
							this.plugin.organizeSidebars();
							this.display();
							new Notice(this.t('groupDeleted'));
						})();
					});
			}
		}

		// 自动检测分组显示
		const allSidebarActions = this.plugin.getAllActions();
		const assignedToCustom = new Set<string>();
		this.plugin.settings.customGroups.forEach(g => {
			g.actionIds.forEach(id => assignedToCustom.add(id));
		});

		const remainingActionsDisplay = allSidebarActions.filter(a => !assignedToCustom.has(a.actionId));
		const autoPluginMap = new Map<string, SidebarAction[]>();
		for (const action of remainingActionsDisplay) {
			if (!autoPluginMap.has(action.pluginId)) {
				autoPluginMap.set(action.pluginId, []);
			}
			autoPluginMap.get(action.pluginId)!.push(action);
		}

		const autoGroupsToShow = Array.from(autoPluginMap.entries()).filter(([_, actions]) => actions.length > 1);

		if (autoGroupsToShow.length > 0) {
			new Setting(containerEl)
				.setName(this.t('autoGroups'))
				.setHeading();
			containerEl.createEl('p', {
				text: this.t('autoGroupsDesc'),
				cls: 'sidebar-organizer-hint'
			});

			const autoContainer = containerEl.createDiv('sidebar-organizer-custom-groups');

			for (const [pluginId, actions] of autoGroupsToShow) {
				const groupEl = autoContainer.createDiv('sidebar-organizer-custom-group-item');
				const infoEl = groupEl.createDiv('group-header');

				const autoBadge = infoEl.createDiv('auto-group-badge');
				autoBadge.textContent = this.t('autoGroupBadge');

				const iconEl = infoEl.createDiv('group-icon');
				setSvgContent(iconEl, actions[0].icon);

				const nameEl = infoEl.createDiv('group-title');
				nameEl.textContent = actions[0].pluginName;

				const countEl = infoEl.createDiv('group-count');
				countEl.textContent = this.t('actionCount', { count: actions.length });

				const actionsEl = infoEl.createDiv('group-actions');

				actionsEl.createEl('button', { text: this.t('editGroup') })
					.addEventListener('click', () => {
						const tempGroup: CustomGroup = {
							id: `auto-temp-${Date.now()}`,
							name: actions[0].pluginName,
							icon: '',
							actionIds: actions.map(a => a.actionId),
							order: this.plugin.settings.customGroups.length,
							autoGroup: true
						};
						const modal = new SimpleGroupModal(this.app, this.plugin, () => {
							this.plugin.restoreOriginalIcons();
							this.plugin.organizeSidebars();
							this.display();
						}, tempGroup);
						modal.open();
					});
			}
		}

		new Setting(containerEl)
			.setName(this.t('usageInstructions'))
			.setHeading();
		const usageList = containerEl.createEl('ul');
		usageList.createEl('li', { text: this.t('instruction1') });
		usageList.createEl('li', { text: this.t('instruction2') });
		usageList.createEl('li', { text: this.t('instruction3') });
		usageList.createEl('li', { text: this.t('instruction4') });
	}
}
