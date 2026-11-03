/**
 * axios/dist/node/axios.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: axios@1.15.2
 * pieces: chunk-h6b7mazd.js (67)
 * attribution: esm-fingerprint 52, esm-layout 15
 */
import url from "url";
import yc from "crypto";
import stream, { Readable, default as stream_2, default as stream_3 } from "stream";
import util, { default as util_2 } from "util";
import zlib from "zlib";
import { Pt, Rr, de, u, he, y } from "../esm/axios.js";
import { Re } from "../../../../runtime/bun-runtime.js";
import { Qs } from "../../../follow-redirects/index.js";

//@ chunk-h6b7mazd.js:57260-57286 esm-fingerprint
var vs = url.URLSearchParams;
//@ chunk-h6b7mazd.js:57286-57692 esm-fingerprint
var ABCDEFGHIJKLMNOPQRSTUVWXYZ = "abcdefghijklmnopqrstuvwxyz",
  Ts = "0123456789",
  Ps = {
    DIGIT: Ts,
    ALPHA: ABCDEFGHIJKLMNOPQRSTUVWXYZ,
    ALPHA_DIGIT: ABCDEFGHIJKLMNOPQRSTUVWXYZ + ABCDEFGHIJKLMNOPQRSTUVWXYZ.toUpperCase() + Ts,
  },
  bc = (e = 16, t = Ps.ALPHA_DIGIT) => {
    let r = "",
      { length: n } = t,
      uint32Array = new Uint32Array(e);
    yc.randomFillSync(uint32Array);
    for (let s = 0; s < e; s++) r += t[uint32Array[s] % n];
    return r;
  },
  Fs = {
    isNode: !0,
    classes: { URLSearchParams: vs, FormData: Pt, Blob: (typeof Blob < "u" && Blob) || null },
    ALPHABET: Ps,
    generateString: bc,
    protocols: ["http", "https", "file", "data"],
  };
//@ chunk-h6b7mazd.js:57692-58023 esm-layout
var Er = typeof window < "u" && typeof document < "u",
  gr = (typeof navigator === "object" && navigator) || void 0,
  gc = Er && (!gr || ["ReactNative", "NativeScript", "NS"].indexOf(gr.product) < 0),
  Ec = (() =>
    typeof WorkerGlobalScope < "u" &&
    self instanceof WorkerGlobalScope &&
    typeof self.importScripts === "function")(),
  Rc = (Er && window.location.href) || "http://localhost";
//@ chunk-h6b7mazd.js:58023-58043 esm-layout
var O = { ...Rr, ...Fs };
//@ chunk-h6b7mazd.js:58043-58256 esm-fingerprint
function wr(e, t) {
  return de(e, new O.classes.URLSearchParams(), {
    visitor: function (r, n, o, s) {
      if (O.isNode && u.isBuffer(r)) return (this.append(n, r.toString("base64")), !1);
      return s.defaultVisitor.apply(this, arguments);
    },
    ...t,
  });
}
//@ chunk-h6b7mazd.js:58256-58344 esm-fingerprint
function wc(e) {
  return u.matchAll(/\w+|\[(\w*)]/g, e).map((t) => (t[0] === "[]" ? "" : t[1] || t[0]));
}
//@ chunk-h6b7mazd.js:58344-58442 esm-layout
function xc(e) {
  let t = {},
    keys = Object.keys(e),
    n,
    o = keys.length,
    s;
  for (n = 0; n < o; n++) ((s = keys[n]), (t[s] = e[s]));
  return t;
}
//@ chunk-h6b7mazd.js:58442-58891 esm-fingerprint
function _c(e) {
  function t(r, n, o, s) {
    let i = r[s++];
    if (i === "__proto__") return !0;
    let a = Number.isFinite(+i),
      l = s >= r.length;
    if (((i = !i && u.isArray(o) ? o.length : i), l)) {
      if (u.hasOwnProp(o, i)) o[i] = u.isArray(o[i]) ? o[i].concat(n) : [o[i], n];
      else o[i] = n;
      return !a;
    }
    if (!o[i] || !u.isObject(o[i])) o[i] = [];
    if (t(r, n, o[i], s) && u.isArray(o[i])) o[i] = xc(o[i]);
    return !a;
  }
  if (u.isFormData(e) && u.isFunction(e.entries)) {
    let r = {};
    return (
      u.forEachEntry(e, (n, o) => {
        t(wc(n), o, r, 0);
      }),
      r
    );
  }
  return null;
}
//@ chunk-h6b7mazd.js:58891-58901 esm-layout
var Ft = _c;
//@ chunk-h6b7mazd.js:58901-58954 esm-fingerprint
var Me = (e, t) => (e != null && u.hasOwnProp(e, t) ? e[t] : void 0);
//@ chunk-h6b7mazd.js:58954-59101 esm-fingerprint
function Sc(e, t, r) {
  if (u.isString(e))
    try {
      return ((t || JSON.parse)(e), u.trim(e));
    } catch (error) {
      if (error.name !== "SyntaxError") throw error;
    }
  return (r || JSON.stringify)(e);
}
//@ chunk-h6b7mazd.js:59101-60693 esm-fingerprint
var xr = {
  transitional: he,
  adapter: ["xhr", "http", "fetch"],
  transformRequest: [
    function (t, r) {
      let n = r.getContentType() || "",
        o = n.indexOf("application/json") > -1,
        isObject = u.isObject(t);
      if (isObject && u.isHTMLForm(t)) t = new FormData(t);
      if (u.isFormData(t)) return o ? JSON.stringify(Ft(t)) : t;
      if (
        u.isArrayBuffer(t) ||
        u.isBuffer(t) ||
        u.isStream(t) ||
        u.isFile(t) ||
        u.isBlob(t) ||
        u.isReadableStream(t)
      )
        return t;
      if (u.isArrayBufferView(t)) return t.buffer;
      if (u.isURLSearchParams(t))
        return (r.setContentType("application/x-www-form-urlencoded;charset=utf-8", !1), t.toString());
      let a;
      if (isObject) {
        let l = Me(this, "formSerializer");
        if (n.indexOf("application/x-www-form-urlencoded") > -1) return wr(t, l).toString();
        if ((a = u.isFileList(t)) || n.indexOf("multipart/form-data") > -1) {
          let f = Me(this, "env"),
            c = f && f.FormData;
          return de(a ? { "files[]": t } : t, c && new c(), l);
        }
      }
      if (isObject || o) return (r.setContentType("application/json", !1), Sc(t));
      return t;
    },
  ],
  transformResponse: [
    function (t) {
      let r = Me(this, "transitional") || xr.transitional,
        n = r && r.forcedJSONParsing,
        o = Me(this, "responseType"),
        s = o === "json";
      if (u.isResponse(t) || u.isReadableStream(t)) return t;
      if (t && u.isString(t) && ((n && !o) || s)) {
        let a = !(r && r.silentJSONParsing) && s;
        try {
          return JSON.parse(t, Me(this, "parseReviver"));
        } catch (error) {
          if (a) {
            if (error.name === "SyntaxError")
              throw y.from(error, y.ERR_BAD_RESPONSE, this, null, Me(this, "response"));
            throw error;
          }
        }
      }
      return t;
    },
  ],
  timeout: 0,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  maxContentLength: -1,
  maxBodyLength: -1,
  env: { FormData: O.classes.FormData, Blob: O.classes.Blob },
  validateStatus: function (t) {
    return t >= 200 && t < 300;
  },
  headers: { common: { Accept: "application/json, text/plain, */*", "Content-Type": void 0 } },
};
//@ chunk-h6b7mazd.js:60693-60773 esm-fingerprint
u.forEach(["delete", "get", "head", "post", "put", "patch"], (e) => {
  xr.headers[e] = {};
});
//@ chunk-h6b7mazd.js:60773-60783 esm-layout
var He = xr;
//@ chunk-h6b7mazd.js:60783-61300 esm-fingerprint
var toObjectSet = u.toObjectSet([
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
  ]),
  Ls = (e) => {
    let t = {},
      r,
      n,
      o;
    return (
      e &&
        e
          .split(
            `
`,
          )
          .forEach(function (i) {
            if (
              ((o = i.indexOf(":")),
              (r = i.substring(0, o).trim().toLowerCase()),
              (n = i.substring(o + 1).trim()),
              !r || (t[r] && toObjectSet[r]))
            )
              return;
            if (r === "set-cookie")
              if (t[r]) t[r].push(n);
              else t[r] = [n];
            else t[r] = t[r] ? t[r] + ", " + n : n;
          }),
      t
    );
  };
//@ chunk-h6b7mazd.js:61300-61359 esm-fingerprint
var Bs = Symbol("internals"),
  Oc = /[^\x09\x20-\x7E\x80-\xFF]/g;
//@ chunk-h6b7mazd.js:61359-61559 esm-fingerprint
function Cc(e) {
  let t = 0,
    r = e.length;
  while (t < r) {
    let code = e.charCodeAt(t);
    if (code !== 9 && code !== 32) break;
    t += 1;
  }
  while (r > t) {
    let code = e.charCodeAt(r - 1);
    if (code !== 9 && code !== 32) break;
    r -= 1;
  }
  return t === 0 && r === e.length ? e : e.slice(t, r);
}
//@ chunk-h6b7mazd.js:61559-61615 esm-fingerprint
function nt(e) {
  return e && String(e).trim().toLowerCase();
}
//@ chunk-h6b7mazd.js:61615-61658 esm-layout
function vc(e) {
  return Cc(e.replace(Oc, ""));
}
//@ chunk-h6b7mazd.js:61658-61745 esm-fingerprint
function Lt(e) {
  if (e === !1 || e == null) return e;
  return u.isArray(e) ? e.map(Lt) : vc(String(e));
}
//@ chunk-h6b7mazd.js:61745-61865 esm-fingerprint
function Tc(e) {
  let create = Object.create(null),
    r = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g,
    n;
  while ((n = r.exec(e))) create[n[1]] = n[2];
  return create;
}
//@ chunk-h6b7mazd.js:61865-61925 esm-fingerprint
var Pc = (e) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(e.trim());
//@ chunk-h6b7mazd.js:61925-62101 esm-fingerprint
function _r(e, t, r, n, o) {
  if (u.isFunction(n)) return n.call(this, t, r);
  if (o) t = r;
  if (!u.isString(t)) return;
  if (u.isString(n)) return t.indexOf(n) !== -1;
  if (u.isRegExp(n)) return n.test(t);
}
//@ chunk-h6b7mazd.js:62101-62200 esm-fingerprint
function Fc(e) {
  return e
    .trim()
    .toLowerCase()
    .replace(/([a-z\d])(\w*)/g, (t, r, n) => r.toUpperCase() + n);
}
//@ chunk-h6b7mazd.js:62200-62384 esm-fingerprint
function Lc(e, t) {
  let toCamelCase = u.toCamelCase(" " + t);
  ["get", "set", "has"].forEach((n) => {
    Object.defineProperty(e, n + toCamelCase, {
      value: function (o, s, i) {
        return this[n].call(this, t, o, s, i);
      },
      configurable: !0,
    });
  });
}
//@ chunk-h6b7mazd.js:62384-64623 esm-fingerprint
class ot {
  constructor(e) {
    e && this.set(e);
  }
  set(e, t, r) {
    let n = this;
    function o(i, a, l) {
      let f = nt(a);
      if (!f) throw Error("header name must be a non-empty string");
      let key = u.findKey(n, f);
      if (!key || n[key] === void 0 || l === !0 || (l === void 0 && n[key] !== !1)) n[key || a] = Lt(i);
    }
    let s = (i, a) => u.forEach(i, (l, f) => o(l, f, a));
    if (u.isPlainObject(e) || e instanceof this.constructor) s(e, t);
    else if (u.isString(e) && (e = e.trim()) && !Pc(e)) s(Ls(e), t);
    else if (u.isObject(e) && u.isIterable(e)) {
      let i = {},
        a,
        l;
      for (let f of e) {
        if (!u.isArray(f)) throw TypeError("Object iterator must return a key-value pair");
        i[(l = f[0])] = (a = i[l]) ? (u.isArray(a) ? [...a, f[1]] : [a, f[1]]) : f[1];
      }
      s(i, t);
    } else e != null && o(t, e, r);
    return this;
  }
  get(e, t) {
    if (((e = nt(e)), e)) {
      let key = u.findKey(this, e);
      if (key) {
        let n = this[key];
        if (!t) return n;
        if (t === !0) return Tc(n);
        if (u.isFunction(t)) return t.call(this, n, key);
        if (u.isRegExp(t)) return t.exec(n);
        throw TypeError("parser must be boolean|regexp|function");
      }
    }
  }
  has(e, t) {
    if (((e = nt(e)), e)) {
      let key = u.findKey(this, e);
      return !!(key && this[key] !== void 0 && (!t || _r(this, this[key], key, t)));
    }
    return !1;
  }
  delete(e, t) {
    let r = this,
      n = !1;
    function o(s) {
      if (((s = nt(s)), s)) {
        let key = u.findKey(r, s);
        if (key && (!t || _r(r, r[key], key, t))) (delete r[key], (n = !0));
      }
    }
    if (u.isArray(e)) e.forEach(o);
    else o(e);
    return n;
  }
  clear(e) {
    let keys = Object.keys(this),
      r = keys.length,
      n = !1;
    while (r--) {
      let o = keys[r];
      if (!e || _r(this, this[o], o, e, !0)) (delete this[o], (n = !0));
    }
    return n;
  }
  normalize(e) {
    let t = this,
      r = {};
    return (
      u.forEach(this, (n, o) => {
        let key = u.findKey(r, o);
        if (key) {
          ((t[key] = Lt(n)), delete t[o]);
          return;
        }
        let i = e ? Fc(o) : String(o).trim();
        if (i !== o) delete t[o];
        ((t[i] = Lt(n)), (r[i] = !0));
      }),
      this
    );
  }
  concat(...e) {
    return this.constructor.concat(this, ...e);
  }
  toJSON(e) {
    let create = Object.create(null);
    return (
      u.forEach(this, (r, n) => {
        r != null && r !== !1 && (create[n] = e && u.isArray(r) ? r.join(", ") : r);
      }),
      create
    );
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON()).map(([e, t]) => e + ": " + t).join(`
`);
  }
  getSetCookie() {
    return this.get("set-cookie") || [];
  }
  get [Symbol.toStringTag]() {
    return "AxiosHeaders";
  }
  static from(e) {
    return e instanceof this ? e : new this(e);
  }
  static concat(e, ...t) {
    let r = new this(e);
    return (t.forEach((n) => r.set(n)), r);
  }
  static accessor(e) {
    let accessors = (this[Bs] = this[Bs] = { accessors: {} }).accessors,
      n = this.prototype;
    function o(s) {
      let i = nt(s);
      if (!accessors[i]) (Lc(n, s), (accessors[i] = !0));
    }
    return (u.isArray(e) ? e.forEach(o) : o(e), this);
  }
}
//@ chunk-h6b7mazd.js:64623-64726 esm-fingerprint
ot.accessor(["Content-Type", "Content-Length", "Accept", "Accept-Encoding", "User-Agent", "Authorization"]);
//@ chunk-h6b7mazd.js:64726-64849 esm-fingerprint
u.reduceDescriptors(ot.prototype, ({ value: e }, t) => {
  let r = t[0].toUpperCase() + t.slice(1);
  return {
    get: () => e,
    set(n) {
      this[r] = n;
    },
  };
});
//@ chunk-h6b7mazd.js:64849-64869 esm-fingerprint
u.freezeMethods(ot);
//@ chunk-h6b7mazd.js:64869-64878 esm-layout
var F = ot;
//@ chunk-h6b7mazd.js:64878-65041 esm-fingerprint
function st(e, t) {
  let r = this || He,
    n = t || r,
    from = F.from(n.headers),
    s = n.data;
  return (
    u.forEach(e, function (a) {
      s = a.call(r, s, from.normalize(), t ? t.status : void 0);
    }),
    from.normalize(),
    s
  );
}
//@ chunk-h6b7mazd.js:65041-65082 esm-fingerprint
function it(e) {
  return !!(e && e.__CANCEL__);
}
//@ chunk-h6b7mazd.js:65082-65213 esm-fingerprint
class CanceledError extends y {
  constructor(e, t, r) {
    super(e == null ? "canceled" : e, y.ERR_CANCELED, t, r);
    ((this.name = "CanceledError"), (this.__CANCEL__ = !0));
  }
}
//@ chunk-h6b7mazd.js:65213-65222 esm-layout
var Q = CanceledError;
//@ chunk-h6b7mazd.js:65222-65453 esm-fingerprint
function ue(e, t, r) {
  let validateStatus = r.config.validateStatus;
  if (!r.status || !validateStatus || validateStatus(r.status)) e(r);
  else
    t(
      new y(
        "Request failed with status code " + r.status,
        [y.ERR_BAD_REQUEST, y.ERR_BAD_RESPONSE][Math.floor(r.status / 100) - 4],
        r.config,
        r.request,
        r,
      ),
    );
}
//@ chunk-h6b7mazd.js:65453-65544 esm-fingerprint
function Sr(e) {
  if (typeof e !== "string") return !1;
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(e);
}
//@ chunk-h6b7mazd.js:65544-65620 esm-fingerprint
function Or(e, t) {
  return t ? e.replace(/\/?\/$/, "") + "/" + t.replace(/^\/+/, "") : e;
}
//@ chunk-h6b7mazd.js:65620-65694 esm-layout
function _e(e, t, r) {
  let n = !Sr(t);
  if (e && (n || r === !1)) return Or(e, t);
  return t;
}
//@ chunk-h6b7mazd.js:65694-65752 esm-fingerprint
var Bc = { ftp: 21, gopher: 70, http: 80, https: 443, ws: 80, wss: 443 };
//@ chunk-h6b7mazd.js:65752-65808 esm-layout
function Nc(e) {
  try {
    return new URL(e);
  } catch {
    return null;
  }
}
//@ chunk-h6b7mazd.js:65808-66125 esm-fingerprint
function Ds(e) {
  var t = (typeof e === "string" ? Nc(e) : e) || {},
    { protocol: protocol, host: host, port: port } = t;
  if (typeof host !== "string" || !host || typeof protocol !== "string") return "";
  if (
    ((protocol = protocol.split(":", 1)[0]),
    (host = host.replace(/:\d*$/, "")),
    (port = parseInt(port) || Bc[protocol] || 0),
    !Dc(host, port))
  )
    return "";
  var s = Cr(protocol + "_proxy") || Cr("all_proxy");
  if (s && s.indexOf("://") === -1) s = protocol + "://" + s;
  return s;
}
//@ chunk-h6b7mazd.js:66125-66442 esm-fingerprint
function Dc(e, t) {
  var lower = Cr("no_proxy").toLowerCase();
  if (!lower) return !0;
  if (lower === "*") return !1;
  return lower.split(/[,\s]/).every(function (n) {
    if (!n) return !0;
    var match = n.match(/^(.+):(\d+)$/),
      s = match ? match[1] : n,
      i = match ? parseInt(match[2]) : 0;
    if (i && i !== t) return !0;
    if (!/^[.*]/.test(s)) return e !== s;
    if (s.charAt(0) === "*") s = s.slice(1);
    return !e.endsWith(s);
  });
}
//@ chunk-h6b7mazd.js:66442-66527 esm-fingerprint
function Cr(e) {
  return process.env[e.toLowerCase()] || process.env[e.toUpperCase()] || "";
}
//@ chunk-h6b7mazd.js:66527-66545 esm-layout
var Ri = Re(Qs(), 1);
//@ chunk-h6b7mazd.js:66684-66700 esm-fingerprint
var ve = "1.15.2";
//@ chunk-h6b7mazd.js:66700-66776 esm-fingerprint
function lt(e) {
  let match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(e);
  return (match && match[1]) || "";
}
//@ chunk-h6b7mazd.js:66776-66831 esm-fingerprint
var Bf = /^(?:([^;]+);)?(?:[^;]+;)?(base64|),([\s\S]*)$/;
//@ chunk-h6b7mazd.js:66831-67268 esm-fingerprint
function Vr(e, t, r) {
  let n = (r && r.Blob) || O.classes.Blob,
    o = lt(e);
  if (t === void 0 && n) t = !0;
  if (o === "data") {
    e = o.length ? e.slice(o.length + 1) : e;
    let match = Bf.exec(e);
    if (!match) throw new y("Invalid URL", y.ERR_INVALID_URL);
    let i = match[1],
      a = match[2],
      l = match[3],
      buffer = Buffer.from(decodeURIComponent(l), a ? "base64" : "utf8");
    if (t) {
      if (!n) throw new y("Blob is not supported", y.ERR_NOT_SUPPORT);
      return new n([buffer], { type: i });
    }
    return buffer;
  }
  throw new y("Unsupported protocol " + o, y.ERR_NOT_SUPPORT);
}
//@ chunk-h6b7mazd.js:67314-67341 esm-fingerprint
var Wr = Symbol("internals");
//@ chunk-h6b7mazd.js:67341-68691 esm-fingerprint
class Zs extends stream_2.Transform {
  constructor(e) {
    e = u.toFlatObject(
      e,
      { maxRate: 0, chunkSize: 65536, minChunkSize: 100, timeWindow: 500, ticksRate: 2, samplesCount: 15 },
      null,
      (r, n) => !u.isUndefined(n[r]),
    );
    super({ readableHighWaterMark: e.chunkSize });
    let t = (this[Wr] = {
      timeWindow: e.timeWindow,
      chunkSize: e.chunkSize,
      maxRate: e.maxRate,
      minChunkSize: e.minChunkSize,
      bytesSeen: 0,
      isCaptured: !1,
      notifiedBytesLoaded: 0,
      ts: Date.now(),
      bytes: 0,
      onReadCallback: null,
    });
    this.on("newListener", (r) => {
      if (r === "progress") {
        if (!t.isCaptured) t.isCaptured = !0;
      }
    });
  }
  _read(e) {
    let t = this[Wr];
    if (t.onReadCallback) t.onReadCallback();
    return super._read(e);
  }
  _transform(e, t, r) {
    let n = this[Wr],
      maxRate = n.maxRate,
      readableHighWaterMark = this.readableHighWaterMark,
      timeWindow = n.timeWindow,
      a = 1000 / timeWindow,
      l = maxRate / a,
      f = n.minChunkSize !== !1 ? Math.max(n.minChunkSize, l * 0.01) : 0,
      c = (d, b) => {
        let byteLength = Buffer.byteLength(d);
        if (
          ((n.bytesSeen += byteLength),
          (n.bytes += byteLength),
          n.isCaptured && this.emit("progress", n.bytesSeen),
          this.push(d))
        )
          process.nextTick(b);
        else
          n.onReadCallback = () => {
            ((n.onReadCallback = null), process.nextTick(b));
          };
      },
      p = (d, b) => {
        let byteLength = Buffer.byteLength(d),
          g = null,
          h = readableHighWaterMark,
          E,
          N = 0;
        if (maxRate) {
          let now = Date.now();
          if (!n.ts || (N = now - n.ts) >= timeWindow)
            ((n.ts = now), (E = l - n.bytes), (n.bytes = E < 0 ? -E : 0), (N = 0));
          E = l - n.bytes;
        }
        if (maxRate) {
          if (E <= 0)
            return setTimeout(() => {
              b(null, d);
            }, timeWindow - N);
          if (E < h) h = E;
        }
        if (h && byteLength > h && byteLength - h > f) ((g = d.subarray(h)), (d = d.subarray(0, h)));
        c(
          d,
          g
            ? () => {
                process.nextTick(b, null, g);
              }
            : b,
        );
      };
    p(e, function d(b, m) {
      if (b) return r(b);
      if (m) p(m, d);
      else r(null);
    });
  }
}
//@ chunk-h6b7mazd.js:68691-68701 esm-layout
var Gr = Zs;
//@ chunk-h6b7mazd.js:68796-68974 esm-fingerprint
var { asyncIterator: asyncIterator } = Symbol,
  Df = async function* (e) {
    if (e.stream) yield* e.stream();
    else if (e.arrayBuffer) yield await e.arrayBuffer();
    else if (e[asyncIterator]) yield* e[asyncIterator]();
    else yield e;
  },
  jt = Df;
//@ chunk-h6b7mazd.js:68974-69110 esm-fingerprint
var If = O.ALPHABET.ALPHA_DIGIT + "-_",
  pt = typeof TextEncoder === "function" ? new TextEncoder() : new util_2.TextEncoder(),
  Te = `\r
`,
  encode = pt.encode(Te),
  jf = 2;
//@ chunk-h6b7mazd.js:69110-69808 esm-fingerprint
class ti {
  constructor(e, t) {
    let { escapeName: escapeName } = this.constructor,
      isString = u.isString(t),
      o = `Content-Disposition: form-data; name="${escapeName(e)}"${!isString && t.name ? `; filename="${escapeName(t.name)}"` : ""}${Te}`;
    if (isString) t = pt.encode(String(t).replace(/\r?\n|\r\n?/g, Te));
    else {
      let replaced = String(t.type || "application/octet-stream").replace(/[\r\n]/g, "");
      o += `Content-Type: ${replaced}${Te}`;
    }
    ((this.headers = pt.encode(o + Te)),
      (this.contentLength = isString ? t.byteLength : t.size),
      (this.size = this.headers.byteLength + this.contentLength + jf),
      (this.name = e),
      (this.value = t));
  }
  async *encode() {
    yield this.headers;
    let { value: e } = this;
    if (u.isTypedArray(e)) yield e;
    else yield* jt(e);
    yield encode;
  }
  static escapeName(e) {
    return String(e).replace(/[\r\n"]/g, (t) => ({ "\r": "%0D", "\n": "%0A", '"': "%22" })[t]);
  }
}
//@ chunk-h6b7mazd.js:69808-70460 esm-fingerprint
var Mf = (e, t, r) => {
    let {
      tag: tag = "form-data-boundary",
      size: size = 25,
      boundary: boundary = tag + "-" + O.generateString(size, If),
    } = r || {};
    if (!u.isFormData(e)) throw TypeError("FormData instance required");
    if (boundary.length < 1 || boundary.length > 70) throw Error("boundary must be 10-70 characters long");
    let encode = pt.encode("--" + boundary + Te),
      encode_2 = pt.encode("--" + boundary + "--" + Te),
      byteLength = encode_2.byteLength,
      mapped = Array.from(e.entries()).map(([p, d]) => {
        let b = new ti(p, d);
        return ((byteLength += b.size), b);
      });
    ((byteLength += encode.byteLength * mapped.length), (byteLength = u.toFiniteNumber(byteLength)));
    let c = { "Content-Type": `multipart/form-data; boundary=${boundary}` };
    if (Number.isFinite(byteLength)) c["Content-Length"] = byteLength;
    return (
      t && t(c),
      Readable.from(
        (async function* () {
          for (let p of mapped) (yield encode, yield* p.encode());
          yield encode_2;
        })(),
      )
    );
  },
  ri = Mf;
//@ chunk-h6b7mazd.js:70483-70713 esm-fingerprint
class ni extends stream_3.Transform {
  __transform(e, t, r) {
    (this.push(e), r());
  }
  _transform(e, t, r) {
    if (e.length !== 0) {
      if (((this._transform = this.__transform), e[0] !== 120)) {
        let alloc = Buffer.alloc(2);
        ((alloc[0] = 120), (alloc[1] = 156), this.push(alloc, t));
      }
    }
    this.__transform(e, t, r);
  }
}
//@ chunk-h6b7mazd.js:70713-70723 esm-layout
var oi = ni;
//@ chunk-h6b7mazd.js:70723-70868 esm-fingerprint
var zf = (e, t) =>
    u.isAsyncFn(e)
      ? function (...r) {
          let n = r.pop();
          e.apply(this, r).then((o) => {
            try {
              t ? n(null, ...t(o)) : n(null, o);
            } catch (error) {
              n(error);
            }
          }, n);
        }
      : e,
  si = zf;
//@ chunk-h6b7mazd.js:70868-71973 esm-fingerprint
var $f = new Set(["localhost"]),
  ui = (e) => {
    let parts = e.split(".");
    if (parts.length !== 4) return !1;
    if (parts[0] !== "127") return !1;
    return parts.every((r) => /^\d+$/.test(r) && Number(r) >= 0 && Number(r) <= 255);
  },
  Vf = (e) => {
    if (e === "::1") return !0;
    let match = e.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (match) return ui(match[1]);
    let match_2 = e.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
    if (match_2) {
      let o = parseInt(match_2[1], 16);
      return o >= 32512 && o <= 32767;
    }
    let parts = e.split(":");
    if (parts.length === 8) {
      for (let o = 0; o < 7; o++) if (!/^0+$/.test(parts[o])) return !1;
      return /^0*1$/.test(parts[7]);
    }
    return !1;
  },
  ii = (e) => {
    if (!e) return !1;
    if ($f.has(e)) return !0;
    if (ui(e)) return !0;
    return Vf(e);
  },
  Wf = { http: 80, https: 443, ws: 80, wss: 443, ftp: 21 },
  Gf = (e) => {
    let t = e,
      r = 0;
    if (t.charAt(0) === "[") {
      let index = t.indexOf("]");
      if (index !== -1) {
        let sliced = t.slice(1, index),
          sliced_2 = t.slice(index + 1);
        if (sliced_2.charAt(0) === ":" && /^\d+$/.test(sliced_2.slice(1)))
          r = Number.parseInt(sliced_2.slice(1), 10);
        return [sliced, r];
      }
    }
    let index = t.indexOf(":"),
      index_2 = t.lastIndexOf(":");
    if (index !== -1 && index === index_2 && /^\d+$/.test(t.slice(index_2 + 1)))
      ((r = Number.parseInt(t.slice(index_2 + 1), 10)), (t = t.slice(0, index_2)));
    return [t, r];
  },
  ai = (e) => {
    if (!e) return e;
    if (e.charAt(0) === "[" && e.charAt(e.length - 1) === "]") e = e.slice(1, -1);
    return e.replace(/\.+$/, "");
  };
//@ chunk-h6b7mazd.js:71973-72447 esm-fingerprint
function Jr(e) {
  let t;
  try {
    t = new URL(e);
  } catch (error) {
    return !1;
  }
  let lower = (process.env.no_proxy || process.env.NO_PROXY || "").toLowerCase();
  if (!lower) return !1;
  if (lower === "*") return !0;
  let n = Number.parseInt(t.port, 10) || Wf[t.protocol.split(":", 1)[0]] || 0,
    o = ai(t.hostname.toLowerCase());
  return lower.split(/[\s,]+/).some((s) => {
    if (!s) return !1;
    let [i, a] = Gf(s);
    if (((i = ai(i)), !i)) return !1;
    if (a && a !== n) return !1;
    if (i.charAt(0) === "*") i = i.slice(1);
    if (i.charAt(0) === ".") return o.endsWith(i);
    return o === i || (ii(o) && ii(i));
  });
}
//@ chunk-h6b7mazd.js:72447-72731 esm-fingerprint
function Jf(e, t) {
  e = e || 10;
  let r = Array(e),
    n = Array(e),
    o = 0,
    s = 0,
    i;
  return (
    (t = t !== void 0 ? t : 1000),
    function (l) {
      let now = Date.now(),
        c = n[s];
      if (!i) i = now;
      ((r[o] = l), (n[o] = now));
      let p = s,
        d = 0;
      while (p !== o) ((d += r[p++]), (p = p % e));
      if (((o = (o + 1) % e), o === s)) s = (s + 1) % e;
      if (now - i < t) return;
      let b = c && now - c;
      return b ? Math.round((d * 1000) / b) : void 0;
    }
  );
}
//@ chunk-h6b7mazd.js:72731-72741 esm-layout
var ci = Jf;
//@ chunk-h6b7mazd.js:72741-72967 esm-fingerprint
function Kf(e, t) {
  let r = 0,
    n = 1000 / t,
    o,
    s,
    i = (f, c = Date.now()) => {
      if (((r = c), (o = null), s)) (clearTimeout(s), (s = null));
      e(...f);
    };
  return [
    (...f) => {
      let now = Date.now(),
        p = now - r;
      if (p >= n) i(f, now);
      else if (((o = f), !s))
        s = setTimeout(() => {
          ((s = null), i(o));
        }, n - p);
    },
    () => o && i(o),
  ];
}
//@ chunk-h6b7mazd.js:72967-72977 esm-layout
var fi = Kf;
//@ chunk-h6b7mazd.js:72977-73446 esm-fingerprint
var le = (e, t, r = 3) => {
    let n = 0,
      o = ci(50, 250);
    return fi((s) => {
      let loaded = s.loaded,
        a = s.lengthComputable ? s.total : void 0,
        l = a != null ? Math.min(loaded, a) : loaded,
        max = Math.max(0, l - n),
        c = o(max);
      n = Math.max(n, l);
      let p = {
        loaded: l,
        total: a,
        progress: a ? l / a : void 0,
        bytes: max,
        rate: c ? c : void 0,
        estimated: c && a ? (a - l) / c : void 0,
        event: s,
        lengthComputable: a != null,
        [t ? "download" : "upload"]: !0,
      };
      e(p);
    }, r);
  },
  We = (e, t) => {
    let r = e != null;
    return [(n) => t[0]({ lengthComputable: r, total: e, loaded: n }), t[1]];
  },
  Ge =
    (e) =>
    (...t) =>
      u.asap(() => e(...t));
//@ chunk-h6b7mazd.js:73446-74175 esm-fingerprint
function Kr(e) {
  if (!e || typeof e !== "string") return 0;
  if (!e.startsWith("data:")) return 0;
  let index = e.indexOf(",");
  if (index < 0) return 0;
  let sliced = e.slice(5, index),
    sliced_2 = e.slice(index + 1);
  if (/;base64/i.test(sliced)) {
    let { length: s, length: i } = sliced_2;
    for (let d = 0; d < i; d++)
      if (sliced_2.charCodeAt(d) === 37 && d + 2 < i) {
        let code = sliced_2.charCodeAt(d + 1),
          code_2 = sliced_2.charCodeAt(d + 2);
        if (
          ((code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102)) &&
          ((code_2 >= 48 && code_2 <= 57) ||
            (code_2 >= 65 && code_2 <= 70) ||
            (code_2 >= 97 && code_2 <= 102))
        )
          ((s -= 2), (d += 2));
      }
    let a = 0,
      l = i - 1,
      f = (d) =>
        d >= 2 &&
        sliced_2.charCodeAt(d - 2) === 37 &&
        sliced_2.charCodeAt(d - 1) === 51 &&
        (sliced_2.charCodeAt(d) === 68 || sliced_2.charCodeAt(d) === 100);
    if (l >= 0) {
      if (sliced_2.charCodeAt(l) === 61) (a++, l--);
      else if (f(l)) (a++, (l -= 3));
    }
    if (a === 1 && l >= 0) {
      if (sliced_2.charCodeAt(l) === 61) a++;
      else if (f(l)) a++;
    }
    let p = Math.floor(s / 4) * 3 - (a || 0);
    return p > 0 ? p : 0;
  }
  return Buffer.byteLength(sliced_2, "utf8");
}
//@ chunk-h6b7mazd.js:74175-74586 esm-fingerprint
var pi = { flush: zlib.constants.Z_SYNC_FLUSH, finishFlush: zlib.constants.Z_SYNC_FLUSH },
  Zf = { flush: zlib.constants.BROTLI_OPERATION_FLUSH, finishFlush: zlib.constants.BROTLI_OPERATION_FLUSH },
  isFunction_3 = u.isFunction(zlib.createBrotliDecompress),
  { http: http, https: https } = Ri.default,
  rl = /https:?/,
  hi = Symbol("axios.http.socketListener"),
  Mt = Symbol("axios.http.currentReq"),
  mapped = O.protocols.map((protocol) => protocol + ":"),
  yi = (e, [t, r]) => (e.on("end", r).on("error", r), t);

export {
  Er,
  gc,
  Ec,
  gr,
  Rc,
  O,
  F,
  _e,
  ue,
  le,
  Q,
  lt,
  We,
  Ge,
  st,
  He,
  it,
  ve,
  Ft,
  Ds,
  Jr,
  si,
  mapped,
  Kr,
  Vr,
  ri,
  jt,
  Gr,
  yi,
  isFunction_3,
  rl,
  https,
  http,
  pi,
  oi,
  Zf,
  hi,
  Mt,
};
