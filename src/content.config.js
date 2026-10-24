/* The notes: notes/<slug>.md, one file per module. Files starting with _ (the template) are skipped.
   The lessons: lessons/<skill>/<slug>.md, one file per topic or project of a skill in src/data/skills.js. */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

export const collections = {
  notes: defineCollection({ loader: glob({ pattern: ['*.md', '!_*.md'], base: './notes' }) }),
  lessons: defineCollection({ loader: glob({ pattern: '**/*.md', base: './lessons' }) })
};
