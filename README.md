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

`/text-compare/`, `/semantic-diff/`, `/pdf-compare/`, and `/excel-compare/` are static directory-index pages. The local server also accepts each route without a trailing slash. Static hosts should serve directory indexes (and normally redirect to the trailing slash). Canonical URLs use the production domain in `CNAME`; update the feature-page canonical links if that domain changes. Shared styles, navigation behavior, and application links use `styles.css` and `script.js`. No analytics provider is configured.
