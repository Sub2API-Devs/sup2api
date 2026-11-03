/**
 * ajv/dist/vocabularies/applicator/contains.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../../compile/codegen/index.js";
import { ew } from "../../compile/util.js";

//@ chunk-s82q9s4x.js:94968-96663 cjs-fingerprint
var yi = x(function (mi) {
  Object.defineProperty(mi, "__esModule", { value: !0 });
  var A = uh(),
    ke = ew(),
    up = {
      message: ({ params: { min: e, max: t } }) =>
        t === void 0
          ? A.str`must contain at least ${e} valid item(s)`
          : A.str`must contain at least ${e} and no more than ${t} valid item(s)`,
      params: ({ params: { min: e, max: t } }) =>
        t === void 0 ? A._`{minContains: ${e}}` : A._`{minContains: ${e}, maxContains: ${t}}`,
    },
    lp = {
      keyword: "contains",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      trackErrors: !0,
      error: up,
      code(e) {
        let { gen: gen, schema: schema, parentSchema: parentSchema, data: n, it: it } = e,
          i,
          a,
          { minContains: minContains, maxContains: maxContains } = parentSchema;
        if (it.opts.next) ((i = minContains === void 0 ? 1 : minContains), (a = maxContains));
        else i = 1;
        let l = gen.const("len", A._`${n}.length`);
        if ((e.setParams({ min: i, max: a }), a === void 0 && i === 0)) {
          ke.checkStrictMode(it, '"minContains" == 0 without "maxContains": "contains" keyword ignored');
          return;
        }
        if (a !== void 0 && i > a) {
          (ke.checkStrictMode(it, '"minContains" > "maxContains" is always invalid'), e.fail());
          return;
        }
        if (ke.alwaysValidSchema(it, schema)) {
          let p = A._`${l} >= ${i}`;
          if (a !== void 0) p = A._`${p} && ${l} <= ${a}`;
          e.pass(p);
          return;
        }
        it.items = !0;
        let f = gen.name("valid");
        if (a === void 0 && i === 1) _(f, () => gen.if(f, () => gen.break()));
        else if (i === 0) {
          if ((gen.let(f, !0), a !== void 0)) gen.if(A._`${n}.length > 0`, b);
        } else (gen.let(f, !1), b());
        e.result(f, () => e.reset());
        function b() {
          let p = gen.name("_valid"),
            y = gen.let("count", 0);
          _(p, () => gen.if(p, () => h(y)));
        }
        function _(p, y) {
          gen.forRange("i", 0, l, (v) => {
            (e.subschema(
              { keyword: "contains", dataProp: v, dataPropType: ke.Type.Num, compositeRule: !0 },
              p,
            ),
              y());
          });
        }
        function h(p) {
          if ((gen.code(A._`${p}++`), a === void 0))
            gen.if(A._`${p} >= ${i}`, () => gen.assign(f, !0).break());
          else if ((gen.if(A._`${p} > ${a}`, () => gen.assign(f, !1).break()), i === 1)) gen.assign(f, !0);
          else gen.if(A._`${p} >= ${i}`, () => gen.assign(f, !0));
        }
      },
    };
  mi.default = lp;
});

export { yi };
