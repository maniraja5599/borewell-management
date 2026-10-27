// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
export class ShareExportMixin {
    formatWhatsAppBubbleHtml(rawText) {
        const safe = String(rawText || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return safe
            .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
            .replace(/_([^_\n]+)_/g, '<em>$1</em>');
    }

    buildCleanBillWhatsAppMessage({ billNo, billDate, custName, custPhone, custLocation, custGst, res, paymentStatus = null, formatConfig = null }) {
        if (!res) return '';
        const b = this.brand || this.defaultBrand;
        const cfg = formatConfig || this.waFormat || this.defaultWaFormat;
        const compName = (b.companyName || 'MY BOREWELL COMPANY').trim();
        const tagline = (b.tagline || '').trim();
        const address = (b.address || '').trim();
        const compGst = (b.gstNumber || '').trim();
        const isInvoice = (res.docType || 'INVOICE') === 'INVOICE';
        const docLabel = isInvoice ? '🧾 FINAL BILL' : '📋 QUOTATION';
        const cleanCust = (custName && custName !== 'Walk-in Customer') ? custName.trim() : '';
        const cleanPhone = this.formatPhoneWithCountryCode(custPhone || '');
        const cleanLoc = (custLocation || '').trim();
        const cleanClientGst = (res.gstEnabled && cfg.gst !== false) ? ((custGst || res.custGst || '').trim().toUpperCase()) : '';
        const compPhones = this.formatCompanyPhonesWithCountryCode((b.phones || '').trim(), b.phoneCountryCode || this.defaultCountryCode);

        const lines = [];

        // 1. Company Header
        if (cfg.companyHeader !== false) {
            lines.push(`*🚜 ${compName}*`);
            if (tagline) lines.push(`_${tagline}_`);
        }

        // 2. Office Address
        if (cfg.address !== false && address) {
            lines.push(`📍 ${address}`);
        }

        // 3. Company GST
        if (cfg.gst !== false && compGst) {
            lines.push(`🏛️ *GSTIN:* ${compGst}`);
        }

        if (lines.length > 0) {
            lines.push(`──────────────────────`);
        }

        // Bill Header & Customer Information
        lines.push(`*${docLabel} : #${billNo || 'AB-101'}*`);
        if (billDate) lines.push(`📅 *Date:* ${billDate}`);
        if (cleanCust) lines.push(`👤 *Customer:* ${cleanCust}`);
        if (cleanPhone) lines.push(`📞 *Mobile:* ${cleanPhone}`);
        if (cleanLoc) lines.push(`📍 *Site:* ${cleanLoc}`);
        if (cleanClientGst) lines.push(`🧾 *Client GSTIN:* ${cleanClientGst}`);
        lines.push(`🕳️ *Work:* ${res.drillingType === 'repair' ? 'Re-Bore / Flushing' : 'New Borewell'} (${res.boreDia || '6.5"'})`);
        lines.push(`📏 *Total Depth:* *${res.totalDepth || 0} ft*`);
        lines.push(`──────────────────────`);

        // 4. Drilling Charges (Slab-wise Breakup)
        if (cfg.slabBreakup !== false && Array.isArray(res.slabDetails) && res.slabDetails.length > 0) {
            lines.push(`*📊 1. DRILLING CHARGES (SLAB-WISE):*`);
            res.slabDetails.forEach(s => {
                lines.push(`• ${s.range} : ${s.depth} ft × ₹${s.rate} = *${this.formatINR(s.cost)}*`);
            });
            lines.push(`▸ *Drilling Total : ${this.formatINR(res.drillingCost)}*`);
            lines.push(`──────────────────────`);
        } else if (cfg.slabBreakup === false) {
            lines.push(`▸ *Drilling Charges (${res.totalDepth || 0} ft) : ${this.formatINR(res.drillingCost)}*`);
            lines.push(`──────────────────────`);
        }

        // 5. Casing Pipes & 6. Extra Charges
        const otherLines = [];
        const c1Name = this.getCasing1Name();
        const c2Name = this.getCasing2Name();

        if (cfg.pipes !== false) {
            let totalPipeCost = 0;
            let pipeCount = 0;
            if (res.pvc7Length > 0) {
                otherLines.push(`• ${c1Name} (${res.pvc7Length} ft × ₹${res.pvc7Rate}/ft) : *${this.formatINR(res.pvc7Cost)}*`);
                totalPipeCost += (res.pvc7Cost || 0);
                pipeCount++;
            }
            if (res.pvc10Length > 0) {
                otherLines.push(`• ${c2Name} (${res.pvc10Length} ft × ₹${res.pvc10Rate}/ft) : *${this.formatINR(res.pvc10Cost)}*`);
                totalPipeCost += (res.pvc10Cost || 0);
                pipeCount++;
            }
            if (cfg.pipeSubtotal !== false && totalPipeCost > 0 && pipeCount > 0) {
                otherLines.push(`  ↳ *Total Casing Pipe Cost : ${this.formatINR(totalPipeCost)}*`);
            }
        }

        if (cfg.extras !== false) {
            if (res.boreBataCost > 0) {
                otherLines.push(`• Bore Bata : *${this.formatINR(res.boreBataCost)}*`);
            }
            if (res.collarCapCost > 0) {
                otherLines.push(`• Collar / Cap / Welding : *${this.formatINR(res.collarCapCost)}*`);
            }
            if (res.transportSurveyCost > 0) {
                otherLines.push(`• Transport / Survey : *${this.formatINR(res.transportSurveyCost)}*`);
            }
            if (res.customExtraAmount > 0) {
                otherLines.push(`• ${res.customExtraLabel || 'Extra Charges'} : *${this.formatINR(res.customExtraAmount)}*`);
            }
        }

        if (res.discountAmount > 0) {
            otherLines.push(`• Discount : *− ${this.formatINR(res.discountAmount)}*`);
        }
        if (res.gstEnabled && cfg.gst !== false) {
            otherLines.push(`• GST (${res.gstPercentage}%) : *${this.formatINR(res.gstAmount)}*`);
        }

        if (otherLines.length > 0) {
            lines.push(`*🛠️ 2. PIPE & OTHER CHARGES:*`);
            otherLines.forEach(l => lines.push(l));
            lines.push(`──────────────────────`);
        }

        // Total Amount
        lines.push(`*💰 GRAND TOTAL : ${this.formatINR(res.grandTotal)}*`);

        // 7. Payment Due & Status
        if (cfg.paymentDue !== false && isInvoice) {
            if (paymentStatus === 'paid') {
                lines.push(`✅ *Payment Status : PAID*`);
            } else if ((res.advancePaidAmount || 0) > 0) {
                lines.push(`✅ Advance Paid : − ${this.formatINR(res.advancePaidAmount)}`);
                lines.push(`*🔴 BALANCE DUE : ${this.formatINR(res.balancePayable)}*`);
            } else if (paymentStatus === 'unpaid') {
                lines.push(`*🔴 BALANCE DUE : ${this.formatINR(res.grandTotal)}*`);
            }
        }

        // 8. Custom Note
        if (cfg.note !== false) {
            let customRemark = (res.customNote || '').trim();
            if (isInvoice && /பாறை கடினம்|rock strata/i.test(customRemark)) {
                customRemark = '';
            }
            if (customRemark) {
                lines.push(`📝 *Note:* ${customRemark}`);
            }
        }

        // 9. Footer Terms & 10. Contact / UPI Info
        const docFooterNote = cfg.footerTerms !== false ? this.getDocFooterTermsNote(isInvoice ? 'INVOICE' : 'QUOTATION') : '';
        const hasBottomSection = docFooterNote || (cfg.contact !== false && (b.website || b.upiId || compPhones));

        if (hasBottomSection) {
            lines.push(`──────────────────────`);
        }

        if (docFooterNote) {
            lines.push(docFooterNote);
        }

        if (cfg.contact !== false) {
            if (b.website && b.website.trim()) lines.push(`🌐 *Website:* ${b.website.trim()}`);
            if (b.upiId && b.upiId.trim()) {
                const upiDisplay = b.upiName && b.upiName.trim() ? `${b.upiId.trim()} (${b.upiName.trim()})` : b.upiId.trim();
                lines.push(`💳 *UPI / GPay:* ${upiDisplay}`);
            }
            if (compPhones) lines.push(`📞 *Contact:* ${compPhones}`);
        }

        return lines.join('\n');
    }

    generateWhatsAppMessage() {
        this.syncBrandFromInputs(true);
        this.applyBrandToUI();
        this.calculateAndRender();

        const res = this.lastResult;
        const billNo = document.getElementById('billNoInput')?.value || 'AB-101';
        const dateStr = document.getElementById('receiptDateText')?.textContent || '';
        const loadedItem = this.loadedHistoryBillId
            ? (this.history || []).find(h => h.id === this.loadedHistoryBillId)
            : null;

        return this.buildCleanBillWhatsAppMessage({
            billNo,
            billDate: dateStr,
            custName: this.state.custName,
            custPhone: this.state.custPhone,
            custLocation: this.state.custLocation,
            custGst: this.state.custGst,
            res,
            paymentStatus: loadedItem?.paymentStatus || null
        });
    }

    openWhatsAppPreviewModal({
        recipientName = 'Customer',
        phone = '',
        message = '',
        title = 'WhatsApp Message Preview',
        subtitle = 'Review bill details & mobile number before sending'
    }) {
        const overlay = document.getElementById('whatsappPreviewModalOverlay');
        const titleEl = document.getElementById('waPreviewModalTitle');
        const subEl = document.getElementById('waPreviewModalSub');
        const recNameEl = document.getElementById('waPreviewRecipientName');
        const countrySelect = document.getElementById('waPreviewCountryCode');
        const phoneInput = document.getElementById('waPreviewPhoneInput');
        const bubbleEl = document.getElementById('waPreviewFormattedBubble');
        const rawArea = document.getElementById('waPreviewMessageInput');
        const chatWrap = document.getElementById('waChatPreviewContainer');
        const editBtn = document.getElementById('toggleWaRawEditBtn');

        if (!overlay) return;

        const parsedPhone = this.parsePhoneWithCountryCode(phone || '', this.defaultCountryCode);
        if (countrySelect) {
            countrySelect.value = parsedPhone.countryCode;
        }
        this.syncPhoneInputMetaForCountry('waPreviewPhoneInput', parsedPhone.countryCode);

        if (titleEl) titleEl.textContent = title;
        if (subEl) subEl.textContent = subtitle;
        if (recNameEl) recNameEl.textContent = (recipientName || 'Customer').trim() || 'Customer';
        if (phoneInput) phoneInput.value = parsedPhone.localDigits;
        if (rawArea) {
            rawArea.value = message || '';
            rawArea.style.display = 'none';
        }
        if (chatWrap) chatWrap.style.display = 'block';
        if (editBtn) {
            editBtn.classList.remove('active');
            editBtn.textContent = '✏️ Edit Text';
        }
        if (bubbleEl) {
            bubbleEl.innerHTML = this.formatWhatsAppBubbleHtml(message || '');
        }

        overlay.style.display = 'flex';
        this.refreshIcons();
    }

    closeWhatsAppPreviewModal() {
        const overlay = document.getElementById('whatsappPreviewModalOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    confirmAndSendWhatsAppFromModal() {
        const rawArea = document.getElementById('waPreviewMessageInput');
        const countrySelect = document.getElementById('waPreviewCountryCode');
        const phoneInput = document.getElementById('waPreviewPhoneInput');
        const msg = (rawArea?.value || '').trim();
        if (!msg) {
            this.showToast('⚠️ Message is empty');
            return;
        }
        const selectedCode = countrySelect?.value || this.defaultCountryCode || '+91';
        const parsed = this.parsePhoneWithCountryCode(phoneInput?.value || '', selectedCode);
        this.setDefaultCountryCode(parsed.countryCode);

        let waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        if (parsed.localDigits.length >= parsed.meta.minLen) {
            const fullDial = `${parsed.meta.dial}${parsed.localDigits}`;
            waUrl = `https://wa.me/${fullDial}?text=${encodeURIComponent(msg)}`;
        }
        this.closeWhatsAppPreviewModal();
        window.open(waUrl, '_blank');
    }

    shareOnWhatsApp() {
        const msg = this.generateWhatsAppMessage();
        const billNo = document.getElementById('billNoInput')?.value || 'AB-101';
        const isInvoice = (this.lastResult?.docType || 'INVOICE') === 'INVOICE';
        const cName = (this.state.custName || '').trim() || 'Customer';
        this.openWhatsAppPreviewModal({
            recipientName: cName,
            phone: this.state.custPhone || '',
            message: msg,
            title: `WhatsApp ${isInvoice ? 'Bill' : 'Quotation'} Preview (#${billNo})`,
            subtitle: 'Check bill breakup & mobile number before sending'
        });
    }

    shareSavedHistoryBillOnWhatsApp(billId) {
        const item = (this.history || []).find(h => h.id === billId);
        if (!item || !item.snapshot) return;
        this.syncBrandFromInputs(true);
        const snap = item.snapshot;
        const isInvoice = (snap.docType || 'QUOTATION') === 'INVOICE';
        const cName = (item.custName && item.custName !== 'Walk-in Customer') ? item.custName : 'Customer';
        const msg = this.buildCleanBillWhatsAppMessage({
            billNo: item.billNo,
            billDate: item.billDate || this.getHistoryItemDateStr(item),
            custName: cName,
            custPhone: item.custPhone || '',
            custLocation: item.custLocation || '',
            custGst: item.custGst || snap.custGst || '',
            res: snap,
            paymentStatus: item.paymentStatus || null
        });
        this.openWhatsAppPreviewModal({
            recipientName: cName,
            phone: item.custPhone || '',
            message: msg,
            title: `WhatsApp ${isInvoice ? 'Bill' : 'Quotation'} Preview (#${item.billNo})`,
            subtitle: 'Check bill breakup & mobile number before sending'
        });
    }

    shareCustomerSummaryOnWhatsApp(cust) {
        if (!cust) return;
        this.syncBrandFromInputs(true);
        const b = this.brand || this.defaultBrand;
        const compName = (b.companyName || 'MY BOREWELL COMPANY').trim();
        const custNormPhone = this.normalizeMobileNumber(cust.phone || '');
        const matchingBills = (this.history || []).filter(item => {
            const itemNormPhone = this.normalizeMobileNumber(item.custPhone || '');
            if (custNormPhone && itemNormPhone && custNormPhone === itemNormPhone) return true;
            if (cust.name && item.custName && cust.name.toLowerCase() === item.custName.toLowerCase()) return true;
            return false;
        });

        // If customer has exactly 1 bill, show that full neat bill preview directly!
        if (matchingBills.length === 1) {
            this.shareSavedHistoryBillOnWhatsApp(matchingBills[0].id);
            return;
        }

        const agg = this.getCustomerAggregates(cust);
        const unpaidBills = matchingBills.filter(item => this.isBillItemUnpaid(item));
        const dispCustPhone = this.formatPhoneWithCountryCode(cust.phone || '', cust.countryCode || this.defaultCountryCode);
        const compPhones = this.formatCompanyPhonesWithCountryCode((b.phones || '').trim(), b.phoneCountryCode || this.defaultCountryCode);

        const lines = [];
        lines.push(`*🚜 ${compName}*`);
        if (b.tagline) lines.push(`_${b.tagline.trim()}_`);
        lines.push(`──────────────────────`);
        lines.push(`👤 *Customer:* ${cust.name}`);
        if (cust.village) lines.push(`🏠 *Place:* ${cust.village}`);
        if (dispCustPhone) lines.push(`📞 *Mobile:* ${dispCustPhone}`);
        lines.push(`──────────────────────`);

        if (matchingBills.length > 0) {
            lines.push(`*⛏️ BOREWELL & PIPE SUMMARY:*`);
            lines.push(`• Total Bores : *${agg.boresCount} ${agg.boresCount === 1 ? 'Bore' : 'Bores'}*`);
            lines.push(`• Total Drilled : *${agg.totalDrilledFt.toLocaleString('en-IN')} ft*`);
            lines.push(`• Total Casing Pipe : *${agg.totalPipeFt.toLocaleString('en-IN')} ft* (7": ${agg.totalPvc7Ft}ft, 10": ${agg.totalPvc10Ft}ft)`);
            lines.push(`──────────────────────`);
        }

        if (unpaidBills.length > 0) {
            lines.push(`*🔴 PENDING BILL DETAILS:*`);
            unpaidBills.forEach(ub => {
                const pendingAmt = this.getBillPendingAmount(ub);
                const dStr = this.getHistoryItemDateStr(ub);
                lines.push(`• *#${ub.billNo}* (${ub.custLocation || 'Site'} • ${dStr}) : *Due ${this.formatINR(pendingAmt)}*`);
            });
            lines.push(`──────────────────────`);
            lines.push(`📊 Total Billed : ${this.formatINR(agg.totalBilled)}`);
            lines.push(`✅ Paid So Far : ${this.formatINR(agg.totalPaid)}`);
            lines.push(`*🔴 PENDING BALANCE DUE : ${this.formatINR(agg.totalPending)}*`);
        } else if (matchingBills.length > 0) {
            lines.push(`*📋 BORE BILLS SUMMARY:*`);
            matchingBills.slice(0, 6).forEach(mb => {
                const dStr = this.getHistoryItemDateStr(mb);
                const snap = mb.snapshot || {};
                lines.push(`• *#${mb.billNo}* (${mb.custLocation || 'Site'} • ${snap.totalDepth || 0}ft • ${dStr}) : *${this.formatINR(snap.grandTotal || 0)}*`);
            });
            lines.push(`──────────────────────`);
            lines.push(`*💰 Total Billed : ${this.formatINR(agg.totalBilled)}*`);
            lines.push(`*✅ Paid Amount : ${this.formatINR(agg.totalPaid)} (Settled)*`);
        } else {
            lines.push(`🙏 Hello *${cust.name}*,`);
            lines.push(`Thank you for contacting us for your borewell service!`);
        }

        lines.push(`──────────────────────`);
        if (b.upiId && b.upiId.trim()) {
            const upiDisplay = b.upiName && b.upiName.trim() ? `${b.upiId.trim()} (${b.upiName.trim()})` : b.upiId.trim();
            lines.push(`💳 *UPI / GPay:* ${upiDisplay}`);
        }
        if (compPhones) lines.push(`📞 *Contact:* ${compPhones}`);

        this.openWhatsAppPreviewModal({
            recipientName: cust.name,
            phone: dispCustPhone || '',
            message: lines.join('\n'),
            title: `WhatsApp Preview — ${cust.name}`,
            subtitle: agg.totalPending > 0 ? `Pending Due: ${this.formatINR(agg.totalPending)}` : 'Review customer message before sending'
        });
    }

    async exportBillAsImage() {
        this.syncBrandFromInputs(true);
        this.applyBrandToUI();
        this.calculateAndRender();

        const card = document.getElementById('printableBillCard');
        if (!card || typeof html2canvas === 'undefined') {
            this.showToast('⏳ Loading image generator, please try again.');
            return;
        }
        this.showToast('📸 Generating HD Bill Image...');
        let cloneHost = null;
        try {
            cloneHost = document.createElement('div');
            cloneHost.className = 'pdf-a4-export-sheet';
            cloneHost.style.position = 'fixed';
            cloneHost.style.left = '-9999px';
            cloneHost.style.top = '0';
            cloneHost.style.zIndex = '-1';
            const clonedCard = card.cloneNode(true);
            cloneHost.appendChild(clonedCard);
            document.body.appendChild(cloneHost);

            const canvas = await html2canvas(cloneHost, {
                scale: 2.5,
                useCORS: true,
                backgroundColor: '#ffffff',
                windowWidth: 600
            });

            const billNo = (document.getElementById('billNoInput')?.value || 'Bill').replace(/[^a-zA-Z0-9_-]/g, '_');
            const compSafe = (this.brand.companyName || 'BoreBill').trim().replace(/\s+/g, '_');
            const fileName = `${compSafe}_${billNo}.png`;

            const ua = navigator.userAgent || '';
            const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

            // If browser supports Web Share API with Files (iOS Safari, modern mobile browsers)
            if (canvas.toBlob && navigator.canShare) {
                try {
                    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                    if (blob) {
                        const file = new File([blob], fileName, { type: 'image/png' });
                        if (navigator.canShare({ files: [file] })) {
                            await navigator.share({
                                files: [file],
                                title: `${this.brand.companyName || 'Borewell'} Bill #${billNo}`,
                                text: `Bill Receipt #${billNo}`
                            });
                            this.showToast('✅ Bill Image Shared / Saved!');
                            return;
                        }
                    }
                } catch (shareErr) {
                    if (shareErr.name === 'AbortError') {
                        // User simply cancelled the iOS share sheet
                        return;
                    }
                    console.warn('Web Share API failed, falling back:', shareErr);
                }
            }

            const imgData = canvas.toDataURL('image/png');

            // If iOS device or standalone PWA where programmatic <a download> is blocked
            if (isIOS) {
                this.openIosImageSaveModal(imgData);
                this.showToast('💡 Long press image to Save to Photos');
                return;
            }

            // Standard desktop / Android link download
            const link = document.createElement('a');
            link.download = fileName;
            link.href = imgData;
            link.click();
            this.showToast('✅ Bill Image Saved!');
        } catch (err) {
            console.error('exportBillAsImage error:', err);
            this.showToast('❌ Could not save image.');
        } finally {
            if (cloneHost && cloneHost.parentNode) {
                cloneHost.parentNode.removeChild(cloneHost);
            }
        }
    }

    openIosImageSaveModal(imgDataUrl) {
        const modal = document.getElementById('iosImageSaveModal');
        const imgEl = document.getElementById('iosImgPreviewElement');
        if (!modal || !imgEl) return;
        imgEl.src = imgDataUrl;
        modal.style.display = 'flex';
        this.refreshIcons();
    }

    closeIosImageSaveModal() {
        const modal = document.getElementById('iosImageSaveModal');
        if (modal) modal.style.display = 'none';
    }

    async exportBillAsPDF() {
        // 1. Force 100% live sync of all Company Settings & Receipt UI before generating PDF
        this.syncBrandFromInputs(true);
        this.applyBrandToUI();
        this.calculateAndRender();

        const card = document.getElementById('printableBillCard');
        if (!card || typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
            this.showToast('⏳ Loading PDF engine, please try again.');
            return;
        }
        this.showToast('📄 Generating Official A4 PDF...');
        let cloneHost = null;
        try {
            // 2. Render an A4-proportioned (600px width) clone so mobile screens never stretch or squish the PDF
            cloneHost = document.createElement('div');
            cloneHost.className = 'pdf-a4-export-sheet';
            cloneHost.style.position = 'fixed';
            cloneHost.style.left = '-9999px';
            cloneHost.style.top = '0';
            cloneHost.style.zIndex = '-1';
            const clonedCard = card.cloneNode(true);
            cloneHost.appendChild(clonedCard);
            document.body.appendChild(cloneHost);

            const canvas = await html2canvas(cloneHost, {
                scale: 2.6,
                useCORS: true,
                backgroundColor: '#ffffff',
                windowWidth: 600
            });
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
                compress: true
            });

            const billNo = (document.getElementById('billNoInput')?.value || 'Bill').trim();
            const compName = (this.brand.companyName || 'Borewell Company').trim();
            const custName = (this.state.custName || '').trim();
            pdf.setProperties({
                title: `${compName} - #${billNo}`,
                subject: `${this.lastResult?.docType === 'INVOICE' ? 'Final Bill' : 'Quotation'} #${billNo}${custName ? ' - ' + custName : ''}`,
                author: compName,
                creator: 'BoreBill Pro'
            });

            const pageWidth = pdf.internal.pageSize.getWidth();   // 210 mm
            const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm
            // Centered layout with balanced 175mm width on standard 210mm A4
            const maxW = 175;
            const maxH = pageHeight - 16;

            let drawW = maxW;
            let drawH = (canvas.height * drawW) / canvas.width;

            // Preserve exact aspect ratio if tall receipt exceeds 1 page height (never squish vertically!)
            if (drawH > maxH) {
                const ratio = maxH / drawH;
                drawH = maxH;
                drawW = drawW * ratio;
            }
            const xOffset = (pageWidth - drawW) / 2;
            const yOffset = 10;

            pdf.addImage(imgData, 'PNG', xOffset, yOffset, drawW, drawH, undefined, 'FAST');

            const safeComp = compName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
            const safeBillNo = billNo.replace(/[^a-zA-Z0-9_-]/g, '_');
            const safeCust = custName ? `_${custName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')}` : '';
            pdf.save(`${safeComp || 'BoreBill'}_${safeBillNo}${safeCust}.pdf`);
            this.showToast('✅ Official A4 PDF Downloaded!');
        } catch (err) {
            console.error('exportBillAsPDF error:', err);
            this.showToast('❌ PDF generation failed.');
        } finally {
            if (cloneHost && cloneHost.parentNode) {
                cloneHost.parentNode.removeChild(cloneHost);
            }
        }
    }
}
