/* Notes pages are rendered by Astro at build time. This adds a Copy button to each code block, folds the contents
   list on phones so the reading starts on the first screen, marks the section being read in the contents list,
   and fills the thin progress line at the top as you scroll. */
(function () {
  var toc = document.querySelector('.toc details');
  if (toc && window.matchMedia('(max-width: 700px)').matches) toc.removeAttribute('open');
  /* beside the notes the list is always shown, so keep it open whatever was clicked */
  var wide = window.matchMedia('(min-width: 1100px)');
  if (toc) {
    var keepOpen = function () { if (wide.matches) toc.setAttribute('open', ''); };
    keepOpen(); wide.addEventListener('change', keepOpen); toc.addEventListener('toggle', keepOpen);
  }

  Array.prototype.forEach.call(document.querySelectorAll('.md pre'), function (pre) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'copy'; b.textContent = 'Copy';
    pre.appendChild(b);
  });

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.copy'); if (!b) return;
    var text = b.parentNode.querySelector('code').textContent;
    var done = function (msg) { b.textContent = msg; setTimeout(function () { b.textContent = 'Copy'; }, 1400); };
    try { navigator.clipboard.writeText(text).then(function () { done('Copied'); }, function () { done('Press Ctrl+C'); }); } catch (err) { done('Press Ctrl+C'); }
  });

  /* the section being read is the last h2 whose top has scrolled past a line a third of the way down the screen */
  var links = toc ? Array.prototype.slice.call(toc.querySelectorAll('a')) : [];
  var heads = links.map(function (a) { return document.getElementById(decodeURIComponent(a.hash.slice(1))); });
  var article = document.querySelector('.md'), line = document.querySelector('.progress-line');
  var current = null, queued = false;

  function update() {
    queued = false;
    if (article && line) {
      var box = article.getBoundingClientRect(), total = box.height - window.innerHeight;
      line.style.setProperty('--read', total > 0 ? Math.min(1, Math.max(0, -box.top / total)) : 1);
    }
    var at = -1;
    heads.forEach(function (h, i) { if (h && h.getBoundingClientRect().top < window.innerHeight / 3) at = i; });
    var next = links[at] || null;
    if (next === current) return;
    if (current) current.removeAttribute('aria-current');
    if (next) next.setAttribute('aria-current', 'location');
    current = next;
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  update();
})();
