/**
 * protobufjs/src/tokenize.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:130453-132937 cjs-fingerprint
var ao = x(function (EA, $d) {
  $d.exports = Gd;
  var no = /[\s{}=;:[\],'"()<>]/g,
    WE = /(?:"([^"\\]*(?:\\.[^"\\]*)*)")/g,
    jE = /(?:'([^'\\]*(?:\\.[^'\\]*)*)')/g,
    GE = /^ *[*/]+ */,
    $E = /^\s*\*?\/*/,
    VE = /\n/g,
    YE = /\s/,
    KE = /\\(.?)/g,
    JE = {
      0: "\x00",
      r: "\r",
      n: `
`,
      t: "\t",
    };
  function jd(e) {
    return e.replace(KE, function (t, r) {
      switch (r) {
        case "\\":
        case "":
          return r;
        default:
          return JE[r] || "";
      }
    });
  }
  Gd.unescape = jd;
  function Gd(e, t) {
    e = e.toString();
    var r = 0,
      i = e.length,
      s = 1,
      n = 0,
      a = {},
      o = [],
      l = null;
    function c(v) {
      return Error("illegal " + v + " (line " + s + ")");
    }
    function u() {
      var v = l === "'" ? jE : WE;
      v.lastIndex = r - 1;
      var match = v.exec(e);
      if (!match) throw c("string");
      return ((r = v.lastIndex), C(l), (l = null), jd(match[1]));
    }
    function d(v) {
      return e.charAt(v);
    }
    function h(v, U, O) {
      var W = { type: e.charAt(v++), lineEmpty: !1, leading: O },
        X;
      if (t) X = 2;
      else X = 3;
      var D = v - X,
        le;
      do
        if (
          --D < 0 ||
          (le = e.charAt(D)) ===
            `
`
        ) {
          W.lineEmpty = !0;
          break;
        }
      while (le === " " || le === "\t");
      var parts = e.substring(v, U).split(VE);
      for (var Ze = 0; Ze < parts.length; ++Ze) parts[Ze] = parts[Ze].replace(t ? $E : GE, "").trim();
      ((W.text = parts
        .join(
          `
`,
        )
        .trim()),
        (a[s] = W),
        (n = s));
    }
    function m(v) {
      var U = f(v),
        substring = e.substring(v, U),
        matches = /^\s*\/\//.test(substring);
      return matches;
    }
    function f(v) {
      var U = v;
      while (
        U < i &&
        d(U) !==
          `
`
      )
        U++;
      return U;
    }
    function y() {
      if (o.length > 0) return o.shift();
      if (l) return u();
      var v,
        U,
        O,
        W,
        X,
        D = r === 0;
      do {
        if (r === i) return null;
        v = !1;
        while (YE.test((O = d(r)))) {
          if (
            O ===
            `
`
          )
            ((D = !0), ++s);
          if (++r === i) return null;
        }
        if (d(r) === "/") {
          if (++r === i) throw c("comment");
          if (d(r) === "/")
            if (!t) {
              X = d((W = r + 1)) === "/";
              while (
                d(++r) !==
                `
`
              )
                if (r === i) return null;
              if ((++r, X)) (h(W, r - 1, D), (D = !0));
              (++s, (v = !0));
            } else {
              if (((W = r), (X = !1), m(r - 1))) {
                X = !0;
                do {
                  if (((r = f(r)), r === i)) break;
                  if ((r++, !D)) break;
                } while (m(r));
              } else r = Math.min(i, f(r) + 1);
              if (X) (h(W, r, D), (D = !0));
              (s++, (v = !0));
            }
          else if ((O = d(r)) === "*") {
            ((W = r + 1), (X = t || d(W) === "*"));
            do {
              if (
                O ===
                `
`
              )
                ++s;
              if (++r === i) throw c("comment");
              ((U = O), (O = d(r)));
            } while (U !== "*" || O !== "/");
            if ((++r, X)) (h(W, r - 2, D), (D = !0));
            v = !0;
          } else return "/";
        }
      } while (v);
      var le = r;
      no.lastIndex = 0;
      var matches = no.test(d(le++));
      if (!matches) while (le < i && !no.test(d(le))) ++le;
      var substring = e.substring(r, (r = le));
      if (substring === '"' || substring === "'") l = substring;
      return substring;
    }
    function C(v) {
      o.push(v);
    }
    function E() {
      if (!o.length) {
        var v = y();
        if (v === null) return null;
        C(v);
      }
      return o[0];
    }
    function A(v, U) {
      var O = E(),
        W = O === v;
      if (W) return (y(), !0);
      if (!U) throw c("token '" + O + "', '" + v + "' expected");
      return !1;
    }
    function te(v) {
      var U = null,
        O;
      if (v === void 0) {
        if (((O = a[s - 1]), delete a[s - 1], O && (t || O.type === "*" || O.lineEmpty)))
          U = O.leading ? O.text : null;
      } else {
        if (n < v) E();
        if (((O = a[v]), delete a[v], O && !O.lineEmpty && (t || O.type === "/")))
          U = O.leading ? null : O.text;
      }
      return U;
    }
    return Object.defineProperty({ next: y, peek: E, push: C, skip: A, cmnt: te }, "line", {
      get: function () {
        return s;
      },
    });
  }
});

export { ao };
