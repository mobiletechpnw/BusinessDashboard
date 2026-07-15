/* ═══════════════════════════════════════════════════
   shared.js — Theme · Search · Shortcuts
               Audit Log · Notifications · Alerts
   Vault & Pine Collective
═══════════════════════════════════════════════════ */

// ── UNIFIED NAVIGATION ─────────────────────────────
// One nav, every page, same order — injected here so a page can never
// drift out of sync or dead-end the user again.
const DASH_NAV = [
  ['index.html', '⌂', 'Home'],
  ['vault-pine-collective.html', '📊', 'Sales Hub'],
  ['inventory.html', '🃏', 'Inventory'],
  ['goals-dashboard.html', '🎯', 'Goals'],
  ['expenses.html', '💸', 'Expenses'],
  ['analytics.html', '📈', 'Analytics'],
  ['production.html', '🖨️', 'Production'],
  ['events.html', '🎪', 'Events'],
  ['content.html', '📱', 'Content'],
  ['growth.html', '🚀', 'Growth'],
  ['review.html', '📋', 'Review'],
  ['guru.html', '🥋', 'Guru'],
];

function injectDashNav() {
  const cur = location.pathname.split('/').pop() || 'index.html';
  const html = DASH_NAV.map(
    ([href, icon, label]) =>
      `<a href="${href}" class="dash-nav-link${href === cur ? ' active' : ''}">${icon} ${label}</a>`
  ).join('');
  let nav = document.querySelector('nav.dash-nav');
  if (!nav) {
    nav = document.createElement('nav');
    nav.className = 'dash-nav';
    const header = document.querySelector('header');
    if (header) header.insertAdjacentElement('afterend', nav);
    else document.body.prepend(nav);
  }
  nav.innerHTML = html;
  // On mobile the bar scrolls horizontally — keep the current page visible
  nav.querySelector('.active')?.scrollIntoView({ inline: 'center', block: 'nearest' });
}

// ── CURSOR GLOW — soft flashlight that follows the pointer ──
function injectCursorGlow() {
  // Pointer-driven effect: skip touch devices and reduced-motion users
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const glow = document.createElement('div');
  glow.id = 'cursor-glow';
  glow.style.cssText = `
    position:fixed;left:-999px;top:-999px;width:220px;height:220px;
    border-radius:50%;pointer-events:none;z-index:900;opacity:0;
    background:radial-gradient(circle,
      rgba(108,142,255,0.035) 0%,
      rgba(167,139,250,0.02) 35%,
      transparent 68%);
    transform:translate(-50%,-50%);
    transition:opacity 0.5s ease;
    mix-blend-mode:screen;will-change:left,top;
  `;
  document.body.appendChild(glow);
  let tx = -999,
    ty = -999,
    x = -999,
    y = -999,
    raf = null;
  function loop() {
    x += (tx - x) * 0.16; // soft lag — feels like light, not a cursor copy
    y += (ty - y) * 0.16;
    glow.style.left = x + 'px';
    glow.style.top = y + 'px';
    raf = Math.abs(tx - x) > 0.4 || Math.abs(ty - y) > 0.4 ? requestAnimationFrame(loop) : null;
  }
  window.addEventListener(
    'pointermove',
    (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (x === -999) {
        x = tx;
        y = ty;
      } // first move: snap, don't fly in
      glow.style.opacity = '1';
      if (!raf) raf = requestAnimationFrame(loop);
    },
    { passive: true }
  );
  document.documentElement.addEventListener('mouseleave', () => {
    glow.style.opacity = '0';
  });
}

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
      sub: 'Sales · Goals · Expenses · Jet Tags · Pins · Events',
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
        <kbd style="font-size:0.65rem;color:var(--text2);border:1px solid var(--border);border-radius:4px;padding:2px 6px;">ESC</kbd>
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
        <div style="font-size:0.72rem;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.sub}</div>
      </div>
      <span style="font-size:0.62rem;color:var(--text2);border:1px solid var(--border);border-radius:4px;padding:2px 7px;flex-shrink:0">${r.type}</span>
    </a>
  `
    )
    .join('');
};

function injectSearchBtn() {
  const btn = document.createElement('button');
  btn.title = 'Search (Ctrl+K)';
  btn.onclick = openSearch;
  btn.style.cssText = `
    background:none;border:1px solid var(--border);border-radius:6px;
    padding:5px 10px;cursor:pointer;font-size:0.82rem;color:var(--text2);
    transition:all 0.2s;flex-shrink:0;display:flex;align-items:center;gap:6px;
    min-height:36px;
  `;
  // Show label only on desktop
  btn.innerHTML = `<span>🔍</span><span class="search-btn-label" style="font-size:0.72rem">Ctrl+K</span>`;
  // Hide label on narrow screens
  if (!document.getElementById('search-btn-responsive-style')) {
    const s = document.createElement('style');
    s.id = 'search-btn-responsive-style';
    s.textContent = '@media(max-width:600px){.search-btn-label{display:none}}';
    document.head.appendChild(s);
  }
  btn.onmouseover = () => {
    btn.style.borderColor = 'var(--accent)';
    btn.style.color = 'var(--accent)';
  };
  btn.onmouseout = () => {
    btn.style.borderColor = 'var(--border)';
    btn.style.color = 'var(--text2)';
  };
  const header = document.querySelector('header');
  if (header) header.appendChild(btn);
}

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
      <kbd style="font-size:0.68rem;background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:3px 8px;font-family:monospace;min-width:60px;text-align:center;">${k}</kbd>
      <span style="font-size:0.82rem;color:var(--text2)">${d}</span>
    </div>`
    )
    .join('');
  overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:28px;width:380px;max-width:95vw;">
      <div style="font-size:0.88rem;font-weight:700;margin-bottom:16px;">Keyboard Shortcuts</div>
      ${rows}
      <div style="margin-top:18px;text-align:right;">
        <button onclick="document.getElementById('shortcuts-overlay').remove()" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--text2);padding:6px 14px;font-size:0.78rem;cursor:pointer;font-family:inherit;">Close (ESC)</button>
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
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:28px;width:740px;max-width:96vw;max-height:82vh;display:flex;flex-direction:column;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div style="font-size:0.9rem;font-weight:700;">Audit Log <span style="font-size:0.72rem;color:var(--text2);font-weight:400">(last ${Math.min(log.length, 60)} of ${log.length} entries)</span></div>
        <div style="display:flex;gap:8px;">
          <button onclick="localStorage.removeItem('${AUDIT_KEY}');document.getElementById('audit-overlay').remove()" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--red);padding:5px 12px;font-size:0.75rem;cursor:pointer;font-family:inherit;">Clear Log</button>
          <button onclick="document.getElementById('audit-overlay').remove()" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--text2);padding:5px 12px;font-size:0.75rem;cursor:pointer;font-family:inherit;">✕ Close</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:110px 54px 130px 1fr;gap:10px;padding:0 0 8px;border-bottom:1px solid var(--border);font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text2);">
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

  if (Notification.permission === 'granted') {
    runChecks();
  } else if (Notification.permission === 'default' && !localStorage.getItem('vpc_notif_declined')) {
    setTimeout(() => {
      const t = document.createElement('div');
      t.style.cssText =
        'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 18px;font-size:0.82rem;color:var(--text);z-index:9500;display:flex;align-items:center;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,0.3);white-space:nowrap;';
      t.innerHTML = `<span>🔔</span><span>Enable deadline reminders?</span>
        <button onclick="Notification.requestPermission().then(p=>{if(p==='granted')checkAndNotify();});this.closest('div').remove();" style="background:var(--accent);color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:0.78rem;font-weight:700;cursor:pointer;font-family:inherit;">Enable</button>
        <button onclick="localStorage.setItem('vpc_notif_declined','1');this.closest('div').remove();" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--text2);padding:5px 10px;font-size:0.78rem;cursor:pointer;font-family:inherit;">No thanks</button>`;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 9000);
    }, 6000);
  }
};

// ── TREND ALERTS ───────────────────────────────────
window.checkTrendAlerts = function () {
  const alerts = [];
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lmDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = `${lmDate.getFullYear()}-${String(lmDate.getMonth() + 1).padStart(2, '0')}`;

  try {
    const exps = JSON.parse(localStorage.getItem('vpc_personal_expenses_v1') || '[]');
    const thisTot = exps
      .filter((e) => (e.date || '').startsWith(thisMonth))
      .reduce((s, e) => s + (e.amount || 0), 0);
    const lastTot = exps
      .filter((e) => (e.date || '').startsWith(lastMonth))
      .reduce((s, e) => s + (e.amount || 0), 0);
    if (lastTot > 0 && thisTot > 0) {
      const dom = now.getDate();
      const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const proj = (thisTot / dom) * dim;
      if (proj > lastTot * 1.2)
        alerts.push({
          type: 'warning',
          msg: `Spending on track to be ${Math.round((proj / lastTot - 1) * 100)}% above last month`,
          url: 'expenses.html',
        });
    }
    const budget = JSON.parse(localStorage.getItem('vpc_expense_budget_v1') || '{"total":0}');
    if (budget.total > 0 && thisTot > budget.total * 0.85) {
      const pct = Math.round((thisTot / budget.total) * 100);
      alerts.push({
        type: pct >= 100 ? 'danger' : 'warning',
        msg: `Budget ${pct >= 100 ? 'exceeded' : 'at ' + pct + '%'} this month`,
        url: 'expenses.html',
      });
    }
  } catch (e) {}

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const week = new Date(today);
    week.setDate(week.getDate() + 7);
    const g = JSON.parse(localStorage.getItem('goals_dashboard_v1') || '{"goals":[]}');
    const od = (g.goals || []).filter(
      (x) => !x.done && x.due && new Date(x.due + 'T00:00:00') < today
    );
    if (od.length)
      alerts.push({
        type: 'danger',
        msg: `${od.length} goal${od.length > 1 ? 's' : ''} overdue`,
        url: 'goals-dashboard.html',
      });
    const soon = (g.goals || []).filter(
      (x) =>
        !x.done &&
        x.due &&
        new Date(x.due + 'T00:00:00') <= week &&
        new Date(x.due + 'T00:00:00') >= today
    );
    if (soon.length)
      alerts.push({
        type: 'warning',
        msg: `${soon.length} goal${soon.length > 1 ? 's' : ''} due this week`,
        url: 'goals-dashboard.html',
      });
  } catch (e) {}

  return alerts;
};

function injectTrendAlerts() {
  const alerts = checkTrendAlerts();
  if (!alerts.length) return;
  const container = document.createElement('div');
  container.id = 'trend-alerts';
  container.style.cssText =
    'position:fixed;top:68px;right:16px;z-index:8000;display:flex;flex-direction:column;gap:6px;max-width:310px;';
  alerts.forEach((a) => {
    const c =
      a.type === 'danger'
        ? { border: 'var(--red)', icon: '⚠' }
        : { border: 'var(--yellow)', icon: '⚡' };
    const el = document.createElement('div');
    el.style.cssText = `background:var(--surface);border:1px solid ${c.border};border-left:3px solid ${c.border};border-radius:8px;padding:9px 12px;font-size:0.75rem;color:var(--text);display:flex;align-items:center;gap:8px;box-shadow:0 4px 16px rgba(0,0,0,0.25);cursor:pointer;animation:alertSlide 0.3s ease;`;
    el.innerHTML = `<span style="color:${c.border};font-size:0.9rem;flex-shrink:0">${c.icon}</span><span style="flex:1">${a.msg}</span><button onclick="event.stopPropagation();this.closest('div').remove()" style="background:none;border:none;color:var(--text2);cursor:pointer;font-size:0.75rem;padding:0;flex-shrink:0;font-family:inherit;">✕</button>`;
    el.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') location.href = a.url;
    });
    container.appendChild(el);
  });
  document.body.appendChild(container);
  // Inject animation keyframe once
  if (!document.getElementById('alert-anim-style')) {
    const s = document.createElement('style');
    s.id = 'alert-anim-style';
    s.textContent =
      '@keyframes alertSlide{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}';
    document.head.appendChild(s);
  }
  setTimeout(() => container.remove(), 12000);
}

// ══════════════════════════════════════════════════
//  BUSINESS SENSEI — contextual coaching engine
//  Tips are categorized by page; the engine auto-
//  selects relevant ones and injects a slide-up panel.
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

// Page → tip pool mapping
const SENSEI_PAGE_MAP = {
  'vault-pine-collective.html': 'sales',
  'goals-dashboard.html': 'goals',
  'expenses.html': 'expenses',
  'analytics.html': 'analytics',
  'events.html': 'events',
  'production.html': 'production',
  'content.html': 'content',
  'review.html': 'general',
  'index.html': 'general',
  'guru.html': 'general',
};

function injectSenseiPanel() {
  const page = location.pathname.split('/').pop() || 'index.html';
  const poolKey = SENSEI_PAGE_MAP[page] || 'general';
  const pool = [...(SENSEI_TIPS[poolKey] || []), ...SENSEI_TIPS.general.slice(0, 2)];
  if (!pool.length) return;

  // Dismissed for today?
  const dismissKey = 'vpc_sensei_dismissed_' + new Date().toDateString();
  if (localStorage.getItem(dismissKey)) return;
  // Don't show on login/reset pages
  if (page === 'login.html' || page === 'reset-password.html') return;

  let idx = Math.floor(Math.random() * pool.length);

  function renderTip() {
    const t = pool[idx];
    document.getElementById('sensei-cat').textContent = t.cat;
    document.getElementById('sensei-head').textContent = t.head;
    document.getElementById('sensei-body').textContent = t.body;
    document.getElementById('sensei-count').textContent = `${idx + 1} / ${pool.length}`;
  }

  // Inject styles
  if (!document.getElementById('sensei-styles')) {
    const s = document.createElement('style');
    s.id = 'sensei-styles';
    s.textContent = `
      #sensei-panel {
        position: fixed; bottom: 24px; left: 20px; z-index: 8500;
        width: 290px; font-family: inherit;
        transform: translateY(120%); opacity: 0;
        transition: transform 0.45s cubic-bezier(.2,.8,.3,1), opacity 0.4s ease;
      }
      #sensei-panel.open { transform: translateY(0); opacity: 1; }
      #sensei-trigger {
        background: linear-gradient(135deg, rgba(108,142,255,0.15) 0%, rgba(167,139,250,0.12) 100%);
        border: 1px solid rgba(108,142,255,0.3);
        backdrop-filter: blur(16px);
        border-radius: 40px; padding: 8px 16px 8px 10px;
        display: flex; align-items: center; gap: 8px;
        cursor: pointer; font-size: 0.78rem; font-weight: 700;
        color: #e2e8f0; white-space: nowrap;
        box-shadow: 0 4px 20px rgba(108,142,255,0.2);
        transition: all 0.2s; margin-bottom: 8px; width: fit-content;
      }
      #sensei-trigger:hover { background: rgba(108,142,255,0.22); transform: translateY(-1px); }
      #sensei-trigger .st-icon { font-size: 1rem; }
      #sensei-trigger .st-pulse {
        width: 6px; height: 6px; border-radius: 50%; background: #34d399;
        box-shadow: 0 0 6px #34d399; flex-shrink: 0;
        animation: s-pulse 2s ease-in-out infinite;
      }
      @keyframes s-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      #sensei-card {
        background: linear-gradient(160deg, rgba(22,25,38,0.97) 0%, rgba(15,17,23,0.97) 100%);
        border: 1px solid rgba(108,142,255,0.25);
        backdrop-filter: blur(24px) saturate(1.3);
        border-radius: 18px; padding: 18px 18px 14px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(108,142,255,0.06);
        display: none;
      }
      #sensei-card.visible { display: block; }
      .sensei-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
      .sensei-logo { display: flex; align-items: center; gap: 7px; font-size: 0.72rem; font-weight: 800; color: #8892b0; text-transform: uppercase; letter-spacing: 0.8px; }
      .sensei-logo span { font-size: 1rem; }
      #sensei-close { background: none; border: none; color: #8892b0; font-size: 0.75rem; cursor: pointer; padding: 2px 6px; border-radius: 4px; min-height: unset; transition: color 0.15s; font-family: inherit; }
      #sensei-close:hover { color: #e2e8f0; }
      #sensei-cat {
        display: inline-block; font-size: 0.6rem; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.8px; padding: 2px 9px; border-radius: 20px;
        background: rgba(108,142,255,0.1); border: 1px solid rgba(108,142,255,0.22);
        color: #6c8cff; margin-bottom: 8px;
      }
      #sensei-head { font-size: 0.88rem; font-weight: 800; color: #e2e8f0; margin-bottom: 7px; line-height: 1.3; letter-spacing: -0.2px; }
      #sensei-body { font-size: 0.76rem; color: #8892b0; line-height: 1.65; }
      .sensei-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.07); }
      #sensei-count { font-size: 0.62rem; color: #8892b0; }
      .sensei-nav { display: flex; gap: 4px; }
      .sensei-nav button { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #8892b0; padding: 4px 9px; border-radius: 6px; font-size: 0.72rem; cursor: pointer; font-family: inherit; min-height: unset; transition: all 0.15s; }
      .sensei-nav button:hover { border-color: #6c8cff; color: #6c8cff; }
      #sensei-dismiss { font-size: 0.62rem; color: #8892b0; background: none; border: none; cursor: pointer; font-family: inherit; min-height: unset; padding: 0; text-decoration: underline; opacity: 0.6; }
      #sensei-dismiss:hover { opacity: 1; }
      @media (max-width: 600px) {
        #sensei-panel { left: 10px; right: 10px; width: auto; bottom: 16px; }
      }
    `;
    document.head.appendChild(s);
  }

  const panel = document.createElement('div');
  panel.id = 'sensei-panel';
  panel.innerHTML = `
    <div id="sensei-trigger" onclick="document.getElementById('sensei-card').classList.toggle('visible');this.style.display='none';">
      <div class="st-pulse"></div>
      <span class="st-icon">🧠</span>
      Business Sensei — tap for a tip
    </div>
    <div id="sensei-card">
      <div class="sensei-header">
        <div class="sensei-logo"><span>🧠</span> Business Sensei</div>
        <button id="sensei-close" onclick="document.getElementById('sensei-panel').classList.remove('open')" title="Hide">✕</button>
      </div>
      <div id="sensei-cat"></div>
      <div id="sensei-head"></div>
      <div id="sensei-body"></div>
      <div class="sensei-foot">
        <div>
          <span id="sensei-count"></span><br>
          <button id="sensei-dismiss" onclick="localStorage.setItem('${dismissKey}','1');document.getElementById('sensei-panel').classList.remove('open')">Don't show today</button>
        </div>
        <div class="sensei-nav">
          <button onclick="senseiPrev()">← Prev</button>
          <button onclick="senseiNext()">Next →</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);
  renderTip();

  // Expose nav functions
  window.senseiNext = () => {
    idx = (idx + 1) % pool.length;
    renderTip();
  };
  window.senseiPrev = () => {
    idx = (idx - 1 + pool.length) % pool.length;
    renderTip();
  };

  // Slide in after delay
  setTimeout(() => panel.classList.add('open'), 3500);

  // Auto-advance tip every 45 s
  setInterval(() => {
    idx = (idx + 1) % pool.length;
    renderTip();
  }, 45000);
}

// ── DATA-AWARE COACHING BAR ────────────────────────
// Reads real business data and generates a contextual insight,
// then injects it as a subtle banner below the dash-nav.
function injectSenseiInsightBar() {
  const page = location.pathname.split('/').pop() || 'index.html';
  if (page === 'login.html' || page === 'reset-password.html') return;

  let insight = null;

  try {
    if (page === 'goals-dashboard.html') {
      const g = JSON.parse(localStorage.getItem('goals_dashboard_v1') || '{"goals":[]}');
      const goals = g.goals || [];
      const active = goals.filter((x) => !x.done);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const overdue = active.filter((x) => x.due && new Date(x.due + 'T00:00:00') < today);
      const noDate = active.filter((x) => !x.due);
      if (overdue.length) {
        insight = {
          icon: '⚠️',
          color: 'var(--yellow)',
          text: `${overdue.length} overdue goal${overdue.length > 1 ? 's' : ''}. Sensei says: a goal without a new deadline is a wish. Update the due date or close it.`,
        };
      } else if (noDate.length) {
        insight = {
          icon: '🎯',
          color: 'var(--accent)',
          text: `${noDate.length} active goal${noDate.length > 1 ? 's have' : ' has'} no deadline. Sensei says: a goal without a date is a wish. Add a target date to create urgency.`,
        };
      } else if (active.length > 5) {
        insight = {
          icon: '🧠',
          color: 'var(--accent2)',
          text: `You have ${active.length} active goals. Sensei says: research shows focus fractures beyond 3 goals. Consider pausing the lowest-priority ones.`,
        };
      } else if (active.length === 0) {
        insight = {
          icon: '🎯',
          color: 'var(--green)',
          text: `No active goals set. Sensei says: start with one 90-day goal. Specific → Measurable → Achievable → Time-bound.`,
        };
      } else {
        insight = {
          icon: '✅',
          color: 'var(--green)',
          text: `${active.length} active goal${active.length > 1 ? 's' : ''} on track. Sensei says: weekly 10-min check-ins are the #1 habit of goal achievers.`,
        };
      }
    } else if (page === 'expenses.html') {
      const now = new Date();
      const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const exps = JSON.parse(localStorage.getItem('vpc_personal_expenses_v1') || '[]');
      const budget = JSON.parse(localStorage.getItem('vpc_expense_budget_v1') || '{"total":0}');
      const spent = exps
        .filter((e) => (e.date || '').startsWith(prefix))
        .reduce((s, e) => s + (e.amount || 0), 0);
      const pct = budget.total > 0 ? (spent / budget.total) * 100 : 0;
      if (budget.total === 0) {
        insight = {
          icon: '💡',
          color: 'var(--accent)',
          text: `No budget set. Sensei says: set a monthly budget now — even a rough number creates accountability and changes spending behaviour.`,
        };
      } else if (pct > 100) {
        insight = {
          icon: '🚨',
          color: 'var(--red)',
          text: `Budget exceeded at ${Math.round(pct)}% ($${spent.toFixed(0)} of $${budget.total}). Sensei says: find one category to freeze for the rest of the month.`,
        };
      } else if (pct > 80) {
        insight = {
          icon: '⚠️',
          color: 'var(--yellow)',
          text: `Budget ${Math.round(pct)}% used with ${now.getDate()} of ${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()} days elapsed. Sensei says: review your biggest category before spending more.`,
        };
      } else {
        insight = {
          icon: '✅',
          color: 'var(--green)',
          text: `Budget ${Math.round(pct)}% used this month. Sensei says: track categories, not just totals — knowing where money goes is half the battle.`,
        };
      }
    } else if (page === 'vault-pine-collective.html') {
      const orders = JSON.parse(localStorage.getItem('vp_orders_v2') || '[]');
      if (orders.length === 0) {
        insight = {
          icon: '📊',
          color: 'var(--accent)',
          text: `No sales logged yet. Sensei says: log every sale the same day — even cash sales. Data you don't capture is money you can't analyse.`,
        };
      } else {
        const totalRev = orders.reduce((s, o) => s + (o.salePrice || 0), 0);
        const totalCost = orders.reduce((s, o) => s + (o.cogs || 0), 0);
        const margin = totalRev > 0 ? ((totalRev - totalCost) / totalRev) * 100 : 0;
        if (margin < 30) {
          insight = {
            icon: '📉',
            color: 'var(--red)',
            text: `Gross margin is ${margin.toFixed(1)}%. Sensei says: healthy product businesses target 40–60%. Check if COGS are logged accurately or if pricing needs a lift.`,
          };
        } else if (margin < 40) {
          insight = {
            icon: '⚡',
            color: 'var(--yellow)',
            text: `Gross margin is ${margin.toFixed(1)}% — below the 40% target. Sensei says: a 10% price increase often has less customer pushback than you'd expect.`,
          };
        } else {
          insight = {
            icon: '💪',
            color: 'var(--green)',
            text: `Gross margin is ${margin.toFixed(1)}% — solid. Sensei says: now focus on volume. Your pricing is healthy; grow the top line.`,
          };
        }
      }
    } else if (page === 'analytics.html') {
      const orders = JSON.parse(localStorage.getItem('vp_orders_v2') || '[]');
      if (orders.length < 5) {
        insight = {
          icon: '📈',
          color: 'var(--accent)',
          text: `Not enough data for trends yet. Sensei says: log at least 10 sales across 2 months before drawing conclusions from charts.`,
        };
      } else {
        insight = {
          icon: '🧠',
          color: 'var(--accent2)',
          text: `Sensei says: when reviewing analytics, ask "what caused this?" before asking "what does this mean?" Causes lead to action; patterns alone lead to guessing.`,
        };
      }
    }
  } catch (e) {}

  // Fallback: show a random general tip
  if (!insight) {
    const general = SENSEI_TIPS.general;
    const t = general[Math.floor(Math.random() * general.length)];
    insight = {
      icon: '🧠',
      color: 'var(--accent2)',
      text: `Sensei — ${t.cat}: ${t.head}. ${t.body}`,
    };
  }

  // Inject bar after .dash-nav
  const bar = document.createElement('div');
  bar.id = 'sensei-insight-bar';
  bar.style.cssText = `
    background: linear-gradient(90deg, color-mix(in srgb, ${insight.color} 6%, transparent) 0%, transparent 60%);
    border-bottom: 1px solid color-mix(in srgb, ${insight.color} 18%, transparent);
    padding: 9px 32px; display: flex; align-items: center; gap: 10px;
    font-size: 0.76rem; color: #8892b0; line-height: 1.5;
    position: relative; z-index: 130;
    animation: insightSlide 0.4s ease both;
  `;
  bar.innerHTML = `
    <span style="font-size:0.9rem;flex-shrink:0;">${insight.icon}</span>
    <span style="flex:1;">${insight.text}</span>
    <button onclick="this.closest('#sensei-insight-bar').remove()" style="background:none;border:none;color:#8892b0;cursor:pointer;font-size:0.75rem;padding:2px 6px;border-radius:4px;flex-shrink:0;opacity:0.6;font-family:inherit;min-height:unset;" title="Dismiss">✕</button>
  `;
  if (!document.getElementById('insight-bar-anim')) {
    const s = document.createElement('style');
    s.id = 'insight-bar-anim';
    s.textContent =
      '@keyframes insightSlide{from{transform:translateY(-6px);opacity:0}to{transform:none;opacity:1}}';
    document.head.appendChild(s);
  }

  // Insert after .dash-nav
  function tryInject() {
    const nav = document.querySelector('nav.dash-nav');
    if (nav) {
      nav.insertAdjacentElement('afterend', bar);
    } else {
      document.body.insertBefore(bar, document.querySelector('main') || document.body.firstChild);
    }
  }
  // Wait briefly so dash-nav injection runs first
  setTimeout(tryInject, 200);
}

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
  injectDashNav();
  injectSearchBtn();
  injectCursorGlow();
  injectSenseiInsightBar();
  injectSenseiPanel();
  registerSW();
  injectMobileNav();
  // Deferred enhancements
  setTimeout(() => {
    checkAndNotify();
    injectTrendAlerts();
  }, 2000);
});

// ── Mobile bottom navigation ──
function injectMobileNav() {
  if (window.location.pathname.endsWith('login.html')) return;

  const style = document.createElement('style');
  style.textContent = `
    .mobile-bottom-nav {
      display: none;
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 1000;
      background: rgba(15,17,23,0.96);
      backdrop-filter: blur(20px) saturate(1.4);
      border-top: 1px solid rgba(255,255,255,0.08);
      padding: 0 0 env(safe-area-inset-bottom, 0);
    }
    .mobile-bottom-nav ul {
      display: flex; list-style: none; margin: 0; padding: 0;
      height: 56px;
    }
    .mobile-bottom-nav li { flex: 1; }
    .mobile-bottom-nav a {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 100%; text-decoration: none; color: #8892b0;
      font-size: 0.52rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px;
      gap: 3px; transition: color 0.15s;
    }
    .mobile-bottom-nav a .nav-icon { font-size: 1.15rem; line-height: 1; }
    .mobile-bottom-nav a.active { color: #6C8EFF; }
    .mobile-bottom-nav a:hover { color: #c8d0e8; }
    @media (max-width: 768px) {
      .mobile-bottom-nav { display: block; }
      body { padding-bottom: 60px; }
    }
  `;
  document.head.appendChild(style);

  const currentPath = window.location.pathname;
  const links = [
    { href: 'index.html', icon: '⌂', label: 'Home' },
    { href: 'vault-pine-collective.html', icon: '📊', label: 'Sales' },
    { href: 'events.html', icon: '🎪', label: 'Events' },
    { href: 'expenses.html', icon: '💸', label: 'Expenses' },
    { href: 'analytics.html', icon: '📈', label: 'Insights' },
  ];

  const nav = document.createElement('nav');
  nav.className = 'mobile-bottom-nav';
  nav.setAttribute('aria-label', 'Mobile navigation');
  nav.innerHTML = `<ul>${links
    .map((l) => {
      const isActive =
        currentPath.endsWith(l.href) ||
        (l.href === 'index.html' &&
          (currentPath.endsWith('/') || currentPath.endsWith('index.html')));
      return `<li><a href="${l.href}"${isActive ? ' class="active"' : ''}>
      <span class="nav-icon">${l.icon}</span>
      <span>${l.label}</span>
    </a></li>`;
    })
    .join('')}</ul>`;
  document.body.appendChild(nav);
}
