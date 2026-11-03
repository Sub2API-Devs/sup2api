/**
 * ajv/dist/vocabularies/validation/limitItems.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../../compile/codegen/index.js";

//@ chunk-s82q9s4x.js:88514-89001 cjs-fingerprint
var Fo = x(function (Ko) {
  Object.defineProperty(Ko, "__esModule", { value: !0 });
  var ue = uh(),
    Nf = {
      message({ keyword: e, schemaCode: t }) {
        return ue.str`must NOT have ${e === "maxItems" ? "more" : "fewer"} than ${t} items`;
      },
      params: ({ schemaCode: schemaCode }) => ue._`{limit: ${schemaCode}}`,
    },
    kf = {
      keyword: ["maxItems", "minItems"],
      type: "array",
      schemaType: "number",
      $data: !0,
      error: Nf,
      code(e) {
        let { keyword: keyword, data: r, schemaCode: schemaCode } = e,
          n = keyword === "maxItems" ? ue.operators.GT : ue.operators.LT;
        e.fail$data(ue._`${r}.length ${n} ${schemaCode}`);
      },
    };
  Ko.default = kf;
});

export { Fo };
