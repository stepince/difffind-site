// Copyright (c) 2026 Stephen Ince
// Licensed under custom license. See LICENSE file.
// Submits every URL in sitemap.xml to IndexNow (Bing, Yandex, etc.).
// Run after the site is deployed: the key file must already be live at
// keyLocation or the submission is rejected. `--dry-run` prints the payload.
import { readFile } from 'node:fs/promises';

const HOST = 'difffind.com';
const KEY = '426b9da4c128402783383caa54679d03';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const sitemap = await readFile('sitemap.xml', 'utf8');
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
const payload = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList };

if (process.argv.includes('--dry-run')) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const keyCheck = await fetch(KEY_LOCATION);
if (!keyCheck.ok || (await keyCheck.text()).trim() !== KEY) {
  console.error(`Key file not live at ${KEY_LOCATION} (HTTP ${keyCheck.status}). Deploy first.`);
  process.exit(1);
}

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload),
});
console.log(`IndexNow: HTTP ${response.status} for ${urlList.length} URLs`);
if (!response.ok) process.exit(1);
