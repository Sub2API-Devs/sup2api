/**
 * ajv/dist/vocabularies/applicator/anyOf.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { Q } from "../code.js";

//@ chunk-s82q9s4x.js:103073-103296 cjs-fingerprint
var Di = x(function (Ai) {
  Object.defineProperty(Ai, "__esModule", { value: !0 });
  var Mi = Q(),
    Op = {
      keyword: "anyOf",
      schemaType: "array",
      trackErrors: !0,
      code: Mi.validateUnion,
      error: { message: "must match a schema in anyOf" },
    };
  Ai.default = Op;
});

export { Di };
