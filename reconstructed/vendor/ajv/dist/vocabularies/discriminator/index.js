/**
 * ajv/dist/vocabularies/discriminator/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../../compile/codegen/index.js";
import { ca } from "./types.js";
import { tlr } from "../../compile/index.js";
import { jvn } from "../../compile/ref_error.js";
import { ew } from "../../compile/util.js";

//@ chunk-s82q9s4x.js:109129-111418 cjs-fingerprint
var jQo = x(function (la) {
  Object.defineProperty(la, "__esModule", { value: !0 });
  var Y = uh(),
    rt = ca(),
    Bt = tlr(),
    $h = jvn(),
    ua = ew(),
    vh = {
      message: ({ params: { discrError: e, tagName: t } }) =>
        e === rt.DiscrError.Tag ? `tag "${t}" must be string` : `value of tag "${t}" must be in oneOf`,
      params: ({ params: { discrError: e, tag: t, tagName: r } }) =>
        Y._`{error: ${e}, tag: ${r}, tagValue: ${t}}`,
    },
    wh = {
      keyword: "discriminator",
      type: "object",
      schemaType: "object",
      error: vh,
      code(e) {
        let { gen: gen, data: r, schema: schema, parentSchema: parentSchema, it: it } = e,
          { oneOf: oneOf } = parentSchema;
        if (!it.opts.discriminator) throw Error("discriminator: requires discriminator option");
        let propertyName = schema.propertyName;
        if (typeof propertyName != "string") throw Error("discriminator: requires propertyName");
        if (schema.mapping) throw Error("discriminator: mapping is not supported");
        if (!oneOf) throw Error("discriminator: requires oneOf keyword");
        let c = gen.let("valid", !1),
          u = gen.const("tag", Y._`${r}${Y.getProperty(propertyName)}`);
        (gen.if(
          Y._`typeof ${u} == "string"`,
          () => l(),
          () => e.error(!1, { discrError: rt.DiscrError.Tag, tag: u, tagName: propertyName }),
        ),
          e.ok(c));
        function l() {
          let _ = b();
          gen.if(!1);
          for (let key in _) (gen.elseIf(Y._`${u} === ${key}`), gen.assign(c, f(_[key])));
          (gen.else(),
            e.error(!1, { discrError: rt.DiscrError.Mapping, tag: u, tagName: propertyName }),
            gen.endIf());
        }
        function f(_) {
          let h = gen.name("valid"),
            subschema = e.subschema({ keyword: "oneOf", schemaProp: _ }, h);
          return (e.mergeEvaluated(subschema, Y.Name), h);
        }
        function b() {
          var _;
          let h = {},
            p = v(parentSchema),
            y = !0;
          for (let M = 0; M < oneOf.length; M++) {
            let N = oneOf[M];
            if (
              (N === null || N === void 0 ? void 0 : N.$ref) &&
              !ua.schemaHasRulesButRef(N, it.self.RULES)
            ) {
              let $ref = N.$ref;
              if (
                ((N = Bt.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, $ref)),
                N instanceof Bt.SchemaEnv)
              )
                N = N.schema;
              if (N === void 0) throw new $h.default(it.opts.uriResolver, it.baseId, $ref);
            }
            let ee =
              (_ = N === null || N === void 0 ? void 0 : N.properties) === null || _ === void 0
                ? void 0
                : _[propertyName];
            if (typeof ee != "object")
              throw Error(
                `discriminator: oneOf subschemas (or referenced schemas) must have "properties/${propertyName}"`,
              );
            ((y = y && (p || v(N))), O(ee, M));
          }
          if (!y) throw Error(`discriminator: "${propertyName}" must be required`);
          return h;
          function v({ required: required }) {
            return Array.isArray(required) && required.includes(propertyName);
          }
          function O(M, N) {
            if (M.const) q(M.const, N);
            else if (M.enum) for (let ee of M.enum) q(ee, N);
            else throw Error(`discriminator: "properties/${propertyName}" must have "const" or "enum"`);
          }
          function q(M, N) {
            if (typeof M != "string" || M in h)
              throw Error(`discriminator: "${propertyName}" values must be unique strings`);
            h[M] = N;
          }
        }
      },
    };
  la.default = wh;
});

export { jQo };
