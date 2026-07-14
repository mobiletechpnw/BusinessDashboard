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
    // The Sales Hub keeps its own separate expense list under this older key
    // (also read by analytics), distinct from the Expenses page's `expenses`.
    // Like eventsLegacy, unifying it would need a data migration.
    expensesLegacy: 'vp_expenses_v1',
    expenseBudget: 'vpc_expense_budget_v1',
    recurringExpenses: 'vpc_recurring_expenses_v1',
    costs: 'vpc_costs_v1',
    goals: 'goals_dashboard_v1',
    networth: 'vpc_networth_v1',
    growth: 'vpc_growth_v1',
    guru: 'vpc_guru_v1',
    ritual: 'vpc_ritual_v1',
    cardInventory: 'vpc_card_inventory_v1',
    // Weekly Singles/Slabs/Sealed bucket totals — one snapshot per weekend.
    // This is what inventory.html tracks now; `cardInventory` above is the
    // retired per-item list, kept so existing data stays synced and backed up.
    cardInventoryWeekly: 'vpc_card_inv_weekly_v1',
  });

  // ── Crew table claims ──────────────────────────────
  // A sign-up's table_pref holds a table claim ("1 table", "½ table",
  // "2 tables", or legacy free text like "corner spot please"). Parse it to
  // a numeric table count so a claim can be auto-priced when the block is
  // booked; null when no quantity can be read (the booking then starts at $0
  // exactly like before, so legacy sign-ups keep working).
  const parseClaimQty = (s) => {
    const str = String(s == null ? '' : s)
      .trim()
      .toLowerCase();
    if (!str) return null;
    if (/half|½|(?:^|[^\d.])1\s*\/\s*2/.test(str)) return 0.5;
    const m = str.match(/(\d+(?:\.\d+)?)/);
    if (!m) return null;
    const n = parseFloat(m[1]);
    // Guard against garbage like phone numbers pasted into the field.
    return n > 0 && n <= 50 ? n : null;
  };

  // ── Event-store unification ────────────────────────
  // Two pages historically kept SEPARATE event lists: the Events page under
  // KEYS.events, the Sales Hub under KEYS.eventsLegacy — with different date
  // field names (`date` vs `start`). These helpers fold them into one list
  // and normalize the schema so BOTH pages render every event. The guiding
  // rule is that no event and no field is ever dropped.

  // Ensure an event carries both `start` and `date` (same day) while keeping
  // every other field, so a Sales-Hub event shows on the Events page and a
  // Events-page event sorts/renders on the Sales Hub.
  const normalizeEvent = (e) => {
    const day = e.start || e.date || '';
    return { ...e, start: e.start || day, date: e.date || day };
  };

  // Union two event arrays, de-duped by id (on a collision the two records
  // are field-merged, so nothing either page owns is lost), each normalized.
  const mergeEvents = (canonical, legacy) => {
    const byId = new Map();
    const idless = [];
    const add = (e) => {
      if (!e || typeof e !== 'object') return;
      if (e.id == null) return void idless.push(e);
      byId.set(e.id, byId.has(e.id) ? { ...byId.get(e.id), ...e } : e);
    };
    (legacy || []).forEach(add);
    (canonical || []).forEach(add); // canonical wins field-by-field on a tie
    return [...byId.values(), ...idless].map(normalizeEvent);
  };

  // One-time, in-browser: merge the Sales Hub's legacy list into the
  // canonical one so both pages share it. Guarded by a flag so it runs once
  // (a re-run also can't duplicate — merge de-dupes by id), and it LEAVES the
  // legacy key untouched as a backup. Nothing is deleted.
  const EVENTS_UNIFIED_FLAG = 'vpc_events_unified_v1';
  const migrateEventStores = (store) => {
    if (store.getItem(EVENTS_UNIFIED_FLAG)) return;
    const read = (k) => {
      try {
        const v = JSON.parse(store.getItem(k) || '[]');
        return Array.isArray(v) ? v : [];
      } catch (e) {
        return [];
      }
    };
    const merged = mergeEvents(read(KEYS.events), read(KEYS.eventsLegacy));
    store.setItem(KEYS.events, JSON.stringify(merged));
    store.setItem(EVENTS_UNIFIED_FLAG, '1');
  };

  const api = {
    money,
    sumMoney,
    fmtMoney,
    fmtDate,
    fmtDateLong,
    todayStr,
    esc,
    escAttr,
    KEYS,
    parseClaimQty,
    normalizeEvent,
    mergeEvents,
    migrateEventStores,
  };

  // Browser global + CommonJS (for the test runner).
  root.VPCUtil = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  // Fold the two event stores together before any page script reads events.
  // Runs synchronously here (util.js is first in <head>), and only in a real
  // browser — the Node test runner has no localStorage, so it stays a no-op.
  if (typeof localStorage !== 'undefined') {
    try {
      migrateEventStores(localStorage);
    } catch (e) {
      /* never let a migration hiccup block the page */
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
