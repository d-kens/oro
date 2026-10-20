/* Phone menu: the button under 560px wide opens the nav links as a full-screen panel.
   Escape closes it, and so does widening the window past the phone layout. */
(function () {
  var nav = document.querySelector('.wrap > nav'), btn = nav && nav.querySelector('.menu-btn');
  if (!btn) return;
  var phone = window.matchMedia('(max-width: 560px)');
  function set(open) {
    if (open) nav.style.setProperty('--nav-h', nav.getBoundingClientRect().bottom + 'px');
    nav.classList.toggle('open', open);
    document.documentElement.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  btn.addEventListener('click', function () { set(!nav.classList.contains('open')); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) { set(false); btn.focus(); }
  });
  phone.addEventListener('change', function () { if (!phone.matches) set(false); });

  /* "/" opens search from any page, or jumps to the box on the search page, unless you are typing somewhere */
  var search = nav.querySelector('[aria-keyshortcuts="/"]');
  document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || !search) return;
    var t = e.target;
    if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    e.preventDefault();
    var box = document.getElementById('q');
    if (box) box.focus(); else location.href = search.href;
  });
})();
