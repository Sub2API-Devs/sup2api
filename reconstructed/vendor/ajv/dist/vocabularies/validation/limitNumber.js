/**
 * ajv/dist/vocabularies/validation/limitNumber.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../../compile/codegen/index.js";

//@ chunk-s82q9s4x.js:83864-84514 cjs-fingerprint
var So = x(function (Eo) {
  Object.defineProperty(Eo, "__esModule", { value: !0 });
  var Pe = uh(),
    operators = Pe.operators,
    Vt = {
      maximum: { okStr: "<=", ok: operators.LTE, fail: operators.GT },
      minimum: { okStr: ">=", ok: operators.GTE, fail: operators.LT },
      exclusiveMaximum: { okStr: "<", ok: operators.LT, fail: operators.GTE },
      exclusiveMinimum: { okStr: ">", ok: operators.GT, fail: operators.LTE },
    },
    of = {
      message: ({ keyword: keyword, schemaCode: schemaCode }) =>
        Pe.str`must be ${Vt[keyword].okStr} ${schemaCode}`,
      params: ({ keyword: keyword, schemaCode: schemaCode }) =>
        Pe._`{comparison: ${Vt[keyword].okStr}, limit: ${schemaCode}}`,
    },
    af = {
      keyword: Object.keys(Vt),
      type: "number",
      schemaType: "number",
      $data: !0,
      error: of,
      code(e) {
        let { keyword: keyword, data: r, schemaCode: schemaCode } = e;
        e.fail$data(Pe._`${r} ${Vt[keyword].fail} ${schemaCode} || isNaN(${r})`);
      },
    };
  Eo.default = af;
});

export { So };
