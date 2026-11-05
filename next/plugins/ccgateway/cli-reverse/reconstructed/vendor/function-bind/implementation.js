/**
 * function-bind/implementation.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: function-bind@1.1.2
 * pieces: chunk-ww9agm6g.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../runtime/bun-runtime.js";

//@ chunk-ww9agm6g.js:9877-10856 cjs-fingerprint
var require_implementation = __commonJS(function (cjsExports, cjsModule) {
  var ERROR_MESSAGE = "Function.prototype.bind called on incompatible ";
  var toStr = Object.prototype.toString;
  var max = Math.max;
  var funcType = "[object Function]";
  var concatty = function (a, b) {
    var arr = [];
    for (var i = 0; i < a.length; i += 1) arr[i] = a[i];
    for (var j = 0; j < b.length; j += 1) arr[j + a.length] = b[j];
    return arr;
  };
  var slicy = function (arrLike, offset) {
    var arr = [];
    for (var i = offset || 0, j = 0; i < arrLike.length; i += 1, j += 1) arr[j] = arrLike[i];
    return arr;
  };
  var joiny = function (arr, joiner) {
    var str = "";
    for (var i = 0; i < arr.length; i += 1) {
      str += arr[i];
      if (i + 1 < arr.length) str += joiner;
    }
    return str;
  };
  cjsModule.exports = function (that) {
    var target = this;
    if (typeof target !== "function" || toStr.apply(target) !== funcType)
      throw TypeError(ERROR_MESSAGE + target);
    var args = slicy(arguments, 1);
    var bound;
    var binder = function () {
      if (this instanceof bound) {
        var result = target.apply(this, concatty(args, arguments));
        if (Object(result) === result) return result;
        return this;
      }
      return target.apply(that, concatty(args, arguments));
    };
    var boundLength = max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) boundArgs[i] = "$" + i;
    bound = Function(
      "binder",
      "return function (" + joiny(boundArgs, ",") + "){ return binder.apply(this,arguments); }",
    )(binder);
    if (target.prototype) {
      var Empty = function () {};
      Empty.prototype = target.prototype;
      bound.prototype = new Empty();
      Empty.prototype = null;
    }
    return bound;
  };
});
export { require_implementation };
