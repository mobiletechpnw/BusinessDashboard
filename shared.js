/* ═══════════════════════════════════════════════════
   shared.js — PIN Lock · Theme Toggle · Global Search
   Vault & Pine Collective
═══════════════════════════════════════════════════ */

// ── THEME ─────────────────────────────────────────
const THEME_KEY = 'vpc_theme';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'light' ? '🌙' : '☀️';
}

function toggleTheme() {
  const current = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// Inject theme toggle button into any header
function injectThemeBtn() {
  const btn = document.createElement('button');
  btn.id = 'theme-toggle';
  btn.title = 'Toggle light/dark mode';
  btn.onclick = toggleTheme;
  btn.style.cssText = `
    background:none;border:1px solid var(--border);border-radius:6px;
    padding:5px 10px;cursor:pointer;font-size:1rem;color:var(--text2);
    transition:all 0.2s;flex-shrink:0;
  `;
  btn.onmouseover = () => { btn.style.borderColor = 'var(--accent)'; btn.style.color = 'var(--accent)'; };
  btn.onmouseout  = () => { btn.style.borderColor = 'var(--border)';  btn.style.color = 'var(--text2)'; };
  const header = document.querySelector('header');
  if (header) header.appendChild(btn);
}

// ── PIN LOCK ──────────────────────────────────────
const PIN_STORE   = 'vpc_pin_hash';
const PIN_SESSION = 'vpc_authed';
const PIN_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours

async function hashPin(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('vpc_salt_' + pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function isPinSet()     { return !!localStorage.getItem(PIN_STORE); }
function isAuthed()     {
  const s = sessionStorage.getItem(PIN_SESSION);
  if (!s) return false;
  const { ts } = JSON.parse(s);
  return Date.now() - ts < PIN_TIMEOUT;
}
function markAuthed()   { sessionStorage.setItem(PIN_SESSION, JSON.stringify({ ts: Date.now() })); }
function clearAuth()    { sessionStorage.removeItem(PIN_SESSION); }

function showPinOverlay(mode = 'unlock') {
  const overlay = document.createElement('div');
  overlay.id = 'pin-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;background:var(--bg,#0f1117);z-index:99999;
    display:flex;align-items:center;justify-content:center;flex-direction:column;gap:0;
  `;

  const isSetup = mode === 'setup';
  const isChange = mode === 'change';

  overlay.innerHTML = `
    <div style="text-align:center;max-width:300px;width:90%;">
      <div style="font-size:2rem;margin-bottom:12px;">🔒</div>
      <div style="font-family:'Orbitron',system-ui;font-size:1rem;font-weight:700;color:var(--accent,#6c8cff);letter-spacing:2px;margin-bottom:6px;">
        ${isSetup ? 'CREATE PIN' : isChange ? 'NEW PIN' : 'ENTER PIN'}
      </div>
      <div id="pin-subtitle" style="font-size:0.75rem;color:var(--text2,#8892b0);margin-bottom:28px;">
        ${isSetup ? 'Set a 4-digit PIN to protect your dashboard' : isChange ? 'Enter your new 4-digit PIN' : 'Business Command Center'}
      </div>
      <div id="pin-dots" style="display:flex;gap:16px;justify-content:center;margin-bottom:28px;">
        ${[0,1,2,3].map(i => `<div id="dot-${i}" style="width:14px;height:14px;border-radius:50%;border:2px solid var(--border,#2e3350);transition:all 0.2s;"></div>`).join('')}
      </div>
      <div id="pin-error" style="color:#f87171;font-size:0.75rem;min-height:18px;margin-bottom:12px;"></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:240px;margin:0 auto;">
        ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => `
          <button onclick="pinKeyPress('${k}')" style="
            background:var(--surface,#1a1d27);border:1px solid var(--border,#2e3350);
            border-radius:10px;padding:16px;font-size:1.2rem;font-weight:700;
            color:var(--text,#e2e8f0);cursor:pointer;transition:all 0.15s;
            ${k === '' ? 'visibility:hidden;' : ''}
          " onmouseover="this.style.borderColor='var(--accent,#6c8cff)';this.style.background='var(--surface2,#22263a)'"
            onmouseout="this.style.borderColor='var(--border,#2e3350)';this.style.background='var(--surface,#1a1d27)'"
          >${k}</button>`).join('')}
      </div>
      ${!isSetup && !isChange ? `<div style="margin-top:20px;"><button onclick="showPinSetup()" style="background:none;border:none;color:var(--text2,#8892b0);font-size:0.72rem;cursor:pointer;text-decoration:underline;">Forgot PIN? Reset</button></div>` : ''}
    </div>
  `;
  document.body.appendChild(overlay);
}

let pinBuffer = '';
let pinStep = 'enter'; // enter | confirm
let pinFirst = '';

window.pinKeyPress = function(key) {
  if (key === '') return;
  const err = document.getElementById('pin-error');
  if (key === '⌫') {
    pinBuffer = pinBuffer.slice(0, -1);
  } else if (pinBuffer.length < 4) {
    pinBuffer += key;
  }
  // update dots
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById('dot-' + i);
    if (!dot) continue;
    dot.style.background = i < pinBuffer.length ? 'var(--accent,#6c8cff)' : 'transparent';
    dot.style.borderColor = i < pinBuffer.length ? 'var(--accent,#6c8cff)' : 'var(--border,#2e3350)';
  }
  if (pinBuffer.length === 4) {
    const mode = document.getElementById('pin-overlay')?.dataset.mode || 'unlock';
    setTimeout(() => handlePinSubmit(mode), 150);
  }
};

async function handlePinSubmit(mode) {
  const err = document.getElementById('pin-error');
  const hash = await hashPin(pinBuffer);

  if (mode === 'setup' || mode === 'change') {
    if (pinStep === 'enter') {
      pinFirst = pinBuffer;
      pinBuffer = '';
      pinStep = 'confirm';
      document.getElementById('pin-subtitle').textContent = 'Confirm your PIN';
      for (let i = 0; i < 4; i++) {
        const dot = document.getElementById('dot-' + i);
        if (dot) { dot.style.background = 'transparent'; dot.style.borderColor = 'var(--border,#2e3350)'; }
      }
      return;
    } else {
      if (pinBuffer !== pinFirst) {
        err.textContent = 'PINs do not match — try again';
        pinBuffer = ''; pinFirst = ''; pinStep = 'enter';
        for (let i = 0; i < 4; i++) {
          const dot = document.getElementById('dot-' + i);
          if (dot) { dot.style.background = 'transparent'; dot.style.borderColor = 'var(--border,#2e3350)'; }
        }
        return;
      }
      localStorage.setItem(PIN_STORE, hash);
      markAuthed();
      document.getElementById('pin-overlay')?.remove();
      if (mode === 'change') showPinToast('PIN updated successfully');
      pinBuffer = ''; pinFirst = ''; pinStep = 'enter';
      return;
    }
  }

  // Unlock mode
  const stored = localStorage.getItem(PIN_STORE);
  if (hash === stored) {
    markAuthed();
    document.getElementById('pin-overlay')?.remove();
    pinBuffer = '';
  } else {
    err.textContent = 'Incorrect PIN';
    pinBuffer = '';
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById('dot-' + i);
      if (dot) { dot.style.background = '#f87171'; dot.style.borderColor = '#f87171'; }
    }
    setTimeout(() => {
      err.textContent = '';
      for (let i = 0; i < 4; i++) {
        const dot = document.getElementById('dot-' + i);
        if (dot) { dot.style.background = 'transparent'; dot.style.borderColor = 'var(--border,#2e3350)'; }
      }
    }, 700);
  }
}

window.showPinSetup = function(mode = 'setup') {
  pinBuffer = ''; pinFirst = ''; pinStep = 'enter';
  document.getElementById('pin-overlay')?.remove();
  showPinOverlay(mode);
  document.getElementById('pin-overlay').dataset.mode = mode;
};

function showPinToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--surface);border:1px solid var(--accent);border-radius:8px;padding:10px 20px;font-size:0.82rem;color:var(--accent);z-index:99998;';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function initPin() {
  if (!isPinSet()) {
    showPinOverlay('setup');
    document.getElementById('pin-overlay').dataset.mode = 'setup';
  } else if (!isAuthed()) {
    showPinOverlay('unlock');
    document.getElementById('pin-overlay').dataset.mode = 'unlock';
  }
}

// Expose change PIN for settings
window.changePin = () => { clearAuth(); showPinSetup('change'); };

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
    const goals = JSON.parse(localStorage.getItem('vp_goals_v1') || '{"goals":[]}').goals || [];
    goals.forEach(g => {
      results.push({ type: 'Goal', icon: '🎯', title: g.title || g.name || 'Goal', sub: g.notes || '', url: 'goals-dashboard.html' });
      (g.objectives || []).forEach(ob => results.push({
        type: 'Objective', icon: '✅', title: ob.title || ob.text || 'Objective', sub: `Under: ${g.title || g.name || ''}`, url: 'goals-dashboard.html'
      }));
    });
  } catch(e) {}
  // Pages
  [
    { title: 'Vault & Pine Collective', sub: 'Sales · Goals · Expenses · Jet Tags · Pins · Events', url: 'vault-pine-collective.html', icon: '🌲', type: 'Page' },
    { title: 'Analytics', sub: 'Margins, show breakdowns, trends', url: 'analytics.html', icon: '📈', type: 'Page' },
    { title: 'Goals & Objectives', sub: 'Track your goals', url: 'goals-dashboard.html', icon: '🎯', type: 'Page' },
    { title: 'JARVIS', sub: 'AI command center with voice control', url: 'jarvis.html', icon: '🤖', type: 'Page' },
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
  `;
  btn.innerHTML = `<span>🔍</span><span style="font-size:0.72rem">Ctrl+K</span>`;
  btn.onmouseover = () => { btn.style.borderColor = 'var(--accent)'; btn.style.color = 'var(--accent)'; };
  btn.onmouseout  = () => { btn.style.borderColor = 'var(--border)';  btn.style.color = 'var(--text2)'; };
  const header = document.querySelector('header');
  if (header) header.appendChild(btn);
}

// Keyboard shortcut
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
  if (e.key === 'Escape') closeSearch();
});

// ── PWA ───────────────────────────────────────────
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

// ── LIGHT MODE CSS ────────────────────────────────
function injectLightModeCSS() {
  const style = document.createElement('style');
  style.textContent = `
    [data-theme="light"] {
      --bg: #f0f4f8;
      --surface: #ffffff;
      --surface2: #e8edf3;
      --border: #cbd5e1;
      --text: #1e293b;
      --text2: #64748b;
      --accent: #3b6ef6;
      --accent2: #7c3aed;
      --green: #059669;
      --yellow: #d97706;
      --red: #dc2626;
      --orange: #ea580c;
    }
    [data-theme="light"] body {
      background: var(--bg);
    }
    [data-theme="light"] .card,
    [data-theme="light"] header,
    [data-theme="light"] .panel-box,
    [data-theme="light"] .kpi,
    [data-theme="light"] .gstat,
    [data-theme="light"] .hstat,
    [data-theme="light"] .jtat,
    [data-theme="light"] .estat,
    [data-theme="light"] .jt-stat-bar,
    [data-theme="light"] .goals-stat-bar,
    [data-theme="light"] .kpi-bar,
    [data-theme="light"] .exp-stat-bar,
    [data-theme="light"] .tab-bar,
    [data-theme="light"] .modal {
      background: var(--surface);
    }
    [data-theme="light"] table thead tr {
      background: var(--surface2);
    }
    [data-theme="light"] table tbody tr:hover {
      background: var(--surface2);
    }
    [data-theme="light"] input,
    [data-theme="light"] select,
    [data-theme="light"] textarea {
      background: var(--surface2);
      color: var(--text);
      border-color: var(--border);
    }
    [data-theme="light"] #pin-overlay {
      background: var(--bg);
    }
    [data-theme="light"] body {
      background-image:
        linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px);
    }
  `;
  document.head.appendChild(style);
}

// ── INIT ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  injectLightModeCSS();
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);
  injectThemeBtn();
  injectSearchBtn();
  registerSW();
  initPin();
});
