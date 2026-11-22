// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
import { STORAGE_KEYS, storage } from '../data/storage.js';
import { I18N_DICTIONARY } from '../i18n/dictionary.js';

export class ShellMixin {
    applyLanguage(lang) {
        this.lang = lang;
        storage.setRaw(STORAGE_KEYS.lang, lang);
        const dict = I18N_DICTIONARY[lang] || I18N_DICTIONARY.en;

        document.querySelectorAll('.lang-pill').forEach(p => {
            p.classList.toggle('active', p.dataset.lang === lang);
        });

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) {
                el.textContent = dict[key];
            }
        });

        this.updateSavedBillViewModeUI();
        this.calculateAndRender();
    }

    switchTab(tabId, persist = true, scroll = true) {
        // Leaving Rates with the editor open: drop the unsaved draft first, so the
        // brand save below never writes draft rates to storage (and the cloud).
        if (tabId !== 'tab-rates' && this.isRateStudioOpen()) {
            this.toggleRateStudio(false);
            this.showToast('Rate changes not saved');
        }
        this.syncBrandFromInputs(true);
        this.applyBrandToUI();
        document.querySelectorAll('.tab-panel').forEach(p => {
            p.classList.toggle('active', p.id === tabId);
        });
        // Rates opens from the Menu, so Menu stays highlighted there.
        const navTab = tabId === 'tab-rates' ? 'tab-brand' : tabId;
        document.querySelectorAll('.b-nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === navTab);
        });
        const liveBar = document.getElementById('stickyLiveBar');
        if (liveBar) {
            const hideLiveBar = (tabId !== 'tab-bill') || (this.loadedHistoryBillId && this.isSavedBillReadOnly);
            liveBar.style.display = hideLiveBar ? 'none' : 'block';
        }
        this.syncIosTopSafeBarColor();
        this.syncTopHeaderWrapLock();
        if (persist) {
            this.state.activeTab = tabId;
            this.persistCurrentSession();
        }
        if (scroll) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (tabId === 'tab-brand') {
            // Settings opens on its menu; links that need a section call switchSettingsView after this.
            if (typeof this.switchSettingsView === 'function') {
                this.switchSettingsView('menu');
            }
            this.syncCasingNamesUI();
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                try { window.lucide.createIcons(); } catch (_) {}
            }
            // Smooth glance animation for segmented tabs scroll
            setTimeout(() => {
                const segNav = document.querySelector('.settings-nav-segmented');
                if (segNav && segNav.scrollWidth > segNav.clientWidth) {
                    segNav.scrollTo({ left: 45, behavior: 'smooth' });
                    setTimeout(() => segNav.scrollTo({ left: 0, behavior: 'smooth' }), 380);
                }
            }, 120);
        }
        this.updateQuickTabJumpLabel();
    }

    /** Kind of message from its first sign: warning, delete, or done. Sets the colour strip. */
    toastKind(msg) {
        const m = String(msg || '').trim();
        if (/^(⚠|❌|✕)/.test(m)) return 'is-warn';
        if (/^🗑/.test(m)) return 'is-del';
        return 'is-ok';
    }

    /** Slide the message up and away, then remove it. */
    dismissToast(el) {
        if (!el || el.classList.contains('is-leaving')) return;
        el.classList.add('is-leaving');
        setTimeout(() => el.remove(), 300);
    }

    /**
     * Messages show ONE AT A TIME in the same place at the top. When several arrive together they
     * wait in a queue: each is shown in turn (shorter while others are waiting, with a "+2" chip),
     * the same text twice in a row is shown once, and a tap dismisses the current one early.
     */
    showToast(msg) {
        const text = String(msg ?? '').trim();
        if (!text) return;
        this._toastQueue = this._toastQueue || [];
        if (this._toastShowing === text || this._toastQueue.includes(text)) return; // already on screen or waiting
        const urgent = this.toastKind(text) === 'is-warn';
        if (urgent) this._toastQueue.unshift(text); // warnings go first
        else this._toastQueue.push(text);
        if (this._toastQueue.length > 4) this._toastQueue.splice(4); // never a long wait: drop the oldest-queued extras
        if (!this._toastShowing) { this._showNextToast(); return; }
        this._updateToastMore();
        this._hurryToast(urgent ? 450 : 1200); // others are waiting: let the current one go sooner
    }

    /** Shorten the message on screen (to `ms` more) when others are waiting. */
    _hurryToast(ms = 1200) {
        const t = this._toastTiming;
        if (!t) return;
        if (t.warn && ms > 500) return; // an info message never cuts a warning short
        const left = t.endAt - Date.now();
        if (left <= ms + 100) return;
        clearTimeout(t.timer);
        t.timer = setTimeout(t.finish, ms);
        t.endAt = Date.now() + ms;
        const bar = this._toastEl?.querySelector('.toast-timer');
        if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; this._toastEl.style.setProperty('--toast-ms', `${ms}ms`); }
    }

    _updateToastMore() {
        const more = this._toastEl?.querySelector('.toast-more');
        if (!more) return;
        const n = (this._toastQueue || []).length;
        more.textContent = n ? `+${n}` : '';
        more.hidden = !n;
    }

    _showNextToast() {
        const container = document.getElementById('toastContainer');
        const text = (this._toastQueue || []).shift();
        if (!container || !text) { this._toastShowing = null; this._toastEl = null; return; }
        this._toastShowing = text;

        // A leading emoji (✅ ⚠️ 🗑️ ↩️ …) becomes the round icon; the rest is the message.
        const m = text.match(/^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*/u);
        const kind = this.toastKind(text);
        const icon = kind === 'is-warn' ? '!' : kind === 'is-del' ? '✕' : '✓';
        const body = m ? text.slice(m[0].length) : text;

        const el = document.createElement('div');
        el.className = `toast-msg ${kind}`;
        el.setAttribute('role', kind === 'is-warn' ? 'alert' : 'status');
        const ic = document.createElement('span');
        ic.className = 'toast-icon';
        ic.setAttribute('aria-hidden', 'true');
        ic.textContent = icon;
        const tx = document.createElement('span');
        tx.className = 'toast-text';
        tx.textContent = body || text;
        const more = document.createElement('span');
        more.className = 'toast-more';
        more.hidden = true;
        const bar = document.createElement('span');
        bar.className = 'toast-timer';
        el.append(ic, tx, more, bar);

        const waiting = this._toastQueue.length;
        const ms = kind === 'is-warn' ? (waiting ? 2400 : 3600) : (waiting ? 1700 : 2600); // warnings stay readable
        el.style.setProperty('--toast-ms', `${ms}ms`);
        this._toastEl = el;
        container.appendChild(el);
        this._updateToastMore();

        let done = false;
        const timing = { endAt: Date.now() + ms, warn: kind === 'is-warn', timer: null, finish: null };
        const finish = () => {
            if (done) return;
            done = true;
            clearTimeout(timing.timer);
            if (this._toastTiming === timing) this._toastTiming = null;
            this.dismissToast(el);
            setTimeout(() => this._showNextToast(), 320);
        };
        timing.finish = finish;
        timing.timer = setTimeout(finish, ms);
        this._toastTiming = timing;
        el.addEventListener('click', finish);
    }

    confirmDeleteModal({
        title = 'Confirm Delete?',
        itemLabel = '',
        message = 'Are you sure you want to delete this item?',
        requireTypeText = null,
        confirmBtnLabel = 'Yes, Delete',
        subtitle = 'You can undo this right after deleting',
        onConfirm = null
    }) {
        const overlay = document.getElementById('deleteConfirmModalOverlay');
        const titleEl = document.getElementById('delConfirmTitle');
        const itemBox = document.getElementById('delConfirmItemBox');
        const msgEl = document.getElementById('delConfirmMessage');
        const typeVerifyBox = document.getElementById('delConfirmTypeVerifyBox');
        const typeInput = document.getElementById('delConfirmTypeInput');
        const reqWordBadge = document.getElementById('delConfirmRequiredWordBadge');
        const confirmBtn = document.getElementById('confirmDelActionBtn');

        if (!overlay) {
            if (typeof onConfirm === 'function') onConfirm();
            return;
        }
        if (titleEl) titleEl.textContent = title;
        const subEl = document.getElementById('delConfirmSubtitle');
        if (subEl) subEl.textContent = subtitle;
        if (itemBox) {
            itemBox.textContent = itemLabel;
            itemBox.style.display = itemLabel ? 'block' : 'none';
        }
        if (msgEl) msgEl.textContent = message;

        this.pendingDeleteRequiredWords = null;
        if (requireTypeText && typeVerifyBox && typeInput) {
            const allowedWords = Array.isArray(requireTypeText)
                ? requireTypeText.map(w => String(w).trim().toUpperCase())
                : [String(requireTypeText).trim().toUpperCase(), 'I CONFIRM'];
            this.pendingDeleteRequiredWords = allowedWords;
            if (reqWordBadge) {
                reqWordBadge.textContent = allowedWords.join(' or ');
            }
            typeVerifyBox.style.display = 'block';
            typeInput.value = '';
            typeInput.classList.remove('is-verified');
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = `<i data-lucide="trash-2"></i> <span>${confirmBtnLabel}</span>`;
            }
            setTimeout(() => typeInput.focus(), 80);
        } else {
            if (typeVerifyBox) typeVerifyBox.style.display = 'none';
            if (typeInput) {
                typeInput.value = '';
                typeInput.classList.remove('is-verified');
            }
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = `<i data-lucide="trash-2"></i> <span>${confirmBtnLabel}</span>`;
            }
        }

        this.pendingDeleteConfirmFn = onConfirm;
        overlay.style.display = 'flex';
        this.refreshIcons();
    }

    closeDeleteConfirmModal() {
        const overlay = document.getElementById('deleteConfirmModalOverlay');
        if (overlay) overlay.style.display = 'none';
        const typeVerifyBox = document.getElementById('delConfirmTypeVerifyBox');
        const typeInput = document.getElementById('delConfirmTypeInput');
        const confirmBtn = document.getElementById('confirmDelActionBtn');
        if (typeVerifyBox) typeVerifyBox.style.display = 'none';
        if (typeInput) {
            typeInput.value = '';
            typeInput.classList.remove('is-verified');
        }
        if (confirmBtn) confirmBtn.disabled = false;
        this.pendingDeleteRequiredWords = null;
        this.pendingDeleteConfirmFn = null;
    }

    updateGlobalUndoButtons(visible, label = 'Undo') {
        document.querySelectorAll('.global-undo-trigger-btn').forEach(btn => {
            btn.style.display = visible ? 'inline-flex' : 'none';
            btn.title = label;
        });
    }

    triggerGlobalUndo() {
        if (!this.lastUndoState || typeof this.lastUndoState.onUndo !== 'function') return;
        const { onUndo, timerId, toastEl } = this.lastUndoState;
        if (timerId) clearTimeout(timerId);
        if (toastEl) toastEl.remove();
        this.lastUndoState = null;
        this.updateGlobalUndoButtons(false);
        onUndo();
        this.showToast('↩️ Restored! (Undo successful)');
    }

    showUndoToast(msg, onUndo) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        container.querySelectorAll('.toast-undo-bar').forEach(old => old.remove());
        if (this.lastUndoState?.timerId) {
            clearTimeout(this.lastUndoState.timerId);
        }

        const el = document.createElement('div');
        el.className = 'toast-msg toast-undo-bar is-del';

        const txt = document.createElement('span');
        txt.className = 'toast-undo-text';
        txt.textContent = msg;

        const undoBtn = document.createElement('button');
        undoBtn.type = 'button';
        undoBtn.className = 'toast-undo-btn';
        undoBtn.innerHTML = '↩ Undo';

        const timerId = setTimeout(() => {
            this.dismissToast(el);
        }, 10000);

        this.lastUndoState = {
            msg,
            onUndo,
            timerId,
            toastEl: el
        };
        this.updateGlobalUndoButtons(true, `Undo: ${msg}`);

        undoBtn.addEventListener('click', () => {
            this.triggerGlobalUndo();
        });

        el.appendChild(txt);
        el.appendChild(undoBtn);
        container.appendChild(el);
    }
}
