// Version from package.json, put in at build time by vite.config.js (define). Bump package.json "version" for each release.
/* global __APP_VERSION__, __APP_BUILD_DATE__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
export const APP_BUILD_DATE = typeof __APP_BUILD_DATE__ !== 'undefined' ? __APP_BUILD_DATE__ : '';
export const versionLabel = () => `v${APP_VERSION}`;
