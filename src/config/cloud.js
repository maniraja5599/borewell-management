// Public cloud settings. Everything here is safe to ship to the browser:
// the publishable key only works together with the database's security rules,
// and a Google Client ID is public by design. Never put a secret key here.
export const CLOUD = {
    supabaseUrl: 'https://xfmienkhenkykgljprsk.supabase.co',
    supabasePublishableKey: 'sb_publishable_DkH4r-qi-iFo4MzNMjPPiA_Gc34oY3o',
    googleClientId: '59672029763-ed85t5d619vt7g5aepor3q1ljsomd95j.apps.googleusercontent.com'
};
