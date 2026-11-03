/**
 * @azure/core-client/dist/esm/urlHelpers.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-client@1.9.2..1.10.0
 * pieces: chunk-mrx6y2r5.js (11)
 * attribution: esm-layout 2, esm-fingerprint 9
 */
import { Ta } from "../../../core-rest-pipeline/dist/esm/defaultHttpClient.js";
import { Nt } from "./operationHelpers.js";
import { nt } from "../index.js";

//@ chunk-mrx6y2r5.js:76933-76940 esm-layout
var _a;
//@ chunk-mrx6y2r5.js:76940-76979 esm-layout
function Od() {
  if (!_a) _a = Ta();
  return _a;
}
//@ chunk-mrx6y2r5.js:76979-77037 esm-fingerprint
var og = { CSV: ",", SSV: " ", Multi: "Multi", TSV: "\t", Pipes: "|" };
//@ chunk-mrx6y2r5.js:77037-77283 esm-fingerprint
function xd(e, t, r, n) {
  let o = ig(t, r, n),
    i = !1,
    s = Nd(e, o);
  if (t.path) {
    let l = Nd(t.path, o);
    if (t.path === "/{nextLink}" && l.startsWith("/")) l = l.substring(1);
    if (sg(l)) ((s = l), (i = !0));
    else s = ag(s, l);
  }
  let { queryParams: queryParams, sequenceParams: sequenceParams } = cg(t, r, n);
  return ((s = dg(s, queryParams, sequenceParams, i)), s);
}
//@ chunk-mrx6y2r5.js:77283-77355 esm-fingerprint
function Nd(e, t) {
  let r = e;
  for (let [n, o] of t) r = r.split(n).join(o);
  return r;
}
//@ chunk-mrx6y2r5.js:77355-77640 esm-fingerprint
function ig(e, t, r) {
  var n;
  let o = new Map();
  if ((n = e.urlParameters) === null || n === void 0 ? void 0 : n.length)
    for (let urlParameter of e.urlParameters) {
      let s = Nt(t, urlParameter, r),
        a = nt(urlParameter);
      if (((s = e.serializer.serialize(urlParameter.mapper, s, a)), !urlParameter.skipEncoding))
        s = encodeURIComponent(s);
      o.set(`{${urlParameter.mapper.serializedName || a}}`, s);
    }
  return o;
}
//@ chunk-mrx6y2r5.js:77640-77680 esm-fingerprint
function sg(e) {
  return e.includes("://");
}
//@ chunk-mrx6y2r5.js:77680-77978 esm-fingerprint
function ag(e, t) {
  if (!t) return e;
  let r = new URL(e),
    pathname = r.pathname;
  if (!pathname.endsWith("/")) pathname = `${pathname}/`;
  if (t.startsWith("/")) t = t.substring(1);
  let index = t.indexOf("?");
  if (index !== -1) {
    let substring = t.substring(0, index),
      substring_2 = t.substring(index + 1);
    if (((pathname = pathname + substring), substring_2))
      r.search = r.search ? `${r.search}&${substring_2}` : substring_2;
  } else pathname = pathname + t;
  return ((r.pathname = pathname), r.toString());
}
//@ chunk-mrx6y2r5.js:77978-78868 esm-fingerprint
function cg(e, t, r) {
  var n;
  let o = new Map(),
    i = new Set();
  if ((n = e.queryParameters) === null || n === void 0 ? void 0 : n.length)
    for (let queryParameter of e.queryParameters) {
      if (queryParameter.mapper.type.name === "Sequence" && queryParameter.mapper.serializedName)
        i.add(queryParameter.mapper.serializedName);
      let a = Nt(t, queryParameter, r);
      if ((a !== void 0 && a !== null) || queryParameter.mapper.required) {
        a = e.serializer.serialize(queryParameter.mapper, a, nt(queryParameter));
        let c = queryParameter.collectionFormat ? og[queryParameter.collectionFormat] : "";
        if (Array.isArray(a))
          a = a.map((l) => {
            if (l === null || l === void 0) return "";
            return l;
          });
        if (queryParameter.collectionFormat === "Multi" && a.length === 0) continue;
        else if (
          Array.isArray(a) &&
          (queryParameter.collectionFormat === "SSV" || queryParameter.collectionFormat === "TSV")
        )
          a = a.join(c);
        if (!queryParameter.skipEncoding)
          if (Array.isArray(a)) a = a.map((l) => encodeURIComponent(l));
          else a = encodeURIComponent(a);
        if (
          Array.isArray(a) &&
          (queryParameter.collectionFormat === "CSV" || queryParameter.collectionFormat === "Pipes")
        )
          a = a.join(c);
        o.set(queryParameter.mapper.serializedName || nt(queryParameter), a);
      }
    }
  return { queryParams: o, sequenceParams: i };
}
//@ chunk-mrx6y2r5.js:78868-79087 esm-fingerprint
function lg(e) {
  let t = new Map();
  if (!e || e[0] !== "?") return t;
  e = e.slice(1);
  let parts = e.split("&");
  for (let n of parts) {
    let [o, i] = n.split("=", 2),
      s = t.get(o);
    if (s)
      if (Array.isArray(s)) s.push(i);
      else t.set(o, [s, i]);
    else t.set(o, i);
  }
  return t;
}
//@ chunk-mrx6y2r5.js:79087-79630 esm-fingerprint
function dg(e, t, r, n = !1) {
  if (t.size === 0) return e;
  let o = new URL(e),
    i = lg(o.search);
  for (let [a, c] of t) {
    let l = i.get(a);
    if (Array.isArray(l))
      if (Array.isArray(c)) {
        l.push(...c);
        let d = new Set(l);
        i.set(a, Array.from(d));
      } else l.push(c);
    else if (l) {
      if (Array.isArray(c)) c.unshift(l);
      else if (r.has(a)) i.set(a, [l, c]);
      if (!n) i.set(a, c);
    } else i.set(a, c);
  }
  let s = [];
  for (let [a, c] of i)
    if (typeof c === "string") s.push(`${a}=${c}`);
    else if (Array.isArray(c)) for (let l of c) s.push(`${a}=${l}`);
    else s.push(`${a}=${c}`);
  return ((o.search = s.length ? `?${s.join("&")}` : ""), o.toString());
}

export { Od, xd };
