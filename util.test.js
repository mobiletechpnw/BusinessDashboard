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
