/**
 * fast-uri/lib/schemes.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: fast-uri@3.1.2
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { kr } from "./utils.js";

//@ chunk-s82q9s4x.js:61437-63889 cjs-fingerprint
var Xn = x(function (pm, Qn) {
  var { isUUID: isUUID } = kr(),
    Zl = /([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu,
    ed = ["http", "https", "ws", "wss", "urn", "urn:uuid"];
  function td(e) {
    return ed.indexOf(e) !== -1;
  }
  function qr(e) {
    if (e.secure === !0) return !0;
    else if (e.secure === !1) return !1;
    else if (e.scheme)
      return (
        e.scheme.length === 3 &&
        (e.scheme[0] === "w" || e.scheme[0] === "W") &&
        (e.scheme[1] === "s" || e.scheme[1] === "S") &&
        (e.scheme[2] === "s" || e.scheme[2] === "S")
      );
    else return !1;
  }
  function Jn(e) {
    if (!e.host) e.error = e.error || "HTTP URIs must have a host.";
    return e;
  }
  function Wn(e) {
    let t = String(e.scheme).toLowerCase() === "https";
    if (e.port === (t ? 443 : 80) || e.port === "") e.port = void 0;
    if (!e.path) e.path = "/";
    return e;
  }
  function rd(e) {
    return (
      (e.secure = qr(e)),
      (e.resourceName = (e.path || "/") + (e.query ? "?" + e.query : "")),
      (e.path = void 0),
      (e.query = void 0),
      e
    );
  }
  function sd(e) {
    if (e.port === (qr(e) ? 443 : 80) || e.port === "") e.port = void 0;
    if (typeof e.secure === "boolean") ((e.scheme = e.secure ? "wss" : "ws"), (e.secure = void 0));
    if (e.resourceName) {
      let [t, r] = e.resourceName.split("?");
      ((e.path = t && t !== "/" ? t : void 0), (e.query = r), (e.resourceName = void 0));
    }
    return ((e.fragment = void 0), e);
  }
  function nd(e, t) {
    if (!e.path) return ((e.error = "URN can not be parsed"), e);
    let match = e.path.match(Zl);
    if (match) {
      let s = t.scheme || e.scheme || "urn";
      ((e.nid = match[1].toLowerCase()), (e.nss = match[2]));
      let n = `${s}:${t.nid || e.nid}`,
        o = Or(n);
      if (((e.path = void 0), o)) e = o.parse(e, t);
    } else e.error = e.error || "URN can not be parsed.";
    return e;
  }
  function od(e, t) {
    if (e.nid === void 0) throw Error("URN without nid cannot be serialized");
    let r = t.scheme || e.scheme || "urn",
      lower = e.nid.toLowerCase(),
      n = `${r}:${t.nid || lower}`,
      o = Or(n);
    if (o) e = o.serialize(e, t);
    let i = e,
      nss = e.nss;
    return ((i.path = `${lower || t.nid}:${nss}`), (t.skipEscape = !0), i);
  }
  function id(e, t) {
    let r = e;
    if (((r.uuid = r.nss), (r.nss = void 0), !t.tolerant && (!r.uuid || !isUUID(r.uuid))))
      r.error = r.error || "UUID is not valid.";
    return r;
  }
  function ad(e) {
    let t = e;
    return ((t.nss = (e.uuid || "").toLowerCase()), t);
  }
  var Bn = { scheme: "http", domainHost: !0, parse: Jn, serialize: Wn },
    cd = { scheme: "https", domainHost: Bn.domainHost, parse: Jn, serialize: Wn },
    Rt = { scheme: "ws", domainHost: !0, parse: rd, serialize: sd },
    ud = { scheme: "wss", domainHost: Rt.domainHost, parse: Rt.parse, serialize: Rt.serialize },
    ld = { scheme: "urn", parse: nd, serialize: od, skipNormalize: !0 },
    dd = { scheme: "urn:uuid", parse: id, serialize: ad, skipNormalize: !0 },
    It = { http: Bn, https: cd, ws: Rt, wss: ud, urn: ld, "urn:uuid": dd };
  Object.setPrototypeOf(It, null);
  function Or(e) {
    return (e && (It[e] || It[e.toLowerCase()])) || void 0;
  }
  Qn.exports = { wsIsSecure: qr, SCHEMES: It, isValidSchemeName: td, getSchemeHandler: Or };
});

export { Xn };
