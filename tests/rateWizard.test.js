import { describe, it, expect } from 'vitest';
import { buildWizardSlabs, checkWizardCard } from '../src/features/rates/RateWizardMixin.js';

describe('new rate: slab ladder', () => {
    it('standard ladder moves the usual steps to the new base', () => {
        const s = buildWizardSlabs(110, 'standard');
        expect(s.map((x) => x.rate).slice(0, 5)).toEqual([110, 120, 140, 170, 210]);
        expect(s).toHaveLength(19);
        expect(s[18].end).toBe(2200);
    });
    it('same rise every slab', () => {
        expect(buildWizardSlabs(90, 'even', 15).map((x) => x.rate).slice(0, 4)).toEqual([90, 105, 120, 135]);
    });
});

describe('new rate: checks before saving', () => {
    const ok = { name: 'VIP', base: 110, slabs: buildWizardSlabs(110), pvc7: 450, pvc10: 760, bata: 2000, flush: 40, grace: 5, gst: 18 };
    it('a normal card passes', () => {
        expect(checkWizardCard(ok, ['Standard'])).toEqual({ errors: [], warnings: [] });
    });
    it('blocks a missing or duplicate name, zero base, falling slabs, bad grace / GST', () => {
        expect(checkWizardCard({ ...ok, name: '' }).errors.length).toBe(1);
        expect(checkWizardCard(ok, ['vip']).errors[0]).toMatch(/already exists/);
        expect(checkWizardCard({ ...ok, base: 0 }).errors.length).toBeGreaterThan(0);
        expect(checkWizardCard({ ...ok, slabs: [{ rate: 100 }, { rate: 90 }] }).errors[0]).toMatch(/cheaper/);
        expect(checkWizardCard({ ...ok, grace: 60 }).errors[0]).toMatch(/Grace/);
        expect(checkWizardCard({ ...ok, gst: 40 }).errors[0]).toMatch(/GST/);
    });
    it('warns about unusual values', () => {
        const w = checkWizardCard({ ...ok, pvc10: 300, gst: 7 }).warnings.join(' ');
        expect(w).toMatch(/10" pipe is cheaper/);
        expect(w).toMatch(/not a usual GST/);
    });
});

describe('step rate: my own steps', () => {
    it('parses typed steps in any separator', async () => {
        const { parseSteps } = await import('../src/features/rates/RateWizardMixin.js');
        expect(parseSteps('5, 10, 15 20/30;50')).toEqual([5, 10, 15, 20, 30, 50]);
        expect(parseSteps('abc')).toEqual([]);
        expect(parseSteps('')).toEqual([]);
    });
    it('repeats the last step for deeper slabs', async () => {
        const { expandSteps } = await import('../src/features/rates/RateWizardMixin.js');
        expect(expandSteps([5, 10], 4)).toEqual([5, 10, 10, 10]);
        expect(expandSteps([], 3)).toEqual([0, 0, 0]);
    });
    it('builds rates from the base and the steps', async () => {
        const { buildWizardSlabs, stepsOf, checkWizardCard } = await import('../src/features/rates/RateWizardMixin.js');
        const slabs = buildWizardSlabs(90, 'custom', 10, [5, 10, 15, 20, 30, 50]);
        expect(slabs.slice(0, 7).map((s) => s.rate)).toEqual([90, 95, 105, 120, 140, 170, 220]);
        expect(slabs[7].rate).toBe(270); // last step (50) repeats
        expect(stepsOf(slabs).slice(0, 6)).toEqual([5, 10, 15, 20, 30, 50]);
        expect(slabs[0].start).toBe(1);
        const { errors } = checkWizardCard({ name: 'X', base: 90, slabs, pvc7: 400, pvc10: 700, grace: 5, gst: 18 });
        expect(errors).toEqual([]);
    });
    it('switching from standard keeps the same numbers', async () => {
        const { buildWizardSlabs, stepsOf } = await import('../src/features/rates/RateWizardMixin.js');
        const std = buildWizardSlabs(100, 'standard');
        const own = buildWizardSlabs(100, 'custom', 10, stepsOf(std));
        expect(own.map((s) => s.rate)).toEqual(std.map((s) => s.rate));
    });
});

describe('free early access days left', () => {
    it('counts whole days to 31 March 2027 (IST) and stops at 0', async () => {
        const { earlyAccessDaysLeft } = await import('../src/config/plans.js');
        expect(earlyAccessDaysLeft(Date.parse('2027-03-31T10:00:00+05:30'))).toBe(1);
        expect(earlyAccessDaysLeft(Date.parse('2027-03-30T23:59:59+05:30'))).toBe(2);
        expect(earlyAccessDaysLeft(Date.parse('2027-04-01T00:00:01+05:30'))).toBe(0);
        expect(earlyAccessDaysLeft(Date.parse('2026-11-15T12:00:00+05:30'))).toBe(137);
    });
});
