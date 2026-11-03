/**
 * json-bigint/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: json-bigint@1.0.0
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { nn } from "./lib/stringify.js";
import { an } from "./lib/parse.js";

//@ chunk-na3pph4p.js:43194-43354 cjs-require-graph
var ln = x(function (Md, Ft) {
  var stringify = nn().stringify,
    un = an();
  Ft.exports = function (e) {
    return { parse: un(e), stringify: stringify };
  };
  Ft.exports.parse = un();
  Ft.exports.stringify = stringify;
});

export { ln };
