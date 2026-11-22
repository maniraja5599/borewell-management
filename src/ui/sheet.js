// Shared building blocks for the full-height sheets (Workers, Bits & Hammers, …) in the same look
// as Team & Rigs (styles: team-v2.css "tt-*"). Plain DOM, no innerHTML with user data.
import { icon, paintIcons } from './icon.js';

export function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'text') node.textContent = v;
        else if (k === 'class') node.className = v;
        else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children)) if (c !== null && c !== undefined && c !== false) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return node;
}

/** One button style everywhere: [icon] label. kind: '' (white), 'pri', 'soft', 'danger'. */
export function btn(label, { kind = '', ic = null, onclick, cls = '', disabled = false } = {}) {
    return el('button', { type: 'button', class: `tt-btn${kind ? ` is-${kind}` : ''}${cls ? ` ${cls}` : ''}`, onclick, disabled },
        [ic ? icon(ic) : null, el('span', { text: label })]);
}

export const field = (id, label, input, hint) => el('div', { class: 'tt-field' }, [
    el('label', { for: id, text: label }), input, hint ? el('small', { class: 'tt-hint', text: hint }) : null
]);

export const input = (id, attrs = {}) => el('input', { id, class: 'tt-input', autocomplete: 'off', ...attrs });

/** Radio pills (one choice). options: [{ key, label }] */
export function seg(name, options, value, onChange) {
    return el('div', { class: 'tt-seg is-wrap', role: 'radiogroup' }, options.map((o) => {
        const r = el('input', { type: 'radio', name, value: o.key, checked: o.key === value });
        r.addEventListener('change', () => onChange(o.key));
        return el('label', {}, [r, el('span', { text: o.label })]);
    }));
}

/**
 * Open a sheet. Returns { body, say(text, ok), close, setSub(text) }.
 * Escape and a tap outside close it; focus goes back where it was.
 */
export function openSheet({ title, sub = '', ic = 'list', onClose } = {}) {
    const before = document.activeElement;
    const body = el('div', { class: 'tt-content' });
    const msg = el('div', { class: 'tt-msg', role: 'alert', hidden: true });
    const subEl = el('p', { text: sub });
    const scroller = el('div', { class: 'tt-body' }, [msg, body]);
    const titleId = `sh${Math.random().toString(36).slice(2, 8)}`;
    const closeBtn = el('button', { type: 'button', class: 'tt-icon-btn is-close', 'aria-label': 'Close' }, [icon('x')]);
    const overlay = el('div', { class: 'tm-overlay tt-overlay' }, [
        el('div', { class: 'tt-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId }, [
            el('div', { class: 'tt-head' }, [
                el('span', { class: 'tt-tile is-head' }, [icon(ic)]),
                el('div', { class: 'tt-head-txt' }, [el('h2', { id: titleId, text: title }), subEl]),
                closeBtn
            ]),
            scroller
        ])
    ]);
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    function close() {
        overlay.remove();
        document.removeEventListener('keydown', onKey);
        try { before?.focus?.(); } catch { /* ignore */ }
        onClose?.();
    }
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    paintIcons();
    setTimeout(() => closeBtn.focus(), 50);
    const say = (text, ok = false) => {
        msg.hidden = !text;
        msg.className = `tt-msg${ok ? ' is-ok' : ''}`;
        msg.replaceChildren(...(text ? [icon(ok ? 'circle-check' : 'circle-alert'), el('span', { text })] : []));
        if (text) { scroller.scrollTo({ top: 0, behavior: 'smooth' }); paintIcons(); }
    };
    return { body, say, close, setSub: (t) => { subEl.textContent = t; }, scroller };
}

/** A row that opens to show more (people, bits…). */
export function item({ avatar, title, subText, pill, bodyKids, cls = '' }) {
    const main = el('span', { class: 'tt-row-main' }, [el('strong', { text: title }), subText ? el('small', { text: subText }) : null]);
    if (!bodyKids) return el('div', { class: `tt-item ${cls}` }, [el('div', { class: 'tt-row is-static' }, [avatar, main, pill])]);
    const bodyEl = el('div', { class: 'tt-item-body', hidden: true });
    const row = el('button', { type: 'button', class: 'tt-row', 'aria-expanded': 'false' }, [
        avatar, main, pill, el('span', { class: 'tt-chev', 'aria-hidden': 'true' }, [icon('chevron-right')])
    ]);
    const wrap = el('div', { class: `tt-item ${cls}` }, [row, bodyEl]);
    row.addEventListener('click', () => {
        const open = bodyEl.hidden;
        if (open && !bodyEl.childNodes.length) { bodyEl.append(...[].concat(typeof bodyKids === 'function' ? bodyKids() : bodyKids).filter(Boolean)); paintIcons(); }
        bodyEl.hidden = !open;
        wrap.classList.toggle('is-open', open);
        row.setAttribute('aria-expanded', String(open));
    });
    return wrap;
}

export const label = (text, count = null) => el('div', { class: 'tt-label' }, [el('span', { text }), count !== null ? el('span', { class: 'tt-count', text: String(count) }) : null]);
export const pill = (text, cls = '') => el('span', { class: `tt-pill ${cls}`, text });
export const avatar = (text, cls = '') => el('span', { class: `tt-avatar ${cls}`, 'aria-hidden': 'true', text: String(text || '?').trim().charAt(0).toUpperCase() || '?' });
