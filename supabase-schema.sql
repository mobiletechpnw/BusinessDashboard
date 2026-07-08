-- ══════════════════════════════════════════════════════════════════
--  Vault & Pine Collective — Business Dashboard
--  Supabase Schema  (idempotent — safe to run multiple times)
--  Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- ══════════════════════════════════════════════════════════════════

-- ── app_data: universal key-value store ──────────────────────────
-- One row per (user_id, key). Stores all dashboard data as JSON blobs.
-- The app syncs every localStorage key in SYNC_KEYS to this table.

CREATE TABLE IF NOT EXISTS public.app_data (
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key        TEXT        NOT NULL,
  value      JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, key)
);

-- ── Row Level Security ────────────────────────────────────────────
ALTER TABLE public.app_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first so this script is safe to re-run
DROP POLICY IF EXISTS "users_select_own" ON public.app_data;
DROP POLICY IF EXISTS "users_insert_own" ON public.app_data;
DROP POLICY IF EXISTS "users_update_own" ON public.app_data;
DROP POLICY IF EXISTS "users_delete_own" ON public.app_data;
-- Legacy policy names (in case an older run used different names)
DROP POLICY IF EXISTS "own_data" ON public.app_data;

-- Each user can only read, write, and delete their own rows.
CREATE POLICY "users_select_own"
  ON public.app_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own"
  ON public.app_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own"
  ON public.app_data FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own"
  ON public.app_data FOR DELETE
  USING  (auth.uid() = user_id);

-- ── Index for faster key lookups ──────────────────────────────────
CREATE INDEX IF NOT EXISTS app_data_user_key_idx ON public.app_data (user_id, key);

-- ── Grant API access ──────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_data TO authenticated;
GRANT SELECT ON public.app_data TO anon;  -- anon is blocked by RLS anyway


-- ══════════════════════════════════════════════════════════════════
--  MIGRATION — run this ONLY if you already have an older app_data
--  table that was created WITHOUT the user_id column.
-- ══════════════════════════════════════════════════════════════════
--
-- Step 1: Add the column (nullable so existing rows don't break)
--   ALTER TABLE public.app_data
--     ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
--
-- Step 2: Remove rows that have no user_id (they can't be assigned to anyone)
--   DELETE FROM public.app_data WHERE user_id IS NULL;
--
-- Step 3: Drop the old single-column PK and add the composite PK
--   ALTER TABLE public.app_data DROP CONSTRAINT IF EXISTS app_data_pkey;
--   ALTER TABLE public.app_data ADD PRIMARY KEY (user_id, key);
--
-- Step 4: Make user_id NOT NULL now that nulls are gone
--   ALTER TABLE public.app_data ALTER COLUMN user_id SET NOT NULL;
--
-- ══════════════════════════════════════════════════════════════════
--  Keys stored in app_data (all stored under the authenticated user)
-- ══════════════════════════════════════════════════════════════════
--
--  SALES & ORDERS
--    vp_orders_v2                 — all order records
--
--  GOALS
--    goals_dashboard_v1           — goals with objectives, priorities, drag order
--    vp_goals_v1                  — legacy goals key (kept for backwards compat)
--
--  EXPENSES
--    vpc_personal_expenses_v1     — personal/business expense transactions
--    vpc_recurring_expenses_v1    — recurring expense templates (with frequency)
--    vpc_expense_budget_v1        — monthly budget config per category
--    vp_expenses_v1               — legacy expense key (still read by analytics)
--
--  EVENTS & TABLES
--    vpc_events_v1                — events (shows, markets, fairs)
--    vpc_vendors_v1               — vendor profiles per event
--    vpc_tables_v1                — table booking & payment records
--    vp_events_v1                 — legacy events key
--
--  PRODUCTS — JET TAGS
--    vp_jettags_v1                — JetTag product sales records
--    vp_jettags_restock_v1        — JetTag restock/inventory entries
--
--  PRODUCTS — PINS
--    vp_pins_v1                   — Pin product sales records
--    vp_pins_restock_v1           — Pin restock/inventory entries
--
--  CONTENT PLANNER
--    vpc_content_v1               — content calendar & queue entries
--
--  PRODUCTION / 3-D PRINTING
--    vpc_print_queue_v1           — print job queue
--    vpc_inventory_v1             — on-hand stock levels per product
--    vpc_printer_credits_v1       — printer credit balance
--    riser_monthly_goal_v1        — monthly revenue goal
--    riser_filament_v1            — filament inventory
--    vpc_costs_v1                 — cost config (material/labour per product)
--
--  AUDIT LOG
--    vpc_audit_log                — user action history (max 300 entries)
--
--  USER PREFERENCES (sync across devices)
--    vpc_theme                    — 'dark' | 'light'
--    vpc_pin_hash                 — SHA-256 of PIN (prefixed with vpc_salt_)
--    jarvis_webhook               — JARVIS n8n/webhook URL
--    jarvis_vad                   — voice activity detection threshold (0–100)
--
--  DELIVERIES
--    vpc_pipeline_v1              — upcoming delivery pipeline entries
--
-- ══════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════
--  public_calendar: the read-only snapshot the shared vendor calendar
--  (vendor-calendar.html) reads. events.html publishes to it on edit.
--  One row, id = 'vault-pine'. Public can READ; only the signed-in
--  owner can WRITE. If publishing silently fails, it's almost always
--  because these write policies are missing — re-run this block.
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.public_calendar (
  id         TEXT        PRIMARY KEY,
  data       JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.public_calendar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_calendar_read"   ON public.public_calendar;
DROP POLICY IF EXISTS "public_calendar_insert" ON public.public_calendar;
DROP POLICY IF EXISTS "public_calendar_update" ON public.public_calendar;

-- Anyone (no login) can read the shared calendar snapshot.
CREATE POLICY "public_calendar_read"
  ON public.public_calendar FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only signed-in users (the owner) can create/replace the snapshot.
CREATE POLICY "public_calendar_insert"
  ON public.public_calendar FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "public_calendar_update"
  ON public.public_calendar FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

GRANT SELECT ON public.public_calendar TO anon;
GRANT SELECT, INSERT, UPDATE ON public.public_calendar TO authenticated;


-- ══════════════════════════════════════════════════════════════════
--  event_signups: vendor table-request sign-ups submitted from the
--  public event-signup.html page. Anyone with a sign-up link can
--  INSERT a request; only the signed-in owner can read / manage them.
--  (Anon cannot SELECT, so vendors can never see each other's entries.)
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.event_signups (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cal_id     TEXT        NOT NULL DEFAULT 'vault-pine',
  event_id   TEXT        NOT NULL,
  event_name TEXT,
  name       TEXT        NOT NULL,
  table_pref TEXT,
  contact    TEXT,
  notes      TEXT,
  status     TEXT        NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.event_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_signups_insert" ON public.event_signups;
DROP POLICY IF EXISTS "event_signups_select" ON public.event_signups;
DROP POLICY IF EXISTS "event_signups_update" ON public.event_signups;
DROP POLICY IF EXISTS "event_signups_delete" ON public.event_signups;

-- Anyone with a sign-up link can submit a request.
CREATE POLICY "event_signups_insert"
  ON public.event_signups FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only the signed-in owner can read / manage submitted requests.
CREATE POLICY "event_signups_select"
  ON public.event_signups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "event_signups_update"
  ON public.event_signups FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "event_signups_delete"
  ON public.event_signups FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS event_signups_cal_event_idx
  ON public.event_signups (cal_id, event_id, status);

GRANT INSERT ON public.event_signups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_signups TO authenticated;
-- ══════════════════════════════════════════════════════════════════
