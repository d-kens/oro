/* Lesson progress, kept only in this browser (localStorage), with no account: the "Mark as done" button at the end of a
   lesson, the "Done" marks on a skill's topic list, and the "6 of 20 done" counts. If storage is blocked, nothing shows. */
(function () {
  var KEY = 'oro-done';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return null; } }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* nothing to do */ } }
  var done = load();
  if (!done) return;
  function has(url) { return done.indexOf(url) >= 0; }
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  var btn = document.querySelector('.mark-done');
  if (btn) {
    var url = btn.getAttribute('data-lesson');
    var paint = function () {
      var on = has(url);
      btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? 'Done' : 'Mark as done';
      btn.title = on ? 'Click to mark as not done' : '';
    };
    btn.hidden = false;
    paint();
    btn.addEventListener('click', function () {
      done = load() || [];
      if (has(url)) done.splice(done.indexOf(url), 1); else done.push(url);
      save(done);
      paint();
    });
  }

  each('[data-lesson-row]', function (li) { if (has(li.getAttribute('data-lesson-row'))) li.classList.add('done'); });
  each('[data-count-of]', function (el) {
    var urls = el.getAttribute('data-count-of').split(' '), n = urls.filter(has).length;
    if (n) { el.textContent = n + ' of ' + urls.length + ' done'; el.hidden = false; }
  });
})();
