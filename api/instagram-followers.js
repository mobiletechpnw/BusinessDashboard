// Vercel serverless function — Instagram follower count proxy.
//
// Why this exists: the dashboard is a static PWA, so it cannot safely hold an
// Instagram/Meta access token (any token shipped to the browser is public).
// This function runs server-side on Vercel, keeps the token in an env var, calls
// the Instagram Graph API, and returns ONLY the public-facing numbers as JSON.
//
// The Growth page (growth.html → "Fetch now") calls this endpoint and logs the
// result as a snapshot. Setup walkthrough: docs/INSTAGRAM_SETUP.md
//
// Required environment variables (set in Vercel → Project → Settings → Env Vars):
//   IG_ACCESS_TOKEN   Long-lived access token with instagram_manage_insights
//   IG_USER_ID        The Instagram Business/Creator account's numeric id
// Optional:
//   SYNC_SECRET       If set, callers must pass ?key=<SYNC_SECRET> (stops abuse
//                     of the endpoint as an open proxy)
//   ALLOW_ORIGIN      CORS origin to allow (defaults to "*")

const GRAPH_VERSION = 'v21.0';

module.exports = async function handler(req, res) {
  const allowOrigin = process.env.ALLOW_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Optional shared-secret gate
  if (process.env.SYNC_SECRET) {
    const key = (req.query && req.query.key) || '';
    if (key !== process.env.SYNC_SECRET) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  const token = process.env.IG_ACCESS_TOKEN;
  const userId = process.env.IG_USER_ID;
  if (!token || !userId) {
    res.status(500).json({
      error: 'Endpoint not configured',
      detail: 'Set IG_ACCESS_TOKEN and IG_USER_ID environment variables in Vercel.',
    });
    return;
  }

  const fields = 'followers_count,follows_count,media_count,username';
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(userId)}?fields=${fields}&access_token=${encodeURIComponent(token)}`;

  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    const body = await r.json();

    if (!r.ok || body.error) {
      // Surface Meta's message but never echo the token.
      res.status(502).json({
        error: 'Instagram Graph API error',
        detail: body.error ? body.error.message : `HTTP ${r.status}`,
      });
      return;
    }

    // Cache at the edge for 30 min so we don't hammer the Graph API.
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    res.status(200).json({
      followers: body.followers_count ?? null,
      following: body.follows_count ?? null,
      posts: body.media_count ?? null,
      username: body.username ?? null,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(502).json({ error: 'Fetch failed', detail: String(err && err.message ? err.message : err) });
  }
};
