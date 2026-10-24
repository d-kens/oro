/* sitemap: submit SITE/sitemap.xml in Google Search Console (a project site cannot serve its own robots.txt) */
import { SITE, published, lessons } from '../lib/site.js';
import { SKILLS } from '../data/skills.js';

export function GET() {
  const lastmod = (d) => d ? `<lastmod>${d}</lastmod>` : '';
  const newest = published.map((m) => m.updated).filter(Boolean).sort().pop();
  const urls = [['', newest], ['roadmap.html', newest], ['topics.html', newest], ['labs.html', newest], ['skills.html', null], ['interview.html', null], ['search.html', null]].concat(SKILLS.map((s) => [`skills/${s.slug}.html`, null]), lessons.map((l) => [l.url, null]), published.map((m) => [`notes/${m.slug}.html`, m.updated]));
  return new Response('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(([u, d]) => `  <url><loc>${SITE}/${u}</loc>${lastmod(d)}</url>`).join('\n') + '\n</urlset>\n');
}
