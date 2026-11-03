/**
 * call-bind-apply-helpers/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: call-bind-apply-helpers@1.0.2
 * pieces: chunk-h6b7mazd.js (2)
 * attribution: cjs-layout 1, cjs-require-graph 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { Ee } from "../function-bind/index.js";
import { _t } from "../es-object-atoms/index.js";
import { Ot, ko } from "./functionCall.js";

//@ chunk-h6b7mazd.js:11059-11140 cjs-layout
var qo = x(function (pp, Uo) {
  Uo.exports = typeof Reflect < "u" && Reflect && Reflect.apply;
});
//@ chunk-h6b7mazd.js:11233-11418 cjs-require-graph
var Mo = x(function (hp, jo) {
  var fu = Ee(),
    lu = _t(),
    pu = Ot(),
    du = ko();
  jo.exports = function (t) {
    if (t.length < 1 || typeof t[0] !== "function") throw new lu("a function is required");
    return du(fu, pu, t);
  };
});

export { qo, Mo };
