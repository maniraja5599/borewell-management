// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
export class HistoryFilterListeners {
    setupHistoryFilterListeners() {
        document.querySelectorAll('#historyDocTabSwitcher .bq-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.historyDocFilter = btn.dataset.doctab === 'QUOTATION' ? 'QUOTATION' : 'INVOICE';
                this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
            });
        });

        // Inline Filter Icon Button Inside Search Box (#historyFilterToggleBtn) & Filter Popover
        const toggleHistoryFilterPanel = (forceOpen = null) => {
            const panel = document.getElementById('historyFilterDropdownPanel');
            const toggleBtn = document.getElementById('historyFilterToggleBtn');
            if (!panel) return;
            const willOpen = forceOpen !== null ? forceOpen : (panel.style.display === 'none');
            panel.style.display = willOpen ? 'block' : 'none';
            toggleBtn?.classList.toggle('is-open', willOpen);
            if (willOpen) {
                this.refreshIcons();
            }
        };

        document.getElementById('historyFilterToggleBtn')?.addEventListener('click', () => {
            toggleHistoryFilterPanel();
        });

        document.getElementById('closeHistoryFilterPanelBtn')?.addEventListener('click', () => {
            toggleHistoryFilterPanel(false);
        });

        document.getElementById('resetHistoryFiltersBtn')?.addEventListener('click', () => {
            this.resetHistoryFilters(true);
            this.showToast('↺ Cleared payment & date filters');
        });

        document.getElementById('clearHistoryDateChipBtn')?.addEventListener('click', () => {
            this.historyDatePreset = 'all';
            this.historyDateFrom = '';
            this.historyDateTo = '';
            const fromEl = document.getElementById('historyDateFrom');
            const toEl = document.getElementById('historyDateTo');
            if (fromEl) fromEl.value = '';
            if (toEl) toEl.value = '';
            this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
        });

        // Payment Status Filter Pills (Quick Bar + Filter Popover)
        const applyHistoryPayFilter = (payVal) => {
            this.historyPayFilter = payVal || 'all';
            this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
        };

        document.querySelectorAll('#historyPaymentQuickPills .f-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                applyHistoryPayFilter(chip.dataset.payfilter);
            });
        });

        document.querySelectorAll('#historyPopupPayPills .bfp-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                applyHistoryPayFilter(pill.dataset.payfilter);
            });
        });

        // Date Filter Preset Pills & Custom From/To Date Inputs
        document.querySelectorAll('#historyDatePresetPills .bfp-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const preset = pill.dataset.datepreset || 'all';
                this.historyDatePreset = preset;
                if (preset !== 'custom') {
                    this.historyDateFrom = '';
                    this.historyDateTo = '';
                    const fromEl = document.getElementById('historyDateFrom');
                    const toEl = document.getElementById('historyDateTo');
                    if (fromEl) fromEl.value = '';
                    if (toEl) toEl.value = '';
                }
                this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
            });
        });

        const handleCustomHistoryDateChange = () => {
            const fromVal = (document.getElementById('historyDateFrom')?.value || '').trim();
            const toVal = (document.getElementById('historyDateTo')?.value || '').trim();
            this.historyDateFrom = fromVal;
            this.historyDateTo = toVal;
            this.historyDatePreset = (fromVal || toVal) ? 'custom' : 'all';
            this.renderHistoryList(document.getElementById('historySearchInput')?.value || '');
        };

        document.getElementById('historyDateFrom')?.addEventListener('change', handleCustomHistoryDateChange);
        document.getElementById('historyDateTo')?.addEventListener('change', handleCustomHistoryDateChange);

        // Steppers (Never leave "0" in depth or pipe length inputs; clear to "" when <= 0)
    }
}
