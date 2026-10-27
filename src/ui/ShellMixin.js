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
        this.syncBrandFromInputs(true);
        this.applyBrandToUI();
        document.querySelectorAll('.tab-panel').forEach(p => {
            p.classList.toggle('active', p.id === tabId);
        });
        document.querySelectorAll('.b-nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
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
            const activeSeg = document.querySelector('.settings-nav-segmented .set-seg-btn.active');
            const viewId = activeSeg?.dataset.view || 'set-view-company';
            if (typeof this.switchSettingsView === 'function') {
                this.switchSettingsView(viewId);
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

    showToast(msg) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const el = document.createElement('div');
        el.className = 'toast-msg';
        el.textContent = msg;
        container.appendChild(el);
        setTimeout(() => {
            el.remove();
        }, 2500);
    }

    confirmDeleteModal({
        title = 'Confirm Delete?',
        itemLabel = '',
        message = 'Are you sure you want to delete this item?',
        requireTypeText = null,
        confirmBtnLabel = 'Yes, Delete',
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
        el.className = 'toast-msg toast-undo-bar';

        const txt = document.createElement('span');
        txt.className = 'toast-undo-text';
        txt.textContent = msg;

        const undoBtn = document.createElement('button');
        undoBtn.type = 'button';
        undoBtn.className = 'toast-undo-btn';
        undoBtn.innerHTML = '↩ Undo';

        const timerId = setTimeout(() => {
            el.remove();
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
