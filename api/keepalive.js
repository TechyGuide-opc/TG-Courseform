// Vercel cron target: GET /api/keepalive
// Sends one tiny read to Supabase so a free-plan project never hits the 7-day inactivity pause.
// Scheduled daily from vercel.json. If CRON_SECRET is set in Vercel, Vercel sends it automatically
// as "Authorization: Bearer <secret>" and this endpoint rejects anything else.

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set' });

  try {
    const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/leads?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, at: new Date().toISOString() });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'Could not reach Supabase' });
  }
};
