// Vercel serverless function: POST /api/lead
// Validates the booking form and inserts it into Supabase using the service-role key
// (the key never reaches the browser; the `leads` table has RLS on and no public policies).

const GRADES = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const COURSES = [
  'Robo Champ Course', 'Python Programming', 'Scratch Programming', 'Web Development', 'App Development',
  'Game Development', 'Artificial Intelligence', 'Internet of Things (IoT)', 'Electronics', 'Other / Not sure yet',
  // older form values, kept so cached pages still work
  'Coding', 'Maths', 'AI & Robotics', 'Not sure yet',
];
const SLOTS = ['Weekday evening','Weekend morning','Weekend evening'];

const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let b = req.body;
  if (typeof b === 'string') {
    try { b = JSON.parse(b); } catch { b = {}; }
  }
  b = b || {};

  // Honeypot: bots fill the hidden field, humans don't. Pretend success.
  if (b.website) return res.status(200).json({ ok: true });

  const row = {
    child_name: clean(b.child_name, 80),
    child_grade: clean(b.child_grade, 4),
    phone: clean(b.phone, 20).replace(/[^\d+]/g, ''),
    email: clean(b.email, 120).toLowerCase(),
    course_interest: clean(b.course_interest, 40),
    preferred_slot: clean(b.preferred_slot, 40),
    has_laptop: b.has_laptop === true,
    consent: b.consent === true,
    utm: typeof b.utm === 'object' && b.utm ? JSON.parse(JSON.stringify(b.utm, (k, v) => (typeof v === 'string' ? v.slice(0, 200) : v))) : {},
    source_url: clean(b.source_url, 300),
    user_agent: clean(req.headers['user-agent'], 300),
  };

  const errors = {};
  if (row.child_name.length < 2) errors.child_name = "Enter the child's name";
  if (!GRADES.includes(row.child_grade)) errors.child_grade = 'Select a grade';
  if (row.phone.replace(/\D/g, '').length < 8 || row.phone.replace(/\D/g, '').length > 15) errors.phone = 'Enter a valid phone number';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.email)) errors.email = 'Enter a valid email';
  if (!COURSES.includes(row.course_interest)) errors.course_interest = 'Select a course';
  if (!SLOTS.includes(row.preferred_slot)) errors.preferred_slot = 'Select a time slot';
  if (!row.consent) errors.consent = 'Consent is required';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields', errors });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Server is not configured yet' });

  try {
    const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!r.ok) {
      let info = {};
      try { info = JSON.parse(await r.text()); } catch { /* not JSON */ }
      console.error('Supabase insert failed', r.status, info);
      // `code` is a short Postgres/PostgREST error code (e.g. 42501 = permission, PGRST205 = table missing); open /api/health for a plain-English diagnosis
      return res.status(502).json({ error: 'Could not save your booking. Please try again.', code: info.code || String(r.status) });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: 'Could not reach the database. Please try again.' });
  }
};
