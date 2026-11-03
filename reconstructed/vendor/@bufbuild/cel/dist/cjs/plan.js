/**
 * @bufbuild/cel/dist/cjs/plan.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { BU } from "../../../cel-spec/dist/cjs/gen/cel/expr/checked_pb.js";
import { Yy } from "../../../cel-spec/dist/cjs/gen/cel/expr/syntax_pb.js";
import { av } from "./planner.js";
import { li } from "../../../protobuf/dist/commonjs/index.js";
import { bl } from "./error.js";
import { ld } from "./eval.js";
import { wa } from "./value.js";
import { lv } from "./activation.js";

//@ chunk-fq0cr76a.js:628168-628855 cjs-fingerprint
var gv = x(function (DF) {
  Object.defineProperty(DF, "__esModule", { value: !0 });
  DF.plan = pae;
  var RF = BU(),
    f0 = Yy(),
    IF = av(),
    Od = li(),
    p0 = bl(),
    NF = ld(),
    kF = wa(),
    h0 = lv(),
    weakMap = new WeakMap();
  function pae(e, n) {
    let r = weakMap.get(e);
    if (r === void 0) ((r = new IF.Planner(e.funcs, e.registry, e.namespace)), weakMap.set(e, r));
    let s;
    if (Od.isMessage(n, RF.CheckedExprSchema)) s = n.expr;
    else if (Od.isMessage(n, f0.ParsedExprSchema)) s = n.expr;
    else s = n;
    let plan = r.plan(s ?? Od.create(f0.ExprSchema)),
      withEvalContext = NF.withEvalContext(
        { registry: e.registry },
        {
          id: plan.id,
          eval(b) {
            try {
              let S = plan.eval(b);
              if (p0.isCelError(S)) return S;
              return kF.unwrapAny(S);
            } catch (error) {
              return p0.celError(error, plan.id);
            }
          },
        },
      );
    return (b) => withEvalContext.eval(b !== void 0 ? new h0.ObjectActivation(b) : h0.EMPTY_ACTIVATION);
  }
});

export { gv };
