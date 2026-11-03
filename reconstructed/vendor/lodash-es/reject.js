/**
 * lodash-es/reject.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-9q5xd4yn.js (2), chunk-dcmhvw5a.js (2)
 * attribution: placement 4
 */
import { ME } from "./toString.js";
import { ndo, nz, dh } from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { baseFilter_default } from "./_baseFilter.js";
import { pickByHelper } from "../../src/utils/git/gitSafeEnv.js";

//@ chunk-9q5xd4yn.js:396-455 placement
function reject_2(collection, predicate) {
  var func = ME(collection) ? ndo : baseFilter_default;
  return func(collection, Eio(nz(predicate, 3)));
}
//@ chunk-9q5xd4yn.js:455-464 placement
var reject_default = reject_2;
//@ chunk-dcmhvw5a.js:10335-10346 placement
var Eio = dh;
//@ chunk-dcmhvw5a.js:10346-10387 placement
function reject(collection, n) {
  return pickByHelper(collection, Eio(nz(n)));
}
export { reject, reject_default };
