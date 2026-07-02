// Validates that every inline <script> block in every page parses as JavaScript.
// Catches truncated edits, stray template-literal escapes, and merge damage
// without needing a browser.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));

test('repo contains HTML pages', () => {
  assert.ok(pages.length >= 10, `expected 10+ pages, found ${pages.length}`);
});

for (const page of pages) {
  test(`inline scripts parse: ${page}`, () => {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    let blocks = 0;
    while ((m = re.exec(html))) {
      blocks++;
      // new Function() parses (but never runs) the source; a SyntaxError here
      // means the page would fail to load in the browser.
      assert.doesNotThrow(
        () => new Function(m[1]),
        `syntax error in ${page} inline script #${blocks}`
      );
    }
  });
}

for (const file of ['util.js', 'shared.js', 'supabase-sync.js', 'sw.js']) {
  test(`external script parses: ${file}`, () => {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.doesNotThrow(() => new Function(src), `syntax error in ${file}`);
  });
}
