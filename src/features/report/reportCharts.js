// Small, dependency-free charts for the owner report: a column chart (trend) and bar lists.
// Thin marks, hairline grid, one tooltip, and every value also reachable without hovering
// (bar lists print their values; the trend has a "View numbers" table). Text goes in with
// textContent only, because names come from the user's own bills.

const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, text) => {
    const n = tag.startsWith('svg:') ? document.createElementNS(SVG, tag.slice(4)) : document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, v);
    if (text !== undefined) n.textContent = text;
    return n;
};

export const inr = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN');
/** ₹ in Indian short form for axis ticks: ₹0 / ₹50K / ₹1.5L / ₹2Cr. */
export function inrShort(n) {
    const v = Math.abs(n);
    if (v >= 1e7) return `₹${trim(n / 1e7)}Cr`;
    if (v >= 1e5) return `₹${trim(n / 1e5)}L`;
    if (v >= 1e3) return `₹${trim(n / 1e3)}K`;
    return `₹${Math.round(n)}`;
}
const trim = (x) => (Math.round(x * 10) / 10).toString();

/** 0 and 3–5 round steps covering max. */
export function niceTicks(max, count = 4) {
    if (!(max > 0)) return [0];
    const raw = max / count;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const ticks = [];
    for (let v = 0; v < max + step * 0.999; v += step) ticks.push(Math.round(v));
    return ticks;
}

/** Bar shape with a 4px rounded top and a square base. */
function barPath(x, y, w, h) {
    const r = Math.min(4, w / 2, h);
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/**
 * Column chart, one or more series per step.
 * opts: { buckets, series: [{ key, label, color }], label(b), title(b), fmt(v), fmtAxis(v), emptyText }
 */
export function columnChart(host, opts) {
    host.textContent = '';
    const { buckets, series } = opts;
    const fmt = opts.fmt || inr;
    const fmtAxis = opts.fmtAxis || inrShort;
    const max = Math.max(0, ...buckets.flatMap((b) => series.map((s) => b[s.key] || 0)));

    if (series.length > 1) {
        const legend = el('div', { class: 'rc-legend' });
        for (const s of series) {
            const item = el('span', { class: 'rc-legend-item' });
            item.append(el('span', { class: 'rc-swatch', style: `background:${s.color}` }), document.createTextNode(s.label));
            legend.append(item);
        }
        host.append(legend);
    }

    const wrap = el('div', { class: 'rc-plot' });
    host.append(wrap);
    if (!buckets.length || max === 0) {
        wrap.append(el('div', { class: 'rc-empty' }, opts.emptyText || 'Nothing in this period yet'));
        return;
    }

    const W = Math.max(260, Math.floor(wrap.clientWidth || host.clientWidth || 320));
    const ticks = niceTicks(max);
    const top = ticks[ticks.length - 1];
    const left = Math.max(...ticks.map((t) => fmtAxis(t).length)) * 6.4 + 10;
    const pad = { t: 8, r: 4, b: 24, l: left };
    const H = 180;
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;
    const y = (v) => pad.t + plotH - (v / top) * plotH;
    const band = plotW / buckets.length;
    const gap = 2;
    const barW = Math.max(2, Math.min(24, (band * 0.72 - gap * (series.length - 1)) / series.length));
    const groupW = barW * series.length + gap * (series.length - 1);

    const svg = el('svg:svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.ariaLabel || 'Chart' });
    const hover = el('svg:rect', { class: 'rc-hover', x: 0, y: pad.t, width: band, height: plotH, rx: 4, visibility: 'hidden' });
    svg.append(hover);

    for (const t of ticks) {
        const ty = Math.round(y(t)) + 0.5;
        svg.append(el('svg:line', { class: t === 0 ? 'rc-axis' : 'rc-grid', x1: pad.l, x2: W - pad.r, y1: ty, y2: ty }));
        svg.append(el('svg:text', { class: 'rc-tick', x: pad.l - 6, y: ty + 3.5, 'text-anchor': 'end' }, fmtAxis(t)));
    }

    const every = Math.ceil(buckets.length / Math.max(2, Math.floor(plotW / 56)));
    buckets.forEach((b, i) => {
        const x0 = pad.l + band * i + (band - groupW) / 2;
        series.forEach((s, k) => {
            const v = b[s.key] || 0;
            if (v <= 0) return;
            const h = Math.max(1.5, (v / top) * plotH);
            svg.append(el('svg:path', { d: barPath(x0 + k * (barW + gap), pad.t + plotH - h, barW, h), fill: s.color }));
        });
        if (i % every === 0) {
            svg.append(el('svg:text', { class: 'rc-tick', x: pad.l + band * i + band / 2, y: H - 7, 'text-anchor': 'middle' }, opts.label(b)));
        }
    });

    // Hit areas: the whole step, not just the thin bars. Keyboard focus shows the same tooltip.
    const tip = el('div', { class: 'rc-tip', role: 'status' });
    tip.hidden = true;
    const show = (b, i) => {
        hover.setAttribute('x', pad.l + band * i);
        hover.setAttribute('visibility', 'visible');
        tip.textContent = '';
        tip.append(el('div', { class: 'rc-tip-title' }, opts.title(b)));
        for (const s of series) {
            const row = el('div', { class: 'rc-tip-row' });
            row.append(el('span', { class: 'rc-tip-key', style: `background:${s.color}` }), el('strong', {}, fmt(b[s.key] || 0)), el('span', {}, s.label));
            tip.append(row);
        }
        if (opts.extra) { const x = opts.extra(b); if (x) tip.append(el('div', { class: 'rc-tip-extra' }, x)); }
        tip.hidden = false;
        const cx = pad.l + band * i + band / 2;
        const tw = tip.offsetWidth;
        tip.style.left = `${Math.min(Math.max(0, cx - tw / 2), W - tw)}px`;
    };
    const hide = () => { hover.setAttribute('visibility', 'hidden'); tip.hidden = true; };
    buckets.forEach((b, i) => {
        const hit = el('svg:rect', {
            class: 'rc-hit', x: pad.l + band * i, y: pad.t, width: band, height: plotH, tabindex: 0,
            'aria-label': `${opts.title(b)}: ${series.map((s) => `${s.label} ${fmt(b[s.key] || 0)}`).join(', ')}`
        });
        hit.addEventListener('pointerenter', () => show(b, i));
        hit.addEventListener('pointerdown', () => show(b, i));
        hit.addEventListener('focus', () => show(b, i));
        hit.addEventListener('blur', hide);
        svg.append(hit);
    });
    svg.addEventListener('pointerleave', hide);

    wrap.append(svg, tip);

    // Same numbers as a table (no hovering needed).
    const details = el('details', { class: 'rc-table-wrap' });
    details.append(el('summary', {}, 'View numbers'));
    const table = el('table', { class: 'rc-table' });
    const head = el('tr');
    head.append(el('th', {}, opts.periodHeading || 'Period'), ...series.map((s) => el('th', {}, s.label)));
    if (opts.extraHeading) head.append(el('th', {}, opts.extraHeading));
    table.append(head);
    for (const b of buckets) {
        if (!series.some((s) => b[s.key]) && !(opts.extraValue && opts.extraValue(b))) continue;
        const tr = el('tr');
        tr.append(el('td', {}, opts.title(b)), ...series.map((s) => el('td', {}, fmt(b[s.key] || 0))));
        if (opts.extraHeading) tr.append(el('td', {}, opts.extraValue(b)));
        table.append(tr);
    }
    details.append(table);
    host.append(details);
}

/**
 * Rows of name · value with a thin bar under each (one hue). Values are always printed.
 * rows: [{ label, sub, value, valueText, action: { href, text, title } }]
 */
export function barList(host, rows, { color, emptyText = 'Nothing yet', max } = {}) {
    host.textContent = '';
    if (!rows.length || !rows.some((r) => r.value > 0)) {
        host.append(el('div', { class: 'rc-empty' }, emptyText));
        return;
    }
    const top = max || Math.max(...rows.map((r) => r.value));
    const list = el('div', { class: 'rc-list' });
    for (const r of rows) {
        const row = el('div', { class: 'rc-row' });
        const head = el('div', { class: 'rc-row-head' });
        const name = el('div', { class: 'rc-row-name' });
        name.append(el('span', {}, r.label));
        if (r.sub) name.append(el('small', {}, r.sub));
        head.append(name);
        const right = el('div', { class: 'rc-row-right' });
        right.append(el('strong', {}, r.valueText));
        if (r.action) {
            const a = el('a', { class: 'rc-row-act', href: r.action.href, target: '_blank', rel: 'noopener', title: r.action.title || r.action.text, 'aria-label': r.action.title || r.action.text }, r.action.text);
            right.append(a);
        }
        head.append(right);
        const track = el('div', { class: 'rc-track' });
        track.append(el('div', { class: 'rc-fill', style: `width:${top ? Math.max(r.value > 0 ? 2 : 0, (r.value / top) * 100) : 0}%;background:${color}` }));
        row.append(head, track);
        list.append(row);
    }
    host.append(list);
}
