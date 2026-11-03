/**
 * diff/libesm/patch/create.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: diff@9.0.0
 * pieces: chunk-7vb8p3zb.js (2)
 * attribution: esm-fingerprint 2
 */
import { Y5e } from "../diff/line.js";

//@ chunk-7vb8p3zb.js:9181-10494 esm-fingerprint
function P3(n, e, t, i, l, r, s) {
  let o;
  if (!s) o = {};
  else if (typeof s === "function") o = { callback: s };
  else o = s;
  if (typeof o.context > "u") o.context = 4;
  let context = o.context;
  if (o.newlineIsToken)
    throw Error(
      "newlineIsToken may not be used with patch-generation functions, only with diffing functions",
    );
  if (!o.callback) return u(Y5e(t, i, o));
  else {
    let { callback: callback } = o;
    Y5e(
      t,
      i,
      Object.assign(Object.assign({}, o), {
        callback: (c) => {
          let a = u(c);
          callback(a);
        },
      }),
    );
  }
  function u(h) {
    if (!h) return;
    h.push({ value: "", lines: [] });
    function c(p) {
      return p.map(function (m) {
        return " " + m;
      });
    }
    let a = [],
      g = 0,
      w = 0,
      P = [],
      C = 1,
      d = 1;
    for (let p = 0; p < h.length; p++) {
      let m = h[p],
        x = m.lines || Z(m.value);
      if (((m.lines = x), m.added || m.removed)) {
        if (!g) {
          let v = h[p - 1];
          if (((g = C), (w = d), v))
            ((P = context > 0 ? c(v.lines.slice(-context)) : []), (g -= P.length), (w -= P.length));
        }
        for (let v of x) P.push((m.added ? "+" : "-") + v);
        if (m.added) d += x.length;
        else C += x.length;
      } else {
        if (g)
          if (x.length <= context * 2 && p < h.length - 2) for (let v of c(x)) P.push(v);
          else {
            let min = Math.min(x.length, context);
            for (let D of c(x.slice(0, min))) P.push(D);
            let S = { oldStart: g, oldLines: C - g + min, newStart: w, newLines: d - w + min, lines: P };
            (a.push(S), (g = 0), (w = 0), (P = []));
          }
        ((C += x.length), (d += x.length));
      }
    }
    for (let p of a)
      for (let m = 0; m < p.lines.length; m++)
        if (
          p.lines[m].endsWith(`
`)
        )
          p.lines[m] = p.lines[m].slice(0, -1);
        else (p.lines.splice(m + 1, 0, "\\ No newline at end of file"), m++);
    return { oldFileName: n, newFileName: e, oldHeader: l, newHeader: r, hunks: a };
  }
}
//@ chunk-7vb8p3zb.js:10494-10616 esm-fingerprint
function Z(n) {
  let endsWith = n.endsWith(`
`),
    mapped = n
      .split(
        `
`,
      )
      .map(
        (i) =>
          i +
          `
`,
      );
  if (endsWith) mapped.pop();
  else mapped.push(mapped.pop().slice(0, -1));
  return mapped;
}

export { P3 };
