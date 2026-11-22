import { describe, it, expect } from 'vitest';
import { indianMobile } from '../src/core/phone.js';
import { makeWorker } from '../src/features/workers/workersMath.js';

describe('staff and worker mobile numbers', () => {
    it('10 digits starting 6-9; +91 / 91 / 0 in front is fine', () => {
        for (const ok of ['9842712345', '98427 12345', '+91 98427 12345', '919842712345', '09842712345', '6000000000']) expect(indianMobile(ok), ok).toBe(ok.replace(/\D/g, '').slice(-10));
    });
    it('refuses junk that used to pass (any 10 digits, extra digits cut off)', () => {
        for (const bad of ['0000000000', '1234567890', '5842712345', '98427123', '98427123456789', '', 'abc', '919842712']) expect(indianMobile(bad), bad).toBe('');
    });
    it('workers: a wrong number is refused with a clear message; empty is fine', () => {
        expect(makeWorker({ name: 'A', phone: '1234567890' }).error).toMatch(/6, 7, 8 or 9/);
        expect(makeWorker({ name: 'A', phone: '' }).worker.phone).toBe('');
        expect(makeWorker({ name: 'A', phone: '+91 98427 12345' }).worker.phone).toBe('9842712345');
    });
});

import { isLocalTestHost } from '../src/features/account/signInGate.js';
describe('?test=1 sign-in skip is only for local testing', () => {
    it('home-network and localhost addresses only — never drillrig.in', () => {
        for (const ok of ['localhost', '127.0.0.1', '192.168.1.50', '10.0.0.7', '172.16.4.2']) expect(isLocalTestHost(ok), ok).toBe(true);
        for (const no of ['drillrig.in', 'www.drillrig.in', 'maniraja5599.github.io', '192.168.1.50.evil.com', '172.32.0.1', '8.8.8.8', '']) expect(isLocalTestHost(no), no).toBe(false);
    });
});
