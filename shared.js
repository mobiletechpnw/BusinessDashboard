/* ═══════════════════════════════════════════════════
   shared.js — Navigation · Search · Shortcuts
               Audit Log · Notifications · Menus
   Vault & Pine Collective
═══════════════════════════════════════════════════ */

// ── APP NAVIGATION ─────────────────────────────────
// One navigation for every page: a sidebar on wide screens, and a tab bar
// with a More sheet on phones and tablets. A page provides only its <header>
// (title and page actions); search and the account menu live here, so no
// page can drift out of sync or dead-end the user.
const NAV = [
  {
    items: [
      ['index.html', 'home', 'Home'],
      ['review.html', 'review', 'Daily Review'],
    ],
  },
  {
    label: 'Sales',
    items: [
      ['vault-pine-collective.html', 'sales', 'Sales Hub'],
      ['inventory.html', 'cards', 'Card Inventory'],
    ],
  },
  {
    label: 'Operations',
    items: [
      ['production.html', 'production', 'Production'],
      ['events.html', 'events', 'Events'],
    ],
  },
  {
    label: 'Money',
    items: [
      ['analytics.html', 'analytics', 'Analytics'],
      ['expenses.html', 'expenses', 'Personal Expenses'],
      ['guru.html', 'guru', 'Guru'],
    ],
  },
  {
    label: 'Growth',
    items: [
      ['goals-dashboard.html', 'goals', 'Goals'],
      ['content.html', 'content', 'Content'],
      ['growth.html', 'growth', 'Instagram'],
    ],
  },
];

// The four places used most get a tab on phones; everything else is in More.
const NAV_TABS = [
  ['index.html', 'home', 'Home'],
  ['vault-pine-collective.html', 'sales', 'Sales'],
  ['production.html', 'production', 'Production'],
  ['events.html', 'events', 'Events'],
];

// Line icons on a 24px grid, stroked in currentColor.
const NAV_ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  review:
    '<path d="M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><rect x="9" y="2.5" width="6" height="3.5" rx="1"/><path d="m9 13.5 2 2 4-4"/>',
  sales:
    '<path d="M5 8h14l-1 12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  cards:
    '<rect x="3" y="7" width="13" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/>',
  production:
    '<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>',
  events:
    '<path d="M4 6h16a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-4V7a1 1 0 0 1 1-1z"/><path d="M15 8v8" stroke-dasharray="1.5 2.5"/>',
  analytics: '<path d="M4 20h16M7 16v-4M12 16V7M17 16v-7"/>',
  expenses: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
  guru: '<path d="M2 9.5 12 5l10 4.5-10 4.5L2 9.5z"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5M22 9.5V14"/>',
  goals:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  content:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m3 16 5-5 5 5M13 14l3-3 5 5"/>',
  growth: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  more: '<circle cx="12" cy="12" r="9"/><path d="M8 12h.01M12 12h.01M16 12h.01" stroke-width="2.6"/>',
  sync: '<path d="M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9"/><path d="M18.5 3v4.2h-4.2M5.5 21v-4.2h4.2"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  keyboard:
    '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8" stroke-width="2"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  signout: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="m15 16 4-4-4-4M19 12H9"/>',
  chevrons: '<path d="m8 9 4-4 4 4M8 15l4 4 4-4"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
};

function navIcon(name) {
  return `<svg class="vpc-ico" viewBox="0 0 24 24" aria-hidden="true">${NAV_ICONS[name] || ''}</svg>`;
}
function navEsc(s) {
  return String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}
function navCurrentPage() {
  return location.pathname.split('/').pop() || 'index.html';
}
function navLinksHTML(cur) {
  return NAV.map(
    (g) =>
      (g.label ? `<div class="vpc-nav-label">${g.label}</div>` : '') +
      g.items
        .map(
          ([href, icon, label]) =>
            `<a href="${href}" class="vpc-nav-link"${href === cur ? ' aria-current="page"' : ''}>${navIcon(icon)}<span>${label}</span></a>`
        )
        .join('')
  ).join('');
}
function navSearchHTML() {
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  return `<button type="button" class="vpc-search" data-nav-action="search">${navIcon('search')}<span>Search</span><kbd>${mac ? '⌘K' : 'Ctrl K'}</kbd></button>`;
}
// Avatar, email and live sync status (supabase-sync.js keeps the label
// current; the dot is coloured from data-sync on <html>).
function navWhoHTML() {
  const email = window.VpcAuth?.get()?.user?.email || '';
  const status = window.VpcSync?.label?.() || 'Cloud sync';
  return (
    `<span class="vpc-avatar" aria-hidden="true">${navEsc((email[0] || '?').toUpperCase())}</span>` +
    `<span class="vpc-account-text"><span class="vpc-account-email">${navEsc(email || 'Signed in')}</span>` +
    `<span class="vpc-account-sync"><span class="vpc-sync-dot"></span><span class="vpc-sync-label">${status}</span></span></span>`
  );
}
// Account actions, shared by the sidebar's menu and the More sheet.
function navAccountActions({ keyboard }) {
  const acts = [{ value: 'sync', label: 'Sync now', icon: 'sync' }];
  if ('Notification' in window && Notification.permission === 'default')
    acts.push({ value: 'reminders', label: 'Turn on reminders', icon: 'bell' });
  if (keyboard) acts.push({ value: 'shortcuts', label: 'Keyboard shortcuts', icon: 'keyboard' });
  acts.push({ value: 'activity', label: 'Activity log', icon: 'activity' });
  acts.push({ value: 'signout', label: 'Sign out', icon: 'signout', danger: true });
  return acts;
}

function injectAppNav() {
  const cur = navCurrentPage();

  const side = document.createElement('div');
  side.className = 'vpc-sidebar';
  side.innerHTML =
    '<a class="vpc-brand" href="index.html"><span class="vpc-brand-mark" aria-hidden="true">🌲</span>Vault &amp; Pine</a>' +
    navSearchHTML() +
    `<nav class="vpc-nav" aria-label="Main">${navLinksHTML(cur)}</nav>` +
    '<div class="vpc-sidebar-foot"><button type="button" class="vpc-account" data-nav-action="account" aria-haspopup="menu" aria-expanded="false">' +
    navWhoHTML() +
    navIcon('chevrons') +
    '</button></div>';
  document.body.prepend(side);

  const inTabs = NAV_TABS.some(([href]) => href === cur);
  const tabs = document.createElement('nav');
  tabs.className = 'vpc-tabbar';
  tabs.setAttribute('aria-label', 'Main');
  tabs.innerHTML =
    '<div class="vpc-tabbar-inner">' +
    NAV_TABS.map(
      ([href, icon, label]) =>
        `<a href="${href}"${href === cur ? ' aria-current="page"' : ''}>${navIcon(icon)}<span>${label}</span></a>`
    ).join('') +
    `<button type="button" data-nav-action="more" aria-haspopup="dialog" aria-expanded="false"${inTabs ? '' : ' class="is-current"'}>${navIcon('more')}<span>More</span></button>` +
    '</div>';
  document.body.appendChild(tabs);

  // Wide windows have no More tab, so close the sheet if the window grows.
  window
    .matchMedia('(min-width: 1024px)')
    .addEventListener?.('change', (e) => e.matches && closeMoreSheet(false));

  trackHeaderHeight();
}

// Sticky bars sit under the title bar. Its height changes with the page and
// the screen (and when a header wraps), so measure it rather than hard-code it.
function trackHeaderHeight() {
  const header = document.querySelector('body > header');
  if (!header) return;
  const set = () =>
    document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  set();
  if ('ResizeObserver' in window) new ResizeObserver(set).observe(header);
}

function openAccountMenu(anchor) {
  vpcMenu(anchor, {
    label: 'Account',
    header: navWhoHTML(),
    options: navAccountActions({ keyboard: true }).map((o) => ({ ...o, icon: navIcon(o.icon) })),
    matchWidth: true,
    onSelect: (value) => runNavAction(value, anchor),
  });
}

let _moreSheet = null;
function openMoreSheet(trigger) {
  if (_moreSheet) return;
  const wrap = document.createElement('div');
  wrap.className = 'vpc-sheet-wrap';
  wrap.innerHTML = `
    <div class="vpc-sheet-scrim" data-nav-action="close-sheet"></div>
    <div class="vpc-sheet" role="dialog" aria-modal="true" aria-labelledby="vpc-sheet-title" tabindex="-1">
      <div class="vpc-sheet-head">
        <h2 id="vpc-sheet-title">More</h2>
        <button type="button" class="vpc-sheet-close" data-nav-action="close-sheet" aria-label="Close">${navIcon('close')}</button>
      </div>
      <div class="vpc-sheet-body">
        ${navSearchHTML()}
        <nav class="vpc-nav" aria-label="All pages">${navLinksHTML(navCurrentPage())}</nav>
        <div class="vpc-nav-label">Account</div>
        <div class="vpc-sheet-who">${navWhoHTML()}</div>
        ${navAccountActions({ keyboard: false })
          .map(
            (a) =>
              `<button type="button" class="vpc-nav-link${a.danger ? ' is-danger' : ''}" data-nav-action="${a.value}">${navIcon(a.icon)}<span>${a.label}</span></button>`
          )
          .join('')}
      </div>
    </div>`;
  document.body.appendChild(wrap);
  document.documentElement.classList.add('vpc-sheet-open');
  trigger?.setAttribute('aria-expanded', 'true');
  const sheet = wrap.querySelector('.vpc-sheet');
  sheet.focus();
  // Two frames so the closed position is painted before the slide starts.
  requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('is-open')));
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMoreSheet(true);
    } else if (e.key === 'Tab') {
      // Keep focus inside the sheet while it is open.
      const f = [...sheet.querySelectorAll('a[href], button')];
      const first = f[0];
      const last = f[f.length - 1];
      const at = document.activeElement;
      if (e.shiftKey && (at === first || at === sheet)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && at === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  _moreSheet = { wrap, trigger };
}
function closeMoreSheet(restoreFocus) {
  if (!_moreSheet) return;
  const { wrap, trigger } = _moreSheet;
  _moreSheet = null;
  document.documentElement.classList.remove('vpc-sheet-open');
  trigger?.setAttribute('aria-expanded', 'false');
  wrap.classList.remove('is-open');
  const remove = () => wrap.remove();
  wrap.querySelector('.vpc-sheet').addEventListener('transitionend', remove, { once: true });
  setTimeout(remove, 600);
  if (restoreFocus) trigger?.focus();
}

// Notification permission is asked for from the account menu, never on load.
function enableReminders() {
  if (!('Notification' in window)) return;
  Promise.resolve(Notification.requestPermission()).then((p) => {
    if (p !== 'default')
      document.querySelectorAll('[data-nav-action="reminders"]').forEach((b) => b.remove());
    if (p === 'granted') {
      localStorage.removeItem('vpc_notif_last_check');
      checkAndNotify();
    }
  });
}

function runNavAction(action, el) {
  if (action === 'search') {
    closeMoreSheet(false);
    openSearch();
  } else if (action === 'account') openAccountMenu(el);
  else if (action === 'more') openMoreSheet(el);
  else if (action === 'close-sheet') closeMoreSheet(true);
  else if (action === 'sync') window.VpcSync?.sync();
  else if (action === 'reminders') enableReminders();
  else if (action === 'shortcuts') showShortcutsPanel();
  else if (action === 'activity') {
    closeMoreSheet(false);
    showAuditLog();
  } else if (action === 'signout') window.VpcAuth?.signOut();
}
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-nav-action]');
  if (el) runNavAction(el.dataset.navAction, el);
});

// ── STATUS MENU ────────────────────────────────────
// A small popover listing every option, so a status never changes on a
// stray tap (it replaces click-to-cycle pills). Usage:
//   vpcMenu(buttonEl, { label, current, options: [{ value, label, color }], onSelect })
// The anchor may carry data-menu-key; after a re-render, focus returns to
// the element with the same key.
// Without `current` it is a menu of actions ({ value, label, icon, danger })
// instead of a choice; `header` adds a line of context above the items.
let _vpcMenuClose = null;
let _vpcMenuAnchor = null;
window.vpcMenu = function (anchor, { label, options, current, onSelect, header, matchWidth }) {
  if (_vpcMenuClose) {
    // A second click on the button that opened the menu closes it.
    const same = _vpcMenuAnchor === anchor;
    _vpcMenuClose(same);
    if (same) return;
  }
  const isChoice = current !== undefined;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  const menu = document.createElement('div');
  menu.className = 'vpc-menu';
  menu.setAttribute('role', 'menu');
  if (label) menu.setAttribute('aria-label', label);
  menu.innerHTML =
    (header ? `<div class="vpc-menu-head" aria-hidden="true">${header}</div>` : '') +
    options
      .map((o) =>
        isChoice
          ? `<button type="button" role="menuitemradio" aria-checked="${o.value === current}" data-value="${esc(o.value)}">` +
            `<span class="vpc-menu-check" aria-hidden="true">✓</span>${esc(o.label)}` +
            `<span class="vpc-menu-dot" aria-hidden="true" style="background:${o.color || 'var(--text2)'}"></span></button>`
          : `<button type="button" role="menuitem" data-value="${esc(o.value)}"${o.danger ? ' class="is-danger"' : ''}>` +
            `${o.icon || ''}${esc(o.label)}</button>`
      )
      .join('');
  document.body.appendChild(menu);

  const r = anchor.getBoundingClientRect();
  if (matchWidth) menu.style.minWidth = r.width + 'px';
  const left = Math.min(Math.max(8, r.left), window.innerWidth - menu.offsetWidth - 8);
  let top = r.bottom + 6;
  if (top + menu.offsetHeight > window.innerHeight - 8) {
    top = Math.max(8, r.top - menu.offsetHeight - 6);
    menu.style.transformOrigin = 'bottom left';
  }
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
  anchor.setAttribute('aria-expanded', 'true');

  const items = [...menu.querySelectorAll('[role^="menuitem"]')];
  (items.find((i) => i.getAttribute('aria-checked') === 'true') || items[0]).focus();
  const key = anchor.dataset.menuKey;

  function onOutside(e) {
    if (!menu.contains(e.target) && !anchor.contains(e.target)) close(false);
  }
  const openedAt = performance.now();
  function onViewport(e) {
    // Ignore the scroll that brought the pill into view, or a list still
    // coasting from a swipe, so the menu doesn't vanish as it opens.
    if (e && e.type === 'scroll' && performance.now() - openedAt < 250) return;
    close(false);
  }
  function close(restoreFocus) {
    menu.remove();
    anchor.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onOutside, true);
    window.removeEventListener('scroll', onViewport, true);
    window.removeEventListener('resize', onViewport);
    _vpcMenuClose = null;
    _vpcMenuAnchor = null;
    if (restoreFocus) anchor.focus();
  }
  menu.addEventListener('click', (e) => {
    const item = e.target.closest('[role^="menuitem"]');
    if (!item) return;
    if (!isChoice) {
      close(true);
      onSelect(item.dataset.value);
      return;
    }
    close(false);
    if (item.dataset.value !== current) onSelect(item.dataset.value);
    requestAnimationFrame(() => {
      const target = key ? document.querySelector(`[data-menu-key="${key}"]`) : anchor;
      if (target && document.contains(target)) target.focus();
    });
  });
  menu.addEventListener('keydown', (e) => {
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') items[(i + 1) % items.length].focus();
    else if (e.key === 'ArrowUp') items[(i - 1 + items.length) % items.length].focus();
    else if (e.key === 'Home') items[0].focus();
    else if (e.key === 'End') items[items.length - 1].focus();
    else if (e.key === 'Escape') close(true);
    else if (e.key === 'Tab') close(false);
    else return;
    if (e.key !== 'Tab') e.preventDefault();
  });
  setTimeout(() => document.addEventListener('pointerdown', onOutside, true), 0);
  window.addEventListener('scroll', onViewport, true);
  window.addEventListener('resize', onViewport);
  _vpcMenuClose = close;
  _vpcMenuAnchor = anchor;
};

// ── GLOBAL SEARCH ──────────────────────────────────
function buildSearchIndex() {
  const results = [];
  const K = VPCUtil.KEYS;
  // Orders
  const orders = JSON.parse(localStorage.getItem(K.orders) || '[]');
  orders.forEach((o) =>
    results.push({
      type: 'Order',
      icon: '📦',
      title: o.customer,
      sub: `${o.product} · $${o.salePrice} · ${o.date}`,
      url: 'vault-pine-collective.html',
    })
  );
  // Jet Tags
  const jt = JSON.parse(localStorage.getItem(K.jetTags) || '[]');
  jt.forEach((s) =>
    results.push({
      type: 'Jet Tag Sale',
      icon: '🏷',
      title: s.chars.join(', '),
      sub: `${s.qty} tags · $${s.revenue} · ${s.date}${s.notes ? ' · ' + s.notes : ''}`,
      url: 'vault-pine-collective.html',
    })
  );
  // Pins
  const pins = JSON.parse(localStorage.getItem(K.pins) || '[]');
  pins.forEach((s) =>
    results.push({
      type: 'Pin Sale',
      icon: '📌',
      title: s.chars.join(', '),
      sub: `${s.qty} pins · $${s.revenue} · ${s.date}${s.notes ? ' · ' + s.notes : ''}`,
      url: 'vault-pine-collective.html',
    })
  );
  // Custom category sales
  const cats = {};
  JSON.parse(localStorage.getItem(K.categories) || '[]').forEach((c) => {
    cats[c.id] = c;
  });
  const catItemNames = {};
  JSON.parse(localStorage.getItem(K.catItems) || '[]').forEach((i) => {
    catItemNames[i.catId + '/' + i.id] = i.name;
  });
  JSON.parse(localStorage.getItem(K.catSales) || '[]').forEach((s) =>
    results.push({
      type: `${(cats[s.catId] || {}).name || 'Category'} Sale`,
      icon: ((cats[s.catId] || {}).emoji || '').trim() || '🛍',
      title: (s.items || []).map((iid) => catItemNames[s.catId + '/' + iid] || iid).join(', '),
      sub: `${s.qty} sold · $${s.revenue} · ${s.date}${s.notes ? ' · ' + s.notes : ''}`,
      url: 'vault-pine-collective.html',
    })
  );
  // Events — Events page writes KEYS.events; search once read the wrong key
  // (vp_events_v1, never written) and silently indexed nothing.
  const events = JSON.parse(localStorage.getItem(K.events) || '[]');
  events.forEach((ev) =>
    results.push({
      type: 'Event',
      icon: '🎪',
      title: ev.name,
      sub: `${ev.location || ''} · ${ev.start}${ev.boothCost ? ' · Booth $' + ev.boothCost : ''}`,
      url: 'vault-pine-collective.html',
    })
  );
  // Card inventory (Singles / Slabs / Sealed)
  try {
    const inv = JSON.parse(localStorage.getItem(K.cardInventory) || '[]');
    inv.forEach((it) =>
      results.push({
        type: 'Inventory',
        icon: '🃏',
        title: it.name || 'Inventory item',
        sub: `${it.cat || ''} · qty ${it.qty || 1} · $${(+it.value || 0).toFixed(2)} ${it.lot ? 'total' : 'ea'}${it.notes ? ' · ' + it.notes : ''}`,
        url: 'inventory.html',
      })
    );
  } catch (e) {}
  // Goals
  try {
    const goals = JSON.parse(localStorage.getItem(K.goals) || '{"goals":[]}').goals || [];
    goals.forEach((g) => {
      results.push({
        type: 'Goal',
        icon: '🎯',
        title: g.title || g.name || 'Goal',
        sub: g.desc || '',
        url: 'goals-dashboard.html',
      });
      (g.objectives || []).forEach((ob) =>
        results.push({
          type: 'Objective',
          icon: '✅',
          title: ob.text || 'Objective',
          sub: `Under: ${g.title || ''}`,
          url: 'goals-dashboard.html',
        })
      );
    });
  } catch (e) {}
  // Expenses
  try {
    const exps = JSON.parse(localStorage.getItem(K.expenses) || '[]');
    exps.forEach((e) =>
      results.push({
        type: 'Expense',
        icon: '💸',
        title: e.description || e.category,
        sub: `${e.category} · $${(e.amount || 0).toFixed(2)} · ${e.date}${e.notes ? ' · ' + e.notes : ''}`,
        url: 'expenses.html',
      })
    );
    const recs = JSON.parse(localStorage.getItem(K.recurringExpenses) || '[]');
    recs.forEach((r) =>
      results.push({
        type: 'Recurring',
        icon: '🔄',
        title: r.name,
        sub: `${r.category} · $${(r.amount || 0).toFixed(2)}/mo`,
        url: 'expenses.html',
      })
    );
  } catch (e) {}
  // Pages
  [
    {
      title: 'Vault & Pine Collective',
      sub: 'Sales Hub — orders, business expenses, jet tags, pins, filament, back office',
      url: 'vault-pine-collective.html',
      icon: '🌲',
      type: 'Page',
    },
    {
      title: 'Analytics',
      sub: 'Margins, show breakdowns, trends',
      url: 'analytics.html',
      icon: '📈',
      type: 'Page',
    },
    {
      title: 'Goals & Objectives',
      sub: 'Track your goals',
      url: 'goals-dashboard.html',
      icon: '🎯',
      type: 'Page',
    },
    {
      title: 'Personal Expenses',
      sub: 'Track monthly spending & budget',
      url: 'expenses.html',
      icon: '💸',
      type: 'Page',
    },
    {
      title: 'Daily Review',
      sub: 'Morning briefing — goals, expenses, alerts',
      url: 'review.html',
      icon: '📋',
      type: 'Page',
    },
    {
      title: 'Financial Guru',
      sub: 'Academy lessons, health score, milestones, calculators',
      url: 'guru.html',
      icon: '🥋',
      type: 'Page',
    },
    { title: 'Home', sub: 'Command Center overview', url: 'index.html', icon: '⌂', type: 'Page' },
    {
      title: 'Card Inventory',
      sub: 'Singles, slabs, sealed — stock value over time',
      url: 'inventory.html',
      icon: '🃏',
      type: 'Page',
    },
    {
      title: 'Production Hub',
      sub: 'Print queue and stock levels',
      url: 'production.html',
      icon: '🖨️',
      type: 'Page',
    },
    {
      title: 'Events & Tables',
      sub: 'Shows, vendor tables, payments, ROI',
      url: 'events.html',
      icon: '🎪',
      type: 'Page',
    },
    {
      title: 'Content Planner',
      sub: 'Posts calendar, queue, templates',
      url: 'content.html',
      icon: '📱',
      type: 'Page',
    },
    {
      title: 'Instagram Growth',
      sub: 'Follower snapshots and goal',
      url: 'growth.html',
      icon: '🚀',
      type: 'Page',
    },
  ].forEach((p) => results.push(p));
  return results;
}

let searchIndex = [];
let searchActive = false;

function openSearch() {
  if (searchActive) return;
  searchActive = true;
  searchIndex = buildSearchIndex();

  const overlay = document.createElement('div');
  overlay.id = 'search-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9998;
    display:flex;align-items:flex-start;justify-content:center;padding-top:80px;
  `;
  overlay.innerHTML = `
    <div style="width:90%;max-width:580px;background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
      <div style="display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border);">
        <span style="color:var(--text2);font-size:1.1rem;">🔍</span>
        <input id="search-input" placeholder="Search orders, customers, events, goals…"
          style="flex:1;background:none;border:none;outline:none;font-size:0.95rem;color:var(--text);font-family:inherit;"
          oninput="runSearch(this.value)" autofocus>
        <kbd style="font-size:0.75rem;color:var(--text2);border:1px solid var(--border);border-radius:8px;padding:2px 6px;">ESC</kbd>
      </div>
      <div id="search-results" style="max-height:420px;overflow-y:auto;padding:8px 0;">
        <div style="padding:20px;text-align:center;color:var(--text2);font-size:0.82rem;">Start typing to search…</div>
      </div>
    </div>
  `;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSearch();
  });
  document.body.appendChild(overlay);
  document.getElementById('search-input').focus();
}

function closeSearch() {
  document.getElementById('search-overlay')?.remove();
  searchActive = false;
}

window.runSearch = function (q) {
  const el = document.getElementById('search-results');
  if (!q.trim()) {
    el.innerHTML =
      '<div style="padding:20px;text-align:center;color:var(--text2);font-size:0.82rem;">Start typing to search…</div>';
    return;
  }
  const lower = q.toLowerCase();
  const hits = searchIndex
    .filter((r) => (r.title + ' ' + r.sub + ' ' + r.type).toLowerCase().includes(lower))
    .slice(0, 12);
  if (!hits.length) {
    el.innerHTML =
      '<div style="padding:20px;text-align:center;color:var(--text2);font-size:0.82rem;">No results found</div>';
    return;
  }
  el.innerHTML = hits
    .map(
      (r, i) => `
    <a href="${r.url}" onclick="closeSearch()" style="display:flex;align-items:center;gap:12px;padding:10px 18px;text-decoration:none;transition:background 0.1s;color:var(--text);"
       onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='none'">
      <span style="font-size:1.2rem;flex-shrink:0">${r.icon}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:0.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.title}</div>
        <div style="font-size:0.75rem;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.sub}</div>
      </div>
      <span style="font-size:0.75rem;color:var(--text2);border:1px solid var(--border);border-radius:8px;padding:2px 7px;flex-shrink:0">${r.type}</span>
    </a>
  `
    )
    .join('');
};

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    openSearch();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
    e.preventDefault();
    showAuditLog();
    return;
  }
  if (e.key === 'Escape') {
    closeSearch();
    document.getElementById('shortcuts-overlay')?.remove();
    document.getElementById('audit-overlay')?.remove();
    return;
  }
  // Single-key nav — skip when typing in a field
  const tag = document.activeElement?.tagName;
  if (
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT'
  )
    return;
  switch (e.key) {
    case '?':
      e.preventDefault();
      showShortcutsPanel();
      break;
    case 'h':
      e.preventDefault();
      location.href = 'index.html';
      break;
    case 's':
      e.preventDefault();
      location.href = 'vault-pine-collective.html';
      break;
    case 'g':
      e.preventDefault();
      location.href = 'goals-dashboard.html';
      break;
    case 'e':
      e.preventDefault();
      location.href = 'expenses.html';
      break;
    case 'a':
      e.preventDefault();
      location.href = 'analytics.html';
      break;
    case 'p':
      e.preventDefault();
      location.href = 'production.html';
      break;
    case 'v':
      e.preventDefault();
      location.href = 'events.html';
      break;
    case 'c':
      e.preventDefault();
      location.href = 'content.html';
      break;
    case 'r':
      e.preventDefault();
      location.href = 'review.html';
      break;
    case 'u':
      e.preventDefault();
      location.href = 'guru.html';
      break;
  }
});

// ── KEYBOARD SHORTCUTS PANEL ───────────────────────
function showShortcutsPanel() {
  if (document.getElementById('shortcuts-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'shortcuts-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9997;display:flex;align-items:center;justify-content:center;';
  const rows = [
    ['h', 'Home'],
    ['s', 'Sales Hub'],
    ['g', 'Goals & Objectives'],
    ['e', 'Personal Expenses'],
    ['a', 'Analytics'],
    ['p', 'Production'],
    ['v', 'Events'],
    ['c', 'Content Planner'],
    ['r', 'Daily Review'],
    ['u', 'Financial Guru'],
    ['Ctrl+K', 'Global Search'],
    ['Ctrl+L', 'Audit Log'],
    ['?', 'This shortcuts panel'],
  ]
    .map(
      ([k, d]) => `
    <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border);">
      <kbd style="font-size:0.75rem;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:3px 8px;font-family:monospace;min-width:60px;text-align:center;">${k}</kbd>
      <span style="font-size:0.82rem;color:var(--text2)">${d}</span>
    </div>`
    )
    .join('');
  overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:28px;width:380px;max-width:95vw;">
      <div style="font-size:0.88rem;font-weight:600;margin-bottom:16px;">Keyboard Shortcuts</div>
      ${rows}
      <div style="margin-top:18px;text-align:right;">
        <button onclick="document.getElementById('shortcuts-overlay').remove()" style="background:none;border:1px solid var(--border);border-radius:8px;color:var(--text2);padding:6px 14px;font-size:0.78rem;cursor:pointer;font-family:inherit;">Close (ESC)</button>
      </div>
    </div>`;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

// ── AUDIT LOG ──────────────────────────────────────
const AUDIT_KEY = 'vpc_audit_log';
const AUDIT_MAX = 300;

window.auditLog = function (action, key, detail = '') {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    const log = raw ? JSON.parse(raw) : [];
    log.unshift({
      ts: Date.now(),
      action,
      key,
      detail,
      page: location.pathname.split('/').pop() || 'index.html',
    });
    if (log.length > AUDIT_MAX) log.length = AUDIT_MAX;
    // Use native setItem to avoid triggering sync
    Object.getPrototypeOf(localStorage).setItem.call(localStorage, AUDIT_KEY, JSON.stringify(log));
  } catch (e) {}
};

function showAuditLog() {
  if (document.getElementById('audit-overlay')) return;
  let log = [];
  try {
    log = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
  } catch (e) {}
  const overlay = document.createElement('div');
  overlay.id = 'audit-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9997;display:flex;align-items:center;justify-content:center;';
  const rows = log.length
    ? log
        .slice(0, 60)
        .map((entry) => {
          const d = new Date(entry.ts);
          const ts = d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          return `<div style="display:grid;grid-template-columns:110px 54px 130px 1fr;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.75rem;">
      <span style="color:var(--text2)">${ts}</span>
      <span style="color:var(--accent);font-weight:600">${entry.action}</span>
      <span style="color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${entry.key}</span>
      <span style="color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${entry.detail}</span>
    </div>`;
        })
        .join('')
    : '<div style="color:var(--text2);font-size:0.82rem;padding:24px;text-align:center">No audit entries yet.</div>';
  overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:28px;width:740px;max-width:96vw;max-height:82vh;display:flex;flex-direction:column;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div style="font-size:0.9rem;font-weight:600;">Audit Log <span style="font-size:0.75rem;color:var(--text2);font-weight:400">(last ${Math.min(log.length, 60)} of ${log.length} entries)</span></div>
        <div style="display:flex;gap:8px;">
          <button onclick="localStorage.removeItem('${AUDIT_KEY}');document.getElementById('audit-overlay').remove()" style="background:none;border:1px solid var(--border);border-radius:8px;color:var(--red);padding:5px 12px;font-size:0.75rem;cursor:pointer;font-family:inherit;">Clear Log</button>
          <button onclick="document.getElementById('audit-overlay').remove()" style="background:none;border:1px solid var(--border);border-radius:8px;color:var(--text2);padding:5px 12px;font-size:0.75rem;cursor:pointer;font-family:inherit;">✕ Close</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:110px 54px 130px 1fr;gap:10px;padding:0 0 8px;border-bottom:1px solid var(--border);font-size:0.75rem;font-weight:600;color:var(--text2);">
        <span>Time</span><span>Action</span><span>Key</span><span>Detail</span>
      </div>
      <div style="overflow-y:auto;flex:1;margin-top:4px;">${rows}</div>
    </div>`;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

// ── NOTIFICATIONS ──────────────────────────────────
window.checkAndNotify = function () {
  if (!('Notification' in window) || Notification.permission === 'denied') return;
  const lastCheck = localStorage.getItem('vpc_notif_last_check');
  const today = new Date().toDateString();
  if (lastCheck === today) return;

  const fireAlert = (title, body) => {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/icon-192.png' });
      } catch (e) {}
    }
  };

  const runChecks = () => {
    localStorage.setItem('vpc_notif_last_check', today);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    // Overdue goals
    try {
      const g = JSON.parse(localStorage.getItem('goals_dashboard_v1') || '{"goals":[]}');
      const od = (g.goals || []).filter(
        (x) => !x.done && x.due && new Date(x.due + 'T00:00:00') < now
      );
      if (od.length) {
        fireAlert(
          'Overdue Goals',
          `You have ${od.length} overdue goal${od.length > 1 ? 's' : ''}. Open the Goals dashboard.`
        );
        return;
      }
    } catch (e) {}
    // Budget exceeded
    try {
      const budget = JSON.parse(localStorage.getItem('vpc_expense_budget_v1') || '{"total":0}');
      if (budget.total > 0) {
        const mn = new Date();
        const prefix = `${mn.getFullYear()}-${String(mn.getMonth() + 1).padStart(2, '0')}`;
        const total = JSON.parse(localStorage.getItem('vpc_personal_expenses_v1') || '[]')
          .filter((e) => (e.date || '').startsWith(prefix))
          .reduce((s, e) => s + (e.amount || 0), 0);
        if (total > budget.total) {
          fireAlert(
            'Budget Exceeded',
            `$${total.toFixed(0)} spent vs $${budget.total} budget this month.`
          );
        }
      }
    } catch (e) {}
  };

  if (Notification.permission === 'granted') runChecks();
};

// ══════════════════════════════════════════════════
//  BUSINESS SENSEI — coaching tips, by topic.
//  Shown in the Sensei card on Home.
// ══════════════════════════════════════════════════
const SENSEI_TIPS = {
  sales: [
    {
      cat: 'Pricing',
      head: 'Know your numbers cold',
      body: "Price = COGS + overhead per unit + target margin. If you can't recite your cost in 5 seconds, you're flying blind on every deal.",
    },
    {
      cat: 'Revenue',
      head: 'Revenue is vanity — profit is sanity',
      body: 'A $200 sale with $190 in costs is worse than a $50 sale with $20 in costs. Track margin, not just top-line revenue.',
    },
    {
      cat: 'Tracking',
      head: 'Log every sale the same day',
      body: 'Memory degrades fast. A sale logged a week late is missing context — who bought it, what event, what made them decide.',
    },
    {
      cat: 'Growth',
      head: 'Your best customer is your current one',
      body: 'Repeat buyers cost 5× less to sell to than new ones. Log customer names so you can recognise and reward them.',
    },
    {
      cat: 'Cash Flow',
      head: 'Cash flow ≠ profit',
      body: 'You can be profitable on paper and still run dry. Track when money actually hits your account, not just when a sale is recorded.',
    },
    {
      cat: 'Bundling',
      head: 'Bundle to raise average order value',
      body: '"Pin + Jet Tag combo" at a slight discount moves more units and feels like a deal. Bundling is pricing psychology, not discounting.',
    },
  ],
  goals: [
    {
      cat: 'OKR Method',
      head: 'Set Objectives — not wishes',
      body: 'An Objective is inspiring ("Become the go-to pin brand at local markets"). Key Results are measurable ("Sell at 6 shows, $500 avg"). One without the other fails.',
    },
    {
      cat: 'SMART Goals',
      head: 'Vague goals fail silently',
      body: '"Grow sales" is not a goal. "Hit $2,000 monthly revenue by September 30" is. Every goal needs a number and a deadline.',
    },
    {
      cat: 'Cadence',
      head: 'Goals need weekly check-ins',
      body: 'Set it and forget it = fail it. Schedule a 10-minute Friday review. Update progress, adjust tactics, celebrate small wins.',
    },
    {
      cat: 'Focus',
      head: 'Max 3 active goals at a time',
      body: 'Research shows focus fractures beyond 2–3 simultaneous goals. Pick fewer targets and move them faster.',
    },
    {
      cat: 'Momentum',
      head: 'Break big goals into 90-day sprints',
      body: "Annual goals are too distant to feel urgent. A 90-day sprint creates accountability and teaches you what's actually achievable.",
    },
    {
      cat: 'Reflection',
      head: 'A done goal is a lesson, not a finish line',
      body: 'When you complete a goal, write one line: what worked, what slowed you down. That note is worth more than the goal itself.',
    },
  ],
  expenses: [
    {
      cat: 'Budgeting',
      head: 'Pay yourself a salary first',
      body: 'Set a fixed monthly owner draw before discretionary spending. This keeps you honest about what the business actually generates.',
    },
    {
      cat: 'Categories',
      head: 'Track categories, not just totals',
      body: 'Knowing you spent $800 is useless. Knowing $350 was supplies, $200 was fees, and $250 was impulse buys tells you where to cut.',
    },
    {
      cat: 'Fixed Costs',
      head: 'Know your break-even number cold',
      body: 'Break-even = Fixed Monthly Costs ÷ Average Profit per Item. This is the minimum you must sell to stay solvent.',
    },
    {
      cat: 'Tax',
      head: 'Log expenses as they happen',
      body: 'Missing a receipt is money left on the table. Supplies, event fees, shipping, and mileage are all deductible — if you can prove them.',
    },
    {
      cat: 'Audit',
      head: '30-day expense audit challenge',
      body: 'Once a month: go through every line and ask "did this directly help generate revenue?" No? It\'s a candidate to cut.',
    },
    {
      cat: 'Ratio',
      head: 'Healthy expense-to-revenue ratio',
      body: "For a product business, aim to keep total expenses under 60% of revenue. If higher, you're working hard to give money away.",
    },
  ],
  analytics: [
    {
      cat: 'Margins',
      head: 'Gross Margin is your health score',
      body: 'Gross Margin = (Revenue − COGS) ÷ Revenue × 100. Healthy product businesses target 40–60%. Below 30% means a pricing or cost problem.',
    },
    {
      cat: 'Trends',
      head: 'Month-over-month beats year-over-year early on',
      body: "When you're growing, year-over-year comparisons are noise. Watch month-over-month to catch trends you can act on right now.",
    },
    {
      cat: 'KPIs',
      head: 'Measure what you manage',
      body: "If you're not tracking a metric, you're not managing it. Pick 3–5 KPIs that directly predict success and review them every week.",
    },
    {
      cat: 'Segmentation',
      head: 'Not all revenue is equal',
      body: 'Break down revenue by product line. A slow event might be your most profitable per hour if booth costs are low — totals hide this.',
    },
  ],
  events: [
    {
      cat: 'Economics',
      head: 'Calculate break-even before every show',
      body: 'Break-even = Booth Fee ÷ Avg Profit per Item. $100 booth at $8/item = 13 items before any profit begins. Know this number going in.',
    },
    {
      cat: 'Prep',
      head: 'Your setup speed is a competitive edge',
      body: 'Aim for 45-minute setup. Log what slowed you at teardown. Faster setup = sales during peak morning foot traffic.',
    },
    {
      cat: 'Data',
      head: 'Log event data immediately after',
      body: 'Revenue, booth cost, hours, weather, foot traffic — capture it while fresh. This data decides which shows you return to.',
    },
    {
      cat: 'Strategy',
      head: 'Track revenue per hour, not per event',
      body: 'A $300 show over 10 hours = $30/hr. A $150 show over 4 hours = $37.50/hr. The smaller show is more efficient.',
    },
    {
      cat: 'Display',
      head: 'Eye level is buy level',
      body: 'Products at customer eye level sell 3× faster than products on the table. Invest in risers, pegboards, and vertical display.',
    },
  ],
  production: [
    {
      cat: 'Inventory',
      head: 'First In, First Out (FIFO) for materials',
      body: 'Always use your oldest stock first. This prevents material degradation and reveals your true usage rate over time.',
    },
    {
      cat: 'Quality',
      head: 'Build a defect log',
      body: 'Track every failed print or rejected item with cause and cost. Patterns show where waste is concentrated — fix that first.',
    },
    {
      cat: 'Efficiency',
      head: 'Batch similar jobs together',
      body: 'Switching colors or materials has a hidden setup cost. Group similar runs to minimize changeover time and material waste.',
    },
    {
      cat: 'Costs',
      head: 'Depreciate your equipment in pricing',
      body: "A $400 printer lasting 2 years = $16.67/month machine cost. Factor this into COGS per print or you're underpricing.",
    },
  ],
  content: [
    {
      cat: 'Strategy',
      head: 'Content without a CTA is decoration',
      body: 'Every post needs one clear action: visit the shop, DM for customs, share with a friend. One CTA, not three.',
    },
    {
      cat: 'Consistency',
      head: 'Schedule beats quality early on',
      body: 'Posting 3×/week consistently outperforms one perfect photo per month. Algorithms and audiences reward regularity over perfection.',
    },
    {
      cat: 'Metrics',
      head: 'Saves beat likes as a success signal',
      body: "A save means someone plans to return. That's purchase intent. Track saves and DMs over follower count.",
    },
    {
      cat: 'Batching',
      head: 'Create content in batches',
      body: 'Spend 2 hours one day shooting and captioning 10 posts. Schedule them out. Creation and strategy are different cognitive modes.',
    },
  ],
  general: [
    {
      cat: 'Fundamentals',
      head: 'Three questions that run a business',
      body: "Every Friday ask: How much did I make? How much did I spend? Am I on track for this month's goal? Three questions, one habit.",
    },
    {
      cat: 'Systems',
      head: 'Your business is a system — not a job',
      body: 'Document your processes: pricing formula, packing routine, follow-up. A system runs without you there. A job needs you.',
    },
    {
      cat: 'Banking',
      head: 'Separate business and personal money now',
      body: 'Open a dedicated business account. Even if small. Mixed finances make tax time painful and hide true profitability.',
    },
    {
      cat: 'Customers',
      head: 'Ask customers why they bought',
      body: 'Not why they should — why they did. "I loved the pine tree" is a product roadmap. "Fast delivery" is a logistics priority.',
    },
    {
      cat: 'Mindset',
      head: 'Done beats perfect in business',
      body: 'A product launched at 80% earns revenue that funds the last 20%. A perfect product that never launches earns nothing.',
    },
    {
      cat: 'Pricing',
      head: "Raise prices before you think you're ready",
      body: "Most small business owners undercharge. If no one pushes back on your price, it's probably too low. Test a 10–15% increase.",
    },
  ],
};

// Expose tips for use by individual pages
window.SENSEI_TIPS = SENSEI_TIPS;

// ── PWA ───────────────────────────────────────────
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch(() => {});

  // When a freshly-installed worker takes control, reload once so the page
  // is running the new code/markup immediately (network-first SW already
  // fetched it) instead of one refresh behind. Guarded so it fires at most once.
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}

// ── INIT ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // ── Smart back-link tracking ──────────────────────────
  const _curPage = location.pathname.split('/').pop() || 'index.html';
  const _prevPage = sessionStorage.getItem('vpc_last_page');
  if (_prevPage && _prevPage !== _curPage) {
    sessionStorage.setItem('vpc_prev_page', _prevPage);
    // Inject back-link into any .smart-back element on page
    const backEl = document.querySelector('.smart-back');
    if (backEl && _prevPage !== 'index.html') {
      const labels = {
        'review.html': '← Daily Review',
        'expenses.html': '← Expenses',
        'goals-dashboard.html': '← Goals',
        'analytics.html': '← Analytics',
        'vault-pine-collective.html': '← Dashboard',
        'production.html': '← Production',
        'content.html': '← Content',
        'events.html': '← Events',
      };
      backEl.href = _prevPage;
      backEl.textContent = labels[_prevPage] || '← Back';
      backEl.classList.add('visible');
    }
  }
  sessionStorage.setItem('vpc_last_page', _curPage);
  injectAppNav();
  registerSW();
  // Deferred: daily reminder check (only if reminders are turned on)
  setTimeout(checkAndNotify, 2000);
});
