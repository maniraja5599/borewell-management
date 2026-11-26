import { describe, it, expect } from 'vitest';
import { reportBreakdown, fixBreakdown, openBreakdown, downHours, fmtHours, monthSummary, rigStatus, history } from '../src/features/rigwork/breakdownMath.js';
import { transactions } from '../src/features/report/txMath.js';

const H = 3600000;
const t = (s) => new Date(s).getTime();

describe('rig status & breakdowns', () => {
    it('report: needs a reason, no future time, one open breakdown per rig', () => {
        const now = t('2026-11-26T12:00:00');
        expect(reportBreakdown({ rigId: 'r1' }, { now }).error).toMatch(/what broke/);
        expect(reportBreakdown({ rigId: 'r1', reason: 'engine', startAt: now + 2 * H }, { now }).error).toMatch(/future/);
        const { record } = reportBreakdown({ rigId: 'r1', reason: 'compressor', startAt: now - 3 * H, note: ' valve ' }, { now });
        expect(record).toMatchObject({ rigId: 'r1', reason: 'compressor', endAt: null, note: 'valve' });
        expect(reportBreakdown({ rigId: 'r1', reason: 'engine' }, { list: [record], now }).error).toMatch(/already/);
        expect(reportBreakdown({ rigId: 'r2', reason: 'engine' }, { list: [record], now }).record).toBeTruthy();
        expect(openBreakdown([record], 'r1')).toBe(record);
        expect(downHours(record, now)).toBe(3);
    });

    it('fix: end after start, cost in rupees; status down → working / idle', () => {
        const now = t('2026-11-26T18:00:00');
        const { record } = reportBreakdown({ rigId: 'r1', reason: 'hydraulic', startAt: t('2026-11-26T08:00:00') }, { now });
        expect(fixBreakdown(record, { endAt: t('2026-11-26T07:00:00') }, now).error).toMatch(/before/);
        expect(fixBreakdown(record, { cost: -5 }, now).error).toMatch(/cost/);
        const down = rigStatus([record], 'r1', { now });
        expect(down).toMatchObject({ state: 'down', hours: 10 });
        const fixed = fixBreakdown(record, { endAt: t('2026-11-26T14:30:00'), cost: '4500', fixNote: 'hose' }, now).record;
        expect(downHours(fixed)).toBe(6.5);
        expect(rigStatus([fixed], 'r1', { now }).state).toBe('idle');
        expect(rigStatus([fixed], 'r1', { now, todayBills: [{ snapshot: { totalDepth: 500, drillingType: 'repair', oldBoreDepth: 200 } }] })).toMatchObject({ state: 'working', feetToday: 300, boresToday: 1 });
        expect(rigStatus([], 'r1', { now, drillingNow: true }).state).toBe('working');
        expect(fmtHours(0.5)).toBe('30 min');
        expect(fmtHours(6.5)).toBe('6.5 h');
        expect(fmtHours(50)).toBe('2 d 2 h');
    });

    it('month summary splits downtime across months; repair cost counts in the month it was fixed', () => {
        const list = [
            { id: 'a', rigId: 'r1', reason: 'engine', startAt: t('2026-10-31T20:00:00'), endAt: t('2026-11-01T08:00:00'), cost: 3000 },
            { id: 'b', rigId: 'r1', reason: 'stuck', startAt: t('2026-11-10T09:00:00'), endAt: t('2026-11-10T13:00:00'), cost: 0 },
            { id: 'c', rigId: 'r2', reason: 'engine', startAt: t('2026-11-12T09:00:00'), endAt: t('2026-11-12T19:00:00'), cost: 9000 },
            { id: 'd', rigId: 'r1', reason: 'engine', startAt: t('2026-11-15T09:00:00'), endAt: t('2026-11-15T10:00:00'), cost: 500, deleted: true }
        ];
        const nov = monthSummary(list, 'r1', '2026-11');
        expect(nov).toMatchObject({ count: 1, hours: 12, cost: 3000 });
        expect(nov.byReason.map((r) => [r.key, r.hours])).toEqual([['engine', 8], ['stuck', 4]]);
        expect(monthSummary(list, 'r1', '2026-10')).toMatchObject({ count: 1, hours: 4, cost: 0 });
        expect(history(list, 'r1').map((b) => b.id)).toEqual(['b', 'a']);
        const rows = transactions({ breakdowns: list }, '2026-11-01', '2026-11-30', { onRigItem: (x) => x.rigId === 'r1' });
        expect(rows.map((r) => [r.kind, r.amount, r.date])).toEqual([['repair', 3000, '2026-11-01']]);
    });
});
