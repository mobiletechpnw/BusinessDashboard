/* ═══════════════════════════════════════════════════
   shared.js — Theme · Search · Shortcuts
               Audit Log · Notifications · Alerts
   Vault & Pine Collective
═══════════════════════════════════════════════════ */

// ── UNIFIED NAVIGATION ─────────────────────────────
// One nav, every page, same order — injected here so a page can never
// drift out of sync or dead-end the user again.
const DASH_NAV = [
  ['index.html',                 '⌂',  'Home'],
  ['vault-pine-collective.html', '📊', 'Sales Hub'],
  ['goals-dashboard.html',       '🎯', 'Goals'],
  ['expenses.html',              '💸', 'Expenses'],
  ['analytics.html',             '📈', 'Analytics'],
  ['production.html',            '🖨️', 'Production'],
  ['events.html',                '🎪', 'Events'],
  ['content.html',               '📱', 'Content'],
  ['review.html',                '📋', 'Review'],
];

function injectDashNav() {
  const cur = location.pathname.split('/').pop() || 'index.html';
  const html = DASH_NAV.map(([href, icon, label]) =>
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
  let tx = -999, ty = -999, x = -999, y = -999, raf = null;
  function loop() {
    x += (tx - x) * 0.16;  // soft lag — feels like light, not a cursor copy
    y += (ty - y) * 0.16;
    glow.style.left = x + 'px';
    glow.style.top  = y + 'px';
    raf = (Math.abs(tx - x) > 0.4 || Math.abs(ty - y) > 0.4) ? requestAnimationFrame(loop) : null;
  }
  window.addEventListener('pointermove', e => {
    tx = e.clientX; ty = e.clientY;
    if (x === -999) { x = tx; y = ty; }  // first move: snap, don't fly in
    glow.style.opacity = '1';
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { glow.style.opacity = '0'; });
}

// ── GLOBAL SEARCH ──────────────────────────────────
function buildSearchIndex() {
  const results = [];
  // Orders
  const orders = JSON.parse(localStorage.getItem('vp_orders_v2') || '[]');
  orders.forEach(o => results.push({
    type: 'Order', icon: '📦',
    title: o.customer,
    sub: `${o.product} · $${o.salePrice} · ${o.date}`,
    url: 'vault-pine-collective.html'
  }));
  // Jet Tags
  const jt = JSON.parse(localStorage.getItem('vp_jettags_v1') || '[]');
  jt.forEach(s => results.push({
    type: 'Jet Tag Sale', icon: '🏷',
    title: s.chars.join(', '),
    sub: `${s.qty} tags · $${s.revenue} · ${s.date}${s.notes ? ' · ' + s.notes : ''}`,
    url: 'vault-pine-collective.html'
  }));
  // Pins
  const pins = JSON.parse(localStorage.getItem('vp_pins_v1') || '[]');
  pins.forEach(s => results.push({
    type: 'Pin Sale', icon: '📌',
    title: s.chars.join(', '),
    sub: `${s.qty} pins · $${s.revenue} · ${s.date}${s.notes ? ' · ' + s.notes : ''}`,
    url: 'vault-pine-collective.html'
  }));
  // Events
  const events = JSON.parse(localStorage.getItem('vp_events_v1') || '[]');
  events.forEach(ev => results.push({
    type: 'Event', icon: '🎪',
    title: ev.name,
    sub: `${ev.location || ''} · ${ev.start}${ev.boothCost ? ' · Booth $' + ev.boothCost : ''}`,
    url: 'vault-pine-collective.html'
  }));
  // Goals
  try {
    const goals = JSON.parse(localStorage.getItem('goals_dashboard_v1') || '{"goals":[]}').goals || [];
    goals.forEach(g => {
      results.push({ type: 'Goal', icon: '🎯', title: g.title || g.name || 'Goal', sub: g.desc || '', url: 'goals-dashboard.html' });
      (g.objectives || []).forEach(ob => results.push({
        type: 'Objective', icon: '✅', title: ob.text || 'Objective', sub: `Under: ${g.title || ''}`, url: 'goals-dashboard.html'
      }));
    });
  } catch(e) {}
  // Expenses
  try {
    const exps = JSON.parse(localStorage.getItem('vpc_personal_expenses_v1') || '[]');
    exps.forEach(e => results.push({
      type: 'Expense', icon: '💸',
      title: e.description || e.category,
      sub: `${e.category} · $${(e.amount||0).toFixed(2)} · ${e.date}${e.notes ? ' · ' + e.notes : ''}`,
      url: 'expenses.html'
    }));
    const recs = JSON.parse(localStorage.getItem('vpc_recurring_expenses_v1') || '[]');
    recs.forEach(r => results.push({
      type: 'Recurring', icon: '🔄',
      title: r.name,
      sub: `${r.category} · $${(r.amount||0).toFixed(2)}/mo`,
      url: 'expenses.html'
    }));
  } catch(e) {}
  // Pages
  [
    { title: 'Vault & Pine Collective', sub: 'Sales · Goals · Expenses · Jet Tags · Pins · Events', url: 'vault-pine-collective.html', icon: '🌲', type: 'Page' },
    { title: 'Analytics', sub: 'Margins, show breakdowns, trends', url: 'analytics.html', icon: '📈', type: 'Page' },
    { title: 'Goals & Objectives', sub: 'Track your goals', url: 'goals-dashboard.html', icon: '🎯', type: 'Page' },
    { title: 'Personal Expenses', sub: 'Track monthly spending & budget', url: 'expenses.html', icon: '💸', type: 'Page' },
    { title: 'Daily Review', sub: 'Morning briefing — goals, expenses, alerts', url: 'review.html', icon: '📋', type: 'Page' },
  ].forEach(p => results.push(p));
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
  overlay.addEventListener('click', e => { if (e.target === overlay) closeSearch(); });
  document.body.appendChild(overlay);
  document.getElementById('search-input').focus();
}

function closeSearch() {
  document.getElementById('search-overlay')?.remove();
  searchActive = false;
}

window.runSearch = function(q) {
  const el = document.getElementById('search-results');
  if (!q.trim()) { el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text2);font-size:0.82rem;">Start typing to search…</div>'; return; }
  const lower = q.toLowerCase();
  const hits = searchIndex.filter(r =>
    (r.title + ' ' + r.sub + ' ' + r.type).toLowerCase().includes(lower)
  ).slice(0, 12);
  if (!hits.length) { el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text2);font-size:0.82rem;">No results found</div>'; return; }
  el.innerHTML = hits.map((r, i) => `
    <a href="${r.url}" onclick="closeSearch()" style="display:flex;align-items:center;gap:12px;padding:10px 18px;text-decoration:none;transition:background 0.1s;color:var(--text);"
       onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='none'">
      <span style="font-size:1.2rem;flex-shrink:0">${r.icon}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:0.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.title}</div>
        <div style="font-size:0.72rem;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.sub}</div>
      </div>
      <span style="font-size:0.62rem;color:var(--text2);border:1px solid var(--border);border-radius:4px;padding:2px 7px;flex-shrink:0">${r.type}</span>
    </a>
  `).join('');
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
  btn.onmouseover = () => { btn.style.borderColor = 'var(--accent)'; btn.style.color = 'var(--accent)'; };
  btn.onmouseout  = () => { btn.style.borderColor = 'var(--border)';  btn.style.color = 'var(--text2)'; };
  const header = document.querySelector('header');
  if (header) header.appendChild(btn);
}

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key === 'l') { e.preventDefault(); showAuditLog(); return; }
  if (e.key === 'Escape') { closeSearch(); document.getElementById('shortcuts-overlay')?.remove(); document.getElementById('audit-overlay')?.remove(); return; }
  // Single-key nav — skip when typing in a field
  const tag = document.activeElement?.tagName;
  if (e.ctrlKey || e.metaKey || e.altKey || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  switch (e.key) {
    case '?': e.preventDefault(); showShortcutsPanel(); break;
    case 'h': e.preventDefault(); location.href = 'index.html'; break;
    case 's': e.preventDefault(); location.href = 'vault-pine-collective.html'; break;
    case 'g': e.preventDefault(); location.href = 'goals-dashboard.html'; break;
    case 'e': e.preventDefault(); location.href = 'expenses.html'; break;
    case 'a': e.preventDefault(); location.href = 'analytics.html'; break;
    case 'p': e.preventDefault(); location.href = 'production.html'; break;
    case 'v': e.preventDefault(); location.href = 'events.html'; break;
    case 'c': e.preventDefault(); location.href = 'content.html'; break;
    case 'r': e.preventDefault(); location.href = 'review.html'; break;
  }
});

// ── KEYBOARD SHORTCUTS PANEL ───────────────────────
function showShortcutsPanel() {
  if (document.getElementById('shortcuts-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'shortcuts-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9997;display:flex;align-items:center;justify-content:center;';
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
    ['Ctrl+K', 'Global Search'],
    ['Ctrl+L', 'Audit Log'],
    ['?', 'This shortcuts panel'],
  ].map(([k, d]) => `
    <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border);">
      <kbd style="font-size:0.68rem;background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:3px 8px;font-family:monospace;min-width:60px;text-align:center;">${k}</kbd>
      <span style="font-size:0.82rem;color:var(--text2)">${d}</span>
    </div>`).join('');
  overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:28px;width:380px;max-width:95vw;">
      <div style="font-size:0.88rem;font-weight:700;margin-bottom:16px;">Keyboard Shortcuts</div>
      ${rows}
      <div style="margin-top:18px;text-align:right;">
        <button onclick="document.getElementById('shortcuts-overlay').remove()" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--text2);padding:6px 14px;font-size:0.78rem;cursor:pointer;font-family:inherit;">Close (ESC)</button>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ── AUDIT LOG ──────────────────────────────────────
const AUDIT_KEY = 'vpc_audit_log';
const AUDIT_MAX = 300;

window.auditLog = function(action, key, detail = '') {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    const log = raw ? JSON.parse(raw) : [];
    log.unshift({ ts: Date.now(), action, key, detail, page: location.pathname.split('/').pop() || 'index.html' });
    if (log.length > AUDIT_MAX) log.length = AUDIT_MAX;
    // Use native setItem to avoid triggering sync
    Object.getPrototypeOf(localStorage).setItem.call(localStorage, AUDIT_KEY, JSON.stringify(log));
  } catch(e) {}
};

function showAuditLog() {
  if (document.getElementById('audit-overlay')) return;
  let log = [];
  try { log = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]'); } catch(e) {}
  const overlay = document.createElement('div');
  overlay.id = 'audit-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9997;display:flex;align-items:center;justify-content:center;';
  const rows = log.length ? log.slice(0, 60).map(entry => {
    const d = new Date(entry.ts);
    const ts = d.toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
    return `<div style="display:grid;grid-template-columns:110px 54px 130px 1fr;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.75rem;">
      <span style="color:var(--text2)">${ts}</span>
      <span style="color:var(--accent);font-weight:600">${entry.action}</span>
      <span style="color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${entry.key}</span>
      <span style="color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${entry.detail}</span>
    </div>`;
  }).join('') : '<div style="color:var(--text2);font-size:0.82rem;padding:24px;text-align:center">No audit entries yet.</div>';
  overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:28px;width:740px;max-width:96vw;max-height:82vh;display:flex;flex-direction:column;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div style="font-size:0.9rem;font-weight:700;">Audit Log <span style="font-size:0.72rem;color:var(--text2);font-weight:400">(last ${Math.min(log.length,60)} of ${log.length} entries)</span></div>
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
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ── NOTIFICATIONS ──────────────────────────────────
window.checkAndNotify = function() {
  if (!('Notification' in window) || Notification.permission === 'denied') return;
  const lastCheck = localStorage.getItem('vpc_notif_last_check');
  const today = new Date().toDateString();
  if (lastCheck === today) return;

  const fireAlert = (title, body) => {
    if (Notification.permission === 'granted') {
      try { new Notification(title, { body, icon: '/icon-192.png' }); } catch(e) {}
    }
  };

  const runChecks = () => {
    localStorage.setItem('vpc_notif_last_check', today);
    const now = new Date(); now.setHours(0,0,0,0);
    // Overdue goals
    try {
      const g = JSON.parse(localStorage.getItem('goals_dashboard_v1') || '{"goals":[]}');
      const od = (g.goals||[]).filter(x => !x.done && x.due && new Date(x.due+'T00:00:00') < now);
      if (od.length) { fireAlert('Overdue Goals', `You have ${od.length} overdue goal${od.length>1?'s':''}. Open the Goals dashboard.`); return; }
    } catch(e) {}
    // Budget exceeded
    try {
      const budget = JSON.parse(localStorage.getItem('vpc_expense_budget_v1') || '{"total":0}');
      if (budget.total > 0) {
        const mn = new Date(); const prefix = `${mn.getFullYear()}-${String(mn.getMonth()+1).padStart(2,'0')}`;
        const total = JSON.parse(localStorage.getItem('vpc_personal_expenses_v1')||'[]')
          .filter(e => (e.date||'').startsWith(prefix)).reduce((s,e)=>s+(e.amount||0),0);
        if (total > budget.total) { fireAlert('Budget Exceeded', `$${total.toFixed(0)} spent vs $${budget.total} budget this month.`); }
      }
    } catch(e) {}
  };

  if (Notification.permission === 'granted') {
    runChecks();
  } else if (Notification.permission === 'default' && !localStorage.getItem('vpc_notif_declined')) {
    setTimeout(() => {
      const t = document.createElement('div');
      t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 18px;font-size:0.82rem;color:var(--text);z-index:9500;display:flex;align-items:center;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,0.3);white-space:nowrap;';
      t.innerHTML = `<span>🔔</span><span>Enable deadline reminders?</span>
        <button onclick="Notification.requestPermission().then(p=>{if(p==='granted')checkAndNotify();});this.closest('div').remove();" style="background:var(--accent);color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:0.78rem;font-weight:700;cursor:pointer;font-family:inherit;">Enable</button>
        <button onclick="localStorage.setItem('vpc_notif_declined','1');this.closest('div').remove();" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--text2);padding:5px 10px;font-size:0.78rem;cursor:pointer;font-family:inherit;">No thanks</button>`;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 9000);
    }, 6000);
  }
};

// ── TREND ALERTS ───────────────────────────────────
window.checkTrendAlerts = function() {
  const alerts = [];
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const lmDate = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const lastMonth = `${lmDate.getFullYear()}-${String(lmDate.getMonth()+1).padStart(2,'0')}`;

  try {
    const exps = JSON.parse(localStorage.getItem('vpc_personal_expenses_v1')||'[]');
    const thisTot = exps.filter(e=>(e.date||'').startsWith(thisMonth)).reduce((s,e)=>s+(e.amount||0),0);
    const lastTot = exps.filter(e=>(e.date||'').startsWith(lastMonth)).reduce((s,e)=>s+(e.amount||0),0);
    if (lastTot > 0 && thisTot > 0) {
      const dom = now.getDate();
      const dim = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
      const proj = (thisTot / dom) * dim;
      if (proj > lastTot * 1.2) alerts.push({ type:'warning', msg:`Spending on track to be ${Math.round((proj/lastTot-1)*100)}% above last month`, url:'expenses.html' });
    }
    const budget = JSON.parse(localStorage.getItem('vpc_expense_budget_v1')||'{"total":0}');
    if (budget.total > 0 && thisTot > budget.total * 0.85) {
      const pct = Math.round(thisTot / budget.total * 100);
      alerts.push({ type: pct >= 100 ? 'danger':'warning', msg:`Budget ${pct>=100?'exceeded':'at '+pct+'%'} this month`, url:'expenses.html' });
    }
  } catch(e) {}

  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const week = new Date(today); week.setDate(week.getDate()+7);
    const g = JSON.parse(localStorage.getItem('goals_dashboard_v1')||'{"goals":[]}');
    const od = (g.goals||[]).filter(x=>!x.done&&x.due&&new Date(x.due+'T00:00:00')<today);
    if (od.length) alerts.push({ type:'danger', msg:`${od.length} goal${od.length>1?'s':''} overdue`, url:'goals-dashboard.html' });
    const soon = (g.goals||[]).filter(x=>!x.done&&x.due&&new Date(x.due+'T00:00:00')<=week&&new Date(x.due+'T00:00:00')>=today);
    if (soon.length) alerts.push({ type:'warning', msg:`${soon.length} goal${soon.length>1?'s':''} due this week`, url:'goals-dashboard.html' });
  } catch(e) {}

  return alerts;
};

function injectTrendAlerts() {
  const alerts = checkTrendAlerts();
  if (!alerts.length) return;
  const container = document.createElement('div');
  container.id = 'trend-alerts';
  container.style.cssText = 'position:fixed;top:68px;right:16px;z-index:8000;display:flex;flex-direction:column;gap:6px;max-width:310px;';
  alerts.forEach(a => {
    const c = a.type === 'danger' ? { border:'var(--red)', icon:'⚠' } : { border:'var(--yellow)', icon:'⚡' };
    const el = document.createElement('div');
    el.style.cssText = `background:var(--surface);border:1px solid ${c.border};border-left:3px solid ${c.border};border-radius:8px;padding:9px 12px;font-size:0.75rem;color:var(--text);display:flex;align-items:center;gap:8px;box-shadow:0 4px 16px rgba(0,0,0,0.25);cursor:pointer;animation:alertSlide 0.3s ease;`;
    el.innerHTML = `<span style="color:${c.border};font-size:0.9rem;flex-shrink:0">${c.icon}</span><span style="flex:1">${a.msg}</span><button onclick="event.stopPropagation();this.closest('div').remove()" style="background:none;border:none;color:var(--text2);cursor:pointer;font-size:0.75rem;padding:0;flex-shrink:0;font-family:inherit;">✕</button>`;
    el.addEventListener('click', e => { if (e.target.tagName !== 'BUTTON') location.href = a.url; });
    container.appendChild(el);
  });
  document.body.appendChild(container);
  // Inject animation keyframe once
  if (!document.getElementById('alert-anim-style')) {
    const s = document.createElement('style');
    s.id = 'alert-anim-style';
    s.textContent = '@keyframes alertSlide{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}';
    document.head.appendChild(s);
  }
  setTimeout(() => container.remove(), 12000);
}

// ── PWA ───────────────────────────────────────────
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
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
  registerSW();
  // Deferred enhancements
  setTimeout(() => {
    checkAndNotify();
    injectTrendAlerts();
  }, 2000);
});
