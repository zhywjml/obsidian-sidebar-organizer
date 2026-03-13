import { App, Plugin, PluginSettingTab, Setting, Notice, Modal, PluginManifest } from 'obsidian';

// ==================== 类型定义 ====================

interface VaultConfig {
	locale?: string;
}

interface PluginsContainer {
	manifests?: Record<string, PluginManifest>;
}

// ==================== 安全 SVG 插入 ====================

/**
 * 安全地将 SVG 内容插入到元素中
 * 使用 DOMParser 解析 SVG，然后通过 DOM 方法插入
 */
function setSvgContent(element: HTMLElement, svgContent: string): void {
	element.empty();
	if (!svgContent || !svgContent.includes('<svg')) return;

	const parser = new DOMParser();
	const doc = parser.parseFromString(svgContent.trim(), 'image/svg+xml');
	const svg = doc.querySelector('svg');
	if (svg) {
		element.appendChild(svg);
	}
}

/**
 * 安全地解析 SVG 内容并返回 SVG 元素
 */
function parseSvg(svgContent: string): SVGSVGElement | null {
	if (!svgContent || !svgContent.includes('<svg')) return null;

	const parser = new DOMParser();
	const doc = parser.parseFromString(svgContent.trim(), 'image/svg+xml');
	return doc.querySelector('svg');
}

// ==================== 国际化 ====================

type Language = 'zh' | 'en' | 'ja' | 'ko' | 'de' | 'ru' | 'es' | 'fr';

const translations = {
	zh: {
		// 设置页面
		pluginName: 'Sidebar Organizer',
		pluginDesc: '将同一插件的多个侧边栏图标合并为一个，悬停显示功能菜单',

		enableOrganizer: '启用侧边栏整理',
		enableOrganizerDesc: '开启/关闭侧边栏图标合并功能',

		blurEffect: '毛玻璃效果',
		blurEffectDesc: '为弹出菜单添加模糊背景效果',

		blurIntensity: '模糊强度',
		blurIntensityDesc: '调整背景模糊程度 (当前: {value}px)',

		refreshSidebar: '刷新侧边栏',
		refreshSidebarDesc: '重新检测并整理侧边栏图标',
		refreshBtn: '刷新',
		refreshNotice: '侧边栏已刷新',

		// 自定义分组
		customGroups: '自定义分组',
		customGroupsDesc: '创建自定义分组，手动选择要合并的功能',
		createGroup: '创建分组',
		editGroup: '编辑',
		deleteGroup: '删除',
		groupDeleted: '分组已删除',
		actionCount: '{count} 个功能',
		default: '默认',

		// 创建分组模态框
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
		selectAll: '全选',

		pleaseEnterName: '请输入分组名称',
		pleaseSelectOne: '请至少选择一个功能',
		groupCreated: '分组已创建',
		groupUpdated: '分组已更新',

		// 使用说明
		usageInstructions: '使用说明',
		instruction1: '点击"创建分组"可以将多个侧边栏图标合并为一个',
		instruction2: '悬停在合并后的图标上会显示功能菜单',
		instruction3: '点击功能项即可激活对应功能',
		instruction4: '点击合并图标可以直接打开第一个功能',

		// 语言设置
		language: '语言',
		languageDesc: '选择插件界面语言（默认跟随 Obsidian 设置）',
		auto: '自动',

		// 其他
		assigned: '已分配',
		cancel: '取消',
		save: '保存',
		noPreview: '暂无预览',

		// 图标示例
		svgPlaceholder: '输入 SVG 代码（可选）',
		examples: '示例：',
		folder: '文件夹',
		star: '星标',
		grid: '网格',
	},
	en: {
		// Settings
		pluginName: 'Sidebar Organizer',
		pluginDesc: 'Merge multiple sidebar icons from the same plugin into one, hover to show function menu',

		enableOrganizer: 'Enable Sidebar Organizer',
		enableOrganizerDesc: 'Turn on/off sidebar icon merging function',

		blurEffect: 'Blur Effect',
		blurEffectDesc: 'Add blur background effect to popup menu',

		blurIntensity: 'Blur Intensity',
		blurIntensityDesc: 'Adjust background blur level (current: {value}px)',

		refreshSidebar: 'Refresh Sidebar',
		refreshSidebarDesc: 'Re-detect and organize sidebar icons',
		refreshBtn: 'Refresh',
		refreshNotice: 'Sidebar refreshed',

		// Custom Groups
		customGroups: 'Custom Groups',
		customGroupsDesc: 'Create custom groups, manually select functions to merge',
		createGroup: 'Create Group',
		editGroup: 'Edit',
		deleteGroup: 'Delete',
		groupDeleted: 'Group deleted',
		actionCount: '{count} functions',
		default: 'Default',

		// Create Group Modal
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
		selectAll: 'Select All',

		pleaseEnterName: 'Please enter group name',
		pleaseSelectOne: 'Please select at least one function',
		groupCreated: 'Group created',
		groupUpdated: 'Group updated',

		// Usage Instructions
		usageInstructions: 'Usage Instructions',
		instruction1: 'Click "Create Group" to merge multiple sidebar icons into one',
		instruction2: 'Hover over merged icon to show function menu',
		instruction3: 'Click function item to activate corresponding function',
		instruction4: 'Click merged icon to directly open the first function',

		// Language Settings
		language: 'Language',
		languageDesc: 'Select plugin interface language (default follows Obsidian settings)',
		auto: 'Auto',

		// Others
		assigned: 'Assigned',
		cancel: 'Cancel',
		save: 'Save',
		noPreview: 'No preview',

		// Icon examples
		svgPlaceholder: 'Enter SVG code (optional)',
		examples: 'Examples:',
		folder: 'Folder',
		star: 'Star',
		grid: 'Grid',
	},
	ja: {
		// 設定ページ
		pluginName: 'Sidebar Organizer',
		pluginDesc: '同じプラグインの複数のサイドバーアイコンを1つにまとめ、ホバーで機能メニューを表示',

		enableOrganizer: 'サイドバー整理を有効化',
		enableOrganizerDesc: 'サイドバーアイコンの統合機能をオン/オフ',

		blurEffect: 'ブラー効果',
		blurEffectDesc: 'ポップアップメニューに背景ブラー効果を追加',

		blurIntensity: 'ブラー強度',
		blurIntensityDesc: '背景のブラーレベルを調整（現在: {value}px）',

		refreshSidebar: 'サイドバーを更新',
		refreshSidebarDesc: 'サイドバーアイコンを再検出して整理',
		refreshBtn: '更新',
		refreshNotice: 'サイドバーを更新しました',

		// カスタムグループ
		customGroups: 'カスタムグループ',
		customGroupsDesc: 'カスタムグループを作成し、統合する機能を手動で選択',
		createGroup: 'グループ作成',
		editGroup: '編集',
		deleteGroup: '削除',
		groupDeleted: 'グループを削除しました',
		actionCount: '{count}個の機能',
		default: 'デフォルト',

		// グループ作成モーダル
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
		selectAll: '全選択',

		pleaseEnterName: 'グループ名を入力してください',
		pleaseSelectOne: '少なくとも1つの機能を選択してください',
		groupCreated: 'グループを作成しました',
		groupUpdated: 'グループを更新しました',

		// 使用説明
		usageInstructions: '使い方',
		instruction1: '「グループ作成」をクリックして複数のサイドバーアイコンを1つにまとめる',
		instruction2: '統合されたアイコンにホバーすると機能メニューが表示されます',
		instruction3: '機能項目をクリックすると対応する機能が起動します',
		instruction4: '統合アイコンをクリックすると最初の機能が直接開きます',

		// 言語設定
		language: '言語',
		languageDesc: 'プラグインのインターフェース言語を選択（デフォルトはObsidianの設定に従う）',
		auto: '自動',

		// その他
		assigned: '割り当て済み',
		cancel: 'キャンセル',
		save: '保存',
		noPreview: 'プレビューなし',

		// アイコン例
		svgPlaceholder: 'SVGコードを入力（オプション）',
		examples: '例：',
		folder: 'フォルダ',
		star: 'スター',
		grid: 'グリッド',
	},
	ko: {
		// 설정 페이지
		pluginName: 'Sidebar Organizer',
		pluginDesc: '동일한 플러그인의 여러 사이드바 아이콘을 하나로 통합하고, 마우스 오버로 기능 메뉴 표시',

		enableOrganizer: '사이드바 정리 활성화',
		enableOrganizerDesc: '사이드바 아이콘 통합 기능 켜기/끄기',

		blurEffect: '블러 효과',
		blurEffectDesc: '팝업 메뉴에 배경 블러 효과 추가',

		blurIntensity: '블러 강도',
		blurIntensityDesc: '배경 블러 수준 조정 (현재: {value}px)',

		refreshSidebar: '사이드바 새로고침',
		refreshSidebarDesc: '사이드바 아이콘 재감지 및 정리',
		refreshBtn: '새로고침',
		refreshNotice: '사이드바가 새로고침되었습니다',

		// 사용자 정의 그룹
		customGroups: '사용자 정의 그룹',
		customGroupsDesc: '사용자 정의 그룹을 생성하고 통합할 기능을 직접 선택',
		createGroup: '그룹 생성',
		editGroup: '편집',
		deleteGroup: '삭제',
		groupDeleted: '그룹이 삭제되었습니다',
		actionCount: '{count}개 기능',
		default: '기본값',

		// 그룹 생성 모달
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
		selectAll: '전체 선택',

		pleaseEnterName: '그룹 이름을 입력하세요',
		pleaseSelectOne: '최소 하나의 기능을 선택하세요',
		groupCreated: '그룹이 생성되었습니다',
		groupUpdated: '그룹이 업데이트되었습니다',

		// 사용 안내
		usageInstructions: '사용 방법',
		instruction1: '"그룹 생성"을 클릭하여 여러 사이드바 아이콘을 하나로 통합',
		instruction2: '통합된 아이콘에 마우스를 올리면 기능 메뉴가 표시됩니다',
		instruction3: '기능 항목을 클릭하면 해당 기능이 활성화됩니다',
		instruction4: '통합 아이콘을 클릭하면 첫 번째 기능이 바로 열립니다',

		// 언어 설정
		language: '언어',
		languageDesc: '플러그인 인터페이스 언어 선택 (기본값은 Obsidian 설정 따름)',
		auto: '자동',

		// 기타
		assigned: '할당됨',
		cancel: '취소',
		save: '저장',
		noPreview: '미리보기 없음',

		// 아이콘 예시
		svgPlaceholder: 'SVG 코드 입력 (선택사항)',
		examples: '예시:',
		folder: '폴더',
		star: '별',
		grid: '그리드',
	},
	de: {
		// Einstellungen
		pluginName: 'Sidebar Organizer',
		pluginDesc: 'Mehrere Sidebar-Symbole desselben Plugins zu einem zusammenfassen, Hover zeigt Funktionsmenü',

		enableOrganizer: 'Sidebar-Organisation aktivieren',
		enableOrganizerDesc: 'Funktion zum Zusammenfassen von Sidebar-Symbolen ein-/ausschalten',

		blurEffect: 'Unschärfe-Effekt',
		blurEffectDesc: 'Unschärfe-Effekt für Hintergrund des Popup-Menüs hinzufügen',

		blurIntensity: 'Unschärfe-Intensität',
		blurIntensityDesc: 'Hintergrundunschärfe anpassen (aktuell: {value}px)',

		refreshSidebar: 'Sidebar aktualisieren',
		refreshSidebarDesc: 'Sidebar-Symbole erneut erkennen und organisieren',
		refreshBtn: 'Aktualisieren',
		refreshNotice: 'Sidebar wurde aktualisiert',

		// Benutzerdefinierte Gruppen
		customGroups: 'Benutzerdefinierte Gruppen',
		customGroupsDesc: 'Benutzerdefinierte Gruppen erstellen und Funktionen zum Zusammenfassen manuell auswählen',
		createGroup: 'Gruppe erstellen',
		editGroup: 'Bearbeiten',
		deleteGroup: 'Löschen',
		groupDeleted: 'Gruppe gelöscht',
		actionCount: '{count} Funktionen',
		default: 'Standard',

		// Gruppenerstellungs-Modal
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
		selectAll: 'Alle auswählen',

		pleaseEnterName: 'Bitte Gruppennamen eingeben',
		pleaseSelectOne: 'Bitte mindestens eine Funktion auswählen',
		groupCreated: 'Gruppe erstellt',
		groupUpdated: 'Gruppe aktualisiert',

		// Bedienungsanleitung
		usageInstructions: 'Bedienungsanleitung',
		instruction1: '"Gruppe erstellen" anklicken um mehrere Sidebar-Symbole zu einem zusammenzufassen',
		instruction2: 'Über zusammengefasstes Symbol hovern um Funktionsmenü anzuzeigen',
		instruction3: 'Funktion anklicken um entsprechende Funktion zu aktivieren',
		instruction4: 'Zusammengefasstes Symbol anklicken um erste Funktion direkt zu öffnen',

		// Spracheinstellungen
		language: 'Sprache',
		languageDesc: 'Plugin-Oberflächensprache auswählen (Standard folgt Obsidian-Einstellungen)',
		auto: 'Automatisch',

		// Sonstiges
		assigned: 'Zugewiesen',
		cancel: 'Abbrechen',
		save: 'Speichern',
		noPreview: 'Keine Vorschau',

		// Symbol-Beispiele
		svgPlaceholder: 'SVG-Code eingeben (optional)',
		examples: 'Beispiele:',
		folder: 'Ordner',
		star: 'Stern',
		grid: 'Raster',
	},
	ru: {
		// Настройки
		pluginName: 'Sidebar Organizer',
		pluginDesc: 'Объединить несколько значков боковой панели одного плагина в один, при наведении показать меню функций',

		enableOrganizer: 'Включить организацию боковой панели',
		enableOrganizerDesc: 'Включить/выключить функцию объединения значков боковой панели',

		blurEffect: 'Эффект размытия',
		blurEffectDesc: 'Добавить эффект размытия фона для всплывающего меню',

		blurIntensity: 'Интенсивность размытия',
		blurIntensityDesc: 'Настроить уровень размытия фона (текущее: {value}px)',

		refreshSidebar: 'Обновить боковую панель',
		refreshSidebarDesc: 'Повторно определить и организовать значки боковой панели',
		refreshBtn: 'Обновить',
		refreshNotice: 'Боковая панель обновлена',

		// Пользовательские группы
		customGroups: 'Пользовательские группы',
		customGroupsDesc: 'Создать пользовательские группы, вручную выбрать функции для объединения',
		createGroup: 'Создать группу',
		editGroup: 'Редактировать',
		deleteGroup: 'Удалить',
		groupDeleted: 'Группа удалена',
		actionCount: '{count} функций',
		default: 'По умолчанию',

		// Модальное окно создания группы
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
		selectAll: 'Выбрать все',

		pleaseEnterName: 'Пожалуйста введите имя группы',
		pleaseSelectOne: 'Пожалуйста выберите хотя бы одну функцию',
		groupCreated: 'Группа создана',
		groupUpdated: 'Группа обновлена',

		// Инструкция по использованию
		usageInstructions: 'Инструкция по использованию',
		instruction1: 'Нажмите "Создать группу" чтобы объединить несколько значков боковой панели в один',
		instruction2: 'Наведите на объединенный значок чтобы показать меню функций',
		instruction3: 'Нажмите на элемент функции чтобы активировать соответствующую функцию',
		instruction4: 'Нажмите на объединенный значок чтобы напрямую открыть первую функцию',

		// Настройки языка
		language: 'Язык',
		languageDesc: 'Выбрать язык интерфейса плагина (по умолчанию следует настройкам Obsidian)',
		auto: 'Авто',

		// Прочее
		assigned: 'Назначено',
		cancel: 'Отмена',
		save: 'Сохранить',
		noPreview: 'Нет предпросмотра',

		// Примеры иконок
		svgPlaceholder: 'Введите SVG-код (необязательно)',
		examples: 'Примеры:',
		folder: 'Папка',
		star: 'Звезда',
		grid: 'Сетка',
	},
	es: {
		// Configuración
		pluginName: 'Sidebar Organizer',
		pluginDesc: 'Fusionar múltiples iconos de la barra lateral del mismo plugin en uno, al pasar el mouse mostrar menú de funciones',

		enableOrganizer: 'Activar organización de barra lateral',
		enableOrganizerDesc: 'Activar/desactivar función de fusión de iconos de barra lateral',

		blurEffect: 'Efecto de desenfoque',
		blurEffectDesc: 'Añadir efecto de desenfoque de fondo al menú emergente',

		blurIntensity: 'Intensidad del desenfoque',
		blurIntensityDesc: 'Ajustar nivel de desenfoque de fondo (actual: {value}px)',

		refreshSidebar: 'Actualizar barra lateral',
		refreshSidebarDesc: 'Redetectar y organizar iconos de barra lateral',
		refreshBtn: 'Actualizar',
		refreshNotice: 'Barra lateral actualizada',

		// Grupos personalizados
		customGroups: 'Grupos personalizados',
		customGroupsDesc: 'Crear grupos personalizados, seleccionar manualmente funciones a fusionar',
		createGroup: 'Crear grupo',
		editGroup: 'Editar',
		deleteGroup: 'Eliminar',
		groupDeleted: 'Grupo eliminado',
		actionCount: '{count} funciones',
		default: 'Predeterminado',

		// Modal de creación de grupo
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
		selectAll: 'Seleccionar todo',

		pleaseEnterName: 'Por favor ingrese nombre del grupo',
		pleaseSelectOne: 'Por favor seleccione al menos una función',
		groupCreated: 'Grupo creado',
		groupUpdated: 'Grupo actualizado',

		// Instrucciones de uso
		usageInstructions: 'Instrucciones de uso',
		instruction1: 'Clic en "Crear grupo" para fusionar múltiples iconos de barra lateral en uno',
		instruction2: 'Pasar mouse sobre icono fusionado para mostrar menú de funciones',
		instruction3: 'Clic en elemento de función para activar función correspondiente',
		instruction4: 'Clic en icono fusionado para abrir directamente la primera función',

		// Configuración de idioma
		language: 'Idioma',
		languageDesc: 'Seleccionar idioma de interfaz del plugin (por defecto sigue configuración de Obsidian)',
		auto: 'Auto',

		// Otros
		assigned: 'Asignado',
		cancel: 'Cancelar',
		save: 'Guardar',
		noPreview: 'Sin vista previa',

		// Ejemplos de iconos
		svgPlaceholder: 'Introducir código SVG (opcional)',
		examples: 'Ejemplos:',
		folder: 'Carpeta',
		star: 'Estrella',
		grid: 'Cuadrícula',
	},
	fr: {
		// Paramètres
		pluginName: 'Sidebar Organizer',
		pluginDesc: 'Fusionner plusieurs icônes de barre latérale du même plugin en une seule, survol pour afficher le menu des fonctions',

		enableOrganizer: 'Activer l\'organisation de la barre latérale',
		enableOrganizerDesc: 'Activer/désactiver la fonction de fusion des icônes de barre latérale',

		blurEffect: 'Effet de flou',
		blurEffectDesc: 'Ajouter un effet de flou en arrière-plan au menu contextuel',

		blurIntensity: 'Intensité du flou',
		blurIntensityDesc: 'Ajuster le niveau de flou de l\'arrière-plan (actuel: {value}px)',

		refreshSidebar: 'Actualiser la barre latérale',
		refreshSidebarDesc: 'Redétecter et organiser les icônes de barre latérale',
		refreshBtn: 'Actualiser',
		refreshNotice: 'Barre latérale actualisée',

		// Groupes personnalisés
		customGroups: 'Groupes personnalisés',
		customGroupsDesc: 'Créer des groupes personnalisés, sélectionner manuellement les fonctions à fusionner',
		createGroup: 'Créer un groupe',
		editGroup: 'Modifier',
		deleteGroup: 'Supprimer',
		groupDeleted: 'Groupe supprimé',
		actionCount: '{count} fonctions',
		default: 'Par défaut',

		// Modal de création de groupe
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
		selectAll: 'Tout sélectionner',

		pleaseEnterName: 'Veuillez entrer un nom de groupe',
		pleaseSelectOne: 'Veuillez sélectionner au moins une fonction',
		groupCreated: 'Groupe créé',
		groupUpdated: 'Groupe mis à jour',

		// Instructions d'utilisation
		usageInstructions: 'Instructions d\'utilisation',
		instruction1: 'Cliquer sur "Créer un groupe" pour fusionner plusieurs icônes de barre latérale en une seule',
		instruction2: 'Survoler l\'icône fusionnée pour afficher le menu des fonctions',
		instruction3: 'Cliquer sur un élément de fonction pour activer la fonction correspondante',
		instruction4: 'Cliquer sur l\'icône fusionnée pour ouvrir directement la première fonction',

		// Paramètres de langue
		language: 'Langue',
		languageDesc: 'Sélectionner la langue de l\'interface du plugin (par défaut suit les paramètres d\'Obsidian)',
		auto: 'Auto',

		// Autres
		assigned: 'Attribué',
		cancel: 'Annuler',
		save: 'Enregistrer',
		noPreview: 'Aucun aperçu',

		// Exemples d'icônes
		svgPlaceholder: 'Entrer le code SVG (optionnel)',
		examples: 'Exemples:',
		folder: 'Dossier',
		star: 'Étoile',
		grid: 'Grille',
	}
};

// 获取语言代码
function getLanguageCode(lang: string): Language {
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

// ==================== 接口定义 ====================

interface SidebarAction {
	element: HTMLElement;
	pluginId: string;
	pluginName: string;
	actionName: string;
	icon: string;
	actionId: string;
}

interface CustomGroup {
	id: string;
	name: string;
	icon: string;
	actionIds: string[];
	order: number;
}

interface SidebarOrganizerSettings {
	enabled: boolean;
	blurEffect: boolean;
	blurIntensity: number;
	customGroups: CustomGroup[];
	manualGroupBindings: Record<string, string[]>;
	language: string; // 'auto', 'zh', 'en'
}

const DEFAULT_SETTINGS: SidebarOrganizerSettings = {
	enabled: true,
	blurEffect: true,
	blurIntensity: 16,
	customGroups: [],
	manualGroupBindings: {},
	language: 'auto'
}

// 核心功能关键词
const CORE_KEYWORDS = [
	'file', 'files', 'search', 'graph', 'bookmarks', 'outline', 'calendar',
	'文件', '搜索', '图谱', '书签', '大纲', '日历',
	'note', 'notes', 'tag', 'tags', 'backlink'
];

export default class SidebarOrganizerPlugin extends Plugin {
	settings: SidebarOrganizerSettings;
	private installedPlugins: Map<string, PluginManifest> = new Map();
	private isOrganizing: boolean = false;
	private popupEl: HTMLElement | null = null;
	private hideTimeout: number | null = null;
	private hoverTimeout: number | null = null;
	private currentLang: Language = 'zh';

	// 获取翻译文本
	t(key: keyof typeof translations['zh'], params?: Record<string, string | number>): string {
		const lang = this.getLanguage();
		let text = translations[lang][key] || translations['en'][key] || key;
		if (params) {
			for (const [k, v] of Object.entries(params)) {
				text = text.replace(`{${k}}`, String(v));
			}
		}
		return text;
	}

	// 获取当前语言
	getLanguage(): Language {
		if (this.settings.language === 'auto') {
			const vaultConfig = (this.app.vault as unknown as { config?: VaultConfig }).config;
			const obsidianLang = vaultConfig?.locale || 'en';
			return getLanguageCode(obsidianLang);
		}
		return this.settings.language as Language;
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
			}, 1000);
		});
	}

	onunload() {
		this.restoreOriginalIcons();
		if (this.popupEl) {
			this.popupEl.remove();
		}
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
				this.installedPlugins.set(id, manifest as PluginManifest);
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
			this.restoreOriginalIcons(false);
			this.processRibbon('left');
			this.processRibbon('right');
		} finally {
			this.isOrganizing = false;
		}
	}

	private processRibbon(side: 'left' | 'right') {
		const ribbon = document.querySelector(`.workspace-ribbon.mod-${side}`);
		if (!ribbon) return;

		const allIcons = ribbon.querySelectorAll('.side-dock-ribbon-action, .clickable-icon, .workspace-ribbon-action');
		const allActions: SidebarAction[] = [];
		const actionMap = new Map<string, SidebarAction>();

		// 收集所有动作
		allIcons.forEach((el) => {
			const element = el as HTMLElement;
			const action = this.identifyAction(element);
			if (!action) return;

			allActions.push(action);
			actionMap.set(action.actionId, action);
		});

		if (allActions.length === 0) return;

		// 收集已分配的 actionId
		const assignedActionIds = new Set<string>();

		// 1. 处理自定义分组（优先级最高）
		const sortedCustomGroups = [...this.settings.customGroups].sort((a, b) => a.order - b.order);
		for (const customGroup of sortedCustomGroups) {
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

			// 应用自定义图标（如果有）
			if (customGroup.icon) {
				this.applyCustomIcon(mainAction.element, customGroup.icon);
			}

			this.bindPopupMenu(mainAction.element, customGroup.name, groupActions);
		}

		// 2. 处理手动分组绑定
		for (const [_groupId, actionIds] of Object.entries(this.settings.manualGroupBindings)) {
			const groupActions = actionIds
				.map(id => actionMap.get(id))
				.filter((a): a is SidebarAction => !!a && !assignedActionIds.has(a.actionId));

			if (groupActions.length === 0) continue;

			groupActions.forEach(a => assignedActionIds.add(a.actionId));

			const mainAction = groupActions[0];
			const otherActions = groupActions.slice(1);

			if (otherActions.length > 0) {
				otherActions.forEach(action => {
					action.element.classList.add('sidebar-organizer-hidden');
				});
				this.addBadge(mainAction.element, groupActions.length);
			}

			// 使用第一个 action 的 pluginName 作为组名
			const groupName = groupActions[0].pluginName;
			this.bindPopupMenu(mainAction.element, groupName, groupActions);
		}
	}

	private addBadge(element: HTMLElement, count: number) {
		// 检查是否已有徽章
		if (element.querySelector('.sidebar-organizer-badge')) return;

		const badge = document.createElement('span');
		badge.className = 'sidebar-organizer-badge';
		badge.textContent = String(count);
		element.appendChild(badge);
	}

	private bindPopupMenu(mainElement: HTMLElement, title: string, actions: SidebarAction[]) {
		// 标记已绑定，避免重复绑定
		if (mainElement.hasAttribute('data-popup-bound')) return;
		mainElement.setAttribute('data-popup-bound', 'true');

		// 悬停显示
		const mouseEnterHandler = () => {
			if (!mainElement.hasAttribute('data-popup-bound')) return;
			if (this.hideTimeout) {
				clearTimeout(this.hideTimeout);
				this.hideTimeout = null;
			}
			this.hoverTimeout = window.setTimeout(() => {
				if (!mainElement.hasAttribute('data-popup-bound')) return;
				this.showMenu(mainElement, title, actions);
			}, 150);
		};

		const mouseLeaveHandler = () => {
			if (!mainElement.hasAttribute('data-popup-bound')) return;
			if (this.hoverTimeout) {
				clearTimeout(this.hoverTimeout);
				this.hoverTimeout = null;
			}
			this.scheduleHide();
		};

		mainElement.addEventListener('mouseenter', mouseEnterHandler);
		mainElement.addEventListener('mouseleave', mouseLeaveHandler);
	}

	private scheduleHide() {
		this.hideTimeout = window.setTimeout(() => {
			// 检查菜单是否正在被悬停
			if (this.popupEl && this.popupEl.matches(':hover')) {
				return; // 菜单正在被悬停，不隐藏
			}
			this.hideMenu();
		}, 150);
	}

	private showMenu(mainElement: HTMLElement, title: string, actions: SidebarAction[]) {
		// 如果菜单已存在，先移除旧的再创建新的
		if (this.popupEl) {
			this.popupEl.remove();
			this.popupEl = null;
		}

		// 清除任何待处理的隐藏
		if (this.hideTimeout) {
			clearTimeout(this.hideTimeout);
			this.hideTimeout = null;
		}

		// 创建新的弹出菜单
		this.popupEl = document.createElement('div');
		this.popupEl.className = 'sidebar-organizer-popup';
		document.body.appendChild(this.popupEl);

		const popup = this.popupEl;

		// 绑定菜单事件
		popup.addEventListener('mouseenter', () => {
			if (this.hideTimeout) {
				clearTimeout(this.hideTimeout);
				this.hideTimeout = null;
			}
		});

		popup.addEventListener('mouseleave', () => {
			this.scheduleHide();
		});

		// 标题
		const titleEl = popup.createDiv('sidebar-organizer-plugin-name');
		titleEl.textContent = title;

		// 功能列表
		const listEl = popup.createDiv('sidebar-organizer-actions-list');

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

		// 定位
		this.positionPopup(popup, mainElement);

		// 应用毛玻璃效果
		if (this.settings.blurEffect) {
			popup.classList.add('blur-effect');
			popup.style.setProperty('--blur-amount', `${this.settings.blurIntensity}px`);
		}

		// 显示动画（需要延迟一帧让浏览器处理）
		requestAnimationFrame(() => {
			popup.classList.add('visible');
		});
	}

	private hideMenu() {
		if (!this.popupEl) return;

		const popup = this.popupEl;
		popup.classList.remove('visible');
		popup.classList.add('hiding');

		setTimeout(() => {
			if (popup && popup.parentElement) {
				popup.remove();
			}
			if (this.popupEl === popup) {
				this.popupEl = null;
			}
		}, 200);
	}

	private positionPopup(popup: HTMLElement, anchor: HTMLElement) {
		const rect = anchor.getBoundingClientRect();
		const popupWidth = 250;

		const isLeftSide = rect.left < window.innerWidth / 2;

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
		// 优先通过 dataView 前缀匹配（最可靠）
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
			// 使用 dataView 前缀作为 fallback
			const prefix = dataView.split('-').slice(0, 2).join('-');
			return { pluginId: prefix, pluginName: prefix };
		}

		const nameLower = displayName.toLowerCase();

		// 尝试精确匹配插件名
		for (const [id, manifest] of this.installedPlugins) {
			const pluginName = manifest.name.toLowerCase();
			if (nameLower.includes(pluginName) || pluginName === nameLower) {
				return { pluginId: id, pluginName: manifest.name };
			}
		}

		// 尝试第一个词匹配
		const firstPart = nameLower.split(/[\s:：\-–—]+/)[0];
		if (firstPart && firstPart.length > 1) {
			for (const [id, manifest] of this.installedPlugins) {
				const pluginName = manifest.name.toLowerCase();
				if (pluginName.includes(firstPart) || firstPart.includes(pluginName)) {
					return { pluginId: id, pluginName: manifest.name };
				}
			}
		}

		// 最后 fallback：使用 displayName 作为 pluginId
		const safeId = displayName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
		return {
			pluginId: safeId || 'unknown',
			pluginName: displayName
		};
	}

	private isCoreAction(action: SidebarAction): boolean {
		const nameLower = action.actionName.toLowerCase();
		return CORE_KEYWORDS.some(keyword => nameLower.includes(keyword.toLowerCase()));
	}

	private extractActionLabel(fullName: string, pluginName: string): string {
		let label = fullName;
		const separators = [':', '：', '-', '–', '—', '|'];
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
			// 保存原始 SVG 以便重置时恢复
			if (!element.hasAttribute('data-original-svg')) {
				element.setAttribute('data-original-svg', svgEl.outerHTML);
			}

			// 使用 DOMParser 解析 SVG
			const newSvg = parseSvg(svgContent);

			if (newSvg) {
				// 确保有 viewBox
				if (!newSvg.hasAttribute('viewBox')) {
					newSvg.setAttribute('viewBox', '0 0 24 24');
				}
				// 添加自定义样式类
				newSvg.classList.add('sidebar-organizer-custom-icon');
				// 添加颜色继承类
				newSvg.classList.add('sidebar-organizer-inherit-color');
				// 替换原 SVG
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

	restoreOriginalIcons(clearFlag: boolean = true) {
		// 清除计时器
		if (this.hideTimeout) {
			clearTimeout(this.hideTimeout);
			this.hideTimeout = null;
		}
		if (this.hoverTimeout) {
			clearTimeout(this.hoverTimeout);
			this.hoverTimeout = null;
		}

		// 恢复原始图标
		document.querySelectorAll('[data-original-svg]').forEach(el => {
			this.restoreOriginalIcon(el as HTMLElement);
		});

		// 移除隐藏类
		document.querySelectorAll('.sidebar-organizer-hidden').forEach(el => {
			el.classList.remove('sidebar-organizer-hidden');
		});

		// 移除徽章
		document.querySelectorAll('.sidebar-organizer-badge').forEach(el => {
			el.remove();
		});

		// 移除弹出菜单绑定标记
		document.querySelectorAll('[data-popup-bound]').forEach(el => {
			el.removeAttribute('data-popup-bound');
		});

		// 移除弹出菜单
		if (this.popupEl) {
			this.popupEl.remove();
			this.popupEl = null;
		}
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
				if (!action) return; // 只过滤无法识别的，不过滤核心功能

				if (!seen.has(action.actionId)) {
					seen.add(action.actionId);
					actions.push(action);
				}
			});
		});

		return actions;
	}
}

class SidebarOrganizerSettingTab extends PluginSettingTab {
	plugin: SidebarOrganizerPlugin;

	constructor(app: App, plugin: SidebarOrganizerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const t = (key: keyof typeof translations['zh'], params?: Record<string, string | number>) => this.plugin.t(key, params);

		new Setting(containerEl)
			.setName(t('pluginName'))
			.setHeading();
		containerEl.createEl('p', {
			text: t('pluginDesc'),
			cls: 'sidebar-organizer-desc'
		});

		// 语言设置
		new Setting(containerEl)
			.setName(t('language'))
			.setDesc(t('languageDesc'))
			.addDropdown(dropdown => dropdown
				.addOption('auto', t('auto'))
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
			.setName(t('enableOrganizer'))
			.setDesc(t('enableOrganizerDesc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enabled)
				.onChange(async (value) => {
					this.plugin.settings.enabled = value;
					await this.plugin.saveSettings();
					this.plugin.applyOrganizerState();
				}));

		new Setting(containerEl)
			.setName(t('blurEffect'))
			.setDesc(t('blurEffectDesc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.blurEffect)
				.onChange(async (value) => {
					this.plugin.settings.blurEffect = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t('blurIntensity'))
			.setDesc(t('blurIntensityDesc', { value: this.plugin.settings.blurIntensity }))
			.addSlider(slider => slider
				.setValue(this.plugin.settings.blurIntensity)
				.setLimits(0, 30, 1)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.blurIntensity = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t('refreshSidebar'))
			.setDesc(t('refreshSidebarDesc'))
			.addButton(btn => btn
				.setButtonText(t('refreshBtn'))
				.onClick(() => {
					this.plugin.restoreOriginalIcons();
					this.plugin.loadInstalledPlugins();
					this.plugin.organizeSidebars();
					this.display();
					new Notice(t('refreshNotice'));
				}));

		// 自定义分组区域
		new Setting(containerEl)
			.setName(t('customGroups'))
			.setHeading();
		containerEl.createEl('p', {
			text: t('customGroupsDesc'),
			cls: 'sidebar-organizer-hint'
		});

		new Setting(containerEl)
			.setName(t('createGroup'))
			.setDesc(t('customGroupsDesc'))
			.addButton(btn => btn
				.setButtonText(t('createGroup'))
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

				const dragHandle = infoEl.createDiv('drag-handle');
				dragHandle.textContent = '⋮⋮';
				dragHandle.setAttribute('draggable', 'true');
				dragHandle.setAttribute('data-group-id', group.id);

				const iconEl = infoEl.createDiv('group-icon');
				if (group.icon) {
					setSvgContent(iconEl, group.icon);
				} else {
					iconEl.createEl('span', { text: '📋', cls: 'default-group-icon' });
				}

				const nameEl = infoEl.createDiv('group-title');
				nameEl.textContent = group.name;

				const countEl = infoEl.createDiv('group-count');
				countEl.textContent = t('actionCount', { count: group.actionIds.length });

				const actionsEl = infoEl.createDiv('group-actions');

				actionsEl.createEl('button', { text: t('editGroup') })
					.addEventListener('click', () => {
						const modal = new SimpleGroupModal(this.app, this.plugin, () => {
							this.plugin.restoreOriginalIcons();
							this.plugin.organizeSidebars();
							this.display();
						}, group);
						modal.open();
					});

				actionsEl.createEl('button', { text: t('deleteGroup'), cls: 'mod-warning' })
					.addEventListener('click', () => {
						void (async () => {
							this.plugin.settings.customGroups = this.plugin.settings.customGroups.filter(g => g.id !== group.id);
							await this.plugin.saveSettings();
							this.plugin.restoreOriginalIcons();
							this.plugin.organizeSidebars();
							this.display();
							new Notice(t('groupDeleted'));
						})();
					});

				this.setupDragAndDrop(dragHandle, groupsContainer);
			}
		}

		new Setting(containerEl)
			.setName(t('usageInstructions'))
			.setHeading();
		const usageList = containerEl.createEl('ul');
		usageList.createEl('li', { text: t('instruction1') });
		usageList.createEl('li', { text: t('instruction2') });
		usageList.createEl('li', { text: t('instruction3') });
		usageList.createEl('li', { text: t('instruction4') });
	}

	private setupDragAndDrop(handle: HTMLElement, container: HTMLElement) {
		handle.addEventListener('dragstart', (e: DragEvent) => {
			if (e.dataTransfer) {
				e.dataTransfer.setData('text/plain', handle.getAttribute('data-group-id') || '');
				handle.classList.add('dragging');
			}
		});

		handle.addEventListener('dragend', () => {
			handle.classList.remove('dragging');
			const items = container.querySelectorAll('.sidebar-organizer-custom-group-item .drag-handle');
			const newOrder: { id: string; order: number }[] = [];

			items.forEach((item, index) => {
				const id = item.getAttribute('data-group-id');
				if (id) {
					newOrder.push({ id, order: index });
				}
			});

			this.plugin.settings.customGroups = this.plugin.settings.customGroups.map(g => {
				const orderInfo = newOrder.find(o => o.id === g.id);
				return orderInfo ? { ...g, order: orderInfo.order } : g;
			});

			this.plugin.saveSettings();
		});

		container.addEventListener('dragover', (e: DragEvent) => {
			e.preventDefault();
			const dragging = container.querySelector('.dragging');
			if (!dragging) return;

			const nodeList = container.querySelectorAll('.sidebar-organizer-custom-group-item');
			const items: HTMLElement[] = [];
			nodeList.forEach(el => items.push(el as HTMLElement));

			const nextItem = items.find(item => {
				const rect = item.getBoundingClientRect();
				return e.clientY < rect.top + rect.height / 2;
			});

			if (nextItem && nextItem !== (dragging as HTMLElement).parentElement) {
				container.insertBefore((dragging as HTMLElement).parentElement!, nextItem);
			}
		});
	}
}

class SimpleGroupModal extends Modal {
	plugin: SidebarOrganizerPlugin;
	existingGroup: CustomGroup | null;
	onSave: () => void;

	private step: number = 1;
	private selectedActions: Set<string> = new Set();
	private groupName: string = '';
	private groupIcon: string = '';

	private allActions: SidebarAction[] = [];
	private availableContainer: HTMLElement;
	private selectedContainer: HTMLElement;
	private nameInput: HTMLInputElement;
	private iconInput: HTMLTextAreaElement;
	private previewEl: HTMLElement;

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
		const t = (key: keyof typeof translations['zh'], params?: Record<string, string | number>) => this.plugin.t(key, params);

		new Setting(contentEl)
			.setName(this.existingGroup ? `${t('editGroupTitle')} - ${t('selectFunctions')}` : `${t('createGroupTitle')} - ${t('selectFunctions')}`)
			.setHeading();
		contentEl.createEl('p', {
			text: t('selectFunctionsDesc'),
			cls: 'sidebar-organizer-hint'
		});

		// 获取已分配到其他分组的 actionIds
		const assignedElsewhere = new Set<string>();
		this.plugin.settings.customGroups.forEach(g => {
			if (this.existingGroup && g.id === this.existingGroup.id) return;
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

		// 左侧：所有可用功能（按分组显示）
		const leftPanel = container.createDiv('panel-left');
		new Setting(leftPanel)
			.setName(t('availableFunctions'))
			.setHeading();

		this.availableContainer = leftPanel.createDiv('actions-list');

		// 按分组显示
		for (const [pluginName, actions] of pluginGroups) {
			const groupEl = this.availableContainer.createDiv('action-group');

			// 分组标题（可点击全选）
			const groupHeader = groupEl.createDiv('action-group-header');
			const allSelected = actions.every(a => this.selectedActions.has(a.actionId));
			if (allSelected && actions.length > 0) {
				groupHeader.classList.add('all-selected');
			}

			groupHeader.createSpan('group-title').textContent = `${pluginName} (${actions.length})`;
			groupHeader.createSpan('select-all-hint').textContent = t('clickSelectAll');

			groupHeader.addEventListener('click', () => {
				const allInGroup = actions.every(a => this.selectedActions.has(a.actionId));
				if (allInGroup) {
					// 全部移除
					actions.forEach(a => this.selectedActions.delete(a.actionId));
				} else {
					// 全部添加
					actions.forEach(a => this.selectedActions.add(a.actionId));
				}
				this.renderStep1(); // 重新渲染
			});

			// 分组内的功能列表
			const groupActions = groupEl.createDiv('group-actions');
			for (const action of actions) {
				const isSelected = this.selectedActions.has(action.actionId);

				const itemEl = groupActions.createDiv('action-item-draggable');
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
					this.updateSelectedList(assignedElsewhere);
					// 更新分组标题状态
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
			.setName(t('groupFunctions'))
			.setHeading();

		this.selectedContainer = rightPanel.createDiv('actions-list selected-list');
		this.updateSelectedList(assignedElsewhere);

		// 按钮区域
		const buttonContainer = contentEl.createDiv('modal-button-container');

		buttonContainer.createEl('button', { text: t('cancel') })
			.addEventListener('click', () => this.close());

		buttonContainer.createEl('button', { text: t('nextStep'), cls: 'mod-cta' })
			.addEventListener('click', () => {
				if (this.selectedActions.size === 0) {
					new Notice(t('pleaseSelectOne'));
					return;
				}
				this.renderStep2();
			});
	}

	private updateSelectedList(assignedElsewhere: Set<string>) {
		this.selectedContainer.empty();

		const selectedActions = this.allActions.filter(a => this.selectedActions.has(a.actionId));

		if (selectedActions.length === 0) {
			this.selectedContainer.createEl('p', {
				text: this.plugin.t('clickToAdd'),
				cls: 'empty-hint'
			});
			return;
		}

		for (const action of selectedActions) {
			const itemEl = this.selectedContainer.createDiv('selected-action-item');

			const iconSpan = itemEl.createSpan('item-icon');
			setSvgContent(iconSpan, action.icon);

			const nameSpan = itemEl.createSpan('item-name');
			nameSpan.textContent = action.actionName;

			const removeBtn = itemEl.createSpan('remove-btn');
			removeBtn.textContent = '×';
			removeBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.selectedActions.delete(action.actionId);
				this.updateSelectedList(assignedElsewhere);
				this.availableContainer.querySelectorAll('.action-item-draggable').forEach(el => {
					const name = el.querySelector('.item-name')?.textContent;
					if (name === action.actionName) {
						el.classList.remove('in-group');
					}
				});
			});
		}
	}

	private renderStep2() {
		const { contentEl } = this;
		contentEl.empty();
		const t = (key: keyof typeof translations['zh'], params?: Record<string, string | number>) => this.plugin.t(key, params);

		new Setting(contentEl)
			.setName(this.existingGroup ? `${t('editGroupTitle')} - ${t('setNameAndIcon')}` : `${t('createGroupTitle')} - ${t('setNameAndIcon')}`)
			.setHeading();

		new Setting(contentEl)
			.setName(t('groupName'))
			.setDesc(t('groupNameDesc'))
			.addText(text => {
				this.nameInput = text.inputEl;
				text.setPlaceholder(t('groupNamePlaceholder'));
				text.setValue(this.groupName);
				text.onChange(value => {
					this.groupName = value;
				});
			});

		new Setting(contentEl)
			.setName(t('customIcon'))
			.setHeading();

		const iconSection = contentEl.createDiv('icon-section');

		this.previewEl = iconSection.createDiv('icon-preview-small');
		this.updatePreview();

		const inputSection = iconSection.createDiv('icon-input-section');
		this.iconInput = inputSection.createEl('textarea', {
			attr: {
				placeholder: t('svgPlaceholder'),
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
		examplesSection.createEl('span', { text: t('examples') });

		const examples = [
			{ name: t('folder'), svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>' },
			{ name: t('star'), svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' },
			{ name: t('grid'), svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>' }
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

		buttonContainer.createEl('button', { text: t('previousStep') })
			.addEventListener('click', () => this.renderStep1());

		buttonContainer.createEl('button', { text: t('cancel') })
			.addEventListener('click', () => this.close());

		buttonContainer.createEl('button', { text: t('save'), cls: 'mod-cta' })
			.addEventListener('click', () => {
				void (async () => {
					const name = this.nameInput.value.trim();
					if (!name) {
						new Notice(t('pleaseEnterName'));
						return;
					}

					if (this.selectedActions.size === 0) {
						new Notice(t('pleaseSelectOne'));
						return;
					}

					if (this.existingGroup) {
						const group = this.plugin.settings.customGroups.find(g => g.id === this.existingGroup!.id);
						if (group) {
							group.name = name;
							group.icon = this.groupIcon.trim();
							group.actionIds = Array.from(this.selectedActions);
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
					new Notice(this.existingGroup ? this.plugin.t('groupUpdated') : this.plugin.t('groupCreated'));
				})();
			});
	}

	private updatePreview() {
		setSvgContent(this.previewEl, this.groupIcon);

		if (!this.groupIcon || !this.groupIcon.includes('<svg')) {
			this.previewEl.createEl('span', {
				text: this.plugin.t('default'),
				cls: 'default-icon-hint'
			});
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}