import { describe, it, expect } from 'vitest';
import { cleanWork } from '../src/features/work/workMath.js';
import { toolLimits } from '../src/features/tools/toolsMath.js';
import { workReport, drilledFeet, boreHours, toolReportLine, doneLine, workWhatsAppLines } from '../src/features/report/workReport.js';

const bill = (id, day, { rigId = 'r1', snapshot = {}, work = {} } = {}) => ({
    id, billNo: id, billDate: day, createdAt: `${day}T10:00:00Z`, rigId,
    snapshot: { docType: 'INVOICE', totalDepth: 800, drillingType: 'new', ...snapshot },
    work: work === null ? undefined : cleanWork({ operatorId: 'op1', obFeet: 60, obHammerId: 'hOB', hammerId: 'h1', bits: [{ toolId: 'k1', mm: 164 }], compStart: 100, compEnd: 110, ...work })
});
const workers = [
    { id: 'op1', name: 'Kumar', code: 'OP-001' },
    { id: 'op2', name: 'Kumar', code: 'OP-002', status: 'left' }
];
const tools = [
    { id: 'k1', tool: 'bit', size: '6.5', code: 'KB-1023', newMm: 165, price: 18000, status: 'active', rigId: 'r1' },
    { id: 'h1', tool: 'hammer', size: '6.5', brand: 'Mission', price: 90000, status: 'active', rigId: 'r1', purchasedOn: '2026-10-01' },
    { id: 'k9', tool: 'bit', size: '6.5', code: 'KB-0900', newMm: 165, price: 16000, status: 'sold', soldAmount: 2000, soldOn: '2026-11-05', finishedOn: '2026-11-01', rigId: 'r1' },
    { id: 'k8', tool: 'bit', size: '6.5', code: 'KB-0800', newMm: 165, price: 15000, status: 'finished', finishedOn: '2026-10-20', rigId: 'r1' }
];
const limits = toolLimits({});

describe('work report', () => {
    it('drilled feet: a re-bore counts only the new depth; hours need both readings', () => {
        expect(drilledFeet({ snapshot: { totalDepth: 700 } })).toBe(700);
        expect(drilledFeet({ snapshot: { totalDepth: 700, drillingType: 'repair', oldBoreDepth: 500 } })).toBe(200);
        expect(boreHours({ compStart: 100, compEnd: 112.5 })).toBe(12.5);
        expect(boreHours({ compStart: null, compEnd: 112.5 })).toBeNull();
        expect(boreHours({ compStart: 120, compEnd: 110 })).toBeNull();
        expect(boreHours(undefined)).toBeNull();
    });

    it('totals, per rig and per operator; feet per hour only from bores with readings', () => {
        const invoices = [
            bill('a', '2026-11-10'),                                                     // 800 ft, 10 h
            bill('b', '2026-11-11', { work: { compStart: 110, compEnd: 118, operator2Id: 'op2' } }), // 800 ft, 8 h, two operators
            bill('c', '2026-11-12', { work: { compEnd: null } }),                         // 800 ft, no hours
            bill('d', '2026-11-12', { rigId: 'r2', work: null })                          // no work details
        ];
        const r = workReport({ invoices, allBills: invoices, tools, workers, limits });
        expect(r.total).toMatchObject({ bores: 4, feet: 3200, withWork: 3, missing: 1, hours: 18, shared: 1 });
        expect(r.total.perHour).toBe(Math.round(1600 / 18)); // 89, not 3200 / 18
        expect(r.rigs.map((x) => [x.rigId, x.bores])).toEqual([['r1', 3], ['r2', 1]]);
        const [k, k2] = r.operators;
        expect(k).toMatchObject({ id: 'op1', name: 'Kumar · OP-001', bores: 3, feet: 2400, hours: 18 });
        expect(k2).toMatchObject({ id: 'op2', name: 'Kumar · OP-002', bores: 1, left: true, perHour: 100 });
    });

    it('an operator who was deleted still shows', () => {
        const r = workReport({ invoices: [bill('a', '2026-11-10', { work: { operatorId: 'gone' } })], workers, limits });
        expect(r.operators[0].name).toBe('Operator (removed)');
    });

    it('bits and hammers: life feet, period feet, mm wear, cost per foot, warnings', () => {
        const old = bill('old', '2026-10-05', { work: { bits: [{ toolId: 'k1', mm: 165 }] } });
        const now = bill('now', '2026-11-10', { work: { bits: [{ toolId: 'k1', mm: 157 }] } });
        const r = workReport({ invoices: [now], allBills: [old, now], tools, workers, limits });
        const bit = r.tools.active.find((t) => t.id === 'k1');
        expect(bit).toMatchObject({ feet: 1480, periodFeet: 740, bores: 2, newMm: 165, nowMm: 157, wearMm: 8 });
        expect(bit.costPerFt).toBe(Math.round((18000 / 1480) * 10) / 10);
        expect(bit.warning).toMatch(/below 158/);
        expect(r.tools.active[0].id).toBe('k1'); // warnings first
        expect(r.tools.warnings).toBe(1);
        expect(toolReportLine(bit)).toMatch(/740 ft in this period · 1,480 ft in all · 2 bores · 165 → 157 mm · ₹12.2\/ft/);
        const ham = r.tools.active.find((t) => t.id === 'h1');
        expect(ham.name).toBe('6.5″ Mission · from 5 Oct 2026'); // first used, not bought
        expect(ham.warning).toBeNull();
    });

    it('finished and sold lists: cost, scrap, net cost per foot', () => {
        const used = bill('u', '2026-10-01', { work: { bits: [{ toolId: 'k9', mm: 160 }] } });
        const r = workReport({ invoices: [], allBills: [used], tools, workers, limits });
        expect(r.tools.finished.map((t) => t.id)).toEqual(['k8']);
        const sold = r.tools.sold[0];
        expect(sold).toMatchObject({ id: 'k9', scrap: 2000, feet: 740, wearMm: 5 });
        expect(sold.costPerFt).toBe(Math.round((14000 / 740) * 10) / 10);
        expect(doneLine(sold)).toMatch(/740 ft · 1 bore · worn 5 mm · cost ₹16,000 · scrap ₹2,000 · ₹18.9\/ft · sold 5 Nov 2026/);
        expect(r.scrapTotal).toBe(2000);
        expect(r.doneCost).toBe(31000);
        expect(r.tools.finished[0].costPerFt).toBeNull(); // never used on a bill
        expect(doneLine(r.tools.finished[0])).toMatch(/^No bores on record · cost ₹15,000 · finished 20 Oct 2026$/);
    });

    it('"in this period" only when it differs from the whole life; unused tools say so', () => {
        const a = bill('a', '2026-11-10');
        const r = workReport({ invoices: [a], allBills: [a], tools, workers, limits });
        expect(toolReportLine(r.tools.active.find((t) => t.id === 'k1'))).toBe('740 ft in all · 1 bore · 165 → 164 mm · ₹24.3/ft so far');
        expect(toolReportLine({ ...r.tools.active[0], bores: 0, feet: 0 })).toBe('Not used on a bill yet');
    });

    it('WhatsApp lines only when there are work details', () => {
        expect(workWhatsAppLines(workReport({ invoices: [bill('d', '2026-11-12', { work: null })] }))).toEqual([]);
        const lines = workWhatsAppLines(workReport({ invoices: [bill('a', '2026-11-10'), bill('d', '2026-11-12', { work: null })], workers, tools, limits }));
        expect(lines[0]).toMatch(/RIG WORK/);
        expect(lines.join('\n')).toMatch(/Compressor: \*10 h\* \(80 ft per hour\)/);
        expect(lines.join('\n')).toMatch(/Kumar · OP-001: 1 bore, 800 ft/);
        expect(lines.join('\n')).toMatch(/1 bill without work details/);
    });

    it('never puts customer-bill fields in the report and survives junk', () => {
        const r = workReport({ invoices: [{ snapshot: {} }, { snapshot: { docType: 'INVOICE' }, work: { compStart: 'x' } }], allBills: [null], tools: [null], workers: [null] });
        expect(r.total.bores).toBe(2);
        expect(r.tools.active).toEqual([]);
    });
});
