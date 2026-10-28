# 🚜 DrillRig — Borewell Billing SaaS Roadmap

**Repository:** [github.com/maniraja5599/borewell-management](https://github.com/maniraja5599/borewell-management)
**Live app:** [maniraja5599.github.io/borewell-management](https://maniraja5599.github.io/borewell-management/)

We work **one step at a time, in order**. A step is finished only when its "Done when" checks pass
in the real app (tested in the browser), the tests pass, and it is live.

| # | Step | Status |
|---|------|--------|
| 0 | Foundation: code split, security fixes, Google login, cloud sync | ✅ Done (28 Oct 2026) |
| 1 | Staff accounts & roles | ⏭️ Next |
| 2 | Owner dashboard & reports | ⬜ |
| 3 | Inventory: PVC pipe stock & diesel | ⬜ |
| 4 | Crew: bata, advances, salary & expenses → true profit per bore | ⬜ |
| 5 | Ready to sell: subscriptions, admin panel, legal, domain | ⬜ |
| 6 | Decide: link with the Flutter app, or keep DrillRig separate | ⬜ |

---

## ✅ Step 0 — Foundation (done)

- [x] Billing, depth slab engine, customer book, bill book, payments, WhatsApp / image / PDF share, iPhone & Android PWA.
- [x] Security: customer data escaped in the UI, safe backup restore, pinned offline libraries.
- [x] Code split from one 10,500-line file into feature modules (Vite build, auto deploy via GitHub Actions).
- [x] 1,336 automated tests (slab engine golden tests from the original app + sync safety tests).
- [x] Settings sub-tabs restyled; all six visible on phones.
- [x] **Google sign-in** (optional; the app still works fully without it).
- [x] **Cloud sync** (Supabase, separate `drillrig` schema — the Flutter app's tables are not touched):
  - every save uploads in the background; other phones' changes download automatically; works offline;
  - first sign-in merges the phone's bills into the company, never loses data;
  - an unconfigured phone can never overwrite the company's real settings;
  - bill numbers reserved on the server while online.

**Known limits (to fix inside later steps):**
- Two phones editing the *same* bill at the same moment → the last save wins.
- Two phones that are *both offline* can still hand out the same bill number.
- Google sign-in is in **testing mode** → only listed Gmail addresses can log in (max 100). Switched to production in Step 5.

---

## ⏭️ Step 1 — Staff accounts & roles

**Goal:** drivers and managers use the app on their own phones; the owner sees everything.

- [ ] Settings → **Staff**: owner adds a person by Gmail and picks a role; can change the role or remove them.
- [ ] The person signs in with Google on their phone → joins the company automatically.
- [ ] Every bill and payment records **who** created it (name shown on the bill row).
- [ ] Permissions, enforced **on the server** (not only hidden buttons):

  | | Owner | Manager | Driver |
  |---|---|---|---|
  | Create bills & quotations | ✅ | ✅ | ✅ |
  | See bills | All | All | Only their own |
  | Record payments | ✅ | ✅ | ✅ *(to confirm)* |
  | Edit rates & company settings | ✅ | ✅ | ❌ |
  | Delete bills | ✅ | ❌ *(to confirm)* | ❌ |
  | Add / remove staff | ✅ | ❌ | ❌ |

- [ ] Removing someone stops their access immediately; their bills stay with the company.
- [ ] A staff phone that already has its own old bills: ask before merging them into the company.

**Done when:** owner + one driver test account in two browsers — the driver creates a bill, the owner sees it with the driver's name; the driver cannot see the owner's bills, cannot change rates, and is locked out after removal.

**Needs from you:** 1–2 test Gmail addresses (added to Google's test list); confirm the two *(to confirm)* cells.

---

## ⬜ Step 2 — Owner dashboard & reports

**Goal:** after every working day the owner knows the work done, money collected and money pending.

- [ ] Dashboard tab: **Today / This week / This month / Custom range**.
- [ ] Work: bores (new vs re-bore), total feet, average depth, 7" / 10" pipe feet.
- [ ] Money: billed, collected (cash / UPI), pending dues, top pending customers.
- [ ] Per staff member: bills, feet, amount (uses Step 1's "who created it").
- [ ] Village / area view: bores, average depth and pending dues by place.
- [ ] One-tap daily summary to WhatsApp; monthly PDF / Excel statement.

**Done when:** numbers match a hand count on a sample of real bills.

---

## ⬜ Step 3 — Inventory: PVC pipe stock & diesel

**Goal:** know how much pipe and diesel is left without counting.

- [ ] Pipe stock ledger for 7" and 10": add purchases (supplier, date, feet, rate/ft).
- [ ] **Auto-deduct** pipe feet when a Final Bill is saved; put it back if the bill is deleted or edited.
- [ ] Low-stock warning (owner-set threshold, e.g. below 200 ft).
- [ ] Diesel log: litres filled, rig/compressor hours, cost per bore and per foot.
- [ ] Optional: bits & hammers life in feet drilled.

**Done when:** stock after a week of test bills equals purchases minus billed feet.

---

## ⬜ Step 4 — Crew: bata, advances, salary & expenses

**Goal:** true profit per bore.

- [ ] Crew list (driller, helper, driver) linked to Step 1 staff where they log in.
- [ ] Bore bata logged automatically for the crew on each bill.
- [ ] Advances, food/tea allowance, monthly salary settlement with balance.
- [ ] Site expenses (transport, toll, maintenance, food).
- [ ] **Net profit per bore** = bill − pipe cost − diesel − bata − expenses.

**Done when:** a month's profit report reconciles with the owner's own notebook for that month.

---

## ⬜ Step 5 — Ready to sell

- [ ] Google sign-in switched to **production** (any Gmail can log in).
- [ ] Free trial (e.g. 30 days) → monthly / yearly plan via Razorpay (UPI AutoPay); when expired, old bills stay viewable, new bills are locked.
- [ ] Super-admin panel: companies, plan status, usage, extend trial.
- [ ] Privacy Policy & Terms, data export / delete on request (DPDP Act 2023), GST invoice for the subscription.
- [ ] Custom domain, error monitoring, daily database backups.
- [ ] Optional: WhatsApp number verification ("reverse OTP" — the user sends a code to our WhatsApp number, which is free).

---

## ⬜ Step 6 — Decide on the Flutter app

`borewell-dev` (Supabase) also holds the **Borewell Management service** Flutter app (roles, stock, salary, attendance, vehicles).
After Steps 1–4 are tested, decide:

- **A. Link:** DrillRig becomes the quick web billing screen for the same backend (one pricing engine, shared tables).
- **B. Separate:** keep DrillRig as its own simpler product.

Until then DrillRig stays in its own `drillrig` schema and never touches the Flutter app's tables.
