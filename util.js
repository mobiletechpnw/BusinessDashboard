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
    // Saved products for the order form (name + per-unit cost / sale price).
    orderProducts: 'vpc_order_products_v1',
    jetTags: 'vp_jettags_v1',
    pins: 'vp_pins_v1',
    jetTagInventory: 'vp_jt_inventory_v1',
    jetTagChars: 'vp_jt_chars_v1',
    pinInventory: 'vp_pin_inventory_v1',
    pinChars: 'vp_pin_chars_v1',
    // Custom product categories (user-created from the Sales Hub). All four
    // stores are FIXED keys with per-record catId tags, so the cloud-sync
    // key list never has to change no matter how many categories exist.
    categories: 'vpc_categories_v1',
    catItems: 'vpc_cat_items_v1',
    catRestocks: 'vpc_cat_restocks_v1',
    catSales: 'vpc_cat_sales_v1',
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
    invSnapshots: 'vpc_inv_snapshots_v1',
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

  // ── Custom product categories ──────────────────────
  // User-created categories (Sales Hub "+ New Category") keep their registry
  // and data in the four KEYS.cat* stores. These helpers are the single
  // source of truth for category math, shared by the Sales Hub page and by
  // every page that rolls category sales into its totals (home KPIs, daily
  // review, guru, events ROI).
  const readArr = (store, key) => {
    try {
      const v = JSON.parse(store.getItem(key) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  };

  const customCategories = (store = localStorage) => readArr(store, KEYS.categories);

  // Per-category rollup: revenue, weighted-average-cost COGS, units left,
  // and low-stock items. Batches saved without a cost count their units but
  // add $0 to the cost basis — custom categories have no hard-coded fallback
  // price the way Jet Tags/Pins do.
  const customCatTotals = (store = localStorage) => {
    const items = readArr(store, KEYS.catItems);
    const restocks = readArr(store, KEYS.catRestocks);
    const sales = readArr(store, KEYS.catSales);
    return customCategories(store).map((cat) => {
      const its = items.filter((i) => i.catId === cat.id);
      const rs = restocks.filter((r) => r.catId === cat.id);
      const ss = sales.filter((s) => s.catId === cat.id);
      const units =
        its.reduce((s, i) => s + (+i.purchased || 0), 0) +
        rs.reduce((s, r) => s + (+r.qty || 0), 0);
      const cost = money(
        its.reduce((s, i) => s + (+i.cost || 0), 0) + rs.reduce((s, r) => s + (+r.cost || 0), 0)
      );
      const qtySold = ss.reduce((s, x) => s + (+x.qty || 0), 0);
      const revenue = sumMoney(ss, (x) => x.revenue);
      const avgCost = units > 0 ? cost / units : 0;
      const cogs = money(qtySold * avgCost);
      const soldById = {};
      ss.forEach((x) =>
        (x.items || []).forEach((iid) => {
          soldById[iid] = (soldById[iid] || 0) + ((x.itemQty || {})[iid] || 0);
        })
      );
      const restockedById = {};
      rs.forEach((r) => {
        restockedById[r.itemId] = (restockedById[r.itemId] || 0) + (+r.qty || 0);
      });
      const stock = its.map((i) => {
        const effective = (+i.purchased || 0) + (restockedById[i.id] || 0);
        const sold = soldById[i.id] || 0;
        return { id: i.id, name: i.name, effective, sold, left: effective - sold };
      });
      const low = stock.filter((i) => i.left <= 3 && i.left >= 0);
      return {
        cat,
        units,
        cost,
        avgCost,
        revenue,
        cogs,
        profit: money(revenue - cogs),
        qtySold,
        left: units - qtySold,
        stock,
        low,
      };
    });
  };

  // Revenue and sale count across every product line — riser orders, Jet
  // ── Orders: the built-in history ───────────────────
  // The 47 orders logged before this app existed. The Sales Hub seeds them
  // into a device's order store once; until then (or on pages that read
  // orders before the Sales Hub was ever opened) orderList() shows them
  // without writing anything, so a first visit to Home isn't all $0.
  const HISTORICAL_ORDERS = Object.freeze([
    {
      id: 'h1',
      date: '2025-12-27',
      customer: 'Jay',
      product: 'Large Risers (10)',
      sets: 0,
      salePrice: 40,
      cogs: 10.5,
      referredBy: '1st Buyer',
      notes: '',
    },
    {
      id: 'h2',
      date: '2025-12-28',
      customer: 'Kevin',
      product: 'Large Risers (12)',
      sets: 0,
      salePrice: 48,
      cogs: 12.6,
      referredBy: 'Jay',
      notes: '',
    },
    {
      id: 'h3',
      date: '2026-01-03',
      customer: 'Kaiden',
      product: 'Large + Small + End Caps',
      sets: 0,
      salePrice: 80,
      cogs: 27.34,
      referredBy: 'Me',
      notes: '',
    },
    {
      id: 'h4',
      date: '2026-01-25',
      customer: 'Mike',
      product: 'Large + Med + Small + Caps',
      sets: 0,
      salePrice: 60,
      cogs: 18.32,
      referredBy: 'Me',
      notes: '',
    },
    {
      id: 'h5',
      date: '2026-01-31',
      customer: 'Jay',
      product: 'Large + Small + End Caps',
      sets: 0,
      salePrice: 40,
      cogs: 12.24,
      referredBy: 'Me',
      notes: 'Repeat buyer',
    },
    {
      id: 'h6',
      date: '2026-02-08',
      customer: 'Ali',
      product: 'Large Risers + Caps',
      sets: 1,
      salePrice: 36,
      cogs: 10.26,
      referredBy: 'Me',
      notes: '',
    },
    {
      id: 'h7',
      date: '2026-02-09',
      customer: 'Ali',
      product: 'Large Risers + Caps (27)',
      sets: 1,
      salePrice: 108,
      cogs: 30.78,
      referredBy: 'Me',
      notes: 'Repeat',
    },
    {
      id: 'h8',
      date: '2026-02-08',
      customer: 'Mike',
      product: 'Large + Med + Caps',
      sets: 1,
      salePrice: 50,
      cogs: 13.65,
      referredBy: 'Me',
      notes: '',
    },
    {
      id: 'h9',
      date: '2026-02-09',
      customer: 'VIC - TCGVIC (Zion)',
      product: '18 Med Risers + 8 Caps',
      sets: 1,
      salePrice: 100,
      cogs: 21.36,
      referredBy: 'Me',
      notes: 'White color',
    },
    {
      id: 'h10',
      date: '2026-02-08',
      customer: 'Mons + Mana',
      product: '21 Large + 7 Small',
      sets: 1,
      salePrice: 100,
      cogs: 27.3,
      referredBy: 'Me',
      notes: '',
    },
    {
      id: 'h11',
      date: '2026-02-15',
      customer: 'Max',
      product: '3 sets: Large + Caps',
      sets: 3,
      salePrice: 225,
      cogs: 67.5,
      referredBy: 'Me',
      notes: '3 sets @ $75 each',
    },
    {
      id: 'h12',
      date: '2026-02-21',
      customer: 'Richard',
      product: '18 Large + 6 Caps',
      sets: 1,
      salePrice: 80,
      cogs: 22.5,
      referredBy: 'Me',
      notes: '',
    },
    {
      id: 'h13',
      date: '2026-03-07',
      customer: 'Damian',
      product: '18 Large + 6 Caps',
      sets: 1,
      salePrice: 85,
      cogs: 22.5,
      referredBy: 'Me',
      notes: '',
    },
    {
      id: 'h14',
      date: '2026-03-14',
      customer: 'Sam',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 100,
      cogs: 23.31,
      referredBy: 'Me',
      notes: '',
    },
    {
      id: 'h15',
      date: '2026-03-14',
      customer: 'Izeah - Baichu',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 85,
      cogs: 23.31,
      referredBy: 'Mike',
      notes: '',
    },
    {
      id: 'h16',
      date: '2026-03-14',
      customer: 'Jonathan (jlin730)',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 80,
      cogs: 23.31,
      referredBy: 'Richard & Jay',
      notes: 'Instagram: @jlin730',
    },
    {
      id: 'h17',
      date: '2026-03-21',
      customer: 'Baichu',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 85,
      cogs: 23.31,
      referredBy: 'Mike',
      notes: '',
    },
    {
      id: 'h18',
      date: '2026-03-21',
      customer: 'Baichu',
      product: '18 Large + 9 Caps (2nd)',
      sets: 1,
      salePrice: 85,
      cogs: 23.31,
      referredBy: 'Mike',
      notes: 'Repeat same day',
    },
    {
      id: 'h19',
      date: '2026-03-21',
      customer: "Nahk - Let's Rips",
      product: '18 Large + 9 Caps + Rental',
      sets: 1,
      salePrice: 113,
      cogs: 23.31,
      referredBy: 'Me',
      notes: '$85 set + $40 rental – $12 shipping',
    },
    {
      id: 'h20',
      date: '2026-03-28',
      customer: 'Diego',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 85,
      cogs: 21.33,
      referredBy: 'Damian',
      notes: '',
    },
    {
      id: 'h21',
      date: '2026-03-28',
      customer: 'TCG Dodge',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 85,
      cogs: 21.33,
      referredBy: '',
      notes: '',
    },
    {
      id: 'h22',
      date: '2026-03-29',
      customer: 'Sanjil',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 85,
      cogs: 18.9,
      referredBy: '',
      notes: '',
    },
    {
      id: 'h23',
      date: '2026-04-05',
      customer: 'Tyler - tyscardcorner1',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 85,
      cogs: 21.33,
      referredBy: 'Mike',
      notes: '',
    },
    {
      id: 'h24',
      date: '2026-04-05',
      customer: 'Tyler - tyscardcorner1',
      product: '18 Large + 9 Caps (2nd)',
      sets: 1,
      salePrice: 85,
      cogs: 21.33,
      referredBy: 'Mike',
      notes: 'Repeat same day',
    },
    {
      id: 'h25',
      date: '2026-04-05',
      customer: 'tcgnes',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 80,
      cogs: 21.33,
      referredBy: '',
      notes: '',
    },
    {
      id: 'h26',
      date: '2026-04-06',
      customer: 'Benze - Big Belly TCG',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 86,
      cogs: 21.33,
      referredBy: '',
      notes: 'Shipped 4 lbs 3 oz',
    },
    {
      id: 'h27',
      date: '2026-04-12',
      customer: 'Chris - Pokemon Go',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 100,
      cogs: 21.33,
      referredBy: 'Mike',
      notes: 'Tournament player',
    },
    {
      id: 'h28',
      date: '2026-04-12',
      customer: 'Sanjil',
      product: '18 Large + 9 Caps (2nd)',
      sets: 1,
      salePrice: 85,
      cogs: 21.33,
      referredBy: '',
      notes: 'Repeat',
    },
    {
      id: 'h29',
      date: '2026-04-18',
      customer: 'Damian',
      product: '18 Large + 9 Caps (2nd)',
      sets: 1,
      salePrice: 85,
      cogs: 21.33,
      referredBy: '',
      notes: 'Repeat',
    },
    {
      id: 'h30',
      date: '2026-04-18',
      customer: 'Ruben - Holy Collectz',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 90,
      cogs: 21.33,
      referredBy: '',
      notes: '',
    },
    {
      id: 'h31',
      date: '2026-04-19',
      customer: 'Richard',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 90,
      cogs: 21.33,
      referredBy: '',
      notes: 'Repeat',
    },
    {
      id: 'h32',
      date: '2026-04-19',
      customer: 'Richard',
      product: '18 Large + 9 Caps (2nd)',
      sets: 1,
      salePrice: 90,
      cogs: 21.33,
      referredBy: '',
      notes: '',
    },
    {
      id: 'h33',
      date: '2026-04-28',
      customer: 'Jdrops',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 90,
      cogs: 21.33,
      referredBy: '',
      notes: 'Ships to FL',
    },
    {
      id: 'h34',
      date: '2026-04-28',
      customer: 'Jdrops',
      product: '18 Large + 9 Caps (2nd)',
      sets: 1,
      salePrice: 90,
      cogs: 21.33,
      referredBy: '',
      notes: 'Ships to FL',
    },
    {
      id: 'h35',
      date: '2026-04-30',
      customer: 'Jeff Nelson',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 90,
      cogs: 21.33,
      referredBy: '',
      notes: 'Prepaid $180 for 2 sets',
    },
    {
      id: 'h36',
      date: '2026-04-30',
      customer: 'Jeff Nelson',
      product: '18 Large + 9 Caps (2nd)',
      sets: 1,
      salePrice: 90,
      cogs: 21.33,
      referredBy: '',
      notes: 'Prepaid',
    },
    {
      id: 'h37',
      date: '2026-05-10',
      customer: 'binbreon.tcg',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 90,
      cogs: 21.33,
      referredBy: '',
      notes: 'Delivery 5/16',
    },
    {
      id: 'h38',
      date: '2026-05-11',
      customer: 'Big Belly (Benze)',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 90,
      cogs: 21.33,
      referredBy: '',
      notes: 'Delivery 5/17; repeat',
    },
    {
      id: 'h39',
      date: '2026-05-28',
      customer: 'Luke - iyekul_collectibles',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 90,
      cogs: 21.33,
      referredBy: '',
      notes: 'Delivery 5/30',
    },
    {
      id: 'h40',
      date: '2026-05-29',
      customer: 'Raymond - Sleepy PokeShop',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 90,
      cogs: 21.33,
      referredBy: '',
      notes: 'Deliver 6/6 — Emerald+Cardfest',
    },
    {
      id: 'h41',
      date: '2026-05-29',
      customer: 'Raymond - Sleepy PokeShop',
      product: '18 Large + 9 Caps (2nd)',
      sets: 1,
      salePrice: 90,
      cogs: 21.33,
      referredBy: '',
      notes: 'Deliver 6/6',
    },
    {
      id: 'h42',
      date: '2026-05-29',
      customer: 'boxheadtc - Joe Mendez',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 100,
      cogs: 21.33,
      referredBy: '',
      notes: 'Pickup 6/6',
    },
    {
      id: 'h43',
      date: '2026-05-31',
      customer: 'Argcardz',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 100,
      cogs: 21.33,
      referredBy: '',
      notes: 'Pick up 5/31',
    },
    {
      id: 'h44',
      date: '2026-05-31',
      customer: 'pipstle.tcg',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 100,
      cogs: 21.33,
      referredBy: '',
      notes: 'Pick up 5/31',
    },
    {
      id: 'h45',
      date: '2026-06-02',
      customer: 'Yash - Silver Clash TCG',
      product: '18 Large + 9 Caps',
      sets: 1,
      salePrice: 90,
      cogs: 21.33,
      referredBy: '',
      notes: 'Deliver 6/20',
    },
    {
      id: 'h46',
      date: '2026-06-02',
      customer: 'Yash - Silver Clash TCG',
      product: '18 Large + 9 Caps (2nd)',
      sets: 1,
      salePrice: 90,
      cogs: 21.33,
      referredBy: '',
      notes: 'Deliver 6/20',
    },
    {
      id: 'h47',
      date: '2026-06-02',
      customer: 'Yash - Silver Clash TCG',
      product: '18 Large + 9 Caps (3rd)',
      sets: 1,
      salePrice: 90,
      cogs: 21.33,
      referredBy: '',
      notes: 'Deliver 6/20',
    },
  ]);

  // Stored orders, or the built-in history when this device has none yet.
  // An emptied list stays empty; only a missing key falls back.
  const orderList = (store = localStorage) => {
    if (store.getItem(KEYS.orders) == null) return HISTORICAL_ORDERS.map((o) => ({ ...o }));
    return readArr(store, KEYS.orders);
  };

  // First run on a device: write the history (plus any legacy orders) into
  // the store. The seed is stamped as older than any cloud copy (__ts = 1),
  // so the first sync replaces it with your real orders instead of the seed
  // looking newer and hiding them. Legacy orders, which only this device
  // has, keep the normal stamp.
  const seedOrders = (store = localStorage, legacyKey = 'riser_orders_v1') => {
    if (store.getItem(KEYS.orders) != null) return false;
    const legacy = readArr(store, legacyKey);
    store.setItem(
      KEYS.orders,
      JSON.stringify([...HISTORICAL_ORDERS.map((o) => ({ ...o })), ...legacy])
    );
    if (!legacy.length) store.setItem(KEYS.orders + '__ts', '1');
    return true;
  };

  // Tags, Pins, and custom-category sales — for dates starting with `prefix`
  // ('YYYY-MM' for a month, '' for all time). One rule, so "This Month" and
  // "All-Time" on Home and the Daily Review always count the same things.
  // Custom-category sales count only while their category exists, matching
  // customCatTotals.
  const saleAmounts = (store, keep) => {
    const live = new Set(customCategories(store).map((c) => c.id));
    const amounts = [
      ...orderList(store)
        .filter(keep)
        .map((o) => o.salePrice),
      ...readArr(store, KEYS.jetTags)
        .filter(keep)
        .map((x) => x.revenue),
      ...readArr(store, KEYS.pins)
        .filter(keep)
        .map((x) => x.revenue),
      ...readArr(store, KEYS.catSales)
        .filter((x) => live.has(x.catId) && keep(x))
        .map((x) => x.revenue),
    ];
    return { revenue: sumMoney(amounts), count: amounts.length };
  };
  const dateOf = (x) => String((x && x.date) || '');
  const salesInPeriod = (prefix = '', store = localStorage) =>
    saleAmounts(store, (x) => dateOf(x).startsWith(prefix));
  // The same sales between two 'YYYY-MM-DD' dates, inclusive — for "this
  // month so far against the same days last month".
  const salesBetween = (from, to, store = localStorage) =>
    saleAmounts(store, (x) => {
      const d = dateOf(x).slice(0, 10);
      return d >= from && d <= to;
    });

  // ── Periods and trends ─────────────────────────────
  // Dates are local 'YYYY-MM-DD' strings. The arithmetic runs in UTC, so a
  // daylight-saving change never moves a day.
  const pad2 = (n) => String(n).padStart(2, '0');
  const ymdParts = (s) => String(s).split('-').map(Number);
  const utcDay = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
  const addDays = (s, n) => {
    const [y, m, d] = ymdParts(s);
    return utcDay(y, m, d + n);
  };
  const daysBetween = (a, b) => {
    const [y1, m1, d1] = ymdParts(a);
    const [y2, m2, d2] = ymdParts(b);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
  };

  // The days a date range covers, counted back from today and inclusive (7d
  // is today and the six days before it), and the stretch it is compared
  // with: as many days just before it, or for YTD the same days last year.
  // 'all' starts at `first`, the earliest record, and has nothing before it.
  const RANGE_BEFORE = Object.freeze({
    '7d': 'the 7 days before',
    '30d': 'the 30 days before',
    '3m': 'the 3 months before',
    '6m': 'the 6 months before',
    ytd: 'the same days last year',
  });
  const rangePeriods = (range, today, first) => {
    const [y, m, d] = ymdParts(today);
    let from;
    if (range === '7d') from = addDays(today, -6);
    else if (range === '30d') from = addDays(today, -29);
    // The same day 3 or 6 months back (a missing day runs on into the next
    // month, as Date#setMonth does), then the day after it.
    else if (range === '3m') from = utcDay(y, m - 3, d + 1);
    else if (range === '6m') from = utcDay(y, m - 6, d + 1);
    else if (range === 'ytd') from = `${y}-01-01`;
    else return { from: first && first < today ? first : today, to: today, prev: null, before: '' };
    let prev;
    if (range === 'ytd') {
      const daysInMonth = new Date(Date.UTC(y - 1, m, 0)).getUTCDate();
      prev = {
        from: `${y - 1}-01-01`,
        to: `${y - 1}-${pad2(m)}-${pad2(Math.min(d, daysInMonth))}`,
      };
    } else {
      const len = daysBetween(from, today) + 1;
      prev = { from: addDays(from, -len), to: addDays(from, -1) };
    }
    return { from, to: today, prev, before: RANGE_BEFORE[range] };
  };

  // How a figure moved against the period before: percent, or points for a
  // figure that is itself a percentage. Under 1 either way is steady. null
  // when there is nothing to compare with.
  const periodChange = (cur, prev, points = false) => {
    if (prev == null || !isFinite(prev) || !isFinite(cur) || (!points && prev === 0)) return null;
    const by = points ? cur - prev : ((cur - prev) / Math.abs(prev)) * 100;
    const dir = Math.abs(by) < 1 ? 'flat' : by > 0 ? 'up' : 'down';
    const sign = dir === 'up' ? '+' : '−';
    let text;
    if (dir === 'flat') text = 'Steady';
    else if (points) text = `${sign}${Math.abs(by).toFixed(1)} pts`;
    else if (by >= 1000 && prev > 0) text = `${Math.round(cur / prev)}×`;
    else text = `${sign}${Math.round(Math.abs(by))}%`;
    return { dir, by, text };
  };

  // Buckets for a trend line over [from, to]: runs of whole days counted back
  // from `to`, sized so there are no more than 14. A short leftover at the
  // start joins its neighbour, so one quiet day doesn't start the line at 0.
  const TREND_STEPS = [1, 3, 7, 14, 30, 61, 91, 182, 365];
  const trendBuckets = (from, to) => {
    const days = daysBetween(from, to) + 1;
    if (!(days >= 1)) return [];
    const step = TREND_STEPS.find((n) => days / n <= 14) || Math.ceil(days / 14);
    const out = [];
    for (let end = to; daysBetween(from, end) >= 0; ) {
      let start = addDays(end, 1 - step);
      if (daysBetween(from, start) < 0) start = from;
      out.unshift({ from: start, to: end, days: daysBetween(start, end) + 1 });
      end = addDays(start, -1);
    }
    if (out.length > 2 && out[0].days < step / 2) {
      out[1].from = out[0].from;
      out[1].days += out[0].days;
      out.shift();
    }
    return out;
  };

  // A sparkline in a w×h box: the line, the area under it and the last
  // point. Null values are skipped. `zero` keeps 0 on the scale, so a small
  // figure doesn't look like a big one. null with fewer than two points.
  const sparkPath = (values, { w = 100, h = 30, pad = 3, zero = true } = {}) => {
    const pts = values.map((v, i) => [i, v]).filter(([, v]) => v != null && isFinite(v));
    if (pts.length < 2) return null;
    let lo = Math.min(...pts.map((p) => p[1]));
    let hi = Math.max(...pts.map((p) => p[1]));
    if (zero) {
      lo = Math.min(lo, 0);
      hi = Math.max(hi, 0);
    }
    const span = hi - lo;
    const num = (n) => +n.toFixed(2);
    const x = (i) => num((i / (values.length - 1)) * w);
    const y = (v) =>
      num(span ? h - pad - ((v - lo) / span) * (h - pad * 2) : hi === 0 ? h - pad : h / 2);
    const xy = pts.map(([i, v]) => [x(i), y(v)]);
    const line = xy.map(([a, b], k) => `${k ? 'L' : 'M'}${a} ${b}`).join(' ');
    const last = xy[xy.length - 1];
    return { line, area: `${line} L${last[0]} ${h} L${xy[0][0]} ${h} Z`, end: last };
  };

  // ── Charts ─────────────────────────────────────────
  // One builder for every chart in the app: bars (side by side, or one over
  // the other) or lines. The main series is blue and what it's compared with
  // grey (styles.css .vchart). Gridlines are faint, and values show on hover,
  // tap or the arrow keys (shared.js) instead of printed on every bar. The
  // chart fills its card, and scrolls sideways only when its columns don't
  // fit, starting at the latest. Returns HTML.

  // Round gridline values from a round floor to a round ceiling, about
  // `count` steps apart.
  const niceScale = (lo, hi, count = 4) => {
    if (!(hi > lo)) hi = lo + (Math.abs(lo) || 1);
    const raw = (hi - lo) / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / mag;
    const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
    const bottom = Math.floor(lo / step + 1e-9) * step;
    const top = Math.ceil(hi / step - 1e-9) * step;
    const ticks = [];
    for (let v = bottom; v <= top + step / 2; v += step) ticks.push(+v.toFixed(10));
    return { lo: bottom, hi: top, ticks };
  };
  // Short axis labels: 1500 → 1.5k, and with a $ for money.
  const fmtAxisNum = (v) => {
    const a = Math.abs(v);
    const n = a >= 1000 ? `${+(a / 1000).toFixed(1)}k` : `${+a.toFixed(a % 1 ? 2 : 0)}`;
    return (v < 0 ? '−' : '') + n;
  };
  const fmtAxisMoney = (v) => {
    const s = fmtAxisNum(v);
    return s[0] === '−' ? `−$${s.slice(1)}` : `$${s}`;
  };

  // o.cols    [{ x: 'Oct', tip: { t: 'October 2026', r: [[key, label, value]] } }]
  //           key picks the swatch in the tip: 'main', 'ref', 'ref2', 'bad'
  // o.series  [{ k: 'main'|'ref'|'ref2', name, values: [n|null], dash, area, end }]
  //           drawn in order, so put the main series last
  // o.kind    'bar' (default) or 'line'      o.overlay  bars over each other
  // o.refs    [{ v, label }]  dashed lines across, such as a goal or average
  // o.marks   [{ i, k: 'bad' }]  points picked out on the main line
  // o.divider { at, label }  a dashed line before column `at`
  // o.xs      0–1 positions, for points spaced by time instead of evenly
  // o.zero    false lets the scale hug the data instead of starting at 0
  // o.fmt     axis label formatter      o.height  plot height in px
  // o.minCol  px per column before the chart scrolls (bars 48, lines 0)
  // o.label   what the chart shows, for screen readers
  // o.keys    legend entries [[key, label]]; by default the named series
  const chart = (o) => {
    const cols = o.cols || [];
    const n = cols.length;
    if (!n) return '';
    const series = (o.series || []).filter(Boolean);
    const isLine = o.kind === 'line';
    const refs = o.refs || [];
    const fmt = o.fmt || fmtAxisNum;
    const r2 = (x) => +(+x).toFixed(2);
    const ok = (v) => v != null && isFinite(v);
    const vals = series
      .flatMap((s) => s.values)
      .concat(refs.map((r) => r.v))
      .filter(ok);
    let lo = vals.length ? Math.min(...vals) : 0;
    let hi = vals.length ? Math.max(...vals) : 1;
    if (o.zero !== false) {
      lo = Math.min(lo, 0);
      hi = Math.max(hi, 0);
    }
    const sc = niceScale(lo, hi, o.ticks || 4);
    const pct = (v) => ((v - sc.lo) / (sc.hi - sc.lo)) * 100;
    const zero = pct(Math.min(Math.max(0, sc.lo), sc.hi));
    // Bars sit in the middle of equal columns; line points run edge to edge
    // of an inset pane (or by time, with o.xs)
    const xs = o.xs
      ? o.xs.map((x) => x * 100)
      : cols.map((_, i) => (isLine ? (n > 1 ? (i / (n - 1)) * 100 : 50) : ((i + 0.5) / n) * 100));
    const edge = (i) => [
      i ? (xs[i - 1] + xs[i]) / 2 : 0,
      i < n - 1 ? (xs[i] + xs[i + 1]) / 2 : 100,
    ];
    const K = isLine || o.overlay ? 1 : Math.max(1, series.length);
    const main = series.find((s) => (s.k || 'main') === 'main') || series[series.length - 1];

    const ylab = sc.ticks.map((v) => fmt(v));
    const grid = sc.ticks
      .map((v) => `<i${v === 0 ? ' class="zero"' : ''} style="bottom:${r2(pct(v))}%"></i>`)
      .join('');
    const yAxis = sc.ticks
      .map((v, j) => `<span style="bottom:${r2(pct(v))}%">${esc(ylab[j])}</span>`)
      .join('');

    // Columns: one hit area per value, holding its bars
    const colsHtml = cols
      .map((c, i) => {
        const [a, b] = edge(i);
        const px = b > a ? ((xs[i] - a) / (b - a)) * 100 : 50;
        let bars = '';
        if (!isLine)
          series.forEach((s, k) => {
            const v = s.values[i];
            if (!ok(v)) return;
            const p = pct(v);
            const h = Math.max(Math.abs(p - zero), v ? 0.6 : 0);
            bars += `<i class="vchart-bar ${s.k || 'main'}${v < 0 ? ' neg' : ''}" style="--k:${o.overlay ? 0 : k};bottom:${r2(Math.min(p, zero))}%;height:${r2(h)}%"></i>`;
          });
        const tip = escAttr(JSON.stringify(c.tip || { t: c.x || '' }));
        return `<div class="vchart-col" data-i="${i}" data-tip="${tip}" style="left:${r2(a)}%;width:${r2(b - a)}%;--px:${r2(px)}%">${bars}</div>`;
      })
      .join('');

    // Lines, in a 1000×1000 box stretched over the plot (strokes stay even)
    let svg = '';
    if (isLine) {
      const P = (i, v) => `${r2(xs[i] * 10)} ${r2(1000 - pct(v) * 10)}`;
      const base = r2(1000 - zero * 10);
      series.forEach((s) => {
        const segs = [];
        let run = [];
        s.values.forEach((v, i) => {
          if (ok(v)) run.push(i);
          else if (run.length) (segs.push(run), (run = []));
        });
        if (run.length) segs.push(run);
        const cls = `${s.k || 'main'}${s.dash ? ' dash' : ''}`;
        segs.forEach((seg) => {
          const d = seg.map((i, j) => `${j ? 'L' : 'M'}${P(i, s.values[i])}`).join(' ');
          if (s.area && seg.length > 1)
            svg += `<path class="vchart-area" d="${d} L${r2(xs[seg[seg.length - 1]] * 10)} ${base} L${r2(xs[seg[0]] * 10)} ${base} Z"/>`;
          svg +=
            seg.length > 1
              ? `<path class="vchart-line ${cls}" d="${d}"/>`
              : `<path class="vchart-dot ${cls}" d="M${P(seg[0], s.values[seg[0]])}h0"/>`;
        });
      });
      if (main) {
        const mv = main.values;
        (o.marks || []).forEach((m) => {
          if (ok(mv[m.i]))
            svg += `<path class="vchart-dot ${m.k || 'main'}" d="M${P(m.i, mv[m.i])}h0"/>`;
        });
        let last = -1;
        mv.forEach((v, i) => ok(v) && (last = i));
        if (last >= 0 && o.lastDot !== false)
          svg += `<path class="vchart-dot main" d="M${P(last, mv[last])}h0"/>`;
        // The point under the pointer: a ring, then a dot
        mv.forEach((v, i) => {
          if (!ok(v)) return;
          svg += `<path class="vchart-pt ring" data-i="${i}" d="M${P(i, v)}h0"/><path class="vchart-pt" data-i="${i}" d="M${P(i, v)}h0"/>`;
        });
      }
    }

    // Reference lines are named in the legend, so no label sits on the data
    const refsHtml = refs
      .map((r) => `<div class="vchart-ref" style="bottom:${r2(pct(r.v))}%"></div>`)
      .join('');
    const divHtml = o.divider
      ? `<div class="vchart-div" style="left:${r2(edge(o.divider.at)[0])}%"><span>${esc(o.divider.label || '')}</span></div>`
      : '';
    const endHtml = series
      .filter((s) => s.end)
      .map((s) => {
        let j = -1;
        s.values.forEach((v, i) => ok(v) && (j = i));
        if (j < 0) return '';
        const y = pct(s.values[j]);
        // Above its last point, or below when the line runs along the top
        return `<span class="vchart-end${y > 82 ? ' below' : ''}" style="left:${r2(xs[j])}%;bottom:${r2(y)}%">${esc(s.end)}</span>`;
      })
      .join('');

    // Axis labels along the bottom: every column for bars, about six for
    // lines, never the same label twice in a row
    const every = o.xEvery || (isLine ? Math.max(1, Math.ceil(n / 6)) : 1);
    let shown = null;
    const xl = cols
      .map((c, i) => {
        if (!c.x || c.x === shown || !(i === n - 1 || (i % every === 0 && n - 1 - i >= every)))
          return '';
        shown = c.x;
        return `<span style="left:${r2(xs[i])}%">${esc(c.x)}</span>`;
      })
      .join('');

    const keys = (
      o.keys || series.filter((s) => s.name).map((s) => [s.k || 'main', s.name])
    ).slice();
    keys.sort((a, b) => (a[0] === 'main' ? -1 : 0) - (b[0] === 'main' ? -1 : 0));
    refs.forEach((r) => r.label && keys.push(['dash', r.label]));
    const legend = keys.length
      ? `<div class="vchart-legend">${keys.map(([k, label]) => `<span><i class="key ${k}"></i>${esc(label)}</span>`).join('')}</div>`
      : '';
    const minCol = o.minCol != null ? o.minCol : isLine ? 0 : 48;
    const H = o.height || 200;
    const yw = Math.max(...ylab.map((t) => t.length));
    return (
      `<div class="vchart ${isLine ? 'is-line' : 'is-bar'}" role="group" tabindex="0" aria-label="${escAttr(o.label || 'Chart')}. Use the arrow keys to read each value." style="--K:${K}${o.barMax ? `;--bar-max:${o.barMax}px` : ''}">` +
      legend +
      `<div class="vchart-body"><div class="vchart-y" style="width:${yw}ch;height:${H}px">${yAxis}</div>` +
      `<div class="vchart-scroll"><div class="vchart-inner"${minCol ? ` style="min-width:${n * minCol}px"` : ''}>` +
      `<div class="vchart-plot" style="height:${H}px"><div class="vchart-grid">${grid}</div>${refsHtml}<div class="vchart-pane">` +
      (svg
        ? `<svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false">${svg}</svg>`
        : '') +
      divHtml +
      endHtml +
      `<div class="vchart-cols">${colsHtml}</div></div></div>` +
      `<div class="vchart-x">${xl}</div></div></div></div></div>`
    );
  };

  // ── Icons ──────────────────────────────────────────
  // One line-icon set, in icons.svg. Returns an inline <svg> that uses a
  // symbol from it; .vpc-ico (styles.css) sizes it and strokes it in the
  // current text colour, so icons follow state colours and both themes.
  const icon = (name, cls = '') =>
    `<svg class="vpc-ico${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="icons.svg#${name}"/></svg>`;

  // ── Theme ──────────────────────────────────────────
  // 'auto' follows the device; 'light' and 'dark' are pinned from the
  // account menu. Stored per device. applyTheme() runs at load (below),
  // before the page paints, so a page never flashes the wrong theme.
  const THEME_KEY = 'vpc_theme';
  const themeChoice = () => {
    try {
      const v = localStorage.getItem(THEME_KEY);
      return v === 'light' || v === 'dark' ? v : 'auto';
    } catch (e) {
      return 'auto';
    }
  };
  const applyTheme = (choice = themeChoice()) => {
    const root = document.documentElement;
    if (choice === 'light' || choice === 'dark') root.dataset.theme = choice;
    else delete root.dataset.theme;
    const light =
      choice === 'light' ||
      (choice === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches);
    // The browser and status bar match the title bar.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = light ? '#f9f9fb' : '#121213';
    return light ? 'light' : 'dark';
  };
  const setTheme = (choice) => {
    try {
      localStorage.setItem(THEME_KEY, choice);
    } catch (e) {}
    applyTheme(choice);
    window.dispatchEvent(new CustomEvent('vpc:themechange'));
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
    customCategories,
    customCatTotals,
    salesInPeriod,
    salesBetween,
    addDays,
    daysBetween,
    rangePeriods,
    periodChange,
    trendBuckets,
    sparkPath,
    niceScale,
    fmtAxisNum,
    fmtAxisMoney,
    chart,
    HISTORICAL_ORDERS,
    orderList,
    seedOrders,
    icon,
    themeChoice,
    applyTheme,
    setTheme,
  };

  // Browser global + CommonJS (for the test runner).
  root.VPCUtil = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  // Theme first, so the page paints in the right colours.
  if (typeof document !== 'undefined' && typeof window !== 'undefined' && window.matchMedia) {
    try {
      applyTheme();
      window.matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => {
        if (themeChoice() === 'auto') {
          applyTheme();
          window.dispatchEvent(new CustomEvent('vpc:themechange'));
        }
      });
    } catch (e) {
      /* never let the theme block the page */
    }
  }

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
