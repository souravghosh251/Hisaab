# Hisaab PRD v2: Digital Khata for Kirana Stores

Nov 1, 2026 · @Sourav · Supersedes the niche-open parts of `Hisaab-MVP-PRD.md`

## 1. Summary

Hisaab is a fast, ad-free digital khata (credit ledger) that runs from a link on any phone. v1 shipped the basic loop: add customers, record You Gave / You Got, see balances, send a WhatsApp reminder with a UPI link. v2 focuses the product on **kirana and general stores** and makes two things excellent: **recording at the counter** and **collecting dues**.

**Positioning.** For kirana owners who still track udhaar in a notebook or in a heavy app, Hisaab is the khata that keeps up with the counter: one-tap entries, polite WhatsApp reminders, no ads, nothing to install.

**Why focus.** Khatabook and OkCredit are free and well funded, so a general khata cannot win on features. We win on speed at the counter and on getting dues paid, tested with real owners.

## 2. Problem

A kirana owner gives credit to 40–60 regular families. Today they:

- write entries in a notebook, with errors and disputes at month-end;
- lose track of who owes what and for how long;
- find it awkward to ask for money face to face;
- quit apps that feel slower than pen and paper, or that fill up with ads, loans and upsells.

## 3. Target user

**Primary: Ramesh, kirana owner, 45.** One shop, low-cost Android, often one-handed with a queue at the counter. Knows customers by nickname, flat number or "Sharma ji", not full name. Customers pay in round amounts or in full, mostly in the first week of the month or before festivals. Owner is uncomfortable asking in person; a WhatsApp message is easier.

**Secondary: the customer.** Receives a message, has no app, wants a clear statement and an easy way to pay.

**Secondary: the helper** (son or staff) who sometimes records entries at the counter.

## 4. Goals and non-goals

**Goals**
1. Recording an entry is faster than writing it in a notebook (median under 10 seconds).
2. Owners collect more of what they are owed, using reminders sent on the right days.
3. Zero wrong balances and zero lost data.
4. At least 2 of 3 real shops still recording after 5 days.

**Non-goals (this version)**
- GST billing, inventory, loans, multi-store.
- Native apps; automated SMS; payment gateway and auto-reconciliation.
- Full offline sync (a retry queue is in scope, see F26).
- Voice entry; more than the launch languages in section 8.

## 5. Success metrics

| Metric | Target | How measured |
| --- | --- | --- |
| Median time to record an entry (open ledger or quick bar to saved) | < 10 s | Event log, F22 |
| Activation: 10 entries and 1 reminder within 3 days of sign-up | ≥ 70% of testers | Event log |
| Owners still recording on day 5 | ≥ 2 of 3 | Event log |
| Entries per active owner per day | ≥ 10 | Event log |
| Share of entries recorded at the counter (not batched at night) | ≥ 60% | Entry created_at vs txn time of day; confirm in interviews |
| Reminder to payment: dues reduced within 7 days of a reminder | Track, no target yet | Reminder log vs later "got" entries |
| Balance errors found in testing | 0 | 50-entry manual check |
| Save failures that lose data | 0 | Event log, F26 |

## 6. Feature requirements

Priority: **P0** before real-user testing, **P1** during testing, **P2** after. Existing v1 features (customer list, entries, ledger, totals, WhatsApp + UPI reminder, PDF statement, suppliers, PWA, quick entry, Hindi/English, bulk reminder) stay as built unless changed below.

### P0: before testing

| ID | Feature | Requirement | Acceptance criteria |
| --- | --- | --- | --- |
| F21 | Opening balance on Add customer | Optional "They owe me ₹ / I owe them ₹" field; creates a dated opening entry | A shop can add a customer with their existing balance in one form; ledger shows "Opening balance" entry |
| F22 | Event logging | First-party `events` table (no third-party trackers): signup, entry_saved (with source: ledger / quick bar / repeat / settle), reminder_sent, app_open | Metrics in section 5 computable from the table; no personal data beyond user id |
| F23 | Recent-first Home + pins | Default sort is last activity; user can pin up to 5 customers shown at top; Amount and Oldest due stay as sort options | Customer with newest entry is first; pinned customers stay on top |
| F24 | Aliases and fuzzy search | Optional alias field (nickname, flat no., landmark). Search matches name, alias, last 4 digits of phone; tolerant of common spelling variants (sharma / sharama, verma / varma) | Searching "302" finds the customer with alias "Flat 302"; quick entry matches aliases too |
| F25 | Faster entry actions | (a) "Same as last time ₹X" one-tap repeat of the last gave entry; (b) "Got full ₹X" button in the You Got sheet; (c) quick entry: when several names match show tap-to-pick chips; when none match offer "Add and record"; works on Suppliers tab | Repeat and settle each save in ≤ 2 taps from the ledger; ambiguous quick entry never dead-ends |
| F26 | Save queue | If a save fails due to no connection, keep the entry in a local outbox, show "Saved on this phone, will sync", retry automatically; never silently drop | Airplane-mode test: 5 entries survive reload and sync once online; balances show the pending entries |
| F27 | Account recovery and easy sign-in | Password reset by email; Google sign-in | Reset email works end to end; Google sign-in creates the profile with the same data model |
| F28 | Launch language | Confirm the testers' language first; ship UI and reminder text in it (Hindi and English exist) | Every screen and reminder tone available in each launch language |

### P1: during testing

| ID | Feature | Requirement | Acceptance criteria |
| --- | --- | --- | --- |
| F29 | Salary-day prompt | On the 1st–7th of the month and 7 days before major festivals, Home shows "Remind customers with dues"; opens Remind all | Prompt appears on those dates only; dismissible for the month |
| F30 | Reminder rules | Setting for a minimum due amount (default ₹100) below which Remind all skips a customer; per-customer "don't remind" and snooze (7 / 30 days) | Skipped customers shown with reason; snoozed customers return automatically |
| F31 | Reminder history | Log every reminder (customer, time, tone, amount); ledger shows "Last reminded 3 days ago"; warn before a repeat within 3 days | Log row created on tap of Send; warning appears inside the window |
| F32 | Promise to pay | After a reminder the owner can set "paying on <date>"; Home shows "Promised today / missed promises" | A promise for today appears in the Home list; a missed one is flagged next day |
| F33 | Credit limit | Optional per-customer limit; warn (not block) when an entry would exceed it | Entry above limit shows a confirm with the new balance |
| F34 | Today's collection | Home card: collected today, split cash / UPI, plus total gave today; optional cash / UPI chip on You Got | Today's number equals the sum of today's got entries |
| F35 | Customer statement link | Read-only link to a customer's own statement, included in the reminder; revocable | Link opens without login on a phone, shows balance and entries, no other customers' data; owner can turn it off |
| F36 | Install nudge | After the first saved entry show an in-app "Add to Home Screen" prompt (Android install event; iPhone instructions) | Prompt shows once, dismissible, not shown when already installed |

### P2: after testing

| ID | Feature | Requirement |
| --- | --- | --- |
| F37 | Helper access | Invite a helper who can add entries but not delete; "entered by" on every entry; owner sees an audit trail |
| F38 | Entry history and restore | Soft-delete entries; show edit history; owner can restore |
| F39 | Import | Paste or upload a customer list with balances; optionally pick from phone contacts (Android Chrome) |
| F40 | Export | CSV of customers and entries for backup |
| F41 | Aging view | Days since oldest unpaid amount per customer; buckets 0–30 / 31–60 / 60+; replaces due-date based "Oldest due" |

## 7. Key flows

**Counter entry (target under 10 seconds).** Home → type "sharma 420 atta" in the bottom bar → Enter → toast with Undo. Alternative: tap a pinned customer → "Same as last time" or "You gave ₹" → keypad → Save.

**Payment received.** Open customer → "Got full ₹X" (or keypad for partial) → balance shows settled.

**Month-start collection.** Salary-day prompt → Remind all (customers above the minimum, overdue first) → Send per customer on WhatsApp with UPI link and statement link → customer pays → owner records "Got full".

**First day.** Sign up → add customers with opening balances → record first entry → install nudge → next day, reminders.

## 8. Languages

Hindi and English ship now. The launch language set is decided by where the first testers are, before F28 starts. Add regional languages only when a tester needs one; strings live in one dictionary (`src/lib/i18n.tsx`).

## 9. Data model changes

Balances remain computed from transactions, never stored. Amounts stay integer paise in the database (the keypad takes whole rupees).

| Table | Change |
| --- | --- |
| parties | add `alias text`, `pinned bool`, `credit_limit bigint null`, `no_remind bool`, `snooze_until date null`, `last_activity_at timestamptz` |
| transactions | add `pay_mode text null (cash / upi)`, `deleted_at timestamptz null` (soft delete, F38), `entered_by uuid null` (F37), `source text` (ledger / quick / repeat / settle) |
| reminders (new) | `id, user_id, party_id, sent_at, tone, amount` (F31) |
| promises (new) | `id, user_id, party_id, promised_on date, created_at, fulfilled_at null` (F32) |
| events (new) | `id, user_id, name, props jsonb, created_at` (F22) |
| profiles | add `min_remind_amount bigint default 10000` (F30) |
| statement_links (new) | `token, party_id, user_id, revoked_at` (F35) |

Rules:
- Row-level security on every new table: `user_id = auth.uid()`.
- The statement link is the only unauthenticated read. Serve it through a single `security definer` function that takes the token and returns one party's entries; never expose the tables to anonymous users.
- Opening balance (F21) is an ordinary transaction with a note, so totals stay consistent.
- Amount limit stays ₹10,00,000 per entry.

## 10. Non-functional requirements

- First load under 3 s on 4G; saving an entry under 1 s online.
- Works on Android Chrome and iPhone Safari from 360 px width; tap targets at least 44 px; readable in bright light (contrast at least 4.5:1).
- Indian number formatting; balances always labelled in words, not colour alone.
- HTTPS only; no secrets in frontend; no ads or third-party trackers; events contain no names or phone numbers.
- Reliability: no data loss, with the outbox (F26) covering offline saves; daily database backup.

## 11. Validation plan

- Recruit 3 kirana shops by Day 7 and run a 5-day pilot with the P0 set.
- Day 1: observe each owner's first entry on their own phone without helping; time it.
- Day 3 check-in and day 5 interview: when do you enter (counter or night)? What did you not enter and why? Do you use another app, and what would make you switch? Did any customer respond to a reminder?
- Closing question: "If this app disappeared tomorrow, what would you do?"
- Decide P1 order from what the pilot shows, not from this document.

## 12. Release criteria

- [ ] All P0 features pass their acceptance criteria.
- [ ] 50-entry ledger matches a manual calculation (automated test exists).
- [ ] Two-account row-level-security test passes in Supabase (not yet run).
- [ ] Works on Android Chrome and iPhone Safari at 360 px on real devices (not yet run).
- [ ] Airplane-mode test passes (F26).
- [ ] Deployed at a public link with no console errors.
- [ ] 2 of 3 pilot shops recording on day 5.

## 13. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Owners already use Khatabook / OkCredit and see no reason to switch | No adoption | Ask in pilot; make import (F39) P1 if more than half already use one |
| Entry is still slower than a notebook | Owners quit | F23–F25, measure median time, watch day-1 sessions |
| Reminders feel pushy and damage customer relationships | Owners stop using them | F30–F31 rules and history; polite default tone |
| Patchy connectivity loses entries | Trust lost | F26 outbox |
| Statement link leaks data | Privacy incident | Token-only function, revocable, no table access for anonymous users |
| Language mismatch with testers | Unusable | Settle F28 before build |
| Scope creep | Pilot slips | Freeze P0; P1 chosen by pilot evidence |

## 14. Open questions

- [ ] Where are the 3 test shops, and in which language do they work?
- [ ] Do they enter at the counter or at night?
- [ ] Which khata app, if any, do they use now?
- [ ] Do they have a helper who records entries?
- [ ] Final product name?

## 15. Timeline (suggested)

| Days | Work |
| --- | --- |
| 1–2 | F21, F22, F27; confirm language (F28) |
| 3–4 | F23, F24, F25 |
| 5 | F26 outbox; real-device and RLS checks |
| 6–7 | Fix, deploy, recruit and onboard the 3 shops |
| 8–12 | Pilot; build F29–F32 and F34 as evidence supports |
| 13–14 | F33, F35, F36 if justified; write findings and demo |
