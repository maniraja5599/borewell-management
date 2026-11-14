# Multi-rig, staff roles & per-rig subscription — design

Status: **approved 2026-11-13** (decisions below were chosen by the owner of the product).
Applies to the DrillRig PWA. The Flutter app ("Borewell Management service") is not changed.

## Decisions

| Question | Decision |
|---|---|
| Relation to the Flutter app's tables | **Own `drillrig` schema, same concepts.** company ≈ owner, rig ≈ unit, member ≈ user_account, member_rig ≈ unit_access. A later merge stays possible; the Flutter app can never break. |
| Staff access | **3 fixed roles** (owner / manager / driver). No per-person permission toggles in v1. |
| Bill numbers | **Separate series per rig** — each rig has its own prefix and counter (`R1-101`, `R2-101`). |
| Unpaid rig | **Read-only.** Old bills, dues and customers stay visible and shareable; payments can still be recorded; **no new bills** on that rig until paid. Data is never held hostage. |

## Who can do what

| | Owner | Manager | Driver |
|---|---|---|---|
| Rigs visible | all | assigned rigs | assigned rigs |
| Bills visible | all | all bills of assigned rigs | **only bills they created** |
| Create bill / quotation | ✓ | ✓ (assigned rigs) | ✓ (assigned rigs) |
| Edit bill, record payment | ✓ | ✓ (assigned rigs) | own bills only |
| Delete bill | ✓ | ✗ | ✗ |
| Customers | all, edit, delete | all, add, edit | all, add, edit |
| Delete customer | ✓ | ✗ | ✗ |
| Rates tab, company profile, theme, WhatsApp format | edit | hidden (rates still apply on bills) | hidden |
| Rigs, staff, invites, subscription | ✓ | ✗ | ✗ |
| Backup / restore | ✓ | ✗ | ✗ |
| Owner dashboard | ✓ | ✓ (their rigs' bills) | ✗ |
| Staff who used the app offline before joining | — | asked to remove old local bills first (never uploaded into the company) | same |

**Every rule is enforced on the server** (Postgres functions). The app only hides buttons so
people are not shown things they cannot do. A modified app still cannot read or write more.

## Data model (schema `drillrig`)

```
company ─┬─ rig (name, bill_prefix, trial_ends_at, paid_until, archived_at)
         ├─ member (user_id, role, status, email, access_rev)
         │     └─ member_rig (rig_id)            -- managers & drivers only
         ├─ invite (email, role, rig_ids[], accepted_at, revoked_at)
         ├─ record (kind, id, data, deleted, rev, rig_id, created_by, ...)
         └─ doc_counter (rig_id, doc_type, last_seq)
```

- `record.rig_id` — set for bills (from `data.rigId`), null for customers and settings.
- `record.created_by` — who first created the record. Set once by the server, never changed.
  This is what "drivers see only their own bills" uses.
- `member.access_rev` — bumped whenever a member's role or rigs change. A phone that sees a
  new value re-downloads everything it is now allowed to see (and drops what it no longer is).
- Existing companies get one rig, **"Rig 1"**, using the company's current bill prefix and
  counters, so bill numbers continue without a gap. All existing bills are put on it.

## Invites (no passwords, no codes)

1. Owner → Settings → Team → *Invite*: staff member's **Google email**, role, rigs.
2. Staff member opens the app and signs in with that Google account.
3. On sign-in the server finds the open invite for that (Google-verified) email and adds
   them to the company with that role and those rigs.
4. Owner can change role/rigs or remove a member at any time; it takes effect on the
   member's next sync.

A person can belong to more than one company (e.g. a driver for one owner who also owns a
rig). A phone holds one company's data at a time; switching uses the same
"remove this company's data from the phone" step as switching Google accounts.

## Subscription per rig

- Every new rig gets a **30-day free trial** (`trial_ends_at`).
- A rig is *active* while `now() < greatest(trial_ends_at, paid_until)`.
- When inactive, the server refuses **new** bills for that rig (existing bills can still get
  payments and be shared). The app shows a banner and a *Renew* button.
- **Payment, v1:** owner pays by UPI / contacts you on WhatsApp; you extend `paid_until` with the
  admin function `drillrig_admin_set_paid_until(rig_id, until)` from the Supabase SQL editor
  (it is not callable from the app). **v2:** Razorpay subscription + webhook Edge Function that
  calls the same function. Needs a Razorpay account and keys (owner's decision).
- Price is not hard-coded in the database; the app shows the price from `src/config/plans.js`.

## Old app versions

Phones still running the previous version keep working: bills they upload without a `rigId`
go to the company's first rig, and the old 3-argument bill-number function still works.

## Rollout

1. Run `supabase/drillrig/0003_rigs_roles_subscription.sql` in the Supabase SQL editor
   (it includes 0002's soft delete, so 0002 does not need to be run separately).
2. Run `supabase/drillrig/0004_activity_log.sql` (activity log: who created / edited / deleted /
   took a payment on each bill; shown in the bill popup and in Team & Rigs → Recent activity).
3. Run `supabase/drillrig/0005_pipe_stock.sql` (casing pipe stock per rig). Until it runs, stock
   entries stay on the phone that made them and upload afterwards.
4. Run `supabase/drillrig/0006_pull_with_server_time.sql` (can run any time, before or after 0003-0005).
   Without it every open phone re-downloads the company's last ~50 changed records every minute;
   with it only the last two minutes of changes are read twice. The app works either way.
5. Run `supabase/drillrig/0007_admin_console.sql` (after 0003-0006), then add yourself as admin, once:
   `insert into drillrig.admin (user_id) select id from auth.users where email = 'YOUR_EMAIL';`
   The console is at `admin.html` (not linked from the app; the server refuses non-admins).
   It can pause a business (cloud sync stops; phones keep billing), set rig free / paid-until dates,
   export a business's cloud data and delete a business on request. Every action is in the admin log.
6. Deploy the app.
7. Owner sees *Rig 1* in Settings → Team & Rigs; can rename it, add rigs, invite staff.

---

## Free Early Access (decided 14 Nov 2026)

- Every feature is free for everyone until **31 March 2027** (end of day IST). One setting:
  `src/config/plans.js` → `EARLY_ACCESS`; the server matches it in 0003 (`trial_ends_at` default).
- After that: **billing on one phone stays free forever**; Cloud sync, staff and extra rigs are paid per rig.
- **Founding members** (started before 31 March 2027): **50% off for life** while subscribed.
- Published in: setup wizard, Settings → account card, and Terms → Pricing (`terms.html#pricing`).

**Must be done before 31 March 2027:**
1. By **1 March 2027**: set `PLANS.pricePerRigMonthlyInr`, show the price in the app and in the Terms
   (the Terms promise at least 30 days' notice).
2. Change what "unpaid" means: today an unpaid rig becomes *read-only* (0003 refuses new bills).
   The promise is that **billing on the phone stays free**, so an unpaid rig must instead stop
   *cloud sync / staff* while the phone keeps billing locally. Update 0003's push check, the
   `canCreateBill` guard in `rigBar.js`, and the banner texts.
3. Record who is a founding member (e.g. `drillrig.company.founding = created_at < 2027-04-01`).

---

## How I would improve DrillRig after this (recommended order)

1. **Razorpay auto-renewal** for rig subscriptions (removes manual activation work for you).
2. ~~Activity log~~ — done (0004).
3. **Owner daily summary on WhatsApp** — one tap at night: bores, feet, billed, collected,
   per rig. Uses data the dashboard already computes.
4. **Due reminders** — list of customers with dues older than N days, one-tap WhatsApp
   reminder with the UPI QR. This directly brings money in, which sells the subscription.
5. ~~Pipe stock per rig~~ — done (0005): Bills tab → Pipe stock.
6. **Diesel & expenses per rig** (ROADMAP phase 3–4) → per-rig profit, the number owners
   care about most.
7. **Tamil-first UI** — the dictionary exists; finish translating every screen and make
   Tamil the default for new users in Tamil Nadu.
8. **Error reporting** (e.g. Sentry free tier) so you hear about crashes before customers call.
9. **Custom domain** (e.g. `drillrig.in`) — more trust than `github.io` for a paid product.
