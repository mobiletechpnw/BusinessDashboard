// End-to-end page-load suite.
//
// Serves the repo over a throwaway static server, then loads every page in
// headless Chromium as a logged-in user (faked session in localStorage) and
// fails on any uncaught page error, non-network console error, or blank body.
// Runs the full matrix: {desktop, mobile} viewports × {fresh, seeded} data.
//
// External requests (Supabase) are aborted — the app must tolerate offline.
// Screenshots land in tests/screenshots/<profile>/ for artifact upload.
//
// Usage: node tests/e2e-pages.js

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(__dirname, 'screenshots');
const PORT = 8619;
const BASE = `http://127.0.0.1:${PORT}/`;

const PAGES = [
  'index.html',
  'vault-pine-collective.html',
  'analytics.html',
  'expenses.html',
  'goals-dashboard.html',
  'guru.html',
  'production.html',
  'review.html',
  'content.html',
  'growth.html',
  'events.html',
  'inventory.html',
  'vendor-calendar.html',
  'event-signup.html',
];

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      const rel = urlPath === '/' ? 'index.html' : urlPath.slice(1);
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(PORT, '127.0.0.1', () => resolve(srv));
  });
}

// Small fixture: enough data to exercise charts, insights, and the events
// matrix without depending on any seed data baked into the app itself.
function seedData(monthOffsets) {
  const mk = (off, day) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + off);
    d.setDate(day);
    return d.toISOString().slice(0, 10);
  };
  return {
    vp_orders_v2: JSON.stringify([
      {
        id: 'o1',
        date: mk(-2, 5),
        customer: 'Alice',
        product: 'Test Set',
        sets: 1,
        salePrice: 90,
        cogs: 21,
        referredBy: '',
        notes: '',
        payStatus: 'paid',
        fulfillStatus: 'completed',
      },
      {
        id: 'o2',
        date: mk(-2, 18),
        customer: 'Bob',
        product: 'Test Set',
        sets: 2,
        salePrice: 170,
        cogs: 42,
        referredBy: 'Alice',
        notes: '',
        payStatus: 'paid',
        fulfillStatus: 'completed',
      },
      {
        id: 'o3',
        date: mk(-1, 9),
        customer: 'Cara',
        product: 'Test Set',
        sets: 1,
        salePrice: 95,
        cogs: 21,
        referredBy: 'Alice',
        notes: '',
        payStatus: 'unpaid',
        fulfillStatus: 'in_progress',
      },
      {
        id: 'o4',
        date: mk(-1, 21),
        customer: 'Alice',
        product: 'Test Set',
        sets: 3,
        salePrice: 260,
        cogs: 63,
        referredBy: '',
        notes: '',
        payStatus: 'paid',
        fulfillStatus: 'completed',
      },
      {
        id: 'o5',
        date: mk(0, 1),
        customer: 'Dan',
        product: 'Test Set',
        sets: 1,
        salePrice: 100,
        cogs: 21,
        referredBy: 'Bob',
        notes: '',
        payStatus: 'partial',
        fulfillStatus: 'in_progress',
      },
    ]),
    riser_filament_v1: JSON.stringify([
      { id: 'tf1', date: mk(-2, 3), qty: 4, total: 52, brand: 'TestBrand', notes: 'PLA' },
      { id: 'tf2', date: mk(-1, 12), qty: 4, total: 46, brand: 'TestBrand', notes: 'PLA' },
    ]),
    vpc_events_v1: JSON.stringify([
      { id: 'e1', name: 'Test Con', date: mk(0, 20), venue: 'Hall A', tablePrice: 60 },
    ]),
    vpc_vendors_v1: JSON.stringify([{ id: 'v1', name: 'Vendor One', contact: '' }]),
    vpc_tables_v1: JSON.stringify([
      { id: 't1', eventId: 'e1', vendorId: 'v1', price: 100, qty: 2, paid: true },
    ]),
    vpc_card_inventory_v1: JSON.stringify([
      {
        id: 'i1',
        name: 'Charizard ex 199/165',
        cat: 'singles',
        qty: 2,
        cost: 80,
        value: 120,
        notes: 'NM',
      },
      { id: 'i2', name: 'PSA 10 Pikachu', cat: 'slabs', qty: 1, cost: 150, value: 260, notes: '' },
      {
        id: 'i3',
        name: 'Surging Sparks ETB',
        cat: 'sealed',
        qty: 3,
        cost: 45,
        value: 65,
        notes: '',
      },
    ]),
    vpc_growth_v1: JSON.stringify({
      handle: '@vaultpine',
      goal: 1000,
      endpoint: '',
      snapshots: [
        {
          id: 'g1',
          date: mk(-2, 1),
          followers: 120,
          following: 180,
          posts: 20,
          reach: 400,
          note: '',
        },
        {
          id: 'g2',
          date: mk(-1, 1),
          followers: 210,
          following: 190,
          posts: 28,
          reach: 900,
          note: 'Reel hit Explore',
        },
        {
          id: 'g3',
          date: mk(0, 1),
          followers: 340,
          following: 205,
          posts: 36,
          reach: 1500,
          note: '',
        },
      ],
    }),
  };
}

// Explicit empty state: the storage keys exist but hold no records, so the
// app's first-run seeding must NOT kick in. Exercises every empty-data guard
// (charts, KPIs, insights) — the state a user reaches by deleting everything.
function emptyData() {
  return {
    vp_orders_v2: '[]',
    riser_filament_v1: '[]',
    riser_filament_seed_migrated_v1: '1',
  };
}

// Console noise that is EXPECTED because we abort all external requests.
function isOfflineNoise(text) {
  return /Failed to load resource|net::ERR_FAILED|ERR_INTERNET_DISCONNECTED/i.test(text);
}

async function runProfile(browser, { name, viewport, mobile, seeded }) {
  const failures = [];
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    serviceWorkers: 'block',
  });
  await ctx.route(
    (u) => !u.href.startsWith(BASE),
    (r) => r.abort()
  );
  await ctx.addInitScript(
    (seed) => {
      localStorage.setItem(
        'vpc_auth_session',
        JSON.stringify({
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          expires_at: Date.now() + 86400000,
          user: { id: 'test-user', email: 'test@example.com' },
        })
      );
      if (seed) for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
    },
    seeded === 'empty' ? emptyData() : seeded ? seedData() : null
  );

  const dir = path.join(SHOTS, name);
  fs.mkdirSync(dir, { recursive: true });

  for (const pageName of PAGES) {
    const pg = await ctx.newPage();
    const errs = [];
    pg.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
    pg.on('console', (m) => {
      if (m.type() === 'error' && !isOfflineNoise(m.text()))
        errs.push(`console: ${m.text().slice(0, 160)}`);
    });
    try {
      await pg.goto(BASE + pageName, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await pg.waitForTimeout(700);
      const textLen = await pg.evaluate(() => document.body.innerText.trim().length);
      if (textLen < 40) errs.push(`blank body (innerText length ${textLen})`);
      await pg.screenshot({ path: path.join(dir, pageName.replace('.html', '.png')) });
    } catch (e) {
      errs.push(`navigation: ${e.message.split('\n')[0]}`);
    }
    for (const e of errs) failures.push(`[${name}] ${pageName}: ${e}`);
    await pg.close();
  }

  // Sales Hub: every tab must activate its panel without errors.
  {
    const pg = await ctx.newPage();
    const errs = [];
    pg.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
    await pg.goto(BASE + 'vault-pine-collective.html', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await pg.waitForTimeout(500);
    for (const tab of ['overview', 'orders', 'customers', 'projections', 'insights', 'filament']) {
      await pg.click(`.tab[data-tab="${tab}"]`);
      await pg.waitForTimeout(250);
      const visible = await pg.evaluate(
        (t) => document.getElementById('panel-' + t)?.offsetParent !== null,
        tab
      );
      if (!visible) errs.push(`tab "${tab}": panel not visible after click`);
      await pg.screenshot({ path: path.join(dir, `vpc-tab-${tab}.png`) });
    }
    for (const e of errs) failures.push(`[${name}] sales-hub tabs: ${e}`);
    await pg.close();
  }

  // Custom categories: create one from the nav, confirm its tracker renders,
  // then delete it — the whole lifecycle must produce no page errors.
  {
    const pg = await ctx.newPage();
    const errs = [];
    pg.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
    pg.on('dialog', (d) => d.accept());
    await pg.goto(BASE + 'vault-pine-collective.html', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    // The floating Business Sensei panel slides in on a 3.5s timer and can
    // sit over modal buttons, intercepting clicks — dismiss it for today
    // (same switch its "Don't show today" button flips) before loading.
    await pg.addInitScript(() => {
      localStorage.setItem('vpc_sensei_dismissed_' + new Date().toDateString(), '1');
    });
    await pg.reload({ waitUntil: 'domcontentloaded' });
    await pg.waitForTimeout(500);
    await pg.click('.main-tab[data-action="newcat"]');
    await pg.fill('#cmName', 'E2E Widgets');
    await pg.fill('#cmUnit', 'widget');
    await pg.click('#cmSave');
    await pg.waitForTimeout(300);
    const created = await pg.evaluate(
      () =>
        !!document.querySelector('.main-tab[data-cat="e2ewidgets"]') &&
        document.getElementById('section-cat-e2ewidgets')?.classList.contains('active')
    );
    if (!created) errs.push('category tab/section not created');
    await pg.screenshot({ path: path.join(dir, 'vpc-custom-category.png') });
    await pg.evaluate(() => openCatModal('e2ewidgets'));
    await pg.waitForTimeout(200);
    await pg.click('#cmDelete');
    await pg.waitForTimeout(300);
    const deleted = await pg.evaluate(
      () => !document.querySelector('.main-tab[data-cat="e2ewidgets"]')
    );
    if (!deleted) errs.push('category not deleted');
    for (const e of errs) failures.push(`[${name}] custom category: ${e}`);
    await pg.close();
  }

  // Events: ROI tab must be visible; empty profile must show the empty state.
  {
    const pg = await ctx.newPage();
    const errs = [];
    pg.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
    await pg.goto(BASE + 'events.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await pg.waitForTimeout(500);
    if (!seeded) {
      const emptyVisible = await pg.evaluate(
        () => document.getElementById('empty-state')?.offsetParent !== null
      );
      if (!emptyVisible) errs.push('empty state not visible with no data');
    }
    await pg.click('.ev-tab[data-tab="roi"]');
    await pg.waitForTimeout(300);
    const roiVisible = await pg.evaluate(
      () => document.getElementById('panel-roi')?.offsetParent !== null
    );
    if (!roiVisible) errs.push('ROI panel not visible after clicking its tab');
    for (const e of errs) failures.push(`[${name}] events: ${e}`);
    await pg.close();
  }

  // Inventory: every category filter must re-render without errors, and the
  // seeded profile must show all three seeded items under "All".
  {
    const pg = await ctx.newPage();
    const errs = [];
    pg.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
    await pg.goto(BASE + 'inventory.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await pg.waitForTimeout(400);
    for (const cat of ['singles', 'slabs', 'sealed', 'all']) {
      await pg.click(`.filter-pill[data-cat="${cat}"]`);
      await pg.waitForTimeout(150);
    }
    if (seeded === true) {
      const rows = await pg.evaluate(() => document.querySelectorAll('table.inv tbody tr').length);
      if (rows !== 3) errs.push(`expected 3 seeded inventory rows, saw ${rows}`);
    }
    await pg.screenshot({ path: path.join(dir, 'inventory-filters.png') });
    for (const e of errs) failures.push(`[${name}] inventory: ${e}`);
    await pg.close();
  }

  await ctx.close();
  return failures;
}

// Regression: logging an inventory value while the initial cloud pull is still
// in flight must NOT be lost. The pull is mocked to be slow and to carry the
// pre-save cloud state; the just-logged value has to survive the landing pull
// AND get pushed to the cloud. Guards the supabase-sync write-during-pull race
// that made "I logged a value and it didn't save" happen.
async function runSyncRaceTest(browser) {
  const failures = [];
  const SUPA = 'https://cqvnspbdfmgwcutezmqe.supabase.co';
  const today = new Date().toLocaleDateString('en-CA');
  // Cloud already holds a DIFFERENT snapshot for today, so a naive pull would
  // stomp the local edit back to $800.
  const cloud = {
    vpc_inv_snapshots_v1: {
      value: [
        {
          id: 'cloud1',
          date: today,
          label: 'from cloud',
          singles: { value: 800, cost: 0 },
          slabs: { value: 0, cost: 0 },
          sealed: { value: 0, cost: 0 },
          value: 800,
          cost: 0,
          units: 0,
          taken: new Date().toISOString(),
        },
      ],
      updated_at: new Date().toISOString(),
    },
  };
  let pushedSnapshots = null;

  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  await ctx.route(
    (u) => u.href.startsWith(SUPA),
    async (route) => {
      const req = route.request();
      if (req.url().includes('/auth/v1/'))
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      if (req.url().includes('/rest/v1/app_data')) {
        if (req.method() === 'GET') {
          // Snapshot the payload NOW (pre-save), then stall — the pull must land
          // carrying stale cloud data, exactly as a slow mobile pull would.
          const body = JSON.stringify(
            Object.entries(cloud).map(([key, v]) => ({
              key,
              value: v.value,
              updated_at: v.updated_at,
            }))
          );
          await new Promise((r) => setTimeout(r, 1200));
          return route.fulfill({ status: 200, contentType: 'application/json', body });
        }
        if (req.method() === 'POST') {
          const rec = JSON.parse(req.postData() || '{}');
          cloud[rec.key] = { value: rec.value, updated_at: rec.updated_at };
          if (rec.key === 'vpc_inv_snapshots_v1') pushedSnapshots = rec.value;
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([rec]),
          });
        }
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
  );
  await ctx.addInitScript(() => {
    localStorage.setItem(
      'vpc_auth_session',
      JSON.stringify({
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_at: Date.now() + 86400000,
        user: { id: 'test-user', email: 'test@example.com' },
      })
    );
  });

  const errs = [];
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  pg.on('dialog', (d) => d.accept());
  await pg.goto(BASE + 'inventory.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  // Act WHILE the initial pull is still in flight: log a $1110 value.
  await pg.waitForTimeout(150);
  await pg.evaluate(() => openSnapModal());
  await pg.fill('#sn-singles', '999');
  await pg.fill('#sn-slabs', '111');
  await pg.fill('#sn-sealed', '0');
  await pg.click('button.btn-primary:has-text("Save")');
  // Let the slow pull land (~1200ms) and the debounced push fire (~800ms).
  await pg.waitForTimeout(1800);
  const totals = await pg.evaluate(() =>
    JSON.parse(localStorage.getItem('vpc_inv_snapshots_v1') || '[]').map((s) => s.value)
  );
  if (!totals.includes(1110))
    errs.push(`logged value lost after pull landed (local totals: ${JSON.stringify(totals)})`);
  if (!pushedSnapshots || !pushedSnapshots.some((s) => s.value === 1110))
    errs.push(
      `logged value never pushed to cloud (pushed: ${JSON.stringify(
        (pushedSnapshots || []).map((s) => s.value)
      )})`
    );
  for (const e of errs) failures.push(`[sync-race] inventory snapshot: ${e}`);
  await pg.close();
  await ctx.close();
  return failures;
}

(async () => {
  fs.rmSync(SHOTS, { recursive: true, force: true });
  const server = await startServer();
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });

  const profiles = [
    { name: 'desktop-fresh', viewport: { width: 1360, height: 900 }, mobile: false, seeded: false },
    { name: 'desktop-seeded', viewport: { width: 1360, height: 900 }, mobile: false, seeded: true },
    {
      name: 'desktop-empty',
      viewport: { width: 1360, height: 900 },
      mobile: false,
      seeded: 'empty',
    },
    { name: 'mobile-fresh', viewport: { width: 375, height: 812 }, mobile: true, seeded: false },
    { name: 'mobile-seeded', viewport: { width: 375, height: 812 }, mobile: true, seeded: true },
  ];

  let allFailures = [];
  for (const profile of profiles) {
    const failures = await runProfile(browser, profile);
    console.log(`${failures.length ? '✗' : '✓'} ${profile.name} (${failures.length} failure(s))`);
    allFailures = allFailures.concat(failures);
  }

  const raceFailures = await runSyncRaceTest(browser);
  console.log(
    `${raceFailures.length ? '✗' : '✓'} sync-write-race (${raceFailures.length} failure(s))`
  );
  allFailures = allFailures.concat(raceFailures);

  await browser.close();
  server.close();

  if (allFailures.length) {
    console.error(`\nFAILURES (${allFailures.length}):`);
    for (const f of allFailures) console.error('  ' + f);
    process.exit(1);
  }
  console.log('\nAll pages clean across all profiles.');
})();
