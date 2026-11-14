import { describe, it, expect, beforeEach } from 'vitest';
import { setAccessFromServer, clearAccess } from '../src/cloud/access.js';
import { multiRig, billRigId, matchesRigFilter, rigBadgeHtml } from '../src/features/team/rigFilter.js';
import { FormatMixin } from '../src/ui/FormatMixin.js';

const esc = (v) => new FormatMixin().escapeHtml(v);

function installStorage() {
    const data = new Map();
    globalThis.window = {
        localStorage: {
            getItem: (k) => (data.has(k) ? data.get(k) : null),
            setItem: (k, v) => data.set(k, String(v)),
            removeItem: (k) => data.delete(k)
        }
    };
}
const rig = (id, name, extra = {}) => ({ id, name, bill_prefix: id.toUpperCase(), active: true, archived: false, is_default: false, ...extra });

describe('bill book rig filter', () => {
    beforeEach(() => { installStorage(); clearAccess(); });

    it('shows nothing for single-user and single-rig companies', () => {
        expect(multiRig()).toBe(false);
        expect(rigBadgeHtml({ rigId: 'r1' }, esc)).toBe('');
        expect(matchesRigFilter({ rigId: 'r2' }, 'r1')).toBe(true);
        setAccessFromServer({ company_id: 'c', role: 'owner', rigs: [rig('r1', 'Rig 1', { is_default: true })] }, 'u');
        expect(multiRig()).toBe(false);
    });

    it('old bills without rigId count as the first rig', () => {
        setAccessFromServer({ company_id: 'c', role: 'owner', rigs: [rig('r1', 'Rig 1', { is_default: true }), rig('r2', 'Rig 2')] }, 'u');
        expect(billRigId({})).toBe('r1');
        expect(billRigId({ rigId: 'r2' })).toBe('r2');
        expect(matchesRigFilter({}, 'r1')).toBe(true);
        expect(matchesRigFilter({}, 'r2')).toBe(false);
        expect(matchesRigFilter({ rigId: 'r2' }, 'all')).toBe(true);
    });

    it('badge text is escaped', () => {
        setAccessFromServer({ company_id: 'c', role: 'owner', rigs: [rig('r1', '<b>Rig</b>', { is_default: true }), rig('r2', 'Rig 2')] }, 'u');
        const html = rigBadgeHtml({}, esc);
        expect(html).toContain('&lt;b&gt;Rig&lt;/b&gt;');
        expect(html).not.toContain('<b>');
    });
});
