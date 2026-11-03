/**
 * zod/v4/classic/compat.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7gfe9gyh.js (6)
 * attribution: esm-fingerprint 1, esm-layout 5
 */
import { _coercedString, _coercedNumber, _coercedBoolean } from "../core/api.js";
import { lMn, ZodNumber, ZodBoolean } from "./schemas.js";

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
var e;
//@ chunk-7gfe9gyh.js:571-598 esm-layout
(function (o) {})(e || (e = {}));
//@ chunk-7gfe9gyh.js:598-632 esm-layout
function Fgs(map) {
  return _coercedString(lMn, map);
}
//@ chunk-7gfe9gyh.js:632-666 esm-layout
function F1e(params) {
  return _coercedNumber(ZodNumber, params);
}
//@ chunk-7gfe9gyh.js:666-700 esm-layout
function v1i(params) {
  return _coercedBoolean(ZodBoolean, params);
}
export { F1e, v1i, ZodIssueCode, Fgs };
