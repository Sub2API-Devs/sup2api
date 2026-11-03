/**
 * zod/v4/core/compile.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Xs } from "./core.cjs";
import { tp } from "./doc.cjs";
import { F_ } from "./memoizer.cjs";
import { Ul } from "./regexes.cjs";
import { Bl } from "./schemas.cjs";
import { Ee } from "./util.cjs";

//@ chunk-1ny7cxrt.js:509437-541070 cjs-fingerprint
var MC = x(function (Mt) {
  var cY =
      (Mt && Mt.__createBinding) ||
      (Object.create
        ? function (e, t, n, o) {
            if (o === void 0) o = n;
            var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(t, n);
            if (
              !ownPropertyDescriptor ||
              ("get" in ownPropertyDescriptor
                ? !t.__esModule
                : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
            )
              ownPropertyDescriptor = {
                enumerable: !0,
                get: function () {
                  return t[n];
                },
              };
            Object.defineProperty(e, o, ownPropertyDescriptor);
          }
        : function (e, t, n, o) {
            if (o === void 0) o = n;
            e[o] = t[n];
          }),
    uY =
      (Mt && Mt.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    PC =
      (Mt && Mt.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) cY(t, e, key);
        }
        return (uY(t, e), t);
      };
  Object.defineProperty(Mt, "__esModule", { value: !0 });
  Mt.ZodCompileUnsupportedError = Mt.ZodCompileAsyncError = Mt.INVALID = void 0;
  Mt.compile = pY;
  Mt.withParser = CC;
  Mt.compileFn = bh;
  var AC = Xs(),
    IC = tp(),
    Yl = F_(),
    dY = PC(Ul()),
    gn = Bl(),
    hr = PC(Ee());
  Mt.INVALID = Symbol.for("zod.compile.invalid");
  var wC = Symbol.for("zod.compile.fallback");
  class ZodCompileAsyncError extends Error {
    constructor(e = "z.compile does not support async refinements, transforms, or checks") {
      super(e);
      this.name = "ZodCompileAsyncError";
    }
  }
  Mt.ZodCompileAsyncError = ZodCompileAsyncError;
  class ZodCompileUnsupportedError extends Error {
    constructor(e, t = !0) {
      super(`z.compile does not support ${e}; this schema must use the runtime parser`);
      ((this.name = "ZodCompileUnsupportedError"), (this.islandable = t));
    }
  }
  Mt.ZodCompileUnsupportedError = ZodCompileUnsupportedError;
  function fY(e, t) {
    try {
      return bh(e, { assertOnly: !0 });
    } catch {
      return t;
    }
  }
  function pY(e, t) {
    try {
      let n = bh(e),
        o = CC(e, n);
      return ((o._zod.bag.validator = fY(e, n)), o);
    } catch (error) {
      if (t?.strict) throw error;
      return e;
    }
  }
  function CC(e, t) {
    if (Yl.isRecursiveSchema(e))
      throw new ZodCompileUnsupportedError("a schema whose subtree contains a reference cycle");
    let clone = hr.clone(e),
      run = e._zod.run,
      r = run.__originalRun ?? run,
      s = (a, l) => {
        if (l?.async || l?.direction === "backward" || l?.skipChecks || l?.[wC]) return r(a, l);
        if (l && Yl.isBackEdge(l, a.value)) return r(a, l);
        let c = t(a.value);
        if (c !== Mt.INVALID) return ((a.value = c), a);
        if (l) l[wC] = !0;
        return r(a, l);
      };
    if (
      ((s.__originalRun = r),
      (clone._zod.bag.fallbackRun = r),
      (clone._zod.bag.validator = t),
      (clone._zod.run = s),
      !run.__originalRun)
    )
      hY(clone, e, t);
    return clone;
  }
  function hY(e, t, n) {
    let o = e,
      r = t;
    if (typeof r.safeParse === "function") {
      let safeParse = r.safeParse;
      o.safeParse = (a, l) => {
        let c = n(a);
        if (c !== Mt.INVALID) return { success: !0, data: c };
        return safeParse(a, l);
      };
    }
    if (typeof r.parse === "function") {
      let parse = r.parse;
      o.parse = (a, l) => {
        let c = n(a);
        if (c !== Mt.INVALID) return c;
        return parse(a, l);
      };
    }
  }
  function bh(e, t) {
    let n = !0;
    try {
      n = Yl.isRecursiveSchema(e);
    } catch {}
    if (n) throw new ZodCompileUnsupportedError("a schema whose subtree contains a reference cycle");
    let o = { constants: new Map(), constantCounter: 0, varCounter: 0, definite: !0 },
      r = new IC.Doc(["input"]),
      s = yn(r, o, e, "input", !t?.assertOnly);
    r.write(s === null ? "return true;" : `return ${s};`);
    let a = ["INVALID", ...o.constants.keys()],
      l = [Mt.INVALID, ...o.constants.values()],
      joined = r.content.join(`
`),
      u = t?.debug
        ? a.length > 0
          ? `// Constants: ${a.join(", ")}
${joined}`
          : joined
        : "",
      f = Function,
      h = `return (input) => {
${joined}
}`,
      m;
    try {
      m = new f(...a, h)(...l);
    } catch (error) {
      throw new ZodCompileUnsupportedError(
        `this schema (generated code failed to evaluate: ${error.message})`,
      );
    }
    if (t?.debug) m.code = u;
    return ((m.definite = o.definite), m);
  }
  function st(e, t) {
    for (let [o, r] of e.constants) if (r === t) return o;
    let n = `c${e.constantCounter++}`;
    return (e.constants.set(n, t), n);
  }
  function tl(e, t) {
    return ((e.definite = !1), st(e, t));
  }
  function We(e) {
    return `v${e.varCounter++}`;
  }
  function mY(e, t) {
    let run = e._zod.run({ value: t, issues: [] }, {});
    if (run && typeof run.then === "function") return Mt.INVALID;
    let o = run;
    return o.issues.length === 0 ? o.value : Mt.INVALID;
  }
  function kr(e, t, n, o, r = !0) {
    let s = e.content.length,
      size = t.constants.size,
      { constantCounter: constantCounter, varCounter: varCounter } = t;
    try {
      return yn(e, t, n, o, r);
    } catch (error) {
      if (!(error instanceof ZodCompileUnsupportedError) || !error.islandable) throw error;
      if (((e.content.length = s), t.constants.size > size)) {
        let sliced = Array.from(t.constants.keys()).slice(size);
        for (let h of sliced) t.constants.delete(h);
      }
      return ((t.constantCounter = constantCounter), (t.varCounter = varCounter), gY(e, t, n, o));
    }
  }
  function gY(e, t, n, o) {
    t.definite = !1;
    let r = st(t, n),
      s = st(t, mY),
      a = We(t);
    return (e.write(`const ${a} = ${s}(${r}, ${o});`), e.write(`if (${a} === INVALID) return INVALID;`), a);
  }
  var yY = new Set(["max_size", "min_size", "size_equals", "max_length", "min_length", "length_equals"]);
  function _Y(e, t, n, o) {
    let checks = n._zod.def.checks;
    if (!checks || checks.length === 0) return o;
    let s = o;
    for (let a of checks) {
      let def = a._zod.def;
      if (def.when && !yY.has(def.check))
        throw new ZodCompileUnsupportedError('check with a custom "when" condition');
      switch (def.check) {
        case "greater_than":
          bY(e, t, def, s);
          break;
        case "less_than":
          vY(e, t, def, s);
          break;
        case "multiple_of":
          wY(e, t, def, s);
          break;
        case "number_format":
          $C(e, def, s);
          break;
        case "min_length": {
          let c = Qa(def.minimum, "min_length"),
            u = q_(e, t, s, `${s}.length >= ${c} && ${s}.length < ${def.minimum * 2}`);
          e.write(`if (${u} < ${c}) return INVALID;`);
          break;
        }
        case "max_length": {
          let c = Qa(def.maximum, "max_length"),
            u = q_(e, t, s, `${s}.length > ${c}`);
          e.write(`if (${u} > ${c}) return INVALID;`);
          break;
        }
        case "length_equals": {
          let c = Qa(def.length, "length_equals"),
            u = q_(e, t, s, `${s}.length >= ${c} && ${s}.length <= ${def.length * 2}`);
          e.write(`if (${u} !== ${c}) return INVALID;`);
          break;
        }
        case "min_size":
          e.write(`if (${s}.size < ${Qa(def.minimum, "min_size")}) return INVALID;`);
          break;
        case "max_size":
          e.write(`if (${s}.size > ${Qa(def.maximum, "max_size")}) return INVALID;`);
          break;
        case "size_equals":
          e.write(`if (${s}.size !== ${Qa(def.size, "size_equals")}) return INVALID;`);
          break;
        case "string_format":
          s = DC(e, t, def, s);
          break;
        case "custom":
          s = PY(e, t, a, s);
          break;
        case "bigint_format":
          OY(e, def, s);
          break;
        case "mime_type":
          SY(e, t, def, s);
          break;
        case "property":
          kY(e, t, def, s);
          break;
        case "properties":
          RC(e, t, def, s, !1);
          break;
        case "overwrite": {
          let c = We(t);
          (EY(e, t, a, s, c), (s = c));
          break;
        }
        default:
          throw new ZodCompileUnsupportedError(`check type ${def.check}`);
      }
    }
    return s;
  }
  function q_(e, t, n, o) {
    let r = st(t, hr.codePointLength),
      s = We(t);
    return (e.write(`const ${s} = typeof ${n} === "string" && ${o} ? ${r}(${n}) : ${n}.length;`), s);
  }
  function Qa(e, t) {
    if (typeof e !== "number" || !Number.isFinite(e))
      throw new ZodCompileUnsupportedError(`${t} bound of type ${typeof e}`);
    return `${e}`;
  }
  function TC(e, t) {
    if (typeof t === "bigint") return `${t}n`;
    if (typeof t === "number") {
      if (Number.isNaN(t)) throw new ZodCompileUnsupportedError("comparison check with NaN bound");
      return `${t}`;
    }
    if (t instanceof Date) {
      if (Number.isNaN(t.getTime()))
        throw new ZodCompileUnsupportedError("comparison check with Invalid Date bound");
      return st(e, t);
    }
    throw new ZodCompileUnsupportedError(`comparison check bound of type ${typeof t}`);
  }
  function bY(e, t, n, o) {
    let r = n.inclusive ? "<" : "<=";
    e.write(`if (${o} ${r} ${TC(t, n.value)}) return INVALID;`);
  }
  function vY(e, t, n, o) {
    let r = n.inclusive ? ">" : ">=";
    e.write(`if (${o} ${r} ${TC(t, n.value)}) return INVALID;`);
  }
  function wY(e, t, n, o) {
    if (typeof n.value === "bigint") {
      if (n.value === BigInt(0))
        throw new ZodCompileUnsupportedError("multiple_of check with a zero divisor");
      e.write(`if (${o} % ${n.value}n !== 0n) return INVALID;`);
    } else {
      let r = st(t, hr.floatSafeRemainder);
      e.write(`if (${r}(${o}, ${Qa(n.value, "multiple_of")}) !== 0) return INVALID;`);
    }
  }
  function $C(e, t, n) {
    let format = t.format;
    switch (format) {
      case "safeint":
        e.write(`if (!Number.isSafeInteger(${n})) return INVALID;`);
        break;
      case "int32":
        e.write(`if (!Number.isInteger(${n}) || ${n} < -2147483648 || ${n} > 2147483647) return INVALID;`);
        break;
      case "uint32":
        e.write(`if (!Number.isInteger(${n}) || ${n} < 0 || ${n} > 4294967295) return INVALID;`);
        break;
      case "float32":
        e.write(
          `if (!Number.isFinite(${n}) || ${n} < -3.4028234663852886e38 || ${n} > 3.4028234663852886e38) return INVALID;`,
        );
        break;
      case "float64":
        e.write(`if (!Number.isFinite(${n})) return INVALID;`);
        break;
      default:
        throw new ZodCompileUnsupportedError(`number format ${format}`);
    }
  }
  function OY(e, t, n) {
    let format = t.format;
    if (!format) return;
    switch (format) {
      case "int64":
        e.write(`if (${n} < -9223372036854775808n || ${n} > 9223372036854775807n) return INVALID;`);
        break;
      case "uint64":
        e.write(`if (${n} < 0n || ${n} > 18446744073709551615n) return INVALID;`);
        break;
      default:
        throw new ZodCompileUnsupportedError(`bigint format ${format}`);
    }
  }
  function SY(e, t, n, o) {
    let mime = n.mime;
    if (mime && mime.length > 0) {
      let s = st(t, new Set(mime));
      e.write(`if (!${s}.has(${o}.type)) return INVALID;`);
    }
  }
  function RC(e, t, n, o, r) {
    if (n.when) throw new ZodCompileUnsupportedError('check with a custom "when" condition');
    e.write(
      r
        ? `if (${o} === null || (typeof ${o} !== "object" && typeof ${o} !== "function")) return INVALID;`
        : `if (${o} == null) return INVALID;`,
    );
    let shape = n.shape;
    for (let a of Reflect.ownKeys(shape)) {
      let l = typeof a === "symbol" ? st(t, a) : hr.esc(a),
        c = We(t);
      (e.write(`const ${c} = ${o}[${l}];`), kr(e, t, shape[a], c, !1));
    }
  }
  function kY(e, t, n, o) {
    let r = `${o}[${JSON.stringify(n.property)}]`;
    yn(e, t, n.schema, r);
  }
  function EY(e, t, n, o, r) {
    let tx = n._zod.def.tx;
    if (!tx) throw new ZodCompileUnsupportedError("overwrite check without a transform function");
    if (nl(tx)) throw new ZodCompileAsyncError("z.compile: async overwrite transforms are not supported");
    let a = st(t, tx);
    e.write(`const ${r} = ${a}(${o});`);
  }
  function G_() {
    throw new AC.$ZodAsyncError();
  }
  function Y_(e) {
    this.issues.push(e);
  }
  function PY(e, t, n, o) {
    let def = n._zod.def;
    if (def.fn) {
      if (nl(def.fn))
        throw new ZodCompileAsyncError("z.compile: async .refine() predicates are not supported");
      let s = tl(t, def.fn),
        a = st(t, G_),
        l = We(t);
      return (
        e.write(`const ${l} = ${s}(${o});`),
        e.write(`if (${l} instanceof Promise) ${a}();`),
        e.write(`if (!${l}) return INVALID;`),
        o
      );
    }
    if (n._zod.check) {
      if (nl(n._zod.check))
        throw new ZodCompileAsyncError("z.compile: async .superRefine() / check functions are not supported");
      let check = n._zod.check,
        l = tl(t, (u) => {
          let f = { value: u, issues: [], addIssue: Y_ };
          if (check(f) instanceof Promise) G_();
          return f.issues.length === 0 ? f.value : Mt.INVALID;
        }),
        c = We(t);
      return (e.write(`const ${c} = ${l}(${o});`), e.write(`if (${c} === INVALID) return INVALID;`), c);
    }
    throw new ZodCompileUnsupportedError("custom check without a predicate or check function");
  }
  var AY = new Set([
    "cidrv4",
    "cuid",
    "cuid2",
    "date",
    "datetime",
    "duration",
    "e164",
    "email",
    "emoji",
    "ends_with",
    "guid",
    "includes",
    "ipv4",
    "ksuid",
    "lowercase",
    "mac",
    "nanoid",
    "regex",
    "starts_with",
    "time",
    "ulid",
    "uppercase",
    "uuid",
    "xid",
  ]);
  function DC(e, t, n, o) {
    let format = n.format;
    if (format === "base64") {
      let c = st(t, gn.isValidBase64);
      return (e.write(`if (!${c}(${o})) return INVALID;`), o);
    }
    if (format === "base64url") {
      let c = st(t, gn.isValidBase64URL);
      return (e.write(`if (!${c}(${o})) return INVALID;`), o);
    }
    if (format === "jwt") {
      let c = st(t, gn.isValidJWT),
        u = st(t, n.alg ?? null);
      return (e.write(`if (!${c}(${o}, ${u})) return INVALID;`), o);
    }
    if (format === "ipv6") {
      let c = st(t, gn.isValidIPv6);
      return (e.write(`if (!${c}(${o})) return INVALID;`), o);
    }
    if (format === "cidrv6") {
      let c = st(t, gn.isValidCIDRv6);
      return (e.write(`if (!${c}(${o})) return INVALID;`), o);
    }
    if (format === "credit_card") {
      let c = st(t, gn.isValidCreditCard);
      return (e.write(`if (!${c}(${o})) return INVALID;`), o);
    }
    if (format === "iban") {
      let c = st(t, gn.isValidIBAN);
      return (e.write(`if (!${c}(${o})) return INVALID;`), o);
    }
    let s = n;
    if (
      format === "url" ||
      format === "httpurl" ||
      s.normalize ||
      s.hostname !== void 0 ||
      s.protocol !== void 0
    ) {
      let c = st(t, gn.parseURLObject),
        u = st(t, n),
        f = We(t),
        h = We(t);
      if (
        (e.write(`const ${f} = ${o}.trim();`),
        e.write(`const ${h} = ${c}(${f}, ${u});`),
        e.write(`if (typeof ${h} === "number") return INVALID;`),
        s.hostname !== void 0)
      ) {
        let b = st(t, gn.urlHostnameOk);
        e.write(`if (!${b}(${h}, ${u}.hostname)) return INVALID;`);
      }
      if (s.protocol !== void 0) {
        let b = st(t, gn.urlProtocolOk);
        e.write(`if (!${b}(${h}, ${u}.protocol)) return INVALID;`);
      }
      let m = We(t),
        y = s.normalize ? `${h}.href` : `${st(t, gn.stripTabAndNewline)}(${f})`;
      return (e.write(`const ${m} = ${y};`), m);
    }
    let fn = n.fn;
    if (fn) {
      if (nl(fn)) throw new ZodCompileUnsupportedError(`async string format ${format}`);
      let c = st(t, fn);
      return (e.write(`if (!${c}(${o})) return INVALID;`), o);
    }
    if (AY.has(format) && n.pattern) {
      let c = st(t, n.pattern);
      return (e.write(`${c}.lastIndex = 0;`), e.write(`if (!${c}.test(${o})) return INVALID;`), o);
    }
    let format_2 = n.format;
    switch (format_2) {
      case "regex":
        throw new ZodCompileUnsupportedError("regex format without a pattern");
      case "lowercase":
        e.write(`if (${o} !== ${o}.toLowerCase()) return INVALID;`);
        break;
      case "uppercase":
        e.write(`if (${o} !== ${o}.toUpperCase()) return INVALID;`);
        break;
      case "includes":
        e.write(`if (!${o}.includes(${hr.esc(n.includes)})) return INVALID;`);
        break;
      case "starts_with": {
        let prefix = n.prefix;
        e.write(`if (${o}.slice(0, ${prefix.length}) !== ${hr.esc(prefix)}) return INVALID;`);
        break;
      }
      case "ends_with": {
        let suffix = n.suffix;
        e.write(`if (${o}.slice(-${suffix.length}) !== ${hr.esc(suffix)}) return INVALID;`);
        break;
      }
      default:
        throw new ZodCompileUnsupportedError(`string format ${format_2}`);
    }
    return o;
  }
  function yn(e, t, n, o, r = !0) {
    let def = n._zod.def,
      a = def.type;
    if (def.coerce) throw new ZodCompileUnsupportedError(`coercion (z.coerce.${a}())`);
    let l = r || !!def.checks?.length,
      c;
    switch (a) {
      case "string":
        c = IY(e, t, n, o);
        break;
      case "number":
        c = CY(e, n, o);
        break;
      case "boolean":
        c = TY(e, o);
        break;
      case "bigint":
        c = $Y(e, n, o);
        break;
      case "symbol":
        c = RY(e, o);
        break;
      case "undefined":
        c = DY(e, o);
        break;
      case "null":
        c = MY(e, o);
        break;
      case "any":
      case "unknown":
        c = o;
        break;
      case "never":
        (e.write("return INVALID;"), (c = o));
        break;
      case "void":
        c = jY(e, o);
        break;
      case "nan":
        c = xY(e, o);
        break;
      case "date":
        c = LY(e, o);
        break;
      case "object":
        c = NY(e, t, n, o, l);
        break;
      case "optional":
        c = UY(e, t, n, o, l);
        break;
      case "nullable":
        c = BY(e, t, n, o, l);
        break;
      case "array":
        c = HY(e, t, n, o, l);
        break;
      case "literal":
        c = KY(e, t, n, o);
        break;
      case "enum":
        c = ZY(e, t, n, o);
        break;
      case "readonly": {
        let u = SC(e, t, n, o),
          f = We(t);
        (e.write(`const ${f} = Object.freeze(${u});`), (c = f));
        break;
      }
      case "success":
        (SC(e, t, n, o), (c = "true"));
        break;
      case "default":
      case "prefault":
        c = VY(e, t, n, o);
        break;
      case "nonoptional":
        c = qY(e, t, n, o);
        break;
      case "tuple":
        c = GY(e, t, n, o);
        break;
      case "union":
        c = WY(e, t, n, o);
        break;
      case "intersection":
        c = XY(e, t, n, o);
        break;
      case "record":
        c = QY(e, t, n, o);
        break;
      case "map":
        c = tJ(e, t, n, o);
        break;
      case "set":
        c = nJ(e, t, n, o);
        break;
      case "file":
        c = rJ(e, o);
        break;
      case "template_literal":
        c = iJ(e, t, n, o);
        break;
      case "lazy":
        c = oJ(e, t, n, o);
        break;
      case "pipe":
        c = sJ(e, t, n, o);
        break;
      case "custom":
        c = aJ(e, t, n, o);
        break;
      case "properties":
        (RC(e, t, n._zod.def, o, !0), (c = o));
        break;
      case "transform":
        c = uJ(e, t, n, o);
        break;
      case "catch":
        c = cJ(e, t, n, o);
        break;
      default:
        throw new ZodCompileUnsupportedError(`schema type ${a}`);
    }
    if (c === null) return null;
    return _Y(e, t, n, c);
  }
  function IY(e, t, n, o) {
    e.write(`if (typeof ${o} !== "string") return INVALID;`);
    let def = n._zod.def;
    if (def.format === void 0) return o;
    return DC(e, t, def, o);
  }
  function CY(e, t, n) {
    e.write(`if (typeof ${n} !== "number" || !Number.isFinite(${n})) return INVALID;`);
    let def = t._zod.def;
    if (def.check === "number_format" && def.format) $C(e, { format: def.format }, n);
    return n;
  }
  function TY(e, t) {
    return (e.write(`if (typeof ${t} !== "boolean") return INVALID;`), t);
  }
  function $Y(e, t, n) {
    e.write(`if (typeof ${n} !== "bigint") return INVALID;`);
    let def = t._zod.def;
    if (def.format)
      switch (def.format) {
        case "int64":
          e.write(`if (${n} < -9223372036854775808n || ${n} > 9223372036854775807n) return INVALID;`);
          break;
        case "uint64":
          e.write(`if (${n} < 0n || ${n} > 18446744073709551615n) return INVALID;`);
          break;
      }
    return n;
  }
  function RY(e, t) {
    return (e.write(`if (typeof ${t} !== "symbol") return INVALID;`), t);
  }
  function DY(e, t) {
    return (e.write(`if (${t} !== undefined) return INVALID;`), t);
  }
  function MY(e, t) {
    return (e.write(`if (${t} !== null) return INVALID;`), t);
  }
  function jY(e, t) {
    return (e.write(`if (${t} !== undefined) return INVALID;`), t);
  }
  function xY(e, t) {
    return (e.write(`if (typeof ${t} !== "number" || !Number.isNaN(${t})) return INVALID;`), t);
  }
  function LY(e, t) {
    return (e.write(`if (!(${t} instanceof Date) || Number.isNaN(${t}.getTime())) return INVALID;`), t);
  }
  function NY(e, t, n, o, r = !0) {
    let def = n._zod.def;
    e.write(`if (typeof ${o} !== "object" || ${o} === null || Array.isArray(${o})) return INVALID;`);
    let shape = def.shape,
      keys = Object.keys(shape),
      ownPropertySymbols = Object.getOwnPropertySymbols(shape),
      u = ownPropertySymbols.length ? [...keys, ...ownPropertySymbols] : keys,
      f = (M) => (typeof M === "symbol" ? st(t, M) : hr.esc(M)),
      h = (M) => (typeof M === "symbol" ? `[${f(M)}]` : hr.esc(M)),
      m = shape;
    if (keys.includes("__proto__")) throw new ZodCompileUnsupportedError('object shape key "__proto__"');
    let y = new Map();
    for (let M of u) {
      let N = m[M],
        Z = f(M),
        F = We(t);
      if ((e.write(`const ${F} = ${o}[${Z}];`), N._zod.optin !== void 0)) {
        let X = We(t);
        if (
          (e.write(`let ${X} = (() => {`),
          e.indented((he) => {
            let Me = kr(he, t, N, F);
            he.write(`return ${Me};`);
          }),
          e.write("})();"),
          N._zod.optout === "optional")
        )
          (e.write(`if (${X} === INVALID) {`),
            e.indented((he) => {
              (he.write(`if (${Z} in ${o}) return INVALID;`), he.write(`${X} = undefined;`));
            }),
            e.write("}"));
        else e.write(`if (${X} === INVALID) return INVALID;`);
        y.set(M, X);
      } else {
        if (FY(N)) e.write(`if (!(${Z} in ${o})) return INVALID;`);
        let X = kr(e, t, N, F, r);
        if (X !== null) y.set(M, X);
      }
    }
    let catchall = def.catchall,
      w = "none";
    if (catchall) {
      let M = catchall._zod.def.type;
      if (M === "never") {
        let N = keys.map((Z) => `k !== ${hr.esc(Z)}`).join(" && ") || "true";
        (e.write(`for (const k in ${o}) {`),
          e.indented((Z) => {
            Z.write(`if (${N}) return INVALID;`);
          }),
          e.write("}"));
      } else if ((M === "unknown" || M === "any") && !catchall._zod.def.checks?.length) w = "passthrough";
      else w = "schema";
    }
    let S = We(t),
      any = u.some((M) => OC(m[M]) || W_(m[M]));
    if (!r) {
      if (w === "schema") {
        let M = keys.length > 0 ? st(t, new Set(keys)) : null;
        (e.write(`for (const k in ${o}) {`),
          e.indented((N) => {
            if ((N.write('if (k === "__proto__") continue;'), M)) N.write(`if (${M}.has(k)) continue;`);
            let Z = We(t);
            (N.write(`const ${Z} = ${o}[k];`), kr(N, t, catchall, Z, !1));
          }),
          e.write("}"));
      }
      return null;
    }
    if (!any) {
      let joined = u.map((N) => `${h(N)}: ${y.get(N)}`).join(", ");
      e.write(`const ${S} = { ${joined} };`);
    } else {
      e.write(`const ${S} = {};`);
      for (let M of u) {
        let N = f(M),
          Z = y.get(M);
        if (W_(m[M])) e.write(`if (${N} in ${o}) ${S}[${N}] = ${Z};`);
        else if (OC(m[M])) e.write(`if (${Z} !== undefined || ${N} in ${o}) ${S}[${N}] = ${Z};`);
        else e.write(`${S}[${N}] = ${Z};`);
      }
    }
    if (w !== "none") {
      let M = keys.length > 0 ? st(t, new Set(keys)) : null;
      (e.write(`for (const k in ${o}) {`),
        e.indented((N) => {
          if ((N.write('if (k === "__proto__") continue;'), M)) N.write(`if (${M}.has(k)) continue;`);
          if (w === "passthrough") N.write(`${S}[k] = ${o}[k];`);
          else {
            let Z = We(t);
            N.write(`const ${Z} = ${o}[k];`);
            let F = kr(N, t, catchall, Z);
            N.write(`${S}[k] = ${F};`);
          }
        }),
        e.write("}"));
    }
    return S;
  }
  function UY(e, t, n, o, r = !0) {
    let def = n._zod.def;
    if (zY(n)) return yn(e, t, def.innerType, o, r);
    if (def.innerType._zod.optin === "defaulted") {
      let l = We(t),
        c = We(t);
      return (
        e.write(`let ${l};`),
        e.write(`if (${o} === undefined) {`),
        e.indented((u) => {
          (u.write(`const ${c} = (() => {`),
            u.indented((f) => {
              let h = yn(f, t, def.innerType, o);
              f.write(`return ${h};`);
            }),
            u.write("})();"),
            u.write(`if (${c} !== INVALID) ${l} = ${c};`));
        }),
        e.write("} else {"),
        e.indented((u) => {
          let f = yn(u, t, def.innerType, o);
          u.write(`${l} = ${f};`);
        }),
        e.write("}"),
        l
      );
    }
    let a = r ? We(t) : null;
    if (a) e.write(`let ${a};`);
    return (
      e.write(`if (${o} !== undefined) {`),
      e.indented((l) => {
        let c = yn(l, t, def.innerType, o, r);
        if (a && c !== null) l.write(`${a} = ${c};`);
      }),
      e.write("}"),
      a
    );
  }
  function zY(e) {
    return e._zod.traits?.has("$ZodExactOptional") === !0;
  }
  function FY(e) {
    return e._zod.optin === void 0 && el(e);
  }
  function el(e) {
    if (e._zod.def.coerce) return !0;
    let def = e._zod.def;
    switch (def.type) {
      case "any":
      case "unknown":
      case "undefined":
      case "void":
      case "default":
      case "prefault":
      case "transform":
      case "custom":
      case "lazy":
        return !0;
      case "string":
      case "number":
      case "boolean":
      case "bigint":
      case "symbol":
      case "null":
      case "never":
      case "nan":
      case "date":
      case "object":
      case "array":
      case "tuple":
      case "record":
      case "map":
      case "set":
      case "file":
      case "template_literal":
        return !1;
      case "nonoptional":
        return def.innerType ? el(def.innerType) : !1;
      case "literal":
        return !!def.values?.includes(void 0);
      case "enum":
        return !!e._zod.values?.has(void 0);
      case "optional":
      case "nullable":
      case "readonly":
      case "success":
        return def.innerType ? el(def.innerType) : !0;
      case "catch":
        return !0;
      case "union":
        return def.options ? def.options.some(el) : !0;
      case "intersection":
        if (!def.left || !def.right) return !0;
        return el(def.left) && el(def.right);
      case "pipe":
        return def.in ? el(def.in) : !0;
      default:
        return !0;
    }
  }
  function W_(e) {
    return e._zod.optin === "optional" && e._zod.optout === "optional";
  }
  function OC(e) {
    return (e._zod.optin !== "defaulted" || e._zod.optout === "optional") && Gl(e);
  }
  function Gl(e) {
    let def = e._zod.def;
    switch (def.type) {
      case "string":
      case "number":
      case "boolean":
      case "bigint":
      case "symbol":
      case "null":
      case "nan":
      case "date":
      case "object":
      case "array":
      case "tuple":
      case "record":
      case "map":
      case "set":
      case "file":
      case "template_literal":
      case "never":
      case "success":
        return !1;
      case "literal":
        return !!def.values?.includes(void 0);
      case "enum":
        return !!e._zod.values?.has(void 0);
      case "optional":
        return !0;
      case "nullable":
      case "readonly":
      case "nonoptional":
        return def.innerType ? Gl(def.innerType) : !0;
      case "union":
        return def.options ? def.options.some(Gl) : !0;
      case "intersection":
        return !def.left || !def.right || Gl(def.left) || Gl(def.right);
      case "pipe":
        return def.out ? Gl(def.out) : !0;
      default:
        return !0;
    }
  }
  function BY(e, t, n, o, r = !0) {
    let def = n._zod.def,
      a = r ? We(t) : null;
    if (a) e.write(`let ${a} = null;`);
    return (
      e.write(`if (${o} !== null) {`),
      e.indented((l) => {
        let c = yn(l, t, def.innerType, o, r);
        if (a && c !== null) l.write(`${a} = ${c};`);
      }),
      e.write("}"),
      a
    );
  }
  function HY(e, t, n, o, r = !0) {
    let def = n._zod.def;
    e.write(`if (!Array.isArray(${o})) return INVALID;`);
    let a = r ? We(t) : null,
      l = We(t),
      c = We(t);
    if (a) e.write(`const ${a} = new Array(${o}.length);`);
    return (
      e.write(`for (let ${l} = 0; ${l} < ${o}.length; ${l}++) {`),
      e.indented((u) => {
        u.write(`const ${c} = ${o}[${l}];`);
        let f = kr(u, t, def.element, c, r);
        if (a && f !== null) u.write(`${a}[${l}] = ${f};`);
      }),
      e.write("}"),
      a
    );
  }
  function KY(e, t, n, o) {
    let values = n._zod.def.values;
    if (values.length !== 1) {
      let l = st(t, new Set(values));
      return (e.write(`if (!${l}.has(${o})) return INVALID;`), o);
    }
    let a = values[0];
    if (typeof a === "number" && Number.isNaN(a)) {
      let l = st(t, new Set(values));
      return (e.write(`if (!${l}.has(${o})) return INVALID;`), o);
    }
    if (typeof a === "string") e.write(`if (${o} !== ${hr.esc(a)}) return INVALID;`);
    else if (typeof a === "number" || typeof a === "boolean") e.write(`if (${o} !== ${a}) return INVALID;`);
    else if (a === null) e.write(`if (${o} !== null) return INVALID;`);
    else if (a === void 0) e.write(`if (${o} !== undefined) return INVALID;`);
    else if (typeof a === "bigint") e.write(`if (${o} !== ${a}n) return INVALID;`);
    else throw new ZodCompileUnsupportedError(`literal type ${typeof a}`);
    return o;
  }
  function ZY(e, t, n, o) {
    let values = n._zod.values;
    if (!values) throw new ZodCompileUnsupportedError("enum schema without enumerated values");
    let s = st(t, values);
    return (e.write(`if (!${s}.has(${o})) return INVALID;`), o);
  }
  function SC(e, t, n, o) {
    let def = n._zod.def;
    return yn(e, t, def.innerType, o);
  }
  function VY(e, t, n, o) {
    let def = n._zod.def,
      a = Object.getOwnPropertyDescriptor(n._zod.def, "defaultValue")
        ? () => n._zod.def.defaultValue
        : void 0;
    if (n._zod.def.type === "prefault") {
      if (!a) return yn(e, t, def.innerType, o);
      let c = st(t, a),
        u = We(t);
      return (
        e.write(`let ${u} = ${o};`),
        e.write(`if (${o} === undefined) ${u} = ${c}();`),
        yn(e, t, def.innerType, u)
      );
    }
    let l = We(t);
    if (a) {
      let c = st(t, a),
        u = st(t, hr.shallowClone);
      (e.write(`let ${l};`),
        e.write(`if (${o} === undefined) {`),
        e.indented((f) => {
          f.write(`${l} = ${u}(${c}());`);
        }),
        e.write("} else {"),
        e.indented((f) => {
          let h = yn(f, t, def.innerType, o);
          f.write(`${l} = ${h} === undefined ? ${u}(${c}()) : ${h};`);
        }),
        e.write("}"));
    } else
      (e.write(`let ${l};`),
        e.write(`if (${o} !== undefined) {`),
        e.indented((c) => {
          let u = yn(c, t, def.innerType, o);
          c.write(`${l} = ${u};`);
        }),
        e.write("}"));
    return l;
  }
  function qY(e, t, n, o) {
    let def = n._zod.def,
      s = yn(e, t, def.innerType, o),
      a = We(t);
    return (e.write(`const ${a} = ${s};`), e.write(`if (${a} === undefined) return INVALID;`), a);
  }
  function GY(e, t, n, o) {
    let def = n._zod.def,
      { items: items, rest: rest } = def;
    e.write(`if (!Array.isArray(${o})) return INVALID;`);
    let l = kC(items, "optin"),
      c = kC(items, "optout");
    if (rest) e.write(`if (${o}.length < ${l}) return INVALID;`);
    else e.write(`if (${o}.length < ${l} || ${o}.length > ${items.length}) return INVALID;`);
    let u = We(t);
    e.write(`const ${u} = [];`);
    for (let f = 0; f < items.length; f++) {
      let h = items[f];
      if (f >= c)
        (e.write(`if (${u}.length === ${f}) {`),
          e.indented((m) => {
            (m.write(`if (${f} < ${o}.length) {`),
              m.indented((y) => {
                let b = We(t);
                y.write(`const ${b} = ${o}[${f}];`);
                let w = kr(y, t, h, b);
                y.write(`${u}[${f}] = ${w};`);
              }),
              m.write("} else {"),
              m.indented((y) => {
                if (W_(h)) {
                  y.write(`${u}.length = ${f};`);
                  return;
                }
                let b = We(t),
                  w = We(t);
                (y.write(`const ${b} = undefined;`),
                  y.write(`const ${w} = (() => {`),
                  y.indented((S) => {
                    let j = kr(S, t, h, b);
                    S.write(`return ${j};`);
                  }),
                  y.write("})();"),
                  y.write(`if (${w} === INVALID || ${w} === undefined) ${u}.length = ${f};`),
                  y.write(`else ${u}[${f}] = ${w};`));
              }),
              m.write("}"));
          }),
          e.write("}"));
      else {
        let m = We(t);
        e.write(`const ${m} = ${o}[${f}];`);
        let y = kr(e, t, h, m);
        e.write(`${u}[${f}] = ${y};`);
      }
    }
    if (rest) {
      let f = We(t),
        h = We(t);
      (e.write(`for (let ${f} = ${items.length}; ${f} < ${o}.length; ${f}++) {`),
        e.indented((m) => {
          m.write(`const ${h} = ${o}[${f}];`);
          let y = kr(m, t, rest, h);
          m.write(`${u}[${f}] = ${y};`);
        }),
        e.write("}"));
    }
    return u;
  }
  function kC(e, t) {
    for (let n = e.length - 1; n >= 0; n--)
      if (!(t === "optin" ? e[n]._zod.optin !== void 0 : e[n]._zod.optout === "optional")) return n + 1;
    return 0;
  }
  function WY(e, t, n, o) {
    let def = n._zod.def,
      options = def.options;
    if (def.discriminator) return YY(e, t, def, o);
    if (def.inclusive === !1) throw new ZodCompileUnsupportedError("exclusive unions (z.xor)");
    if (options.length === 0) return (e.write("return INVALID;"), o);
    if (options.length === 1) return yn(e, t, options[0], o);
    if (options.every((c) => c._zod.def.type === "literal" && !c._zod.def.checks?.length)) {
      let c = new Set(options.flatMap((f) => f._zod.def.values)),
        u = st(t, c);
      return (e.write(`if (!${u}.has(${o})) return INVALID;`), o);
    }
    let l = We(t);
    e.write(`let ${l};`);
    for (let c = 0; c < options.length; c++) {
      let u = options[c];
      if (c === 0) e.write(`${l} = (() => {`);
      else e.write(`if (${l} === INVALID) ${l} = (() => {`);
      (e.indented((f) => {
        let h = yn(f, t, u, o);
        f.write(`return ${h};`);
      }),
        e.write("})();"));
    }
    return (e.write(`if (${l} === INVALID) return INVALID;`), l);
  }
  function YY(e, t, n, o) {
    if (n.unionFallback) throw new ZodCompileUnsupportedError("discriminated union with unionFallback");
    if (n.options.length === 0) return (e.write("return INVALID;"), o);
    let r = We(t),
      s = We(t);
    (e.write(`const ${r} = ${o}?.[${hr.esc(n.discriminator)}];`), e.write(`let ${s};`));
    let a = !0,
      l = new Set();
    for (let option of n.options) {
      let u = option._zod.propValues?.[n.discriminator];
      if (!u || u.size === 0)
        throw new ZodCompileUnsupportedError(
          "discriminated union option without static discriminator values",
        );
      for (let m of u) {
        if (l.has(m)) throw new ZodCompileUnsupportedError(`duplicate discriminator value ${String(m)}`);
        l.add(m);
      }
      let list = Array.from(u, (m) => JY(t, r, m)),
        h = a ? "if" : "else if";
      (e.write(`${h} (${list.join(" || ")}) {`),
        e.indented((m) => {
          let y = yn(m, t, option, o);
          m.write(`${s} = ${y};`);
        }),
        e.write("}"),
        (a = !1));
    }
    return (e.write("else { return INVALID; }"), s);
  }
  function JY(e, t, n) {
    if (typeof n === "string") return `${t} === ${hr.esc(n)}`;
    if (typeof n === "number") {
      if (Number.isNaN(n)) return `Number.isNaN(${t})`;
      return `${t} === ${n}`;
    }
    if (typeof n === "boolean") return `${t} === ${n}`;
    if (n === null) return `${t} === null`;
    if (n === void 0) return `${t} === undefined`;
    if (typeof n === "bigint") return `${t} === ${n}n`;
    if (typeof n === "symbol") {
      let o = st(e, n);
      return `${t} === ${o}`;
    }
    throw new ZodCompileUnsupportedError(`literal discriminator value ${String(n)}`);
  }
  function XY(e, t, n, o) {
    let def = n._zod.def;
    t.definite = !1;
    let s = kr(e, t, def.left, o),
      a = kr(e, t, def.right, o),
      l = st(t, gn.mergeValues),
      c = We(t);
    return (
      e.write(`const ${c} = ${l}(${s}, ${a});`),
      e.write(`if (!${c}.valid) return INVALID;`),
      `${c}.data`
    );
  }
  function QY(e, t, n, o) {
    let def = n._zod.def,
      s = st(t, hr.isPlainObject);
    e.write(`if (!${s}(${o})) return INVALID;`);
    let a = We(t),
      l = We(t),
      c = We(t);
    e.write(`const ${a} = {};`);
    let u = def,
      f = u.partial ? void 0 : def.keyType._zod.values;
    if (f) {
      let y = [];
      for (let w of f) {
        if (!(typeof w === "string" || typeof w === "number" || typeof w === "symbol"))
          throw new ZodCompileUnsupportedError(`record key value ${String(w)}`);
        let S = typeof w === "number" ? w.toString() : w;
        if (S === "__proto__") throw new ZodCompileUnsupportedError('record key "__proto__"');
        y.push(S);
        let j = st(t, w),
          M = yn(e, t, def.keyType, j),
          N = We(t);
        e.write(`const ${N} = ${o}[${eJ(t, S)}];`);
        let Z = kr(e, t, def.valueType, N);
        e.write(`${a}[${M}] = ${Z};`);
      }
      let b = st(t, new Set(y));
      return (
        e.write(`for (const ${l} in ${o}) {`),
        e.indented((w) => {
          if ((w.write(`if (${b}.has(${l})) continue;`), u.mode === "loose"))
            w.write(`if (${l} !== "__proto__") ${a}[${l}] = ${o}[${l}];`);
          else w.write("return INVALID;");
        }),
        e.write("}"),
        a
      );
    }
    let def_2 = def.keyType._zod.def;
    if (!(
      def_2.type === "string" &&
      def_2.format === void 0 &&
      !def_2.coerce &&
      (def_2.checks?.length ?? 0) === 0
    )) {
      let y = def.mode === "loose",
        b = bh(def.keyType);
      if (b.definite === !1) t.definite = !1;
      let w = st(t, b),
        S = st(t, dY.number),
        j = We(t);
      return (
        EC(e, t, o, l, (M) => {
          if (
            (M.write(`let ${j} = ${w}(${l});`),
            M.write(
              `if (${j} === INVALID && typeof ${l} === "string" && ${S}.test(${l})) ${j} = ${w}(Number(${l}));`,
            ),
            y)
          )
            M.write(`if (${j} === INVALID) { ${a}[${l}] = ${o}[${l}]; continue; }`);
          else M.write(`if (${j} === INVALID) return INVALID;`);
          M.write(`if (${j} === "__proto__") continue;`);
          let N = We(t);
          M.write(`const ${N} = ${o}[${l}];`);
          let Z = kr(M, t, def.valueType, N);
          M.write(`${a}[${j}] = ${Z};`);
        }),
        a
      );
    }
    return (
      EC(
        e,
        t,
        o,
        l,
        (y) => {
          y.write(`const ${c} = ${o}[${l}];`);
          let b = kr(y, t, def.valueType, c);
          y.write(`${a}[${l}] = ${b};`);
        },
        "return INVALID;",
      ),
      a
    );
  }
  function EC(e, t, n, o, r, s) {
    let a = st(t, Object.prototype.propertyIsEnumerable),
      l = We(t),
      c = We(t),
      u = We(t);
    (e.write(`const ${l} = Object.getOwnPropertySymbols(${n});`),
      e.write(`const ${c} = Object.getOwnPropertyNames(${n});`),
      e.write(`for (let ${u} = 0; ${u} < ${c}.length; ${u}++) {`),
      e.indented((f) => {
        (f.write(`const ${o} = ${c}[${u}];`),
          f.write(`if (${o} === "__proto__" || !${a}.call(${n}, ${o})) continue;`),
          r(f));
      }),
      e.write("}"),
      e.write(`for (let ${u} = 0; ${u} < ${l}.length; ${u}++) {`),
      e.indented((f) => {
        if ((f.write(`const ${o} = ${l}[${u}];`), f.write(`if (!${a}.call(${n}, ${o})) continue;`), s))
          f.write(s);
        else r(f);
      }),
      e.write("}"));
  }
  function eJ(e, t) {
    if (typeof t === "string") return hr.esc(t);
    return st(e, t);
  }
  function tJ(e, t, n, o) {
    let def = n._zod.def;
    e.write(`if (!(${o} instanceof Map)) return INVALID;`);
    let s = We(t),
      a = We(t),
      l = We(t);
    return (
      e.write(`const ${s} = new Map();`),
      e.write(`for (const [${a}, ${l}] of ${o}) {`),
      e.indented((c) => {
        let u = yn(c, t, def.keyType, a),
          f = yn(c, t, def.valueType, l);
        c.write(`${s}.set(${u}, ${f});`);
      }),
      e.write("}"),
      s
    );
  }
  function nJ(e, t, n, o) {
    let def = n._zod.def;
    e.write(`if (!(${o} instanceof Set)) return INVALID;`);
    let s = We(t),
      a = We(t);
    return (
      e.write(`const ${s} = new Set();`),
      e.write(`for (const ${a} of ${o}) {`),
      e.indented((l) => {
        let c = yn(l, t, def.valueType, a);
        l.write(`${s}.add(${c});`);
      }),
      e.write("}"),
      s
    );
  }
  function rJ(e, t) {
    return (e.write(`if (!(${t} instanceof File)) return INVALID;`), t);
  }
  function iJ(e, t, n, o) {
    e.write(`if (typeof ${o} !== "string") return INVALID;`);
    let pattern = n._zod.pattern;
    if (pattern) {
      let s = st(t, pattern);
      (e.write(`${s}.lastIndex = 0;`), e.write(`if (!${s}.test(${o})) return INVALID;`));
    }
    return o;
  }
  function oJ(e, t, n, o) {
    let def = n._zod.def,
      s = tl(t, def.getter),
      a = st(t, { parser: null });
    (e.write(`if (!${a}.parser) {`),
      e.indented((c) => {
        (c.write(`const inner = ${s}();`),
          c.write(`${a}.parser = function(input) {`),
          c.indented((u) => {
            (u.write("const result = inner._zod.run({ value: input, issues: [] }, {});"),
              u.write("return result.issues.length === 0 ? result.value : INVALID;"));
          }),
          c.write("};"));
      }),
      e.write("}"));
    let l = We(t);
    return (e.write(`const ${l} = ${a}.parser(${o});`), e.write(`if (${l} === INVALID) return INVALID;`), l);
  }
  function sJ(e, t, n, o) {
    let def = n._zod.def,
      s = yn(e, t, def.in, o);
    if (def.transform) {
      if (nl(def.transform))
        throw new ZodCompileAsyncError("z.compile: async transforms in pipes are not supported");
      let transform = def.transform,
        c = tl(t, (f) => {
          let h = { value: f, issues: [], addIssue: Y_ },
            m = transform(f, h);
          if (m instanceof Promise) return Mt.INVALID;
          return h.issues.length === 0 ? m : Mt.INVALID;
        }),
        u = We(t);
      return (
        e.write(`const ${u} = ${c}(${s});`),
        e.write(`if (${u} === INVALID) return INVALID;`),
        yn(e, t, def.out, u)
      );
    } else return yn(e, t, def.out, s);
  }
  function nl(e) {
    return (
      typeof e === "function" &&
      (e.constructor.name === "AsyncFunction" || e[Symbol.toStringTag] === "AsyncFunction")
    );
  }
  function aJ(e, t, n, o) {
    let def = n._zod.def;
    if (def.fn) {
      if (nl(def.fn)) throw new ZodCompileAsyncError("z.compile: async custom predicates are not supported");
      let s = tl(t, def.fn),
        a = st(t, G_),
        l = We(t);
      (e.write(`const ${l} = ${s}(${o});`),
        e.write(`if (${l} instanceof Promise) ${a}();`),
        e.write(`if (!${l}) return INVALID;`));
    } else throw new ZodCompileUnsupportedError("custom schema without a predicate function");
    return o;
  }
  function lJ(e, t, n) {
    let run = e._zod.run({ value: n, issues: [] }, {});
    if (run && typeof run.then === "function") return Mt.INVALID;
    let r = run;
    if (r.issues.length === 0) return r.value;
    return t();
  }
  function cJ(e, t, n, o) {
    let def = n._zod.def;
    if (!def.catchValue[hr.CONSTANT_CATCH])
      throw new ZodCompileUnsupportedError(
        "catch with a callback (only a constant catch value compiles)",
        !1,
      );
    let s = We(t);
    (e.write(`let ${s} = (() => {`),
      e.indented((u) => {
        let f = kr(u, t, def.innerType, o);
        u.write(`return ${f};`);
      }),
      e.write("})();"));
    let a = st(t, def.innerType),
      l = tl(t, def.catchValue),
      c = st(t, lJ);
    return (
      e.write(`if (${s} === INVALID) {`),
      e.indented((u) => {
        (u.write(`${s} = ${c}(${a}, ${l}, ${o});`), u.write(`if (${s} === INVALID) return INVALID;`));
      }),
      e.write("}"),
      s
    );
  }
  function uJ(e, t, n, o) {
    let def = n._zod.def;
    if (def.transform) {
      if (nl(def.transform)) throw new ZodCompileAsyncError("z.compile: async transforms are not supported");
      let transform = def.transform,
        l = tl(t, (u) => {
          let f = { value: u, issues: [], addIssue: Y_ },
            h = transform(u, f);
          if (h instanceof Promise) return Mt.INVALID;
          return f.issues.length === 0 ? h : Mt.INVALID;
        }),
        c = We(t);
      return (e.write(`const ${c} = ${l}(${o});`), e.write(`if (${c} === INVALID) return INVALID;`), c);
    }
    return o;
  }
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(Mt);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(Mt, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(Mt, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(Mt);
  })();
});

export { MC };
