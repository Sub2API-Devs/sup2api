/**
 * @azure/core-rest-pipeline/dist/esm/util/file.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (5)
 * attribution: esm-layout 4, esm-fingerprint 1
 */
import { Kn } from "../../../../../@typespec/ts-http-runtime/dist/esm/util/delay.js";
import { tr } from "../../../../../@typespec/ts-http-runtime/dist/esm/util/error.js";
import { Gr } from "../../../../../@typespec/ts-http-runtime/dist/esm/util/checkEnvironment.js";

//@ chunk-mrx6y2r5.js:56876-56908 esm-layout
function Xl(e, t) {
  return Kn(e, t);
}
//@ chunk-mrx6y2r5.js:56908-56936 esm-layout
function Wo(e) {
  return tr(e);
}
//@ chunk-mrx6y2r5.js:56936-56952 esm-layout
var Qo = Gr,
  Yn = Gr;
//@ chunk-mrx6y2r5.js:56952-56980 esm-fingerprint
var Zl = Symbol("rawContent");
//@ chunk-mrx6y2r5.js:56980-57028 esm-layout
function pa(e) {
  return typeof e[Zl] === "function";
}

export { pa, Zl, Wo, Yn, Qo, Xl };
