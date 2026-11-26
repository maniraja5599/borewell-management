import { describe, it, expect } from 'vitest';
import { evalServiceItem } from '../src/features/rigwork/serviceAlert.js';

describe('Compressor & Engine service interval alerts', () => {
    it('stays quiet below 90% of interval', () => {
        const res = evalServiceItem(200, 0, 250);
        expect(res.used).toBe(200);
        expect(res.left).toBe(50);
        expect(res.dueSoon).toBe(false);
        expect(res.overdue).toBe(false);
    });

    it('fires dueSoon warning at >= 90% of interval', () => {
        const res = evalServiceItem(225, 0, 250);
        expect(res.dueSoon).toBe(true);
        expect(res.overdue).toBe(false);
        expect(res.left).toBe(25);
    });

    it('fires overdue at >= 100% of interval and resets after servicing', () => {
        const over = evalServiceItem(510, 250, 250);
        expect(over.overdue).toBe(true);
        expect(over.used).toBe(260);

        const after = evalServiceItem(510, 510, 250);
        expect(after.used).toBe(0);
        expect(after.dueSoon).toBe(false);
        expect(after.overdue).toBe(false);
    });
});
