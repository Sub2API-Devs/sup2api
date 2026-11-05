/**
 * components/usageCredits/creditOffers.ts
 *
 * 2.1.316 新增。额度相关提议的判定。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (23)
 * attribution: placement 23
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { stringSchema, objectSchema, numberSchema, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../../utils/debug.js";
import { setModelFamilyConsent } from "../../utils/planTiers.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { USAGE_SETTINGS_URL } from "../../services/claudeAiLimits.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1132357-1132361 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1132357", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1146131-1146135 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1146131", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1159035-1159849 placement
/**
 * 额度提议的 zod 结构：id 字符串、额外额度分档（bonus_pct）、折扣分档（discount_pct）、提议本体（arm_id/kind/headline_pct/default_bundle_id/days_left/custom_bonus_tiers）。
 */
var offerIdSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var bonusTierSchema;
var discountTierSchema;
var creditOfferSchema;
deferInit("chunk-czq1j3j2.js:1159035", () => {
  offerIdSchema = DoctorLazy(() =>
    stringSchema()
      .regex(/^[A-Za-z0-9_-]{1,64}$/)
      .nullable()
      .optional()
      .catch(null),
  );
  bonusTierSchema = DoctorLazy(() =>
    objectSchema({
      min_pay_minor_units: numberSchema().int().min(0),
      max_pay_minor_units: numberSchema().int().min(1).nullable().optional(),
      local_min_pay_minor_units: numberSchema().int().min(0).nullable().optional(),
      local_max_pay_minor_units: numberSchema().int().min(1).nullable().optional(),
      local_max_bonus_pay_minor_units: numberSchema().int().min(0).nullable().optional(),
      bonus_pct: numberSchema().int().min(1).max(300),
    }),
  );
  discountTierSchema = DoctorLazy(() =>
    objectSchema({
      min_credit_minor_units: numberSchema().int().min(0),
      max_credit_minor_units: numberSchema().int().min(1).nullable().optional(),
      discount_pct: numberSchema().int().min(1).max(100),
    }),
  );
  creditOfferSchema = DoctorLazy(() =>
    objectSchema({
      arm_id: offerIdSchema(),
      kind: stringSchema(),
      headline_pct: numberSchema().int().min(1).max(300),
      default_bundle_id: offerIdSchema(),
      days_left: numberSchema().int().min(0).nullable().optional().catch(null),
      custom_bonus_tiers: array(bonusTierSchema()).nullable().optional().catch(null),
    }),
  );
});
//@ chunk-czq1j3j2.js:1159849-1160883 placement
function parseCreditBundlesOffer(offer) {
  if (offer === undefined || offer === null) return null;
  let parsed = creditOfferSchema().safeParse(offer);
  if (!parsed.success) {
    logForDebugging(`[usage-credit-offer] ignoring a malformed bundles offer block: ${parsed.error.message}`);
    return null;
  }
  let data = parsed.data;
  if (data.kind !== "pct_off" && data.kind !== "extra_credit") return null;
  let customBonusTiers =
    data.kind === "extra_credit" && data.custom_bonus_tiers
      ? data.custom_bonus_tiers
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
            let hasLocalTierBounds =
              localMinPayMinorUnits !== null &&
              (localMaxPayMinorUnits === null) === (maxPayMinorUnits === null) &&
              (localMaxPayMinorUnits === null || localMaxPayMinorUnits > localMinPayMinorUnits);
            return {
              minPayUsdMinor: customBonusTier.min_pay_minor_units,
              maxPayUsdMinor: maxPayMinorUnits,
              minPayLocalMinor: hasLocalTierBounds ? localMinPayMinorUnits : null,
              maxPayLocalMinor: hasLocalTierBounds ? localMaxPayMinorUnits : null,
              maxBonusPayLocalMinor: customBonusTier.local_max_bonus_pay_minor_units ?? null,
              bonusPct: customBonusTier.bonus_pct,
            };
          })
      : null;
  return {
    kind: data.kind,
    headlinePct: data.headline_pct,
    daysLeft: data.days_left ?? null,
    defaultBundleId: data.default_bundle_id ?? null,
    customBonusTiers: customBonusTiers !== null && customBonusTiers.length > 0 ? customBonusTiers : null,
    armId: data.arm_id ?? null,
  };
}
//@ chunk-czq1j3j2.js:1160883-1161216 placement
/**
 * 解析折扣分档数组，丢弃不合法或 max<=min 的项，转换为驼峰字段。
 */
function parseDiscountTiers(customDiscountTiers) {
  if (!Array.isArray(customDiscountTiers)) return [];
  let tiers = [];
  for (let rawTier of customDiscountTiers) {
    let parsed = discountTierSchema().safeParse(rawTier);
    if (!parsed.success) continue;
    let tier = parsed.data;
    let maxCreditMinorUnits = tier.max_credit_minor_units ?? null;
    if (maxCreditMinorUnits !== null && maxCreditMinorUnits <= tier.min_credit_minor_units) continue;
    tiers.push({
      minCreditUsdMinor: tier.min_credit_minor_units,
      maxCreditUsdMinor: maxCreditMinorUnits,
      discountPct: tier.discount_pct,
    });
  }
  return tiers;
}
//@ chunk-czq1j3j2.js:1161216-1161404 placement
/**
 * 计算本地货币与额度的换算比例（USD 为 1，否则取首个有效价格档推算）。
 */
function getLocalCurrencyRate(bundles, currency) {
  if (currency.toUpperCase() === "USD") return 1;
  let found = bundles.find((bundle) => bundle.credit_minor_units > 0 && bundle.local_credit_minor_units > 0);
  return found ? found.credit_minor_units / found.local_credit_minor_units : null;
}
//@ chunk-czq1j3j2.js:1161404-1161475 placement
function discountPercentOfPay(creditMinor, payMinor) {
  if (creditMinor <= 0 || payMinor >= creditMinor) return 0;
  return Math.floor(((creditMinor - payMinor) * 100) / creditMinor);
}
//@ chunk-czq1j3j2.js:1161475-1161546 placement
function percentOfBase(creditMinor, payMinor) {
  if (payMinor <= 0 || creditMinor <= payMinor) return 0;
  return Math.floor(((creditMinor - payMinor) * 100) / payMinor);
}
//@ chunk-czq1j3j2.js:1161546-1161808 placement
function findBonusTier(customBonusTiers, amount) {
  let useLocalBounds =
    customBonusTiers.length > 0 && customBonusTiers.every((tier) => tier.minPayLocalMinor !== null);
  for (let tier of customBonusTiers) {
    let [amountMinor, minMinor, maxMinor] = useLocalBounds
      ? [amount.localMinor, tier.minPayLocalMinor ?? 0, tier.maxPayLocalMinor]
      : [amount.usdMinor, tier.minPayUsdMinor, tier.maxPayUsdMinor];
    if (amountMinor >= minMinor && (maxMinor === null || amountMinor < maxMinor)) return tier;
  }
  return null;
}
//@ chunk-czq1j3j2.js:1161808-1162010 placement
function getDiscountPct(discountTiers, creditUsdMinor) {
  let bestPct = 0;
  let bestMinUsdMinor = -1;
  for (let tier of discountTiers)
    if (
      creditUsdMinor >= tier.minCreditUsdMinor &&
      (tier.maxCreditUsdMinor === null || creditUsdMinor < tier.maxCreditUsdMinor) &&
      tier.minCreditUsdMinor > bestMinUsdMinor
    ) {
      bestPct = tier.discountPct;
      bestMinUsdMinor = tier.minCreditUsdMinor;
    }
  return bestPct;
}
//@ chunk-czq1j3j2.js:1162010-1163094 placement
function computeCreditOffer({ typedMinor, offer, discountTiers, rate, capRemainingUsdMinor }) {
  let plainOffer = (withheld = null) => ({
    kind: "plain",
    payMinor: typedMinor,
    creditMinor: typedMinor,
    amountMinor: typedMinor,
    pct: 0,
    withheld,
  });
  if (rate === null || !Number.isInteger(typedMinor) || typedMinor <= 0) return plainOffer();
  let exceedsCap = (creditMinor) =>
    capRemainingUsdMinor !== null &&
    (capRemainingUsdMinor <= 0 || Math.round(creditMinor * rate) > capRemainingUsdMinor);
  if (offer?.kind === "extra_credit") {
    let customBonusTiers = offer.customBonusTiers;
    if (customBonusTiers === null) return plainOffer();
    let bonusTier = findBonusTier(customBonusTiers, {
      localMinor: typedMinor,
      usdMinor: Math.round(typedMinor * rate),
    });
    if (bonusTier === null) return plainOffer();
    let bonusPct = bonusTier.bonusPct;
    let creditedMinor = typedMinor + bonusMinorUnits(typedMinor, bonusPct);
    if (bonusTier.maxBonusPayLocalMinor !== null) {
      if (typedMinor > bonusTier.maxBonusPayLocalMinor) {
        let tierMinLocalMinor = bonusTier.minPayLocalMinor ?? Math.ceil(bonusTier.minPayUsdMinor / rate);
        return {
          ...plainOffer("bonus"),
          maxWithBonusMinor:
            bonusTier.maxBonusPayLocalMinor >= tierMinLocalMinor ? bonusTier.maxBonusPayLocalMinor : 0,
        };
      }
    } else if (exceedsCap(creditedMinor)) return plainOffer("bonus");
    return {
      kind: "extra_credit",
      payMinor: typedMinor,
      creditMinor: creditedMinor,
      amountMinor: typedMinor,
      pct: bonusPct,
      withheld: null,
      expectedCreditMinor: creditedMinor,
    };
  }
  if (discountTiers.length === 0) return plainOffer();
  let pct = getDiscountPct(discountTiers, Math.round(typedMinor * rate));
  if (pct === 0) return plainOffer();
  if (exceedsCap(typedMinor)) return plainOffer("discount");
  let discountMinor = bonusMinorUnits(typedMinor, pct);
  return {
    kind: "discount",
    payMinor: typedMinor - discountMinor,
    creditMinor: typedMinor,
    amountMinor: typedMinor,
    pct,
    withheld: null,
    expectedPriceMinor: typedMinor - discountMinor,
  };
}
//@ chunk-czq1j3j2.js:1163094-1163144 placement
function bonusMinorUnits(typedMinor, pct) {
  return Math.floor((typedMinor * pct + 50) / 100);
}
//@ chunk-czq1j3j2.js:1163144-1163180 placement
function selectBonusPct(tier) {
  return tier.bonusPct;
}
//@ chunk-czq1j3j2.js:1163180-1163215 placement
function toBinaryFlag(attempts) {
  return attempts === 0 ? 1 : 0;
}
//@ chunk-czq1j3j2.js:1163215-1163256 placement
function decrementClamped(index) {
  return Math.max(0, index - 1);
}
//@ chunk-czq1j3j2.js:1163256-1163294 placement
function decrementOrZero(index) {
  return index === 0 ? 0 : index - 1;
}
//@ chunk-czq1j3j2.js:1163294-1163332 placement
function incrementCappedAtTwo(index) {
  return index === 2 ? 2 : index + 1;
}
//@ chunk-czq1j3j2.js:1163332-1163373 placement
function decrementClampedLower(index) {
  return Math.max(0, index - 1);
}
//@ chunk-czq1j3j2.js:1163373-1163401 placement
function applyEffortOverride(storageV5) {
  setModelFamilyConsent(getMainLoopModel(), storageV5);
}
//@ chunk-czq1j3j2.js:1163401-1163513 placement
/**
 * 购买用量额度相关常量：设置页与条款链接、金额上下限与轮询参数。
 */
var USAGE_SETTINGS_LINK; // deferred: uses USAGE_SETTINGS_URL (../../services/claudeAiLimits.js) of its import cycle while loading; runs once the cycle is complete
var CONSUMER_TERMS_URL;
var CREDIT_POLL_INTERVAL_MS;
var CREDIT_MAX_POLL_COUNT;
var CREDIT_MIN_AMOUNT_CENTS;
var CREDIT_AMOUNT_STEP_CENTS;
var CREDIT_PRESET_AMOUNTS_CENTS;
var CREDIT_MAX_AMOUNT_CENTS;
deferInit("chunk-czq1j3j2.js:1163401", () => {
  USAGE_SETTINGS_LINK = USAGE_SETTINGS_URL;
  CONSUMER_TERMS_URL = "https://www.anthropic.com/legal/consumer-terms";
  CREDIT_POLL_INTERVAL_MS = 2000;
  CREDIT_MAX_POLL_COUNT = 30;
  CREDIT_MIN_AMOUNT_CENTS = 500;
  CREDIT_AMOUNT_STEP_CENTS = 1000;
  CREDIT_PRESET_AMOUNTS_CENTS = 1e5;
  CREDIT_MAX_AMOUNT_CENTS = 1e6;
});
//@ chunk-czq1j3j2.js:1163513-1163891 placement
function parseAmountInput(text) {
  let trimmed = text.trim();
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
  let cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (cents <= 0)
    return {
      ok: false,
      error: "Enter an amount",
    };
  if (cents > CREDIT_MAX_AMOUNT_CENTS)
    return {
      ok: false,
      error: `Enter an amount of ${CREDIT_MAX_AMOUNT_CENTS / 100} or less`,
    };
  return {
    ok: true,
    cents,
  };
}
//@ chunk-czq1j3j2.js:1163891-1163956 placement
function formatDollarAmount(cents) {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}
//@ chunk-czq1j3j2.js:1163956-1164864 placement
function useAmountInputBuffer(initialValue) {
  let $ = useMemoCache(6);
  let [value, setValue] = useState(initialValue);
  let [cursor, setCursor] = useState(initialValue.length);
  let isFirstChangeRef = useRef(true);
  let currentValueRef = useRef(initialValue);
  let cursorRef = useRef(initialValue.length);
  let cursorMovedRef = useRef(false);
  let pendingCursorRef = useRef(null);
  let isReplacingRef = useRef(false);
  let resetOnMount;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    resetOnMount = () => {
      isReplacingRef.current = false;
    };
    $[0] = resetOnMount;
  } else resetOnMount = $[0];
  useEffect(resetOnMount);
  let setValueGuarded;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    let applyReplacement = (nextText, oldText) => {
      let sliced = nextText.slice(oldText.length);
      setValue(sliced);
      pendingCursorRef.current = sliced.length;
      cursorRef.current = sliced.length;
      setCursor(sliced.length);
    };
    setValueGuarded = (nextText) => {
      let oldText = currentValueRef.current;
      if (isFirstChangeRef.current) {
        isFirstChangeRef.current = false;
        if (
          oldText !== "" &&
          !cursorMovedRef.current &&
          cursorRef.current === oldText.length &&
          nextText.length > oldText.length &&
          nextText.startsWith(oldText)
        ) {
          isReplacingRef.current = true;
          applyReplacement(nextText, oldText);
          return;
        }
      } else if (isReplacingRef.current && nextText.startsWith(oldText)) {
        applyReplacement(nextText, oldText);
        return;
      }
      setValue(nextText);
    };
    $[1] = setValueGuarded;
  } else setValueGuarded = $[1];
  let setValue_2 = setValueGuarded;
  let handleCursorChange;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    handleCursorChange = (nextCursor) => {
      let pendingCursor = pendingCursorRef.current;
      if (pendingCursor !== null) {
        pendingCursorRef.current = null;
        cursorRef.current = pendingCursor;
        setCursor(pendingCursor);
        return;
      }
      if (nextCursor !== currentValueRef.current.length) cursorMovedRef.current = true;
      cursorRef.current = nextCursor;
      setCursor(nextCursor);
    };
    $[2] = handleCursorChange;
  } else handleCursorChange = $[2];
  let setCursor_2 = handleCursorChange;
  let bufferState;
  if ($[3] !== cursor || $[4] !== value) {
    bufferState = {
      value,
      setValue: setValue_2,
      cursor,
      setCursor: setCursor_2,
    };
    $[3] = cursor;
    $[4] = value;
    $[5] = bufferState;
  } else bufferState = $[5];
  return bufferState;
}
export {
  discountPercentOfPay,
  percentOfBase,
  USAGE_SETTINGS_LINK,
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
  parseCreditBundlesOffer,
  parseDiscountTiers,
  getLocalCurrencyRate,
  applyEffortOverride,
  selectBonusPct,
};
