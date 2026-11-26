'use strict';

const menuToggle = document.querySelector('.hd-tgl');
if (menuToggle) {
  const header = menuToggle.closest('header');
  const updateHeaderHeight = () => {
    document.documentElement.style.setProperty('--header-height', Math.ceil(header.getBoundingClientRect().height) + 'px');
  };
  updateHeaderHeight();
  new ResizeObserver(updateHeaderHeight).observe(header);
  const showMenu = (open) => {
    header.classList.toggle('hd-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
  };

  menuToggle.addEventListener('click', () => showMenu(!header.classList.contains('hd-open')));
  header.querySelector('.hd-nav').addEventListener('click', (event) => {
    if (event.target.closest('a')) showMenu(false);
  });
  document.addEventListener('click', (event) => {
    if (header.classList.contains('hd-open') && !header.contains(event.target)) showMenu(false);
  });
  window.addEventListener('resize', () => {
    if (!header.classList.contains('hd-open')) return;
    showMenu(matchMedia('(max-width: 1099px)').matches);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('hd-open')) {
      showMenu(false);
      menuToggle.focus();
    }
  });
}

const reviewTrack = document.querySelector('.cust-track');
if (reviewTrack) {
  const section = reviewTrack.closest('.s-cust');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const cards = Array.from(reviewTrack.children);
  const cloneCard = (card) => {
    const clone = card.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    return clone;
  };
  // Copies on either side allow a one-card slide across both loop boundaries.
  reviewTrack.prepend(...cards.map(cloneCard));
  reviewTrack.append(...cards.map(cloneCard));
  let step = 0;
  let cycleWidth = 0;
  let timer;
  let settleTimer;
  let visible = !('IntersectionObserver' in window);
  let hovered = reviewTrack.matches(':hover');
  let focused = section.contains(document.activeElement);
  let interacting = false;

  function scheduleAutoplay() {
    clearTimeout(timer);
    if (!visible || hovered || focused || interacting || document.hidden || reducedMotion.matches) return;
    timer = setTimeout(() => moveReview(1), 4500);
  }

  function layoutReviews() {
    const current = step ? Math.round(reviewTrack.scrollLeft / step) - cards.length : 0;
    const index = ((current % cards.length) + cards.length) % cards.length;
    const gap = parseFloat(getComputedStyle(reviewTrack).columnGap) || 0;
    step = cards[0].getBoundingClientRect().width + gap;
    cycleWidth = step * cards.length;
    reviewTrack.scrollLeft = cycleWidth + index * step;
    scheduleAutoplay();
  }

  function moveReview(direction) {
    clearTimeout(timer);
    const target = (Math.round(reviewTrack.scrollLeft / step) + direction) * step;
    reviewTrack.scrollTo({
      left: target,
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
    });
  }

  reviewTrack.addEventListener('scroll', () => {
    clearTimeout(timer);
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      // Rebase onto the identical middle group after scrolling has stopped.
      if (reviewTrack.scrollLeft < cycleWidth - 1) reviewTrack.scrollLeft += cycleWidth;
      else if (reviewTrack.scrollLeft >= 2 * cycleWidth - 1) reviewTrack.scrollLeft -= cycleWidth;
      scheduleAutoplay();
    }, 160);
  }, { passive: true });

  document.querySelectorAll('.cbtn').forEach((button, index) => {
    button.addEventListener('click', () => moveReview(index === 0 ? -1 : 1));
  });
  reviewTrack.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'touch') return;
    hovered = true;
    scheduleAutoplay();
  });
  reviewTrack.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'touch') return;
    hovered = false;
    scheduleAutoplay();
  });
  section.addEventListener('focusin', () => {
    focused = true;
    scheduleAutoplay();
  });
  section.addEventListener('focusout', (event) => {
    focused = section.contains(event.relatedTarget);
    scheduleAutoplay();
  });
  reviewTrack.addEventListener('pointerdown', () => {
    interacting = true;
    scheduleAutoplay();
  });
  const endInteraction = () => {
    interacting = false;
    scheduleAutoplay();
  };
  window.addEventListener('pointerup', endInteraction);
  window.addEventListener('pointercancel', endInteraction);
  document.addEventListener('visibilitychange', scheduleAutoplay);
  reducedMotion.addEventListener('change', scheduleAutoplay);
  window.addEventListener('resize', layoutReviews);
  window.addEventListener('pageshow', scheduleAutoplay);
  window.addEventListener('pagehide', () => {
    clearTimeout(timer);
    clearTimeout(settleTimer);
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      scheduleAutoplay();
    }, { threshold: .2 }).observe(reviewTrack);
  }
  layoutReviews();
}

const projectGrid = document.querySelector('.pj-grid');
if (projectGrid) {
  const sidebar = document.querySelector('.pj-side');
  const filterPanel = sidebar.querySelector('.pj-panel');
  const filterToggle = sidebar.querySelector('.pj-fbtn');
  const filterBadge = sidebar.querySelector('.pj-fbadge');
  const search = sidebar.querySelector('input[type="search"]');
  const statusInputs = Array.from(sidebar.querySelectorAll('input[name="status"]'));
  const dropdowns = Array.from(document.querySelectorAll('.pj-dd'));
  const bedrooms = Array.from(sidebar.querySelectorAll('.pj-chip'));
  const cards = Array.from(projectGrid.querySelectorAll('.pj-card'));
  const resultCount = document.querySelector('.pj-res');
  const emptyState = document.querySelector('.pj-empty');
  const loadMoreContainer = document.querySelector('.pj-lm');
  const loadMoreButton = loadMoreContainer.querySelector('button');
  const pageSize = 6;
  let visibleLimit = pageSize;
  const sizeBands = [[0, 1200], [1201, 1500], [1501, 2000], [2001, Infinity]];
  const normalize = (value) => value.trim().toLowerCase().replace(/\s+/g, ' ');
  const urlValue = (value) => normalize(value).replace(/ /g, '-');

  const menus = dropdowns.map((dropdown) => {
    const options = Array.from(dropdown.querySelectorAll('.pj-opt'));
    const summary = dropdown.querySelector('summary');
    const label = summary.querySelector('.v');
    const menu = { options, index: 0 };

    dropdown.querySelector('.pj-menu').removeAttribute('role');
    const updateLabel = (option) => {
      const value = option.querySelector('.t').textContent;
      label.textContent = value;
      if (!summary.dataset.label) summary.dataset.label = summary.getAttribute('aria-label');
      summary.setAttribute('aria-label', summary.dataset.label + ', ' + value);
    };

    menu.select = (index) => {
      menu.index = index;
      options.forEach((option, position) => {
        const selected = position === index;
        option.classList.toggle('on', selected);
        option.setAttribute('aria-pressed', String(selected));
      });
      updateLabel(options[index]);
    };

    options.forEach((option, index) => {
      option.removeAttribute('role');
      option.removeAttribute('aria-selected');
      option.addEventListener('click', () => {
        menu.select(index);
        dropdown.open = false;
        summary.focus();
        resetProjects();
      });
    });

    dropdown.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !dropdown.open) return;
      event.stopPropagation();
      dropdown.open = false;
      summary.focus();
    });
    menu.select(0);
    return menu;
  });
  const [type, area, size, sort] = menus;

  function selectBedrooms(index) {
    bedrooms.forEach((chip, position) => {
      const selected = position === index;
      chip.classList.toggle('on', selected);
      chip.setAttribute('aria-pressed', String(selected));
    });
  }

  function showFilters(open) {
    sidebar.classList.toggle('pj-fo', open);
    filterToggle.setAttribute('aria-expanded', String(open));
    if (open) filterPanel.querySelector('.pj-x').focus();
    else {
      filterPanel.querySelectorAll('details[open]').forEach((item) => { item.open = false; });
      filterToggle.focus();
    }
  }

  function menuValue(menu) {
    return menu.index ? menu.options[menu.index].dataset.value || menu.options[menu.index].querySelector('.t').textContent : '';
  }

  function resetProjects() {
    visibleLimit = pageSize;
    renderProjects();
  }

  function renderProjects() {
    const tokens = normalize(search.value).split(' ').filter(Boolean);
    const statusIndex = statusInputs.findIndex((input) => input.checked);
    const status = statusIndex > 0 ? ['', 'Completed', 'Ongoing', 'Upcoming'][statusIndex] : '';
    const selectedBedroom = bedrooms.find((chip) => chip.classList.contains('on'));
    const bedroom = selectedBedroom.dataset.value || selectedBedroom.textContent.trim();
    const selectedArea = menuValue(area);
    const selectedType = menuValue(type);
    const sizeBand = sizeBands[size.index - 1];
    let count = 0;

    for (const card of cards) {
      const name = card.querySelector('.pj').textContent;
      const location = card.querySelector('.loc span').textContent;
      const searchable = normalize(name + ' ' + location + ' ' + (card.dataset.name || '') + ' ' + (card.dataset.location || '') + ' ' + (card.dataset.search || ''));
      const matchesSize = !sizeBand || (card.dataset.sizes || '').split(',').some((size) => (
        size && Number(size) >= sizeBand[0] && Number(size) <= sizeBand[1]
      ));
      const matches = tokens.every((token) => searchable.includes(token))
        && (!status || card.dataset.status === status)
        && (!selectedType || card.dataset.type === selectedType)
        && (!selectedArea || card.dataset.area === selectedArea)
        && (bedroom === 'Any' || (card.dataset.beds || '').split(',').includes(bedroom))
        && matchesSize;

      card.hidden = !matches;
      if (matches) count += 1;
    }

    const ordered = [...cards];
    if (sort.index) {
      const direction = sort.index === 1 ? 1 : -1;
      ordered.sort((a, b) => direction * (a.dataset.name || a.querySelector('.pj').textContent).localeCompare(b.dataset.name || b.querySelector('.pj').textContent, 'en'));
    }
    let shown = 0;
    ordered.forEach((card, index) => {
      const visible = !card.hidden && shown < visibleLimit;
      card.hidden = !visible;
      if (visible) shown += 1;
      if (projectGrid.children[index] !== card) projectGrid.insertBefore(card, projectGrid.children[index]);
    });

    projectGrid.hidden = count === 0;
    emptyState.hidden = count > 0;
    resultCount.textContent = siteLocale.results(shown, count);
    loadMoreContainer.hidden = shown === count;

    const activeFilters = [status, selectedType, selectedArea, bedroom !== 'Any', sizeBand].filter(Boolean).length;
    filterBadge.textContent = siteLocale.number(activeFilters);
    filterBadge.hidden = activeFilters === 0;
    filterToggle.setAttribute('aria-label', activeFilters ? siteLocale.t('Filters') + ', ' + siteLocale.number(activeFilters) + ' ' + siteLocale.t('active') : siteLocale.t('Filters'));
    history.replaceState({
      ...history.state,
      wahiProjects: {
        query: search.value,
        status: statusIndex,
        type: type.index,
        area: area.index,
        size: size.index,
        sort: sort.index,
        bedroom: bedrooms.findIndex((chip) => chip.classList.contains('on')),
        limit: visibleLimit,
      },
    }, '');
  }

  statusInputs.forEach((input) => input.addEventListener('change', resetProjects));
  search.addEventListener('input', resetProjects);
  bedrooms.forEach((chip, index) => {
    chip.addEventListener('click', () => {
      selectBedrooms(index);
      resetProjects();
    });
  });
  filterToggle.setAttribute('aria-controls', 'project-filters');
  filterPanel.id = 'project-filters';
  filterToggle.addEventListener('click', () => showFilters(true));
  sidebar.querySelectorAll('.pj-x, .pj-show').forEach((button) => {
    button.addEventListener('click', () => showFilters(false));
  });
  filterPanel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && sidebar.classList.contains('pj-fo')) showFilters(false);
  });
  document.querySelectorAll('[data-clear-projects]').forEach((button) => {
    button.addEventListener('click', () => {
      search.value = '';
      statusInputs[0].checked = true;
      [type, area, size].forEach((menu) => menu.select(0));
      selectBedrooms(0);
      resetProjects();
      if (emptyState.contains(button)) search.focus();
    });
  });

  const params = new URLSearchParams(window.location.search);
  search.value = params.get('q') || '';
  const initialStatus = statusInputs.find((input, index) => urlValue(['All projects', 'Completed', 'Ongoing', 'Upcoming'][index]) === params.get('status'));
  const initialType = type.options.findIndex((option) => urlValue(option.dataset.value || option.querySelector('.t').textContent) === params.get('type'));
  if (initialStatus) initialStatus.checked = true;
  if (initialType > 0) type.select(initialType);
  const savedProjects = history.state?.wahiProjects;
  if (savedProjects) {
    search.value = typeof savedProjects.query === 'string' ? savedProjects.query : '';
    if (Number.isInteger(savedProjects.status) && statusInputs[savedProjects.status]) {
      statusInputs[savedProjects.status].checked = true;
    }
    for (const [name, menu] of Object.entries({ type, area, size, sort })) {
      const index = savedProjects[name];
      if (Number.isInteger(index) && menu.options[index]) menu.select(index);
    }
    if (Number.isInteger(savedProjects.bedroom) && bedrooms[savedProjects.bedroom]) {
      selectBedrooms(savedProjects.bedroom);
    }
    if (Number.isInteger(savedProjects.limit) && savedProjects.limit >= pageSize) {
      visibleLimit = savedProjects.limit;
    }
  }
  loadMoreButton.addEventListener('click', () => {
    const previousCount = projectGrid.querySelectorAll('.pj-card:not([hidden])').length;
    visibleLimit += pageSize;
    renderProjects();
    const nextCard = projectGrid.querySelectorAll('.pj-card:not([hidden])')[previousCount];
    nextCard.querySelector('.pj').focus({ preventScroll: true });
  });
  renderProjects();
}

document.querySelectorAll('.sp-plans').forEach((plans, index) => {
  const tabs = Array.from(plans.querySelectorAll('.sp-tab'));
  const panels = Array.from(plans.querySelectorAll('.sp-panel'));
  const activateTab = (selected) => {
    tabs.forEach((tab, position) => {
      const active = position === selected;
      tab.classList.toggle('on', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[position].hidden = !active;
    });
  };

  tabs.forEach((tab, position) => {
    const panel = panels[position];
    tab.id = 'plan-' + index + '-tab-' + position;
    panel.id = 'plan-' + index + '-panel-' + position;
    tab.setAttribute('aria-controls', panel.id);
    panel.setAttribute('aria-labelledby', tab.id);
    tab.addEventListener('click', () => activateTab(position));
    tab.addEventListener('keydown', (event) => {
      const positions = {
        ArrowLeft: (position + tabs.length - 1) % tabs.length,
        ArrowRight: (position + 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      };
      const next = positions[event.key];
      if (next === undefined) return;
      event.preventDefault();
      activateTab(next);
      tabs[next].focus();
    });
  });
  activateTab(0);
});

const galleries = document.querySelectorAll('.sp-gal');
const planButtons = document.querySelectorAll('.sp-xp');
if (galleries.length || planButtons.length) {
  const assetBase = document.currentScript.src;
  const viewer = document.createElement('dialog');
  viewer.className = 'image-viewer';
  viewer.setAttribute('aria-labelledby', 'image-viewer-title');
  viewer.innerHTML = `
    <div class="image-viewer-bar">
      <strong id="image-viewer-title"></strong>
      <button type="button" data-viewer-zoom aria-pressed="false">${siteLocale.t('Zoom in')}</button>
      <button type="button" data-viewer-close autofocus>${siteLocale.t('Close')}</button>
    </div>
    <div class="image-viewer-frame" tabindex="0"><img alt=""></div>
  `;
  document.body.append(viewer);

  const title = viewer.querySelector('strong');
  const frame = viewer.querySelector('.image-viewer-frame');
  const image = frame.querySelector('img');
  const zoom = viewer.querySelector('[data-viewer-zoom]');
  const close = viewer.querySelector('[data-viewer-close]');
  let opener;

  function setZoom(active) {
    frame.classList.toggle('is-zoomed', active);
    zoom.textContent = siteLocale.t(active ? 'Zoom out' : 'Zoom in');
    zoom.setAttribute('aria-pressed', String(active));
    if (!active) frame.scrollTo(0, 0);
  }

  function openImage(button, original, caption) {
    opener = button;
    title.textContent = caption;
    image.src = original.currentSrc || original.src;
    image.alt = original.alt;
    viewer.showModal();
    setZoom(false);
  }

  zoom.addEventListener('click', () => setZoom(!frame.classList.contains('is-zoomed')));
  close.addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', (event) => {
    if (event.target !== viewer) return;
    const box = viewer.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) {
      viewer.close();
    }
  });
  viewer.addEventListener('close', () => opener?.focus());

  galleries.forEach((gallery, index) => {
    const tiles = Array.from(gallery.querySelectorAll(':scope > .g'));
    const batchSize = 6;
    const items = tiles.map((tile, position) => {
      const button = document.createElement('button');
      const original = tile.querySelector('img');
      const caption = tile.querySelector('.sp-cap').textContent.trim();
      button.type = 'button';
      if (tile.dataset.video) {
        tile.hidden = position >= batchSize;
        for (const attribute of ['role', 'tabindex', 'aria-label', 'onclick']) tile.removeAttribute(attribute);
        button.className = 'gallery-video-trigger';
        button.setAttribute('aria-label', siteLocale.t('Play video') + ', ' + caption);
        button.append(...tile.childNodes);
        tile.append(button);
        button.addEventListener('click', () => {
          const video = document.createElement('video');
          video.controls = true;
          video.playsInline = true;
          video.poster = original.currentSrc || original.src;
          video.setAttribute('aria-label', caption);
          video.addEventListener('error', () => {
            video.remove();
            button.hidden = false;
            button.focus({ preventScroll: true });
          }, { once: true });
          video.src = new URL(tile.dataset.video, assetBase).href;
          button.hidden = true;
          tile.append(video);
          video.focus({ preventScroll: true });
          video.play().catch(() => {});
        });
        return tile;
      }
      button.className = 'g gallery-button';
      button.hidden = position >= batchSize;
      button.setAttribute('aria-label', siteLocale.t('Enlarge image') + ', ' + caption);
      button.append(...tile.childNodes);
      tile.replaceWith(button);
      button.addEventListener('click', () => openImage(button, original, caption));
      return button;
    });
    if (items.length <= batchSize) return;

    gallery.id ||= 'project-gallery-' + (index + 1);
    const controls = document.createElement('div');
    controls.className = 'sp-lm';
    const showMore = document.createElement('button');
    showMore.type = 'button';
    showMore.className = 'btn btn-secondary';
    showMore.textContent = siteLocale.t('Show more photos');
    showMore.setAttribute('aria-controls', gallery.id);
    controls.append(showMore);
    gallery.after(controls);

    let visible = batchSize;
    showMore.addEventListener('click', () => {
      const next = items.slice(visible, visible + batchSize);
      next.forEach((button) => { button.hidden = false; });
      visible += next.length;
      controls.hidden = visible === items.length;
      (next[0].querySelector('.gallery-video-trigger') || next[0]).focus();
    });
  });

  planButtons.forEach((button) => {
    const original = button.parentElement.querySelector('img');
    const caption = button.closest('.sp-card').querySelector('h3').textContent.trim();
    button.setAttribute('aria-label', siteLocale.t('Expand plan') + ', ' + caption);
    button.addEventListener('click', () => openImage(button, original, caption));
  });
}
