/**
 * ajv/dist/vocabularies/validation/limitContains.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { ew } from "../../compile/util.js";

//@ chunk-1r4fv9mg.js:2999-3298 cjs-fingerprint
var pe = x(function (fe) {
  Object.defineProperty(fe, "__esModule", { value: !0 });
  var le = ew(),
    nt = {
      keyword: ["maxContains", "minContains"],
      type: "array",
      schemaType: "number",
      code({ keyword: e, parentSchema: r, it: a }) {
        if (r.contains === void 0) le.checkStrictMode(a, `"${e}" without "contains" is ignored`);
      },
    };
  fe.default = nt;
});

export { pe };
