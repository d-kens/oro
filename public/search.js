(function () {
  var input = document.getElementById('q'), status = document.getElementById('status'), list = document.getElementById('results');
  var start = document.getElementById('start'), filter = document.getElementById('filter'), more = document.getElementById('more');
  input.value = new URLSearchParams(location.search).get('q') || '';
  input.focus();

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  /* built by src/pages/search-index.json.js: one entry per section of each lesson, its prose and its code kept apart */
  var INDEX = null;
  var PAGE = 10;       /* lessons shown at first, and added by "Show more" */
  var SECTIONS = 3;    /* matching sections shown under each lesson */
  var groups = [], skill = null, shown = PAGE, ws = [], q = '';

  /* A query word matches a word in the notes that starts with it, so "iam" finds "IAM" and "IAM's" but not "diameter".
     A plural query is cut back to its singular first, so "subnets" finds "subnet" as well as "subnets". */
  function stem(w) {
    if (w.length < 4 || /(ss|us|is)$/.test(w)) return w;          /* "aws", "access", "status", "analysis" stay as they are */
    if (/(s|x|z|ch|sh)es$/.test(w) && w.length > 4) return w.slice(0, -2);   /* "classes" → "class", "caches" → "cach" */
    return w.replace(/s$/, '');                                   /* "subnets" → "subnet", "routes" → "route" */
  }
  function tokens(s) { return s.toLowerCase().match(/[a-z0-9]+/g) || []; }
  function words(s) { return tokens(s).map(stem); }
  function count(toks, w) { var n = 0; for (var i = 0; i < toks.length; i++) if (toks[i].lastIndexOf(w, 0) === 0) n++; return n; }

  function snippet(text, ws) {
    var clean = text.replace(/\s+/g, ' ').trim();
    /* each query word at the start of a word, taking the rest of that word with it, so the whole word is marked */
    var re = new RegExp('\\b((?:' + ws.slice().sort(function (a, b) { return b.length - a.length; })
      .map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')[a-z0-9]*)', 'gi');
    var first = re.exec(clean), at = first ? first.index : 0;
    re.lastIndex = 0;
    var begin = Math.max(0, at - 70), end = Math.min(clean.length, at + 150);
    /* widen to whole words, so a snippet never starts or ends halfway through one */
    if (begin > 0) { var sp = clean.lastIndexOf(' ', begin); begin = sp < 0 ? 0 : sp + 1; }
    if (end < clean.length) { var ep = clean.indexOf(' ', end); end = ep < 0 ? clean.length : ep; }
    /* match on the raw text, then escape each piece, so a match never lands inside markup */
    var out = clean.slice(begin, end).split(re).map(function (part, i) { return i % 2 ? '<mark>' + esc(part) + '</mark>' : esc(part); }).join('');
    return (begin > 0 ? '…' : '') + out + (end < clean.length ? '…' : '');
  }

  /* previews come from the prose; a section that is only code falls back to the code */
  function preview(e) { return snippet(e.text || e.code, ws); }

  /* scores every section, then gathers the matches by lesson, best lesson first */
  function search() {
    if (!INDEX) return;
    q = input.value.trim();
    ws = words(q);
    history.replaceState(null, '', q ? 'search.html?q=' + encodeURIComponent(q) : 'search.html');
    skill = null;
    shown = PAGE;
    groups = [];
    start.hidden = ws.length > 0;
    if (ws.length) {
      var byPage = {};
      INDEX.forEach(function (e) {
        var score = 0;
        for (var i = 0; i < ws.length; i++) {
          var inTitle = count(e.titleWords, ws[i]) > 0, inBody = count(e.bodyWords, ws[i]);
          if (!inTitle && !inBody) return;
          score += (inTitle ? 5 : 0) + (inBody ? Math.min(inBody, 5) : 0);
        }
        var g = byPage[e.page];
        if (!g) groups.push(g = byPage[e.page] = { page: e.page, lesson: e.lesson, skill: e.skill, num: e.num, best: 0, hits: [] });
        g.hits.push({ e: e, score: score });
        if (score > g.best) g.best = score;
      });
      groups.forEach(function (g) { g.hits.sort(function (a, b) { return b.score - a.score; }); });
      groups.sort(function (a, b) { return b.best - a.best || b.hits.length - a.hits.length || a.num - b.num; });
    }
    drawFilter();
    draw();
  }

  /* one button per skill with matches, busiest first, after "All"; hidden when only one skill matched */
  function drawFilter() {
    var bySkill = {}, names = [];
    groups.forEach(function (g) { if (!bySkill[g.skill]) { bySkill[g.skill] = 0; names.push(g.skill); } bySkill[g.skill]++; });
    if (names.length < 2) { filter.innerHTML = ''; return; }
    names.sort(function (a, b) { return bySkill[b] - bySkill[a]; });
    filter.innerHTML = ['<button type="button" data-skill="" aria-pressed="true">All<span>' + groups.length + '</span></button>']
      .concat(names.map(function (n) { return '<button type="button" data-skill="' + esc(n) + '" aria-pressed="false">' + esc(n) + '<span>' + bySkill[n] + '</span></button>'; }))
      .join('');
  }

  function draw() {
    var visible = skill ? groups.filter(function (g) { return g.skill === skill; }) : groups;
    var sections = visible.reduce(function (n, g) { return n + g.hits.length; }, 0);
    if (!ws.length) status.textContent = '';
    else if (!groups.length) status.textContent = 'Nothing for “' + q + '”. Try a shorter or different word.';
    else status.textContent = plural(sections, 'matching section') + ' in ' + plural(visible.length, 'lesson') + ' for “' + q + '”' + (skill ? ', in ' + skill : '');
    active = -1;
    list.innerHTML = visible.slice(0, shown).map(function (g) {
      var rest = g.hits.length - SECTIONS;
      return '<li><a class="lesson" href="' + esc(g.page) + '"><b>' + esc(g.lesson) + '</b><span class="where">' + esc(g.skill) + '</span></a>' +
        '<ul>' + g.hits.slice(0, SECTIONS).map(function (h) {
          return '<li><a href="' + esc(h.e.url) + '"><span class="sec">' + esc(h.e.heading) + '</span><p>' + preview(h.e) + '</p></a></li>';
        }).join('') + '</ul>' +
        (rest > 0 ? '<p class="also">and ' + plural(rest, 'more section') + ' in this lesson</p>' : '') + '</li>';
    }).join('');
    var left = visible.length - shown;
    more.hidden = left <= 0;
    if (left > 0) more.textContent = 'Show ' + Math.min(left, PAGE) + ' more ' + (Math.min(left, PAGE) === 1 ? 'lesson' : 'lessons');
  }

  filter.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button'); if (!b) return;
    skill = b.getAttribute('data-skill') || null;
    shown = PAGE;
    Array.prototype.forEach.call(filter.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    draw();
  });
  more.addEventListener('click', function () { shown += PAGE; draw(); });

  /* up and down move through the links in the results, Enter opens the chosen one */
  var active = -1;
  function pick(i) {
    var links = list.querySelectorAll('a');
    if (!links.length) return;
    if (active >= 0 && links[active]) links[active].classList.remove('active');
    active = Math.max(-1, Math.min(i, links.length - 1));
    if (active < 0) return;
    links[active].classList.add('active');
    links[active].scrollIntoView({ block: 'nearest' });
  }
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); pick(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); pick(active - 1); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); list.querySelectorAll('a')[active].click(); }
  });

  var timer;
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(search, 120); });
  input.form.addEventListener('submit', function (e) { e.preventDefault(); search(); });

  fetch('search-index.json')
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      data.forEach(function (e) { e.titleWords = tokens(e.skill + ' ' + e.lesson + ' ' + e.heading); e.bodyWords = tokens(e.text + ' ' + e.code); });
      INDEX = data; search();
    })
    .catch(function () { status.textContent = 'The search index could not be loaded. Refresh the page to try again.'; });
})();
