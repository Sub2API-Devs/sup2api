/**
 * @bufbuild/cel/dist/cjs/logic-manager.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:525169-526143 cjs-fingerprint
var require_logic_manager = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  class LogicManager {
    builder;
    function;
    terms;
    ops;
    variadicASTs;
    constructor(builder, functionName, term, variadicASTs) {
      this.builder = builder;
      this.function = functionName;
      this.terms = [term];
      this.ops = [];
      this.variadicASTs = variadicASTs;
    }
    static newVariadicLogicManager(builder, functionName, term) {
      return new LogicManager(builder, functionName, term, true);
    }
    static newBalancingLogicManager(builder, functionName, term) {
      return new LogicManager(builder, functionName, term, false);
    }
    addTerm(op, term) {
      this.terms.push(term);
      this.ops.push(op);
    }
    toExpr() {
      if (this.terms.length === 1) return this.terms[0];
      if (this.variadicASTs)
        return this.builder.nextExpr(this.ops[0], {
          case: "callExpr",
          value: {
            $typeName: "cel.expr.Expr.Call",
            function: this.function,
            args: this.terms,
          },
        });
      return this.balancedTree(0, this.ops.length - 1);
    }
    balancedTree(lo, hi) {
      let mid = Math.floor((lo + hi + 1) / 2);
      let left;
      if (mid === lo) left = this.terms[mid];
      else left = this.balancedTree(lo, mid - 1);
      let right;
      if (mid === hi) right = this.terms[mid + 1];
      else right = this.balancedTree(mid + 1, hi);
      return this.builder.nextExpr(this.ops[mid], {
        case: "callExpr",
        value: {
          $typeName: "cel.expr.Expr.Call",
          function: this.function,
          args: [left, right],
        },
      });
    }
  }
  cjsExports.default = LogicManager;
});
export { require_logic_manager };
