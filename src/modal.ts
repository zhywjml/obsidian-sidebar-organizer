import { App, Modal, Notice, Setting } from 'obsidian';
import type { SidebarOrganizerPlugin } from './main';
import type { CustomGroup, SidebarAction } from './types';
import { createTranslator } from './i18n';
import { setSvgContent } from './sidebar';

export class SimpleGroupModal extends Modal {
	plugin: SidebarOrganizerPlugin;
	existingGroup: CustomGroup | null;
	onSave: () => void;

	private selectedActions: Set<string> = new Set();
	private groupName = '';
	private groupIcon = '';

	private allActions: SidebarAction[] = [];
	private availableContainer!: HTMLElement;
	private selectedContainer!: HTMLElement;
	private nameInput!: HTMLInputElement;
	private iconInput!: HTMLTextAreaElement;
	private previewEl!: HTMLElement;

	private t = createTranslator(
		() => this.plugin.settings,
		() => (this.app.vault as unknown as { config?: { locale?: string } }).config?.locale
	);

	constructor(
		app: App,
		plugin: SidebarOrganizerPlugin,
		onSave: () => void,
		existingGroup: CustomGroup | null = null
	) {
		super(app);
		this.plugin = plugin;
		this.onSave = onSave;
		this.existingGroup = existingGroup;

		if (existingGroup) {
			this.selectedActions = new Set(existingGroup.actionIds);
			this.groupName = existingGroup.name;
			this.groupIcon = existingGroup.icon || '';
		}
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		this.allActions = this.plugin.getAllActions();
		this.renderStep1();
	}

	private renderStep1() {
		const { contentEl } = this;
		contentEl.empty();

		new Setting(contentEl)
			.setName(this.existingGroup ? `${this.t('editGroupTitle')} - ${this.t('selectFunctions')}` : `${this.t('createGroupTitle')} - ${this.t('selectFunctions')}`)
			.setHeading();
		contentEl.createEl('p', {
			text: this.t('selectFunctionsDesc'),
			cls: 'sidebar-organizer-hint'
		});

		// 获取已分配到其他分组的 actionIds
		const assignedElsewhere = new Set<string>();
		this.plugin.settings.customGroups.forEach(g => {
			if (this.existingGroup && g.id === this.existingGroup!.id) return;
			g.actionIds.forEach(id => assignedElsewhere.add(id));
		});

		// 按插件分组归类功能
		const pluginGroups = new Map<string, SidebarAction[]>();
		for (const action of this.allActions) {
			const isAssignedElsewhere = assignedElsewhere.has(action.actionId);
			const isSelected = this.selectedActions.has(action.actionId);
			if (isAssignedElsewhere && !isSelected) continue;

			if (!pluginGroups.has(action.pluginName)) {
				pluginGroups.set(action.pluginName, []);
			}
			pluginGroups.get(action.pluginName)!.push(action);
		}

		// 两列布局
		const container = contentEl.createDiv('simple-group-container');

		// 左侧：所有可用功能
		const leftPanel = container.createDiv('panel-left');
		new Setting(leftPanel)
			.setName(this.t('availableFunctions'))
			.setHeading();

		this.availableContainer = leftPanel.createDiv('actions-list');

		for (const [pluginName, actions] of pluginGroups) {
			const groupEl = this.availableContainer.createDiv('action-group');

			const groupActions = groupEl.createDiv('group-actions');

			const groupHeader = groupEl.createDiv('action-group-header');
			const allSelected = actions.every(a => this.selectedActions.has(a.actionId));
			if (allSelected && actions.length > 0) {
				groupHeader.classList.add('all-selected');
			}

			groupHeader.createSpan('group-title').textContent = `${pluginName} (${actions.length})`;
			groupHeader.createSpan('select-all-hint').textContent = this.t('clickSelectAll');

			groupHeader.addEventListener('click', (e) => {
				e.stopPropagation();
				const allInGroup = actions.every(a => this.selectedActions.has(a.actionId));
				if (allInGroup) {
					actions.forEach(a => this.selectedActions.delete(a.actionId));
				} else {
					actions.forEach(a => this.selectedActions.add(a.actionId));
				}
				// Toggle items in-place instead of full re-render (avoids scroll jump)
				groupActions.querySelectorAll('.action-item-draggable').forEach(el => {
					const aid = el.getAttribute('data-action-id');
					if (aid && this.selectedActions.has(aid)) {
						el.classList.add('in-group');
					} else {
						el.classList.remove('in-group');
					}
				});
				groupHeader.classList.toggle('all-selected', !allInGroup);
				this.updateSelectedList();
			});

			for (const action of actions) {
				const isSelected = this.selectedActions.has(action.actionId);

				const itemEl = groupActions.createDiv('action-item-draggable');
				itemEl.setAttribute('data-action-id', action.actionId);
				if (isSelected) itemEl.classList.add('in-group');

				const iconSpan = itemEl.createSpan('item-icon');
				setSvgContent(iconSpan, action.icon);

				const nameSpan = itemEl.createSpan('item-name');
				nameSpan.textContent = action.actionName;

				itemEl.addEventListener('click', (e) => {
					e.stopPropagation();
					if (this.selectedActions.has(action.actionId)) {
						this.selectedActions.delete(action.actionId);
						itemEl.classList.remove('in-group');
					} else {
						this.selectedActions.add(action.actionId);
						itemEl.classList.add('in-group');
					}
					this.updateSelectedList();
					const allNowSelected = actions.every(a => this.selectedActions.has(a.actionId));
					if (allNowSelected) {
						groupHeader.classList.add('all-selected');
					} else {
						groupHeader.classList.remove('all-selected');
					}
				});
			}
		}

		// 右侧：已选择的功能
		const rightPanel = container.createDiv('panel-right');
		new Setting(rightPanel)
			.setName(this.t('groupFunctions'))
			.setHeading();

		this.selectedContainer = rightPanel.createDiv('actions-list selected-list');
		this.updateSelectedList();

		// 按钮
		const buttonContainer = contentEl.createDiv('modal-button-container');

		buttonContainer.createEl('button', { text: this.t('cancel') })
			.addEventListener('click', () => this.close());

		buttonContainer.createEl('button', { text: this.t('nextStep'), cls: 'mod-cta' })
			.addEventListener('click', () => {
				if (this.selectedActions.size === 0) {
					new Notice(this.t('pleaseSelectOne'));
					return;
				}
				this.renderStep2();
			});
	}

	private updateSelectedList() {
		this.selectedContainer.empty();

		const selectedActions = this.allActions.filter(a => this.selectedActions.has(a.actionId));

		if (selectedActions.length === 0) {
			this.selectedContainer.createEl('p', {
				text: this.t('clickToAdd'),
				cls: 'empty-hint'
			});
			return;
		}

		for (const action of selectedActions) {
			const itemEl = this.selectedContainer.createDiv('selected-action-item');
			itemEl.setAttribute('data-action-id', action.actionId);

			const iconSpan = itemEl.createSpan('item-icon');
			setSvgContent(iconSpan, action.icon);

			const nameSpan = itemEl.createSpan('item-name');
			nameSpan.textContent = action.actionName;

			const removeBtn = itemEl.createSpan('remove-btn');
			removeBtn.textContent = '\u00D7';
			removeBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.selectedActions.delete(action.actionId);
				this.updateSelectedList();
				// Sync: update left panel using data-action-id instead of name matching
				this.availableContainer.querySelectorAll('.action-item-draggable').forEach(el => {
					if (el.getAttribute('data-action-id') === action.actionId) {
						el.classList.remove('in-group');
					}
				});
				// Sync: update each group header's all-selected state
				this.availableContainer.querySelectorAll('.action-group-header').forEach(header => {
					const parent = header.closest('.action-group');
					if (!parent) return;
					const items = parent.querySelectorAll('.action-item-draggable');
					const allSelected = Array.from(items).every(el =>
						this.selectedActions.has(el.getAttribute('data-action-id') || '')
					);
					header.classList.toggle('all-selected', allSelected);
				});
			});
		}
	}

	private renderStep2() {
		const { contentEl } = this;
		contentEl.empty();

		new Setting(contentEl)
			.setName(this.existingGroup ? `${this.t('editGroupTitle')} - ${this.t('setNameAndIcon')}` : `${this.t('createGroupTitle')} - ${this.t('setNameAndIcon')}`)
			.setHeading();

		new Setting(contentEl)
			.setName(this.t('groupName'))
			.setDesc(this.t('groupNameDesc'))
			.addText(text => {
				this.nameInput = text.inputEl;
				text.setPlaceholder(this.t('groupNamePlaceholder'));
				text.setValue(this.groupName);
				text.onChange(value => {
					this.groupName = value;
				});
			});

		new Setting(contentEl)
			.setName(this.t('customIcon'))
			.setHeading();

		const iconSection = contentEl.createDiv('icon-section');

		this.previewEl = iconSection.createDiv('icon-preview-small');
		this.updatePreview();

		const inputSection = iconSection.createDiv('icon-input-section');
		this.iconInput = inputSection.createEl('textarea', {
			attr: {
				placeholder: this.t('svgPlaceholder'),
				rows: '4',
				class: 'svg-input-small'
			}
		});
		this.iconInput.value = this.groupIcon;

		this.iconInput.addEventListener('input', () => {
			this.groupIcon = this.iconInput.value;
			this.updatePreview();
		});

		const examplesSection = contentEl.createDiv('icon-examples');
		examplesSection.createEl('span', { text: this.t('examples') });

		const examples = [
			{ name: this.t('folder'), svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>' },
			{ name: this.t('star'), svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' },
			{ name: this.t('grid'), svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>' }
		];

		for (const example of examples) {
			examplesSection.createEl('button', { text: example.name })
				.addEventListener('click', () => {
					this.iconInput.value = example.svg;
					this.groupIcon = example.svg;
					this.updatePreview();
				});
		}

		const buttonContainer = contentEl.createDiv('modal-button-container');

		buttonContainer.createEl('button', { text: this.t('previousStep') })
			.addEventListener('click', () => this.renderStep1());

		buttonContainer.createEl('button', { text: this.t('cancel') })
			.addEventListener('click', () => this.close());

		buttonContainer.createEl('button', { text: this.t('save'), cls: 'mod-cta' })
			.addEventListener('click', () => {
				void (async () => {
					const name = this.nameInput.value.trim();
					if (!name) {
						new Notice(this.t('pleaseEnterName'));
						return;
					}

					if (this.selectedActions.size === 0) {
						new Notice(this.t('pleaseSelectOne'));
						return;
					}

					if (this.existingGroup) {
						const group = this.plugin.settings.customGroups.find(g => g.id === this.existingGroup!.id);
						if (group) {
							group.name = name;
							group.icon = this.groupIcon.trim();
							group.actionIds = Array.from(this.selectedActions);
						} else {
							const newGroup: CustomGroup = {
								id: `custom-${Date.now()}`,
								name,
								icon: this.groupIcon.trim(),
								actionIds: Array.from(this.selectedActions),
								order: this.plugin.settings.customGroups.length
							};
							this.plugin.settings.customGroups.push(newGroup);
						}
					} else {
						const newGroup: CustomGroup = {
							id: `custom-${Date.now()}`,
							name,
							icon: this.groupIcon.trim(),
							actionIds: Array.from(this.selectedActions),
							order: this.plugin.settings.customGroups.length
						};
						this.plugin.settings.customGroups.push(newGroup);
					}

					await this.plugin.saveSettings();
					this.close();
					this.onSave();
					new Notice(this.existingGroup ? this.t('groupUpdated') : this.t('groupCreated'));
				})();
			});
	}

	private updatePreview() {
		setSvgContent(this.previewEl, this.groupIcon);

		if (!this.groupIcon || !this.groupIcon.includes('<svg')) {
			this.previewEl.createEl('span', {
				text: this.t('default'),
				cls: 'default-icon-hint'
			});
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
