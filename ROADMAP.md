# 🚜 DrillRig Flow — Borewell Management ERP & Billing SaaS Roadmap

**Repository:** [https://github.com/maniraja5599/borewell-management](https://github.com/maniraja5599/borewell-management)  
**Live PWA URL (GitHub Pages):** [https://maniraja5599.github.io/borewell-management/](https://maniraja5599.github.io/borewell-management/)

---

## ✅ Phase 1: Core Billing, Depth Slab Engine & Customer CRM (Completed)
- [x] **Smart Step-by-Step Depth Slab Rate Builder** (`1–100`, `1–200`, `1–300 ft` base slabs, custom `+Step` increments, Quick Shift, auto-focus & keyboard scroll).
- [x] **Live Bill & Quotation Calculator** (`New Bore` vs `Re-Bore` flushing, `7"` & `10"` PVC Casing Pipes, Bore Bata, Extras, Discount, GST, Advance & Balance).
- [x] **Sticky Top Live Summary Bar** with one-shot attention animations (`₹0` initial state, depth & pipe pill highlights).
- [x] **Clean Customer Book (CRM)** with minimal list rows and a **2-Tab Customer Detail Window**:
  - **Tab 1:** Overall Payment & Bore/Pipe Summary (`Total Billed`, `Paid`, `Pending Due`, `Total Bores`, `Drilled Feet`, `PVC Pipe Feet`).
  - **Tab 2:** Separate **Bore-by-Bore Detail View** (`Bore #1`, `Bore #2`, ..., `All`) with full slab breakup and quick actions.
- [x] **Saved Bills & Quotations Ledger** with date/status filters, high-safety `Clear All` confirmation, and global **Undo** support.
- [x] **1-Tap WhatsApp Preview, HD Image & A4 PDF Receipt Export**.
- [x] **iPhone (iOS) & Android Standalone PWA Support** with Dynamic Island / Notch & Home Indicator safe-area protection.

---

## 📊 Phase 2: Owner Dashboard & Automated Business Reports (Next Up)
> *Goal: Give the Borewell Owner instant visibility into work done, collections, and profitability after every bill.*

- [ ] **Owner Summary Dashboard Tab / Modal:**
  - Filter by **Today / This Week / This Month / Custom Date Range**.
  - **Drilling Metrics:** Total Bores Completed (`New` vs `Re-Bore`), Total Feet Drilled, Average Depth per Bore.
  - **Pipe Metrics:** Total `7"` PVC Pipe Feet & `10"` PVC Pipe Feet billed across all sites.
  - **Financial Metrics:** Total Billed Revenue, Cash/UPI Collected, Total Pending Due (`Unpaid Bills`), Net Profit Estimate.
- [ ] **Post-Bill Owner Report Card:**
  - Automatic owner summary card / WhatsApp report after saving a bill (Site, Depth, Pipe Used, Total Bill, Advance Paid, Balance Due).
- [ ] **Site / Village Wise Analytics:**
  - See which villages/areas have the most bores, average depth in each village, and pending dues by area.
- [ ] **1-Tap Monthly PDF / Excel Statement Export** for owner accounting.

---

## 📦 Phase 3: PVC Pipe & Rig Inventory Management
> *Goal: Track stock of 7" & 10" PVC Casing Pipes, Drilling Bits, Hammers, and Diesel automatically.*

- [ ] **PVC Casing Pipe Stock Ledger (`7"` & `10"` Pipes):**
  - Add Stock Inward entries (Supplier Name, Date, Quantity in Feet / Lengths, Purchase Rate/ft).
  - **Auto-Deduct Stock on Bill Save:** When a Final Bill is saved with `7"` or `10"` PVC pipe, automatically deduct that many feet from current pipe inventory.
  - **Low-Stock Alert Banner:** Warn the owner when `7"` or `10"` PVC pipe stock drops below a threshold (e.g., `< 200 ft`).
- [ ] **Drilling Consumables & Spares Tracker:**
  - Track Drilling Bits (`6.5"`, `10"`), Hammers, Collars, and Caps usage/life in feet drilled.
- [ ] **Diesel & Rig Fuel Log:**
  - Record daily diesel liters filled, compressor/rig hours, and fuel cost per bore/ft.

---

## 👷‍♂️ Phase 4: Staff, Driller Bata & Expense Management
> *Goal: Manage rig crew attendance, Bore Bata, salary advances, and trip expenses.*

- [ ] **Staff Directory & Roles:**
  - Maintain profiles for Drillers, Helpers, Drivers, and Support Crew.
- [ ] **Bore Bata & Commission Auto-Split:**
  - Automatically log Bore Bata earned by the crew for each completed bore bill.
- [ ] **Staff Salary, Advance & Khata Ledger:**
  - Record cash advances given to staff, food/tea allowances, and monthly salary settlement with pending balance.
- [ ] **Rig Expense Tracker:**
  - Log daily site expenses (Transport, Police/Toll, Maintenance, Food) to calculate **True Net Profit per Bore** (`Bill Total − Pipe Cost − Diesel − Staff Bata/Expenses`).

---

## ☁️ Phase 0 (Before selling as SaaS): Cloud Accounts, Sync & Billing
> *Today all data lives only in the phone's browser (localStorage). If the phone is lost, the browser data is cleared, or the owner switches phones, every bill and customer is gone. A paid SaaS must fix this first.*

- [ ] **Backend + Login:** Supabase (Postgres + Auth). Phone OTP login (owners know their mobile number, not email passwords).
- [ ] **Multi-tenant data model:** `companies`, `company_members` (owner / staff role), `customers`, `bills`, `payments`, `rate_profiles`, `saved_extras`, `saved_notes` — every row carries `company_id`, protected by Row Level Security so one rig owner can never see another's data.
- [ ] **Offline-first sync:** keep the current localStorage/IndexedDB flow for no-signal drilling sites; queue changes and push to the cloud when online. Give every bill/customer a UUID + `updated_at` so two phones don't overwrite each other.
- [ ] **One-time migration:** on first login, upload the existing localStorage data (the same shape as the JSON backup) into the new account.
- [ ] **Bill numbers generated server-side** per company, so two devices never issue the same bill number.
- [ ] **Subscriptions:** Free trial (e.g. 30 days / 25 bills) → monthly/yearly plan via Razorpay (UPI AutoPay). Lock creating new bills (not viewing old ones) when expired.
- [ ] **Staff accounts:** owner invites drivers/supervisors with limited rights (create bill, no delete, no rate edits).
- [ ] **Super-admin panel:** list companies, plan status, usage, manual extend trial.
- [ ] **Legal & trust:** Privacy Policy, Terms, data export/delete on request (DPDP Act 2023), GST invoice for the subscription itself.
- [ ] **Code health:** split the 10,000-line `app.js` into modules (calc engine, storage/sync, UI per tab) with a small build step (Vite); add unit tests for the slab engine before touching it.
- [ ] **Ops:** custom domain, error monitoring (Sentry), daily automated DB backups.
