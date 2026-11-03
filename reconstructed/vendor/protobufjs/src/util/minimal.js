/**
 * protobufjs/src/util/minimal.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_aspromise } from "./aspromise.js";
import { require_base64 } from "./base64.js";
import { require_eventemitter } from "./eventemitter.js";
import { require_float } from "./float.js";
import { require_inquire } from "./inquire.js";
import { require_utf8 } from "./utf8.js";
import { require_pool } from "./pool.js";
import { require_longbits } from "./longbits.js";

//@ chunk-798ashq9.js:27725-30944 cjs-fingerprint
var require_minimal = x(function (cjsExports) {
  var util = cjsExports;
  util.asPromise = require_aspromise();
  util.base64 = require_base64();
  util.EventEmitter = require_eventemitter();
  util.float = require_float();
  util.inquire = require_inquire();
  util.utf8 = require_utf8();
  util.pool = require_pool();
  util.LongBits = require_longbits();
  util.isNode = Boolean(
    typeof global !== "undefined" &&
    global &&
    global.process &&
    global.process.versions &&
    global.process.versions.node,
  );
  util.global =
    (util.isNode && global) ||
    (typeof window !== "undefined" && window) ||
    (typeof self !== "undefined" && self) ||
    cjsExports;
  util.emptyArray = Object.freeze ? Object.freeze([]) : [];
  util.emptyObject = Object.freeze ? Object.freeze({}) : {};
  util.isInteger =
    Number.isInteger ||
    function (value) {
      return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
    };
  util.isString = function (value) {
    return typeof value === "string" || value instanceof String;
  };
  util.isObject = function (value) {
    return value && typeof value === "object";
  };
  util.isset = util.isSet = function (obj, prop) {
    var value = obj[prop];
    if (value != null && obj.hasOwnProperty(prop))
      return (
        typeof value !== "object" || (Array.isArray(value) ? value.length : Object.keys(value).length) > 0
      );
    return false;
  };
  util.Buffer = (function () {
    try {
      var l = util.inquire("buffer").Buffer;
      return l.prototype.utf8Write ? l : null;
    } catch (e) {
      return null;
    }
  })();
  util._Buffer_from = null;
  util._Buffer_allocUnsafe = null;
  util.newBuffer = function (sizeOrArray) {
    return typeof sizeOrArray === "number"
      ? util.Buffer
        ? util._Buffer_allocUnsafe(sizeOrArray)
        : new util.Array(sizeOrArray)
      : util.Buffer
        ? util._Buffer_from(sizeOrArray)
        : typeof Uint8Array === "undefined"
          ? sizeOrArray
          : new Uint8Array(sizeOrArray);
  };
  util.Array = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
  util.Long = (util.global.dcodeIO && util.global.dcodeIO.Long) || util.global.Long || util.inquire("long");
  util.key2Re = /^true|false|0|1$/;
  util.key32Re = /^-?(?:0|[1-9][0-9]*)$/;
  util.key64Re = /^(?:[\\x00-\\xff]{8}|-?(?:0|[1-9][0-9]*))$/;
  util.longToHash = function (value) {
    return value ? util.LongBits.from(value).toHash() : util.LongBits.zeroHash;
  };
  util.longFromHash = function (hash, unsigned) {
    var bits = util.LongBits.fromHash(hash);
    if (util.Long) return util.Long.fromBits(bits.lo, bits.hi, unsigned);
    return bits.toNumber(Boolean(unsigned));
  };
  function merge(dst, src, ifNotSet) {
    for (var keys = Object.keys(src), i = 0; i < keys.length; ++i)
      if (dst[keys[i]] === undefined || !ifNotSet) {
        if (keys[i] !== "__proto__") dst[keys[i]] = src[keys[i]];
      }
    return dst;
  }
  util.merge = merge;
  util.recursionLimit = 100;
  util.makeProp = function (obj, key) {
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      writable: true,
    });
  };
  util.lcFirst = function (str) {
    return str.charAt(0).toLowerCase() + str.substring(1);
  };
  function newError(name) {
    function CustomError(message, properties) {
      if (!(this instanceof CustomError)) return new CustomError(message, properties);
      Object.defineProperty(this, "message", {
        get: function () {
          return message;
        },
      });
      if (Error.captureStackTrace) Error.captureStackTrace(this, CustomError);
      else
        Object.defineProperty(this, "stack", {
          value: Error().stack || "",
        });
      if (properties) merge(this, properties);
    }
    CustomError.prototype = Object.create(Error.prototype, {
      constructor: {
        value: CustomError,
        writable: true,
        enumerable: false,
        configurable: true,
      },
      name: {
        get: function () {
          return name;
        },
        set: undefined,
        enumerable: false,
        configurable: true,
      },
      toString: {
        value: function () {
          return this.name + ": " + this.message;
        },
        writable: true,
        enumerable: false,
        configurable: true,
      },
    });
    return CustomError;
  }
  util.newError = newError;
  util.ProtocolError = newError("ProtocolError");
  util.oneOfGetter = function (fieldNames) {
    var fieldMap = {};
    for (var i = 0; i < fieldNames.length; ++i) fieldMap[fieldNames[i]] = 1;
    return function () {
      for (var keys = Object.keys(this), i = keys.length - 1; i > -1; --i)
        if (fieldMap[keys[i]] === 1 && this[keys[i]] !== undefined && this[keys[i]] !== null) return keys[i];
    };
  };
  util.oneOfSetter = function (fieldNames) {
    return function (name) {
      for (var i = 0; i < fieldNames.length; ++i) if (fieldNames[i] !== name) delete this[fieldNames[i]];
    };
  };
  util.toJSONOptions = {
    longs: String,
    enums: String,
    bytes: String,
    json: true,
  };
  util._configure = function () {
    var l = util.Buffer;
    if (!l) {
      util._Buffer_from = util._Buffer_allocUnsafe = null;
      return;
    }
    util._Buffer_from =
      (l.from !== Uint8Array.from && l.from) ||
      function (value, encoding) {
        return new l(value, encoding);
      };
    util._Buffer_allocUnsafe =
      l.allocUnsafe ||
      function (size) {
        return new l(size);
      };
  };
});
export { require_minimal };
