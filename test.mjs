// Run after `npm run build`: node test.mjs
import { readFile, access } from 'node:fs/promises';
import assert from 'node:assert/strict';

const read = f => readFile(`dist/${f}`, 'utf8');
const pages = { 'desktop/index.html': 'https://difffind.com/desktop/', 'desktop/download/index.html': 'https://difffind.com/desktop/download/' };
for (const [file, url] of Object.entries(pages)) {
  const html = await read(file);
  assert.ok(html.includes(`<link rel="canonical" href="${url}">`), `${file} canonical`);
  assert.ok(/<title>[^<]+<\/title>/.test(html) && html.includes('name="description"') && html.includes('property="og:title"'), `${file} metadata`);
  assert.ok(html.includes('"@type":"SoftwareApplication"'), `${file} structured data`);
  const ld = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html);
  JSON.parse(ld[1]);
  assert.ok((await read('sitemap.xml')).includes(`<loc>${url}</loc>`), `${file} sitemap`);
}
const dl = await read('desktop/download/index.html');
for (const label of ['Download for macOS — Apple Silicon', 'Download for Windows — 64-bit']) assert.ok(dl.includes(label), label);
assert.ok(!/href="https:\/\/github\.com[^"]*releases/.test(dl), 'no hard-coded release links in HTML');

const js = await readFile('script.js', 'utf8');
assert.ok(js.includes('https://github.com/support-difffind/difffind-support'), 'release repo');
for (const f of ['DiffFind-mac-arm64.dmg', 'DiffFind-windows-x64.exe']) assert.ok(js.includes(f), f);
assert.ok(/available: false/.test(js), 'unpublished assets default to Coming Soon');

const home = await read('index.html');
assert.ok(home.includes('href="/desktop/download/"') && home.includes('Download Desktop App'), 'home desktop CTA');
assert.ok(home.includes('Try DiffFind') && home.includes('data-app-link'), 'web app CTA preserved');
for (const f of ['index.html', 'text-compare/index.html', 'pdf-compare/index.html', 'chrome-extension/index.html']) {
  assert.ok((await read(f)).includes('<a href="/desktop/">Desktop</a>'), `${f} nav`);
}
assert.ok((await read('text-compare/index.html')).includes('href="/desktop/"'), 'comparison page links to desktop');
await access('dist/desktop/download/index.html');
console.log('All desktop website checks passed.');
