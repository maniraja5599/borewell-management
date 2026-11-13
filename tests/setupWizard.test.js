import { describe, it, expect, beforeEach } from 'vitest';
import { needsSetup, suggestPrefix } from '../src/features/onboarding/setupWizard.js';

function installStorage(initial = {}) {
    const data = new Map(Object.entries(initial));
    globalThis.window = {
        localStorage: {
            getItem: (k) => (data.has(k) ? data.get(k) : null),
            setItem: (k, v) => data.set(k, String(v)),
            removeItem: (k) => data.delete(k)
        }
    };
}
const defaultBrand = { companyName: 'Your Borewell Company' };
const newApp = (over = {}) => ({ defaultBrand, brand: { ...defaultBrand, phones: '' }, history: [], ...over });

describe('first-run setup wizard', () => {
    beforeEach(() => installStorage());

    it('opens for a brand-new phone', () => {
        expect(needsSetup(newApp())).toBe(true);
    });

    it('stays closed once the company is set up', () => {
        expect(needsSetup(newApp({ brand: { companyName: 'Sri Murugan Borewells' } }))).toBe(false);
        expect(needsSetup(newApp({ brand: { ...defaultBrand, phones: '98427 12345' } }))).toBe(false);
    });

    it('stays closed when bills already exist (existing user with default name)', () => {
        expect(needsSetup(newApp({ history: [{ id: 'b1' }] }))).toBe(false);
    });

    it('stays closed after Skip, and for signed-in users whose settings come from the cloud', () => {
        installStorage({ drillrig_setup_skipped: '1' });
        expect(needsSetup(newApp())).toBe(false);
        installStorage({ drillrig_auth: '{}' });
        expect(needsSetup(newApp())).toBe(false);
        installStorage({ drillrig_sync_v1: '{}' });
        expect(needsSetup(newApp())).toBe(false);
    });

    it('suggests a short bill prefix from the company name', () => {
        expect(suggestPrefix('Sri Murugan Borewells')).toBe('SM');
        expect(suggestPrefix('Anjaneya Borewells')).toBe('ANJ');
        expect(suggestPrefix('K.P.R. Drilling & Services')).toBe('KPR');
        expect(suggestPrefix('')).toBe('AB');
    });
});
