/**
 * protobufjs/src/util.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_minimal } from "./util/minimal.js";
import { require_roots } from "./roots.js";
import { require_codegen } from "../../@protobufjs/codegen/index.js";
import { require_fetch } from "./util/fetch.js";
import { require_path } from "../../@protobufjs/path/index.js";
import { require_patterns } from "./util/patterns.js";
import { require_type } from "./type.js";
import { require_enum } from "./enum.js";
import { require_root } from "./root.js";

//@ chunk-pwh5dx3n.js:112807-114753 cjs-fingerprint
var require_util_2 = __commonJS(function (cjsExports, cjsModule) {
  var util = (cjsModule.exports = require_minimal());
  var roots = require_roots();
  var Type;
  var Enum;
  util.codegen = require_codegen();
  util.fetch = require_fetch();
  util.path = require_path();
  util.patterns = require_patterns();
  var reservedRe = util.patterns.reservedRe;
  var unsafePropertyRe = util.patterns.unsafePropertyRe;
  util.fs = util.inquire("fs");
  util.checkDepth = function (depth) {
    if (depth === undefined) depth = 0;
    if (depth > util.recursionLimit) throw Error("max depth exceeded");
    return depth;
  };
  util.toArray = function (object) {
    if (object) {
      var keys = Object.keys(object);
      var array = Array(keys.length);
      var index = 0;
      while (index < keys.length) array[index] = object[keys[index++]];
      return array;
    }
    return [];
  };
  util.toObject = function (array) {
    var object = {};
    var index = 0;
    while (index < array.length) {
      var key = array[index++];
      var val = array[index++];
      if (val !== undefined) object[key] = val;
    }
    return object;
  };
  util.isReserved = function (name) {
    return reservedRe.test(name);
  };
  util.safeProp = function (prop) {
    if (!/^[$\w_]+$/.test(prop) || reservedRe.test(prop)) return "[" + JSON.stringify(prop) + "]";
    return "." + prop;
  };
  util.ucFirst = function (str) {
    return str.charAt(0).toUpperCase() + str.substring(1);
  };
  var camelCaseRe = /_([a-z])/g;
  util.camelCase = function (str) {
    return (
      str.substring(0, 1) +
      str.substring(1).replace(camelCaseRe, function ($0, $1) {
        return $1.toUpperCase();
      })
    );
  };
  util.compareFieldsById = function (a, b) {
    return a.id - b.id;
  };
  util.decorateType = function (ctor, typeName) {
    if (ctor.$type) {
      if (typeName && ctor.$type.name !== typeName) {
        util.decorateRoot.remove(ctor.$type);
        ctor.$type.name = typeName;
        util.decorateRoot.add(ctor.$type);
      }
      return ctor.$type;
    }
    if (!Type) Type = require_type();
    var type = new Type(typeName || ctor.name);
    util.decorateRoot.add(type);
    type.ctor = ctor;
    Object.defineProperty(ctor, "$type", {
      value: type,
      enumerable: false,
    });
    Object.defineProperty(ctor.prototype, "$type", {
      value: type,
      enumerable: false,
    });
    return type;
  };
  var decorateEnumIndex = 0;
  util.decorateEnum = function (object) {
    if (object.$type) return object.$type;
    if (!Enum) Enum = require_enum();
    var enm = new Enum("Enum" + decorateEnumIndex++, object);
    util.decorateRoot.add(enm);
    Object.defineProperty(object, "$type", {
      value: enm,
      enumerable: false,
    });
    return enm;
  };
  util.setProperty = function (dst, path, value, ifNotSet) {
    function setProp(dst, path, value) {
      var part = path.shift();
      if (unsafePropertyRe.test(part)) return dst;
      if (path.length > 0) dst[part] = setProp(dst[part] || {}, path, value);
      else {
        var prevValue = dst[part];
        if (prevValue && ifNotSet) return dst;
        if (prevValue) value = [].concat(prevValue).concat(value);
        dst[part] = value;
      }
      return dst;
    }
    if (typeof dst !== "object") throw TypeError("dst must be an object");
    if (!path) throw TypeError("path must be specified");
    path = path.split(".");
    return setProp(dst, path, value);
  };
  Object.defineProperty(util, "decorateRoot", {
    get: function () {
      return roots.decorated || (roots.decorated = new (require_root())());
    },
  });
});
export { require_util_2 };
