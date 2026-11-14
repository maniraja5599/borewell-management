// Demo company data (12 customers, 22 bills over 75 days) priced by the real billing engine.
// Used by the report walkthrough; also handy to load a realistic demo into a local, signed-out copy.
import { computeBillTotals } from '../src/core/slabEngine.js';
import { ratesForSnapshot } from '../src/core/billRates.js';

const clone = (v) => JSON.parse(JSON.stringify(v));
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const DEMO_CUSTOMERS = [
    ['Ravi Kumar', '9876543210', 'Salem'], ['Lakshmi Narayanan', '9443012345', 'Rasipuram'], ['Senthil Murugan', '9842011223', 'Namakkal'],
    ['Kavitha Rajendran', '9790055667', 'Tiruchengode'], ['Arumugam P', '9600122334', 'Paramathi'], ['Selvi Ganesan', '9944033445', 'Mohanur'],
    ['Sri Balaji Farms', '9488044556', 'Erode'], ['Manikandan R', '9566077889', 'Attur'], ['Divya Textiles', '9025088990', 'Komarapalayam'],
    ['Muthusamy K', '9361099001', 'Sendamangalam'], ['Prakash Poultry Farm', '9894010203', 'Velur'], ['Anitha S', '9751020304', 'Valavanthi']
];

// [cust, daysAgo, type, depth, oldDepth, p7, p10, collar, transport, discount, gstin, doc, advance, [[daysAfter, amount|'full', mode]], hardRock]
const BILLS = [
    [0, 74, 'new', 450, 0, 60, 20, 1500, 0, 1000, '', 'I', 20000, [[10, 'full', 'UPI']]],
    [1, 70, 'new', 600, 0, 80, 20, 1500, 800, 0, '', 'I', 30000, [[15, 'full', 'Cash']]],
    [2, 66, 'repair', 500, 250, 0, 0, 0, 0, 0, '', 'I', 0, [[3, 'full', 'UPI']]],
    [6, 61, 'new', 800, 0, 100, 40, 2000, 1500, 2000, '33AABFS4321K1Z2', 'I', 50000, [[20, 60000, 'Bank'], [40, 'full', 'Bank']], true],
    [3, 57, 'new', 350, 0, 40, 20, 1500, 0, 500, '', 'I', 15000, [[12, 'full', 'UPI']]],
    [4, 52, 'new', 700, 0, 90, 20, 1500, 1000, 0, '', 'I', 25000, [[14, 30000, 'Cash']]],
    [7, 48, 'new', 900, 0, 120, 40, 2000, 1500, 0, '', 'Q', 0, []],
    [5, 45, 'new', 400, 0, 50, 20, 1500, 0, 0, '', 'I', 10000, [[9, 'full', 'Cheque']]],
    [8, 41, 'new', 650, 0, 80, 20, 1500, 0, 1500, '33AAKFD7788M1Z9', 'I', 40000, [[20, 'full', 'Bank']]],
    [9, 36, 'repair', 450, 300, 0, 0, 0, 500, 0, '', 'I', 0, []],
    [10, 32, 'new', 550, 0, 70, 20, 1500, 0, 0, '', 'I', 20000, [[10, 15000, 'UPI']]],
    [11, 28, 'new', 400, 0, 50, 20, 1500, 0, 0, '', 'Q', 0, []],
    [0, 25, 'repair', 600, 450, 0, 0, 0, 0, 0, '', 'I', 5000, [[5, 'full', 'UPI']]],
    [7, 22, 'new', 900, 0, 120, 40, 2000, 1500, 3000, '', 'I', 50000, [[10, 40000, 'Bank']], true],
    [2, 18, 'new', 500, 0, 60, 20, 1500, 0, 0, '', 'I', 20000, [[7, 'full', 'Cash']]],
    [1, 14, 'new', 300, 0, 40, 20, 1500, 0, 0, '', 'I', 0, []],
    [4, 10, 'new', 750, 0, 100, 20, 1500, 1000, 0, '', 'Q', 0, []],
    [3, 7, 'new', 480, 0, 60, 20, 1500, 0, 500, '', 'I', 25000, []],
    [5, 4, 'repair', 350, 200, 0, 0, 0, 0, 0, '', 'I', 0, [[2, 'full', 'UPI']]],
    [10, 2, 'new', 620, 0, 80, 20, 1500, 800, 0, '', 'I', 30000, []],
    [8, 0, 'new', 520, 0, 60, 20, 1500, 0, 0, '', 'I', 20000, []],
    [11, 0, 'new', 450, 0, 60, 20, 1500, 0, 0, '', 'Q', 0, []]
];

/**
 * @param {object} p
 * @param {object} p.std    standard rate card ({ rates })
 * @param {object} p.hard   hard-rock rate card ({ rates })
 * @param {(raw: string) => string} p.phone  the app's phone formatter
 * @param {Date} [p.now]
 */
export function buildDemo({ std, hard, phone, now = new Date() }) {
    const day = (ago) => { const d = new Date(now); d.setHours(10, 0, 0, 0); d.setDate(d.getDate() - ago); return d; };
    const end = new Date(now); end.setHours(23, 59, 0, 0);
    const customers = DEMO_CUSTOMERS.map(([name, ph, village], i) => ({
        id: `cust_demo_${i + 1}`, name, phone: phone(ph), countryCode: '+91', village, sites: [],
        createdAt: day(76 - i).toISOString(), updatedAt: day(76 - i).toISOString()
    }));
    let inv = 101;
    let quo = 101;
    const history = BILLS.map(([ci, ago, type, depth, old, p7, p10, collar, transport, disc, gstin, doc, adv, pays, isHard], i) => {
        const rates = clone((isHard ? hard : std).rates);
        const c = customers[ci];
        const docType = doc === 'I' ? 'INVOICE' : 'QUOTATION';
        const res = computeBillTotals(rates, {
            drillingType: type, docType, boreDia: '6.5"', totalDepth: depth, oldBoreDepth: old, baseDrillingRate: rates.baseDrillingRate,
            pvc7Length: p7, pvc10Length: p10, gstEnabled: !!gstin, custGst: gstin, collarCapCost: collar, transportSurveyCost: transport,
            customExtraLabel: '', customExtraAmount: 0, customNote: '', discountAmount: disc, advancePaidAmount: docType === 'INVOICE' ? adv : 0
        });
        const billDate = day(ago);
        const id = String(billDate.getTime() + i * 60000);
        const payments = [];
        let paid = 0;
        if (docType === 'INVOICE') {
            if (adv > 0) { payments.push({ id: 'adv_' + id, date: ymd(billDate), amount: adv, mode: 'Advance', note: 'Initial Advance on Bill', isAdvance: true }); paid = adv; }
            pays.forEach(([after, amt, mode], k) => {
                const d = new Date(billDate); d.setDate(d.getDate() + after);
                if (d > end) return;
                const amount = amt === 'full' ? res.grandTotal - paid : Math.min(amt, res.grandTotal - paid);
                if (amount <= 0) return;
                paid += amount;
                payments.push({ id: `pay_${id}_${k}`, date: ymd(d), amount, mode, note: '' });
            });
        }
        const snapshot = { ...clone(res), rates: ratesForSnapshot(rates) };
        const rec = {
            id, createdAt: new Date(billDate.getTime() + i * 60000).toISOString(),
            billNo: docType === 'INVOICE' ? `SM-${inv++}` : `SM-Q${quo++}`, billDate: ymd(billDate),
            custName: c.name, custPhone: c.phone, custLocation: c.village, custGst: gstin, customerId: c.id, payments, snapshot
        };
        if (docType === 'INVOICE') { // same as PaymentsMixin.syncBillPaymentSnapshot
            snapshot.advancePaidAmount = paid;
            snapshot.balancePayable = Math.max(0, snapshot.grandTotal - paid);
            rec.paymentStatus = snapshot.balancePayable <= 0 && snapshot.grandTotal > 0 ? 'paid' : 'unpaid';
        }
        return rec;
    }).reverse();
    return { customers, history, nextBillSeq: inv, nextQuoteSeq: quo };
}
