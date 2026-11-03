/**
 * ajv/dist/vocabularies/applicator/additionalItems.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../../compile/codegen/index.js";
import { ew } from "../../compile/util.js";

//@ chunk-s82q9s4x.js:92118-93166 cjs-fingerprint
var Rr = x(function (ti) {
  Object.defineProperty(ti, "__esModule", { value: !0 });
  ti.validateAdditionalItems = void 0;
  var J = uh(),
    Ze = ew(),
    Zf = {
      message: ({ params: { len: e } }) => J.str`must NOT have more than ${e} items`,
      params: ({ params: { len: e } }) => J._`{limit: ${e}}`,
    },
    ep = {
      keyword: "additionalItems",
      type: "array",
      schemaType: ["boolean", "object"],
      before: "uniqueItems",
      error: Zf,
      code(e) {
        let { parentSchema: parentSchema, it: it } = e,
          { items: items } = parentSchema;
        if (!Array.isArray(items)) {
          Ze.checkStrictMode(it, '"additionalItems" is ignored when "items" is not an array of schemas');
          return;
        }
        ei(e, items);
      },
    };
  function ei(e, t) {
    let { gen: gen, schema: schema, data: n, keyword: keyword, it: it } = e;
    it.items = !0;
    let a = gen.const("len", J._`${n}.length`);
    if (schema === !1) (e.setParams({ len: t.length }), e.pass(J._`${a} <= ${t.length}`));
    else if (typeof schema == "object" && !Ze.alwaysValidSchema(it, schema)) {
      let u = gen.var("valid", J._`${a} <= ${t.length}`);
      (gen.if(J.not(u), () => c(u)), e.ok(u));
    }
    function c(u) {
      gen.forRange("i", t.length, a, (l) => {
        if ((e.subschema({ keyword: keyword, dataProp: l, dataPropType: Ze.Type.Num }, u), !it.allErrors))
          gen.if(J.not(u), () => gen.break());
      });
    }
  }
  ti.validateAdditionalItems = ei;
  ti.default = ep;
});

export { Rr };
