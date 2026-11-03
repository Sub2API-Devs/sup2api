/**
 * ajv/dist/refs/json-schema-2020-12/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { Ae } from "./schema.json.js";
import { Re } from "./meta/applicator.json.js";
import { Se } from "./meta/unevaluated.json.js";
import { we } from "./meta/content.json.js";
import { Oe } from "./meta/core.json.js";
import { ke } from "./meta/format-annotation.json.js";
import { xe } from "./meta/meta-data.json.js";
import { Me } from "./meta/validation.json.js";

//@ chunk-1r4fv9mg.js:12940-13281 cjs-require-graph
var Ne = x(function (Ie) {
  Object.defineProperty(Ie, "__esModule", { value: !0 });
  var Vt = Ae(),
    Dt = Re(),
    Wt = Se(),
    Lt = we(),
    Ht = Oe(),
    Kt = ke(),
    Gt = xe(),
    Ut = Me(),
    zt = ["/properties"];
  function Xt(e) {
    return (
      [Vt, Dt, Wt, Lt, Ht, r(this, Kt), Gt, r(this, Ut)].forEach((a) => this.addMetaSchema(a, void 0, !1)),
      this
    );
    function r(a, n) {
      return e ? a.$dataMetaSchema(n, zt) : n;
    }
  }
  Ie.default = Xt;
});

export { Ne };
