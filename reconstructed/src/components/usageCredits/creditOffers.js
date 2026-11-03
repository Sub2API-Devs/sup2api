/**
 * components/usageCredits/creditOffers.ts
 *
 * 2.1.316 新增。额度相关提议的判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (23)
 * attribution: placement 23
 */
import { j, y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { o, u, E, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../../utils/debug.js";
import { jdi } from "../../utils/planTiers.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { USAGE_SETTINGS_URL } from "../../services/claudeAiLimits.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-18hwfzwa.js:1128195-1128199 placement
j();
//@ chunk-18hwfzwa.js:1128249-1128253 placement
j();
/**
 * 额度提议的 zod 结构：id 字符串、额外额度分档（bonus_pct）、折扣分档（discount_pct）、提议本体（arm_id/kind/headline_pct/default_bundle_id/days_left/custom_bonus_tiers）。
 */
//@ chunk-18hwfzwa.js:1128253-1129067 placement
var offerIdSchema = DoctorLazy(() =>
    o()
      .regex(/^[A-Za-z0-9_-]{1,64}$/)
      .nullable()
      .optional()
      .catch(null),
  ),
  bonusTierSchema = DoctorLazy(() =>
    u({
      min_pay_minor_units: E().int().min(0),
      max_pay_minor_units: E().int().min(1).nullable().optional(),
      local_min_pay_minor_units: E().int().min(0).nullable().optional(),
      local_max_pay_minor_units: E().int().min(1).nullable().optional(),
      local_max_bonus_pay_minor_units: E().int().min(0).nullable().optional(),
      bonus_pct: E().int().min(1).max(300),
    }),
  ),
  discountTierSchema = DoctorLazy(() =>
    u({
      min_credit_minor_units: E().int().min(0),
      max_credit_minor_units: E().int().min(1).nullable().optional(),
      discount_pct: E().int().min(1).max(100),
    }),
  ),
  creditOfferSchema = DoctorLazy(() =>
    u({
      arm_id: offerIdSchema(),
      kind: o(),
      headline_pct: E().int().min(1).max(300),
      default_bundle_id: offerIdSchema(),
      days_left: E().int().min(0).nullable().optional().catch(null),
      custom_bonus_tiers: A(bonusTierSchema()).nullable().optional().catch(null),
    }),
  );
//@ chunk-18hwfzwa.js:1129067-1130101 placement
function parseCreditBundlesOffer(h) {
  if (h === void 0 || h === null) return null;
  let safeParse = creditOfferSchema().safeParse(h);
  if (!safeParse.success)
    return (
      logForDebugging(
        `[usage-credit-offer] ignoring a malformed bundles offer block: ${safeParse.error.message}`,
      ),
      null
    );
  let D = safeParse.data;
  if (D.kind !== "pct_off" && D.kind !== "extra_credit") return null;
  let L =
    D.kind === "extra_credit" && D.custom_bonus_tiers
      ? D.custom_bonus_tiers
          .filter(
            (custom_bonus_tier) =>
              custom_bonus_tier.max_pay_minor_units === null ||
              custom_bonus_tier.max_pay_minor_units === void 0 ||
              custom_bonus_tier.max_pay_minor_units > custom_bonus_tier.min_pay_minor_units,
          )
          .map((ee) => {
            let ke = ee.max_pay_minor_units ?? null,
              Re = ee.local_min_pay_minor_units ?? null,
              Be = ee.local_max_pay_minor_units ?? null,
              He = Re !== null && (Be === null) === (ke === null) && (Be === null || Be > Re);
            return {
              minPayUsdMinor: ee.min_pay_minor_units,
              maxPayUsdMinor: ke,
              minPayLocalMinor: He ? Re : null,
              maxPayLocalMinor: He ? Be : null,
              maxBonusPayLocalMinor: ee.local_max_bonus_pay_minor_units ?? null,
              bonusPct: ee.bonus_pct,
            };
          })
      : null;
  return {
    kind: D.kind,
    headlinePct: D.headline_pct,
    daysLeft: D.days_left ?? null,
    defaultBundleId: D.default_bundle_id ?? null,
    customBonusTiers: L !== null && L.length > 0 ? L : null,
    armId: D.arm_id ?? null,
  };
}
/**
 * 解析折扣分档数组，丢弃不合法或 max<=min 的项，转换为驼峰字段。
 */
//@ chunk-18hwfzwa.js:1130101-1130434 placement
function parseDiscountTiers(h) {
  if (!Array.isArray(h)) return [];
  let x = [];
  for (let D of h) {
    let safeParse = discountTierSchema().safeParse(D);
    if (!safeParse.success) continue;
    let ee = safeParse.data,
      ke = ee.max_credit_minor_units ?? null;
    if (ke !== null && ke <= ee.min_credit_minor_units) continue;
    x.push({
      minCreditUsdMinor: ee.min_credit_minor_units,
      maxCreditUsdMinor: ke,
      discountPct: ee.discount_pct,
    });
  }
  return x;
}
/**
 * 计算本地货币与额度的换算比例（USD 为 1，否则取首个有效价格档推算）。
 */
//@ chunk-18hwfzwa.js:1130434-1130622 placement
function getLocalCurrencyRate(h, x) {
  if (x.toUpperCase() === "USD") return 1;
  let found = h.find((L) => L.credit_minor_units > 0 && L.local_credit_minor_units > 0);
  return found ? found.credit_minor_units / found.local_credit_minor_units : null;
}
//@ chunk-18hwfzwa.js:1130622-1130693 placement
function r1(h, x) {
  if (h <= 0 || x >= h) return 0;
  return Math.floor(((h - x) * 100) / h);
}
//@ chunk-18hwfzwa.js:1130693-1130764 placement
function i1(h, x) {
  if (x <= 0 || h <= x) return 0;
  return Math.floor(((h - x) * 100) / x);
}
//@ chunk-18hwfzwa.js:1130764-1131026 placement
function findBonusTier(h, x) {
  let D = h.length > 0 && h.every((L) => L.minPayLocalMinor !== null);
  for (let L of h) {
    let [ee, ke, Re] = D
      ? [x.localMinor, L.minPayLocalMinor ?? 0, L.maxPayLocalMinor]
      : [x.usdMinor, L.minPayUsdMinor, L.maxPayUsdMinor];
    if (ee >= ke && (Re === null || ee < Re)) return L;
  }
  return null;
}
//@ chunk-18hwfzwa.js:1131026-1131228 placement
function getDiscountPct(h, x) {
  let D = 0,
    L = -1;
  for (let ee of h)
    if (
      x >= ee.minCreditUsdMinor &&
      (ee.maxCreditUsdMinor === null || x < ee.maxCreditUsdMinor) &&
      ee.minCreditUsdMinor > L
    )
      ((D = ee.discountPct), (L = ee.minCreditUsdMinor));
  return D;
}
//@ chunk-18hwfzwa.js:1131228-1132312 placement
function computeCreditOffer({
  typedMinor: typedMinor,
  offer: offer,
  discountTiers: discountTiers,
  rate: rate,
  capRemainingUsdMinor: capRemainingUsdMinor,
}) {
  let ke = (We = null) => ({
    kind: "plain",
    payMinor: typedMinor,
    creditMinor: typedMinor,
    amountMinor: typedMinor,
    pct: 0,
    withheld: We,
  });
  if (rate === null || !Number.isInteger(typedMinor) || typedMinor <= 0) return ke();
  let Re = (We) =>
    capRemainingUsdMinor !== null &&
    (capRemainingUsdMinor <= 0 || Math.round(We * rate) > capRemainingUsdMinor);
  if (offer?.kind === "extra_credit") {
    let customBonusTiers = offer.customBonusTiers;
    if (customBonusTiers === null) return ke();
    let ze = findBonusTier(customBonusTiers, {
      localMinor: typedMinor,
      usdMinor: Math.round(typedMinor * rate),
    });
    if (ze === null) return ke();
    let bonusPct = ze.bonusPct,
      rt = typedMinor + Qit(typedMinor, bonusPct);
    if (ze.maxBonusPayLocalMinor !== null) {
      if (typedMinor > ze.maxBonusPayLocalMinor) {
        let kt = ze.minPayLocalMinor ?? Math.ceil(ze.minPayUsdMinor / rate);
        return {
          ...ke("bonus"),
          maxWithBonusMinor: ze.maxBonusPayLocalMinor >= kt ? ze.maxBonusPayLocalMinor : 0,
        };
      }
    } else if (Re(rt)) return ke("bonus");
    return {
      kind: "extra_credit",
      payMinor: typedMinor,
      creditMinor: rt,
      amountMinor: typedMinor,
      pct: bonusPct,
      withheld: null,
      expectedCreditMinor: rt,
    };
  }
  if (discountTiers.length === 0) return ke();
  let Be = getDiscountPct(discountTiers, Math.round(typedMinor * rate));
  if (Be === 0) return ke();
  if (Re(typedMinor)) return ke("discount");
  let He = Qit(typedMinor, Be);
  return {
    kind: "discount",
    payMinor: typedMinor - He,
    creditMinor: typedMinor,
    amountMinor: typedMinor,
    pct: Be,
    withheld: null,
    expectedPriceMinor: typedMinor - He,
  };
}
//@ chunk-18hwfzwa.js:1132312-1132362 placement
function Qit(h, x) {
  return Math.floor((h * x + 50) / 100);
}
//@ chunk-18hwfzwa.js:1132362-1132398 placement
function selectBonusPct(Yo) {
  return Yo.bonusPct;
}
//@ chunk-18hwfzwa.js:1132398-1132433 placement
function wTo(wn) {
  return wn === 0 ? 1 : 0;
}
//@ chunk-18hwfzwa.js:1132433-1132474 placement
function kTo(mr) {
  return Math.max(0, mr - 1);
}
//@ chunk-18hwfzwa.js:1132474-1132512 placement
function vTo(da) {
  return da === 0 ? 0 : da - 1;
}
//@ chunk-18hwfzwa.js:1132512-1132550 placement
function CTo(qn) {
  return qn === 2 ? 2 : qn + 1;
}
//@ chunk-18hwfzwa.js:1132550-1132591 placement
function _To(ps) {
  return Math.max(0, ps - 1);
}
//@ chunk-18hwfzwa.js:1132591-1132619 placement
function Xit(h) {
  jdi(getMainLoopModel(), h);
}
/**
 * 购买用量额度相关常量：设置页与条款链接、金额上下限与轮询参数。
 */
//@ chunk-18hwfzwa.js:1132619-1132731 placement
var USAGE_SETTINGS_LINK = USAGE_SETTINGS_URL,
  CONSUMER_TERMS_URL = "https://www.anthropic.com/legal/consumer-terms",
  nat = 2000,
  rat = 30,
  sat = 500,
  E8 = 1000,
  iat = 1e5,
  aat = 1e6;
//@ chunk-18hwfzwa.js:1132731-1133109 placement
function parseAmountInput(h) {
  let trimmed = h.trim();
  if (trimmed === "") return { ok: !1, error: "Enter an amount" };
  let match = /^([0-9]+)(?:\.([0-9]{1,2}))?$/.exec(trimmed);
  if (!match) return { ok: !1, error: "Enter an amount like 20 or 20.50" };
  let L = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (L <= 0) return { ok: !1, error: "Enter an amount" };
  if (L > aat) return { ok: !1, error: `Enter an amount of ${aat / 100} or less` };
  return { ok: !0, cents: L };
}
//@ chunk-18hwfzwa.js:1133109-1133174 placement
function WL(h) {
  return h % 100 === 0 ? String(h / 100) : (h / 100).toFixed(2);
}
//@ chunk-18hwfzwa.js:1133174-1134082 placement
function useAmountInputBuffer(h) {
  let $ = w(6),
    [x, D] = y(h),
    [L, ee] = y(h.length),
    ke = R(!0),
    Re = R(h),
    Be = R(h.length),
    He = R(!1),
    We = R(null),
    ze = R(!1),
    rt;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((rt = () => {
      ze.current = !1;
    }),
      ($[0] = rt));
  else rt = $[0];
  P(rt);
  let kt;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    let Et = (At, It) => {
      let sliced = At.slice(It.length);
      (D(sliced), (We.current = sliced.length), (Be.current = sliced.length), ee(sliced.length));
    };
    kt = (Dt) => {
      let Lt = Re.current;
      if (ke.current) {
        if (
          ((ke.current = !1),
          Lt !== "" && !He.current && Be.current === Lt.length && Dt.length > Lt.length && Dt.startsWith(Lt))
        ) {
          ((ze.current = !0), Et(Dt, Lt));
          return;
        }
      } else if (ze.current && Dt.startsWith(Lt)) {
        Et(Dt, Lt);
        return;
      }
      D(Dt);
    };
    $[1] = kt;
  } else kt = $[1];
  let oo = kt,
    Xt;
  if ($[2] === MEMO_CACHE_SENTINEL)
    ((Xt = (io) => {
      let so = We.current;
      if (so !== null) {
        ((We.current = null), (Be.current = so), ee(so));
        return;
      }
      if (io !== Re.current.length) He.current = !0;
      ((Be.current = io), ee(io));
    }),
      ($[2] = Xt));
  else Xt = $[2];
  let po = Xt,
    ao;
  if ($[3] !== L || $[4] !== x)
    ((ao = { value: x, setValue: oo, cursor: L, setCursor: po }), ($[3] = L), ($[4] = x), ($[5] = ao));
  else ao = $[5];
  return ao;
}

export {
  parseCreditBundlesOffer,
  parseDiscountTiers,
  getLocalCurrencyRate,
  USAGE_SETTINGS_LINK,
  Xit,
  i1,
  r1,
  selectBonusPct,
  computeCreditOffer,
  sat,
  WL,
  useAmountInputBuffer,
  parseAmountInput,
  iat,
  wTo,
  kTo,
  E8,
  vTo,
  CTo,
  _To,
  CONSUMER_TERMS_URL,
  rat,
  nat,
};
