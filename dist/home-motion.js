'use strict';

(() => {
  const video = document.querySelector('.hero-bg video');
  const button = document.querySelector('.hero-video-toggle');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  // Select once per page, before giving the browser a URL it can download.
  const format = matchMedia('(width < 600px)').matches ? 'phone'
    : matchMedia('(width < 1280px)').matches ? 'tablet' : 'desktop';
  const source = new URL('videos/hero-' + format + '.mp4', document.currentScript.src);

  function updateButton(playing) {
    button.classList.toggle('is-playing', playing);
    button.setAttribute('aria-label', siteLocale.t(playing ? 'Pause background video' : 'Play background video'));
  }

  function playVideo() {
    if (!video.hasAttribute('src')) video.src = source.href;
    video.play().catch(() => updateButton(false));
  }

  video.muted = true;
  video.addEventListener('playing', () => {
    video.classList.add('has-frame');
    updateButton(true);
  });
  video.addEventListener('pause', () => updateButton(false));
  video.addEventListener('error', () => {
    video.classList.remove('has-frame');
    button.hidden = true;
  });
  button.addEventListener('click', () => {
    if (video.paused) playVideo();
    else video.pause();
  });
  reducedMotion.addEventListener('change', (event) => {
    if (event.matches) video.pause();
  });
  updateButton(false);
  button.hidden = false;
  if (!reducedMotion.matches && !navigator.connection?.saveData) playVideo();
})();

(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (siteLocale.switchedLanguage || reducedMotion.matches || !('IntersectionObserver' in window)) return;

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
    '.s-who .s-photo',
    '.s-who .s-whog > div:last-child > *',
    '.s-proj .hdr-va > *',
    '.s-proj article',
    '.s-expect h2',
    '.s-expect .wrap > div > div',
    '.s-buy .wrap > div',
    '.s-buy .stp',
    '.s-jv .wrap > div > div:first-child',
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

  const stats = document.querySelector('.s-stats .wrap');
  const statsObserver = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    statsObserver.disconnect();
    if (reducedMotion.matches) return;

    stats.querySelectorAll('.stn2').forEach((number, index) => {
      const finalText = number.textContent.trim();
      const finalValue = siteLocale.parseNumber(finalText);
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
        const progress = Math.max(0, Math.min(1, (now - start) / 3000));
        const easedProgress = (1 - Math.cos(Math.PI * progress)) / 2;
        visual.textContent = siteLocale.number(Math.round(finalValue * easedProgress));
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
