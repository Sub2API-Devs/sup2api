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
import { init_react_production, y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { string, u, E, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../../utils/debug.js";
import { setModelFamilyConsent } from "../../utils/planTiers.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { USAGE_SETTINGS_URL } from "../../services/claudeAiLimits.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-18hwfzwa.js:1128195-1128199 placement
init_react_production();
//@ chunk-18hwfzwa.js:1128249-1128253 placement
init_react_production();
//@ chunk-18hwfzwa.js:1128253-1129067 placement
/**
 * 额度提议的 zod 结构：id 字符串、额外额度分档（bonus_pct）、折扣分档（discount_pct）、提议本体（arm_id/kind/headline_pct/default_bundle_id/days_left/custom_bonus_tiers）。
 */
var offerIdSchema = DoctorLazy(() =>
  string()
    .regex(/^[A-Za-z0-9_-]{1,64}$/)
    .nullable()
    .optional()
    .catch(null),
);
var bonusTierSchema = DoctorLazy(() =>
  u({
    min_pay_minor_units: E().int().min(0),
    max_pay_minor_units: E().int().min(1).nullable().optional(),
    local_min_pay_minor_units: E().int().min(0).nullable().optional(),
    local_max_pay_minor_units: E().int().min(1).nullable().optional(),
    local_max_bonus_pay_minor_units: E().int().min(0).nullable().optional(),
    bonus_pct: E().int().min(1).max(300),
  }),
);
var discountTierSchema = DoctorLazy(() =>
  u({
    min_credit_minor_units: E().int().min(0),
    max_credit_minor_units: E().int().min(1).nullable().optional(),
    discount_pct: E().int().min(1).max(100),
  }),
);
var creditOfferSchema = DoctorLazy(() =>
  u({
    arm_id: offerIdSchema(),
    kind: string(),
    headline_pct: E().int().min(1).max(300),
    default_bundle_id: offerIdSchema(),
    days_left: E().int().min(0).nullable().optional().catch(null),
    custom_bonus_tiers: array(bonusTierSchema()).nullable().optional().catch(null),
  }),
);
//@ chunk-18hwfzwa.js:1129067-1130101 placement
function parseCreditBundlesOffer(offer) {
  if (offer === undefined || offer === null) return null;
  let x = creditOfferSchema().safeParse(offer);
  if (!x.success) {
    logForDebugging(`[usage-credit-offer] ignoring a malformed bundles offer block: ${x.error.message}`);
    return null;
  }
  let D = x.data;
  if (D.kind !== "pct_off" && D.kind !== "extra_credit") return null;
  let L =
    D.kind === "extra_credit" && D.custom_bonus_tiers
      ? D.custom_bonus_tiers
          .filter(
            (customBonusTier) =>
              customBonusTier.max_pay_minor_units === null ||
              customBonusTier.max_pay_minor_units === undefined ||
              customBonusTier.max_pay_minor_units > customBonusTier.min_pay_minor_units,
          )
          .map((customBonusTier) => {
            let maxPayMinorUnits = customBonusTier.max_pay_minor_units ?? null;
            let localMinPayMinorUnits = customBonusTier.local_min_pay_minor_units ?? null;
            let localMaxPayMinorUnits = customBonusTier.local_max_pay_minor_units ?? null;
            let He =
              localMinPayMinorUnits !== null &&
              (localMaxPayMinorUnits === null) === (maxPayMinorUnits === null) &&
              (localMaxPayMinorUnits === null || localMaxPayMinorUnits > localMinPayMinorUnits);
            return {
              minPayUsdMinor: customBonusTier.min_pay_minor_units,
              maxPayUsdMinor: maxPayMinorUnits,
              minPayLocalMinor: He ? localMinPayMinorUnits : null,
              maxPayLocalMinor: He ? localMaxPayMinorUnits : null,
              maxBonusPayLocalMinor: customBonusTier.local_max_bonus_pay_minor_units ?? null,
              bonusPct: customBonusTier.bonus_pct,
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
//@ chunk-18hwfzwa.js:1130101-1130434 placement
/**
 * 解析折扣分档数组，丢弃不合法或 max<=min 的项，转换为驼峰字段。
 */
function parseDiscountTiers(customDiscountTiers) {
  if (!Array.isArray(customDiscountTiers)) return [];
  let x = [];
  for (let D of customDiscountTiers) {
    let L = discountTierSchema().safeParse(D);
    if (!L.success) continue;
    let ee = L.data;
    let maxCreditMinorUnits = ee.max_credit_minor_units ?? null;
    if (maxCreditMinorUnits !== null && maxCreditMinorUnits <= ee.min_credit_minor_units) continue;
    x.push({
      minCreditUsdMinor: ee.min_credit_minor_units,
      maxCreditUsdMinor: maxCreditMinorUnits,
      discountPct: ee.discount_pct,
    });
  }
  return x;
}
//@ chunk-18hwfzwa.js:1130434-1130622 placement
/**
 * 计算本地货币与额度的换算比例（USD 为 1，否则取首个有效价格档推算）。
 */
function getLocalCurrencyRate(bundles, x) {
  if (x.toUpperCase() === "USD") return 1;
  let found = bundles.find((L) => L.credit_minor_units > 0 && L.local_credit_minor_units > 0);
  return found ? found.credit_minor_units / found.local_credit_minor_units : null;
}
//@ chunk-18hwfzwa.js:1130622-1130693 placement
function discountPercentOfPay(h, x) {
  if (h <= 0 || x >= h) return 0;
  return Math.floor(((h - x) * 100) / h);
}
//@ chunk-18hwfzwa.js:1130693-1130764 placement
function percentOfBase(h, x) {
  if (x <= 0 || h <= x) return 0;
  return Math.floor(((h - x) * 100) / x);
}
//@ chunk-18hwfzwa.js:1130764-1131026 placement
function findBonusTier(customBonusTiers, x) {
  let D = customBonusTiers.length > 0 && customBonusTiers.every((L) => L.minPayLocalMinor !== null);
  for (let L of customBonusTiers) {
    let [ee, ke, Re] = D
      ? [x.localMinor, L.minPayLocalMinor ?? 0, L.maxPayLocalMinor]
      : [x.usdMinor, L.minPayUsdMinor, L.maxPayUsdMinor];
    if (ee >= ke && (Re === null || ee < Re)) return L;
  }
  return null;
}
//@ chunk-18hwfzwa.js:1131026-1131228 placement
function getDiscountPct(discountTiers, x) {
  let D = 0;
  let L = -1;
  for (let ee of discountTiers)
    if (
      x >= ee.minCreditUsdMinor &&
      (ee.maxCreditUsdMinor === null || x < ee.maxCreditUsdMinor) &&
      ee.minCreditUsdMinor > L
    ) {
      D = ee.discountPct;
      L = ee.minCreditUsdMinor;
    }
  return D;
}
//@ chunk-18hwfzwa.js:1131228-1132312 placement
function computeCreditOffer({ typedMinor, offer, discountTiers, rate, capRemainingUsdMinor }) {
  let ke = (withheld = null) => ({
    kind: "plain",
    payMinor: typedMinor,
    creditMinor: typedMinor,
    amountMinor: typedMinor,
    pct: 0,
    withheld,
  });
  if (rate === null || !Number.isInteger(typedMinor) || typedMinor <= 0) return ke();
  let Re = (We) =>
    capRemainingUsdMinor !== null &&
    (capRemainingUsdMinor <= 0 || Math.round(We * rate) > capRemainingUsdMinor);
  if (offer?.kind === "extra_credit") {
    let customBonusTiers = offer.customBonusTiers;
    if (customBonusTiers === null) return ke();
    let bonusTier = findBonusTier(customBonusTiers, {
      localMinor: typedMinor,
      usdMinor: Math.round(typedMinor * rate),
    });
    if (bonusTier === null) return ke();
    let bonusPct = bonusTier.bonusPct;
    let rt = typedMinor + bonusMinorUnits(typedMinor, bonusPct);
    if (bonusTier.maxBonusPayLocalMinor !== null) {
      if (typedMinor > bonusTier.maxBonusPayLocalMinor) {
        let kt = bonusTier.minPayLocalMinor ?? Math.ceil(bonusTier.minPayUsdMinor / rate);
        return {
          ...ke("bonus"),
          maxWithBonusMinor: bonusTier.maxBonusPayLocalMinor >= kt ? bonusTier.maxBonusPayLocalMinor : 0,
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
  let discountPct = getDiscountPct(discountTiers, Math.round(typedMinor * rate));
  if (discountPct === 0) return ke();
  if (Re(typedMinor)) return ke("discount");
  let He = bonusMinorUnits(typedMinor, discountPct);
  return {
    kind: "discount",
    payMinor: typedMinor - He,
    creditMinor: typedMinor,
    amountMinor: typedMinor,
    pct: discountPct,
    withheld: null,
    expectedPriceMinor: typedMinor - He,
  };
}
//@ chunk-18hwfzwa.js:1132312-1132362 placement
function bonusMinorUnits(typedMinor, x) {
  return Math.floor((typedMinor * x + 50) / 100);
}
//@ chunk-18hwfzwa.js:1132362-1132398 placement
function selectBonusPct(Yo) {
  return Yo.bonusPct;
}
//@ chunk-18hwfzwa.js:1132398-1132433 placement
function toBinaryFlag(wn) {
  return wn === 0 ? 1 : 0;
}
//@ chunk-18hwfzwa.js:1132433-1132474 placement
function decrementClamped(mr) {
  return Math.max(0, mr - 1);
}
//@ chunk-18hwfzwa.js:1132474-1132512 placement
function decrementOrZero(da) {
  return da === 0 ? 0 : da - 1;
}
//@ chunk-18hwfzwa.js:1132512-1132550 placement
function incrementCappedAtTwo(qn) {
  return qn === 2 ? 2 : qn + 1;
}
//@ chunk-18hwfzwa.js:1132550-1132591 placement
function decrementClampedLower(ps) {
  return Math.max(0, ps - 1);
}
//@ chunk-18hwfzwa.js:1132591-1132619 placement
function applyEffortOverride(storageV5) {
  setModelFamilyConsent(getMainLoopModel(), storageV5);
}
//@ chunk-18hwfzwa.js:1132619-1132731 placement
/**
 * 购买用量额度相关常量：设置页与条款链接、金额上下限与轮询参数。
 */
var USAGE_SETTINGS_LINK = USAGE_SETTINGS_URL;
var CONSUMER_TERMS_URL = "https://www.anthropic.com/legal/consumer-terms";
var CREDIT_POLL_INTERVAL_MS = 2000;
var CREDIT_MAX_POLL_COUNT = 30;
var CREDIT_MIN_AMOUNT_CENTS = 500;
var CREDIT_AMOUNT_STEP_CENTS = 1000;
var CREDIT_PRESET_AMOUNTS_CENTS = 1e5;
var CREDIT_MAX_AMOUNT_CENTS = 1e6;
//@ chunk-18hwfzwa.js:1132731-1133109 placement
function parseAmountInput(h) {
  let trimmed = h.trim();
  if (trimmed === "")
    return {
      ok: false,
      error: "Enter an amount",
    };
  let match = /^([0-9]+)(?:\.([0-9]{1,2}))?$/.exec(trimmed);
  if (!match)
    return {
      ok: false,
      error: "Enter an amount like 20 or 20.50",
    };
  let L = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (L <= 0)
    return {
      ok: false,
      error: "Enter an amount",
    };
  if (L > CREDIT_MAX_AMOUNT_CENTS)
    return {
      ok: false,
      error: `Enter an amount of ${CREDIT_MAX_AMOUNT_CENTS / 100} or less`,
    };
  return {
    ok: true,
    cents: L,
  };
}
//@ chunk-18hwfzwa.js:1133109-1133174 placement
function formatDollarAmount(h) {
  return h % 100 === 0 ? String(h / 100) : (h / 100).toFixed(2);
}
//@ chunk-18hwfzwa.js:1133174-1134082 placement
function useAmountInputBuffer(h) {
  let $ = w(6);
  let [x, D] = y(h);
  let [L, ee] = y(h.length);
  let ke = R(true);
  let Re = R(h);
  let Be = R(h.length);
  let He = R(false);
  let We = R(null);
  let ze = R(false);
  let rt;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    rt = () => {
      ze.current = false;
    };
    $[0] = rt;
  } else rt = $[0];
  P(rt);
  let kt;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    let Et = (At, It) => {
      let sliced = At.slice(It.length);
      D(sliced);
      We.current = sliced.length;
      Be.current = sliced.length;
      ee(sliced.length);
    };
    kt = (Dt) => {
      let Lt = Re.current;
      if (ke.current) {
        ke.current = false;
        if (
          Lt !== "" &&
          !He.current &&
          Be.current === Lt.length &&
          Dt.length > Lt.length &&
          Dt.startsWith(Lt)
        ) {
          ze.current = true;
          Et(Dt, Lt);
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
  let setValue = kt;
  let Xt;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    Xt = (io) => {
      let so = We.current;
      if (so !== null) {
        We.current = null;
        Be.current = so;
        ee(so);
        return;
      }
      if (io !== Re.current.length) He.current = true;
      Be.current = io;
      ee(io);
    };
    $[2] = Xt;
  } else Xt = $[2];
  let setCursor = Xt;
  let ao;
  if ($[3] !== L || $[4] !== x) {
    ao = {
      value: x,
      setValue,
      cursor: L,
      setCursor,
    };
    $[3] = L;
    $[4] = x;
    $[5] = ao;
  } else ao = $[5];
  return ao;
}
export {
  parseCreditBundlesOffer,
  parseDiscountTiers,
  getLocalCurrencyRate,
  USAGE_SETTINGS_LINK,
  applyEffortOverride,
  percentOfBase,
  discountPercentOfPay,
  selectBonusPct,
  computeCreditOffer,
  CREDIT_MIN_AMOUNT_CENTS,
  formatDollarAmount,
  useAmountInputBuffer,
  parseAmountInput,
  CREDIT_PRESET_AMOUNTS_CENTS,
  toBinaryFlag,
  decrementClamped,
  CREDIT_AMOUNT_STEP_CENTS,
  decrementOrZero,
  incrementCappedAtTwo,
  decrementClampedLower,
  CONSUMER_TERMS_URL,
  CREDIT_MAX_POLL_COUNT,
  CREDIT_POLL_INTERVAL_MS,
};
