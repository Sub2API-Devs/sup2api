/**
 * @azure/core-rest-pipeline/dist/esm/util/file.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (5)
 * attribution: esm-layout 4, esm-fingerprint 1
 */
import { Kn } from "../../../../../@typespec/ts-http-runtime/dist/esm/util/delay.js";
import { tr } from "../../../../../@typespec/ts-http-runtime/dist/esm/util/error.js";
import { isNodeLike } from "../../../../../@typespec/ts-http-runtime/dist/esm/util/checkEnvironment.js";

//@ chunk-mrx6y2r5.js:56876-56908 esm-layout
function Xl(retryCount, config) {
  return Kn(retryCount, config);
}
//@ chunk-mrx6y2r5.js:56908-56936 esm-layout
function Wo(e) {
  return tr(e);
}
//@ chunk-mrx6y2r5.js:56936-56952 esm-layout
var isNodeLike_default = isNodeLike;
var isNodeLike_default_2 = isNodeLike;
//@ chunk-mrx6y2r5.js:56952-56980 esm-fingerprint
var rawContent = Symbol("rawContent");
//@ chunk-mrx6y2r5.js:56980-57028 esm-layout
function isNodeReadableStream(x) {
  return typeof x[rawContent] === "function";
}
export { isNodeReadableStream, rawContent, Wo, isNodeLike_default_2, isNodeLike_default, Xl };
