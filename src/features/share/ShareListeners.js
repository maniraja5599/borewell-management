// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
export class ShareListeners {
    setupShareListeners() {
        document.getElementById('shareWhatsappBtn')?.addEventListener('click', () => this.shareOnWhatsApp());
        document.getElementById('downloadImageBtn')?.addEventListener('click', () => this.exportBillAsImage());
        document.getElementById('downloadPdfBtn')?.addEventListener('click', () => this.exportBillAsPDF());
        document.getElementById('saveBillHistoryBtn')?.addEventListener('click', () => this.saveCurrentBillToHistory());

        document.getElementById('closeWaPreviewModalBtn')?.addEventListener('click', () => this.closeWhatsAppPreviewModal());
        document.getElementById('cancelWaPreviewBtn')?.addEventListener('click', () => this.closeWhatsAppPreviewModal());
        document.getElementById('whatsappPreviewModalOverlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'whatsappPreviewModalOverlay') {
                this.closeWhatsAppPreviewModal();
            }
        });

        document.getElementById('waPreviewCountryCode')?.addEventListener('change', (e) => {
            const selectedCode = e.target.value || '+91';
            this.setDefaultCountryCode(selectedCode);
            this.syncPhoneInputMetaForCountry('waPreviewPhoneInput', selectedCode);
            const phoneInp = document.getElementById('waPreviewPhoneInput');
            if (phoneInp) {
                const cleaned = this.normalizeMobileNumber(phoneInp.value, selectedCode);
                if (phoneInp.value !== cleaned) phoneInp.value = cleaned;
            }
        });

        document.getElementById('waPreviewPhoneInput')?.addEventListener('input', (e) => {
            const rawVal = e.target.value || '';
            const codeSelect = document.getElementById('waPreviewCountryCode');
            let activeCode = codeSelect?.value || this.defaultCountryCode || '+91';
            if (rawVal.trim().startsWith('+') || rawVal.trim().startsWith('00') || rawVal.replace(/\D/g, '').length > 10) {
                const parsed = this.parsePhoneWithCountryCode(rawVal, activeCode);
                if (parsed.countryCode !== activeCode && codeSelect) {
                    codeSelect.value = parsed.countryCode;
                    activeCode = parsed.countryCode;
                    this.setDefaultCountryCode(activeCode);
                    this.syncPhoneInputMetaForCountry('waPreviewPhoneInput', activeCode);
                }
                e.target.value = parsed.localDigits;
            } else {
                const cleaned = this.normalizeMobileNumber(rawVal, activeCode);
                if (e.target.value !== cleaned) e.target.value = cleaned;
            }
        });

        document.getElementById('toggleWaRawEditBtn')?.addEventListener('click', () => {
            const rawArea = document.getElementById('waPreviewMessageInput');
            const chatWrap = document.getElementById('waChatPreviewContainer');
            const editBtn = document.getElementById('toggleWaRawEditBtn');
            if (!rawArea || !chatWrap) return;
            const isEditing = rawArea.style.display !== 'none';
            if (isEditing) {
                rawArea.style.display = 'none';
                chatWrap.style.display = 'block';
                editBtn?.classList.remove('active');
                if (editBtn) editBtn.textContent = '✏️ Edit Text';
            } else {
                rawArea.style.display = 'block';
                chatWrap.style.display = 'none';
                editBtn?.classList.add('active');
                if (editBtn) editBtn.textContent = '👁️ View Preview';
                rawArea.focus();
            }
        });

        document.getElementById('waPreviewMessageInput')?.addEventListener('input', (e) => {
            const bubbleEl = document.getElementById('waPreviewFormattedBubble');
            if (bubbleEl) {
                bubbleEl.innerHTML = this.formatWhatsAppBubbleHtml(e.target.value || '');
            }
        });

        document.getElementById('copyWaPreviewTextBtn')?.addEventListener('click', async () => {
            const txt = (document.getElementById('waPreviewMessageInput')?.value || '').trim();
            if (!txt) return;
            try {
                await navigator.clipboard.writeText(txt);
                this.showToast('📋 WhatsApp message copied!');
            } catch (err) {
                const rawArea = document.getElementById('waPreviewMessageInput');
                if (rawArea) {
                    rawArea.style.display = 'block';
                    rawArea.select();
                    document.execCommand('copy');
                    this.showToast('📋 WhatsApp message copied!');
                }
            }
        });

        document.getElementById('confirmSendWhatsappBtn')?.addEventListener('click', () => {
            this.confirmAndSendWhatsAppFromModal();
        });
    }
}
