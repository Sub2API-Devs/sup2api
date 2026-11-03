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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Ratchet } from "../design-system/Ratchet.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import {
  useRecentInputGuard as useRecentInputGuard_2,
  RECENT_INPUT_GUARD_MS_2,
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
import { fetchUtilization, isLimitEnabled } from "../../services/api/usage.js";
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
  applyEffortOverride,
} from "./creditOffers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit as lit_2, fromEnum } from "../../services/analytics/safeMetadata.js";
import { logForDebugging } from "../../utils/debug.js";
import { saveGlobalConfig } from "../../utils/config.js";
import { openValidatedUrlSucceeded } from "../../utils/browser.js";
import { localeOrNonconforming } from "../../services/analytics/metadata.js";
import {
  getOfferAnalytics,
  isOfferDriftError,
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
import { EXTRA_USAGE_HELP_URL } from "../../services/claudeAiLimits.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { replaceControlChars } from "../../utils/resultError.js";

//@ chunk-18hwfzwa.js:1134082-1134549 placement
function ExtraUsageDialogEntry(props) {
  let $ = w(8);
  let { onDone, initialStep, entryReason, onBeforePurchase, onPurchaseSuccess } = props;
  let Be;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    Be = {
      s: "loading",
    };
    $[0] = Be;
  } else Be = $[0];
  let [He, We] = y(Be);
  let ze;
  if (
    $[1] !== entryReason ||
    $[2] !== initialStep ||
    $[3] !== onBeforePurchase ||
    $[4] !== onDone ||
    $[5] !== onPurchaseSuccess ||
    $[6] !== He
  ) {
    ze = jsxProd_default(Ratchet, {
      children: jsxProd_default(ExtraUsageDialog, {
        onDone,
        step: He,
        setStep: We,
        initialStep,
        entryReason,
        onBeforePurchase,
        onPurchaseSuccess,
      }),
    });
    $[1] = entryReason;
    $[2] = initialStep;
    $[3] = onBeforePurchase;
    $[4] = onDone;
    $[5] = onPurchaseSuccess;
    $[6] = He;
    $[7] = ze;
  } else ze = $[7];
  return ze;
}
//@ chunk-18hwfzwa.js:1134549-1143182 placement
/**
 * /extra-usage 内联对话框：加载账户余额与支付方式，支持购买预设/自定义额度、设置月上限、自动充值、无卡时回退浏览器（tengu_extra_usage_inline_dialog_fallback_browser）。
 */
function ExtraUsageDialog({
  onDone,
  step,
  setStep,
  initialStep,
  entryReason,
  onBeforePurchase,
  onPurchaseSuccess,
}) {
  let { storageV5, credentials } = useTheme_2();
  let recentInputGuard = useRecentInputGuard_2(step.s);
  let [ze, Xe] = y(step.s);
  let [rt, kt] = y(false);
  if (ze !== step.s) {
    kt(isBusyCreditsStep(ze));
    Xe(step.s);
  }
  let timeout = useTimeout(RECENT_INPUT_GUARD_MS_2, ze);
  let It = rt && !timeout && recentInputGuard();
  let [currency, Et] = y("USD");
  let [Dt, Lt] = y([]);
  let [oo, Xt] = y(null);
  let [io, so] = y(null);
  let [po, ao] = y([]);
  let [co, bo] = y(null);
  let [Ao, Bo] = y();
  let [Ro, Ho] = y(null);
  async function Io(Xo = true) {
    if (Xo)
      setStep({
        s: "loading",
      });
    try {
      let lspManager = getLspManager();
      let $n;
      if (lspManager)
        $n = {
          is_enabled: lspManager.isEnabled,
          monthly_limit: lspManager.spendLimitCents,
          used_credits: lspManager.usedCents,
          currency: lspManager.currency,
          utilization:
            lspManager.spendLimitCents && lspManager.spendLimitCents > 0
              ? (lspManager.usedCents / lspManager.spendLimitCents) * 100
              : 0,
        };
      let [on, prepaidBalance, paymentMethod, prepaidBundles] = await Promise.all([
        $n || initialStep === "buy_select" ? Promise.resolve(null) : fetchUtilization(credentials),
        fetchPrepaidBalance(credentials),
        fetchPaymentMethod(credentials),
        fetchPrepaidBundles(credentials),
      ]);
      let upper = (prepaidBundles?.currency ?? prepaidBalance?.currency ?? "USD").toUpperCase();
      Et(upper);
      let bundles = prepaidBundles?.bundles ?? [];
      Lt(bundles.length > 0 ? bundles : upper === "USD" ? mapped_3 : []);
      Bo(prepaidBundles?.stripe_product_id);
      Xt(bundles.length > 0 ? parseCreditBundlesOffer(prepaidBundles?.offer) : null);
      so(
        prepaidBundles?.bundle_monthly_cap_minor_units !== null &&
          prepaidBundles?.bundle_monthly_cap_minor_units !== undefined
          ? Math.max(
              0,
              prepaidBundles.bundle_monthly_cap_minor_units -
                prepaidBundles.bundle_paid_this_month_minor_units,
            )
          : null,
      );
      ao(bundles.length > 0 ? parseDiscountTiers(prepaidBundles?.custom_discount_tiers) : []);
      bo(getLocalCurrencyRate(bundles, upper));
      let Kn = prepaidBundles?.expiry_policy_months ?? prepaidBalance?.expiry_policy_months ?? null;
      Ho(Kn);
      if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_satchel_banjo", false)) {
        if (Kn !== null)
          if (Number.isInteger(Kn) && Kn > 0) logFeatureOk("extra_usage_expiry_notice");
          else logFeatureBad("extra_usage_expiry_notice", "invalid_months");
      }
      if (initialStep === "buy_select") {
        if (!paymentMethod) {
          logEvent("tengu_extra_usage_inline_dialog_fallback_browser", {
            reason: lit_2("no_payment_method"),
          });
          return `No card on file \u2014 add a payment method at ${USAGE_SETTINGS_LINK}`;
        }
        setStep({
          s: "buy_select",
          pm: paymentMethod,
        });
        return;
      }
      if (!$n && on === null) {
        setStep({
          s: "error",
          msg: "Couldn't load usage credit status \u2014 try /login if your session expired.",
        });
        return;
      }
      $n ??= on?.extra_usage ?? {
        is_enabled: false,
        monthly_limit: null,
        used_credits: null,
        utilization: null,
      };
      if (!isLimitEnabled($n)) {
        setStep({
          s: "not_enabled",
          pm: paymentMethod,
        });
        return;
      }
      setStep({
        s: "enabled",
        usage: $n,
        balance: prepaidBalance,
        pm: paymentMethod,
      });
    } catch (error) {
      logForDebugging(`Failed to load extra usage status: ${error}`, {
        level: "error",
      });
      setStep({
        s: "error",
        msg: "Couldn't load usage credit status",
      });
    }
  }
  let Wo = Oo(Io);
  let mn = Oo((Xo) => onDone(Xo));
  P(() => {
    logEvent("tengu_extra_usage_inline_dialog_shown", {
      entry_reason: entryReason ? lit_2(entryReason) : undefined,
    });
    Wo().then((Xo) => {
      if (Xo !== undefined) mn(Xo);
    });
  }, [entryReason]);
  function Cn(Xo) {
    logEvent("tengu_extra_usage_inline_dialog_cancel", {
      from_step: fromEnum(Xo),
    });
    onDone(undefined, {
      display: "skip",
    });
  }
  function No() {
    logEvent("tengu_extra_usage_inline_dialog_enable_confirm", {});
    setStep({
      s: "enabling",
      work: enableOverageBilling(credentials).then(async (Xo) => {
        logEvent("tengu_extra_usage_inline_dialog_enable_result", {
          success: Xo,
        });
        if (!Xo) return false;
        if (!getLspManager()) {
          applyEffortOverride(storageV5);
          await saveGlobalConfig((Sn) => {
            if (!Sn.oauthAccount) return Sn;
            if (Sn.oauthAccount.hasExtraUsageEnabled === true) return Sn;
            return {
              ...Sn,
              oauthAccount: {
                ...Sn.oauthAccount,
                hasExtraUsageEnabled: true,
              },
            };
          }, storageV5);
        }
        await Io(false);
        return true;
      }),
    });
  }
  function vo(Xo) {
    if (!Xo)
      setStep({
        s: "error",
        msg: "Couldn't turn on usage credits",
      });
  }
  function Yo(Xo, step) {
    switch (Xo) {
      case "continue":
        onDone("Continuing with usage credits");
        break;
      case "buy":
        if (!step.pm) {
          logEvent("tengu_extra_usage_inline_dialog_fallback_browser", {
            reason: lit_2("no_payment_method"),
          });
          onDone(`No card on file \u2014 add a payment method at ${USAGE_SETTINGS_LINK}`);
        } else
          setStep({
            s: "buy_select",
            pm: step.pm,
          });
        break;
      case "adjust":
        setStep({
          s: "adjust_limit",
          current: step.usage.monthly_limit,
        });
        break;
      case "auto_reload":
        if (!step.pm) {
          logEvent("tengu_extra_usage_inline_dialog_fallback_browser", {
            reason: lit_2("no_payment_method"),
          });
          onDone(`No card on file \u2014 add a payment method at ${USAGE_SETTINGS_LINK}`);
        } else
          setStep({
            s: "auto_reload_config",
            current: step.balance?.auto_reload_settings,
            pm: step.pm,
          });
        break;
      case "manage":
        openValidatedUrlSucceeded(USAGE_SETTINGS_LINK);
        onDone(`Opening ${USAGE_SETTINGS_LINK}`);
        break;
    }
  }
  function kn(Xo, Sn, $n) {
    logEvent("tengu_extra_usage_inline_dialog_auto_reload", {
      enabled: Xo,
      threshold_cents: Sn,
      reload_to_cents: $n,
      currency: localeOrNonconforming(currency),
    });
    let on = updateAutoReloadSettings(Xo, Sn, $n, currency, credentials);
    let work = Xo
      ? on.then(async (cn) => {
          if (cn.ok) await Io(false);
          return cn;
        })
      : on;
    setStep({
      s: "auto_reload_saving",
      enabled: Xo,
      work,
    });
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
  async function bn(cents, bundle, custom) {
    logEvent("tengu_extra_usage_inline_dialog_buy_confirm", {
      amount_cents: cents,
      preset: !!bundle,
      currency: localeOrNonconforming(currency),
      ...getOfferAnalytics(oo),
      custom_kind: custom ? fromEnum(custom.kind) : undefined,
      custom_pct: custom?.pct,
    });
    setStep({
      s: "buy_purchasing",
    });
    if (onBeforePurchase) {
      if (!(await onBeforePurchase().catch(() => false))) {
        setStep({
          s: "error",
          msg: "Couldn't turn on usage credits \u2014 no charge was made.",
        });
        return;
      }
    }
    let credit = bundle?.local_credit_minor_units ?? custom?.creditMinor ?? cents;
    try {
      let _o = await purchaseApiCredits(
        bundle?.id
          ? {
              kind: "bundle",
              bundle,
            }
          : {
              kind: "custom",
              amountCents: custom?.amountMinor ?? cents,
              ...(custom?.expectedCreditMinor !== undefined && {
                expectedCreditMinorUnits: custom.expectedCreditMinor,
              }),
              ...(custom?.expectedPriceMinor !== undefined && {
                expectedPriceMinorUnits: custom.expectedPriceMinor,
              }),
            },
        credentials,
      );
      let usedOffer =
        oo !== null && (bundle?.id ? true : (_o.discount_minor_units ?? (custom?.pct ? 1 : 0)) > 0);
      if (_o.payment_status === "success") {
        logEvent("tengu_extra_usage_inline_dialog_buy_result", {
          status: lit_2("success"),
          ...getOfferAnalytics(oo),
        });
        if (oo !== null)
          markOfferRedeemed({
            usedOffer,
          });
        setStep({
          s: "buy_success",
          credit,
        });
      } else if (_o.payment_status === "pending_invoice" && _o.purchase_id)
        setStep({
          s: "buy_polling",
          purchaseId: _o.purchase_id,
          credit,
          usedOffer,
        });
      else if (_o.payment_status === "requires_action") {
        logEvent("tengu_extra_usage_inline_dialog_buy_result", {
          status: lit_2("3ds_fallback"),
          ...getOfferAnalytics(oo),
        });
        setStep({
          s: "error",
          msg: `Your card requires additional verification \u2014 this purchase was not completed. Try again at ${USAGE_SETTINGS_LINK}`,
        });
      } else
        setStep({
          s: "error",
          msg: "Unexpected purchase state",
        });
    } catch (error) {
      let cn = verificationErrorMessage(error);
      if (isExpectedApiError(error, (Dn) => verificationErrorMessage(Dn) !== null || isOfferDriftError(Dn)))
        logForDebugging(`Extra usage credit purchase failed: ${cn ?? errorMessage(error)}`, {
          level: "error",
        });
      else logError(error);
      logEvent("tengu_extra_usage_inline_dialog_buy_result", {
        status: lit_2("failed"),
        ...getOfferAnalytics(oo),
        drift: isOfferDriftError(error),
      });
      setStep({
        s: "error",
        msg: isOfferDriftError(error)
          ? "Prices changed while this was open, so nothing was charged. Run /usage-credits again to see the current prices."
          : cn
            ? `Purchase failed: ${cn}`
            : "Purchase failed",
      });
    }
  }
  async function Go(Xo, Sn) {
    logEvent("tengu_extra_usage_inline_dialog_adjust_limit", {
      old_cents: Sn ?? undefined,
      new_cents: Xo ?? undefined,
      unlimited: Xo === null,
      currency: localeOrNonconforming(currency),
    });
    setStep({
      s: "adjusting",
    });
    let $n = await updateOverageSpendLimit(Xo, currency, credentials);
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
        : `Monthly limit updated to ${formatCurrency(Xo, currency, "fit")}`,
    );
  }
  let creditsValidityNote = getCreditsValidityNote(Ro);
  let expiryMonths = creditsValidityNote !== null ? Ro : null;
  if (It)
    return jsxProd_default(Box, {
      paddingTop: 1,
      children: jsxProd_default(WorkerBadge, {
        message: "Loading usage credit status\u2026",
      }),
    });
  switch (step.s) {
    case "loading":
      return jsxProd_default(Box, {
        paddingTop: 1,
        children: jsxProd_default(WorkerBadge, {
          message: "Loading usage credit status\u2026",
        }),
      });
    case "enabling":
      return jsxProd_default(CelebrationMessage, {
        message: "Turning on usage credits\u2026",
        work: step.work,
        failure: false,
        onDone: vo,
      });
    case "adjusting":
      return jsxProd_default(Box, {
        paddingTop: 1,
        children: jsxProd_default(WorkerBadge, {
          message: "Updating spend limit\u2026",
        }),
      });
    case "auto_reload_saving":
      return step.enabled
        ? jsxProd_default(CelebrationMessage, {
            message: "Turning on auto-reload\u2026",
            work: step.work,
            failure: {
              ok: false,
              reason: null,
            },
            onDone: (Xo) => Fn(Xo, true),
          })
        : jsxProd_default(AwaitWork, {
            message: "Turning off auto-reload\u2026",
            work: step.work,
            failure: {
              ok: false,
              reason: null,
            },
            onDone: (Xo) => Fn(Xo, false),
          });
    case "buy_purchasing":
      return jsxProd_default(ClawdLoadingRow, {
        message: "Processing payment\u2026 (may take a few seconds)",
      });
    case "buy_success": {
      let Xo = `Added ${formatCurrency(step.credit, currency)} of usage credits`;
      return jsxProd_default(ClawdSuccessRow, {
        message: Xo,
        onDone: () => {
          if (onPurchaseSuccess) return onPurchaseSuccess(Xo);
          applyEffortOverride(storageV5);
          return onDone(Xo);
        },
      });
    }
    case "buy_polling":
      return jsxProd_default(PurchasePoller, {
        purchaseId: step.purchaseId,
        onSuccess: () => {
          if (oo !== null)
            markOfferRedeemed({
              usedOffer: step.usedOffer,
            });
          setStep({
            s: "buy_success",
            credit: step.credit,
          });
        },
        onError: (msg) =>
          setStep({
            s: "error",
            msg,
          }),
      });
    case "not_enabled":
      return jsxProd_default(TurnOnUsageCreditsStep, {
        pm: step.pm,
        onConfirm: No,
        onCancel: () => Cn("not_enabled"),
      });
    case "enabled":
      return jsxProd_default(UsageCreditsOverview, {
        step,
        currency,
        onAction: (Xo) => Yo(Xo, step),
        onCancel: () => Cn("enabled"),
      });
    case "buy_select":
      return jsxProd_default(CreditBundlePicker, {
        pm: step.pm,
        presets: Dt,
        offer: oo,
        customPreviewable: co !== null,
        currency,
        expiryNotice: creditsValidityNote,
        onConfirm: (Xo) =>
          setStep({
            s: "buy_confirm",
            pm: step.pm,
            cents: Xo.local_price_minor_units,
            bundle: Xo,
          }),
        onCustom: () =>
          setStep({
            s: "buy_custom",
            pm: step.pm,
          }),
        onCancel: () => (initialStep === "buy_select" ? Cn("buy_select") : void Io()),
      });
    case "buy_custom":
      return jsxProd_default(CustomAmountStep, {
        pm: step.pm,
        initialCents: step.cents,
        currency,
        offer: oo,
        discountTiers: po,
        usdRate: co,
        capRemaining: io,
        onConfirm: (cents, custom) =>
          setStep({
            s: "buy_confirm",
            pm: step.pm,
            cents,
            custom,
          }),
        onCancel: () =>
          setStep({
            s: "buy_select",
            pm: step.pm,
          }),
      });
    case "buy_confirm":
      return jsxProd_default(ConfirmPurchaseStep, {
        pm: step.pm,
        cents: step.cents,
        bundle: step.bundle,
        custom: step.custom,
        capRemaining: io,
        offerKind: oo?.kind ?? null,
        currency,
        stripeProductId: Ao,
        expiryMonths,
        onConfirm: () => bn(step.cents, step.bundle, step.custom),
        onCancel: () =>
          setStep(
            step.bundle
              ? {
                  s: "buy_select",
                  pm: step.pm,
                }
              : {
                  s: "buy_custom",
                  pm: step.pm,
                  cents: step.cents,
                },
          ),
      });
    case "adjust_limit":
      return jsxProd_default(SpendLimitStep, {
        current: step.current,
        currency,
        onConfirm: (Xo) => Go(Xo, step.current),
        onCancel: () => void Io(),
      });
    case "auto_reload_config":
      return jsxProd_default(AutoReloadStep, {
        current: step.current,
        pm: step.pm,
        currency,
        onSave: (Xo, Sn) => kn(true, Xo, Sn),
        onTurnOff: () => kn(false),
        onCancel: () => void Io(),
      });
    case "error":
      return jsxProd_default(UsageCreditsErrorDialog, {
        msg: step.msg,
        onClose: () => Cn("error"),
      });
  }
}
//@ chunk-18hwfzwa.js:1143182-1143814 placement
/**
 * 额度错误对话框：显示错误并提示回车打开用量设置页。
 */
function UsageCreditsErrorDialog(props) {
  let $ = w(9);
  let { msg, onClose } = props;
  let ee;
  if ($[0] !== onClose) {
    ee = {
      "confirm:yes": () => {
        openValidatedUrlSucceeded(USAGE_SETTINGS_LINK);
        onClose();
      },
    };
    $[0] = onClose;
    $[1] = ee;
  } else ee = $[1];
  let ke;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    ke = {
      context: "Confirmation",
    };
    $[2] = ke;
  } else ke = $[2];
  MessageActionsKeybindings(ee, ke);
  let inputGuide;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: `open ${USAGE_SETTINGS_LINK}`,
        }),
        jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "cancel",
        }),
      ],
    });
    $[3] = inputGuide;
  } else inputGuide = $[3];
  let children;
  if ($[4] !== msg) {
    children = jsxProd_default(Box, {
      flexDirection: "column",
      gap: 1,
      children: jsxProd_default(Text, {
        color: "error",
        children: msg,
      }),
    });
    $[4] = msg;
    $[5] = children;
  } else children = $[5];
  let He;
  if ($[6] !== onClose || $[7] !== children) {
    He = jsxProd_default(Dialog, {
      title: "Usage credits",
      onCancel: onClose,
      color: "error",
      inputGuide,
      children,
    });
    $[6] = onClose;
    $[7] = children;
    $[8] = He;
  } else He = $[8];
  return He;
}
//@ chunk-18hwfzwa.js:1143814-1143887 placement
function formatCardOnFile(h) {
  return `${h.brand ?? h.type} \xB7\xB7\xB7\xB7${h.last4 ?? ""}`;
}
//@ chunk-18hwfzwa.js:1143887-1146495 placement
function TurnOnUsageCreditsStep(props) {
  let $ = w(64);
  let { pm, onConfirm, onCancel } = props;
  let inputRefusalWindow = useInputRefusalWindow();
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let We;
  if ($[0] !== inputRefusalWindow || $[1] !== noteRefused || $[2] !== refusedWithin) {
    We = function ze() {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[0] = inputRefusalWindow;
    $[1] = noteRefused;
    $[2] = refusedWithin;
    $[3] = We;
  } else We = $[3];
  let ze = We;
  let mountTime = useMountTime();
  let rt = settleKey(epoch);
  let kt = R(false);
  let At;
  let It;
  let Ot;
  let onCancel_2;
  let flexDirection;
  let gap;
  let oo;
  let Xt;
  let io;
  let title;
  let onCancel_3;
  let color;
  let co;
  let refuseInput;
  let openedAt;
  let hideIndexes;
  let confirmLabel;
  let cancelLabel;
  let focus;
  let onConfirm_2;
  if (
    $[4] !== inputRefusalWindow ||
    $[5] !== rt.remountKey ||
    $[6] !== noteRefused ||
    $[7] !== onCancel ||
    $[8] !== onConfirm ||
    $[9] !== pm ||
    $[10] !== ze ||
    $[11] !== refusedWithin ||
    $[12] !== mountTime
  ) {
    let Cn = function Cn(mn) {
      return () => {
        if (kt.current) {
          return;
        }
        if (inputRefusalWindow() || refusedWithin()) {
          noteRefused();
          return;
        }
        kt.current = true;
        mn();
      };
    };
    Ot = Dialog;
    title = "Turn on usage credits";
    onCancel_3 = Cn(onCancel);
    color = "suggestion";
    It = Box;
    flexDirection = "column";
    gap = 1;
    if ($[33] === MEMO_CACHE_SENTINEL) {
      oo = jsxProd_default(Text, {
        children: "Keep using Claude when you hit a limit.",
      });
      $[33] = oo;
    } else oo = $[33];
    let children;
    if ($[34] !== pm) {
      children = pm
        ? `Card on file: ${formatCardOnFile(pm)}`
        : `No card on file \u2014 add one at ${USAGE_SETTINGS_LINK} before buying.`;
      $[34] = pm;
      $[35] = children;
    } else children = $[35];
    if ($[36] !== children) {
      Xt = jsxProd_default(Text, {
        dimColor: true,
        children,
      });
      $[36] = children;
      $[37] = Xt;
    } else Xt = $[37];
    if ($[38] === MEMO_CACHE_SENTINEL) {
      io = jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "By turning on, you agree to turn on usage credits as defined in our Help Center article:",
          `
`,
          EXTRA_USAGE_HELP_URL,
        ],
      });
      $[38] = io;
    } else io = $[38];
    At = ConfirmSelect;
    co = rt.remountKey;
    refuseInput = ze;
    openedAt = mountTime;
    hideIndexes = true;
    confirmLabel = "Turn on";
    cancelLabel = "Cancel";
    focus = "cancel";
    onConfirm_2 = Cn(onConfirm);
    onCancel_2 = Cn(onCancel);
    $[4] = inputRefusalWindow;
    $[5] = rt.remountKey;
    $[6] = noteRefused;
    $[7] = onCancel;
    $[8] = onConfirm;
    $[9] = pm;
    $[10] = ze;
    $[11] = refusedWithin;
    $[12] = mountTime;
    $[13] = At;
    $[14] = It;
    $[15] = Ot;
    $[16] = onCancel_2;
    $[17] = flexDirection;
    $[18] = gap;
    $[19] = oo;
    $[20] = Xt;
    $[21] = io;
    $[22] = title;
    $[23] = onCancel_3;
    $[24] = color;
    $[25] = co;
    $[26] = refuseInput;
    $[27] = openedAt;
    $[28] = hideIndexes;
    $[29] = confirmLabel;
    $[30] = cancelLabel;
    $[31] = focus;
    $[32] = onConfirm_2;
  } else {
    At = $[13];
    It = $[14];
    Ot = $[15];
    onCancel_2 = $[16];
    flexDirection = $[17];
    gap = $[18];
    oo = $[19];
    Xt = $[20];
    io = $[21];
    title = $[22];
    onCancel_3 = $[23];
    color = $[24];
    co = $[25];
    refuseInput = $[26];
    openedAt = $[27];
    hideIndexes = $[28];
    confirmLabel = $[29];
    cancelLabel = $[30];
    focus = $[31];
    onConfirm_2 = $[32];
  }
  let No;
  if (
    $[39] !== At ||
    $[40] !== onCancel_2 ||
    $[41] !== co ||
    $[42] !== refuseInput ||
    $[43] !== openedAt ||
    $[44] !== hideIndexes ||
    $[45] !== confirmLabel ||
    $[46] !== cancelLabel ||
    $[47] !== focus ||
    $[48] !== onConfirm_2
  ) {
    No = jsxProd_default(
      At,
      {
        refuseInput,
        openedAt,
        hideIndexes,
        confirmLabel,
        cancelLabel,
        focus,
        onConfirm: onConfirm_2,
        onCancel: onCancel_2,
      },
      co,
    );
    $[39] = At;
    $[40] = onCancel_2;
    $[41] = co;
    $[42] = refuseInput;
    $[43] = openedAt;
    $[44] = hideIndexes;
    $[45] = confirmLabel;
    $[46] = cancelLabel;
    $[47] = focus;
    $[48] = onConfirm_2;
    $[49] = No;
  } else No = $[49];
  let children;
  if (
    $[50] !== It ||
    $[51] !== flexDirection ||
    $[52] !== gap ||
    $[53] !== oo ||
    $[54] !== Xt ||
    $[55] !== io ||
    $[56] !== No
  ) {
    children = jsxProd_default_2(It, {
      flexDirection,
      gap,
      children: [oo, Xt, io, No],
    });
    $[50] = It;
    $[51] = flexDirection;
    $[52] = gap;
    $[53] = oo;
    $[54] = Xt;
    $[55] = io;
    $[56] = No;
    $[57] = children;
  } else children = $[57];
  let Yo;
  if ($[58] !== Ot || $[59] !== title || $[60] !== onCancel_3 || $[61] !== color || $[62] !== children) {
    Yo = jsxProd_default(Ot, {
      title,
      onCancel: onCancel_3,
      color,
      children,
    });
    $[58] = Ot;
    $[59] = title;
    $[60] = onCancel_3;
    $[61] = color;
    $[62] = children;
    $[63] = Yo;
  } else Yo = $[63];
  return Yo;
}
//@ chunk-18hwfzwa.js:1146495-1146536 placement
function sanitizeUserText(name) {
  return replaceControlChars(stripVTControlCharacters(name)).trim();
}
export { sanitizeUserText, formatCardOnFile, ExtraUsageDialogEntry };
