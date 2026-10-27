// Guards the module split: every method of the original single-file app must still exist on the app class.
import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { BoreBillSaaSApp } from '../src/app/App.js';

it('app class still has every original method', () => {
    const original = JSON.parse(readFileSync(new URL('./fixtures/original-methods.json', import.meta.url), 'utf8'));
    const now = new Set(Object.getOwnPropertyNames(BoreBillSaaSApp.prototype));
    const missing = original.filter((m) => !now.has(m));
    expect(missing).toEqual([]);
});
