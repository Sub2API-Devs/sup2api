/**
 * ajv/dist/vocabularies/applicator/oneOf.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../../compile/codegen/index.js";
import { ew } from "../../compile/util.js";

//@ chunk-s82q9s4x.js:103296-104197 cjs-fingerprint
var Ui = x(function (zi) {
  Object.defineProperty(zi, "__esModule", { value: !0 });
  var xe = uh(),
    Vi = ew(),
    xp = {
      message: "must match exactly one schema in oneOf",
      params: ({ params: params }) => xe._`{passingSchemas: ${params.passing}}`,
    },
    Rp = {
      keyword: "oneOf",
      schemaType: "array",
      trackErrors: !0,
      error: xp,
      code(e) {
        let { gen: gen, schema: schema, parentSchema: parentSchema, it: it } = e;
        if (!Array.isArray(schema)) throw Error("ajv implementation error");
        if (it.opts.discriminator && parentSchema.discriminator) return;
        let o = schema,
          i = gen.let("valid", !1),
          a = gen.let("passing", null),
          c = gen.name("_valid");
        (e.setParams({ passing: a }),
          gen.block(u),
          e.result(
            i,
            () => e.reset(),
            () => e.error(!0),
          ));
        function u() {
          o.forEach((l, f) => {
            let b;
            if (Vi.alwaysValidSchema(it, l)) gen.var(c, !0);
            else b = e.subschema({ keyword: "oneOf", schemaProp: f, compositeRule: !0 }, c);
            if (f > 0)
              gen
                .if(xe._`${c} && ${i}`)
                .assign(i, !1)
                .assign(a, xe._`[${a}, ${f}]`)
                .else();
            gen.if(c, () => {
              if ((gen.assign(i, !0), gen.assign(a, f), b)) e.mergeEvaluated(b, xe.Name);
            });
          });
        }
      },
    };
  zi.default = Rp;
});

export { Ui };
