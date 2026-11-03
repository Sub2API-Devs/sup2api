/**
 * zod/v4/core/checks.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (4)
 * attribution: esm-fingerprint 3, esm-layout 1
 */
import { Fr } from "./core.js";
import { EIi, vIi, alo, llo, dlo, _Mt } from "./util.js";
import { Dr, jr } from "./regexes.js";

//@ chunk-7vp249v4.js:8628-8736 esm-fingerprint
var JK = Fr("$ZodCheck", (e, t) => {
  var r;
  (e._zod ?? (e._zod = {}), (e._zod.def = t), (r = e._zod).onattach ?? (r.onattach = []));
});
//@ chunk-7vp249v4.js:8736-10853 esm-layout
var Ce = (e) => {
    let t = e.value;
    return !EIi(t) && t.length !== void 0;
  },
  le = { number: "number", bigint: "bigint", object: "date" },
  Re = Fr("$ZodCheckLessThan", (e, t) => {
    JK.init(e, t);
    let r = le[typeof t.value];
    e._zod.check = (n) => {
      if (t.inclusive ? n.value <= t.value : n.value < t.value) return;
      n.issues.push({
        origin: le[typeof n.value] ?? r,
        code: "too_big",
        maximum: typeof t.value === "object" ? t.value.getTime() : t.value,
        input: n.value,
        inclusive: t.inclusive,
        inst: e,
        continue: !t.abort,
      });
    };
  }),
  De = Fr("$ZodCheckGreaterThan", (e, t) => {
    JK.init(e, t);
    let r = le[typeof t.value];
    e._zod.check = (n) => {
      if (t.inclusive ? n.value >= t.value : n.value > t.value) return;
      n.issues.push({
        origin: le[typeof n.value] ?? r,
        code: "too_small",
        minimum: typeof t.value === "object" ? t.value.getTime() : t.value,
        input: n.value,
        inclusive: t.inclusive,
        inst: e,
        continue: !t.abort,
      });
    };
  }),
  Lr = Fr("$ZodCheckMultipleOf", (e, t) => {
    (JK.init(e, t),
      (e._zod.check = (r) => {
        if (typeof r.value !== typeof t.value)
          throw Error("Cannot mix number and bigint in multiple_of check.");
        if (
          typeof r.value === "bigint"
            ? t.value !== BigInt(0) && r.value % t.value === BigInt(0)
            : vIi(r.value, t.value) === 0
        )
          return;
        r.issues.push({
          origin: typeof r.value,
          code: "not_multiple_of",
          divisor: t.value,
          input: r.value,
          inst: e,
          continue: !t.abort,
        });
      }));
  }),
  Mr = Fr("$ZodCheckNumberFormat", (e, t) => {
    (JK.init(e, t), (t.format = t.format || "float64"));
    let r = t.format?.includes("int"),
      n = r ? "int" : "number",
      [i, s] = alo[t.format];
    e._zod.check = (c) => {
      let a = c.value;
      if (r) {
        if (!Number.isInteger(a)) {
          c.issues.push({
            expected: n,
            format: t.format,
            code: "invalid_type",
            continue: !1,
            input: a,
            inst: e,
          });
          return;
        }
        if (!Number.isSafeInteger(a)) {
          if (a > 0)
            c.issues.push({
              input: a,
              code: "too_big",
              maximum: Number.MAX_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst: e,
              origin: n,
              inclusive: !0,
              continue: !t.abort,
            });
          else
            c.issues.push({
              input: a,
              code: "too_small",
              minimum: Number.MIN_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst: e,
              origin: n,
              inclusive: !0,
              continue: !t.abort,
            });
          return;
        }
      }
      if (a < i)
        c.issues.push({
          origin: "number",
          input: a,
          code: "too_small",
          minimum: i,
          inclusive: !0,
          inst: e,
          continue: !t.abort,
        });
      if (a > s)
        c.issues.push({
          origin: "number",
          input: a,
          code: "too_big",
          maximum: s,
          inclusive: !0,
          inst: e,
          continue: !t.abort,
        });
    };
  });
//@ chunk-7vp249v4.js:10853-13646 esm-fingerprint
var Ur = Fr("$ZodCheckMaxLength", (e, t) => {
    var r;
    (JK.init(e, t),
      (r = e._zod.def).when ?? (r.when = Ce),
      (e._zod.check = (n) => {
        let i = n.value,
          s = i.length;
        if ((typeof i === "string" && s > t.maximum ? llo(i) : s) <= t.maximum) return;
        let a = dlo(i);
        n.issues.push({
          origin: a,
          code: "too_big",
          maximum: t.maximum,
          inclusive: !0,
          input: i,
          inst: e,
          continue: !t.abort,
        });
      }));
  }),
  Jr = Fr("$ZodCheckMinLength", (e, t) => {
    var r;
    (JK.init(e, t),
      (r = e._zod.def).when ?? (r.when = Ce),
      (e._zod.check = (n) => {
        let i = n.value,
          s = i.length;
        if ((typeof i === "string" && s >= t.minimum && s < t.minimum * 2 ? llo(i) : s) >= t.minimum) return;
        let a = dlo(i);
        n.issues.push({
          origin: a,
          code: "too_small",
          minimum: t.minimum,
          inclusive: !0,
          input: i,
          inst: e,
          continue: !t.abort,
        });
      }));
  }),
  Br = Fr("$ZodCheckLengthEquals", (e, t) => {
    var r;
    (JK.init(e, t),
      (r = e._zod.def).when ?? (r.when = Ce),
      (e._zod.check = (n) => {
        let i = n.value,
          s = i.length,
          c = typeof i === "string" && s >= t.length && s <= t.length * 2 ? llo(i) : s;
        if (c === t.length) return;
        let a = dlo(i),
          l = c > t.length;
        n.issues.push({
          origin: a,
          ...(l ? { code: "too_big", maximum: t.length } : { code: "too_small", minimum: t.length }),
          inclusive: !0,
          exact: !0,
          input: n.value,
          inst: e,
          continue: !t.abort,
        });
      }));
  }),
  W = Fr("$ZodCheckStringFormat", (e, t) => {
    var r, n;
    if ((JK.init(e, t), t.pattern))
      (r = e._zod).check ??
        (r.check = (i) => {
          if (((t.pattern.lastIndex = 0), t.pattern.test(i.value))) return;
          i.issues.push({
            origin: "string",
            code: "invalid_format",
            format: t.format,
            input: i.value,
            ...(t.pattern ? { pattern: t.pattern.toString() } : {}),
            inst: e,
            continue: !t.abort,
          });
        });
    else (n = e._zod).check ?? (n.check = () => {});
  }),
  Vr = Fr("$ZodCheckRegex", (e, t) => {
    (W.init(e, t),
      (e._zod.check = (r) => {
        if (((t.pattern.lastIndex = 0), t.pattern.test(r.value))) return;
        r.issues.push({
          origin: "string",
          code: "invalid_format",
          format: "regex",
          input: r.value,
          pattern: t.pattern.toString(),
          inst: e,
          continue: !t.abort,
        });
      }));
  }),
  Kr = Fr("$ZodCheckLowerCase", (e, t) => {
    (t.pattern ?? (t.pattern = Dr), W.init(e, t));
  }),
  Wr = Fr("$ZodCheckUpperCase", (e, t) => {
    (t.pattern ?? (t.pattern = jr), W.init(e, t));
  }),
  Gr = Fr("$ZodCheckIncludes", (e, t) => {
    JK.init(e, t);
    let r = _Mt(t.includes),
      regExp = new RegExp(typeof t.position === "number" ? `^.{${t.position},}${r}` : r);
    ((t.pattern = regExp),
      (e._zod.check = (i) => {
        if (i.value.includes(t.includes, t.position)) return;
        i.issues.push({
          origin: "string",
          code: "invalid_format",
          format: "includes",
          includes: t.includes,
          input: i.value,
          inst: e,
          continue: !t.abort,
        });
      }));
  }),
  qr = Fr("$ZodCheckStartsWith", (e, t) => {
    JK.init(e, t);
    let regExp = new RegExp(`^${_Mt(t.prefix)}.*`);
    (t.pattern ?? (t.pattern = regExp),
      (e._zod.check = (n) => {
        if (n.value.startsWith(t.prefix)) return;
        n.issues.push({
          origin: "string",
          code: "invalid_format",
          format: "starts_with",
          prefix: t.prefix,
          input: n.value,
          inst: e,
          continue: !t.abort,
        });
      }));
  }),
  Yr = Fr("$ZodCheckEndsWith", (e, t) => {
    JK.init(e, t);
    let regExp = new RegExp(`.*${_Mt(t.suffix)}$`);
    (t.pattern ?? (t.pattern = regExp),
      (e._zod.check = (n) => {
        if (n.value.endsWith(t.suffix)) return;
        n.issues.push({
          origin: "string",
          code: "invalid_format",
          format: "ends_with",
          suffix: t.suffix,
          input: n.value,
          inst: e,
          continue: !t.abort,
        });
      }));
  });
//@ chunk-7vp249v4.js:13646-13742 esm-fingerprint
var Xr = Fr("$ZodCheckOverwrite", (e, t) => {
  (JK.init(e, t),
    (e._zod.check = (r) => {
      r.value = t.tx(r.value);
    }));
});

export { W, Mr, JK, Re, De, Lr, Ur, Jr, Br, Vr, Kr, Wr, Gr, qr, Yr, Xr };
