"use strict";
/** Date helpers. All "daily" logic is UTC so it does not drift per user. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toIso = exports.utcDateKey = void 0;
/** Returns the current UTC calendar day as YYYY-MM-DD. */
const utcDateKey = (date = new Date()) => {
    const iso = date.toISOString();
    return iso.slice(0, 10);
};
exports.utcDateKey = utcDateKey;
const toIso = (value) => value ? value.toISOString() : null;
exports.toIso = toIso;
//# sourceMappingURL=date.js.map