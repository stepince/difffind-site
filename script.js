// Change this URL when the app moves to a custom domain.
const APP_URL = 'https://app.difffind.com';
document.querySelectorAll('[data-app-link]').forEach(link => { link.href = `${APP_URL}/`; });
document.querySelectorAll('[data-api-link]').forEach(link => { link.href = `${APP_URL}/openapi.json`; });
document.querySelector('#year').textContent = new Date().getFullYear();
