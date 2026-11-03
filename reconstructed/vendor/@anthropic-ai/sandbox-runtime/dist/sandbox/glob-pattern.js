/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/glob-pattern.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-r0ads4ty.js (8)
 * attribution: esm-layout 2, esm-fingerprint 6
 */
import { At } from "../utils/debug.js";

//@ chunk-r0ads4ty.js:1985-1991 esm-layout
var O;
//@ chunk-r0ads4ty.js:1991-2155 esm-fingerprint
(function (e) {
  ((e.Text = "text"),
    (e.Separator = "separator"),
    (e.AnyChar = "anyChar"),
    (e.Star = "star"),
    (e.Globstar = "globstar"),
    (e.GlobstarSlash = "globstarSlash"),
    (e.Set = "set"));
})(O || (O = {}));
//@ chunk-r0ads4ty.js:2155-2344 esm-fingerprint
function se(e) {
  if (e === "") return;
  let t = [];
  for (let r = 0; r < e.length; r++) {
    let n = e[r + 1] === "-" && r + 2 < e.length,
      code = e.charCodeAt(r);
    if (n) r += 2;
    let code_2 = e.charCodeAt(r);
    if (code_2 < code) return;
    t.push([code, code_2]);
  }
  return t;
}
//@ chunk-r0ads4ty.js:2344-2354 esm-layout
var ee = 47;
//@ chunk-r0ads4ty.js:2354-3419 esm-fingerprint
function W(e) {
  let t = [],
    r = 0,
    n = (i) => {
      if (r < i) {
        let sliced = e.slice(r, i);
        t.push({ kind: O.Text, text: sliced });
      }
    },
    c = (i) => {
      let { Star: Star, Globstar: Globstar, GlobstarSlash: GlobstarSlash } = O,
        S = (I) => t[t.length - I]?.kind;
      if (S(1) === Globstar || S(1) === i) return;
      if (!(i === Globstar || (S(2) === i && (S(1) === Star || S(1) === GlobstarSlash)))) {
        t.push({ kind: i });
        return;
      }
      while (S(1) === Star || S(1) === GlobstarSlash) t.pop();
      t.push({ kind: Globstar });
    },
    f = 0,
    a = [],
    o = 0;
  while (o < e.length)
    switch (e[o]) {
      case "/":
        (n(o), t.push({ kind: O.Separator }), (r = ++o));
        break;
      case "?":
        (n(o), t.push({ kind: O.AnyChar }), (r = ++o));
        break;
      case "*": {
        n(o);
        let i = o;
        while (e[o] === "*") o++;
        let s = o - i >= 2 && e[o] === "/",
          C = o - i - (s ? 2 : 0);
        if (C >= 2) c(O.Globstar);
        if (C === 1) c(O.Star);
        if (s) c(O.GlobstarSlash);
        r = s ? ++o : o;
        break;
      }
      case "[": {
        if (o < f) {
          o++;
          break;
        }
        let index = e.indexOf("]", o + 1);
        if (index === -1) {
          (a.push(e.slice(o)), (f = e.length), o++);
          break;
        }
        let sliced = e.slice(o + 1, index),
          C = se(sliced);
        if (C === void 0) {
          (a.push(`[${sliced}]`), (f = index + 1), o++);
          break;
        }
        (n(o),
          t.push({ kind: O.Set, members: sliced, matchesSeparator: C.some(([w, S]) => w <= ee && ee <= S) }),
          (r = o = index + 1));
        break;
      }
      default:
        o++;
    }
  if ((n(o), a.length > 0))
    At(
      `[Sandbox] The brackets in ${a.join(", ")} spell no set of characters, so they are read as text: ${e}`,
      { level: "warn" },
    );
  return t;
}
//@ chunk-r0ads4ty.js:3419-3482 esm-fingerprint
function Oqt(e) {
  return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
//@ chunk-r0ads4ty.js:3482-3754 esm-fingerprint
function X(e) {
  switch (e.kind) {
    case O.Text:
      return Oqt(e.text);
    case O.Separator:
      return "/";
    case O.AnyChar:
      return "[^/]";
    case O.Star:
      return "[^/]*";
    case O.Globstar:
      return ".*";
    case O.GlobstarSlash:
      return "(.*/)?";
    case O.Set:
      return `[${e.members.replace(/[.^$+{}()|\\]/g, "\\$&")}]`;
  }
}
//@ chunk-r0ads4ty.js:3754-3804 esm-fingerprint
function xTt(e) {
  return `^${W(e).map(X).join("")}$`;
}

export { Oqt, xTt, X, O, W };
