// "Other items" in the casing section, and discount given while recording a payment.
// The payment discount lowers grandTotal, so every screen that shows billed / received / due
// (grandTotal − sum of payment amounts) stays in step without its own discount logic.
import { describe, it, expect } from 'vitest';
import { computeBillTotals, normalizeExtraItems } from '../src/core/slabEngine.js';
import { PaymentsMixin } from '../src/features/payments/PaymentsMixin.js';
import { dueOf, paidOf, totalOf } from '../src/features/report/reportMath.js';

const rates = { slabBufferFt: 5, oldBoreRate: 40, baseDrillingRate: 90, slabRates: null, pvc7Rate: 400, pvc10Rate: 700, boreBataRate: 2000, gstPercentage: 18 };
const base = {
    drillingType: 'new', docType: 'INVOICE', boreDia: '6.5"', totalDepth: 0, oldBoreDepth: 0, baseDrillingRate: 90,
    pvc7Length: 0, pvc10Length: 0, gstEnabled: false, collarCapCost: 0, transportSurveyCost: 0,
    customExtraAmount: 0, discountAmount: 0, advancePaidAmount: 0
};

describe('other items next to the casing pipes', () => {
    it('amount = qty × rate, or the rate alone when there is no qty; empty rows are dropped', () => {
        const items = normalizeExtraItems([
            { id: 'a', name: '8" MS pipe', qty: 40, unit: 'ft', rate: 550 },
            { id: 'b', name: 'Motor fitting', qty: '', unit: 'nos', rate: 1500 },
            { id: 'c', name: 'Half typed', qty: 10, unit: 'ft', rate: '' },
            { id: 'd', name: '', qty: 2, unit: 'bogus', rate: 300 }
        ]);
        expect(items.map((i) => [i.name, i.unit, i.amount])).toEqual([
            ['8" MS pipe', 'ft', 22000], ['Motor fitting', 'nos', 1500], ['Other item', 'ft', 600]
        ]);
    });

    it('items count towards the bill (and start the bore bata like pipes do)', () => {
        const r = computeBillTotals(rates, { ...base, extraItems: [{ id: 'a', name: 'MS pipe', qty: 40, unit: 'ft', rate: 550 }] });
        expect(r.extraItemsCost).toBe(22000);
        expect(r.boreBataCost).toBe(2000);
        expect(r.grossSubtotal).toBe(24000);
        expect(r.grandTotal).toBe(24000);
        expect(r.extraItems).toHaveLength(1);
    });

    it('GST and the bill discount apply to items too', () => {
        const r = computeBillTotals(rates, { ...base, gstEnabled: true, discountAmount: 1000, extraItems: [{ id: 'a', name: 'Cap', qty: 0, rate: 9000 }] });
        expect(r.grossSubtotal).toBe(11000);           // 9,000 item + 2,000 bata
        expect(r.gstAmount).toBe(Math.round(10000 * 0.18));
        expect(r.grandTotal).toBe(10000 + 1800);
    });
});

describe('payment discount in the bill engine', () => {
    it('comes off after GST and never below zero', () => {
        const r = computeBillTotals(rates, { ...base, totalDepth: 100, gstEnabled: true, paymentDiscount: 500 });
        // 100 ft × 90 = 9,000 + 2,000 bata = 11,000; GST 1,980 → 12,980; − 500
        expect(r.totalBeforePaymentDiscount).toBe(12980);
        expect(r.paymentDiscount).toBe(500);
        expect(r.grandTotal).toBe(12480);
        const big = computeBillTotals(rates, { ...base, totalDepth: 100, paymentDiscount: 999999 });
        expect(big.grandTotal).toBe(0);
        expect(big.paymentDiscount).toBe(11000);
    });
});

/** A bill object as the app stores it, plus the mixin's methods on a tiny host. */
function host() {
    const app = Object.create(PaymentsMixin.prototype);
    app.toLocalYMD = () => '2026-11-15';
    app.formatINR = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
    return app;
}
function invoice(total, payments) {
    const snap = computeBillTotals(rates, { ...base, totalDepth: 100 }); // 11,000
    expect(snap.grandTotal).toBe(total);
    return { id: 'b1', billDate: '2026-11-10', payments, snapshot: { ...snap } };
}

describe('recording a payment with a discount', () => {
    it('balance drops by payment + discount; received counts only the money', () => {
        const app = host();
        const bill = invoice(11000, [{ id: 'p1', date: '2026-11-11', amount: 8000, mode: 'Cash', discount: 3000 }]);
        app.syncBillPaymentSnapshot(bill);
        expect(bill.snapshot.grandTotal).toBe(8000);
        expect(bill.snapshot.totalBeforePaymentDiscount).toBe(11000);
        expect(bill.snapshot.paymentDiscount).toBe(3000);
        expect(app.getBillPaidAmount(bill)).toBe(8000);
        expect(app.getBillPendingAmount(bill)).toBe(0);
        expect(bill.paymentStatus).toBe('paid');
        // The report reads the same numbers: billed = received + due.
        expect(totalOf(bill)).toBe(8000);
        expect(paidOf(bill)).toBe(8000);
        expect(dueOf(bill)).toBe(0);
    });

    it('syncing again, removing the discounted payment, or a discount-only entry all land right', () => {
        const app = host();
        const bill = invoice(11000, [{ id: 'p1', date: '2026-11-11', amount: 5000, mode: 'Cash' }]);
        app.syncBillPaymentSnapshot(bill);
        expect(app.getBillPendingAmount(bill)).toBe(6000);

        bill.payments.push({ id: 'p2', date: '2026-11-12', amount: 0, mode: 'Discount', discount: 1000 });
        app.syncBillPaymentSnapshot(bill);
        app.syncBillPaymentSnapshot(bill); // idempotent
        expect(bill.snapshot.grandTotal).toBe(10000);
        expect(app.getBillPaidAmount(bill)).toBe(5000);
        expect(app.getBillPendingAmount(bill)).toBe(5000);

        bill.payments.pop();
        app.syncBillPaymentSnapshot(bill);
        expect(bill.snapshot.grandTotal).toBe(11000);
        expect(bill.snapshot.paymentDiscount).toBe(0);
        expect(app.getBillPendingAmount(bill)).toBe(6000);
    });

    it('editing the bill later keeps its payment discount (fresh snapshot from the editor)', () => {
        const app = host();
        const payments = [{ id: 'p1', date: '2026-11-11', amount: 4000, mode: 'UPI', discount: 1000 }];
        // Editor state carries paymentDiscount from the saved bill; depth changed 100 → 200 ft.
        const edited = computeBillTotals(rates, { ...base, totalDepth: 200, paymentDiscount: 1000 });
        const bill = { id: 'b1', payments, snapshot: { ...edited } };
        app.syncBillPaymentSnapshot(bill);
        expect(bill.snapshot.totalBeforePaymentDiscount).toBe(200 * 90 + 2000);
        expect(bill.snapshot.grandTotal).toBe(20000 - 1000);
        expect(app.getBillPendingAmount(bill)).toBe(19000 - 4000);
    });

    it('describes entries for the payment lists', () => {
        const app = host();
        expect(app.describePaymentEntry({ amount: 30000, discount: 5000 })).toBe('₹30,000 + ₹5,000 discount');
        expect(app.describePaymentEntry({ amount: 0, discount: 2000 })).toBe('Discount ₹2,000');
        expect(app.describePaymentEntry({ amount: 7000 })).toBe('₹7,000');
    });
});
