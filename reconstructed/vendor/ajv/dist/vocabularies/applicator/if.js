/**
 * ajv/dist/vocabularies/applicator/if.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../../compile/codegen/index.js";
import { ew } from "../../compile/util.js";

//@ chunk-s82q9s4x.js:104592-105688 cjs-fingerprint
var Ji = x(function (Gi) {
  Object.defineProperty(Gi, "__esModule", { value: !0 });
  var Re = uh(),
    Jt = ew(),
    Mp = {
      message: ({ params: params }) => Re.str`must match "${params.ifClause}" schema`,
      params: ({ params: params }) => Re._`{failingKeyword: ${params.ifClause}}`,
    },
    Ap = {
      keyword: "if",
      schemaType: ["object", "boolean"],
      trackErrors: !0,
      error: Mp,
      code(e) {
        let { gen: gen, parentSchema: parentSchema, it: it } = e;
        if (parentSchema.then === void 0 && parentSchema.else === void 0)
          Jt.checkStrictMode(it, '"if" without "then" and "else" is ignored');
        let n = Hi(it, "then"),
          o = Hi(it, "else");
        if (!n && !o) return;
        let i = gen.let("valid", !0),
          a = gen.name("_valid");
        if ((c(), e.reset(), n && o)) {
          let l = gen.let("ifClause");
          (e.setParams({ ifClause: l }), gen.if(a, u("then", l), u("else", l)));
        } else if (n) gen.if(a, u("then"));
        else gen.if(Re.not(a), u("else"));
        e.pass(i, () => e.error(!0));
        function c() {
          let subschema = e.subschema(
            { keyword: "if", compositeRule: !0, createErrors: !1, allErrors: !1 },
            a,
          );
          e.mergeEvaluated(subschema);
        }
        function u(l, f) {
          return () => {
            let subschema = e.subschema({ keyword: l }, a);
            if ((gen.assign(i, a), e.mergeValidEvaluated(subschema, i), f)) gen.assign(f, Re._`${l}`);
            else e.setParams({ ifClause: l });
          };
        }
      },
    };
  function Hi(e, t) {
    let r = e.schema[t];
    return r !== void 0 && !Jt.alwaysValidSchema(e, r);
  }
  Gi.default = Ap;
});

export { Ji };
