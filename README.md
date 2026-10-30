# Oro

Hands-on DevOps and cloud skills: What is DevOps, Linux, shell scripting, networking and cloud computing so far, each taught as topics in order with lessons, tasks, quizzes and projects that run on your own computer, plus a DevOps roadmap. The name comes from the pipeline every change travels, from a commit to production.

Live at <https://oro.co.ke>.

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
git clone https://github.com/d-kens/oro.git
cd oro
npm install
```

### 3. Start the dev server

```bash
npm run dev
```

Open <http://localhost:4321/>. The page reloads by itself when you save a change to a page, a style or a lesson file.

### 4. Build and preview the real site

```bash
npm run build     # builds the site into dist/, and checks the lessons (see below)
npm run preview   # serves dist/ at http://localhost:4321/
```

Run this before you push, to see exactly what GitHub Pages will publish.

### If something goes wrong

| Problem | Fix |
| --- | --- |
| `Node.js v22.x is not supported by Astro` | Your Node is too old. Run `nvm use`, or install Node 24. |
| `Dev server already running at http://localhost:4321` | One is already running, perhaps in another terminal. Use it, or stop it with `npx astro dev stop` and start again. |
| The build stops with `error: lessons/... ` | The lessons and `src/data/skills.js` don't match. The message says which file to fix. |
| The old favicon still shows | Browsers cache favicons. Hard-refresh (Cmd+Shift+R or Ctrl+Shift+R). |

## How it fits together

| Path | What it is |
| --- | --- |
| `src/data/skills.js` | Each skill, its level and summary, and its topics and projects in order |
| `src/data/roadmaps.js` | Each roadmap and its skills in order; skills not in `skills.js` show as planned |
| `lessons/<skill>/<slug>.md` | One lesson per topic or project, in Markdown, loaded as the `lessons` content collection (`src/content.config.js`) |
| `src/layouts/Layout.astro` | The shared head, nav, footer and scripts every page uses, including the drawn wordmark |
| `src/pages/` | The home, roadmaps, skills, search and 404 pages, one page per skill and per lesson, the search index and the sitemap |
| `src/lib/` | Shared settings and helpers, and the lessons check |
| `public/` | `styles.css`, `nav.js`, `search.js`, `lesson.js` and `favicon.svg`, copied to the site as they are |
| `astro.config.mjs` | The site address, `.html` URLs, and highlight.js for code blocks |

All colours are set once, at the top of `public/styles.css`.

## Add a lesson or a skill

1. Add the topic or project to its skill in `src/data/skills.js` as `[slug, title, one-line summary]`. For a new skill, add a whole entry with a `slug`, `name`, `level` and `summary`.
2. Write `lessons/<skill>/<slug>.md`. Start with a short intro, then `## ` sections, then `## Tasks` and `## Quiz`, with answers in `<details>` blocks. Any finished lesson is a good model, such as `lessons/linux/what-linux-is.md`.
3. Run `npm run dev` and check the page, then `npm run build`.
4. Push to `master`. GitHub Actions builds the site and deploys it to GitHub Pages.

The build stops with an error if a topic or project has no lesson file, or a lesson file matches no topic or project. The skill pages, the roadmaps and search all update from the same data.

## Search engines

The build writes `sitemap.xml`. Submit `https://oro.co.ke/sitemap.xml` in Google Search Console.
