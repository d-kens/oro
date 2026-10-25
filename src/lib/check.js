/* Stops the build before it publishes a broken site: every topic and project of a skill needs a lesson file,
   and every lesson file has to match a topic or project. */
import fs from 'node:fs';
import { SKILLS } from '../data/skills.js';

export function checkLessons(lessonsDir) {
  const problems = [];
  SKILLS.forEach((sk) => {
    const dir = new URL(`${sk.slug}/`, lessonsDir), slugs = sk.topics.concat(sk.projects).map((t) => t[0]);
    slugs.forEach((slug) => { if (!fs.existsSync(new URL(slug + '.md', dir))) problems.push(`lessons/${sk.slug}/${slug}.md is missing for the ${sk.name} skill`); });
    if (fs.existsSync(dir)) fs.readdirSync(dir).filter((f) => f.endsWith('.md')).forEach((f) => {
      if (!slugs.includes(f.slice(0, -3))) problems.push(`lessons/${sk.slug}/${f} does not match a topic or project of ${sk.name} in src/data/skills.js`);
    });
  });
  return problems;
}
