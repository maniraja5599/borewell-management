import { describe, it, expect } from 'vitest';
import { describeActivity, activityTime, activityDetails } from '../src/cloud/activity.js';

const e = (action, summary, extra = {}) => ({ kind: 'bill', record_id: 'b1', action, actor_name: 'Murugan', actor_is_me: false, summary, ...extra });

describe('activity log wording', () => {
    it('bill lifecycle', () => {
        expect(describeActivity(e('create', { billNo: 'SM-121', total: 50000 }))).toBe('Murugan created bill #SM-121 (₹50,000)');
        expect(describeActivity(e('update', { billNo: 'SM-121', total: 52000, prevTotal: 50000 })))
            .toBe('Murugan edited bill #SM-121: total ₹50,000 → ₹52,000');
        expect(describeActivity(e('update', { billNo: 'SM-121', paid: 10000, prevPaid: 0 })))
            .toBe('Murugan recorded a payment on bill #SM-121: paid ₹0 → ₹10,000');
        expect(describeActivity(e('update', { billNo: 'SM-121', paid: 0, prevPaid: 10000 })))
            .toBe('Murugan changed payments on bill #SM-121: paid ₹10,000 → ₹0');
        expect(describeActivity(e('update', { billNo: 'SM-121' }))).toBe('Murugan edited bill #SM-121');
        expect(describeActivity(e('delete', { billNo: 'SM-121' }, { actor_is_me: true }))).toBe('You deleted bill #SM-121');
        expect(describeActivity(e('restore', { billNo: 'SM-Q5', docType: 'QUOTATION' }))).toBe('Murugan restored quotation #SM-Q5');
    });

    it('customers and settings', () => {
        expect(describeActivity({ kind: 'customer', action: 'create', actor_name: 'Kumar', summary: { name: 'Ravi' } })).toBe('Kumar added customer Ravi');
        expect(describeActivity({ kind: 'setting', action: 'update', actor_name: 'Mani', summary: { setting: 'rates' } })).toBe('Mani changed the rates');
    });

    it('never throws on missing data', () => {
        expect(describeActivity({})).toContain('Someone');
        expect(describeActivity(null)).toContain('Someone');
        expect(activityTime('not a date')).toBe('');
    });

    it('money and other kinds read in plain words', () => {
        const a = (kind, action, summary, extra = {}) => ({ kind, action, actor_name: 'Ravi', actor_is_me: false, summary, ...extra });
        expect(describeActivity(a('cash', 'create', { type: 'expense', amount: 900, category: 'food' }))).toBe('Ravi added expense ₹900 (food)');
        expect(describeActivity(a('cash', 'delete', { type: 'diesel', amount: 9500 }, { actor_is_me: true }))).toBe('You deleted diesel ₹9,500');
        expect(describeActivity(a('inv', 'create', { t: 'vpay', amount: 5000 }))).toBe('Ravi added vendor payment ₹5,000');
        expect(describeActivity(a('breakdown', 'create', { reason: 'compressor' }))).toBe('Ravi reported a breakdown (compressor)');
        expect(describeActivity(a('vehicle', 'update', { name: 'TN 45 AB 1234' }))).toBe('Ravi edited vehicle TN 45 AB 1234');
    });

    it('old → new details (0020)', () => {
        const d = activityDetails({ kind: 'bill', summary: {
            payAdded: [{ amount: 5000, mode: 'Cash', by: 'Ravi' }],
            payRemoved: [{ amount: 500, mode: 'UPI' }],
            payChanged: [{ id: 'p1', changes: [{ f: 'amount', from: 20000, to: 15000 }, { f: 'mode', from: 'Cash', to: 'UPI' }] }],
            changes: [{ f: 'snapshot.discountAmount', from: 0, to: 1000 }, { f: 'approval.status', from: 'pending', to: 'rejected' }, { f: 'receivedAt', from: null, to: '2026-11-26T10:00:00Z' }]
        } });
        expect(d).toEqual([
            'Payment ₹5,000 Cash added (Ravi)',
            'Payment ₹500 UPI removed',
            'Payment changed: Amount ₹20,000 → ₹15,000, Mode Cash → UPI',
            'Discount ₹0 → ₹1,000',
            'Approval pending → rejected',
            'Received no → yes'
        ]);
        expect(activityDetails({ summary: {} })).toEqual([]);
        expect(activityDetails(null)).toEqual([]);
    });
});
