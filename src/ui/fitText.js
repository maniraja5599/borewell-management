// Money amounts in small tiles (₹18,08,060 …) must never be cut. On narrow phones, or when the
// phone's font size / zoom is set large (Android zooms the whole page, so a 360 px phone acts like
// 240–280 px), the amount shrinks just enough to fit its box. Normal phones are untouched.
export const FIT_SELECTOR = [
    '.cdm-pt-val',          // payment popup: Total / Paid / Balance
    '.kpi-val',             // Bills + Customers top totals, Rates tiles
    '.rp-hero-val',         // report hero numbers
    '.vs-val',              // backup counts
    '.bl-card .khata-Quick-stats strong',
    '.bl-card .khata-main-amt',
    '.bs-trio strong',      // bill popup: Received / Still due
    '.cdm2-trio strong', '.cdm2-bal-amt', // customer popup: Billed / Received / Still to receive
    '#tab-rates .rc2-figs strong',
    // short buttons: on very narrow / zoomed screens the word shrinks a little instead of being cut
    '.seg-pill', '.dia-pill', '.rpm-mode-pill', '.time-pill-btn', '.cdm2-act',
    '[data-fit]'
].join(', ');

const MIN_SCALE = 0.6;

export function fitOne(el) {
    el.style.removeProperty('font-size');
    const box = el.clientWidth;
    if (!box) return;
    const need = el.scrollWidth;
    if (need <= box + 1) return;
    const size = parseFloat(getComputedStyle(el).fontSize) || 16;
    // important: many of these sizes are set with !important in the stylesheets
    el.style.setProperty('font-size', `${Math.max(size * MIN_SCALE, Math.floor(size * (box / need) * 0.97 * 10) / 10)}px`, 'important');
}

// Reset all, then measure all, then write all: one re-layout for a long Bills list, not one per card.
export function fitAll(root = document) {
    const els = [...root.querySelectorAll(FIT_SELECTOR)];
    if (!els.length) return;
    // Some of these have `transition: all`; without this the font would animate back to full size
    // and we would measure the old small size and wrongly decide it fits.
    const oldTransition = els.map((el) => el.style.getPropertyValue('transition'));
    const oldPriority = els.map((el) => el.style.getPropertyPriority('transition'));
    els.forEach((el) => { el.style.setProperty('transition', 'none', 'important'); el.style.removeProperty('font-size'); });
    const sizes = els.map((el) => {
        const box = el.clientWidth;
        const need = el.scrollWidth;
        if (!box || need <= box + 1) return null;
        const size = parseFloat(getComputedStyle(el).fontSize) || 16;
        return Math.max(size * MIN_SCALE, Math.floor(size * (box / need) * 0.97 * 10) / 10);
    });
    els.forEach((el, i) => { if (sizes[i] != null) el.style.setProperty('font-size', `${sizes[i]}px`, 'important'); });
    void els[0].offsetWidth; // apply the new sizes now, while transitions are still off
    els.forEach((el, i) => {
        if (oldTransition[i]) el.style.setProperty('transition', oldTransition[i], oldPriority[i]);
        else el.style.removeProperty('transition');
    });
}

// Only narrow screens need this (a normal 360–412 px phone at normal font, tablets and desktops fit
// as designed), so wider screens do no work at all.
const NARROW = 420;
let queued = false;
let observer = null;

function run() {
    queued = false;
    if (window.innerWidth >= NARROW) {
        // turned wide (rotation / desktop): drop any sizes set earlier
        document.querySelectorAll(FIT_SELECTOR).forEach((el) => el.style.removeProperty('font-size'));
    } else {
        fitAll();
    }
    observer?.takeRecords(); // our own style changes must not trigger another pass
}

function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(run);
}

export function initFitText() {
    if (typeof window === 'undefined' || !window.MutationObserver || observer) return;
    // New rows, changed text, and tabs/popups being shown (class, style, hidden, open) trigger a re-fit.
    observer = new MutationObserver(() => { if (window.innerWidth < NARROW) schedule(); });
    observer.observe(document.body, {
        childList: true, subtree: true, characterData: true,
        attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open']
    });
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    document.fonts?.ready?.then(schedule);
    schedule();
}
