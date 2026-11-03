/**
 * ajv/dist/vocabularies/applicator/thenElse.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { ew } from "../../compile/util.js";

//@ chunk-s82q9s4x.js:105688-105960 cjs-fingerprint
var Qi = x(function (Bi) {
  Object.defineProperty(Bi, "__esModule", { value: !0 });
  var Wi = ew(),
    Vp = {
      keyword: ["then", "else"],
      schemaType: ["object", "boolean"],
      code({ keyword: e, parentSchema: t, it: r }) {
        if (t.if === void 0) Wi.checkStrictMode(r, `"${e}" without "if" is ignored`);
      },
    };
  Bi.default = Vp;
});

export { Qi };
