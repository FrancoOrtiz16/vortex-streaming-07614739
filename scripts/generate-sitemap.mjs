import fs from 'fs/promises';
import path from 'path';
import { PUBLIC_PATHS } from '../routes.config.js';

const OUTPUT_PATH = path.resolve(process.cwd(), 'public', 'sitemap.xml');
const siteUrl = (process.env.SITE_URL || 'https://example.com').replace(/\/$/, '');
const nowISO = new Date().toISOString();

const buildUrlEntry = (route) => {
  const url = `${siteUrl}${route}`;
  return `  <url>\n    <loc>${url}</loc>\n    <lastmod>${nowISO}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${route === '/' ? '1.0' : '0.8'}</priority>\n  </url>`;
};

const buildSitemap = () => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PUBLIC_PATHS.map(buildUrlEntry).join('\n')}\n</urlset>\n`;

const writeSitemap = async () => {
  const content = buildSitemap();
  await fs.writeFile(OUTPUT_PATH, content, 'utf8');
  console.log(`Generated sitemap at ${OUTPUT_PATH}`);
};

writeSitemap().catch((error) => {
  console.error('Failed to generate sitemap:', error);
  process.exit(1);
});
