/*!
 * Copyright (c) 2026 Stephen Ince
 * Licensed under custom license. See LICENSE file.
 */
// Change this URL when the app moves to a custom domain.
const APP_URL = 'https://app.difffind.com';
// Named target so every "Open DiffFind" / API-docs link reuses one tab
// instead of piling up a new app.difffind.com window on every click.
const APP_WINDOW_TARGET = 'difffind-app';
document.querySelectorAll('[data-app-link]').forEach(link => { link.href = `${APP_URL}/`; link.target = APP_WINDOW_TARGET; link.rel = 'noopener'; });
document.querySelectorAll('[data-api-link]').forEach(link => { link.href = `${APP_URL}/openapi.json`; link.target = APP_WINDOW_TARGET; link.rel = 'noopener'; });
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
