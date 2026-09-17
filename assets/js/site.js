
(() => {
  'use strict';
  const root = document.documentElement;
  const opening = document.querySelector('.opening');
  const surface = document.querySelector('.editorial-surface');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = window.matchMedia('(max-width: 760px)');
  if (!opening || !surface) return;

  let enabled = false;
  let height = 0;
  let frame = 0;
  let resizeFrame = 0;
  let covered = false;
  let surfaceTop = 0;
  let lastProgress = -1;
  const clamp = value => Math.max(0, Math.min(1, value));

  function setCovered(value) {
    // Never hide the currently focused link from assistive technology.
    value = value && !opening.contains(document.activeElement);
    if (covered === value) return;
    covered = value;
    opening.inert = value;
    if (value) opening.setAttribute('aria-hidden', 'true');
    else opening.removeAttribute('aria-hidden');
  }

  function paint() {
    frame = 0;
    if (!enabled) return;
    // Absolute geometry is measured on layout changes, not on every scroll.
    const progress = clamp((height - (surfaceTop - window.scrollY)) / height);
    if (Math.abs(progress - lastProgress) > .0005) {
      lastProgress = progress;
      const depth = compact.matches ? 8 : 20;
      const scale = compact.matches ? .012 : .025;
      opening.style.setProperty('--score-depth', (progress * depth).toFixed(3) + 'px');
      opening.style.setProperty('--score-scale', (1 - progress * scale).toFixed(5));
    }
    setCovered(progress >= 1);
  }

  function schedule() {
    if (enabled && !frame) frame = window.requestAnimationFrame(paint);
  }

  function measure() {
    resizeFrame = 0;
    height = opening.getBoundingClientRect().height;
    // A tall opening must remain freely scrollable, including at text zoom.
    enabled = !reduce.matches && height > 0 && height <= window.innerHeight - 12;
    root.classList.toggle('motion-ready', enabled);
    surfaceTop = surface.getBoundingClientRect().top + window.scrollY;
    lastProgress = -1;
    if (!enabled) {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      opening.style.removeProperty('--score-depth');
      opening.style.removeProperty('--score-scale');
      setCovered(false);
    } else schedule();
  }

  function scheduleMeasure() {
    if (!resizeFrame) resizeFrame = window.requestAnimationFrame(measure);
  }

  // A keyboard return to an uncovered opening link restores its visible context.
  opening.addEventListener('focusin', () => {
    if (!enabled) return;
    const edge = surfaceTop - window.scrollY;
    if (edge < height) {
      const mainTop = document.getElementById('main').getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: mainTop, behavior: 'instant' });
      schedule();
    }
  });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', scheduleMeasure, { passive: true });
  window.addEventListener('pageshow', scheduleMeasure);
  reduce.addEventListener('change', scheduleMeasure);
  compact.addEventListener('change', scheduleMeasure);
  if ('ResizeObserver' in window) new ResizeObserver(scheduleMeasure).observe(opening);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleMeasure);
  measure();
})();

(() => {
  'use strict';
  const root = document.documentElement;
  const languageControls = document.querySelector('.language-switch');
  const languageButtons = [...document.querySelectorAll('[data-language]')];
  function setLanguage(language) {
    root.lang = language === 'en' ? 'en' : 'ja';
    languageButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === root.lang)));
    try { localStorage.setItem('takumu-morita-lang', root.lang); } catch (_) { /* Storage may be unavailable. */ }
  }
  let savedLanguage;
  try { savedLanguage = localStorage.getItem('takumu-morita-lang'); } catch (_) { /* Japanese remains the default. */ }
  if (savedLanguage === 'ja' || savedLanguage === 'en') setLanguage(savedLanguage);
  languageButtons.forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.language)));
  if (languageControls) languageControls.hidden = false;

  const filters = [...document.querySelectorAll('[data-filter]')];
  const rows = [...document.querySelectorAll('.work-row')];
  filters.forEach(button => button.addEventListener('click', () => {
    const category = button.dataset.filter;
    let count = 0;
    let year = null;
    rows.forEach(row => {
      row.hidden = category !== 'all' && row.dataset.category !== category;
      if (!row.hidden) {
        count++;
        const current = row.querySelector('.year').textContent;
        row.classList.toggle('year-start', current !== year);
        year = current;
      }
    });
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    document.querySelector('[data-count]').textContent = count;
  }));
  const filterList = document.querySelector('.filter-list');
  if (filterList) filterList.hidden = false;

  document.querySelectorAll('[data-embed-src]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => {
      const slot = document.getElementById(button.getAttribute('aria-controls'));
      const expanded = button.getAttribute('aria-expanded') === 'true';
      slot.replaceChildren();
      button.setAttribute('aria-expanded', String(!expanded));
      if (expanded) return;
      if (button.dataset.mediaType === 'file') {
        const player = document.createElement('audio');
        player.controls = true;
        player.preload = 'metadata';
        player.src = button.dataset.embedSrc;
        slot.append(player);
      } else {
        const player = document.createElement('iframe');
        player.src = button.dataset.embedSrc;
        player.title = button.dataset.embedTitle;
        player.allow = 'encrypted-media; fullscreen; picture-in-picture';
        player.allowFullscreen = true;
        if (button.dataset.mediaType === 'video' || player.src.includes('youtube.com')) player.className = 'video';
        slot.append(player);
      }
    });
  });

  const dialog = document.querySelector('.score-dialog');
  const scoreLinks = [...document.querySelectorAll('[data-score-index]')];
  if (dialog && typeof dialog.showModal === 'function' && scoreLinks.length) {
    const image = dialog.querySelector('img');
    const viewport = dialog.querySelector('.score-viewport');
    const previous = dialog.querySelector('[data-score-prev]');
    const next = dialog.querySelector('[data-score-next]');
    const status = dialog.querySelector('[data-score-status]');
    const zoom = dialog.querySelector('[data-score-zoom]');
    const thumbnails = dialog.querySelector('.score-thumbnails');
    const pageButtons = scoreLinks.map((link, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `Page ${index + 1}`);
      const thumb = document.createElement('img');
      thumb.src = link.querySelector('img').src;
      thumb.alt = '';
      thumb.loading = 'lazy';
      button.append(thumb);
      button.addEventListener('click', () => show(index));
      thumbnails.append(button);
      return button;
    });
    zoom.addEventListener('click', () => {
      const expanded = dialog.classList.toggle('is-zoomed');
      zoom.setAttribute('aria-pressed', String(expanded));
    });
    let current = 0;
    let opener = null;
    function show(index) {
      current = Math.max(0, Math.min(scoreLinks.length - 1, index));
      const source = scoreLinks[current].querySelector('img');
      image.src = source.src;
      image.alt = source.alt;
      status.textContent = `${current + 1} / ${scoreLinks.length}`;
      pageButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === current)));
      previous.disabled = current === 0;
      next.disabled = current === scoreLinks.length - 1;
      viewport.scrollTop = 0;
    }
    scoreLinks.forEach((link, index) => link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      show(index);
      dialog.showModal();
    }));
    dialog.querySelector('[data-score-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));
    previous.addEventListener('click', () => show(current - 1));
    next.addEventListener('click', () => show(current + 1));
    dialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        show(current + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    let start = null;
    viewport.addEventListener('touchstart', event => {
      start = !dialog.classList.contains('is-zoomed') && event.touches.length === 1 ? { x:event.touches[0].clientX, y:event.touches[0].clientY } : null;
    }, { passive:true });
    viewport.addEventListener('touchend', event => {
      if (!start || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - start.x;
      const dy = event.changedTouches[0].clientY - start.y;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
      start = null;
    }, { passive:true });
  }

  function revealHash() {
    if (!location.hash) return;
    let target;
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (_) { return; }
    if (!target) return;
    let parent = target;
    while (parent) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
  }
  revealHash();
  window.addEventListener('hashchange', revealHash);
})();
