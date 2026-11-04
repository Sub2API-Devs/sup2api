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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useState, useEffectEvent, useEffect, useRef } from "../../../vendor/react/cjs/react.production.js";
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
  let $ = useMemoCache(8);
  let { onDone, initialStep, entryReason, onBeforePurchase, onPurchaseSuccess } = props;
  let initialStepState;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    initialStepState = {
      s: "loading",
    };
    $[0] = initialStepState;
  } else initialStepState = $[0];
  let [step, setStep] = useState(initialStepState);
  let dialogElement;
  if (
    $[1] !== entryReason ||
    $[2] !== initialStep ||
    $[3] !== onBeforePurchase ||
    $[4] !== onDone ||
    $[5] !== onPurchaseSuccess ||
    $[6] !== step
  ) {
    dialogElement = jsxProd_default(Ratchet, {
      children: jsxProd_default(ExtraUsageDialog, {
        onDone,
        step,
        setStep,
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
    $[6] = step;
    $[7] = dialogElement;
  } else dialogElement = $[7];
  return dialogElement;
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
  let [trackedStep, setTrackedStep] = useState(step.s);
  let [isBusyTracking, setIsBusyTracking] = useState(false);
  if (trackedStep !== step.s) {
    setIsBusyTracking(isBusyCreditsStep(trackedStep));
    setTrackedStep(step.s);
  }
  let timeout = useTimeout(RECENT_INPUT_GUARD_MS_2, trackedStep);
  let isGuardActive = isBusyTracking && !timeout && recentInputGuard();
  let [currency, setCurrency] = useState("USD");
  let [bundles, setBundles] = useState([]);
  let [offer, setOffer] = useState(null);
  let [capRemaining, setCapRemaining] = useState(null);
  let [discountTiers, setDiscountTiers] = useState([]);
  let [usdRate, setUsdRate] = useState(null);
  let [stripeProductId, setStripeProductId] = useState();
  let [expiryMonths, setExpiryMonths] = useState(null);
  async function loadStatus(showLoading = true) {
    if (showLoading)
      setStep({
        s: "loading",
      });
    try {
      let lspManager = getLspManager();
      let localStatus;
      if (lspManager)
        localStatus = {
          is_enabled: lspManager.isEnabled,
          monthly_limit: lspManager.spendLimitCents,
          used_credits: lspManager.usedCents,
          currency: lspManager.currency,
          utilization:
            lspManager.spendLimitCents && lspManager.spendLimitCents > 0
              ? (lspManager.usedCents / lspManager.spendLimitCents) * 100
              : 0,
        };
      let [fetchedUsage, prepaidBalance, paymentMethod, prepaidBundles] = await Promise.all([
        localStatus || initialStep === "buy_select" ? Promise.resolve(null) : fetchUtilization(credentials),
        fetchPrepaidBalance(credentials),
        fetchPaymentMethod(credentials),
        fetchPrepaidBundles(credentials),
      ]);
      let currency = (prepaidBundles?.currency ?? prepaidBalance?.currency ?? "USD").toUpperCase();
      setCurrency(currency);
      let bundles = prepaidBundles?.bundles ?? [];
      setBundles(bundles.length > 0 ? bundles : currency === "USD" ? mapped_3 : []);
      setStripeProductId(prepaidBundles?.stripe_product_id);
      setOffer(bundles.length > 0 ? parseCreditBundlesOffer(prepaidBundles?.offer) : null);
      setCapRemaining(
        prepaidBundles?.bundle_monthly_cap_minor_units !== null &&
          prepaidBundles?.bundle_monthly_cap_minor_units !== undefined
          ? Math.max(
              0,
              prepaidBundles.bundle_monthly_cap_minor_units -
                prepaidBundles.bundle_paid_this_month_minor_units,
            )
          : null,
      );
      setDiscountTiers(bundles.length > 0 ? parseDiscountTiers(prepaidBundles?.custom_discount_tiers) : []);
      setUsdRate(getLocalCurrencyRate(bundles, currency));
      let expiryPolicyMonths =
        prepaidBundles?.expiry_policy_months ?? prepaidBalance?.expiry_policy_months ?? null;
      setExpiryMonths(expiryPolicyMonths);
      if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_satchel_banjo", false)) {
        if (expiryPolicyMonths !== null)
          if (Number.isInteger(expiryPolicyMonths) && expiryPolicyMonths > 0)
            logFeatureOk("extra_usage_expiry_notice");
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
      if (!localStatus && fetchedUsage === null) {
        setStep({
          s: "error",
          msg: "Couldn't load usage credit status \u2014 try /login if your session expired.",
        });
        return;
      }
      localStatus ??= fetchedUsage?.extra_usage ?? {
        is_enabled: false,
        monthly_limit: null,
        used_credits: null,
        utilization: null,
      };
      if (!isLimitEnabled(localStatus)) {
        setStep({
          s: "not_enabled",
          pm: paymentMethod,
        });
        return;
      }
      setStep({
        s: "enabled",
        usage: localStatus,
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
  let loadStatusCallback = useEffectEvent(loadStatus);
  let finishWithResult = useEffectEvent((resultArg) => onDone(resultArg));
  useEffect(() => {
    logEvent("tengu_extra_usage_inline_dialog_shown", {
      entry_reason: entryReason ? lit_2(entryReason) : undefined,
    });
    loadStatusCallback().then((loadResult) => {
      if (loadResult !== undefined) finishWithResult(loadResult);
    });
  }, [entryReason]);
  function cancelWithReason(fromStep) {
    logEvent("tengu_extra_usage_inline_dialog_cancel", {
      from_step: fromEnum(fromStep),
    });
    onDone(undefined, {
      display: "skip",
    });
  }
  function confirmEnable() {
    logEvent("tengu_extra_usage_inline_dialog_enable_confirm", {});
    setStep({
      s: "enabling",
      work: enableOverageBilling(credentials).then(async (enableSucceeded) => {
        logEvent("tengu_extra_usage_inline_dialog_enable_result", {
          success: enableSucceeded,
        });
        if (!enableSucceeded) return false;
        if (!getLspManager()) {
          applyEffortOverride(storageV5);
          await saveGlobalConfig((config) => {
            if (!config.oauthAccount) return config;
            if (config.oauthAccount.hasExtraUsageEnabled === true) return config;
            return {
              ...config,
              oauthAccount: {
                ...config.oauthAccount,
                hasExtraUsageEnabled: true,
              },
            };
          }, storageV5);
        }
        await loadStatus(false);
        return true;
      }),
    });
  }
  function handleEnableDone(isSuccess) {
    if (!isSuccess)
      setStep({
        s: "error",
        msg: "Couldn't turn on usage credits",
      });
  }
  function handleAction(action, step) {
    switch (action) {
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
  function saveAutoReload(isEnabled, thresholdCents, reloadToCents) {
    logEvent("tengu_extra_usage_inline_dialog_auto_reload", {
      enabled: isEnabled,
      threshold_cents: thresholdCents,
      reload_to_cents: reloadToCents,
      currency: localeOrNonconforming(currency),
    });
    let savePromise = updateAutoReloadSettings(
      isEnabled,
      thresholdCents,
      reloadToCents,
      currency,
      credentials,
    );
    let work = isEnabled
      ? savePromise.then(async (saveResult) => {
          if (saveResult.ok) await loadStatus(false);
          return saveResult;
        })
      : savePromise;
    setStep({
      s: "auto_reload_saving",
      enabled: isEnabled,
      work,
    });
  }
  function handleAutoReloadDone(result, isEnabled) {
    if (!result.ok) {
      setStep({
        s: "error",
        msg: result.reason
          ? `Failed to update auto-reload: ${result.reason}`
          : "Failed to update auto-reload",
      });
      return;
    }
    if (!isEnabled) loadStatus();
  }
  async function confirmPurchase(cents, bundle, custom) {
    logEvent("tengu_extra_usage_inline_dialog_buy_confirm", {
      amount_cents: cents,
      preset: !!bundle,
      currency: localeOrNonconforming(currency),
      ...getOfferAnalytics(offer),
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
      let purchaseResult = await purchaseApiCredits(
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
        offer !== null &&
        (bundle?.id ? true : (purchaseResult.discount_minor_units ?? (custom?.pct ? 1 : 0)) > 0);
      if (purchaseResult.payment_status === "success") {
        logEvent("tengu_extra_usage_inline_dialog_buy_result", {
          status: lit_2("success"),
          ...getOfferAnalytics(offer),
        });
        if (offer !== null)
          markOfferRedeemed({
            usedOffer,
          });
        setStep({
          s: "buy_success",
          credit,
        });
      } else if (purchaseResult.payment_status === "pending_invoice" && purchaseResult.purchase_id)
        setStep({
          s: "buy_polling",
          purchaseId: purchaseResult.purchase_id,
          credit,
          usedOffer,
        });
      else if (purchaseResult.payment_status === "requires_action") {
        logEvent("tengu_extra_usage_inline_dialog_buy_result", {
          status: lit_2("3ds_fallback"),
          ...getOfferAnalytics(offer),
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
      let verificationMsg = verificationErrorMessage(error);
      if (
        isExpectedApiError(
          error,
          (apiError) => verificationErrorMessage(apiError) !== null || isOfferDriftError(apiError),
        )
      )
        logForDebugging(`Extra usage credit purchase failed: ${verificationMsg ?? errorMessage(error)}`, {
          level: "error",
        });
      else logError(error);
      logEvent("tengu_extra_usage_inline_dialog_buy_result", {
        status: lit_2("failed"),
        ...getOfferAnalytics(offer),
        drift: isOfferDriftError(error),
      });
      setStep({
        s: "error",
        msg: isOfferDriftError(error)
          ? "Prices changed while this was open, so nothing was charged. Run /usage-credits again to see the current prices."
          : verificationMsg
            ? `Purchase failed: ${verificationMsg}`
            : "Purchase failed",
      });
    }
  }
  async function updateSpendLimit(newLimitCents, oldLimitCents) {
    logEvent("tengu_extra_usage_inline_dialog_adjust_limit", {
      old_cents: oldLimitCents ?? undefined,
      new_cents: newLimitCents ?? undefined,
      unlimited: newLimitCents === null,
      currency: localeOrNonconforming(currency),
    });
    setStep({
      s: "adjusting",
    });
    let updateResult = await updateOverageSpendLimit(newLimitCents, currency, credentials);
    if (!updateResult.ok) {
      setStep({
        s: "error",
        msg: updateResult.reason
          ? `Failed to update spend limit: ${updateResult.reason}`
          : "Failed to update spend limit",
      });
      return;
    }
    onDone(
      newLimitCents === null
        ? "Monthly limit set to unlimited"
        : `Monthly limit updated to ${formatCurrency(newLimitCents, currency, "fit")}`,
    );
  }
  let creditsValidityNote = getCreditsValidityNote(expiryMonths);
  let expiryMonths_2 = creditsValidityNote !== null ? expiryMonths : null;
  if (isGuardActive)
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
        onDone: handleEnableDone,
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
            onDone: (autoReloadResult) => handleAutoReloadDone(autoReloadResult, true),
          })
        : jsxProd_default(AwaitWork, {
            message: "Turning off auto-reload\u2026",
            work: step.work,
            failure: {
              ok: false,
              reason: null,
            },
            onDone: (autoReloadOffResult) => handleAutoReloadDone(autoReloadOffResult, false),
          });
    case "buy_purchasing":
      return jsxProd_default(ClawdLoadingRow, {
        message: "Processing payment\u2026 (may take a few seconds)",
      });
    case "buy_success": {
      let successMessage = `Added ${formatCurrency(step.credit, currency)} of usage credits`;
      return jsxProd_default(ClawdSuccessRow, {
        message: successMessage,
        onDone: () => {
          if (onPurchaseSuccess) return onPurchaseSuccess(successMessage);
          applyEffortOverride(storageV5);
          return onDone(successMessage);
        },
      });
    }
    case "buy_polling":
      return jsxProd_default(PurchasePoller, {
        purchaseId: step.purchaseId,
        onSuccess: () => {
          if (offer !== null)
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
        onConfirm: confirmEnable,
        onCancel: () => cancelWithReason("not_enabled"),
      });
    case "enabled":
      return jsxProd_default(UsageCreditsOverview, {
        step,
        currency,
        onAction: (overviewAction) => handleAction(overviewAction, step),
        onCancel: () => cancelWithReason("enabled"),
      });
    case "buy_select":
      return jsxProd_default(CreditBundlePicker, {
        pm: step.pm,
        presets: bundles,
        offer,
        customPreviewable: usdRate !== null,
        currency,
        expiryNotice: creditsValidityNote,
        onConfirm: (selectedBundle) =>
          setStep({
            s: "buy_confirm",
            pm: step.pm,
            cents: selectedBundle.local_price_minor_units,
            bundle: selectedBundle,
          }),
        onCustom: () =>
          setStep({
            s: "buy_custom",
            pm: step.pm,
          }),
        onCancel: () => (initialStep === "buy_select" ? cancelWithReason("buy_select") : void loadStatus()),
      });
    case "buy_custom":
      return jsxProd_default(CustomAmountStep, {
        pm: step.pm,
        initialCents: step.cents,
        currency,
        offer,
        discountTiers,
        usdRate,
        capRemaining,
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
        capRemaining,
        offerKind: offer?.kind ?? null,
        currency,
        stripeProductId,
        expiryMonths: expiryMonths_2,
        onConfirm: () => confirmPurchase(step.cents, step.bundle, step.custom),
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
        onConfirm: (limitCents) => updateSpendLimit(limitCents, step.current),
        onCancel: () => void loadStatus(),
      });
    case "auto_reload_config":
      return jsxProd_default(AutoReloadStep, {
        current: step.current,
        pm: step.pm,
        currency,
        onSave: (thresholdCents, reloadToCents) => saveAutoReload(true, thresholdCents, reloadToCents),
        onTurnOff: () => saveAutoReload(false),
        onCancel: () => void loadStatus(),
      });
    case "error":
      return jsxProd_default(UsageCreditsErrorDialog, {
        msg: step.msg,
        onClose: () => cancelWithReason("error"),
      });
  }
}
//@ chunk-18hwfzwa.js:1143182-1143814 placement
/**
 * 额度错误对话框：显示错误并提示回车打开用量设置页。
 */
function UsageCreditsErrorDialog(props) {
  let $ = useMemoCache(9);
  let { msg, onClose } = props;
  let keybindingHandlers;
  if ($[0] !== onClose) {
    keybindingHandlers = {
      "confirm:yes": () => {
        openValidatedUrlSucceeded(USAGE_SETTINGS_LINK);
        onClose();
      },
    };
    $[0] = onClose;
    $[1] = keybindingHandlers;
  } else keybindingHandlers = $[1];
  let confirmationKeybindingOptions;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    confirmationKeybindingOptions = {
      context: "Confirmation",
    };
    $[2] = confirmationKeybindingOptions;
  } else confirmationKeybindingOptions = $[2];
  MessageActionsKeybindings(keybindingHandlers, confirmationKeybindingOptions);
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
  let dialogElement;
  if ($[6] !== onClose || $[7] !== children) {
    dialogElement = jsxProd_default(Dialog, {
      title: "Usage credits",
      onCancel: onClose,
      color: "error",
      inputGuide,
      children,
    });
    $[6] = onClose;
    $[7] = children;
    $[8] = dialogElement;
  } else dialogElement = $[8];
  return dialogElement;
}
//@ chunk-18hwfzwa.js:1143814-1143887 placement
function formatCardOnFile(paymentMethod) {
  return `${paymentMethod.brand ?? paymentMethod.type} \xB7\xB7\xB7\xB7${paymentMethod.last4 ?? ""}`;
}
//@ chunk-18hwfzwa.js:1143887-1146495 placement
function TurnOnUsageCreditsStep(props) {
  let $ = useMemoCache(64);
  let { pm, onConfirm, onCancel } = props;
  let inputRefusalWindow = useInputRefusalWindow();
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let isInputRefused;
  if ($[0] !== inputRefusalWindow || $[1] !== noteRefused || $[2] !== refusedWithin) {
    isInputRefused = function isInputRefused_() {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[0] = inputRefusalWindow;
    $[1] = noteRefused;
    $[2] = refusedWithin;
    $[3] = isInputRefused;
  } else isInputRefused = $[3];
  let refuseInput = isInputRefused;
  let mountTime = useMountTime();
  let remount = settleKey(epoch);
  let hasAnsweredRef = useRef(false);
  let ConfirmSelectComponent;
  let BoxComponent;
  let DialogComponent;
  let onCancel_2;
  let flexDirection;
  let gap;
  let pitchElement;
  let cardElement;
  let termsElement;
  let title;
  let onCancel_3;
  let color;
  let remountKey;
  let refuseInput_2;
  let openedAt;
  let hideIndexes;
  let confirmLabel;
  let cancelLabel;
  let focus;
  let onConfirm_2;
  if (
    $[4] !== inputRefusalWindow ||
    $[5] !== remount.remountKey ||
    $[6] !== noteRefused ||
    $[7] !== onCancel ||
    $[8] !== onConfirm ||
    $[9] !== pm ||
    $[10] !== refuseInput ||
    $[11] !== refusedWithin ||
    $[12] !== mountTime
  ) {
    let answerOnce = function answerOnce_(callback) {
      return () => {
        if (hasAnsweredRef.current) {
          return;
        }
        if (inputRefusalWindow() || refusedWithin()) {
          noteRefused();
          return;
        }
        hasAnsweredRef.current = true;
        callback();
      };
    };
    DialogComponent = Dialog;
    title = "Turn on usage credits";
    onCancel_3 = answerOnce(onCancel);
    color = "suggestion";
    BoxComponent = Box;
    flexDirection = "column";
    gap = 1;
    if ($[33] === MEMO_CACHE_SENTINEL) {
      pitchElement = jsxProd_default(Text, {
        children: "Keep using Claude when you hit a limit.",
      });
      $[33] = pitchElement;
    } else pitchElement = $[33];
    let children;
    if ($[34] !== pm) {
      children = pm
        ? `Card on file: ${formatCardOnFile(pm)}`
        : `No card on file \u2014 add one at ${USAGE_SETTINGS_LINK} before buying.`;
      $[34] = pm;
      $[35] = children;
    } else children = $[35];
    if ($[36] !== children) {
      cardElement = jsxProd_default(Text, {
        dimColor: true,
        children,
      });
      $[36] = children;
      $[37] = cardElement;
    } else cardElement = $[37];
    if ($[38] === MEMO_CACHE_SENTINEL) {
      termsElement = jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "By turning on, you agree to turn on usage credits as defined in our Help Center article:",
          `
`,
          EXTRA_USAGE_HELP_URL,
        ],
      });
      $[38] = termsElement;
    } else termsElement = $[38];
    ConfirmSelectComponent = ConfirmSelect;
    remountKey = remount.remountKey;
    refuseInput_2 = refuseInput;
    openedAt = mountTime;
    hideIndexes = true;
    confirmLabel = "Turn on";
    cancelLabel = "Cancel";
    focus = "cancel";
    onConfirm_2 = answerOnce(onConfirm);
    onCancel_2 = answerOnce(onCancel);
    $[4] = inputRefusalWindow;
    $[5] = remount.remountKey;
    $[6] = noteRefused;
    $[7] = onCancel;
    $[8] = onConfirm;
    $[9] = pm;
    $[10] = refuseInput;
    $[11] = refusedWithin;
    $[12] = mountTime;
    $[13] = ConfirmSelectComponent;
    $[14] = BoxComponent;
    $[15] = DialogComponent;
    $[16] = onCancel_2;
    $[17] = flexDirection;
    $[18] = gap;
    $[19] = pitchElement;
    $[20] = cardElement;
    $[21] = termsElement;
    $[22] = title;
    $[23] = onCancel_3;
    $[24] = color;
    $[25] = remountKey;
    $[26] = refuseInput_2;
    $[27] = openedAt;
    $[28] = hideIndexes;
    $[29] = confirmLabel;
    $[30] = cancelLabel;
    $[31] = focus;
    $[32] = onConfirm_2;
  } else {
    ConfirmSelectComponent = $[13];
    BoxComponent = $[14];
    DialogComponent = $[15];
    onCancel_2 = $[16];
    flexDirection = $[17];
    gap = $[18];
    pitchElement = $[19];
    cardElement = $[20];
    termsElement = $[21];
    title = $[22];
    onCancel_3 = $[23];
    color = $[24];
    remountKey = $[25];
    refuseInput_2 = $[26];
    openedAt = $[27];
    hideIndexes = $[28];
    confirmLabel = $[29];
    cancelLabel = $[30];
    focus = $[31];
    onConfirm_2 = $[32];
  }
  let selectElement;
  if (
    $[39] !== ConfirmSelectComponent ||
    $[40] !== onCancel_2 ||
    $[41] !== remountKey ||
    $[42] !== refuseInput_2 ||
    $[43] !== openedAt ||
    $[44] !== hideIndexes ||
    $[45] !== confirmLabel ||
    $[46] !== cancelLabel ||
    $[47] !== focus ||
    $[48] !== onConfirm_2
  ) {
    selectElement = jsxProd_default(
      ConfirmSelectComponent,
      {
        refuseInput: refuseInput_2,
        openedAt,
        hideIndexes,
        confirmLabel,
        cancelLabel,
        focus,
        onConfirm: onConfirm_2,
        onCancel: onCancel_2,
      },
      remountKey,
    );
    $[39] = ConfirmSelectComponent;
    $[40] = onCancel_2;
    $[41] = remountKey;
    $[42] = refuseInput_2;
    $[43] = openedAt;
    $[44] = hideIndexes;
    $[45] = confirmLabel;
    $[46] = cancelLabel;
    $[47] = focus;
    $[48] = onConfirm_2;
    $[49] = selectElement;
  } else selectElement = $[49];
  let children;
  if (
    $[50] !== BoxComponent ||
    $[51] !== flexDirection ||
    $[52] !== gap ||
    $[53] !== pitchElement ||
    $[54] !== cardElement ||
    $[55] !== termsElement ||
    $[56] !== selectElement
  ) {
    children = jsxProd_default_2(BoxComponent, {
      flexDirection,
      gap,
      children: [pitchElement, cardElement, termsElement, selectElement],
    });
    $[50] = BoxComponent;
    $[51] = flexDirection;
    $[52] = gap;
    $[53] = pitchElement;
    $[54] = cardElement;
    $[55] = termsElement;
    $[56] = selectElement;
    $[57] = children;
  } else children = $[57];
  let dialogElement;
  if (
    $[58] !== DialogComponent ||
    $[59] !== title ||
    $[60] !== onCancel_3 ||
    $[61] !== color ||
    $[62] !== children
  ) {
    dialogElement = jsxProd_default(DialogComponent, {
      title,
      onCancel: onCancel_3,
      color,
      children,
    });
    $[58] = DialogComponent;
    $[59] = title;
    $[60] = onCancel_3;
    $[61] = color;
    $[62] = children;
    $[63] = dialogElement;
  } else dialogElement = $[63];
  return dialogElement;
}
//@ chunk-18hwfzwa.js:1146495-1146536 placement
function sanitizeUserText(name) {
  return replaceControlChars(stripVTControlCharacters(name)).trim();
}
export { sanitizeUserText, formatCardOnFile, ExtraUsageDialogEntry };
