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
