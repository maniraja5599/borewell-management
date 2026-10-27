// Single place where the app reads/writes saved data.
// Today it is the browser's localStorage. When cloud sync (Supabase) is added,
// only this file (plus a sync queue) needs to change — the features keep calling the same API.

export const STORAGE_KEYS = Object.freeze({
    // Business data (will move to the cloud, per company)
    customers: 'borebill_customers',
    history: 'borebill_history',            // saved bills & quotations, with payments
    rateProfiles: 'borebill_rate_profiles',
    rates: 'borebill_rates',
    brand: 'borebill_brand',                // company profile, bill counters, terms
    savedExtras: 'borebill_saved_extras',
    savedNotes: 'borebill_saved_notes',
    waFormat: 'borebill_wa_format',

    // Per-device preferences (stay on the phone)
    lastSession: 'borebill_last_session',   // the bill currently being typed
    lang: 'borebill_lang',
    defaultCountryCode: 'borebill_default_country_code',
    scrollY: 'borebill_scroll_y',
    v52FooterMigrated: 'borebill_v52_footer_migrated'
});

function safeLocalStorage() {
    try {
        return window.localStorage;
    } catch (_) {
        return null; // private mode / blocked storage
    }
}

export const storage = {
    getRaw(key) {
        const ls = safeLocalStorage();
        return ls ? ls.getItem(key) : null;
    },

    // Throws when storage is full so callers can warn the user that data was NOT saved.
    setRaw(key, value) {
        const ls = safeLocalStorage();
        if (!ls) throw new Error('Storage unavailable');
        ls.setItem(key, value);
    },

    remove(key) {
        const ls = safeLocalStorage();
        if (ls) ls.removeItem(key);
    }
};
