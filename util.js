/* ═══════════════════════════════════════════════════
   util.js — shared pure helpers (money, dates, escaping)
   Vault & Pine Collective

   Loaded SYNCHRONOUSLY in <head> (before page inline scripts) so every
   page can use the same money/date/escape logic instead of copy-pasting
   subtly different variants. Exposed under the VPCUtil namespace to avoid
   colliding with any page's existing top-level declarations during the
   gradual migration.

   This file is also unit-tested (npm test) — keep these functions pure.
═══════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  // ── Money ──────────────────────────────────────────
  // Round to whole cents to stop floating-point drift accumulating across
  // sums (e.g. 0.1 + 0.2). Use everywhere money is computed, not just shown.
  const money = (n) => Math.round(((+n || 0) + Number.EPSILON) * 100) / 100;

  // Sum an array to a cent-accurate total. `pick` extracts the number.
  const sumMoney = (arr, pick = (x) => x) =>
    money((arr || []).reduce((s, x) => s + (+pick(x) || 0), 0));

  const fmtMoney = (n) =>
    '$' + money(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Dates ──────────────────────────────────────────
  // 'YYYY-MM-DD' → localized string. Noon avoids the UTC-midnight off-by-one.
  const fmtDate = (d) =>
    d
      ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '';

  const fmtDateLong = (d) =>
    d
      ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : '';

  // Today as 'YYYY-MM-DD' in local time (en-CA yields ISO-style order).
  const todayStr = () => new Date().toLocaleDateString('en-CA');

  // ── Escaping ───────────────────────────────────────
  // esc: safe for element text/innerHTML.
  const esc = (s) =>
    String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  // escAttr: safe for use inside a quoted HTML attribute (also escapes quotes).
  const escAttr = (s) => esc(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // ── localStorage keys ──────────────────────────────
  // One canonical name per stored entity, so pages can't drift apart by
  // spelling the same key two different ways (which once left the Daily
  // Review reading `vp_events_v1` while Events wrote `vpc_events_v1`).
  //
  // The `vp_`/`vpc_` prefix mix and the `_vN` suffixes are legacy — the
  // string VALUES are frozen because they map to data already sitting in
  // real users' localStorage. Standardize how code REFERENCES a key here;
  // never rename the string, or you orphan existing data.
  const KEYS = Object.freeze({
    orders: 'vp_orders_v2',
    jetTags: 'vp_jettags_v1',
    pins: 'vp_pins_v1',
    jetTagInventory: 'vp_jt_inventory_v1',
    pinInventory: 'vp_pin_inventory_v1',
    filament: 'riser_filament_v1',
    events: 'vpc_events_v1',
    // The Sales Hub page keeps its OWN separate events list under this older
    // key. It's a distinct store, not a typo — unifying it with `events`
    // needs a data migration (merge + de-dupe), so it stays separate for now.
    eventsLegacy: 'vp_events_v1',
    vendors: 'vpc_vendors_v1',
    tables: 'vpc_tables_v1',
    expenses: 'vpc_personal_expenses_v1',
    expenseBudget: 'vpc_expense_budget_v1',
    recurringExpenses: 'vpc_recurring_expenses_v1',
    costs: 'vpc_costs_v1',
    goals: 'goals_dashboard_v1',
    networth: 'vpc_networth_v1',
    growth: 'vpc_growth_v1',
    guru: 'vpc_guru_v1',
    ritual: 'vpc_ritual_v1',
  });

  const api = { money, sumMoney, fmtMoney, fmtDate, fmtDateLong, todayStr, esc, escAttr, KEYS };

  // Browser global + CommonJS (for the test runner).
  root.VPCUtil = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
