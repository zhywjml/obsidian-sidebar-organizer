import {
	App, PluginSettingTab, Setting, Notice,
	type SettingDefinitionItem, type SettingDefinitionGroup
} from 'obsidian';
import type { SidebarOrganizerPlugin } from './main';
import type { Language } from './types';
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

	/**
	 * Legacy render — fallback for Obsidian <1.13.0.
	 * @deprecated Since 1.13.0. Use getSettingDefinitions() instead.
	 */
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

		new Setting(containerEl)
			.setName(this.t('language'))
			.setDesc(this.t('languageDesc'))
			.addDropdown(dropdown => dropdown
				.addOption('auto', this.t('auto'))
				.addOption('zh', '中文').addOption('en', 'English')
				.addOption('ja', '日本語').addOption('ko', '한국어')
				.addOption('de', 'Deutsch').addOption('ru', 'Русский')
				.addOption('es', 'Español').addOption('fr', 'Français')
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

		new Setting(containerEl)
			.setName(this.t('usageInstructions'))
			.setHeading();
		const usageList = containerEl.createEl('ul');
		usageList.createEl('li', { text: this.t('instruction1') });
		usageList.createEl('li', { text: this.t('instruction2') });
		usageList.createEl('li', { text: this.t('instruction3') });
		usageList.createEl('li', { text: this.t('instruction4') });
	}

	/**
	 * Declarative settings definitions for Obsidian 1.13.0+.
	 */
	getSettingDefinitions(): SettingDefinitionItem[] {
		const langOptions: Record<string, string> = {
			auto: this.t('auto'),
			zh: '中文', en: 'English', ja: '日本語',
			ko: '한국어', de: 'Deutsch', ru: 'Русский',
			es: 'Español', fr: 'Français'
		};

		return [
			{
				type: 'group',
				heading: this.t('pluginName'),
				items: [
					{ name: this.t('language'), desc: this.t('languageDesc'),
						control: { type: 'dropdown', key: 'language', options: langOptions } },
					{ name: this.t('enableOrganizer'), desc: this.t('enableOrganizerDesc'),
						control: { type: 'toggle', key: 'enabled' } },
					{ name: this.t('blurEffect'), desc: this.t('blurEffectDesc'),
						control: { type: 'toggle', key: 'blurEffect' } },
					{ name: this.t('blurIntensity'),
						desc: this.t('blurIntensityDesc', { value: this.plugin.settings.blurIntensity }),
						control: { type: 'slider', key: 'blurIntensity', min: 0, max: 30, step: 1,
							displayFormat: (v: number) => `${v}px` } },
					{ name: this.t('refreshSidebar'), desc: this.t('refreshSidebarDesc'),
						action: () => {
							this.plugin.restoreOriginalIcons();
							this.plugin.loadInstalledPlugins();
							this.plugin.organizeSidebars();
							new Notice(this.t('refreshNotice'));
						} },
				]
			} as SettingDefinitionGroup,
			{
				type: 'group',
				heading: this.t('customGroups'),
				items: [
					{
						name: this.t('createGroup'),
						action: () => {
							const modal = new SimpleGroupModal(this.app, this.plugin, () => {
								this.plugin.restoreOriginalIcons();
								this.plugin.organizeSidebars();
							});
							modal.open();
						}
					},
					...this.plugin.settings.customGroups
						.sort((a, b) => a.order - b.order)
						.map(group => ({
							name: group.name,
							render: (setting: Setting) => {
								const s = setting.settingEl;
								s.empty();
								s.addClass('sidebar-organizer-group-list-item');
								const iconEl = s.createDiv('group-icon');
								if (group.icon) {
									setSvgContent(iconEl, group.icon);
								} else {
									iconEl.createEl('span', { text: '\uD83D\uDCCB', cls: 'default-group-icon' });
								}
								const nameEl = s.createDiv('group-title');
								nameEl.textContent = group.name;
								const countEl = s.createDiv('group-count');
								countEl.textContent = this.t('actionCount', { count: group.actionIds.length });
								const actionsEl = s.createDiv('group-actions');
								actionsEl.createEl('button', { text: this.t('editGroup') })
									.addEventListener('click', () => {
										const modal = new SimpleGroupModal(this.app, this.plugin, () => {
											this.plugin.restoreOriginalIcons();
											this.plugin.organizeSidebars();
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
											new Notice(this.t('groupDeleted'));
										})();
									});
							}
						})),
				]
			} as SettingDefinitionGroup,
			{
				type: 'group',
				heading: this.t('usageInstructions'),
				items: [
					{
						name: '',
						render: (setting: Setting) => {
							const ul = setting.settingEl.createEl('ul');
							ul.createEl('li', { text: this.t('instruction1') });
							ul.createEl('li', { text: this.t('instruction2') });
							ul.createEl('li', { text: this.t('instruction3') });
							ul.createEl('li', { text: this.t('instruction4') });
						}
					},
				]
			} as SettingDefinitionGroup,
		];
	}

	setControlValue(key: string, value: unknown): void | Promise<void> {
		(this.plugin.settings as any)[key] = value;
		void this.plugin.saveSettings();

		if (key === 'language') {
			this.update();
		}
		if (key === 'enabled') {
			this.plugin.applyOrganizerState();
		}
	}
}
