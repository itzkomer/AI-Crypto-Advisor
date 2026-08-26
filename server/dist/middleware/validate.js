"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.validate = void 0;
const errors_1 = require("../utils/errors");
const flatten = (error) => {
    const details = {};
    for (const issue of error.issues) {
        const key = issue.path.join('.') || '_root';
        const existing = details[key];
        if (existing)
            existing.push(issue.message);
        else
            details[key] = [issue.message];
    }
    return details;
};
const validate = (schema, target = 'body') => (req, _res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
        next(new errors_1.ValidationError(flatten(result.error)));
        return;
    }
    // `req.query` and `req.params` are prototype getters with no setter in
    // Express, so plain assignment (or Object.assign) throws. Define an own
    // property instead, which shadows the getter safely.
    Object.defineProperty(req, target, {
        value: result.data,
        writable: true,
        enumerable: true,
        configurable: true,
    });
    next();
};
exports.validate = validate;
/** Wraps an async handler so rejections reach the error middleware. */
const asyncHandler = (handler) => (req, res, next) => {
    void handler(req, res, next).catch(next);
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=validate.js.map