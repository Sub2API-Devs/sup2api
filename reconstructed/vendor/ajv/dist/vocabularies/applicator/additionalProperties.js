/**
 * ajv/dist/vocabularies/applicator/additionalProperties.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { Q } from "../code.js";
import { uh } from "../../compile/codegen/index.js";
import { DPe } from "../../compile/names.js";
import { ew } from "../../compile/util.js";

//@ chunk-s82q9s4x.js:98810-100498 cjs-fingerprint
var Tr = x(function (Ni) {
  Object.defineProperty(Ni, "__esModule", { value: !0 });
  var qe = Q(),
    U = uh(),
    $p = DPe(),
    Oe = ew(),
    vp = {
      message: "must NOT have additional properties",
      params: ({ params: params }) => U._`{additionalProperty: ${params.additionalProperty}}`,
    },
    wp = {
      keyword: "additionalProperties",
      type: ["object"],
      schemaType: ["boolean", "object"],
      allowUndefined: !0,
      trackErrors: !0,
      error: vp,
      code(e) {
        let {
          gen: gen,
          schema: schema,
          parentSchema: parentSchema,
          data: n,
          errsCount: errsCount,
          it: it,
        } = e;
        if (!errsCount) throw Error("ajv implementation error");
        let { allErrors: allErrors, opts: opts } = it;
        if (((it.props = !0), opts.removeAdditional !== "all" && Oe.alwaysValidSchema(it, schema))) return;
        let allSchemaProperties = qe.allSchemaProperties(parentSchema.properties),
          allSchemaProperties_2 = qe.allSchemaProperties(parentSchema.patternProperties);
        (f(), e.ok(U._`${errsCount} === ${$p.default.errors}`));
        function f() {
          gen.forIn("key", n, (y) => {
            if (!allSchemaProperties.length && !allSchemaProperties_2.length) h(y);
            else gen.if(b(y), () => h(y));
          });
        }
        function b(y) {
          let v;
          if (allSchemaProperties.length > 8) {
            let schemaRefOrVal = Oe.schemaRefOrVal(it, parentSchema.properties, "properties");
            v = qe.isOwnProperty(gen, schemaRefOrVal, y);
          } else if (allSchemaProperties.length)
            v = U.or(...allSchemaProperties.map((O) => U._`${y} === ${O}`));
          else v = U.nil;
          if (allSchemaProperties_2.length)
            v = U.or(v, ...allSchemaProperties_2.map((O) => U._`${qe.usePattern(e, O)}.test(${y})`));
          return U.not(v);
        }
        function _(y) {
          gen.code(U._`delete ${n}[${y}]`);
        }
        function h(y) {
          if (opts.removeAdditional === "all" || (opts.removeAdditional && schema === !1)) {
            _(y);
            return;
          }
          if (schema === !1) {
            if ((e.setParams({ additionalProperty: y }), e.error(), !allErrors)) gen.break();
            return;
          }
          if (typeof schema == "object" && !Oe.alwaysValidSchema(it, schema)) {
            let v = gen.name("valid");
            if (opts.removeAdditional === "failing")
              (p(y, v, !1),
                gen.if(U.not(v), () => {
                  (e.reset(), _(y));
                }));
            else if ((p(y, v), !allErrors)) gen.if(U.not(v), () => gen.break());
          }
        }
        function p(y, v, O) {
          let q = { keyword: "additionalProperties", dataProp: y, dataPropType: Oe.Type.Str };
          if (O === !1) Object.assign(q, { compositeRule: !0, createErrors: !1, allErrors: !1 });
          e.subschema(q, v);
        }
      },
    };
  Ni.default = wp;
});

export { Tr };
