# Paipa

A cloud engineering roadmap and notes: 27 topics in 8 stages, from Linux to designing, securing and running systems on AWS, with hands-on labs along the way. The name comes from the pipeline every change travels, from a commit to production.

Live at <https://d-kens.github.io/paipa/>.

## Run it locally

### 1. Install Node

The site is built with [Astro](https://astro.build), which needs **Node 22.22 or later**. The repo pins Node 24 in `.nvmrc`.

If you use [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install    # installs the version in .nvmrc, the first time only
nvm use        # switches this terminal to it
node -v        # should print v24.x
```

Without nvm, install Node 24 from [nodejs.org](https://nodejs.org).

### 2. Get the code and install the dependencies

```bash
git clone https://github.com/d-kens/paipa.git
cd paipa
npm install
```

### 3. Start the dev server

```bash
npm run dev
```

Open <http://localhost:4321/paipa/>. The page reloads by itself when you save a change to a page, a style or a notes file.

Note the `/paipa/` at the end: the site lives under that path on GitHub Pages, so it does locally too. `http://localhost:4321/` on its own shows a 404.

### 4. Build and preview the real site

```bash
npm run build     # builds the site into dist/, and checks the curriculum (see below)
npm run preview   # serves dist/ at http://localhost:4321/paipa/
```

Run this before you push, to see exactly what GitHub Pages will publish.

### If something goes wrong

| Problem | Fix |
| --- | --- |
| `Node.js v22.x is not supported by Astro` | Your Node is too old. Run `nvm use`, or install Node 24. |
| `Dev server already running at http://localhost:4321` | One is already running, perhaps in another terminal. Use it, or stop it with `npx astro dev stop` and start again. |
| The page is blank or a 404 | Check the address ends in `/paipa/`. |
| The build stops with `error: notes/... ` | The notes and `src/data/curriculum.js` don't match. The message says which file to fix. |
| The old favicon still shows | Browsers cache favicons. Hard-refresh (Cmd+Shift+R or Ctrl+Shift+R). |

## How it fits together

| Path | What it is |
| --- | --- |
| `src/data/curriculum.js` | The stages, the topics, their labs, and which topics have published notes |
| `notes/<slug>.md` | The notes for one topic, in Markdown, loaded as the `notes` content collection (`src/content.config.js`) |
| `src/layouts/Layout.astro` | The shared head, nav, footer and scripts every page uses, including the drawn wordmark |
| `src/pages/` | The home, roadmap, topics, labs, about, search and 404 pages, one page per topic's notes, the search index and the sitemap |
| `src/pages/index.astro` | The home page, including the list of tools in the moving "Tools along the pipeline" row |
| `src/lib/` | Shared settings and helpers, and the curriculum check |
| `public/` | `styles.css`, `nav.js`, `search.js`, `notes.js` and `favicon.svg`, copied to the site as they are |
| `astro.config.mjs` | The `/paipa/` base, `.html` URLs, and highlight.js for code blocks |

All colours are set once, at the top of `public/styles.css`.

## Publish a topic's notes

1. Copy `notes/_template.md` to `notes/<slug>.md`. The slug is in `src/data/curriculum.js`.
2. Add the topic to `NOTES` at the top of `src/data/curriculum.js`, with `status: 'published'`, today's date as `updated`, and a short `name` and one-line `summary` for the Topics page.
3. If the topic has a lab, keep the word "Lab" in that section's heading, so the Labs page links to it.
4. Run `npm run dev` and check the page, then `npm run build`.
5. Push to `master`. GitHub Actions builds the site and deploys it to GitHub Pages.

The build stops with an error if a published topic has no notes file, name or summary, or if a notes file or a `NOTES` entry doesn't match a topic. The roadmap, Topics, Labs and the home page's tools row all update from the same data.

## Search engines

The build writes `sitemap.xml`. Submit `https://d-kens.github.io/paipa/sitemap.xml` in Google Search Console. A project site can't serve its own `robots.txt`, so the sitemap has to be submitted by hand.
