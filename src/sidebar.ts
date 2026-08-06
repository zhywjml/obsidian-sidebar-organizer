// ==================== 安全 SVG 操作 ====================

/**
 * 安全地将 SVG 内容插入到元素中
 */
export function setSvgContent(element: HTMLElement, svgContent: string): void {
	element.empty();
	if (!svgContent || !svgContent.includes('<svg')) return;

	const parser = new DOMParser();
	const doc = parser.parseFromString(svgContent.trim(), 'image/svg+xml');
	const svg = doc.querySelector('svg');
	if (svg) {
		hardenSvg(svg);
		svg.classList.add('svg-icon');
		svg.removeAttribute('width');
		svg.removeAttribute('height');
		element.appendChild(svg);
	}
}

/**
 * 解析 SVG 内容并返回 SVG 元素
 */
export function parseSvg(svgContent: string): SVGSVGElement | null {
	if (!svgContent || !svgContent.includes('<svg')) return null;

	const parser = new DOMParser();
	const doc = parser.parseFromString(svgContent.trim(), 'image/svg+xml');
	const svg = doc.querySelector('svg');
	if (svg) hardenSvg(svg);
	return svg;
}

/**
 * 移除 SVG 中的事件属性、危险元素与外链，防止粘贴的自定义 SVG 成为自我 XSS 载体
 */
export function hardenSvg(svg: SVGSVGElement): void {
	const scrub = (el: Element) => {
		// 1) 删除所有事件处理属性（onclick/onload 等）
		Array.from(el.attributes).forEach(attr => {
			if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
		});
		// 2) 删除危险元素
		if (el.tagName === 'script' || el.tagName === 'foreignObject') {
			el.remove();
			return;
		}
		// 3) a 标签的 javascript: 协议链接
		if (el.tagName === 'a') {
			const href = el.getAttribute('href') || '';
			if (href.toLowerCase().startsWith('javascript:')) el.removeAttribute('href');
		}
		// 4) use/image 的外部引用（仅保留本地 #id 引用）
		if (el.tagName === 'use' || el.tagName === 'image') {
			['href', 'xlink:href'].forEach(attr => {
				const v = el.getAttribute(attr);
				if (v && !v.startsWith('#')) el.removeAttribute(attr);
			});
		}
	};
	scrub(svg);
	svg.querySelectorAll('*').forEach(scrub);
}

/**
 * 从完整功能名中提取短标签（去掉 "插件名: " 之类的前缀）
 */
export function extractActionLabel(fullName: string): string {
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

/**
 * 清理 SVG 中的硬编码颜色值，使其继承主题颜色
 */
export function sanitizeSvgColors(svg: SVGSVGElement): void {
	try {
		const keepValues = new Set(['none', 'currentColor']);
		const colorAttrs = ['fill', 'stroke'];

		svg.querySelectorAll('*').forEach(el => {
			colorAttrs.forEach(attr => {
				const value = el.getAttribute(attr);
				if (value && !keepValues.has(value)) {
					if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl') ||
						/^[a-zA-Z]+$/.test(value)) {
						el.setAttribute(attr, 'currentColor');
					}
				}
			});
		});

		// Also check the root <svg> element itself, not just descendants
		// 只要存在 fill/stroke 声明（即使是 fill="none" 这种有意描边风格）就不干预；
		// 仅当整个 SVG 完全没有颜色属性时才补 fill="currentColor" 保证可见
		const hasFill = svg.hasAttribute('fill') || svg.querySelector('[fill]');
		const hasStroke = svg.hasAttribute('stroke') || svg.querySelector('[stroke]');
		if (!hasFill && !hasStroke) {
			svg.setAttribute('fill', 'currentColor');
		}
	} catch (e) {
		console.warn('Sidebar Organizer: failed to sanitize SVG colors', e);
	}
}
