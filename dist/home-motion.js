'use strict';

(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;

  const easing = 'cubic-bezier(.22, 1, .36, 1)';
  const animations = new Set();
  const pending = new Set();
  const counterFrames = new Set();
  const finishCounters = [];
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      reveal(entry.target);
    }
  }, { rootMargin: '0px 0px -28px 0px', threshold: .08 });

  function animate(element, keyframes, options) {
    if (reducedMotion.matches || !element.animate) return;
    const animation = element.animate(keyframes, options);
    animations.add(animation);
    // Restore the underlying styles after completion, including hover effects.
    animation.finished.then(() => animation.cancel()).catch(() => {}).finally(() => {
      animations.delete(animation);
    });
  }

  function reveal(element, immediate = false) {
    observer.unobserve(element);
    if (!pending.delete(element)) return;
    element.classList.remove('home-reveal-pending');
    if (immediate) return;
    animate(element, [
      { opacity: 0, transform: 'translateY(30px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], {
      duration: 900,
      delay: Number(element.dataset.revealDelay),
      easing,
      fill: 'backwards',
    });
  }

  const groups = [
    '.s-stats .stx',
    '.s-who .s-photo',
    '.s-who .s-whog > div:last-child > *',
    '.s-proj .hdr-va > *',
    '.s-proj article',
    '.s-expect h2',
    '.s-expect .wrap > div > div',
    '.s-cust .wrap > div:first-child, .s-cust .cust-track',
    '.s-buy .wrap > div',
    '.s-buy .stp',
    '.s-jv .wrap > div',
    '.s-cta .wrap > div',
  ];
  for (const selector of groups) {
    document.querySelectorAll(selector).forEach((element, index) => {
      element.dataset.revealDelay = Math.min(index * 90, 270);
      element.classList.add('home-reveal-pending');
      pending.add(element);
      observer.observe(element);
    });
  }

  // Keyboard navigation and in-page links always expose their target immediately.
  document.addEventListener('focusin', (event) => {
    const section = event.target.closest('.home-reveal-pending');
    if (section) reveal(section, true);
  });
  window.addEventListener('beforeprint', () => {
    for (const element of pending) reveal(element, true);
    for (const animation of animations) animation.cancel();
    finishCounters.forEach((finish) => finish());
  });

  const heroImage = document.querySelector('.hero-bg img');
  const animateHero = () => {
    if (!heroImage.naturalWidth) return;
    animate(heroImage, [
      { transform: 'scale(1.055)' },
      { transform: 'scale(1)' },
    ], { duration: 2200, easing, fill: 'backwards' });
  };
  if (heroImage.complete) animateHero();
  else heroImage.addEventListener('load', animateHero, { once: true });

  const stats = document.querySelector('.s-stats .wrap');
  const statsObserver = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    statsObserver.disconnect();
    if (reducedMotion.matches) return;

    stats.querySelectorAll('.stn2').forEach((number, index) => {
      const finalText = number.textContent;
      const finalValue = Number(finalText);
      const label = document.createElement('span');
      const visual = document.createElement('span');
      label.className = 'home-counter-label';
      label.textContent = finalText;
      visual.setAttribute('aria-hidden', 'true');
      number.style.minWidth = number.getBoundingClientRect().width + 'px';
      number.replaceChildren(label, visual);
      let frame;
      const finish = () => {
        cancelAnimationFrame(frame);
        counterFrames.delete(frame);
        visual.textContent = finalText;
      };
      finishCounters.push(finish);
      const start = performance.now() + index * 90;
      const tick = (now) => {
        counterFrames.delete(frame);
        const progress = Math.max(0, Math.min(1, (now - start) / 1500));
        visual.textContent = Math.round(finalValue * (1 - (1 - progress) ** 3));
        if (progress === 1) return;
        frame = requestAnimationFrame(tick);
        counterFrames.add(frame);
      };
      frame = requestAnimationFrame(tick);
      counterFrames.add(frame);
    });
  }, { threshold: .2 });
  statsObserver.observe(stats);

  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return;
    observer.disconnect();
    statsObserver.disconnect();
    for (const element of pending) reveal(element, true);
    for (const animation of animations) animation.cancel();
    counterFrames.forEach(cancelAnimationFrame);
    counterFrames.clear();
    finishCounters.forEach((finish) => finish());
  });
})();
