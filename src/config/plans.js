// Subscription display settings. The database never stores a price; this is what the app shows.
// Set pricePerRigMonthlyInr once the price is decided (null = "contact us" only).
export const PLANS = {
    pricePerRigMonthlyInr: null,
    trialDays: 30,
    // Renewals are activated by hand for now (see docs/MULTI_RIG_ROLES_DESIGN.md → Subscription).
    supportWhatsApp: '918300030123'
};

/**
 * Free Early Access: every feature is free for everyone until `freeUntil` (end of that day, IST).
 * After it, billing on one phone stays free; Cloud sync, staff and more rigs become paid per rig.
 * People who join before the end keep `foundingDiscountPct` off for as long as they subscribe.
 * The server gives every rig a trial that lasts at least until the same date (0003).
 */
export const EARLY_ACCESS = {
    freeUntil: '2027-03-31',
    foundingDiscountPct: 50
};

const earlyAccessEnd = () => Date.parse(`${EARLY_ACCESS.freeUntil}T23:59:59+05:30`);

/** Is Free Early Access still on? */
export function isEarlyAccess(now = Date.now()) {
    return now <= earlyAccessEnd();
}

/** Whole days of Free Early Access left, counting today (0 once it has ended). */
export function earlyAccessDaysLeft(now = Date.now()) {
    if (now > earlyAccessEnd()) return 0;
    // calendar days in India time: on 31 March it is 1 (today), on 30 March 2
    const istDay = (t) => Math.floor((t + 5.5 * 3600e3) / 864e5);
    return istDay(earlyAccessEnd()) - istDay(now) + 1;
}

/** "31 March 2027" */
export function earlyAccessEndLabel() {
    return new Date(earlyAccessEnd()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

/** Short line for the setup wizard and Settings. */
export function earlyAccessLine() {
    return `Free Early Access — every feature is free until ${earlyAccessEndLabel()}.`;
}

/** What happens after Early Access, in one sentence. */
export function earlyAccessAfterLine() {
    return `After that, billing on your phone stays free. Cloud sync, staff and extra rigs will be a small monthly fee per rig — people who join now get ${EARLY_ACCESS.foundingDiscountPct}% off for life.`;
}

/** WhatsApp link the owner taps to renew a rig. */
export function renewLink({ companyName, rigName, rigId }) {
    const text = `Hi, I want to renew DrillRig for my rig.\nCompany: ${companyName || '-'}\nRig: ${rigName || '-'}\nRig ID: ${String(rigId || '').slice(0, 8)}`;
    return `https://wa.me/${PLANS.supportWhatsApp}?text=${encodeURIComponent(text)}`;
}

/** "83000 30123": the DrillRig WhatsApp number as printed on bills. */
export function supportWhatsAppDisplay() {
    const d = PLANS.supportWhatsApp.replace(/^91/, '');
    return `${d.slice(0, 5)} ${d.slice(5)}`;
}

/** WhatsApp link on the "Made with DrillRig" line at the bottom of every bill. */
/** WhatsApp link a user taps on a "Coming soon" tile: tells the team which feature they want. */
export function comingSoonVoteLink(featureTitle) {
    const text = `Hi DrillRig team, I want ${featureTitle} in DrillRig. Please tell me when it is ready.`;
    return `https://wa.me/${PLANS.supportWhatsApp}?text=${encodeURIComponent(text)}`;
}

export function billFooterEnquiryLink() {
    const text = 'Hi DrillRig team, I saw DrillRig on a borewell bill. I want to use it for my rig.';
    return `https://wa.me/${PLANS.supportWhatsApp}?text=${encodeURIComponent(text)}`;
}
