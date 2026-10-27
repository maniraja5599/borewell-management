# DrillRig — Borewell Billing & Khata

Mobile-first PWA for borewell billing: depth-slab pricing, bills/quotations, customer dues, WhatsApp/PDF sharing.

## Develop

```bash
npm install
npm run dev      # local dev server (http://localhost:5173)
npm test         # billing engine regression tests
npm run build    # production build in dist/
```

Pushing to `main` runs the tests and deploys `dist/` to GitHub Pages
(Settings → Pages → Source must be **GitHub Actions**).

## Code layout

```
src/
  main.js                 entry point
  app/App.js              app class: constructor, init, wires all features together
  core/slabEngine.js      pure billing math (slabs, re-bore, pipes, GST, balance) — tested
  data/storage.js         the ONLY place that touches saved data (swap point for cloud sync)
  config/constants.js     default depth slabs, country codes
  i18n/dictionary.js      UI text
  features/
    bill/                 new-bill flow, inputs, receipt, extras & notes
    customers/            customer book, phone validation, sites
    payments/             recording payments against bills
    history/              saved bills, filters, bill detail
    rates/                rate profiles & slab editor
    settings/             company profile, branding, backup/restore
    share/                WhatsApp, image & PDF export
  ui/                     shell (tabs, toasts, confirm dialogs), header, formatting
  platform/               iOS/Android viewport fixes
  pwa/initPwa.js          install prompt, service worker registration
public/                   icons, manifest, service worker (copied as-is)
tests/                    vitest tests + golden fixtures from the original app
```

Each feature file is a "mixin" class whose methods are added to `BoreBillSaaSApp`
(`src/app/applyMixins.js`), so they all share the same app state via `this`.
New features (dashboard, inventory, staff) go in new folders under `features/`.
