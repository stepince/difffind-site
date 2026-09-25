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
