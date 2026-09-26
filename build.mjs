import { mkdir, cp, rm, readFile, writeFile } from 'node:fs/promises';
import { minify as minifyHtml } from 'html-minifier-terser';
import { minify as minifyJs } from 'terser';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

// Same flags perfload's own build uses. Comments starting "<!--!" survive
// removeComments (html-minifier-terser's convention for must-keep
// comments, e.g. the license header) — see index.html/privacy.html/terms.html.
const HTML_MINIFY_OPTIONS = {
  collapseWhitespace: true,
  removeComments: true,
  minifyCSS: true,
  minifyJS: true,
};

for (const file of ['index.html', 'privacy.html', 'terms.html', 'self-hosted.html', 'semantic-diff/index.html', 'semantic-search/index.html', 'semantic-find/index.html', 'text-compare/index.html', 'pdf-compare/index.html', 'excel-compare/index.html', 'json-compare/index.html', 'yaml-compare/index.html', 'xml-compare/index.html', 'csv-compare/index.html', 'url-compare/index.html', 'curl-compare/index.html']) {
  const source = await readFile(file, 'utf8');
  const minified = await minifyHtml(source, HTML_MINIFY_OPTIONS);
  await mkdir(`dist/${file.slice(0, file.lastIndexOf('/') + 1)}`, { recursive: true });
  await writeFile(`dist/${file}`, minified);
}

{
  const source = await readFile('script.js', 'utf8');
  // terser's default `comments: 'some'` keeps /*! ... */ blocks (the
  // license header) and drops everything else — matches the HTML pages'
  // removeComments behavior above.
  const result = await minifyJs(source);
  await writeFile('dist/script.js', result.code);
}

// Already hand-minified to one line — passed through as-is rather than
// pulling in a CSS minifier for a file that's already compact.
await cp('styles.css', 'dist/styles.css');
await cp('assets', 'dist/assets', { recursive: true });
await cp('robots.txt', 'dist/robots.txt');
await cp('sitemap.xml', 'dist/sitemap.xml');

console.log('Built static website in dist/');
