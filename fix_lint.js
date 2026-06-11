const fs = require('fs');

let main = fs.readFileSync('src/main.ts', 'utf8');

// document -> activeDocument
main = main.replace(/\bdocument\./g, 'activeDocument.');

// setTimeout -> window.setTimeout
main = main.replace(/\bsetTimeout\b/g, 'window.setTimeout');
main = main.replace(/window\.window\.setTimeout/g, 'window.setTimeout');

// clearTimeout -> window.clearTimeout
main = main.replace(/\bclearTimeout\b/g, 'window.clearTimeout');
main = main.replace(/window\.window\.clearTimeout/g, 'window.clearTimeout');

// requestAnimationFrame -> window.requestAnimationFrame
main = main.replace(/\brequestAnimationFrame\b/g, 'window.requestAnimationFrame');
main = main.replace(/window\.window\.requestAnimationFrame/g, 'window.requestAnimationFrame');

// Unsafe assignment in main.ts:219
main = main.replace(/await this\.loadData\(\)/, '(await this.loadData()) as Partial<SidebarOrganizerSettings>');

// Unused e
main = main.replace(/\(e\) => \{\n\t\t\t\tthis\.hideMenu\(\);\n\t\t\t\taction\.element\.click\(\);\n\t\t\t\}/g, '() => {\n\t\t\t\tthis.hideMenu();\n\t\t\t\taction.element.click();\n\t\t\t}');

// Unnecessary assertions (like `const element = el as HTMLElement;` if it's already one, but wait, `querySelectorAll` returns `Element`, so `as HTMLElement` is needed. I'll ignore unnecessary assertions for now as they are warnings.)

// Unused imports in main.ts
main = main.replace(/import \{.*?App.*?\} from 'obsidian';/, (match) => match.replace('App, ', '').replace(', App', '').replace('App', ''));
main = main.replace(/import \{.*?CustomGroup.*?\} from '\.\/types';/, (match) => match.replace('CustomGroup, ', ''));
main = main.replace(/import SimpleGroupModal from '\.\/modal';\n/, '');

fs.writeFileSync('src/main.ts', main);

let pkg = fs.readFileSync('package.json', 'utf8');
pkg = pkg.replace(/"builtin-modules": ".*?",?\n\s*/g, '');
fs.writeFileSync('package.json', pkg);

let esbuild = fs.readFileSync('esbuild.config.mjs', 'utf8');
esbuild = esbuild.replace(/import builtins from "builtin-modules";/, 'import { builtinModules as builtins } from "module";');
fs.writeFileSync('esbuild.config.mjs', esbuild);

let settings = fs.readFileSync('src/settings.ts', 'utf8');
settings = settings.replace(/Language, /g, '');
settings = settings.replace(/CustomGroup, /g, '');
settings = settings.replace(/\.setDynamicTooltip\(\)/g, ''); // Remove deprecated setDynamicTooltip
fs.writeFileSync('src/settings.ts', settings);

let modal = fs.readFileSync('src/modal.ts', 'utf8');
modal = modal.replace(/TextComponent, /g, '');
fs.writeFileSync('src/modal.ts', modal);
console.log('Fixed simple replacements');
