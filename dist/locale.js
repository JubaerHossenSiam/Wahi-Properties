'use strict';

window.siteLocale = (() => {
  const bangla = document.documentElement.lang === 'bn';
  let switchedLanguage = false;
  let savedPosition;
  let savedHash;
  try {
    const navigation = JSON.parse(sessionStorage.getItem('wahi-language-navigation') || 'null');
    switchedLanguage = navigation?.target === location.pathname + location.search
      && Date.now() - navigation.createdAt < 15000;
    if (switchedLanguage) {
      savedPosition = navigation.position;
      savedHash = navigation.hash;
    }
    sessionStorage.removeItem('wahi-language-navigation');
  } catch { /* Language links also work without session storage. */ }
  if (switchedLanguage) document.documentElement.classList.add('language-switching');
  const digits = '০১২৩৪৫৬৭৮৯';
  const formatter = new Intl.NumberFormat(bangla ? 'bn-BD' : 'en', { useGrouping: false });
  const strings = {
    'Filters': 'ফিল্টার',
    'active': 'চালু',
    'Zoom in': 'বড় করুন',
    'Zoom out': 'ছোট করুন',
    'Previous photo': 'আগের ছবি',
    'Next photo': 'পরের ছবি',
    'Close': 'বন্ধ করুন',
    'Enlarge image': 'ছবি বড় করে দেখুন',
    'Show more photos': 'আরও ছবি দেখুন',
    'Expand plan': 'ফ্লোর প্ল্যান বড় করে দেখুন',
    'Play video': 'ভিডিও চালান',
  };

  const sections = () => [...document.querySelectorAll('main section, footer')];
  const headerHeight = () => document.querySelector('header.hd')?.getBoundingClientRect().height || 0;

  function capturePosition() {
    const y = window.scrollY;
    if (y < 1) return { y: 0 };
    const edge = headerHeight();
    const blocks = sections();
    const index = blocks.findIndex((block) => block.getBoundingClientRect().bottom > edge);
    if (index < 0) return { y };
    const section = blocks[index];
    const box = section.getBoundingClientRect();
    // Use relative section progress because Bangla and English wrap differently.
    return { y, index, progress: (edge - box.top) / box.height, anchor: section.id };
  }

  function restorePosition(position) {
    const section = (position.anchor && document.getElementById(position.anchor)) || sections()[position.index];
    const box = section?.getBoundingClientRect();
    const top = box && Number.isFinite(position.progress)
      ? window.scrollY + box.top + position.progress * box.height - headerHeight()
      : position.y;
    window.scrollTo({ top, behavior: 'instant' });
  }

  if (Number.isFinite(savedPosition?.y)) {
    let restored = false;
    const restore = () => {
      if (restored) return;
      restored = true;
      restorePosition(savedPosition);
      const url = new URL(location.href);
      url.hash = savedHash || '';
      if (url.href !== location.href) history.replaceState(history.state, '', url.href);
      document.documentElement.classList.remove('language-restoring');
    };
    // Restore before the new document is revealed, including before its view-transition snapshot.
    window.addEventListener('pagereveal', restore, { once: true });
    requestAnimationFrame(restore);
  }

  let switching = false;
  document.querySelectorAll('[data-language]').forEach((link) => {
    const target = new URL(link.href);
    target.search = location.search;
    target.hash = Number.isFinite(savedPosition?.y) ? savedHash || '' : location.hash;
    link.href = target.href;
    link.addEventListener('click', (event) => {
      if (event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (link.dataset.language === document.documentElement.lang) {
        event.preventDefault();
        return;
      }
      document.documentElement.classList.add('language-switching');
      switching = true;
      const position = capturePosition();
      let saved = false;
      try {
        sessionStorage.setItem('wahi-language-navigation', JSON.stringify({
          target: target.pathname + target.search,
          createdAt: Date.now(),
          position,
          hash: location.hash,
        }));
        saved = true;
        if (history.state?.wahiProjects) sessionStorage.setItem('wahi-language-projects', JSON.stringify({
          target: target.pathname + target.search,
          state: history.state.wahiProjects,
        }));
      } catch { /* Navigation still works when storage is unavailable. */ }
      // Use a fragment only when the browser cannot restore the exact reading position.
      const destination = new URL(target);
      destination.hash = saved ? '' : position.anchor || target.hash;
      link.href = destination.href;
    });
  });

  try {
    const saved = JSON.parse(sessionStorage.getItem('wahi-language-projects') || 'null');
    if (saved?.target === location.pathname + location.search) {
      history.replaceState({ ...history.state, wahiProjects: saved.state }, '');
    }
    sessionStorage.removeItem('wahi-language-projects');
  } catch { /* Project filters can still be used without storage. */ }

  const prefetchAlternate = () => {
    if (switching || navigator.connection?.saveData || document.visibilityState !== 'visible') return;
    const language = bangla ? 'en' : 'bn';
    const alternate = document.querySelector('link[rel="alternate"][hreflang="' + language + '"]');
    if (!alternate) return;
    const url = new URL(alternate.href);
    url.search = location.search;
    const hint = document.createElement('link');
    hint.rel = 'prefetch';
    hint.href = url.href;
    document.head.append(hint);
  };

  const schedulePrefetch = () => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(prefetchAlternate);
    else setTimeout(prefetchAlternate, 500);
  };
  if (document.readyState === 'complete') schedulePrefetch();
  else window.addEventListener('load', schedulePrefetch, { once: true });

  return {
    bangla,
    switchedLanguage,
    number: (value) => formatter.format(value),
    parseNumber: (value) => Number(String(value).replace(/[০-৯]/g, (digit) => digits.indexOf(digit)).replace(/,/g, '')),
    t: (value) => bangla ? strings[value] || value : value,
    results(shown, total) {
      if (!bangla) return shown + ' of ' + total + (total === 1 ? ' project' : ' projects');
      if (total === 0) return '০টি প্রকল্প পাওয়া গেছে';
      return formatter.format(total) + 'টির মধ্যে ' + formatter.format(shown) + 'টি প্রকল্প';
    },
  };
})();
