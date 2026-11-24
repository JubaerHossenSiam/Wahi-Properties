'use strict';

window.siteLocale = (() => {
  const bangla = document.documentElement.lang === 'bn';
  let switchedLanguage = false;
  try {
    const navigation = JSON.parse(sessionStorage.getItem('wahi-language-navigation') || 'null');
    switchedLanguage = navigation?.target === location.pathname + location.search
      && Date.now() - navigation.createdAt < 15000;
    sessionStorage.removeItem('wahi-language-navigation');
  } catch { /* Language links also work without session storage. */ }
  if (switchedLanguage) document.documentElement.classList.add('language-switching');
  const digits = '০১২৩৪৫৬৭৮৯';
  const formatter = new Intl.NumberFormat(bangla ? 'bn-BD' : 'en', { useGrouping: false });
  const strings = {
    'Zoom in': 'বড় করুন',
    'Zoom out': 'ছোট করুন',
    'Close': 'বন্ধ করুন',
    'Enlarge image': 'ছবি বড় করে দেখুন',
    'Show more photos': 'আরও ছবি দেখুন',
    'Expand plan': 'ফ্লোর প্ল্যান বড় করে দেখুন',
  };

  document.querySelectorAll('[data-language]').forEach((link) => {
    const target = new URL(link.href);
    target.search = location.search;
    target.hash = location.hash;
    link.href = target.href;
    link.addEventListener('click', (event) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (link.dataset.language === document.documentElement.lang) {
        event.preventDefault();
        return;
      }
      document.documentElement.classList.add('language-switching');
      try {
        sessionStorage.setItem('wahi-language-navigation', JSON.stringify({
          target: target.pathname + target.search,
          createdAt: Date.now(),
        }));
        if (history.state?.wahiProjects) sessionStorage.setItem('wahi-language-projects', JSON.stringify({
          target: target.pathname + target.search,
          state: history.state.wahiProjects,
        }));
      } catch { /* Navigation still works when storage is unavailable. */ }
    });
  });

  try {
    const saved = JSON.parse(sessionStorage.getItem('wahi-language-projects') || 'null');
    if (saved?.target === location.pathname + location.search) {
      history.replaceState({ ...history.state, wahiProjects: saved.state }, '');
    }
    sessionStorage.removeItem('wahi-language-projects');
  } catch { /* Project filters can still be used without storage. */ }

  return {
    bangla,
    switchedLanguage,
    number: (value) => formatter.format(value),
    parseNumber: (value) => Number(String(value).replace(/[০-৯]/g, (digit) => digits.indexOf(digit)).replace(/,/g, '')),
    t: (value) => bangla ? strings[value] || value : value,
    results(shown, total) {
      if (!bangla) return shown + ' of ' + total + (total === 1 ? ' project' : ' projects');
      if (total === 0) return '০টি প্রকল্প পাওয়া গেছে';
      return formatter.format(total) + 'টি প্রকল্পের মধ্যে ' + formatter.format(shown) + 'টি দেখানো হচ্ছে';
    },
  };
})();
