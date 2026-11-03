/**
 * ajv/dist/vocabularies/applicator/patternProperties.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { Q } from "../code.js";
import { uh } from "../../compile/codegen/index.js";
import { ew } from "../../compile/util.js";

//@ chunk-s82q9s4x.js:101484-102646 cjs-fingerprint
var Ri = x(function (xi) {
  Object.defineProperty(xi, "__esModule", { value: !0 });
  var Lt = Q(),
    je = uh(),
    Ht = ew(),
    Gt = ew(),
    Pp = {
      keyword: "patternProperties",
      type: "object",
      schemaType: "object",
      code(e) {
        let { gen: gen, schema: schema, data: s, parentSchema: parentSchema, it: it } = e,
          { opts: opts } = it,
          allSchemaProperties = Lt.allSchemaProperties(schema),
          filtered = allSchemaProperties.filter((p) => Ht.alwaysValidSchema(it, schema[p]));
        if (
          allSchemaProperties.length === 0 ||
          (filtered.length === allSchemaProperties.length && (!it.opts.unevaluated || it.props === !0))
        )
          return;
        let u = opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties,
          l = gen.name("valid");
        if (it.props !== !0 && !(it.props instanceof je.Name))
          it.props = Gt.evaluatedPropsToName(gen, it.props);
        let { props: props } = it;
        b();
        function b() {
          for (let p of allSchemaProperties) {
            if (u) _(p);
            if (it.allErrors) h(p);
            else (gen.var(l, !0), h(p), gen.if(l));
          }
        }
        function _(p) {
          for (let key in u)
            if (new RegExp(p).test(key))
              Ht.checkStrictMode(it, `property ${key} matches pattern ${p} (use allowMatchingProperties)`);
        }
        function h(p) {
          gen.forIn("key", s, (y) => {
            gen.if(je._`${Lt.usePattern(e, p)}.test(${y})`, () => {
              let included = filtered.includes(p);
              if (!included)
                e.subschema(
                  { keyword: "patternProperties", schemaProp: p, dataProp: y, dataPropType: Gt.Type.Str },
                  l,
                );
              if (it.opts.unevaluated && props !== !0) gen.assign(je._`${props}[${y}]`, !0);
              else if (!included && !it.allErrors) gen.if(je.not(l), () => gen.break());
            });
          });
        }
      },
    };
  xi.default = Pp;
});

export { Ri };
