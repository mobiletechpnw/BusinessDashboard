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
const VAULT = 'vault-pine-collective.html';
// Sales Hub sections are links too (#hash), so the hub needs no section row.
const NAV = [
  {
    items: [
      { href: 'index.html', icon: 'home', label: 'Home', tab: 'home' },
      { href: 'review.html', icon: 'review', label: 'Daily Review' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: VAULT + '#sales', icon: 'sales', label: 'Sales Hub', tab: 'sales' },
      { href: 'inventory.html', icon: 'cards', label: 'Card Inventory' },
      { href: VAULT + '#jettags', icon: 'tag', label: 'Jet Tags', tab: 'sales' },
      { href: VAULT + '#pins', icon: 'pin', label: 'Pins', tab: 'sales' },
      { categories: true }, // product categories you add on the Sales Hub
      { action: 'newcat', icon: 'plus', label: 'New category' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: 'production.html', icon: 'production', label: 'Production', tab: 'production' },
      { href: 'events.html', icon: 'events', label: 'Events', tab: 'events' },
      { href: 'show.html', icon: 'bolt', label: 'Show Mode' },
    ],
  },
  {
    label: 'Money',
    items: [
      { href: 'analytics.html', icon: 'analytics', label: 'Analytics' },
      { href: VAULT + '#expenses', icon: 'receipt', label: 'Business Expenses' },
      { href: 'expenses.html', icon: 'expenses', label: 'Personal Expenses' },
      { href: 'guru.html', icon: 'guru', label: 'Guru' },
    ],
  },
  {
    label: 'Growth',
    items: [
      { href: 'goals-dashboard.html', icon: 'goals', label: 'Goals' },
      { href: 'content.html', icon: 'content', label: 'Content' },
      { href: 'growth.html', icon: 'growth', label: 'Instagram' },
    ],
  },
];

// The four places used most get a tab on phones; everything else is in More.
const NAV_TABS = [
  { key: 'home', href: 'index.html', icon: 'home', label: 'Home' },
  { key: 'sales', href: VAULT + '#sales', icon: 'sales', label: 'Sales' },
  { key: 'production', href: 'production.html', icon: 'production', label: 'Production' },
  { key: 'events', href: 'events.html', icon: 'events', label: 'Events' },
];

// Icons come from the shared set in icons.svg (see VPCUtil.icon in util.js).
const navIcon = (name) => VPCUtil.icon(name);
window.vpcIcon = navIcon;
function navEsc(s) {
  return String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}
function navCurrentPage() {
  return location.pathname.split('/').pop() || 'index.html';
}
// The nav groups with your product categories filled in.
function navGroups() {
  let cats = [];
  try {
    cats = window.VPCUtil?.customCategories?.() || [];
  } catch (e) {}
  return NAV.map((g) => ({
    ...g,
    items: g.items.flatMap((i) =>
      i.categories
        ? cats.map((c) => ({
            href: `${VAULT}#cat-${c.id}`,
            icon: 'category',
            label: c.name,
            tab: 'sales',
          }))
        : [i]
    ),
  }));
}
// The link for where you are. A Sales Hub section matches by its #hash; any
// other hash on a page falls back to that page's first link.
function navCurrentItem(groups) {
  const page = navCurrentPage();
  const links = groups.flatMap((g) => g.items).filter((i) => i.href);
  return (
    links.find((i) => i.href === page + location.hash) ||
    links.find((i) => i.href.split('#')[0] === page) ||
    null
  );
}
function navLinksHTML(groups = navGroups()) {
  const cur = navCurrentItem(groups);
  return groups
    .map(
      (g) =>
        (g.label ? `<div class="vpc-nav-label">${g.label}</div>` : '') +
        g.items
          .map((i) =>
            i.action
              ? `<button type="button" class="vpc-nav-link is-action" data-nav-action="${i.action}">${navIcon(i.icon)}<span>${i.label}</span></button>`
              : `<a href="${i.href}" class="vpc-nav-link"${i === cur ? ' aria-current="page"' : ''}>${navIcon(i.icon)}<span>${navEsc(i.label)}</span></a>`
          )
          .join('')
    )
    .join('');
}
function navTabsHTML(groups = navGroups()) {
  const tab = navCurrentItem(groups)?.tab;
  return (
    '<div class="vpc-tabbar-inner">' +
    NAV_TABS.map(
      (t) =>
        `<a href="${t.href}"${t.key === tab ? ' aria-current="page"' : ''}>${navIcon(t.icon)}<span>${t.label}</span></a>`
    ).join('') +
    `<button type="button" data-nav-action="more" aria-haspopup="dialog" aria-expanded="false"${tab ? '' : ' class="is-current"'}>${navIcon('more')}<span>More</span></button>` +
    '</div>'
  );
}
// Re-mark where you are (and pick up new or renamed categories). The tab
// bar's buttons are kept, so focus and an open More sheet are undisturbed.
window.vpcRefreshNav = function () {
  const groups = navGroups();
  document.querySelectorAll('.vpc-nav').forEach((n) => (n.innerHTML = navLinksHTML(groups)));
  const tab = navCurrentItem(groups)?.tab;
  document.querySelectorAll('.vpc-tabbar a').forEach((a, i) => {
    if (NAV_TABS[i]?.key === tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document
    .querySelector('.vpc-tabbar [data-nav-action="more"]')
    ?.classList.toggle('is-current', !tab);
};
window.addEventListener('hashchange', () => window.vpcRefreshNav());
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
  if (keyboard) acts.push({ value: 'appearance', label: 'Appearance', icon: 'contrast' });
  acts.push({ value: 'backoffice', label: 'Back office', icon: 'archive' });
  if (keyboard) acts.push({ value: 'shortcuts', label: 'Keyboard shortcuts', icon: 'keyboard' });
  acts.push({ value: 'activity', label: 'Activity log', icon: 'activity' });
  acts.push({ value: 'signout', label: 'Sign out', icon: 'signout', danger: true });
  return acts;
}

function injectAppNav() {
  // A focused page (Show Mode) asks for no navigation chrome.
  if (document.body.dataset.nav === 'none') return trackHeaderHeight();
  const groups = navGroups();

  const side = document.createElement('div');
  side.className = 'vpc-sidebar';
  side.innerHTML =
    '<a class="vpc-brand" href="index.html"><span class="vpc-brand-mark" aria-hidden="true">🌲</span>Vault &amp; Pine</a>' +
    navSearchHTML() +
    `<nav class="vpc-nav" aria-label="Main">${navLinksHTML(groups)}</nav>` +
    '<div class="vpc-sidebar-foot"><button type="button" class="vpc-account" data-nav-action="account" aria-haspopup="menu" aria-expanded="false">' +
    navWhoHTML() +
    navIcon('chevrons') +
    '</button></div>';
  document.body.prepend(side);

  const tabs = document.createElement('nav');
  tabs.className = 'vpc-tabbar';
  tabs.setAttribute('aria-label', 'Main');
  tabs.innerHTML = navTabsHTML(groups);
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
        <nav class="vpc-nav" aria-label="All pages">${navLinksHTML()}</nav>
        <div class="vpc-nav-label">Account</div>
        <div class="vpc-sheet-who">${navWhoHTML()}</div>
        <div class="vpc-sheet-row"><span id="vpc-theme-label">Appearance</span>
          <div class="seg" id="vpc-theme-seg" aria-labelledby="vpc-theme-label">
            <button data-value="auto">Auto</button><button data-value="light">Light</button><button data-value="dark">Dark</button>
          </div>
        </div>
        ${navAccountActions({ keyboard: false })
          .map(
            (a) =>
              `<button type="button" class="vpc-nav-link${a.danger ? ' is-danger' : ''}" data-nav-action="${a.value}">${navIcon(a.icon)}<span>${a.label}</span></button>`
          )
          .join('')}
      </div>
    </div>`;
  document.body.appendChild(wrap);
  vpcSeg(wrap.querySelector('#vpc-theme-seg'), (v) => VPCUtil.setTheme(v)).set(
    VPCUtil.themeChoice()
  );
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
  } else if (action === 'newcat') {
    closeMoreSheet(false);
    if (navCurrentPage() === VAULT && typeof window.openCatModal === 'function') openCatModal();
    else location.href = VAULT + '#newcat';
  } else if (action === 'appearance') {
    vpcMenu(el, {
      label: 'Appearance',
      current: VPCUtil.themeChoice(),
      options: [
        { value: 'auto', label: 'Match device', color: 'transparent' },
        { value: 'light', label: 'Light', color: 'transparent' },
        { value: 'dark', label: 'Dark', color: 'transparent' },
      ],
      onSelect: (v) => VPCUtil.setTheme(v),
    });
  } else if (action === 'backoffice') {
    closeMoreSheet(false);
    location.href = VAULT + '#backoffice';
  } else if (action === 'signout') window.VpcAuth?.signOut();
}
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-nav-action]');
  if (el) runNavAction(el.dataset.navAction, el);
  // A link to another part of this page (a Sales Hub section) changes only
  // the #hash, so close the sheet rather than leave it covering the page.
  else if (e.target.closest('.vpc-sheet a[href]')) closeMoreSheet(false);
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
window.vpcMenu = function (anchor, { label, options, current, onSelect, header, matchWidth, at }) {
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
            `<span class="vpc-menu-check" aria-hidden="true">${VPCUtil.icon('check')}</span>${esc(o.label)}` +
            `<span class="vpc-menu-dot" aria-hidden="true" style="background:${o.color || 'var(--text2)'}"></span></button>`
          : `<button type="button" role="menuitem" data-value="${esc(o.value)}"${o.danger ? ' class="is-danger"' : ''}>` +
            `${o.icon || ''}${esc(o.label)}</button>`
      )
      .join('');
  document.body.appendChild(menu);

  // `at` ({ x, y }) opens the menu at the pointer, as a context menu.
  const r = at
    ? { left: at.x, right: at.x, top: at.y, bottom: at.y, width: 0 }
    : anchor.getBoundingClientRect();
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

// ── SEGMENTED CONTROL ──────────────────────────────
// Replaces rows of pills: <div class="seg" aria-label="…"> holding
// <button data-value="…" aria-checked="true|false"> options. Click or the
// arrow keys pick one, and the group is a single tab stop.
//   const seg = vpcSeg(el, (value) => …);   seg.set(value) selects quietly.
window.vpcSeg = function (el, onChange) {
  const opts = [...el.querySelectorAll('button')];
  el.setAttribute('role', 'radiogroup');
  const pick = (btn, { focus = false, fire = true } = {}) => {
    opts.forEach((o) => {
      const on = o === btn;
      o.setAttribute('aria-checked', String(on));
      o.tabIndex = on ? 0 : -1;
    });
    if (focus) btn.focus();
    if (fire && onChange) onChange(btn.dataset.value, btn);
  };
  opts.forEach((o) => {
    o.type = 'button';
    o.setAttribute('role', 'radio');
    o.addEventListener('click', () => {
      if (o.getAttribute('aria-checked') !== 'true') pick(o);
    });
  });
  el.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const i = opts.findIndex((o) => o.getAttribute('aria-checked') === 'true');
    pick(opts[(i + step + opts.length) % opts.length], { focus: true });
  });
  pick(opts.find((o) => o.getAttribute('aria-checked') === 'true') || opts[0], { fire: false });
  return {
    set(value) {
      const btn = opts.find((o) => o.dataset.value === value);
      if (btn) pick(btn, { fire: false });
    },
  };
};

// ── FORMS: steppers, segmented statuses, switches, inline errors ──
// Pages opt in with attributes; the underlying input or select keeps the
// value, so each page's own open/save code is unchanged.
//   <input type="number" data-stepper>      − value + buttons
//   <select data-seg>                        a segmented control
//   <select data-switch="printed">           a switch, on when the value is "printed"
//   <input required min="0" data-error="…">  error text under the field
// Money inputs (step="0.01") get the decimal keypad, and a "($)" in their
// label becomes a $ inside the field.
const plainText = (s) =>
  String(s)
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .trim();
let _formUid = 0;
const formId = (el, prefix) => el.id || (el.id = `${prefix}-${++_formUid}`);
const fieldLabel = (el) => el.closest('.field')?.querySelector(':scope > label');

function enhanceStepper(input) {
  const wrap = document.createElement('div');
  wrap.className = 'stepper';
  input.replaceWith(wrap);
  const btn = (dir, text, name) =>
    `<button type="button" class="step-btn" data-step="${dir}" aria-label="${name}" tabindex="-1">${text}</button>`;
  wrap.insertAdjacentHTML('afterbegin', btn(-1, '−', 'Decrease'));
  wrap.appendChild(input);
  wrap.insertAdjacentHTML('beforeend', btn(1, '+', 'Increase'));
  input.inputMode = 'numeric';
  wrap.addEventListener('click', (e) => {
    const b = e.target.closest('.step-btn');
    if (!b) return;
    const step = parseFloat(input.step) || 1;
    const min = input.min === '' ? -Infinity : parseFloat(input.min);
    const max = input.max === '' ? Infinity : parseFloat(input.max);
    const next = (parseFloat(input.value) || 0) + step * +b.dataset.step;
    input.value = String(Math.min(max, Math.max(min, next)));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function enhanceSelectSeg(select) {
  const seg = document.createElement('div');
  seg.className = 'seg seg-field';
  seg.innerHTML = [...select.options]
    .map(
      (o) =>
        `<button data-value="${navEsc(o.value)}" aria-checked="${o.selected}">${navEsc(plainText(o.textContent))}</button>`
    )
    .join('');
  const label = fieldLabel(select);
  if (label) seg.setAttribute('aria-labelledby', formId(label, 'lbl'));
  select.hidden = true;
  select.after(seg);
  select._seg = vpcSeg(seg, (v) => {
    select.value = v;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function enhanceSelectSwitch(select) {
  const on = select.dataset.switch;
  const off = [...select.options].find((o) => o.value !== on)?.value ?? '';
  const sw = document.createElement('input');
  sw.type = 'checkbox';
  sw.className = 'switch';
  sw.setAttribute('role', 'switch');
  const label = fieldLabel(select);
  if (label) label.htmlFor = formId(sw, 'sw');
  label?.closest('.field')?.classList.add('field-switch');
  select.hidden = true;
  select.after(sw);
  sw.addEventListener('change', () => {
    select.value = sw.checked ? on : off;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  select._switch = sw;
}

function enhanceMoney(input) {
  input.inputMode = 'decimal';
  const label = fieldLabel(input);
  if (
    !label ||
    !/\(\$\)/.test(label.textContent) ||
    input.parentElement.classList.contains('money')
  )
    return;
  label.innerHTML = label.innerHTML.replace(/\s*\(\$\)/, '<span class="unit"> ($)</span>');
  const wrap = document.createElement('div');
  wrap.className = 'money';
  input.replaceWith(wrap);
  wrap.appendChild(input);
}

window.vpcEnhanceForms = function (root = document) {
  root.querySelectorAll('input[type="number"][data-stepper]').forEach((i) => {
    if (!i.closest('.stepper')) enhanceStepper(i);
  });
  root.querySelectorAll('select[data-seg]').forEach((s) => s._seg || enhanceSelectSeg(s));
  root.querySelectorAll('select[data-switch]').forEach((s) => s._switch || enhanceSelectSwitch(s));
  root.querySelectorAll('input[type="number"][step="0.01"]').forEach(enhanceMoney);
  // A field that is just a label and one control can read as an inset row
  // on a phone (styles.css); anything richer keeps its label above.
  const SIMPLE =
    'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):not([type="color"]):not([type="range"]):not([type="file"]), select:not([hidden]), .money, .stepper';
  root.querySelectorAll('.modal .field').forEach((f) => {
    const kids = [...f.children].filter((c) => !c.classList.contains('field-error'));
    f.classList.toggle(
      'field-inset',
      kids.length === 2 && kids[0].tagName === 'LABEL' && kids[1].matches(SIMPLE)
    );
  });
};

// Pull the controls back in line with their select after a page set
// values (for example when an edit dialog opens), and clear old errors.
window.vpcSyncForms = function (root) {
  root.querySelectorAll('select[data-seg]').forEach((s) => s._seg?.set(s.value));
  root.querySelectorAll('select[data-switch]').forEach((s) => {
    if (s._switch) s._switch.checked = s.value === s.dataset.switch;
  });
  root.querySelectorAll('[aria-invalid="true"]').forEach((i) => fieldError(i, ''));
};

function fieldError(input, msg) {
  const field = input.closest('.field') || input.parentElement;
  let el = field.querySelector(':scope > .field-error');
  if (!msg) {
    el?.remove();
    input.removeAttribute('aria-invalid');
    return;
  }
  if (!el) {
    el = document.createElement('div');
    el.className = 'field-error';
    el.id = formId(input, 'in') + '-error';
    field.appendChild(el);
  }
  el.textContent = msg;
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', el.id);
}
function checkField(input) {
  const v = input.validity;
  let msg = '';
  if (!v.valid) {
    msg =
      input.dataset.error ||
      (v.valueMissing
        ? 'Required'
        : v.rangeUnderflow
          ? `Enter ${input.min} or more`
          : v.rangeOverflow
            ? `Enter ${input.max} or less`
            : 'Enter a valid value');
  }
  fieldError(input, msg);
  return !msg;
}
const CHECKED = 'input[required], input[min], input[max], select[required], textarea[required]';
// Check every field in a form (or dialog) at once: errors appear under the
// fields, the first one gets focus, and the result says whether to save.
window.vpcValidate = function (root) {
  if (typeof root === 'string') root = document.getElementById(root);
  if (!root) return true;
  const bad = [...root.querySelectorAll(CHECKED)].filter(
    (i) => i.offsetParent !== null && !checkField(i)
  );
  bad[0]?.focus();
  return !bad.length;
};
// Errors show as soon as you leave a field, and clear as you fix them.
document.addEventListener('focusout', (e) => {
  if (e.target.matches?.(CHECKED) && e.target.closest('.modal')) checkField(e.target);
});
document.addEventListener('input', (e) => {
  if (e.target.getAttribute?.('aria-invalid') === 'true') checkField(e.target);
});

// A dialog opening re-syncs its controls; Escape closes the top one the
// way its own Cancel button would.
function watchDialogs() {
  const seen = new WeakSet();
  const mo = new MutationObserver((records) =>
    records.forEach((r) => {
      if (r.target.classList.contains('open')) vpcSyncForms(r.target);
      if (r.target.hasAttribute('data-detents')) sheetStopsToggle(r.target);
    })
  );
  document.querySelectorAll('.modal-overlay').forEach((o) => {
    if (seen.has(o)) return;
    seen.add(o);
    mo.observe(o, { attributes: true, attributeFilter: ['class'] });
  });
}
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || e.defaultPrevented) return;
  // Search, shortcuts and the activity log close first (their own handler).
  if (document.querySelector('#search-overlay, #shortcuts-overlay, #audit-overlay')) return;
  const top = [...document.querySelectorAll('.modal-overlay.open')].pop();
  if (top) closeDialog(top);
});

// ── MOTION AND SMALL MOMENTS ───────────────────────
// Each one does a job; all of them respect reduced motion.
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Numbers roll to their new value (about 400ms), keeping the format of the
// text they replace ("$4,111.00", "74.9%", "47"). Reduced motion: instant.
window.vpcRoll = function (el, text, duration = 400) {
  if (!el) return;
  text = String(text);
  const parse = (t) => parseFloat(String(t).replace(/[^0-9.-]/g, ''));
  const from = parse(el.textContent);
  const to = parse(text);
  // A newer roll on the same element (quick taps) takes over from this one.
  const token = (el._roll = (el._roll || 0) + 1);
  // "-$1,234.50" → sign, "$", the number (its decimals), and what follows.
  const m = text.match(/^(-?)([^0-9]*)[0-9][0-9,]*(?:\.([0-9]+))?(.*)$/);
  if (reducedMotion() || !m || !isFinite(from) || !isFinite(to) || from === to) {
    el.textContent = text;
    return;
  }
  const [, , prefix, frac = '', suffix] = m;
  const fmt = (v) =>
    (v < 0 ? '-' : '') +
    prefix +
    Math.abs(v).toLocaleString('en-US', {
      minimumFractionDigits: frac.length,
      maximumFractionDigits: frac.length,
    }) +
    suffix;
  const start = performance.now();
  (function frame(t) {
    if (el._roll !== token) return;
    const k = Math.min(1, (t - start) / duration);
    el.textContent = k < 1 ? fmt(from + (to - from) * (1 - Math.pow(1 - k, 3))) : text;
    if (k < 1) requestAnimationFrame(frame);
  })(start);
};

// Long-press on touch screens (the right-click of a phone). The handler gets
// a point to open a menu at.
window.vpcLongPress = function (el, handler, ms = 450) {
  let timer = null;
  let start = null;
  let startTarget = null;
  el.addEventListener('pointerdown', (e) => {
    // A long press whose lift produced no click (the finger came up over
    // the menu it opened) mustn't swallow the next ordinary tap.
    el._longPressed = false;
    if (e.pointerType !== 'touch') return;
    start = { x: e.clientX, y: e.clientY };
    startTarget = e.target;
    timer = setTimeout(() => {
      timer = null;
      el._longPressed = true;
      navigator.vibrate?.(10);
      handler({
        clientX: start.x,
        clientY: start.y,
        currentTarget: el,
        target: startTarget,
        preventDefault() {},
      });
    }, ms);
  });
  const cancel = (e) => {
    if (
      timer &&
      e.type === 'pointermove' &&
      Math.hypot(e.clientX - start.x, e.clientY - start.y) < 10
    )
      return;
    clearTimeout(timer);
    timer = null;
  };
  el.addEventListener('pointermove', cancel);
  el.addEventListener('pointerup', cancel);
  el.addEventListener('pointercancel', cancel);
  // The click that ends a long press shouldn't also open the row.
  el.addEventListener(
    'click',
    (e) => {
      if (el._longPressed) {
        el._longPressed = false;
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true
  );
  el.addEventListener('contextmenu', (e) => {
    if (e.pointerType === 'touch' || el._longPressed) e.preventDefault();
  });
};

// Swipe a phone sheet down by its top edge to close it, like iOS. Touch
// events, not pointer events: the browser would take a downward drag as a
// scroll and cancel the pointer stream, so the sheet never followed.
// A sheet with stops (sheetStops, below) drags between half and full too.
function enableSheetSwipe() {
  let drag = null;
  let lastDrag = 0;
  document.addEventListener(
    'touchstart',
    (e) => {
      drag = null;
      if (e.touches.length !== 1 || window.innerWidth > 700) return;
      const sheet = e.target.closest?.('.modal-overlay.open > .modal, .vpc-sheet');
      if (!sheet) return;
      const { clientY } = e.touches[0];
      const stop = sheet.dataset.stop;
      // At half the whole sheet is the handle; at full, any of it once the
      // content is scrolled to its top; a plain sheet, only its top edge.
      if (stop !== 'half' && sheet.scrollTop > 0) return;
      if (!stop && clientY - sheet.getBoundingClientRect().top > 64) return;
      const now = performance.now();
      drag = { sheet, stop, y0: clientY, dy: 0, moved: false, lastY: clientY, lastT: now, v: 0 };
      if (stop) {
        drag.half = Math.max(0, sheet.offsetHeight - sheetHalfPx()); // the half stop, in px down
        drag.base = stop === 'half' ? drag.half : 0;
      }
    },
    { passive: true }
  );
  document.addEventListener(
    'touchmove',
    (e) => {
      if (!drag) return;
      const y = e.touches[0].clientY;
      const d = y - drag.y0;
      if (!drag.moved) {
        // Upward first: the content scrolls as usual. At the half stop an
        // upward drag lifts the sheet instead.
        if (d < 0 && drag.stop !== 'half') {
          drag = null;
          return;
        }
        // A sheet with stops waits a few pixels, so taps on its controls stay taps.
        if (drag.stop && Math.abs(d) < 6) {
          if (d > 0) e.preventDefault(); // no bounce while it decides
          return;
        }
      }
      e.preventDefault(); // the sheet follows the finger instead of the page scrolling
      const now = performance.now();
      drag.v = (y - drag.lastY) / Math.max(1, now - drag.lastT);
      drag.lastY = y;
      drag.lastT = now;
      if (!drag.moved) drag.sheet.style.transition = 'none';
      drag.moved = true;
      if (drag.stop) {
        drag.dy = d;
        const at = drag.base + d;
        // Above the full stop it gives a little, then holds.
        drag.sheet.style.transform = `translateY(${at < 0 ? Math.max(-24, at / 4) : at}px)`;
      } else {
        drag.dy = Math.max(0, d);
        drag.sheet.style.transform = `translateY(${drag.dy}px)`;
      }
    },
    { passive: false }
  );
  const close = (sheet) => {
    sheet.style.transform = 'translateY(100%)';
    setTimeout(() => {
      sheet.style.transform = '';
      sheet.style.transition = '';
      if (sheet.classList.contains('vpc-sheet')) closeMoreSheet(true);
      else closeDialog(sheet.closest('.modal-overlay'));
    }, 220);
  };
  const end = (e) => {
    if (!drag) return;
    const { sheet, stop, dy, moved, v, lastT } = drag;
    const { half, base } = drag;
    drag = null;
    if (!moved) return; // a tap
    const flick = Math.abs(v) > 0.5 && performance.now() - lastT < 100;
    sheet.style.transition = 'transform var(--t-move) var(--ease-sheet)';
    if (stop) {
      if (e.cancelable) e.preventDefault(); // the drag was not a tap on what it began on
      lastDrag = performance.now();
      const at = base + dy; // 0 is the full stop, half the half one
      let to;
      if (flick) to = v < 0 ? 'full' : at < half ? 'half' : at > half + 40 ? 'close' : 'half';
      else if (at > half + 120) to = 'close';
      else to = at < half / 2 ? 'full' : 'half';
      if (to === 'close') return close(sheet);
      setSheetStop(sheet, to);
      sheet.style.transform = '';
      setTimeout(() => (sheet.style.transition = ''), 320);
      return;
    }
    if (dy > 120 || (flick && v > 0 && dy > 40)) close(sheet);
    else {
      sheet.style.transform = '';
      setTimeout(() => (sheet.style.transition = ''), 320);
    }
  };
  document.addEventListener('touchend', end);
  document.addEventListener('touchcancel', end);

  // A tap on the grabber strip switches half and full; focus moving into the
  // part a half sheet hides lifts it to full, so nothing is reached unseen.
  document.addEventListener('click', (e) => {
    const sheet = e.target;
    if (!sheet.matches?.('.modal-overlay[data-detents] > .modal[data-stop]')) return;
    if (performance.now() - lastDrag < 400) return;
    if (e.clientY - sheet.getBoundingClientRect().top > 24) return;
    setSheetStop(sheet, sheet.dataset.stop === 'half' ? 'full' : 'half');
  });
  document.addEventListener('focusin', (e) => {
    const sheet = e.target.closest?.('.modal-overlay[data-detents] > .modal[data-stop="half"]');
    if (sheet && e.target.getBoundingClientRect().bottom > window.innerHeight - 8) {
      setSheetStop(sheet, 'full');
    }
  });
  // Content scrolled at half (bringing something into view) lifts it to full.
  document.addEventListener(
    'scroll',
    (e) => {
      const sheet = e.target;
      if (sheet.matches?.('.modal-overlay[data-detents] > .modal[data-stop="half"]')) {
        setSheetStop(sheet, 'full');
      }
    },
    true
  );
}

// ── SHEET STOPS ────────────────────────────────────
// A sheet whose overlay carries data-detents opens on touch phones with half
// the screen showing (--sheet-half), drags up to its full height, and at full
// the page behind recedes a little (--sheet-recede), as on iOS. A sheet with
// little to show opens at its own height, as every other sheet does.
function sheetStopsToggle(overlay) {
  const sheet = overlay.querySelector(':scope > .modal');
  if (!sheet) return;
  if (!overlay.classList.contains('open')) return setSheetStop(sheet, null);
  if (!window.matchMedia('(max-width: 700px) and (pointer: coarse)').matches) return;
  sheet.scrollTop = 0;
  setSheetStop(sheet, sheet.offsetHeight - sheetHalfPx() > 48 ? 'half' : null);
}
function setSheetStop(sheet, stop) {
  if (stop) sheet.dataset.stop = stop;
  else delete sheet.dataset.stop;
  recedePage(stop === 'full');
}
// --sheet-half in pixels, as the stylesheet resolves it on this screen.
function sheetHalfPx() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;visibility:hidden;height:var(--sheet-half)';
  document.body.appendChild(probe);
  const h = probe.offsetHeight;
  probe.remove();
  return h;
}
// The page behind shrinks toward the top centre of the screen. Each block of
// the body scales about that one point, so together they move as one page;
// sheets, popovers and toasts stay as they are.
let recedeTimer = 0;
function recedePage(on) {
  const root = document.documentElement;
  if (on === root.classList.contains('vpc-recede')) return;
  clearTimeout(recedeTimer);
  if (on) {
    const cx = window.innerWidth / 2;
    for (const el of document.body.children) {
      if (el.matches('.modal-overlay, script, style, link, template, .toast, [role="status"]')) {
        continue;
      }
      const r = el.getBoundingClientRect();
      el.style.transformOrigin = `${cx - r.left}px ${-r.top}px`;
      el.classList.add('vpc-recedes');
    }
    root.classList.add('vpc-recede');
  } else {
    root.classList.remove('vpc-recede');
    // Keep the transition until the page is back, then let the blocks go.
    recedeTimer = setTimeout(() => {
      document.querySelectorAll('.vpc-recedes').forEach((el) => {
        el.classList.remove('vpc-recedes');
        el.style.transformOrigin = '';
      });
    }, 600);
  }
}
// Close a dialog the way its own Cancel button would.
function closeDialog(overlay) {
  if (!overlay) return;
  const cancel = [...overlay.querySelectorAll('button')].find(
    (b) => b.classList.contains('sheet-close') || /^(cancel|close)$/i.test(b.textContent.trim())
  );
  if (cancel) cancel.click();
  else overlay.classList.remove('open');
}

// The title bar gains its hairline only once content passes under it. A
// page with a large title starts with a clear bar and shows its small title
// there only after the large one has scrolled away.
function watchScroll() {
  // A large title can follow a title the page changes (the Sales Hub's
  // section name and subtitle): data-large-from names the one it copies.
  document.querySelectorAll('[data-large-from]').forEach((el) => {
    const src = document.querySelector(el.dataset.largeFrom);
    if (!src) return;
    const copy = () => {
      el.textContent = src.textContent;
      el.hidden = src.hidden || !src.textContent.trim();
    };
    copy();
    new MutationObserver(copy).observe(src, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden'],
    });
  });
  const root = document.documentElement;
  const onScroll = () => root.classList.toggle('scrolled', window.scrollY > 4);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const large = document.querySelector('.large-title');
  if (large && 'IntersectionObserver' in window) {
    root.classList.add('has-large-title');
    const header = parseFloat(getComputedStyle(root).getPropertyValue('--header-h')) || 58;
    new IntersectionObserver(([en]) => root.classList.toggle('title-in', !en.isIntersecting), {
      rootMargin: `-${header}px 0px 0px 0px`,
    }).observe(large);
  }
}

// ── CHART VALUES ───────────────────────────────────
// Charts built by VPCUtil.chart carry each column's values in data-tip. They
// show in one box: under the pointer, on a tap, or with the arrow keys once
// the chart has focus (screen readers hear them through aria-live).
const vpcChartTip = (() => {
  let box = null;
  let on = null; // { chart, col }
  const getBox = () => {
    if (!box) {
      box = document.createElement('div');
      box.className = 'vchart-tip';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      box.hidden = true;
      document.body.appendChild(box);
    }
    return box;
  };
  const marks = (chart, i, add) =>
    chart
      .querySelectorAll(`.vchart-pt[data-i="${i}"]`)
      .forEach((p) => p.classList.toggle('is-active', add));
  function hide() {
    if (!on) return;
    on.col.classList.remove('is-active');
    marks(on.chart, on.col.dataset.i, false);
    on = null;
    if (box) box.hidden = true;
  }
  function show(chart, col) {
    if (on && on.col === col) return;
    hide();
    let d;
    try {
      d = JSON.parse(col.dataset.tip || '{}');
    } catch (e) {
      return;
    }
    on = { chart, col };
    col.classList.add('is-active');
    marks(chart, col.dataset.i, true);
    const esc = VPCUtil.esc;
    const b = getBox();
    b.innerHTML =
      `<b>${esc(d.t || '')}</b>` +
      (d.r || [])
        .map(
          ([k, label, value]) =>
            `<span class="vchart-tip-row"><i class="key ${k || 'none'}"></i><span>${esc(label)}</span><span class="v">${esc(value)}</span></span>`
        )
        .join('');
    b.hidden = false;
    place(col);
  }
  // Above the plot, centred on the column's point, inside the window
  function place(col) {
    const b = getBox();
    const r = col.getBoundingClientRect();
    const plot = col.closest('.vchart-plot').getBoundingClientRect();
    const x = r.left + (r.width * (parseFloat(col.style.getPropertyValue('--px')) || 50)) / 100;
    const w = b.offsetWidth;
    const h = b.offsetHeight;
    b.style.left = `${Math.round(Math.min(Math.max(8, x - w / 2), innerWidth - w - 8))}px`;
    const above = plot.top - h - 6;
    b.style.top = `${Math.round(above >= 8 ? above : Math.min(plot.top + 8, innerHeight - h - 8))}px`;
  }
  const colAt = (e) => (e.target.closest ? e.target.closest('.vchart-col') : null);
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const col = colAt(e);
    if (col) show(col.closest('.vchart'), col);
    else if (on && !(e.target.closest && e.target.closest('.vchart'))) hide();
  });
  document.addEventListener('click', (e) => {
    const col = colAt(e);
    if (col) {
      if (on && on.col === col && e.pointerType !== 'mouse') hide();
      else show(col.closest('.vchart'), col);
    } else if (on && !(e.target.closest && e.target.closest('.vchart-tip'))) hide();
  });
  // Keyboard focus starts at the latest value (a click or tap picks its own)
  document.addEventListener('focusin', (e) => {
    const chart = e.target.classList && e.target.classList.contains('vchart') ? e.target : null;
    if (!chart || !chart.matches(':focus-visible') || (on && on.chart === chart)) return;
    const cols = chart.querySelectorAll('.vchart-col');
    if (cols.length) show(chart, cols[cols.length - 1]);
  });
  document.addEventListener('focusout', (e) => {
    if (on && e.target === on.chart) hide();
  });
  document.addEventListener('keydown', (e) => {
    const chart = e.target.classList && e.target.classList.contains('vchart') ? e.target : null;
    if (!chart) return;
    const cols = [...chart.querySelectorAll('.vchart-col')];
    if (!cols.length) return;
    let i = on && on.chart === chart ? cols.indexOf(on.col) : cols.length - 1;
    if (e.key === 'ArrowLeft') i = Math.max(0, i - 1);
    else if (e.key === 'ArrowRight') i = Math.min(cols.length - 1, i + 1);
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = cols.length - 1;
    else if (e.key === 'Escape') return hide();
    else return;
    e.preventDefault();
    cols[i].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    show(chart, cols[i]);
  });
  // Scrolling the page moves the chart away from its box; scrolling the
  // chart itself (the arrow keys can) just moves the box along.
  window.addEventListener(
    'scroll',
    (e) => {
      if (on && e.target !== document && on.chart.contains(e.target)) place(on.col);
      else hide();
    },
    { passive: true, capture: true }
  );
  return { show, hide };
})();

// ── GLOBAL SEARCH ──────────────────────────────────
function buildSearchIndex() {
  const results = [];
  const K = VPCUtil.KEYS;
  // Orders
  const orders = JSON.parse(localStorage.getItem(K.orders) || '[]');
  orders.forEach((o) =>
    results.push({
      type: 'Order',
      icon: 'receipt',
      title: o.customer,
      sub: `${o.product}${o.color ? ' · ' + o.color : ''} · $${o.salePrice} · ${o.date}`,
      url: 'vault-pine-collective.html',
    })
  );
  // Jet Tags
  const jt = JSON.parse(localStorage.getItem(K.jetTags) || '[]');
  jt.forEach((s) =>
    results.push({
      type: 'Jet Tag Sale',
      icon: 'tag',
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
      icon: 'pin',
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
      icon: 'category',
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
      icon: 'events',
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
        icon: 'cards',
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
        icon: 'goals',
        title: g.title || g.name || 'Goal',
        sub: g.desc || '',
        url: 'goals-dashboard.html',
      });
      (g.objectives || []).forEach((ob) =>
        results.push({
          type: 'Objective',
          icon: 'check',
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
        icon: 'expenses',
        title: e.description || e.category,
        sub: `${e.category} · $${(e.amount || 0).toFixed(2)} · ${e.date}${e.notes ? ' · ' + e.notes : ''}`,
        url: 'expenses.html',
      })
    );
    const recs = JSON.parse(localStorage.getItem(K.recurringExpenses) || '[]');
    recs.forEach((r) =>
      results.push({
        type: 'Recurring',
        icon: 'repeat',
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
      icon: 'sales',
      type: 'Page',
    },
    {
      title: 'Analytics',
      sub: 'Margins, show breakdowns, trends',
      url: 'analytics.html',
      icon: 'analytics',
      type: 'Page',
    },
    {
      title: 'Goals & Objectives',
      sub: 'Track your goals',
      url: 'goals-dashboard.html',
      icon: 'goals',
      type: 'Page',
    },
    {
      title: 'Personal Expenses',
      sub: 'Track monthly spending & budget',
      url: 'expenses.html',
      icon: 'expenses',
      type: 'Page',
    },
    {
      title: 'Daily Review',
      sub: 'Morning briefing — goals, expenses, alerts',
      url: 'review.html',
      icon: 'review',
      type: 'Page',
    },
    {
      title: 'Financial Guru',
      sub: 'Academy lessons, health score, milestones, calculators',
      url: 'guru.html',
      icon: 'guru',
      type: 'Page',
    },
    {
      title: 'Home',
      sub: 'Command Center overview',
      url: 'index.html',
      icon: 'home',
      type: 'Page',
    },
    {
      title: 'Card Inventory',
      sub: 'Singles, slabs, sealed — stock value over time',
      url: 'inventory.html',
      icon: 'cards',
      type: 'Page',
    },
    {
      title: 'Production Hub',
      sub: 'Print queue and stock levels',
      url: 'production.html',
      icon: 'production',
      type: 'Page',
    },
    {
      title: 'Events & Tables',
      sub: 'Shows, vendor tables, payments, ROI',
      url: 'events.html',
      icon: 'events',
      type: 'Page',
    },
    {
      title: 'Content Planner',
      sub: 'Posts calendar, queue, templates',
      url: 'content.html',
      icon: 'content',
      type: 'Page',
    },
    {
      title: 'Instagram Growth',
      sub: 'Follower snapshots and goal',
      url: 'growth.html',
      icon: 'growth',
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
        <span style="color:var(--text2);display:flex">${VPCUtil.icon('search')}</span>
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
      <span class="search-ico">${VPCUtil.icon(r.icon)}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:0.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${VPCUtil.esc(r.title)}</div>
        <div style="font-size:0.75rem;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${VPCUtil.esc(r.sub)}</div>
      </div>
      <span style="font-size:0.75rem;color:var(--text2);border:1px solid var(--border);border-radius:8px;padding:2px 7px;flex-shrink:0">${VPCUtil.esc(r.type)}</span>
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
          <button onclick="document.getElementById('audit-overlay').remove()" style="background:none;border:1px solid var(--border);border-radius:8px;color:var(--text2);padding:5px 12px;font-size:0.75rem;cursor:pointer;font-family:inherit;">Close</button>
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
  vpcEnhanceForms();
  watchDialogs();
  enableSheetSwipe();
  watchScroll();
  registerSW();
  // Deferred: daily reminder check (only if reminders are turned on)
  setTimeout(checkAndNotify, 2000);
});
