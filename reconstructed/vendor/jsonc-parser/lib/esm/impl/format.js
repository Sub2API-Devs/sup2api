/**
 * jsonc-parser/lib/esm/impl/format.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonc-parser@3.2.1..3.3.1
 * pieces: chunk-kndsyy4v.js (5)
 * attribution: esm-fingerprint 4, esm-layout 1
 */
import { K, mapped, H } from "./string-intern.js";
import { U } from "./scanner.js";

//@ chunk-kndsyy4v.js:5455-7403 esm-fingerprint
function Q(e, s, r) {
  let n, i, o, c, f;
  if (s) {
    ((c = s.offset), (f = c + s.length), (o = c));
    while (o > 0 && !P(e, o - 1)) o--;
    let a = f;
    while (a < e.length && !P(e, a)) a++;
    ((i = e.substring(o, a)), (n = ue(i, r)));
  } else ((i = e), (n = 0), (o = 0), (c = 0), (f = e.length));
  let u = ce(r, e),
    included = K.includes(u),
    p = 0,
    k = 0,
    y;
  if (r.insertSpaces) y = mapped[r.tabSize || 4] ?? j(mapped[1], r.tabSize || 4);
  else y = "\t";
  let T = y === "\t" ? "\t" : " ",
    w = U(i, !1),
    v = !1;
  function N() {
    if (p > 1) return j(u, p) + j(y, n + k);
    let a = y.length * (n + k);
    if (!included || a > H[T][u].length) return u + j(y, n + k);
    if (a <= 0) return u;
    return H[T][u][a];
  }
  function S() {
    let scan = w.scan();
    p = 0;
    while (scan === 15 || scan === 14) {
      if (scan === 14 && r.keepLines) p += 1;
      else if (scan === 14) p = 1;
      scan = w.scan();
    }
    return ((v = scan === 16 || w.getTokenError() !== 0), scan);
  }
  let B = [];
  function g(a, d, m) {
    if (!v && (!s || (d < f && m > c)) && e.substring(d, m) !== a)
      B.push({ offset: d, length: m - d, content: a });
  }
  let b = S();
  if (r.keepLines && p > 0) g(j(u, p), 0, 0);
  if (b !== 17) {
    let a = w.getTokenOffset() + o,
      d = y.length * n < 20 && r.insertSpaces ? mapped[y.length * n] : j(y, n);
    g(d, o, a);
  }
  while (b !== 17) {
    let a = w.getTokenOffset() + w.getTokenLength() + o,
      d = S(),
      m = "",
      E = !1;
    while (p === 0 && (d === 12 || d === 13)) {
      let z = w.getTokenOffset() + o;
      (g(mapped[1], a, z),
        (a = w.getTokenOffset() + w.getTokenLength() + o),
        (E = d === 12),
        (m = E ? N() : ""),
        (d = S()));
    }
    if (d === 2) {
      if (b !== 1) k--;
      if ((r.keepLines && p > 0) || (!r.keepLines && b !== 1)) m = N();
      else if (r.keepLines) m = mapped[1];
    } else if (d === 4) {
      if (b !== 3) k--;
      if ((r.keepLines && p > 0) || (!r.keepLines && b !== 3)) m = N();
      else if (r.keepLines) m = mapped[1];
    } else {
      switch (b) {
        case 3:
        case 1:
          if ((k++, (r.keepLines && p > 0) || !r.keepLines)) m = N();
          else m = mapped[1];
          break;
        case 5:
          if ((r.keepLines && p > 0) || !r.keepLines) m = N();
          else m = mapped[1];
          break;
        case 12:
          m = N();
          break;
        case 13:
          if (p > 0) m = N();
          else if (!E) m = mapped[1];
          break;
        case 6:
          if (r.keepLines && p > 0) m = N();
          else if (!E) m = mapped[1];
          break;
        case 10:
          if (r.keepLines && p > 0) m = N();
          else if (d === 6 && !E) m = "";
          break;
        case 7:
        case 8:
        case 9:
        case 11:
        case 2:
        case 4:
          if (r.keepLines && p > 0) m = N();
          else if ((d === 12 || d === 13) && !E) m = mapped[1];
          else if (d !== 5 && d !== 17) v = !0;
          break;
        case 16:
          v = !0;
          break;
      }
      if (p > 0 && (d === 12 || d === 13)) m = N();
    }
    if (d === 17)
      if (r.keepLines && p > 0) m = N();
      else m = r.insertFinalNewline ? u : "";
    let D = w.getTokenOffset() + o;
    (g(m, a, D), (b = d));
  }
  return B;
}
//@ chunk-kndsyy4v.js:7403-7462 esm-layout
function j(e, s) {
  let r = "";
  for (let n = 0; n < s; n++) r += e;
  return r;
}
//@ chunk-kndsyy4v.js:7462-7618 esm-fingerprint
function ue(e, s) {
  let r = 0,
    n = 0,
    i = s.tabSize || 4;
  while (r < e.length) {
    let charAt = e.charAt(r);
    if (charAt === mapped[1]) n++;
    else if (charAt === "\t") n += i;
    else break;
    r++;
  }
  return Math.floor(n / i);
}
//@ chunk-kndsyy4v.js:7618-7801 esm-fingerprint
function ce(e, s) {
  for (let r = 0; r < s.length; r++) {
    let charAt = s.charAt(r);
    if (charAt === "\r") {
      if (
        r + 1 < s.length &&
        s.charAt(r + 1) ===
          `
`
      )
        return `\r
`;
      return "\r";
    } else if (
      charAt ===
      `
`
    )
      return `
`;
  }
  return (
    (e && e.eol) ||
    `
`
  );
}
//@ chunk-kndsyy4v.js:7801-7855 esm-fingerprint
function P(e, s) {
  return (
    `\r
`.indexOf(e.charAt(s)) !== -1
  );
}

export { P, Q };
