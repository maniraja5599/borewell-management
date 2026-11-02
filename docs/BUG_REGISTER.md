# DrillRig Enterprise Bug Register & Quality Tracking Log

**Project:** DrillRig Borewell Billing Platform  
**QA Lead:** Enterprise QA Lead & DevSecOps Engineer  
**Audit Cycle:** Production Release Audit (November 2026)  
**Status Key:**
- `CLOSED / RESOLVED`: Bug verified, root cause fixed, test case created, regression test passed.
- `DEFENDED`: Verified behavior guarded by architectural assertions.

---

## Centralized Defect Log

| Bug ID | Severity | Category | Component | Status | Summary |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **BUG-001** | Medium | UI / Logic | `src/ui/FormatMixin.js` | **RESOLVED** | Empty or all-whitespace customer name caused blank avatar badge |
| **BUG-002** | High | Security / Storage | `src/features/settings/BrandMixin.js` | **RESOLVED** | Logo uploader allowed non-image files and oversized files without quota guard |
| **BUG-003** | Low | Presentation | `dashboard.html` | **RESOLVED** | Invalid Lucide icon `drill` caused missing glyph; replaced with `hard-hat` |
| **BUG-004** | Medium | Business Logic | `src/core/slabEngine.js` | **DEFENDED** | Extreme discount could hypothetically cause negative taxable subtotal |
| **BUG-005** | High | Regression / Engine | `src/core/slabEngine.js` | **RESOLVED** | Return signature of `computeBillTotals` altered, breaking golden test schema |
| **BUG-006** | Low | CSS / Responsive | `index.html` (Dock CSS) | **RESOLVED** | Counter badge in floating dock misaligned on wide tablet and desktop screens |
| **BUG-007** | Low | Accessibility / UI | `index.html` (Settings CSS) | **RESOLVED** | Settings sub-tabs lacked distinct active pill contrast against background |
| **BUG-008** | Medium | PWA / Offline | `public/sw.js` | **RESOLVED** | Service worker cached assets did not include `dashboard.html` in pre-cache |
| **BUG-009** | Low | Print / Export | `src/core/exportEngine.js` | **DEFENDED** | Rupee symbol encoding in raw thermal ESC/POS print streams |
| **BUG-010** | Low | Integration | `src/features/bills/HistoryMixin.js` | **RESOLVED** | WhatsApp share message encoding with multi-line breaks and emojis |

---

## Detailed Defect Reports & Remediation Analysis

### BUG-001: Blank Avatar on All-Whitespace Customer Name
- **Affected File:** `src/ui/FormatMixin.js`
- **Severity:** Medium
- **Description:** When a user submitted a bill with spaces for the customer name or an empty string, `getInitials(name)` performed `name.split(' ')` resulting in empty tokens, returning `''`. The rendered avatar badge appeared as an empty blank circle without a placeholder letter.
- **Root Cause:** Inadequate filtering of empty tokens from the split result.
- **Remediation:**
  ```javascript
  getInitials(name) {
      if (!name || !name.trim()) return 'C';
      const parts = name.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  ```
- **Verification:** Verified in `tests/security.test.js` (`handles empty or whitespace-only initials safely`).

---

### BUG-002: Unvalidated Logo Upload in Settings
- **Affected File:** `src/features/settings/BrandMixin.js`
- **Severity:** High (Storage Denial-of-Service / Integrity)
- **Description:** The logo image input in company settings read any uploaded file directly via `FileReader.readAsDataURL()` and wrote the base64 string to `localStorage`. Uploading a 20MB file or a non-image file would trigger a `QuotaExceededError` in LocalStorage, preventing future bill saves.
- **Remediation:** Added MIME-type verification, 5MB file size limit, and defensive error handlers:
  ```javascript
  if (!file.type.startsWith('image/')) {
      this.showToast('Please select a valid image file (PNG, JPG, SVG)', 'error');
      return;
  }
  if (file.size > 5 * 1024 * 1024) {
      this.showToast('Logo file size must be less than 5MB', 'error');
      return;
  }
  ```
- **Verification:** Tested file input validation with invalid formats and verified toast alerts.

---

### BUG-003: Lucide Icon Missing Glyph in Owner Dashboard
- **Affected File:** `dashboard.html`
- **Severity:** Low (Cosmetic)
- **Description:** In `dashboard.html`, the header avatar icon used `<i data-lucide="drill"></i>`. In Lucide Icons v0.344.0, no icon named `drill` exists, resulting in an unrendered empty element.
- **Remediation:** Replaced `drill` with standard engineering icon `hard-hat`.
- **Verification:** Icon renders cleanly with gold accent styling.

---

### BUG-004: Boundary Condition for Discounts Exceeding Gross Subtotal
- **Affected File:** `src/core/slabEngine.js`
- **Severity:** Medium (Business Logic Edge Case)
- **Description:** If an operator mistakenly entered a discount greater than the gross subtotal (e.g. Subtotal Rs 50,000, Discount Rs 80,000), the calculation could produce negative grand totals.
- **Remediation / Defense:** Verified that `computeBillTotals` enforces `grandTotal = Math.max(0, taxableAmount + gstAmount)` and `balancePayable = Math.max(0, grandTotal - advancePaidAmount)`.
- **Verification:** Verified via `tests/businessLogic.test.js` (`calculates discount and GST without negative taxable amount`).

---

### BUG-005: Golden Test Fixture Schema Breakage
- **Affected File:** `src/core/slabEngine.js`
- **Severity:** High (Regression Threat)
- **Description:** During feature enhancement, a property `taxableAmount` was directly appended to the return object of `computeBillTotals`. However, 1,314 golden test fixtures in `tests/slabEngine.test.js` strictly validate the exact 32-key return signature of the calculation engine. This caused 10 golden test cases to fail deep equality checks.
- **Remediation:** Reverted the additional key from `computeBillTotals` return signature to preserve the exact 32-key contract. In consuming modules, taxable amount is derived as `Math.max(0, res.grossSubtotal - res.discountAmount)`.
- **Verification:** All 1,314 golden tests and 8 business logic tests pass with 100% success.

---

### BUG-006: Floating Dock Counter Badge Misalignment on Desktop
- **Affected File:** `index.html`
- **Severity:** Low (Styling)
- **Description:** On desktop viewports (>768px), the navigation dock displays items horizontally. The history counter badge had `position: absolute; top: -6px; right: -8px`, causing the badge to overlap neighboring menu text.
- **Remediation:** Applied responsive CSS rule: `@media (min-width: 769px) { .nav-badge { position: static; margin-left: 4px; } }`.
- **Verification:** Visual inspection across 320px, 768px, and 1440px confirms clean inline badge flow.

---

### BUG-007: Sub-Tab Contrast in Settings
- **Affected File:** `index.html`
- **Severity:** Low (UI Contrast)
- **Description:** The sub-tabs in Settings (General, Rates, Backup, Cloud) used generic gray pill buttons that blended into the page background.
- **Remediation:** Implemented an enterprise tab bar with an `#e8edf3` container track, elevated white cards for inactive tabs with category-colored icons, and `#0f172a` obsidian active pill with clear drop-shadow.
- **Verification:** Contrast ratio exceeds WCAG 2.2 AA standards (7:1 contrast on active tabs).

---

### BUG-008: Service Worker Cache Missing Owner Dashboard
- **Affected File:** `public/sw.js`
- **Severity:** Medium (Offline Experience)
- **Description:** The service worker pre-cache list only included `/`, `/index.html`, and static JS/CSS assets. Navigating to `/dashboard.html` while offline in remote field sites produced a browser offline error.
- **Remediation:** Added `/dashboard.html` to the core pre-cache URL array and bumped cache version to `drillrig-v2.1`.
- **Verification:** Verified offline cache hit in Service Worker response strategy.

---

### BUG-009: Thermal Print Stream Rupee Currency Symbol
- **Affected File:** `src/core/exportEngine.js`
- **Severity:** Low (Print Media Compatibility)
- **Description:** Standard 2-inch and 3-inch ESC/POS thermal printers do not have UTF-8 codepages for the Indian Rupee glyph (`₹`), rendering random garbled characters (`?` or `â‚¹`).
- **Remediation:** In raw thermal ESC/POS output, currency is formatted as `Rs.` for maximum printer hardware compatibility, while web and PDF views use `₹`.
- **Verification:** Verified thermal receipt output formatting.

---

### BUG-010: WhatsApp Share URL Encoding
- **Affected File:** `src/features/bills/HistoryMixin.js`
- **Severity:** Low (Third-party Integration)
- **Description:** Sharing bill summaries to customer WhatsApp numbers with unencoded newlines or special Tamil/English characters caused message truncation in certain Android WhatsApp webview wrappers.
- **Remediation:** Wrapped WhatsApp message generator in `encodeURIComponent()` and validated that parameter formatting matches the official WhatsApp API specification.
- **Verification:** Verified via `tests/security.test.js` (`generates sanitized WhatsApp share URLs`).
