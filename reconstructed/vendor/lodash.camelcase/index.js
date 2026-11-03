/**
 * lodash.camelcase/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash.camelcase@4.3.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:71132-76760 cjs-fingerprint
var Qu = x(function (Qw, Xu) {
  var cC = 1 / 0,
    uC = "[object Symbol]",
    dC = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g,
    hC = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g,
    _s = "\\ud800-\\udfff",
    Du = "\\u0300-\\u036f\\ufe20-\\ufe23",
    Lu = "\\u20d0-\\u20f0",
    Fu = "\\u2700-\\u27bf",
    qu = "a-z\\xdf-\\xf6\\xf8-\\xff",
    fC = "\\xac\\xb1\\xd7\\xf7",
    pC = "\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf",
    gC = "\\u2000-\\u206f",
    mC =
      " \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000",
    Uu = "A-Z\\xc0-\\xd6\\xd8-\\xde",
    Bu = "\\ufe0e\\ufe0f",
    zu = fC + pC + gC + mC,
    wa = "['\u2019]",
    vC = "[" + _s + "]",
    Au = "[" + zu + "]",
    ys = "[" + Du + Lu + "]",
    Hu = "\\d+",
    yC = "[" + Fu + "]",
    Wu = "[" + qu + "]",
    ju = "[^" + _s + zu + Hu + Fu + qu + Uu + "]",
    Oa = "\\ud83c[\\udffb-\\udfff]",
    _C = "(?:" + ys + "|" + Oa + ")",
    Gu = "[^" + _s + "]",
    Aa = "(?:\\ud83c[\\udde6-\\uddff]){2}",
    Pa = "[\\ud800-\\udbff][\\udc00-\\udfff]",
    qr = "[" + Uu + "]",
    $u = "\\u200d",
    Pu = "(?:" + Wu + "|" + ju + ")",
    SC = "(?:" + qr + "|" + ju + ")",
    Nu = "(?:" + wa + "(?:d|ll|m|re|s|t|ve))?",
    Mu = "(?:" + wa + "(?:D|LL|M|RE|S|T|VE))?",
    Vu = _C + "?",
    Yu = "[" + Bu + "]?",
    CC = "(?:" + $u + "(?:" + [Gu, Aa, Pa].join("|") + ")" + Yu + Vu + ")*",
    Ku = Yu + Vu + CC,
    EC = "(?:" + [yC, Aa, Pa].join("|") + ")" + Ku,
    TC = "(?:" + [Gu + ys + "?", ys, Aa, Pa, vC].join("|") + ")",
    RC = RegExp(wa, "g"),
    bC = RegExp(ys, "g"),
    OC = RegExp(Oa + "(?=" + Oa + ")|" + TC + Ku, "g"),
    wC = RegExp(
      [
        qr + "?" + Wu + "+" + Nu + "(?=" + [Au, qr, "$"].join("|") + ")",
        SC + "+" + Mu + "(?=" + [Au, qr + Pu, "$"].join("|") + ")",
        qr + "?" + Pu + "+" + Nu,
        qr + "+" + Mu,
        Hu,
        EC,
      ].join("|"),
      "g",
    ),
    AC = RegExp("[" + $u + _s + Du + Lu + Bu + "]"),
    PC = /[a-z][A-Z]|[A-Z]{2,}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/,
    NC = {
      "\xC0": "A",
      "\xC1": "A",
      "\xC2": "A",
      "\xC3": "A",
      "\xC4": "A",
      "\xC5": "A",
      "\xE0": "a",
      "\xE1": "a",
      "\xE2": "a",
      "\xE3": "a",
      "\xE4": "a",
      "\xE5": "a",
      "\xC7": "C",
      "\xE7": "c",
      "\xD0": "D",
      "\xF0": "d",
      "\xC8": "E",
      "\xC9": "E",
      "\xCA": "E",
      "\xCB": "E",
      "\xE8": "e",
      "\xE9": "e",
      "\xEA": "e",
      "\xEB": "e",
      "\xCC": "I",
      "\xCD": "I",
      "\xCE": "I",
      "\xCF": "I",
      "\xEC": "i",
      "\xED": "i",
      "\xEE": "i",
      "\xEF": "i",
      "\xD1": "N",
      "\xF1": "n",
      "\xD2": "O",
      "\xD3": "O",
      "\xD4": "O",
      "\xD5": "O",
      "\xD6": "O",
      "\xD8": "O",
      "\xF2": "o",
      "\xF3": "o",
      "\xF4": "o",
      "\xF5": "o",
      "\xF6": "o",
      "\xF8": "o",
      "\xD9": "U",
      "\xDA": "U",
      "\xDB": "U",
      "\xDC": "U",
      "\xF9": "u",
      "\xFA": "u",
      "\xFB": "u",
      "\xFC": "u",
      "\xDD": "Y",
      "\xFD": "y",
      "\xFF": "y",
      "\xC6": "Ae",
      "\xE6": "ae",
      "\xDE": "Th",
      "\xFE": "th",
      "\xDF": "ss",
      "\u0100": "A",
      "\u0102": "A",
      "\u0104": "A",
      "\u0101": "a",
      "\u0103": "a",
      "\u0105": "a",
      "\u0106": "C",
      "\u0108": "C",
      "\u010A": "C",
      "\u010C": "C",
      "\u0107": "c",
      "\u0109": "c",
      "\u010B": "c",
      "\u010D": "c",
      "\u010E": "D",
      "\u0110": "D",
      "\u010F": "d",
      "\u0111": "d",
      "\u0112": "E",
      "\u0114": "E",
      "\u0116": "E",
      "\u0118": "E",
      "\u011A": "E",
      "\u0113": "e",
      "\u0115": "e",
      "\u0117": "e",
      "\u0119": "e",
      "\u011B": "e",
      "\u011C": "G",
      "\u011E": "G",
      "\u0120": "G",
      "\u0122": "G",
      "\u011D": "g",
      "\u011F": "g",
      "\u0121": "g",
      "\u0123": "g",
      "\u0124": "H",
      "\u0126": "H",
      "\u0125": "h",
      "\u0127": "h",
      "\u0128": "I",
      "\u012A": "I",
      "\u012C": "I",
      "\u012E": "I",
      "\u0130": "I",
      "\u0129": "i",
      "\u012B": "i",
      "\u012D": "i",
      "\u012F": "i",
      "\u0131": "i",
      "\u0134": "J",
      "\u0135": "j",
      "\u0136": "K",
      "\u0137": "k",
      "\u0138": "k",
      "\u0139": "L",
      "\u013B": "L",
      "\u013D": "L",
      "\u013F": "L",
      "\u0141": "L",
      "\u013A": "l",
      "\u013C": "l",
      "\u013E": "l",
      "\u0140": "l",
      "\u0142": "l",
      "\u0143": "N",
      "\u0145": "N",
      "\u0147": "N",
      "\u014A": "N",
      "\u0144": "n",
      "\u0146": "n",
      "\u0148": "n",
      "\u014B": "n",
      "\u014C": "O",
      "\u014E": "O",
      "\u0150": "O",
      "\u014D": "o",
      "\u014F": "o",
      "\u0151": "o",
      "\u0154": "R",
      "\u0156": "R",
      "\u0158": "R",
      "\u0155": "r",
      "\u0157": "r",
      "\u0159": "r",
      "\u015A": "S",
      "\u015C": "S",
      "\u015E": "S",
      "\u0160": "S",
      "\u015B": "s",
      "\u015D": "s",
      "\u015F": "s",
      "\u0161": "s",
      "\u0162": "T",
      "\u0164": "T",
      "\u0166": "T",
      "\u0163": "t",
      "\u0165": "t",
      "\u0167": "t",
      "\u0168": "U",
      "\u016A": "U",
      "\u016C": "U",
      "\u016E": "U",
      "\u0170": "U",
      "\u0172": "U",
      "\u0169": "u",
      "\u016B": "u",
      "\u016D": "u",
      "\u016F": "u",
      "\u0171": "u",
      "\u0173": "u",
      "\u0174": "W",
      "\u0175": "w",
      "\u0176": "Y",
      "\u0177": "y",
      "\u0178": "Y",
      "\u0179": "Z",
      "\u017B": "Z",
      "\u017D": "Z",
      "\u017A": "z",
      "\u017C": "z",
      "\u017E": "z",
      "\u0132": "IJ",
      "\u0133": "ij",
      "\u0152": "Oe",
      "\u0153": "oe",
      "\u0149": "'n",
      "\u017F": "ss",
    },
    MC = typeof global == "object" && global && global.Object === Object && global,
    IC = typeof self == "object" && self && self.Object === Object && self,
    xC = MC || IC || Function("return this")();
  function kC(e, t, r, i) {
    var s = -1,
      n = e ? e.length : 0;
    if (i && n) r = e[++s];
    while (++s < n) r = t(r, e[s], s, e);
    return r;
  }
  function DC(e) {
    return e.split("");
  }
  function LC(e) {
    return e.match(dC) || [];
  }
  function FC(e) {
    return function (t) {
      return e == null ? void 0 : e[t];
    };
  }
  var qC = FC(NC);
  function Ju(e) {
    return AC.test(e);
  }
  function UC(e) {
    return PC.test(e);
  }
  function BC(e) {
    return Ju(e) ? zC(e) : DC(e);
  }
  function zC(e) {
    return e.match(OC) || [];
  }
  function HC(e) {
    return e.match(wC) || [];
  }
  var WC = Object.prototype,
    toString = WC.toString,
    Iu = xC.Symbol,
    xu = Iu ? Iu.prototype : void 0,
    ku = xu ? xu.toString : void 0;
  function GC(e, t, r) {
    var i = -1,
      s = e.length;
    if (t < 0) t = -t > s ? 0 : s + t;
    if (((r = r > s ? s : r), r < 0)) r += s;
    ((s = t > r ? 0 : (r - t) >>> 0), (t >>>= 0));
    var n = Array(s);
    while (++i < s) n[i] = e[i + t];
    return n;
  }
  function $C(e) {
    if (typeof e == "string") return e;
    if (XC(e)) return ku ? ku.call(e) : "";
    var t = e + "";
    return t == "0" && 1 / e == -cC ? "-0" : t;
  }
  function VC(e, t, r) {
    var i = e.length;
    return ((r = r === void 0 ? i : r), !t && r >= i ? e : GC(e, t, r));
  }
  function YC(e) {
    return function (t) {
      t = Ss(t);
      var r = Ju(t) ? BC(t) : void 0,
        i = r ? r[0] : t.charAt(0),
        s = r ? VC(r, 1).join("") : t.slice(1);
      return i[e]() + s;
    };
  }
  function KC(e) {
    return function (t) {
      return kC(rE(eE(t).replace(RC, "")), e, "");
    };
  }
  function JC(e) {
    return !!e && typeof e == "object";
  }
  function XC(e) {
    return typeof e == "symbol" || (JC(e) && toString.call(e) == uC);
  }
  function Ss(e) {
    return e == null ? "" : $C(e);
  }
  var QC = KC(function (e, t, r) {
    return ((t = t.toLowerCase()), e + (r ? ZC(t) : t));
  });
  function ZC(e) {
    return tE(Ss(e).toLowerCase());
  }
  function eE(e) {
    return ((e = Ss(e)), e && e.replace(hC, qC).replace(bC, ""));
  }
  var tE = YC("toUpperCase");
  function rE(e, t, r) {
    if (((e = Ss(e)), (t = r ? void 0 : t), t === void 0)) return UC(e) ? HC(e) : LC(e);
    return e.match(t) || [];
  }
  Xu.exports = QC;
});

export { Qu };
