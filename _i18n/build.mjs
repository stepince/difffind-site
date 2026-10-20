// Usage:
//   node _i18n/build.mjs           regenerate localized pages, English marker blocks and sitemap.xml
//   node _i18n/build.mjs --check   exit 1 if any generated file is stale (used by `npm test`)
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { generate, makeCtx } from './lib.mjs';

const ctx = makeCtx();
const files = generate(ctx);
const stale = [...files].filter(([rel, content]) => !existsSync(resolve(ctx.root, rel)) || readFileSync(resolve(ctx.root, rel), 'utf8') !== content);

if (process.argv.includes('--check')) {
  if (stale.length) {
    console.error(`Generated i18n files are stale. Run \`npm run i18n\`:\n${stale.map(([rel]) => '  ' + rel).join('\n')}`);
    process.exit(1);
  }
  console.log('i18n generated files are up to date.');
} else {
  for (const [rel, content] of stale) {
    mkdirSync(dirname(resolve(ctx.root, rel)), { recursive: true });
    writeFileSync(resolve(ctx.root, rel), content);
  }
  console.log(stale.length ? `Wrote ${stale.length} file(s):\n${stale.map(([rel]) => '  ' + rel).join('\n')}` : 'Nothing to update.');
}
