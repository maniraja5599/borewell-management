// Features that are built but switched off for now. Turning one back on is a one-line change here.
export const FEATURES = {
    // Pipe stock (Bills tab card + sheet). Hidden 14 Nov 2026 to keep the Bills page simple.
    // Off = the card is not shown. Any stock already entered stays on the phone and in sync,
    // so nothing is lost when it is switched back on.
    pipeStock: false,
    // New look (15 Nov 2026): the approved "merged" design: current app colours with the clean
    // preview layout. Off = the previous look. Only CSS (html.ui-v3) depends on it.
    uiV3: true
};
