import { describe, it, expect } from 'vitest';
import { isEarlyAccess, earlyAccessEndLabel, earlyAccessLine, earlyAccessAfterLine, EARLY_ACCESS } from '../src/config/plans.js';

describe('Free Early Access', () => {
    it('is on until the end of 31 March 2027 in India, then off', () => {
        expect(EARLY_ACCESS.freeUntil).toBe('2027-03-31');
        expect(isEarlyAccess(Date.parse('2026-11-14T10:00:00+05:30'))).toBe(true);
        expect(isEarlyAccess(Date.parse('2027-03-31T23:59:00+05:30'))).toBe(true);
        expect(isEarlyAccess(Date.parse('2027-04-01T00:00:01+05:30'))).toBe(false);
    });
    it('says the date, what stays free, and the founding discount', () => {
        expect(earlyAccessEndLabel()).toBe('31 March 2027');
        expect(earlyAccessLine()).toContain('free until 31 March 2027');
        expect(earlyAccessAfterLine()).toMatch(/billing on your phone stays free/);
        expect(earlyAccessAfterLine()).toContain('50% off for life');
    });
});
