// Registry of every English page. `key` names the translation file
// (_i18n/content/<lang>/<key>.html). `lastmod` is the English page's sitemap date;
// bump it when you edit the English page. Translations carry their own lastmod
// in their meta block.
const feature = (slug, lastmod, extra = {}) => ({ key: slug, path: `/${slug}/`, source: `${slug}/index.html`, lastmod, mainClass: 'feature-page', sitemap: true, ...extra });

export const PAGES = [
  { key: 'home', path: '/', source: 'index.html', lastmod: '2026-10-25', mainClass: '', sitemap: true },
  feature('text-compare', '2026-10-19'),
  feature('semantic-diff', '2026-10-19'),
  feature('pdf-compare', '2026-10-19', { ogImage: 'assets/app-preview-pdf.png' }),
  feature('excel-compare', '2026-10-19'),
  feature('word-compare', '2026-10-19', { ogImage: 'assets/app-preview-docx.png' }),
  feature('json-compare', '2026-10-19'),
  feature('yaml-compare', '2026-10-06'),
  feature('xml-compare', '2026-10-19'),
  feature('csv-compare', '2026-10-06'),
  feature('url-compare', '2026-10-19'),
  feature('curl-compare', '2026-10-19'),
  feature('api-compare', '2026-10-19'),
  feature('semantic-search', '2026-10-06'),
  feature('document-compare', '2026-10-06'),
  feature('semantic-document-search', '2026-10-06'),
  feature('diffchecker-alternative', '2026-10-06'),
  { key: 'self-hosted', path: '/self-hosted.html', source: 'self-hosted.html', lastmod: '2026-10-21', mainClass: '', sitemap: true },
  feature('chrome-extension', '2026-10-06'),
  { key: 'desktop', path: '/desktop/', source: 'desktop/index.html', lastmod: '2026-10-25', mainClass: '', sitemap: true },
  { key: 'desktop-download', path: '/desktop/download/', source: 'desktop/download/index.html', lastmod: '2026-10-21', mainClass: '', sitemap: true },
  // Legal pages: English only, not in the sitemap, but they still get the language selector.
  { key: 'privacy', path: '/privacy.html', source: 'privacy.html', mainClass: '', sitemap: false },
  { key: 'terms', path: '/terms.html', source: 'terms.html', mainClass: '', sitemap: false },
];
