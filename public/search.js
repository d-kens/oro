(function () {
  var input = document.getElementById('q'), status = document.getElementById('status'), list = document.getElementById('results');
  input.value = new URLSearchParams(location.search).get('q') || '';
  input.focus();

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* built by src/pages/search-index.json.js: one entry per topic, plus one per section of its published notes */
  var INDEX = null;

  /* ---------- search ---------- */
  /* A query word matches a word in the notes that starts with it, so "iam" finds "IAM" and "IAM's" but not "diameter".
     A plural query is cut back to its singular first, so "subnets" finds "subnet" as well as "subnets". */
  function stem(w) {
    if (w.length < 4 || /(ss|us|is)$/.test(w)) return w;          /* "aws", "access", "status", "analysis" stay as they are */
    if (/(s|x|z|ch|sh)es$/.test(w) && w.length > 4) return w.slice(0, -2);   /* "classes" → "class", "caches" → "cach" */
    return w.replace(/s$/, '');                                   /* "subnets" → "subnet", "routes" → "route" */
  }
  function tokens(s) { return s.toLowerCase().match(/[a-z0-9]+/g) || []; }
  function words(q) { return tokens(q).map(stem); }
  function count(toks, w) { var n = 0; for (var i = 0; i < toks.length; i++) if (toks[i].lastIndexOf(w, 0) === 0) n++; return n; }

  function snippet(text, ws) {
    var clean = text.replace(/\s+/g, ' ').trim();
    /* each query word at the start of a word, taking the rest of that word with it, so the whole word is marked */
    var re = new RegExp('\\b((?:' + ws.slice().sort(function (a, b) { return b.length - a.length; })
      .map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')[a-z0-9]*)', 'gi');
    var first = re.exec(clean), at = first ? first.index : 0;
    re.lastIndex = 0;
    var start = Math.max(0, at - 70), end = Math.min(clean.length, at + 150);
    /* widen to whole words, so a snippet never starts or ends halfway through one */
    if (start > 0) { var sp = clean.lastIndexOf(' ', start); start = sp < 0 ? 0 : sp + 1; }
    if (end < clean.length) { var ep = clean.indexOf(' ', end); end = ep < 0 ? clean.length : ep; }
    /* match on the raw text, then escape each piece, so a match never lands inside markup */
    var out = clean.slice(start, end).split(re).map(function (part, i) { return i % 2 ? '<mark>' + esc(part) + '</mark>' : esc(part); }).join('');
    return (start > 0 ? '…' : '') + out + (end < clean.length ? '…' : '');
  }

  function run() {
    if (!INDEX) return;
    var q = input.value.trim(), ws = words(q);
    history.replaceState(null, '', q ? 'search.html?q=' + encodeURIComponent(q) : 'search.html');
    if (!ws.length) {
      list.innerHTML = ''; status.textContent = ''; return;
    }

    var hits = [];
    INDEX.forEach(function (e) {
      var score = 0;
      for (var i = 0; i < ws.length; i++) {
        var inTitle = count(e.titleWords, ws[i]) > 0, inBody = count(e.bodyWords, ws[i]);
        if (!inTitle && !inBody) return;
        score += (inTitle ? 5 : 0) + (inBody ? Math.min(inBody, 5) : 0);
      }
      if (e.heading) score += 2;            /* prefer a section of real notes over a topic summary */
      hits.push({ e: e, score: score });
    });
    hits.sort(function (a, b) { return b.score - a.score || a.e.num - b.e.num; });

    status.textContent = hits.length ? hits.length + (hits.length === 1 ? ' result' : ' results') + ' for “' + q + '”' : 'Nothing for “' + q + '”. Try a shorter or different word.';
    active = -1;
    list.innerHTML = hits.slice(0, 40).map(function (h) {
      var e = h.e;
      return '<li><a href="' + esc(e.url) + '"><b>' + esc(e.heading || e.module) + '</b>' +
        '<span class="where">' + (e.heading ? 'in ' + esc(e.module) : e.live ? 'Topic overview' : 'On the roadmap, not written yet') + '</span>' +
        '<p>' + snippet(e.text, ws) + '</p></a></li>';
    }).join('');
  }

  /* up and down move through the results, Enter opens the chosen one */
  var active = -1;
  function pick(i) {
    var links = list.querySelectorAll('a');
    if (!links.length) return;
    if (active >= 0) links[active].classList.remove('active');
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
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 120); });
  input.form.addEventListener('submit', function (e) { e.preventDefault(); run(); });

  fetch('search-index.json')
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      data.forEach(function (e) { e.titleWords = tokens(e.module + ' ' + (e.heading || '')); e.bodyWords = tokens(e.text); });
      INDEX = data; run();
    })
    .catch(function () { status.textContent = 'The search index could not be loaded. Refresh the page to try again.'; });
})();
