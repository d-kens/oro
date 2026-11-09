/* Lesson progress, kept only in this browser (localStorage), with no account: the "Mark as done" button at the end of a
   lesson, the "Done" marks on a skill's topics and projects, the "6 of 20 done" counts, "Continue with" on a skill page,
   and the reader's place, which turns the home page's Start learning into "Continue with". If storage is blocked, nothing shows. */
(function () {
  var KEY = 'oro-done', PLACE = 'oro-last';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return null; } }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* nothing to do */ } }
  /* the place is { url, section, finished }: the lesson last opened, the h2 being read, and whether its end was reached */
  function loadPlace() { try { return JSON.parse(localStorage.getItem(PLACE)); } catch (e) { return null; } }
  function savePlace(p) { try { localStorage.setItem(PLACE, JSON.stringify(p)); } catch (e) { /* nothing to do */ } }
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
      if (has(url)) { done.splice(done.indexOf(url), 1); place.finished = false; savePlace(place); } else done.push(url);
      save(done);
      paint();
    });

    /* opening a lesson makes it the reader's place; coming back to the same lesson keeps the section and whether it was finished */
    var saved = loadPlace();
    var place = saved && saved.url === url ? saved : { url: url, section: null, finished: false };
    savePlace(place);
    window.addEventListener('pageshow', function (e) { if (e.persisted) savePlace(place); });

    /* the section is the last h2 above a line a third of the way down the screen, as in lesson.js; the store is only written when something changes */
    var article = document.querySelector('.md'), heads = article.querySelectorAll('h2[id]'), queued = false;
    var track = function () {
      queued = false;
      var section = null;
      Array.prototype.forEach.call(heads, function (h) { if (h.getBoundingClientRect().top < window.innerHeight / 3) section = h.id; });
      var finished = place.finished || (window.scrollY > 0 && article.getBoundingClientRect().bottom <= window.innerHeight);
      if (section === place.section && finished === place.finished) return;
      place.section = section; place.finished = finished;
      savePlace(place);
    };
    window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(track); } }, { passive: true });
  }

  /* on the home page: the reader's lesson, or the next one not done if they finished it. data-resume is every lesson in roadmap order */
  var resume = document.querySelector('[data-resume]');
  if (resume) {
    var order = JSON.parse(resume.getAttribute('data-resume')), base = resume.getAttribute('data-base');
    var startHref = resume.getAttribute('href'), startText = resume.textContent;
    var paintResume = function () {
      var p = loadPlace(), list = load() || [], i = -1;
      order.forEach(function (l, n) { if (p && l[0] === p.url) i = n; });
      resume.setAttribute('href', startHref);
      resume.textContent = startText;
      if (i < 0) return;
      var from = i;
      if (p.finished || list.indexOf(p.url) >= 0) i++;
      while (i < order.length && list.indexOf(order[i][0]) >= 0) i++;
      if (i >= order.length) return;
      resume.setAttribute('href', base + order[i][0] + (i === from && p.section ? '#' + p.section : ''));
      resume.textContent = 'Continue with ' + order[i][1];
    };
    paintResume();
    /* the Back button can bring this page back from memory, without running this script again */
    window.addEventListener('pageshow', function (e) { if (e.persisted) paintResume(); });
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
