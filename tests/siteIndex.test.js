import { describe, it, expect } from 'vitest';
import { SitesMixin } from '../src/features/customers/SitesMixin.js';
import { PhoneMixin } from '../src/features/customers/PhoneMixin.js';

function app(history) {
    const a = Object.create(null);
    for (const M of [SitesMixin, PhoneMixin]) {
        for (const k of Object.getOwnPropertyNames(M.prototype)) if (k !== 'constructor') a[k] = M.prototype[k];
    }
    a.history = history;
    a.defaultCountryCode = '+91';
    return a;
}

describe('customer sites: indexed lookup = full scan', () => {
    it('same sites, same order, for every customer', () => {
        let seed = 11;
        const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
        const names = ['Ravi', 'ravi ', 'Selvi', 'Kumar', 'Anitha', ''];
        const phones = ['9876543210', '+91 98765 43210', '9443012345', '12345', '', '9944033445'];
        const places = ['Salem', 'salem', 'Attur', 'Erode ', '', 'Velur', 'Mohanur'];
        const history = Array.from({ length: 400 }, () => ({
            custName: names[rnd(names.length)], custPhone: phones[rnd(phones.length)], custLocation: places[rnd(places.length)]
        }));
        const a = app(history);
        const index = a.buildCustomerSiteIndex();
        const customers = [];
        for (const name of names) for (const phone of phones) customers.push({ name, phone, village: places[rnd(places.length)], sites: rnd(2) ? ['Paramathi'] : [] });
        for (const c of customers) {
            expect(a.getCustomerSiteSuggestions(c, index)).toEqual(a.getCustomerSiteSuggestions(c));
        }
    });
});
