// Proves the validator catches each class of mistake by breaking a scratch copy of the site.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { ROOT, makeCtx, generate } from './lib.mjs';
import { validateSite } from './validate.mjs';

function scratch(enabled) {
  const root = mkdtempSync(join(tmpdir(), 'difffind-i18n-'));
  cpSync(ROOT, root, { recursive: true, filter: src => !/[\\/](node_modules|\.git|dist|\.idea)([\\/]|$)/.test(src.slice(ROOT.length)) });
  const ctx = makeCtx({ root, ...(enabled ? { enabled } : {}) });
  const edit = (rel, fn) => writeFileSync(join(root, rel), fn(readFileSync(join(root, rel), 'utf8')));
  // Re-render generated files after editing translation sources, as `npm run i18n` would.
  const regen = () => { for (const [rel, content] of generate(ctx)) { mkdirSync(dirname(join(root, rel)), { recursive: true }); writeFileSync(join(root, rel), content); } };
  return { root, ctx, edit, regen, done: () => rmSync(root, { recursive: true, force: true }) };
}
const check = (name, mutate, expected, enabled) => test(name, () => {
  const s = scratch(enabled);
  try {
    mutate(s);
    const errors = validateSite(s.ctx);
    assert.ok(errors.some(e => expected.test(e)), `expected an error matching ${expected}, got:\n${errors.join('\n') || '(none)'}`);
  } finally { s.done(); }
});

test('the repository as committed validates cleanly', () => {
  assert.deepEqual(validateSite(makeCtx()), []);
});

check('wrong canonical is reported', s => s.edit('es/pdf-compare/index.html', h => h.replace('<link rel="canonical" href="https://difffind.com/es/pdf-compare/">', '<link rel="canonical" href="https://difffind.com/pdf-compare/">')), /canonical is https:\/\/difffind\.com\/pdf-compare\/, expected .*\/es\/pdf-compare\//);
check('missing x-default is reported', s => s.edit('es/index.html', h => h.replace(/<link rel="alternate" hreflang="x-default"[^>]*>\s*/, '')), /missing hreflang "x-default"/);
check('non-reciprocal hreflang is reported', s => s.edit('xml-compare/index.html', h => h.replace(/<!--i18n:hreflang-->[\s\S]*?<!--\/i18n:hreflang-->/, '<!--i18n:hreflang--><!--/i18n:hreflang-->')), /xml-compare\/index\.html: has no hreflang|has hreflang|missing hreflang|not reciprocal/);
check('hreflang on a page without a translation is reported', s => s.edit('csv-compare/index.html', h => h.replace('<!--i18n:hreflang-->', '<!--i18n:hreflang--><link rel="alternate" hreflang="es" href="https://difffind.com/es/csv-compare/">')), /csv-compare\/index\.html: has hreflang annotations but no translated equivalent/);
check('hreflang to the wrong URL is reported', s => s.edit('es/word-compare/index.html', h => h.replace('hreflang="es" href="https://difffind.com/es/word-compare/"', 'hreflang="es" href="https://difffind.com/es/word-compare"')), /hreflang "es" points to/);
check('sitemap missing a published URL is reported', s => s.edit('sitemap.xml', x => x.replace(/<url><loc>https:\/\/difffind\.com\/es\/url-compare\/<\/loc>[\s\S]*?<\/url>\n/, '')), /sitemap\.xml: missing published URL https:\/\/difffind\.com\/es\/url-compare\//);
check('sitemap with an unpublished language is reported', s => s.edit('sitemap.xml', x => x.replace('</urlset>', '  <url><loc>https://difffind.com/de/</loc><lastmod>2026-10-20</lastmod></url>\n</urlset>')), /sitemap\.xml: unexpected URL.*\/de\//);
check('broken internal link is reported', s => s.edit('es/index.html', h => h.replace('href="/es/pdf-compare/"', 'href="/es/pdf-compar/"')), /es\/index\.html: broken link: \/es\/pdf-compar\//);
check('broken anchor is reported', s => s.edit('es/semantic-diff/index.html', h => h.replace('href="/es/#features"', 'href="/es/#nope"')), /broken anchor: \/es\/#nope/);
check('unpublished language directory is reported', s => { mkdirSync(join(s.root, 'fr')); writeFileSync(join(s.root, 'fr/index.html'), '<!doctype html>'); }, /unpublished:fr: directory \/fr\/ exists/);
check('enabling a language without core translations is reported', s => { writeFileSync(join(s.root, '_i18n/locales/de.json'), readFileSync(join(s.root, '_i18n/locales/es.json'))); }, /config:de: enabled but core page "home" has no translation/, ['es', 'de']);
check('missing translated content is reported', s => { s.edit('_i18n/content/es/xml-compare.html', c => c.replace(/<div class="faq-item">[\s\S]*?<\/div>(?=<div class="faq-item">)/, '')); s.regen(); }, /es\/xml-compare\/index\.html: structure differs from English: faq items/);
check('untranslated heading is reported', s => { s.edit('_i18n/content/es/pdf-compare.html', c => c.replace('<h2>Mira un ejemplo</h2>', '<h2>See an example</h2>')); s.regen(); }, /heading not translated: "See an example"/);
check('untranslated page text is reported', s => { s.edit('_i18n/content/es/xml-compare.html', c => c.replace(/<p>[^<]*<\/p>/g, '<p>This is the page with your data and the tools that you can use for this, from what the team and the users are doing between them.</p>')); s.regen(); }, /looks partly untranslated/);
check('identical English title is reported', s => { s.edit('_i18n/content/es/xml-compare.html', c => c.replace(/"title": "[^"]*"/, '"title": "Compare XML Files Online with AI | DiffFind"')); s.regen(); }, /title is identical to the English title/);
check('missing core translation file is reported', s => { rmSync(join(s.root, '_i18n/content/es/word-compare.html')); }, /enabled but core page "word-compare" has no translation/);
check('placeholder text is reported', s => s.edit('_i18n/content/es/pdf-compare.html', c => c.replace('Mira un ejemplo', 'TODO traducir')), /placeholder text/);
check('localized app link is reported', s => s.edit('es/index.html', h => h.replace('href="https://app.difffind.com/"', 'href="https://app.difffind.com/es/"')), /app link must not be localized|unexpected app link target/);
check('language-based redirect in script.js is reported', s => s.edit('script.js', j => j + '\nif (navigator.language.startsWith("es")) location.assign("/es/");'), /script\.js: reads browser language/);
check('meta refresh on a localized page is reported', s => s.edit('es/index.html', h => h.replace('</head>', '<meta http-equiv="refresh" content="0; url=/"></head>')), /meta refresh redirect is not allowed/);
check('wrong selector target is reported', s => s.edit('es/pdf-compare/index.html', h => h.replace(/(<a href=")\/pdf-compare\/(" lang="en")/, '$1/$2')), /selector link for en is/);
check('stale generated output is reported', s => s.edit('es/index.html', h => h + '\n<!-- hand edit -->'), /es\/index\.html: is stale or missing/);

test('a second language rolls out with only config, locale and content files', () => {
  const s = scratch(['es', 'de']);
  try {
    // Stand-in "German" made from the Spanish files: the engine must not care what the text says.
    cpSync(join(s.root, '_i18n/content/es'), join(s.root, '_i18n/content/de'), { recursive: true });
    cpSync(join(s.root, '_i18n/locales/es.json'), join(s.root, '_i18n/locales/de.json'));
    s.regen();
    const errors = validateSite(s.ctx);
    assert.deepEqual(errors, []);
    const home = readFileSync(join(s.root, 'de/index.html'), 'utf8');
    assert.match(home, /<html lang="de">/);
    assert.match(home, /hreflang="de" href="https:\/\/difffind\.com\/de\/"/);
    assert.match(readFileSync(join(s.root, 'es/index.html'), 'utf8'), /hreflang="de" href="https:\/\/difffind\.com\/de\/"/, 'existing pages gain the new alternate');
    assert.match(readFileSync(join(s.root, 'sitemap.xml'), 'utf8'), /<loc>https:\/\/difffind\.com\/de\/pdf-compare\/<\/loc>/);
  } finally { s.done(); }
});

test('a partially translated optional page is published only where it exists', () => {
  const s = scratch();
  try {
    assert.equal(readFileSync(join(s.root, 'csv-compare/index.html'), 'utf8').includes('rel="alternate" hreflang="es"'), false);
    assert.equal(readFileSync(join(s.root, 'sitemap.xml'), 'utf8').includes('/es/csv-compare/'), false);
  } finally { s.done(); }
});
