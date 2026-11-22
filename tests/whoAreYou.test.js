import { describe, it, expect } from 'vitest';
import { staffRequestText } from '../src/features/account/whoAreYou.js';

describe('staff "add me" WhatsApp message', () => {
    it('has the steps for the owner and the staff details', () => {
        const t = staffRequestText({ name: 'Kumar S', email: 'kumar@gmail.com', phone: '+91 98765 43210' });
        expect(t).toContain('Team & Rigs');
        expect(t).toContain('Name: Kumar S');
        expect(t).toContain('Mobile: +91 98765 43210');
        expect(t).toContain('Gmail: kumar@gmail.com');
    });
    it('leaves out what is missing', () => {
        const t = staffRequestText({ name: 'Kumar', email: '', phone: '' });
        expect(t).not.toContain('Mobile:');
        expect(t).not.toContain('Gmail:');
    });
});
