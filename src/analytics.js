// Google Analytics 4 (property "DrillRig", stream "DrillRig web app").
// Counts visits and which screens are used. Privacy:
//  - only on the live site (drillrig.in), never on localhost / test copies;
//  - the page address is sent WITHOUT its ?query (invite codes like ?join=… stay on the phone);
//  - no names, phone numbers, bill or customer data are ever sent; no ad signals.
// Disclosed in public/privacy.html.
export const GA_ID = 'G-14JEEG679V';
const LIVE_HOSTS = ['drillrig.in', 'www.drillrig.in'];

let ready = false;

export function initAnalytics() {
    if (ready || typeof window === 'undefined' || !LIVE_HOSTS.includes(window.location.hostname)) return;
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
    ready = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); }; // eslint-disable-line prefer-rest-params
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, {
        page_location: window.location.origin + window.location.pathname,
        allow_google_signals: false,
        allow_ad_personalization_signals: false
    });
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);
}

const TAB_PAGE = { 'tab-bill': 'new-bill', 'tab-history': 'bills', 'tab-customers': 'customers', 'tab-rates': 'rates', 'tab-brand': 'settings' };

/** A screen change inside the app counts as a page view ("/app/bills"). */
export function trackScreen(tabId) {
    if (!ready || !window.gtag) return;
    const name = TAB_PAGE[tabId];
    if (!name) return;
    window.gtag('event', 'page_view', {
        page_title: `DrillRig — ${name}`,
        page_location: `${window.location.origin}/app/${name}`
    });
}
