// Vercel serverless function: /api/admin  (password protected)
//   GET                      -> list all bookings
//   PATCH  {id, status}      -> update a booking's status
//   DELETE {id} or ?id=...   -> delete a booking
// Auth: send the admin password in the `x-admin-password` header.
// Env: ADMIN_PASSWORD, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (the secret service_role key).

const crypto = require('crypto');

const STATUSES = ['new', 'contacted', 'trial_booked', 'enrolled', 'not_interested'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const pw = process.env.ADMIN_PASSWORD;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!pw || !url || !key) {
    return res.status(500).json({ error: 'Admin is not configured. Set ADMIN_PASSWORD, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.' });
  }

  const given = req.headers['x-admin-password'] || '';
  if (!crypto.timingSafeEqual(sha(given), sha(pw))) {
    await new Promise((r) => setTimeout(r, 700)); // slow down password guessing
    return res.status(401).json({ error: 'Wrong password' });
  }

  const base = `${url.replace(/\/$/, '')}/rest/v1/leads`;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  try {
    if (req.method === 'GET') {
      const r = await fetch(`${base}?select=*&order=created_at.desc&limit=5000`, { headers });
      if (!r.ok) return res.status(502).json({ error: 'Database error', detail: (await r.text()).slice(0, 200) });
      return res.status(200).json({ leads: await r.json() });
    }

    if (req.method === 'PATCH') {
      const { id, status } = body;
      if (!UUID.test(String(id)) || !STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid id or status' });
      const r = await fetch(`${base}?id=eq.${id}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify({ status }) });
      if (!r.ok) return res.status(502).json({ error: 'Could not update the booking' });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const id = (req.query && req.query.id) || body.id;
      if (!UUID.test(String(id))) return res.status(400).json({ error: 'Invalid id' });
      const r = await fetch(`${base}?id=eq.${id}`, { method: 'DELETE', headers: { ...headers, Prefer: 'return=minimal' } });
      if (!r.ok) return res.status(502).json({ error: 'Could not delete the booking' });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: 'Could not reach the database' });
  }
};
