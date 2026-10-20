// Localization engine: renders static, crawlable pages for every enabled
// language and keeps the English pages, sitemap and language selector in sync.
// Pure functions of (repository files, config) so build and validation share them.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, APP_URL, LANGUAGES, ENABLED, CORE_PAGES, MENU_ORDER, FOOTER_ORDER } from './config.mjs';
import { PAGES } from './pages.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_LANG = 'en';

export const makeCtx = (overrides = {}) => ({ root: ROOT, enabled: ENABLED, ...overrides });
const read = (ctx, rel) => readFileSync(resolve(ctx.root, rel), 'utf8');
const has = (ctx, rel) => existsSync(resolve(ctx.root, rel));

export const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const escText = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const BRAND = '<span class="brand-inline"><span class="diff-part">Diff</span><span class="find-part">Find</span></span>';

// ---------- registry helpers ----------
export const pageByKey = key => PAGES.find(p => p.key === key);
export const pageByPath = path => PAGES.find(p => p.path === path);
export const contentFile = (lang, key) => `_i18n/content/${lang}/${key}.html`;
export const outputFile = (lang, page) => (lang === DEFAULT_LANG ? page.source : `${lang}${page.path === '/' ? '/index.html' : page.path.endsWith('/') ? page.path + 'index.html' : page.path}`);
export const pagePath = (lang, page) => (lang === DEFAULT_LANG ? page.path : `/${lang}${page.path}`);
export const pageUrl = (lang, page) => SITE + pagePath(lang, page);

export function isTranslated(ctx, lang, key) {
  if (lang === DEFAULT_LANG) return true;
  return ctx.enabled.includes(lang) && has(ctx, contentFile(lang, key));
}
// Languages (English first) that have a published equivalent of this page.
export const equivalents = (ctx, page) => [DEFAULT_LANG, ...ctx.enabled.filter(l => isTranslated(ctx, l, page.key))];

// ---------- locale + content ----------
export const loadLocale = (ctx, lang) => JSON.parse(read(ctx, `_i18n/locales/${lang}.json`));

export function parseContent(text, label = 'content') {
  const m = /^<!--meta\s*\n([\s\S]*?)\n-->\s*\n([\s\S]*)$/.exec(text);
  if (!m) throw new Error(`${label}: missing <!--meta ... --> block at the top`);
  let meta;
  try { meta = JSON.parse(m[1]); } catch (e) { throw new Error(`${label}: meta block is not valid JSON (${e.message})`); }
  return { meta, body: m[2].trim() };
}

// Internal links in content are written as English paths ("/pdf-compare/",
// "/#features"). They point at the localized page when one is published for
// this language and otherwise stay on the English page, so a link never 404s.
export function localizeHref(ctx, lang, href) {
  const m = /^(\/[^#?]*)(#.*)?$/.exec(href);
  if (!m) return href;
  const page = pageByPath(m[1]);
  if (!page || !isTranslated(ctx, lang, page.key)) return href;
  return pagePath(lang, page) + (m[2] || '');
}
const localizeLinks = (ctx, lang, html) => html.replace(/(<a\b[^>]*?\shref=")(\/[^"]*)(")/g, (_, a, href, c) => a + localizeHref(ctx, lang, href) + c);

// ---------- language selector + hreflang ----------
const GLOBE = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"></path></svg>';

// Selector target: the same page when translated, else that language's homepage.
export function selectorTarget(ctx, toLang, page) {
  if (page && isTranslated(ctx, toLang, page.key)) return pagePath(toLang, page);
  return pagePath(toLang, pageByKey('home'));
}
export function selectorHtml(ctx, currentLang, page) {
  const label = loadLocale(ctx, currentLang).languageLabel;
  const items = [DEFAULT_LANG, ...ctx.enabled].map(l => {
    const cur = l === currentLang ? ' aria-current="true"' : '';
    return `<a href="${selectorTarget(ctx, l, page)}" lang="${LANGUAGES[l].hreflang}" hreflang="${LANGUAGES[l].hreflang}"${cur}>${LANGUAGES[l].native}</a>`;
  }).join('');
  return `<details class="feature-menu lang-menu"><summary aria-label="${esc(label)}: ${esc(LANGUAGES[currentLang].native)}">${GLOBE} ${LANGUAGES[currentLang].native}</summary><div class="feature-menu-links lang-menu-links">${items}</div></details>`;
}
export function hreflangHtml(ctx, page) {
  const langs = equivalents(ctx, page);
  if (langs.length < 2) return '';
  const tags = langs.map(l => `<link rel="alternate" hreflang="${LANGUAGES[l].hreflang}" href="${pageUrl(l, page)}">`);
  tags.push(`<link rel="alternate" hreflang="x-default" href="${pageUrl(DEFAULT_LANG, page)}">`);
  return tags.join('\n  ');
}

// ---------- English pages: managed marker blocks ----------
export function applyEnglishMarkers(ctx, page, html) {
  if (!/<header class="header wrap">/.test(html)) return html; // redirect stubs etc.
  const hre = `<!--i18n:hreflang-->${hreflangHtml(ctx, page) ? '\n  ' + hreflangHtml(ctx, page) + '\n  ' : ''}<!--/i18n:hreflang-->`;
  const sel = `<!--i18n:selector-->${selectorHtml(ctx, DEFAULT_LANG, page)}<!--/i18n:selector-->`;
  const put = (src, name, block, anchor, where) => {
    const re = new RegExp(`<!--i18n:${name}-->[\\s\\S]*?<!--/i18n:${name}-->`);
    if (re.test(src)) return src.replace(re, () => block);
    const i = anchor(src);
    if (i < 0) throw new Error(`${page.source}: cannot place ${name} block`);
    return where === 'after' ? src.slice(0, i) + (name === 'hreflang' ? '\n  ' : '') + block + src.slice(i) : src.slice(0, i) + block + src.slice(i);
  };
  let out = html;
  out = put(out, 'hreflang', hre, s => { const m = /<link rel="canonical" href="[^"]*">/.exec(s); return m ? m.index + m[0].length : -1; }, 'after');
  out = put(out, 'selector', sel, s => { const n = s.indexOf('aria-label="Main navigation"'); return n < 0 ? -1 : s.indexOf('</nav>', n); }, 'before');
  return out;
}

// ---------- structured data ----------
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', rarr: '→', hellip: '…', laquo: '«', raquo: '»', iquest: '¿', iexcl: '¡' };
export const textOf = html => html.replace(/<[^>]+>/g, '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return ENTITIES[e] ?? m;
}).replace(/\s+/g, ' ').trim();

export function faqItems(body) {
  return [...body.matchAll(/<div class="faq-item"><h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p><\/div>/g)].map(m => ({ q: textOf(m[1]), a: textOf(m[2]) }));
}
function structuredData(lang, page, meta, body) {
  const url = pageUrl(lang, page);
  const hl = LANGUAGES[lang].hreflang;
  const faq = faqItems(body);
  const faqNode = faq.length ? [{ '@type': 'FAQPage', '@id': `${url}#faq`, inLanguage: hl, mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : [];
  const app = { '@type': 'SoftwareApplication', ...(page.key === 'home' ? {} : { '@id': `${url}#app` }), name: meta.appName || 'DiffFind', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: `${APP_URL}/`, description: meta.description, ...(meta.featureList ? { featureList: meta.featureList } : {}) };
  let graph;
  if (page.key === 'home') {
    graph = [
      { '@type': 'WebSite', '@id': `${url}#site`, name: 'DiffFind', url, inLanguage: hl, publisher: { '@id': `${SITE}/#org` } },
      { '@type': 'WebPage', '@id': `${url}#page`, url, name: meta.title, description: meta.description, inLanguage: hl, isPartOf: { '@id': `${url}#site` } },
      app, ...faqNode,
    ];
  } else {
    graph = [
      { '@type': 'WebPage', '@id': `${url}#page`, url, name: meta.title, description: meta.description, inLanguage: hl, isPartOf: { '@id': `${pageUrl(lang, pageByKey('home'))}#site` } },
      app, ...faqNode,
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'DiffFind', item: pageUrl(lang, pageByKey('home')) }, { '@type': 'ListItem', position: 2, name: meta.breadcrumb || meta.appName, item: url }] },
    ];
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

// ---------- page rendering ----------
function englishBlock(ctx, startMarker, endMarker) {
  const src = read(ctx, 'index.html');
  const a = src.indexOf(startMarker), b = src.indexOf(endMarker);
  if (a < 0 || b < 0) throw new Error(`index.html: cannot find ${startMarker}`);
  return src.slice(a, b + endMarker.length);
}
const LICENSE_COMMENT = `<!--!
  Copyright (c) 2026 Stephen Ince
  All rights reserved.

  This software is licensed for personal and internal use only.
  See the LICENSE file in the project root for full terms.
-->`;

function expandTokens(ctx, lang, locale, html) {
  let out = html.replaceAll('{{brand}}', BRAND);
  if (out.includes('<!--@badges-->')) {
    const badges = englishBlock(ctx, '<!-- BEGIN SubmitStorm badges', '<!-- END SubmitStorm badges -->')
      .replace('aria-label="Featured on"', `aria-label="${esc(locale.badgesLabel)}"`)
      .replace('<p class="submitstorm-badges-label">Featured on</p>', `<p class="submitstorm-badges-label">${escText(locale.badgesLabel)}</p>`);
    out = out.replace('<!--@badges-->', () => badges);
  }
  return out;
}

export function renderPage(ctx, lang, page) {
  const locale = loadLocale(ctx, lang);
  const label = contentFile(lang, page.key);
  const { meta, body: rawBody } = parseContent(read(ctx, label), label);
  const body = localizeLinks(ctx, lang, expandTokens(ctx, lang, locale, rawBody));
  const url = pageUrl(lang, page);
  const L = LANGUAGES[lang];
  const home = localizeHref(ctx, lang, '/');
  const link = path => localizeHref(ctx, lang, path);
  const og = `${SITE}/${meta.ogImage || page.ogImage || 'assets/app-preview.png'}`;
  const alternates = equivalents(ctx, page).filter(l => l !== lang);
  const toolLinks = order => order.map(k => `<a href="${link(pageByKey(k).path)}">${escText(locale.tools[k])}</a>`).join('');
  const menu = `<details class="feature-menu"><summary>${escText(locale.nav.features)}</summary><div class="feature-menu-links">${toolLinks(MENU_ORDER)}<a href="${link('/#features')}">${escText(locale.nav.allFeatures)}</a></div></details>`;
  const pill = `<span class="soon-pill">${escText(locale.nav.soon)}</span>`;
  const mail = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M2 7l10 7 10-7"></path></svg>';
  const nav = `<nav aria-label="${esc(locale.nav.aria)}">${menu}<a href="${link('/#who-its-for')}">${escText(locale.nav.whoItsFor)}</a><a href="${link('/#how-it-works')}">${escText(locale.nav.howItWorks)}</a><a href="${link('/desktop/')}">${escText(locale.nav.desktop)} ${pill}</a><a href="${link('/self-hosted.html')}">${escText(locale.nav.selfHosted)} ${pill}</a><a href="mailto:contact@difffind.com" target="_blank" title="contact@difffind.com">${mail} ${escText(locale.nav.contact)}</a>${selectorHtml(ctx, lang, page)}</nav>`;
  const appButton = `<a class="button small light" data-app-link rel="nofollow" href="${APP_URL}/">${escText(locale.openApp)} ${BRAND} <span aria-hidden="true">↗</span></a>`;
  const footerNav = `<nav class="wrap footer-nav" aria-label="${esc(locale.footer.navAria)}"><span>${escText(locale.footer.compare)}</span>${toolLinks(FOOTER_ORDER)}</nav>`;
  const related = page.key === 'home' ? `\n  <p class="wrap related-tools">${locale.footer.relatedTools}</p>` : '';
  const boost = page.key === 'home' ? '\n  ' + /<div class="wrap" style="text-align:center;padding-bottom:29px">[\s\S]*?<\/a>\s*<\/div>/.exec(read(ctx, 'index.html'))[0] : '';
  const hreflang = hreflangHtml(ctx, page);
  const head = [
    `<meta charset="UTF-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<meta name="description" content="${esc(meta.description)}">`,
    `<meta name="theme-color" content="#f7fafc">`,
    `<title>${escText(meta.title)}</title>`,
    `<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" type="image/png" sizes="192x192" href="/assets/favicon-192.png"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">`,
    `<link rel="canonical" href="${url}">`,
    ...(hreflang ? [hreflang] : []),
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="DiffFind">`,
    `<meta property="og:locale" content="${L.ogLocale}">`,
    ...alternates.map(l => `<meta property="og:locale:alternate" content="${LANGUAGES[l].ogLocale}">`),
    `<meta property="og:title" content="${esc(meta.title)}">`,
    `<meta property="og:description" content="${esc(meta.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${og}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(meta.title)}">`,
    `<meta name="twitter:description" content="${esc(meta.description)}">`,
    `<meta name="twitter:image" content="${og}">`,
    `<script type="application/ld+json">${structuredData(lang, page, meta, body)}</script>`,
    `<link rel="stylesheet" href="/styles.css">`,
    `<script src="/script.js" defer></script>`,
  ].join('\n  ');
  const mainAttrs = `id="main"${page.mainClass ? ` class="${page.mainClass}"` : ''}`;
  return `<!doctype html>
${LICENSE_COMMENT}
<html lang="${L.hreflang}">
<head>
  ${head}
</head>
<body>
  <a class="skip-link" href="#main">${escText(locale.skip)}</a>
  <header class="header wrap">
    <a href="${home}" aria-label="${esc(locale.homeAria)}"><img class="wordmark" src="/assets/difffind-wordmark.png" alt="${esc(locale.wordmarkAlt)}" width="1184" height="331"></a>
    ${nav}
    ${appButton}
  </header>
  <main ${mainAttrs}>
${body}
  </main>
  ${footerNav}${related}
  <footer class="wrap"><a href="${home}" aria-label="${esc(locale.footer.backToTop)}"><img src="/assets/difffind-wordmark.png" alt="DiffFind" width="1184" height="331"></a><p>${escText(locale.footer.tagline)}</p><span>© <span id="year">2026</span> <span class="brand-name">DiffFind</span> &middot; <a href="/privacy.html" lang="en" hreflang="en">${escText(locale.footer.privacy)}</a> &middot; <a href="/terms.html" lang="en" hreflang="en">${escText(locale.footer.terms)}</a></span></footer>
  <p class="wrap app-language-note">${escText(locale.footer.appNote)}</p>${boost}
</body>
</html>
`;
}

// ---------- sitemap ----------
export function renderSitemap(ctx) {
  const rows = [];
  for (const page of PAGES.filter(p => p.sitemap)) {
    const langs = equivalents(ctx, page);
    for (const lang of langs) {
      const lastmod = lang === DEFAULT_LANG ? page.lastmod : parseContent(read(ctx, contentFile(lang, page.key))).meta.lastmod;
      let row = `  <url><loc>${pageUrl(lang, page)}</loc><lastmod>${lastmod}</lastmod>`;
      if (langs.length > 1) {
        row += '\n' + langs.map(l => `    <xhtml:link rel="alternate" hreflang="${LANGUAGES[l].hreflang}" href="${pageUrl(l, page)}"/>`).join('\n');
        row += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(DEFAULT_LANG, page)}"/>\n  `;
      }
      rows.push(`${row}</url>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${rows.join('\n')}\n</urlset>\n`;
}

// ---------- whole-site generation ----------
// Returns Map<repo-relative path, new file content> for every file the i18n
// tooling owns: localized pages, managed blocks in English pages, the sitemap.
export function generate(ctx = makeCtx()) {
  const out = new Map();
  for (const lang of ctx.enabled) {
    for (const page of PAGES) {
      if (isTranslated(ctx, lang, page.key)) out.set(outputFile(lang, page), renderPage(ctx, lang, page));
    }
  }
  for (const page of PAGES) {
    if (!has(ctx, page.source)) continue;
    const html = read(ctx, page.source);
    const updated = applyEnglishMarkers(ctx, page, html);
    if (updated !== html) out.set(page.source, updated);
  }
  out.set('sitemap.xml', renderSitemap(ctx));
  return out;
}

// Every localized HTML file that is published (used by build.mjs and server.mjs).
export function localizedOutputs(ctx = makeCtx()) {
  const files = [];
  for (const lang of ctx.enabled) for (const page of PAGES) if (isTranslated(ctx, lang, page.key)) files.push(outputFile(lang, page));
  return files;
}
export { PAGES, LANGUAGES, CORE_PAGES, SITE, APP_URL };
