# Paipa

Skills you can deploy. Hands-on cloud and DevOps notes and labs: you take one app from a commit to a monitored production deployment, and learn the skills teams hire for on the way.

Live at <https://d-kens.github.io/open-path/>.

## Run it locally

You need Node 18 or later. There is nothing to install.

```bash
node build.js                          # builds the site into _site/
python3 -m http.server -d _site 8000   # then open http://localhost:8000
```

Run `node build.js` again after each change.

## How it fits together

| Path | What it is |
| --- | --- |
| `curriculum.js` | The phases, the modules, which modules have published notes |
| `notes/<slug>.md` | The notes for one module, in Markdown |
| `src/pages/` | The body of the home, search and 404 pages |
| `build.js` | Wraps every page in the shared layout, renders the notes and the curriculum page, and writes the search index and sitemap |
| `styles.css`, `nav.js`, `search.js`, `notes.js` | Copied to the site as they are |
| `vendor/` | marked and highlight.js, used by the build only |

## Publish a module's notes

1. Copy `notes/_template.md` to `notes/<slug>.md`. The slug is in `curriculum.js`.
2. Add the module to `NOTES` at the top of `curriculum.js`, with `status: 'published'` and today's date as `updated`.
3. Run `node build.js` and check the page locally.
4. Push to `master`. GitHub Actions builds the site and deploys it to GitHub Pages.

The build stops with an error if a published module has no notes file, or if a notes file or a `NOTES` entry doesn't match a module.

Old links like `notes.html?m=linux` redirect to `notes/linux.html`, and `paths.html` redirects to `curriculum.html`.

## Search engines

The build writes `sitemap.xml`. Submit `https://d-kens.github.io/open-path/sitemap.xml` in Google Search Console. A project site can't serve its own `robots.txt`, so the sitemap has to be submitted by hand.
