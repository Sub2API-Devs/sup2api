/**
 * ajv/dist/vocabularies/applicator/propertyNames.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../../compile/codegen/index.js";
import { ew } from "../../compile/util.js";

//@ chunk-s82q9s4x.js:98190-98810 cjs-fingerprint
var Pi = x(function (Si) {
  Object.defineProperty(Si, "__esModule", { value: !0 });
  var Kt = uh(),
    Ei = ew(),
    yp = {
      message: "property name must be valid",
      params: ({ params: params }) => Kt._`{propertyName: ${params.propertyName}}`,
    },
    _p = {
      keyword: "propertyNames",
      type: "object",
      schemaType: ["object", "boolean"],
      error: yp,
      code(e) {
        let { gen: gen, schema: schema, data: s, it: it } = e;
        if (Ei.alwaysValidSchema(it, schema)) return;
        let o = gen.name("valid");
        (gen.forIn("key", s, (i) => {
          (e.setParams({ propertyName: i }),
            e.subschema(
              {
                keyword: "propertyNames",
                data: i,
                dataTypes: ["string"],
                propertyName: i,
                compositeRule: !0,
              },
              o,
            ),
            gen.if(Kt.not(o), () => {
              if ((e.error(!0), !it.allErrors)) gen.break();
            }));
        }),
          e.ok(o));
      },
    };
  Si.default = _p;
});

export { Pi };
