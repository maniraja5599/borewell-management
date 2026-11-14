import { describe, it, expect } from 'vitest';
import { safePullRev } from '../src/cloud/syncPlan.js';

const T0 = Date.parse('2026-11-14T10:00:00Z');
const iso = (ms) => new Date(ms).toISOString();

describe('"seen up to" mark after a download', () => {
    it('moves past rows older than two minutes, not past newer ones', () => {
        const page = { now: iso(T0), rows: [
            { rev: 10, updated_at: iso(T0 - 600000) },
            { rev: 11, updated_at: iso(T0 - 121000) },
            { rev: 12, updated_at: iso(T0 - 30000) }
        ] };
        expect(safePullRev([page], 5)).toBe(11);
    });
    it('never moves backwards, and stays put when nothing is old enough or nothing came', () => {
        expect(safePullRev([{ now: iso(T0), rows: [{ rev: 3, updated_at: iso(T0 - 600000) }] }], 9)).toBe(9);
        expect(safePullRev([{ now: iso(T0), rows: [{ rev: 30, updated_at: iso(T0 - 1000) }] }], 9)).toBe(9);
        expect(safePullRev([{ now: iso(T0), rows: [] }], 9)).toBe(9);
        expect(safePullRev([{ now: 'garbage', rows: [{ rev: 30, updated_at: iso(T0 - 600000) }] }], 9)).toBe(9);
    });
});

describe('simulation: slow saves finishing late are never skipped, unchanged rows are not re-read', () => {
    // Saves take 0-8 s (Supabase stops a statement after 8 s). Each gets its rev when it starts
    // writing and becomes visible when it commits. A phone pulls once a minute.
    it('10,000 random saves, 6 phones', () => {
        let seed = 42;
        const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
        let rev = 0;
        const saves = [];
        for (let t = 0; t < 3 * 3600_000; t += Math.floor(rnd() * 2000)) {
            const start = T0 + t;
            const revAt = start + Math.floor(rnd() * 300);
            saves.push({ start, revAt, commit: revAt + Math.floor(rnd() * 8000), id: saves.length });
        }
        saves.sort((a, b) => a.revAt - b.revAt).forEach((s) => { s.rev = ++rev; });
        const visibleAt = (time, since) => saves.filter((s) => s.commit <= time && s.rev > since)
            .map((s) => ({ rev: s.rev, updated_at: iso(s.start), id: s.id }));

        for (let phone = 0; phone < 6; phone++) {
            let mark = 0;
            const seen = new Set();
            let reread = 0;
            const offset = Math.floor(rnd() * 60000);
            for (let t = T0 + offset; t < T0 + 3 * 3600_000 + 120000; t += 60000) {
                const rows = visibleAt(t, mark);
                rows.forEach((r) => { if (seen.has(r.id)) reread++; seen.add(r.id); });
                mark = safePullRev([{ now: iso(t), rows }], mark);
            }
            expect(seen.size).toBe(saves.length);                // nothing missed
            expect(reread / saves.length).toBeLessThan(2.5);     // each row read at most a couple of times, not every minute
        }
    });
});
