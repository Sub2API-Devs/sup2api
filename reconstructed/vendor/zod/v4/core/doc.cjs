/**
 * zod/v4/core/doc.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-1ny7cxrt.js:133068-134129 cjs-fingerprint
var tp = x(function (zl) {
  Object.defineProperty(zl, "__esModule", { value: !0 });
  zl.Doc = void 0;
  class pP {
    constructor(e = [], t = {}) {
      ((this.content = []), (this.indent = 0), (this.args = e), (this.closed = t));
    }
    indented(e) {
      this.indent += 1;
      try {
        e(this);
      } finally {
        this.indent -= 1;
      }
    }
    write(e) {
      if (typeof e === "function") {
        (e(this, { execution: "sync" }), e(this, { execution: "async" }));
        return;
      }
      let filtered = e
          .split(
            `
`,
          )
          .filter((s) => s),
        min = Math.min(...filtered.map((s) => s.length - s.trimStart().length)),
        mapped = filtered.map((s) => s.slice(min)).map((s) => " ".repeat(this.indent * 2) + s);
      for (let s of mapped) this.content.push(s);
    }
    compile() {
      let e = Function,
        t = this?.content ?? [""];
      return new e(
        ...Object.keys(this.closed),
        `return function (${this.args.join(", ")}) {
${t.join(`
`)}
};`,
      )(...Object.values(this.closed));
    }
  }
  zl.Doc = pP;
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(zl);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(zl, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(zl, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(zl);
  })();
});

export { tp };
