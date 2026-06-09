-- ══════════════════════════════════════════════════════════════════
--  Vault & Pine Collective — Business Dashboard
--  Supabase Schema
--  Run this in the Supabase SQL Editor to create or recreate tables.
-- ══════════════════════════════════════════════════════════════════

-- ── app_data: universal key-value store ──────────────────────────
-- One row per (user_id, key). Stores all dashboard data as JSON blobs.
-- The app syncs every localStorage key listed in SYNC_KEYS to this table.

CREATE TABLE IF NOT EXISTS public.app_data (
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key        TEXT        NOT NULL,
  value      JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, key)
);

-- ── Row Level Security ────────────────────────────────────────────
ALTER TABLE public.app_data ENABLE ROW LEVEL SECURITY;

-- Each user can only read, write, and delete their own rows.
CREATE POLICY "users_select_own"
  ON public.app_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own"
  ON public.app_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own"
  ON public.app_data FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own"
  ON public.app_data FOR DELETE
  USING (auth.uid() = user_id);

-- ── Index for faster key lookups ──────────────────────────────────
CREATE INDEX IF NOT EXISTS app_data_user_key_idx ON public.app_data (user_id, key);

-- ── Grant API access ──────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_data TO authenticated;
GRANT SELECT ON public.app_data TO anon;  -- anon gets blocked by RLS anyway


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
-- ══════════════════════════════════════════════════════════════════
