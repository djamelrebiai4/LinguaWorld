(function () {
  'use strict';

  const brandName = 'LinguaWorld';
  const homeHeadline = 'A world of language, waiting to be explored.';
  const logoPath = '/Images/LinguaWorld.svg';

  function applyBrand() {
    if (document.title !== `${brandName} | Learn through discovery`) {
      document.title = `${brandName} | Learn through discovery`;
    }

    const description = 'Explore languages through interactive worlds, useful vocabulary, and playful practice.';
    document.querySelectorAll('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]').forEach((meta) => {
      if (meta.content !== description) meta.content = description;
    });

    document.querySelectorAll('meta[property="og:title"], meta[name="twitter:title"]').forEach((meta) => {
      if (meta.content !== `${brandName} | Learn through discovery`) {
        meta.content = `${brandName} | Learn through discovery`;
      }
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
        if (data.name !== brandName) {
          data.name = brandName;
          structuredData.textContent = JSON.stringify(data);
        }
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        console.error('Could not update LinguaWorld structured data.', error);
      }
    }

    const root = document.getElementById('root');
    if (root && root.childElementCount === 0 && root.textContent.includes('Lexi Explorer')) {
      root.textContent = 'Explore languages through interactive worlds and playful practice with LinguaWorld.';
    }
  }

  applyBrand();
  new MutationObserver(applyBrand).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
