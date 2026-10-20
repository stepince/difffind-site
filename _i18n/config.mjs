// Localization settings for the DiffFind marketing site.
//
// To publish a language, add its code to ENABLED once all CORE_PAGES are
// translated (see _i18n/README.md), then run `npm run i18n`. Languages that are
// not in ENABLED get no pages, no hreflang, no sitemap entries and no selector
// entry, even if their content/locale files already exist.

export const SITE = 'https://difffind.com';
export const APP_URL = 'https://app.difffind.com';

// `code` is also the URL prefix (/es/, /pt-br/, ...). `hreflang` is the value
// search engines expect (BCP 47, region capitalised). `ogLocale` feeds og:locale.
export const LANGUAGES = {
  en: { hreflang: 'en', native: 'English', ogLocale: 'en_US' },
  es: { hreflang: 'es', native: 'Español', ogLocale: 'es_ES' },
  'pt-br': { hreflang: 'pt-BR', native: 'Português (Brasil)', ogLocale: 'pt_BR' },
  de: { hreflang: 'de', native: 'Deutsch', ogLocale: 'de_DE' },
  fr: { hreflang: 'fr', native: 'Français', ogLocale: 'fr_FR' },
  ja: { hreflang: 'ja', native: '日本語', ogLocale: 'ja_JP' },
};

// Weekly rollout switch: one new code per week. English is always published.
export const ENABLED = ['es'];

// A language may only be enabled when every one of these pages is translated.
export const CORE_PAGES = ['home', 'semantic-diff', 'url-compare', 'pdf-compare', 'xml-compare', 'word-compare'];

// Optional pages can be translated in any later week by adding a content file.
// Order of the two link lists mirrors the English header menu and footer.
export const MENU_ORDER = ['text-compare', 'semantic-diff', 'semantic-search', 'pdf-compare', 'excel-compare', 'word-compare', 'json-compare', 'yaml-compare', 'xml-compare', 'csv-compare', 'url-compare', 'curl-compare', 'document-compare', 'semantic-document-search', 'api-compare', 'diffchecker-alternative'];
export const FOOTER_ORDER = ['text-compare', 'semantic-diff', 'semantic-search', 'pdf-compare', 'excel-compare', 'word-compare', 'json-compare', 'yaml-compare', 'xml-compare', 'csv-compare', 'url-compare', 'curl-compare', 'api-compare', 'document-compare', 'semantic-document-search', 'diffchecker-alternative', 'chrome-extension', 'desktop'];
