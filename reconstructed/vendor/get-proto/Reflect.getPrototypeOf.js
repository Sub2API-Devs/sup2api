/**
 * get-proto/Reflect.getPrototypeOf.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: get-proto@1.0.1
 * pieces: chunk-h6b7mazd.js (2)
 * attribution: cjs-require-graph 2
 */
import { x } from "../../runtime/bun-runtime.js";
import { er } from "../es-object-atoms/index.js";

//@ chunk-h6b7mazd.js:9716-9803 cjs-require-graph
var nr = x(function (ip, vo) {
  vo.exports = (typeof Reflect < "u" && Reflect.getPrototypeOf) || null;
});
//@ chunk-h6b7mazd.js:9803-9877 cjs-require-graph
var or = x(function (ap, To) {
  var Qa = er();
  To.exports = Qa.getPrototypeOf || null;
});

export { nr, or };
