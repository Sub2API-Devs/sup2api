/**
 * zod/v4/classic/compat.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-pgdjm7py.js (6)
 * attribution: esm-fingerprint 1, esm-layout 5
 */
import { _coercedString, _coercedNumber, _coercedBoolean } from "../core/api.js";
import { ZodString, ZodNumber, ZodBoolean } from "./schemas.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-pgdjm7py.js:248-565 esm-fingerprint
var ZodIssueCode = {
  invalid_type: "invalid_type",
  too_big: "too_big",
  too_small: "too_small",
  invalid_format: "invalid_format",
  not_multiple_of: "not_multiple_of",
  unrecognized_keys: "unrecognized_keys",
  invalid_union: "invalid_union",
  invalid_key: "invalid_key",
  invalid_element: "invalid_element",
  invalid_value: "invalid_value",
  custom: "custom",
};
//@ chunk-pgdjm7py.js:565-571 esm-layout
var ZodFirstPartyTypeKind;
//@ chunk-pgdjm7py.js:571-598 esm-layout
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-pgdjm7py.js:571", () => {
  (function (typeKindNamespace) {})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
});
//@ chunk-pgdjm7py.js:598-632 esm-layout
function coerceString(map) {
  return _coercedString(ZodString, map);
}
//@ chunk-pgdjm7py.js:632-666 esm-layout
function coerceNumber(params) {
  return _coercedNumber(ZodNumber, params);
}
//@ chunk-pgdjm7py.js:666-700 esm-layout
function coerceBoolean(params) {
  return _coercedBoolean(ZodBoolean, params);
}
export { coerceNumber, coerceBoolean, ZodIssueCode, coerceString };
