// Who may change a saved payment (✏️ in Payments), and until when.
//
// Owner (and single-user mode): any payment, any time.
// Staff with "bills": only when the owner turned on "Staff can change payments" (Team page),
// and only for a payment entered within the last N hours (owner sets N; 24 by default).
// The setting lives in the company settings (brand.staffPaymentEdit) so every phone gets it.
// Pure functions: no DOM, no storage.

export const PAYMENT_EDIT_HOUR_CHOICES = [6, 12, 24, 48, 72];
export const DEFAULT_PAYMENT_EDIT_HOURS = 24;

/** { on, hours } from the company settings; off and 24 hours when never set. */
export function paymentEditSettings(brand) {
    const s = brand && typeof brand.staffPaymentEdit === 'object' && brand.staffPaymentEdit ? brand.staffPaymentEdit : {};
    const h = Math.round(Number(s.hours));
    return {
        on: s.on === true,
        hours: Number.isFinite(h) && h >= 1 && h <= 720 ? h : DEFAULT_PAYMENT_EDIT_HOURS
    };
}

/**
 * When the payment was entered (ms). New payments carry createdAt; older ones have the time in
 * their id (pay_<ms>_.., adv_<ms>); otherwise the start of the payment's date.
 */
export function paymentEnteredAt(p) {
    const at = Date.parse(p?.createdAt || '');
    if (Number.isFinite(at)) return at;
    const m = /^(?:pay|adv)_(\d{13})(?:_|$)/.exec(String(p?.id || ''));
    if (m) return Number(m[1]);
    const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(p?.date || ''));
    if (d) return new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3])).getTime();
    return NaN;
}

/**
 * May this person change this payment now?
 * who: { owner: boolean, bills: boolean } · returns { ok, reason, until }
 */
export function paymentEditCheck(p, who, brand, now = Date.now()) {
    if (who?.owner) return { ok: true, reason: '', until: null };
    if (!who?.bills) return { ok: false, reason: 'Ask the owner for "Make bills & take payments".', until: null };
    const s = paymentEditSettings(brand);
    if (!s.on) return { ok: false, reason: 'Only the owner can change payments. The owner can allow it in Team.', until: null };
    const at = paymentEnteredAt(p);
    if (!Number.isFinite(at)) return { ok: false, reason: 'Only the owner can change this payment.', until: null };
    const until = at + s.hours * 3600000;
    if (now > until) return { ok: false, reason: `Payments can be changed for ${s.hours} hours after entry. Ask the owner.`, until };
    return { ok: true, reason: '', until };
}
