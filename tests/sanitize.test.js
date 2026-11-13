import { describe, it, expect } from 'vitest';
import { neutralize, sanitizeEntry, sanitizeList, sanitizeRecordData, isSafeId } from '../src/data/sanitize.js';
import { cleanPulledRows } from '../src/cloud/sync.js';

describe('sanitize: data from backups and other phones', () => {
    it('keeps normal ids and rejects ids that could break out of an HTML attribute', () => {
        expect(isSafeId('cust_1699999_0_123')).toBe(true);
        expect(isSafeId(1731500000000)).toBe(true);
        expect(isSafeId('x" onmouseover="alert(1)')).toBe(false);
        expect(isSafeId('')).toBe(false);
        expect(isSafeId(NaN)).toBe(false);
    });

    it('neutralises tags in every string but keeps the text readable', () => {
        const out = neutralize({ custName: '<img src=x onerror=alert(1)>Ravi', snapshot: { boreDia: '<b>6.5"</b>', totalDepth: 300 } });
        expect(out.custName).toBe('‹img src=x onerror=alert(1)›Ravi');
        expect(out.snapshot.boreDia).toBe('‹b›6.5"‹/b›');
        expect(out.snapshot.totalDepth).toBe(300);
        expect(JSON.stringify(out)).not.toMatch(/[<>]/);
    });

    it('cleans nested ids such as payment ids and customerId', () => {
        const out = neutralize({ id: 'b1', customerId: 'c1"><x', payments: [{ id: 'p1" onclick="x', amount: 5 }] });
        expect(out.customerId).toBe('c1x');
        expect(out.payments[0].id).toBe('p1onclickx');
        expect(out.payments[0].amount).toBe(5);
    });

    it('drops prototype-pollution keys', () => {
        const evil = JSON.parse('{"id":"b1","__proto__":{"polluted":true}}');
        const out = neutralize(evil);
        expect({}.polluted).toBeUndefined();
        expect(Object.prototype.hasOwnProperty.call(out, '__proto__')).toBe(false);
    });

    it('sanitizeEntry repairs wrong shapes and rejects unusable entries', () => {
        expect(sanitizeEntry(null)).toBeNull();
        expect(sanitizeEntry([1])).toBeNull();
        expect(sanitizeEntry({ id: 'a"b' })).toBeNull();
        expect(sanitizeEntry({ id: 'b1', snapshot: 'oops', payments: 'oops' })).toEqual({ id: 'b1', snapshot: {}, payments: [] });
    });

    it('sanitizeList (backup restore) gives old customers without an id a fresh id instead of dropping them', () => {
        const list = sanitizeList([{ name: 'Old Customer' }, { id: 'c2', name: 'Kumar' }, 'junk', null], 'cust');
        expect(list).toHaveLength(2);
        expect(list[0].name).toBe('Old Customer');
        expect(isSafeId(list[0].id)).toBe(true);
        expect(list[1].id).toBe('c2');
    });

    it('sanitizeRecordData handles each kind of cloud record', () => {
        expect(sanitizeRecordData('bill', { id: 'b1', custName: '<x>' }).custName).toBe('‹x›');
        expect(sanitizeRecordData('setting', [{ label: '<i>Bata</i>' }])[0].label).toBe('‹i›Bata‹/i›');
        expect(sanitizeRecordData('setting', 'not-an-object')).toBeNull();
        expect(sanitizeRecordData('weird', {})).toBeNull();
    });
});

describe('cleanPulledRows: records downloaded from the cloud', () => {
    it('cleans good rows, keeps deletes, drops forged or broken ones', () => {
        const rows = cleanPulledRows([
            { kind: 'bill', id: 'b1', rev: 1, data: { id: 'b1', custName: '<script>' } },
            { kind: 'bill', id: 'b2', rev: 2, deleted: true, data: {} },
            { kind: 'bill', id: 'b3', rev: 3, data: { id: 'OTHER' } },          // content id does not match row
            { kind: 'bill', id: 'x" y', rev: 4, data: { id: 'x" y' } },        // unsafe id
            { kind: 'hack', id: 'h1', rev: 5, data: { id: 'h1' } },            // unknown kind
            { kind: 'setting', id: 'brand', rev: 6, data: { companyName: '<b>Co</b>' } }
        ]);
        expect(rows.map((r) => r.id)).toEqual(['b1', 'b2', 'brand']);
        expect(rows[0].data.custName).toBe('‹script›');
        expect(rows[2].data.companyName).toBe('‹b›Co‹/b›');
    });
});
