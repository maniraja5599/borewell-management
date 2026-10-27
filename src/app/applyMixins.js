// Copies methods from feature "mixin" classes onto the main app class,
// so each feature lives in its own file but still shares `this` (state, rates, history...).
export function applyMixins(target, mixins) {
    const seen = new Map();
    for (const mixin of mixins) {
        for (const key of Object.getOwnPropertyNames(mixin.prototype)) {
            if (key === 'constructor') continue;
            if (seen.has(key) || Object.prototype.hasOwnProperty.call(target.prototype, key)) {
                throw new Error(`Method "${key}" defined twice (${seen.get(key) || target.name} and ${mixin.name})`);
            }
            seen.set(key, mixin.name);
            Object.defineProperty(target.prototype, key, Object.getOwnPropertyDescriptor(mixin.prototype, key));
        }
    }
}
