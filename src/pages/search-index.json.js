/* search index: one entry per module, plus one per section of its published notes */
import { getEntry } from 'astro:content';
import { MODULES } from '../data/curriculum.js';
import { published, searchEntries } from '../lib/site.js';

export async function GET() {
  const index = MODULES.map((m) => ({
    num: m.num, module: m.title, heading: null, live: m.status === 'published',
    text: m.tags.join(' · ') + (m.task ? ' · ' + m.kind + ': ' + m.task : ''),
    url: m.status === 'published' ? `notes/${m.slug}.html` : `roadmap.html#${m.slug}`
  }));
  for (const m of published) index.push(...searchEntries(m, (await getEntry('notes', m.slug)).rendered.html));
  return new Response(JSON.stringify(index));
}
