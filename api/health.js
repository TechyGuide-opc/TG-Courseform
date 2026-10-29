// GET /api/health  - tells you why bookings might not be saving. Never stores anything and never returns secrets.
// It checks: env vars, which kind of Supabase key is configured, whether the `leads` table is readable,
// whether the newer columns exist, and whether the key is allowed to write (using an intentionally empty
// insert that Postgres rejects, so no row is ever created).

function keyKind(key) {
  if (/^sb_secret_/.test(key)) return 'secret';
  if (/^sb_publishable_/.test(key)) return 'publishable';
  try {
    const role = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString('utf8')).role;
    if (role === 'service_role') return 'service_role';
    if (role === 'anon') return 'anon';
  } catch { /* not a JWT */ }
  return 'unknown';
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const out = { env: { SUPABASE_URL: !!url, SUPABASE_SERVICE_ROLE_KEY: !!key, ADMIN_PASSWORD: !!process.env.ADMIN_PASSWORD }, diagnosis: [] };

  if (!url || !key) {
    out.diagnosis.push('Missing environment variables: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel (Settings -> Environment Variables), then redeploy.');
    return res.status(200).json(out);
  }

  out.keyType = keyKind(key);
  if (out.keyType === 'publishable' || out.keyType === 'anon') {
    out.diagnosis.push('SUPABASE_SERVICE_ROLE_KEY holds a PUBLIC key (' + out.keyType + '). Replace it with the secret key (Supabase -> Project Settings -> API Keys -> "Secret key" / service_role), then redeploy.');
  }

  const base = `${url.replace(/\/$/, '')}/rest/v1/leads`;
  const H = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const probe = async (path, opts) => {
    try {
      const r = await fetch(base + path, { headers: H, ...opts });
      let b = null; try { b = await r.json(); } catch { /* empty body */ }
      return { status: r.status, code: (b && b.code) || null };
    } catch { return { status: 0, code: 'NETWORK' }; }
  };

  out.tableReadable = await probe('?select=id&limit=1');
  out.hasLaptopColumn = await probe('?select=has_laptop&limit=1');
  out.writeCheck = await probe('', { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: '{}' });

  if (out.tableReadable.status === 0) out.diagnosis.push('Cannot reach Supabase: check that SUPABASE_URL is correct (https://<project-ref>.supabase.co) and the project is not paused.');
  else if (out.tableReadable.status === 404 || out.tableReadable.code === 'PGRST205') out.diagnosis.push('The `leads` table does not exist. Run supabase/schema.sql in the Supabase SQL editor.');
  else if (out.hasLaptopColumn.code === '42703' || out.hasLaptopColumn.code === 'PGRST204') out.diagnosis.push('The `leads` table is from an older version (missing columns). Run supabase/schema.sql in the Supabase SQL editor (it also upgrades older tables).');
  if (out.writeCheck.code === '42501') out.diagnosis.push('The key is not allowed to write to `leads` (row-level security). Use the secret / service_role key.');

  out.ok = out.diagnosis.length === 0;
  if (out.ok) out.diagnosis.push('Everything looks good: bookings should save. If a booking still fails, open the Vercel logs for /api/lead.');
  return res.status(200).json(out);
};
