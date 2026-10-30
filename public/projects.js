/* Projects page: the skill buttons under the heading show one skill's projects at a time, the first skill to start with.
   The choice is kept in the address (?skill=linux), so a link or a refresh opens the same skill.
   Without JavaScript every skill shows, and a button only reloads the page. */
(function () {
  var chips = Array.prototype.slice.call(document.querySelectorAll('.jump a'));
  var groups = Array.prototype.slice.call(document.querySelectorAll('.proj-group'));
  if (!chips.length || !groups.length) return;

  function show(slug) {
    if (!groups.some(function (g) { return g.id === slug; })) slug = groups[0].id;
    groups.forEach(function (g) { g.hidden = g.id !== slug; });
    chips.forEach(function (a) {
      if (a.dataset.skill === slug) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }

  chips.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      history.replaceState(null, '', '?skill=' + a.dataset.skill);
      show(a.dataset.skill);
    });
  });
  show(new URLSearchParams(location.search).get('skill'));
})();
