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
