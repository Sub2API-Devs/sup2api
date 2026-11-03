/**
 * @bufbuild/cel/dist/cjs/activation.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { bl } from "./error.js";
import { wa } from "./value.js";

//@ chunk-fq0cr76a.js:611055-611599 cjs-fingerprint
var lv = x(function (sF) {
  Object.defineProperty(sF, "__esModule", { value: !0 });
  sF.EMPTY_ACTIVATION = sF.VarActivation = sF.ObjectActivation = void 0;
  var eF = bl(),
    tF = wa();
  class nF {
    data;
    constructor(e) {
      this.data = e;
    }
    resolve(e) {
      let n = this.data[e];
      if (n === void 0) return;
      if (eF.isCelError(n)) return n;
      return tF.toCel(n);
    }
  }
  sF.ObjectActivation = nF;
  class rF {
    name;
    value;
    parent;
    constructor(e, n, r) {
      ((this.name = e), (this.value = n), (this.parent = r));
    }
    resolve(e) {
      if (e === this.name) return this.value;
      return this.parent.resolve(e);
    }
  }
  sF.VarActivation = rF;
  sF.EMPTY_ACTIVATION = {
    resolve() {
      return;
    },
  };
});

export { lv };
