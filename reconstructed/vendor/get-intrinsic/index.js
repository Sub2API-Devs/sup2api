/**
 * get-intrinsic/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: get-intrinsic@1.3.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { er, $n, Wn, Jn, Xn, Qn, _t, to, go } from "../es-object-atoms/index.js";
import { no } from "../math-intrinsics/abs.js";
import { so } from "../math-intrinsics/floor.js";
import { ao } from "../math-intrinsics/max.js";
import { co } from "../math-intrinsics/min.js";
import { lo } from "../math-intrinsics/pow.js";
import { ho } from "../math-intrinsics/round.js";
import { tr } from "../gopd/index.js";
import { _o } from "../es-define-property/index.js";
import { Co } from "../has-symbols/index.js";
import { Qo } from "../get-proto/index.js";
import { or, nr } from "../get-proto/Reflect.getPrototypeOf.js";
import { sr } from "../call-bind-apply-helpers/functionApply.js";
import { Ot, es } from "../call-bind-apply-helpers/functionCall.js";
import { Ee } from "../function-bind/index.js";

//@ chunk-h6b7mazd.js:12174-20428 cjs-fingerprint
var is = x(function (gp, ss) {
  var S,
    gu = er(),
    Eu = $n(),
    Ru = Wn(),
    wu = Jn(),
    xu = Xn(),
    je = Qn(),
    ke = _t(),
    _u = to(),
    Su = no(),
    Au = so(),
    Ou = ao(),
    Cu = co(),
    vu = lo(),
    Tu = ho(),
    Pu = go(),
    ns = Function,
    ar = function (e) {
      try {
        return ns('"use strict"; return (' + e + ").constructor;")();
      } catch (error) {}
    },
    et = tr(),
    Fu = _o(),
    ur = function () {
      throw new ke();
    },
    Lu = et
      ? (function () {
          try {
            return (arguments.callee, ur);
          } catch (error) {
            try {
              return et(arguments, "callee").get;
            } catch (error) {
              return ur;
            }
          }
        })()
      : ur,
    qe = Co()(),
    M = Qo(),
    Bu = or(),
    Nu = nr(),
    os = sr(),
    tt = Ot(),
    Ie = {},
    Du = typeof Uint8Array > "u" || !M ? S : M(Uint8Array),
    we = {
      __proto__: null,
      "%AggregateError%": typeof AggregateError > "u" ? S : AggregateError,
      "%Array%": Array,
      "%ArrayBuffer%": typeof ArrayBuffer > "u" ? S : ArrayBuffer,
      "%ArrayIteratorPrototype%": qe && M ? M([][Symbol.iterator]()) : S,
      "%AsyncFromSyncIteratorPrototype%": S,
      "%AsyncFunction%": Ie,
      "%AsyncGenerator%": Ie,
      "%AsyncGeneratorFunction%": Ie,
      "%AsyncIteratorPrototype%": Ie,
      "%Atomics%": typeof Atomics > "u" ? S : Atomics,
      "%BigInt%": typeof BigInt > "u" ? S : BigInt,
      "%BigInt64Array%": typeof BigInt64Array > "u" ? S : BigInt64Array,
      "%BigUint64Array%": typeof BigUint64Array > "u" ? S : BigUint64Array,
      "%Boolean%": Boolean,
      "%DataView%": typeof DataView > "u" ? S : DataView,
      "%Date%": Date,
      "%decodeURI%": decodeURI,
      "%decodeURIComponent%": decodeURIComponent,
      "%encodeURI%": encodeURI,
      "%encodeURIComponent%": encodeURIComponent,
      "%Error%": Eu,
      "%eval%": eval,
      "%EvalError%": Ru,
      "%Float16Array%": typeof Float16Array > "u" ? S : Float16Array,
      "%Float32Array%": typeof Float32Array > "u" ? S : Float32Array,
      "%Float64Array%": typeof Float64Array > "u" ? S : Float64Array,
      "%FinalizationRegistry%": typeof FinalizationRegistry > "u" ? S : FinalizationRegistry,
      "%Function%": ns,
      "%GeneratorFunction%": Ie,
      "%Int8Array%": typeof Int8Array > "u" ? S : Int8Array,
      "%Int16Array%": typeof Int16Array > "u" ? S : Int16Array,
      "%Int32Array%": typeof Int32Array > "u" ? S : Int32Array,
      "%isFinite%": isFinite,
      "%isNaN%": isNaN,
      "%IteratorPrototype%": qe && M ? M(M([][Symbol.iterator]())) : S,
      "%JSON%": typeof JSON === "object" ? JSON : S,
      "%Map%": typeof Map > "u" ? S : Map,
      "%MapIteratorPrototype%": typeof Map > "u" || !qe || !M ? S : M(new Map()[Symbol.iterator]()),
      "%Math%": Math,
      "%Number%": Number,
      "%Object%": gu,
      "%Object.getOwnPropertyDescriptor%": et,
      "%parseFloat%": parseFloat,
      "%parseInt%": parseInt,
      "%Promise%": typeof Promise > "u" ? S : Promise,
      "%Proxy%": typeof Proxy > "u" ? S : Proxy,
      "%RangeError%": wu,
      "%ReferenceError%": xu,
      "%Reflect%": typeof Reflect > "u" ? S : Reflect,
      "%RegExp%": RegExp,
      "%Set%": typeof Set > "u" ? S : Set,
      "%SetIteratorPrototype%": typeof Set > "u" || !qe || !M ? S : M(new Set()[Symbol.iterator]()),
      "%SharedArrayBuffer%": typeof SharedArrayBuffer > "u" ? S : SharedArrayBuffer,
      "%String%": String,
      "%StringIteratorPrototype%": qe && M ? M(""[Symbol.iterator]()) : S,
      "%Symbol%": qe ? Symbol : S,
      "%SyntaxError%": je,
      "%ThrowTypeError%": Lu,
      "%TypedArray%": Du,
      "%TypeError%": ke,
      "%Uint8Array%": typeof Uint8Array > "u" ? S : Uint8Array,
      "%Uint8ClampedArray%": typeof Uint8ClampedArray > "u" ? S : Uint8ClampedArray,
      "%Uint16Array%": typeof Uint16Array > "u" ? S : Uint16Array,
      "%Uint32Array%": typeof Uint32Array > "u" ? S : Uint32Array,
      "%URIError%": _u,
      "%WeakMap%": typeof WeakMap > "u" ? S : WeakMap,
      "%WeakRef%": typeof WeakRef > "u" ? S : WeakRef,
      "%WeakSet%": typeof WeakSet > "u" ? S : WeakSet,
      "%Function.prototype.call%": tt,
      "%Function.prototype.apply%": os,
      "%Object.defineProperty%": Fu,
      "%Object.getPrototypeOf%": Bu,
      "%Math.abs%": Su,
      "%Math.floor%": Au,
      "%Math.max%": Ou,
      "%Math.min%": Cu,
      "%Math.pow%": vu,
      "%Math.round%": Tu,
      "%Math.sign%": Pu,
      "%Reflect.getPrototypeOf%": Nu,
    };
  if (M)
    try {
      null.error;
    } catch (error) {
      ((cr = M(M(error))), (we["%Error.prototype%"] = cr));
    }
  var cr,
    Uu = function e(t) {
      var r;
      if (t === "%AsyncFunction%") r = ar("async function () {}");
      else if (t === "%GeneratorFunction%") r = ar("function* () {}");
      else if (t === "%AsyncGeneratorFunction%") r = ar("async function* () {}");
      else if (t === "%AsyncGenerator%") {
        var n = e("%AsyncGeneratorFunction%");
        if (n) r = n.prototype;
      } else if (t === "%AsyncIteratorPrototype%") {
        var o = e("%AsyncGenerator%");
        if (o && M) r = M(o.prototype);
      }
      return ((we[t] = r), r);
    },
    ts = {
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
    },
    rt = Ee(),
    Ct = es(),
    qu = rt.call(tt, Array.prototype.concat),
    Iu = rt.call(os, Array.prototype.splice),
    rs = rt.call(tt, String.prototype.replace),
    vt = rt.call(tt, String.prototype.slice),
    ku = rt.call(tt, RegExp.prototype.exec),
    ju = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g,
    Mu = /\\(\\)?/g,
    Hu = function (t) {
      var r = vt(t, 0, 1),
        n = vt(t, -1);
      if (r === "%" && n !== "%") throw new je("invalid intrinsic syntax, expected closing `%`");
      else if (n === "%" && r !== "%") throw new je("invalid intrinsic syntax, expected opening `%`");
      var o = [];
      return (
        rs(t, ju, function (s, i, a, l) {
          o[o.length] = a ? rs(l, Mu, "$1") : i || s;
        }),
        o
      );
    },
    zu = function (t, r) {
      var n = t,
        o;
      if (Ct(ts, n)) ((o = ts[n]), (n = "%" + o[0] + "%"));
      if (Ct(we, n)) {
        var s = we[n];
        if (s === Ie) s = Uu(n);
        if (typeof s > "u" && !r)
          throw new ke("intrinsic " + t + " exists, but is not available. Please file an issue!");
        return { alias: o, name: n, value: s };
      }
      throw new je("intrinsic " + t + " does not exist!");
    };
  ss.exports = function (t, r) {
    if (typeof t !== "string" || t.length === 0) throw new ke("intrinsic name must be a non-empty string");
    if (arguments.length > 1 && typeof r !== "boolean")
      throw new ke('"allowMissing" argument must be a boolean');
    if (ku(/^%?[^%]*%?$/, t) === null)
      throw new je("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
    var n = Hu(t),
      o = n.length > 0 ? n[0] : "",
      s = zu("%" + o + "%", r),
      { name: i, value: a } = s,
      l = !1,
      alias = s.alias;
    if (alias) ((o = alias[0]), Iu(n, qu([0, 1], alias)));
    for (var c = 1, p = !0; c < n.length; c += 1) {
      var d = n[c],
        b = vt(d, 0, 1),
        m = vt(d, -1);
      if ((b === '"' || b === "'" || b === "`" || m === '"' || m === "'" || m === "`") && b !== m)
        throw new je("property names with quotes must have matching quotes");
      if (d === "constructor" || !p) l = !0;
      if (((o += "." + d), (i = "%" + o + "%"), Ct(we, i))) a = we[i];
      else if (a != null) {
        if (!(d in a)) {
          if (!r) throw new ke("base intrinsic for " + t + " exists, but the property is not available.");
          return;
        }
        if (et && c + 1 >= n.length) {
          var g = et(a, d);
          if (((p = !!g), p && "get" in g && !("originalValue" in g.get))) a = g.get;
          else a = a[d];
        } else ((p = Ct(a, d)), (a = a[d]));
        if (p && !l) we[i] = a;
      }
    }
    return a;
  };
});

export { is };
