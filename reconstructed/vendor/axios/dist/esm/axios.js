/**
 * axios/dist/esm/axios.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: axios@1.15.2
 * pieces: chunk-h6b7mazd.js (107), chunk-tyg7f3ek.js (2)
 * attribution: esm-layout 26, esm-fingerprint 82, affinity 1
 */
import { Ar, Re } from "../../../../runtime/bun-runtime.js";
import { Er, gc, Ec, gr, Rc, O, F, _e, ue, le, Q, lt, We, Ge, st, He, it, ve, Ft } from "../node/axios.cjs";
import { Rs } from "../../../form-data/lib/form_data.js";
import { _i } from "../../lib/adapters/http.js";

//@ chunk-h6b7mazd.js:45969-45979 esm-layout
var Rr = {};
//@ chunk-h6b7mazd.js:45979-46107 esm-fingerprint
Ar(Rr, {
  hasBrowserEnv: () => Er,
  hasStandardBrowserEnv: () => gc,
  hasStandardBrowserWebWorkerEnv: () => Ec,
  navigator: () => gr,
  origin: () => Rc,
});
//@ chunk-h6b7mazd.js:46107-46171 esm-layout
function Ke(e, t) {
  return function () {
    return e.apply(t, arguments);
  };
}
//@ chunk-h6b7mazd.js:46171-46478 esm-fingerprint
var { toString: axiosUtilsHead } = Object.prototype,
  { getPrototypeOf: getPrototypeOf } = Object,
  { iterator: iterator, toStringTag: toStringTag } = Symbol,
  Rt = ((e) => (t) => {
    let r = axiosUtilsHead.call(t);
    return e[r] || (e[r] = r.slice(8, -1).toLowerCase());
  })(Object.create(null)),
  ne = (e) => ((e = e.toLowerCase()), (t) => Rt(t) === e),
  wt = (e) => (t) => typeof t === e,
  { isArray: isArray } = Array,
  De = wt("undefined");
//@ chunk-h6b7mazd.js:46478-46613 esm-fingerprint
function isBuffer(e) {
  return (
    e !== null &&
    !De(e) &&
    e.constructor !== null &&
    !De(e.constructor) &&
    isFunction(e.constructor.isBuffer) &&
    e.constructor.isBuffer(e)
  );
}
//@ chunk-h6b7mazd.js:46613-46638 esm-fingerprint
var isArrayBuffer = ne("ArrayBuffer");
//@ chunk-h6b7mazd.js:46638-46771 esm-fingerprint
function isArrayBufferView(e) {
  let t;
  if (typeof ArrayBuffer < "u" && ArrayBuffer.isView) t = ArrayBuffer.isView(e);
  else t = e && e.buffer && isArrayBuffer(e.buffer);
  return t;
}
//@ chunk-h6b7mazd.js:46771-47319 esm-layout
var isString = wt("string"),
  isFunction = wt("function"),
  isNumber = wt("number"),
  isObject = (e) => e !== null && typeof e === "object",
  isBoolean = (e) => e === !0 || e === !1,
  isPlainObject = (e) => {
    if (Rt(e) !== "object") return !1;
    let t = getPrototypeOf(e);
    return (
      (t === null || t === Object.prototype || Object.getPrototypeOf(t) === null) &&
      !(toStringTag in e) &&
      !(iterator in e)
    );
  },
  isEmptyObject = (e) => {
    if (!isObject(e) || isBuffer(e)) return !1;
    try {
      return Object.keys(e).length === 0 && Object.getPrototypeOf(e) === Object.prototype;
    } catch (error) {
      return !1;
    }
  },
  isDate = ne("Date"),
  isFile = ne("File"),
  isReactNativeBlob = (e) => !!(e && typeof e.uri < "u"),
  isReactNative = (e) => e && typeof e.getParts < "u",
  isBlob = ne("Blob"),
  isFileList = ne("FileList"),
  isStream = (e) => isObject(e) && isFunction(e.pipe);
//@ chunk-h6b7mazd.js:47319-47486 esm-layout
function Xi() {
  if (typeof globalThis < "u") return globalThis;
  if (typeof self < "u") return self;
  if (typeof window < "u") return window;
  if (typeof global < "u") return global;
  return {};
}
//@ chunk-h6b7mazd.js:47486-47945 esm-layout
var sn = Xi(),
  an = typeof sn.FormData < "u" ? sn.FormData : void 0,
  Yi = (e) => {
    if (!e) return !1;
    if (an && e instanceof an) return !0;
    let t = getPrototypeOf(e);
    if (!t || t === Object.prototype) return !1;
    if (!isFunction(e.append)) return !1;
    let r = Rt(e);
    return (
      r === "formdata" || (r === "object" && isFunction(e.toString) && e.toString() === "[object FormData]")
    );
  },
  Qi = ne("URLSearchParams"),
  [Zi, ea, ta, ra] = ["ReadableStream", "Request", "Response", "Headers"].map(ne),
  na = (e) => (e.trim ? e.trim() : e.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, ""));
//@ chunk-h6b7mazd.js:47945-48244 esm-fingerprint
function Qe(e, t, { allOwnKeys: r = !1 } = {}) {
  if (e === null || typeof e > "u") return;
  let n, o;
  if (typeof e !== "object") e = [e];
  if (isArray(e)) for (n = 0, o = e.length; n < o; n++) t.call(null, e[n], n, e);
  else {
    if (isBuffer(e)) return;
    let s = r ? Object.getOwnPropertyNames(e) : Object.keys(e),
      i = s.length,
      a;
    for (n = 0; n < i; n++) ((a = s[n]), t.call(null, e[a], a, e));
  }
}
//@ chunk-h6b7mazd.js:48244-48398 esm-fingerprint
function pn(e, t) {
  if (isBuffer(e)) return null;
  t = t.toLowerCase();
  let keys = Object.keys(e),
    n = keys.length,
    o;
  while (n-- > 0) if (((o = keys[n]), t === o.toLowerCase())) return o;
  return null;
}
//@ chunk-h6b7mazd.js:48398-48541 esm-layout
var ge = (() => {
    if (typeof globalThis < "u") return globalThis;
    return typeof self < "u" ? self : typeof window < "u" ? window : global;
  })(),
  dn = (e) => !De(e) && e !== ge;
//@ chunk-h6b7mazd.js:48541-48903 esm-fingerprint
function Gt() {
  let { caseless: caseless, skipUndefined: skipUndefined } = (dn(this) && this) || {},
    r = {},
    n = (o, s) => {
      if (s === "__proto__" || s === "constructor" || s === "prototype") return;
      let i = (caseless && pn(r, s)) || s;
      if (isPlainObject(r[i]) && isPlainObject(o)) r[i] = Gt(r[i], o);
      else if (isPlainObject(o)) r[i] = Gt({}, o);
      else if (isArray(o)) r[i] = o.slice();
      else if (!skipUndefined || !De(o)) r[i] = o;
    };
  for (let o = 0, s = arguments.length; o < s; o++) arguments[o] && Qe(arguments[o], n);
  return r;
}
//@ chunk-h6b7mazd.js:48903-50931 esm-fingerprint
var oa = (e, t, r, { allOwnKeys: n } = {}) => (
    Qe(
      t,
      (o, s) => {
        if (r && isFunction(o))
          Object.defineProperty(e, s, { value: Ke(o, r), writable: !0, enumerable: !0, configurable: !0 });
        else Object.defineProperty(e, s, { value: o, writable: !0, enumerable: !0, configurable: !0 });
      },
      { allOwnKeys: n },
    ),
    e
  ),
  sa = (e) => {
    if (e.charCodeAt(0) === 65279) e = e.slice(1);
    return e;
  },
  ia = (e, t, r, n) => {
    ((e.prototype = Object.create(t.prototype, n)),
      Object.defineProperty(e.prototype, "constructor", {
        value: e,
        writable: !0,
        enumerable: !1,
        configurable: !0,
      }),
      Object.defineProperty(e, "super", { value: t.prototype }),
      r && Object.assign(e.prototype, r));
  },
  aa = (e, t, r, n) => {
    let o,
      s,
      i,
      a = {};
    if (((t = t || {}), e == null)) return t;
    do {
      ((o = Object.getOwnPropertyNames(e)), (s = o.length));
      while (s-- > 0) if (((i = o[s]), (!n || n(i, e, t)) && !a[i])) ((t[i] = e[i]), (a[i] = !0));
      e = r !== !1 && getPrototypeOf(e);
    } while (e && (!r || r(e, t)) && e !== Object.prototype);
    return t;
  },
  ua = (e, t, r) => {
    if (((e = String(e)), r === void 0 || r > e.length)) r = e.length;
    r -= t.length;
    let index = e.indexOf(t, r);
    return index !== -1 && index === r;
  },
  ca = (e) => {
    if (!e) return null;
    if (isArray(e)) return e;
    let t = e.length;
    if (!isNumber(t)) return null;
    let r = Array(t);
    while (t-- > 0) r[t] = e[t];
    return r;
  },
  fa = (
    (e) => (t) =>
      e && t instanceof e
  )(typeof Uint8Array < "u" && getPrototypeOf(Uint8Array)),
  la = (e, t) => {
    let n = (e && e[iterator]).call(e),
      o;
    while ((o = n.next()) && !o.done) {
      let s = o.value;
      t.call(e, s[0], s[1]);
    }
  },
  pa = (e, t) => {
    let r,
      n = [];
    while ((r = e.exec(t)) !== null) n.push(r);
    return n;
  },
  da = ne("HTMLFormElement"),
  ha = (e) =>
    e.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function (r, n, o) {
      return n.toUpperCase() + o;
    }),
  un = (
    ({ hasOwnProperty: hasOwnProperty }) =>
    (t, r) =>
      hasOwnProperty.call(t, r)
  )(Object.prototype),
  ma = ne("RegExp"),
  hn = (e, t) => {
    let ownPropertyDescriptors = Object.getOwnPropertyDescriptors(e),
      n = {};
    (Qe(ownPropertyDescriptors, (o, s) => {
      let i;
      if ((i = t(o, s, e)) !== !1) n[s] = i || o;
    }),
      Object.defineProperties(e, n));
  },
  ya = (e) => {
    hn(e, (t, r) => {
      if (isFunction(e) && ["arguments", "caller", "callee"].indexOf(r) !== -1) return !1;
      let n = e[r];
      if (!isFunction(n)) return;
      if (((t.enumerable = !1), "writable" in t)) {
        t.writable = !1;
        return;
      }
      if (!t.set)
        t.set = () => {
          throw Error("Can not rewrite read-only method '" + r + "'");
        };
    });
  },
  ba = (e, t) => {
    let r = {},
      n = (o) => {
        o.forEach((s) => {
          r[s] = !0;
        });
      };
    return (isArray(e) ? n(e) : n(String(e).split(t)), r);
  },
  ga = () => {},
  Ea = (e, t) => (e != null && Number.isFinite((e = +e)) ? e : t);
//@ chunk-h6b7mazd.js:50931-50998 esm-fingerprint
function Ra(e) {
  return !!(e && isFunction(e.append) && e[toStringTag] === "FormData" && e[iterator]);
}
//@ chunk-h6b7mazd.js:50998-52549 esm-fingerprint
var wa = (e) => {
    let t = [, , , , , , , , , ,],
      r = (n, o) => {
        if (isObject(n)) {
          if (t.indexOf(n) >= 0) return;
          if (isBuffer(n)) return n;
          if (!("toJSON" in n)) {
            t[o] = n;
            let s = isArray(n) ? [] : {};
            return (
              Qe(n, (i, a) => {
                let l = r(i, o + 1);
                !De(l) && (s[a] = l);
              }),
              (t[o] = void 0),
              s
            );
          }
        }
        return n;
      };
    return r(e, 0);
  },
  xa = ne("AsyncFunction"),
  _a = (e) => e && (isObject(e) || isFunction(e)) && isFunction(e.then) && isFunction(e.catch),
  mn = ((e, t) => {
    if (e) return setImmediate;
    return t
      ? ((r, n) => (
          ge.addEventListener(
            "message",
            ({ source: source, data: s }) => {
              if (source === ge && s === r) n.length && n.shift()();
            },
            !1,
          ),
          (o) => {
            (n.push(o), ge.postMessage(r, "*"));
          }
        ))(`axios@${Math.random()}`, [])
      : (r) => setTimeout(r);
  })(typeof setImmediate === "function", isFunction(ge.postMessage)),
  Sa =
    typeof queueMicrotask < "u" ? queueMicrotask.bind(ge) : (typeof process < "u" && process.nextTick) || mn,
  Aa = (e) => e != null && isFunction(e[iterator]),
  u = {
    isArray: isArray,
    isArrayBuffer: isArrayBuffer,
    isBuffer: isBuffer,
    isFormData: Yi,
    isArrayBufferView: isArrayBufferView,
    isString: isString,
    isNumber: isNumber,
    isBoolean: isBoolean,
    isObject: isObject,
    isPlainObject: isPlainObject,
    isEmptyObject: isEmptyObject,
    isReadableStream: Zi,
    isRequest: ea,
    isResponse: ta,
    isHeaders: ra,
    isUndefined: De,
    isDate: isDate,
    isFile: isFile,
    isReactNativeBlob: isReactNativeBlob,
    isReactNative: isReactNative,
    isBlob: isBlob,
    isRegExp: ma,
    isFunction: isFunction,
    isStream: isStream,
    isURLSearchParams: Qi,
    isTypedArray: fa,
    isFileList: isFileList,
    forEach: Qe,
    merge: Gt,
    extend: oa,
    trim: na,
    stripBOM: sa,
    inherits: ia,
    toFlatObject: aa,
    kindOf: Rt,
    kindOfTest: ne,
    endsWith: ua,
    toArray: ca,
    forEachEntry: la,
    matchAll: pa,
    isHTMLForm: da,
    hasOwnProperty: un,
    hasOwnProp: un,
    reduceDescriptors: hn,
    freezeMethods: ya,
    toObjectSet: ba,
    toCamelCase: ha,
    noop: ga,
    toFiniteNumber: Ea,
    findKey: pn,
    global: ge,
    isContextDefined: dn,
    isSpecCompliantForm: Ra,
    toJSONObject: wa,
    isAsyncFn: xa,
    isThenable: _a,
    setImmediate: mn,
    asap: Sa,
    isIterable: Aa,
  };
//@ chunk-h6b7mazd.js:52549-53275 esm-fingerprint
class AxiosError_2 extends Error {
  static from(e, t, r, n, o, s) {
    let i = new AxiosError_2(e.message, t || e.code, r, n, o);
    if (((i.cause = e), (i.name = e.name), e.status != null && i.status == null)) i.status = e.status;
    return (s && Object.assign(i, s), i);
  }
  constructor(e, t, r, n, o) {
    super(e);
    if (
      (Object.defineProperty(this, "message", { value: e, enumerable: !0, writable: !0, configurable: !0 }),
      (this.name = "AxiosError"),
      (this.isAxiosError = !0),
      t && (this.code = t),
      r && (this.config = r),
      n && (this.request = n),
      o)
    )
      ((this.response = o), (this.status = o.status));
  }
  toJSON() {
    return {
      message: this.message,
      name: this.name,
      description: this.description,
      number: this.number,
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      config: u.toJSONObject(this.config),
      code: this.code,
      status: this.status,
    };
  }
}
//@ chunk-h6b7mazd.js:53275-53321 esm-fingerprint
AxiosError_2.ERR_BAD_OPTION_VALUE = "ERR_BAD_OPTION_VALUE";
//@ chunk-h6b7mazd.js:53321-53355 esm-fingerprint
AxiosError_2.ERR_BAD_OPTION = "ERR_BAD_OPTION";
//@ chunk-h6b7mazd.js:53355-53385 esm-fingerprint
AxiosError_2.ECONNABORTED = "ECONNABORTED";
//@ chunk-h6b7mazd.js:53385-53409 esm-fingerprint
AxiosError_2.ETIMEDOUT = "ETIMEDOUT";
//@ chunk-h6b7mazd.js:53409-53437 esm-fingerprint
AxiosError_2.ERR_NETWORK = "ERR_NETWORK";
//@ chunk-h6b7mazd.js:53437-53493 esm-fingerprint
AxiosError_2.ERR_FR_TOO_MANY_REDIRECTS = "ERR_FR_TOO_MANY_REDIRECTS";
//@ chunk-h6b7mazd.js:53493-53527 esm-fingerprint
AxiosError_2.ERR_DEPRECATED = "ERR_DEPRECATED";
//@ chunk-h6b7mazd.js:53527-53565 esm-fingerprint
AxiosError_2.ERR_BAD_RESPONSE = "ERR_BAD_RESPONSE";
//@ chunk-h6b7mazd.js:53565-53601 esm-fingerprint
AxiosError_2.ERR_BAD_REQUEST = "ERR_BAD_REQUEST";
//@ chunk-h6b7mazd.js:53601-53631 esm-fingerprint
AxiosError_2.ERR_CANCELED = "ERR_CANCELED";
//@ chunk-h6b7mazd.js:53631-53667 esm-fingerprint
AxiosError_2.ERR_NOT_SUPPORT = "ERR_NOT_SUPPORT";
//@ chunk-h6b7mazd.js:53667-53703 esm-fingerprint
AxiosError_2.ERR_INVALID_URL = "ERR_INVALID_URL";
//@ chunk-h6b7mazd.js:53703-53765 esm-fingerprint
AxiosError_2.ERR_FORM_DATA_DEPTH_EXCEEDED = "ERR_FORM_DATA_DEPTH_EXCEEDED";
//@ chunk-h6b7mazd.js:53765-53773 esm-layout
var y = AxiosError_2;
//@ chunk-h6b7mazd.js:53773-53805 esm-layout
var ws = Re(Rs(), 1),
  Pt = ws.default;
//@ chunk-h6b7mazd.js:53805-53860 esm-fingerprint
function mr(e) {
  return u.isPlainObject(e) || u.isArray(e);
}
//@ chunk-h6b7mazd.js:53860-53917 esm-fingerprint
function xs(e) {
  return u.endsWith(e, "[]") ? e.slice(0, -2) : e;
}
//@ chunk-h6b7mazd.js:53917-54038 esm-fingerprint
function hr(e, t, r) {
  if (!e) return t;
  return e
    .concat(t)
    .map(function (o, s) {
      return ((o = xs(o)), !r && s ? "[" + o + "]" : o);
    })
    .join(r ? "." : "");
}
//@ chunk-h6b7mazd.js:54038-54086 esm-fingerprint
function lc(e) {
  return u.isArray(e) && !e.some(mr);
}
//@ chunk-h6b7mazd.js:54086-54157 esm-fingerprint
var toFlatObject = u.toFlatObject(u, {}, null, function (t) {
  return /^is[A-Z]/.test(t);
});
//@ chunk-h6b7mazd.js:54157-55895 esm-fingerprint
function dc(e, t, r) {
  if (!u.isObject(e)) throw TypeError("target must be an object");
  ((t = t || new (Pt || FormData)()),
    (r = u.toFlatObject(r, { metaTokens: !0, dots: !1, indexes: !1 }, !1, function (h, E) {
      return !u.isUndefined(E[h]);
    })));
  let metaTokens = r.metaTokens,
    o = r.visitor || p,
    dots = r.dots,
    indexes = r.indexes,
    a = r.Blob || (typeof Blob < "u" && Blob),
    l = r.maxDepth === void 0 ? 100 : r.maxDepth,
    f = a && u.isSpecCompliantForm(t);
  if (!u.isFunction(o)) throw TypeError("visitor must be a function");
  function c(g) {
    if (g === null) return "";
    if (u.isDate(g)) return g.toISOString();
    if (u.isBoolean(g)) return g.toString();
    if (!f && u.isBlob(g)) throw new y("Blob is not supported. Use a Buffer instead.");
    if (u.isArrayBuffer(g) || u.isTypedArray(g))
      return f && typeof Blob === "function" ? new Blob([g]) : Buffer.from(g);
    return g;
  }
  function p(g, h, E) {
    let N = g;
    if (u.isReactNative(t) && u.isReactNativeBlob(g)) return (t.append(hr(E, h, dots), c(g)), !1);
    if (g && !E && typeof g === "object") {
      if (u.endsWith(h, "{}")) ((h = metaTokens ? h : h.slice(0, -2)), (g = JSON.stringify(g)));
      else if ((u.isArray(g) && lc(g)) || ((u.isFileList(g) || u.endsWith(h, "[]")) && (N = u.toArray(g))))
        return (
          (h = xs(h)),
          N.forEach(function (_, k) {
            !(u.isUndefined(_) || _ === null) &&
              t.append(indexes === !0 ? hr([h], k, dots) : indexes === null ? h : h + "[]", c(_));
          }),
          !1
        );
    }
    if (mr(g)) return !0;
    return (t.append(hr(E, h, dots), c(g)), !1);
  }
  let d = [],
    merged = Object.assign(toFlatObject, { defaultVisitor: p, convertValue: c, isVisitable: mr });
  function m(g, h, E = 0) {
    if (u.isUndefined(g)) return;
    if (E > l)
      throw new y(
        "Object is too deeply nested (" + E + " levels). Max depth: " + l,
        y.ERR_FORM_DATA_DEPTH_EXCEEDED,
      );
    if (d.indexOf(g) !== -1) throw Error("Circular reference detected in " + h.join("."));
    (d.push(g),
      u.forEach(g, function (v, _) {
        if (
          (!(u.isUndefined(v) || v === null) && o.call(t, v, u.isString(_) ? _.trim() : _, h, merged)) === !0
        )
          m(v, h ? h.concat(_) : [_], E + 1);
      }),
      d.pop());
  }
  if (!u.isObject(e)) throw TypeError("data must be an object");
  return (m(e), t);
}
//@ chunk-h6b7mazd.js:55895-55905 esm-layout
var de = dc;
//@ chunk-h6b7mazd.js:55905-56066 esm-fingerprint
function _s(e) {
  let t = { "!": "%21", "'": "%27", "(": "%28", ")": "%29", "~": "%7E", "%20": "+" };
  return encodeURIComponent(e).replace(/[!'()~]|%20/g, function (n) {
    return t[n];
  });
}
//@ chunk-h6b7mazd.js:56066-56114 esm-fingerprint
function Ss(e, t) {
  ((this._pairs = []), e && de(e, this, t));
}
//@ chunk-h6b7mazd.js:56114-56134 esm-layout
var As = Ss.prototype;
//@ chunk-h6b7mazd.js:56134-56183 esm-fingerprint
As.append = function (t, r) {
  this._pairs.push([t, r]);
};
//@ chunk-h6b7mazd.js:56183-56334 esm-fingerprint
As.toString = function (t) {
  let r = t
    ? function (n) {
        return t.call(this, n, _s);
      }
    : _s;
  return this._pairs
    .map(function (_pair) {
      return r(_pair[0]) + "=" + r(_pair[1]);
    }, "")
    .join("&");
};
//@ chunk-h6b7mazd.js:56334-56344 esm-layout
var Os = Ss;
//@ chunk-h6b7mazd.js:56344-56470 esm-fingerprint
function hc(e) {
  return encodeURIComponent(e)
    .replace(/%3A/gi, ":")
    .replace(/%24/g, "$")
    .replace(/%2C/gi, ",")
    .replace(/%20/g, "+");
}
//@ chunk-h6b7mazd.js:56470-56756 esm-fingerprint
function xe(e, t, r) {
  if (!t) return e;
  let n = (r && r.encode) || hc,
    o = u.isFunction(r) ? { serialize: r } : r,
    s = o && o.serialize,
    i;
  if (s) i = s(t, o);
  else i = u.isURLSearchParams(t) ? t.toString() : new Os(t, o).toString(n);
  if (i) {
    let index = e.indexOf("#");
    if (index !== -1) e = e.slice(0, index);
    e += (e.indexOf("?") === -1 ? "?" : "&") + i;
  }
  return e;
}
//@ chunk-h6b7mazd.js:56756-57098 esm-fingerprint
class Cs {
  constructor() {
    this.handlers = [];
  }
  use(e, t, r) {
    return (
      this.handlers.push({
        fulfilled: e,
        rejected: t,
        synchronous: r ? r.synchronous : !1,
        runWhen: r ? r.runWhen : null,
      }),
      this.handlers.length - 1
    );
  }
  eject(e) {
    if (this.handlers[e]) this.handlers[e] = null;
  }
  clear() {
    if (this.handlers) this.handlers = [];
  }
  forEach(e) {
    u.forEach(this.handlers, function (r) {
      if (r !== null) e(r);
    });
  }
}
//@ chunk-h6b7mazd.js:57098-57108 esm-layout
var yr = Cs;
//@ chunk-h6b7mazd.js:57108-57217 esm-fingerprint
var he = {
  silentJSONParsing: !0,
  forcedJSONParsing: !0,
  clarifyTimeoutError: !1,
  legacyInterceptorReqResOrdering: !0,
};
//@ chunk-h6b7mazd.js:85236-85453 esm-fingerprint
var Si = O.hasStandardBrowserEnv
  ? ((e, t) => (r) => (
      (r = new URL(r, O.origin)),
      e.protocol === r.protocol && e.host === r.host && (t || e.port === r.port)
    ))(new URL(O.origin), O.navigator && /(msie|trident)/i.test(O.navigator.userAgent))
  : () => !0;
//@ chunk-h6b7mazd.js:85453-86058 esm-fingerprint
var Ai = O.hasStandardBrowserEnv
  ? {
      write(e, t, r, n, o, s, i) {
        if (typeof document > "u") return;
        let a = [`${e}=${encodeURIComponent(t)}`];
        if (u.isNumber(r)) a.push(`expires=${new Date(r).toUTCString()}`);
        if (u.isString(n)) a.push(`path=${n}`);
        if (u.isString(o)) a.push(`domain=${o}`);
        if (s === !0) a.push("secure");
        if (u.isString(i)) a.push(`SameSite=${i}`);
        document.cookie = a.join("; ");
      },
      read(e) {
        if (typeof document > "u") return null;
        let match = document.cookie.match(new RegExp("(?:^|; )" + e + "=([^;]*)"));
        return match ? decodeURIComponent(match[1]) : null;
      },
      remove(e) {
        this.write(e, "", Date.now() - 86400000, "/");
      },
    }
  : {
      write() {},
      read() {
        return null;
      },
      remove() {},
    };
//@ chunk-h6b7mazd.js:86058-86094 esm-layout
var Oi = (e) => (e instanceof F ? { ...e } : e);
//@ chunk-h6b7mazd.js:86094-87568 esm-fingerprint
function ie(e, t) {
  t = t || {};
  let create = Object.create(null);
  Object.defineProperty(create, "hasOwnProperty", {
    value: Object.prototype.hasOwnProperty,
    enumerable: !1,
    writable: !0,
    configurable: !0,
  });
  function n(f, c, p, d) {
    if (u.isPlainObject(f) && u.isPlainObject(c)) return u.merge.call({ caseless: d }, f, c);
    else if (u.isPlainObject(c)) return u.merge({}, c);
    else if (u.isArray(c)) return c.slice();
    return c;
  }
  function o(f, c, p, d) {
    if (!u.isUndefined(c)) return n(f, c, p, d);
    else if (!u.isUndefined(f)) return n(void 0, f, p, d);
  }
  function s(f, c) {
    if (!u.isUndefined(c)) return n(void 0, c);
  }
  function i(f, c) {
    if (!u.isUndefined(c)) return n(void 0, c);
    else if (!u.isUndefined(f)) return n(void 0, f);
  }
  function a(f, c, p) {
    if (u.hasOwnProp(t, p)) return n(f, c);
    else if (u.hasOwnProp(e, p)) return n(void 0, f);
  }
  let l = {
    url: s,
    method: s,
    data: s,
    baseURL: i,
    transformRequest: i,
    transformResponse: i,
    paramsSerializer: i,
    timeout: i,
    timeoutMessage: i,
    withCredentials: i,
    withXSRFToken: i,
    adapter: i,
    responseType: i,
    xsrfCookieName: i,
    xsrfHeaderName: i,
    onUploadProgress: i,
    onDownloadProgress: i,
    decompress: i,
    maxContentLength: i,
    maxBodyLength: i,
    beforeRedirect: i,
    transport: i,
    httpAgent: i,
    httpsAgent: i,
    cancelToken: i,
    socketPath: i,
    allowedSocketPaths: i,
    responseEncoding: i,
    validateStatus: a,
    headers: (f, c, p) => o(Oi(f), Oi(c), p, !0),
  };
  return (
    u.forEach(Object.keys({ ...e, ...t }), function (c) {
      if (c === "__proto__" || c === "constructor" || c === "prototype") return;
      let p = u.hasOwnProp(l, c) ? l[c] : o,
        d = u.hasOwnProp(e, c) ? e[c] : void 0,
        b = u.hasOwnProp(t, c) ? t[c] : void 0,
        m = p(d, b, c);
      (u.isUndefined(m) && p !== a) || (create[c] = m);
    }),
    create
  );
}
//@ chunk-h6b7mazd.js:87568-88394 esm-fingerprint
var Ht = (e) => {
  let t = ie({}, e),
    r = (d) => (u.hasOwnProp(t, d) ? t[d] : void 0),
    n = r("data"),
    o = r("withXSRFToken"),
    s = r("xsrfHeaderName"),
    i = r("xsrfCookieName"),
    a = r("headers"),
    l = r("auth"),
    f = r("baseURL"),
    c = r("allowAbsoluteUrls"),
    p = r("url");
  if (((t.headers = a = F.from(a)), (t.url = xe(_e(f, p, c), e.params, e.paramsSerializer)), l))
    a.set(
      "Authorization",
      "Basic " +
        btoa((l.username || "") + ":" + (l.password ? unescape(encodeURIComponent(l.password)) : "")),
    );
  if (u.isFormData(n)) {
    if (O.hasStandardBrowserEnv || O.hasStandardBrowserWebWorkerEnv) a.setContentType(void 0);
    else if (u.isFunction(n.getHeaders)) {
      let headers = n.getHeaders(),
        b = ["content-type", "content-length"];
      Object.entries(headers).forEach(([m, g]) => {
        if (b.includes(m.toLowerCase())) a.set(m, g);
      });
    }
  }
  if (O.hasStandardBrowserEnv) {
    if (u.isFunction(o)) o = o(t);
    if (o === !0 || (o == null && Si(t.url))) {
      let b = s && i && Ai.read(i);
      if (b) a.set(s, b);
    }
  }
  return t;
};
//@ chunk-h6b7mazd.js:88394-90487 esm-layout
var cl = typeof XMLHttpRequest < "u",
  Ci =
    cl &&
    function (e) {
      return new Promise(function (r, n) {
        let o = Ht(e),
          s = o.data,
          normalized = F.from(o.headers).normalize(),
          {
            responseType: responseType,
            onUploadProgress: onUploadProgress,
            onDownloadProgress: onDownloadProgress,
          } = o,
          c,
          p,
          d,
          b,
          m;
        function g() {
          (b && b(),
            m && m(),
            o.cancelToken && o.cancelToken.unsubscribe(c),
            o.signal && o.signal.removeEventListener("abort", c));
        }
        let xMLHttpRequest = new XMLHttpRequest();
        (xMLHttpRequest.open(o.method.toUpperCase(), o.url, !0), (xMLHttpRequest.timeout = o.timeout));
        function E() {
          if (!xMLHttpRequest) return;
          let from = F.from(
              "getAllResponseHeaders" in xMLHttpRequest && xMLHttpRequest.getAllResponseHeaders(),
            ),
            k = {
              data:
                !responseType || responseType === "text" || responseType === "json"
                  ? xMLHttpRequest.responseText
                  : xMLHttpRequest.response,
              status: xMLHttpRequest.status,
              statusText: xMLHttpRequest.statusText,
              headers: from,
              config: e,
              request: xMLHttpRequest,
            };
          (ue(
            function (T) {
              (r(T), g());
            },
            function (T) {
              (n(T), g());
            },
            k,
          ),
            (xMLHttpRequest = null));
        }
        if ("onloadend" in xMLHttpRequest) xMLHttpRequest.onloadend = E;
        else
          xMLHttpRequest.onreadystatechange = function () {
            if (!xMLHttpRequest || xMLHttpRequest.readyState !== 4) return;
            if (
              xMLHttpRequest.status === 0 &&
              !(xMLHttpRequest.responseURL && xMLHttpRequest.responseURL.indexOf("file:") === 0)
            )
              return;
            setTimeout(E);
          };
        if (
          ((xMLHttpRequest.onabort = function () {
            if (!xMLHttpRequest) return;
            (n(new y("Request aborted", y.ECONNABORTED, e, xMLHttpRequest)), (xMLHttpRequest = null));
          }),
          (xMLHttpRequest.onerror = function (_) {
            let k = _ && _.message ? _.message : "Network Error",
              G = new y(k, y.ERR_NETWORK, e, xMLHttpRequest);
            ((G.event = _ || null), n(G), (xMLHttpRequest = null));
          }),
          (xMLHttpRequest.ontimeout = function () {
            let _ = o.timeout ? "timeout of " + o.timeout + "ms exceeded" : "timeout exceeded",
              k = o.transitional || he;
            if (o.timeoutErrorMessage) _ = o.timeoutErrorMessage;
            (n(new y(_, k.clarifyTimeoutError ? y.ETIMEDOUT : y.ECONNABORTED, e, xMLHttpRequest)),
              (xMLHttpRequest = null));
          }),
          s === void 0 && normalized.setContentType(null),
          "setRequestHeader" in xMLHttpRequest)
        )
          u.forEach(normalized.toJSON(), function (_, k) {
            xMLHttpRequest.setRequestHeader(k, _);
          });
        if (!u.isUndefined(o.withCredentials)) xMLHttpRequest.withCredentials = !!o.withCredentials;
        if (responseType && responseType !== "json") xMLHttpRequest.responseType = o.responseType;
        if (onDownloadProgress)
          (([d, m] = le(onDownloadProgress, !0)), xMLHttpRequest.addEventListener("progress", d));
        if (onUploadProgress && xMLHttpRequest.upload)
          (([p, b] = le(onUploadProgress)),
            xMLHttpRequest.upload.addEventListener("progress", p),
            xMLHttpRequest.upload.addEventListener("loadend", b));
        if (o.cancelToken || o.signal) {
          if (
            ((c = (v) => {
              if (!xMLHttpRequest) return;
              (n(!v || v.type ? new Q(null, e, xMLHttpRequest) : v),
                xMLHttpRequest.abort(),
                (xMLHttpRequest = null));
            }),
            o.cancelToken && o.cancelToken.subscribe(c),
            o.signal)
          )
            o.signal.aborted ? c() : o.signal.addEventListener("abort", c);
        }
        let N = lt(o.url);
        if (N && O.protocols.indexOf(N) === -1) {
          n(new y("Unsupported protocol " + N + ":", y.ERR_BAD_REQUEST, e));
          return;
        }
        xMLHttpRequest.send(s || null);
      });
    };
//@ chunk-h6b7mazd.js:90487-91031 esm-fingerprint
var fl = (e, t) => {
    let { length: r } = (e = e ? e.filter(Boolean) : []);
    if (t || r) {
      let abortController = new AbortController(),
        o,
        s = function (f) {
          if (!o) {
            ((o = !0), a());
            let c = f instanceof Error ? f : this.reason;
            abortController.abort(c instanceof y ? c : new Q(c instanceof Error ? c.message : c));
          }
        },
        i =
          t &&
          setTimeout(() => {
            ((i = null), s(new y(`timeout of ${t}ms exceeded`, y.ETIMEDOUT)));
          }, t),
        a = () => {
          if (e)
            (i && clearTimeout(i),
              (i = null),
              e.forEach((f) => {
                f.unsubscribe ? f.unsubscribe(s) : f.removeEventListener("abort", s);
              }),
              (e = null));
        };
      e.forEach((f) => f.addEventListener("abort", s));
      let { signal: signal } = abortController;
      return ((signal.unsubscribe = () => u.asap(a)), signal);
    }
  },
  vi = fl;
//@ chunk-h6b7mazd.js:91031-91711 esm-fingerprint
var ll = function* (e, t) {
    let byteLength = e.byteLength;
    if (!t || byteLength < t) {
      yield e;
      return;
    }
    let n = 0,
      o;
    while (n < byteLength) ((o = n + t), yield e.slice(n, o), (n = o));
  },
  pl = async function* (e, t) {
    for await (let r of dl(e)) yield* ll(r, t);
  },
  dl = async function* (e) {
    if (e[Symbol.asyncIterator]) {
      yield* e;
      return;
    }
    let reader = e.getReader();
    try {
      for (;;) {
        let { done: r, value: n } = await reader.read();
        if (r) break;
        yield n;
      }
    } finally {
      await reader.cancel();
    }
  },
  Xr = (e, t, r, n) => {
    let o = pl(e, t),
      s = 0,
      i,
      a = (l) => {
        if (!i) ((i = !0), n && n(l));
      };
    return new ReadableStream(
      {
        async pull(l) {
          try {
            let { done: f, value: c } = await o.next();
            if (f) {
              (a(), l.close());
              return;
            }
            let byteLength = c.byteLength;
            if (r) {
              let d = (s += byteLength);
              r(d);
            }
            l.enqueue(new Uint8Array(c));
          } catch (error) {
            throw (a(error), error);
          }
        },
        cancel(l) {
          return (a(l), o.return());
        },
      },
      { highWaterMark: 2 },
    );
  };
//@ chunk-h6b7mazd.js:91711-94922 esm-layout
var Ti = 65536,
  { isFunction: isFunction_2 } = u,
  hl = (({ Request: e, Response: t }) => ({ Request: e, Response: t }))(u.global),
  { ReadableStream: Pi, TextEncoder: Fi } = u.global,
  Li = (e, ...t) => {
    try {
      return !!e(...t);
    } catch (error) {
      return !1;
    }
  },
  ml = (e) => {
    e = u.merge.call({ skipUndefined: !0 }, hl, e);
    let { fetch: t, Request: r, Response: n } = e,
      o = t ? isFunction_2(t) : typeof fetch === "function",
      s = isFunction_2(r),
      i = isFunction_2(n);
    if (!o) return !1;
    let a = o && isFunction_2(Pi),
      l =
        o &&
        (typeof Fi === "function"
          ? (
              (m) => (g) =>
                m.encode(g)
            )(new Fi())
          : async (m) => new Uint8Array(await new r(m).arrayBuffer())),
      f =
        s &&
        a &&
        Li(() => {
          let m = !1,
            g = new r(O.origin, {
              body: new Pi(),
              method: "POST",
              get duplex() {
                return ((m = !0), "half");
              },
            }),
            h = g.headers.has("Content-Type");
          if (g.body != null) g.body.cancel();
          return m && !h;
        }),
      c = i && a && Li(() => u.isReadableStream(new n("").body)),
      p = { stream: c && ((m) => m.body) };
    o &&
      (() => {
        ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((m) => {
          !p[m] &&
            (p[m] = (g, h) => {
              let E = g && g[m];
              if (E) return E.call(g);
              throw new y(`Response type '${m}' is not supported`, y.ERR_NOT_SUPPORT, h);
            });
        });
      })();
    let d = async (m) => {
        if (m == null) return 0;
        if (u.isBlob(m)) return m.size;
        if (u.isSpecCompliantForm(m))
          return (await new r(O.origin, { method: "POST", body: m }).arrayBuffer()).byteLength;
        if (u.isArrayBufferView(m) || u.isArrayBuffer(m)) return m.byteLength;
        if (u.isURLSearchParams(m)) m = m + "";
        if (u.isString(m)) return (await l(m)).byteLength;
      },
      b = async (m, g) => {
        let toFiniteNumber = u.toFiniteNumber(m.getContentLength());
        return toFiniteNumber == null ? d(g) : toFiniteNumber;
      };
    return async (m) => {
      let {
          url: url,
          method: method,
          data: E,
          signal: signal,
          cancelToken: cancelToken,
          timeout: timeout,
          onDownloadProgress: onDownloadProgress,
          onUploadProgress: onUploadProgress,
          responseType: responseType,
          headers: headers,
          withCredentials: withCredentials = "same-origin",
          fetchOptions: fetchOptions,
        } = Ht(m),
        Fe = t || fetch;
      responseType = responseType ? (responseType + "").toLowerCase() : "text";
      let ce = vi([signal, cancelToken && cancelToken.toAbortSignal()], timeout),
        ae = null,
        Z =
          ce &&
          ce.unsubscribe &&
          (() => {
            ce.unsubscribe();
          }),
        yt;
      try {
        if (
          onUploadProgress &&
          f &&
          method !== "get" &&
          method !== "head" &&
          (yt = await b(headers, E)) !== 0
        ) {
          let V = new r(url, { method: "POST", body: E, duplex: "half" }),
            w;
          if (u.isFormData(E) && (w = V.headers.get("content-type"))) headers.setContentType(w);
          if (V.body) {
            let [R, C] = We(yt, le(Ge(onUploadProgress)));
            E = Xr(V.body, Ti, R, C);
          }
        }
        if (!u.isString(withCredentials)) withCredentials = withCredentials ? "include" : "omit";
        let U = s && "credentials" in r.prototype;
        if (u.isFormData(E)) {
          let contentType = headers.getContentType();
          if (contentType && /^multipart\/form-data/i.test(contentType) && !/boundary=/i.test(contentType))
            headers.delete("content-type");
        }
        let Le = {
          ...fetchOptions,
          signal: ce,
          method: method.toUpperCase(),
          headers: headers.normalize().toJSON(),
          body: E,
          duplex: "half",
          credentials: U ? withCredentials : void 0,
        };
        ae = s && new r(url, Le);
        let re = await (s ? Fe(ae, fetchOptions) : Fe(url, Le)),
          z = c && (responseType === "stream" || responseType === "response");
        if (c && (onDownloadProgress || (z && Z))) {
          let V = {};
          ["status", "statusText", "headers"].forEach((B) => {
            V[B] = re[B];
          });
          let toFiniteNumber = u.toFiniteNumber(re.headers.get("content-length")),
            [R, C] = (onDownloadProgress && We(toFiniteNumber, le(Ge(onDownloadProgress), !0))) || [];
          re = new n(
            Xr(re.body, Ti, R, () => {
              (C && C(), Z && Z());
            }),
            V,
          );
        }
        responseType = responseType || "text";
        let be = await p[u.findKey(p, responseType) || "text"](re, m);
        return (
          !z && Z && Z(),
          await new Promise((V, w) => {
            ue(V, w, {
              data: be,
              headers: F.from(re.headers),
              status: re.status,
              statusText: re.statusText,
              config: m,
              request: ae,
            });
          })
        );
      } catch (error) {
        if ((Z && Z(), error && error.name === "TypeError" && /Load failed|fetch/i.test(error.message)))
          throw Object.assign(new y("Network Error", y.ERR_NETWORK, m, ae, error && error.response), {
            cause: error.cause || error,
          });
        throw y.from(error, error && error.code, m, ae, error && error.response);
      }
    };
  },
  yl = new Map(),
  Yr = (e) => {
    let t = (e && e.env) || {},
      { fetch: r, Request: n, Response: o } = t,
      s = [n, o, r],
      i = s.length,
      a = i,
      l,
      f,
      c = yl;
    while (a--) ((l = s[a]), (f = c.get(l)), f === void 0 && c.set(l, (f = a ? new Map() : ml(t))), (c = f));
    return f;
  },
  Cm = Yr();
//@ chunk-h6b7mazd.js:94922-94961 esm-fingerprint
var Qr = { http: _i, xhr: Ci, fetch: { get: Yr } };
//@ chunk-h6b7mazd.js:94961-95096 esm-fingerprint
u.forEach(Qr, (e, t) => {
  if (e) {
    try {
      Object.defineProperty(e, "name", { value: t });
    } catch (error) {}
    Object.defineProperty(e, "adapterName", { value: t });
  }
});
//@ chunk-h6b7mazd.js:95096-95159 esm-layout
var Bi = (e) => `- ${e}`,
  gl = (e) => u.isFunction(e) || e === null || e === !1;
//@ chunk-h6b7mazd.js:95159-95738 esm-fingerprint
function El(e, t) {
  e = u.isArray(e) ? e : [e];
  let { length: r } = e,
    n,
    o,
    s = {};
  for (let i = 0; i < r; i++) {
    n = e[i];
    let a;
    if (((o = n), !gl(n))) {
      if (((o = Qr[(a = String(n)).toLowerCase()]), o === void 0)) throw new y(`Unknown adapter '${a}'`);
    }
    if (o && (u.isFunction(o) || (o = o.get(t)))) break;
    s[a || "#" + i] = o;
  }
  if (!o) {
    let mapped = Object.entries(s).map(
        ([l, f]) =>
          `adapter ${l} ` +
          (f === !1 ? "is not supported by the environment" : "is not available in the build"),
      ),
      a = r
        ? mapped.length > 1
          ? `since :
` +
            mapped.map(Bi).join(`
`)
          : " " + Bi(mapped[0])
        : "as no adapter specified";
    throw new y("There is no suitable adapter to dispatch the request " + a, "ERR_NOT_SUPPORT");
  }
  return o;
}
//@ chunk-h6b7mazd.js:95738-95773 esm-fingerprint
var $t = { getAdapter: El, adapters: Qr };
//@ chunk-h6b7mazd.js:95773-95888 esm-fingerprint
function Zr(e) {
  if (e.cancelToken) e.cancelToken.throwIfRequested();
  if (e.signal && e.signal.aborted) throw new Q(null, e);
}
//@ chunk-h6b7mazd.js:95888-96415 esm-fingerprint
function Vt(e) {
  if (
    (Zr(e),
    (e.headers = F.from(e.headers)),
    (e.data = st.call(e, e.transformRequest)),
    ["post", "put", "patch"].indexOf(e.method) !== -1)
  )
    e.headers.setContentType("application/x-www-form-urlencoded", !1);
  return $t
    .getAdapter(
      e.adapter || He.adapter,
      e,
    )(e)
    .then(
      function (n) {
        return (Zr(e), (n.data = st.call(e, e.transformResponse, n)), (n.headers = F.from(n.headers)), n);
      },
      function (n) {
        if (!it(n)) {
          if ((Zr(e), n && n.response))
            ((n.response.data = st.call(e, e.transformResponse, n.response)),
              (n.response.headers = F.from(n.response.headers)));
        }
        return Promise.reject(n);
      },
    );
}
//@ chunk-h6b7mazd.js:96415-96425 esm-layout
var Wt = {};
//@ chunk-h6b7mazd.js:96425-96563 esm-fingerprint
["object", "boolean", "number", "function", "string", "symbol"].forEach((e, t) => {
  Wt[e] = function (n) {
    return typeof n === e || "a" + (t < 1 ? "n " : " ") + e;
  };
});
//@ chunk-h6b7mazd.js:96563-96573 esm-layout
var Ni = {};
//@ chunk-h6b7mazd.js:96573-96925 esm-fingerprint
Wt.transitional = function (t, r, n) {
  function o(s, i) {
    return "[Axios v" + ve + "] Transitional option '" + s + "'" + i + (n ? ". " + n : "");
  }
  return (s, i, a) => {
    if (t === !1) throw new y(o(i, " has been removed" + (r ? " in " + r : "")), y.ERR_DEPRECATED);
    if (r && !Ni[i])
      ((Ni[i] = !0),
        console.warn(o(i, " has been deprecated since v" + r + " and will be removed in the near future")));
    return t ? t(s, i, a) : !0;
  };
};
//@ chunk-h6b7mazd.js:96925-97021 esm-fingerprint
Wt.spelling = function (t) {
  return (r, n) => (console.warn(`${n} is likely a misspelling of ${t}`), !0);
};
//@ chunk-h6b7mazd.js:97021-97422 esm-fingerprint
function Rl(e, t, r) {
  if (typeof e !== "object") throw new y("options must be an object", y.ERR_BAD_OPTION_VALUE);
  let keys = Object.keys(e),
    o = keys.length;
  while (o-- > 0) {
    let s = keys[o],
      i = Object.prototype.hasOwnProperty.call(t, s) ? t[s] : void 0;
    if (i) {
      let a = e[s],
        l = a === void 0 || i(a, s, e);
      if (l !== !0) throw new y("option " + s + " must be " + l, y.ERR_BAD_OPTION_VALUE);
      continue;
    }
    if (r !== !0) throw new y("Unknown option " + s, y.ERR_BAD_OPTION);
  }
}
//@ chunk-h6b7mazd.js:97422-97462 esm-fingerprint
var dt = { assertOptions: Rl, validators: Wt };
//@ chunk-h6b7mazd.js:97462-97483 esm-fingerprint
var validators = dt.validators;
//@ chunk-h6b7mazd.js:97483-99847 esm-fingerprint
class ht {
  constructor(e) {
    ((this.defaults = e || {}), (this.interceptors = { request: new yr(), response: new yr() }));
  }
  async request(e, t) {
    try {
      return await this._request(e, t);
    } catch (error) {
      if (error instanceof Error) {
        let n = {};
        Error.captureStackTrace ? Error.captureStackTrace(n) : (n = Error());
        let o = (() => {
          if (!n.stack) return "";
          let index = n.stack.indexOf(`
`);
          return index === -1 ? "" : n.stack.slice(index + 1);
        })();
        try {
          if (!error.stack) error.stack = o;
          else if (o) {
            let index = o.indexOf(`
`),
              i =
                index === -1
                  ? -1
                  : o.indexOf(
                      `
`,
                      index + 1,
                    ),
              a = i === -1 ? "" : o.slice(i + 1);
            if (!String(error.stack).endsWith(a))
              error.stack +=
                `
` + o;
          }
        } catch (error) {}
      }
      throw error;
    }
  }
  _request(e, t) {
    if (typeof e === "string") ((t = t || {}), (t.url = e));
    else t = e || {};
    t = ie(this.defaults, t);
    let { transitional: transitional, paramsSerializer: paramsSerializer, headers: headers } = t;
    if (transitional !== void 0)
      dt.assertOptions(
        transitional,
        {
          silentJSONParsing: validators.transitional(validators.boolean),
          forcedJSONParsing: validators.transitional(validators.boolean),
          clarifyTimeoutError: validators.transitional(validators.boolean),
          legacyInterceptorReqResOrdering: validators.transitional(validators.boolean),
        },
        !1,
      );
    if (paramsSerializer != null)
      if (u.isFunction(paramsSerializer)) t.paramsSerializer = { serialize: paramsSerializer };
      else
        dt.assertOptions(
          paramsSerializer,
          { encode: validators.function, serialize: validators.function },
          !0,
        );
    if (t.allowAbsoluteUrls !== void 0);
    else if (this.defaults.allowAbsoluteUrls !== void 0)
      t.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
    else t.allowAbsoluteUrls = !0;
    (dt.assertOptions(
      t,
      { baseUrl: validators.spelling("baseURL"), withXsrfToken: validators.spelling("withXSRFToken") },
      !0,
    ),
      (t.method = (t.method || this.defaults.method || "get").toLowerCase()));
    let s = headers && u.merge(headers.common, headers[t.method]);
    (headers &&
      u.forEach(["delete", "get", "head", "post", "put", "patch", "common"], (b) => {
        delete headers[b];
      }),
      (t.headers = F.concat(s, headers)));
    let i = [],
      a = !0;
    this.interceptors.request.forEach(function (m) {
      if (typeof m.runWhen === "function" && m.runWhen(t) === !1) return;
      a = a && m.synchronous;
      let g = t.transitional || he;
      if (g && g.legacyInterceptorReqResOrdering) i.unshift(m.fulfilled, m.rejected);
      else i.push(m.fulfilled, m.rejected);
    });
    let l = [];
    this.interceptors.response.forEach(function (m) {
      l.push(m.fulfilled, m.rejected);
    });
    let f,
      c = 0,
      p;
    if (!a) {
      let b = [Vt.bind(this), void 0];
      (b.unshift(...i), b.push(...l), (p = b.length), (f = Promise.resolve(t)));
      while (c < p) f = f.then(b[c++], b[c++]);
      return f;
    }
    p = i.length;
    let d = t;
    while (c < p) {
      let b = i[c++],
        m = i[c++];
      try {
        d = b(d);
      } catch (error) {
        m.call(this, error);
        break;
      }
    }
    try {
      f = Vt.call(this, d);
    } catch (error) {
      return Promise.reject(error);
    }
    ((c = 0), (p = l.length));
    while (c < p) f = f.then(l[c++], l[c++]);
    return f;
  }
  getUri(e) {
    e = ie(this.defaults, e);
    let t = _e(e.baseURL, e.url, e.allowAbsoluteUrls);
    return xe(t, e.params, e.paramsSerializer);
  }
}
//@ chunk-h6b7mazd.js:99847-100002 esm-fingerprint
u.forEach(["delete", "get", "head", "options"], function (t) {
  ht.prototype[t] = function (r, n) {
    return this.request(ie(n || {}, { method: t, url: r, data: (n || {}).data }));
  };
});
//@ chunk-h6b7mazd.js:100002-100243 esm-fingerprint
u.forEach(["post", "put", "patch"], function (t) {
  function r(n) {
    return function (s, i, a) {
      return this.request(
        ie(a || {}, {
          method: t,
          headers: n ? { "Content-Type": "multipart/form-data" } : {},
          url: s,
          data: i,
        }),
      );
    };
  }
  ((ht.prototype[t] = r()), (ht.prototype[t + "Form"] = r(!0)));
});
//@ chunk-h6b7mazd.js:100243-100253 esm-layout
var mt = ht;
//@ chunk-h6b7mazd.js:100253-101232 esm-fingerprint
class en {
  constructor(e) {
    if (typeof e !== "function") throw TypeError("executor must be a function.");
    let t;
    this.promise = new Promise(function (o) {
      t = o;
    });
    let r = this;
    (this.promise.then((n) => {
      if (!r._listeners) return;
      let o = r._listeners.length;
      while (o-- > 0) r._listeners[o](n);
      r._listeners = null;
    }),
      (this.promise.then = (n) => {
        let o,
          s = new Promise((i) => {
            (r.subscribe(i), (o = i));
          }).then(n);
        return (
          (s.cancel = function () {
            r.unsubscribe(o);
          }),
          s
        );
      }),
      e(function (o, s, i) {
        if (r.reason) return;
        ((r.reason = new Q(o, s, i)), t(r.reason));
      }));
  }
  throwIfRequested() {
    if (this.reason) throw this.reason;
  }
  subscribe(e) {
    if (this.reason) {
      e(this.reason);
      return;
    }
    if (this._listeners) this._listeners.push(e);
    else this._listeners = [e];
  }
  unsubscribe(e) {
    if (!this._listeners) return;
    let index = this._listeners.indexOf(e);
    if (index !== -1) this._listeners.splice(index, 1);
  }
  toAbortSignal() {
    let abortController = new AbortController(),
      t = (r) => {
        abortController.abort(r);
      };
    return (
      this.subscribe(t),
      (abortController.signal.unsubscribe = () => this.unsubscribe(t)),
      abortController.signal
    );
  }
  static source() {
    let e;
    return {
      token: new en(function (n) {
        e = n;
      }),
      cancel: e,
    };
  }
}
//@ chunk-h6b7mazd.js:101232-101242 esm-layout
var Di = en;
//@ chunk-h6b7mazd.js:101242-101300 esm-layout
function tn(e) {
  return function (r) {
    return e.apply(null, r);
  };
}
//@ chunk-h6b7mazd.js:101300-101357 esm-fingerprint
function rn(e) {
  return u.isObject(e) && e.isAxiosError === !0;
}
//@ chunk-h6b7mazd.js:101357-102695 esm-fingerprint
var nn = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
  WebServerIsDown: 521,
  ConnectionTimedOut: 522,
  OriginIsUnreachable: 523,
  TimeoutOccurred: 524,
  SslHandshakeFailed: 525,
  InvalidSslCertificate: 526,
};
//@ chunk-h6b7mazd.js:102695-102742 esm-fingerprint
Object.entries(nn).forEach(([e, t]) => {
  nn[t] = e;
});
//@ chunk-h6b7mazd.js:102742-102752 esm-layout
var HttpStatusCode = nn;
/**
 * axios 的 createInstance（第三方）。
 */
//@ chunk-h6b7mazd.js:102752-102940 esm-fingerprint
function createInstance(e) {
  let t = new mt(e),
    r = Ke(mt.prototype.request, t);
  return (
    u.extend(r, mt.prototype, t, { allOwnKeys: !0 }),
    u.extend(r, t, null, { allOwnKeys: !0 }),
    (r.create = function (o) {
      return createInstance(ie(e, o));
    }),
    r
  );
}
//@ chunk-h6b7mazd.js:102940-102953 esm-layout
var axios = createInstance(He);
//@ chunk-h6b7mazd.js:102953-102964 esm-fingerprint
axios.Axios = mt;
//@ chunk-h6b7mazd.js:102964-102982 esm-fingerprint
axios.CanceledError = Q;
//@ chunk-h6b7mazd.js:102982-102999 esm-fingerprint
axios.CancelToken = Di;
//@ chunk-h6b7mazd.js:102999-103013 esm-fingerprint
axios.isCancel = it;
//@ chunk-h6b7mazd.js:103013-103026 esm-fingerprint
axios.VERSION = ve;
//@ chunk-h6b7mazd.js:103026-103042 esm-fingerprint
axios.toFormData = de;
//@ chunk-h6b7mazd.js:103042-103057 esm-fingerprint
axios.AxiosError = y;
//@ chunk-h6b7mazd.js:103057-103082 esm-fingerprint
axios.Cancel = axios.CanceledError;
//@ chunk-h6b7mazd.js:103082-103123 esm-layout
axios.all = function (t) {
  return Promise.all(t);
};
//@ chunk-h6b7mazd.js:103123-103135 esm-fingerprint
axios.spread = tn;
//@ chunk-h6b7mazd.js:103135-103153 esm-fingerprint
axios.isAxiosError = rn;
//@ chunk-h6b7mazd.js:103153-103170 esm-fingerprint
axios.mergeConfig = ie;
//@ chunk-h6b7mazd.js:103170-103187 esm-fingerprint
axios.AxiosHeaders = F;
//@ chunk-h6b7mazd.js:103187-103243 esm-fingerprint
axios.formToJSON = (e) => Ft(u.isHTMLForm(e) ? new FormData(e) : e);
//@ chunk-h6b7mazd.js:103243-103270 esm-fingerprint
axios.getAdapter = $t.getAdapter;
//@ chunk-h6b7mazd.js:103270-103290 esm-fingerprint
axios.HttpStatusCode = HttpStatusCode;
//@ chunk-h6b7mazd.js:103290-103302 esm-layout
axios.default = axios;
//@ chunk-h6b7mazd.js:103302-103311 esm-layout
var Dt = axios;
//@ chunk-h6b7mazd.js:103311-103533 esm-fingerprint
var {
  Axios: Axios,
  AxiosError: AxiosError,
  CanceledError: CanceledError_2,
  isCancel: isCancel,
  CancelToken: CancelToken,
  VERSION: VERSION,
  all: all,
  Cancel: Cancel,
  isAxiosError: isAxiosError,
  spread: spread,
  toFormData: toFormData,
  AxiosHeaders: AxiosHeaders,
  HttpStatusCode: HttpStatusCode_2,
  formToJSON: formToJSON,
  getAdapter: getAdapter,
  mergeConfig: mergeConfig,
} = Dt;
//@ chunk-tyg7f3ek.js:378840-379702 affinity
function nA(e, n) {
  let r = 0,
    s = [],
    h = e,
    y = !0;
  for (;;) {
    if (y) {
      if (((y = !1), typeof h === "string")) r += tA(h, n - r);
      else if (typeof h === "number") r += Number.isFinite(h) ? String(h).length : 4;
      else if (typeof h === "boolean") r += h ? 4 : 5;
      else if (typeof h === "bigint") return !0;
      else if (Array.isArray(h)) {
        if (h.length > n - r) return !0;
        ((r += 2), s.push({ kind: "array", members: h, next: 0 }));
      } else if (typeof h === "object" && h !== null)
        ((r += 2), s.push({ kind: "object", holder: h, keys: Object.keys(h), next: 0, written: 0 }));
      else r += 4;
      if (r > n) return !0;
      continue;
    }
    let at = s.at(-1);
    if (at === void 0) return !1;
    if (at.kind === "array") {
      if (at.next >= at.members.length) {
        s.pop();
        continue;
      }
      if (at.next > 0) r += 1;
      ((h = at.members[at.next++]), (y = !0));
      continue;
    }
    if (at.next >= at.keys.length) {
      s.pop();
      continue;
    }
    let R = at.keys[at.next++],
      w = Reflect.get(at.holder, R);
    if (w === void 0 || typeof w === "function" || typeof w === "symbol") continue;
    if (at.written++ > 0) r += 1;
    if (((r += tA(R, n - r) + 1), r > n)) return !0;
    ((h = w), (y = !0));
  }
}
//@ chunk-tyg7f3ek.js:379702-380090 esm-fingerprint
function tA(e, n) {
  if (e.length + 2 > n) return e.length + 2;
  let r = 2;
  for (let s = 0; s < e.length; s++) {
    let code = e.charCodeAt(s);
    if (code === 34 || code === 92) r += 2;
    else if (code < 32) r += code === 8 || code === 9 || code === 10 || code === 12 || code === 13 ? 2 : 6;
    else if (code < 128) r += 1;
    else if (code < 2048) r += 2;
    else if (code >= 55296 && code <= 56319) {
      let code = e.charCodeAt(s + 1);
      if (code >= 56320 && code <= 57343) ((r += 4), s++);
      else r += 6;
    } else if (code >= 56320 && code <= 57343) r += 6;
    else r += 3;
    if (r > n) return r;
  }
  return r;
}

export { Dt, isAxiosError, isCancel, AxiosError, AxiosHeaders, Pt, Rr, de, u, he, y, xe, nA };
