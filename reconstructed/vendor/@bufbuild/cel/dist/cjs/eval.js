/**
 * @bufbuild/cel/dist/cjs/eval.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:469618-470154 cjs-fingerprint
var ld = x(function (yL) {
  Object.defineProperty(yL, "__esModule", { value: !0 });
  yL.setEvalContext = mL;
  yL.getEvalContext = gL;
  yL.withEvalContext = hQ;
  yL.getMsgDesc = mQ;
  var Ep = [];
  function mL(e) {
    return (Ep.push(e), () => Ep.pop());
  }
  function gL() {
    if (Ep.length === 0) throw Error("cannot use `getEvalContext` outside of an evaluation");
    return Ep[Ep.length - 1];
  }
  function hQ(e, n) {
    return {
      id: n.id,
      eval(r) {
        let s = mL(e);
        try {
          return n.eval(r);
        } finally {
          s();
        }
      },
    };
  }
  function mQ(e) {
    let message = gL().registry.getMessage(e);
    if (!message) throw Error(`Message ${e} not found in registry`);
    return message;
  }
});

export { ld };
