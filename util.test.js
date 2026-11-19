'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const U = require('./util.js');

test('money rounds to cents and kills float drift', () => {
  assert.strictEqual(U.money(0.1 + 0.2), 0.3);
  assert.strictEqual(U.money(1.005), 1.01);
  assert.strictEqual(U.money('12.349'), 12.35);
  assert.strictEqual(U.money(undefined), 0);
  assert.strictEqual(U.money('not a number'), 0);
});

test('sumMoney totals are cent-accurate', () => {
  assert.strictEqual(U.sumMoney([0.1, 0.2]), 0.3);
  assert.strictEqual(
    U.sumMoney([{ p: 1.1 }, { p: 2.2 }], (x) => x.p),
    3.3
  );
  assert.strictEqual(U.sumMoney([]), 0);
});

test('fmtMoney formats with two decimals and a $', () => {
  assert.strictEqual(U.fmtMoney(1234.5), '$1,234.50');
  assert.strictEqual(U.fmtMoney(0), '$0.00');
  assert.strictEqual(U.fmtMoney(0.1 + 0.2), '$0.30');
});

test('fmtDate / fmtDateLong are stable and avoid off-by-one', () => {
  assert.strictEqual(U.fmtDate('2026-06-29'), 'Jun 29, 2026');
  assert.strictEqual(U.fmtDate(''), '');
  assert.strictEqual(U.fmtDateLong('2026-06-29'), 'Monday, June 29, 2026');
});

test('esc neutralizes element-context HTML', () => {
  assert.strictEqual(U.esc('<script>'), '&lt;script&gt;');
  assert.strictEqual(U.esc('a & b'), 'a &amp; b');
  assert.strictEqual(U.esc(null), '');
});

test('escAttr also escapes quotes for attribute context', () => {
  assert.strictEqual(U.escAttr('" onerror="x'), '&quot; onerror=&quot;x');
  assert.strictEqual(U.escAttr("it's"), 'it&#39;s');
});

test('KEYS registry pins the canonical storage key names', () => {
  // Events is the one pages historically disagreed on — lock it explicitly.
  assert.strictEqual(U.KEYS.events, 'vpc_events_v1');
  assert.strictEqual(U.KEYS.orders, 'vp_orders_v2');
  // Renaming a value silently orphans real users' localStorage data, so the
  // registry is frozen: writes to it must be no-ops, not accidental edits.
  assert.ok(Object.isFrozen(U.KEYS));
});

test('normalizeEvent mirrors start<->date without dropping fields', () => {
  // Sales-Hub-shaped event (has start, no date) gains a matching date.
  assert.deepStrictEqual(
    U.normalizeEvent({ id: '1', name: 'A', start: '2026-07-01', boothCost: 50 }),
    {
      id: '1',
      name: 'A',
      start: '2026-07-01',
      date: '2026-07-01',
      boothCost: 50,
    }
  );
  // Events-page-shaped event (has date, no start) gains a matching start.
  assert.deepStrictEqual(
    U.normalizeEvent({ id: '2', name: 'B', date: '2026-07-02', approved: true }),
    {
      id: '2',
      name: 'B',
      date: '2026-07-02',
      start: '2026-07-02',
      approved: true,
    }
  );
});

test('mergeEvents unions both stores, de-dupes by id, loses no field', () => {
  const canonical = [{ id: 'a', name: 'Expo', date: '2026-07-10', approved: true }];
  const legacy = [
    { id: 'a', name: 'Expo', start: '2026-07-10', boothCost: 200, notes: 'corner' }, // same id, different fields
    { id: 'b', name: 'Fair', start: '2026-07-20', boothCost: 75 }, // legacy-only
  ];
  const merged = U.mergeEvents(canonical, legacy);
  assert.strictEqual(merged.length, 2); // de-duped by id, both events kept
  const a = merged.find((e) => e.id === 'a');
  // Collision keeps fields from BOTH stores + both date fields.
  assert.strictEqual(a.approved, true); // from canonical
  assert.strictEqual(a.boothCost, 200); // from legacy
  assert.strictEqual(a.notes, 'corner'); // from legacy
  assert.strictEqual(a.start, '2026-07-10');
  assert.strictEqual(a.date, '2026-07-10');
  const b = merged.find((e) => e.id === 'b'); // legacy-only survives with a date
  assert.strictEqual(b.date, '2026-07-20');
});

test('mergeEvents tolerates empty / malformed input', () => {
  assert.deepStrictEqual(U.mergeEvents(null, null), []);
  assert.deepStrictEqual(U.mergeEvents(undefined, [{ id: 'x', start: '2026-01-01' }]).length, 1);
});

test('parseClaimQty reads table claims from sign-up prefs', () => {
  assert.strictEqual(U.parseClaimQty('1 table'), 1);
  assert.strictEqual(U.parseClaimQty('2 tables'), 2);
  assert.strictEqual(U.parseClaimQty('½ table'), 0.5);
  assert.strictEqual(U.parseClaimQty('half a table'), 0.5);
  assert.strictEqual(U.parseClaimQty('1/2 table'), 0.5);
  assert.strictEqual(U.parseClaimQty('1.5'), 1.5);
  assert.strictEqual(U.parseClaimQty('  3  '), 3);
});

test('parseClaimQty rejects unreadable or absurd claims', () => {
  assert.strictEqual(U.parseClaimQty('corner spot please'), null);
  assert.strictEqual(U.parseClaimQty(''), null);
  assert.strictEqual(U.parseClaimQty(null), null);
  assert.strictEqual(U.parseClaimQty('call me at 5551234567'), null);
  assert.strictEqual(U.parseClaimQty('0'), null);
});

// Fake localStorage for the custom-category helpers.
function fakeStore(data) {
  const m = new Map(Object.entries(data).map(([k, v]) => [k, JSON.stringify(v)]));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null) };
}

test('customCatTotals computes weighted-avg COGS and stock per category', () => {
  const store = fakeStore({
    [U.KEYS.categories]: [{ id: 'stickers', name: 'Stickers', unit: 'sticker' }],
    [U.KEYS.catItems]: [
      { id: 'pika', catId: 'stickers', name: 'Pikachu', purchased: 10, cost: 5 },
      { id: 'mew', catId: 'stickers', name: 'Mew', purchased: 10, cost: 15 },
      { id: 'zzz', catId: 'other', name: 'Elsewhere', purchased: 99, cost: 999 },
    ],
    [U.KEYS.catRestocks]: [{ id: 'r1', catId: 'stickers', itemId: 'pika', qty: 10, cost: 20 }],
    [U.KEYS.catSales]: [
      {
        id: 's1',
        catId: 'stickers',
        qty: 3,
        revenue: 12,
        items: ['pika'],
        itemQty: { pika: 3 },
      },
    ],
  });
  const [t] = U.customCatTotals(store);
  assert.strictEqual(t.cat.id, 'stickers');
  assert.strictEqual(t.units, 30); // 10 + 10 purchased + 10 restocked
  assert.strictEqual(t.cost, 40); // 5 + 15 + 20
  assert.strictEqual(t.avgCost, 40 / 30);
  assert.strictEqual(t.revenue, 12);
  assert.strictEqual(t.cogs, 4); // 3 sold × $1.333…
  assert.strictEqual(t.profit, 8);
  assert.strictEqual(t.left, 27);
  const pika = t.stock.find((i) => i.id === 'pika');
  assert.deepStrictEqual(pika, { id: 'pika', name: 'Pikachu', effective: 20, sold: 3, left: 17 });
  // Mew has 10 left → not low; nothing in this category is low on stock.
  assert.deepStrictEqual(t.low, []);
});

test('customCatTotals flags low stock and tolerates missing costs', () => {
  const store = fakeStore({
    [U.KEYS.categories]: [{ id: 'c1', name: 'Patches' }],
    [U.KEYS.catItems]: [{ id: 'a', catId: 'c1', name: 'A', purchased: 4 }], // no cost
    [U.KEYS.catRestocks]: [],
    [U.KEYS.catSales]: [
      { id: 's', catId: 'c1', qty: 2, revenue: 10, items: ['a'], itemQty: { a: 2 } },
    ],
  });
  const [t] = U.customCatTotals(store);
  assert.strictEqual(t.cost, 0); // unknown batch cost adds $0, never NaN
  assert.strictEqual(t.cogs, 0);
  assert.strictEqual(t.profit, 10);
  assert.deepStrictEqual(t.low, [{ id: 'a', name: 'A', effective: 4, sold: 2, left: 2 }]);
});

test('customCatTotals is safe on empty or corrupt stores', () => {
  assert.deepStrictEqual(U.customCatTotals(fakeStore({})), []);
  const corrupt = { getItem: () => '{not json' };
  assert.deepStrictEqual(U.customCatTotals(corrupt), []);
});

test('salesInPeriod counts every product line for the month and all time', () => {
  const store = fakeStore({
    [U.KEYS.orders]: [
      { date: '2026-11-02', salePrice: 90 },
      { date: '2026-10-30', salePrice: 100 },
    ],
    [U.KEYS.jetTags]: [{ date: '2026-11-05', revenue: 12.5 }],
    [U.KEYS.pins]: [{ date: '2026-11-06', revenue: 8 }],
    [U.KEYS.categories]: [{ id: 'stickers', name: 'Stickers' }],
    [U.KEYS.catSales]: [
      { date: '2026-11-07', catId: 'stickers', revenue: 0.1 },
      { date: '2026-11-07', catId: 'deleted', revenue: 999 },
    ],
  });
  assert.deepStrictEqual(U.salesInPeriod('2026-11', store), { revenue: 110.6, count: 4 });
  assert.deepStrictEqual(U.salesInPeriod('', store), { revenue: 210.6, count: 5 });
  assert.deepStrictEqual(U.salesInPeriod('2026-12', store), { revenue: 0, count: 0 });
});

// A store that can also be written to (seedOrders writes).
function writableStore(data = {}) {
  const m = new Map(Object.entries(data).map(([k, v]) => [k, JSON.stringify(v)]));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
  };
}

test('orderList shows the built-in history only when a device has no orders yet', () => {
  assert.strictEqual(U.HISTORICAL_ORDERS.length, 47);
  assert.strictEqual(U.orderList(fakeStore({})).length, 47);
  assert.deepStrictEqual(U.orderList(fakeStore({ [U.KEYS.orders]: [] })), []);
  const mine = [{ id: 'x', date: '2026-11-01', salePrice: 5 }];
  assert.deepStrictEqual(U.orderList(fakeStore({ [U.KEYS.orders]: mine })), mine);
  // A first visit to Home counts the history instead of showing $0.
  const all = U.salesInPeriod('', fakeStore({}));
  assert.strictEqual(all.count, 47);
  assert.ok(all.revenue > 4000);
});

test('seedOrders writes the history once, stamped older than any cloud copy', () => {
  const store = writableStore();
  assert.strictEqual(U.seedOrders(store), true);
  assert.strictEqual(JSON.parse(store.getItem(U.KEYS.orders)).length, 47);
  assert.strictEqual(store.getItem(U.KEYS.orders + '__ts'), '1');
  // Never overwrites an existing store.
  assert.strictEqual(U.seedOrders(store), false);
  // Legacy orders exist only on this device, so they keep the normal stamp.
  const legacy = writableStore({
    riser_orders_v1: [{ id: 'old', date: '2025-01-01', salePrice: 1 }],
  });
  U.seedOrders(legacy);
  assert.strictEqual(JSON.parse(legacy.getItem(U.KEYS.orders)).length, 48);
  assert.strictEqual(legacy.getItem(U.KEYS.orders + '__ts'), null);
});

test('salesBetween sums every product line inside an inclusive date range', () => {
  const store = fakeStore({
    [U.KEYS.orders]: [
      { date: '2026-10-01', salePrice: 40 },
      { date: '2026-10-18', salePrice: 60 },
      { date: '2026-10-19', salePrice: 500 },
    ],
    [U.KEYS.pins]: [{ date: '2026-10-05', revenue: 8 }],
  });
  assert.deepStrictEqual(U.salesBetween('2026-10-01', '2026-10-18', store), {
    revenue: 108,
    count: 3,
  });
  assert.deepStrictEqual(U.salesBetween('2026-11-01', '2026-11-30', store), {
    revenue: 0,
    count: 0,
  });
});

test('addDays and daysBetween cross months, years and daylight saving', () => {
  assert.strictEqual(U.addDays('2026-11-19', -6), '2026-11-13');
  assert.strictEqual(U.addDays('2026-01-01', -1), '2025-12-31');
  assert.strictEqual(U.addDays('2028-02-28', 1), '2028-02-29');
  assert.strictEqual(U.addDays('2026-03-07', 2), '2026-03-09');
  assert.strictEqual(U.daysBetween('2026-11-13', '2026-11-19'), 6);
  assert.strictEqual(U.daysBetween('2026-03-07', '2026-03-09'), 2);
  assert.strictEqual(U.daysBetween('2026-11-19', '2026-11-13'), -6);
});

test('rangePeriods counts back from today and finds the period before', () => {
  assert.deepStrictEqual(U.rangePeriods('7d', '2026-11-19'), {
    from: '2026-11-13',
    to: '2026-11-19',
    prev: { from: '2026-11-06', to: '2026-11-12' },
    before: 'the 7 days before',
  });
  const m30 = U.rangePeriods('30d', '2026-11-19');
  assert.strictEqual(m30.from, '2026-10-21');
  assert.deepStrictEqual(m30.prev, { from: '2026-09-21', to: '2026-10-20' });
  // 3m starts the day after the same date three months back…
  assert.strictEqual(U.rangePeriods('3m', '2026-11-19').from, '2026-08-20');
  assert.strictEqual(U.rangePeriods('6m', '2026-02-10').from, '2025-08-11');
  // …and a missing day runs on into the next month, like Date#setMonth
  assert.strictEqual(U.rangePeriods('3m', '2026-05-31').from, '2026-03-04');
  const p3 = U.rangePeriods('3m', '2026-11-19');
  assert.strictEqual(U.daysBetween(p3.prev.from, p3.prev.to), U.daysBetween(p3.from, p3.to));
  assert.strictEqual(p3.prev.to, '2026-08-19');
  // YTD compares with the same days last year (29 Feb becomes 28 Feb)
  assert.deepStrictEqual(U.rangePeriods('ytd', '2026-11-19').prev, {
    from: '2025-01-01',
    to: '2025-11-19',
  });
  assert.deepStrictEqual(U.rangePeriods('ytd', '2028-02-29').prev, {
    from: '2027-01-01',
    to: '2027-02-28',
  });
  // All starts at the first record and has nothing before it
  assert.deepStrictEqual(U.rangePeriods('all', '2026-11-19', '2025-03-02'), {
    from: '2025-03-02',
    to: '2026-11-19',
    prev: null,
    before: '',
  });
  assert.strictEqual(U.rangePeriods('all', '2026-11-19').from, '2026-11-19');
});

test('periodChange reads up, down and steady, in percent or points', () => {
  assert.strictEqual(U.periodChange(112, 100).dir, 'up');
  assert.strictEqual(U.periodChange(112, 100).text, '+12%');
  assert.strictEqual(Math.round(U.periodChange(112, 100).by), 12);
  assert.strictEqual(U.periodChange(92, 100).text, '−8%');
  assert.strictEqual(U.periodChange(92, 100).dir, 'down');
  assert.strictEqual(U.periodChange(100.5, 100).dir, 'flat');
  assert.strictEqual(U.periodChange(100.5, 100).text, 'Steady');
  assert.strictEqual(U.periodChange(44.1, 42, true).text, '+2.1 pts');
  assert.strictEqual(U.periodChange(42.6, 42, true).dir, 'flat');
  assert.strictEqual(U.periodChange(500, 10).text, '50×');
  assert.strictEqual(U.periodChange(-50, -100).dir, 'up');
  assert.strictEqual(U.periodChange(10, 0), null);
  assert.strictEqual(U.periodChange(10, null), null);
  assert.strictEqual(U.periodChange(40, 0, true).text, '+40.0 pts');
});

test('trendBuckets cover the period exactly, at most 14, with no stub at the start', () => {
  const check = (from, to, n, step) => {
    const b = U.trendBuckets(from, to);
    assert.strictEqual(b.length, n, `${from}…${to}`);
    assert.strictEqual(b[0].from, from);
    assert.strictEqual(b[b.length - 1].to, to);
    for (let i = 1; i < b.length; i++) assert.strictEqual(U.addDays(b[i - 1].to, 1), b[i].from);
    assert.ok(b.every((x) => x.days === U.daysBetween(x.from, x.to) + 1));
    if (step) assert.ok(b.slice(1).every((x) => x.days === step));
    return b;
  };
  check('2026-11-13', '2026-11-19', 7, 1);
  check('2026-10-21', '2026-11-19', 10, 3);
  const q = check('2026-08-20', '2026-11-19', 13, 7);
  assert.strictEqual(q[0].days, 8); // the one-day stub joined the first week
  check('2026-05-20', '2026-11-19', 13, 14);
  check('2026-01-01', '2026-11-19', 11, 30);
  assert.deepStrictEqual(U.trendBuckets('2026-11-19', '2026-11-19'), [
    { from: '2026-11-19', to: '2026-11-19', days: 1 },
  ]);
  assert.deepStrictEqual(U.trendBuckets('2026-11-20', '2026-11-19'), []);
});

test('sparkPath scales from zero, skips gaps and needs two points', () => {
  assert.deepStrictEqual(U.sparkPath([0, 10]), {
    line: 'M0 27 L100 3',
    area: 'M0 27 L100 3 L100 30 L0 30 Z',
    end: [100, 3],
  });
  assert.strictEqual(U.sparkPath([5, 10, 10]).line, 'M0 15 L50 3 L100 3');
  assert.strictEqual(U.sparkPath([40, null, 50], { zero: false }).line, 'M0 27 L100 3');
  assert.strictEqual(U.sparkPath([0, 0, 0]).line, 'M0 27 L50 27 L100 27');
  assert.strictEqual(U.sparkPath([7]), null);
  assert.strictEqual(U.sparkPath([null, 3, null]), null);
});

test('niceScale picks round gridlines from a round floor to a round ceiling', () => {
  assert.deepStrictEqual(U.niceScale(0, 1234), { lo: 0, hi: 1500, ticks: [0, 500, 1000, 1500] });
  assert.deepStrictEqual(U.niceScale(0, 95).ticks, [0, 25, 50, 75, 100]);
  assert.deepStrictEqual(U.niceScale(18.5, 23.4).ticks, [18, 20, 22, 24]);
  assert.deepStrictEqual(U.niceScale(-120, 800).ticks, [-250, 0, 250, 500, 750, 1000]);
  assert.deepStrictEqual(U.niceScale(0, 0).ticks, [0, 0.25, 0.5, 0.75, 1]);
});

test('chart axis labels are short', () => {
  assert.deepStrictEqual([0, 1500, 12000, -500, 2.5, 999].map(U.fmtAxisMoney), [
    '$0',
    '$1.5k',
    '$12k',
    '−$500',
    '$2.5',
    '$999',
  ]);
  assert.strictEqual(U.fmtAxisNum(4200), '4.2k');
});

const unescape = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

test('chart builds a column per value, with its values in data-tip', () => {
  const html = U.chart({
    label: 'Revenue',
    overlay: true,
    fmt: U.fmtAxisMoney,
    cols: [{ x: 'Jan', tip: { t: 'January', r: [['main', 'Profit', '$5 <net>']] } }, { x: 'Feb' }],
    series: [
      { k: 'ref', name: 'Revenue', values: [10, 20] },
      { k: 'main', name: 'Profit', values: [5, -3] },
    ],
  });
  const cols = [...html.matchAll(/class="vchart-col" data-i="(\d)" data-tip="([^"]*)"/g)];
  assert.strictEqual(cols.length, 2);
  assert.deepStrictEqual(JSON.parse(unescape(cols[0][2])), {
    t: 'January',
    r: [['main', 'Profit', '$5 <net>']],
  });
  assert.deepStrictEqual(JSON.parse(unescape(cols[1][2])), { t: 'Feb' });
  assert.strictEqual((html.match(/class="vchart-bar /g) || []).length, 4);
  assert.match(html, /vchart-bar main neg/); // a loss goes below the zero line
  assert.match(html, /<i class="zero"/);
  assert.match(html, /aria-label="Revenue\./);
  // The legend lists the main series first
  assert.match(
    html,
    /<span><i class="key main"><\/i>Profit<\/span><span><i class="key ref"><\/i>Revenue<\/span>/
  );
  assert.strictEqual(U.chart({ cols: [] }), '');
});

test('line charts split at gaps, mark points and label about six columns', () => {
  const html = U.chart({
    kind: 'line',
    cols: Array.from({ length: 12 }, (_, i) => ({ x: 'L' + i })),
    series: [{ values: [1, 2, null, 4, 5, 6, 7, 8, 9, 10, 11, 12] }],
    marks: [{ i: 4, k: 'bad' }],
    refs: [{ v: 6, label: 'Average' }],
  });
  assert.strictEqual((html.match(/class="vchart-line main"/g) || []).length, 2);
  assert.match(html, /vchart-dot bad/);
  assert.match(html, /<i class="key dash"><\/i>Average/);
  const labels = [...html.matchAll(/<span style="left:[\d.]+%">(L\d+)<\/span>/g)].map((m) => m[1]);
  assert.deepStrictEqual(labels, ['L0', 'L2', 'L4', 'L6', 'L8', 'L11']);
});
