/**
 * zod/v4/core/doc.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-1hnjmk23.js:133437-134498 cjs-fingerprint
var require_doc = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.Doc = undefined;
  class Doc {
    constructor(args = [], closed = {}) {
      this.content = [];
      this.indent = 0;
      this.args = args;
      this.closed = closed;
    }
    indented(fn) {
      this.indent += 1;
      try {
        fn(this);
      } finally {
        this.indent -= 1;
      }
    }
    write(arg) {
      if (typeof arg === "function") {
        arg(this, {
          execution: "sync",
        });
        arg(this, {
          execution: "async",
        });
        return;
      }
      let lines = arg
        .split(
          `
`,
        )
        .filter((x) => x);
      let minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
      let dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
      for (let line of dedented) this.content.push(line);
    }
    compile() {
      let F = Function;
      let content = this?.content ?? [""];
      return new F(
        ...Object.keys(this.closed),
        `return function (${this.args.join(", ")}) {
${content.join(`
`)}
};`,
      )(...Object.values(this.closed));
    }
  }
  cjsExports.Doc = Doc;
  (function () {
    var keys = Object.getOwnPropertyNames(cjsExports);
    for (var i = 0; i < keys.length; i++) {
      var desc = Object.getOwnPropertyDescriptor(cjsExports, keys[i]);
      if (!desc || !desc.get || !desc.configurable) continue;
      var value;
      try {
        value = desc.get();
      } catch (e) {
        continue;
      }
      if (value === undefined) continue;
      Object.defineProperty(cjsExports, keys[i], {
        value,
        writable: false,
        enumerable: desc.enumerable,
        configurable: false,
      });
    }
    Object.freeze(cjsExports);
  })();
});
export { require_doc };
