/**
 * call-bind-apply-helpers/functionCall.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: call-bind-apply-helpers@1.0.2
 * pieces: chunk-h6b7mazd.js (3)
 * attribution: cjs-require-graph 3
 */
import { x } from "../../runtime/bun-runtime.js";
import { Ee } from "../function-bind/index.js";
import { sr } from "./functionApply.js";
import { qo } from "./index.js";

//@ chunk-h6b7mazd.js:10934-10996 cjs-require-graph
var Ot = x(function (fp, No) {
  No.exports = Function.prototype.call;
});
//@ chunk-h6b7mazd.js:11140-11233 cjs-require-graph
var ko = x(function (dp, Io) {
  var iu = Ee(),
    au = sr(),
    uu = Ot(),
    cu = qo();
  Io.exports = cu || iu.call(uu, au);
});
//@ chunk-h6b7mazd.js:12047-12174 cjs-require-graph
var es = x(function (bp, Zo) {
  var mu = Function.prototype.call,
    hasOwnProperty = Object.prototype.hasOwnProperty,
    bu = Ee();
  Zo.exports = bu.call(mu, hasOwnProperty);
});

export { Ot, ko, es };
