import { describe, it, expect } from 'vitest';
import { describeActivity, activityTime } from '../src/cloud/activity.js';

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
});
