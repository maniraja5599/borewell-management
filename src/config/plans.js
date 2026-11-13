// Subscription display settings. The database never stores a price; this is what the app shows.
// Set pricePerRigMonthlyInr once the price is decided (null = "contact us" only).
export const PLANS = {
    pricePerRigMonthlyInr: null,
    trialDays: 30,
    // Renewals are activated by hand for now (see docs/MULTI_RIG_ROLES_DESIGN.md → Subscription).
    supportWhatsApp: '918300030123'
};

/** WhatsApp link the owner taps to renew a rig. */
export function renewLink({ companyName, rigName, rigId }) {
    const text = `Hi, I want to renew DrillRig for my rig.\nCompany: ${companyName || '-'}\nRig: ${rigName || '-'}\nRig ID: ${String(rigId || '').slice(0, 8)}`;
    return `https://wa.me/${PLANS.supportWhatsApp}?text=${encodeURIComponent(text)}`;
}
