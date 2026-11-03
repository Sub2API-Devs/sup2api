/**
 * @bufbuild/cel/dist/cjs/logic-manager.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:525169-526143 cjs-fingerprint
var z_ = x(function (pU) {
  Object.defineProperty(pU, "__esModule", { value: !0 });
  class Zy {
    builder;
    function;
    terms;
    ops;
    variadicASTs;
    constructor(e, n, r, s) {
      ((this.builder = e), (this.function = n), (this.terms = [r]), (this.ops = []), (this.variadicASTs = s));
    }
    static newVariadicLogicManager(e, n, r) {
      return new Zy(e, n, r, !0);
    }
    static newBalancingLogicManager(e, n, r) {
      return new Zy(e, n, r, !1);
    }
    addTerm(e, n) {
      (this.terms.push(n), this.ops.push(e));
    }
    toExpr() {
      if (this.terms.length === 1) return this.terms[0];
      if (this.variadicASTs)
        return this.builder.nextExpr(this.ops[0], {
          case: "callExpr",
          value: { $typeName: "cel.expr.Expr.Call", function: this.function, args: this.terms },
        });
      return this.balancedTree(0, this.ops.length - 1);
    }
    balancedTree(e, n) {
      let floored = Math.floor((e + n + 1) / 2),
        s;
      if (floored === e) s = this.terms[floored];
      else s = this.balancedTree(e, floored - 1);
      let h;
      if (floored === n) h = this.terms[floored + 1];
      else h = this.balancedTree(floored + 1, n);
      return this.builder.nextExpr(this.ops[floored], {
        case: "callExpr",
        value: { $typeName: "cel.expr.Expr.Call", function: this.function, args: [s, h] },
      });
    }
  }
  pU.default = Zy;
});

export { z_ };
