/**
 * ajv/dist/vocabularies/applicator/properties.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { Bvn } from "../../compile/validate/index.js";
import { Q } from "../code.js";
import { ew } from "../../compile/util.js";
import { Tr } from "./additionalProperties.js";

//@ chunk-s82q9s4x.js:100498-101484 cjs-fingerprint
var ji = x(function (Oi) {
  Object.defineProperty(Oi, "__esModule", { value: !0 });
  var qi = Bvn(),
    Ft = Q(),
    tt = ew(),
    ki = Tr(),
    Ep = {
      keyword: "properties",
      type: "object",
      schemaType: "object",
      code(e) {
        let { gen: gen, schema: schema, parentSchema: parentSchema, data: n, it: it } = e;
        if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === void 0)
          ki.default.code(new qi.KeywordCxt(it, ki.default, "additionalProperties"));
        let allSchemaProperties = Ft.allSchemaProperties(schema);
        for (let f of allSchemaProperties) it.definedProperties.add(f);
        if (it.opts.unevaluated && allSchemaProperties.length && it.props !== !0)
          it.props = tt.mergeEvaluated.props(gen, tt.toHash(allSchemaProperties), it.props);
        let filtered = allSchemaProperties.filter((f) => !tt.alwaysValidSchema(it, schema[f]));
        if (filtered.length === 0) return;
        let c = gen.name("valid");
        for (let f of filtered) {
          if (u(f)) l(f);
          else {
            if ((gen.if(Ft.propertyInData(gen, n, f, it.opts.ownProperties)), l(f), !it.allErrors))
              gen.else().var(c, !0);
            gen.endIf();
          }
          (e.it.definedProperties.add(f), e.ok(c));
        }
        function u(f) {
          return it.opts.useDefaults && !it.compositeRule && schema[f].default !== void 0;
        }
        function l(f) {
          e.subschema({ keyword: "properties", schemaProp: f, dataProp: f }, c);
        }
      },
    };
  Oi.default = Ep;
});

export { ji };
