"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeJson = exports.decodeList = exports.encodeList = void 0;
const encodeList = (values) => JSON.stringify(values);
exports.encodeList = encodeList;
/**
 * Parses a JSON string column into a validated array, dropping unknown members.
 * Returns `fallback` when the column is corrupt rather than throwing - a bad row
 * should degrade one user's personalization, not 500 the dashboard.
 */
const decodeList = (raw, allowed, fallback = []) => {
    if (!raw)
        return fallback;
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return fallback;
        const allowedSet = new Set(allowed);
        const result = parsed.filter((item) => typeof item === 'string' && allowedSet.has(item));
        return result.length > 0 ? result : fallback;
    }
    catch {
        return fallback;
    }
};
exports.decodeList = decodeList;
/** Parses an arbitrary JSON column with a zod schema, returning null on failure. */
const decodeJson = (raw, schema) => {
    if (!raw)
        return null;
    try {
        const result = schema.safeParse(JSON.parse(raw));
        return result.success ? result.data : null;
    }
    catch {
        return null;
    }
};
exports.decodeJson = decodeJson;
//# sourceMappingURL=json.js.map