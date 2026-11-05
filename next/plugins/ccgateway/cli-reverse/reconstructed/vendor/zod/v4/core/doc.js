/**
 * zod/v4/core/doc.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-m4y44r15.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-m4y44r15.js:13742-14365 esm-fingerprint
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
export { Doc };
