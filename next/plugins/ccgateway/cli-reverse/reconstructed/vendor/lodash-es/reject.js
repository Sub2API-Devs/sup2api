/**
 * lodash-es/reject.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-5b0f9k65.js (2), chunk-z20c443b.js (2)
 * attribution: placement 4
 */
import {
  negate,
  baseIterateeAlias,
  arrayFilterAlias,
} from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { pickByHelper } from "../../src/utils/git/gitSafeEnv.js";
import { isArrayAlias } from "./toString.js";
import { baseFilter_default } from "./_baseFilter.js";

//@ chunk-z20c443b.js:10212-10223 placement
var import_reject_2 = negate;
//@ chunk-z20c443b.js:10223-10264 placement
function reject(collection, predicate) {
  return pickByHelper(collection, import_reject_2(baseIterateeAlias(predicate)));
}
//@ chunk-5b0f9k65.js:396-455 placement
function reject_2(collection, predicate) {
  var func = isArrayAlias(collection) ? arrayFilterAlias : baseFilter_default;
  return func(collection, import_reject_2(baseIterateeAlias(predicate, 3)));
}
//@ chunk-5b0f9k65.js:455-464 placement
var reject_default = reject_2;
export { reject, reject_default };
