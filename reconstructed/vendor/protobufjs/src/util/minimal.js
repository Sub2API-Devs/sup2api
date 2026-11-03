/**
 * protobufjs/src/util/minimal.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { QPo } from "./aspromise.js";
import { lr } from "./base64.js";
import { ar } from "./eventemitter.js";
import { mr } from "./float.js";
import { br } from "./inquire.js";
import { xr } from "./utf8.js";
import { gr } from "./pool.js";
import { Tr } from "./longbits.js";

//@ chunk-798ashq9.js:27725-30944 cjs-fingerprint
var QGe = x(function (Yt) {
  var S = Yt;
  S.asPromise = QPo();
  S.base64 = lr();
  S.EventEmitter = ar();
  S.float = mr();
  S.inquire = br();
  S.utf8 = xr();
  S.pool = gr();
  S.LongBits = Tr();
  S.isNode = Boolean(
    typeof global < "u" &&
    global &&
    global.process &&
    global.process.versions &&
    global.process.versions.node,
  );
  S.global = (S.isNode && global) || (typeof window < "u" && window) || (typeof self < "u" && self) || Yt;
  S.emptyArray = Object.freeze ? Object.freeze([]) : [];
  S.emptyObject = Object.freeze ? Object.freeze({}) : {};
  S.isInteger =
    Number.isInteger ||
    function (u) {
      return typeof u === "number" && isFinite(u) && Math.floor(u) === u;
    };
  S.isString = function (u) {
    return typeof u === "string" || u instanceof String;
  };
  S.isObject = function (u) {
    return u && typeof u === "object";
  };
  S.isset = S.isSet = function (u, f) {
    var d = u[f];
    if (d != null && u.hasOwnProperty(f))
      return typeof d !== "object" || (Array.isArray(d) ? d.length : Object.keys(d).length) > 0;
    return !1;
  };
  S.Buffer = (function () {
    try {
      var l = S.inquire("buffer").Buffer;
      return l.prototype.utf8Write ? l : null;
    } catch (error) {
      return null;
    }
  })();
  S._Buffer_from = null;
  S._Buffer_allocUnsafe = null;
  S.newBuffer = function (u) {
    return typeof u === "number"
      ? S.Buffer
        ? S._Buffer_allocUnsafe(u)
        : new S.Array(u)
      : S.Buffer
        ? S._Buffer_from(u)
        : typeof Uint8Array > "u"
          ? u
          : new Uint8Array(u);
  };
  S.Array = typeof Uint8Array < "u" ? Uint8Array : Array;
  S.Long = (S.global.dcodeIO && S.global.dcodeIO.Long) || S.global.Long || S.inquire("long");
  S.key2Re = /^true|false|0|1$/;
  S.key32Re = /^-?(?:0|[1-9][0-9]*)$/;
  S.key64Re = /^(?:[\\x00-\\xff]{8}|-?(?:0|[1-9][0-9]*))$/;
  S.longToHash = function (u) {
    return u ? S.LongBits.from(u).toHash() : S.LongBits.zeroHash;
  };
  S.longFromHash = function (u, f) {
    var fromHash = S.LongBits.fromHash(u);
    if (S.Long) return S.Long.fromBits(fromHash.lo, fromHash.hi, f);
    return fromHash.toNumber(Boolean(f));
  };
  function wr(l, u, f) {
    for (var keys = Object.keys(u), i = 0; i < keys.length; ++i)
      if (l[keys[i]] === void 0 || !f) {
        if (keys[i] !== "__proto__") l[keys[i]] = u[keys[i]];
      }
    return l;
  }
  S.merge = wr;
  S.recursionLimit = 100;
  S.makeProp = function (u, f) {
    Object.defineProperty(u, f, { enumerable: !0, configurable: !0, writable: !0 });
  };
  S.lcFirst = function (u) {
    return u.charAt(0).toLowerCase() + u.substring(1);
  };
  function Er(l) {
    function u(f, d) {
      if (!(this instanceof u)) return new u(f, d);
      if (
        (Object.defineProperty(this, "message", {
          get: function () {
            return f;
          },
        }),
        Error.captureStackTrace)
      )
        Error.captureStackTrace(this, u);
      else Object.defineProperty(this, "stack", { value: Error().stack || "" });
      if (d) wr(this, d);
    }
    return (
      (u.prototype = Object.create(Error.prototype, {
        constructor: { value: u, writable: !0, enumerable: !1, configurable: !0 },
        name: {
          get: function () {
            return l;
          },
          set: void 0,
          enumerable: !1,
          configurable: !0,
        },
        toString: {
          value: function () {
            return this.name + ": " + this.message;
          },
          writable: !0,
          enumerable: !1,
          configurable: !0,
        },
      })),
      u
    );
  }
  S.newError = Er;
  S.ProtocolError = Er("ProtocolError");
  S.oneOfGetter = function (u) {
    var f = {};
    for (var d = 0; d < u.length; ++d) f[u[d]] = 1;
    return function () {
      for (var keys = Object.keys(this), o = keys.length - 1; o > -1; --o)
        if (f[keys[o]] === 1 && this[keys[o]] !== void 0 && this[keys[o]] !== null) return keys[o];
    };
  };
  S.oneOfSetter = function (u) {
    return function (f) {
      for (var d = 0; d < u.length; ++d) if (u[d] !== f) delete this[u[d]];
    };
  };
  S.toJSONOptions = { longs: String, enums: String, bytes: String, json: !0 };
  S._configure = function () {
    var l = S.Buffer;
    if (!l) {
      S._Buffer_from = S._Buffer_allocUnsafe = null;
      return;
    }
    ((S._Buffer_from =
      (l.from !== Uint8Array.from && l.from) ||
      function (f, d) {
        return new l(f, d);
      }),
      (S._Buffer_allocUnsafe =
        l.allocUnsafe ||
        function (f) {
          return new l(f);
        }));
  };
});

export { QGe };
