/**
 * lodash-es/_inlinedHelpers.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-bfnfj4kx.js (10), chunk-dcmhvw5a.js (37)
 * attribution: placement 47
 */
import { Ar } from "../../runtime/bun-runtime.js";
import {
  cloneBuffer_default,
  uDn,
  Jve,
  nz,
  Phe,
  ado,
  Gn,
  Mut,
} from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { lV, ME, isSymbolAlias } from "./toString.js";
import { yre } from "./_baseGetTag.js";
import { getPrototype, assignValueRaw, pickByBase } from "../../src/utils/git/gitSafeEnv.js";
import { reject } from "./reject.js";
import { getTag } from "../fuse.js/dist/fuse.mjs";

//@ chunk-dcmhvw5a.js:2838-2848 placement
var In_dcmh = {};
//@ chunk-dcmhvw5a.js:2848-2872 placement
Ar(In_dcmh, {
  default: () => cloneBuffer_default,
});
//@ chunk-dcmhvw5a.js:2872-2905 placement
function om(e, n) {
  return uDn(e, n);
}
//@ chunk-dcmhvw5a.js:2905-2915 placement
var En = om;
//@ chunk-dcmhvw5a.js:2915-3037 placement
var rm = "[object Object]";
var sm = Function.prototype;
var im = Object.prototype;
var toString = sm.toString;
var hasOwnProperty_3 = im.hasOwnProperty;
var lm = toString.call(Object);
//@ chunk-dcmhvw5a.js:3037-3223 placement
function dm(e) {
  if (!lV(e) || yre(e) != rm) return false;
  var n = getPrototype(e);
  if (n === null) return true;
  var r = hasOwnProperty_3.call(n, "constructor") && n.constructor;
  return typeof r == "function" && r instanceof r && toString.call(r) == lm;
}
//@ chunk-dcmhvw5a.js:3223-3234 placement
var mve = dm;
//@ chunk-dcmhvw5a.js:3234-3375 placement
function cm(e) {
  return function (n, r, s) {
    var a = -1;
    var c = Object(n);
    var g = s(n);
    var m = g.length;
    while (m--) {
      var f = g[e ? m : ++a];
      if (r(c[f], f, c) === false) break;
    }
    return n;
  };
}
//@ chunk-dcmhvw5a.js:3375-3385 placement
var di = cm;
//@ chunk-dcmhvw5a.js:3385-3403 placement
var um = di();
var Pn = um;
//@ chunk-dcmhvw5a.js:3403-3442 placement
function pm(e, n) {
  return e && Pn(e, n, Jve);
}
//@ chunk-dcmhvw5a.js:3442-3453 placement
var FIn = pm;
//@ chunk-dcmhvw5a.js:3453-3540 placement
function gm(e, n) {
  var r = {};
  n = nz(n, 3);
  FIn(e, function (s, a, c) {
    assignValueRaw(r, a, n(s, a, c));
  });
  return r;
}
//@ chunk-dcmhvw5a.js:3540-3550 placement
var xr = gm;
//@ chunk-dcmhvw5a.js:10387-10397 placement
var wi = reject;
//@ chunk-dcmhvw5a.js:10397-10495 placement
function uh(e, n, r, s) {
  var a = -1;
  var c = e == null ? 0 : e.length;
  while (++a < c) {
    var g = e[a];
    n(s, g, r(g), e);
  }
  return s;
}
//@ chunk-dcmhvw5a.js:10495-10505 placement
var ta = uh;
//@ chunk-dcmhvw5a.js:10505-10678 placement
function ph(e, n) {
  return function (r, s) {
    if (r == null) return r;
    if (!Phe(r)) return e(r, s);
    var a = r.length;
    var c = n ? a : -1;
    var g = Object(r);
    while (n ? c-- : ++c < a) if (s(g[c], c, g) === false) break;
    return r;
  };
}
//@ chunk-dcmhvw5a.js:10678-10688 placement
var na = ph;
//@ chunk-dcmhvw5a.js:10688-10710 placement
var gh = na(FIn);
var mao = gh;
//@ chunk-dcmhvw5a.js:10710-10778 placement
function mh(e, n, r, s) {
  mao(e, function (a, c, g) {
    n(s, a, r(a), g);
  });
  return s;
}
//@ chunk-dcmhvw5a.js:10778-10788 placement
var oa = mh;
//@ chunk-dcmhvw5a.js:10788-10880 placement
function fh(e, n) {
  return function (r, s) {
    var a = ME(r) ? ta : oa;
    var c = n ? n() : {};
    return a(r, e, nz(s, 2), c);
  };
}
//@ chunk-dcmhvw5a.js:10880-10891 placement
var gao = fh;
//@ chunk-dcmhvw5a.js:10891-10969 placement
var _h = gao(
  function (e, n, r) {
    e[r ? 0 : 1].push(n);
  },
  function () {
    return [[], []];
  },
);
var SS = _h;
//@ chunk-dcmhvw5a.js:10969-11033 placement
function yh(e, n) {
  return pickByBase(e, n, function (r, s) {
    return ado(e, s);
  });
}
//@ chunk-dcmhvw5a.js:11033-11043 placement
var ra = yh;
//@ chunk-dcmhvw5a.js:11043-11101 placement
var Sh = Gn(function (e, n) {
  return e == null ? {} : ra(e, n);
});
var wS = Sh;
//@ chunk-dcmhvw5a.js:26800-26878 placement
function ot(e) {
  return !Array.isArray ? getTag(e) === "[object Array]" : Array.isArray(e);
}
//@ chunk-dcmhvw5a.js:26878-26889 placement
var jh = 1 / 0;
//@ chunk-dcmhvw5a.js:26889-26977 placement
function $h(e) {
  if (typeof e == "string") return e;
  let n = e + "";
  return n == "0" && 1 / e == -jh ? "-0" : n;
}
//@ chunk-dcmhvw5a.js:26977-27016 placement
function Bh(e) {
  return e == null ? "" : $h(e);
}
//@ chunk-dcmhvw5a.js:27016-27058 placement
function Qe(e) {
  return typeof e === "string";
}
//@ chunk-dcmhvw5a.js:27058-27100 placement
function Ta(e) {
  return typeof e === "number";
}
//@ chunk-dcmhvw5a.js:27100-27171 placement
function Gh(e) {
  return e === true || e === false || (Wh(e) && getTag(e) == "[object Boolean]");
}
//@ chunk-dcmhvw5a.js:27171-27213 placement
function va(e) {
  return typeof e === "object";
}
//@ chunk-dcmhvw5a.js:27213-27251 placement
function Wh(e) {
  return va(e) && e !== null;
}
//@ chunk-bfnfj4kx.js:1116-1165 placement
var Tn = 4294967295;
var On = Tn - 1;
var { floor, min } = Math;
//@ chunk-bfnfj4kx.js:1165-1531 placement
function In(e, o, t, r) {
  var n = 0;
  var s = e == null ? 0 : e.length;
  if (s === 0) return 0;
  o = t(o);
  var p = o !== o;
  var i = o === null;
  var a = isSymbolAlias(o);
  var f = o === undefined;
  while (n < s) {
    var u = floor((n + s) / 2);
    var x = t(e[u]);
    var y = x !== undefined;
    var c = x === null;
    var g = x === x;
    var h = isSymbolAlias(x);
    if (p) var k = r || g;
    else if (f) k = g && (r || y);
    else if (i) k = g && y && (r || !c);
    else if (a) k = g && y && !c && (r || !h);
    else if (c || h) k = false;
    else k = r ? x <= o : x < o;
    if (k) n = u + 1;
    else s = u;
  }
  return min(s, On);
}
//@ chunk-bfnfj4kx.js:1531-1541 placement
var tt = In;
//@ chunk-bfnfj4kx.js:1541-1569 placement
var Fn = 4294967295;
var Hn = Fn >>> 1;
//@ chunk-bfnfj4kx.js:1569-1766 placement
function Dn(e, o, t) {
  var r = 0;
  var n = e == null ? r : e.length;
  if (typeof o == "number" && o === o && n <= Hn) {
    while (r < n) {
      var s = (r + n) >>> 1;
      var p = e[s];
      if (p !== null && !isSymbolAlias(p) && (t ? p <= o : p < o)) r = s + 1;
      else n = s;
    }
    return n;
  }
  return tt(e, o, Mut, t);
}
//@ chunk-bfnfj4kx.js:1766-1776 placement
var Fe = Dn;
//@ chunk-bfnfj4kx.js:1776-1808 placement
function $n(e, o) {
  return Fe(e, o);
}
//@ chunk-bfnfj4kx.js:1808-1818 placement
var wo = $n;
//@ chunk-bfnfj4kx.js:1818-1853 placement
function Mn(e, o) {
  return Fe(e, o, true);
}
//@ chunk-bfnfj4kx.js:1853-1863 placement
var rt = Mn;
export { xr, wi, En, wS, SS, mao, mve, rt, wo, In_dcmh, Qe, ot, Ta, Gh, Bh, va, Pn, gao, FIn };
