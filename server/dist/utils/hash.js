"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shortHash = void 0;
const node_crypto_1 = require("node:crypto");
/**
 * Short, stable content fingerprint used inside `itemIdentifier` values so a
 * feedback row points at the exact content the user rated.
 */
const shortHash = (input, length = 10) => (0, node_crypto_1.createHash)('sha256').update(input).digest('hex').slice(0, length);
exports.shortHash = shortHash;
//# sourceMappingURL=hash.js.map