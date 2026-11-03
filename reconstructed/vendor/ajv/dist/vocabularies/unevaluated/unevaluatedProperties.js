/**
 * ajv/dist/vocabularies/unevaluated/unevaluatedProperties.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../../compile/codegen/index.js";
import { ew } from "../../compile/util.js";
import { DPe } from "../../compile/names.js";

//@ chunk-1r4fv9mg.js:3452-4567 cjs-fingerprint
var ge = x(function ($e) {
  Object.defineProperty($e, "__esModule", { value: !0 });
  var y = uh(),
    N = ew(),
    mt = DPe(),
    lt = {
      message: "must NOT have unevaluated properties",
      params: ({ params: params }) => y._`{unevaluatedProperty: ${params.unevaluatedProperty}}`,
    },
    ft = {
      keyword: "unevaluatedProperties",
      type: "object",
      schemaType: ["boolean", "object"],
      trackErrors: !0,
      error: lt,
      code(e) {
        let { gen: gen, schema: schema, data: n, errsCount: errsCount, it: it } = e;
        if (!errsCount) throw Error("ajv implementation error");
        let { allErrors: allErrors, props: props } = it;
        if (props instanceof y.Name)
          gen.if(y._`${props} !== true`, () => gen.forIn("key", n, (h) => gen.if(p(props, h), () => s(h))));
        else if (props !== !0)
          gen.forIn("key", n, (h) => (props === void 0 ? s(h) : gen.if(g(props, h), () => s(h))));
        ((it.props = !0), e.ok(y._`${errsCount} === ${mt.default.errors}`));
        function s(h) {
          if (schema === !1) {
            if ((e.setParams({ unevaluatedProperty: h }), e.error(), !allErrors)) gen.break();
            return;
          }
          if (!N.alwaysValidSchema(it, schema)) {
            let P = gen.name("valid");
            if (
              (e.subschema({ keyword: "unevaluatedProperties", dataProp: h, dataPropType: N.Type.Str }, P),
              !allErrors)
            )
              gen.if(y.not(P), () => gen.break());
          }
        }
        function p(h, P) {
          return y._`!${h} || !${h}[${P}]`;
        }
        function g(h, P) {
          let c = [];
          for (let key in h) if (h[key] === !0) c.push(y._`${P} !== ${key}`);
          return y.and(...c);
        }
      },
    };
  $e.default = ft;
});

export { ge };
