/**
 * ajv/dist/compile/validate/applicability.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-s82q9s4x.js:25637-26116 cjs-fingerprint
var hr = x(function (Rs) {
  Object.defineProperty(Rs, "__esModule", { value: !0 });
  Rs.shouldUseRule = Rs.shouldUseGroup = Rs.schemaHasRulesForType = void 0;
  function Kc({ schema: schema, self: t }, r) {
    let s = t.RULES.types[r];
    return s && s !== !0 && js(schema, s);
  }
  Rs.schemaHasRulesForType = Kc;
  function js(e, t) {
    return t.rules.some((rule) => xs(e, rule));
  }
  Rs.shouldUseGroup = js;
  function xs(e, t) {
    var r;
    return (
      e[t.keyword] !== void 0 ||
      ((r = t.definition.implements) === null || r === void 0 ? void 0 : r.some((s) => e[s] !== void 0))
    );
  }
  Rs.shouldUseRule = xs;
});

export { hr };
