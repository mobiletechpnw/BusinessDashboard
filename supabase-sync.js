/**
 * supabase-sync.js v3
 * Auth + cloud sync for Business Command Center
 *
 * Strategy:
 *  - Supabase Auth (email/password) gates all data access
 *  - Session stored in localStorage, auto-refreshed when near expiry
 *  - localStorage is the primary read source (instant); Supabase is the persistence layer
 *  - Every localStorage write auto-pushes to Supabase (monkey-patched setItem)
 *  - On every page load: pull from Supabase → re-render if new data arrived
 *  - Offline: works on localStorage, queues pushes for next online moment
 */

'use strict';

const VPC_SUPABASE_URL = 'https://cqvnspbdfmgwcutezmqe.supabase.co';
const VPC_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdm5zcGJkZm1nd2N1dGV6bXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NjI3MDUsImV4cCI6MjA5NjEzODcwNX0.0GGjc6i8VwgJgDUFNwcNzEy4r0_sAo57I5iMMPi7dII';
const SESSION_KEY      = 'vpc_auth_session';

// All localStorage keys synced to the cloud.
// Supabase table: app_data (key TEXT, value JSONB, user_id UUID, updated_at TIMESTAMPTZ)
// Primary key: (key, user_id) — RLS ensures each user only sees their own rows.
const SYNC_KEYS = [
  // ── Sales & Orders ──────────────────────────────────────
  'vp_orders_v2',

  // ── Goals ───────────────────────────────────────────────
  'goals_dashboard_v1',
  'vp_goals_v1',              // legacy key — kept for backwards compatibility

  // ── Expenses ────────────────────────────────────────────
  'vpc_personal_expenses_v1',
  'vpc_recurring_expenses_v1',
  'vpc_expense_budget_v1',
  'vp_expenses_v1',           // legacy key — still read by analytics/review

  // ── Events & Tables ─────────────────────────────────────
  'vpc_events_v1',
  'vpc_vendors_v1',
  'vpc_tables_v1',
  'vp_events_v1',             // legacy key — still read by vault-pine page

  // ── Products: JetTags ───────────────────────────────────
  'vp_jettags_v1',
  'vp_jettags_restock_v1',

  // ── Products: Pins ──────────────────────────────────────
  'vp_pins_v1',
  'vp_pins_restock_v1',

  // ── Content Planner ─────────────────────────────────────
  'vpc_content_v1',

  // ── Production / 3-D Printing ───────────────────────────
  'vpc_print_queue_v1',
  'vpc_inventory_v1',
  'vpc_printer_credits_v1',
  'riser_monthly_goal_v1',
  'riser_filament_v1',
  'vpc_costs_v1',

  // ── Audit log ───────────────────────────────────────────
  'vpc_audit_log',

  // ── User preferences (sync across devices) ───────────────
  'vpc_theme',

  // ── Upcoming Deliveries ──────────────────────────────────
  'vpc_pipeline_v1',
];

// Initialize __ts for any SYNC_KEY that has data but no timestamp
(function initTimestamps() {
  SYNC_KEYS.forEach(k => {
    if (localStorage.getItem(k) && !localStorage.getItem(`${k}__ts`)) {
      try { localStorage.setItem(`${k}__ts`, Date.now().toString()); } catch(e) {}
    }
  });
})();

const LAST_SYNC_KEY  = 'vpc_last_sync_at';
const PUSH_QUEUE_KEY = 'vpc_push_queue';

// ── Auth ──────────────────────────────────────────────────────────────────────

const VpcAuth = {
  _cache: null,

  get() {
    if (this._cache) return this._cache;
    try { this._cache = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch {}
    return this._cache;
  },

  save(session) {
    this._cache = session;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  clear() {
    this._cache = null;
    localStorage.removeItem(SESSION_KEY);
  },

  isValid(s) {
    return !!(s && s.access_token && s.expires_at > Date.now() + 120_000);
  },

  async refresh(s) {
    if (!s?.refresh_token) return null;
    try {
      const res = await fetch(`${VPC_SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method:  'POST',
        headers: { 'apikey': VPC_SUPABASE_KEY, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refresh_token: s.refresh_token }),
      });
      if (!res.ok) { this.clear(); return null; }
      const d = await res.json();
      const refreshed = {
        access_token:  d.access_token,
        refresh_token: d.refresh_token || s.refresh_token,
        expires_at:    Date.now() + d.expires_in * 1000,
        user:          d.user || s.user,
      };
      this.save(refreshed);
      return refreshed;
    } catch { return null; }
  },

  // Returns a valid session (refreshing if needed), or null
  async getValid() {
    const s = this.get();
    if (!s) return null;
    if (this.isValid(s)) return s;
    return await this.refresh(s);
  },

  async signOut() {
    const s = this.get();
    if (s?.access_token) {
      fetch(`${VPC_SUPABASE_URL}/auth/v1/logout`, {
        method:  'POST',
        headers: { 'apikey': VPC_SUPABASE_KEY, 'Authorization': `Bearer ${s.access_token}` },
      }).catch(() => {});
    }
    this.clear();
    sessionStorage.removeItem('vpc_authed');
    window.location.href = 'login.html';
  },
};

// ── Immediate auth guard ───────────────────────────────────────────────────────
// Runs synchronously when the script loads — before DOMContentLoaded — so that
// the PIN overlay from shared.js never appears on pages that need a redirect.

(function immediateAuthGuard() {
  const onLoginPage = window.location.pathname.endsWith('login.html');
  if (onLoginPage) return;

  const s = VpcAuth.get();
  if (!s) {
    // No session at all → redirect right now
    const here = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `login.html?redirect=${here}`;
    return;
  }

  // Session exists (may be near-expired but has a refresh token).
  // Pre-authorize the PIN session so shared.js won't show the overlay.
  sessionStorage.setItem('vpc_authed', JSON.stringify({ ts: Date.now() }));
})();

// ── REST helpers ──────────────────────────────────────────────────────────────

async function sbFetch(path, opts = {}) {
  const session = await VpcAuth.getValid();
  if (!session && !window.location.pathname.endsWith('login.html')) {
    VpcAuth.clear();
    window.location.href = 'login.html';
    throw new Error('Not authenticated');
  }
  const token = session?.access_token || VPC_SUPABASE_KEY;

  const res = await fetch(`${VPC_SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      'apikey':        VPC_SUPABASE_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${opts.method || 'GET'} ${path}: ${res.status} — ${err}`);
  }
  return res.status === 204 ? null : res.json();
}

async function sbUpsert(key, value) {
  const session = await VpcAuth.getValid();
  if (!session?.user?.id) throw new Error('No authenticated user — cannot upsert');
  return sbFetch('app_data', {
    method:  'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      key,
      value,
      user_id:    session.user.id,
      updated_at: new Date().toISOString(),
    }),
  });
}

async function sbFetchAll(keys) {
  const filter = keys?.length
    ? `?key=in.(${keys.map(k => `"${k}"`).join(',')})&select=key,value,updated_at`
    : '?select=key,value,updated_at';
  return sbFetch(`app_data${filter}`);
}

// ── Push queue (offline support) ──────────────────────────────────────────────

function getPushQueue() {
  return JSON.parse(localStorage.getItem(PUSH_QUEUE_KEY) || '{}');
}
function queuePush(key) {
  const q = getPushQueue();
  q[key] = Date.now();
  localStorage.setItem(PUSH_QUEUE_KEY, JSON.stringify(q));
}
function dequeueKey(key) {
  const q = getPushQueue();
  delete q[key];
  localStorage.setItem(PUSH_QUEUE_KEY, JSON.stringify(q));
}

// ── VpcSync ───────────────────────────────────────────────────────────────────

const VpcSync = {
  _listeners: [],
  _status:    'idle',
  _pulling:   false,

  onStatus(fn) { this._listeners.push(fn); },
  _emit(status, detail = '') {
    this._status = status;
    this._listeners.forEach(fn => fn(status, detail));
    this._updateIndicator(status, detail);
  },

  async pull() {
    this._emit('syncing', 'Pulling from cloud…');
    this._pulling = true;
    try {
      const rows = await sbFetchAll(SYNC_KEYS);
      let pulled = 0, skipped = 0;
      const conflicts = [];

      rows.forEach(row => {
        const cloudTs = new Date(row.updated_at).getTime();
        const localTs = parseInt(localStorage.getItem(`${row.key}__ts`) || '0');
        // Conflict: cloud is newer than last sync, but local was also edited recently (within 60s)
        const lastSync = parseInt(localStorage.getItem(LAST_SYNC_KEY) || '0');
        const localRecentlyEdited = localTs > lastSync && (Date.now() - localTs) < 60_000;
        if (cloudTs > localTs && localRecentlyEdited) {
          conflicts.push({ key: row.key, cloudTs, localTs, value: row.value });
        } else if (cloudTs >= localTs) {
          const val = row.value;
          localStorage.setItem(row.key, typeof val === 'string' ? val : JSON.stringify(val));
          localStorage.setItem(`${row.key}__ts`, cloudTs);
          pulled++;
        } else {
          skipped++;
        }
      });

      if (conflicts.length > 0) {
        this._showConflictUI(conflicts, () => {
          localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
          this._emit('synced', `${pulled} synced, ${conflicts.length} conflict(s) resolved`);
          if (pulled > 0 && typeof window.renderAll === 'function') window.renderAll();
        });
      }

      localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
      this._emit('synced', `Synced ${pulled} keys`);
      return { pulled, skipped };
    } catch (e) {
      console.warn('[VpcSync] pull failed:', e.message);
      this._emit(navigator.onLine ? 'error' : 'offline', e.message);
      return { pulled: 0, skipped: 0 };
    } finally {
      this._pulling = false;
    }
  },

  _showConflictUI(conflicts, onDone) {
    if (document.getElementById('vpc-conflict-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'vpc-conflict-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99990;display:flex;align-items:center;justify-content:center;';
    const items = conflicts.map(c => {
      const localDate = new Date(c.localTs).toLocaleString();
      const cloudDate = new Date(c.cloudTs).toLocaleString();
      const localSize = (localStorage.getItem(c.key) || '').length;
      const cloudSize = JSON.stringify(c.value).length;
      return `<div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.3);border-radius:8px;padding:14px;margin-bottom:12px;">
        <div style="font-size:0.82rem;font-weight:700;margin-bottom:8px;color:var(--yellow,#fbbf24)">⚠ Conflict: <code style="font-size:0.78rem;background:rgba(0,0,0,0.2);padding:2px 6px;border-radius:4px">${c.key}</code></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.75rem;">
          <div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px;">
            <div style="color:#8892b0;margin-bottom:4px">Local Version</div>
            <div>Modified: ${localDate}</div>
            <div style="color:#8892b0">${localSize} chars</div>
          </div>
          <div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px;">
            <div style="color:#8892b0;margin-bottom:4px">Cloud Version</div>
            <div>Modified: ${cloudDate}</div>
            <div style="color:#8892b0">${cloudSize} chars</div>
          </div>
        </div>
      </div>`;
    }).join('');
    modal.innerHTML = `
      <div style="background:var(--surface,#1a1d27);border:1px solid var(--border,#2e3350);border-radius:14px;padding:28px;width:560px;max-width:95vw;max-height:80vh;overflow-y:auto;">
        <div style="font-size:1rem;font-weight:700;margin-bottom:6px;">Sync Conflict Detected</div>
        <div style="font-size:0.78rem;color:#8892b0;margin-bottom:20px;">Both local and cloud data were modified. Choose which version to keep for each key.</div>
        ${items}
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap;">
          <button id="vpc-conf-local" style="background:var(--surface2,#22263a);border:1px solid var(--border,#2e3350);color:#e2e8f0;border-radius:7px;padding:8px 16px;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:inherit;">Keep Local (my changes)</button>
          <button id="vpc-conf-cloud" style="background:var(--accent,#6c8cff);border:none;color:#fff;border-radius:7px;padding:8px 16px;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:inherit;">Use Cloud (discard local)</button>
        </div>
      </div>`;

    document.body.appendChild(modal);

    document.getElementById('vpc-conf-local').addEventListener('click', () => {
      // Keep local — push local to cloud to resolve
      conflicts.forEach(c => { VpcSync.push(c.key); });
      modal.remove();
      onDone();
    });
    document.getElementById('vpc-conf-cloud').addEventListener('click', () => {
      // Use cloud — overwrite local
      conflicts.forEach(c => {
        const val = c.value;
        localStorage.setItem(c.key, typeof val === 'string' ? val : JSON.stringify(val));
        localStorage.setItem(`${c.key}__ts`, c.cloudTs);
      });
      modal.remove();
      onDone();
      if (typeof window.renderAll === 'function') window.renderAll();
    });
  },

  async push(key) {
    if (!SYNC_KEYS.includes(key)) return;
    const raw = localStorage.getItem(key);
    if (raw === null) return;
    let value;
    try { value = JSON.parse(raw); } catch { value = raw; }

    if (!navigator.onLine) {
      queuePush(key);
      this._emit('offline', 'Queued (offline)');
      return;
    }
    try {
      await sbUpsert(key, value);
      localStorage.setItem(`${key}__ts`, Date.now());
      dequeueKey(key);
      this._emit('synced', `Saved ${key}`);
    } catch (e) {
      console.warn('[VpcSync] push failed:', e.message);
      queuePush(key);
      this._emit('error', e.message);
    }
  },

  async pushAll() {
    this._emit('syncing', 'Uploading all data…');
    let ok = 0, failed = 0;
    for (const key of SYNC_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      let value;
      try { value = JSON.parse(raw); } catch { value = raw; }
      try {
        await sbUpsert(key, value);
        localStorage.setItem(`${key}__ts`, Date.now());
        ok++;
      } catch (e) {
        console.warn('[VpcSync] pushAll failed for', key, e.message);
        failed++;
      }
    }
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    this._emit(failed === 0 ? 'synced' : 'error', `${ok} pushed, ${failed} failed`);
    return { ok, failed };
  },

  async flushQueue() {
    const q    = getPushQueue();
    const keys = Object.keys(q);
    if (!keys.length) return;
    for (const key of keys) await this.push(key);
  },

  async sync() {
    const result = await this.pull();
    await this.flushQueue();
    return result;
  },

  // ── UI ─────────────────────────────────────────────────────────────────────

  _updateIndicator(status) {
    const el = document.getElementById('vpc-sync-dot');
    if (!el) return;
    const cfg = {
      syncing: { color: '#6c8cff', label: 'Syncing…',  pulse: true  },
      synced:  { color: '#34d399', label: 'Synced',     pulse: false },
      error:   { color: '#f87171', label: 'Sync error', pulse: false },
      offline: { color: '#fbbf24', label: 'Offline',    pulse: false },
      idle:    { color: '#4b5563', label: 'Cloud sync', pulse: false },
    };
    const c = cfg[status] || cfg.idle;
    el.style.background  = c.color;
    el.style.animation   = c.pulse ? 'vpc-pulse 1.2s infinite' : 'none';
    const lbl = document.getElementById('vpc-sync-label');
    if (lbl) lbl.textContent = c.label;
  },

  injectIndicator(session) {
    if (document.getElementById('vpc-sync-wrap')) return;

    // Inject keyframe once
    if (!document.getElementById('vpc-sync-style')) {
      const s = document.createElement('style');
      s.id = 'vpc-sync-style';
      s.textContent = `@keyframes vpc-pulse{0%,100%{opacity:1}50%{opacity:.3}}`;
      document.head.appendChild(s);
    }

    const wrap = document.createElement('div');
    wrap.id = 'vpc-sync-wrap';
    wrap.style.cssText = 'display:inline-flex;align-items:center;gap:8px;flex-shrink:0;';

    // Sync status chip
    const chip = document.createElement('div');
    chip.title = 'Sync status — click to sync now';
    chip.style.cssText = `
      display:inline-flex;align-items:center;gap:5px;cursor:pointer;
      padding:4px 10px;border-radius:99px;
      border:1px solid #2e3350;background:#1a1d27;
      transition:border-color .15s;user-select:none;
    `;
    chip.innerHTML = `
      <span id="vpc-sync-dot" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#4b5563;flex-shrink:0;"></span>
      <span id="vpc-sync-label" style="font-size:.7rem;color:#8892b0;">Cloud sync</span>
    `;
    chip.addEventListener('click',      () => VpcSync.sync());
    chip.addEventListener('mouseenter', () => chip.style.borderColor = '#6c8cff');
    chip.addEventListener('mouseleave', () => chip.style.borderColor = '#2e3350');

    // User + sign-out chip
    const userChip = document.createElement('div');
    userChip.style.cssText = 'display:inline-flex;align-items:center;gap:6px;flex-shrink:0;';
    const email = session?.user?.email || '';
    if (email) {
      const emailSpan = document.createElement('span');
      emailSpan.style.cssText = 'font-size:.7rem;color:#8892b0;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      emailSpan.textContent = email;

      const signOutBtn = document.createElement('button');
      signOutBtn.textContent = 'Sign Out';
      signOutBtn.style.cssText = `
        background:none;border:1px solid #2e3350;border-radius:5px;
        color:#8892b0;padding:3px 8px;font-size:.65rem;font-weight:600;
        cursor:pointer;transition:all .15s;font-family:inherit;
      `;
      signOutBtn.addEventListener('mouseenter', () => { signOutBtn.style.borderColor = '#f87171'; signOutBtn.style.color = '#f87171'; });
      signOutBtn.addEventListener('mouseleave', () => { signOutBtn.style.borderColor = '#2e3350'; signOutBtn.style.color = '#8892b0'; });
      signOutBtn.addEventListener('click', () => VpcAuth.signOut());

      userChip.appendChild(emailSpan);
      userChip.appendChild(signOutBtn);
    }

    wrap.appendChild(chip);
    wrap.appendChild(userChip);

    const header = document.querySelector('header');
    if (header) {
      const ref = header.lastElementChild;
      if (ref) header.insertBefore(wrap, ref);
      else header.appendChild(wrap);
    } else {
      wrap.style.cssText += 'position:fixed;top:12px;right:16px;z-index:9999;';
      document.body.appendChild(wrap);
    }

    this._updateIndicator('idle');
  },
};

// ── DOMContentLoaded ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  if (window.location.pathname.endsWith('login.html')) return;

  // Full session validation (refresh if near-expired)
  const session = await VpcAuth.getValid();
  if (!session) {
    VpcAuth.clear();
    const here = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `login.html?redirect=${here}`;
    return;
  }

  VpcSync.injectIndicator(session);

  // Pull latest cloud data; re-render if new data arrived (fixes blank-on-new-device bug)
  const { pulled } = await VpcSync.sync();
  if (pulled > 0 && typeof window.renderAll === 'function') {
    window.renderAll();
  }

  window.addEventListener('online',  () => VpcSync.flushQueue());
  window.addEventListener('offline', () => VpcSync._emit('offline', 'No connection'));
});

// ── localStorage monkey-patch ─────────────────────────────────────────────────
// Auto-push to Supabase on every write to a tracked key.

(function () {
  const _setItem    = localStorage.setItem.bind(localStorage);
  const _syncTimers = new Map();

  localStorage.setItem = function (key, value) {
    _setItem(key, value);
    if (!SYNC_KEYS.includes(key) || VpcSync._pulling) return;
    clearTimeout(_syncTimers.get(key));
    _syncTimers.set(key, setTimeout(() => {
      _syncTimers.delete(key);
      VpcSync.push(key);
    }, 800));
  };
})();

// ── Exports ───────────────────────────────────────────────────────────────────
window.VpcSync = VpcSync;
window.VpcAuth = VpcAuth;
