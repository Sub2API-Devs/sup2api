/**
 * ajv/dist/compile/rules.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-s82q9s4x.js:25072-25637 cjs-fingerprint
var pr = x(function (qs) {
  Object.defineProperty(qs, "__esModule", { value: !0 });
  qs.getRules = qs.isJSONType = void 0;
  var Ac = ["string", "number", "integer", "boolean", "null", "object", "array"],
    Dc = new Set(Ac);
  function Vc(e) {
    return typeof e == "string" && Dc.has(e);
  }
  qs.isJSONType = Vc;
  function zc() {
    let e = {
      number: { type: "number", rules: [] },
      string: { type: "string", rules: [] },
      array: { type: "array", rules: [] },
      object: { type: "object", rules: [] },
    };
    return {
      types: { ...e, integer: !0, boolean: !0, null: !0 },
      rules: [{ rules: [] }, e.number, e.string, e.array, e.object],
      post: { rules: [] },
      all: {},
      keywords: {},
    };
  }
  qs.getRules = zc;
});

export { pr };
