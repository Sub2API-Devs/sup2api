/**
 * ajv/dist/vocabularies/validation/multipleOf.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../../compile/codegen/index.js";

//@ chunk-s82q9s4x.js:84514-85041 cjs-fingerprint
var No = x(function (Po) {
  Object.defineProperty(Po, "__esModule", { value: !0 });
  var oe = uh(),
    uf = {
      message: ({ schemaCode: schemaCode }) => oe.str`must be multiple of ${schemaCode}`,
      params: ({ schemaCode: schemaCode }) => oe._`{multipleOf: ${schemaCode}}`,
    },
    lf = {
      keyword: "multipleOf",
      type: "number",
      schemaType: "number",
      $data: !0,
      error: uf,
      code(e) {
        let { gen: gen, data: r, schemaCode: schemaCode, it: it } = e,
          multipleOfPrecision = it.opts.multipleOfPrecision,
          i = gen.let("res"),
          a = multipleOfPrecision
            ? oe._`Math.abs(Math.round(${i}) - ${i}) > 1e-${multipleOfPrecision}`
            : oe._`${i} !== parseInt(${i})`;
        e.fail$data(oe._`(${schemaCode} === 0 || (${i} = ${r}/${schemaCode}, ${a}))`);
      },
    };
  Po.default = lf;
});

export { No };
