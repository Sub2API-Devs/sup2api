/**
 * ajv/dist/compile/ref_error.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { lt } from "./resolve.js";

//@ chunk-s82q9s4x.js:52170-52476 cjs-fingerprint
var jvn = x(function (Cn) {
  Object.defineProperty(Cn, "__esModule", { value: !0 });
  var Ge = lt();
  class Tn extends Error {
    constructor(e, t, r, s) {
      super(s || `can't resolve reference ${r} from id ${t}`);
      ((this.missingRef = Ge.resolveUrl(e, t, r)),
        (this.missingSchema = Ge.normalizeId(Ge.getFullPath(e, this.missingRef))));
    }
  }
  Cn.default = Tn;
});

export { jvn };
