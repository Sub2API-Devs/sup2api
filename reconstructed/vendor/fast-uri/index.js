/**
 * fast-uri/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: fast-uri@3.1.2
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { kr } from "./lib/utils.js";
import { Xn } from "./lib/schemes.js";

//@ chunk-s82q9s4x.js:63889-68634 cjs-fingerprint
var so = x(function (hm, Tt) {
  var {
      normalizeIPv6: normalizeIPv6,
      removeDotSegments: removeDotSegments,
      recomposeAuthority: recomposeAuthority,
      normalizePercentEncoding: normalizePercentEncoding,
      normalizePathEncoding: normalizePathEncoding,
      escapePreservingEscapes: escapePreservingEscapes,
      reescapeHostDelimiters: reescapeHostDelimiters,
      isIPv4: isIPv4,
      nonSimpleDomain: nonSimpleDomain,
    } = kr(),
    { SCHEMES: SCHEMES, getSchemeHandler: getSchemeHandler } = Xn();
  function wd(e, t) {
    if (typeof e === "string") e = Nd(e, t);
    else if (typeof e === "object") e = Je(Ae(e, t), t);
    return e;
  }
  function bd(e, t, r) {
    let s = r ? Object.assign({ scheme: "null" }, r) : { scheme: "null" },
      n = eo(Je(e, s), Je(t, s), s, !0);
    return ((s.skipEscape = !0), Ae(n, s));
  }
  function eo(e, t, r, s) {
    let n = {};
    if (!s) ((e = Je(Ae(e, r), r)), (t = Je(Ae(t, r), r)));
    if (((r = r || {}), !r.tolerant && t.scheme))
      ((n.scheme = t.scheme),
        (n.userinfo = t.userinfo),
        (n.host = t.host),
        (n.port = t.port),
        (n.path = removeDotSegments(t.path || "")),
        (n.query = t.query));
    else {
      if (t.userinfo !== void 0 || t.host !== void 0 || t.port !== void 0)
        ((n.userinfo = t.userinfo),
          (n.host = t.host),
          (n.port = t.port),
          (n.path = removeDotSegments(t.path || "")),
          (n.query = t.query));
      else {
        if (!t.path)
          if (((n.path = e.path), t.query !== void 0)) n.query = t.query;
          else n.query = e.query;
        else {
          if (t.path[0] === "/") n.path = removeDotSegments(t.path);
          else {
            if ((e.userinfo !== void 0 || e.host !== void 0 || e.port !== void 0) && !e.path)
              n.path = "/" + t.path;
            else if (!e.path) n.path = t.path;
            else n.path = e.path.slice(0, e.path.lastIndexOf("/") + 1) + t.path;
            n.path = removeDotSegments(n.path);
          }
          n.query = t.query;
        }
        ((n.userinfo = e.userinfo), (n.host = e.host), (n.port = e.port));
      }
      n.scheme = e.scheme;
    }
    return ((n.fragment = t.fragment), n);
  }
  function Ed(e, t, r) {
    let s = Yn(e, r),
      n = Yn(t, r);
    return s !== void 0 && n !== void 0 && s.toLowerCase() === n.toLowerCase();
  }
  function Ae(e, t) {
    let r = {
        host: e.host,
        scheme: e.scheme,
        userinfo: e.userinfo,
        port: e.port,
        path: e.path,
        query: e.query,
        nid: e.nid,
        nss: e.nss,
        uuid: e.uuid,
        fragment: e.fragment,
        reference: e.reference,
        resourceName: e.resourceName,
        secure: e.secure,
        error: "",
      },
      merged = Object.assign({}, t),
      n = [],
      o = getSchemeHandler(merged.scheme || r.scheme);
    if (o && o.serialize) o.serialize(r, merged);
    if (r.path !== void 0)
      if (!merged.skipEscape) {
        if (((r.path = escapePreservingEscapes(r.path)), r.scheme !== void 0))
          r.path = r.path.split("%3A").join(":");
      } else r.path = normalizePercentEncoding(r.path);
    if (merged.reference !== "suffix" && r.scheme) n.push(r.scheme, ":");
    let i = recomposeAuthority(r);
    if (i !== void 0) {
      if (merged.reference !== "suffix") n.push("//");
      if ((n.push(i), r.path && r.path[0] !== "/")) n.push("/");
    }
    if (r.path !== void 0) {
      let path = r.path;
      if (!merged.absolutePath && (!o || !o.absolutePath)) path = removeDotSegments(path);
      if (i === void 0 && path[0] === "/" && path[1] === "/") path = "/%2F" + path.slice(2);
      n.push(path);
    }
    if (r.query !== void 0) n.push("?", r.query);
    if (r.fragment !== void 0) n.push("#", r.fragment);
    return n.join("");
  }
  var Sd =
    /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
  function Pd(e, t) {
    if (t[2] !== void 0 && e.path && e.path[0] !== "/")
      return 'URI path must start with "/" when authority is present.';
    if (typeof e.port === "number" && (e.port < 0 || e.port > 65535)) return "URI port is malformed.";
    return;
  }
  function to(e, t) {
    let merged = Object.assign({}, t),
      s = {
        scheme: void 0,
        userinfo: void 0,
        host: "",
        port: void 0,
        path: "",
        query: void 0,
        fragment: void 0,
      },
      n = !1,
      o = !1;
    if (merged.reference === "suffix")
      if (merged.scheme) e = merged.scheme + ":" + e;
      else e = "//" + e;
    let match = e.match(Sd);
    if (match) {
      if (
        ((s.scheme = match[1]),
        (s.userinfo = match[3]),
        (s.host = match[4]),
        (s.port = parseInt(match[5], 10)),
        (s.path = match[6] || ""),
        (s.query = match[7]),
        (s.fragment = match[8]),
        isNaN(s.port))
      )
        s.port = match[5];
      let a = Pd(s, match);
      if (a !== void 0) ((s.error = s.error || a), (n = !0));
      if (s.host)
        if (isIPv4(s.host) === !1) {
          let l = normalizeIPv6(s.host);
          ((s.host = l.host.toLowerCase()), (o = l.isIPV6));
        } else o = !0;
      if (
        s.scheme === void 0 &&
        s.userinfo === void 0 &&
        s.host === void 0 &&
        s.port === void 0 &&
        s.query === void 0 &&
        !s.path
      )
        s.reference = "same-document";
      else if (s.scheme === void 0) s.reference = "relative";
      else if (s.fragment === void 0) s.reference = "absolute";
      else s.reference = "uri";
      if (merged.reference && merged.reference !== "suffix" && merged.reference !== s.reference)
        s.error = s.error || "URI is not a " + merged.reference + " reference.";
      let c = getSchemeHandler(merged.scheme || s.scheme);
      if (!merged.unicodeSupport && (!c || !c.unicodeSupport)) {
        if (s.host && (merged.domainHost || (c && c.domainHost)) && o === !1 && nonSimpleDomain(s.host))
          try {
            s.host = URL.domainToASCII(s.host.toLowerCase());
          } catch (error) {
            s.error = s.error || "Host's domain name can not be converted to ASCII: " + error;
          }
      }
      if (!c || (c && !c.skipNormalize)) {
        if (e.indexOf("%") !== -1) {
          if (s.scheme !== void 0) s.scheme = unescape(s.scheme);
          if (s.host !== void 0) s.host = reescapeHostDelimiters(unescape(s.host), o);
        }
        if (s.path) s.path = normalizePathEncoding(s.path);
        if (s.fragment)
          try {
            s.fragment = encodeURI(decodeURIComponent(s.fragment));
          } catch {
            s.error = s.error || "URI malformed";
          }
      }
      if (c && c.parse) c.parse(s, merged);
    } else s.error = s.error || "URI can not be parsed.";
    return { parsed: s, malformedAuthorityOrPort: n };
  }
  function Je(e, t) {
    return to(e, t).parsed;
  }
  function Nd(e, t) {
    return ro(e, t).normalized;
  }
  function ro(e, t) {
    let { parsed: parsed, malformedAuthorityOrPort: malformedAuthorityOrPort } = to(e, t);
    return {
      normalized: malformedAuthorityOrPort ? e : Ae(parsed, t),
      malformedAuthorityOrPort: malformedAuthorityOrPort,
    };
  }
  function Yn(e, t) {
    if (typeof e === "string") {
      let { normalized: normalized, malformedAuthorityOrPort: malformedAuthorityOrPort } = ro(e, t);
      return malformedAuthorityOrPort ? void 0 : normalized;
    }
    if (typeof e === "object") return Ae(e, t);
  }
  var jr = {
    SCHEMES: SCHEMES,
    normalize: wd,
    resolve: bd,
    resolveComponent: eo,
    equal: Ed,
    serialize: Ae,
    parse: Je,
  };
  Tt.exports = jr;
  Tt.exports.default = jr;
  Tt.exports.fastUri = jr;
});

export { so };
