import { describe, it, expect } from 'vitest';
import { comingSoonVoteLink, PLANS } from '../src/config/plans.js';
import { COMING_SOON } from '../src/features/settings/comingSoon.js';

describe('Coming soon tiles', () => {
    it('lists the four next parts of DrillRig in order', () => {
        expect(COMING_SOON.map((f) => f.title)).toEqual(['Expenses', 'Staff', 'Stock', 'Profit & Loss']);
        for (const f of COMING_SOON) expect(f.sub.length).toBeLessThanOrEqual(22); // one line on a 360 px phone
    });
    it('each tile opens WhatsApp to the DrillRig team naming the feature', () => {
        const url = comingSoonVoteLink('staff management');
        expect(url.startsWith(`https://wa.me/${PLANS.supportWhatsApp}?text=`)).toBe(true);
        expect(decodeURIComponent(url.split('text=')[1])).toBe('Hi DrillRig team, I want staff management in DrillRig. Please tell me when it is ready.');
        expect(decodeURIComponent(comingSoonVoteLink('the profit & loss report'))).toContain('profit & loss report');
    });
});
