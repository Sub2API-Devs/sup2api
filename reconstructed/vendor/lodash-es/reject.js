/**
 * lodash-es/reject.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-9q5xd4yn.js (2), chunk-dcmhvw5a.js (2)
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

//@ chunk-dcmhvw5a.js:10335-10346 placement
var import_reject_2 = negate;
//@ chunk-dcmhvw5a.js:10346-10387 placement
function reject(collection, predicate) {
  return pickByHelper(collection, import_reject_2(baseIterateeAlias(predicate)));
}
//@ chunk-9q5xd4yn.js:396-455 placement
function reject_2(collection, predicate) {
  var func = isArrayAlias(collection) ? arrayFilterAlias : baseFilter_default;
  return func(collection, import_reject_2(baseIterateeAlias(predicate, 3)));
}
//@ chunk-9q5xd4yn.js:455-464 placement
var reject_default = reject_2;
export { reject, reject_default };
