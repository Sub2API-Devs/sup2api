/**
 * extend/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: extend@3.0.2
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../runtime/bun-runtime.js";

//@ chunk-na3pph4p.js:273-1502 cjs-fingerprint
var require_extend = __commonJS(function (cjsExports, cjsModule) {
  var hasOwn = Object.prototype.hasOwnProperty;
  var toStr = Object.prototype.toString;
  var { defineProperty, getOwnPropertyDescriptor: gOPD } = Object;
  var isArray = function (arr) {
    if (typeof Array.isArray === "function") return Array.isArray(arr);
    return toStr.call(arr) === "[object Array]";
  };
  var isPlainObject = function (obj) {
    if (!obj || toStr.call(obj) !== "[object Object]") return false;
    var hasOwnConstructor = hasOwn.call(obj, "constructor");
    var hasIsPrototypeOf =
      obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, "isPrototypeOf");
    if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) return false;
    var key;
    for (key in obj);
    return typeof key === "undefined" || hasOwn.call(obj, key);
  };
  var setProperty = function (target, options) {
    if (defineProperty && options.name === "__proto__")
      defineProperty(target, options.name, {
        enumerable: true,
        configurable: true,
        value: options.newValue,
        writable: true,
      });
    else target[options.name] = options.newValue;
  };
  var getProperty = function (obj, name) {
    if (name === "__proto__") {
      if (!hasOwn.call(obj, name)) return;
      else if (gOPD) return gOPD(obj, name).value;
    }
    return obj[name];
  };
  cjsModule.exports = function extend() {
    var options;
    var name;
    var src;
    var copy;
    var copyIsArray;
    var clone;
    var target = arguments[0];
    var i = 1;
    var length = arguments.length;
    var deep = false;
    if (typeof target === "boolean") {
      deep = target;
      target = arguments[1] || {};
      i = 2;
    }
    if (target == null || (typeof target !== "object" && typeof target !== "function")) target = {};
    for (; i < length; ++i) {
      options = arguments[i];
      if (options != null) {
        for (name in options) {
          src = getProperty(target, name);
          copy = getProperty(options, name);
          if (target !== copy) {
            if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
              if (copyIsArray) {
                copyIsArray = false;
                clone = src && isArray(src) ? src : [];
              } else clone = src && isPlainObject(src) ? src : {};
              setProperty(target, {
                name,
                newValue: extend(deep, clone, copy),
              });
            } else if (typeof copy !== "undefined")
              setProperty(target, {
                name,
                newValue: copy,
              });
          }
        }
      }
    }
    return target;
  };
});
export { require_extend };
