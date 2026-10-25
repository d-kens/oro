/* Shared settings and helpers for the pages and endpoints. */
import { SKILLS } from '../data/skills.js';

export const SITE = 'https://d-kens.github.io/paipa';   /* the live address, without a trailing slash */
export const NAME = 'Paipa';
/* the WhatsApp group's invite link, shown as "Join the group" in the nav */
export const WHATSAPP = 'https://chat.whatsapp.com/REPLACE_WITH_INVITE_CODE';
/* every topic and project of every skill, in order, as { skill, slug, title, line, project, n, url } */
export const lessons = SKILLS.flatMap((s) => s.topics.map((t) => [t, false]).concat(s.projects.map((p) => [p, true]))
  .map(([[slug, title, line], project], i) => ({ skill: s, slug, title, line, project, n: i + 1, url: `skills/${s.slug}/${slug}.html` })));

/* a path on the site, with the /paipa/ base in front: href('notes/linux.html') */
export const href = (p = '') => import.meta.env.BASE_URL.replace(/\/?$/, '/') + p;

export const pad = (x) => String(x).padStart(2, '0');
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n)).replace(/&amp;/g, '&');
/* plain text of an HTML fragment; block ends become spaces so words from neighbouring paragraphs do not run together */
export const textOf = (html) => decode(html.replace(/<\/(p|li|h\d|pre|td|th|tr|blockquote)>/g, ' ').replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();

/* the search entries for one page of rendered Markdown: one per h2/h3, holding the text up to the next heading.
   m gives the number and title used to sort and label the results; url is the page. */
export function searchEntries(m, html, url) {
  const entries = [];
  let cur = null;
  html.split(/(<h[23] id="[^"]*">[\s\S]*?<\/h[23]>)/).forEach((chunk) => {
    const h = chunk.match(/^<h[23] id="([^"]*)">([\s\S]*?)<\/h[23]>$/);
    if (h) entries.push(cur = { num: m.num, module: m.title, heading: textOf(h[2]), text: '', url: `${url}#${h[1]}` });
    else if (cur) cur.text = (cur.text + ' ' + textOf(chunk)).trim();
  });
  return entries;
}
