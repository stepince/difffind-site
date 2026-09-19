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

Launch buttons currently point to `https://mydiffchecker.fly.dev`, based on the app's `fly.toml`. Update `APP_URL` in `script.js` and the fallback links in `index.html` if using a custom domain. The developer link opens the app's OpenAPI JSON specification.

Brand assets are cropped from the supplied `ChatGPT Image Sep 19, 2026, 02_56_52 AM.png`: the original wordmark is used in the header/footer and the app icon is used as the favicon. Fonts are loaded from Google Fonts with local sans-serif fallbacks.
