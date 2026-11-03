/**
 * axios/dist/node/axios.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: axios@1.15.2
 * pieces: chunk-h6b7mazd.js (67)
 * attribution: esm-fingerprint 52, esm-layout 15
 */
import url from "url";
import yc from "crypto";
import stream, { Readable } from "stream";
import util from "util";
import zlib from "zlib";
import { Pt, Rr, toFormData$1, utils$1, he, AxiosError$1 } from "../esm/axios.js";
import { Re } from "../../../../runtime/bun-runtime.js";
import { require_follow_redirects } from "../../../follow-redirects/index.js";

//@ chunk-h6b7mazd.js:57260-57286 esm-fingerprint
var vs = url.URLSearchParams;
//@ chunk-h6b7mazd.js:57286-57692 esm-fingerprint
var ALPHA = "abcdefghijklmnopqrstuvwxyz";
var DIGIT = "0123456789";
var ALPHABET = {
  DIGIT,
  ALPHA,
  ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT,
};
var generateString = (size = 16, alphabet = ALPHABET.ALPHA_DIGIT) => {
  let str = "";
  let { length } = alphabet;
  let randomValues = new Uint32Array(size);
  yc.randomFillSync(randomValues);
  for (let i = 0; i < size; i++) str += alphabet[randomValues[i] % length];
  return str;
};
var platform$1 = {
  isNode: true,
  classes: {
    URLSearchParams: vs,
    FormData: Pt,
    Blob: (typeof Blob !== "undefined" && Blob) || null,
  },
  ALPHABET,
  generateString,
  protocols: ["http", "https", "file", "data"],
};
//@ chunk-h6b7mazd.js:57692-58023 esm-layout
var hasBrowserEnv = typeof window !== "undefined" && typeof document !== "undefined";
var _navigator = (typeof navigator === "object" && navigator) || undefined;
var hasStandardBrowserEnv =
  hasBrowserEnv && (!_navigator || ["ReactNative", "NativeScript", "NS"].indexOf(_navigator.product) < 0);
var hasStandardBrowserWebWorkerEnv = (() =>
  typeof WorkerGlobalScope !== "undefined" &&
  self instanceof WorkerGlobalScope &&
  typeof self.importScripts === "function")();
var origin = (hasBrowserEnv && window.location.href) || "http://localhost";
//@ chunk-h6b7mazd.js:58023-58043 esm-layout
var platform = {
  ...Rr,
  ...platform$1,
};
//@ chunk-h6b7mazd.js:58043-58256 esm-fingerprint
function toURLEncodedForm(data, options) {
  return toFormData$1(data, new platform.classes.URLSearchParams(), {
    visitor: function (value, key, path, helpers) {
      if (platform.isNode && utils$1.isBuffer(value)) {
        this.append(key, value.toString("base64"));
        return false;
      }
      return helpers.defaultVisitor.apply(this, arguments);
    },
    ...options,
  });
}
//@ chunk-h6b7mazd.js:58256-58344 esm-fingerprint
function parsePropPath(name) {
  return utils$1
    .matchAll(/\w+|\[(\w*)]/g, name)
    .map((match) => (match[0] === "[]" ? "" : match[1] || match[0]));
}
//@ chunk-h6b7mazd.js:58344-58442 esm-layout
function arrayToObject(arr) {
  let obj = {};
  let keys = Object.keys(arr);
  let i;
  let len = keys.length;
  let key;
  for (i = 0; i < len; i++) {
    key = keys[i];
    obj[key] = arr[key];
  }
  return obj;
}
//@ chunk-h6b7mazd.js:58442-58891 esm-fingerprint
function _c(formData) {
  function buildPath(path, value, target, index) {
    let name = path[index++];
    if (name === "__proto__") return true;
    let isNumericKey = Number.isFinite(+name);
    let isLast = index >= path.length;
    name = !name && utils$1.isArray(target) ? target.length : name;
    if (isLast) {
      if (utils$1.hasOwnProp(target, name))
        target[name] = utils$1.isArray(target[name]) ? target[name].concat(value) : [target[name], value];
      else target[name] = value;
      return !isNumericKey;
    }
    if (!target[name] || !utils$1.isObject(target[name])) target[name] = [];
    if (buildPath(path, value, target[name], index) && utils$1.isArray(target[name]))
      target[name] = arrayToObject(target[name]);
    return !isNumericKey;
  }
  if (utils$1.isFormData(formData) && utils$1.isFunction(formData.entries)) {
    let obj = {};
    utils$1.forEachEntry(formData, (name, value) => {
      buildPath(parsePropPath(name), value, obj, 0);
    });
    return obj;
  }
  return null;
}
//@ chunk-h6b7mazd.js:58891-58901 esm-layout
var Ft = _c;
//@ chunk-h6b7mazd.js:58901-58954 esm-fingerprint
var own = (obj, key) => (obj != null && utils$1.hasOwnProp(obj, key) ? obj[key] : undefined);
//@ chunk-h6b7mazd.js:58954-59101 esm-fingerprint
function stringifySafely(rawValue, parser, encoder) {
  if (utils$1.isString(rawValue))
    try {
      (parser || JSON.parse)(rawValue);
      return utils$1.trim(rawValue);
    } catch (e) {
      if (e.name !== "SyntaxError") throw e;
    }
  return (encoder || JSON.stringify)(rawValue);
}
//@ chunk-h6b7mazd.js:59101-60693 esm-fingerprint
var defaults = {
  transitional: he,
  adapter: ["xhr", "http", "fetch"],
  transformRequest: [
    function (data, headers) {
      let contentType = headers.getContentType() || "";
      let hasJSONContentType = contentType.indexOf("application/json") > -1;
      let isObjectPayload = utils$1.isObject(data);
      if (isObjectPayload && utils$1.isHTMLForm(data)) data = new FormData(data);
      if (utils$1.isFormData(data)) return hasJSONContentType ? JSON.stringify(Ft(data)) : data;
      if (
        utils$1.isArrayBuffer(data) ||
        utils$1.isBuffer(data) ||
        utils$1.isStream(data) ||
        utils$1.isFile(data) ||
        utils$1.isBlob(data) ||
        utils$1.isReadableStream(data)
      )
        return data;
      if (utils$1.isArrayBufferView(data)) return data.buffer;
      if (utils$1.isURLSearchParams(data)) {
        headers.setContentType("application/x-www-form-urlencoded;charset=utf-8", false);
        return data.toString();
      }
      let isFileList;
      if (isObjectPayload) {
        let formSerializer = own(this, "formSerializer");
        if (contentType.indexOf("application/x-www-form-urlencoded") > -1)
          return toURLEncodedForm(data, formSerializer).toString();
        if ((isFileList = utils$1.isFileList(data)) || contentType.indexOf("multipart/form-data") > -1) {
          let env = own(this, "env");
          let _FormData = env && env.FormData;
          return toFormData$1(
            isFileList
              ? {
                  "files[]": data,
                }
              : data,
            _FormData && new _FormData(),
            formSerializer,
          );
        }
      }
      if (isObjectPayload || hasJSONContentType) {
        headers.setContentType("application/json", false);
        return stringifySafely(data);
      }
      return data;
    },
  ],
  transformResponse: [
    function (data) {
      let transitional = own(this, "transitional") || defaults.transitional;
      let forcedJSONParsing = transitional && transitional.forcedJSONParsing;
      let responseType = own(this, "responseType");
      let JSONRequested = responseType === "json";
      if (utils$1.isResponse(data) || utils$1.isReadableStream(data)) return data;
      if (data && utils$1.isString(data) && ((forcedJSONParsing && !responseType) || JSONRequested)) {
        let a = !(transitional && transitional.silentJSONParsing) && JSONRequested;
        try {
          return JSON.parse(data, own(this, "parseReviver"));
        } catch (e) {
          if (a) {
            if (e.name === "SyntaxError")
              throw AxiosError$1.from(e, AxiosError$1.ERR_BAD_RESPONSE, this, null, own(this, "response"));
            throw e;
          }
        }
      }
      return data;
    },
  ],
  timeout: 0,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  maxContentLength: -1,
  maxBodyLength: -1,
  env: {
    FormData: platform.classes.FormData,
    Blob: platform.classes.Blob,
  },
  validateStatus: function (status) {
    return status >= 200 && status < 300;
  },
  headers: {
    common: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": undefined,
    },
  },
};
//@ chunk-h6b7mazd.js:60693-60773 esm-fingerprint
utils$1.forEach(["delete", "get", "head", "post", "put", "patch"], (method) => {
  defaults.headers[method] = {};
});
//@ chunk-h6b7mazd.js:60773-60783 esm-layout
var defaults_default = defaults;
//@ chunk-h6b7mazd.js:60783-61300 esm-fingerprint
var Ac = utils$1.toObjectSet([
  "age",
  "authorization",
  "content-length",
  "content-type",
  "etag",
  "expires",
  "from",
  "host",
  "if-modified-since",
  "if-unmodified-since",
  "last-modified",
  "location",
  "max-forwards",
  "proxy-authorization",
  "referer",
  "retry-after",
  "user-agent",
]);
var parseHeaders = (rawHeaders) => {
  let parsed = {};
  let key;
  let val;
  let i_2;
  if (rawHeaders)
    rawHeaders
      .split(
        `
`,
      )
      .forEach(function (line) {
        i_2 = line.indexOf(":");
        key = line.substring(0, i_2).trim().toLowerCase();
        val = line.substring(i_2 + 1).trim();
        if (!key || (parsed[key] && Ac[key])) return;
        if (key === "set-cookie") {
          if (parsed[key]) parsed[key].push(val);
          else parsed[key] = [val];
        } else parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
      });
  return parsed;
};
//@ chunk-h6b7mazd.js:61300-61359 esm-fingerprint
var $internals = Symbol("internals");
var INVALID_HEADER_VALUE_CHARS_RE = /[^\x09\x20-\x7E\x80-\xFF]/g;
//@ chunk-h6b7mazd.js:61359-61559 esm-fingerprint
function trimSPorHTAB(str) {
  let start = 0;
  let end = str.length;
  while (start < end) {
    let code = str.charCodeAt(start);
    if (code !== 9 && code !== 32) break;
    start += 1;
  }
  while (end > start) {
    let code = str.charCodeAt(end - 1);
    if (code !== 9 && code !== 32) break;
    end -= 1;
  }
  return start === 0 && end === str.length ? str : str.slice(start, end);
}
//@ chunk-h6b7mazd.js:61559-61615 esm-fingerprint
function normalizeHeader(header) {
  return header && String(header).trim().toLowerCase();
}
//@ chunk-h6b7mazd.js:61615-61658 esm-layout
function sanitizeHeaderValue(str) {
  return trimSPorHTAB(str.replace(INVALID_HEADER_VALUE_CHARS_RE, ""));
}
//@ chunk-h6b7mazd.js:61658-61745 esm-fingerprint
function normalizeValue(value) {
  if (value === false || value == null) return value;
  return utils$1.isArray(value) ? value.map(normalizeValue) : sanitizeHeaderValue(String(value));
}
//@ chunk-h6b7mazd.js:61745-61865 esm-fingerprint
function parseTokens(str) {
  let tokens = Object.create(null);
  let tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let match;
  while ((match = tokensRE.exec(str))) tokens[match[1]] = match[2];
  return tokens;
}
//@ chunk-h6b7mazd.js:61865-61925 esm-fingerprint
var isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());
//@ chunk-h6b7mazd.js:61925-62101 esm-fingerprint
function matchHeaderValue(context, value, header, filter, isHeaderNameFilter) {
  if (utils$1.isFunction(filter)) return filter.call(this, value, header);
  if (isHeaderNameFilter) value = header;
  if (!utils$1.isString(value)) return;
  if (utils$1.isString(filter)) return value.indexOf(filter) !== -1;
  if (utils$1.isRegExp(filter)) return filter.test(value);
}
//@ chunk-h6b7mazd.js:62101-62200 esm-fingerprint
function formatHeader(header) {
  return header
    .trim()
    .toLowerCase()
    .replace(/([a-z\d])(\w*)/g, (w, char, str) => char.toUpperCase() + str);
}
//@ chunk-h6b7mazd.js:62200-62384 esm-fingerprint
function buildAccessors(obj, header) {
  let accessorName = utils$1.toCamelCase(" " + header);
  ["get", "set", "has"].forEach((methodName) => {
    Object.defineProperty(obj, methodName + accessorName, {
      value: function (arg1, arg2, arg3) {
        return this[methodName].call(this, header, arg1, arg2, arg3);
      },
      configurable: true,
    });
  });
}
//@ chunk-h6b7mazd.js:62384-64623 esm-fingerprint
class AxiosHeaders_2 {
  constructor(headers) {
    if (headers) this.set(headers);
  }
  set(header, valueOrRewrite, rewrite) {
    let n = this;
    function setHeader(_value, _header, _rewrite) {
      let lHeader = normalizeHeader(_header);
      if (!lHeader) throw Error("header name must be a non-empty string");
      let key = utils$1.findKey(n, lHeader);
      if (!key || n[key] === undefined || _rewrite === true || (_rewrite === undefined && n[key] !== false))
        n[key || _header] = normalizeValue(_value);
    }
    let setHeaders = (headers, _rewrite) =>
      utils$1.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));
    if (utils$1.isPlainObject(header) || header instanceof this.constructor)
      setHeaders(header, valueOrRewrite);
    else if (utils$1.isString(header) && (header = header.trim()) && !isValidHeaderName(header))
      setHeaders(parseHeaders(header), valueOrRewrite);
    else if (utils$1.isObject(header) && utils$1.isIterable(header)) {
      let obj = {};
      let dest;
      let key;
      for (let entry of header) {
        if (!utils$1.isArray(entry)) throw TypeError("Object iterator must return a key-value pair");
        obj[(key = entry[0])] = (dest = obj[key])
          ? utils$1.isArray(dest)
            ? [...dest, entry[1]]
            : [dest, entry[1]]
          : entry[1];
      }
      setHeaders(obj, valueOrRewrite);
    } else if (header != null) setHeader(valueOrRewrite, header, rewrite);
    return this;
  }
  get(header, parser) {
    header = normalizeHeader(header);
    if (header) {
      let key = utils$1.findKey(this, header);
      if (key) {
        let value = this[key];
        if (!parser) return value;
        if (parser === true) return parseTokens(value);
        if (utils$1.isFunction(parser)) return parser.call(this, value, key);
        if (utils$1.isRegExp(parser)) return parser.exec(value);
        throw TypeError("parser must be boolean|regexp|function");
      }
    }
  }
  has(header, matcher) {
    header = normalizeHeader(header);
    if (header) {
      let key = utils$1.findKey(this, header);
      return !!(
        key &&
        this[key] !== undefined &&
        (!matcher || matchHeaderValue(this, this[key], key, matcher))
      );
    }
    return false;
  }
  delete(header, matcher) {
    let r = this;
    let deleted = false;
    function deleteHeader(_header) {
      _header = normalizeHeader(_header);
      if (_header) {
        let key = utils$1.findKey(r, _header);
        if (key && (!matcher || matchHeaderValue(r, r[key], key, matcher))) {
          delete r[key];
          deleted = true;
        }
      }
    }
    if (utils$1.isArray(header)) header.forEach(deleteHeader);
    else deleteHeader(header);
    return deleted;
  }
  clear(matcher) {
    let keys = Object.keys(this);
    let i = keys.length;
    let deleted = false;
    while (i--) {
      let key = keys[i];
      if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
        delete this[key];
        deleted = true;
      }
    }
    return deleted;
  }
  normalize(format) {
    let t = this;
    let headers = {};
    utils$1.forEach(this, (value, header) => {
      let key = utils$1.findKey(headers, header);
      if (key) {
        t[key] = normalizeValue(value);
        delete t[header];
        return;
      }
      let normalized = format ? formatHeader(header) : String(header).trim();
      if (normalized !== header) delete t[header];
      t[normalized] = normalizeValue(value);
      headers[normalized] = true;
    });
    return this;
  }
  concat(...targets) {
    return this.constructor.concat(this, ...targets);
  }
  toJSON(asStrings) {
    let obj = Object.create(null);
    utils$1.forEach(this, (value, header) => {
      if (value != null && value !== false)
        obj[header] = asStrings && utils$1.isArray(value) ? value.join(", ") : value;
    });
    return obj;
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON()).map(([header, value]) => header + ": " + value).join(`
`);
  }
  getSetCookie() {
    return this.get("set-cookie") || [];
  }
  get [Symbol.toStringTag]() {
    return "AxiosHeaders";
  }
  static from(thing) {
    return thing instanceof this ? thing : new this(thing);
  }
  static concat(first, ...targets) {
    let computed = new this(first);
    targets.forEach((target) => computed.set(target));
    return computed;
  }
  static accessor(header) {
    let accessors = (this[$internals] = this[$internals] =
      {
        accessors: {},
      }).accessors;
    let prototype = this.prototype;
    function defineAccessor(_header) {
      let lHeader = normalizeHeader(_header);
      if (!accessors[lHeader]) {
        buildAccessors(prototype, _header);
        accessors[lHeader] = true;
      }
    }
    if (utils$1.isArray(header)) header.forEach(defineAccessor);
    else defineAccessor(header);
    return this;
  }
}
//@ chunk-h6b7mazd.js:64623-64726 esm-fingerprint
AxiosHeaders_2.accessor([
  "Content-Type",
  "Content-Length",
  "Accept",
  "Accept-Encoding",
  "User-Agent",
  "Authorization",
]);
//@ chunk-h6b7mazd.js:64726-64849 esm-fingerprint
utils$1.reduceDescriptors(AxiosHeaders_2.prototype, ({ value }, key) => {
  let mapped = key[0].toUpperCase() + key.slice(1);
  return {
    get: () => value,
    set(headerValue) {
      this[mapped] = headerValue;
    },
  };
});
//@ chunk-h6b7mazd.js:64849-64869 esm-fingerprint
utils$1.freezeMethods(AxiosHeaders_2);
//@ chunk-h6b7mazd.js:64869-64878 esm-layout
var AxiosHeaders_default = AxiosHeaders_2;
//@ chunk-h6b7mazd.js:64878-65041 esm-fingerprint
function transformData(fns, response) {
  let config = this || defaults_default;
  let context = response || config;
  let headers = AxiosHeaders_default.from(context.headers);
  let data = context.data;
  utils$1.forEach(fns, function (fn) {
    data = fn.call(config, data, headers.normalize(), response ? response.status : undefined);
  });
  headers.normalize();
  return data;
}
//@ chunk-h6b7mazd.js:65041-65082 esm-fingerprint
function isCancel_2(value) {
  return !!(value && value.__CANCEL__);
}
//@ chunk-h6b7mazd.js:65082-65213 esm-fingerprint
class CanceledError_2 extends AxiosError$1 {
  constructor(message, config, request) {
    super(message == null ? "canceled" : message, AxiosError$1.ERR_CANCELED, config, request);
    this.name = "CanceledError";
    this.__CANCEL__ = true;
  }
}
//@ chunk-h6b7mazd.js:65213-65222 esm-layout
var CanceledError_default = CanceledError_2;
//@ chunk-h6b7mazd.js:65222-65453 esm-fingerprint
function settle(resolve, reject, response) {
  let validateStatus = response.config.validateStatus;
  if (!response.status || !validateStatus || validateStatus(response.status)) resolve(response);
  else
    reject(
      new AxiosError$1(
        "Request failed with status code " + response.status,
        [AxiosError$1.ERR_BAD_REQUEST, AxiosError$1.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
        response.config,
        response.request,
        response,
      ),
    );
}
//@ chunk-h6b7mazd.js:65453-65544 esm-fingerprint
function isAbsoluteURL(url) {
  if (typeof url !== "string") return false;
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}
//@ chunk-h6b7mazd.js:65544-65620 esm-fingerprint
function combineURLs(baseURL, relativeURL) {
  return relativeURL ? baseURL.replace(/\/?\/$/, "") + "/" + relativeURL.replace(/^\/+/, "") : baseURL;
}
//@ chunk-h6b7mazd.js:65620-65694 esm-layout
function _e(baseURL, requestedURL, allowAbsoluteUrls) {
  let isRelativeUrl = !isAbsoluteURL(requestedURL);
  if (baseURL && (isRelativeUrl || allowAbsoluteUrls === false)) return combineURLs(baseURL, requestedURL);
  return requestedURL;
}
//@ chunk-h6b7mazd.js:65694-65752 esm-fingerprint
var DEFAULT_PORTS$1 = {
  ftp: 21,
  gopher: 70,
  http: 80,
  https: 443,
  ws: 80,
  wss: 443,
};
//@ chunk-h6b7mazd.js:65752-65808 esm-layout
function parseUrl(urlString) {
  try {
    return new URL(urlString);
  } catch {
    return null;
  }
}
//@ chunk-h6b7mazd.js:65808-66125 esm-fingerprint
function getProxyForUrl(url) {
  var t = (typeof url === "string" ? parseUrl(url) : url) || {};
  var { protocol: proto, host: hostname, port } = t;
  if (typeof hostname !== "string" || !hostname || typeof proto !== "string") return "";
  proto = proto.split(":", 1)[0];
  hostname = hostname.replace(/:\d*$/, "");
  port = parseInt(port) || DEFAULT_PORTS$1[proto] || 0;
  if (!shouldProxy(hostname, port)) return "";
  var proxy = getEnv(proto + "_proxy") || getEnv("all_proxy");
  if (proxy && proxy.indexOf("://") === -1) proxy = proto + "://" + proxy;
  return proxy;
}
//@ chunk-h6b7mazd.js:66125-66442 esm-fingerprint
function shouldProxy(hostname, port) {
  var NO_PROXY = getEnv("no_proxy").toLowerCase();
  if (!NO_PROXY) return true;
  if (NO_PROXY === "*") return false;
  return NO_PROXY.split(/[,\s]/).every(function (proxy) {
    if (!proxy) return true;
    var parsedProxy = proxy.match(/^(.+):(\d+)$/);
    var parsedProxyHostname = parsedProxy ? parsedProxy[1] : proxy;
    var parsedProxyPort = parsedProxy ? parseInt(parsedProxy[2]) : 0;
    if (parsedProxyPort && parsedProxyPort !== port) return true;
    if (!/^[.*]/.test(parsedProxyHostname)) return hostname !== parsedProxyHostname;
    if (parsedProxyHostname.charAt(0) === "*") parsedProxyHostname = parsedProxyHostname.slice(1);
    return !hostname.endsWith(parsedProxyHostname);
  });
}
//@ chunk-h6b7mazd.js:66442-66527 esm-fingerprint
function getEnv(key) {
  return process.env[key.toLowerCase()] || process.env[key.toUpperCase()] || "";
}
//@ chunk-h6b7mazd.js:66527-66545 esm-layout
var import_follow_redirects = Re(require_follow_redirects(), 1);
//@ chunk-h6b7mazd.js:66684-66700 esm-fingerprint
var ve = "1.15.2";
//@ chunk-h6b7mazd.js:66700-66776 esm-fingerprint
function parseProtocol(url) {
  let match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
  return (match && match[1]) || "";
}
//@ chunk-h6b7mazd.js:66776-66831 esm-fingerprint
var DATA_URL_PATTERN = /^(?:([^;]+);)?(?:[^;]+;)?(base64|),([\s\S]*)$/;
//@ chunk-h6b7mazd.js:66831-67268 esm-fingerprint
function fromDataURI(uri, asBlob, options) {
  let _Blob = (options && options.Blob) || platform.classes.Blob;
  let protocol = parseProtocol(uri);
  if (asBlob === undefined && _Blob) asBlob = true;
  if (protocol === "data") {
    uri = protocol.length ? uri.slice(protocol.length + 1) : uri;
    let match = DATA_URL_PATTERN.exec(uri);
    if (!match) throw new AxiosError$1("Invalid URL", AxiosError$1.ERR_INVALID_URL);
    let mime = match[1];
    let isBase64 = match[2];
    let body = match[3];
    let buffer = Buffer.from(decodeURIComponent(body), isBase64 ? "base64" : "utf8");
    if (asBlob) {
      if (!_Blob) throw new AxiosError$1("Blob is not supported", AxiosError$1.ERR_NOT_SUPPORT);
      return new _Blob([buffer], {
        type: mime,
      });
    }
    return buffer;
  }
  throw new AxiosError$1("Unsupported protocol " + protocol, AxiosError$1.ERR_NOT_SUPPORT);
}
//@ chunk-h6b7mazd.js:67314-67341 esm-fingerprint
var kInternals = Symbol("internals");
//@ chunk-h6b7mazd.js:67341-68691 esm-fingerprint
class AxiosTransformStream extends stream.Transform {
  constructor(options) {
    options = utils$1.toFlatObject(
      options,
      {
        maxRate: 0,
        chunkSize: 65536,
        minChunkSize: 100,
        timeWindow: 500,
        ticksRate: 2,
        samplesCount: 15,
      },
      null,
      (prop, source) => !utils$1.isUndefined(source[prop]),
    );
    super({
      readableHighWaterMark: options.chunkSize,
    });
    let internals = (this[kInternals] = {
      timeWindow: options.timeWindow,
      chunkSize: options.chunkSize,
      maxRate: options.maxRate,
      minChunkSize: options.minChunkSize,
      bytesSeen: 0,
      isCaptured: false,
      notifiedBytesLoaded: 0,
      ts: Date.now(),
      bytes: 0,
      onReadCallback: null,
    });
    this.on("newListener", (event) => {
      if (event === "progress") {
        if (!internals.isCaptured) internals.isCaptured = true;
      }
    });
  }
  _read(size) {
    let internals = this[kInternals];
    if (internals.onReadCallback) internals.onReadCallback();
    return super._read(size);
  }
  _transform(chunk, encoding, callback) {
    let internals = this[kInternals];
    let maxRate = internals.maxRate;
    let readableHighWaterMark = this.readableHighWaterMark;
    let timeWindow = internals.timeWindow;
    let divider = 1000 / timeWindow;
    let bytesThreshold = maxRate / divider;
    let minChunkSize =
      internals.minChunkSize !== false ? Math.max(internals.minChunkSize, bytesThreshold * 0.01) : 0;
    let pushChunk = (_chunk, _callback) => {
      let bytes = Buffer.byteLength(_chunk);
      internals.bytesSeen += bytes;
      internals.bytes += bytes;
      if (internals.isCaptured) this.emit("progress", internals.bytesSeen);
      if (this.push(_chunk)) process.nextTick(_callback);
      else
        internals.onReadCallback = () => {
          internals.onReadCallback = null;
          process.nextTick(_callback);
        };
    };
    let transformChunk = (_chunk, _callback) => {
      let chunkSize = Buffer.byteLength(_chunk);
      let chunkRemainder = null;
      let maxChunkSize = readableHighWaterMark;
      let bytesLeft;
      let passed = 0;
      if (maxRate) {
        let now = Date.now();
        if (!internals.ts || (passed = now - internals.ts) >= timeWindow) {
          internals.ts = now;
          bytesLeft = bytesThreshold - internals.bytes;
          internals.bytes = bytesLeft < 0 ? -bytesLeft : 0;
          passed = 0;
        }
        bytesLeft = bytesThreshold - internals.bytes;
      }
      if (maxRate) {
        if (bytesLeft <= 0)
          return setTimeout(() => {
            _callback(null, _chunk);
          }, timeWindow - passed);
        if (bytesLeft < maxChunkSize) maxChunkSize = bytesLeft;
      }
      if (maxChunkSize && chunkSize > maxChunkSize && chunkSize - maxChunkSize > minChunkSize) {
        chunkRemainder = _chunk.subarray(maxChunkSize);
        _chunk = _chunk.subarray(0, maxChunkSize);
      }
      pushChunk(
        _chunk,
        chunkRemainder
          ? () => {
              process.nextTick(_callback, null, chunkRemainder);
            }
          : _callback,
      );
    };
    transformChunk(chunk, function transformNextChunk(err, _chunk) {
      if (err) return callback(err);
      if (_chunk) transformChunk(_chunk, transformNextChunk);
      else callback(null);
    });
  }
}
//@ chunk-h6b7mazd.js:68691-68701 esm-layout
var AxiosTransformStream_default = AxiosTransformStream;
//@ chunk-h6b7mazd.js:68796-68974 esm-fingerprint
var { asyncIterator } = Symbol;
var Df = async function* (blob) {
  if (blob.stream) yield* blob.stream();
  else if (blob.arrayBuffer) yield await blob.arrayBuffer();
  else if (blob[asyncIterator]) yield* blob[asyncIterator]();
  else yield blob;
};
var jt = Df;
//@ chunk-h6b7mazd.js:68974-69110 esm-fingerprint
var BOUNDARY_ALPHABET = platform.ALPHABET.ALPHA_DIGIT + "-_";
var textEncoder = typeof TextEncoder === "function" ? new TextEncoder() : new util.TextEncoder();
var CRLF = `\r
`;
var CRLF_BYTES = textEncoder.encode(CRLF);
var CRLF_BYTES_COUNT = 2;
//@ chunk-h6b7mazd.js:69110-69808 esm-fingerprint
class FormDataPart {
  constructor(name, value) {
    let { escapeName } = this.constructor;
    let isStringValue = utils$1.isString(value);
    let headers = `Content-Disposition: form-data; name="${escapeName(name)}"${!isStringValue && value.name ? `; filename="${escapeName(value.name)}"` : ""}${CRLF}`;
    if (isStringValue) value = textEncoder.encode(String(value).replace(/\r?\n|\r\n?/g, CRLF));
    else {
      let safeType = String(value.type || "application/octet-stream").replace(/[\r\n]/g, "");
      headers += `Content-Type: ${safeType}${CRLF}`;
    }
    this.headers = textEncoder.encode(headers + CRLF);
    this.contentLength = isStringValue ? value.byteLength : value.size;
    this.size = this.headers.byteLength + this.contentLength + CRLF_BYTES_COUNT;
    this.name = name;
    this.value = value;
  }
  async *encode() {
    yield this.headers;
    let { value } = this;
    if (utils$1.isTypedArray(value)) yield value;
    else yield* jt(value);
    yield CRLF_BYTES;
  }
  static escapeName(name) {
    return String(name).replace(
      /[\r\n"]/g,
      (match) =>
        ({
          "\r": "%0D",
          "\n": "%0A",
          '"': "%22",
        })[match],
    );
  }
}
//@ chunk-h6b7mazd.js:69808-70460 esm-fingerprint
var formDataToStream = (form, headersHandler, options) => {
  let {
    tag = "form-data-boundary",
    size = 25,
    boundary = tag + "-" + platform.generateString(size, BOUNDARY_ALPHABET),
  } = options || {};
  if (!utils$1.isFormData(form)) throw TypeError("FormData instance required");
  if (boundary.length < 1 || boundary.length > 70) throw Error("boundary must be 10-70 characters long");
  let boundaryBytes = textEncoder.encode("--" + boundary + CRLF);
  let footerBytes = textEncoder.encode("--" + boundary + "--" + CRLF);
  let contentLength = footerBytes.byteLength;
  let parts = Array.from(form.entries()).map(([name, value]) => {
    let part = new FormDataPart(name, value);
    contentLength += part.size;
    return part;
  });
  contentLength += boundaryBytes.byteLength * parts.length;
  contentLength = utils$1.toFiniteNumber(contentLength);
  let computedHeaders = {
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
  };
  if (Number.isFinite(contentLength)) computedHeaders["Content-Length"] = contentLength;
  if (headersHandler) headersHandler(computedHeaders);
  return Readable.from(
    (async function* () {
      for (let part of parts) {
        yield boundaryBytes;
        yield* part.encode();
      }
      yield footerBytes;
    })(),
  );
};
var formDataToStream_default = formDataToStream;
//@ chunk-h6b7mazd.js:70483-70713 esm-fingerprint
class ZlibHeaderTransformStream extends stream.Transform {
  __transform(chunk, encoding, callback) {
    this.push(chunk);
    callback();
  }
  _transform(chunk, encoding, callback) {
    if (chunk.length !== 0) {
      this._transform = this.__transform;
      if (chunk[0] !== 120) {
        let header = Buffer.alloc(2);
        header[0] = 120;
        header[1] = 156;
        this.push(header, encoding);
      }
    }
    this.__transform(chunk, encoding, callback);
  }
}
//@ chunk-h6b7mazd.js:70713-70723 esm-layout
var ZlibHeaderTransformStream_default = ZlibHeaderTransformStream;
//@ chunk-h6b7mazd.js:70723-70868 esm-fingerprint
var callbackify = (fn, reducer) =>
  utils$1.isAsyncFn(fn)
    ? function (...args) {
        let cb = args.pop();
        fn.apply(this, args).then((value) => {
          try {
            if (reducer) cb(null, ...reducer(value));
            else cb(null, value);
          } catch (error) {
            cb(error);
          }
        }, cb);
      }
    : fn;
var callbackify_default = callbackify;
//@ chunk-h6b7mazd.js:70868-71973 esm-fingerprint
var LOOPBACK_HOSTNAMES = new Set(["localhost"]);
var isIPv4Loopback = (host) => {
  let parts = host.split(".");
  if (parts.length !== 4) return false;
  if (parts[0] !== "127") return false;
  return parts.every((p) => /^\d+$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
};
var isIPv6Loopback = (host) => {
  if (host === "::1") return true;
  let v4MappedDotted = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (v4MappedDotted) return isIPv4Loopback(v4MappedDotted[1]);
  let v4MappedHex = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (v4MappedHex) {
    let high = parseInt(v4MappedHex[1], 16);
    return high >= 32512 && high <= 32767;
  }
  let groups = host.split(":");
  if (groups.length === 8) {
    for (let i = 0; i < 7; i++) if (!/^0+$/.test(groups[i])) return false;
    return /^0*1$/.test(groups[7]);
  }
  return false;
};
var isLoopback = (host) => {
  if (!host) return false;
  if (LOOPBACK_HOSTNAMES.has(host)) return true;
  if (isIPv4Loopback(host)) return true;
  return isIPv6Loopback(host);
};
var DEFAULT_PORTS = {
  http: 80,
  https: 443,
  ws: 80,
  wss: 443,
  ftp: 21,
};
var parseNoProxyEntry = (entry) => {
  let entryHost = entry;
  let entryPort = 0;
  if (entryHost.charAt(0) === "[") {
    let bracketIndex = entryHost.indexOf("]");
    if (bracketIndex !== -1) {
      let host = entryHost.slice(1, bracketIndex);
      let rest = entryHost.slice(bracketIndex + 1);
      if (rest.charAt(0) === ":" && /^\d+$/.test(rest.slice(1)))
        entryPort = Number.parseInt(rest.slice(1), 10);
      return [host, entryPort];
    }
  }
  let firstColon = entryHost.indexOf(":");
  let lastColon = entryHost.lastIndexOf(":");
  if (firstColon !== -1 && firstColon === lastColon && /^\d+$/.test(entryHost.slice(lastColon + 1))) {
    entryPort = Number.parseInt(entryHost.slice(lastColon + 1), 10);
    entryHost = entryHost.slice(0, lastColon);
  }
  return [entryHost, entryPort];
};
var normalizeNoProxyHost = (hostname) => {
  if (!hostname) return hostname;
  if (hostname.charAt(0) === "[" && hostname.charAt(hostname.length - 1) === "]")
    hostname = hostname.slice(1, -1);
  return hostname.replace(/\.+$/, "");
};
//@ chunk-h6b7mazd.js:71973-72447 esm-fingerprint
function shouldBypassProxy(location) {
  let parsed;
  try {
    parsed = new URL(location);
  } catch (_err) {
    return false;
  }
  let noProxy = (process.env.no_proxy || process.env.NO_PROXY || "").toLowerCase();
  if (!noProxy) return false;
  if (noProxy === "*") return true;
  let port = Number.parseInt(parsed.port, 10) || DEFAULT_PORTS[parsed.protocol.split(":", 1)[0]] || 0;
  let hostname = normalizeNoProxyHost(parsed.hostname.toLowerCase());
  return noProxy.split(/[\s,]+/).some((entry) => {
    if (!entry) return false;
    let [entryHost, entryPort] = parseNoProxyEntry(entry);
    entryHost = normalizeNoProxyHost(entryHost);
    if (!entryHost) return false;
    if (entryPort && entryPort !== port) return false;
    if (entryHost.charAt(0) === "*") entryHost = entryHost.slice(1);
    if (entryHost.charAt(0) === ".") return hostname.endsWith(entryHost);
    return hostname === entryHost || (isLoopback(hostname) && isLoopback(entryHost));
  });
}
//@ chunk-h6b7mazd.js:72447-72731 esm-fingerprint
function Jf(samplesCount, min) {
  samplesCount = samplesCount || 10;
  let bytes = Array(samplesCount);
  let timestamps = Array(samplesCount);
  let head = 0;
  let tail = 0;
  let firstSampleTS;
  min = min !== undefined ? min : 1000;
  return function (chunkLength) {
    let now = Date.now();
    let startedAt = timestamps[tail];
    if (!firstSampleTS) firstSampleTS = now;
    bytes[head] = chunkLength;
    timestamps[head] = now;
    let i = tail;
    let bytesCount = 0;
    while (i !== head) {
      bytesCount += bytes[i++];
      i = i % samplesCount;
    }
    head = (head + 1) % samplesCount;
    if (head === tail) tail = (tail + 1) % samplesCount;
    if (now - firstSampleTS < min) return;
    let passed = startedAt && now - startedAt;
    return passed ? Math.round((bytesCount * 1000) / passed) : undefined;
  };
}
//@ chunk-h6b7mazd.js:72731-72741 esm-layout
var ci = Jf;
//@ chunk-h6b7mazd.js:72741-72967 esm-fingerprint
function Kf(fn, freq) {
  let timestamp = 0;
  let threshold = 1000 / freq;
  let lastArgs;
  let timer;
  let invoke = (args, now = Date.now()) => {
    timestamp = now;
    lastArgs = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn(...args);
  };
  return [
    (...args) => {
      let now = Date.now();
      let passed = now - timestamp;
      if (passed >= threshold) invoke(args, now);
      else {
        lastArgs = args;
        if (!timer)
          timer = setTimeout(() => {
            timer = null;
            invoke(lastArgs);
          }, threshold - passed);
      }
    },
    () => lastArgs && invoke(lastArgs),
  ];
}
//@ chunk-h6b7mazd.js:72967-72977 esm-layout
var fi = Kf;
//@ chunk-h6b7mazd.js:72977-73446 esm-fingerprint
var progressEventReducer = (listener, isDownloadStream, freq = 3) => {
  let bytesNotified = 0;
  let _speedometer = ci(50, 250);
  return fi((e) => {
    let rawLoaded = e.loaded;
    let total = e.lengthComputable ? e.total : undefined;
    let loaded = total != null ? Math.min(rawLoaded, total) : rawLoaded;
    let progressBytes = Math.max(0, loaded - bytesNotified);
    let rate = _speedometer(progressBytes);
    bytesNotified = Math.max(bytesNotified, loaded);
    let data = {
      loaded,
      total,
      progress: total ? loaded / total : undefined,
      bytes: progressBytes,
      rate: rate ? rate : undefined,
      estimated: rate && total ? (total - loaded) / rate : undefined,
      event: e,
      lengthComputable: total != null,
      [isDownloadStream ? "download" : "upload"]: true,
    };
    listener(data);
  }, freq);
};
var progressEventDecorator = (total, throttled) => {
  let lengthComputable = total != null;
  return [
    (loaded) =>
      throttled[0]({
        lengthComputable,
        total,
        loaded,
      }),
    throttled[1],
  ];
};
var Ge =
  (fn) =>
  (...args) =>
    utils$1.asap(() => fn(...args));
//@ chunk-h6b7mazd.js:73446-74175 esm-fingerprint
function estimateDataURLDecodedBytes(url) {
  if (!url || typeof url !== "string") return 0;
  if (!url.startsWith("data:")) return 0;
  let comma = url.indexOf(",");
  if (comma < 0) return 0;
  let meta = url.slice(5, comma);
  let body = url.slice(comma + 1);
  if (/;base64/i.test(meta)) {
    let { length: effectiveLen, length: len } = body;
    for (let i = 0; i < len; i++)
      if (body.charCodeAt(i) === 37 && i + 2 < len) {
        let a = body.charCodeAt(i + 1);
        let b = body.charCodeAt(i + 2);
        if (
          ((a >= 48 && a <= 57) || (a >= 65 && a <= 70) || (a >= 97 && a <= 102)) &&
          ((b >= 48 && b <= 57) || (b >= 65 && b <= 70) || (b >= 97 && b <= 102))
        ) {
          effectiveLen -= 2;
          i += 2;
        }
      }
    let pad = 0;
    let idx = len - 1;
    let tailIsPct3D = (j) =>
      j >= 2 &&
      body.charCodeAt(j - 2) === 37 &&
      body.charCodeAt(j - 1) === 51 &&
      (body.charCodeAt(j) === 68 || body.charCodeAt(j) === 100);
    if (idx >= 0) {
      if (body.charCodeAt(idx) === 61) {
        pad++;
        idx--;
      } else if (tailIsPct3D(idx)) {
        pad++;
        idx -= 3;
      }
    }
    if (pad === 1 && idx >= 0) {
      if (body.charCodeAt(idx) === 61) pad++;
      else if (tailIsPct3D(idx)) pad++;
    }
    let bytes = Math.floor(effectiveLen / 4) * 3 - (pad || 0);
    return bytes > 0 ? bytes : 0;
  }
  return Buffer.byteLength(body, "utf8");
}
//@ chunk-h6b7mazd.js:74175-74586 esm-fingerprint
var zlibOptions = {
  flush: zlib.constants.Z_SYNC_FLUSH,
  finishFlush: zlib.constants.Z_SYNC_FLUSH,
};
var brotliOptions = {
  flush: zlib.constants.BROTLI_OPERATION_FLUSH,
  finishFlush: zlib.constants.BROTLI_OPERATION_FLUSH,
};
var isBrotliSupported = utils$1.isFunction(zlib.createBrotliDecompress);
var { http: httpFollow, https: httpsFollow } = import_follow_redirects.default;
var isHttps = /https:?/;
var kAxiosSocketListener = Symbol("axios.http.socketListener");
var kAxiosCurrentReq = Symbol("axios.http.currentReq");
var supportedProtocols = platform.protocols.map((protocol) => protocol + ":");
var flushOnFinish = (stream, [throttled, flush]) => {
  stream.on("end", flush).on("error", flush);
  return throttled;
};
export {
  hasBrowserEnv,
  hasStandardBrowserEnv,
  hasStandardBrowserWebWorkerEnv,
  _navigator,
  origin,
  platform,
  AxiosHeaders_default,
  _e,
  settle,
  progressEventReducer,
  CanceledError_default,
  parseProtocol,
  progressEventDecorator,
  Ge,
  transformData,
  defaults_default,
  isCancel_2,
  ve,
  Ft,
  getProxyForUrl,
  shouldBypassProxy,
  callbackify_default,
  supportedProtocols,
  estimateDataURLDecodedBytes,
  fromDataURI,
  formDataToStream_default,
  jt,
  AxiosTransformStream_default,
  flushOnFinish,
  isBrotliSupported,
  isHttps,
  httpsFollow,
  httpFollow,
  zlibOptions,
  ZlibHeaderTransformStream_default,
  brotliOptions,
  kAxiosSocketListener,
  kAxiosCurrentReq,
};
