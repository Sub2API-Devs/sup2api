/**
 * ajv/dist/vocabularies/validation/limitProperties.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../../compile/codegen/index.js";

//@ chunk-s82q9s4x.js:86590-87116 cjs-fingerprint
var Do = x(function (Ao) {
  Object.defineProperty(Ao, "__esModule", { value: !0 });
  var ie = uh(),
    vf = {
      message({ keyword: e, schemaCode: t }) {
        return ie.str`must NOT have ${e === "maxProperties" ? "more" : "fewer"} than ${t} properties`;
      },
      params: ({ schemaCode: schemaCode }) => ie._`{limit: ${schemaCode}}`,
    },
    wf = {
      keyword: ["maxProperties", "minProperties"],
      type: "object",
      schemaType: "number",
      $data: !0,
      error: vf,
      code(e) {
        let { keyword: keyword, data: r, schemaCode: schemaCode } = e,
          n = keyword === "maxProperties" ? ie.operators.GT : ie.operators.LT;
        e.fail$data(ie._`Object.keys(${r}).length ${n} ${schemaCode}`);
      },
    };
  Ao.default = wf;
});

export { Do };
