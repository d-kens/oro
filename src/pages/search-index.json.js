/* search index: one entry per section of each skill lesson */
import { getEntry } from 'astro:content';
import { lessons, searchEntries } from '../lib/site.js';

export async function GET() {
  const index = [];
  /* each lesson's sections, labelled like "Linux: Processes" */
  for (const l of lessons) {
    const entry = await getEntry('lessons', `${l.skill.slug}/${l.slug}`);
    index.push(...searchEntries({ num: l.n, title: `${l.skill.name}: ${l.title}` }, entry.rendered.html, l.url));
  }
  return new Response(JSON.stringify(index));
}
