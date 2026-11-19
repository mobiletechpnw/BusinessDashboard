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
