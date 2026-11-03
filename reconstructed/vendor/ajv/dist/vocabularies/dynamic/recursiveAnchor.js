/**
 * ajv/dist/vocabularies/dynamic/recursiveAnchor.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { T } from "./dynamicAnchor.js";
import { ew } from "../../compile/util.js";

//@ chunk-1r4fv9mg.js:1958-2225 cjs-fingerprint
var te = x(function (ee) {
  Object.defineProperty(ee, "__esModule", { value: !0 });
  var J = T(),
    Q = ew(),
    Ke = {
      keyword: "$recursiveAnchor",
      schemaType: "boolean",
      code(e) {
        if (e.schema) J.dynamicAnchor(e, "");
        else Q.checkStrictMode(e.it, "$recursiveAnchor: false is ignored");
      },
    };
  ee.default = Ke;
});

export { te };
