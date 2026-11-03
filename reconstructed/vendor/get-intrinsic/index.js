/**
 * get-intrinsic/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: get-intrinsic@1.3.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import {
  require_es_object_atoms,
  require_es_object_atoms_2,
  require_es_object_atoms_3,
  require_es_object_atoms_4,
  require_es_object_atoms_5,
  require_es_object_atoms_6,
  require_es_object_atoms_7,
  require_es_object_atoms_8,
  require_es_object_atoms_9,
} from "../es-object-atoms/index.js";
import { require_abs } from "../math-intrinsics/abs.js";
import { require_floor } from "../math-intrinsics/floor.js";
import { require_max } from "../math-intrinsics/max.js";
import { require_min } from "../math-intrinsics/min.js";
import { require_pow } from "../math-intrinsics/pow.js";
import { require_round } from "../math-intrinsics/round.js";
import { require_gopd } from "../gopd/index.js";
import { require_es_define_property } from "../es-define-property/index.js";
import { require_has_symbols } from "../has-symbols/index.js";
import { require_get_proto } from "../get-proto/index.js";
import {
  require_Reflect_getPrototypeOf_2,
  require_Reflect_getPrototypeOf,
} from "../get-proto/Reflect.getPrototypeOf.js";
import { require_functionApply } from "../call-bind-apply-helpers/functionApply.js";
import { require_functionCall, require_functionCall_2 } from "../call-bind-apply-helpers/functionCall.js";
import { require_function_bind } from "../function-bind/index.js";

//@ chunk-h6b7mazd.js:12174-20428 cjs-fingerprint
var require_get_intrinsic = x(function (cjsExports, cjsModule) {
  var S;
  var $Object = require_es_object_atoms();
  var $Error = require_es_object_atoms_2();
  var $EvalError = require_es_object_atoms_3();
  var $RangeError = require_es_object_atoms_4();
  var $ReferenceError = require_es_object_atoms_5();
  var $SyntaxError = require_es_object_atoms_6();
  var $TypeError = require_es_object_atoms_7();
  var $URIError = require_es_object_atoms_8();
  var abs = require_abs();
  var floor = require_floor();
  var max = require_max();
  var min = require_min();
  var pow = require_pow();
  var round = require_round();
  var sign = require_es_object_atoms_9();
  var $Function = Function;
  var getEvalledConstructor = function (expressionSyntax) {
    try {
      return $Function('"use strict"; return (' + expressionSyntax + ").constructor;")();
    } catch (e) {}
  };
  var $gOPD = require_gopd();
  var $defineProperty = require_es_define_property();
  var throwTypeError = function () {
    throw new $TypeError();
  };
  var ThrowTypeError = $gOPD
    ? (function () {
        try {
          arguments.callee;
          return throwTypeError;
        } catch (calleeThrows) {
          try {
            return $gOPD(arguments, "callee").get;
          } catch (gOPDthrows) {
            return throwTypeError;
          }
        }
      })()
    : throwTypeError;
  var hasSymbols = require_has_symbols()();
  var getProto = require_get_proto();
  var $ObjectGPO = require_Reflect_getPrototypeOf_2();
  var $ReflectGPO = require_Reflect_getPrototypeOf();
  var $apply = require_functionApply();
  var $call = require_functionCall();
  var needsEval = {};
  var TypedArray = typeof Uint8Array === "undefined" || !getProto ? S : getProto(Uint8Array);
  var INTRINSICS = {
    __proto__: null,
    "%AggregateError%": typeof AggregateError === "undefined" ? S : AggregateError,
    "%Array%": Array,
    "%ArrayBuffer%": typeof ArrayBuffer === "undefined" ? S : ArrayBuffer,
    "%ArrayIteratorPrototype%": hasSymbols && getProto ? getProto([][Symbol.iterator]()) : S,
    "%AsyncFromSyncIteratorPrototype%": S,
    "%AsyncFunction%": needsEval,
    "%AsyncGenerator%": needsEval,
    "%AsyncGeneratorFunction%": needsEval,
    "%AsyncIteratorPrototype%": needsEval,
    "%Atomics%": typeof Atomics === "undefined" ? S : Atomics,
    "%BigInt%": typeof BigInt === "undefined" ? S : BigInt,
    "%BigInt64Array%": typeof BigInt64Array === "undefined" ? S : BigInt64Array,
    "%BigUint64Array%": typeof BigUint64Array === "undefined" ? S : BigUint64Array,
    "%Boolean%": Boolean,
    "%DataView%": typeof DataView === "undefined" ? S : DataView,
    "%Date%": Date,
    "%decodeURI%": decodeURI,
    "%decodeURIComponent%": decodeURIComponent,
    "%encodeURI%": encodeURI,
    "%encodeURIComponent%": encodeURIComponent,
    "%Error%": $Error,
    "%eval%": eval,
    "%EvalError%": $EvalError,
    "%Float16Array%": typeof Float16Array === "undefined" ? S : Float16Array,
    "%Float32Array%": typeof Float32Array === "undefined" ? S : Float32Array,
    "%Float64Array%": typeof Float64Array === "undefined" ? S : Float64Array,
    "%FinalizationRegistry%": typeof FinalizationRegistry === "undefined" ? S : FinalizationRegistry,
    "%Function%": $Function,
    "%GeneratorFunction%": needsEval,
    "%Int8Array%": typeof Int8Array === "undefined" ? S : Int8Array,
    "%Int16Array%": typeof Int16Array === "undefined" ? S : Int16Array,
    "%Int32Array%": typeof Int32Array === "undefined" ? S : Int32Array,
    "%isFinite%": isFinite,
    "%isNaN%": isNaN,
    "%IteratorPrototype%": hasSymbols && getProto ? getProto(getProto([][Symbol.iterator]())) : S,
    "%JSON%": typeof JSON === "object" ? JSON : S,
    "%Map%": typeof Map === "undefined" ? S : Map,
    "%MapIteratorPrototype%":
      typeof Map === "undefined" || !hasSymbols || !getProto ? S : getProto(new Map()[Symbol.iterator]()),
    "%Math%": Math,
    "%Number%": Number,
    "%Object%": $Object,
    "%Object.getOwnPropertyDescriptor%": $gOPD,
    "%parseFloat%": parseFloat,
    "%parseInt%": parseInt,
    "%Promise%": typeof Promise === "undefined" ? S : Promise,
    "%Proxy%": typeof Proxy === "undefined" ? S : Proxy,
    "%RangeError%": $RangeError,
    "%ReferenceError%": $ReferenceError,
    "%Reflect%": typeof Reflect === "undefined" ? S : Reflect,
    "%RegExp%": RegExp,
    "%Set%": typeof Set === "undefined" ? S : Set,
    "%SetIteratorPrototype%":
      typeof Set === "undefined" || !hasSymbols || !getProto ? S : getProto(new Set()[Symbol.iterator]()),
    "%SharedArrayBuffer%": typeof SharedArrayBuffer === "undefined" ? S : SharedArrayBuffer,
    "%String%": String,
    "%StringIteratorPrototype%": hasSymbols && getProto ? getProto(""[Symbol.iterator]()) : S,
    "%Symbol%": hasSymbols ? Symbol : S,
    "%SyntaxError%": $SyntaxError,
    "%ThrowTypeError%": ThrowTypeError,
    "%TypedArray%": TypedArray,
    "%TypeError%": $TypeError,
    "%Uint8Array%": typeof Uint8Array === "undefined" ? S : Uint8Array,
    "%Uint8ClampedArray%": typeof Uint8ClampedArray === "undefined" ? S : Uint8ClampedArray,
    "%Uint16Array%": typeof Uint16Array === "undefined" ? S : Uint16Array,
    "%Uint32Array%": typeof Uint32Array === "undefined" ? S : Uint32Array,
    "%URIError%": $URIError,
    "%WeakMap%": typeof WeakMap === "undefined" ? S : WeakMap,
    "%WeakRef%": typeof WeakRef === "undefined" ? S : WeakRef,
    "%WeakSet%": typeof WeakSet === "undefined" ? S : WeakSet,
    "%Function.prototype.call%": $call,
    "%Function.prototype.apply%": $apply,
    "%Object.defineProperty%": $defineProperty,
    "%Object.getPrototypeOf%": $ObjectGPO,
    "%Math.abs%": abs,
    "%Math.floor%": floor,
    "%Math.max%": max,
    "%Math.min%": min,
    "%Math.pow%": pow,
    "%Math.round%": round,
    "%Math.sign%": sign,
    "%Reflect.getPrototypeOf%": $ReflectGPO,
  };
  if (getProto)
    try {
      null.error;
    } catch (error) {
      errorProto = getProto(getProto(error));
      INTRINSICS["%Error.prototype%"] = errorProto;
    }
  var errorProto;
  var doEval = function doEval(name) {
    var value;
    if (name === "%AsyncFunction%") value = getEvalledConstructor("async function () {}");
    else if (name === "%GeneratorFunction%") value = getEvalledConstructor("function* () {}");
    else if (name === "%AsyncGeneratorFunction%") value = getEvalledConstructor("async function* () {}");
    else if (name === "%AsyncGenerator%") {
      var fn = doEval("%AsyncGeneratorFunction%");
      if (fn) value = fn.prototype;
    } else if (name === "%AsyncIteratorPrototype%") {
      var gen = doEval("%AsyncGenerator%");
      if (gen && getProto) value = getProto(gen.prototype);
    }
    INTRINSICS[name] = value;
    return value;
  };
  var LEGACY_ALIASES = {
    __proto__: null,
    "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
    "%ArrayPrototype%": ["Array", "prototype"],
    "%ArrayProto_entries%": ["Array", "prototype", "entries"],
    "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
    "%ArrayProto_keys%": ["Array", "prototype", "keys"],
    "%ArrayProto_values%": ["Array", "prototype", "values"],
    "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
    "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
    "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
    "%BooleanPrototype%": ["Boolean", "prototype"],
    "%DataViewPrototype%": ["DataView", "prototype"],
    "%DatePrototype%": ["Date", "prototype"],
    "%ErrorPrototype%": ["Error", "prototype"],
    "%EvalErrorPrototype%": ["EvalError", "prototype"],
    "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
    "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
    "%FunctionPrototype%": ["Function", "prototype"],
    "%Generator%": ["GeneratorFunction", "prototype"],
    "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
    "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
    "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
    "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
    "%JSONParse%": ["JSON", "parse"],
    "%JSONStringify%": ["JSON", "stringify"],
    "%MapPrototype%": ["Map", "prototype"],
    "%NumberPrototype%": ["Number", "prototype"],
    "%ObjectPrototype%": ["Object", "prototype"],
    "%ObjProto_toString%": ["Object", "prototype", "toString"],
    "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
    "%PromisePrototype%": ["Promise", "prototype"],
    "%PromiseProto_then%": ["Promise", "prototype", "then"],
    "%Promise_all%": ["Promise", "all"],
    "%Promise_reject%": ["Promise", "reject"],
    "%Promise_resolve%": ["Promise", "resolve"],
    "%RangeErrorPrototype%": ["RangeError", "prototype"],
    "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
    "%RegExpPrototype%": ["RegExp", "prototype"],
    "%SetPrototype%": ["Set", "prototype"],
    "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
    "%StringPrototype%": ["String", "prototype"],
    "%SymbolPrototype%": ["Symbol", "prototype"],
    "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
    "%TypedArrayPrototype%": ["TypedArray", "prototype"],
    "%TypeErrorPrototype%": ["TypeError", "prototype"],
    "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
    "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
    "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
    "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
    "%URIErrorPrototype%": ["URIError", "prototype"],
    "%WeakMapPrototype%": ["WeakMap", "prototype"],
    "%WeakSetPrototype%": ["WeakSet", "prototype"],
  };
  var bind = require_function_bind();
  var hasOwn = require_functionCall_2();
  var $concat = bind.call($call, Array.prototype.concat);
  var $spliceApply = bind.call($apply, Array.prototype.splice);
  var $replace = bind.call($call, String.prototype.replace);
  var $strSlice = bind.call($call, String.prototype.slice);
  var $exec = bind.call($call, RegExp.prototype.exec);
  var rePropName =
    /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
  var reEscapeChar = /\\(\\)?/g;
  var stringToPath = function (string) {
    var first = $strSlice(string, 0, 1);
    var last = $strSlice(string, -1);
    if (first === "%" && last !== "%")
      throw new $SyntaxError("invalid intrinsic syntax, expected closing `%`");
    else if (last === "%" && first !== "%")
      throw new $SyntaxError("invalid intrinsic syntax, expected opening `%`");
    var result = [];
    $replace(string, rePropName, function (match, number, quote, subString) {
      result[result.length] = quote ? $replace(subString, reEscapeChar, "$1") : number || match;
    });
    return result;
  };
  var getBaseIntrinsic = function (name, allowMissing) {
    var intrinsicName = name;
    var alias;
    if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
      alias = LEGACY_ALIASES[intrinsicName];
      intrinsicName = "%" + alias[0] + "%";
    }
    if (hasOwn(INTRINSICS, intrinsicName)) {
      var value = INTRINSICS[intrinsicName];
      if (value === needsEval) value = doEval(intrinsicName);
      if (typeof value === "undefined" && !allowMissing)
        throw new $TypeError("intrinsic " + name + " exists, but is not available. Please file an issue!");
      return {
        alias,
        name: intrinsicName,
        value,
      };
    }
    throw new $SyntaxError("intrinsic " + name + " does not exist!");
  };
  cjsModule.exports = function (name, allowMissing) {
    if (typeof name !== "string" || name.length === 0)
      throw new $TypeError("intrinsic name must be a non-empty string");
    if (arguments.length > 1 && typeof allowMissing !== "boolean")
      throw new $TypeError('"allowMissing" argument must be a boolean');
    if ($exec(/^%?[^%]*%?$/, name) === null)
      throw new $SyntaxError(
        "`%` may not be present anywhere but at the beginning and end of the intrinsic name",
      );
    var parts = stringToPath(name);
    var intrinsicBaseName = parts.length > 0 ? parts[0] : "";
    var baseIntrinsic = getBaseIntrinsic("%" + intrinsicBaseName + "%", allowMissing);
    var { name: intrinsicRealName, value } = baseIntrinsic;
    var skipFurtherCaching = false;
    var alias = baseIntrinsic.alias;
    if (alias) {
      intrinsicBaseName = alias[0];
      $spliceApply(parts, $concat([0, 1], alias));
    }
    for (var i = 1, isOwn = true; i < parts.length; i += 1) {
      var part = parts[i];
      var first = $strSlice(part, 0, 1);
      var last = $strSlice(part, -1);
      if (
        (first === '"' || first === "'" || first === "`" || last === '"' || last === "'" || last === "`") &&
        first !== last
      )
        throw new $SyntaxError("property names with quotes must have matching quotes");
      if (part === "constructor" || !isOwn) skipFurtherCaching = true;
      intrinsicBaseName += "." + part;
      intrinsicRealName = "%" + intrinsicBaseName + "%";
      if (hasOwn(INTRINSICS, intrinsicRealName)) value = INTRINSICS[intrinsicRealName];
      else if (value != null) {
        if (!(part in value)) {
          if (!allowMissing)
            throw new $TypeError(
              "base intrinsic for " + name + " exists, but the property is not available.",
            );
          return;
        }
        if ($gOPD && i + 1 >= parts.length) {
          var desc = $gOPD(value, part);
          isOwn = !!desc;
          if (isOwn && "get" in desc && !("originalValue" in desc.get)) value = desc.get;
          else value = value[part];
        } else {
          isOwn = hasOwn(value, part);
          value = value[part];
        }
        if (isOwn && !skipFurtherCaching) INTRINSICS[intrinsicRealName] = value;
      }
    }
    return value;
  };
});
export { require_get_intrinsic };
