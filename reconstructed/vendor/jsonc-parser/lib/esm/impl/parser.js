/**
 * jsonc-parser/lib/esm/impl/parser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonc-parser@3.2.1..3.3.1
 * pieces: chunk-kndsyy4v.js (7)
 * attribution: esm-layout 1, esm-fingerprint 6
 */
import { U } from "./scanner.js";

//@ chunk-kndsyy4v.js:7855-7861 esm-layout
var V;
//@ chunk-kndsyy4v.js:7861-7921 esm-fingerprint
(function (e) {
  e.DEFAULT = { allowTrailingComma: !1 };
})(V || (V = {}));
//@ chunk-kndsyy4v.js:7921-8326 esm-fingerprint
function C(e, s = [], r = V.DEFAULT) {
  let n = null,
    i = [],
    o = [];
  function c(u) {
    if (Array.isArray(i)) i.push(u);
    else if (n !== null) i[n] = u;
  }
  return (
    Z(
      e,
      {
        onObjectBegin: () => {
          let u = {};
          (c(u), o.push(i), (i = u), (n = null));
        },
        onObjectProperty: (u) => {
          n = u;
        },
        onObjectEnd: () => {
          i = o.pop();
        },
        onArrayBegin: () => {
          let u = [];
          (c(u), o.push(i), (i = u), (n = null));
        },
        onArrayEnd: () => {
          i = o.pop();
        },
        onLiteralValue: c,
        onError: (u, h, p) => {
          s.push({ error: u, offset: h, length: p });
        },
      },
      r,
    ),
    i[0]
  );
}
//@ chunk-kndsyy4v.js:8326-9279 esm-fingerprint
function X(e, s = [], r = V.DEFAULT) {
  let n = { type: "array", offset: -1, length: -1, children: [], parent: void 0 };
  function i(u) {
    if (n.type === "property") ((n.length = u - n.offset), (n = n.parent));
  }
  function o(u) {
    return (n.children.push(u), u);
  }
  Z(
    e,
    {
      onObjectBegin: (u) => {
        n = o({ type: "object", offset: u, length: -1, parent: n, children: [] });
      },
      onObjectProperty: (u, h, p) => {
        ((n = o({ type: "property", offset: h, length: -1, parent: n, children: [] })),
          n.children.push({ type: "string", value: u, offset: h, length: p, parent: n }));
      },
      onObjectEnd: (u, h) => {
        (i(u + h), (n.length = u + h - n.offset), (n = n.parent), i(u + h));
      },
      onArrayBegin: (u, h) => {
        n = o({ type: "array", offset: u, length: -1, parent: n, children: [] });
      },
      onArrayEnd: (u, h) => {
        ((n.length = u + h - n.offset), (n = n.parent), i(u + h));
      },
      onLiteralValue: (u, h, p) => {
        (o({ type: pe(u), offset: h, length: p, parent: n, value: u }), i(h + p));
      },
      onSeparator: (u, h, p) => {
        if (n.type === "property") {
          if (u === ":") n.colonOffset = h;
          else if (u === ",") i(h);
        }
      },
      onError: (u, h, p) => {
        s.push({ error: u, offset: h, length: p });
      },
    },
    r,
  );
  let f = n.children[0];
  if (f) delete f.parent;
  return f;
}
//@ chunk-kndsyy4v.js:9279-9682 esm-fingerprint
function M(e, s) {
  if (!e) return;
  let r = e;
  for (let n of s)
    if (typeof n === "string") {
      if (r.type !== "object" || !Array.isArray(r.children)) return;
      let i = !1;
      for (let o of r.children)
        if (Array.isArray(o.children) && o.children[0].value === n && o.children.length === 2) {
          ((r = o.children[1]), (i = !0));
          break;
        }
      if (!i) return;
    } else {
      let i = n;
      if (r.type !== "array" || i < 0 || !Array.isArray(r.children) || i >= r.children.length) return;
      r = r.children[i];
    }
  return r;
}
//@ chunk-kndsyy4v.js:9682-12205 esm-fingerprint
function Z(e, s, r = V.DEFAULT) {
  let n = U(e, !1),
    i = [];
  function o(O) {
    return O
      ? () => O(n.getTokenOffset(), n.getTokenLength(), n.getTokenStartLine(), n.getTokenStartCharacter())
      : () => !0;
  }
  function c(O) {
    return O
      ? () =>
          O(n.getTokenOffset(), n.getTokenLength(), n.getTokenStartLine(), n.getTokenStartCharacter(), () =>
            i.slice(),
          )
      : () => !0;
  }
  function f(O) {
    return O
      ? (A) => O(A, n.getTokenOffset(), n.getTokenLength(), n.getTokenStartLine(), n.getTokenStartCharacter())
      : () => !0;
  }
  function u(O) {
    return O
      ? (A) =>
          O(
            A,
            n.getTokenOffset(),
            n.getTokenLength(),
            n.getTokenStartLine(),
            n.getTokenStartCharacter(),
            () => i.slice(),
          )
      : () => !0;
  }
  let h = c(s.onObjectBegin),
    p = u(s.onObjectProperty),
    k = o(s.onObjectEnd),
    y = c(s.onArrayBegin),
    T = o(s.onArrayEnd),
    w = u(s.onLiteralValue),
    v = f(s.onSeparator),
    N = o(s.onComment),
    S = f(s.onError),
    B = r && r.disallowComments,
    g = r && r.allowTrailingComma;
  function b() {
    while (!0) {
      let scan = n.scan();
      switch (n.getTokenError()) {
        case 4:
          a(14);
          break;
        case 5:
          a(15);
          break;
        case 3:
          a(13);
          break;
        case 1:
          if (!B) a(11);
          break;
        case 2:
          a(12);
          break;
        case 6:
          a(16);
          break;
      }
      switch (scan) {
        case 12:
        case 13:
          if (B) a(10);
          else N();
          break;
        case 16:
          a(1);
          break;
        case 15:
        case 14:
          break;
        default:
          return scan;
      }
    }
  }
  function a(O, A = [], q = []) {
    if ((S(O), A.length + q.length > 0)) {
      let token = n.getToken();
      while (token !== 17) {
        if (A.indexOf(token) !== -1) {
          b();
          break;
        } else if (q.indexOf(token) !== -1) break;
        token = b();
      }
    }
  }
  function d(O) {
    let tokenValue = n.getTokenValue();
    if (O) w(tokenValue);
    else (p(tokenValue), i.push(tokenValue));
    return (b(), !0);
  }
  function m() {
    switch (n.getToken()) {
      case 11:
        let tokenValue = n.getTokenValue(),
          A = Number(tokenValue);
        if (isNaN(A)) (a(2), (A = 0));
        w(A);
        break;
      case 7:
        w(null);
        break;
      case 8:
        w(!0);
        break;
      case 9:
        w(!1);
        break;
      default:
        return !1;
    }
    return (b(), !0);
  }
  function E() {
    if (n.getToken() !== 10) return (a(3, [], [2, 5]), !1);
    if ((d(!1), n.getToken() === 6)) {
      if ((v(":"), b(), !W())) a(4, [], [2, 5]);
    } else a(5, [], [2, 5]);
    return (i.pop(), !0);
  }
  function D() {
    (h(), b());
    let O = !1;
    while (n.getToken() !== 2 && n.getToken() !== 17) {
      if (n.getToken() === 5) {
        if (!O) a(4, [], []);
        if ((v(","), b(), n.getToken() === 2 && g)) break;
      } else if (O) a(6, [], []);
      if (!E()) a(4, [], [2, 5]);
      O = !0;
    }
    if ((k(), n.getToken() !== 2)) a(7, [2], []);
    else b();
    return !0;
  }
  function z() {
    (y(), b());
    let O = !0,
      A = !1;
    while (n.getToken() !== 4 && n.getToken() !== 17) {
      if (n.getToken() === 5) {
        if (!A) a(4, [], []);
        if ((v(","), b(), n.getToken() === 4 && g)) break;
      } else if (A) a(6, [], []);
      if (O) (i.push(0), (O = !1));
      else i[i.length - 1]++;
      if (!W()) a(4, [], [4, 5]);
      A = !0;
    }
    if ((T(), !O)) i.pop();
    if (n.getToken() !== 4) a(8, [4], []);
    else b();
    return !0;
  }
  function W() {
    switch (n.getToken()) {
      case 3:
        return z();
      case 1:
        return D();
      case 10:
        return d(!0);
      default:
        return m();
    }
  }
  if ((b(), n.getToken() === 17)) {
    if (r.allowEmptyContent) return !0;
    return (a(4, [], []), !1);
  }
  if (!W()) return (a(4, [], []), !1);
  if (n.getToken() !== 17) a(9, [], []);
  return !0;
}
//@ chunk-kndsyy4v.js:12205-12432 esm-fingerprint
function pe(e) {
  switch (typeof e) {
    case "boolean":
      return "boolean";
    case "number":
      return "number";
    case "string":
      return "string";
    case "object": {
      if (!e) return "null";
      else if (Array.isArray(e)) return "array";
      return "object";
    }
    default:
      return "null";
  }
}

export { X, M, C };
