import { describe, it, expect } from 'vitest';
import { nextCode, makeWorker, wageOn, setLeft, duplicateCodeFixes, workerLabel } from '../src/features/workers/workersMath.js';
import { makeTool, finishTool, sellTool, reuseTool, toolName, toolSummary, knownBrands } from '../src/features/tools/toolsMath.js';

const NOW = new Date('2026-11-22T10:00:00Z');

describe('workers', () => {
    it('IDs per type, never reused', () => {
        const list = [{ code: 'OP-001' }, { code: 'OP-007' }, { code: 'HP-002' }];
        expect(nextCode(list, 'operator')).toBe('OP-008');
        expect(nextCode(list, 'helper')).toBe('HP-003');
        expect(nextCode([], 'driver')).toBe('DR-001');
        expect(nextCode(list, 'nonsense')).toBe('OT-001');
    });

    it('two workers with the same name get different IDs', () => {
        const a = makeWorker({ name: 'Kumar', type: 'operator' }, { workers: [], now: NOW }).worker;
        const b = makeWorker({ name: 'Kumar', type: 'operator' }, { workers: [a], now: NOW }).worker;
        expect([a.code, b.code]).toEqual(['OP-001', 'OP-002']);
        expect(workerLabel(b)).toBe('Kumar · OP-002');
    });

    it('checks name, mobile and wage', () => {
        expect(makeWorker({ name: '  ' }).error).toMatch(/name/);
        expect(makeWorker({ name: 'A', phone: '12345' }).error).toMatch(/10-digit/);
        expect(makeWorker({ name: 'A', phone: '+91 98427 12345' }).worker.phone).toBe('9842712345');
        expect(makeWorker({ name: 'A', perDay: '-5' }).error).toMatch(/wage/);
    });

    it('a new wage starts from its date; old days keep the old wage', () => {
        let w = makeWorker({ name: 'Ravi', type: 'helper', perDay: 800, wageFrom: '2026-11-01' }, { now: NOW }).worker;
        w = makeWorker({ name: 'Ravi', type: 'helper', perDay: 900, wageFrom: '2026-11-20' }, { existing: w, workers: [w], now: NOW }).worker;
        expect(w.code).toBe('HP-001'); // same type: same ID
        expect(wageOn(w, '2026-11-10')).toBe(800);
        expect(wageOn(w, '2026-11-20')).toBe(900);
        expect(wageOn(w, '2026-10-01')).toBe(0);
        // saving again with the same wage adds nothing
        const again = makeWorker({ name: 'Ravi', type: 'helper', perDay: 900, wageFrom: '2026-11-25' }, { existing: w, workers: [w], now: NOW }).worker;
        expect(again.wages).toHaveLength(2);
    });

    it('changing the type gives an ID of the new type', () => {
        const w = makeWorker({ name: 'Mani', type: 'helper' }, { now: NOW }).worker;
        const op = makeWorker({ name: 'Mani', type: 'operator' }, { existing: w, workers: [w, { id: 'x', code: 'OP-004' }], now: NOW }).worker;
        expect(op.code).toBe('OP-005');
    });

    it('left / rejoin', () => {
        const w = setLeft({ id: 'w', status: 'active' }, true, NOW);
        expect(w).toMatchObject({ status: 'left', leftOn: '2026-11-22' });
        expect(setLeft(w, false, NOW).status).toBe('active');
    });

    it('same ID made on two phones: the later one is renumbered, the same on every phone', () => {
        const ws = [
            { id: 'b', code: 'OP-002', type: 'operator', createdAt: '2026-11-22T10:05:00Z' },
            { id: 'a', code: 'OP-002', type: 'operator', createdAt: '2026-11-22T10:01:00Z' },
            { id: 'c', code: 'OP-001', type: 'operator', createdAt: '2026-11-20T10:00:00Z' }
        ];
        expect(duplicateCodeFixes(ws)).toEqual([{ id: 'b', code: 'OP-003' }]);
        expect(duplicateCodeFixes([...ws].reverse())).toEqual([{ id: 'b', code: 'OP-003' }]);
        expect(duplicateCodeFixes([{ id: 'x', code: 'OP-001', type: 'operator' }])).toEqual([]);
    });
});

describe('bits and hammers', () => {
    it('a bit needs its ID and a rig; a hammer needs a brand', () => {
        expect(makeTool({ tool: 'bit', rigId: 'r1' }).error).toMatch(/ID/);
        expect(makeTool({ tool: 'hammer', rigId: 'r1' }).error).toMatch(/brand/);
        expect(makeTool({ tool: 'bit', code: 'kb-1' }).error).toMatch(/rig/);
        const { tool } = makeTool({ tool: 'bit', code: ' kb-1023 ', size: '6.5', newMm: '165.3', price: '9,500', rigId: 'r1', purchasedOn: '2026-11-12' }, { now: NOW });
        expect(tool).toMatchObject({ code: 'KB-1023', newMm: 165.5, price: 9500, status: 'active', purchasedOn: '2026-11-12' });
    });

    it('the same bit ID cannot be added twice (unless the old one was sold)', () => {
        const a = makeTool({ tool: 'bit', code: 'KB-1', rigId: 'r1' }, { now: NOW }).tool;
        expect(makeTool({ tool: 'bit', code: 'kb-1', rigId: 'r1' }, { tools: [a] }).error).toMatch(/already/);
        expect(makeTool({ tool: 'bit', code: 'kb-1', rigId: 'r1' }, { tools: [{ ...a, status: 'sold' }] }).tool).toBeTruthy();
        expect(makeTool({ tool: 'bit', code: 'KB-1', rigId: 'r1', note: 'edit' }, { existing: a, tools: [a] }).tool.note).toBe('edit');
    });

    it('names: bit by its ID, hammer by size + brand + date', () => {
        expect(toolName({ tool: 'bit', code: 'KB-1023', size: '6.5' })).toBe('KB-1023');
        expect(toolName({ tool: 'hammer', size: '9', brand: 'Mission', purchasedOn: '2026-11-12' })).toBe('9″ OB Mission · from 12 Nov 2026');
        expect(toolName({ tool: 'hammer', size: '6.5', brand: 'Mission', purchasedOn: '2026-11-12', firstUsedOn: '2026-11-15' })).toBe('6.5″ Mission · from 15 Nov 2026');
    });

    it('in use → finished → sold, and back in use', () => {
        const t = makeTool({ tool: 'bit', code: 'KB-2', rigId: 'r1' }, { now: NOW }).tool;
        const f = finishTool(t, { reason: 'Below 158 mm' }, NOW);
        expect(f).toMatchObject({ status: 'finished', finishedOn: '2026-11-22', finishReason: 'Below 158 mm' });
        expect(sellTool(f, {}).error).toMatch(/sold for/);
        const s = sellTool(f, { amount: '1200', buyer: 'Scrap shop' }, NOW).tool;
        expect(s).toMatchObject({ status: 'sold', soldAmount: 1200, soldOn: '2026-11-22' });
        const back = reuseTool(s, NOW);
        expect(back.status).toBe('active');
        expect(back.soldAmount).toBeUndefined();
    });

    it('summary per rig: counts, bought this month, scrap money', () => {
        const tools = [
            { tool: 'bit', status: 'active', rigId: 'r1', price: 9000, purchasedOn: '2026-11-02' },
            { tool: 'hammer', status: 'active', rigId: 'r1', price: 45000, purchasedOn: '2026-10-02' },
            { tool: 'bit', status: 'sold', rigId: 'r1', price: 8000, purchasedOn: '2026-11-05', soldAmount: 1000 },
            { tool: 'bit', status: 'active', rigId: 'r2', price: 9000, purchasedOn: '2026-11-02' }
        ];
        expect(toolSummary(tools, { rigId: 'r1', month: '2026-11' })).toEqual({ bitsInUse: 1, hammersInUse: 1, finished: 0, sold: 1, boughtThisMonth: 17000, scrapTotal: 1000 });
        expect(toolSummary(tools, { month: '2026-11' }).bitsInUse).toBe(2);
        expect(knownBrands([{ brand: 'Mission' }, { brand: 'Atlas' }, { brand: 'Mission' }])).toEqual(['Mission', 'Atlas']);
    });
});

import { toolLimits } from '../src/features/tools/toolsMath.js';

describe('bits are 6.5″ only; warning limits', () => {
    it('a bit is always 6.5″, a hammer can be 9″ OB', () => {
        expect(makeTool({ tool: 'bit', code: 'X1', size: '9', rigId: 'r1' }).tool.size).toBe('6.5');
        expect(makeTool({ tool: 'hammer', brand: 'Atlas', size: '9', rigId: 'r1' }).tool.size).toBe('9');
    });
    it('defaults: bit 158 mm, hammers 10,000 ft (6.5″) and 15,000 ft (9″ OB); owner values win', () => {
        expect(toolLimits({})).toEqual({ bitWarnMm: 158, hammerWarnFt: { '6.5': 10000, '9': 15000 } });
        expect(toolLimits({ bitWarnMm: 155, hammerWarnFt: { '9': 18000 } })).toEqual({ bitWarnMm: 155, hammerWarnFt: { '6.5': 10000, '9': 18000 } });
        expect(toolLimits({ bitWarnMm: 'abc', hammerWarnFt: { '6.5': -1 } }).bitWarnMm).toBe(158);
    });
});
