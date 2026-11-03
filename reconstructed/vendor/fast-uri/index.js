/**
 * fast-uri/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: fast-uri@3.1.2
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { require_utils } from "./lib/utils.js";
import { require_schemes } from "./lib/schemes.js";

//@ chunk-s82q9s4x.js:63889-68634 cjs-fingerprint
var require_fast_uri = x(function (cjsExports, cjsModule) {
  var {
    normalizeIPv6,
    removeDotSegments,
    recomposeAuthority,
    normalizePercentEncoding,
    normalizePathEncoding,
    escapePreservingEscapes,
    reescapeHostDelimiters,
    isIPv4,
    nonSimpleDomain,
  } = require_utils();
  var { SCHEMES, getSchemeHandler } = require_schemes();
  function normalize(uri, options) {
    if (typeof uri === "string") uri = normalizeString(uri, options);
    else if (typeof uri === "object") uri = parse(serialize(uri, options), options);
    return uri;
  }
  function resolve(baseURI, relativeURI, options) {
    let schemelessOptions = options
      ? Object.assign(
          {
            scheme: "null",
          },
          options,
        )
      : {
          scheme: "null",
        };
    let resolved = resolveComponent(
      parse(baseURI, schemelessOptions),
      parse(relativeURI, schemelessOptions),
      schemelessOptions,
      true,
    );
    schemelessOptions.skipEscape = true;
    return serialize(resolved, schemelessOptions);
  }
  function resolveComponent(base, relative, options, skipNormalization) {
    let target = {};
    if (!skipNormalization) {
      base = parse(serialize(base, options), options);
      relative = parse(serialize(relative, options), options);
    }
    options = options || {};
    if (!options.tolerant && relative.scheme) {
      target.scheme = relative.scheme;
      target.userinfo = relative.userinfo;
      target.host = relative.host;
      target.port = relative.port;
      target.path = removeDotSegments(relative.path || "");
      target.query = relative.query;
    } else {
      if (relative.userinfo !== undefined || relative.host !== undefined || relative.port !== undefined) {
        target.userinfo = relative.userinfo;
        target.host = relative.host;
        target.port = relative.port;
        target.path = removeDotSegments(relative.path || "");
        target.query = relative.query;
      } else {
        if (!relative.path) {
          target.path = base.path;
          if (relative.query !== undefined) target.query = relative.query;
          else target.query = base.query;
        } else {
          if (relative.path[0] === "/") target.path = removeDotSegments(relative.path);
          else {
            if (
              (base.userinfo !== undefined || base.host !== undefined || base.port !== undefined) &&
              !base.path
            )
              target.path = "/" + relative.path;
            else if (!base.path) target.path = relative.path;
            else target.path = base.path.slice(0, base.path.lastIndexOf("/") + 1) + relative.path;
            target.path = removeDotSegments(target.path);
          }
          target.query = relative.query;
        }
        target.userinfo = base.userinfo;
        target.host = base.host;
        target.port = base.port;
      }
      target.scheme = base.scheme;
    }
    target.fragment = relative.fragment;
    return target;
  }
  function equal(uriA, uriB, options) {
    let normalizedA = normalizeComparableURI(uriA, options);
    let normalizedB = normalizeComparableURI(uriB, options);
    return (
      normalizedA !== undefined &&
      normalizedB !== undefined &&
      normalizedA.toLowerCase() === normalizedB.toLowerCase()
    );
  }
  function serialize(cmpts, opts) {
    let component = {
      host: cmpts.host,
      scheme: cmpts.scheme,
      userinfo: cmpts.userinfo,
      port: cmpts.port,
      path: cmpts.path,
      query: cmpts.query,
      nid: cmpts.nid,
      nss: cmpts.nss,
      uuid: cmpts.uuid,
      fragment: cmpts.fragment,
      reference: cmpts.reference,
      resourceName: cmpts.resourceName,
      secure: cmpts.secure,
      error: "",
    };
    let options = Object.assign({}, opts);
    let uriTokens = [];
    let schemeHandler = getSchemeHandler(options.scheme || component.scheme);
    if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(component, options);
    if (component.path !== undefined)
      if (!options.skipEscape) {
        component.path = escapePreservingEscapes(component.path);
        if (component.scheme !== undefined) component.path = component.path.split("%3A").join(":");
      } else component.path = normalizePercentEncoding(component.path);
    if (options.reference !== "suffix" && component.scheme) uriTokens.push(component.scheme, ":");
    let authority = recomposeAuthority(component);
    if (authority !== undefined) {
      if (options.reference !== "suffix") uriTokens.push("//");
      uriTokens.push(authority);
      if (component.path && component.path[0] !== "/") uriTokens.push("/");
    }
    if (component.path !== undefined) {
      let s = component.path;
      if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) s = removeDotSegments(s);
      if (authority === undefined && s[0] === "/" && s[1] === "/") s = "/%2F" + s.slice(2);
      uriTokens.push(s);
    }
    if (component.query !== undefined) uriTokens.push("?", component.query);
    if (component.fragment !== undefined) uriTokens.push("#", component.fragment);
    return uriTokens.join("");
  }
  var URI_PARSE =
    /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
  function getParseError(parsed, matches) {
    if (matches[2] !== undefined && parsed.path && parsed.path[0] !== "/")
      return 'URI path must start with "/" when authority is present.';
    if (typeof parsed.port === "number" && (parsed.port < 0 || parsed.port > 65535))
      return "URI port is malformed.";
    return;
  }
  function parseWithStatus(uri, opts) {
    let options = Object.assign({}, opts);
    let parsed = {
      scheme: undefined,
      userinfo: undefined,
      host: "",
      port: undefined,
      path: "",
      query: undefined,
      fragment: undefined,
    };
    let malformedAuthorityOrPort = false;
    let isIP = false;
    if (options.reference === "suffix")
      if (options.scheme) uri = options.scheme + ":" + uri;
      else uri = "//" + uri;
    let matches = uri.match(URI_PARSE);
    if (matches) {
      parsed.scheme = matches[1];
      parsed.userinfo = matches[3];
      parsed.host = matches[4];
      parsed.port = parseInt(matches[5], 10);
      parsed.path = matches[6] || "";
      parsed.query = matches[7];
      parsed.fragment = matches[8];
      if (isNaN(parsed.port)) parsed.port = matches[5];
      let parseError = getParseError(parsed, matches);
      if (parseError !== undefined) {
        parsed.error = parsed.error || parseError;
        malformedAuthorityOrPort = true;
      }
      if (parsed.host)
        if (isIPv4(parsed.host) === false) {
          let ipv6result = normalizeIPv6(parsed.host);
          parsed.host = ipv6result.host.toLowerCase();
          isIP = ipv6result.isIPV6;
        } else isIP = true;
      if (
        parsed.scheme === undefined &&
        parsed.userinfo === undefined &&
        parsed.host === undefined &&
        parsed.port === undefined &&
        parsed.query === undefined &&
        !parsed.path
      )
        parsed.reference = "same-document";
      else if (parsed.scheme === undefined) parsed.reference = "relative";
      else if (parsed.fragment === undefined) parsed.reference = "absolute";
      else parsed.reference = "uri";
      if (options.reference && options.reference !== "suffix" && options.reference !== parsed.reference)
        parsed.error = parsed.error || "URI is not a " + options.reference + " reference.";
      let schemeHandler = getSchemeHandler(options.scheme || parsed.scheme);
      if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport)) {
        if (
          parsed.host &&
          (options.domainHost || (schemeHandler && schemeHandler.domainHost)) &&
          isIP === false &&
          nonSimpleDomain(parsed.host)
        )
          try {
            parsed.host = URL.domainToASCII(parsed.host.toLowerCase());
          } catch (e) {
            parsed.error = parsed.error || "Host's domain name can not be converted to ASCII: " + e;
          }
      }
      if (!schemeHandler || (schemeHandler && !schemeHandler.skipNormalize)) {
        if (uri.indexOf("%") !== -1) {
          if (parsed.scheme !== undefined) parsed.scheme = unescape(parsed.scheme);
          if (parsed.host !== undefined) parsed.host = reescapeHostDelimiters(unescape(parsed.host), isIP);
        }
        if (parsed.path) parsed.path = normalizePathEncoding(parsed.path);
        if (parsed.fragment)
          try {
            parsed.fragment = encodeURI(decodeURIComponent(parsed.fragment));
          } catch {
            parsed.error = parsed.error || "URI malformed";
          }
      }
      if (schemeHandler && schemeHandler.parse) schemeHandler.parse(parsed, options);
    } else parsed.error = parsed.error || "URI can not be parsed.";
    return {
      parsed,
      malformedAuthorityOrPort,
    };
  }
  function parse(uri, opts) {
    return parseWithStatus(uri, opts).parsed;
  }
  function normalizeString(uri, opts) {
    return normalizeStringWithStatus(uri, opts).normalized;
  }
  function normalizeStringWithStatus(uri, opts) {
    let { parsed, malformedAuthorityOrPort } = parseWithStatus(uri, opts);
    return {
      normalized: malformedAuthorityOrPort ? uri : serialize(parsed, opts),
      malformedAuthorityOrPort,
    };
  }
  function normalizeComparableURI(uri, opts) {
    if (typeof uri === "string") {
      let { normalized, malformedAuthorityOrPort } = normalizeStringWithStatus(uri, opts);
      return malformedAuthorityOrPort ? undefined : normalized;
    }
    if (typeof uri === "object") return serialize(uri, opts);
  }
  var fastUri = {
    SCHEMES,
    normalize,
    resolve,
    resolveComponent,
    equal,
    serialize,
    parse,
  };
  cjsModule.exports = fastUri;
  cjsModule.exports.default = fastUri;
  cjsModule.exports.fastUri = fastUri;
});
export { require_fast_uri };
