import {
	App, PluginSettingTab, Setting, Notice
} from 'obsidian';
import type { SidebarOrganizerPlugin } from './main';
import { createTranslator } from './i18n';
import { setSvgContent } from './sidebar';
import { SimpleGroupModal } from './modal';

export class SidebarOrganizerSettingTab extends PluginSettingTab {
	plugin: SidebarOrganizerPlugin;

	constructor(app: App, plugin: SidebarOrganizerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private t = createTranslator(
		() => this.plugin.settings,
		() => (this.app.vault as unknown as { config?: { locale?: string } }).config?.locale
	);


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
			.setName(this.t('popupAppearance'))
			.setHeading();
		new Setting(containerEl)
			.setName(this.t('blurEffect'))
			.setDesc(this.t('blurEffectDesc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.blurEffect)
				.onChange(async (value) => {
					this.plugin.settings.blurEffect = value;
					await this.plugin.saveSettings();
				}));

		const liquidBlurSetting = new Setting(containerEl)
			.setName(this.t('blurIntensity'))
			.setDesc(this.t('blurIntensityDesc', { value: this.plugin.settings.blurIntensity }));
		liquidBlurSetting.addSlider(slider => slider
			.setValue(this.plugin.settings.blurIntensity)
			.setLimits(0, 30, 1)
			.onChange(async (value) => {
				this.plugin.settings.blurIntensity = value;
				await this.plugin.saveSettings();
				// 拖动时实时刷新描述中的当前值
				liquidBlurSetting.descEl.textContent = this.t('blurIntensityDesc', { value });
			}));

		// 圆角弹窗开关（在上）
		new Setting(containerEl)
			.setName(this.t('popupRounded'))
			.setDesc(this.t('popupRoundedDesc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.popupRounded)
				.onChange(async (value) => {
					this.plugin.settings.popupRounded = value;
					await this.plugin.saveSettings();
					radiusSetting.settingEl.style.display = value ? '' : 'none';
				}));

		// 圆角大小滑块（在下，随开关显隐）
		let radiusSetting: Setting;
		radiusSetting = new Setting(containerEl)
			.setName(this.t('popupRadius'))
			.setDesc(this.t('popupRadiusDesc').replace('{value}', String(this.plugin.settings.popupRadius)))
			.addSlider(slider => slider
				.setValue(this.plugin.settings.popupRadius)
				.setLimits(0, 24, 1)
				.onChange(async (value) => {
					this.plugin.settings.popupRadius = value;
					await this.plugin.saveSettings();
					const desc = radiusSetting.settingEl.querySelector('.setting-item-description');
					if (desc) desc.textContent = this.t('popupRadiusDesc').replace('{value}', String(value));
				}));
		radiusSetting.settingEl.style.display = this.plugin.settings.popupRounded ? '' : 'none';

		// 液态玻璃开关（在上）
		new Setting(containerEl)
			.setName(this.t('liquidGlass'))
			.setDesc(this.t('liquidGlassDesc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.liquidGlass)
				.onChange(async (value) => {
					this.plugin.settings.liquidGlass = value;
					await this.plugin.saveSettings();
					glassBlurSetting.settingEl.style.display = value ? '' : 'none';
				}));

		// 液态玻璃模糊滑块（在下，随开关显隐）
		let glassBlurSetting: Setting;
		glassBlurSetting = new Setting(containerEl)
			.setName(this.t('liquidGlassBlur'))
			.setDesc(this.t('liquidGlassBlurDesc').replace('{value}', String(this.plugin.settings.liquidGlassBlur)))
			.addSlider(slider => slider
				.setValue(this.plugin.settings.liquidGlassBlur)
				.setLimits(0, 10, 0.5)
				.onChange(async (value) => {
					this.plugin.settings.liquidGlassBlur = value;
					await this.plugin.saveSettings();
					const desc = glassBlurSetting.settingEl.querySelector('.setting-item-description');
					if (desc) desc.textContent = this.t('liquidGlassBlurDesc').replace('{value}', String(value));
				}));
		glassBlurSetting.settingEl.style.display = this.plugin.settings.liquidGlass ? '' : 'none';

		new Setting(containerEl)
			.setName(this.t('waterDrop'))
			.setDesc(this.t('waterDropDesc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.waterDrop)
				.onChange(async (value) => {
					this.plugin.settings.waterDrop = value;
					await this.plugin.saveSettings();
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
				const deleteBtn = actionsEl.createEl('button', { text: this.t('deleteGroup'), cls: 'mod-warning' });
				deleteBtn.addEventListener('click', () => {
					// 第一次点击：进入确认态，第二次点击才真正删除
					if (!deleteBtn.classList.contains('sidebar-organizer-delete-confirm')) {
						deleteBtn.classList.add('sidebar-organizer-delete-confirm');
						deleteBtn.setText(this.t('confirmDeleteGroup'));
						window.setTimeout(() => {
							deleteBtn.classList.remove('sidebar-organizer-delete-confirm');
							deleteBtn.setText(this.t('deleteGroup'));
						}, 3000);
						return;
					}
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


}
