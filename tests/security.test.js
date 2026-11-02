import { describe, it, expect } from 'vitest';
import { FormatMixin } from '../src/ui/FormatMixin.js';
import { ShareExportMixin } from '../src/features/share/ShareExportMixin.js';
import { PhoneMixin } from '../src/features/customers/PhoneMixin.js';

const format = new FormatMixin();
const share = new ShareExportMixin();
const phone = new PhoneMixin();

describe('Enterprise Security & Input Hardening', () => {
    describe('XSS & HTML Injection Sanitization', () => {
        it('escapes dangerous HTML characters in user input', () => {
            const malicious = '<script>alert("xss")</script>';
            const escaped = format.escapeHtml(malicious);
            expect(escaped).not.toContain('<script>');
            expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
        });

        it('escapes single and double quotes and ampersands', () => {
            const input = `O'Connor & Sons "Borewells" <test>`;
            const escaped = format.escapeHtml(input);
            expect(escaped).toBe('O&#39;Connor &amp; Sons &quot;Borewells&quot; &lt;test&gt;');
        });

        it('safely handles null, undefined, and non-string inputs', () => {
            expect(format.escapeHtml(null)).toBe('');
            expect(format.escapeHtml(undefined)).toBe('');
            expect(format.escapeHtml(12345)).toBe('12345');
            expect(format.escapeHtml(0)).toBe('0');
        });
    });

    describe('WhatsApp Markup & Message Sanitization', () => {
        it('neutralizes HTML tags before formatting markdown bold and italics', () => {
            const input = '<img src=x onerror=alert(1)> *Bold text* _Italic text_';
            const output = share.formatWhatsAppBubbleHtml(input);
            expect(output).not.toContain('<img');
            expect(output).toContain('&lt;img src=x onerror=alert(1)&gt;');
            expect(output).toContain('<strong>Bold text</strong>');
            expect(output).toContain('<em>Italic text</em>');
        });

        it('prevents broken or nested tag injection in WhatsApp formatting', () => {
            const input = '<div><b>Normal</b></div> *Safe bold*';
            const output = share.formatWhatsAppBubbleHtml(input);
            expect(output).not.toContain('<div>');
            expect(output).toContain('&lt;div&gt;&lt;b&gt;Normal&lt;/b&gt;&lt;/div&gt;');
            expect(output).toContain('<strong>Safe bold</strong>');
        });
    });

    describe('Phone Number Normalization & Injection Prevention', () => {
        it('normalizes standard 10-digit Indian numbers', () => {
            const raw = '98427 12345';
            const val = phone.validateMobileNumber(raw);
            expect(val.valid).toBe(true);
            expect(val.digits).toBe('9842712345');
            expect(val.fullPhone).toBe('+91 9842712345');
        });

        it('normalizes numbers entered with leading 0 or +91', () => {
            expect(phone.normalizeMobileNumber('09842712345')).toBe('9842712345');
            expect(phone.normalizeMobileNumber('+91 9842712345')).toBe('9842712345');
            expect(phone.normalizeMobileNumber('+91-98427-12345')).toBe('9842712345');
        });

        it('rejects invalid or alphabet-polluted phone inputs', () => {
            const invalid = phone.validateMobileNumber('98427abcde');
            expect(invalid.valid).toBe(false);
        });

        it('rejects short incomplete numbers', () => {
            const short = phone.validateMobileNumber('98427');
            expect(short.valid).toBe(false);
        });
    });

    describe('Initials Extraction & Edge Cases', () => {
        it('extracts initials cleanly for Tamil and English names', () => {
            expect(format.getInitials('Mani Raja')).toBe('MR');
            expect(format.getInitials('Selvam')).toBe('SE');
            expect(format.getInitials('')).toBe('C');
            expect(format.getInitials('   ')).toBe('C');
        });
    });
});
