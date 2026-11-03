/**
 * zod/v4/core/checks.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Xs } from "./core.cjs";
import { Ul } from "./regexes.cjs";
import { Ee } from "./util.cjs";

//@ chunk-1ny7cxrt.js:123392-133068 cjs-fingerprint
var ep = x(function (Ce) {
  var NZ =
      (Ce && Ce.__createBinding) ||
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
    UZ =
      (Ce && Ce.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    $_ =
      (Ce && Ce.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) NZ(t, e, key);
        }
        return (UZ(t, e), t);
      };
  Object.defineProperty(Ce, "__esModule", { value: !0 });
  Ce.$ZodCheckOverwrite =
    Ce.$ZodCheckMimeType =
    Ce.$ZodCheckProperty =
    Ce.$ZodCheckEndsWith =
    Ce.$ZodCheckStartsWith =
    Ce.$ZodCheckIncludes =
    Ce.$ZodCheckUpperCase =
    Ce.$ZodCheckLowerCase =
    Ce.$ZodCheckRegex =
    Ce.$ZodCheckStringFormat =
    Ce.$ZodCheckLengthEquals =
    Ce.$ZodCheckMinLength =
    Ce.$ZodCheckMaxLength =
    Ce.$ZodCheckSizeEquals =
    Ce.$ZodCheckMinSize =
    Ce.$ZodCheckMaxSize =
    Ce.$ZodCheckBigIntFormat =
    Ce.$ZodCheckNumberFormat =
    Ce.$ZodCheckMultipleOf =
    Ce.$ZodCheckGreaterThan =
    Ce.$ZodCheckLessThan =
    Ce.$ZodCheck =
      void 0;
  var Cn = $_(Xs()),
    fP = $_(Ul()),
    Jn = $_(Ee());
  Ce.$ZodCheck = Cn.$constructor("$ZodCheck", (e, t) => {
    var n;
    (e._zod ?? (e._zod = {}), (e._zod.def = t), (n = e._zod).onattach ?? (n.onattach = []));
  });
  var R_ = (e) => {
      let t = e.value;
      return !Jn.nullish(t) && t.size !== void 0;
    },
    D_ = (e) => {
      let t = e.value;
      return !Jn.nullish(t) && t.length !== void 0;
    },
    Qf = { number: "number", bigint: "bigint", object: "date" };
  Ce.$ZodCheckLessThan = Cn.$constructor("$ZodCheckLessThan", (e, t) => {
    Ce.$ZodCheck.init(e, t);
    let n = Qf[typeof t.value];
    e._zod.check = (o) => {
      if (t.inclusive ? o.value <= t.value : o.value < t.value) return;
      o.issues.push({
        origin: Qf[typeof o.value] ?? n,
        code: "too_big",
        maximum: typeof t.value === "object" ? t.value.getTime() : t.value,
        input: o.value,
        inclusive: t.inclusive,
        inst: e,
        continue: !t.abort,
      });
    };
  });
  Ce.$ZodCheckGreaterThan = Cn.$constructor("$ZodCheckGreaterThan", (e, t) => {
    Ce.$ZodCheck.init(e, t);
    let n = Qf[typeof t.value];
    e._zod.check = (o) => {
      if (t.inclusive ? o.value >= t.value : o.value > t.value) return;
      o.issues.push({
        origin: Qf[typeof o.value] ?? n,
        code: "too_small",
        minimum: typeof t.value === "object" ? t.value.getTime() : t.value,
        input: o.value,
        inclusive: t.inclusive,
        inst: e,
        continue: !t.abort,
      });
    };
  });
  Ce.$ZodCheckMultipleOf = Cn.$constructor("$ZodCheckMultipleOf", (e, t) => {
    (Ce.$ZodCheck.init(e, t),
      (e._zod.check = (n) => {
        if (typeof n.value !== typeof t.value)
          throw Error("Cannot mix number and bigint in multiple_of check.");
        if (
          typeof n.value === "bigint"
            ? t.value !== BigInt(0) && n.value % t.value === BigInt(0)
            : Jn.floatSafeRemainder(n.value, t.value) === 0
        )
          return;
        n.issues.push({
          origin: typeof n.value,
          code: "not_multiple_of",
          divisor: t.value,
          input: n.value,
          inst: e,
          continue: !t.abort,
        });
      }));
  });
  Ce.$ZodCheckNumberFormat = Cn.$constructor("$ZodCheckNumberFormat", (e, t) => {
    (Ce.$ZodCheck.init(e, t), (t.format = t.format || "float64"));
    let n = t.format?.includes("int"),
      o = n ? "int" : "number",
      [r, s] = Jn.NUMBER_FORMAT_RANGES[t.format];
    e._zod.check = (a) => {
      let l = a.value;
      if (n) {
        if (!Number.isInteger(l)) {
          a.issues.push({
            expected: o,
            format: t.format,
            code: "invalid_type",
            continue: !1,
            input: l,
            inst: e,
          });
          return;
        }
        if (!Number.isSafeInteger(l)) {
          if (l > 0)
            a.issues.push({
              input: l,
              code: "too_big",
              maximum: Number.MAX_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst: e,
              origin: o,
              inclusive: !0,
              continue: !t.abort,
            });
          else
            a.issues.push({
              input: l,
              code: "too_small",
              minimum: Number.MIN_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst: e,
              origin: o,
              inclusive: !0,
              continue: !t.abort,
            });
          return;
        }
      }
      if (l < r)
        a.issues.push({
          origin: "number",
          input: l,
          code: "too_small",
          minimum: r,
          inclusive: !0,
          inst: e,
          continue: !t.abort,
        });
      if (l > s)
        a.issues.push({
          origin: "number",
          input: l,
          code: "too_big",
          maximum: s,
          inclusive: !0,
          inst: e,
          continue: !t.abort,
        });
    };
  });
  Ce.$ZodCheckBigIntFormat = Cn.$constructor("$ZodCheckBigIntFormat", (e, t) => {
    Ce.$ZodCheck.init(e, t);
    let [n, o] = Jn.BIGINT_FORMAT_RANGES[t.format];
    e._zod.check = (r) => {
      let s = r.value;
      if (s < n)
        r.issues.push({
          origin: "bigint",
          input: s,
          code: "too_small",
          minimum: n,
          inclusive: !0,
          inst: e,
          continue: !t.abort,
        });
      if (s > o)
        r.issues.push({
          origin: "bigint",
          input: s,
          code: "too_big",
          maximum: o,
          inclusive: !0,
          inst: e,
          continue: !t.abort,
        });
    };
  });
  Ce.$ZodCheckMaxSize = Cn.$constructor("$ZodCheckMaxSize", (e, t) => {
    var n;
    (Ce.$ZodCheck.init(e, t),
      (n = e._zod.def).when ?? (n.when = R_),
      (e._zod.check = (o) => {
        let r = o.value;
        if (r.size <= t.maximum) return;
        o.issues.push({
          origin: Jn.getSizableOrigin(r),
          code: "too_big",
          maximum: t.maximum,
          inclusive: !0,
          input: r,
          inst: e,
          continue: !t.abort,
        });
      }));
  });
  Ce.$ZodCheckMinSize = Cn.$constructor("$ZodCheckMinSize", (e, t) => {
    var n;
    (Ce.$ZodCheck.init(e, t),
      (n = e._zod.def).when ?? (n.when = R_),
      (e._zod.check = (o) => {
        let r = o.value;
        if (r.size >= t.minimum) return;
        o.issues.push({
          origin: Jn.getSizableOrigin(r),
          code: "too_small",
          minimum: t.minimum,
          inclusive: !0,
          input: r,
          inst: e,
          continue: !t.abort,
        });
      }));
  });
  Ce.$ZodCheckSizeEquals = Cn.$constructor("$ZodCheckSizeEquals", (e, t) => {
    var n;
    (Ce.$ZodCheck.init(e, t),
      (n = e._zod.def).when ?? (n.when = R_),
      (e._zod.check = (o) => {
        let r = o.value,
          size = r.size;
        if (size === t.size) return;
        let a = size > t.size;
        o.issues.push({
          origin: Jn.getSizableOrigin(r),
          ...(a ? { code: "too_big", maximum: t.size } : { code: "too_small", minimum: t.size }),
          inclusive: !0,
          exact: !0,
          input: o.value,
          inst: e,
          continue: !t.abort,
        });
      }));
  });
  Ce.$ZodCheckMaxLength = Cn.$constructor("$ZodCheckMaxLength", (e, t) => {
    var n;
    (Ce.$ZodCheck.init(e, t),
      (n = e._zod.def).when ?? (n.when = D_),
      (e._zod.check = (o) => {
        let r = o.value,
          s = r.length;
        if ((typeof r === "string" && s > t.maximum ? Jn.codePointLength(r) : s) <= t.maximum) return;
        let lengthableOrigin = Jn.getLengthableOrigin(r);
        o.issues.push({
          origin: lengthableOrigin,
          code: "too_big",
          maximum: t.maximum,
          inclusive: !0,
          input: r,
          inst: e,
          continue: !t.abort,
        });
      }));
  });
  Ce.$ZodCheckMinLength = Cn.$constructor("$ZodCheckMinLength", (e, t) => {
    var n;
    (Ce.$ZodCheck.init(e, t),
      (n = e._zod.def).when ?? (n.when = D_),
      (e._zod.check = (o) => {
        let r = o.value,
          s = r.length;
        if (
          (typeof r === "string" && s >= t.minimum && s < t.minimum * 2 ? Jn.codePointLength(r) : s) >=
          t.minimum
        )
          return;
        let lengthableOrigin = Jn.getLengthableOrigin(r);
        o.issues.push({
          origin: lengthableOrigin,
          code: "too_small",
          minimum: t.minimum,
          inclusive: !0,
          input: r,
          inst: e,
          continue: !t.abort,
        });
      }));
  });
  Ce.$ZodCheckLengthEquals = Cn.$constructor("$ZodCheckLengthEquals", (e, t) => {
    var n;
    (Ce.$ZodCheck.init(e, t),
      (n = e._zod.def).when ?? (n.when = D_),
      (e._zod.check = (o) => {
        let r = o.value,
          s = r.length,
          a = typeof r === "string" && s >= t.length && s <= t.length * 2 ? Jn.codePointLength(r) : s;
        if (a === t.length) return;
        let lengthableOrigin = Jn.getLengthableOrigin(r),
          c = a > t.length;
        o.issues.push({
          origin: lengthableOrigin,
          ...(c ? { code: "too_big", maximum: t.length } : { code: "too_small", minimum: t.length }),
          inclusive: !0,
          exact: !0,
          input: o.value,
          inst: e,
          continue: !t.abort,
        });
      }));
  });
  Ce.$ZodCheckStringFormat = Cn.$constructor("$ZodCheckStringFormat", (e, t) => {
    var n, o;
    if ((Ce.$ZodCheck.init(e, t), t.pattern))
      (n = e._zod).check ??
        (n.check = (r) => {
          if (((t.pattern.lastIndex = 0), t.pattern.test(r.value))) return;
          r.issues.push({
            origin: "string",
            code: "invalid_format",
            format: t.format,
            input: r.value,
            ...(t.pattern ? { pattern: t.pattern.toString() } : {}),
            inst: e,
            continue: !t.abort,
          });
        });
    else (o = e._zod).check ?? (o.check = () => {});
  });
  Ce.$ZodCheckRegex = Cn.$constructor("$ZodCheckRegex", (e, t) => {
    (Ce.$ZodCheckStringFormat.init(e, t),
      (e._zod.check = (n) => {
        if (((t.pattern.lastIndex = 0), t.pattern.test(n.value))) return;
        n.issues.push({
          origin: "string",
          code: "invalid_format",
          format: "regex",
          input: n.value,
          pattern: t.pattern.toString(),
          inst: e,
          continue: !t.abort,
        });
      }));
  });
  Ce.$ZodCheckLowerCase = Cn.$constructor("$ZodCheckLowerCase", (e, t) => {
    (t.pattern ?? (t.pattern = fP.lowercase), Ce.$ZodCheckStringFormat.init(e, t));
  });
  Ce.$ZodCheckUpperCase = Cn.$constructor("$ZodCheckUpperCase", (e, t) => {
    (t.pattern ?? (t.pattern = fP.uppercase), Ce.$ZodCheckStringFormat.init(e, t));
  });
  Ce.$ZodCheckIncludes = Cn.$constructor("$ZodCheckIncludes", (e, t) => {
    Ce.$ZodCheck.init(e, t);
    let escapeRegex = Jn.escapeRegex(t.includes),
      regExp = new RegExp(typeof t.position === "number" ? `^.{${t.position},}${escapeRegex}` : escapeRegex);
    ((t.pattern = regExp),
      (e._zod.check = (r) => {
        if (r.value.includes(t.includes, t.position)) return;
        r.issues.push({
          origin: "string",
          code: "invalid_format",
          format: "includes",
          includes: t.includes,
          input: r.value,
          inst: e,
          continue: !t.abort,
        });
      }));
  });
  Ce.$ZodCheckStartsWith = Cn.$constructor("$ZodCheckStartsWith", (e, t) => {
    Ce.$ZodCheck.init(e, t);
    let regExp = new RegExp(`^${Jn.escapeRegex(t.prefix)}.*`);
    (t.pattern ?? (t.pattern = regExp),
      (e._zod.check = (o) => {
        if (o.value.startsWith(t.prefix)) return;
        o.issues.push({
          origin: "string",
          code: "invalid_format",
          format: "starts_with",
          prefix: t.prefix,
          input: o.value,
          inst: e,
          continue: !t.abort,
        });
      }));
  });
  Ce.$ZodCheckEndsWith = Cn.$constructor("$ZodCheckEndsWith", (e, t) => {
    Ce.$ZodCheck.init(e, t);
    let regExp = new RegExp(`.*${Jn.escapeRegex(t.suffix)}$`);
    (t.pattern ?? (t.pattern = regExp),
      (e._zod.check = (o) => {
        if (o.value.endsWith(t.suffix)) return;
        o.issues.push({
          origin: "string",
          code: "invalid_format",
          format: "ends_with",
          suffix: t.suffix,
          input: o.value,
          inst: e,
          continue: !t.abort,
        });
      }));
  });
  function dP(e, t, n) {
    if (e.issues.length) t.issues.push(...Jn.prefixIssues(n, e.issues));
  }
  Ce.$ZodCheckProperty = Cn.$constructor("$ZodCheckProperty", (e, t) => {
    (Ce.$ZodCheck.init(e, t),
      (e._zod.check = (n) => {
        let run = t.schema._zod.run({ value: n.value[t.property], issues: [] }, {});
        if (run instanceof Promise) return run.then((r) => dP(r, n, t.property));
        dP(run, n, t.property);
        return;
      }));
  });
  Ce.$ZodCheckMimeType = Cn.$constructor("$ZodCheckMimeType", (e, t) => {
    Ce.$ZodCheck.init(e, t);
    let n = new Set(t.mime);
    e._zod.check = (o) => {
      if (n.has(o.value.type)) return;
      o.issues.push({
        code: "invalid_value",
        values: t.mime,
        input: o.value.type,
        inst: e,
        continue: !t.abort,
      });
    };
  });
  Ce.$ZodCheckOverwrite = Cn.$constructor("$ZodCheckOverwrite", (e, t) => {
    (Ce.$ZodCheck.init(e, t),
      (e._zod.check = (n) => {
        n.value = t.tx(n.value);
      }));
  });
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(Ce);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(Ce, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(Ce, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(Ce);
  })();
});

export { ep };
