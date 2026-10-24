/* search index: one entry per module, plus one per section of its published notes and of each skill lesson */
import { getEntry } from 'astro:content';
import { MODULES } from '../data/curriculum.js';
import { published, lessons, searchEntries } from '../lib/site.js';

export async function GET() {
  const index = MODULES.map((m) => ({
    num: m.num, module: m.title, heading: null, live: m.status === 'published',
    text: m.tags.join(' · ') + (m.task ? ' · ' + m.kind + ': ' + m.task : ''),
    url: m.status === 'published' ? `notes/${m.slug}.html` : `roadmap.html#${m.slug}`
  }));
  for (const m of published) index.push(...searchEntries(m, (await getEntry('notes', m.slug)).rendered.html));
  /* each skill lesson's sections, named "Linux: Processes"; numbered after the roadmap so they sort below it on a tie */
  for (const l of lessons) {
    const entry = await getEntry('lessons', `${l.skill.slug}/${l.slug}`);
    if (entry) index.push(...searchEntries({ num: 1000 + l.n, title: `${l.skill.name}: ${l.title}` }, entry.rendered.html, l.url));
  }
  return new Response(JSON.stringify(index));
}
