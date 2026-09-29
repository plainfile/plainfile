#!/usr/bin/env node
// Скрифолдер нового инструмента PlainFile.
// Создаёт src/tools/<id>/ со страницей-заглушкой и регистрирует инструмент
// в src/routes-manifest.ts. Правила и анатомия папки: CONTRACT.md.
//
// Usage:
//   node scripts/new-tool.mjs pdf-merge --title "Merge PDF" --path /pdf/merge \
//     --description "Merge PDFs in your browser, no upload." --icon FileText \
//     [--nav "Merge PDF"] [--footer "Merge PDF"] [--status beta]

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../src');
const MANIFEST = resolve(SRC, 'routes-manifest.ts');

function fail(msg) {
  console.error(`new-tool: ${msg}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const id = args[0];
if (!id || id.startsWith('-')) fail('первым аргументом нужен id инструмента, напр. pdf-merge');
if (!/^[a-z0-9-]+$/.test(id)) fail('id: только a-z, 0-9 и дефисы');

const opt = {};
for (let i = 1; i < args.length; i++) {
  const m = args[i].match(/^--([\w-]+)$/);
  if (m) opt[m[1]] = args[++i];
  else fail(`непонятный аргумент: ${args[i]}`);
}

const title = opt.title || fail('нужен --title "My Tool"');
const path = opt.path || fail('нужен --path /my/tool');
const description = opt.description || fail('нужен --description "One-line pitch."');
const icon = opt.icon || 'FileText';
const status = opt.status || 'ready';
const label = title;
const pascal = id.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join('');
const pageName = pascal; // страница инструмента: <PascalCase>.tsx
const toolDir = resolve(SRC, 'tools', id);
if (existsSync(toolDir)) fail(`папка уже существует: src/tools/${id}`);

// 1. Папка инструмента со страницей-заглушкой.
mkdirSync(toolDir, { recursive: true });
writeFileSync(
  resolve(toolDir, `${pageName}.tsx`),
  `import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { ${icon} } from "lucide-react";

export default function ${pageName}() {
  return (
    <Layout>
      <SEO
        title="${label}"
        description="${description.replace(/"/g, '&quot;')}"
        path="${path}"
      />
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0066CC]/10">
        <${icon} className="h-7 w-7 text-[#0066CC]" />
      </div>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">${label}</h1>
      <p className="text-muted-foreground">
        This tool is under construction. See CONTRACT.md for the tool anatomy
        (engine.ts, worker.ts, scenarios.ts, pages/).
      </p>
    </Layout>
  );
}
`,
  'utf8',
);

// 2. Lazy-импорт — вставляем после последней строки const ... = lazy(...).
let manifest = readFileSync(MANIFEST, 'utf8');
// Добавляем после последней lazy-строки.
const lazyLines = [...manifest.matchAll(/^const \w+ = lazy\(.*$/gm)];
if (lazyLines.length === 0) fail('в манифесте не найдены lazy-импорты');
const lastLazy = lazyLines[lazyLines.length - 1];
manifest =
  manifest.slice(0, lastLazy.index + lastLazy[0].length) +
  `\nconst ${pageName} = lazy(() => import('./tools/${id}/${pageName}'));` +
  manifest.slice(lastLazy.index + lastLazy[0].length);

// 3. Запись ROUTES — вставляем перед закрывающим ]; массива ROUTES.
const routesMatch = manifest.match(/export const ROUTES: RouteManifestItem\[\] = \[([\s\S]*?)\n\];/);
if (!routesMatch) fail('не найден массив ROUTES в манифесте');
const entry = `  {
    path: '${path}', label: '${label}', kind: 'tool', priority: 0.9, changefreq: 'weekly', element: ${pageName},
    description: '${description.replace(/'/g, "\\'")}',
    icon: ${icon}, status: '${status}',${opt.nav ? `\n    navLabel: '${opt.nav}',` : ''}${opt.footer ? `\n    footerLabel: '${opt.footer}',` : ''}
  },`;
manifest = manifest.replace(routesMatch[0], `export const ROUTES: RouteManifestItem[] = [${routesMatch[1]}\n${entry}\n];`);
writeFileSync(MANIFEST, manifest, 'utf8');

// 4. Иконка должна быть импортирована в манифесте.
manifest = readFileSync(MANIFEST, 'utf8');
const iconImportRe = new RegExp(`import \\{[^}]*\\b${icon}\\b[^}]*\\} from 'lucide-react';`);
if (!iconImportRe.test(manifest)) {
  manifest = manifest.replace(
    /(import \{[^}]*\} from 'lucide-react';)/,
    (m) => m.replace(/\} from 'lucide-react';/, `, ${icon}} from 'lucide-react';`).replace('{{', '{'),
  );
  writeFileSync(MANIFEST, manifest, 'utf8');
}

console.log(`✔ src/tools/${id}/${pageName}.tsx создан`);
console.log('✔ запись kind: \'tool\' добавлена в src/routes-manifest.ts');
console.log('');
console.log('Дальше:');
console.log(`  1. Реализуйте инструмент в src/tools/${id}/ (см. CONTRACT.md §2, §4).`);
console.log('  2. Проверка: npm run lint && npm run build');
if (!opt.nav) console.log(`  3. Пункты шапки/футера: передайте --nav/--footer при генерации или navLabel/footerLabel в манифесте.`);
