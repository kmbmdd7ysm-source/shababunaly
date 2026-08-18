/* Runs before React so the saved Arabic direction is correct from first paint. */
(() => {
  try {
    const language = localStorage.getItem('shababuna-language') === 'ar' ? 'ar' : 'en';
    const root = document.documentElement;
    root.lang = language;
    root.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.addEventListener('DOMContentLoaded', () => {
      const skip = document.getElementById('skip-link');
      if (skip) skip.textContent = language === 'ar' ? 'تخطَّ إلى المحتوى' : 'Skip to content';
    }, { once: true });
  } catch {
    // Storage can be unavailable in hardened/private contexts; English is the document default.
  }
})();
