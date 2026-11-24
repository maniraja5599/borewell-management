// Changing a payment after a bill is paid, money received above the bill total, payments removed
// on one phone while another phone adds one, and advances in cash in hand.
import { describe, it, expect } from 'vitest';
import { computeBillTotals } from '../src/core/slabEngine.js';
import { PaymentsMixin } from '../src/features/payments/PaymentsMixin.js';
import { mergeBillPayments } from '../src/cloud/syncPlan.js';
import { collections, isCashPayment } from '../src/features/cash/cashMath.js';

const rates = { slabBufferFt: 5, oldBoreRate: 40, baseDrillingRate: 90, slabRates: null, pvc7Rate: 400, pvc10Rate: 700, boreBataRate: 2000, gstPercentage: 18 };
const base = {
    drillingType: 'new', docType: 'INVOICE', boreDia: '6.5"', totalDepth: 100, oldBoreDepth: 0, baseDrillingRate: 90,
    pvc7Length: 0, pvc10Length: 0, gstEnabled: false, collarCapCost: 0, transportSurveyCost: 0,
    customExtraAmount: 0, discountAmount: 0, advancePaidAmount: 0
};

function host() {
    const app = Object.create(PaymentsMixin.prototype);
    app.toLocalYMD = () => '2026-11-15';
    app.formatINR = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
    return app;
}
function bill(payments, over = {}) {
    const snap = computeBillTotals(rates, { ...base, ...over }); // 100 ft: 11,000
    return { id: 'b1', billDate: '2026-11-10', payments, snapshot: { ...snap } };
}

describe('editing a payment on a paid bill', () => {
    it('the payment being edited is free again in the balance check', () => {
        const app = host();
        const b = bill([
            { id: 'p1', date: '2026-11-11', amount: 6000, mode: 'Cash' },
            { id: 'p2', date: '2026-11-12', amount: 5000, mode: 'UPI' }
        ]);
        app.syncBillPaymentSnapshot(b);
        expect(app.getBillPendingAmount(b)).toBe(0);
        expect(app.getRecordPaymentRoom(b)).toBe(0);
        expect(app.getRecordPaymentRoom(b, 'p2')).toBe(5000);
        expect(app.getRecordPaymentRoom(b, 'p1')).toBe(6000);
    });

    it('counts the discount of the edited payment and of the others', () => {
        const app = host();
        const b = bill([
            { id: 'p1', amount: 6000, mode: 'Cash', discount: 1000 },
            { id: 'p2', amount: 4000, mode: 'UPI' }
        ]);
        app.syncBillPaymentSnapshot(b);
        expect(b.snapshot.grandTotal).toBe(10000);
        expect(app.getRecordPaymentRoom(b, 'p1')).toBe(11000 - 4000);
        expect(app.getRecordPaymentRoom(b, 'p2')).toBe(11000 - 7000);
    });
});

describe('more received than the bill total', () => {
    it('shows the extra instead of hiding it as paid', () => {
        const app = host();
        const b = bill([{ id: 'p1', amount: 11000, mode: 'Cash' }]);
        app.syncBillPaymentSnapshot(b);
        expect(app.getBillOverpaidAmount(b)).toBe(0);
        // Bill made smaller after it was paid: 100 ft → 50 ft (6,500).
        b.snapshot = { ...computeBillTotals(rates, { ...base, totalDepth: 50 }) };
        app.syncBillPaymentSnapshot(b);
        expect(app.getBillPendingAmount(b)).toBe(0);
        expect(app.getBillOverpaidAmount(b)).toBe(11000 - 6500);
    });

    it('a ₹0 final bill with nothing due is "paid", like the Bills list says', () => {
        const app = host();
        const b = bill([], { totalDepth: 0 });
        app.syncBillPaymentSnapshot(b);
        expect(b.snapshot.grandTotal).toBe(0);
        expect(b.paymentStatus).toBe('paid');
    });
});

describe('the bill editor advance box', () => {
    it('is locked once the bill has a payment other than its single advance', () => {
        const app = host();
        expect(app.billAdvanceFieldIsLocked({ payments: [] })).toBe(false);
        expect(app.billAdvanceFieldIsLocked({ payments: [{ id: 'adv_b1', isAdvance: true }] })).toBe(false);
        expect(app.billAdvanceFieldIsLocked({ payments: [{ id: 'p1', mode: 'Cash' }] })).toBe(true);
        expect(app.billAdvanceFieldIsLocked({ payments: [{ id: 'adv_b1', isAdvance: true }, { id: 'p1' }] })).toBe(true);
    });
});

describe('removed payments on sync', () => {
    const p0 = { id: 'p0', amount: 100, date: '2026-11-20' };
    const pGone = { id: 'pGone', amount: 500, date: '2026-11-21' };

    it('a payment removed on one phone is not brought back by the other phone', () => {
        const removedHere = { id: 'b1', payments: [p0], removedPaymentIds: ['pGone'] };
        const otherAdded = { id: 'b1', payments: [p0, pGone, { id: 'pNew', amount: 50, date: '2026-11-22' }] };
        const a = mergeBillPayments(removedHere, otherAdded);
        expect(a.payments.map((p) => p.id)).toEqual(['p0', 'pNew']);
        expect(a.removedPaymentIds).toEqual(['pGone']);
        // ...and the other way round.
        const b = mergeBillPayments(otherAdded, removedHere);
        expect(b.payments.map((p) => p.id)).toEqual(['p0', 'pNew']);
        expect(b.removedPaymentIds).toEqual(['pGone']);
    });

    it('the newest edit of the same payment wins', () => {
        const old = { id: 'b1', payments: [{ ...p0 }, { id: 'pX', amount: 9, date: '2026-11-23' }] };
        const edited = { id: 'b1', payments: [{ ...p0, amount: 150, editedAt: '2026-11-24T10:00:00Z' }] };
        expect(mergeBillPayments(old, edited).payments.find((p) => p.id === 'p0').amount).toBe(150);
        expect(mergeBillPayments(edited, old).payments.find((p) => p.id === 'p0').amount).toBe(150);
    });

    it('nothing new: no merge', () => {
        const mine = { id: 'b1', payments: [p0], removedPaymentIds: ['pGone'] };
        expect(mergeBillPayments(mine, { id: 'b1', payments: [p0, pGone] })).toBeNull();
        expect(mergeBillPayments(mine, mine)).toBeNull();
    });
});

describe('advance in cash in hand', () => {
    it('an advance with its taker counts as cash; one without a taker stays out', () => {
        const ME = { id: 'u-m', name: 'Murugan' };
        const bills = [{ id: 'b1', billNo: 'AB-1', custName: 'Selvam', payments: [
            { id: 'adv_b1', mode: 'Advance', isAdvance: true, amount: 5000, date: '2026-11-20', by: ME },
            { id: 'adv_old', mode: 'Advance', isAdvance: true, amount: 3000, date: '2026-11-20' },
            { id: 'p2', mode: 'UPI', amount: 2000, by: ME }
        ] }];
        expect(collections(bills, 'u-m').map((c) => [c.payId, c.amount])).toEqual([['adv_b1', 5000]]);
        expect(isCashPayment({ mode: 'UPI' })).toBe(false);
    });
});

import { paymentEditCheck, paymentEditSettings, paymentEnteredAt } from '../src/features/payments/paymentEditRules.js';

describe('who may change a payment, and until when', () => {
    const H = 3600000;
    const now = Date.parse('2026-11-24T18:00:00+05:30');
    const owner = { owner: true, bills: true };
    const staff = { owner: false, bills: true };
    const on24 = { staffPaymentEdit: { on: true, hours: 24 } };

    it('settings: off and 24 hours by default; bad hours fall back to 24', () => {
        expect(paymentEditSettings({})).toEqual({ on: false, hours: 24 });
        expect(paymentEditSettings({ staffPaymentEdit: { on: true, hours: 12 } })).toEqual({ on: true, hours: 12 });
        expect(paymentEditSettings({ staffPaymentEdit: { on: true, hours: -3 } }).hours).toBe(24);
    });

    it('entry time: createdAt, else the time in the id, else the payment date', () => {
        expect(paymentEnteredAt({ createdAt: '2026-11-24T10:00:00Z' })).toBe(Date.parse('2026-11-24T10:00:00Z'));
        expect(paymentEnteredAt({ id: 'pay_1763980000000_42' })).toBe(1763980000000);
        expect(paymentEnteredAt({ id: 'adv_1763980000000' })).toBe(1763980000000);
        expect(paymentEnteredAt({ id: 'x', date: '2026-11-23' })).toBe(new Date(2026, 10, 23).getTime());
        expect(Number.isNaN(paymentEnteredAt({ id: 'x' }))).toBe(true);
    });

    it('owner: any payment, any time', () => {
        expect(paymentEditCheck({ createdAt: '2020-01-01T00:00:00Z' }, owner, {}, now).ok).toBe(true);
    });

    it('staff: only when the owner allowed it', () => {
        const p = { createdAt: new Date(now - H).toISOString() };
        expect(paymentEditCheck(p, staff, {}, now).ok).toBe(false);
        expect(paymentEditCheck(p, staff, on24, now).ok).toBe(true);
        expect(paymentEditCheck(p, { owner: false, bills: false }, on24, now).ok).toBe(false);
    });

    it('staff: yesterday\'s entry is fine inside the window, not after it', () => {
        const yesterday = { createdAt: new Date(now - 20 * H).toISOString() };
        expect(paymentEditCheck(yesterday, staff, on24, now).ok).toBe(true);
        expect(paymentEditCheck(yesterday, staff, { staffPaymentEdit: { on: true, hours: 12 } }, now).ok).toBe(false);
        const old = { createdAt: new Date(now - 25 * H).toISOString() };
        const r = paymentEditCheck(old, staff, on24, now);
        expect(r.ok).toBe(false);
        expect(r.reason).toMatch(/24 hours/);
        expect(paymentEditCheck(old, staff, { staffPaymentEdit: { on: true, hours: 48 } }, now).ok).toBe(true);
    });
});
