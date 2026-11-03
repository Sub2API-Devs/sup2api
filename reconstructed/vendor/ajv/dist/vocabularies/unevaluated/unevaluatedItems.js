/**
 * ajv/dist/vocabularies/unevaluated/unevaluatedItems.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../../compile/codegen/index.js";
import { ew } from "../../compile/util.js";

//@ chunk-1r4fv9mg.js:4567-5354 cjs-fingerprint
var ve = x(function (be) {
  Object.defineProperty(be, "__esModule", { value: !0 });
  var b = uh(),
    C = ew(),
    ht = {
      message: ({ params: { len: e } }) => b.str`must NOT have more than ${e} items`,
      params: ({ params: { len: e } }) => b._`{limit: ${e}}`,
    },
    yt = {
      keyword: "unevaluatedItems",
      type: "array",
      schemaType: ["boolean", "object"],
      error: ht,
      code(e) {
        let { gen: gen, schema: schema, data: n, it: it } = e,
          i = it.items || 0;
        if (i === !0) return;
        let u = gen.const("len", b._`${n}.length`);
        if (schema === !1) (e.setParams({ len: i }), e.fail(b._`${u} > ${i}`));
        else if (typeof schema == "object" && !C.alwaysValidSchema(it, schema)) {
          let s = gen.var("valid", b._`${u} <= ${i}`);
          (gen.if(b.not(s), () => m(s, i)), e.ok(s));
        }
        it.items = !0;
        function m(s, p) {
          gen.forRange("i", p, u, (g) => {
            if (
              (e.subschema({ keyword: "unevaluatedItems", dataProp: g, dataPropType: C.Type.Num }, s),
              !it.allErrors)
            )
              gen.if(b.not(s), () => gen.break());
          });
        }
      },
    };
  be.default = yt;
});

export { ve };
