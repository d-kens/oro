/* Lesson progress, kept only in this browser (localStorage), with no account: the "Mark as done" button at the end of a
   lesson, the "Done" marks on a skill's topics and projects, the "6 of 20 done" counts, and "Continue with" on a skill page.
   If storage is blocked, nothing shows. */
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

  /* on a skill page, once something is done, the start link points at the first lesson not done yet */
  var go = document.querySelector('[data-continue]');
  if (go) {
    var rows = Array.prototype.slice.call(document.querySelectorAll('[data-lesson-row]'));
    var todo = rows.filter(function (r) { return !r.classList.contains('done'); });
    if (todo.length && todo.length < rows.length) {
      var a = todo[0].querySelector('a');
      go.href = a.href;
      go.textContent = 'Continue with ' + (todo[0].querySelector('h3').textContent);
    } else if (!todo.length && rows.length) {
      go.textContent = 'All done. Start again with ' + rows[0].querySelector('h3').textContent;
    }
  }
  each('[data-count-of]', function (el) {
    var urls = el.getAttribute('data-count-of').split(' '), n = urls.filter(has).length;
    if (n) { el.textContent = n + ' of ' + urls.length + ' done'; el.hidden = false; }
  });
})();
