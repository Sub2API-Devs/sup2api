/**
 * zod/v4/classic/compat.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7gfe9gyh.js (6)
 * attribution: esm-fingerprint 1, esm-layout 5
 */
import { _coercedString, _coercedNumber, _coercedBoolean } from "../core/api.js";
import { ZodString, ZodNumber, ZodBoolean } from "./schemas.js";
import { deferInit, beginDeferredInits } from "../../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 3677 modules closed by ../../../../src/utils/hooks/functionHookMatchers.js (in the hooks worker thread);
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("worker:src/utils/hooks/functionHookMatchers.js");
//@ chunk-7gfe9gyh.js:248-565 esm-fingerprint
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
//@ chunk-7gfe9gyh.js:565-571 esm-layout
var ZodFirstPartyTypeKind;
//@ chunk-7gfe9gyh.js:571-598 esm-layout
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7gfe9gyh.js:571", () => {
  (function (typeKindNamespace) {})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
});
//@ chunk-7gfe9gyh.js:598-632 esm-layout
function coerceString(map) {
  return _coercedString(ZodString, map);
}
//@ chunk-7gfe9gyh.js:632-666 esm-layout
function coerceNumber(params) {
  return _coercedNumber(ZodNumber, params);
}
//@ chunk-7gfe9gyh.js:666-700 esm-layout
function coerceBoolean(params) {
  return _coercedBoolean(ZodBoolean, params);
}
export { coerceNumber, coerceBoolean, ZodIssueCode, coerceString };
