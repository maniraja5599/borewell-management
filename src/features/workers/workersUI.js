// Workers sheet: the payroll list (operators, drivers, helpers, labour, office). Nobody here signs in.
// Owner: everything. Office staff: with the "workers" tick. Manager: workers of their rigs.
// Only the owner deletes (others mark a worker as "Left"). Logic: workersMath.js.
import { STORAGE_KEYS, storage } from '../../data/storage.js';
import { can, isOwnerOrLocal, getRole, visibleRigs, rigById } from '../../cloud/access.js';
import { icon, paintIcons } from '../../ui/icon.js';
import { el, btn, field, input, seg, openSheet, item, label, pill, avatar } from '../../ui/sheet.js';
import { WORKER_TYPES, typeOf, makeWorker, setLeft, duplicateCodeFixes, workerLabel, wageOn, todayYmd } from './workersMath.js';

export const readWorkers = () => storage.getList(STORAGE_KEYS.workers) || [];

function saveWorkers(app, list) {
    if (app?.saveToStorage) return app.saveToStorage(STORAGE_KEYS.workers, list);
    storage.setList(STORAGE_KEYS.workers, list);
    return true;
}

const rigName = (id) => (id ? rigById(id)?.name || 'Old rig' : 'Office / no rig');
const showPhone = (p) => (p && p.length === 10 ? `${p.slice(0, 5)} ${p.slice(5)}` : p || '');

/** Workers this phone may see (the server already sends only those; local single-user = all). */
export function activeWorkers(rigId = null) {
    return readWorkers().filter((w) => w && w.status !== 'left' && (!rigId || w.rigId === rigId));
}

export function openWorkers(app) {
    if (!can('workers')) { app?.showToast?.('You do not have access to workers. Ask the owner.'); return; }
    const rigs = visibleRigs();
    const manager = getRole() === 'manager';
    const canNoRig = !manager; // managers keep workers on their own rigs
    let filter = 'all';
    let query = '';
    let adding = false;

    const sheet = openSheet({ title: 'Workers', sub: 'Operators, drivers, helpers — for attendance and wages', ic: 'hard-hat', onClose: () => window.removeEventListener('drillrig:workers-changed', render) });

    // Same ID made on two phones while offline: renumber the later one (same result on every phone).
    const fixes = duplicateCodeFixes(readWorkers());
    if (fixes.length) {
        const by = new Map(fixes.map((f) => [f.id, f.code]));
        saveWorkers(app, readWorkers().map((w) => (by.has(w.id) ? { ...w, code: by.get(w.id), updatedAt: new Date().toISOString() } : w)));
    }

    function form(existing, onDone) {
        const uid = existing ? existing.id.slice(-6) : 'new';
        let type = existing?.type || 'operator';
        const name = input(`wkName${uid}`, { type: 'text', maxlength: '80', placeholder: 'e.g. Kumar', value: existing?.name || '' });
        const phone = input(`wkPhone${uid}`, { type: 'tel', inputmode: 'numeric', maxlength: '14', placeholder: 'Optional', value: showPhone(existing?.phone) });
        const wage = input(`wkWage${uid}`, { type: 'number', inputmode: 'numeric', min: '0', step: '10', placeholder: 'e.g. 800', value: existing ? (wageOn(existing) || '') : '' });
        const wageFrom = input(`wkFrom${uid}`, { type: 'date', value: todayYmd() });
        const joined = existing ? null : input(`wkJoin${uid}`, { type: 'date', value: todayYmd() });
        const note = input(`wkNote${uid}`, { type: 'text', maxlength: '200', placeholder: 'Optional', value: existing?.note || '' });
        const rigOptions = [
            ...rigs.map((r) => ({ key: r.id, label: r.name })),
            ...(canNoRig ? [{ key: '', label: 'Office / no rig' }] : [])
        ];
        let rigId = existing ? (existing.rigId || '') : (filter !== 'all' && filter !== 'none' ? filter : (rigs[0]?.id || ''));
        if (!rigOptions.some((o) => o.key === rigId)) rigId = rigOptions[0]?.key ?? '';
        const err = el('p', { class: 'tt-msg', role: 'alert', hidden: true });
        const save = btn(existing ? 'Save' : 'Add worker', {
            kind: 'pri', ic: 'check',
            onclick: () => {
                const list = readWorkers();
                const res = makeWorker({
                    name: name.value, type, phone: phone.value, rigId: rigId || null,
                    perDay: wage.value, wageFrom: wageFrom.value, joinedOn: joined?.value, note: note.value
                }, { existing, workers: list });
                if (res.error) { err.hidden = false; err.textContent = res.error; return; }
                const next = existing ? list.map((w) => (w.id === existing.id ? res.worker : w)) : [res.worker, ...list];
                if (!saveWorkers(app, next)) return;
                onDone?.();
                sheet.say(`${workerLabel(res.worker)} ${existing ? 'saved' : 'added'}.`, true);
                render();
            }
        });
        return el('div', { class: 'tt-form' }, [
            field(`wkName${uid}`, 'Name', name),
            el('span', { class: 'tt-mini', text: 'Work' }),
            seg(`wkType${uid}`, WORKER_TYPES.map((t) => ({ key: t.key, label: t.label })), type, (v) => { type = v; }),
            rigOptions.length > 1 ? el('span', { class: 'tt-mini', text: 'Rig' }) : null,
            rigOptions.length > 1 ? seg(`wkRig${uid}`, rigOptions, rigId, (v) => { rigId = v; }) : null,
            field(`wkPhone${uid}`, 'Mobile number', phone),
            el('div', { class: 'tt-fields is-half' }, [
                field(`wkWage${uid}`, 'Daily wage (₹)', wage),
                field(`wkFrom${uid}`, existing ? 'New wage from' : 'Wage from', wageFrom)
            ]),
            joined ? field(`wkJoin${uid}`, 'Joined on', joined) : null,
            field(`wkNote${uid}`, 'Note', note),
            err,
            el('div', { class: 'tt-acts is-two' }, [
                existing ? null : btn('Cancel', { onclick: () => { adding = false; render(); } }),
                save
            ])
        ]);
    }

    function row(w) {
        const t = typeOf(w.type);
        const wage = wageOn(w);
        const sub = [t.label, rigs.length || w.rigId ? rigName(w.rigId) : '', w.phone ? showPhone(w.phone) : '', wage ? `₹${wage}/day` : '']
            .filter(Boolean).join(' · ');
        const left = w.status === 'left';
        return item({
            avatar: avatar(w.name, left ? 'is-muted' : ''),
            title: workerLabel(w),
            subText: sub,
            pill: left ? pill('Left', 'is-muted') : pill(w.code ? w.code.slice(0, 2) : t.prefix, `is-${w.type}`),
            bodyKids: () => [
                form(w),
                el('div', { class: 'tt-acts' }, [
                    w.phone ? el('a', { class: 'tt-btn', href: `tel:+91${w.phone}` }, [icon('phone'), el('span', { text: 'Call' })]) : null,
                    btn(left ? 'Rejoined' : 'Mark as left', {
                        ic: left ? 'user-check' : 'user-x',
                        onclick: () => {
                            saveWorkers(app, readWorkers().map((x) => (x.id === w.id ? setLeft(x, !left) : x)));
                            sheet.say(left ? `${w.name} is back.` : `${w.name} marked as left. Their record stays for wages.`, true);
                            render();
                        }
                    }),
                    isOwnerOrLocal() ? btn('Delete', {
                        kind: 'danger', ic: 'trash-2',
                        onclick: () => app.confirmDeleteModal({
                            title: 'Delete this worker?',
                            subtitle: 'Use "Mark as left" to keep their record',
                            itemLabel: workerLabel(w),
                            message: 'Their attendance and wage history will also be gone. This cannot be undone.',
                            confirmBtnLabel: 'Delete',
                            onConfirm: () => { saveWorkers(app, readWorkers().filter((x) => x.id !== w.id)); render(); }
                        })
                    }) : null
                ])
            ]
        });
    }

    function render() {
        const all = readWorkers();
        const q = query.trim().toLowerCase();
        const match = (w) => (filter === 'all' || (filter === 'none' ? !w.rigId : w.rigId === filter))
            && (!q || `${w.name} ${w.code} ${w.phone}`.toLowerCase().includes(q));
        const shown = all.filter(match);
        const active = shown.filter((w) => w.status !== 'left');
        const left = shown.filter((w) => w.status === 'left');
        sheet.setSub(`${all.filter((w) => w.status !== 'left').length} working · operators, drivers, helpers`);

        const search = input('wkSearch', { type: 'search', placeholder: 'Search name, ID or mobile', value: query });
        search.addEventListener('input', () => { query = search.value; const pos = search.selectionStart; render(); const s = document.getElementById('wkSearch'); s?.focus(); s?.setSelectionRange(pos, pos); });
        const filters = [{ key: 'all', label: 'All' }, ...rigs.map((r) => ({ key: r.id, label: r.name })), ...(canNoRig && all.some((w) => !w.rigId) ? [{ key: 'none', label: 'Office' }] : [])];

        const groups = WORKER_TYPES.map((t) => [t, active.filter((w) => (typeOf(w.type).key === t.key))]).filter(([, list]) => list.length);
        sheet.body.replaceChildren(...[
            el('p', { class: 'tt-note is-tip' }, [icon('info'), el('span', { text: 'Workers do not use the app. Each gets an ID (like OP-003) so two people with the same name are not mixed up.' })]),
            adding ? el('div', { class: 'tt-card' }, [el('div', { class: 'tt-form-head' }, [el('strong', { text: 'New worker' })]), form(null, () => { adding = false; })])
                : btn('Add worker', { kind: 'soft', ic: 'user-plus', cls: 'tt-wide', onclick: () => { adding = true; render(); document.getElementById('wkNamenew')?.focus(); } }),
            all.length > 6 ? field('wkSearch', 'Search', search) : null,
            filters.length > 2 ? seg('wkFilter', filters, filter, (v) => { filter = v; render(); }) : null,
            ...groups.flatMap(([t, list]) => [label(`${t.label}s`, list.length), el('div', { class: 'tt-card' }, [el('div', { class: 'tt-list' }, list.map(row))])]),
            !active.length ? el('p', { class: 'tt-empty', text: all.length ? 'Nobody matches.' : 'No workers yet. Add your operators, drivers and helpers.' }) : null,
            left.length ? el('details', { class: 'tt-fold tt-card' }, [
                el('summary', {}, [el('span', { class: 'tt-tile is-grey' }, [icon('user-x')]), el('span', { class: 'tt-fold-title', text: `Left (${left.length})` }), el('span', { class: 'tt-chev', 'aria-hidden': 'true' }, [icon('chevron-right')])]),
                el('div', { class: 'tt-fold-body' }, [el('div', { class: 'tt-list' }, left.map(row))])
            ]) : null
        ].filter(Boolean));
        paintIcons();
    }

    window.addEventListener('drillrig:workers-changed', render);
    render();
}
