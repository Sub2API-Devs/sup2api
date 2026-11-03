/**
 * zod/v4/core/doc.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-7vp249v4.js:13742-14365 esm-fingerprint
class je {
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

export { je };
