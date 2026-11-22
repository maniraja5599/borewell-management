import { describe, it, expect } from 'vitest';
import {
    markDay, markAll, upsertAll, marksOn, daySummary, ledger, cycleRange, payNow, payCycleOf, isActive, attId, addDays, fmtDays
} from '../src/features/workers/attendanceMath.js';
import { makeEntry, cashBook, spendSummary, entryTitle } from '../src/features/cash/cashMath.js';

const NOW = new Date('2026-11-22T18:00:00'); // a Sunday
const kumar = { id: 'w1', name: 'Kumar', code: 'OP-001', rigId: 'r1', status: 'active', wages: [{ from: '2026-01-01', perDay: 800 }, { from: '2026-11-20', perDay: 900 }] };
const ravi = { id: 'w2', name: 'Ravi', code: 'HP-001', rigId: 'r1', status: 'active', payCycle: 'weekly', wages: [{ from: '2026-01-01', perDay: 600 }] };
const gone = { id: 'w3', name: 'Old', code: 'LB-001', rigId: 'r1', status: 'left', wages: [{ from: '2026-01-01', perDay: 500 }] };
const MGR = { id: 'u-m', name: 'Ravi M' };
const mark = (w, d, s) => markDay(w, d, s, { by: MGR, now: NOW }).record;
const pay = (type, w, amount, date, paidBy = 'cash') => makeEntry({ type, workerId: w.id, workerName: 'Kumar · OP-001', amount, date, paidBy, rigId: 'r1' }, { me: MGR, now: NOW }).entry;

describe('marking days', () => {
    it('one record per worker per day; not for days to come; statuses checked', () => {
        const r = mark(kumar, '2026-11-21', 'present');
        expect(r).toMatchObject({ id: attId('w1', '2026-11-21'), workerId: 'w1', workerName: 'Kumar · OP-001', rigId: 'r1', status: 'present', by: { id: 'u-m', name: 'Ravi M' } });
        expect(markDay(kumar, '2026-11-23', 'present', { now: NOW }).error).toMatch(/not come/);
        expect(markDay(kumar, '2026-11-21', 'late', { now: NOW }).error).toMatch(/present/);
        expect(markDay(null, '2026-11-21', 'present', { now: NOW }).error).toMatch(/worker/);
        const again = upsertAll([r], [mark(kumar, '2026-11-21', 'half')]);
        expect(again).toHaveLength(1);
        expect(again[0].status).toBe('half');
        expect(marksOn([...again, mark(ravi, '2026-11-21', 'none')], '2026-11-21')).toEqual(new Map([['w1', 'half']]));
    });

    it('mark all (present / holiday) skips inactive workers', () => {
        const { records } = markAll([kumar, ravi, gone], '2026-11-22', 'holiday', { now: NOW });
        expect(records.map((r) => r.workerId)).toEqual(['w1', 'w2']);
        expect(isActive(gone)).toBe(false);
    });

    it('day summary: counts and wages (wage of that day, half pay)', () => {
        const att = [mark(kumar, '2026-11-21', 'present'), mark(ravi, '2026-11-21', 'half')];
        expect(daySummary([kumar, ravi], att, '2026-11-21')).toEqual({ present: 1, half: 1, absent: 0, holiday: 0, unmarked: 0, wages: 900 + 300 });
        expect(daySummary([kumar, ravi], att, '2026-11-22').unmarked).toBe(2);
    });
});

describe('wages and balance', () => {
    const att = [
        mark(kumar, '2026-11-18', 'present'),  // 800
        mark(kumar, '2026-11-19', 'half'),     // 400
        mark(kumar, '2026-11-20', 'present'),  // 900 (new wage)
        mark(kumar, '2026-11-21', 'absent'),
        mark(kumar, '2026-11-22', 'holiday')
    ];
    const cash = [pay('advance', kumar, 1000, '2026-11-18'), pay('wage', kumar, 500, '2026-11-20', 'upi')];

    it('earned − advances − paid; days with half = 0.5; lines latest first', () => {
        const l = ledger(kumar, att, cash, { until: '2026-11-22' });
        expect(l).toMatchObject({ present: 2, half: 1, absent: 1, holiday: 1, days: 2.5, earned: 2100, advances: 1000, paid: 500, balance: 600 });
        expect(l.lines[0].date).toBe('2026-11-22');
        expect(fmtDays(l.days)).toBe('2.5');
        expect(ledger(kumar, att, cash, { from: '2026-11-20', until: '2026-11-22' }).earned).toBe(900);
    });

    it('an advance bigger than the work done = they owe us', () => {
        const p = payNow(kumar, [mark(kumar, '2026-11-22', 'present')], [pay('advance', kumar, 2000, '2026-11-22')], '2026-11-22');
        expect(p).toMatchObject({ balance: -1100, toPay: 0, owesUs: 1100 });
    });

    it('pay cycle: daily by default; weekly from Monday; monthly; any time since the last pay', () => {
        expect(payCycleOf(kumar)).toBe('daily');
        expect(cycleRange(kumar, [], '2026-11-22')).toEqual({ start: '2026-11-22', end: '2026-11-22', label: 'Today' });
        expect(cycleRange(ravi, [], '2026-11-22').start).toBe('2026-11-16');
        expect(cycleRange({ ...kumar, payCycle: 'monthly' }, [], '2026-11-22').start).toBe('2026-11-01');
        expect(cycleRange({ ...kumar, payCycle: 'any' }, cash, '2026-11-22')).toEqual({ start: '2026-11-21', end: '2026-11-22', label: 'Since last pay' });
        expect(cycleRange({ ...kumar, payCycle: 'any' }, [], '2026-11-22').label).toBe('So far');
        expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    });
});

describe('advances and wages in the cash book', () => {
    it('need a worker; cash ones leave the payer’s cash; spend summary shows "Wages & advances"', () => {
        expect(makeEntry({ type: 'advance', amount: 100 }, { now: NOW }).error).toMatch(/worker/);
        const adv = pay('advance', kumar, 1000, '2026-11-21');
        const upi = pay('wage', kumar, 700, '2026-11-21', 'upi');
        expect(entryTitle(adv)).toBe('Advance to Kumar · OP-001');
        expect(entryTitle(upi)).toBe('Wages paid to Kumar · OP-001');
        const book = cashBook([makeEntry({ type: 'in', amount: 5000, rigId: 'r1' }, { me: MGR, now: NOW }).entry, adv, upi], [], 'u-m');
        expect(book.balance).toBe(4000);
        const s = spendSummary([adv, upi], {});
        expect(s.byCategory).toEqual([{ key: 'wages', label: 'Wages & advances', amount: 1700, count: 2 }]);
    });
});
