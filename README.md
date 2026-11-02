# Hisaab

A fast, ad-free digital khata (credit ledger) as a mobile-first PWA. Built from `Hisaab-MVP-PRD.md` (v1) and `Hisaab-PRD-v2-Kirana.md` (v2, P0 done).

Stack: React + Vite + TypeScript, Tailwind, Supabase (Postgres, auth, row-level security), jsPDF, vite-plugin-pwa.

## Run locally

```bash
npm install
npm run dev
```

With no env vars the app runs in **demo mode**: accounts and data live in this browser's localStorage only. Good for trying it out; not for real users.

## Connect Supabase (cloud storage, F1/F8)

1. Create a project at supabase.com.
2. Run `supabase/schema.sql` in the SQL editor. It creates the tables and the row-level security policies. It is safe to re-run: after pulling v2, run it again to add the new columns (`alias`, `pinned`, `source`) and the `events` table.
3. Auth settings: enable Email provider. For instant sign-up turn off "Confirm email".
4. Copy `.env.example` to `.env` and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the anon key is safe in the frontend because RLS protects the data).
5. `npm run dev`.

### Password reset and Google sign-in (F27)

- **URL configuration** (Authentication → URL Configuration): set Site URL to your deployed link, and add `http://localhost:5173/**` and `https://<your-domain>/**` under Redirect URLs. Reset emails and Google sign-in return to these.
- **Password reset** works once the URLs are set: "Forgot password?" on the log-in screen sends a link; it opens the app on "Set a new password".
- **Google**: create an OAuth client (Web application) in Google Cloud Console, with the authorised redirect URI shown in Supabase under Authentication → Sign In / Providers → Google. Paste the client ID and secret there and enable the provider. Until then the "Continue with Google" button returns an error.

### Usage metrics (F22)

Events go to the `events` table (user id, event name, small props; never names, phones or amounts). Read them in the SQL editor, for example:

```sql
-- Median seconds to record an entry, by where it was recorded
select props->>'source' as source, count(*),
       percentile_cont(0.5) within group (order by (props->>'ms')::numeric) / 1000 as median_seconds
from events where name = 'entry_saved' and props ? 'ms'
group by 1;

-- Owners still recording on day 5 after sign-up
select s.user_id from events s join events e on e.user_id = s.user_id
where s.name = 'signup' and e.name = 'entry_saved'
  and e.created_at::date = (s.created_at + interval '4 days')::date
group by s.user_id;
```

## Deploy

Vercel or Netlify: build command `npm run build`, output `dist`, add the two env vars. HTTPS is provided.

## What is built

| PRD | Status |
| --- | --- |
| F1 sign up / log in (email + password) | Done |
| F2 customers: add, edit, delete (soft), search, sort by amount / oldest due | Done |
| F3 You Gave / You Got with note and date, keypad, live new balance | Done |
| F4 ledger with running balance | Done |
| F5 edit / delete entry with confirm | Done |
| F6 totals header | Done |
| F7 WhatsApp reminder (`wa.me`) with tone chips | Done |
| F8 cloud storage | Done (Supabase) |
| F9 UPI link in reminder (plus UPI ID as text for iPhone) | Done |
| F10 PDF statement for a date range | Done |
| F11 dashboard (collected this week, top 5 overdue) | Done, on Home |
| F12 due dates, overdue flags, bulk reminder ("Remind all": one Send button per customer, since browsers block opening many chats at once) | Done |
| F13 suppliers tab | Done |
| F14 PWA install | Done (manifest, service worker, icons) |
| F15 onboarding | Done: 3-step first-run guide after sign-up, optional sample customer ("Sharma ji (sample)") to practise on, plus the empty-state guide |
| Landing page (design canvas) | Done: shown to logged-out visitors; "Start free" opens sign-up, "Log in" opens log-in. Installed (home-screen) users skip it and go straight to log-in |
| F16 Hindi / English toggle (Settings and login screen; choice saved per browser, defaults to Hindi on Hindi-language phones) | Done |
| F17 quick text entry ("sharma 420 atta", add "got" for payments) | Done |

### v2: Kirana PRD, P0 (before the pilot)

| PRD | Status |
| --- | --- |
| F21 opening balance | Done: "They owe me ₹ / I owe them ₹" on Add customer/supplier; saved as an ordinary dated entry shown as "Opening balance" |
| F22 event logging | Done: `signup`, `app_open`, `entry_saved` (source ledger / quick / repeat / settle, plus `ms` taken to record it), `reminder_sent` (tone, language, bulk). Sample-customer entries are not logged |
| F23 recent-first Home + pins | Done: default sort "Recent" (last entry or edit); pin up to 5 per tab from the ledger header; Amount and Oldest due kept |
| F24 aliases and fuzzy search | Done: alias field; search and quick entry match name, alias, last digits of phone, and sound-alike spellings (sharma/sharama, verma/varma, pooja/puja) |
| F25 faster entry | Done: "Same as last time ₹X" (1 tap), "Got full ₹X" in the You Got sheet (2 taps), quick entry offers pick-chips or "Add and record", quick bar on the Suppliers tab too |
| F26 save queue | Done: offline saves go to a per-user outbox, show "Saved on this phone, will sync", sync in order when online; data cached so the app opens offline; a change the server rejects is kept with its error until retried or discarded |
| F27 password reset + Google | Done in code; needs the Supabase setup above |
| F28 launch language | English, Hindi and Marathi across every screen; both reminder tones (Polite, Festival) in all three. Testers' language still to confirm |

Last activity (F23) is computed from entries rather than stored in a `last_activity_at` column, so it cannot drift, the same rule as balances. P1 (F29–F36) and P2 (F37–F41) are not built; the PRD says to choose P1 from pilot evidence.

## Tests

`npm test` covers the balance maths (50-entry ledger), totals, Indian formatting, quick-entry parsing (aliases, ambiguity, suppliers), fuzzy search, reminder text in every language and tone, and the outbox (5 entries offline, survive a reload, sync in order; duplicates and server rejections).

## Not yet verified

- Two-account RLS check against the real Supabase project.
- The airplane-mode test on a real phone against Supabase (the outbox logic is unit-tested; demo mode never goes offline).
- Password reset and Google sign-in end to end (need the Supabase setup above).
- Android Chrome and iPhone Safari on real devices; UPI deep links on iOS.
- The pilot with 3 kirana shops.
