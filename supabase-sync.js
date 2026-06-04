/**
 * supabase-sync.js
 * Cloud sync layer for Business Command Center
 * Keeps localStorage in sync with Supabase (vpc-business-dashboard project)
 *
 * Strategy:
 *   - localStorage is the primary read source (instant, no latency)
 *   - Supabase is the persistence layer (survives browser clears, syncs across devices)
 *   - On page load: pull from Supabase and update localStorage if cloud is newer
 *   - On every write: save to localStorage immediately, push to Supabase async
 *   - Offline: works fully on localStorage, queues pushes for next online moment
 */

const VPC_SUPABASE_URL  = 'https://cqvnspbdfmgwcutezmqe.supabase.co';
const VPC_SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdm5zcGJkZm1nd2N1dGV6bXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NjI3MDUsImV4cCI6MjA5NjEzODcwNX0.0GGjc6i8VwgJgDUFNwcNzEy4r0_sAo57I5iMMPi7dII';

// All localStorage keys that should be synced to the cloud
const SYNC_KEYS = [
  'vp_orders_v2',
  'vp_goals_v1',
  'vp_expenses_v1',
  'vp_jettags_v1',
  'vp_jettags_restock_v1',
  'vp_pins_v1',
  'vp_pins_restock_v1',
  'vp_events_v1',
  'vpc_content_v1',
  'vpc_personal_expenses_v1',
  'vpc_recurring_expenses_v1',
  'vpc_expense_budget_v1',
  'vpc_print_queue_v1',
  'vpc_inventory_v1',
  'vpc_costs_v1',
  'vpc_printer_credits_v1',
  'riser_monthly_goal_v1',
  'riser_filament_v1',
];

const LAST_SYNC_KEY  = 'vpc_last_sync_at';
const PUSH_QUEUE_KEY = 'vpc_push_queue';

// ── Low-level REST helpers ────────────────────────────────────────────────────

async function sbFetch(path, opts = {}) {
  const res = await fetch(`${VPC_SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      'apikey':        VPC_SUPABASE_KEY,
      'Authorization': `Bearer ${VPC_SUPABASE_KEY}`,
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

// Upsert a single key→value row
async function sbUpsert(key, value) {
  return sbFetch('app_data', {
    method:  'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
    body:    JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
}

// Fetch all rows (or specific keys)
async function sbFetchAll(keys) {
  const filter = keys && keys.length
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

// ── Main API ──────────────────────────────────────────────────────────────────

const VpcSync = {
  _listeners: [],
  _status: 'idle', // idle | syncing | synced | error | offline

  onStatus(fn) { this._listeners.push(fn); },
  _emit(status, detail = '') {
    this._status = status;
    this._listeners.forEach(fn => fn(status, detail));
    this._updateIndicator(status, detail);
  },

  /**
   * Pull all synced keys from Supabase and update localStorage where cloud is newer.
   * Returns { pulled, skipped } counts.
   */
  async pull() {
    this._emit('syncing', 'Pulling from cloud…');
    try {
      const rows = await sbFetchAll(SYNC_KEYS);
      let pulled = 0, skipped = 0;

      rows.forEach(row => {
        const cloudTs = new Date(row.updated_at).getTime();
        const localTs  = parseInt(localStorage.getItem(`${row.key}__ts`) || '0');

        if (cloudTs >= localTs) {
          // Cloud is newer (or equal) — overwrite local
          const val = row.value;
          localStorage.setItem(row.key, typeof val === 'string' ? val : JSON.stringify(val));
          localStorage.setItem(`${row.key}__ts`, cloudTs);
          pulled++;
        } else {
          skipped++;
        }
      });

      localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
      this._emit('synced', `Synced ${pulled} keys`);
      return { pulled, skipped };
    } catch (e) {
      console.warn('[VpcSync] pull failed:', e.message);
      this._emit(navigator.onLine ? 'error' : 'offline', e.message);
      return { pulled: 0, skipped: 0 };
    }
  },

  /**
   * Push a single key to Supabase. Call this after every localStorage write.
   * Falls back to queueing if offline.
   */
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
      const ts = Date.now();
      localStorage.setItem(`${key}__ts`, ts);
      dequeueKey(key);
      this._emit('synced', `Saved ${key}`);
    } catch (e) {
      console.warn('[VpcSync] push failed:', e.message);
      queuePush(key);
      this._emit('error', e.message);
    }
  },

  /**
   * Push ALL local keys to Supabase. Use on first-time setup or manual backup.
   */
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

  /**
   * Flush any queued (offline) pushes. Call on window online event.
   */
  async flushQueue() {
    const q = getPushQueue();
    const keys = Object.keys(q);
    if (!keys.length) return;
    console.log('[VpcSync] flushing', keys.length, 'queued keys');
    for (const key of keys) await this.push(key);
  },

  /**
   * Full two-way sync: pull first, then flush queue.
   */
  async sync() {
    const result = await this.pull();
    await this.flushQueue();
    return result;
  },

  // ── UI indicator ─────────────────────────────────────────────────────────

  _updateIndicator(status, detail) {
    let el = document.getElementById('vpc-sync-indicator');
    if (!el) return;

    const cfg = {
      syncing: { dot: '#6c8cff', label: 'Syncing…',  pulse: true  },
      synced:  { dot: '#34d399', label: 'Synced',     pulse: false },
      error:   { dot: '#f87171', label: 'Sync error', pulse: false },
      offline: { dot: '#fbbf24', label: 'Offline',    pulse: false },
      idle:    { dot: '#4b5563', label: 'Cloud sync', pulse: false },
    };
    const c = cfg[status] || cfg.idle;
    el.innerHTML = `
      <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${c.dot};
        margin-right:5px;flex-shrink:0;${c.pulse?'animation:vpc-pulse 1.2s infinite':''}"></span>
      <span style="font-size:0.7rem;color:#8892b0">${c.label}</span>`;

    // Inject pulse keyframe once
    if (!document.getElementById('vpc-sync-style')) {
      const s = document.createElement('style');
      s.id = 'vpc-sync-style';
      s.textContent = `@keyframes vpc-pulse{0%,100%{opacity:1}50%{opacity:0.3}}`;
      document.head.appendChild(s);
    }
  },

  /**
   * Inject the sync indicator chip into the page header.
   * Call once after DOMContentLoaded.
   */
  injectIndicator() {
    if (document.getElementById('vpc-sync-indicator')) return;
    const el = document.createElement('div');
    el.id = 'vpc-sync-indicator';
    el.title = 'Cloud sync status — click to sync now';
    el.style.cssText = `
      display:inline-flex;align-items:center;cursor:pointer;
      padding:4px 10px;border-radius:99px;
      border:1px solid #2e3350;background:#1a1d27;
      transition:border-color 0.15s;user-select:none;
    `;
    el.addEventListener('click', () => VpcSync.sync());
    el.addEventListener('mouseenter', () => el.style.borderColor = '#6c8cff');
    el.addEventListener('mouseleave', () => el.style.borderColor = '#2e3350');

    // Try to append to header — fall back to top-right fixed
    const header = document.querySelector('header');
    if (header) {
      // Insert before the last child (usually the home-link or date)
      const ref = header.lastElementChild;
      if (ref) header.insertBefore(el, ref);
      else header.appendChild(el);
    } else {
      el.style.cssText += 'position:fixed;top:12px;right:16px;z-index:9999;';
      document.body.appendChild(el);
    }

    this._updateIndicator('idle');
  },
};

// ── Auto-init on DOMContentLoaded ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  VpcSync.injectIndicator();

  // Pull latest cloud data on every page load
  await VpcSync.sync();

  // Flush queue when coming back online
  window.addEventListener('online',  () => VpcSync.flushQueue());
  window.addEventListener('offline', () => VpcSync._emit('offline', 'No connection'));
});

// ── Intercept localStorage writes ─────────────────────────────────────────────
// Monkey-patch localStorage.setItem so every write auto-pushes to Supabase.
// Only patches keys in SYNC_KEYS to avoid noise.

(function() {
  const _setItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(key, value) {
    _setItem(key, value);
    if (SYNC_KEYS.includes(key)) {
      // Debounce: don't flood Supabase on rapid writes (e.g. typing in a form)
      clearTimeout(localStorage._syncTimers?.[key]);
      if (!localStorage._syncTimers) localStorage._syncTimers = {};
      localStorage._syncTimers[key] = setTimeout(() => VpcSync.push(key), 800);
    }
  };
})();

// Expose globally
window.VpcSync = VpcSync;
