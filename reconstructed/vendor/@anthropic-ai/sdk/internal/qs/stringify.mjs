/**
 * @anthropic-ai/sdk/internal/qs/stringify.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (6)
 * attribution: esm-fingerprint 5, esm-layout 1
 */
import { Ye } from "../utils/values.mjs";
import { Ql, zi, isBufferLike, Wo } from "./utils.mjs";
import { RFC3986, $i, qi } from "./formats.mjs";

//@ chunk-hwmsct5x.js:20512-21053 esm-fingerprint
var tu = {
    brackets(e) {
      return String(e) + "[]";
    },
    comma: "comma",
    indices(e, n) {
      return String(e) + "[" + n + "]";
    },
    repeat(e) {
      return String(e);
    },
  },
  nu = function (e, n) {
    Array.prototype.push.apply(e, Ye(n) ? n : [n]);
  },
  eu,
  Ne = {
    addQueryPrefix: !1,
    allowDots: !1,
    allowEmptyArrays: !1,
    arrayFormat: "indices",
    charset: "utf-8",
    charsetSentinel: !1,
    delimiter: "&",
    encode: !0,
    encodeDotInKeys: !1,
    encoder: Ql,
    encodeValuesOnly: !1,
    format: RFC3986,
    formatter: $i,
    indices: !1,
    serializeDate(e) {
      return (eu ?? (eu = Function.prototype.call.bind(Date.prototype.toISOString)))(e);
    },
    skipNulls: !1,
    strictNullHandling: !1,
  };
//@ chunk-hwmsct5x.js:21053-21180 esm-fingerprint
function Ih(e) {
  return (
    typeof e === "string" ||
    typeof e === "number" ||
    typeof e === "boolean" ||
    typeof e === "symbol" ||
    typeof e === "bigint"
  );
}
//@ chunk-hwmsct5x.js:21180-21190 esm-layout
var Yi = {};
//@ chunk-hwmsct5x.js:21190-22490 esm-fingerprint
function ru(e, n, r, s, h, y, w, S, E, R, L, O, M, P, H, j, z, G) {
  let q = e,
    J = G,
    Z = 0,
    Q = !1;
  while ((J = J.get(Yi)) !== void 0 && !Q) {
    let ie = J.get(e);
    if (((Z += 1), typeof ie < "u"))
      if (ie === Z) throw RangeError("Cyclic object value");
      else Q = !0;
    if (typeof J.get(Yi) > "u") Z = 0;
  }
  if (typeof R === "function") q = R(n, q);
  else if (q instanceof Date) q = M?.(q);
  else if (r === "comma" && Ye(q))
    q = zi(q, function (ie) {
      if (ie instanceof Date) return M?.(ie);
      return ie;
    });
  if (q === null) {
    if (y) return E && !j ? E(n, Ne.encoder, z, "key", P) : n;
    q = "";
  }
  if (Ih(q) || isBufferLike(q)) {
    if (E) {
      let ie = j ? n : E(n, Ne.encoder, z, "key", P);
      return [H?.(ie) + "=" + H?.(E(q, Ne.encoder, z, "value", P))];
    }
    return [H?.(n) + "=" + H?.(String(q))];
  }
  let ne = [];
  if (typeof q > "u") return ne;
  let te;
  if (r === "comma" && Ye(q)) {
    if (j && E) q = zi(q, E);
    te = [{ value: q.length > 0 ? q.join(",") || null : void 0 }];
  } else if (Ye(R)) te = R;
  else {
    let keys = Object.keys(q);
    te = L ? keys.sort(L) : keys;
  }
  let ae = S ? String(n).replace(/\./g, "%2E") : String(n),
    oe = s && Ye(q) && q.length === 1 ? ae + "[]" : ae;
  if (h && Ye(q) && q.length === 0) return oe + "[]";
  for (let ie = 0; ie < te.length; ++ie) {
    let Se = te[ie],
      De = typeof Se === "object" && typeof Se.value < "u" ? Se.value : q[Se];
    if (w && De === null) continue;
    let se = O && S ? Se.replace(/\./g, "%2E") : Se,
      bn = Ye(q) ? (typeof r === "function" ? r(oe, se) : oe) : oe + (O ? "." + se : "[" + se + "]");
    G.set(e, Z);
    let weakMap = new WeakMap();
    (weakMap.set(Yi, G),
      nu(
        ne,
        ru(De, bn, r, s, h, y, w, S, r === "comma" && j && Ye(q) ? null : E, R, L, O, M, P, H, j, z, weakMap),
      ));
  }
  return ne;
}
//@ chunk-hwmsct5x.js:22490-24706 esm-fingerprint
function Lh(e = Ne) {
  if (typeof e.allowEmptyArrays < "u" && typeof e.allowEmptyArrays !== "boolean")
    throw TypeError("`allowEmptyArrays` option can only be `true` or `false`, when provided");
  if (typeof e.encodeDotInKeys < "u" && typeof e.encodeDotInKeys !== "boolean")
    throw TypeError("`encodeDotInKeys` option can only be `true` or `false`, when provided");
  if (e.encoder !== null && typeof e.encoder < "u" && typeof e.encoder !== "function")
    throw TypeError("Encoder has to be a function.");
  let n = e.charset || Ne.charset;
  if (typeof e.charset < "u" && e.charset !== "utf-8" && e.charset !== "iso-8859-1")
    throw TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
  let r = RFC3986;
  if (typeof e.format < "u") {
    if (!Wo(qi, e.format)) throw TypeError("Unknown format option provided.");
    r = e.format;
  }
  let s = qi[r],
    filter = Ne.filter;
  if (typeof e.filter === "function" || Ye(e.filter)) filter = e.filter;
  let y;
  if (e.arrayFormat && e.arrayFormat in tu) y = e.arrayFormat;
  else if ("indices" in e) y = e.indices ? "indices" : "repeat";
  else y = Ne.arrayFormat;
  if ("commaRoundTrip" in e && typeof e.commaRoundTrip !== "boolean")
    throw TypeError("`commaRoundTrip` must be a boolean, or absent");
  let w = typeof e.allowDots > "u" ? (!!e.encodeDotInKeys === !0 ? !0 : Ne.allowDots) : !!e.allowDots;
  return {
    addQueryPrefix: typeof e.addQueryPrefix === "boolean" ? e.addQueryPrefix : Ne.addQueryPrefix,
    allowDots: w,
    allowEmptyArrays: typeof e.allowEmptyArrays === "boolean" ? !!e.allowEmptyArrays : Ne.allowEmptyArrays,
    arrayFormat: y,
    charset: n,
    charsetSentinel: typeof e.charsetSentinel === "boolean" ? e.charsetSentinel : Ne.charsetSentinel,
    commaRoundTrip: !!e.commaRoundTrip,
    delimiter: typeof e.delimiter > "u" ? Ne.delimiter : e.delimiter,
    encode: typeof e.encode === "boolean" ? e.encode : Ne.encode,
    encodeDotInKeys: typeof e.encodeDotInKeys === "boolean" ? e.encodeDotInKeys : Ne.encodeDotInKeys,
    encoder: typeof e.encoder === "function" ? e.encoder : Ne.encoder,
    encodeValuesOnly: typeof e.encodeValuesOnly === "boolean" ? e.encodeValuesOnly : Ne.encodeValuesOnly,
    filter: filter,
    format: r,
    formatter: s,
    serializeDate: typeof e.serializeDate === "function" ? e.serializeDate : Ne.serializeDate,
    skipNulls: typeof e.skipNulls === "boolean" ? e.skipNulls : Ne.skipNulls,
    sort: typeof e.sort === "function" ? e.sort : null,
    strictNullHandling:
      typeof e.strictNullHandling === "boolean" ? e.strictNullHandling : Ne.strictNullHandling,
  };
}
//@ chunk-hwmsct5x.js:24706-25478 esm-fingerprint
function ou(e, n = {}) {
  let r = e,
    s = Lh(n),
    h,
    y;
  if (typeof s.filter === "function") ((y = s.filter), (r = y("", r)));
  else if (Ye(s.filter)) ((y = s.filter), (h = y));
  let w = [];
  if (typeof r !== "object" || r === null) return "";
  let S = tu[s.arrayFormat],
    E = S === "comma" && s.commaRoundTrip;
  if (!h) h = Object.keys(r);
  if (s.sort) h.sort(s.sort);
  let weakMap = new WeakMap();
  for (let M = 0; M < h.length; ++M) {
    let P = h[M];
    if (s.skipNulls && r[P] === null) continue;
    nu(
      w,
      ru(
        r[P],
        P,
        S,
        E,
        s.allowEmptyArrays,
        s.strictNullHandling,
        s.skipNulls,
        s.encodeDotInKeys,
        s.encode ? s.encoder : null,
        s.filter,
        s.sort,
        s.allowDots,
        s.serializeDate,
        s.format,
        s.formatter,
        s.encodeValuesOnly,
        s.charset,
        weakMap,
      ),
    );
  }
  let joined = w.join(s.delimiter),
    O = s.addQueryPrefix === !0 ? "?" : "";
  if (s.charsetSentinel)
    if (s.charset === "iso-8859-1") O += "utf8=%26%2310003%3B&";
    else O += "utf8=%E2%9C%93&";
  return joined.length > 0 ? O + joined : "";
}

export { ou };
