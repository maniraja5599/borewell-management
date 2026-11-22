// One rule for staff and worker mobile numbers (Indian): 10 digits starting with 6, 7, 8 or 9.
// Accepts "98427 12345", "+91 98427 12345", "919842712345", "09842712345". Returns the 10 digits,
// or '' when it is not a valid mobile number. (Customer numbers keep their own country-code
// handling in customers/PhoneMixin.js, which follows the same rule for India.)
export function indianMobile(raw) {
    let d = String(raw ?? '').replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
    else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
    return /^[6-9]\d{9}$/.test(d) ? d : '';
}
export const MOBILE_HELP = 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.';
