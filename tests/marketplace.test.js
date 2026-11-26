import { describe, it, expect } from 'vitest';
import { encodeAgencyShare, decodeAgencyShare, rankAgencies } from '../src/features/settings/marketplaceUI.js';

describe('Marketplace share token & price comparison', () => {
    it('encodes and decodes an agency profile round-trip', () => {
        const token = encodeAgencyShare({
            name: 'Anjaneya Borewells',
            city: 'Namakkal',
            phone: '9659657777',
            baseRate: 95,
            bata: 2000,
            pvc7Rate: 400
        });
        const decoded = decodeAgencyShare(token);
        expect(decoded).toEqual({
            name: 'Anjaneya Borewells',
            city: 'Namakkal',
            phone: '9659657777',
            baseRate: 95,
            bata: 2000,
            pvc7Rate: 400
        });
    });

    it('filters by city and ranks agencies by estimated total ascending', () => {
        const agencies = [
            { name: 'Expensive Rigs', city: 'Namakkal', baseRate: 110, bata: 2500, pvc7Rate: 450 },
            { name: 'Value Rigs', city: 'Namakkal', baseRate: 90, bata: 2000, pvc7Rate: 400 },
            { name: 'Other City', city: 'Salem', baseRate: 80, bata: 1000, pvc7Rate: 350 }
        ];
        const ranked = rankAgencies(agencies, { city: 'namakkal', depth: 400, casingFt: 50 });
        expect(ranked).toHaveLength(2);
        expect(ranked[0].name).toBe('Value Rigs');
        expect(ranked[0].estimatedTotal).toBeLessThan(ranked[1].estimatedTotal);
    });
});
