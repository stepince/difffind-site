// Copyright (c) 2026 Stephen Ince
// Licensed under custom license. See LICENSE file.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
const root = resolve('.');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml' };
createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (/^\/semantic-find(?:\/|\/index\.html)?$/.test(path)) {
      res.writeHead(301, { Location: '/semantic-search/' }).end(); return;
    }
    const featureRoute = /^\/(semantic-diff|semantic-search|text-compare|pdf-compare|excel-compare|word-compare|json-compare|yaml-compare|xml-compare|csv-compare|url-compare|curl-compare|document-compare|semantic-document-search|diffchecker-alternative)(?:\/|\/index\.html)?$/.exec(path);
    const file = resolve(root, '.' + (featureRoute ? `/${featureRoute[1]}/index.html` : path === '/' ? '/index.html' : path));
    if (!file.startsWith(root + sep) || !['index.html', 'privacy.html', 'terms.html', 'self-hosted.html', 'semantic-diff/index.html', 'semantic-search/index.html', 'text-compare/index.html', 'pdf-compare/index.html', 'excel-compare/index.html', 'word-compare/index.html', 'json-compare/index.html', 'yaml-compare/index.html', 'xml-compare/index.html', 'csv-compare/index.html', 'url-compare/index.html', 'curl-compare/index.html', 'document-compare/index.html', 'semantic-document-search/index.html', 'diffchecker-alternative/index.html', 'styles.css', 'script.js', 'robots.txt', 'favicon.ico', 'sitemap.xml', '426b9da4c128402783383caa54679d03.txt'].includes(file.slice(root.length + 1)) && !file.startsWith(resolve(root, 'assets') + sep)) {
      res.writeHead(404).end('Not found'); return;
    }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }).end(data);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(process.env.PORT || 3000, '127.0.0.1', () => console.log(`DiffFind website: http://localhost:${process.env.PORT || 3000}`));
