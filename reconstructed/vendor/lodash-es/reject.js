/**
 * lodash-es/reject.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-9q5xd4yn.js (2), chunk-dcmhvw5a.js (2)
 * attribution: placement 4
 */
import { ME } from "./toString.js";
import { ndo, nz, dh } from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { a } from "./_baseFilter.js";
import { Do } from "../../src/utils/git/gitSafeEnv.js";

//@ chunk-9q5xd4yn.js:396-455 placement
function n(r, e) {
  var t = ME(r) ? ndo : a;
  return t(r, Eio(nz(e, 3)));
}
//@ chunk-9q5xd4yn.js:455-464 placement
var zj = n;
//@ chunk-dcmhvw5a.js:10335-10346 placement
var Eio = dh;
//@ chunk-dcmhvw5a.js:10346-10387 placement
function reject(e, n) {
  return Do(e, Eio(nz(n)));
}

export { reject, zj };
