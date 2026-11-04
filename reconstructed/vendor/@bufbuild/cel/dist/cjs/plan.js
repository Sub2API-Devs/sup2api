/**
 * @bufbuild/cel/dist/cjs/plan.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_checked_pb } from "../../../cel-spec/dist/cjs/gen/cel/expr/checked_pb.js";
import { require_syntax_pb } from "../../../cel-spec/dist/cjs/gen/cel/expr/syntax_pb.js";
import { require_planner } from "./planner.js";
import { require_protobuf } from "../../../protobuf/dist/commonjs/index.js";
import { require_error } from "./error.js";
import { require_eval } from "./eval.js";
import { require_value } from "./value.js";
import { require_activation } from "./activation.js";

//@ chunk-fq0cr76a.js:628168-628855 cjs-fingerprint
var require_plan = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.plan = plan;
  var checked_pb_js_1 = require_checked_pb();
  var syntax_pb_js_1 = require_syntax_pb();
  var planner_js_1 = require_planner();
  var protobuf_1 = require_protobuf();
  var error_js_1 = require_error();
  var eval_js_1 = require_eval();
  var value_js_1 = require_value();
  var activation_js_1 = require_activation();
  var cache = new WeakMap();
  function plan(env, expr) {
    let planner = cache.get(env);
    if (planner === undefined) {
      planner = new planner_js_1.Planner(env.funcs, env.registry, env.namespace);
      cache.set(env, planner);
    }
    let maybeExpr;
    if (protobuf_1.isMessage(expr, checked_pb_js_1.CheckedExprSchema)) maybeExpr = expr.expr;
    else if (protobuf_1.isMessage(expr, syntax_pb_js_1.ParsedExprSchema)) maybeExpr = expr.expr;
    else maybeExpr = expr;
    let plan = planner.plan(maybeExpr ?? protobuf_1.create(syntax_pb_js_1.ExprSchema));
    let withContext = eval_js_1.withEvalContext(
      {
        registry: env.registry,
      },
      {
        id: plan.id,
        eval(ctx) {
          try {
            let val = plan.eval(ctx);
            if (error_js_1.isCelError(val)) return val;
            return value_js_1.unwrapAny(val);
          } catch (ex) {
            return error_js_1.celError(ex, plan.id);
          }
        },
      },
    );
    return (ctx) =>
      withContext.eval(
        ctx !== undefined ? new activation_js_1.ObjectActivation(ctx) : activation_js_1.EMPTY_ACTIVATION,
      );
  }
});
export { require_plan };
