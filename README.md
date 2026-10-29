# TechyGuide – Book a Free Trial (Vercel + Supabase)

Single-page site: BrightChamps-style trial-class landing page (3-step mandatory form), courses, FAQ and a Math Jet mini-game.

```
index.html          the whole front-end (plain HTML/CSS/JS, no build step)
api/lead.js         Vercel serverless function -> inserts into Supabase
supabase/schema.sql run once in Supabase SQL editor
```

## Setup

1. **Supabase**: create a project -> SQL Editor -> paste and run `supabase/schema.sql`.
   Then Project Settings -> API: copy the **Project URL** and the **service_role** key.
2. **Vercel**: push this folder to GitHub (or run `vercel` in it) and import it.
   Add environment variables (Settings -> Environment Variables):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`  (secret; never put it in index.html)
3. Deploy. Leads appear in Supabase -> Table Editor -> `leads` (UTM / fbclid from your Meta ad links are stored in `utm`).

Local test: `npx vercel dev` (needs the two env vars in `.env`). Opening index.html directly shows the page, but the form needs `/api/lead`.

## Admin dashboard (see all bookings)
Open **/admin.html** on your deployed site. It is protected by a password you choose.
1. In Vercel add one more environment variable: `ADMIN_PASSWORD` (pick a long password).
2. `SUPABASE_SERVICE_ROLE_KEY` must be the **secret** key (Supabase -> Project Settings -> API: the `service_role` / `sb_secret_...` key), **not** the publishable / anon key.
3. Redeploy, open `/admin.html`, sign in. You can search, filter by status / course / date, call or WhatsApp a parent, change a booking's status, export CSV, and delete.
Preview with sample data (no login): `/admin.html?demo=1`.

## Keep Supabase awake (free plan pauses after 7 days of inactivity)
`vercel.json` schedules a daily cron (03:00 UTC) that calls `/api/keepalive`, which sends one tiny read to Supabase. Nothing to do after deploying, except:
- Optional: add a `CRON_SECRET` environment variable in Vercel (any long random string). Vercel then sends it automatically and the endpoint rejects other callers.
- Check it ran: Vercel dashboard -> your project -> Settings -> Cron Jobs. You can also open `/api/keepalive` yourself (it returns `{"ok":true,...}`).
- If your project is already paused, click **Restore project** in the Supabase dashboard once; the cron keeps it awake from then on.
- Free-plan Vercel allows one cron run per day, which is plenty for a 7-day limit.

## Troubleshooting: "Could not save your booking"
1. Open **`/api/health`** on your site. It tells you in plain English what is wrong (missing env var, wrong key type, missing table or columns) and never saves anything.
2. Most common causes:
   - `SUPABASE_SERVICE_ROLE_KEY` is the *publishable* key (`sb_publishable_...`). It must be the **secret** key (`sb_secret_...` or `service_role`).
   - The `leads` table was created from an older `schema.sql`. Run `supabase/schema.sql` again in the Supabase SQL editor (it upgrades older tables safely).
   - Quick alternative if you cannot get the secret key right now: in `supabase/schema.sql`, switch on the optional step 5 (remove the leading `--` from its two lines) and run the file again. The form will then save with the publishable key (insert-only). The admin page still needs the secret key.
3. After changing Vercel environment variables, **redeploy** (they only apply to new deployments).

## Notes
- Course cards, FAQ answers and grade list (1-12) are generic placeholders – edit them in `index.html` to match what TechyGuide really offers.
- If you already ran an older schema.sql, just run the current `supabase/schema.sql` again; it upgrades the table safely.
- Edit the form options (courses, slots, grades) in both `index.html` and `api/lead.js` (the API whitelists them).
