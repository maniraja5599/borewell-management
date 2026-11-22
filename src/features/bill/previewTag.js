// The fixed bar at the top of New Bill ("FINAL BILL · ₹1,25,000"): tapping it opens the bill
// preview, exactly like the "Preview" button at the bottom. Once the bill has an amount, the tag
// shows an eye and pulses a few times so people notice it can be tapped (once per bill; no motion
// when the phone asks for reduced motion — CSS).
export function initPreviewTag(app) {
    const top = document.querySelector('#stickyLiveBar .live-bar-top');
    const tag = document.getElementById('stickyDocTypeTag');
    if (!top || !tag || !app) return;
    top.classList.add('is-preview-link');
    top.setAttribute('role', 'button');
    top.setAttribute('tabindex', '0');
    top.setAttribute('aria-label', 'Show the bill preview');
    const open = () => {
        if (app.isBillPreviewOpen) {
            document.getElementById('billReceiptPreviewWrapper')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        const btn = document.getElementById('openBillPreviewBtn');
        if (btn && btn.offsetParent !== null) { btn.click(); return; }
        // Not ready yet: say what is missing and go there.
        const name = (document.getElementById('custName')?.value || app.state?.custName || '').trim();
        const site = (document.getElementById('custLocation')?.value || app.state?.custLocation || '').trim();
        const missing = !name ? ['quickCustSearchInput', 'the customer'] : !site ? ['custLocation', 'the village / site'] : ['totalDepth', 'the drilling depth'];
        app.showToast?.(`To see the bill, first add ${missing[1]}.`);
        const target = document.getElementById(missing[0]);
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => target?.focus(), 350);
    };
    top.addEventListener('click', open);
    top.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });

    let pulsedFor = null;
    const billKey = () => app.loadedHistoryBillId || `new:${app.state?.custName || ''}`;
    const sync = () => {
        const total = Number(String(document.getElementById('liveTotalBannerAmount')?.textContent || '').replace(/[^\d]/g, '')) || 0;
        const ready = total > 0;
        tag.classList.toggle('has-preview', ready);
        if (ready && pulsedFor !== billKey()) {
            pulsedFor = billKey();
            tag.classList.remove('is-pulsing');
            void tag.offsetWidth; // restart the animation
            tag.classList.add('is-pulsing');
        }
        if (!ready) pulsedFor = null;
    };
    tag.addEventListener('animationend', () => tag.classList.remove('is-pulsing'));
    const orig = app.calculateAndRender?.bind(app);
    if (orig) app.calculateAndRender = (...args) => { const r = orig(...args); try { sync(); } catch { /* ignore */ } return r; };
    sync();
}
