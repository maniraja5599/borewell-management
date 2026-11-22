import { describe, it, expect } from 'vitest';
import { guideSteps, shouldShowGuide } from '../src/features/onboarding/firstBillGuide.js';

const base = { companyName: 'Your Borewell Company', role: 'owner', ratesSeen: null, customers: 0, bills: 0 };

describe('first bill guide', () => {
    it('owner of a brand-new business sees all four steps, none done', () => {
        const s = guideSteps(base);
        expect(s.map((x) => x.id)).toEqual(['name', 'rates', 'customer', 'bill']);
        expect(s.every((x) => !x.done)).toBe(true);
    });
    it('ticks steps as they are done', () => {
        const s = guideSteps({ ...base, companyName: 'Sri Murugan Borewells', ratesSeen: '1', customers: 2 });
        expect(s.filter((x) => x.done).map((x) => x.id)).toEqual(['name', 'rates', 'customer']);
    });
    it('staff skip business name and rates', () => {
        expect(guideSteps({ ...base, role: 'driver' }).map((x) => x.id)).toEqual(['customer', 'bill']);
    });
    it('shows only until the first bill, and never after Hide', () => {
        expect(shouldShowGuide({ hidden: null, bills: 0 })).toBe(true);
        expect(shouldShowGuide({ hidden: null, bills: 1 })).toBe(false);
        expect(shouldShowGuide({ hidden: '1', bills: 0 })).toBe(false);
    });
});
