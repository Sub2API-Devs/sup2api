/**
 * @bufbuild/cel/dist/cjs/run.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { Y_ } from "./env.js";
import { rv } from "./parse.js";
import { gv } from "./plan.js";

//@ chunk-fq0cr76a.js:628855-629033 cjs-fingerprint
var UF = x(function (BF) {
  Object.defineProperty(BF, "__esModule", { value: !0 });
  BF.run = mae;
  var OF = Y_(),
    PF = rv(),
    LF = gv();
  function mae(e, n, r) {
    return LF.plan(OF.celEnv(r), PF.parse(e))(n);
  }
});

export { UF };
