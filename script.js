/*!
 * Copyright (c) 2026 Stephen Ince
 * Licensed under custom license. See LICENSE file.
 */
// Change this URL when the app moves to a custom domain.
const APP_URL = 'https://app.difffind.com';
// Named target so every "Open DiffFind" / API-docs link reuses one tab
// instead of piling up a new app.difffind.com window on every click.
// No rel="noopener"/"noreferrer" here on purpose: either one forces the
// browser to open an unrelated browsing context every time, which defeats
// named-target reuse entirely. Safe to omit since app.difffind.com is our
// own trusted domain.
const APP_WINDOW_TARGET = 'difffind-app';
// data-app-input="file" (or url/curl/plain) opens the app with that input
// type preselected via ?inputType=... — used by the PDF/Excel pages.
document.querySelectorAll('[data-app-link]').forEach(link => {
  const inputType = link.dataset.appInput;
  link.href = inputType ? `${APP_URL}/?inputType=${encodeURIComponent(inputType)}` : `${APP_URL}/`;
  link.target = APP_WINDOW_TARGET;
});
document.querySelectorAll('[data-api-link]').forEach(link => { link.href = `${APP_URL}/openapi.json`; link.target = APP_WINDOW_TARGET; });
document.querySelector('#year').textContent = new Date().getFullYear();

// Ping the app so it's already awake (Fly.io auto-stops on idle) by the
// time a visitor clicks through. no-cors: we don't read the response,
// just need the request to reach the server and wake the machine.
function pingAppWakeup() {
  fetch(`${APP_URL}/health`, { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
}
pingAppWakeup();
setInterval(pingAppWakeup, 60000);

// Cycle the hero preview between screenshots.
const previewSlides = document.querySelectorAll('.preview-media .preview-screenshot');
if (previewSlides.length > 1) {
  let activeSlide = 0;
  setInterval(() => {
    previewSlides[activeSlide].classList.remove('is-active');
    activeSlide = (activeSlide + 1) % previewSlides.length;
    previewSlides[activeSlide].classList.add('is-active');
  }, 5000);
}

// Close the lightweight Features menu with Escape or an outside click.
document.querySelectorAll('.feature-menu').forEach(menu => {
  document.addEventListener('click', event => {
    if (!menu.contains(event.target)) menu.open = false;
  });
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
});

// Quick text diff: hands the two texts to the app in the URL *fragment*
// (never sent to any server, stripped by the app as soon as it reads it) and
// navigates this tab to the app, which fills in and runs the comparison.
// Format: #handoff=gz.<base64url of gzip(JSON)> or #handoff=raw.<base64url of JSON>.
const quickForm = document.querySelector('#quickDiff');
if (quickForm) {
  const isLocalSite = ['localhost', '127.0.0.1'].includes(location.hostname);
  // On a local dev server, hand off to a local copy of the app (port 3222).
  const HANDOFF_APP_URL = isLocalSite ? 'http://localhost:3222' : APP_URL;
  const MAX_FRAGMENT_CHARS = 60000; // stays under the smallest browser URL limits
  const beforeEl = document.querySelector('#quickBefore');
  const afterEl = document.querySelector('#quickAfter');
  const statusEl = document.querySelector('#quickStatus');

  const setStatus = (message, withAppLink) => {
    statusEl.textContent = message;
    if (withAppLink) {
      statusEl.append(' ');
      const link = document.createElement('a');
      link.href = `${HANDOFF_APP_URL}/`;
      link.textContent = 'Open DiffFind';
      statusEl.append(link);
    }
  };
  const toBase64Url = bytes => {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  async function encodeHandoff(payload) {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    if (typeof CompressionStream === 'function') {
      const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
      return `gz.${toBase64Url(new Uint8Array(await new Response(stream).arrayBuffer()))}`;
    }
    return `raw.${toBase64Url(bytes)}`;
  }

  quickForm.addEventListener('submit', async event => {
    event.preventDefault();
    setStatus('');
    const before = beforeEl.value;
    const after = afterEl.value;
    if (!before.trim() && !after.trim()) {
      setStatus('Paste some text into Before and/or After first.');
      return;
    }
    try {
      const encoded = await encodeHandoff({ v: 1, before, after });
      if (encoded.length > MAX_FRAGMENT_CHARS) {
        setStatus('That much text is too large to carry over. Paste it directly in the app.', true);
        return;
      }
      window.location.assign(`${HANDOFF_APP_URL}/#handoff=${encoded}`);
    } catch (err) {
      setStatus('Could not prepare your text.', true);
    }
  });

  // Fit the text boxes to the window: CSS sizes them as 100dvh minus
  // --qd-offset (everything above the boxes plus the form's own chrome), so
  // resizing the window is handled natively by the browser with no script
  // lag. JS only measures that offset, and re-measures whenever something
  // that affects it changes size (fonts loading, header/banner wrapping, a
  // status message appearing). ResizeObserver callbacks run before paint, so
  // there is no visible jump. Phones keep a fixed CSS height (the on-screen
  // keyboard would otherwise shrink the boxes while typing).
  const measureQuickOffset = () => {
    const top = quickForm.getBoundingClientRect().top + window.scrollY;
    const chrome = quickForm.offsetHeight - beforeEl.offsetHeight;
    quickForm.style.setProperty('--qd-offset', `${Math.ceil(top + chrome + 16)}px`);
  };
  measureQuickOffset();
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(measureQuickOffset);
    ['.dh-banner', '.header', '.hero-head', '.quick-diff-head', '.quick-diff-actions', '.quick-note']
      .map(selector => document.querySelector(selector))
      .filter(Boolean)
      .forEach(element => observer.observe(element));
  }
  window.addEventListener('load', measureQuickOffset);

  document.querySelector('#quickExample').addEventListener('click', () => {
    beforeEl.value = 'Payment is due within 30 days of the invoice date.\nLate payments accrue interest at 1% per month.\nEither party may terminate with 60 days notice.';
    afterEl.value = 'Payment is due within 15 days of the invoice date.\nLate payments accrue interest at 2% per month.\nEither party may terminate with 30 days written notice.';
    setStatus('');
  });
  document.querySelector('#quickClear').addEventListener('click', () => {
    beforeEl.value = '';
    afterEl.value = '';
    setStatus('');
    beforeEl.focus();
  });
}

// Measure document position, not scroll position: scrolling must never resize
// the editors. Observe only the content above the form to avoid resize loops.
if (quickForm) {
  const updateQuickFormTop = () => {
    const top = quickForm.getBoundingClientRect().top + window.scrollY;
    quickForm.style.setProperty('--quick-form-top', `${Math.ceil(top)}px`);
  };
  updateQuickFormTop();
  window.addEventListener('resize', updateQuickFormTop);
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(updateQuickFormTop);
    document.querySelectorAll('.dh-banner, .header, .hero-head').forEach(el => observer.observe(el));
  }
  if (document.fonts) document.fonts.ready.then(updateQuickFormTop);
}
