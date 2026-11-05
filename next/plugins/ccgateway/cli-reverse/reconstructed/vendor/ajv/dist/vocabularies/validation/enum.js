/**
 * ajv/dist/vocabularies/validation/enum.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";
import { require_util_2 } from "../../compile/util.js";
import { require_equal } from "../../runtime/equal.js";

//@ chunk-xcs4sv9h.js:90833-91741 cjs-fingerprint
var require_enum = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var codegen_1 = require_codegen_2();
  var util_1 = require_util_2();
  var equal_1 = require_equal();
  var error = {
    message: "must be equal to one of the allowed values",
    params: ({ schemaCode }) => codegen_1._`{allowedValues: ${schemaCode}}`,
  };
  var def = {
    keyword: "enum",
    schemaType: "array",
    $data: true,
    error,
    code(cxt) {
      let { gen, data, $data, schema, schemaCode, it } = cxt;
      if (!$data && schema.length === 0) throw Error("enum must have non-empty array");
      let useLoop = schema.length >= it.opts.loopEnum;
      let eql;
      let getEql = () =>
        eql !== null && eql !== undefined ? eql : (eql = util_1.useFunc(gen, equal_1.default));
      let valid;
      if (useLoop || $data) {
        valid = gen.let("valid");
        cxt.block$data(valid, loopEnum);
      } else {
        if (!Array.isArray(schema)) throw Error("ajv implementation error");
        let vSchema = gen.const("vSchema", schemaCode);
        valid = codegen_1.or(...schema.map((_x, i) => equalCode(vSchema, i)));
      }
      cxt.pass(valid);
      function loopEnum() {
        gen.assign(valid, false);
        gen.forOf("v", schemaCode, (v) =>
          gen.if(codegen_1._`${getEql()}(${data}, ${v})`, () => gen.assign(valid, true).break()),
        );
      }
      function equalCode(vSchema, i) {
        let sch = schema[i];
        return typeof sch === "object" && sch !== null
          ? codegen_1._`${getEql()}(${data}, ${vSchema}[${i}])`
          : codegen_1._`${data} === ${sch}`;
      }
    },
  };
  cjsExports.default = def;
});
export { require_enum };
