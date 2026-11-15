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
