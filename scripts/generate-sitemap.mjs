import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { ROUTES } from '../src/routes-manifest.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(__dirname, '../dist');
const DOMAIN = 'https://plainfile.io';

const today = new Date().toISOString().split('T')[0];

const urls = ROUTES.map((route) => {
  const loc = `${DOMAIN}${route.path}`;
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    `    <changefreq>${route.changefreq}</changefreq>`,
    `    <priority>${route.priority.toFixed(1)}</priority>`,
    '  </url>',
  ].join('\n');
}).join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

mkdirSync(DIST_DIR, { recursive: true });
writeFileSync(resolve(DIST_DIR, 'sitemap.xml'), sitemap, 'utf8');
console.log(`Generated sitemap.xml with ${ROUTES.length} URLs at dist/sitemap.xml`);
