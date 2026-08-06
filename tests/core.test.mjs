// 最小测试集：i18n 8 语言 key 一致性 + 翻译行为 + extractActionLabel
// 运行：npm test
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import esbuild from 'esbuild';

// ---- 1. i18n 各语言块 key 集合一致性（直接解析源码）----
const src = readFileSync(new URL('../src/i18n.ts', import.meta.url), 'utf-8');
const blockRe = /^\t(\w+): \{([\s\S]*?)^\t\},$/gm;
const blocks = [...src.matchAll(blockRe)].map(m => [m[1], m[2]]);
assert.ok(blocks.length >= 8, `expected >=8 language blocks, got ${blocks.length}`);

const keySets = blocks.map(([, body]) => new Set(
	[...body.matchAll(/^\t\t(\w+):/gm)].map(m => m[1])
));
const base = keySets[0];
for (let i = 1; i < keySets.length; i++) {
	const diff = [...base].filter(k => !keySets[i].has(k));
	assert.deepEqual(diff, [], `language block ${i} missing keys`);
	const extra = [...keySets[i]].filter(k => !base.has(k));
	assert.deepEqual(extra, [], `language block ${i} has extra keys`);
}

// ---- 2. bundle 后行为测试（i18n / sidebar 均无外部依赖）----
const dir = mkdtempSync(join(tmpdir(), 'sso-test-'));
try {
	await esbuild.build({
		entryPoints: ['src/i18n.ts', 'src/sidebar.ts'],
		bundle: true,
		format: 'esm',
		outdir: dir,
		logLevel: 'silent',
	});
	const i18n = await import(pathToFileURL(join(dir, 'i18n.js')).href);
	const sidebar = await import(pathToFileURL(join(dir, 'sidebar.js')).href);

	// getLanguageCode
	assert.equal(i18n.getLanguageCode('zh-CN'), 'zh');
	assert.equal(i18n.getLanguageCode('en-US'), 'en');
	assert.equal(i18n.getLanguageCode('fr'), 'fr');
	assert.equal(i18n.getLanguageCode('xx'), 'en');

	// translate：参数替换 + 缺失 key 回退
	assert.equal(i18n.translate('zh', 'blurIntensityDesc', { value: 12 }), '调整背景模糊程度 (当前: 12px)');
	assert.equal(i18n.translate('de', 'groupName'), 'Gruppenname');
	assert.equal(i18n.translate('ja', 'missing-key-xyz'), 'missing-key-xyz');

	// extractActionLabel
	assert.equal(sidebar.extractActionLabel('Obsidian Git: Open commit'), 'Open commit');
	assert.equal(sidebar.extractActionLabel('模板：插入日期'), '插入日期');
	assert.equal(sidebar.extractActionLabel('no separator'), 'no separator');
	assert.equal(sidebar.extractActionLabel('A - B - C'), 'B - C');

	console.log(`OK: ${blocks.length} language blocks consistent, ${keySets[0].size} keys each`);
} finally {
	rmSync(dir, { recursive: true, force: true });
}
