// Menu (was Settings): four big tiles at the top for what people open most —
// Rates & slabs, Team & rigs, Company profile, Backup — each with a live line.
// The full list of settings stays below them.
import { isOwnerOrLocal, getAccess, visibleRigs, can } from '../../cloud/access.js';
import { icon, paintIcons } from '../../ui/icon.js';
import { el } from '../../ui/sheet.js';
import { slabLadderEnd } from '../../core/slabEngine.js';

export function initMenuTiles(app) {
    const nav = document.querySelector('#tab-brand .settings-menu');
    if (!nav || !app) return;
    const box = el('div', { class: 'menu-tiles', id: 'menuTiles' });
    nav.insertAdjacentElement('beforebegin', box);

    const tile = (ic, cls, title, sub, onclick) => el('button', { type: 'button', class: 'menu-tile', onclick }, [
        el('span', { class: `menu-tile-ic ${cls}` }, [icon(ic)]),
        el('span', { class: 'menu-tile-tx' }, [el('strong', { text: title }), el('small', { text: sub })])
    ]);

    const render = () => {
        const tiles = [];
        if (isOwnerOrLocal()) {
            const p = app.getActiveRateProfile?.();
            const end = slabLadderEnd(app.rates) || 0;
            tiles.push(tile('calculator', 'is-green', 'Rates & slabs', `${p?.name || 'Standard'}${end ? ` · to ${end.toLocaleString('en-IN')} ft` : ''}`, () => app.switchTab('tab-rates')));
        }
        const team = document.getElementById('teamCard');
        if (team && !team.hidden) {
            const a = getAccess();
            const rigs = visibleRigs().length;
            tiles.push(tile('users', 'is-blue', 'Team & rigs', a ? `${rigs} rig${rigs === 1 ? '' : 's'} · staff & invites` : 'Add your staff', () => team.click()));
        }
        if (isOwnerOrLocal()) tiles.push(tile('building-2', 'is-purple', 'Company profile', 'Name, logo, UPI, bill no.', () => app.switchSettingsView?.('set-view-company')));
        if (can('bills') || isOwnerOrLocal()) tiles.push(tile('database-backup', 'is-amber', 'Backup', getAccess() ? 'Cloud on · download a file' : 'Download a file', () => app.switchSettingsView?.('set-view-vault')));
        box.hidden = !tiles.length;
        box.replaceChildren(...tiles);
        // The tiles cover these two rows of the list below.
        const covered = { 'set-view-company': isOwnerOrLocal(), 'set-view-vault': can('bills') || isOwnerOrLocal() };
        for (const [view, hide] of Object.entries(covered)) {
            const row = nav.querySelector(`[data-view="${view}"]`);
            if (row) { if (hide) row.style.setProperty('display', 'none', 'important'); else row.style.removeProperty('display'); }
        }
        paintIcons();
    };
    const orig = app.switchTab.bind(app);
    app.switchTab = (tabId, ...rest) => { const r = orig(tabId, ...rest); if (tabId === 'tab-brand') { try { render(); } catch { /* ignore */ } } return r; };
    render();
}
