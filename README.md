# Hisaab

A fast, ad-free digital khata (credit ledger) as a mobile-first PWA. Built from `Hisaab-MVP-PRD.md`.

Stack: React + Vite + TypeScript, Tailwind, Supabase (Postgres, auth, row-level security), jsPDF, vite-plugin-pwa.

## Run locally

```bash
npm install
npm run dev
```

With no env vars the app runs in **demo mode**: accounts and data live in this browser's localStorage only. Good for trying it out; not for real users.

## Connect Supabase (cloud storage, F1/F8)

1. Create a project at supabase.com.
2. Run `supabase/schema.sql` in the SQL editor. It creates the tables and the row-level security policies.
3. Auth settings: enable Email provider. For instant sign-up turn off "Confirm email".
4. Copy `.env.example` to `.env` and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the anon key is safe in the frontend because RLS protects the data).
5. `npm run dev`.

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

## Tests

`npm test` covers the balance maths (50-entry ledger), totals, Indian formatting, quick-entry parsing and reminder links.

## Not yet verified

- Supabase mode against a real project, and the two-account RLS check from the release criteria.
- Android Chrome and iPhone Safari on real devices; UPI deep links on iOS.
- Niche choice, product name and the 5-day real-user test are still open in the PRD.
