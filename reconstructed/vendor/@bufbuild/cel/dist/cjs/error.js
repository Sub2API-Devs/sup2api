/**
 * @bufbuild/cel/dist/cjs/error.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:320419-321068 cjs-fingerprint
var bl = x(function (bN) {
  Object.defineProperty(bN, "__esModule", { value: !0 });
  bN.celError = Pq;
  bN.celErrorMerge = Lq;
  bN.isCelError = yN;
  var gN = Symbol.for("@bufbuild/cel/error");
  function Pq(e, n) {
    if (yN(e)) return e;
    if (typeof n === "number") n = BigInt(n);
    if (e instanceof Error) return new ip(e.message, e, n);
    if (typeof e === "string") return new ip(e, void 0, n);
    return new ip(`${e}`, e, n);
  }
  function Lq(e, ...n) {
    return new ip(e.message, n, e.exprId);
  }
  function yN(e) {
    return typeof e === "object" && e !== null && gN in e;
  }
  class ip extends Error {
    _cause;
    _exprId;
    [gN] = {};
    constructor(e, n, r) {
      super(e);
      ((this._cause = n), (this._exprId = r));
    }
    get exprId() {
      return this._exprId;
    }
    get cause() {
      return this._cause;
    }
  }
});

export { bl };
