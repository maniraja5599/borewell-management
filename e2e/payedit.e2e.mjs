// Changing saved payments on a phone: owner any time; staff only when the owner allows it, and only
// for N hours after the payment was entered. All cloud traffic is blocked.
// Needs the dev server (the Team card is mounted straight from its module):
//   npx vite --port 5179 --strictPort                      (in one terminal)
//   E2E_BASE=http://localhost:5179 node e2e/payedit.e2e.mjs (in another)
import { startHarness, wait } from './harness.mjs';

const { p, OUT, check, app, clickId, step, freshCompany, finish } = await startHarness('payedit');
const H = 3600000;

await freshCompany();

const BILL = 'bpe1';
async function seedBill() {
    await app((args) => {
        const a = window.boreBillApp;
        const now = Date.now();
        const rigId = '00000000-0000-4000-8000-00000000aa01';
        a.history = [{
            id: args.bill, billNo: 'SM-201', billDate: '2026-11-23', createdAt: new Date(now - 31 * args.H).toISOString(), custName: 'Selvam', custLocation: 'Rasipuram', rigId,
            snapshot: { docType: 'INVOICE', grandTotal: 30000, totalBeforePaymentDiscount: 30000, totalDepth: 300 },
            payments: [
                { id: 'p_old', date: '2026-11-23', amount: 20000, mode: 'Cash', createdAt: new Date(now - 30 * args.H).toISOString(), by: { id: 'u-mgr', name: 'Ravi' } },
                { id: 'p_new', date: '2026-11-24', amount: 10000, mode: 'UPI', createdAt: new Date(now - 2 * args.H).toISOString(), by: { id: 'u-mgr', name: 'Ravi' } }
            ]
        }, ...a.history.filter((b) => b.id !== args.bill)];
        a.syncBillPaymentSnapshot(a.history[0]);
        a.saveToStorage('borebill_history', a.history);
    }, { bill: BILL, H });
}
const openPay = async () => { await app((id) => window.boreBillApp.openRecordPaymentModal(id), BILL); await wait(400); };
const closePay = () => app(() => window.boreBillApp.closeRecordPaymentModal());
const editBtns = () => app(() => [...document.querySelectorAll('#rpmHistoryList .rpm-hi-edit-btn')].map((b) => b.dataset.payid));
const setRule = (rule) => app((r) => { const a = window.boreBillApp; a.brand.staffPaymentEdit = r; a.saveToStorage('borebill_brand', a.brand); }, rule);

await step('1 owner: every payment can be changed, also an old one', async () => {
    await seedBill();
    await openPay();
    const ids = await editBtns();
    const del = await app(() => document.querySelectorAll('#rpmHistoryList .rpm-hi-del-btn').length);
    check('1 owner: ✏️ on both payments (30 h old and 2 h old), ✕ too', ids.length === 2 && del === 2, { ids, del });
    await closePay();
});

await step('2 manager, owner has not allowed it: no ✏️', async () => {
    await app(() => {
        const rig = { id: '00000000-0000-4000-8000-00000000aa01', name: 'Rig 1', bill_prefix: 'SM', is_default: true, active: true, archived: false };
        localStorage.setItem('drillrig_access_v1', JSON.stringify({
            userId: 'u-mgr', userName: 'Ravi', companyId: 'c1', companyName: 'Sri Murugan Borewells', role: 'manager', perms: {},
            rigs: [rig], companies: [], invites: [], currentRigId: rig.id, updatedAt: Date.now()
        }));
    });
    await p.reload({ waitUntil: 'networkidle0' });
    await wait(800);
    await seedBill();
    await openPay();
    const ids = await editBtns();
    const note = await app(() => document.querySelector('#rpmPaidNote span')?.textContent || '');
    check('2 manager without permission: no ✏️, note says only the owner', ids.length === 0 && /Only the owner/.test(note), { ids, note });
    await app((id) => window.boreBillApp.startEditBillPaymentEntry(id, 'p_new'), BILL); await wait(200);
    const editing = await app(() => window.boreBillApp.rpmEditingPayId);
    check('2 manager without permission: editing straight away is refused too', !editing, { editing });
    await closePay();
});

await step('3 owner allows 24 hours: only the payment from 2 h ago', async () => {
    await setRule({ on: true, hours: 24 });
    await openPay();
    const ids = await editBtns();
    const till = await app(() => document.querySelector('#rpmHistoryList .rpm-hi-till')?.textContent || '');
    const del = await app(() => [...document.querySelectorAll('#rpmHistoryList .rpm-hi-del-btn')].filter((b) => b.offsetParent !== null).length);
    await p.screenshot({ path: `${OUT}/pe1_manager_24h.png` });
    check('3 24 hrs: ✏️ only on the 2 h old payment (with "till …"); ✕ stays owner-only', ids.join() === 'p_new' && /till/.test(till) && del === 0, { ids, till, del });
    await app((id) => window.boreBillApp.startEditBillPaymentEntry(id, 'p_old'), BILL); await wait(200);
    const refused = await app(() => window.boreBillApp.rpmEditingPayId);
    check('3 the 30 h old payment cannot be opened for editing', !refused, { refused });
});

await step('4 manager fixes the recent payment', async () => {
    await app(() => document.querySelector('#rpmHistoryList .rpm-hi-edit-btn')?.click()); await wait(300);
    await app(() => { const i = document.getElementById('rpmAmountInput'); i.value = ''; });
    await p.type('#rpmAmountInput', '9500'); await wait(150);
    await app(() => document.querySelector('#rpmModePills [data-mode="Cash"]')?.click());
    await p.screenshot({ path: `${OUT}/pe2_manager_editing.png` });
    await clickId('rpmSavePaymentBtn'); await wait(500);
    const r = await app((id) => { const a = window.boreBillApp; const b = a.history.find((x) => x.id === id); const pay = b.payments.find((x) => x.id === 'p_new'); return { amt: pay.amount, mode: pay.mode, by: pay.by?.id, editedBy: pay.editedBy?.id, due: a.getBillPendingAmount(b), n: b.payments.length }; }, BILL);
    check('4 saved: ₹9,500 Cash, same payment, taker kept, edit by the manager, ₹500 due', r.amt === 9500 && r.mode === 'Cash' && r.by === 'u-mgr' && r.editedBy === 'u-mgr' && r.due === 500 && r.n === 2, r);
    await closePay();
});

await step('5 owner sets 48 hours: yesterday\'s payment too', async () => {
    await setRule({ on: true, hours: 48 });
    await openPay();
    const ids = await editBtns();
    check('5 48 hrs: ✏️ on both payments', ids.length === 2, { ids });
    await closePay();
    await setRule({ on: true, hours: 12 });
    await openPay();
    const ids12 = await editBtns();
    check('5 12 hrs: still the 2 h old one only', ids12.join() === 'p_new', { ids12 });
    await closePay();
});

await step('6 Team page card (owner): turn on/off and pick hours', async () => {
    await app(async () => {
        const mod = await import('/src/features/team/teamUI.js');
        const host = document.createElement('div');
        host.id = 'e2ePayEditHost';
        host.className = 'tt-sheet';
        host.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#f6f8f7;padding:130px 16px 16px;overflow:auto';
        host.appendChild(mod.paymentEditCard(window.boreBillApp));
        document.body.appendChild(host);
    });
    await wait(300);
    const first = await app(() => ({ on: document.getElementById('ttPayEditOn').checked, hours: document.querySelector('input[name="ttPayEditHours"]:checked')?.value, shown: !document.querySelector('#e2ePayEditHost .tt-seg-hours').closest('.tt-block').hidden }));
    await p.screenshot({ path: `${OUT}/pe3_team_card.png` });
    check('6 card shows the saved setting (on, 12 hrs)', first.on && first.hours === '12' && first.shown, first);
    await app(() => document.querySelector('input[name="ttPayEditHours"][value="24"]').click()); await wait(200);
    const h = await app(() => window.boreBillApp.brand.staffPaymentEdit);
    check('6 tapping 24 hrs saves it', h.on === true && h.hours === 24, h);
    await app(() => document.getElementById('ttPayEditOn').click()); await wait(200);
    const off = await app(() => ({ s: window.boreBillApp.brand.staffPaymentEdit, hidden: document.querySelector('#e2ePayEditHost .tt-seg-hours').closest('.tt-block').hidden, saved: JSON.parse(localStorage.getItem('borebill_brand') || '{}').staffPaymentEdit }));
    check('6 unticking turns it off (hours hidden, kept for next time, saved)', off.s.on === false && off.s.hours === 24 && off.hidden && off.saved?.on === false, off);
    await app(() => document.getElementById('e2ePayEditHost').remove());
    await openPay();
    const ids = await editBtns();
    check('6 turned off: the manager has no ✏️ again', ids.length === 0, { ids });
    await closePay();
});

await finish();
