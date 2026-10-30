/* search index: one entry per section of each lesson, labelled with its skill and lesson */
import { getEntry } from 'astro:content';
import { lessons, searchEntries } from '../lib/site.js';

export async function GET() {
  const index = [];
  /* num is the lesson's place in the whole site, so equal scores keep the skills' order */
  for (const [i, l] of lessons.entries()) {
    const entry = await getEntry('lessons', `${l.skill.slug}/${l.slug}`);
    index.push(...searchEntries({ num: i, skill: l.skill.name, lesson: l.title }, entry.rendered.html, l.url));
  }
  return new Response(JSON.stringify(index));
}
