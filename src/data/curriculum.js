/* Paipa curriculum: read by the Astro pages to make the roadmap page, the notes pages, the search index and the sitemap. */
/* ---------- publishing status ----------
   When you publish notes for a module:
     1. add notes/<slug>.md  (copy notes/_template.md)
     2. add or update its line below
   status: 'published' (notes are live) or 'progress' (being written). Leave a module out while it is not started.
   name and summary: the short name and the one line the Topics page shows for a published module.
   The build stops if a published module has no notes file, name or summary, or a line here names a module that does not exist. */
var NOTES = {};

/* ---------- phases and modules ---------- */
function mod(slug, title, tags, kind, task, note) { return { slug: slug, title: title, tags: tags, kind: kind, task: task, note: note }; }
var PHASES = [];
var MODULES = [];
PHASES.forEach(function (ph, pi) {
  ph.modules.forEach(function (m) {
    m.num = MODULES.length + 1; m.phase = pi;
    var st = NOTES[m.slug] || {};
    m.status = st.status || 'coming'; m.updated = st.updated || null;
    m.name = st.name || m.title; m.summary = st.summary || null;
    MODULES.push(m);
  });
});

export { NOTES, PHASES, MODULES };
