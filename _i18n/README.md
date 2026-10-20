# Localization (i18n) for the marketing site

Static, crawlable pages per language: `/es/`, `/pt-br/`, `/de/`, `/fr/`, `/ja/`. English stays at its existing URLs.
Only the marketing site is localized. The app at `https://app.difffind.com` is English-only and every localized page says so.

## How it works

| File | Role |
| --- | --- |
| `config.mjs` | Languages, **`ENABLED`** (the rollout switch), `CORE_PAGES` (must exist before a language can be enabled) |
| `pages.mjs` | Registry of English pages: URL, source file, sitemap `lastmod` |
| `locales/<lang>.json` | Shared UI strings: nav, footer, tool names, app-is-English note |
| `content/<lang>/<key>.html` | One translated page: a `<!--meta {...}-->` block (title, description, lastmod, ...) followed by the `<main>` body |
| `lib.mjs` / `build.mjs` | Renders pages, hreflang, selector, JSON-LD, sitemap |
| `validate.mjs`, `validate.test.mjs` | Validation and tests proving it catches mistakes |

`npm run i18n` writes: `/<lang>/**/index.html` for enabled languages, the marked blocks in English pages
(`<!--i18n:hreflang-->`, `<!--i18n:selector-->`; do not edit between the markers) and `sitemap.xml`.
GitHub Pages serves the repository root, so **generated files are committed**. `_i18n/` starts with an underscore, so Jekyll does not publish it.

Behavior worth knowing:
- Content links are written as English paths (`/pdf-compare/`, `/#features`). The build points them at the localized page when one is published, and leaves them on the English page otherwise, so no link breaks while a language is partly translated.
- The selector goes to the same page when it is translated, otherwise to that language's homepage. It is a plain `<details>` of links: no JS, no cookie, no redirect.
- There is no redirect by browser language or location anywhere (the validator fails the build if `script.js` or a page reads `navigator.language`, etc.).
- `hreflang` (with `x-default` -> English), canonicals, `og:locale`, JSON-LD and sitemap `xhtml:link` alternates are generated only for pages that exist.
- Dev: `npm run dev` serves `/es/...`. Production check: `npm test`.

## Publishing one new language per week

Example for German (`de`). Nothing outside these steps needs to change.

1. **Translate the locale**: copy `locales/es.json` to `locales/de.json` and translate every value (keep keys, keep the `{{`-free HTML in `relatedTools`).
2. **Translate the six core pages**: for each of `home, semantic-diff, url-compare, pdf-compare, xml-compare, word-compare`, copy `content/es/<key>.html` to `content/de/<key>.html` and translate.
   - Keep: HTML structure, `id`s, `{{brand}}`, `data-app-link` / `data-app-input` attributes, `https://app.difffind.com/...` URLs, internal English hrefs, code samples' technical tokens (`cURL`, `JSON`, `POST /v1/compare`, field names `before`/`after`).
   - Translate: meta `title` (<=70 chars), `description` (70-170 chars), `appName`, `breadcrumb`, headings, body, `alt` text, form placeholders and the `data-msg-*` / `data-example-*` strings, the `url-compare` inline script messages.
   - Set `lastmod` to the publish date.
   - Have a native speaker review; the validator checks structure and obvious untranslated text, not quality.
3. **Optional pages** (any other key in `pages.mjs`, e.g. `text-compare`): add `content/de/<key>.html`. Same-week or later; no config change.
4. **Enable**: in `config.mjs` set `ENABLED = ['es', 'de']`.
5. `npm run i18n && npm test`. Fix anything the validator reports.
6. Review `/de/` locally (`npm run dev`), commit the generated `de/`, English page edits and `sitemap.xml`, push. Submit the new sitemap in Search Console / Bing if desired (`npm run indexnow` is unchanged).

Languages not in `ENABLED` produce nothing, even if their files are half-written, so work in progress is never published. The validator also fails if a non-enabled language directory exists.

Language notes: `pt-br` uses hreflang `pt-BR`; check `ja` typography (font stack in `styles.css`) before enabling.

## When English content changes

Bump the page's `lastmod` in `pages.mjs`. If the structure changed, the validator reports the translations whose structure no longer matches English until each is updated.

## What the validator checks

Generated files up to date; one correct canonical per page; hreflang sets exact, self-referencing, reciprocal, with `x-default` English; no hreflang for unpublished pages; sitemap equals the published set and agrees with each page's hreflang; unpublished languages absent; internal links, anchors and assets resolve; app links stay on `https://app.difffind.com/` and are not localized; translated pages match English structure (sections, headings, list items, FAQ items, ids, links), have translated titles/headings, no placeholders, and carry the app-is-English note; no automatic language redirects; selector targets are correct.
