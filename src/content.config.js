/* The notes: notes/<slug>.md, one file per module. Files starting with _ (the template) are skipped. */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

export const collections = {
  notes: defineCollection({ loader: glob({ pattern: ['*.md', '!_*.md'], base: './notes' }) })
};
