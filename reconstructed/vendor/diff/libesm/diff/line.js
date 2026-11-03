/**
 * diff/libesm/diff/line.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: diff@9.0.0
 * pieces: chunk-7vb8p3zb.js (6)
 * attribution: esm-layout 2, esm-fingerprint 4
 */
import { z } from "./word.js";
import { L } from "../../libcjs/diff/base.js";

//@ chunk-7vb8p3zb.js:6614-6626 esm-layout
var M = new z();
//@ chunk-7vb8p3zb.js:6626-6667 esm-fingerprint
function tos(n, e, t) {
  return M.diff(n, e, t);
}
//@ chunk-7vb8p3zb.js:6667-7019 esm-fingerprint
class _ extends L {
  constructor() {
    super(...arguments);
    this.tokenize = X;
  }
  equals(n, e, t) {
    if (t.ignoreWhitespace) {
      if (
        !t.newlineIsToken ||
        !n.includes(`
`)
      )
        n = n.trim();
      if (
        !t.newlineIsToken ||
        !e.includes(`
`)
      )
        e = e.trim();
    } else if (t.ignoreNewlineAtEof && !t.newlineIsToken) {
      if (
        n.endsWith(`
`)
      )
        n = n.slice(0, -1);
      if (
        e.endsWith(`
`)
      )
        e = e.slice(0, -1);
    }
    return super.equals(n, e, t);
  }
}
//@ chunk-7vb8p3zb.js:7019-7031 esm-layout
var U = new _();
//@ chunk-7vb8p3zb.js:7031-7072 esm-fingerprint
function Y5e(n, e, t) {
  return U.diff(n, e, t);
}
//@ chunk-7vb8p3zb.js:7072-7298 esm-fingerprint
function X(n, e) {
  if (e.stripTrailingCr)
    n = n.replace(
      /\r\n/g,
      `
`,
    );
  let t = [],
    parts = n.split(/(\n|\r\n)/);
  if (!parts[parts.length - 1]) parts.pop();
  for (let l = 0; l < parts.length; l++) {
    let r = parts[l];
    if (l % 2 && !e.newlineIsToken) t[t.length - 1] += r;
    else t.push(r);
  }
  return t;
}

export { Y5e, tos };
