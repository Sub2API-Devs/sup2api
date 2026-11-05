/**
 * @bufbuild/cel/dist/cjs/error.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-qg41pqt6.js:320986-321635 cjs-fingerprint
var require_error = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.celError = celError;
  cjsExports.celErrorMerge = celErrorMerge;
  cjsExports.isCelError = isCelError;
  var privateSymbol = Symbol.for("@bufbuild/cel/error");
  function celError(value, exprId) {
    if (isCelError(value)) return value;
    if (typeof exprId === "number") exprId = BigInt(exprId);
    if (value instanceof Error) return new _CelError(value.message, value, exprId);
    if (typeof value === "string") return new _CelError(value, undefined, exprId);
    return new _CelError(`${value}`, value, exprId);
  }
  function celErrorMerge(first, ...rest) {
    return new _CelError(first.message, rest, first.exprId);
  }
  function isCelError(v) {
    return typeof v === "object" && v !== null && privateSymbol in v;
  }
  class _CelError extends Error {
    _cause;
    _exprId;
    [privateSymbol] = {};
    constructor(message, _cause, _exprId) {
      super(message);
      this._cause = _cause;
      this._exprId = _exprId;
    }
    get exprId() {
      return this._exprId;
    }
    get cause() {
      return this._cause;
    }
  }
});
export { require_error };
