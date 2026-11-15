(function () {
  'use strict';

  const brandName = 'LinguaWorld';
  const logoPath = '/Images/LinguaWorld.svg';

  function applyBrand() {
    const language = localStorage.getItem('lw_support_language') === 'en' ? 'en' : 'ar';
    const pageTitle = `${brandName} | Learn German`;
    const description = language === 'en'
      ? 'Learn German through interactive worlds, vocabulary, pronunciation, and games. Choose Arabic or English explanations.'
      : 'تعلّم الألمانية عبر عوالم تفاعلية ومفردات ونطق وألعاب. اختر الشرح بالعربية أو الإنجليزية.';
    const homeHeadline = language === 'en'
      ? 'Learn German, one word at a time.'
      : 'تعلّم الألمانية، كلمةً بعد كلمة.';

    if (document.title !== pageTitle) document.title = pageTitle;

    document.querySelectorAll('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]').forEach((meta) => {
      if (meta.content !== description) meta.content = description;
    });

    document.querySelectorAll('meta[property="og:title"], meta[name="twitter:title"]').forEach((meta) => {
      if (meta.content !== pageTitle) meta.content = pageTitle;
    });

    document.querySelectorAll('.ls-logo').forEach((logo) => {
      if (logo.getAttribute('src') !== logoPath) logo.setAttribute('src', logoPath);
      if (logo.alt !== `${brandName} language learning`) {
        logo.alt = `${brandName} language learning`;
      }
      logo.width = 240;
      logo.height = 64;
    });

    const headline = document.querySelector('.ls-title');
    if (headline && headline.textContent !== homeHeadline) {
      headline.textContent = homeHeadline;
    }
    if (headline) {
      headline.lang = language;
      headline.dir = language === 'ar' ? 'rtl' : 'ltr';
    }

    document.querySelectorAll('link[rel~="icon"]').forEach((icon) => {
      if (icon.getAttribute('href') !== logoPath) icon.setAttribute('href', logoPath);
      icon.type = 'image/svg+xml';
    });

    const siteName = document.querySelector('meta[property="og:site_name"]');
    if (siteName && siteName.content !== brandName) siteName.content = brandName;

    const structuredData = document.querySelector('script[type="application/ld+json"]');
    if (structuredData) {
      try {
        const data = JSON.parse(structuredData.textContent);
        if (
          data.name !== brandName ||
          data.description !== description ||
          !Array.isArray(data.inLanguage) ||
          data.inLanguage.join(',') !== 'de,ar,en'
        ) {
          data.name = brandName;
          data.description = description;
          data.inLanguage = ['de', 'ar', 'en'];
          structuredData.textContent = JSON.stringify(data);
        }
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        console.error('Could not update LinguaWorld structured data.', error);
      }
    }

    const root = document.getElementById('root');
    if (root && root.childElementCount === 0 && root.textContent.includes('Lexi Explorer')) {
      root.textContent = language === 'en'
        ? 'Learn German through interactive worlds and playful practice with LinguaWorld.'
        : 'تعلّم الألمانية عبر عوالم تفاعلية وتدريبات ممتعة مع LinguaWorld.';
    }
  }

  applyBrand();
  window.addEventListener('linguaworld:language-change', applyBrand);
  new MutationObserver(applyBrand).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();

/* In-game HUD-only behavior; gameplay state and existing button handlers stay owned by their current modules. */
(function () {
  'use strict';

  function syncButtonLabel(button) {
    if (!button) return;
    const label = button.getAttribute('title') || button.getAttribute('aria-label');
    if (label && !button.hasAttribute('title')) button.title = label;
    if (label && button.getAttribute('aria-label') !== label) {
      button.setAttribute('aria-label', label);
    }
  }

  function updateXpProgress() {
    const value = document.getElementById('de-hud-xp-val');
    const fill = document.querySelector('.de-hud-xp-track i');
    if (!value || !fill) return;
    const xp = Number((value.textContent.match(/[\d,]+/) || ['0'])[0].replace(/,/g, '')) || 0;
    const thresholds = [0, 200, 500, 1000];
    const start = xp >= 1000 ? 1000 : xp >= 500 ? 500 : xp >= 200 ? 200 : 0;
    const end = xp >= 1000 ? 1000 : thresholds[thresholds.indexOf(start) + 1];
    const progress = xp >= 1000 ? 100 : Math.max(0, Math.min(100, ((xp - start) / (end - start)) * 100));
    fill.style.width = `${progress}%`;
  }

  function syncHud() {
    const controls = [
      document.querySelector('.home-button'),
      document.querySelector('.pause-btn'),
      document.querySelector('.mute-button'),
      document.querySelector('.tutorial-toggle-btn'),
      document.querySelector('.switch-button'),
      document.querySelector('.de-world-npc-beacon'),
      ...document.querySelectorAll('.de-hud-btn'),
      ...document.querySelectorAll('.lw-settings-toggle, .lw-city-map-action, .lw-city-map-toggle')
    ];
    controls.forEach(syncButtonLabel);

    const interact = document.querySelector('.switch-button');
    if (interact && !interact.hasAttribute('title')) {
      interact.title = 'Interact';
      interact.setAttribute('aria-label', 'Interact');
    }

    const dialogue = document.getElementById('de-world-dialogue-btn');
    if (dialogue && !dialogue.hasAttribute('title')) dialogue.title = dialogue.getAttribute('aria-label') || 'Talk with an NPC';
    updateXpProgress();
  }

  function closeHudPopovers() {
    const settings = document.querySelector('.lw-hud-settings');
    const popover = settings?.querySelector('.lw-settings-popover');
    const toggle = settings?.querySelector('.lw-settings-toggle');
    if (popover) popover.hidden = true;
    settings?.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded', 'false');

    const map = document.querySelector('.lw-city-map.is-enlarged');
    if (map) {
      map.classList.remove('is-enlarged');
      document.body.classList.remove('map-overlay-open');
      map.querySelector('.lw-city-map-enlarge-toggle')?.setAttribute('aria-pressed', 'false');
    }
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeHudPopovers();
      return;
    }
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || document.body.classList.contains('chat-open')) return;
    if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;

    const key = event.key.toLowerCase();
    const targets = {
      h: '.tutorial-toggle-btn',
      m: '.lw-city-map-toggle',
      p: '.pause-btn'
    };
    const target = targets[key] && document.querySelector(targets[key]);
    if (!target) return;
    event.preventDefault();
    target.click();
  });

  const scheduleSync = () => window.requestAnimationFrame(syncHud);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleSync, { once: true });
  } else {
    scheduleSync();
  }

  const hudObserver = new MutationObserver(scheduleSync);
  hudObserver.observe(document.documentElement, { childList: true, subtree: true });
  const titleObserver = new MutationObserver(scheduleSync);
  titleObserver.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['title'] });
})();
