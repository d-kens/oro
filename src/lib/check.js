/* Stops the build before it publishes a broken site: every published module needs a notes file, a name and a summary,
   and every notes file and NOTES entry has to match a module. */
import fs from 'node:fs';
import { NOTES, MODULES } from '../data/curriculum.js';

export function checkCurriculum(notesDir) {
  const problems = [];
  MODULES.filter((m) => m.status === 'published').forEach((m) => {
    if (!fs.existsSync(new URL(m.slug + '.md', notesDir))) problems.push(`notes/${m.slug}.md is missing but the module is marked published`);
    if (!NOTES[m.slug].name || !NOTES[m.slug].summary) problems.push(`'${m.slug}' is published but has no name or summary in NOTES in src/data/curriculum.js`);
  });
  Object.keys(NOTES).forEach((slug) => { if (!MODULES.some((m) => m.slug === slug)) problems.push(`src/data/curriculum.js lists '${slug}' in NOTES, but no module has that slug`); });
  fs.readdirSync(notesDir).filter((f) => f.endsWith('.md') && !f.startsWith('_')).forEach((f) => {
    if (!MODULES.some((m) => m.slug === f.slice(0, -3))) problems.push(`notes/${f} does not match any module slug in src/data/curriculum.js`);
  });
  return problems;
}
