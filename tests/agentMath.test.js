import { describe, it, expect } from 'vitest';
import { cleanAgent, agentKey, agentsFromBills, knownAgents, agentStatement, isAgentBill } from '../src/features/agents/agentMath.js';

const bill = (no, day, total, paid, agent, extra = {}) => ({
    id: no, billNo: no, billDate: day, custName: `Owner ${no}`, custLocation: 'Trichy',
    payments: paid ? [{ amount: paid }] : [],
    snapshot: { docType: 'INVOICE', grandTotal: total, totalDepth: 500 },
    ...(agent ? { agent } : {}), ...extra
});

describe('agents', () => {
    it('cleans an agent: needs a name; short mobiles are dropped', () => {
        expect(cleanAgent({ name: '  Raja  Traders ', phone: '+91 98765 43210' })).toEqual({ name: 'Raja Traders', phone: '919876543210' });
        expect(cleanAgent({ name: 'Ravi', phone: '123' })).toEqual({ name: 'Ravi' });
        expect(cleanAgent({ name: '  ' })).toBeNull();
        expect(agentKey({ name: 'A', phone: '+919876543210' })).toBe(agentKey({ name: 'B', phone: '9876543210' }));
        expect(agentKey({ name: 'Ravi' })).toBe(agentKey({ name: 'ravi ' }));
    });

    it('builds the agent book from final bills only, most due first', () => {
        const bills = [
            bill('1', '2026-11-01', 50000, 20000, { name: 'Raja', phone: '9876543210' }),
            bill('2', '2026-11-10', 30000, 30000, { name: 'Raja Traders', phone: '+91 9876543210' }),
            bill('3', '2026-11-05', 40000, 0, { name: 'Kumar' }),
            bill('4', '2026-11-06', 10000, 0, null),
            bill('5', '2026-11-07', 99000, 0, { name: 'Kumar' }, { snapshot: { docType: 'QUOTATION', grandTotal: 99000 } })
        ];
        const book = agentsFromBills(bills);
        expect(book.map((a) => [a.name, a.bills.length, a.billed, a.paid, a.due, a.unpaid])).toEqual([
            ['Kumar', 1, 40000, 0, 40000, 1],
            ['Raja Traders', 2, 80000, 50000, 30000, 1]
        ]);
        expect(book[1].bills.map((b) => b.billNo)).toEqual(['2', '1']);
        expect(book[1].oldestDue).toBe('2026-11-01');
        expect(knownAgents(bills)[0].name).toBe('Raja Traders');
        expect(isAgentBill(bills[3])).toBe(false);
    });

    it('statement lists the unpaid bills and the balance', () => {
        const [a] = agentsFromBills([bill('7', '2026-11-02', 45000, 5000, { name: 'Mani' }), bill('8', '2026-11-03', 10000, 10000, { name: 'Mani' })]);
        const t = agentStatement(a, { company: 'Anjaneya Borewells' });
        expect(t).toContain('#7');
        expect(t).not.toContain('#8');
        expect(t).toContain('Balance due: ₹40,000');
    });
});
