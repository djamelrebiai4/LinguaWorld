(function () {
  'use strict';

  document.addEventListener('click', (event) => {
    const card = event.target instanceof Element
      ? event.target.closest('.ls-level-card')
      : null;
    if (!card || (window.location.pathname !== '/' && !window.location.pathname.endsWith('/index.html'))) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign('/levels/city');
  }, true);
})();
