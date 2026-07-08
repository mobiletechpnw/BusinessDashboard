# Instagram → Dashboard: Follower Auto-Sync Setup

The **Growth** page (`growth.html`) tracks your Instagram follower count over time.
It works two ways:

1. **Manual (default, works today)** — tap **Log Snapshot**, type your current
   follower count. Charts, growth pace, and goal ETA update instantly. No setup.
2. **Automated (this guide)** — a small serverless function pulls your follower
   count from the Instagram Graph API so you can log a snapshot with one tap
   ("Fetch now"), or on a schedule.

This document covers turning on **#2**.

> **Why a serverless function and not just the browser?**
> This dashboard is a static site. Any access token shipped to the browser is
> public. The token must live server-side. `api/instagram-followers.js` (already
> in this repo) holds the token as a Vercel environment variable and returns
> only the numbers.

---

## What you need (prerequisites)

| # | Requirement | Your status |
|---|-------------|-------------|
| 1 | Instagram **Business or Creator** account | ✅ You have this |
| 2 | Account **linked to a Facebook Page** | ⚠️ **This is your current gap — do Step 1 below** |
| 3 | A Meta Developer app | Step 2 |
| 4 | A long-lived access token | Step 3 |
| 5 | Deploy the function to Vercel | Step 4 |
| 6 | Paste the URL into the Growth page | Step 5 |

The Graph API **only** returns `followers_count` for a Business/Creator account
that is connected to a Facebook Page. That link is the piece you're missing, so
start there.

---

## Step 1 — Link your Instagram account to a Facebook Page

You don't need to post on Facebook; the Page just authorizes the API.

1. Create a Facebook Page (if you don't have one): <https://www.facebook.com/pages/create> — a simple "Business" Page is fine.
2. In the **Instagram app**: **Settings and privacy → Accounts Center → Connected experiences → Add accounts** (or, older layout: **Settings → Account → Sharing to other apps → Facebook**), and connect the Facebook Page.
   - Alternatively, from the Facebook Page: **Settings → Linked accounts → Instagram → Connect account**.
3. Confirm your IG account type is **Business** or **Creator**:
   Instagram → **Settings → Account type and tools → Switch to professional account**.

When done, your IG account and the Page are linked. ✅

---

## Step 2 — Create a Meta Developer app

1. Go to <https://developers.facebook.com/apps> and log in with the Facebook
   account that manages the Page.
2. **Create App → Business** type. Name it e.g. `VPC Growth Sync`.
3. In the app dashboard, add the **Instagram Graph API** product
   (older UIs: add **Facebook Login** + use the **Graph API Explorer**).

---

## Step 3 — Get a long-lived access token and your IG user id

Easiest path is the **Graph API Explorer**:

1. Open <https://developers.facebook.com/tools/explorer>.
2. Select your app (top right).
3. Add these permissions, then **Generate Access Token** and approve:
   - `instagram_basic`
   - `instagram_manage_insights`
   - `pages_show_list`
   - `pages_read_engagement`
4. Find your **Instagram user id**. In the Explorer, run:
   ```
   GET  /me/accounts
   ```
   Copy the Page `id`, then run:
   ```
   GET  /{page-id}?fields=instagram_business_account
   ```
   The `instagram_business_account.id` value is your **`IG_USER_ID`**.
5. **Exchange for a long-lived token** (short-lived tokens expire in ~1 hour;
   long-lived ones last ~60 days). Replace the placeholders and open in a browser:
   ```
   https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_LIVED_TOKEN
   ```
   The `access_token` in the response is your **`IG_ACCESS_TOKEN`**.

**Sanity check** — this should return your follower count:
```
https://graph.facebook.com/v21.0/IG_USER_ID?fields=followers_count,follows_count,media_count&access_token=IG_ACCESS_TOKEN
```

> **Token expiry:** long-lived tokens last ~60 days. Set a reminder to refresh,
> or add a scheduled Vercel Cron job that re-exchanges the token. If auto-sync
> ever stops, the token has almost certainly expired — regenerate it (Step 3.5)
> and update the Vercel env var.

---

## Step 4 — Deploy the function to Vercel

The function already exists at `api/instagram-followers.js`. This repo deploys as
a static site with one serverless function.

1. Import/connect this repo in Vercel (or use the Vercel MCP / CLI).
2. **Project → Settings → Environment Variables**, add:

   | Name | Value |
   |------|-------|
   | `IG_ACCESS_TOKEN` | your long-lived token |
   | `IG_USER_ID` | your Instagram business account id |
   | `SYNC_SECRET` | *(optional)* any random string — locks the endpoint |
   | `ALLOW_ORIGIN` | *(optional)* your dashboard's URL, e.g. `https://your-app.vercel.app` |

3. Deploy. Your endpoint is now:
   ```
   https://YOUR-APP.vercel.app/api/instagram-followers
   ```
   (If you set `SYNC_SECRET`, append `?key=YOUR_SECRET`.)

Visit that URL — you should see:
```json
{ "followers": 340, "following": 210, "posts": 45, "username": "vaultpine", "fetchedAt": "..." }
```

---

## Step 5 — Connect it to the dashboard

1. Open the **Growth** page in the dashboard.
2. In the **Auto-Sync** panel, click **Configure endpoint**.
3. Paste your endpoint URL (with `?key=...` if you set a secret) and **Save**.
4. The status flips to **Endpoint connected** and a **↻ Fetch now** button appears.
   Tap it to pull the latest count and log today's snapshot.

That's it. Manual logging still works anytime; auto-sync just saves you the typing.

---

## Optional — fully hands-off (scheduled) sync

To log a snapshot automatically (e.g. daily) instead of tapping "Fetch now",
add a [Vercel Cron Job](https://vercel.com/docs/cron-jobs) that hits the endpoint,
and have it write to Supabase (`app_data`, key `vpc_growth_v1`) using the same
shape the dashboard uses. This is a later enhancement — the manual + one-tap
flow above is enough to keep a clean daily/weekly trend.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| `Endpoint not configured` | `IG_ACCESS_TOKEN` / `IG_USER_ID` env vars not set in Vercel |
| `Instagram Graph API error: ... token` | Token expired (~60 days) — regenerate in Step 3 |
| `followers_count` missing / permission error | IG account not linked to a Facebook Page, or not Business/Creator (Step 1) |
| `Unauthorized` | You set `SYNC_SECRET` but the URL is missing `?key=...` |
| Browser blocks the request (CORS) | Set `ALLOW_ORIGIN` to your dashboard's exact URL |
