import { indianMobile, MOBILE_HELP } from '../../core/phone.js';

// Workers = the payroll list: operators, drivers, helpers, labour, office staff. They never sign in;
// the owner, office staff (with "workers") or a manager (their rigs) keep the list. Each worker gets
// a short ID so two people with the same name are told apart ("Kumar · OP-003").
// Synced as record kind 'worker' (migration 0014). Attendance and wages build on this (later phase).

export const WORKER_TYPES = [
    { key: 'operator', label: 'Operator', prefix: 'OP' },
    { key: 'driver', label: 'Driver', prefix: 'DR' },
    { key: 'helper', label: 'Helper', prefix: 'HP' },
    { key: 'labour', label: 'Labour', prefix: 'LB' },
    { key: 'office', label: 'Office', prefix: 'OF' },
    { key: 'other', label: 'Other', prefix: 'OT' }
];
const TYPE = Object.fromEntries(WORKER_TYPES.map((t) => [t.key, t]));

export const typeOf = (key) => TYPE[key] || TYPE.other;
export const todayYmd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const codeNumber = (code, prefix) => {
    const m = String(code || '').match(new RegExp(`^${prefix}-(\\d+)$`));
    return m ? Number(m[1]) : 0;
};

/** Next free ID for this type: OP-001, OP-002, … (numbers are never reused, even for people who left). */
export function nextCode(workers, type) {
    const { prefix } = typeOf(type);
    const max = (workers || []).reduce((m, w) => Math.max(m, codeNumber(w?.code, prefix)), 0);
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

/** "Kumar · OP-003" */
export const workerLabel = (w) => [String(w?.name || '').trim() || 'Worker', w?.code].filter(Boolean).join(' · ');

const cleanPhone = (v) => indianMobile(v);

/** The daily wage on a date: the latest wage entry that starts on or before it. */
export function wageOn(worker, ymd = todayYmd()) {
    const list = (worker?.wages || []).filter((x) => x && x.from && x.from <= ymd).sort((a, b) => (a.from < b.from ? -1 : 1));
    return list.length ? Number(list[list.length - 1].perDay) || 0 : 0;
}

/**
 * Check and build a worker from the form. Returns { worker } or { error }.
 * A changed wage is added from its date, so old days keep the old wage.
 */
export function makeWorker(input, { existing = null, workers = [], now = new Date() } = {}) {
    const name = String(input?.name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!name) return { error: 'Enter the worker’s name.' };
    const type = TYPE[input?.type] ? input.type : 'operator';
    const phoneRaw = String(input?.phone || '').trim();
    const phone = cleanPhone(phoneRaw);
    if (phoneRaw && !phone) return { error: `${MOBILE_HELP} Or leave it empty.` };
    const wage = input?.perDay === '' || input?.perDay === undefined || input?.perDay === null ? null : Number(input.perDay);
    if (wage !== null && (!Number.isFinite(wage) || wage < 0 || wage > 100000)) return { error: 'Enter the daily wage in rupees.' };
    const wageFrom = /^\d{4}-\d{2}-\d{2}$/.test(input?.wageFrom || '') ? input.wageFrom : todayYmd(now);

    const at = now.toISOString();
    const base = existing ? { ...existing } : {
        id: `wkr_${now.getTime()}_${Math.random().toString(36).slice(2, 7)}`,
        status: 'active',
        joinedOn: /^\d{4}-\d{2}-\d{2}$/.test(input?.joinedOn || '') ? input.joinedOn : todayYmd(now),
        wages: [],
        createdAt: at
    };
    // A new type gets a new ID of that type; otherwise the ID never changes.
    const code = !existing || existing.type !== type || !existing.code
        ? nextCode(workers.filter((w) => w.id !== base.id), type)
        : existing.code;
    let wages = Array.isArray(base.wages) ? [...base.wages] : [];
    if (wage !== null && wage !== wageOn({ wages }, wageFrom)) {
        wages = wages.filter((x) => x.from !== wageFrom);
        wages.push({ from: wageFrom, perDay: Math.round(wage) });
        wages.sort((a, b) => (a.from < b.from ? -1 : 1));
    }
    return {
        worker: {
            ...base,
            name,
            type,
            code,
            phone,
            rigId: input?.rigId || null,
            payCycle: ['daily', 'weekly', 'monthly', 'any'].includes(input?.payCycle) ? input.payCycle : (base.payCycle || 'daily'),
            note: String(input?.note || '').trim().slice(0, 200),
            wages,
            updatedAt: at
        }
    };
}

export function setLeft(worker, left, now = new Date()) {
    return { ...worker, status: left ? 'left' : 'active', leftOn: left ? todayYmd(now) : null, updatedAt: now.toISOString() };
}

/**
 * Two phones can give the same ID while offline. The worker added later keeps their place in line
 * and gets the next free number. Every phone works this out the same way. Returns [{ id, code }].
 */
export function duplicateCodeFixes(workers) {
    const fixes = [];
    const list = [...(workers || [])].filter((w) => w && w.code)
        .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')) || String(a.id).localeCompare(String(b.id)));
    const seen = new Set();
    const all = [...list];
    for (const w of list) {
        if (!seen.has(w.code)) { seen.add(w.code); continue; }
        const code = nextCode(all, w.type);
        fixes.push({ id: w.id, code });
        all.push({ ...w, code });
        seen.add(code);
    }
    return fixes;
}
