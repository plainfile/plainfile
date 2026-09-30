#!/usr/bin/env node
// audit-links.mjs — перелинковка не регрессирует: ни одна страница не остаётся orphan.
//
// Покрытие входящих ссылок для каждого роута манифеста:
//   1. Автонавигация: '/', '/tools', '/privacy' + роуты с navLabel/footerLabel (Layout).
//   2. Динамические хабы: сценарии, на которые ссылаются через реестр
//      (forms.ts / scenarios.ts / heic-scenarios.ts) — пути читаются из реестров.
//   3. Статические ручные ссылки: to="/..." и href="/..." в любом файле src
//      (кроме Layout.tsx и Tools.tsx — это автогенерация).
// Роут без ни одного покрытия → orphan → exit 1.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../src');
const MANIFEST = path.resolve(SRC, 'routes-manifest.ts');

const AUTO_LAYOUT = new Set(['/', '/tools', '/privacy']);

// Динамические хабы: префикс → файлы реестров, из которых хаб строит ссылки.
const DYNAMIC_HUBS = [
  { prefix: '/forms/', registries: ['tools/fill/forms.ts'] },
  { prefix: '/heic/', registries: ['tools/heic/scenarios.ts'] },
  { prefix: '/pdf/redact-', registries: ['tools/redact/scenarios.ts'] },
];

function readRoutes() {
  const content = fs.readFileSync(MANIFEST, 'utf8');
  const routes = [...content.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]).filter((p) => p !== '*');
  // navLabel/footerLabel → автонавигация в Layout
  const navLinked = new Set(
    [...content.matchAll(/\b(?:navLabel|footerLabel):\s*'[^']*'/g)].map(
      (m) => content.slice(0, m.index).match(/path:\s*'([^']+)'/g).pop().match(/'([^']+)'/)[1],
    ),
  );
  return { routes, navLinked };
}

function readDynamicPaths() {
  const paths = new Set();
  for (const hub of DYNAMIC_HUBS) {
    for (const rel of hub.registries) {
      const file = path.resolve(SRC, rel);
      if (!fs.existsSync(file)) continue;
      const content = fs.readFileSync(file, 'utf8');
      for (const m of content.matchAll(/path:\s*"([^"]+)"/g)) paths.add(m[1]);
    }
  }
  return paths;
}

function readStaticLinks() {
  const targets = new Map(); // path -> [files]
  const skip = new Set(['components/Layout.tsx', 'pages/Tools.tsx']);
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'ui') walk(full);
        continue;
      }
      if (!/\.(tsx?|html)$/.test(entry.name)) continue;
      const rel = path.relative(SRC, full);
      if (skip.has(rel)) continue;
      const content = fs.readFileSync(full, 'utf8');
      for (const m of content.matchAll(/(?:to|href)="(\/[^"#?]*)"/g)) {
        const target = m[1].replace(/\/$/, '') || '/';
        if (!targets.has(target)) targets.set(target, new Set());
        targets.get(target).add(rel);
      }
    }
  };
  walk(SRC);
  // index.html может держать ссылки тоже
  return targets;
}

function main() {
  const { routes, navLinked } = readRoutes();
  const dynamicPaths = readDynamicPaths();
  const staticLinks = readStaticLinks();

  const orphans = [];
  const covered = [];
  for (const route of routes) {
    const norm = route.replace(/\/$/, '') || '/';
    const via = [];
    if (norm === '/' || AUTO_LAYOUT.has(norm) || navLinked.has(norm)) via.push('auto-nav');
    if (dynamicPaths.has(norm)) via.push('dynamic-hub');
    const sources = staticLinks.get(norm);
    if (sources) via.push(`manual (${[...sources].map((s) => path.basename(s)).join(', ')})`);
    if (via.length === 0) orphans.push(norm);
    else covered.push({ route: norm, via });
  }

  console.log(`Audited ${routes.length} routes: ${covered.length} covered, ${orphans.length} orphans`);
  for (const o of orphans) console.log(`  ORPHAN  ${o}`);

  if (orphans.length > 0) {
    console.log('\nLINK AUDIT FAILED — добавьте ручную ссылку или хаб-реестр для orphan-страниц');
    process.exit(1);
  }
  console.log('LINK AUDIT PASSED');
}

main();
