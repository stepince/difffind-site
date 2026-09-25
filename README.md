# DiffFind website

A responsive, dependency-free landing page for the DiffFind app in `../mydiffchecker`.

## Preview

```sh
npm run dev
```

Open http://localhost:3000. Set `PORT` to use another port.

## Build and publish

```sh
npm run build
```

Deploy the generated `dist/` directory to any static website host. No backend or API keys are needed for this landing page. The text/JSON preview is an illustrative, interactive example; actual comparisons run in the linked DiffFind app.

Launch buttons use `APP_URL` in `script.js` (`https://app.difffind.com`). If it changes, also update the fallback `data-app-link` URLs in the HTML pages. The developer link opens the app's OpenAPI JSON specification.

Brand assets are cropped from the supplied `ChatGPT Image Sep 19, 2026, 02_56_52 AM.png`: the original wordmark is used in the header/footer and the app icon is used as the favicon. Fonts are loaded from Google Fonts with local sans-serif fallbacks.

## Feature pages

`/text-compare/`, `/semantic-diff/`, `/pdf-compare/`, `/excel-compare/`, `/json-compare/`, `/yaml-compare/`, `/xml-compare/`, `/csv-compare/`, `/url-compare/`, and `/curl-compare/` are static directory-index pages. The local server also accepts each route without a trailing slash. Static hosts should serve directory indexes (and normally redirect to the trailing slash). Canonical URLs use the production domain in `CNAME`; update the feature-page canonical links if that domain changes. Shared styles, navigation behavior, and application links use `styles.css` and `script.js`. No analytics provider is configured.

## Quick text compare (homepage → app handoff)

The homepage has a Before/After text box. On submit, `script.js` gzips `{v:1, before, after}` (falls back to plain base64url without `CompressionStream`), and navigates the current tab to `https://app.difffind.com/#handoff=<gz|raw>.<base64url>`. The text travels in the URL **fragment**, which browsers never send to a server. The app (`applyHandoffFromUrl` in `mydiffchecker/src/api/routes/ui.route.ts`) reads it, removes it from the address bar, fills the inputs and runs a lexical-only comparison without changing the saved analysis-mode preference. Encoded payloads over 60,000 characters are refused on the site with a message. On `localhost`, the handoff targets a local app on port 3222 (`PORT=3222 npx tsx src/config/server.ts` in `mydiffchecker`). Don't add a query-parameter override for the app URL: it would let a crafted link send typed text to another origin.
