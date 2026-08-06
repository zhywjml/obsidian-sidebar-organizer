import { Language, SidebarOrganizerSettings } from './types';

// ==================== 国际化翻译 ====================

const translations: Record<string, Record<string, string>> = {
	zh: {
		pluginName: 'Sidebar Organizer',
		pluginDesc: '将同一插件的多个侧边栏图标合并为一个，悬停显示功能菜单',

		enableOrganizer: '启用侧边栏整理',
		enableOrganizerDesc: '开启/关闭侧边栏图标合并功能',

		popupAppearance: '弹出菜单外观',
		blurEffect: '毛玻璃效果',
		blurEffectDesc: '为弹出菜单添加模糊背景效果',

		blurIntensity: '模糊强度',
		blurIntensityDesc: '调整背景模糊程度 (当前: {value}px)',
		popupRounded: '圆角弹窗',
		popupRoundedDesc: '弹出菜单使用圆角还是方形边角',
		popupRadius: '圆角大小',
		popupRadiusDesc: '弹窗圆角半径（当前: {value}px）',
		liquidGlass: '液态玻璃效果',
		liquidGlassDesc: '实验性：模拟 iOS 26 液态玻璃质感（磨砂 + 边缘高光 + 光泽），渲染开销较高',
		liquidGlassBlur: '模糊程度',
		liquidGlassBlurDesc: '液态玻璃背景模糊强度（当前: {value}px）',
		waterDrop: '水滴动效',
		waterDropDesc: '弹窗以水滴形态凝聚展开/收缩消失（实验性）',

		refreshSidebar: '刷新侧边栏',
		refreshSidebarDesc: '重新检测并整理侧边栏图标',
		refreshBtn: '刷新',
		refreshNotice: '侧边栏已刷新',

		customGroups: '自定义分组',
		customGroupsDesc: '创建自定义分组，手动选择要合并的功能',
		createGroup: '创建分组',
		editGroup: '编辑',
		deleteGroup: '删除',
		groupDeleted: '分组已删除',
		actionCount: '{count} 个功能',
		default: '默认',

		createGroupTitle: '创建分组',
		editGroupTitle: '编辑分组',
		selectFunctions: '选择功能',
		selectFunctionsDesc: '点击功能添加到右侧分组，点击分组标题可全选该组',
		availableFunctions: '可用功能',
		groupFunctions: '分组功能',
		clickToAdd: '点击左侧功能添加到分组',
		nextStep: '下一步',
		previousStep: '上一步',

		setNameAndIcon: '设置名称和图标',
		groupName: '分组名称',
		groupNameDesc: '为分组指定一个名称',
		groupNamePlaceholder: '如: 常用工具',
		customIcon: '自定义图标（可选）',
		clickSelectAll: '点击全选',

		pleaseEnterName: '请输入分组名称',
		pleaseSelectOne: '请至少选择一个功能',
		groupCreated: '分组已创建',
		groupUpdated: '分组已更新',

		usageInstructions: '使用说明',
		instruction1: '点击"创建分组"可以将多个侧边栏图标合并为一个',
		instruction2: '悬停在合并后的图标上会显示功能菜单',
		instruction3: '点击功能项即可激活对应功能',
		instruction4: '点击合并图标可以打开功能菜单',

		language: '语言',
		languageDesc: '选择插件界面语言（默认跟随 Obsidian 设置）',
		auto: '自动',

		commandToggle: '切换启用状态',
		commandRefresh: '刷新侧边栏',
		toggleEnabled: 'Sidebar Organizer 已启用',
		toggleDisabled: 'Sidebar Organizer 已禁用',
		confirmDeleteGroup: '确认删除？',

		cancel: '取消',
		save: '保存',

		svgPlaceholder: '输入 SVG 代码（可选）',
		examples: '示例：',
		folder: '文件夹',
		star: '星标',
		grid: '网格',
	},
	en: {
		pluginName: 'Sidebar Organizer',
		pluginDesc: 'Merge multiple sidebar icons from the same plugin into one, hover to show function menu',

		enableOrganizer: 'Enable Sidebar Organizer',
		enableOrganizerDesc: 'Turn on/off sidebar icon merging function',

		popupAppearance: 'Popup Appearance',
		blurEffect: 'Blur Effect',
		blurEffectDesc: 'Add blur background effect to popup menu',

		blurIntensity: 'Blur Intensity',
		blurIntensityDesc: 'Adjust background blur level (current: {value}px)',
		popupRounded: 'Rounded popup',
		popupRoundedDesc: 'Use rounded or square corners for popup menus',
		popupRadius: 'Corner radius',
		popupRadiusDesc: 'Popup corner radius (current: {value}px)',
		liquidGlass: 'Liquid glass effect',
		liquidGlassDesc: 'Experimental: iOS 26-style liquid glass (frost, rim highlight, sheen); higher rendering cost',
		liquidGlassBlur: 'Blur amount',
		liquidGlassBlurDesc: 'Liquid glass background blur strength (current: {value}px)',
		waterDrop: 'Water Drop Effect',
		waterDropDesc: 'Popup expands/shrinks like a water drop (experimental)',

		refreshSidebar: 'Refresh Sidebar',
		refreshSidebarDesc: 'Re-detect and organize sidebar icons',
		refreshBtn: 'Refresh',
		refreshNotice: 'Sidebar refreshed',

		customGroups: 'Custom Groups',
		customGroupsDesc: 'Create custom groups, manually select functions to merge',
		createGroup: 'Create Group',
		editGroup: 'Edit',
		deleteGroup: 'Delete',
		groupDeleted: 'Group deleted',
		actionCount: '{count} functions',
		default: 'Default',

		createGroupTitle: 'Create Group',
		editGroupTitle: 'Edit Group',
		selectFunctions: 'Select Functions',
		selectFunctionsDesc: 'Click functions to add to group, click group title to select all',
		availableFunctions: 'Available Functions',
		groupFunctions: 'Group Functions',
		clickToAdd: 'Click left functions to add to group',
		nextStep: 'Next',
		previousStep: 'Previous',

		setNameAndIcon: 'Set Name and Icon',
		groupName: 'Group Name',
		groupNameDesc: 'Specify a name for the group',
		groupNamePlaceholder: 'e.g.: Common Tools',
		customIcon: 'Custom Icon (Optional)',
		clickSelectAll: 'Click to select all',

		pleaseEnterName: 'Please enter group name',
		pleaseSelectOne: 'Please select at least one function',
		groupCreated: 'Group created',
		groupUpdated: 'Group updated',

		usageInstructions: 'Usage Instructions',
		instruction1: 'Click "Create Group" to merge multiple sidebar icons into one',
		instruction2: 'Hover over merged icon to show function menu',
		instruction3: 'Click function item to activate corresponding function',
		instruction4: 'Click the merged icon to open the function menu',

		language: 'Language',
		languageDesc: 'Select plugin interface language (default follows Obsidian settings)',
		auto: 'Auto',

		commandToggle: 'Toggle',
		commandRefresh: 'Refresh Sidebar',
		toggleEnabled: 'Sidebar Organizer enabled',
		toggleDisabled: 'Sidebar Organizer disabled',
		confirmDeleteGroup: 'Confirm delete?',

		cancel: 'Cancel',
		save: 'Save',

		svgPlaceholder: 'Enter SVG code (optional)',
		examples: 'Examples:',
		folder: 'Folder',
		star: 'Star',
		grid: 'Grid',
	},
	ja: {
		pluginName: 'Sidebar Organizer',
		pluginDesc: '同じプラグインの複数のサイドバーアイコンを1つにまとめ、ホバーで機能メニューを表示',

		enableOrganizer: 'サイドバー整理を有効化',
		enableOrganizerDesc: 'サイドバーアイコンの統合機能をオン/オフ',

		popupAppearance: 'ポップアップ外観',
		blurEffect: 'ブラー効果',
		blurEffectDesc: 'ポップアップメニューに背景ブラー効果を追加',

		blurIntensity: 'ブラー強度',
		blurIntensityDesc: '背景のブラーレベルを調整（現在: {value}px）',
		popupRounded: '角丸ポップアップ',
		popupRoundedDesc: 'ポップアップメニューの角を丸くするか直角にするか',
		popupRadius: '角丸の大きさ',
		popupRadiusDesc: 'ポップアップの角丸半径（現在: {value}px）',
		liquidGlass: 'リキッドグラス効果',
		liquidGlassDesc: '実験的: iOS 26 風のリキッドグラス表現（すりガラス+縁のハイライト+光沢）。描画負荷が高め',
		liquidGlassBlur: 'ぼかし量',
		liquidGlassBlurDesc: 'リキッドグラスの背景ぼかし強度（現在: {value}px）',
		waterDrop: '水滴エフェクト',
		waterDropDesc: 'ポップアップが水滴のように凝縮・収縮します（実験的）',

		refreshSidebar: 'サイドバーを更新',
		refreshSidebarDesc: 'サイドバーアイコンを再検出して整理',
		refreshBtn: '更新',
		refreshNotice: 'サイドバーを更新しました',

		customGroups: 'カスタムグループ',
		customGroupsDesc: 'カスタムグループを作成し、統合する機能を手動で選択',
		createGroup: 'グループ作成',
		editGroup: '編集',
		deleteGroup: '削除',
		groupDeleted: 'グループを削除しました',
		actionCount: '{count}個の機能',
		default: 'デフォルト',

		createGroupTitle: 'グループ作成',
		editGroupTitle: 'グループ編集',
		selectFunctions: '機能を選択',
		selectFunctionsDesc: '機能をクリックしてグループに追加、グループタイトルをクリックで全選択',
		availableFunctions: '利用可能な機能',
		groupFunctions: 'グループの機能',
		clickToAdd: '左側の機能をクリックしてグループに追加',
		nextStep: '次へ',
		previousStep: '戻る',

		setNameAndIcon: '名前とアイコンを設定',
		groupName: 'グループ名',
		groupNameDesc: 'グループの名前を指定',
		groupNamePlaceholder: '例: よく使うツール',
		customIcon: 'カスタムアイコン（任意）',
		clickSelectAll: 'クリックで全選択',

		pleaseEnterName: 'グループ名を入力してください',
		pleaseSelectOne: '少なくとも1つの機能を選択してください',
		groupCreated: 'グループを作成しました',
		groupUpdated: 'グループを更新しました',

		usageInstructions: '使い方',
		instruction1: '「グループ作成」をクリックして複数のサイドバーアイコンを1つにまとめる',
		instruction2: '統合されたアイコンにホバーすると機能メニューが表示されます',
		instruction3: '機能項目をクリックすると対応する機能が起動します',
		instruction4: '統合アイコンをクリックすると機能メニューが開きます',

		language: '言語',
		languageDesc: 'プラグインのインターフェース言語を選択（デフォルトはObsidianの設定に従う）',
		auto: '自動',

		commandToggle: '有効化を切り替え',
		commandRefresh: 'サイドバーを更新',
		toggleEnabled: 'Sidebar Organizer が有効になりました',
		toggleDisabled: 'Sidebar Organizer が無効になりました',
		confirmDeleteGroup: '削除しますか？',

		cancel: 'キャンセル',
		save: '保存',

		svgPlaceholder: 'SVGコードを入力（オプション）',
		examples: '例：',
		folder: 'フォルダ',
		star: 'スター',
		grid: 'グリッド',
	},
	ko: {
		pluginName: 'Sidebar Organizer',
		pluginDesc: '동일한 플러그인의 여러 사이드바 아이콘을 하나로 통합하고, 마우스 오버로 기능 메뉴 표시',

		enableOrganizer: '사이드바 정리 활성화',
		enableOrganizerDesc: '사이드바 아이콘 통합 기능 켜기/끄기',

		popupAppearance: '팝업 모양',
		blurEffect: '블러 효과',
		blurEffectDesc: '팝업 메뉴에 배경 블러 효과 추가',

		blurIntensity: '블러 강도',
		blurIntensityDesc: '배경 블러 수준 조정 (현재: {value}px)',
		popupRounded: '모서리 둥근 팝업',
		popupRoundedDesc: '팝업 메뉴 모서리를 둥글게 또는 직각으로 표시',
		popupRadius: '모서리 둥근 정도',
		popupRadiusDesc: '팝업 모서리 반경 (현재: {value}px)',
		liquidGlass: '리퀴드 글래스 효과',
		liquidGlassDesc: '실험적: iOS 26 스타일 리퀴드 글래스(프로스트+테두리 하이라이트+광택). 렌더링 부하가 높음',
		liquidGlassBlur: '흐림 정도',
		liquidGlassBlurDesc: '리퀴드 글래스 배경 흐림 강도 (현재: {value}px)',
		waterDrop: '물방울 효과',
		waterDropDesc: '팝업이 물방울처럼 응집되어 열리고 닫힙니다 (실험적)',

		refreshSidebar: '사이드바 새로고침',
		refreshSidebarDesc: '사이드바 아이콘 재감지 및 정리',
		refreshBtn: '새로고침',
		refreshNotice: '사이드바가 새로고침되었습니다',

		customGroups: '사용자 정의 그룹',
		customGroupsDesc: '사용자 정의 그룹을 생성하고 통합할 기능을 직접 선택',
		createGroup: '그룹 생성',
		editGroup: '편집',
		deleteGroup: '삭제',
		groupDeleted: '그룹이 삭제되었습니다',
		actionCount: '{count}개 기능',
		default: '기본값',

		createGroupTitle: '그룹 생성',
		editGroupTitle: '그룹 편집',
		selectFunctions: '기능 선택',
		selectFunctionsDesc: '기능을 클릭하여 그룹에 추가, 그룹 제목 클릭으로 전체 선택',
		availableFunctions: '사용 가능한 기능',
		groupFunctions: '그룹 기능',
		clickToAdd: '왼쪽 기능을 클릭하여 그룹에 추가',
		nextStep: '다음',
		previousStep: '이전',

		setNameAndIcon: '이름 및 아이콘 설정',
		groupName: '그룹 이름',
		groupNameDesc: '그룹의 이름을 지정하세요',
		groupNamePlaceholder: '예: 자주 사용하는 도구',
		customIcon: '사용자 정의 아이콘 (선택사항)',
		clickSelectAll: '클릭하여 전체 선택',

		pleaseEnterName: '그룹 이름을 입력하세요',
		pleaseSelectOne: '최소 하나의 기능을 선택하세요',
		groupCreated: '그룹이 생성되었습니다',
		groupUpdated: '그룹이 업데이트되었습니다',

		usageInstructions: '사용 방법',
		instruction1: '"그룹 생성"을 클릭하여 여러 사이드바 아이콘을 하나로 통합',
		instruction2: '통합된 아이콘에 마우스를 올리면 기능 메뉴가 표시됩니다',
		instruction3: '기능 항목을 클릭하면 해당 기능이 활성화됩니다',
		instruction4: '통합 아이콘을 클릭하면 기능 메뉴가 열립니다',

		language: '언어',
		languageDesc: '플러그인 인터페이스 언어 선택 (기본값은 Obsidian 설정 따름)',
		auto: '자동',

		commandToggle: '활성화 전환',
		commandRefresh: '사이드바 새로고침',
		toggleEnabled: '사이드바 정리가 활성화되었습니다',
		toggleDisabled: '사이드바 정리가 비활성화되었습니다',
		confirmDeleteGroup: '삭제하시겠습니까?',

		cancel: '취소',
		save: '저장',

		svgPlaceholder: 'SVG 코드 입력 (선택사항)',
		examples: '예시:',
		folder: '폴더',
		star: '별',
		grid: '그리드',
	},
	de: {
		pluginName: 'Sidebar Organizer',
		pluginDesc: 'Mehrere Sidebar-Symbole desselben Plugins zu einem zusammenfassen, Hover zeigt Funktionsmenü',

		enableOrganizer: 'Sidebar-Organisation aktivieren',
		enableOrganizerDesc: 'Funktion zum Zusammenfassen von Sidebar-Symbolen ein-/ausschalten',

		popupAppearance: 'Popup-Optik',
		blurEffect: 'Unschärfe-Effekt',
		blurEffectDesc: 'Unschärfe-Effekt für Hintergrund des Popup-Menüs hinzufügen',

		blurIntensity: 'Unschärfe-Intensität',
		blurIntensityDesc: 'Hintergrundunschärfe anpassen (aktuell: {value}px)',
		popupRounded: 'Abgerundetes Popup',
		popupRoundedDesc: 'Abgerundete oder eckige Ecken für Popup-Menüs',
		popupRadius: 'Eckenradius',
		popupRadiusDesc: 'Popup-Eckenradius (aktuell: {value}px)',
		liquidGlass: 'Liquid-Glass-Effekt',
		liquidGlassDesc: 'Experimentell: iOS-26-Look (Mattglas, Kanten-Highlight, Glanz); höhere Rendering-Kosten',
		liquidGlassBlur: 'Unschärfe',
		liquidGlassBlurDesc: 'Hintergrundunschärfe des Liquid Glass (aktuell: {value}px)',
		waterDrop: 'Wassertropfen-Effekt',
		waterDropDesc: 'Popup öffnet/schließt sich wie ein Wassertropfen (experimentell)',

		refreshSidebar: 'Sidebar aktualisieren',
		refreshSidebarDesc: 'Sidebar-Symbole erneut erkennen und organisieren',
		refreshBtn: 'Aktualisieren',
		refreshNotice: 'Sidebar wurde aktualisiert',

		customGroups: 'Benutzerdefinierte Gruppen',
		customGroupsDesc: 'Benutzerdefinierte Gruppen erstellen und Funktionen zum Zusammenfassen manuell auswählen',
		createGroup: 'Gruppe erstellen',
		editGroup: 'Bearbeiten',
		deleteGroup: 'Löschen',
		groupDeleted: 'Gruppe gelöscht',
		actionCount: '{count} Funktionen',
		default: 'Standard',

		createGroupTitle: 'Gruppe erstellen',
		editGroupTitle: 'Gruppe bearbeiten',
		selectFunctions: 'Funktionen auswählen',
		selectFunctionsDesc: 'Funktionen anklicken um zur Gruppe hinzuzufügen, Gruppentitel anklicken für Alle auswählen',
		availableFunctions: 'Verfügbare Funktionen',
		groupFunctions: 'Gruppenfunktionen',
		clickToAdd: 'Linke Funktionen anklicken um zur Gruppe hinzuzufügen',
		nextStep: 'Weiter',
		previousStep: 'Zurück',

		setNameAndIcon: 'Name und Symbol festlegen',
		groupName: 'Gruppenname',
		groupNameDesc: 'Einen Namen für die Gruppe angeben',
		groupNamePlaceholder: 'z.B.: Häufig verwendete Tools',
		customIcon: 'Benutzerdefiniertes Symbol (Optional)',
		clickSelectAll: 'Klicken um alle auszuwählen',

		pleaseEnterName: 'Bitte Gruppennamen eingeben',
		pleaseSelectOne: 'Bitte mindestens eine Funktion auswählen',
		groupCreated: 'Gruppe erstellt',
		groupUpdated: 'Gruppe aktualisiert',

		usageInstructions: 'Bedienungsanleitung',
		instruction1: '"Gruppe erstellen" anklicken um mehrere Sidebar-Symbole zu einem zusammenzufassen',
		instruction2: 'Über zusammengefasstes Symbol hovern um Funktionsmenü anzuzeigen',
		instruction3: 'Funktion anklicken um entsprechende Funktion zu aktivieren',
		instruction4: 'Klicken Sie auf das zusammengefasste Symbol, um das Funktionsmenü zu öffnen',

		language: 'Sprache',
		languageDesc: 'Plugin-Oberflächensprache auswählen (Standard folgt Obsidian-Einstellungen)',
		auto: 'Automatisch',

		commandToggle: 'Aktivierung umschalten',
		commandRefresh: 'Sidebar aktualisieren',
		toggleEnabled: 'Sidebar Organizer aktiviert',
		toggleDisabled: 'Sidebar Organizer deaktiviert',
		confirmDeleteGroup: 'Löschen bestätigen?',

		cancel: 'Abbrechen',
		save: 'Speichern',

		svgPlaceholder: 'SVG-Code eingeben (optional)',
		examples: 'Beispiele:',
		folder: 'Ordner',
		star: 'Stern',
		grid: 'Raster',
	},
	ru: {
		pluginName: 'Sidebar Organizer',
		pluginDesc: 'Объединить несколько значков боковой панели одного плагина в один, при наведении показать меню функций',

		enableOrganizer: 'Включить организацию боковой панели',
		enableOrganizerDesc: 'Включить/выключить функцию объединения значков боковой панели',

		popupAppearance: 'Внешний вид меню',
		blurEffect: 'Эффект размытия',
		blurEffectDesc: 'Добавить эффект размытия фона для всплывающего меню',

		blurIntensity: 'Интенсивность размытия',
		blurIntensityDesc: 'Настроить уровень размытия фона (текущее: {value}px)',
		popupRounded: 'Скруглённые углы',
		popupRoundedDesc: 'Скруглённые или прямые углы всплывающих меню',
		popupRadius: 'Радиус скругления',
		popupRadiusDesc: 'Радиус скругления углов (сейчас: {value}px)',
		liquidGlass: 'Эффект жидкого стекла',
		liquidGlassDesc: 'Экспериментально: стиль Liquid Glass (iOS 26) — матовое стекло, блики и глянец; выше нагрузка на рендеринг',
		liquidGlassBlur: 'Размытие',
		liquidGlassBlurDesc: 'Сила размытия фона жидкого стекла (сейчас: {value}px)',
		waterDrop: 'Эффект капли',
		waterDropDesc: 'Всплывающее окно разворачивается/сворачивается как капля (экспериментально)',

		refreshSidebar: 'Обновить боковую панель',
		refreshSidebarDesc: 'Повторно определить и организовать значки боковой панели',
		refreshBtn: 'Обновить',
		refreshNotice: 'Боковая панель обновлена',

		customGroups: 'Пользовательские группы',
		customGroupsDesc: 'Создать пользовательские группы, вручную выбрать функции для объединения',
		createGroup: 'Создать группу',
		editGroup: 'Редактировать',
		deleteGroup: 'Удалить',
		groupDeleted: 'Группа удалена',
		actionCount: '{count} функций',
		default: 'По умолчанию',

		createGroupTitle: 'Создать группу',
		editGroupTitle: 'Редактировать группу',
		selectFunctions: 'Выбрать функции',
		selectFunctionsDesc: 'Нажмите на функцию чтобы добавить в группу, нажмите на заголовок группы чтобы выбрать все',
		availableFunctions: 'Доступные функции',
		groupFunctions: 'Функции группы',
		clickToAdd: 'Нажмите на функцию слева чтобы добавить в группу',
		nextStep: 'Далее',
		previousStep: 'Назад',

		setNameAndIcon: 'Установить имя и значок',
		groupName: 'Имя группы',
		groupNameDesc: 'Укажите имя для группы',
		groupNamePlaceholder: 'напр.: Частые инструменты',
		customIcon: 'Пользовательский значок (необязательно)',
		clickSelectAll: 'Нажмите чтобы выбрать все',

		pleaseEnterName: 'Пожалуйста введите имя группы',
		pleaseSelectOne: 'Пожалуйста выберите хотя бы одну функцию',
		groupCreated: 'Группа создана',
		groupUpdated: 'Группа обновлена',

		usageInstructions: 'Инструкция по использованию',
		instruction1: 'Нажмите "Создать группу" чтобы объединить несколько значков боковой панели в один',
		instruction2: 'Наведите на объединенный значок чтобы показать меню функций',
		instruction3: 'Нажмите на элемент функции чтобы активировать соответствующую функцию',
		instruction4: 'Нажмите на объединенный значок чтобы открыть меню функций',

		language: 'Язык',
		languageDesc: 'Выбрать язык интерфейса плагина (по умолчанию следует настройкам Obsidian)',
		auto: 'Авто',

		commandToggle: 'Переключить включение',
		commandRefresh: 'Обновить боковую панель',
		toggleEnabled: 'Sidebar Organizer включен',
		toggleDisabled: 'Sidebar Organizer выключен',
		confirmDeleteGroup: 'Подтвердить удаление?',

		cancel: 'Отмена',
		save: 'Сохранить',

		svgPlaceholder: 'Введите SVG-код (необязательно)',
		examples: 'Примеры:',
		folder: 'Папка',
		star: 'Звезда',
		grid: 'Сетка',
	},
	es: {
		pluginName: 'Sidebar Organizer',
		pluginDesc: 'Fusionar múltiples iconos de la barra lateral del mismo plugin en uno, al pasar el mouse mostrar menú de funciones',

		enableOrganizer: 'Activar organización de barra lateral',
		enableOrganizerDesc: 'Activar/desactivar función de fusión de iconos de barra lateral',

		popupAppearance: 'Apariencia del menú',
		blurEffect: 'Efecto de desenfoque',
		blurEffectDesc: 'Añadir efecto de desenfoque de fondo al menú emergente',

		blurIntensity: 'Intensidad del desenfoque',
		blurIntensityDesc: 'Ajustar nivel de desenfoque de fondo (actual: {value}px)',
		popupRounded: 'Esquinas redondeadas',
		popupRoundedDesc: 'Usar esquinas redondeadas o rectas en los menús emergentes',
		popupRadius: 'Radio de esquinas',
		popupRadiusDesc: 'Radio de esquinas del menú (actual: {value}px)',
		liquidGlass: 'Efecto de vidrio líquido',
		liquidGlassDesc: 'Experimental: estilo Liquid Glass (iOS 26) — vidrio esmerilado, brillos y lustre; mayor coste de renderizado',
		liquidGlassBlur: 'Desenfoque',
		liquidGlassBlurDesc: 'Intensidad de desenfoque del fondo (actual: {value}px)',
		waterDrop: 'Efecto gota',
		waterDropDesc: 'El menú se expande/contrae como una gota de agua (experimental)',

		refreshSidebar: 'Actualizar barra lateral',
		refreshSidebarDesc: 'Redetectar y organizar iconos de barra lateral',
		refreshBtn: 'Actualizar',
		refreshNotice: 'Barra lateral actualizada',

		customGroups: 'Grupos personalizados',
		customGroupsDesc: 'Crear grupos personalizados, seleccionar manualmente funciones a fusionar',
		createGroup: 'Crear grupo',
		editGroup: 'Editar',
		deleteGroup: 'Eliminar',
		groupDeleted: 'Grupo eliminado',
		actionCount: '{count} funciones',
		default: 'Predeterminado',

		createGroupTitle: 'Crear grupo',
		editGroupTitle: 'Editar grupo',
		selectFunctions: 'Seleccionar funciones',
		selectFunctionsDesc: 'Clic en función para añadir al grupo, clic en título del grupo para seleccionar todo',
		availableFunctions: 'Funciones disponibles',
		groupFunctions: 'Funciones del grupo',
		clickToAdd: 'Clic en función izquierda para añadir al grupo',
		nextStep: 'Siguiente',
		previousStep: 'Anterior',

		setNameAndIcon: 'Establecer nombre e icono',
		groupName: 'Nombre del grupo',
		groupNameDesc: 'Especificar un nombre para el grupo',
		groupNamePlaceholder: 'ej: Herramientas comunes',
		customIcon: 'Icono personalizado (Opcional)',
		clickSelectAll: 'Clic para seleccionar todo',

		pleaseEnterName: 'Por favor ingrese nombre del grupo',
		pleaseSelectOne: 'Por favor seleccione al menos una función',
		groupCreated: 'Grupo creado',
		groupUpdated: 'Grupo actualizado',

		usageInstructions: 'Instrucciones de uso',
		instruction1: 'Clic en "Crear grupo" para fusionar múltiples iconos de barra lateral en uno',
		instruction2: 'Pasar mouse sobre icono fusionado para mostrar menú de funciones',
		instruction3: 'Clic en elemento de función para activar función correspondiente',
		instruction4: 'Clic en el icono fusionado para abrir el menú de funciones',

		language: 'Idioma',
		languageDesc: 'Seleccionar idioma de interfaz del plugin (por defecto sigue configuración de Obsidian)',
		auto: 'Auto',

		commandToggle: 'Alternar activación',
		commandRefresh: 'Actualizar barra lateral',
		toggleEnabled: 'Sidebar Organizer activado',
		toggleDisabled: 'Sidebar Organizer desactivado',
		confirmDeleteGroup: '¿Confirmar borrado?',

		cancel: 'Cancelar',
		save: 'Guardar',

		svgPlaceholder: 'Introducir código SVG (opcional)',
		examples: 'Ejemplos:',
		folder: 'Carpeta',
		star: 'Estrella',
		grid: 'Cuadrícula',
	},
	fr: {
		pluginName: 'Sidebar Organizer',
		pluginDesc: 'Fusionner plusieurs icônes de barre latérale du même plugin en une seule, survol pour afficher le menu des fonctions',

		enableOrganizer: 'Activer l\'organisation de la barre latérale',
		enableOrganizerDesc: 'Activer/désactiver la fonction de fusion des icônes de barre latérale',

		popupAppearance: 'Apparence du menu',
		blurEffect: 'Effet de flou',
		blurEffectDesc: 'Ajouter un effet de flou en arrière-plan au menu contextuel',

		blurIntensity: 'Intensité du flou',
		blurIntensityDesc: 'Ajuster le niveau de flou de l\'arrière-plan (actuel: {value}px)',
		popupRounded: 'Coins arrondis',
		popupRoundedDesc: 'Utiliser des coins arrondis ou droits pour les menus contextuels',
		popupRadius: 'Rayon des coins',
		popupRadiusDesc: 'Rayon des coins du menu (actuel : {value}px)',
		liquidGlass: 'Effet verre liquide',
		liquidGlassDesc: 'Expérimental: style Liquid Glass (iOS 26) — verre dépoli, reflets et lustre; coût de rendu plus élevé',
		liquidGlassBlur: 'Flou',
		liquidGlassBlurDesc: 'Intensité du flou d’arrière-plan du verre liquide (actuel : {value}px)',
		waterDrop: 'Effet goutte',
		waterDropDesc: 'Le menu s’ouvre/se referme comme une goutte d’eau (expérimental)',

		refreshSidebar: 'Actualiser la barre latérale',
		refreshSidebarDesc: 'Redétecter et organiser les icônes de barre latérale',
		refreshBtn: 'Actualiser',
		refreshNotice: 'Barre latérale actualisée',

		customGroups: 'Groupes personnalisés',
		customGroupsDesc: 'Créer des groupes personnalisés, sélectionner manuellement les fonctions à fusionner',
		createGroup: 'Créer un groupe',
		editGroup: 'Modifier',
		deleteGroup: 'Supprimer',
		groupDeleted: 'Groupe supprimé',
		actionCount: '{count} fonctions',
		default: 'Par défaut',

		createGroupTitle: 'Créer un groupe',
		editGroupTitle: 'Modifier le groupe',
		selectFunctions: 'Sélectionner les fonctions',
		selectFunctionsDesc: 'Cliquer sur une fonction pour l\'ajouter au groupe, cliquer sur le titre du groupe pour tout sélectionner',
		availableFunctions: 'Fonctions disponibles',
		groupFunctions: 'Fonctions du groupe',
		clickToAdd: 'Cliquer sur les fonctions à gauche pour les ajouter au groupe',
		nextStep: 'Suivant',
		previousStep: 'Précédent',

		setNameAndIcon: 'Définir le nom et l\'icône',
		groupName: 'Nom du groupe',
		groupNameDesc: 'Spécifier un nom pour le groupe',
		groupNamePlaceholder: 'ex: Outils courants',
		customIcon: 'Icône personnalisée (Optionnel)',
		clickSelectAll: 'Cliquer pour tout sélectionner',

		pleaseEnterName: 'Veuillez entrer un nom de groupe',
		pleaseSelectOne: 'Veuillez sélectionner au moins une fonction',
		groupCreated: 'Groupe créé',
		groupUpdated: 'Groupe mis à jour',

		usageInstructions: 'Instructions d\'utilisation',
		instruction1: 'Cliquer sur "Créer un groupe" pour fusionner plusieurs icônes de barre latérale en une seule',
		instruction2: 'Survoler l\'icône fusionnée pour afficher le menu des fonctions',
		instruction3: 'Cliquer sur un élément de fonction pour activer la fonction correspondante',
		instruction4: 'Cliquer sur l\'icône fusionnée pour ouvrir le menu des fonctions',

		language: 'Langue',
		languageDesc: 'Sélectionner la langue de l\'interface du plugin (par défaut suit les paramètres d\'Obsidian)',
		auto: 'Auto',

		commandToggle: 'Basculer l\'activation',
		commandRefresh: 'Actualiser la barre latérale',
		toggleEnabled: 'Sidebar Organizer activé',
		toggleDisabled: 'Sidebar Organizer désactivé',
		confirmDeleteGroup: 'Confirmer la suppression ?',

		cancel: 'Annuler',
		save: 'Enregistrer',

		svgPlaceholder: 'Entrer le code SVG (optionnel)',
		examples: 'Exemples:',
		folder: 'Dossier',
		star: 'Étoile',
		grid: 'Grille',
	},
};

export function getLanguageCode(lang: string): Language {
	if (lang.startsWith('zh')) return 'zh';
	if (lang.startsWith('en')) return 'en';
	if (lang.startsWith('ja')) return 'ja';
	if (lang.startsWith('ko')) return 'ko';
	if (lang.startsWith('de')) return 'de';
	if (lang.startsWith('ru')) return 'ru';
	if (lang.startsWith('es')) return 'es';
	if (lang.startsWith('fr')) return 'fr';
	return 'en';
}

export function getPluginLanguage(settings: SidebarOrganizerSettings, locale?: string): Language {
	if (settings.language === 'auto') {
		return getLanguageCode(locale || 'en');
	}
	return settings.language as Language;
}

export function translate(lang: Language, key: string, params?: Record<string, string | number>): string {
	const table = translations[lang] || translations['en'];
	let text = table[key] || translations['en'][key] || key;
	if (params) {
		for (const [k, v] of Object.entries(params)) {
			text = text.replace(`{${k}}`, String(v));
		}
	}
	return text;
}

/**
 * 生成绑定好 settings/locale 的翻译函数，避免在多个类中重复实现
 */
export function createTranslator(
	getSettings: () => SidebarOrganizerSettings,
	getLocale: () => string | undefined
): (key: string, params?: Record<string, string | number>) => string {
	return (key, params) => translate(getPluginLanguage(getSettings(), getLocale()), key, params);
}
