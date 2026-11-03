/**
 * zod/v4/classic/schemas.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (92)
 * attribution: esm-fingerprint 73, esm-layout 19
 */
import { JK } from "../core/checks.js";
import {
  Ld,
  Nve,
  C8e,
  shs,
  rut,
  OIi,
  P1i,
  A1i,
  C1i,
  R1i,
  k1i,
  T1i,
  xIi,
  x1i,
  YJt,
  ths,
} from "../core/util.js";
import { Fr, ZodEncodeError, MIi } from "../core/core.js";
import { Ys, Ti, Ni, slo, Ci, Ri, Di, ji, Li, Fi, Mi, Ui, Ji } from "../locales/fr.js";
import {
  Qk,
  Fe,
  me,
  z,
  So,
  Io,
  Oo,
  Ao,
  go,
  ho,
  _o,
  yo,
  $o,
  zo,
  bo,
  ko,
  Zo,
  wo,
  Po,
  Eo,
  No,
  Co,
  Ro,
  jo,
  Lo,
  Fo,
  Mo,
  Je,
  Uo,
  Jo,
  Bo,
  Vo,
  Ko,
  Wo,
  Go,
  qo,
  Ho,
  Be,
  Qo,
  en,
  tn,
  rn,
  on,
  nn,
  sn,
  Ve,
  cn,
  un,
  an,
  ln,
  pn,
  fn,
  Ke,
  dn,
  mn,
  nlo,
  hn,
} from "../core/schemas.js";
import {
  C,
  tt,
  nt,
  it,
  st,
  R,
  aMn,
  be,
  rt,
  ot,
  ut,
  ct,
  at,
  lt,
  pt,
  Ye,
  Qe,
  Fn,
  Pn,
  Xe,
  He,
  kn,
  Zn,
  wn,
  Sn,
  In,
  On,
  An,
  et,
  jn,
  En,
  Tn,
  Nn,
  Cn,
  Rn,
  Dn,
  Ln,
  rlo,
  olo,
  Mn,
  Un,
  bn,
  $e,
  X,
  ye,
  Y,
  ze,
  Jn,
  Bn,
  Vn,
  Kn,
  Wn,
  Gn,
  qn,
  Yn,
  Xn,
  Hn,
  Qn,
  ei,
  ti,
} from "../core/api.js";
import { __zod_globalRegistry } from "../core/registries.js";
import { Q, ci } from "../core/to-json-schema.js";
import { Ie, Oe } from "../core/parse.js";
import {
  ht,
  P,
  _t,
  gt,
  vt,
  xt,
  $t,
  zt,
  yt,
  St,
  It,
  Ot,
  At,
  Et,
  Tt,
  bt,
  Zt,
  Pt,
  ke,
  Nt,
  Dt,
  jt,
  Ct,
  Lt,
  Ft,
  Mt,
  Ut,
  wt,
} from "../core/json-schema-processors.js";
import { ie } from "../core/memoizer.cjs";

//@ chunk-7vp249v4.js:56803-56884 esm-fingerprint
function Rs(e, t) {
  let r = new JK({ check: "custom", ...Ld(t) });
  return ((r._zod.check = e), r);
}
//@ chunk-7vp249v4.js:79949-84124 esm-fingerprint
var iA = Fr("ZodType", (e, t) => (Ys(), Qk.init(e, t), (e.def = t), (e.type = t.type), e), {
    check(...e) {
      let def = this.def;
      return this.clone(
        Nve(def, {
          checks: [
            ...(def.checks ?? []),
            ...e.map((r) =>
              typeof r === "function" ? { _zod: { check: r, def: { check: "custom" }, onattach: [] } } : r,
            ),
          ],
        }),
        { parent: !0 },
      );
    },
    with(...e) {
      return this.check(...e);
    },
    clone(e, t) {
      return C8e(this, e, t);
    },
    brand() {
      return this;
    },
    register(e, t) {
      return (e.add(this, t), this);
    },
    refine(e, t) {
      return this.check(Cc(e, t));
    },
    superRefine(e, t) {
      return this.check(Rc(e, t));
    },
    overwrite(e) {
      return this.check(C(e));
    },
    optional() {
      return La(this);
    },
    exactOptional() {
      return bc(this);
    },
    nullable() {
      return Bi(this);
    },
    nullish() {
      return La(Bi(this));
    },
    nonoptional(e) {
      return Ic(this, e);
    },
    array() {
      return A(this);
    },
    or(e) {
      return Ue([this, e]);
    },
    and(e) {
      return Lve(this, e);
    },
    transform(e) {
      return Vi(this, Qi(e));
    },
    default(e) {
      return wc(this, e);
    },
    prefault(e) {
      return Sc(this, e);
    },
    catch(e) {
      return Oc(this, e);
    },
    pipe(e) {
      return Vi(this, e);
    },
    readonly() {
      return Tc(this);
    },
    describe(e) {
      let clone = this.clone();
      return (__zod_globalRegistry.add(clone, { description: e }), clone);
    },
    meta(...e) {
      if (e.length === 0) return __zod_globalRegistry.get(this);
      let clone = this.clone();
      return (__zod_globalRegistry.add(clone, e[0]), clone);
    },
    isOptional() {
      return this.safeParse(void 0).success;
    },
    isNullable() {
      return this.safeParse(null).success;
    },
    apply(e, ...t) {
      return t.length === 0 ? e(this) : e(this, ...t);
    },
    get "~standard"() {
      return shs(this, "~standard", {
        ...Fe(this),
        jsonSchema: { input: Q(this, "input"), output: Q(this, "output") },
      });
    },
    set "~standard"(e) {
      rut(this, "~standard", e);
    },
    parse: function e(t, r) {
      return Ti(this, t, r, { callee: e });
    },
    parseAsync: async function e(t, r) {
      return await Ni(this, t, r, { callee: e });
    },
    safeParse(e, t) {
      return slo(this, e, t);
    },
    async safeParseAsync(e, t) {
      return Ci(this, e, t);
    },
    get spa() {
      return this?.safeParseAsync;
    },
    set spa(e) {
      rut(this, "spa", e);
    },
    validate(e, t) {
      return Ie(this, e, t);
    },
    validateAsync(e, t) {
      return Oe(this, e, t);
    },
    encode: function e(t, r) {
      return Ri(this, t, r, { callee: e });
    },
    decode: function e(t, r) {
      return Di(this, t, r, { callee: e });
    },
    encodeAsync: async function e(t, r) {
      return await ji(this, t, r, { callee: e });
    },
    decodeAsync: async function e(t, r) {
      return await Li(this, t, r, { callee: e });
    },
    safeEncode(e, t) {
      return Fi(this, e, t);
    },
    safeDecode(e, t) {
      return Mi(this, e, t);
    },
    async safeEncodeAsync(e, t) {
      return Ui(this, e, t);
    },
    async safeDecodeAsync(e, t) {
      return Ji(this, e, t);
    },
    toJSONSchema(e) {
      return ci(this, {})(e);
    },
    get description() {
      return __zod_globalRegistry.get(this)?.description;
    },
    get _def() {
      return this._zod.def;
    },
  }),
  Ki = Fr(
    "_ZodString",
    (e, t) => {
      (me.init(e, t), iA.init(e, t), (e._zod.processJSONSchema = (r, n, i) => ht(e, r, n, i)));
    },
    OIi(
      {
        format: (e) => P(e).format ?? null,
        minLength: (e) => P(e).minimum ?? null,
        maxLength: (e) => P(e).maximum ?? null,
      },
      {
        regex(...e) {
          return this.check(tt(...e));
        },
        includes(...e) {
          return this.check(nt(...e));
        },
        startsWith(...e) {
          return this.check(it(...e));
        },
        endsWith(...e) {
          return this.check(st(...e));
        },
        min(...e) {
          return this.check(R(...e));
        },
        max(...e) {
          return this.check(aMn(...e));
        },
        length(...e) {
          return this.check(be(...e));
        },
        nonempty(...e) {
          return this.check(R(1, ...e));
        },
        lowercase(e) {
          return this.check(rt(e));
        },
        uppercase(e) {
          return this.check(ot(e));
        },
        trim() {
          return this.check(ut());
        },
        normalize(...e) {
          return this.check(ct(...e));
        },
        toLowerCase() {
          return this.check(at());
        },
        toUpperCase() {
          return this.check(lt());
        },
        slugify() {
          return this.check(pt());
        },
      },
    ),
  ),
  lMn = Fr(
    "ZodString",
    (e, t) => {
      (me.init(e, t), Ki.init(e, t));
    },
    {
      email(e) {
        return this.check(Ye(Wi, e));
      },
      url(e) {
        return this.check(Qe(qi, e));
      },
      jwt(e) {
        return this.check(Fn(dc, e));
      },
      emoji(e) {
        return this.check(Pn(Qs, e));
      },
      guid(e) {
        return this.check(Xe(Gi, e));
      },
      uuid(e) {
        return this.check(He(ne, e));
      },
      uuidv4(e) {
        return this.check(kn(ne, e));
      },
      uuidv6(e) {
        return this.check(Zn(ne, e));
      },
      uuidv7(e) {
        return this.check(wn(ne, e));
      },
      nanoid(e) {
        return this.check(Sn(ec, e));
      },
      cuid(e) {
        return this.check(In(rc, e));
      },
      cuid2(e) {
        return this.check(On(oc, e));
      },
      ulid(e) {
        return this.check(An(nc, e));
      },
      base64(e) {
        return this.check(et(Yi, e));
      },
      base64url(e) {
        return this.check(jn(pc, e));
      },
      xid(e) {
        return this.check(En(ic, e));
      },
      ksuid(e) {
        return this.check(Tn(sc, e));
      },
      ipv4(e) {
        return this.check(Nn(cc, e));
      },
      ipv6(e) {
        return this.check(Cn(uc, e));
      },
      cidrv4(e) {
        return this.check(Rn(ac, e));
      },
      cidrv6(e) {
        return this.check(Dn(lc, e));
      },
      e164(e) {
        return this.check(Ln(fc, e));
      },
      datetime(e) {
        return this.check(rlo(Ygs, e));
      },
      date(e) {
        return this.check(olo(Xgs, e));
      },
      time(e) {
        return this.check(Mn(Xs, e));
      },
      duration(e) {
        return this.check(Un(Hs, e));
      },
    },
  );
//@ chunk-7vp249v4.js:84124-84155 esm-layout
function o(e) {
  return bn(lMn, e);
}
//@ chunk-7vp249v4.js:84155-84495 esm-fingerprint
var b = Fr("ZodStringFormat", (e, t) => {
    (z.init(e, t), Ki.init(e, t));
  }),
  Ygs = Fr("ZodISODateTime", (e, t) => {
    (So.init(e, t), b.init(e, t));
  }),
  Xgs = Fr("ZodISODate", (e, t) => {
    (Io.init(e, t), b.init(e, t));
  }),
  Xs = Fr("ZodISOTime", (e, t) => {
    (Oo.init(e, t), b.init(e, t));
  }),
  Hs = Fr("ZodISODuration", (e, t) => {
    (Ao.init(e, t), b.init(e, t));
  }),
  Wi = Fr("ZodEmail", (e, t) => {
    (go.init(e, t), b.init(e, t));
  });
//@ chunk-7vp249v4.js:84495-84527 esm-layout
function _Ii(e) {
  return Ye(Wi, e);
}
//@ chunk-7vp249v4.js:84527-84582 esm-fingerprint
var Gi = Fr("ZodGUID", (e, t) => {
  (ho.init(e, t), b.init(e, t));
});
//@ chunk-7vp249v4.js:84582-84614 esm-layout
function bIi(e) {
  return Xe(Gi, e);
}
//@ chunk-7vp249v4.js:84614-84669 esm-fingerprint
var ne = Fr("ZodUUID", (e, t) => {
  (_o.init(e, t), b.init(e, t));
});
//@ chunk-7vp249v4.js:84669-84701 esm-layout
function zJt(e) {
  return He(ne, e);
}
//@ chunk-7vp249v4.js:84701-84755 esm-fingerprint
var qi = Fr("ZodURL", (e, t) => {
  (yo.init(e, t), b.init(e, t));
});
//@ chunk-7vp249v4.js:84755-84787 esm-layout
function A8e(e) {
  return Qe(qi, e);
}
//@ chunk-7vp249v4.js:84787-84843 esm-fingerprint
var Qs = Fr("ZodEmoji", (e, t) => {
  ($o.init(e, t), b.init(e, t));
});
//@ chunk-7vp249v4.js:84843-84900 esm-fingerprint
var ec = Fr("ZodNanoID", (e, t) => {
  (zo.init(e, t), b.init(e, t));
});
//@ chunk-7vp249v4.js:84900-84955 esm-fingerprint
var rc = Fr("ZodCUID", (e, t) => {
  (bo.init(e, t), b.init(e, t));
});
//@ chunk-7vp249v4.js:84955-85011 esm-fingerprint
var oc = Fr("ZodCUID2", (e, t) => {
  (ko.init(e, t), b.init(e, t));
});
//@ chunk-7vp249v4.js:85011-85066 esm-fingerprint
var nc = Fr("ZodULID", (e, t) => {
  (Zo.init(e, t), b.init(e, t));
});
//@ chunk-7vp249v4.js:85066-85120 esm-fingerprint
var ic = Fr("ZodXID", (e, t) => {
  (wo.init(e, t), b.init(e, t));
});
//@ chunk-7vp249v4.js:85120-85176 esm-fingerprint
var sc = Fr("ZodKSUID", (e, t) => {
  (Po.init(e, t), b.init(e, t));
});
//@ chunk-7vp249v4.js:85176-85231 esm-fingerprint
var cc = Fr("ZodIPv4", (e, t) => {
  (Eo.init(e, t), b.init(e, t));
});
//@ chunk-7vp249v4.js:85231-85286 esm-fingerprint
var uc = Fr("ZodIPv6", (e, t) => {
  (No.init(e, t), b.init(e, t));
});
//@ chunk-7vp249v4.js:85286-85343 esm-fingerprint
var ac = Fr("ZodCIDRv4", (e, t) => {
  (Co.init(e, t), b.init(e, t));
});
//@ chunk-7vp249v4.js:85343-85400 esm-fingerprint
var lc = Fr("ZodCIDRv6", (e, t) => {
  (Ro.init(e, t), b.init(e, t));
});
//@ chunk-7vp249v4.js:85400-85457 esm-fingerprint
var Yi = Fr("ZodBase64", (e, t) => {
  (jo.init(e, t), b.init(e, t));
});
//@ chunk-7vp249v4.js:85457-85489 esm-layout
function SIi(e) {
  return et(Yi, e);
}
//@ chunk-7vp249v4.js:85489-85549 esm-fingerprint
var pc = Fr("ZodBase64URL", (e, t) => {
  (Lo.init(e, t), b.init(e, t));
});
//@ chunk-7vp249v4.js:85549-85604 esm-fingerprint
var fc = Fr("ZodE164", (e, t) => {
  (Fo.init(e, t), b.init(e, t));
});
//@ chunk-7vp249v4.js:85604-85658 esm-fingerprint
var dc = Fr("ZodJWT", (e, t) => {
  (Mo.init(e, t), b.init(e, t));
});
//@ chunk-7vp249v4.js:85658-86710 esm-fingerprint
var KJt = Fr(
  "ZodNumber",
  (e, t) => {
    (Je.init(e, t),
      iA.init(e, t),
      (e._zod.processJSONSchema = (r, n, i) => _t(e, r, n, i)),
      (e.isFinite = !0));
  },
  OIi(
    {
      minValue: (e) => {
        let { minimum: minimum, exclusiveMinimum: exclusiveMinimum } = P(e);
        return Math.max(minimum ?? Number.NEGATIVE_INFINITY, exclusiveMinimum ?? Number.NEGATIVE_INFINITY);
      },
      maxValue: (e) => {
        let { maximum: maximum, exclusiveMaximum: exclusiveMaximum } = P(e);
        return Math.min(maximum ?? Number.POSITIVE_INFINITY, exclusiveMaximum ?? Number.POSITIVE_INFINITY);
      },
      isInt: (e) => {
        let { isInt: isInt, multipleOf: multipleOf } = P(e);
        return !!isInt || !!multipleOf?.some(Number.isSafeInteger);
      },
      format: (e) => P(e).format ?? null,
    },
    {
      gt(e, t) {
        return this.check($e(e, t));
      },
      gte(e, t) {
        return this.check(X(e, t));
      },
      min(e, t) {
        return this.check(X(e, t));
      },
      lt(e, t) {
        return this.check(ye(e, t));
      },
      lte(e, t) {
        return this.check(Y(e, t));
      },
      max(e, t) {
        return this.check(Y(e, t));
      },
      int(e) {
        return this.check(tc(e));
      },
      safe(e) {
        return this.check(tc(e));
      },
      positive(e) {
        return this.check($e(0, e));
      },
      nonnegative(e) {
        return this.check(X(0, e));
      },
      negative(e) {
        return this.check(ye(0, e));
      },
      nonpositive(e) {
        return this.check(Y(0, e));
      },
      multipleOf(e, t) {
        return this.check(ze(e, t));
      },
      step(e, t) {
        return this.check(ze(e, t));
      },
      finite() {
        return this;
      },
    },
  ),
);
//@ chunk-7vp249v4.js:86710-86741 esm-layout
function E(e) {
  return Jn(KJt, e);
}
//@ chunk-7vp249v4.js:86741-86806 esm-fingerprint
var Xi = Fr("ZodNumberFormat", (e, t) => {
  (Uo.init(e, t), KJt.init(e, t));
});
//@ chunk-7vp249v4.js:86806-86837 esm-layout
function tc(e) {
  return Bn(Xi, e);
}
//@ chunk-7vp249v4.js:86837-86869 esm-layout
function wIi(e) {
  return Vn(Xi, e);
}
//@ chunk-7vp249v4.js:86869-86975 esm-fingerprint
var dMn = Fr("ZodBoolean", (e, t) => {
  (Jo.init(e, t), iA.init(e, t), (e._zod.processJSONSchema = (r, n, i) => gt(e, r, n, i)));
});
//@ chunk-7vp249v4.js:86975-87006 esm-layout
function M(e) {
  return Kn(dMn, e);
}
//@ chunk-7vp249v4.js:87006-87113 esm-fingerprint
var mc = Fr("ZodUndefined", (e, t) => {
  (Bo.init(e, t), iA.init(e, t), (e._zod.processJSONSchema = (r, n, i) => vt(e, r, n, i)));
});
//@ chunk-7vp249v4.js:87113-87144 esm-layout
function QD(e) {
  return Wn(mc, e);
}
//@ chunk-7vp249v4.js:87144-87246 esm-fingerprint
var hc = Fr("ZodNull", (e, t) => {
  (Vo.init(e, t), iA.init(e, t), (e._zod.processJSONSchema = (r, n, i) => xt(e, r, n, i)));
});
//@ chunk-7vp249v4.js:87246-87277 esm-layout
function zg(e) {
  return Gn(hc, e);
}
//@ chunk-7vp249v4.js:87277-87378 esm-fingerprint
var _c = Fr("ZodAny", (e, t) => {
  (Ko.init(e, t), iA.init(e, t), (e._zod.processJSONSchema = (r, n, i) => $t(e, r, n, i)));
});
//@ chunk-7vp249v4.js:87378-87407 esm-layout
function qne() {
  return qn(_c);
}
//@ chunk-7vp249v4.js:87407-87512 esm-fingerprint
var gc = Fr("ZodUnknown", (e, t) => {
  (Wo.init(e, t), iA.init(e, t), (e._zod.processJSONSchema = (r, n, i) => zt(e, r, n, i)));
});
//@ chunk-7vp249v4.js:87512-87540 esm-layout
function oe() {
  return Yn(gc);
}
//@ chunk-7vp249v4.js:87540-87643 esm-fingerprint
var xc = Fr("ZodNever", (e, t) => {
  (Go.init(e, t), iA.init(e, t), (e._zod.processJSONSchema = (r, n, i) => yt(e, r, n, i)));
});
//@ chunk-7vp249v4.js:87643-87675 esm-layout
function VJt(e) {
  return Xn(xc, e);
}
//@ chunk-7vp249v4.js:87675-87989 esm-fingerprint
var Jgs = Fr(
  "ZodArray",
  (e, t) => {
    (ie(),
      qo.init(e, t),
      iA.init(e, t),
      (e._zod.processJSONSchema = (r, n, i) => St(e, r, n, i)),
      (e.element = t.element));
  },
  {
    min(e, t) {
      return this.check(R(e, t));
    },
    nonempty(e) {
      return this.check(R(1, e));
    },
    max(e, t) {
      return this.check(aMn(e, t));
    },
    length(e, t) {
      return this.check(be(e, t));
    },
    unwrap() {
      return this.element;
    },
  },
);
//@ chunk-7vp249v4.js:87989-88024 esm-layout
function A(e, t) {
  return Hn(Jgs, e, t);
}
//@ chunk-7vp249v4.js:88024-88845 esm-fingerprint
var B1e = Fr(
  "ZodObject",
  (e, t) => {
    (ie(),
      Ho.init(e, t),
      iA.init(e, t),
      (e._zod.processJSONSchema = (r, n, i) => It(e, r, n, i)),
      P1i(e, "shape", (r) => r._zod.def.shape, !1));
  },
  {
    keyof() {
      return U(Object.keys(this._zod.def.shape));
    },
    catchall(e) {
      return this.clone(Nve(this._zod.def, { catchall: e }));
    },
    passthrough() {
      return this.clone(Nve(this._zod.def, { catchall: oe() }));
    },
    loose() {
      return this.clone(Nve(this._zod.def, { catchall: oe() }));
    },
    strict() {
      return this.clone(Nve(this._zod.def, { catchall: VJt() }));
    },
    strip() {
      return this.clone(Nve(this._zod.def, { catchall: void 0 }));
    },
    extend(e) {
      return A1i(this, e);
    },
    safeExtend(e) {
      return C1i(this, e);
    },
    merge(e) {
      return R1i(this, e);
    },
    pick(e) {
      return k1i(this, e);
    },
    omit(e) {
      return T1i(this, e);
    },
    partial(...e) {
      return xIi(oSr, this, e[0]);
    },
    exactPartial(...e) {
      return xIi(es, this, e[0], "exactPartial");
    },
    required(...e) {
      return x1i(ts, this, e[0]);
    },
  },
);
//@ chunk-7vp249v4.js:88845-88922 esm-fingerprint
function u(e, t) {
  let r = { type: "object", shape: e ?? {}, ...Ld(t) };
  return new B1e(r);
}
/**
 * zod v4 内部：构造 strict 对象 schema（catchall 为 never）。属第三方 zod，见 lead 建议。
 */
//@ chunk-7vp249v4.js:88922-89003 esm-fingerprint
function zodStrictObject(e, t) {
  return new B1e({ type: "object", shape: e, catchall: VJt(), ...Ld(t) });
}
//@ chunk-7vp249v4.js:89003-89083 esm-fingerprint
function kt(e, t) {
  return new B1e({ type: "object", shape: e, catchall: oe(), ...Ld(t) });
}
//@ chunk-7vp249v4.js:89083-89206 esm-fingerprint
var Hi = Fr("ZodUnion", (e, t) => {
  (Be.init(e, t),
    iA.init(e, t),
    (e._zod.processJSONSchema = (r, n, i) => Ot(e, r, n, i)),
    (e.options = t.options));
});
//@ chunk-7vp249v4.js:89206-89272 esm-fingerprint
function Ue(e, t) {
  return new Hi({ type: "union", options: e, ...Ld(t) });
}
//@ chunk-7vp249v4.js:89272-89342 esm-fingerprint
var vc = Fr("ZodDiscriminatedUnion", (e, t) => {
  (Hi.init(e, t), Qo.init(e, t));
});
//@ chunk-7vp249v4.js:89342-89426 esm-fingerprint
function Ir(e, t, r) {
  return new vc({ type: "union", options: t, discriminator: e, ...Ld(r) });
}
//@ chunk-7vp249v4.js:89426-89536 esm-fingerprint
var yc = Fr("ZodIntersection", (e, t) => {
  (en.init(e, t), iA.init(e, t), (e._zod.processJSONSchema = (r, n, i) => At(e, r, n, i)));
});
//@ chunk-7vp249v4.js:89536-89606 esm-fingerprint
function Lve(e, t) {
  return new yc({ type: "intersection", left: e, right: t });
}
//@ chunk-7vp249v4.js:89606-89991 esm-fingerprint
var $c = Fr(
  "ZodTuple",
  (e, t) => {
    (ie(), tn.init(e, t), iA.init(e, t), (e._zod.processJSONSchema = (r, n, i) => Et(e, r, n, i)));
  },
  {
    rest(e) {
      return this.clone({ ...this._zod.def, rest: e });
    },
    partial() {
      let def = this._zod.def;
      if (def.checks?.length)
        throw Error(".partial() cannot be used on tuple schemas containing refinements");
      return this.clone({
        ...def,
        items: def.items.map((item) => new oSr({ type: "optional", innerType: item })),
      });
    },
  },
);
//@ chunk-7vp249v4.js:89991-90101 esm-fingerprint
function xE(e, t, r) {
  let n = t instanceof Qk,
    i = n ? r : t;
  return new $c({ type: "tuple", items: e, rest: n ? t : null, ...Ld(i) });
}
//@ chunk-7vp249v4.js:90101-90254 esm-fingerprint
var Bt = Fr("ZodRecord", (e, t) => {
  (ie(),
    rn.init(e, t),
    iA.init(e, t),
    (e._zod.processJSONSchema = (r, n, i) => Tt(e, r, n, i)),
    (e.keyType = t.keyType),
    (e.valueType = t.valueType));
});
//@ chunk-7vp249v4.js:90254-90414 esm-fingerprint
function pe(e, t, r) {
  if (!t || !t._zod) return new Bt({ type: "record", keyType: o(), valueType: e, ...Ld(t) });
  return new Bt({ type: "record", keyType: e, valueType: t, ...Ld(r) });
}
//@ chunk-7vp249v4.js:90414-90507 esm-fingerprint
function Hve(e, t, r) {
  return new Bt({ type: "record", keyType: e, valueType: t, ...Ld(r), partial: !0 });
}
//@ chunk-7vp249v4.js:90507-91044 esm-fingerprint
var rSr = Fr("ZodEnum", (e, t) => {
  (on.init(e, t),
    iA.init(e, t),
    (e._zod.processJSONSchema = (n, i, s) => bt(e, n, i, s)),
    (e.enum = t.entries),
    (e.options = [...e._zod.values]));
  let r = new Set(Object.keys(t.entries));
  ((e.extract = (n, i) => {
    let s = {};
    for (let c of n)
      if (r.has(c)) s[c] = t.entries[c];
      else throw Error(`Key ${c} not found in enum`);
    return new rSr({ ...t, checks: [], ...Ld(i), entries: s });
  }),
    (e.exclude = (n, i) => {
      let s = { ...t.entries };
      for (let c of n)
        if (r.has(c)) delete s[c];
        else throw Error(`Key ${c} not found in enum`);
      return new rSr({ ...t, checks: [], ...Ld(i), entries: s });
    }));
});
//@ chunk-7vp249v4.js:91044-91172 esm-fingerprint
function U(e, t) {
  let r = Array.isArray(e) ? Object.fromEntries(e.map((n) => [n, n])) : e;
  return new rSr({ type: "enum", entries: r, ...Ld(t) });
}
//@ chunk-7vp249v4.js:91172-91477 esm-fingerprint
var Qgs = Fr("ZodLiteral", (e, t) => {
  (nn.init(e, t),
    iA.init(e, t),
    (e._zod.processJSONSchema = (r, n, i) => Zt(e, r, n, i)),
    (e.values = new Set(t.values)),
    Object.defineProperty(e, "value", {
      get() {
        if (t.values.length > 1)
          throw Error("This schema contains multiple valid literal values. Use `.values` instead.");
        return t.values[0];
      },
    }));
});
//@ chunk-7vp249v4.js:91477-91565 esm-fingerprint
function T(e, t) {
  return new Qgs({ type: "literal", values: Array.isArray(e) ? e : [e], ...Ld(t) });
}
//@ chunk-7vp249v4.js:91565-92080 esm-fingerprint
var zc = Fr("ZodTransform", (e, t) => {
  (ie(),
    sn.init(e, t),
    iA.init(e, t),
    (e._zod.processJSONSchema = (r, n, i) => Pt(e, r, n, i)),
    (e._zod.parse = (r, n) => {
      if (n.direction === "backward") throw new ZodEncodeError(e.constructor.name);
      r.addIssue = (s) => {
        if (typeof s === "string") r.issues.push(YJt(s, r.value, t));
        else {
          let c = s;
          if (c.fatal) c.continue = !1;
          if ((c.code ?? (c.code = "custom"), !("input" in c))) c.input = r.value;
          (c.inst ?? (c.inst = e), r.issues.push(YJt(c)));
        }
      };
      let transform = t.transform(r.value, r);
      if (transform instanceof Promise) return transform.then((s) => ((r.value = s), r));
      return ((r.value = transform), r);
    }));
});
//@ chunk-7vp249v4.js:92080-92141 esm-fingerprint
function Qi(e) {
  return new zc({ type: "transform", transform: e });
}
//@ chunk-7vp249v4.js:92141-92282 esm-fingerprint
var oSr = Fr("ZodOptional", (e, t) => {
  (Ve.init(e, t),
    iA.init(e, t),
    (e._zod.processJSONSchema = (r, n, i) => ke(e, r, n, i)),
    (e.unwrap = () => e._zod.def.innerType));
});
//@ chunk-7vp249v4.js:92282-92343 esm-fingerprint
function La(e) {
  return new oSr({ type: "optional", innerType: e });
}
//@ chunk-7vp249v4.js:92343-92488 esm-fingerprint
var es = Fr("ZodExactOptional", (e, t) => {
  (cn.init(e, t),
    iA.init(e, t),
    (e._zod.processJSONSchema = (r, n, i) => ke(e, r, n, i)),
    (e.unwrap = () => e._zod.def.innerType));
});
//@ chunk-7vp249v4.js:92488-92548 esm-fingerprint
function bc(e) {
  return new es({ type: "optional", innerType: e });
}
//@ chunk-7vp249v4.js:92548-92688 esm-fingerprint
var kc = Fr("ZodNullable", (e, t) => {
  (un.init(e, t),
    iA.init(e, t),
    (e._zod.processJSONSchema = (r, n, i) => Nt(e, r, n, i)),
    (e.unwrap = () => e._zod.def.innerType));
});
//@ chunk-7vp249v4.js:92688-92748 esm-fingerprint
function Bi(e) {
  return new kc({ type: "nullable", innerType: e });
}
//@ chunk-7vp249v4.js:92748-92912 esm-fingerprint
var Zc = Fr("ZodDefault", (e, t) => {
  (an.init(e, t),
    iA.init(e, t),
    (e._zod.processJSONSchema = (r, n, i) => Dt(e, r, n, i)),
    (e.unwrap = () => e._zod.def.innerType),
    (e.removeDefault = e.unwrap));
});
//@ chunk-7vp249v4.js:92912-93033 esm-fingerprint
function wc(e, t) {
  return new Zc({
    type: "default",
    innerType: e,
    get defaultValue() {
      return typeof t === "function" ? t() : ths(t);
    },
  });
}
//@ chunk-7vp249v4.js:93033-93173 esm-fingerprint
var Pc = Fr("ZodPrefault", (e, t) => {
  (ln.init(e, t),
    iA.init(e, t),
    (e._zod.processJSONSchema = (r, n, i) => jt(e, r, n, i)),
    (e.unwrap = () => e._zod.def.innerType));
});
//@ chunk-7vp249v4.js:93173-93295 esm-fingerprint
function Sc(e, t) {
  return new Pc({
    type: "prefault",
    innerType: e,
    get defaultValue() {
      return typeof t === "function" ? t() : ths(t);
    },
  });
}
//@ chunk-7vp249v4.js:93295-93438 esm-fingerprint
var ts = Fr("ZodNonOptional", (e, t) => {
  (pn.init(e, t),
    iA.init(e, t),
    (e._zod.processJSONSchema = (r, n, i) => Ct(e, r, n, i)),
    (e.unwrap = () => e._zod.def.innerType));
});
//@ chunk-7vp249v4.js:93438-93512 esm-fingerprint
function Ic(e, t) {
  return new ts({ type: "nonoptional", innerType: e, ...Ld(t) });
}
//@ chunk-7vp249v4.js:93512-93673 esm-fingerprint
var ilo = Fr("ZodCatch", (e, t) => {
  (fn.init(e, t),
    iA.init(e, t),
    (e._zod.processJSONSchema = (r, n, i) => Lt(e, r, n, i)),
    (e.unwrap = () => e._zod.def.innerType),
    (e.removeCatch = e.unwrap));
});
//@ chunk-7vp249v4.js:93673-93775 esm-fingerprint
function Oc(e, t) {
  return new ilo({ type: "catch", innerType: e, catchValue: typeof t === "function" ? t : MIi(t) });
}
//@ chunk-7vp249v4.js:93775-93900 esm-fingerprint
var sSr = Fr("ZodPipe", (e, t) => {
  (Ke.init(e, t),
    iA.init(e, t),
    (e._zod.processJSONSchema = (r, n, i) => Ft(e, r, n, i)),
    (e.in = t.in),
    (e.out = t.out));
});
//@ chunk-7vp249v4.js:93900-93958 esm-fingerprint
function Vi(e, t) {
  return new sSr({ type: "pipe", in: e, out: t });
}
//@ chunk-7vp249v4.js:93958-94157 esm-fingerprint
var Ac = Fr("ZodPreprocess", (e, t) => {
    (sSr.init(e, t), dn.init(e, t));
  }),
  Ec = Fr("ZodReadonly", (e, t) => {
    (mn.init(e, t),
      iA.init(e, t),
      (e._zod.processJSONSchema = (r, n, i) => Mt(e, r, n, i)),
      (e.unwrap = () => e._zod.def.innerType));
  });
//@ chunk-7vp249v4.js:94157-94217 esm-fingerprint
function Tc(e) {
  return new Ec({ type: "readonly", innerType: e });
}
//@ chunk-7vp249v4.js:94217-94353 esm-fingerprint
var Nc = Fr("ZodLazy", (e, t) => {
  (nlo.init(e, t),
    iA.init(e, t),
    (e._zod.processJSONSchema = (r, n, i) => Ut(e, r, n, i)),
    (e.unwrap = () => e._zod.def.getter()));
});
//@ chunk-7vp249v4.js:94353-94406 esm-fingerprint
function aA(e) {
  return new Nc({ type: "lazy", getter: e });
}
//@ chunk-7vp249v4.js:94406-94510 esm-fingerprint
var rs = Fr("ZodCustom", (e, t) => {
  (hn.init(e, t), iA.init(e, t), (e._zod.processJSONSchema = (r, n, i) => wt(e, r, n, i)));
});
//@ chunk-7vp249v4.js:94510-94555 esm-layout
function hu(e, t) {
  return Qn(rs, e ?? (() => !0), t);
}
//@ chunk-7vp249v4.js:94555-94593 esm-layout
function Cc(e, t = {}) {
  return ei(rs, e, t);
}
//@ chunk-7vp249v4.js:94593-94625 esm-layout
function Rc(e, t) {
  return ti(e, t);
}
//@ chunk-7vp249v4.js:94625-94686 esm-fingerprint
function Ka(e, t) {
  return new Ac({ type: "pipe", in: Qi(e), out: t });
}

export {
  u,
  o,
  M,
  A,
  Ir,
  T,
  E,
  pe,
  kt,
  U,
  oe,
  Ue,
  zodStrictObject,
  aA,
  hu,
  qne,
  Ka,
  zg,
  zJt,
  VJt,
  Lve,
  La,
  A8e,
  tc,
  xE,
  Hve,
  QD,
  ilo,
  oSr,
  sSr,
  B1e,
  iA,
  lMn,
  KJt,
  dMn,
  Rs,
  Jgs,
  rSr,
  Qgs,
  SIi,
  wIi,
  bIi,
  _Ii,
  Ygs,
  Xgs,
};
