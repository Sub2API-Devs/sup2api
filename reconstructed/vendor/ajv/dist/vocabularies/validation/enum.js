/**
 * ajv/dist/vocabularies/validation/enum.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../../compile/codegen/index.js";
import { ew } from "../../compile/util.js";
import { Lkn } from "../../runtime/equal.js";

//@ chunk-s82q9s4x.js:90833-91741 cjs-fingerprint
var Yo = x(function (Xo) {
  Object.defineProperty(Xo, "__esModule", { value: !0 });
  var le = uh(),
    Qo = ew(),
    Af = Lkn(),
    Df = {
      message: "must be equal to one of the allowed values",
      params: ({ schemaCode: schemaCode }) => le._`{allowedValues: ${schemaCode}}`,
    },
    Vf = {
      keyword: "enum",
      schemaType: "array",
      $data: !0,
      error: Df,
      code(e) {
        let { gen: gen, data: r, $data: $data, schema: schema, schemaCode: schemaCode, it: it } = e;
        if (!$data && schema.length === 0) throw Error("enum must have non-empty array");
        let a = schema.length >= it.opts.loopEnum,
          c,
          u = () => (c !== null && c !== void 0 ? c : (c = Qo.useFunc(gen, Af.default))),
          l;
        if (a || $data) ((l = gen.let("valid")), e.block$data(l, f));
        else {
          if (!Array.isArray(schema)) throw Error("ajv implementation error");
          let _ = gen.const("vSchema", schemaCode);
          l = le.or(...schema.map((h, p) => b(_, p)));
        }
        e.pass(l);
        function f() {
          (gen.assign(l, !1),
            gen.forOf("v", schemaCode, (_) =>
              gen.if(le._`${u()}(${r}, ${_})`, () => gen.assign(l, !0).break()),
            ));
        }
        function b(_, h) {
          let p = schema[h];
          return typeof p === "object" && p !== null ? le._`${u()}(${r}, ${_}[${h}])` : le._`${r} === ${p}`;
        }
      },
    };
  Xo.default = Vf;
});

export { Yo };
