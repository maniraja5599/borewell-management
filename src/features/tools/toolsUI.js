// Bits & Hammers sheet, per rig: add a purchase (with price), see what is in use, mark one finished
// (worn out / cracked), sell finished ones as scrap. Owner: everything. Manager: their rigs.
// Office staff: with the "stock" tick. Only the owner deletes. Logic: toolsMath.js.
import { STORAGE_KEYS, storage } from '../../data/storage.js';
import { can, isOwnerOrLocal, visibleRigs, getCurrentRig } from '../../cloud/access.js';
import { icon, paintIcons } from '../../ui/icon.js';
import { el, btn, field, input, seg, openSheet, item, label, pill } from '../../ui/sheet.js';
import { todayYmd } from '../workers/workersMath.js';
import {
    TOOL_KINDS, TOOL_SIZES, NEW_BIT_MM, STATUS, toolLimits, makeTool, finishTool, sellTool, reuseTool,
    toolName, toolLine, toolSummary, knownBrands, shortDate
} from './toolsMath.js';

export const readTools = () => storage.getList(STORAGE_KEYS.tools) || [];

function saveTools(app, list) {
    if (app?.saveToStorage) return app.saveToStorage(STORAGE_KEYS.tools, list);
    storage.setList(STORAGE_KEYS.tools, list);
    return true;
}

const LOCAL_RIG = 'local'; // single-user phone (no rigs from the cloud yet)
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export function openTools(app) {
    if (!can('stock')) { app?.showToast?.('You do not have access to bits and hammers. Ask the owner.'); return; }
    const rigs = visibleRigs().length ? visibleRigs() : [{ id: LOCAL_RIG, name: '' }];
    let rigId = rigs.some((r) => r.id === getCurrentRig()?.id) ? getCurrentRig().id : rigs[0].id;
    let tab = 'active';
    let adding = false;

    const sheet = openSheet({ title: 'Bits & Hammers', sub: '', ic: 'hammer', onClose: () => window.removeEventListener('drillrig:tools-changed', render) });

    function purchaseForm(existing, onDone) {
        const uid = existing ? existing.id.slice(-6) : 'new';
        let kind = existing?.tool || 'bit';
        let size = existing?.size || '6.5';
        const code = input(`tlCode${uid}`, { type: 'text', maxlength: '40', placeholder: 'e.g. KB-1023', value: existing?.code || '', autocapitalize: 'characters' });
        const brandList = `tlBrands${uid}`;
        const brand = input(`tlBrand${uid}`, { type: 'text', maxlength: '60', placeholder: 'e.g. Mission', value: existing?.brand || '', list: brandList });
        const brands = el('datalist', { id: brandList }, knownBrands(readTools()).map((b) => el('option', { value: b })));
        const mm = input(`tlMm${uid}`, { type: 'number', inputmode: 'decimal', min: '50', max: '400', step: '0.5', value: existing ? (existing.newMm ?? '') : NEW_BIT_MM['6.5'] });
        const price = input(`tlPrice${uid}`, { type: 'number', inputmode: 'numeric', min: '0', step: '1', placeholder: 'e.g. 9500', value: existing?.price ?? '' });
        const date = input(`tlDate${uid}`, { type: 'date', value: existing?.purchasedOn || todayYmd() });
        const note = input(`tlNote${uid}`, { type: 'text', maxlength: '200', placeholder: 'Optional (shop name, bill no.)', value: existing?.note || '' });
        // One ID box for both: "Bit ID" (needed) or "Hammer number" (optional).
        const codeField = field(`tlCode${uid}`, 'Bit ID', code, 'Letters and numbers written on the bit');
        const codeLabel = codeField.querySelector('label');
        const codeHint = codeField.querySelector('small');
        const mmField = field(`tlMm${uid}`, 'New size (mm)', mm);
        const sizeSeg = seg(`tlSize${uid}`, TOOL_SIZES, size, (v) => { size = v; });
        const sizeBlock = el('div', { class: 'tt-block' }, [el('span', { class: 'tt-mini', text: 'Hammer size' }), sizeSeg]);
        const showKind = () => {
            codeLabel.textContent = kind === 'bit' ? 'Bit ID' : 'Hammer number (optional)';
            code.placeholder = kind === 'bit' ? 'e.g. KB-1023' : 'If it has one';
            codeHint.hidden = kind !== 'bit';
            mmField.hidden = kind !== 'bit';
            sizeBlock.hidden = kind !== 'hammer'; // bits are 6.5″ only
            if (kind === 'bit') size = '6.5';
            if (kind === 'bit' && !existing && !mm.value && NEW_BIT_MM[size]) mm.value = NEW_BIT_MM[size];
        };
        const kindBlock = el('div', { class: 'tt-block' }, [codeField, mmField]);
        const err = el('p', { class: 'tt-msg', role: 'alert', hidden: true });
        const save = btn(existing ? 'Save' : 'Add', {
            kind: 'pri', ic: 'check',
            onclick: () => {
                const list = readTools();
                const res = makeTool({
                    tool: kind, size, code: code.value, brand: brand.value, newMm: kind === 'bit' ? mm.value : null,
                    price: price.value, purchasedOn: date.value, note: note.value, rigId
                }, { existing, tools: list });
                if (res.error) { err.hidden = false; err.textContent = res.error; return; }
                const next = existing ? list.map((t) => (t.id === existing.id ? res.tool : t)) : [res.tool, ...list];
                if (!saveTools(app, next)) return;
                onDone?.();
                sheet.say(`${toolName(res.tool)} ${existing ? 'saved' : 'added'}.`, true);
                render();
            }
        });
        showKind();
        return el('div', { class: 'tt-form' }, [
            existing ? null : seg(`tlKind${uid}`, TOOL_KINDS, kind, (v) => { kind = v; showKind(); }),
            sizeBlock,
            kindBlock,
            field(`tlBrand${uid}`, 'Brand', brand), brands,
            el('div', { class: 'tt-fields is-half' }, [field(`tlPrice${uid}`, 'Price (₹)', price), field(`tlDate${uid}`, 'Bought on', date)]),
            field(`tlNote${uid}`, 'Note', note),
            err,
            el('div', { class: 'tt-acts is-two' }, [existing ? null : btn('Cancel', { onclick: () => { adding = false; render(); } }), save])
        ]);
    }

    function finishForm(t) {
        const date = input(`tlFin${t.id.slice(-6)}`, { type: 'date', value: todayYmd() });
        const reason = input(`tlWhy${t.id.slice(-6)}`, { type: 'text', maxlength: '120', placeholder: t.tool === 'bit' ? 'e.g. below 158 mm' : 'e.g. cracked' });
        return el('div', { class: 'tt-form is-inline' }, [
            el('div', { class: 'tt-fields is-half' }, [field(date.id, 'Finished on', date), field(reason.id, 'Why', reason)]),
            btn('Mark finished', {
                kind: 'pri', ic: 'flag',
                onclick: () => {
                    saveTools(app, readTools().map((x) => (x.id === t.id ? finishTool(x, { date: date.value, reason: reason.value }) : x)));
                    sheet.say(`${toolName(t)} moved to Finished.`, true);
                    render();
                }
            })
        ]);
    }

    function sellForm(t) {
        const amount = input(`tlAmt${t.id.slice(-6)}`, { type: 'number', inputmode: 'numeric', min: '0', placeholder: 'e.g. 1200' });
        const date = input(`tlSold${t.id.slice(-6)}`, { type: 'date', value: todayYmd() });
        const buyer = input(`tlBuyer${t.id.slice(-6)}`, { type: 'text', maxlength: '80', placeholder: 'Optional' });
        const err = el('p', { class: 'tt-msg', role: 'alert', hidden: true });
        return el('div', { class: 'tt-form is-inline' }, [
            el('div', { class: 'tt-fields is-half' }, [field(amount.id, 'Sold for (₹)', amount), field(date.id, 'Sold on', date)]),
            field(buyer.id, 'Sold to', buyer),
            err,
            btn('Sold as scrap', {
                kind: 'pri', ic: 'indian-rupee',
                onclick: () => {
                    const res = sellTool(t, { amount: amount.value, date: date.value, buyer: buyer.value });
                    if (res.error) { err.hidden = false; err.textContent = res.error; return; }
                    saveTools(app, readTools().map((x) => (x.id === t.id ? res.tool : x)));
                    sheet.say(`${toolName(t)} sold for ${inr(res.tool.soldAmount)}.`, true);
                    render();
                }
            })
        ]);
    }

    // Owner: when to warn (bit worn below X mm, hammer past X feet). Used by the work log next.
    function limitsFold() {
        const l = toolLimits(app.brand);
        const mm = input('tlLimMm', { type: 'number', inputmode: 'decimal', step: '0.5', min: '50', value: String(l.bitWarnMm) });
        const h65 = input('tlLimH65', { type: 'number', inputmode: 'numeric', step: '500', min: '100', value: String(l.hammerWarnFt['6.5']) });
        const h9 = input('tlLimH9', { type: 'number', inputmode: 'numeric', step: '500', min: '100', value: String(l.hammerWarnFt['9']) });
        return el('details', { class: 'tt-fold tt-card' }, [
            el('summary', {}, [el('span', { class: 'tt-tile is-grey' }, [icon('bell')]), el('span', { class: 'tt-fold-title', text: 'Warning limits' }), el('span', { class: 'tt-chev', 'aria-hidden': 'true' }, [icon('chevron-right')])]),
            el('div', { class: 'tt-fold-body' }, [
                field('tlLimMm', 'Warn when a bit is below (mm)', mm, 'New 6.5″ bit = 165 mm'),
                el('div', { class: 'tt-fields is-half' }, [field('tlLimH65', '6.5″ hammer: warn after (ft)', h65), field('tlLimH9', '9″ OB hammer: warn after (ft)', h9)]),
                btn('Save limits', {
                    kind: 'pri', ic: 'check',
                    onclick: () => {
                        const pos = (v, d) => (Number(v) > 0 ? Math.round(Number(v) * 2) / 2 : d);
                        app.brand.bitWarnMm = pos(mm.value, l.bitWarnMm);
                        app.brand.hammerWarnFt = { '6.5': Math.round(pos(h65.value, l.hammerWarnFt['6.5'])), '9': Math.round(pos(h9.value, l.hammerWarnFt['9'])) };
                        app.saveToStorage(STORAGE_KEYS.brand, app.brand);
                        sheet.say('Warning limits saved.', true);
                    }
                })
            ])
        ]);
    }

    function row(t) {
        const st = t.status || 'active';
        const extra = st === 'finished' ? `Finished ${shortDate(t.finishedOn)}${t.finishReason ? ` · ${t.finishReason}` : ''}`
            : st === 'sold' ? `Sold ${shortDate(t.soldOn)} for ${inr(t.soldAmount)}${t.buyer ? ` · ${t.buyer}` : ''}` : '';
        return item({
            avatar: el('span', { class: `tt-avatar is-tool is-${t.tool}`, 'aria-hidden': 'true' }, [icon(t.tool === 'bit' ? 'drill' : 'hammer')]),
            title: toolName(t),
            subText: [toolLine(t), extra].filter(Boolean).join(' · '),
            pill: pill(st === 'active' ? (t.tool === 'bit' ? 'Bit' : 'Hammer') : STATUS[st], st === 'active' ? 'is-ok' : st === 'sold' ? 'is-muted' : 'is-warn'),
            bodyKids: () => [
                st === 'active' ? el('p', { class: 'tt-hint', text: 'Feet drilled and mm wear will show here once bores are logged with this tool (work details on the bill, coming next).' }) : null,
                st === 'active' ? purchaseForm(t) : null,
                st === 'active' ? finishForm(t) : null,
                st === 'finished' ? sellForm(t) : null,
                el('div', { class: 'tt-acts' }, [
                    st !== 'active' ? btn('Back in use', {
                        ic: 'rotate-ccw',
                        onclick: () => { saveTools(app, readTools().map((x) => (x.id === t.id ? reuseTool(x) : x))); render(); }
                    }) : null,
                    isOwnerOrLocal() ? btn('Delete', {
                        kind: 'danger', ic: 'trash-2',
                        onclick: () => app.confirmDeleteModal({
                            title: 'Delete this purchase?',
                            subtitle: 'Only if it was added by mistake',
                            itemLabel: toolName(t),
                            message: 'Its price comes out of your expenses. Use "Mark finished" for a worn-out one. This cannot be undone.',
                            confirmBtnLabel: 'Delete',
                            onConfirm: () => { saveTools(app, readTools().filter((x) => x.id !== t.id)); render(); }
                        })
                    }) : null
                ])
            ]
        });
    }

    function render() {
        const forRig = readTools().filter((t) => (rigId === LOCAL_RIG ? true : t.rigId === rigId));
        const s = toolSummary(forRig);
        const rigLabel = rigs.find((r) => r.id === rigId)?.name;
        sheet.setSub(`${rigLabel ? `${rigLabel} · ` : ''}${s.bitsInUse} bit${s.bitsInUse === 1 ? '' : 's'} and ${s.hammersInUse} hammer${s.hammersInUse === 1 ? '' : 's'} in use`);
        const list = forRig.filter((t) => (t.status || 'active') === tab)
            .sort((a, b) => String(b.purchasedOn || '').localeCompare(String(a.purchasedOn || '')));
        const tabs = [
            { key: 'active', label: `In use (${s.bitsInUse + s.hammersInUse})` },
            { key: 'finished', label: `Finished (${s.finished})` },
            { key: 'sold', label: `Sold (${s.sold})` }
        ];
        const bits = list.filter((t) => t.tool === 'bit');
        const hammers = list.filter((t) => t.tool === 'hammer');
        sheet.body.replaceChildren(...[
            rigs.length > 1 ? seg('tlRig', rigs.map((r) => ({ key: r.id, label: r.name })), rigId, (v) => { rigId = v; adding = false; render(); }) : null,
            el('div', { class: 'tt-card tt-stats' }, [
                el('div', {}, [el('small', { text: 'Bought this month' }), el('strong', { text: inr(s.boughtThisMonth) })]),
                el('div', {}, [el('small', { text: 'Scrap sold' }), el('strong', { text: inr(s.scrapTotal) })])
            ]),
            adding ? el('div', { class: 'tt-card' }, [el('div', { class: 'tt-form-head' }, [el('strong', { text: 'New purchase' })]), purchaseForm(null, () => { adding = false; })])
                : btn('Add purchase', { kind: 'soft', ic: 'plus', cls: 'tt-wide', onclick: () => { adding = true; render(); } }),
            seg('tlTab', tabs, tab, (v) => { tab = v; render(); }),
            bits.length ? label('Bits', bits.length) : null,
            bits.length ? el('div', { class: 'tt-card' }, [el('div', { class: 'tt-list' }, bits.map(row))]) : null,
            hammers.length ? label('Hammers', hammers.length) : null,
            hammers.length ? el('div', { class: 'tt-card' }, [el('div', { class: 'tt-list' }, hammers.map(row))]) : null,
            !list.length ? el('p', { class: 'tt-empty', text: tab === 'active' ? 'Nothing in use. Add the bits and hammers on this rig.' : tab === 'finished' ? 'No finished bits or hammers.' : 'Nothing sold as scrap yet.' }) : null,
            isOwnerOrLocal() ? limitsFold() : null
        ].filter(Boolean));
        paintIcons();
    }

    window.addEventListener('drillrig:tools-changed', render);
    render();
}
