// Validates the multilingual site as it will be published (the files on disk).
//   node _i18n/validate.mjs
// Exits 1 and lists every problem found. Also importable: validateSite(ctx) -> string[].
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, posix, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, APP_URL, LANGUAGES, CORE_PAGES } from './config.mjs';
import { PAGES } from './pages.mjs';
import { makeCtx, generate, equivalents, pageUrl, outputFile, pageByKey, contentFile, parseContent, loadLocale, selectorTarget, localizedOutputs, DEFAULT_LANG } from './lib.mjs';

const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(m => m[0]);
const attr = (tag, name) => { const m = new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag); return m ? (m[1] ?? m[2]) : null; };
const headOf = html => html.slice(0, html.indexOf('</head>'));
const mainOf = html => { const m = /<main\b[^>]*>([\s\S]*)<\/main>/.exec(html); return m ? m[1] : ''; };
const stripNoise = html => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<section class="submitstorm-badges"[\s\S]*?<\/section>/g, '');
const count = (html, re) => (html.match(re) || []).length;
const ids = html => [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]).sort();
const headings = html => [...html.matchAll(/<h([123])\b[^>]*>([\s\S]*?)<\/h\1>/g)].map(m => m[2].replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim());
const hrefs = html => tags(html, 'a').map(t => attr(t, 'href')).filter(h => h && h !== '#');
const normHref = (h, lang) => {
  let x = h;
  if (!/^[a-z]+:/i.test(x) && !x.startsWith('/') && !x.startsWith('#')) x = '/' + x; // English home uses relative links
  if (lang !== DEFAULT_LANG && x.startsWith(`/${lang}/`)) x = x.slice(lang.length + 1);
  return x;
};
const ENGLISH_STOPWORDS = new Set(['the', 'and', 'with', 'your', 'you', 'for', 'that', 'this', 'are', 'from', 'what', 'which', 'can', 'between']);
// Case-sensitive on purpose: Spanish "todo" is a normal word.
const PLACEHOLDER = /\b(TODO|TBD|FIXME|PLACEHOLDER|TRANSLATE ME|XXX)\b|lorem ipsum|\[\[|\{\{(?!brand\}\})/;
const REDIRECT_APIS = /navigator\.languages?\b|Accept-Language|geolocation|resolvedOptions\(\)\.locale|\.userLanguage|\.browserLanguage/;

export function validateSite(ctx = makeCtx()) {
  const errors = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  const abs = rel => resolve(ctx.root, rel);
  const exists = rel => existsSync(abs(rel));
  const read = rel => readFileSync(abs(rel), 'utf8');

  // ---- 1. configuration and rollout rules -------------------------------------------
  for (const lang of ctx.enabled) {
    if (lang === DEFAULT_LANG || !LANGUAGES[lang]) { err('config', `"${lang}" cannot be enabled (unknown language or the default)`); continue; }
    if (!exists(`_i18n/locales/${lang}.json`)) { err(`config:${lang}`, `missing _i18n/locales/${lang}.json`); continue; }
    const locale = loadLocale(ctx, lang);
    const english = Object.keys(loadLocale(ctx, 'es'));
    for (const k of english) if (!(k in locale)) err(`locale:${lang}`, `missing key "${k}"`);
    for (const key of CORE_PAGES) if (!exists(contentFile(lang, key))) err(`config:${lang}`, `enabled but core page "${key}" has no translation (${contentFile(lang, key)})`);
    for (const key of Object.keys(locale.tools || {})) if (!pageByKey(key)) err(`locale:${lang}`, `tools.${key} is not a known page`);
    if (exists(`_i18n/content/${lang}`)) for (const f of readdirSync(abs(`_i18n/content/${lang}`))) if (!pageByKey(f.replace(/\.html$/, ''))) err(`content:${lang}`, `${f} does not match a page key in _i18n/pages.mjs`);
  }
  // Nothing may be published for a language that is not enabled.
  for (const lang of Object.keys(LANGUAGES)) {
    if (lang === DEFAULT_LANG || ctx.enabled.includes(lang)) continue;
    if (exists(lang)) err(`unpublished:${lang}`, `directory /${lang}/ exists but ${lang} is not enabled`);
  }
  const expectedLocalized = new Set(localizedOutputs(ctx));
  for (const lang of ctx.enabled) {
    const walk = dir => exists(dir) ? readdirSync(abs(dir)).flatMap(n => statSync(abs(`${dir}/${n}`)).isDirectory() ? walk(`${dir}/${n}`) : [`${dir}/${n}`]) : [];
    for (const f of walk(lang)) if (!expectedLocalized.has(f)) err(`orphan:${f}`, 'file under a language directory that is not a generated page');
  }

  // ---- 2. generated files are current -------------------------------------------------
  try {
    for (const [rel, content] of generate(ctx)) if (!exists(rel) || read(rel) !== content) err(rel, 'is stale or missing; run `npm run i18n`');
  } catch (e) { err('generate', e.message); }

  // ---- 3. per-page checks -------------------------------------------------------------
  const published = []; // { lang, page, rel }
  for (const page of PAGES) {
    if (exists(page.source)) published.push({ lang: DEFAULT_LANG, page, rel: page.source });
    for (const lang of ctx.enabled) if (exists(outputFile(lang, page)) && expectedLocalized.has(outputFile(lang, page))) published.push({ lang, page, rel: outputFile(lang, page) });
  }
  const byRel = new Map(published.map(p => [p.rel, p]));
  const html = new Map(published.map(p => [p.rel, read(p.rel)]));
  const idCache = new Map();
  const idsOf = rel => { if (!idCache.has(rel)) idCache.set(rel, new Set(ids(html.get(rel) ?? (exists(rel) ? read(rel) : '')))); return idCache.get(rel); };
  const alternatesOf = rel => tags(headOf(html.get(rel)), 'link').filter(t => attr(t, 'rel') === 'alternate' && attr(t, 'hreflang')).map(t => ({ hreflang: attr(t, 'hreflang'), href: attr(t, 'href') }));
  const urlToRel = new Map(published.map(p => [pageUrl(p.lang, p.page), p.rel]));

  for (const { lang, page, rel } of published) {
    const src = html.get(rel);
    const head = headOf(src);
    const L = LANGUAGES[lang];
    const expectUrl = pageUrl(lang, page);

    // lang attribute
    if (!new RegExp(`<html lang="${L.hreflang}"`).test(src)) err(rel, `<html lang> must be "${L.hreflang}"`);

    // canonical
    const canon = tags(head, 'link').filter(t => attr(t, 'rel') === 'canonical');
    if (canon.length !== 1) err(rel, `expected exactly one canonical, found ${canon.length}`);
    else if (attr(canon[0], 'href') !== expectUrl) err(rel, `canonical is ${attr(canon[0], 'href')}, expected ${expectUrl}`);
    if (lang !== DEFAULT_LANG && !new RegExp(`property="og:url" content="${expectUrl}"`).test(head)) err(rel, 'og:url must equal the canonical URL');

    // hreflang: exact expected set, self-reference, x-default -> English
    const alts = alternatesOf(rel);
    const expectedLangs = equivalents(ctx, page);
    if (expectedLangs.length < 2) { if (alts.length) err(rel, 'has hreflang annotations but no translated equivalent'); }
    else {
      const want = new Map([...expectedLangs.map(l => [LANGUAGES[l].hreflang, pageUrl(l, page)]), ['x-default', pageUrl(DEFAULT_LANG, page)]]);
      const seen = new Set();
      for (const a of alts) {
        if (seen.has(a.hreflang)) err(rel, `duplicate hreflang "${a.hreflang}"`);
        seen.add(a.hreflang);
        if (!want.has(a.hreflang)) err(rel, `unexpected hreflang "${a.hreflang}" (language not published for this page)`);
        else if (want.get(a.hreflang) !== a.href) err(rel, `hreflang "${a.hreflang}" points to ${a.href}, expected ${want.get(a.hreflang)}`);
      }
      for (const k of want.keys()) if (!seen.has(k)) err(rel, `missing hreflang "${k}"`);
      if (!alts.some(a => a.href === expectUrl)) err(rel, 'hreflang set must include the page itself');
      // reciprocity: every alternate must list this page back, with a matching language code
      for (const a of alts) {
        const targetRel = urlToRel.get(a.href);
        if (!targetRel) { if (want.has(a.hreflang)) err(rel, `hreflang "${a.hreflang}" target ${a.href} is not a published page`); continue; }
        if (targetRel === rel) continue;
        const back = alternatesOf(targetRel);
        if (!back.some(b => b.href === expectUrl && b.hreflang === (a.hreflang === 'x-default' ? b.hreflang : L.hreflang))) err(rel, `hreflang not reciprocal: ${a.href} does not link back to ${expectUrl}`);
      }
    }

    // language selector
    const menu = /<details class="feature-menu lang-menu">[\s\S]*?<\/details>/.exec(src);
    if (!menu) err(rel, 'language selector missing');
    else {
      const items = tags(menu[0], 'a').map(t => ({ hreflang: attr(t, 'hreflang'), href: attr(t, 'href'), current: / aria-current/.test(t) }));
      const langs = [DEFAULT_LANG, ...ctx.enabled];
      if (items.length !== langs.length) err(rel, `selector lists ${items.length} languages, expected ${langs.length}`);
      for (const l of langs) {
        const it = items.find(i => i.hreflang === LANGUAGES[l].hreflang);
        const want = selectorTarget(ctx, l, page);
        if (!it) err(rel, `selector is missing ${l}`);
        else {
          if (it.href !== want) err(rel, `selector link for ${l} is ${it.href}, expected ${want}`);
          if (it.current !== (l === lang)) err(rel, `selector aria-current is wrong for ${l}`);
        }
      }
    }

    // no automatic redirects
    if (/<meta[^>]+http-equiv=["']?refresh/i.test(src)) err(rel, 'meta refresh redirect is not allowed');
    for (const s of src.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) if (REDIRECT_APIS.test(s[1]) && !/ld\+json/.test(s[0])) err(rel, 'inline script reads browser language/location');

    // application links stay on the English app, untouched
    for (const t of tags(src, 'a')) {
      const h = attr(t, 'href') || '';
      if (/app\.difffind\.com/i.test(h) && !h.startsWith(`${APP_URL}/`)) err(rel, `app link must start with ${APP_URL}/: ${h}`);
      if (new RegExp(`${APP_URL.replace(/\./g, '\\.')}/(?:${Object.keys(LANGUAGES).join('|')})(?:/|$)`).test(h)) err(rel, `app link must not be localized: ${h}`);
      if (/data-app-link/.test(t) && !new RegExp(`^${APP_URL.replace(/\./g, '\\.')}/(\\?inputType=(file|url|curl|plain))?$`).test(h)) err(rel, `unexpected app link target: ${h}`);
    }

    // links and assets resolve
    const refs = [
      ...tags(src, 'a').map(t => attr(t, 'href')), ...tags(src, 'link').map(t => attr(t, 'href')),
      ...tags(src, 'img').map(t => attr(t, 'src')), ...tags(src, 'script').map(t => attr(t, 'src')),
    ].filter(Boolean);
    for (const ref of new Set(refs)) {
      const r = resolveInternal(ctx, rel, ref);
      if (!r) continue;
      if (!r.file) { err(rel, `broken link: ${ref}`); continue; }
      if (r.hash && r.file.endsWith('.html') && !idsOf(r.file).has(r.hash) && r.hash !== 'top') err(rel, `broken anchor: ${ref} (no id="${r.hash}" in ${r.file})`);
    }
  }

  // ---- 4. translation completeness (localized vs English) -----------------------------
  for (const { lang, page, rel } of published.filter(p => p.lang !== DEFAULT_LANG)) {
    const file = contentFile(lang, page.key);
    let meta;
    try { ({ meta } = parseContent(read(file), file)); } catch (e) { err(file, e.message); continue; }
    const en = html.get(page.source), loc = html.get(rel);
    const enMeta = { title: /<title>([\s\S]*?)<\/title>/.exec(en)?.[1].replace(/&amp;/g, '&'), description: attr(tags(en, 'meta').find(t => attr(t, 'name') === 'description') || '', 'content')?.replace(/&amp;/g, '&') };
    for (const f of ['title', 'description', 'lastmod']) if (!meta[f]) err(file, `meta.${f} is required`);
    if (meta.lastmod && !/^\d{4}-\d{2}-\d{2}$/.test(meta.lastmod)) err(file, 'meta.lastmod must be YYYY-MM-DD');
    if (meta.title && meta.title.length > 70) err(file, `title is ${meta.title.length} characters (max 70)`);
    if (meta.description && (meta.description.length < 70 || meta.description.length > 170)) err(file, `description is ${meta.description.length} characters (70-170 expected)`);
    if (meta.title === enMeta.title) err(file, 'title is identical to the English title (not translated)');
    if (meta.description === enMeta.description) err(file, 'description is identical to the English description (not translated)');
    if (PLACEHOLDER.test(read(file))) err(file, 'contains placeholder text (TODO/TBD/lorem/[[ ]]/unresolved {{ }})');

    const a = stripNoise(mainOf(en)), b = stripNoise(mainOf(loc));
    const metrics = { sections: /<section\b/g, h1: /<h1\b/g, h2: /<h2\b/g, h3: /<h3\b/g, 'list items': /<li\b/g, articles: /<article\b/g, 'faq items': /class="faq-item"/g, forms: /<form\b/g, 'text areas': /<textarea\b/g, 'code blocks': /<pre\b/g, images: /<img\b/g, 'app links': /data-app-link/g, buttons: /<button\b/g };
    for (const [name, re] of Object.entries(metrics)) if (count(a, re) !== count(b, re)) err(rel, `structure differs from English: ${name} ${count(b, re)} vs ${count(a, re)} (missing or extra content?)`);
    if (ids(a).join() !== ids(b).join()) err(rel, `element ids differ from English: ${ids(a).filter(i => !ids(b).includes(i)).concat(ids(b).filter(i => !ids(a).includes(i))).join(', ')}`);
    const norm = (list, l) => list.map(h => normHref(h, l)).sort();
    const ha = norm(hrefs(a), DEFAULT_LANG), hb = norm(hrefs(b), lang);
    if (ha.join('\n') !== hb.join('\n')) err(rel, `link targets differ from English: ${[...ha.filter(x => !hb.includes(x)), ...hb.filter(x => !ha.includes(x))].slice(0, 6).join(', ')}`);
    const hA = headings(a), hB = headings(b), keep = new Set((meta.keepEnglish || []).map(s => s.toLowerCase()));
    hB.forEach((h, i) => { if (hA[i] && h.toLowerCase() === hA[i].toLowerCase() && /[a-z]{4}/i.test(h) && !keep.has(h.toLowerCase()) && h.replace(/DiffFind/g, '').trim()) err(rel, `heading not translated: "${h}"`); });
    const visible = b.replace(/<(pre|code|script)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').toLowerCase().match(/[a-záéíóúñü]+/g) || [];
    const eng = visible.filter(w => ENGLISH_STOPWORDS.has(w)).length;
    if (visible.length && eng / visible.length > 0.012) err(rel, `looks partly untranslated (${eng} common English words in ${visible.length})`);
    const locale = loadLocale(ctx, lang);
    if (!loc.includes(`>${locale.footer.appNote.replace(/&/g, '&amp;')}</p>`)) err(rel, 'missing note that the application interface is not localized');
  }

  // ---- 5. sitemap ---------------------------------------------------------------------
  if (!exists('sitemap.xml')) err('sitemap.xml', 'missing');
  else {
    const xml = read('sitemap.xml');
    const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m => ({ loc: /<loc>([^<]+)<\/loc>/.exec(m[1])?.[1], lastmod: /<lastmod>([^<]+)<\/lastmod>/.exec(m[1])?.[1], alts: [...m[1].matchAll(/<xhtml:link\b([^>]*)\/>/g)].map(x => ({ hreflang: attr(x[0], 'hreflang'), href: attr(x[0], 'href') })) }));
    const expected = new Map();
    for (const page of PAGES.filter(p => p.sitemap)) for (const l of equivalents(ctx, page)) expected.set(pageUrl(l, page), { page, lang: l });
    const seen = new Set();
    for (const e of entries) {
      if (seen.has(e.loc)) err('sitemap.xml', `duplicate <loc> ${e.loc}`);
      seen.add(e.loc);
      if (!expected.has(e.loc)) { err('sitemap.xml', `unexpected URL (unpublished, missing or not canonical): ${e.loc}`); continue; }
      const rel = urlToRel.get(e.loc);
      if (!rel) { err('sitemap.xml', `${e.loc} has no file on disk`); continue; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.lastmod || '')) err('sitemap.xml', `${e.loc} has an invalid lastmod`);
      const htmlAlts = alternatesOf(rel).map(a => `${a.hreflang}|${a.href}`).sort().join('\n');
      const xmlAlts = e.alts.map(a => `${a.hreflang}|${a.href}`).sort().join('\n');
      if (htmlAlts !== xmlAlts) err('sitemap.xml', `alternates for ${e.loc} differ from the page's hreflang tags`);
    }
    for (const u of expected.keys()) if (!seen.has(u)) err('sitemap.xml', `missing published URL ${u}`);
    for (const lang of Object.keys(LANGUAGES)) if (lang !== DEFAULT_LANG && !ctx.enabled.includes(lang) && xml.includes(`${SITE}/${lang}/`)) err('sitemap.xml', `contains unpublished language /${lang}/`);
  }
  if (exists('robots.txt') && !read('robots.txt').includes(`Sitemap: ${SITE}/sitemap.xml`)) err('robots.txt', 'must reference the sitemap');
  if (exists('robots.txt') && /Disallow:\s*\/(?:es|pt-br|de|fr|ja)\b/i.test(read('robots.txt'))) err('robots.txt', 'must not block localized pages');

  // ---- 6. site script must not redirect by language or location ------------------------
  if (exists('script.js') && REDIRECT_APIS.test(read('script.js'))) err('script.js', 'reads browser language or location (automatic language redirects are not allowed)');
  if (!exists('CNAME') || read('CNAME').trim() !== new URL(SITE).host) err('CNAME', `must contain ${new URL(SITE).host}`);

  return errors;
}

// Resolve an href/src found in `fromRel` to a file in the repo. Returns null for
// external/non-file URLs, { file: null } when the target does not exist.
function resolveInternal(ctx, fromRel, ref) {
  if (/^(mailto:|tel:|javascript:|data:)/i.test(ref)) return null;
  let path = ref;
  if (/^https?:\/\//i.test(ref)) { if (!ref.startsWith(SITE + '/') && ref !== SITE) return null; path = ref.slice(SITE.length) || '/'; }
  else if (/^\/\//.test(ref)) return null;
  const [beforeHash, hash = ''] = path.split('#');
  const pathOnly = beforeHash.split('?')[0];
  let target = pathOnly === '' ? fromRel : pathOnly.startsWith('/') ? pathOnly.slice(1) : posix.normalize(posix.join(posix.dirname(fromRel), pathOnly));
  if (target === '' || target.endsWith('/')) target += 'index.html';
  const candidates = [target, `${target}/index.html`];
  const file = candidates.find(c => existsSync(resolve(ctx.root, c)) && statSync(resolve(ctx.root, c)).isFile());
  return { file: file ?? null, hash };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = validateSite();
  if (errors.length) { console.error(`i18n validation failed (${errors.length}):\n${errors.map(e => '  ✗ ' + e).join('\n')}`); process.exit(1); }
  console.log('i18n validation passed.');
}
