/**
 * @smithy/core/dist-cjs/submodules/serde/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { Jns } from "../../../index.js";

//@ chunk-wjd9n4jx.js:22651-35068 cjs-require-graph
var z6t = x(function (Cr) {
  var Hs = Jns(),
    vs = (e, t, r = (s) => s) => e,
    Js = (e) => {
      switch (e) {
        case "true":
          return !0;
        case "false":
          return !1;
        default:
          throw Error(`Unable to parse boolean value "${e}"`);
      }
    },
    Ws = (e) => {
      if (e === null || e === void 0) return;
      if (typeof e === "number") {
        if (e === 0 || e === 1) V.warn(ce(`Expected boolean, got ${typeof e}: ${e}`));
        if (e === 0) return !1;
        if (e === 1) return !0;
      }
      if (typeof e === "string") {
        let lower = e.toLowerCase();
        if (lower === "false" || lower === "true") V.warn(ce(`Expected boolean, got ${typeof e}: ${e}`));
        if (lower === "false") return !1;
        if (lower === "true") return !0;
      }
      if (typeof e === "boolean") return e;
      throw TypeError(`Expected boolean, got ${typeof e}: ${e}`);
    },
    J = (e) => {
      if (e === null || e === void 0) return;
      if (typeof e === "string") {
        let t = parseFloat(e);
        if (!Number.isNaN(t)) {
          if (String(t) !== String(e)) V.warn(ce(`Expected number but observed string: ${e}`));
          return t;
        }
      }
      if (typeof e === "number") return e;
      throw TypeError(`Expected number, got ${typeof e}: ${e}`);
    },
    ceil = Math.ceil(340282346638528860000000000000000000000),
    ae = (e) => {
      let t = J(e);
      if (t !== void 0 && !Number.isNaN(t) && t !== 1 / 0 && t !== -1 / 0) {
        if (Math.abs(t) > ceil) throw TypeError(`Expected 32-bit float, got ${e}`);
      }
      return t;
    },
    W = (e) => {
      if (e === null || e === void 0) return;
      if (Number.isInteger(e) && !Number.isNaN(e)) return e;
      throw TypeError(`Expected integer, got ${typeof e}: ${e}`);
    },
    Qs = W,
    Se = (e) => Te(e, 32),
    we = (e) => Te(e, 16),
    xe = (e) => Te(e, 8),
    Te = (e, t) => {
      let r = W(e);
      if (r !== void 0 && Gs(r, t) !== r) throw TypeError(`Expected ${t}-bit integer, got ${e}`);
      return r;
    },
    Gs = (e, t) => {
      switch (t) {
        case 32:
          return Int32Array.of(e)[0];
        case 16:
          return Int16Array.of(e)[0];
        case 8:
          return Int8Array.of(e)[0];
      }
    },
    Ys = (e, t) => {
      if (e === null || e === void 0) {
        if (t) throw TypeError(`Expected a non-null value for ${t}`);
        throw TypeError("Expected a non-null value");
      }
      return e;
    },
    Sr = (e) => {
      if (e === null || e === void 0) return;
      if (typeof e === "object" && !Array.isArray(e)) return e;
      let t = Array.isArray(e) ? "array" : typeof e;
      throw TypeError(`Expected object, got ${t}: ${e}`);
    },
    Zs = (e) => {
      if (e === null || e === void 0) return;
      if (typeof e === "string") return e;
      if (["boolean", "number", "bigint"].includes(typeof e))
        return (V.warn(ce(`Expected string, got ${typeof e}: ${e}`)), String(e));
      throw TypeError(`Expected string, got ${typeof e}: ${e}`);
    },
    Ks = (e) => {
      if (e === null || e === void 0) return;
      let t = Sr(e),
        mapped = Object.entries(t)
          .filter(([, s]) => s != null)
          .map(([s]) => s);
      if (mapped.length === 0)
        throw TypeError("Unions must have exactly one non-null member. None were found.");
      if (mapped.length > 1)
        throw TypeError(`Unions must have exactly one non-null member. Keys ${mapped} were not null.`);
      return t;
    },
    Ee = (e) => {
      if (typeof e == "string") return J(q(e));
      return J(e);
    },
    Xs = Ee,
    wr = (e) => {
      if (typeof e == "string") return ae(q(e));
      return ae(e);
    },
    en = /(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)|(-?Infinity)|(NaN)/g,
    q = (e) => {
      let match = e.match(en);
      if (match === null || match[0].length !== e.length)
        throw TypeError("Expected real number, got implicit NaN");
      return parseFloat(e);
    },
    _e = (e) => {
      if (typeof e == "string") return xr(e);
      return J(e);
    },
    tn = _e,
    rn = _e,
    sn = (e) => {
      if (typeof e == "string") return xr(e);
      return ae(e);
    },
    xr = (e) => {
      switch (e) {
        case "NaN":
          return NaN;
        case "Infinity":
          return 1 / 0;
        case "-Infinity":
          return -1 / 0;
        default:
          throw Error(`Unable to parse float value: ${e}`);
      }
    },
    Tr = (e) => {
      if (typeof e === "string") return W(q(e));
      return W(e);
    },
    nn = Tr,
    on = (e) => {
      if (typeof e === "string") return Se(q(e));
      return Se(e);
    },
    A = (e) => {
      if (typeof e === "string") return we(q(e));
      return we(e);
    },
    Er = (e) => {
      if (typeof e === "string") return xe(q(e));
      return xe(e);
    },
    ce = (e) =>
      String(TypeError(e).stack || e)
        .split(
          `
`,
        )
        .slice(0, 5)
        .filter((t) => !t.includes("stackTraceWarning")).join(`
`),
    V = { warn: console.warn },
    an = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    Me = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function cn(e) {
    let uTCFullYear = e.getUTCFullYear(),
      uTCMonth = e.getUTCMonth(),
      uTCDay = e.getUTCDay(),
      uTCDate = e.getUTCDate(),
      uTCHours = e.getUTCHours(),
      uTCMinutes = e.getUTCMinutes(),
      uTCSeconds = e.getUTCSeconds(),
      c = uTCDate < 10 ? `0${uTCDate}` : `${uTCDate}`,
      u = uTCHours < 10 ? `0${uTCHours}` : `${uTCHours}`,
      h = uTCMinutes < 10 ? `0${uTCMinutes}` : `${uTCMinutes}`,
      f = uTCSeconds < 10 ? `0${uTCSeconds}` : `${uTCSeconds}`;
    return `${an[uTCDay]}, ${c} ${Me[uTCMonth]} ${uTCFullYear} ${u}:${h}:${f} GMT`;
  }
  var regExp = new RegExp(/^(\d{4})-(\d{2})-(\d{2})[tT](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?[zZ]$/),
    hn = (e) => {
      if (e === null || e === void 0) return;
      if (typeof e !== "string") throw TypeError("RFC-3339 date-times must be expressed as strings");
      let match = regExp.exec(e);
      if (!match) throw TypeError("Invalid RFC-3339 date-time value");
      let [r, s, n, i, a, o, c, u] = match,
        h = A(D(s)),
        f = _(n, "month", 1, 12),
        d = _(i, "day", 1, 31);
      return v(h, f, d, { hours: a, minutes: o, seconds: c, fractionalMilliseconds: u });
    },
    regExp_2 = new RegExp(
      /^(\d{4})-(\d{2})-(\d{2})[tT](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(([-+]\d{2}\:\d{2})|[zZ])$/,
    ),
    dn = (e) => {
      if (e === null || e === void 0) return;
      if (typeof e !== "string") throw TypeError("RFC-3339 date-times must be expressed as strings");
      let match = regExp_2.exec(e);
      if (!match) throw TypeError("Invalid RFC-3339 date-time value");
      let [r, s, n, i, a, o, c, u, h] = match,
        f = A(D(s)),
        d = _(n, "month", 1, 12),
        l = _(i, "day", 1, 31),
        m = v(f, d, l, { hours: a, minutes: o, seconds: c, fractionalMilliseconds: u });
      if (h.toUpperCase() != "Z") m.setTime(m.getTime() - Mn(h));
      return m;
    },
    regExp_3 = new RegExp(
      /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))? GMT$/,
    ),
    regExp_4 = new RegExp(
      /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d{2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2}) (\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))? GMT$/,
    ),
    regExp_5 = new RegExp(
      /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( [1-9]|\d{2}) (\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))? (\d{4})$/,
    ),
    yn = (e) => {
      if (e === null || e === void 0) return;
      if (typeof e !== "string") throw TypeError("RFC-7231 date-times must be expressed as strings");
      let match = regExp_3.exec(e);
      if (match) {
        let [r, s, n, i, a, o, c, u] = match;
        return v(A(D(i)), ge(n), _(s, "day", 1, 31), {
          hours: a,
          minutes: o,
          seconds: c,
          fractionalMilliseconds: u,
        });
      }
      if (((match = regExp_4.exec(e)), match)) {
        let [r, s, n, i, a, o, c, u] = match;
        return wn(
          v(gn(i), ge(n), _(s, "day", 1, 31), {
            hours: a,
            minutes: o,
            seconds: c,
            fractionalMilliseconds: u,
          }),
        );
      }
      if (((match = regExp_5.exec(e)), match)) {
        let [r, s, n, i, a, o, c, u] = match;
        return v(A(D(u)), ge(s), _(n.trimLeft(), "day", 1, 31), {
          hours: i,
          minutes: a,
          seconds: o,
          fractionalMilliseconds: c,
        });
      }
      throw TypeError("Invalid RFC-7231 date-time value");
    },
    bn = (e) => {
      if (e === null || e === void 0) return;
      let t;
      if (typeof e === "number") t = e;
      else if (typeof e === "string") t = Ee(e);
      else if (typeof e === "object" && e.tag === 1) t = e.value;
      else
        throw TypeError(
          "Epoch timestamps must be expressed as floating point numbers or their string representation",
        );
      if (Number.isNaN(t) || t === 1 / 0 || t === -1 / 0)
        throw TypeError("Epoch timestamps must be valid, non-Infinite, non-NaN numerics");
      return new Date(Math.round(t * 1000));
    },
    v = (e, t, r, s) => {
      let n = t - 1;
      return (
        Tn(e, n, r),
        new Date(
          Date.UTC(
            e,
            n,
            r,
            _(s.hours, "hour", 0, 23),
            _(s.minutes, "minute", 0, 59),
            _(s.seconds, "seconds", 0, 60),
            _n(s.fractionalMilliseconds),
          ),
        )
      );
    },
    gn = (e) => {
      let uTCFullYear = new Date().getUTCFullYear(),
        r = Math.floor(uTCFullYear / 100) * 100 + A(D(e));
      if (r < uTCFullYear) return r + 100;
      return r;
    },
    Sn = 1576800000000,
    wn = (e) => {
      if (e.getTime() - new Date().getTime() > Sn)
        return new Date(
          Date.UTC(
            e.getUTCFullYear() - 100,
            e.getUTCMonth(),
            e.getUTCDate(),
            e.getUTCHours(),
            e.getUTCMinutes(),
            e.getUTCSeconds(),
            e.getUTCMilliseconds(),
          ),
        );
      return e;
    },
    ge = (e) => {
      let index = Me.indexOf(e);
      if (index < 0) throw TypeError(`Invalid month: ${e}`);
      return index + 1;
    },
    xn = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    Tn = (e, t, r) => {
      let s = xn[t];
      if (t === 1 && En(e)) s = 29;
      if (r > s) throw TypeError(`Invalid day for ${Me[t]} in ${e}: ${r}`);
    },
    En = (e) => e % 4 === 0 && (e % 100 !== 0 || e % 400 === 0),
    _ = (e, t, r, s) => {
      let n = Er(D(e));
      if (n < r || n > s) throw TypeError(`${t} must be between ${r} and ${s}, inclusive`);
      return n;
    },
    _n = (e) => {
      if (e === null || e === void 0) return 0;
      return wr("0." + e) * 1000;
    },
    Mn = (e) => {
      let t = e[0],
        r = 1;
      if (t == "+") r = 1;
      else if (t == "-") r = -1;
      else throw TypeError(`Offset direction, ${t}, must be "+" or "-"`);
      let s = Number(e.substring(1, 3)),
        n = Number(e.substring(4, 6));
      return r * (s * 60 + n) * 60 * 1000;
    },
    D = (e) => {
      let t = 0;
      while (t < e.length - 1 && e.charAt(t) === "0") t++;
      if (t === 0) return e;
      return e.slice(t);
    },
    I = function (t) {
      return Object.assign(new String(t), {
        deserializeJSON() {
          return JSON.parse(String(t));
        },
        toString() {
          return String(t);
        },
        toJSON() {
          return String(t);
        },
      });
    };
  I.from = (e) => {
    if (e && typeof e === "object" && (e instanceof I || "deserializeJSON" in e)) return e;
    else if (typeof e === "string" || Object.getPrototypeOf(e) === String.prototype) return I(String(e));
    return I(JSON.stringify(e));
  };
  I.fromObject = I.from;
  function Cn(e) {
    if (e.includes(",") || e.includes('"')) e = `"${e.replace(/"/g, '\\"')}"`;
    return e;
  }
  var Ce = "(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:[ne|u?r]?s?day)?",
    Oe = "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)",
    $e = "(\\d?\\d):(\\d{2}):(\\d{2})(?:\\.(\\d+))?",
    _r = "(\\d?\\d)",
    Mr = "(\\d{4})",
    regExp_6 = new RegExp(/^(\d{4})-(\d\d)-(\d\d)[tT](\d\d):(\d\d):(\d\d)(\.(\d+))?(([-+]\d\d:\d\d)|[zZ])$/),
    regExp_7 = new RegExp(`^${Ce}, ${_r} ${Oe} ${Mr} ${$e} GMT$`),
    regExp_8 = new RegExp(`^${Ce}, ${_r}-${Oe}-(\\d\\d) ${$e} GMT$`),
    regExp_9 = new RegExp(`^${Ce} ${Oe} ( [1-9]|\\d\\d) ${$e} ${Mr}$`),
    In = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    Pn = (e) => {
      if (e == null) return;
      let t = NaN;
      if (typeof e === "number") t = e;
      else if (typeof e === "string") {
        if (!/^-?\d*\.?\d+$/.test(e)) throw TypeError("parseEpochTimestamp - numeric string invalid.");
        t = Number.parseFloat(e);
      } else if (typeof e === "object" && e.tag === 1) t = e.value;
      if (isNaN(t) || Math.abs(t) === 1 / 0)
        throw TypeError("Epoch timestamps must be valid finite numbers.");
      return new Date(Math.round(t * 1000));
    },
    Nn = (e) => {
      if (e == null) return;
      if (typeof e !== "string") throw TypeError("RFC3339 timestamps must be strings");
      let match = regExp_6.exec(e);
      if (!match) throw TypeError(`Invalid RFC3339 timestamp format ${e}`);
      let [, r, s, n, i, a, o, , c, u] = match;
      (O(s, 1, 12), O(n, 1, 31), O(i, 0, 23), O(a, 0, 59), O(o, 0, 60));
      let date = new Date(
        Date.UTC(
          Number(r),
          Number(s) - 1,
          Number(n),
          Number(i),
          Number(a),
          Number(o),
          Number(c) ? Math.round(parseFloat(`0.${c}`) * 1000) : 0,
        ),
      );
      if ((date.setUTCFullYear(Number(r)), u.toUpperCase() != "Z")) {
        let [, f, d, l] = /([+-])(\d\d):(\d\d)/.exec(u) || [void 0, "+", 0, 0],
          m = f === "-" ? 1 : -1;
        date.setTime(date.getTime() + m * (Number(d) * 60 * 60 * 1000 + Number(l) * 60 * 1000));
      }
      return date;
    },
    zn = (e) => {
      if (e == null) return;
      if (typeof e !== "string") throw TypeError("RFC7231 timestamps must be strings.");
      let t, r, s, n, i, a, o, c;
      if ((c = regExp_7.exec(e))) [, t, r, s, n, i, a, o] = c;
      else if ((c = regExp_8.exec(e))) (([, t, r, s, n, i, a, o] = c), (s = (Number(s) + 1900).toString()));
      else if ((c = regExp_9.exec(e))) [, r, t, n, i, a, o, s] = c;
      if (s && a) {
        let UTC = Date.UTC(
          Number(s),
          In.indexOf(r),
          Number(t),
          Number(n),
          Number(i),
          Number(a),
          o ? Math.round(parseFloat(`0.${o}`) * 1000) : 0,
        );
        (O(t, 1, 31), O(n, 0, 23), O(i, 0, 59), O(a, 0, 60));
        let date = new Date(UTC);
        return (date.setUTCFullYear(Number(s)), date);
      }
      throw TypeError(`Invalid RFC7231 date-time value ${e}.`);
    };
  function O(e, t, r) {
    let s = Number(e);
    if (s < t || s > r) throw Error(`Value ${s} out of range [${t}, ${r}]`);
  }
  function An(e, t, r) {
    if (r <= 0 || !Number.isInteger(r))
      throw Error("Invalid number of delimiters (" + r + ") for splitEvery.");
    let parts = e.split(t);
    if (r === 1) return parts;
    let n = [],
      i = "";
    for (let a = 0; a < parts.length; a++) {
      if (i === "") i = parts[a];
      else i += t + parts[a];
      if ((a + 1) % r === 0) (n.push(i), (i = ""));
    }
    if (i !== "") n.push(i);
    return n;
  }
  var Dn = (e) => {
      let t = e.length,
        r = [],
        s = !1,
        n = void 0,
        i = 0;
      for (let a = 0; a < t; ++a) {
        let o = e[a];
        switch (o) {
          case '"':
            if (n !== "\\") s = !s;
            break;
          case ",":
            if (!s) (r.push(e.slice(i, a)), (i = a + 1));
            break;
        }
        n = o;
      }
      return (
        r.push(e.slice(i)),
        r.map((a) => {
          a = a.trim();
          let o = a.length;
          if (o < 2) return a;
          if (a[0] === '"' && a[o - 1] === '"') a = a.slice(1, o - 1);
          return a.replace(/\\"/g, '"');
        })
      );
    },
    gr = /^-?\d*(\.\d+)?$/;
  class ue {
    string;
    type;
    constructor(e, t) {
      if (((this.string = e), (this.type = t), !gr.test(e)))
        throw Error(
          '@smithy/core/serde - NumericValue must only contain [0-9], at most one decimal point ".", and an optional negation prefix "-".',
        );
    }
    toString() {
      return this.string;
    }
    static [Symbol.hasInstance](e) {
      if (!e || typeof e !== "object") return !1;
      let t = e;
      return ue.prototype.isPrototypeOf(e) || (t.type === "bigDecimal" && gr.test(t.string));
    }
  }
  function qn(e) {
    return new ue(String(e), "bigDecimal");
  }
  Object.defineProperty(Cr, "generateIdempotencyToken", {
    enumerable: !0,
    get: function () {
      return Hs.v4;
    },
  });
  Cr.LazyJsonString = I;
  Cr.NumericValue = ue;
  Cr._parseEpochTimestamp = Pn;
  Cr._parseRfc3339DateTimeWithOffset = Nn;
  Cr._parseRfc7231DateTime = zn;
  Cr.copyDocumentWithTransform = vs;
  Cr.dateToUtcString = cn;
  Cr.expectBoolean = Ws;
  Cr.expectByte = xe;
  Cr.expectFloat32 = ae;
  Cr.expectInt = Qs;
  Cr.expectInt32 = Se;
  Cr.expectLong = W;
  Cr.expectNonNull = Ys;
  Cr.expectNumber = J;
  Cr.expectObject = Sr;
  Cr.expectShort = we;
  Cr.expectString = Zs;
  Cr.expectUnion = Ks;
  Cr.handleFloat = tn;
  Cr.limitedParseDouble = _e;
  Cr.limitedParseFloat = rn;
  Cr.limitedParseFloat32 = sn;
  Cr.logger = V;
  Cr.nv = qn;
  Cr.parseBoolean = Js;
  Cr.parseEpochTimestamp = bn;
  Cr.parseRfc3339DateTime = hn;
  Cr.parseRfc3339DateTimeWithOffset = dn;
  Cr.parseRfc7231DateTime = yn;
  Cr.quoteHeader = Cn;
  Cr.splitEvery = An;
  Cr.splitHeader = Dn;
  Cr.strictParseByte = Er;
  Cr.strictParseDouble = Ee;
  Cr.strictParseFloat = Xs;
  Cr.strictParseFloat32 = wr;
  Cr.strictParseInt = nn;
  Cr.strictParseInt32 = on;
  Cr.strictParseLong = Tr;
  Cr.strictParseShort = A;
});

export { z6t };
