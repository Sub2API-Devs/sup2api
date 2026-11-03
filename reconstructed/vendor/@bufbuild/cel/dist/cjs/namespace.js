/**
 * @bufbuild/cel/dist/cjs/namespace.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:478036-478784 cjs-fingerprint
var D_ = x(function (WL) {
  Object.defineProperty(WL, "__esModule", { value: !0 });
  WL.Namespace = void 0;
  class k_ {
    _name;
    _aliases;
    constructor(e = "") {
      ((this._name = e), (this._aliases = new Map()));
    }
    static ROOT = new k_();
    name() {
      return this._name;
    }
    aliases() {
      return this._aliases;
    }
    resolveCandidateNames(e) {
      if (e.startsWith(".")) {
        let substring = e.substring(1),
          alias = this.findAlias(substring);
        if (alias !== void 0) return [alias];
        return [substring];
      }
      let alias = this.findAlias(e);
      if (alias !== void 0) return [alias];
      if (this.name() === "") return [e];
      let r = this.name(),
        s = [r + "." + e];
      for (let index = r.lastIndexOf("."); index >= 0; index = r.lastIndexOf("."))
        ((r = r.substring(0, index)), s.push(r + "." + e));
      return (s.push(e), s);
    }
    findAlias(e) {
      let n = e,
        r = "",
        index = e.indexOf(".");
      if (index >= 0) ((n = e.substring(0, index)), (r = e.substring(index)));
      let h = this._aliases.get(n);
      if (h === void 0) return;
      return h + r;
    }
  }
  WL.Namespace = k_;
});

export { D_ };
