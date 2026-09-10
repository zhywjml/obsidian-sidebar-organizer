// 发布前门禁：确保不使用比 manifest.json 中 minAppVersion 更新的 Obsidian API。
// 与社区审核机器人使用同一条规则 obsidianmd/no-unsupported-api（需要类型信息，
// 由 typescript-eslint 提供 TS program，从 obsidian.d.ts 解析各 API 的 @since）。
// 本地运行：npm run lint；CI 中在测试与构建之前执行。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import tseslint from 'typescript-eslint';
import obsidianmd from 'eslint-plugin-obsidianmd';

const root = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));

export default [
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: root,
			},
		},
		plugins: { obsidianmd },
		rules: {
			'obsidianmd/no-unsupported-api': ['error', { minAppVersion: manifest.minAppVersion }],
		},
	},
];
