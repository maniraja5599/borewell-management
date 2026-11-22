// Features that are built but switched off for now. Turning one back on is a one-line change here.
export const FEATURES = {
    // Casing pipe stock (Phase 7, 22 Nov 2026): Settings → Rig work → "Casing pipes", the
    // "With pipe / Drilling only" choice on the bill and the low-stock toast after a bill is saved.
    // (The old Bills-tab card stays gone, as decided on 14 Nov.) Off = none of these.
    pipeStock: true,
    // New look (15 Nov 2026): the approved "merged" design: current app colours with the clean
    // preview layout. Off = the previous look. Only CSS (html.ui-v3) depends on it.
    uiV3: true
};
