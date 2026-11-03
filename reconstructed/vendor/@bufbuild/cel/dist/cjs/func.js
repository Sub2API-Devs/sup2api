/**
 * @bufbuild/cel/dist/cjs/func.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { F_ } from "./equals.js";
import { bl } from "./error.js";
import { Ei } from "./type.js";
import { wa } from "./value.js";

//@ chunk-fq0cr76a.js:483569-484761 cjs-fingerprint
var Tc = x(function (SB) {
  Object.defineProperty(SB, "__esModule", { value: !0 });
  SB.celFunc = qee;
  SB.celMethod = jee;
  var pB = F_(),
    hB = bl(),
    By = Ei(),
    mB = wa(),
    Hee = Symbol.for("@bufbuild/cel/func");
  function qee(e, n, r, s) {
    return new gB(e, void 0, n, r, s);
  }
  function jee(e, n, r, s, h) {
    return new yB(e, n, r, s, h);
  }
  class $_ {
    _name;
    _target;
    _args;
    _result;
    _impl;
    _id;
    [Hee] = {};
    constructor(e, n, r, s, h, y = "") {
      ((this._name = e),
        (this._target = n),
        (this._args = r),
        (this._result = s),
        (this._impl = h),
        (this._id = y));
    }
    get id() {
      if (this._id === "") {
        let e = this.target ? `${this.target.name}.` : "";
        this._id = `${e}${this.name}(${this.arguments.map((argument) => argument.name).join(",")})`;
      }
      return this._id;
    }
    get name() {
      return this._name;
    }
    get target() {
      return this._target;
    }
    get arguments() {
      return this._args;
    }
    get result() {
      return this._result;
    }
    call(e, n, r) {
      if (r.length != this.arguments.length) return;
      for (let s = 0; s < r.length; s++) if (!bB(r[s], this.arguments[s])) return;
      try {
        return mB.toCel(this._impl.apply(n, r));
      } catch (error) {
        return hB.celError(error, e);
      }
    }
  }
  class gB extends $_ {
    call(e, n, r) {
      if (n !== void 0) return;
      return super.call(e, void 0, r);
    }
  }
  class yB extends $_ {
    call(e, n, r) {
      if (n === void 0 || !bB(n, this.target)) return;
      return super.call(e, n, r);
    }
  }
  function bB(e, n) {
    return n === By.CelScalar.DYN || pB.equalsType(By.celType(e), n);
  }
});

export { Tc };
