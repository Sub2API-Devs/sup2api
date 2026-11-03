/**
 * jsonc-parser/lib/esm/impl/scanner.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonc-parser@3.2.1..3.3.1
 * pieces: chunk-kndsyy4v.js (6)
 * attribution: esm-fingerprint 2, esm-layout 4
 */

//@ chunk-kndsyy4v.js:481-3493 esm-fingerprint
function U(e, s = !1) {
  let r = e.length,
    n = 0,
    i = "",
    o = 0,
    c = 16,
    f = 0,
    u = 0,
    h = 0,
    p = 0,
    k = 0;
  function y(g, b) {
    let a = 0,
      d = 0;
    while (a < g || !b) {
      let code = e.charCodeAt(n);
      if (code >= 48 && code <= 57) d = d * 16 + code - 48;
      else if (code >= 65 && code <= 70) d = d * 16 + code - 65 + 10;
      else if (code >= 97 && code <= 102) d = d * 16 + code - 97 + 10;
      else break;
      (n++, a++);
    }
    if (a < g) d = -1;
    return d;
  }
  function T(g) {
    ((n = g), (i = ""), (o = 0), (c = 16), (k = 0));
  }
  function w() {
    let g = n;
    if (e.charCodeAt(n) === 48) n++;
    else {
      n++;
      while (n < e.length && I(e.charCodeAt(n))) n++;
    }
    if (n < e.length && e.charCodeAt(n) === 46)
      if ((n++, n < e.length && I(e.charCodeAt(n)))) {
        n++;
        while (n < e.length && I(e.charCodeAt(n))) n++;
      } else return ((k = 3), e.substring(g, n));
    let b = n;
    if (n < e.length && (e.charCodeAt(n) === 69 || e.charCodeAt(n) === 101)) {
      if ((n++, (n < e.length && e.charCodeAt(n) === 43) || e.charCodeAt(n) === 45)) n++;
      if (n < e.length && I(e.charCodeAt(n))) {
        n++;
        while (n < e.length && I(e.charCodeAt(n))) n++;
        b = n;
      } else k = 3;
    }
    return e.substring(g, b);
  }
  function v() {
    let g = "",
      b = n;
    while (!0) {
      if (n >= r) {
        ((g += e.substring(b, n)), (k = 2));
        break;
      }
      let code = e.charCodeAt(n);
      if (code === 34) {
        ((g += e.substring(b, n)), n++);
        break;
      }
      if (code === 92) {
        if (((g += e.substring(b, n)), n++, n >= r)) {
          k = 2;
          break;
        }
        switch (e.charCodeAt(n++)) {
          case 34:
            g += '"';
            break;
          case 92:
            g += "\\";
            break;
          case 47:
            g += "/";
            break;
          case 98:
            g += "\b";
            break;
          case 102:
            g += "\f";
            break;
          case 110:
            g += `
`;
            break;
          case 114:
            g += "\r";
            break;
          case 116:
            g += "\t";
            break;
          case 117:
            let m = y(4, !0);
            if (m >= 0) g += String.fromCharCode(m);
            else k = 4;
            break;
          default:
            k = 5;
        }
        b = n;
        continue;
      }
      if (code >= 0 && code <= 31)
        if (J(code)) {
          ((g += e.substring(b, n)), (k = 2));
          break;
        } else k = 6;
      n++;
    }
    return g;
  }
  function N() {
    if (((i = ""), (k = 0), (o = n), (u = f), (p = h), n >= r)) return ((o = r), (c = 17));
    let code = e.charCodeAt(n);
    if (Y(code)) {
      do (n++, (i += String.fromCharCode(code)), (code = e.charCodeAt(n)));
      while (Y(code));
      return (c = 15);
    }
    if (J(code)) {
      if ((n++, (i += String.fromCharCode(code)), code === 13 && e.charCodeAt(n) === 10))
        (n++,
          (i += `
`));
      return (f++, (h = n), (c = 14));
    }
    switch (code) {
      case 123:
        return (n++, (c = 1));
      case 125:
        return (n++, (c = 2));
      case 91:
        return (n++, (c = 3));
      case 93:
        return (n++, (c = 4));
      case 58:
        return (n++, (c = 6));
      case 44:
        return (n++, (c = 5));
      case 34:
        return (n++, (i = v()), (c = 10));
      case 47:
        let b = n - 1;
        if (e.charCodeAt(n + 1) === 47) {
          n += 2;
          while (n < r) {
            if (J(e.charCodeAt(n))) break;
            n++;
          }
          return ((i = e.substring(b, n)), (c = 12));
        }
        if (e.charCodeAt(n + 1) === 42) {
          n += 2;
          let a = r - 1,
            d = !1;
          while (n < a) {
            let code = e.charCodeAt(n);
            if (code === 42 && e.charCodeAt(n + 1) === 47) {
              ((n += 2), (d = !0));
              break;
            }
            if ((n++, J(code))) {
              if (code === 13 && e.charCodeAt(n) === 10) n++;
              (f++, (h = n));
            }
          }
          if (!d) (n++, (k = 1));
          return ((i = e.substring(b, n)), (c = 13));
        }
        return ((i += String.fromCharCode(code)), n++, (c = 16));
      case 45:
        if (((i += String.fromCharCode(code)), n++, n === r || !I(e.charCodeAt(n)))) return (c = 16);
      case 48:
      case 49:
      case 50:
      case 51:
      case 52:
      case 53:
      case 54:
      case 55:
      case 56:
      case 57:
        return ((i += w()), (c = 11));
      default:
        while (n < r && S(code)) (n++, (code = e.charCodeAt(n)));
        if (o !== n) {
          switch (((i = e.substring(o, n)), i)) {
            case "true":
              return (c = 8);
            case "false":
              return (c = 9);
            case "null":
              return (c = 7);
          }
          return (c = 16);
        }
        return ((i += String.fromCharCode(code)), n++, (c = 16));
    }
  }
  function S(g) {
    if (Y(g) || J(g)) return !1;
    switch (g) {
      case 125:
      case 93:
      case 123:
      case 91:
      case 34:
      case 58:
      case 44:
      case 47:
        return !1;
    }
    return !0;
  }
  function B() {
    let g;
    do g = N();
    while (g >= 12 && g <= 15);
    return g;
  }
  return {
    setPosition: T,
    getPosition: () => n,
    scan: s ? B : N,
    getToken: () => c,
    getTokenValue: () => i,
    getTokenOffset: () => o,
    getTokenLength: () => n - o,
    getTokenStartLine: () => u,
    getTokenStartCharacter: () => o - p,
    getTokenError: () => k,
  };
}
//@ chunk-kndsyy4v.js:3493-3528 esm-layout
function Y(e) {
  return e === 32 || e === 9;
}
//@ chunk-kndsyy4v.js:3528-3564 esm-layout
function J(e) {
  return e === 10 || e === 13;
}
//@ chunk-kndsyy4v.js:3564-3598 esm-layout
function I(e) {
  return e >= 48 && e <= 57;
}
//@ chunk-kndsyy4v.js:3598-3604 esm-layout
var G;
//@ chunk-kndsyy4v.js:3604-5028 esm-fingerprint
(function (e) {
  ((e[(e.lineFeed = 10)] = "lineFeed"),
    (e[(e.carriageReturn = 13)] = "carriageReturn"),
    (e[(e.space = 32)] = "space"),
    (e[(e._0 = 48)] = "_0"),
    (e[(e._1 = 49)] = "_1"),
    (e[(e._2 = 50)] = "_2"),
    (e[(e._3 = 51)] = "_3"),
    (e[(e._4 = 52)] = "_4"),
    (e[(e._5 = 53)] = "_5"),
    (e[(e._6 = 54)] = "_6"),
    (e[(e._7 = 55)] = "_7"),
    (e[(e._8 = 56)] = "_8"),
    (e[(e._9 = 57)] = "_9"),
    (e[(e.a = 97)] = "a"),
    (e[(e.b = 98)] = "b"),
    (e[(e.c = 99)] = "c"),
    (e[(e.d = 100)] = "d"),
    (e[(e.e = 101)] = "e"),
    (e[(e.f = 102)] = "f"),
    (e[(e.g = 103)] = "g"),
    (e[(e.h = 104)] = "h"),
    (e[(e.i = 105)] = "i"),
    (e[(e.j = 106)] = "j"),
    (e[(e.k = 107)] = "k"),
    (e[(e.l = 108)] = "l"),
    (e[(e.m = 109)] = "m"),
    (e[(e.n = 110)] = "n"),
    (e[(e.o = 111)] = "o"),
    (e[(e.p = 112)] = "p"),
    (e[(e.q = 113)] = "q"),
    (e[(e.r = 114)] = "r"),
    (e[(e.s = 115)] = "s"),
    (e[(e.t = 116)] = "t"),
    (e[(e.u = 117)] = "u"),
    (e[(e.v = 118)] = "v"),
    (e[(e.w = 119)] = "w"),
    (e[(e.x = 120)] = "x"),
    (e[(e.y = 121)] = "y"),
    (e[(e.z = 122)] = "z"),
    (e[(e.A = 65)] = "A"),
    (e[(e.B = 66)] = "B"),
    (e[(e.C = 67)] = "C"),
    (e[(e.D = 68)] = "D"),
    (e[(e.E = 69)] = "E"),
    (e[(e.F = 70)] = "F"),
    (e[(e.G = 71)] = "G"),
    (e[(e.H = 72)] = "H"),
    (e[(e.I = 73)] = "I"),
    (e[(e.J = 74)] = "J"),
    (e[(e.K = 75)] = "K"),
    (e[(e.L = 76)] = "L"),
    (e[(e.M = 77)] = "M"),
    (e[(e.N = 78)] = "N"),
    (e[(e.O = 79)] = "O"),
    (e[(e.P = 80)] = "P"),
    (e[(e.Q = 81)] = "Q"),
    (e[(e.R = 82)] = "R"),
    (e[(e.S = 83)] = "S"),
    (e[(e.T = 84)] = "T"),
    (e[(e.U = 85)] = "U"),
    (e[(e.V = 86)] = "V"),
    (e[(e.W = 87)] = "W"),
    (e[(e.X = 88)] = "X"),
    (e[(e.Y = 89)] = "Y"),
    (e[(e.Z = 90)] = "Z"),
    (e[(e.asterisk = 42)] = "asterisk"),
    (e[(e.backslash = 92)] = "backslash"),
    (e[(e.closeBrace = 125)] = "closeBrace"),
    (e[(e.closeBracket = 93)] = "closeBracket"),
    (e[(e.colon = 58)] = "colon"),
    (e[(e.comma = 44)] = "comma"),
    (e[(e.dot = 46)] = "dot"),
    (e[(e.doubleQuote = 34)] = "doubleQuote"),
    (e[(e.minus = 45)] = "minus"),
    (e[(e.openBrace = 123)] = "openBrace"),
    (e[(e.openBracket = 91)] = "openBracket"),
    (e[(e.plus = 43)] = "plus"),
    (e[(e.slash = 47)] = "slash"),
    (e[(e.formFeed = 12)] = "formFeed"),
    (e[(e.tab = 9)] = "tab"));
})(G || (G = {}));

export { U };
