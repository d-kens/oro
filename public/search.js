(function () {
  var input = document.getElementById('q'), status = document.getElementById('status'), list = document.getElementById('results');
  input.value = new URLSearchParams(location.search).get('q') || '';
  input.focus();

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* built by src/pages/search-index.json.js: one entry per topic, plus one per section of its published notes */
  var INDEX = null;

  /* ---------- search ---------- */
  function words(q) { return q.toLowerCase().split(/\s+/).filter(Boolean); }

  function snippet(text, ws) {
    var clean = text.replace(/\s+/g, ' ').trim(), lower = clean.toLowerCase(), at = -1;
    ws.forEach(function (w) { var i = lower.indexOf(w); if (i >= 0 && (at < 0 || i < at)) at = i; });
    var start = Math.max(0, at - 70), end = Math.min(clean.length, (at < 0 ? 0 : at) + 150);
    /* match every word in one pass on the raw text, then escape each piece, so a match never lands inside markup */
    var re = new RegExp('(' + ws.slice().sort(function (a, b) { return b.length - a.length; })
      .map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'gi');
    var out = clean.slice(start, end).split(re).map(function (part, i) { return i % 2 ? '<mark>' + esc(part) + '</mark>' : esc(part); }).join('');
    return (start > 0 ? '…' : '') + out + (end < clean.length ? '…' : '');
  }

  function run() {
    if (!INDEX) return;
    var q = input.value.trim(), ws = words(q);
    history.replaceState(null, '', q ? 'search.html?q=' + encodeURIComponent(q) : 'search.html');
    if (!ws.length) {
      var sections = INDEX.filter(function (e) { return e.heading; }).length;
      list.innerHTML = ''; status.textContent = 'Search ' + sections + ' note sections and ' + (INDEX.length - sections) + ' topics.'; return;
    }

    var hits = [];
    INDEX.forEach(function (e) {
      var title = (e.module + ' ' + (e.heading || '')).toLowerCase(), body = e.text.toLowerCase(), score = 0;
      for (var i = 0; i < ws.length; i++) {
        var inTitle = title.indexOf(ws[i]) >= 0, inBody = body.indexOf(ws[i]) >= 0;
        if (!inTitle && !inBody) return;
        score += (inTitle ? 5 : 0) + (inBody ? 1 + Math.min(body.split(ws[i]).length - 2, 4) : 0);
      }
      if (e.heading) score += 2;            /* prefer a section of real notes over a topic summary */
      hits.push({ e: e, score: score });
    });
    hits.sort(function (a, b) { return b.score - a.score || a.e.num - b.e.num; });

    status.textContent = hits.length ? hits.length + (hits.length === 1 ? ' result' : ' results') : 'No results. Try a shorter or different word.';
    list.innerHTML = hits.slice(0, 40).map(function (h) {
      var e = h.e;
      return '<li><a href="' + esc(e.url) + '"><span class="mono">' + esc(e.module) + (e.heading ? '' : ' · ' + (e.live ? 'Overview' : 'Not written yet')) + '</span>' +
        '<b>' + esc(e.heading || e.module) + '</b><p>' + snippet(e.text, ws) + '</p></a></li>';
    }).join('');
  }

  var timer;
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 120); });
  input.form.addEventListener('submit', function (e) { e.preventDefault(); run(); });

  fetch('search-index.json')
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) { INDEX = data; run(); })
    .catch(function () { status.textContent = 'The search index could not be loaded. Refresh the page to try again.'; });
})();
