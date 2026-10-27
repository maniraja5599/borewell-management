// Auto-split from the original single-file app.js. Methods are mixed into BoreBillSaaSApp (see app/App.js).
export class CustomerFilterListeners {
    setupCustomerFilterListeners() {
        document.getElementById('crmSortDueBtn')?.addEventListener('click', () => {
            this.crmSortDueDesc = !this.crmSortDueDesc;
            const btn = document.getElementById('crmSortDueBtn');
            btn?.classList.toggle('active', Boolean(this.crmSortDueDesc));
            this.renderCustomerDirectory(document.getElementById('crmSearchInput')?.value || '');
            this.showToast(this.crmSortDueDesc ? '↕ Sorted by Due (Highest first)' : '↺ Normal order restored');
        });

        document.getElementById('crmFilterToggleBtn')?.addEventListener('click', () => {
            const panel = document.getElementById('crmFilterDropdownPanel');
            if (!panel) return;
            const willOpen = panel.style.display === 'none';
            panel.style.display = willOpen ? 'flex' : 'none';
        });

        document.getElementById('closeCrmFilterPanelBtn')?.addEventListener('click', () => {
            const panel = document.getElementById('crmFilterDropdownPanel');
            if (panel) panel.style.display = 'none';
        });

        document.querySelectorAll('#crmDatePresetPills .bfp-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const preset = pill.dataset.crmpreset || 'all';
                this.crmDatePreset = preset;
                document.querySelectorAll('#crmDatePresetPills .bfp-pill').forEach(p => p.classList.toggle('active', p === pill));
                const customRow = document.getElementById('crmCustomDateRow');
                if (customRow) {
                    customRow.style.display = preset === 'custom' ? 'grid' : 'none';
                }
                const badge = document.getElementById('crmFilterBadge');
                if (badge) {
                    const hasActive = preset !== 'all';
                    badge.style.display = hasActive ? 'inline-flex' : 'none';
                    badge.textContent = '1';
                }
                this.renderCustomerDirectory(document.getElementById('crmSearchInput')?.value || '');
            });
        });

        document.getElementById('crmDateFrom')?.addEventListener('change', (e) => {
            this.crmCustomFrom = e.target.value;
            this.renderCustomerDirectory(document.getElementById('crmSearchInput')?.value || '');
        });

        document.getElementById('crmDateTo')?.addEventListener('change', (e) => {
            this.crmCustomTo = e.target.value;
            this.renderCustomerDirectory(document.getElementById('crmSearchInput')?.value || '');
        });

        document.getElementById('resetCrmFiltersBtn')?.addEventListener('click', () => {
            this.crmDatePreset = 'all';
            this.crmCustomFrom = '';
            this.crmCustomTo = '';
            this.crmSortDueDesc = false;
            document.getElementById('crmSortDueBtn')?.classList.remove('active');
            document.querySelectorAll('#crmDatePresetPills .bfp-pill').forEach(p => p.classList.toggle('active', p.dataset.crmpreset === 'all'));
            const customRow = document.getElementById('crmCustomDateRow');
            if (customRow) customRow.style.display = 'none';
            const badge = document.getElementById('crmFilterBadge');
            if (badge) badge.style.display = 'none';
            const panel = document.getElementById('crmFilterDropdownPanel');
            if (panel) panel.style.display = 'none';
            this.renderCustomerDirectory(document.getElementById('crmSearchInput')?.value || '');
            this.showToast('↺ Customer filters reset');
        });

        // Click top date badge to focus date
    }
}
