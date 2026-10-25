/* The lessons: lessons/<skill>/<slug>.md, one file per topic or project of a skill in src/data/skills.js. */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

export const collections = {
  lessons: defineCollection({ loader: glob({ pattern: '**/*.md', base: './lessons' }) })
};
