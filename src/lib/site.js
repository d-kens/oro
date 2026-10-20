/* Shared settings and helpers for the pages and endpoints. */
import { MODULES } from '../data/curriculum.js';

export const SITE = 'https://d-kens.github.io/paipa';   /* the live address, without a trailing slash */
export const NAME = 'Paipa';
export const published = MODULES.filter((m) => m.status === 'published');

/* a path on the site, with the /paipa/ base in front: href('notes/linux.html') */
export const href = (p = '') => import.meta.env.BASE_URL.replace(/\/?$/, '/') + p;

export const pad = (x) => String(x).padStart(2, '0');
export const niceDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n)).replace(/&amp;/g, '&');
/* plain text of an HTML fragment; block ends become spaces so words from neighbouring paragraphs do not run together */
export const textOf = (html) => decode(html.replace(/<\/(p|li|h\d|pre|td|th|tr|blockquote)>/g, ' ').replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();

/* the search entries for one module's rendered notes: one per h2/h3, holding the text up to the next heading */
export function searchEntries(m, html) {
  const entries = [];
  let cur = null;
  html.split(/(<h[23] id="[^"]*">[\s\S]*?<\/h[23]>)/).forEach((chunk) => {
    const h = chunk.match(/^<h[23] id="([^"]*)">([\s\S]*?)<\/h[23]>$/);
    if (h) entries.push(cur = { num: m.num, module: m.title, heading: textOf(h[2]), text: '', url: `notes/${m.slug}.html#${h[1]}`, live: true });
    else if (cur) cur.text = (cur.text + ' ' + textOf(chunk)).trim();
  });
  return entries;
}
