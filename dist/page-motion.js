'use strict';

(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (siteLocale.switchedLanguage || reducedMotion.matches || !('IntersectionObserver' in window)) return;

  const easing = 'cubic-bezier(.22, 1, .36, 1)';
  const pending = new Set();
  const animations = new Map();
  const finishCounters = [];
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) reveal(entry.target);
    }
  }, { rootMargin: '0px 0px -28px 0px', threshold: .08 });

  function reveal(element, immediate = false) {
    observer.unobserve(element);
    if (immediate) animations.get(element)?.cancel();
    if (!pending.delete(element)) return;
    element.classList.remove('page-reveal-pending');
    if (immediate || reducedMotion.matches || !element.animate) return;

    const start = { opacity: 0 };
    const end = { opacity: 1 };
    if (element.dataset.pageReveal === 'rise') {
      start.transform = 'translateY(24px)';
      end.transform = 'translateY(0)';
    }
    const animation = element.animate([start, end], {
      duration: 800,
      delay: Number(element.dataset.pageDelay),
      easing,
      fill: 'backwards',
    });
    animations.set(element, animation);
    animation.finished.then(() => animation.cancel()).catch(() => {}).finally(() => {
      animations.delete(element);
    });
  }

  const hero = document.querySelector('main > section:first-of-type');
  const intro = hero.querySelector('.sp-hero-t, .bg-hero-t, .jv-hero-t, .cr-t, .pg-hero-t, .pj-hero-t')
    || hero.querySelector('.ab-h1').parentElement;
  Array.from(intro.children).forEach((element, index) => {
    element.classList.add('page-intro');
    element.style.setProperty('--page-delay', Math.min(index * 100, 300) + 'ms');
  });

  const groups = [
    ['main h2', 'rise'],
    ['.ab-who-p, .sp-p-l, .jv-p, .bg-p', 'rise'],
    ['.ab-icard, .ab-vc, .ab-hp', 'rise'],
    ['.jv-step, .bg-step', 'rise'],
    ['.jv-card, .bg-card, .bg-ic, .jv-hp', 'rise'],
    ['.sp-fi, .sp-hp', 'rise'],
    ['.sp-gal > .g', 'fade'],
    ['.dt-row', 'rise'],
    ['.ct-split > div:first-child > :not(h2)', 'rise'],
    ['.s-cta .wrap > div', 'rise'],
  ];
  for (const [selector, kind] of groups) {
    document.querySelectorAll(selector).forEach((element, index) => {
      element.dataset.pageReveal = kind;
      element.dataset.pageDelay = Math.min(index * 75, 225);
    });
  }
  // Animate a single container when a selected group contains its own heading.
  document.querySelectorAll('[data-page-reveal]').forEach((element) => {
    if (element.parentElement.closest('[data-page-reveal]')) {
      element.removeAttribute('data-page-reveal');
      element.removeAttribute('data-page-delay');
      return;
    }
    element.classList.add('page-reveal-pending');
    pending.add(element);
    observer.observe(element);
  });

  document.addEventListener('focusin', (event) => {
    const target = event.target.closest('[data-page-reveal]');
    if (target) reveal(target, true);
  });

  const counterObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      counterObserver.unobserve(entry.target);
      if (reducedMotion.matches) continue;

      const number = entry.target;
      const finalText = number.textContent.trim();
      const finalValue = siteLocale.parseNumber(finalText);
      const label = document.createElement('span');
      const visual = document.createElement('span');
      label.className = 'page-counter-label';
      label.textContent = finalText;
      visual.setAttribute('aria-hidden', 'true');
      number.style.minWidth = number.getBoundingClientRect().width + 'px';
      number.replaceChildren(label, visual);
      let frame;
      const finish = () => {
        cancelAnimationFrame(frame);
        visual.textContent = finalText;
      };
      finishCounters.push(finish);
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - start) / 3000);
        const easedProgress = (1 - Math.cos(Math.PI * progress)) / 2;
        visual.textContent = siteLocale.number(Math.round(finalValue * easedProgress));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }
  }, { threshold: .2 });
  document.querySelectorAll('.ab-statrow .stn2').forEach((number) => counterObserver.observe(number));

  const finishMotion = () => {
    observer.disconnect();
    counterObserver.disconnect();
    for (const element of pending) reveal(element, true);
    for (const animation of animations.values()) animation.cancel();
    finishCounters.forEach((finish) => finish());
  };
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) finishMotion();
  });
  window.addEventListener('beforeprint', finishMotion);
})();
