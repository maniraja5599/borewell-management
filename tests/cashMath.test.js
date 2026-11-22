import { describe, it, expect } from 'vitest';
import {
    categories, addCategory, renameCategory, removeCategory, makeEntry, markReceived, undoReceived, cashEffect,
    collections, cashBook, holders, adoptLocalEntries, pendingHandovers, spendSummary, bunkNames, entryTitle, entryLine, DEFAULT_CATEGORIES
} from '../src/features/cash/cashMath.js';

const NOW = new Date('2026-11-22T10:00:00');
const MGR = { id: 'u-m', name: 'Ravi' };
const OWN = { id: 'u-o', name: 'Mani' };
const mk = (input, opts = {}) => {
    const r = makeEntry({ date: '2026-11-20', rigId: 'r1', ...input }, { me: MGR, now: NOW, ...opts });
    if (r.error) throw new Error(r.error);
    return r.entry;
};
const bill = (id, payments, rigId = 'r1') => ({ id, billNo: id, custName: 'Selvam', rigId, payments });

describe('categories', () => {
    it('defaults; owner adds, renames, removes; "other" and no "diesel"', () => {
        expect(categories({}).map((c) => c.key)).toEqual(['spares', 'food', 'bike', 'service', 'other']);
        expect(categories({ expenseCategories: [{ label: 'Tea' }, { key: 'diesel', label: 'Diesel' }, { label: 'Tea' }] })).toEqual([{ key: 'tea', label: 'Tea' }, { key: 'other', label: 'Other' }]);
        let list = categories({});
        list = addCategory(list, '  Staff   salary ').list;
        expect(list.at(-2)).toEqual({ key: 'staff_salary', label: 'Staff salary' }); // before "Other"
        expect(addCategory(list, 'food').error).toMatch(/already/);
        expect(addCategory(list, 'Diesel').error).toMatch(/own button/);
        expect(addCategory(list, '').error).toMatch(/name/);
        list = renameCategory(list, 'bike', 'Bike petrol').list;
        expect(list.find((c) => c.key === 'bike').label).toBe('Bike petrol');
        expect(renameCategory(list, 'bike', 'Food').error).toMatch(/already/);
        expect(removeCategory(list, 'other').error).toMatch(/stays/);
        expect(removeCategory(list, 'food').list.some((c) => c.key === 'food')).toBe(false);
    });
});

describe('entries', () => {
    it('expense: amount and category needed; label kept; paid by cash by default', () => {
        const e = mk({ type: 'expense', category: 'food', amount: '₹1,250', note: ' lunch  for crew ' });
        expect(e).toMatchObject({ type: 'expense', category: 'food', categoryLabel: 'Food', amount: 1250, paidBy: 'cash', holderId: 'u-m', holderName: 'Ravi', rigId: 'r1', note: 'lunch for crew' });
        expect(makeEntry({ type: 'expense', category: 'food', amount: '' }, { now: NOW }).error).toMatch(/amount/);
        expect(makeEntry({ type: 'expense', category: 'food', amount: -5 }, { now: NOW }).error).toMatch(/amount/);
        expect(makeEntry({ type: 'expense', category: 'nope', amount: 5 }, { now: NOW }).error).toMatch(/Choose/);
        expect(makeEntry({ type: 'expense', category: 'food', amount: 5, date: '2026-12-01' }, { now: NOW }).error).toMatch(/future/);
        expect(makeEntry({ type: 'expense', category: 'food', amount: 99999999 }, { now: NOW }).error).toMatch(/too big/);
    });

    it('an old entry keeps a category the owner has since removed', () => {
        const e = mk({ type: 'expense', category: 'bike', amount: 300 });
        const cats = removeCategory(DEFAULT_CATEGORIES, 'bike').list;
        const r = makeEntry({ type: 'expense', category: 'bike', amount: 350, rigId: 'r1' }, { existing: e, cats, now: NOW });
        expect(r.entry).toMatchObject({ id: e.id, category: 'bike', categoryLabel: 'Bike', amount: 350, holderId: 'u-m' });
    });

    it('diesel: litres × rate; vehicle diesel may have no price', () => {
        const d = mk({ type: 'diesel', litres: '50.5', rate: '92.456', bunk: ' IOC  Mohanur ' });
        expect(d).toMatchObject({ litres: 50.5, rate: 92.46, amount: Math.round(50.5 * 92.456), source: 'bunk', bunk: 'IOC Mohanur', paidBy: 'cash' });
        expect(makeEntry({ type: 'diesel', litres: 50 }, { now: NOW }).error).toMatch(/rate/);
        expect(makeEntry({ type: 'diesel', rate: 90 }, { now: NOW }).error).toMatch(/litres/);
        const v = mk({ type: 'diesel', litres: 20, source: 'vehicle', bunk: 'Lorry' });
        expect(v).toMatchObject({ amount: 0, rate: null, paidBy: null, source: 'vehicle' });
        expect(cashEffect(v)).toBe(0);
    });

    it('cash in from someone else needs a name; a changed type drops old fields', () => {
        expect(makeEntry({ type: 'in', amount: 500, from: 'other' }, { now: NOW }).error).toMatch(/Who/);
        const e = mk({ type: 'expense', category: 'food', amount: 100 });
        const r = makeEntry({ type: 'in', amount: 100, from: 'owner', rigId: 'r1' }, { existing: e, now: NOW }).entry;
        expect(r.category).toBeUndefined();
        expect(r.paidBy).toBeUndefined();
        expect(r.from).toBe('owner');
    });

    it('hand-over counts only after "Received"; a received one cannot be edited', () => {
        const h = mk({ type: 'handover', amount: 5000, to: 'owner' });
        expect(cashEffect(h)).toBe(0);
        const got = markReceived(h, OWN, NOW);
        expect(got).toMatchObject({ receivedById: 'u-o', receivedByName: 'Mani' });
        expect(cashEffect(got)).toBe(-5000);
        expect(makeEntry({ type: 'handover', amount: 10, rigId: 'r1' }, { existing: got, now: NOW }).error).toMatch(/Already received/);
        expect(cashEffect(undoReceived(got, NOW))).toBe(0);
        expect(entryLine(h)).toMatch(/waiting/);
        expect(entryLine(got)).toMatch(/received by Mani ✓/);
    });
});

describe('cash in hand', () => {
    const entries = [
        mk({ type: 'in', amount: 10000, from: 'owner' }),
        mk({ type: 'expense', category: 'food', amount: 500 }),
        mk({ type: 'expense', category: 'spares', amount: 2000, paidBy: 'upi' }), // not from cash
        mk({ type: 'diesel', litres: 40, rate: 90 }),                              // 3600 cash
        markReceived(mk({ type: 'handover', amount: 3000 }), OWN, NOW),
        mk({ type: 'handover', amount: 1000, date: '2026-11-21' }),                // pending
        makeEntry({ type: 'expense', category: 'food', amount: 50, date: '2026-11-20' }, { me: OWN, now: NOW }).entry,
        { ...mk({ type: 'in', amount: 99999 }), deleted: true }
    ];
    const bills = [
        bill('AB-1', [{ id: 'p1', mode: 'Cash', amount: 7000, date: '2026-11-21', by: MGR }, { id: 'p2', mode: 'UPI', amount: 9000, by: MGR }]),
        bill('AB-2', [{ id: 'p3', mode: 'Cash', amount: 4000, by: OWN }, { id: 'p4', mode: 'Cash', amount: 100 }]),
        { id: 'x' }, null
    ];

    it('collections: only cash payments this person took', () => {
        expect(collections(bills, 'u-m')).toEqual([{ billId: 'AB-1', billNo: 'AB-1', custName: 'Selvam', date: '2026-11-21', amount: 7000, rigId: 'r1', payId: 'p1' }]);
    });

    it('balance = in + collected − cash spent − received hand-overs', () => {
        const b = cashBook(entries, bills, 'u-m');
        expect(b).toMatchObject({ received: 10000, collected: 7000, spent: 4100, handedOver: 3000, pending: 1000, pendingCount: 1 });
        expect(b.balance).toBe(10000 + 7000 - 500 - 3600 - 3000);
        expect(b.lines[0].date).toBe('2026-11-21');
        expect(b.lines.length).toBe(7);
    });

    it('everyone holding cash, and the hand-overs waiting for a tick', () => {
        const h = holders(entries, bills, { id: 'u-new', name: 'New' });
        expect(h.map((x) => [x.name, x.balance])).toEqual([['Mani', 3950], ['Ravi', 9900], ['New', 0]].sort((a, b) => b[1] - a[1]));
        expect(h.find((x) => x.id === 'u-m').pending).toBe(1000);
        expect(pendingHandovers(entries).map((e) => e.amount)).toEqual([1000]);
        expect(pendingHandovers(entries, { to: 'office' })).toEqual([]);
    });

    it('spend summary by rig / office / period, with diesel litres and average rate', () => {
        const all = [...entries,
            mk({ type: 'diesel', litres: 60, rate: 95, rigId: 'r2', date: '2026-11-01' }),
            mk({ type: 'diesel', litres: 10, source: 'vehicle', rigId: 'r2', date: '2026-11-02' }),
            makeEntry({ type: 'expense', category: 'other', amount: 80, rigId: null, date: '2026-10-30' }, { me: OWN, now: NOW }).entry];
        const r1 = spendSummary(all, { rigId: 'r1' });
        expect(r1.total).toBe(500 + 2000 + 3600); // the owner's ₹50 has no rig = office
        expect(r1.byCategory[0]).toMatchObject({ key: 'diesel', amount: 3600 });
        const r2 = spendSummary(all, { rigId: 'r2' });
        expect(r2.diesel).toEqual({ litres: 70, amount: 5700, rate: 95, count: 2 });
        expect(spendSummary(all, { rigId: 'office' }).total).toBe(80 + 50);
        expect(spendSummary(all, { start: '2026-11-01', end: '2026-11-30' }).total).toBe(6150 + 5700);
    });

    it('bunk names, most used first; titles', () => {
        const list = [mk({ type: 'diesel', litres: 1, rate: 90, bunk: 'IOC Mohanur' }), mk({ type: 'diesel', litres: 1, rate: 90, bunk: 'ioc mohanur' }), mk({ type: 'diesel', litres: 1, rate: 90, bunk: 'HP Namakkal' })];
        expect(bunkNames(list)).toEqual(['IOC Mohanur', 'HP Namakkal']);
        expect(entryTitle(list[0])).toBe('Diesel · 1 L');
        expect(entryLine(list[0])).toBe('₹90.00/L · IOC Mohanur');
        expect(entryTitle(mk({ type: 'in', amount: 5, from: 'other', fromName: 'Kumar' }))).toBe('Cash received from Kumar');
        expect(entryTitle(mk({ type: 'handover', amount: 5, to: 'office', toName: 'Priya' }))).toBe('Handed to office (Priya)');
    });
});

describe('signed in after making entries', () => {
    it('entries of "Me" become the signed-in owner’s; nothing to do otherwise', () => {
        const local = makeEntry({ type: 'expense', category: 'food', amount: 100, rigId: 'r1' }, { now: NOW }).entry;
        expect(local.holderId).toBe('me');
        const other = mk({ type: 'expense', category: 'food', amount: 50 });
        const next = adoptLocalEntries([local, other], MGR, NOW);
        expect(next.map((e) => e.holderId)).toEqual(['u-m', 'u-m']);
        expect(next[0].holderName).toBe('Ravi');
        expect(next[1]).toBe(other);
        expect(adoptLocalEntries([other], MGR, NOW)).toBeNull();
        expect(adoptLocalEntries([local], { id: 'me', name: 'Me' }, NOW)).toBeNull();
    });
});
