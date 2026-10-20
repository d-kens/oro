import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import rehypeHighlight from 'rehype-highlight';
import { checkCurriculum } from './src/lib/check.js';

/* runs before every dev server and build */
const curriculumCheck = {
  name: 'paipa-curriculum-check',
  hooks: {
    'astro:config:setup': () => {
      const problems = checkCurriculum(new URL('./notes/', import.meta.url));
      if (!problems.length) return;
      problems.forEach((p) => console.error((process.env.GITHUB_ACTIONS ? '::error::' : 'error: ') + p));
      throw new Error('The curriculum does not match the notes. See the errors above.');
    }
  }
};

export default defineConfig({
  site: 'https://d-kens.github.io',
  base: '/paipa/',
  /* notes/linux.html, not notes/linux/: the URLs the site has always had */
  build: { format: 'file' },
  integrations: [curriculumCheck],
  markdown: {
    /* highlight.js classes, which public/styles.css colours; detect picks a language for unlabelled blocks */
    syntaxHighlight: false,
    processor: unified({ smartypants: false, rehypePlugins: [[rehypeHighlight, { detect: true }]] })
  }
});
