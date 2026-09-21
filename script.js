/*!
 * Copyright (c) 2026 Stephen Ince
 * Licensed under custom license. See LICENSE file.
 */
// Change this URL when the app moves to a custom domain.
const APP_URL = 'https://app.difffind.com';
document.querySelectorAll('[data-app-link]').forEach(link => { link.href = `${APP_URL}/`; });
document.querySelectorAll('[data-api-link]').forEach(link => { link.href = `${APP_URL}/openapi.json`; });
document.querySelector('#year').textContent = new Date().getFullYear();

// Ping the app so it's already awake (Fly.io auto-stops on idle) by the
// time a visitor clicks through. no-cors: we don't read the response,
// just need the request to reach the server and wake the machine.
function pingAppWakeup() {
  fetch(`${APP_URL}/health`, { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
}
pingAppWakeup();
setInterval(pingAppWakeup, 60000);
