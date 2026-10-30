/* sitemap: submit SITE/sitemap.xml in Google Search Console */
import { SITE, lessons } from '../lib/site.js';
import { SKILLS } from '../data/skills.js';

export function GET() {
  const urls = ['', 'roadmap.html', 'skills.html', 'projects.html', 'about.html', 'search.html'].concat(SKILLS.map((s) => `skills/${s.slug}.html`), lessons.map((l) => l.url));
  return new Response('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${SITE}/${u}</loc></url>`).join('\n') + '\n</urlset>\n');
}
