import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import rehypeHighlight from 'rehype-highlight';
import { checkLessons } from './src/lib/check.js';

/* runs before every dev server and build */
const lessonsCheck = {
  name: 'oro-lessons-check',
  hooks: {
    'astro:config:setup': () => {
      const problems = checkLessons(new URL('./lessons/', import.meta.url));
      if (!problems.length) return;
      problems.forEach((p) => console.error((process.env.GITHUB_ACTIONS ? '::error::' : 'error: ') + p));
      throw new Error('The skills do not match the lessons. See the errors above.');
    }
  }
};

export default defineConfig({
  site: 'https://d-kens.github.io',
  base: '/oro/',
  /* notes/linux.html, not notes/linux/: the URLs the site has always had */
  build: { format: 'file' },
  integrations: [lessonsCheck],
  markdown: {
    /* highlight.js classes, which public/styles.css colours; detect picks a language for unlabelled blocks */
    syntaxHighlight: false,
    processor: unified({ smartypants: false, rehypePlugins: [[rehypeHighlight, { detect: true }]] })
  }
});
