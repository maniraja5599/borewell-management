// "New rate" — asks one thing at a time: name, drilling rate, depth slabs, casing pipes, bata,
// old-bore flushing, grace (with an example), GST; then a check-everything screen, save, and
// "use this rate on bills now?". Builds the card directly (no half-edited studio state).
import { STORAGE_KEYS } from '../../data/storage.js';
import { DEPTH_SLABS_DEFINITION } from '../../config/constants.js';

const STEPS = ['name', 'base', 'slabs', 'pipes', 'bata', 'flush', 'grace', 'gst', 'review'];

/** Slab list for a new card. 'standard' keeps the usual steps (+10, +20, +30 … then +100);
 *  'even' adds the same amount at every slab. Ranges are the standard ones (1–300, 301–400 … 2001–2200). */
export function buildWizardSlabs(base, mode = 'standard', step = 10) {
    const b = Math.max(1, Math.round(Number(base) || 0));
    const first = DEPTH_SLABS_DEFINITION[0].defaultRate;
    return DEPTH_SLABS_DEFINITION.map((s, i) => ({
        start: s.start, end: s.end, span: s.span, rangeStr: s.rangeStr,
        rate: mode === 'even' ? b + i * Math.max(0, Math.round(Number(step) || 0)) : Math.max(1, b + (s.defaultRate - first))
    }));
}

/** Problems that stop saving (errors) and things worth a second look (warnings). */
export function checkWizardCard(d, existingNames = []) {
    const errors = [];
    const warnings = [];
    const name = String(d.name || '').trim();
    if (!name) errors.push('Give the rate a name.');
    else if (existingNames.some((n) => n.trim().toLowerCase() === name.toLowerCase())) errors.push(`A rate called "${name}" already exists.`);
    if (!(d.base > 0)) errors.push('Drilling rate must be more than ₹0.');
    const slabs = d.slabs || [];
    if (slabs.some((s, i) => i > 0 && s.rate < slabs[i - 1].rate)) errors.push('A deeper slab is cheaper than the one before it.');
    if (!(d.pvc7 > 0) || !(d.pvc10 > 0)) errors.push('Enter both casing pipe rates.');
    if (d.grace < 0 || d.grace > 50) errors.push('Grace must be between 0 and 50 ft.');
    if (d.gst < 0 || d.gst > 28) errors.push('GST must be between 0% and 28%.');
    if (d.pvc10 > 0 && d.pvc7 > 0 && d.pvc10 < d.pvc7) warnings.push('The 10" pipe is cheaper than the 7" pipe — is that right?');
    if (d.base > 0 && (d.base < 40 || d.base > 400)) warnings.push(`₹${d.base}/ft for drilling is unusual — please check.`);
    if (d.flush > d.base) warnings.push('Old bore flushing costs more than new drilling — please check.');
    if (![0, 5, 12, 18, 28].includes(Number(d.gst))) warnings.push(`GST ${d.gst}% is not a usual GST rate.`);
    return { errors, warnings };
}

export class RateWizardMixin {
    openRateWizard() {
        const r = this.getActiveRateProfile()?.rates || this.rates || this.defaultRates;
        this.rw = {
            step: 0,
            name: '',
            base: Number(r.baseDrillingRate) || 90,
            slabMode: 'standard',
            slabStep: 10,
            pvc7: Number(r.pvc7Rate) || 400,
            pvc10: Number(r.pvc10Rate) || 700,
            bata: r.boreBataRate ?? 2000,
            flush: Number(r.oldBoreRate) || 40,
            grace: r.slabBufferFt ?? 5,
            gst: r.gstPercentage ?? 18,
            savedId: null
        };
        let ov = document.getElementById('rateWizardOverlay');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'rateWizardOverlay';
            ov.className = 'cust-popup-backdrop rw-backdrop';
            ov.innerHTML = `<div class="cust-popup-dialog rw-dialog" role="dialog" aria-modal="true" aria-labelledby="rwTitle">
                <div class="rw-head">
                    <div class="rw-head-txt"><span class="rw-kicker" id="rwKicker"></span><h4 id="rwTitle">New rate</h4></div>
                    <button type="button" class="icon-close-btn" id="rwCloseBtn" aria-label="Close">✕</button>
                </div>
                <div class="rw-progress" aria-hidden="true"><i id="rwProgressBar"></i></div>
                <div class="rw-body" id="rwBody"></div>
                <div class="rw-foot" id="rwFoot"></div>
            </div>`;
            document.body.appendChild(ov);
            ov.addEventListener('click', (e) => { if (e.target === ov) this.closeRateWizard(); });
            ov.querySelector('#rwCloseBtn').addEventListener('click', () => this.closeRateWizard());
        }
        ov.style.display = 'flex';
        this.renderRateWizard();
    }

    closeRateWizard() {
        const ov = document.getElementById('rateWizardOverlay');
        if (ov) ov.style.display = 'none';
        this.rw = null;
    }

    rateWizardData() {
        const d = this.rw;
        return { ...d, slabs: buildWizardSlabs(d.base, d.slabMode, d.slabStep) };
    }

    renderRateWizard() {
        const d = this.rw;
        if (!d) return;
        const body = document.getElementById('rwBody');
        const foot = document.getElementById('rwFoot');
        const key = d.done ? 'done' : STEPS[d.step];
        const esc = (s) => this.escapeHtml(String(s ?? ''));
        const c1 = this.getCasing1Name?.() || '7" casing pipe';
        const c2 = this.getCasing2Name?.() || '10" casing pipe';
        const total = STEPS.length;
        document.getElementById('rwKicker').textContent = d.done ? 'Saved' : `Step ${d.step + 1} of ${total}`;
        document.getElementById('rwTitle').textContent = d.done ? d.name : (d.name && d.step > 0 ? d.name : 'New rate');
        document.getElementById('rwProgressBar').style.width = `${d.done ? 100 : Math.round(((d.step + 1) / total) * 100)}%`;
        const num = (id, val, unit, hint = '') => `
            <label class="rw-field" for="${id}">
                <span class="rw-input"><span class="rw-pre">₹</span><input type="number" id="${id}" value="${esc(val)}" min="0" step="any" inputmode="decimal"><span class="rw-unit">${unit}</span></span>
                ${hint ? `<small>${hint}</small>` : ''}
            </label>`;
        const q = (icon, title, sub) => `<div class="rw-q"><span class="rw-q-ic" aria-hidden="true">${icon}</span><div><h5>${title}</h5>${sub ? `<p>${sub}</p>` : ''}</div></div>`;
        let html = '';
        if (key === 'name') {
            html = q('🏷️', 'What do you call this rate?', 'A name you will recognise on the bill screen.') + `
                <label class="rw-field" for="rwName"><span class="rw-input is-text"><input type="text" id="rwName" maxlength="40" value="${esc(d.name)}" placeholder="e.g. Hard rock 6.5&quot;" autocomplete="off"></span></label>
                <div class="rw-chips">${['Standard 6.5"', 'Hard rock', '4.5" bore', 'VIP rate'].map((n) => `<button type="button" class="rw-chip" data-name="${esc(n)}">${esc(n)}</button>`).join('')}</div>`;
        } else if (key === 'base') {
            html = q('⛏️', 'Drilling rate for the first 300 ft', 'Price per foot from 1 to 300 ft. Deeper slabs come next.') + num('rwBase', d.base, '/ft', 'Most rigs charge ₹80 – ₹120 per ft here.');
        } else if (key === 'slabs') {
            const slabs = buildWizardSlabs(d.base, d.slabMode, d.slabStep);
            html = q('📶', 'How should the price rise with depth?', 'Every 100 ft deeper costs a little more per ft.') + `
                <div class="rw-choice">
                    <button type="button" class="rw-opt ${d.slabMode === 'standard' ? 'on' : ''}" id="rwLadderStandard"><strong>Standard ladder</strong><small>+₹10, +₹20, +₹30 … then +₹100</small></button>
                    <button type="button" class="rw-opt ${d.slabMode === 'even' ? 'on' : ''}" id="rwLadderEven"><strong>Same rise every slab</strong><small>Add the same amount each time</small></button>
                </div>
                ${d.slabMode === 'even' ? num('rwSlabStep', d.slabStep, 'more per slab') : ''}
                <div class="rw-preview">
                    ${slabs.slice(0, 5).map((s) => `<div><span>${esc(s.rangeStr)}</span><strong>₹${s.rate}/ft</strong></div>`).join('')}
                    <div class="rw-more">… ${slabs.length} slabs, up to ${slabs[slabs.length - 1].end.toLocaleString('en-IN')} ft (₹${slabs[slabs.length - 1].rate}/ft)</div>
                </div>`;
        } else if (key === 'pipes') {
            html = q('🔩', 'Casing pipe rates', 'Price per foot of pipe put in the bore.') + `
                <div class="rw-two">
                    <div><span class="rw-lbl">${esc(c1)}</span>${num('rwPvc7', d.pvc7, '/ft')}</div>
                    <div><span class="rw-lbl">${esc(c2)}</span>${num('rwPvc10', d.pvc10, '/ft')}</div>
                </div>`;
        } else if (key === 'bata') {
            html = q('👷', 'Bore bata (crew charge)', 'A fixed amount added once to every bore. Put 0 if you do not charge it.') + num('rwBata', d.bata, 'per bore');
        } else if (key === 'flush') {
            html = q('💧', 'Old bore flushing (re-bore)', 'When you clean out an old bore, the old depth is charged at this rate.') + num('rwFlush', d.flush, '/ft', `Example: old bore 200 ft × ₹${d.flush} = ₹${(200 * (Number(d.flush) || 0)).toLocaleString('en-IN')}`);
        } else if (key === 'grace') {
            const g = Math.max(0, Math.round(Number(d.grace) || 0));
            html = q('🎯', 'Grace feet', 'A few extra feet you do not move into the next, costlier slab.') + `
                <label class="rw-field" for="rwGrace"><span class="rw-input"><input type="number" id="rwGrace" value="${esc(d.grace)}" min="0" max="50" step="1" inputmode="numeric"><span class="rw-unit">ft</span></span></label>
                <div class="rw-example">
                    <span class="rw-ex-ic" aria-hidden="true">💡</span>
                    <div><strong>Example with ${g} ft grace</strong>
                    <p>A bore of <b>${300 + g} ft</b>: all ${300 + g} ft are billed at the 1–300 ft rate (₹${d.base}/ft).</p>
                    <p>A bore of <b>${301 + g} ft</b>: the extra ${1 + g} ft go into the 301–400 ft rate.</p>
                    <p class="rw-ex-note">Put 0 to bill every foot after 300 at the next rate.</p></div>
                </div>`;
        } else if (key === 'gst') {
            html = q('🧾', 'GST on bills', 'Used only when you switch GST on for a bill.') + `
                <label class="rw-field" for="rwGst"><span class="rw-input"><input type="number" id="rwGst" value="${esc(d.gst)}" min="0" max="28" step="0.5" inputmode="decimal"><span class="rw-unit">%</span></span></label>
                <div class="rw-chips">${[0, 5, 12, 18].map((v) => `<button type="button" class="rw-chip" data-gst="${v}">${v}%</button>`).join('')}</div>`;
        } else if (key === 'review') {
            const all = this.rateWizardData();
            const { errors, warnings } = checkWizardCard(all, this.rateProfiles.map((p) => p.name));
            d.reviewOk = errors.length === 0;
            const row = (lbl, val, step) => `<div class="rw-rv"><span>${lbl}</span><strong>${val}</strong><button type="button" class="rw-edit" data-goto="${step}">Change</button></div>`;
            html = `
                ${errors.length ? `<div class="rw-alert is-err">${errors.map((e) => `<p>✕ ${esc(e)}</p>`).join('')}</div>` : '<div class="rw-alert is-ok"><p>✓ Everything checks out</p></div>'}
                ${warnings.length ? `<div class="rw-alert is-warn">${warnings.map((w) => `<p>⚠ ${esc(w)}</p>`).join('')}</div>` : ''}
                <div class="rw-review">
                    ${row('Name', esc(all.name), 0)}
                    ${row('Drilling (1–300 ft)', `₹${all.base}/ft`, 1)}
                    ${row('Depth slabs', `${all.slabs.length} slabs · ₹${all.slabs[1].rate} at 301 ft · ₹${all.slabs[all.slabs.length - 1].rate} at 2,200 ft`, 2)}
                    ${row(esc(c1), `₹${all.pvc7}/ft`, 3)}
                    ${row(esc(c2), `₹${all.pvc10}/ft`, 3)}
                    ${row('Bore bata', `₹${Number(all.bata).toLocaleString('en-IN')}`, 4)}
                    ${row('Old bore flushing', `₹${all.flush}/ft`, 5)}
                    ${row('Grace', `${all.grace} ft`, 6)}
                    ${row('GST', `${all.gst}%`, 7)}
                </div>`;
        } else if (key === 'done') {
            html = `<div class="rw-done"><span class="rw-done-ic" aria-hidden="true">✅</span>
                <h5>Saved</h5><p>Use <b>${esc(d.name)}</b> on new bills now?</p>
                <p class="rw-ex-note">You can switch rates any time from the bill screen.</p></div>`;
        }
        body.innerHTML = `<div class="rw-step">${html}</div>`;

        // footer
        if (key === 'done') {
            foot.innerHTML = `<button type="button" class="rw-btn" id="rwApplyNo">Not now</button><button type="button" class="rw-btn is-pri" id="rwApplyYes">Yes, use it</button>`;
        } else if (key === 'review') {
            foot.innerHTML = `<button type="button" class="rw-btn" id="rwBack">Back</button><button type="button" class="rw-btn is-pri" id="rwSave" ${d.reviewOk ? '' : 'disabled'}>Save rate</button>`;
        } else {
            foot.innerHTML = `${d.step > 0 ? '<button type="button" class="rw-btn" id="rwBack">Back</button>' : '<span></span>'}<button type="button" class="rw-btn is-pri" id="rwNext">Next</button>`;
        }
        this.wireRateWizard(key);
        const first = body.querySelector('input');
        if (first && key !== 'review') setTimeout(() => { first.focus(); first.select?.(); }, 60);
    }

    /** Read the current step's input; returns an error message or ''. */
    readRateWizardStep(key) {
        const d = this.rw;
        const v = (id) => document.getElementById(id)?.value;
        const n = (id) => Number(v(id));
        if (key === 'name') {
            d.name = String(v('rwName') || '').trim();
            if (!d.name) return 'Type a name for this rate';
            if (this.rateProfiles.some((p) => p.name.trim().toLowerCase() === d.name.toLowerCase())) return `"${d.name}" already exists — use another name`;
        } else if (key === 'base') {
            if (!(n('rwBase') > 0)) return 'Enter the drilling rate per ft';
            d.base = Math.round(n('rwBase'));
        } else if (key === 'slabs') {
            if (d.slabMode === 'even') {
                if (!(n('rwSlabStep') >= 0) || v('rwSlabStep') === '') return 'Enter how much more each slab costs';
                d.slabStep = Math.round(n('rwSlabStep'));
            }
        } else if (key === 'pipes') {
            if (!(n('rwPvc7') > 0) || !(n('rwPvc10') > 0)) return 'Enter both pipe rates';
            d.pvc7 = Math.round(n('rwPvc7'));
            d.pvc10 = Math.round(n('rwPvc10'));
        } else if (key === 'bata') {
            if (v('rwBata') === '' || n('rwBata') < 0) return 'Enter the bata (0 if none)';
            d.bata = Math.round(n('rwBata'));
        } else if (key === 'flush') {
            if (v('rwFlush') === '' || n('rwFlush') < 0) return 'Enter the flushing rate (0 if none)';
            d.flush = Math.round(n('rwFlush'));
        } else if (key === 'grace') {
            if (v('rwGrace') === '' || n('rwGrace') < 0 || n('rwGrace') > 50) return 'Grace must be 0 to 50 ft';
            d.grace = Math.round(n('rwGrace'));
        } else if (key === 'gst') {
            if (v('rwGst') === '' || n('rwGst') < 0 || n('rwGst') > 28) return 'GST must be 0% to 28%';
            d.gst = n('rwGst');
        }
        return '';
    }

    wireRateWizard(key) {
        const d = this.rw;
        const go = (step) => { d.step = Math.max(0, Math.min(STEPS.length - 1, step)); this.renderRateWizard(); };
        const next = () => {
            const err = this.readRateWizardStep(key);
            if (err) { this.showToast(`⚠️ ${err}`); return; }
            go(d.step + 1);
        };
        document.getElementById('rwNext')?.addEventListener('click', next);
        document.getElementById('rwBack')?.addEventListener('click', () => { this.readRateWizardStep(key); go(d.step - 1); });
        document.querySelectorAll('#rwBody input').forEach((inp) => inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); next(); } }));
        document.querySelectorAll('#rwBody .rw-chip[data-name]').forEach((b) => b.addEventListener('click', () => { document.getElementById('rwName').value = b.dataset.name; }));
        document.querySelectorAll('#rwBody .rw-chip[data-gst]').forEach((b) => b.addEventListener('click', () => { document.getElementById('rwGst').value = b.dataset.gst; }));
        document.getElementById('rwLadderStandard')?.addEventListener('click', () => { d.slabMode = 'standard'; this.renderRateWizard(); });
        document.getElementById('rwLadderEven')?.addEventListener('click', () => { d.slabMode = 'even'; this.renderRateWizard(); });
        document.getElementById('rwSlabStep')?.addEventListener('input', (e) => {
            d.slabStep = Math.max(0, Math.round(Number(e.target.value) || 0));
            const slabs = buildWizardSlabs(d.base, d.slabMode, d.slabStep);
            const prev = document.querySelector('#rwBody .rw-preview');
            if (prev) prev.innerHTML = slabs.slice(0, 5).map((s) => `<div><span>${this.escapeHtml(s.rangeStr)}</span><strong>₹${s.rate}/ft</strong></div>`).join('')
                + `<div class="rw-more">… ${slabs.length} slabs, up to ${slabs[slabs.length - 1].end.toLocaleString('en-IN')} ft (₹${slabs[slabs.length - 1].rate}/ft)</div>`;
        });
        document.getElementById('rwGrace')?.addEventListener('change', (e) => { d.grace = Math.max(0, Math.min(50, Math.round(Number(e.target.value) || 0))); this.renderRateWizard(); });
        document.querySelectorAll('#rwBody .rw-edit').forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.goto))));
        document.getElementById('rwSave')?.addEventListener('click', () => this.saveRateWizard());
        document.getElementById('rwApplyYes')?.addEventListener('click', () => {
            const id = d.savedId;
            this.closeRateWizard();
            this.applyRateProfileToBill(id, true);
        });
        document.getElementById('rwApplyNo')?.addEventListener('click', () => {
            const nm = d.name;
            this.closeRateWizard();
            this.showToast(`💾 "${nm}" saved — pick it on the bill screen when you need it`);
        });
    }

    saveRateWizard() {
        const all = this.rateWizardData();
        const { errors } = checkWizardCard(all, this.rateProfiles.map((p) => p.name));
        if (errors.length) { this.renderRateWizard(); return; }
        const profile = {
            id: 'rp_' + Date.now(),
            name: all.name,
            isDefault: this.rateProfiles.length === 0,
            rates: {
                baseDrillingRate: all.base,
                oldBoreRate: all.flush,
                slabBufferFt: all.grace,
                pvc7Rate: all.pvc7,
                pvc10Rate: all.pvc10,
                boreBataRate: all.bata,
                gstPercentage: all.gst,
                slabRates: this.normalizeSlabArray(all.slabs, all.base)
            }
        };
        this.rateProfiles.push(profile);
        this.saveToStorage(STORAGE_KEYS.rateProfiles, this.rateProfiles);
        this.renderRateProfilesUI();
        this.rw.savedId = profile.id;
        this.rw.done = true;
        this.renderRateWizard();
    }
}
