/**
 * highlight.js/lib/languages/mizar.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint+context 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:301059-301777 cjs-fingerprint+context
var require_mizar = __commonJS(function (cjsExports, cjsModule) {
  function mizar(hljs) {
    return {
      name: "Mizar",
      keywords:
        "environ vocabularies notations constructors definitions registrations theorems schemes requirements begin end definition registration cluster existence pred func defpred deffunc theorem proof let take assume then thus hence ex for st holds consider reconsider such that and in provided of as from be being by means equals implies iff redefine define now not or attr is mode suppose per cases set thesis contradiction scheme reserve struct correctness compatibility coherence symmetry assymetry reflexivity irreflexivity connectedness uniqueness commutativity idempotence involutiveness projectivity",
      contains: [hljs.COMMENT("::", "$")],
    };
  }
  cjsModule.exports = mizar;
});
export { require_mizar };
