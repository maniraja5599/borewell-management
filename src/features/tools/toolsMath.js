// Bits and hammers bought for a rig. Each one is a record (kind 'tool', migration 0014) with its
// rig, size, brand, price and status:  In use → Finished (worn out / cracked) → Sold (scrap).
// The purchase is a cost in the month it was bought (owner's rule). Feet drilled and mm wear come
// from the work log on each bill (next phase).
import { todayYmd } from '../workers/workersMath.js';

export const TOOL_KINDS = [
    { key: 'bit', label: 'Bit' },
    { key: 'hammer', label: 'Hammer' }
];
// 6.5″ = main bore; 9″ OB = over-size hammer for the 7″ casing section.
// Bits: 6.5″ only for now (the owner does not track OB bits: they do not measure them).
export const TOOL_SIZES = [
    { key: '6.5', label: '6.5″' },
    { key: '9', label: '9″ OB' }
];
export const NEW_BIT_MM = { '6.5': 165 };

/** Warning limits (owner can change them; saved in the company profile so every phone uses them). */
export const DEFAULT_LIMITS = Object.freeze({ bitWarnMm: 158, hammerWarnFt: { '6.5': 10000, '9': 15000 } });
export function toolLimits(brand) {
    const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
    const h = brand?.hammerWarnFt || {};
    return {
        bitWarnMm: num(brand?.bitWarnMm, DEFAULT_LIMITS.bitWarnMm),
        hammerWarnFt: { '6.5': num(h['6.5'], DEFAULT_LIMITS.hammerWarnFt['6.5']), '9': num(h['9'], DEFAULT_LIMITS.hammerWarnFt['9']) }
    };
}
export const STATUS = { active: 'In use', finished: 'Finished', sold: 'Sold' };

const sizeLabel = (size) => (TOOL_SIZES.find((s) => s.key === size) || { label: `${size}″` }).label;
const ymdOk = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
const money = (v) => {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(String(v).replace(/[,₹\s]/g, ''));
    return Number.isFinite(n) && n >= 0 && n <= 10000000 ? Math.round(n) : NaN;
};

export function shortDate(ymd) {
    if (!ymdOk(ymd)) return '';
    const [y, m, d] = ymd.split('-').map(Number);
    return `${d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${y}`;
}

/** Bit: its ID. Hammer: size + brand + date first used (or bought), e.g. "6.5″ Mission · from 12 Nov 2026". */
export function toolName(t) {
    if (!t) return '';
    if (t.tool === 'bit') return String(t.code || '').trim() || `${sizeLabel(t.size)} bit`;
    const when = shortDate(t.firstUsedOn || t.purchasedOn);
    return `${sizeLabel(t.size)} ${String(t.brand || '').trim() || 'hammer'}${when ? ` · from ${when}` : ''}`;
}

/** One line under the name. */
export function toolLine(t) {
    const parts = [t.tool === 'bit' ? `${sizeLabel(t.size)} bit` : 'Hammer'];
    if (t.tool === 'bit' && t.brand) parts.push(t.brand);
    if (t.tool === 'bit' && Number(t.newMm) > 0) parts.push(`new ${t.newMm} mm`);
    if (t.tool === 'hammer' && t.code) parts.push(`No. ${t.code}`);
    if (Number(t.price) > 0) parts.push(`₹${Number(t.price).toLocaleString('en-IN')}`);
    if (t.purchasedOn) parts.push(`bought ${shortDate(t.purchasedOn)}`);
    return parts.join(' · ');
}

/** Check and build a purchase from the form. Returns { tool } or { error }. */
export function makeTool(input, { existing = null, tools = [], now = new Date() } = {}) {
    const tool = input?.tool === 'hammer' ? 'hammer' : 'bit';
    const size = tool === 'bit' ? '6.5' : (TOOL_SIZES.some((s) => s.key === input?.size) ? input.size : '6.5');
    const brand = String(input?.brand || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const code = String(input?.code || '').replace(/\s+/g, ' ').trim().toUpperCase().slice(0, 40);
    if (tool === 'bit' && !code) return { error: 'Enter the bit’s ID (letters and numbers on the bit).' };
    if (tool === 'hammer' && !brand) return { error: 'Enter the hammer’s brand.' };
    if (code && tools.some((t) => t.id !== existing?.id && t.tool === tool && String(t.code || '').toUpperCase() === code && t.status !== 'sold')) {
        return { error: `${code} is already in your list.` };
    }
    let newMm = null;
    if (tool === 'bit' && input?.newMm !== '' && input?.newMm !== undefined && input?.newMm !== null) {
        newMm = Math.round(Number(input.newMm) * 2) / 2; // 0.5 mm steps
        if (!Number.isFinite(newMm) || newMm < 50 || newMm > 400) return { error: 'Enter the new bit size in mm (for example 165).' };
    }
    const price = money(input?.price);
    if (Number.isNaN(price)) return { error: 'Enter the price in rupees.' };
    const purchasedOn = ymdOk(input?.purchasedOn) ? input.purchasedOn : todayYmd(now);
    if (!input?.rigId) return { error: 'Choose the rig.' };

    const at = now.toISOString();
    const base = existing ? { ...existing } : {
        id: `tool_${now.getTime()}_${Math.random().toString(36).slice(2, 7)}`,
        status: 'active',
        createdAt: at
    };
    return {
        tool: {
            ...base,
            tool, size, brand, code,
            newMm,
            price,
            purchasedOn,
            rigId: input.rigId,
            note: String(input?.note || '').trim().slice(0, 200),
            updatedAt: at
        }
    };
}

/** Worn out / cracked. */
export function finishTool(t, { date, reason } = {}, now = new Date()) {
    return { ...t, status: 'finished', finishedOn: ymdOk(date) ? date : todayYmd(now), finishReason: String(reason || '').trim().slice(0, 120), updatedAt: now.toISOString() };
}

/** Sold as scrap (only a finished one). Returns { tool } or { error }. */
export function sellTool(t, { date, amount, buyer } = {}, now = new Date()) {
    const amt = money(amount);
    if (amt === null || Number.isNaN(amt)) return { error: 'Enter how much it was sold for.' };
    return {
        tool: {
            ...t, status: 'sold', finishedOn: t.finishedOn || todayYmd(now),
            soldOn: ymdOk(date) ? date : todayYmd(now), soldAmount: amt,
            buyer: String(buyer || '').trim().slice(0, 80), updatedAt: now.toISOString()
        }
    };
}

/** Back in use (marked finished by mistake). */
export function reuseTool(t, now = new Date()) {
    const { finishedOn, finishReason, soldOn, soldAmount, buyer, ...rest } = t;
    return { ...rest, status: 'active', updatedAt: now.toISOString() };
}

/** Counts and money for one rig (or all when rigId is null). */
export function toolSummary(tools, { rigId = null, month = todayYmd().slice(0, 7) } = {}) {
    const list = (tools || []).filter((t) => t && (!rigId || t.rigId === rigId));
    const count = (status, kind) => list.filter((t) => t.status === status && t.tool === kind).length;
    return {
        bitsInUse: count('active', 'bit'),
        hammersInUse: count('active', 'hammer'),
        finished: list.filter((t) => t.status === 'finished').length,
        sold: list.filter((t) => t.status === 'sold').length,
        boughtThisMonth: list.filter((t) => String(t.purchasedOn || '').startsWith(month)).reduce((s, t) => s + (Number(t.price) || 0), 0),
        scrapTotal: list.filter((t) => t.status === 'sold').reduce((s, t) => s + (Number(t.soldAmount) || 0), 0)
    };
}

/** Brands typed before, most used first (for suggestions). */
export function knownBrands(tools, kind = null) {
    const n = new Map();
    for (const t of tools || []) {
        const b = String(t?.brand || '').trim();
        if (!b || (kind && t.tool !== kind)) continue;
        n.set(b, (n.get(b) || 0) + 1);
    }
    return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([b]) => b);
}
