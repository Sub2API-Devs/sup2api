/**
 * @bufbuild/cel/dist/cjs/namespace.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:478036-478784 cjs-fingerprint
var require_namespace = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.Namespace = undefined;
  class Namespace {
    _name;
    _aliases;
    constructor(name = "") {
      this._name = name;
      this._aliases = new Map();
    }
    static ROOT = new Namespace();
    name() {
      return this._name;
    }
    aliases() {
      return this._aliases;
    }
    resolveCandidateNames(name) {
      if (name.startsWith(".")) {
        let qn = name.substring(1);
        let alias = this.findAlias(qn);
        if (alias !== undefined) return [alias];
        return [qn];
      }
      let alias = this.findAlias(name);
      if (alias !== undefined) return [alias];
      if (this.name() === "") return [name];
      let nextCont = this.name();
      let candidates = [nextCont + "." + name];
      for (let i = nextCont.lastIndexOf("."); i >= 0; i = nextCont.lastIndexOf(".")) {
        nextCont = nextCont.substring(0, i);
        candidates.push(nextCont + "." + name);
      }
      candidates.push(name);
      return candidates;
    }
    findAlias(name) {
      let simple = name;
      let qualifier = "";
      let dot = name.indexOf(".");
      if (dot >= 0) {
        simple = name.substring(0, dot);
        qualifier = name.substring(dot);
      }
      let alias = this._aliases.get(simple);
      if (alias === undefined) return;
      return alias + qualifier;
    }
  }
  cjsExports.Namespace = Namespace;
});
export { require_namespace };
