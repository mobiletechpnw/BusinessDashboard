-- ══════════════════════════════════════════════════════════════════
--  MIGRATION: Owner lock for shared tables        (safe to re-run)
--
--  Run this once in the Supabase SQL Editor
--  (Dashboard → SQL Editor → New query → paste → Run).
--
--  WHY: login.html offers public account sign-up, and the old policies
--  on public_calendar / event_signups trusted ANY authenticated user.
--  A stranger who created an account could read vendor sign-ups
--  (names, emails, phones), delete them, or overwrite the public
--  vendor calendar. This migration restricts those actions to the
--  accounts listed in app_owners.
--
--  AFTER RUNNING, also flip the dashboard setting so strangers can't
--  create accounts at all:
--    Authentication → Sign In / Providers → Email →
--    disable "Allow new users to sign up"
--  (The policies below protect you even if you skip this, but there's
--  no reason to leave account creation open on a single-user app.)
--
--  This is the same SQL now embedded in supabase-schema.sql — running
--  either file gets you to the same end state.
-- ══════════════════════════════════════════════════════════════════

-- 1) Owner registry. Clients can never read or write it (RLS on, no
--    policies); the SECURITY DEFINER helper below is the only path in.
CREATE TABLE IF NOT EXISTS public.app_owners (
  uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.app_owners ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_owners WHERE uid = auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.is_owner() TO anon, authenticated;

-- 2) Seed with the owner's account. Matches by sign-in email — adjust
--    if your Supabase account uses a different address.
INSERT INTO public.app_owners (uid)
SELECT id FROM auth.users WHERE email = 'mobiletechpnw@gmail.com'
ON CONFLICT (uid) DO NOTHING;

-- Sanity check: this should return 1 row. If it returns 0 rows, the
-- email above didn't match any auth user — fix the email and re-run
-- BEFORE moving on, or step 3 will lock YOU out of publishing/sign-ups.
SELECT uid FROM public.app_owners;

-- 3) Tighten the shared-table policies.
DROP POLICY IF EXISTS "public_calendar_insert" ON public.public_calendar;
DROP POLICY IF EXISTS "public_calendar_update" ON public.public_calendar;

CREATE POLICY "public_calendar_insert"
  ON public.public_calendar FOR INSERT
  TO authenticated
  WITH CHECK (public.is_owner());

CREATE POLICY "public_calendar_update"
  ON public.public_calendar FOR UPDATE
  TO authenticated
  USING (public.is_owner()) WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "event_signups_select" ON public.event_signups;
DROP POLICY IF EXISTS "event_signups_update" ON public.event_signups;
DROP POLICY IF EXISTS "event_signups_delete" ON public.event_signups;

CREATE POLICY "event_signups_select"
  ON public.event_signups FOR SELECT
  TO authenticated
  USING (public.is_owner());

CREATE POLICY "event_signups_update"
  ON public.event_signups FOR UPDATE
  TO authenticated
  USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE POLICY "event_signups_delete"
  ON public.event_signups FOR DELETE
  TO authenticated
  USING (public.is_owner());

-- Unchanged on purpose:
--   • anon INSERT on event_signups  (vendors submit via the public link)
--   • anon/authenticated SELECT on public_calendar  (public read-only calendar)
--   • app_data policies  (already correctly scoped to auth.uid())
