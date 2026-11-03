/**
 * components/usageCredits/ExtraUsageDialog.tsx
 *
 * 2.1.316 新增。额外用量对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (6)
 * attribution: placement 6
 */
import { stripVTControlCharacters } from "util";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { y, Oo, P, R } from "../../../vendor/react/cjs/react.production.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Ratchet } from "../design-system/Ratchet.js";
import { Me } from "../design-system/ThemeProvider.js";
import {
  useRecentInputGuard as useRecentInputGuard_2,
  RECENT_INPUT_GUARD_MS,
} from "../../hooks/useRecentInputGuard.js";
import {
  isBusyCreditsStep,
  CelebrationMessage,
  AwaitWork,
  ClawdLoadingRow,
  ClawdSuccessRow,
  PurchasePoller,
  CustomAmountStep,
  ConfirmPurchaseStep,
  SpendLimitStep,
  AutoReloadStep,
} from "./BuyCreditsFlow.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { getLspManager } from "../../services/lsp/manager.js";
import { fetchUtilization, HEt } from "../../services/api/usage.js";
import {
  fetchPrepaidBalance,
  fetchPaymentMethod,
  fetchPrepaidBundles,
  mapped_3,
  enableOverageBilling,
  updateAutoReloadSettings,
  purchaseApiCredits,
  updateOverageSpendLimit,
} from "../../services/api/billing.js";
import {
  parseCreditBundlesOffer,
  parseDiscountTiers,
  getLocalCurrencyRate,
  USAGE_SETTINGS_LINK,
  Xit,
} from "./creditOffers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit as lit_2, fromEnum } from "../../services/analytics/safeMetadata.js";
import { logForDebugging } from "../../utils/debug.js";
import { saveGlobalConfig } from "../../utils/config.js";
import { fi } from "../../utils/browser.js";
import { hBe } from "../../services/analytics/metadata.js";
import {
  getOfferAnalytics,
  b_e,
  getCreditsValidityNote,
  UsageCreditsOverview,
  CreditBundlePicker,
} from "./UsageCreditsOverview.js";
import { markOfferRedeemed } from "../../services/usageCreditOffers.js";
import { verificationErrorMessage } from "../../services/api/verificationRequired.js";
import { isExpectedApiError, errorMessage } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { formatCurrency } from "../../services/api/referral.js";
import { Box, Text } from "../../ink/components/Text.js";
import { WorkerBadge } from "../permissions/WorkerBadge.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Dialog } from "../design-system/Dialog.js";
import {
  useInputRefusalWindow,
  useRefusalTracker,
  useMountTime,
  settleKey,
} from "../CustomSelect/selectTypeahead.js";
import { PCn } from "../../services/claudeAiLimits.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { replaceControlChars } from "../../utils/resultError.js";

//@ chunk-18hwfzwa.js:1134082-1134549 placement
function ExtraUsageDialogEntry(h) {
  let $ = w(8),
    {
      onDone: onDone,
      initialStep: initialStep,
      entryReason: entryReason,
      onBeforePurchase: onBeforePurchase,
      onPurchaseSuccess: onPurchaseSuccess,
    } = h,
    Be;
  if ($[0] === MEMO_CACHE_SENTINEL) ((Be = { s: "loading" }), ($[0] = Be));
  else Be = $[0];
  let [He, We] = y(Be),
    ze;
  if (
    $[1] !== entryReason ||
    $[2] !== initialStep ||
    $[3] !== onBeforePurchase ||
    $[4] !== onDone ||
    $[5] !== onPurchaseSuccess ||
    $[6] !== He
  )
    ((ze = e(Ratchet, {
      children: e(ExtraUsageDialog, {
        onDone: onDone,
        step: He,
        setStep: We,
        initialStep: initialStep,
        entryReason: entryReason,
        onBeforePurchase: onBeforePurchase,
        onPurchaseSuccess: onPurchaseSuccess,
      }),
    })),
      ($[1] = entryReason),
      ($[2] = initialStep),
      ($[3] = onBeforePurchase),
      ($[4] = onDone),
      ($[5] = onPurchaseSuccess),
      ($[6] = He),
      ($[7] = ze));
  else ze = $[7];
  return ze;
}
/**
 * /extra-usage 内联对话框：加载账户余额与支付方式，支持购买预设/自定义额度、设置月上限、自动充值、无卡时回退浏览器（tengu_extra_usage_inline_dialog_fallback_browser）。
 */
//@ chunk-18hwfzwa.js:1134549-1143182 placement
function ExtraUsageDialog({
  onDone: onDone,
  step: step,
  setStep: setStep,
  initialStep: initialStep,
  entryReason: entryReason,
  onBeforePurchase: onBeforePurchase,
  onPurchaseSuccess: onPurchaseSuccess,
}) {
  let { storageV5: storageV5, credentials: credentials } = Me(),
    We = useRecentInputGuard_2(step.s),
    [ze, Xe] = y(step.s),
    [rt, kt] = y(!1);
  if (ze !== step.s) (kt(isBusyCreditsStep(ze)), Xe(step.s));
  let At = useTimeout(RECENT_INPUT_GUARD_MS, ze),
    It = rt && !At && We(),
    [Ot, Et] = y("USD"),
    [Dt, Lt] = y([]),
    [oo, Xt] = y(null),
    [io, so] = y(null),
    [po, ao] = y([]),
    [co, bo] = y(null),
    [Ao, Bo] = y(),
    [Ro, Ho] = y(null);
  async function Io(Xo = !0) {
    if (Xo) setStep({ s: "loading" });
    try {
      let Sn = getLspManager(),
        $n;
      if (Sn)
        $n = {
          is_enabled: Sn.isEnabled,
          monthly_limit: Sn.spendLimitCents,
          used_credits: Sn.usedCents,
          currency: Sn.currency,
          utilization:
            Sn.spendLimitCents && Sn.spendLimitCents > 0 ? (Sn.usedCents / Sn.spendLimitCents) * 100 : 0,
        };
      let [on, _o, cn, Dn] = await Promise.all([
          $n || initialStep === "buy_select" ? Promise.resolve(null) : fetchUtilization(credentials),
          fetchPrepaidBalance(credentials),
          fetchPaymentMethod(credentials),
          fetchPrepaidBundles(credentials),
        ]),
        upper = (Dn?.currency ?? _o?.currency ?? "USD").toUpperCase();
      Et(upper);
      let mr = Dn?.bundles ?? [];
      (Lt(mr.length > 0 ? mr : upper === "USD" ? mapped_3 : []),
        Bo(Dn?.stripe_product_id),
        Xt(mr.length > 0 ? parseCreditBundlesOffer(Dn?.offer) : null),
        so(
          Dn?.bundle_monthly_cap_minor_units !== null && Dn?.bundle_monthly_cap_minor_units !== void 0
            ? Math.max(0, Dn.bundle_monthly_cap_minor_units - Dn.bundle_paid_this_month_minor_units)
            : null,
        ),
        ao(mr.length > 0 ? parseDiscountTiers(Dn?.custom_discount_tiers) : []),
        bo(getLocalCurrencyRate(mr, upper)));
      let Kn = Dn?.expiry_policy_months ?? _o?.expiry_policy_months ?? null;
      if ((Ho(Kn), getFeatureValue_CACHED_MAY_BE_STALE("tengu_satchel_banjo", !1))) {
        if (Kn !== null)
          if (Number.isInteger(Kn) && Kn > 0) logFeatureOk("extra_usage_expiry_notice");
          else logFeatureBad("extra_usage_expiry_notice", "invalid_months");
      }
      if (initialStep === "buy_select") {
        if (!cn)
          return (
            logEvent("tengu_extra_usage_inline_dialog_fallback_browser", {
              reason: lit_2("no_payment_method"),
            }),
            `No card on file \u2014 add a payment method at ${USAGE_SETTINGS_LINK}`
          );
        setStep({ s: "buy_select", pm: cn });
        return;
      }
      if (!$n && on === null) {
        setStep({
          s: "error",
          msg: "Couldn't load usage credit status \u2014 try /login if your session expired.",
        });
        return;
      }
      if (
        (($n ??= on?.extra_usage ?? {
          is_enabled: !1,
          monthly_limit: null,
          used_credits: null,
          utilization: null,
        }),
        !HEt($n))
      ) {
        setStep({ s: "not_enabled", pm: cn });
        return;
      }
      setStep({ s: "enabled", usage: $n, balance: _o, pm: cn });
    } catch (error) {
      (logForDebugging(`Failed to load extra usage status: ${error}`, { level: "error" }),
        setStep({ s: "error", msg: "Couldn't load usage credit status" }));
    }
  }
  let Wo = Oo(Io),
    mn = Oo((Xo) => onDone(Xo));
  P(() => {
    (logEvent("tengu_extra_usage_inline_dialog_shown", {
      entry_reason: entryReason ? lit_2(entryReason) : void 0,
    }),
      Wo().then((Xo) => {
        if (Xo !== void 0) mn(Xo);
      }));
  }, [entryReason]);
  function Cn(Xo) {
    (logEvent("tengu_extra_usage_inline_dialog_cancel", { from_step: fromEnum(Xo) }),
      onDone(void 0, { display: "skip" }));
  }
  function No() {
    (logEvent("tengu_extra_usage_inline_dialog_enable_confirm", {}),
      setStep({
        s: "enabling",
        work: enableOverageBilling(credentials).then(async (Xo) => {
          if ((logEvent("tengu_extra_usage_inline_dialog_enable_result", { success: Xo }), !Xo)) return !1;
          if (!getLspManager())
            (Xit(storageV5),
              await saveGlobalConfig((Sn) => {
                if (!Sn.oauthAccount) return Sn;
                if (Sn.oauthAccount.hasExtraUsageEnabled === !0) return Sn;
                return { ...Sn, oauthAccount: { ...Sn.oauthAccount, hasExtraUsageEnabled: !0 } };
              }, storageV5));
          return (await Io(!1), !0);
        }),
      }));
  }
  function vo(Xo) {
    if (!Xo) setStep({ s: "error", msg: "Couldn't turn on usage credits" });
  }
  function Yo(Xo, Sn) {
    switch (Xo) {
      case "continue":
        onDone("Continuing with usage credits");
        break;
      case "buy":
        if (!Sn.pm)
          (logEvent("tengu_extra_usage_inline_dialog_fallback_browser", {
            reason: lit_2("no_payment_method"),
          }),
            onDone(`No card on file \u2014 add a payment method at ${USAGE_SETTINGS_LINK}`));
        else setStep({ s: "buy_select", pm: Sn.pm });
        break;
      case "adjust":
        setStep({ s: "adjust_limit", current: Sn.usage.monthly_limit });
        break;
      case "auto_reload":
        if (!Sn.pm)
          (logEvent("tengu_extra_usage_inline_dialog_fallback_browser", {
            reason: lit_2("no_payment_method"),
          }),
            onDone(`No card on file \u2014 add a payment method at ${USAGE_SETTINGS_LINK}`));
        else setStep({ s: "auto_reload_config", current: Sn.balance?.auto_reload_settings, pm: Sn.pm });
        break;
      case "manage":
        (fi(USAGE_SETTINGS_LINK), onDone(`Opening ${USAGE_SETTINGS_LINK}`));
        break;
    }
  }
  function kn(Xo, Sn, $n) {
    logEvent("tengu_extra_usage_inline_dialog_auto_reload", {
      enabled: Xo,
      threshold_cents: Sn,
      reload_to_cents: $n,
      currency: hBe(Ot),
    });
    let on = updateAutoReloadSettings(Xo, Sn, $n, Ot, credentials),
      _o = Xo
        ? on.then(async (cn) => {
            if (cn.ok) await Io(!1);
            return cn;
          })
        : on;
    setStep({ s: "auto_reload_saving", enabled: Xo, work: _o });
  }
  function Fn(Xo, Sn) {
    if (!Xo.ok) {
      setStep({
        s: "error",
        msg: Xo.reason ? `Failed to update auto-reload: ${Xo.reason}` : "Failed to update auto-reload",
      });
      return;
    }
    if (!Sn) Io();
  }
  async function bn(Xo, Sn, $n) {
    if (
      (logEvent("tengu_extra_usage_inline_dialog_buy_confirm", {
        amount_cents: Xo,
        preset: !!Sn,
        currency: hBe(Ot),
        ...getOfferAnalytics(oo),
        custom_kind: $n ? fromEnum($n.kind) : void 0,
        custom_pct: $n?.pct,
      }),
      setStep({ s: "buy_purchasing" }),
      onBeforePurchase)
    ) {
      if (!(await onBeforePurchase().catch(() => !1))) {
        setStep({ s: "error", msg: "Couldn't turn on usage credits \u2014 no charge was made." });
        return;
      }
    }
    let on = Sn?.local_credit_minor_units ?? $n?.creditMinor ?? Xo;
    try {
      let _o = await purchaseApiCredits(
          Sn?.id
            ? { kind: "bundle", bundle: Sn }
            : {
                kind: "custom",
                amountCents: $n?.amountMinor ?? Xo,
                ...($n?.expectedCreditMinor !== void 0 && {
                  expectedCreditMinorUnits: $n.expectedCreditMinor,
                }),
                ...($n?.expectedPriceMinor !== void 0 && { expectedPriceMinorUnits: $n.expectedPriceMinor }),
              },
          credentials,
        ),
        cn = oo !== null && (Sn?.id ? !0 : (_o.discount_minor_units ?? ($n?.pct ? 1 : 0)) > 0);
      if (_o.payment_status === "success") {
        if (
          (logEvent("tengu_extra_usage_inline_dialog_buy_result", {
            status: lit_2("success"),
            ...getOfferAnalytics(oo),
          }),
          oo !== null)
        )
          markOfferRedeemed({ usedOffer: cn });
        setStep({ s: "buy_success", credit: on });
      } else if (_o.payment_status === "pending_invoice" && _o.purchase_id)
        setStep({ s: "buy_polling", purchaseId: _o.purchase_id, credit: on, usedOffer: cn });
      else if (_o.payment_status === "requires_action")
        (logEvent("tengu_extra_usage_inline_dialog_buy_result", {
          status: lit_2("3ds_fallback"),
          ...getOfferAnalytics(oo),
        }),
          setStep({
            s: "error",
            msg: `Your card requires additional verification \u2014 this purchase was not completed. Try again at ${USAGE_SETTINGS_LINK}`,
          }));
      else setStep({ s: "error", msg: "Unexpected purchase state" });
    } catch (error) {
      let cn = verificationErrorMessage(error);
      if (isExpectedApiError(error, (Dn) => verificationErrorMessage(Dn) !== null || b_e(Dn)))
        logForDebugging(`Extra usage credit purchase failed: ${cn ?? errorMessage(error)}`, {
          level: "error",
        });
      else logError(error);
      (logEvent("tengu_extra_usage_inline_dialog_buy_result", {
        status: lit_2("failed"),
        ...getOfferAnalytics(oo),
        drift: b_e(error),
      }),
        setStep({
          s: "error",
          msg: b_e(error)
            ? "Prices changed while this was open, so nothing was charged. Run /usage-credits again to see the current prices."
            : cn
              ? `Purchase failed: ${cn}`
              : "Purchase failed",
        }));
    }
  }
  async function Go(Xo, Sn) {
    (logEvent("tengu_extra_usage_inline_dialog_adjust_limit", {
      old_cents: Sn ?? void 0,
      new_cents: Xo ?? void 0,
      unlimited: Xo === null,
      currency: hBe(Ot),
    }),
      setStep({ s: "adjusting" }));
    let $n = await updateOverageSpendLimit(Xo, Ot, credentials);
    if (!$n.ok) {
      setStep({
        s: "error",
        msg: $n.reason ? `Failed to update spend limit: ${$n.reason}` : "Failed to update spend limit",
      });
      return;
    }
    onDone(
      Xo === null
        ? "Monthly limit set to unlimited"
        : `Monthly limit updated to ${formatCurrency(Xo, Ot, "fit")}`,
    );
  }
  let hn = getCreditsValidityNote(Ro),
    Mn = hn !== null ? Ro : null;
  if (It)
    return e(Box, {
      paddingTop: 1,
      children: e(WorkerBadge, { message: "Loading usage credit status\u2026" }),
    });
  switch (step.s) {
    case "loading":
      return e(Box, {
        paddingTop: 1,
        children: e(WorkerBadge, { message: "Loading usage credit status\u2026" }),
      });
    case "enabling":
      return e(CelebrationMessage, {
        message: "Turning on usage credits\u2026",
        work: step.work,
        failure: !1,
        onDone: vo,
      });
    case "adjusting":
      return e(Box, { paddingTop: 1, children: e(WorkerBadge, { message: "Updating spend limit\u2026" }) });
    case "auto_reload_saving":
      return step.enabled
        ? e(CelebrationMessage, {
            message: "Turning on auto-reload\u2026",
            work: step.work,
            failure: { ok: !1, reason: null },
            onDone: (Xo) => Fn(Xo, !0),
          })
        : e(AwaitWork, {
            message: "Turning off auto-reload\u2026",
            work: step.work,
            failure: { ok: !1, reason: null },
            onDone: (Xo) => Fn(Xo, !1),
          });
    case "buy_purchasing":
      return e(ClawdLoadingRow, { message: "Processing payment\u2026 (may take a few seconds)" });
    case "buy_success": {
      let Xo = `Added ${formatCurrency(step.credit, Ot)} of usage credits`;
      return e(ClawdSuccessRow, {
        message: Xo,
        onDone: () => {
          if (onPurchaseSuccess) return onPurchaseSuccess(Xo);
          return (Xit(storageV5), onDone(Xo));
        },
      });
    }
    case "buy_polling":
      return e(PurchasePoller, {
        purchaseId: step.purchaseId,
        onSuccess: () => {
          if (oo !== null) markOfferRedeemed({ usedOffer: step.usedOffer });
          setStep({ s: "buy_success", credit: step.credit });
        },
        onError: (Xo) => setStep({ s: "error", msg: Xo }),
      });
    case "not_enabled":
      return e(TurnOnUsageCreditsStep, { pm: step.pm, onConfirm: No, onCancel: () => Cn("not_enabled") });
    case "enabled":
      return e(UsageCreditsOverview, {
        step: step,
        currency: Ot,
        onAction: (Xo) => Yo(Xo, step),
        onCancel: () => Cn("enabled"),
      });
    case "buy_select":
      return e(CreditBundlePicker, {
        pm: step.pm,
        presets: Dt,
        offer: oo,
        customPreviewable: co !== null,
        currency: Ot,
        expiryNotice: hn,
        onConfirm: (Xo) =>
          setStep({ s: "buy_confirm", pm: step.pm, cents: Xo.local_price_minor_units, bundle: Xo }),
        onCustom: () => setStep({ s: "buy_custom", pm: step.pm }),
        onCancel: () => (initialStep === "buy_select" ? Cn("buy_select") : void Io()),
      });
    case "buy_custom":
      return e(CustomAmountStep, {
        pm: step.pm,
        initialCents: step.cents,
        currency: Ot,
        offer: oo,
        discountTiers: po,
        usdRate: co,
        capRemaining: io,
        onConfirm: (Xo, Sn) => setStep({ s: "buy_confirm", pm: step.pm, cents: Xo, custom: Sn }),
        onCancel: () => setStep({ s: "buy_select", pm: step.pm }),
      });
    case "buy_confirm":
      return e(ConfirmPurchaseStep, {
        pm: step.pm,
        cents: step.cents,
        bundle: step.bundle,
        custom: step.custom,
        capRemaining: io,
        offerKind: oo?.kind ?? null,
        currency: Ot,
        stripeProductId: Ao,
        expiryMonths: Mn,
        onConfirm: () => bn(step.cents, step.bundle, step.custom),
        onCancel: () =>
          setStep(
            step.bundle
              ? { s: "buy_select", pm: step.pm }
              : { s: "buy_custom", pm: step.pm, cents: step.cents },
          ),
      });
    case "adjust_limit":
      return e(SpendLimitStep, {
        current: step.current,
        currency: Ot,
        onConfirm: (Xo) => Go(Xo, step.current),
        onCancel: () => void Io(),
      });
    case "auto_reload_config":
      return e(AutoReloadStep, {
        current: step.current,
        pm: step.pm,
        currency: Ot,
        onSave: (Xo, Sn) => kn(!0, Xo, Sn),
        onTurnOff: () => kn(!1),
        onCancel: () => void Io(),
      });
    case "error":
      return e(UsageCreditsErrorDialog, { msg: step.msg, onClose: () => Cn("error") });
  }
}
/**
 * 额度错误对话框：显示错误并提示回车打开用量设置页。
 */
//@ chunk-18hwfzwa.js:1143182-1143814 placement
function UsageCreditsErrorDialog(h) {
  let $ = w(9),
    { msg: msg, onClose: onClose } = h,
    ee;
  if ($[0] !== onClose)
    ((ee = {
      "confirm:yes": () => {
        (fi(USAGE_SETTINGS_LINK), onClose());
      },
    }),
      ($[0] = onClose),
      ($[1] = ee));
  else ee = $[1];
  let ke;
  if ($[2] === MEMO_CACHE_SENTINEL) ((ke = { context: "Confirmation" }), ($[2] = ke));
  else ke = $[2];
  MessageActionsKeybindings(ee, ke);
  let Re;
  if ($[3] === MEMO_CACHE_SENTINEL)
    ((Re = r(Byline, {
      children: [
        e(KeyboardShortcutHint, { chord: "enter", action: `open ${USAGE_SETTINGS_LINK}` }),
        e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }),
      ],
    })),
      ($[3] = Re));
  else Re = $[3];
  let Be;
  if ($[4] !== msg)
    ((Be = e(Box, { flexDirection: "column", gap: 1, children: e(Text, { color: "error", children: msg }) })),
      ($[4] = msg),
      ($[5] = Be));
  else Be = $[5];
  let He;
  if ($[6] !== onClose || $[7] !== Be)
    ((He = e(Dialog, {
      title: "Usage credits",
      onCancel: onClose,
      color: "error",
      inputGuide: Re,
      children: Be,
    })),
      ($[6] = onClose),
      ($[7] = Be),
      ($[8] = He));
  else He = $[8];
  return He;
}
//@ chunk-18hwfzwa.js:1143814-1143887 placement
function _h(h) {
  return `${h.brand ?? h.type} \xB7\xB7\xB7\xB7${h.last4 ?? ""}`;
}
//@ chunk-18hwfzwa.js:1143887-1146495 placement
function TurnOnUsageCreditsStep(h) {
  let $ = w(64),
    { pm: pm, onConfirm: onConfirm, onCancel: onCancel } = h,
    ee = useInputRefusalWindow(),
    { refusedWithin: refusedWithin, noteRefused: noteRefused, epoch: epoch } = useRefusalTracker(),
    We;
  if ($[0] !== ee || $[1] !== noteRefused || $[2] !== refusedWithin)
    ((We = function ze() {
      if (ee() || refusedWithin()) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      ($[0] = ee),
      ($[1] = noteRefused),
      ($[2] = refusedWithin),
      ($[3] = We));
  else We = $[3];
  let ze = We,
    Xe = useMountTime(),
    rt = settleKey(epoch),
    kt = R(!1),
    At,
    It,
    Ot,
    Et,
    Dt,
    Lt,
    oo,
    Xt,
    io,
    so,
    po,
    ao,
    co,
    bo,
    Ao,
    Bo,
    Ro,
    Ho,
    Io,
    Wo;
  if (
    $[4] !== ee ||
    $[5] !== rt.remountKey ||
    $[6] !== noteRefused ||
    $[7] !== onCancel ||
    $[8] !== onConfirm ||
    $[9] !== pm ||
    $[10] !== ze ||
    $[11] !== refusedWithin ||
    $[12] !== Xe
  ) {
    let Cn = function Cn(mn) {
      return () => {
        if (kt.current) {
          return;
        }
        if (ee() || refusedWithin()) {
          noteRefused();
          return;
        }
        ((kt.current = !0), mn());
      };
    };
    Ot = Dialog;
    so = "Turn on usage credits";
    po = Cn(onCancel);
    ao = "suggestion";
    It = Box;
    Dt = "column";
    Lt = 1;
    if ($[33] === MEMO_CACHE_SENTINEL)
      ((oo = e(Text, { children: "Keep using Claude when you hit a limit." })), ($[33] = oo));
    else oo = $[33];
    let No;
    if ($[34] !== pm)
      ((No = pm
        ? `Card on file: ${_h(pm)}`
        : `No card on file \u2014 add one at ${USAGE_SETTINGS_LINK} before buying.`),
        ($[34] = pm),
        ($[35] = No));
    else No = $[35];
    if ($[36] !== No) ((Xt = e(Text, { dimColor: !0, children: No })), ($[36] = No), ($[37] = Xt));
    else Xt = $[37];
    if ($[38] === MEMO_CACHE_SENTINEL)
      ((io = r(Text, {
        dimColor: !0,
        children: [
          "By turning on, you agree to turn on usage credits as defined in our Help Center article:",
          `
`,
          PCn,
        ],
      })),
        ($[38] = io));
    else io = $[38];
    At = ConfirmSelect;
    co = rt.remountKey;
    bo = ze;
    Ao = Xe;
    Bo = !0;
    Ro = "Turn on";
    Ho = "Cancel";
    Io = "cancel";
    Wo = Cn(onConfirm);
    Et = Cn(onCancel);
    (($[4] = ee),
      ($[5] = rt.remountKey),
      ($[6] = noteRefused),
      ($[7] = onCancel),
      ($[8] = onConfirm),
      ($[9] = pm),
      ($[10] = ze),
      ($[11] = refusedWithin),
      ($[12] = Xe),
      ($[13] = At),
      ($[14] = It),
      ($[15] = Ot),
      ($[16] = Et),
      ($[17] = Dt),
      ($[18] = Lt),
      ($[19] = oo),
      ($[20] = Xt),
      ($[21] = io),
      ($[22] = so),
      ($[23] = po),
      ($[24] = ao),
      ($[25] = co),
      ($[26] = bo),
      ($[27] = Ao),
      ($[28] = Bo),
      ($[29] = Ro),
      ($[30] = Ho),
      ($[31] = Io),
      ($[32] = Wo));
  } else
    ((At = $[13]),
      (It = $[14]),
      (Ot = $[15]),
      (Et = $[16]),
      (Dt = $[17]),
      (Lt = $[18]),
      (oo = $[19]),
      (Xt = $[20]),
      (io = $[21]),
      (so = $[22]),
      (po = $[23]),
      (ao = $[24]),
      (co = $[25]),
      (bo = $[26]),
      (Ao = $[27]),
      (Bo = $[28]),
      (Ro = $[29]),
      (Ho = $[30]),
      (Io = $[31]),
      (Wo = $[32]));
  let No;
  if (
    $[39] !== At ||
    $[40] !== Et ||
    $[41] !== co ||
    $[42] !== bo ||
    $[43] !== Ao ||
    $[44] !== Bo ||
    $[45] !== Ro ||
    $[46] !== Ho ||
    $[47] !== Io ||
    $[48] !== Wo
  )
    ((No = e(
      At,
      {
        refuseInput: bo,
        openedAt: Ao,
        hideIndexes: Bo,
        confirmLabel: Ro,
        cancelLabel: Ho,
        focus: Io,
        onConfirm: Wo,
        onCancel: Et,
      },
      co,
    )),
      ($[39] = At),
      ($[40] = Et),
      ($[41] = co),
      ($[42] = bo),
      ($[43] = Ao),
      ($[44] = Bo),
      ($[45] = Ro),
      ($[46] = Ho),
      ($[47] = Io),
      ($[48] = Wo),
      ($[49] = No));
  else No = $[49];
  let vo;
  if (
    $[50] !== It ||
    $[51] !== Dt ||
    $[52] !== Lt ||
    $[53] !== oo ||
    $[54] !== Xt ||
    $[55] !== io ||
    $[56] !== No
  )
    ((vo = r(It, { flexDirection: Dt, gap: Lt, children: [oo, Xt, io, No] })),
      ($[50] = It),
      ($[51] = Dt),
      ($[52] = Lt),
      ($[53] = oo),
      ($[54] = Xt),
      ($[55] = io),
      ($[56] = No),
      ($[57] = vo));
  else vo = $[57];
  let Yo;
  if ($[58] !== Ot || $[59] !== so || $[60] !== po || $[61] !== ao || $[62] !== vo)
    ((Yo = e(Ot, { title: so, onCancel: po, color: ao, children: vo })),
      ($[58] = Ot),
      ($[59] = so),
      ($[60] = po),
      ($[61] = ao),
      ($[62] = vo),
      ($[63] = Yo));
  else Yo = $[63];
  return Yo;
}
//@ chunk-18hwfzwa.js:1146495-1146536 placement
function Cat(h) {
  return replaceControlChars(stripVTControlCharacters(h)).trim();
}

export { Cat, _h, ExtraUsageDialogEntry };
