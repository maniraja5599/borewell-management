import { describe, it, expect } from 'vitest';
import { cleanWork, checkWork, boreSegments, toolUsage, lastMm, lastClosing, toolWarning, halfMm, cleanBoreLog, boreLayers } from '../src/features/work/workMath.js';
import { toolLimits } from '../src/features/tools/toolsMath.js';

const bill = (over = {}, work = {}) => ({
    id: over.id || 'b1', billNo: over.billNo || 'AB-1', billDate: over.billDate || '2026-11-10', createdAt: over.createdAt || '2026-11-10T10:00:00Z',
    rigId: over.rigId || 'r1',
    snapshot: { docType: 'INVOICE', totalDepth: 800, drillingType: 'new', ...(over.snapshot || {}) },
    work: cleanWork({ obFeet: 60, obHammerId: 'hOB', hammerId: 'h1', bits: [{ toolId: 'k1', mm: 164.5 }], compStart: 100, compEnd: 112.5, ...work })
});

describe('work details', () => {
    it('nothing entered = no work details; numbers are cleaned; mm in 0.5 steps', () => {
        expect(cleanWork({})).toBeNull();
        expect(cleanWork({ bits: [{}] })).toBeNull();
        const w = cleanWork({ operatorId: 'w1', compEnd: '12352.5', bits: [{ toolId: 't1', mm: '164.3' }] });
        expect(w).toMatchObject({ operatorId: 'w1', compEnd: 12352.5, bits: [{ toolId: 't1', mm: 164.5, atFt: null }] });
        expect(halfMm('158.74')).toBe(158.5);
    });

    it('checks: closing below start, bit change depths, and what "required" needs', () => {
        expect(checkWork(cleanWork({ compStart: 100, compEnd: 90 }))).toMatch(/less than/);
        expect(checkWork(cleanWork({ compStart: 100, compEnd: 400 }))).toMatch(/too high/);
        expect(checkWork(cleanWork({ bits: [{ toolId: 'a', mm: 165 }, { toolId: 'b', mm: 165 }] }))).toMatch(/depth/);
        expect(checkWork(cleanWork({ bits: [{ toolId: 'a', mm: 165 }, { toolId: 'b', mm: 165, atFt: 900 }] }), { totalDepth: 800 })).toMatch(/less than the total/);
        expect(checkWork(cleanWork({ bits: [{ toolId: 'a', mm: 16.5 }] }))).toMatch(/mm/);
        expect(checkWork(null)).toBeNull();
        expect(checkWork(null, { required: true })).toMatch(/Fill/);
        expect(checkWork(cleanWork({ operatorId: 'w', compEnd: 5, bits: [{ toolId: 'a' }] }), { required: true })).toMatch(/size/);
        expect(checkWork(cleanWork({ operatorId: 'w', compStart: 1, compEnd: 5, bits: [{ toolId: 'a', mm: 165 }] }), { required: true })).toBeNull();
    });

    it('feet per tool on one bore: OB hammer 0-60, 6.5″ hammer and bits after the OB section', () => {
        const b = bill({}, { bits: [{ toolId: 'k1', mm: 164.5 }, { toolId: 'k2', mm: 165, atFt: 450 }], hammerChangeFt: 600, hammer2Id: 'h2' });
        const segs = boreSegments(b).map((s) => `${s.toolId}:${s.from}-${s.to}`);
        expect(segs).toEqual(['hOB:0-60', 'h1:60-600', 'h2:600-800', 'k1:60-450', 'k2:450-800']);
    });

    it('a re-bore starts at the old depth and has no OB section', () => {
        const b = bill({ snapshot: { drillingType: 'repair', oldBoreDepth: 500, totalDepth: 700 } });
        expect(boreSegments(b).map((s) => `${s.toolId}:${s.from}-${s.to}`)).toEqual(['h1:500-700', 'k1:500-700']);
    });

    it('usage over many bores: feet, bores, mm history in date order; quotations are ignored', () => {
        const bills = [
            bill({ id: 'b2', billNo: 'AB-2', billDate: '2026-11-12' }, { bits: [{ toolId: 'k1', mm: 163.5 }] }),
            bill({ id: 'b1', billNo: 'AB-1', billDate: '2026-11-10' }),
            { ...bill({ id: 'q', billNo: 'Q-1' }), snapshot: { docType: 'QUOTATION', totalDepth: 999 } }
        ];
        const u = toolUsage(bills);
        expect(u.k1).toMatchObject({ feet: 1480, bores: 2, firstUsedOn: '2026-11-10', lastUsedOn: '2026-11-12' });
        expect(u.k1.mm.map((m) => m.mm)).toEqual([164.5, 163.5]);
        expect(u.hOB.feet).toBe(120);
        expect(lastMm({ id: 'k1', newMm: 165 }, u)).toBe(163.5);
        expect(lastMm({ id: 'new', newMm: 165 }, u)).toBe(165);
    });

    it('next bore starts from the rig’s last closing reading (not another rig, not the bill being edited)', () => {
        const bills = [
            bill({ id: 'a', billDate: '2026-11-10' }, { compEnd: 112.5 }),
            bill({ id: 'b', billDate: '2026-11-12' }, { compEnd: 130 }),
            bill({ id: 'c', billDate: '2026-11-15', rigId: 'r2' }, { compEnd: 900 })
        ];
        expect(lastClosing(bills, 'r1')).toBe(130);
        expect(lastClosing(bills, 'r1', { exceptId: 'b' })).toBe(112.5);
        expect(lastClosing(bills, 'r2')).toBe(900);
        expect(lastClosing([], 'r1')).toBeNull();
    });

    it('warnings: bit below 158 mm; hammer past its size’s limit', () => {
        const limits = toolLimits({});
        const usage = { k1: { feet: 100, mm: [{ mm: 157.5 }] }, h1: { feet: 10000 }, hOB: { feet: 12000 } };
        expect(toolWarning({ id: 'k1', tool: 'bit' }, usage, limits)).toMatch(/157.5 mm/);
        expect(toolWarning({ id: 'k9', tool: 'bit', newMm: 165 }, usage, limits)).toBeNull();
        expect(toolWarning({ id: 'h1', tool: 'hammer', size: '6.5' }, usage, limits)).toMatch(/past 10,000/);
        expect(toolWarning({ id: 'hOB', tool: 'hammer', size: '9' }, usage, limits)).toBeNull(); // 15,000 for 9″ OB
    });
});

describe('bore log', () => {
    it('cleans entries: drops empty rows, sorts shallow first, keeps known layers only', () => {
        expect(cleanBoreLog([{ ft: '' }, { ft: 300, strata: 'hard' }, { ft: '40', strata: 'soil', note: ' red ' }, { ft: 120, strata: 'bogus' }, { ft: 200, water: true }]))
            .toEqual([{ ft: 40, strata: 'soil', note: 'red' }, { ft: 200, water: true }, { ft: 300, strata: 'hard' }]);
        expect(cleanWork({ boreLog: [{ ft: 50, strata: 'clay' }] })).toMatchObject({ boreLog: [{ ft: 50, strata: 'clay' }] });
        expect(cleanWork({ boreLog: [{ ft: 50 }] })).toBeNull();
    });

    it('turns entries into layers from the previous depth', () => {
        expect(boreLayers([{ ft: 40, strata: 'soil' }, { ft: 300, strata: 'hard', water: true }]))
            .toEqual([{ from: 0, to: 40, strata: 'soil', water: false, note: '' }, { from: 40, to: 300, strata: 'hard', water: true, note: '' }]);
    });

    it('checks: same depth twice, and deeper than the bore', () => {
        expect(checkWork(cleanWork({ boreLog: [{ ft: 100, strata: 'soil' }, { ft: 100, strata: 'hard' }] }))).toMatch(/twice/);
        expect(checkWork(cleanWork({ boreLog: [{ ft: 900, strata: 'hard' }] }), { totalDepth: 800 })).toMatch(/deeper than the total/);
        expect(checkWork(cleanWork({ boreLog: [{ ft: 800, strata: 'hard' }] }), { totalDepth: 800 })).toBeNull();
    });
});
