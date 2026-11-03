/**
 * ajv/dist/vocabularies/validation/const.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../../compile/codegen/index.js";
import { ew } from "../../compile/util.js";
import { Lkn } from "../../runtime/equal.js";

//@ chunk-s82q9s4x.js:90404-90833 cjs-fingerprint
var Bo = x(function (Wo) {
  Object.defineProperty(Wo, "__esModule", { value: !0 });
  var Ye = uh(),
    Jo = ew(),
    If = Lkn(),
    Tf = {
      message: "must be equal to constant",
      params: ({ schemaCode: schemaCode }) => Ye._`{allowedValue: ${schemaCode}}`,
    },
    Cf = {
      keyword: "const",
      $data: !0,
      error: Tf,
      code(e) {
        let { gen: gen, data: r, $data: $data, schemaCode: schemaCode, schema: schema } = e;
        if ($data || (schema && typeof schema == "object"))
          e.fail$data(Ye._`!${Jo.useFunc(gen, If.default)}(${r}, ${schemaCode})`);
        else e.fail(Ye._`${schema} !== ${r}`);
      },
    };
  Wo.default = Cf;
});

export { Bo };
