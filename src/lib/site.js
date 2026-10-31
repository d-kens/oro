/* Shared settings and helpers for the pages and endpoints. */
import { getEntry } from 'astro:content';
import { SKILLS } from '../data/skills.js';

export const SITE = 'https://oro.co.ke';   /* the live address, without a trailing slash */
export const NAME = 'Oro';
/* the WhatsApp community's invite link, shown as "Join the community" in the nav */
export const WHATSAPP = 'https://chat.whatsapp.com/JXkdh10fJXE5bf9Ku6i5D5';
/* every topic and project of every skill, in order, as { skill, slug, title, line, search, project, n, url } */
export const lessons = SKILLS.flatMap((s) => s.topics.map((t) => [t, false]).concat(s.projects.map((p) => [p, true]))
  .map(([[slug, title, line, search], project], i) => ({ skill: s, slug, title, line, search, project, n: i + 1, url: `skills/${s.slug}/${slug}.html` })));

/* a path on the site, with the base in front: href('skills/linux.html') */
export const href = (p = '') => import.meta.env.BASE_URL.replace(/\/?$/, '/') + p;

export const pad = (x) => String(x).padStart(2, '0');
/* minutes to read a lesson's Markdown, at 220 words a minute */
export const minutes = (body) => Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 220));
/* minutes to read every topic and project of a skill */
export const skillMinutes = async (s) => (await Promise.all(lessons.filter((l) => l.skill === s)
  .map(async (l) => minutes((await getEntry('lessons', `${s.slug}/${l.slug}`)).body)))).reduce((a, b) => a + b, 0);
/* a reading time rounded so it reads as a rough size: "about 15 minutes", "about 3 hours" */
export const roughly = (min) => min < 50 ? `about ${Math.max(5, Math.round(min / 5) * 5)} minutes`
  : Math.round(min / 60) === 1 ? 'about 1 hour' : `about ${Math.round(min / 60)} hours`;
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n)).replace(/&amp;/g, '&');
/* plain text of an HTML fragment; block ends become spaces so words from neighbouring paragraphs do not run together */
export const textOf = (html) => decode(html.replace(/<\/(p|li|h\d|pre|td|th|tr|blockquote)>/g, ' ').replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();

/* the search entries for one page of rendered Markdown: one per h2/h3, holding the text up to the next heading.
   The prose and the code blocks are kept apart: both are searched, but previews are taken from the prose.
   m gives the lesson's number, skill and title, used to sort, group and label the results; url is the page. */
export function searchEntries(m, html, url) {
  const entries = [];
  const add = (a, b) => (a + ' ' + b).trim();
  let cur = null;
  html.split(/(<h[23] id="[^"]*">[\s\S]*?<\/h[23]>)/).forEach((chunk) => {
    const h = chunk.match(/^<h[23] id="([^"]*)">([\s\S]*?)<\/h[23]>$/);
    if (h) {
      entries.push(cur = { num: m.num, skill: m.skill, lesson: m.lesson, page: url, heading: textOf(h[2]), text: '', code: '', url: `${url}#${h[1]}` });
    } else if (cur) {
      (chunk.match(/<pre[\s\S]*?<\/pre>/g) || []).forEach((pre) => { cur.code = add(cur.code, textOf(pre)); });
      /* the prose leaves out code and the labels of the answer boxes, such as "Show answer" */
      cur.text = add(cur.text, textOf(chunk.replace(/<pre[\s\S]*?<\/pre>|<summary>[\s\S]*?<\/summary>/g, ' ')));
    }
  });
  return entries;
}
