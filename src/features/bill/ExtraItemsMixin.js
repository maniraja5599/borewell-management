// "Other items" rows in the Casing card (step 3): for sites that use something other than the two
// casing pipes (MS pipe, motor fitting, cap …). Each row has a name, qty + unit and a rate; the bill
// engine (core/slabEngine.js normalizeExtraItems) works out the amount. Rows live in
// this.state.extraItems, so they are kept in the draft, saved with the bill and synced like it.
import { STORAGE_KEYS } from '../../data/storage.js';
import { EXTRA_ITEM_UNITS, normalizeExtraItems } from '../../core/slabEngine.js';

const MAX_ROWS = 12;
const MAX_PRESETS = 6;

const newRowId = () => 'it_' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);

export class ExtraItemsMixin {
    getExtraItemRows() {
        if (!Array.isArray(this.state.extraItems)) this.state.extraItems = [];
        return this.state.extraItems;
    }

    /** Amount of one row as the bill engine will count it (qty × rate, or the rate alone). */
    extraItemRowAmount(row) {
        return normalizeExtraItems([row])[0]?.amount || 0;
    }

    addExtraItemRow(preset = null) {
        const rows = this.getExtraItemRows();
        if (rows.length >= MAX_ROWS) {
            this.showToast(`⚠️ Up to ${MAX_ROWS} items on one bill`);
            return;
        }
        const row = {
            id: newRowId(),
            name: preset?.name || '',
            qty: '',
            unit: EXTRA_ITEM_UNITS.includes(preset?.unit) ? preset.unit : 'ft',
            rate: preset?.rate > 0 ? preset.rate : ''
        };
        rows.push(row);
        this.renderExtraItemsUI();
        this.calculateAndRender();
        const sel = preset ? `.ei-row[data-id="${row.id}"] .ei-qty` : `.ei-row[data-id="${row.id}"] .ei-name`;
        setTimeout(() => document.querySelector(sel)?.focus(), 30);
    }

    removeExtraItemRow(id) {
        this.state.extraItems = this.getExtraItemRows().filter((r) => r.id !== id);
        this.renderExtraItemsUI();
        this.calculateAndRender();
    }

    /** Names + rates used before (saved for next time, and from past bills), newest first. */
    getExtraItemPresets() {
        const seen = new Set();
        const out = [];
        const push = (name, unit, rate) => {
            const n = String(name || '').trim();
            const r = Math.round(Number(rate) || 0);
            if (!n || r <= 0) return;
            const key = n.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            out.push({ name: n, unit: EXTRA_ITEM_UNITS.includes(unit) ? unit : 'ft', rate: r });
        };
        (this.savedExtras || []).filter((x) => x?.type === 'item').forEach((x) => push(x.label, x.unit, x.amount));
        (this.history || []).forEach((b) => (b.snapshot?.extraItems || []).forEach((it) => push(it.name, it.unit, it.rate)));
        return out.slice(0, MAX_PRESETS);
    }

    /** After a bill is saved: remember its items (name, unit, rate) for the next bill. */
    recordExtraItemsForNextTime(items) {
        const list = normalizeExtraItems(items);
        if (!list.length) return;
        if (!Array.isArray(this.savedExtras)) this.savedExtras = [];
        list.slice().reverse().forEach((it) => {
            const idx = this.savedExtras.findIndex((x) => x?.type === 'item' && String(x.label || '').trim().toLowerCase() === it.name.toLowerCase());
            const entry = {
                id: idx !== -1 ? this.savedExtras[idx].id : 'ext_item_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                type: 'item',
                label: it.name,
                unit: it.unit,
                amount: Math.round(it.rate),
                updatedAt: new Date().toISOString()
            };
            if (idx !== -1) this.savedExtras.splice(idx, 1);
            this.savedExtras.unshift(entry);
        });
        // Keep the list small: at most 12 remembered items.
        let kept = 0;
        this.savedExtras = this.savedExtras.filter((x) => x?.type !== 'item' || ++kept <= 12);
        this.saveToStorage(STORAGE_KEYS.savedExtras, this.savedExtras);
    }

    renderExtraItemsUI() {
        const listEl = document.getElementById('extraItemsList');
        const presetsEl = document.getElementById('extraItemsPresets');
        if (!listEl) return;
        const rows = this.getExtraItemRows();
        listEl.innerHTML = rows.map((row) => this.extraItemRowHtml(row)).join('');

        if (presetsEl) {
            const inUse = new Set(rows.map((r) => String(r.name || '').trim().toLowerCase()));
            const presets = this.getExtraItemPresets().filter((p) => !inUse.has(p.name.toLowerCase()));
            presetsEl.innerHTML = presets.map((p) => `<button type="button" class="ei-preset" data-name="${this.escapeHtml(p.name)}" data-unit="${this.escapeHtml(p.unit)}" data-rate="${p.rate}">+ ${this.escapeHtml(p.name)} · ₹${p.rate.toLocaleString('en-IN')}/${this.escapeHtml(p.unit)}</button>`).join('');
            presetsEl.hidden = presets.length === 0;
        }
        const addBtn = document.getElementById('addExtraItemBtn');
        if (addBtn) addBtn.disabled = rows.length >= MAX_ROWS;
    }

    extraItemRowHtml(row) {
        const val = (v) => (v === 0 || v === '' || v == null ? '' : this.escapeHtml(String(v)));
        const unit = EXTRA_ITEM_UNITS.includes(row.unit) ? row.unit : 'ft';
        const unitOpts = EXTRA_ITEM_UNITS.map((u) => `<option value="${u}"${u === unit ? ' selected' : ''}>${u}</option>`).join('');
        return `
            <div class="ei-row" data-id="${this.escapeHtml(row.id)}">
                <div class="ei-top">
                    <input type="text" class="ei-name" data-field="name" value="${this.escapeHtml(row.name || '')}" placeholder="Item name, e.g. 8&quot; MS pipe" maxlength="60" autocomplete="off" aria-label="Item name">
                    <strong class="ei-amt">${this.formatINR(this.extraItemRowAmount(row))}</strong>
                    <button type="button" class="ei-del" aria-label="Remove this item" title="Remove">✕</button>
                </div>
                <div class="ei-nums">
                    <input type="number" class="ei-qty" data-field="qty" value="${val(row.qty)}" placeholder="Qty" min="0" step="any" inputmode="decimal" aria-label="Quantity">
                    <select class="ei-unit" data-field="unit" aria-label="Unit">${unitOpts}</select>
                    <span class="ei-x" aria-hidden="true">×</span>
                    <span class="ei-rate-box"><span aria-hidden="true">₹</span><input type="number" class="ei-rate" data-field="rate" value="${val(row.rate)}" placeholder="Rate" min="0" step="any" inputmode="decimal" aria-label="Rate"></span>
                </div>
            </div>`;
    }

    /** "8" MS pipe (40 ft × ₹550/ft)" — or just the name when it is a single amount. */
    extraItemBillLabel(it) {
        const qty = Number(it?.qty) || 0;
        if (qty <= 0) return it?.name || 'Other item';
        const q = Number.isInteger(qty) ? qty : Number(qty.toFixed(2));
        return `${it.name} (${q} ${it.unit} × ₹${Number(it.rate).toLocaleString('en-IN')}/${it.unit})`;
    }

    /** Rows for a saved bill's card (bill detail popup, customer's bill list). */
    billCardItemRowsHtml(snap) {
        return (snap?.extraItems || []).map((it) => `
            <div class="cbc-row">
                <span class="cbc-r-lbl">${this.escapeHtml(it.name || 'Other item')}</span>
                <span class="cbc-r-val">${Number(it.qty) > 0 ? `${this.escapeHtml(String(it.qty))} ${this.escapeHtml(it.unit || '')} <small>(@ ₹${Number(it.rate).toLocaleString('en-IN')}/${this.escapeHtml(it.unit || '')})</small> • ` : ''}<strong>${this.formatINR(it.amount)}</strong></span>
            </div>`).join('');
    }

    billCardPayDiscountRowHtml(snap) {
        const d = Math.round(Number(snap?.paymentDiscount) || 0);
        if (d <= 0) return '';
        return `
            <div class="cbc-row">
                <span class="cbc-r-lbl">Discount on payment</span>
                <span class="cbc-r-val text-green">−${this.formatINR(d)}</span>
            </div>`;
    }

    setupExtraItemsListeners() {
        const box = document.getElementById('extraItemsBox');
        if (!box) return;
        document.getElementById('addExtraItemBtn')?.addEventListener('click', () => this.addExtraItemRow());
        box.addEventListener('click', (e) => {
            const del = e.target.closest('.ei-del');
            if (del) {
                this.removeExtraItemRow(del.closest('.ei-row')?.dataset.id);
                return;
            }
            const preset = e.target.closest('.ei-preset');
            if (preset) {
                this.addExtraItemRow({ name: preset.dataset.name, unit: preset.dataset.unit, rate: Number(preset.dataset.rate) || 0 });
            }
        });
        const onEdit = (e) => {
            const field = e.target.dataset?.field;
            const rowEl = e.target.closest('.ei-row');
            if (!field || !rowEl) return;
            const row = this.getExtraItemRows().find((r) => r.id === rowEl.dataset.id);
            if (!row) return;
            row[field] = field === 'name' || field === 'unit' ? e.target.value : (e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0));
            const amtEl = rowEl.querySelector('.ei-amt');
            if (amtEl) amtEl.textContent = this.formatINR(this.extraItemRowAmount(row));
            this.calculateAndRender();
        };
        box.addEventListener('input', onEdit);
        box.addEventListener('change', onEdit);
    }
}
