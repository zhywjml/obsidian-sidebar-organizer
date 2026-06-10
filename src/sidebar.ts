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
	return doc.querySelector('svg');
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
		const hasFill = svg.hasAttribute('fill') || svg.querySelector('[fill]');
		const hasStroke = svg.hasAttribute('stroke') || svg.querySelector('[stroke]');
		if (!hasFill && !hasStroke) {
			svg.setAttribute('fill', 'currentColor');
		}
	} catch (e) {
		console.warn('Sidebar Organizer: failed to sanitize SVG colors', e);
	}
}
