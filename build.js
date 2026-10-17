/* Builds the site into _site/: every page shares one layout, the notes are rendered to static HTML,
   and the search index and sitemap are generated. Run it with: node build.js
   It uses only Node and the libraries in vendor/, so there is nothing to install. */
'use strict';
const fs = require('fs');
const path = require('path');
const { marked } = require('./vendor/marked.min.js');
const hljs = require('./vendor/highlight.min.js');
const { NOTES, PHASES, MODULES } = require('./curriculum.js');

const SITE = 'https://d-kens.github.io/open-path';       /* the live address, without a trailing slash */
const BASE = new URL(SITE).pathname + '/';              /* '/open-path/': the 404 page needs absolute links */
const NAME = 'Paipa';
const HOME_DESC = 'Skills you can deploy. Hands-on cloud and DevOps notes, from the basics to running real systems.';
const ASSETS = ['styles.css', 'nav.js', 'search.js', 'notes.js', 'favicon.svg', 'og-image.png'];
const LABEL = { published: 'Notes published', progress: 'In progress', coming: 'Coming' };
const THEME_COLOR = { dark: '#0d1330', light: '#f0f2f8' };   /* keep in step with styles.css */

const ROOT = __dirname;
const OUT = path.join(ROOT, '_site');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const write = (f, s) => { fs.mkdirSync(path.dirname(path.join(OUT, f)), { recursive: true }); fs.writeFileSync(path.join(OUT, f), s); };

/* ---------- helpers ---------- */
const pad = (x) => String(x).padStart(2, '0');
const niceDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const slugify = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&amp;/g, '&');
/* plain text of an HTML fragment; block ends become spaces so words from neighbouring paragraphs do not run together */
const textOf = (html) => decode(html.replace(/<\/(p|li|h\d|pre|td|th|tr|blockquote)>/g, ' ').replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
const published = MODULES.filter((m) => m.status === 'published');

/* ---------- checks: stop before publishing a broken site ---------- */
const problems = [];
published.forEach((m) => { if (!fs.existsSync(path.join(ROOT, 'notes', m.slug + '.md'))) problems.push(`notes/${m.slug}.md is missing but the module is marked published`); });
Object.keys(NOTES).forEach((slug) => { if (!MODULES.some((m) => m.slug === slug)) problems.push(`curriculum.js lists '${slug}' in NOTES, but no module has that slug`); });
fs.readdirSync(path.join(ROOT, 'notes')).filter((f) => f.endsWith('.md') && !f.startsWith('_')).forEach((f) => {
  if (!MODULES.some((m) => m.slug === f.slice(0, -3))) problems.push(`notes/${f} does not match any module slug in curriculum.js`);
});
if (problems.length) {
  problems.forEach((p) => console.error((process.env.GITHUB_ACTIONS ? '::error::' : 'error: ') + p));
  process.exit(1);
}

/* ---------- the shared layout ----------
   root: prefix from the page back to the site root ('' or '../'); url: the page's path on the live site, for canonical links. */
function layout(p) {
  const r = p.root || '';
  const title = p.title ? p.title + ' · ' + NAME : NAME + ' · Hands-on cloud and DevOps';
  const share = p.noindex ? '<meta name="robots" content="noindex">' : [
    `<link rel="canonical" href="${SITE}/${p.url}">`,
    `<meta property="og:type" content="${p.ogType || 'website'}">`,
    `<meta property="og:site_name" content="${NAME}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(p.description)}">`,
    `<meta property="og:url" content="${SITE}/${p.url}">`,
    `<meta property="og:image" content="${SITE}/og-image.png">`,
    '<meta name="twitter:card" content="summary_large_image">'
  ].join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${p.description ? `<meta name="description" content="${esc(p.description)}">\n` : ''}<meta name="theme-color" content="${THEME_COLOR.dark}" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="${THEME_COLOR.light}" media="(prefers-color-scheme: light)">
<link rel="icon" href="${r}favicon.svg" type="image/svg+xml">
${share}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,400..500,100,1&family=Hanken+Grotesk:wght@400;500;700&family=IBM+Plex+Mono:wght@300;400;500&display=swap">
<link rel="stylesheet" href="${r}styles.css">
<script>document.documentElement.classList.add('js');</script>${p.headScript ? `\n<script>${p.headScript}</script>` : ''}
</head>
<body>

<div class="wrap">
  <nav aria-label="Site">
    <a class="logo" href="${r}index.html" aria-label="${NAME}"><span class="logo-word" aria-hidden="true"><span class="p">paipa</span></span></a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-links" aria-label="Open menu"><span></span></button>
    <ul id="site-links">
      <li><a>Courses</a></li>
      <li><a>Roadmaps</a></li>
      <li><a>Blogs</a></li>
      <li><a>About</a></li>
      <li class="menu-cta"><a class="btn" href="https://buttondown.com/omondi">Subscribe</a><p>New notes by email. Unsubscribe any time.</p></li>
    </ul>
    <a class="nav-cta" href="https://buttondown.com/omondi">Subscribe</a>
  </nav>
${p.body.trim()}
</div>
<script src="${r}nav.js"></script>
${(p.scripts || []).map((s) => `<script src="${r}${s}"></script>\n`).join('')}</body>
</html>
`;
}

/* ---------- markdown: highlight code blocks at build time ---------- */
marked.use({
  renderer: {
    code(code, info) {
      const lang = (info || '').trim().split(/\s+/)[0];
      const out = lang && hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang, ignoreIllegals: true }) : hljs.highlightAuto(code);
      return `<pre><code class="hljs${out.language ? ' language-' + out.language : ''}">${out.value}</code></pre>\n`;
    }
  }
});

/* render a module's notes; returns the HTML plus its h2 sections (for the contents list) and its search entries */
function renderNotes(m) {
  const seen = {}, sections = [], entries = [];
  const html = marked.parse(read(`notes/${m.slug}.md`)).replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_, level, inner) => {
    let id = slugify(textOf(inner));
    seen[id] = (seen[id] || 0) + 1;
    if (seen[id] > 1) id += '-' + seen[id];
    if (level === '2') sections.push({ id, text: textOf(inner) });
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
  /* one search entry per h2/h3, holding the text up to the next heading */
  let cur = null;
  html.split(/(<h[23] id="[^"]*">[\s\S]*?<\/h[23]>)/).forEach((chunk) => {
    const h = chunk.match(/^<h[23] id="([^"]*)">([\s\S]*?)<\/h[23]>$/);
    if (h) entries.push(cur = { num: m.num, module: m.title, heading: textOf(h[2]), text: '', url: `notes/${m.slug}.html#${h[1]}`, live: true });
    else if (cur) cur.text = (cur.text + ' ' + textOf(chunk)).trim();
  });
  return { html, sections, entries };
}

const tags = (m) => '<ul class="tags">' + m.tags.map((t) => `<li>${t}</li>`).join('') + '</ul>';
const taskLine = (m) => m.kind ? `<p class="task"><span class="mono ${m.kind.toLowerCase()}">${m.kind}</span>${m.task}</p>` : '';
const yourTurn = (m) => m.kind ? `<aside class="your-turn"><span class="mono ${m.kind.toLowerCase()}">${m.kind}</span><p>${m.task}</p></aside>` : '';
const updated = (m) => m.updated ? `<span>Updated ${niceDate(m.updated)}</span>` : '';

/* ---------- the curriculum page ---------- */
function curriculumPage() {
  const card = (m) => {
    const live = m.status === 'published', href = `notes/${m.slug}.html`;
    return `<article class="pm${live ? ' live' : ''}" id="${m.slug}"><p class="mono pm-top"><span>Module ${pad(m.num)}</span>` +
      `<span class="status ${m.status}">${LABEL[m.status]}</span>${updated(m)}</p>` +
      `<h3>${live ? `<a href="${href}">${m.title}</a>` : m.title}</h3>${tags(m)}${taskLine(m)}` +
      (m.note ? `<p class="note">${m.note}</p>` : '') +
      (live ? `<a class="link read" href="${href}">Read the notes</a>` : '') + '</article>';
  };
  const index = PHASES.map((ph, pi) => `<a href="#phase-${pi}"><span class="mono">Phase ${pi}</span><b>${ph.name}</b></a>`).join('\n');
  const phases = PHASES.map((ph, pi) =>
    `<section class="phase" id="phase-${pi}"><div class="phase-head"><span class="mono">Phase ${pi}</span><h2>${ph.name}</h2><p>${ph.blurb}</p>` +
    (ph.security ? `<p class="sec"><span class="mono">Security thread</span>${ph.security}</p>` : '') +
    `<p class="mono count">${ph.modules.length} module${ph.modules.length === 1 ? '' : 's'}</p></div>\n` +
    `<div class="pms">\n${ph.modules.map(card).join('\n')}\n</div></section>`).join('\n');
  return `<main><header class="page-head"><p class="mono">The curriculum</p><h1>Ship it safely. Keep it running.</h1>
<p class="lead">${MODULES.length} modules in ${PHASES.length} phases, from Linux to a production capstone. Each lab builds on the one before, so you take one app from a commit to a secured, monitored deployment. Notes are published module by module.</p>
<p class="mono progress"><span class="status published">${published.length} of ${MODULES.length} published</span></p>
<nav class="phase-index" aria-label="Phases">
${index}
</nav></header>
${phases}
</main>`;
}

/* ---------- a module's notes page ---------- */
function notesPage(m, notes) {
  const ph = PHASES[m.phase];
  const neighbour = (step) => {
    const x = MODULES[m.num - 1 + step];
    if (!x) return '<span></span>';
    const inner = `<span class="mono">${step < 0 ? 'Previous' : 'Next'} · Module ${pad(x.num)}</span><b>${x.title}</b>`;
    return x.status === 'published' ? `<a href="${x.slug}.html">${inner}</a>` : `<div class="soon">${inner}<span class="mono">${LABEL[x.status]}</span></div>`;
  };
  const toc = notes.sections.length >= 3
    ? '<nav class="toc" aria-label="On this page"><details open><summary class="mono">On this page</summary><ul>' +
      notes.sections.map((s) => `<li><a href="#${s.id}">${esc(s.text)}</a></li>`).join('') + '</ul></details></nav>\n'
    : '';
  return `<main class="notes">
<header class="notes-head"><p class="mono crumbs"><a href="../curriculum.html">The curriculum</a> / <a href="../curriculum.html#phase-${m.phase}">Phase ${m.phase} · ${ph.name}</a></p>
<p class="mono">Module ${pad(m.num)}</p><h1>${m.title}</h1>
<p class="mono meta"><span class="status ${m.status}">${LABEL[m.status]}</span>${updated(m)}</p>
${tags(m)}</header>
${toc}<article class="md">
${notes.html}</article>
${yourTurn(m)}<nav class="pn" aria-label="Modules">${neighbour(-1)}${neighbour(1)}</nav>
</main>`;
}

/* ---------- write the site ---------- */
fs.rmSync(OUT, { recursive: true, force: true });
ASSETS.forEach((f) => { fs.mkdirSync(OUT, { recursive: true }); fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f)); });

write('index.html', layout({ url: '', description: HOME_DESC, body: read('src/pages/index.html') }));
write('search.html', layout({ url: 'search.html', title: 'Search', description: 'Search the Paipa cloud and DevOps notes.', body: read('src/pages/search.html'), scripts: ['search.js'] }));
write('404.html', layout({ root: BASE, title: 'Page not found', noindex: true, body: read('src/pages/404.html').replace(/href="(?![a-z]+:|\/|#)/g, `href="${BASE}`) }));
write('curriculum.html', layout({ url: 'curriculum.html', title: 'The curriculum', body: curriculumPage(),
  description: `The Paipa cloud and DevOps curriculum: ${MODULES.length} hands-on modules in ${PHASES.length} phases, from Linux to containers, CI/CD, Terraform, Kubernetes and observability, ending with a production capstone.` }));
/* the curriculum page used to be paths.html; keep old links working */
write('paths.html', layout({ title: 'The curriculum', noindex: true,
  headScript: "location.replace('curriculum.html'+location.hash);",
  body: '<main class="notes"><header class="notes-head"><p class="mono">Moved</p><h1>This page has moved.</h1>\n<p><a class="link" href="curriculum.html">Go to the curriculum</a></p></header></main>' }));

/* search index: one entry per module, plus one per section of its published notes */
const searchIndex = MODULES.map((m) => ({
  num: m.num, module: m.title, heading: null, live: m.status === 'published',
  text: m.tags.join(' · ') + (m.task ? ' · ' + m.kind + ': ' + m.task : ''),
  url: m.status === 'published' ? `notes/${m.slug}.html` : `curriculum.html#${m.slug}`
}));
published.forEach((m) => {
  const notes = renderNotes(m);
  searchIndex.push(...notes.entries);
  write(`notes/${m.slug}.html`, layout({
    root: '../', url: `notes/${m.slug}.html`, title: m.title, ogType: 'article',
    description: `Notes for Module ${m.num} of the Paipa cloud and DevOps curriculum: ${m.title}. ${m.tags.join(', ')}.`,
    body: notesPage(m, notes), scripts: ['notes.js']
  }));
});
write('search-index.json', JSON.stringify(searchIndex));

/* old links looked like notes.html?m=<slug>#section; send them to the new pages */
write('notes.html', layout({
  title: 'Notes', noindex: true,
  headScript: `(function(){var s=new URLSearchParams(location.search).get('m');if(${JSON.stringify(published.map((m) => m.slug))}.indexOf(s)>=0)location.replace('notes/'+s+'.html'+location.hash);})();`,
  body: '<main class="notes"><header class="notes-head"><p class="mono">Notes</p><h1>Module not found.</h1>\n<p class="lead">That link does not match a module with published notes.</p><p><a class="link" href="curriculum.html">Back to the curriculum</a></p></header></main>'
}));

/* sitemap: submit SITE/sitemap.xml in Google Search Console (a project site cannot serve its own robots.txt) */
const lastmod = (d) => d ? `<lastmod>${d}</lastmod>` : '';
const newest = published.map((m) => m.updated).filter(Boolean).sort().pop();
const urls = [['', newest], ['curriculum.html', newest], ['search.html', null]].concat(published.map((m) => [`notes/${m.slug}.html`, m.updated]));
write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(([u, d]) => `  <url><loc>${SITE}/${u}</loc>${lastmod(d)}</url>`).join('\n') + '\n</urlset>\n');

console.log(`Built ${published.length} notes pages, ${searchIndex.length} search entries → ${path.relative(process.cwd(), OUT) || '.'}/`);
