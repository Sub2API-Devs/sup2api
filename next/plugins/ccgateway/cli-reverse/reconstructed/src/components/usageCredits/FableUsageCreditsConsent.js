/**
 * components/usageCredits/FableUsageCreditsConsent.tsx
 *
 * 2.1.316 新增。Fable 模型使用额度同意。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { firstWord as firstWord_2 } from "../../utils/model/thirdPartyModelDefaults.js";
import { useNotifyDialogClaimed } from "../permissions/PermissionRequestTitle.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useMemo, useState, useRef, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { withQuotaResumeFire } from "../../services/quotaAutoResume/quotaAutoResume.js";
import { useInputClock } from "../../ink/components/Input.js";
import { useRefusableAnswer } from "../../hooks/useRefusableAnswer.js";
import { useRecentInputStamp, isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
import { useRecentInputWithin, useRefusalTracker, settleKey } from "../CustomSelect/selectTypeahead.js";
import { fetchPrepaidBalance, DEFAULT_MONTHLY_SPEND_LIMIT } from "../../services/api/billing.js";
import { checkExtraUsageStatus, enableOverageForConsent } from "../../services/api/overageConsent.js";
import {
  hasExtraUsageProvisioned,
  saveModelConsent,
  isUsageCreditsModelBilled,
  saffronLadderOn,
  isConsumerPlan,
} from "../../utils/planTiers.js";
import { runExtraUsage, canPurchaseExtraUsage } from "../../commands/extra-usage/extra-usage-core.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { resolveWhenTaken, AdminRequestConfirmDialog } from "./AdminRequestDialog.js";
import { isExtraUsageAllowed } from "../../utils/auth.js";
import {
  USAGE_CREDITS_NONINTERACTIVE_HINT,
  ADMIN_REQUEST_TIMEOUT_MS,
} from "../../services/api/adminRequests.js";
import { getUsageCreditsOnlyModelConsentDeclineFallback } from "../../utils/model/modelFallback.js";
import { renderModelName } from "../../utils/model/modelDisplay.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Dialog } from "../design-system/Dialog.js";
import { WorkerBadge } from "../permissions/WorkerBadge.js";
import { formatCurrency } from "../../services/api/referral.js";
import { Box, Text } from "../../ink/components/Text.js";
import { EXTRA_USAGE_HELP_URL } from "../../services/claudeAiLimits.js";
import { LearnMoreLink } from "../LearnMoreLink.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../CustomSelect/select.js";
import { ExtraUsageDialogEntry } from "./ExtraUsageDialog.js";
import { AwaitWork } from "./BuyCreditsFlow.js";
import { sleep } from "../../utils/sleep.js";

//@ chunk-czq1j3j2.js:1215272-1215353 placement
var CREDITS_CONSENT_TEXT = "By continuing, you agree to turn on usage credits per our Help Center:";
//@ chunk-czq1j3j2.js:1215353-1222160 placement
/**
 * FableUsageCreditsConsent：使用 Fable 模型会消耗用量额度时的同意界面。
 */
function FableUsageCreditsConsent(props) {
  let { variant, modelName = "Fable", model, onDone, startAtChooseForTesting } = props;
  let modelFirstName = firstWord_2(modelName);
  let wouldTakeAnswer = () => props.variant !== "mid-session" || props.wouldTakeAnswer();
  let notifyDialogClaimed = useNotifyDialogClaimed();
  let { storageV5, credentials } = useTheme_2();
  let finishWithAnswer = useMemo(() => withQuotaResumeFire(onDone), [onDone]);
  let [consentState, setConsentState] = useState(
    startAtChooseForTesting
      ? {
          s: "choose",
          blocked: false,
          liveDefinite: true,
          ...startAtChooseForTesting,
        }
      : {
          s: "loading",
        },
  );
  let inputClock = useInputClock();
  let [stepName, setStepName] = useState(consentState.s);
  let [stepStartedAt, setStepStartedAt] = useState(0);
  let refusableAnswer = useRefusableAnswer(() => wouldTakeAnswer());
  if (stepName !== consentState.s) {
    setStepName(consentState.s);
    setStepStartedAt(Date.now());
  }
  let withinStepGuard = useRecentInputStamp(stepStartedAt);
  let isRecentInput = useRecentInputWithin();
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let hasReenabledRef = useRef(false);
  let remount = settleKey(`${stepStartedAt}:${epoch}`);
  function isInputRefusedNow() {
    return (
      (stepStartedAt !== 0 && isWithinRecentInput(inputClock, withinStepGuard(stepStartedAt))) ||
      refusedWithin()
    );
  }
  function refuseInput() {
    if (isRecentInput() || isInputRefusedNow()) {
      noteRefused();
      return true;
    }
    return false;
  }
  let balancePromiseRef = useRef(null);
  let externalBuyPromiseRef = useRef(null);
  let grantLineRef = useRef(null);
  let hasFinishedRef = useRef(false);
  let hasRunExternalBuyRef = useRef(false);
  useEffect(() => {
    if (consentState.s === "loading") {
      let isCancelled = false;
      balancePromiseRef.current ??= Promise.all([
        fetchPrepaidBalance(credentials).catch(() => null),
        checkExtraUsageStatus(credentials, storageV5).catch(() => "unknown"),
      ]).then(([balance, extraUsageStatus]) => ({
        balance,
        overagesEnabled:
          extraUsageStatus === "enabled" ||
          extraUsageStatus === "blocked" ||
          (extraUsageStatus === "unknown" && hasExtraUsageProvisioned()),
        blocked: extraUsageStatus === "blocked",
        liveDefinite: extraUsageStatus !== "unknown",
      }));
      balancePromiseRef.current.then((loadedState) => {
        if (isCancelled) return;
        setConsentState({
          s: "choose",
          ...loadedState,
        });
      });
      return () => {
        isCancelled = true;
      };
    }
    if (consentState.s === "buy-external") {
      let isCancelled = false;
      externalBuyPromiseRef.current ??= runExtraUsage(
        {
          openInBrowser: true,
        },
        credentials,
      );
      externalBuyPromiseRef.current.then((externalResult) => {
        if (isCancelled || hasRunExternalBuyRef.current) return;
        hasRunExternalBuyRef.current = true;
        if (externalResult.type === "confirm-admin-request") {
          if (isBgSession()) {
            logFeatureSad("model_fable_consent", "overage_enable_deferred");
            resolveWhenTaken(() =>
              finishWithAnswer(
                "dismiss",
                isExtraUsageAllowed()
                  ? USAGE_CREDITS_NONINTERACTIVE_HINT
                  : "Contact your admin to manage usage credit settings.",
              ),
            );
            return;
          }
          setConsentState({
            s: "confirm-admin-request",
            extraUsage: externalResult.extraUsage,
            needsSetup: consentState.needsSetup,
          });
          return;
        }
        logFeatureSad("model_fable_consent", "overage_enable_deferred");
        resolveWhenTaken(() =>
          finishWithAnswer(
            "dismiss",
            externalResult.type === "message"
              ? externalResult.value
              : externalResult.opened
                ? `Opened ${externalResult.url} in your browser to ${consentState.needsSetup ? "turn on" : "manage"} usage credits. Once ${consentState.needsSetup ? "enabled" : "topped up"}, run /model to switch to ${modelName}.`
                : `Visit ${externalResult.url} to ${consentState.needsSetup ? "turn on" : "manage"} usage credits. Once ${consentState.needsSetup ? "enabled" : "topped up"}, run /model to switch to ${modelName}.`,
          ),
        );
      });
      return () => {
        isCancelled = true;
      };
    }
  }, [consentState.s, finishWithAnswer, credentials, storageV5]);
  function onContinue() {
    if (finishWithAnswer("consent") === false) return;
    saveModelConsent(modelFirstName, storageV5);
    logFeatureOk("model_fable_consent");
  }
  function startPurchase(needsSetup, liveDefinite) {
    if (!wouldTakeAnswer()) return;
    notifyDialogClaimed();
    if (canPurchaseExtraUsage())
      setConsentState({
        s: "buy",
        needsSetup,
        skipLiveCheck: needsSetup && liveDefinite,
      });
    else
      setConsentState({
        s: "buy-external",
        needsSetup,
      });
  }
  function onReenable() {
    if (!wouldTakeAnswer()) return;
    if (hasReenabledRef.current) return;
    hasReenabledRef.current = true;
    notifyDialogClaimed();
    setConsentState({
      s: "reenabling",
      work: enableOverageForConsent({
        credentials,
        storageV5,
      }),
    });
  }
  function onSwitch() {
    if (finishWithAnswer("switch") === false) return;
    logFeatureBad("model_fable_consent", "declined");
  }
  function onUpsell() {
    if (finishWithAnswer("upgrade") === false) return;
    logFeatureSad("model_fable_consent", "upsell_selected");
  }
  function onDismiss() {
    if (isRecentInput() || isInputRefusedNow()) {
      noteRefused();
      return;
    }
    if (finishWithAnswer("dismiss") === false) return;
    logFeatureSad("model_fable_consent", "dismissed");
  }
  let declineFallbackModel = getUsageCreditsOnlyModelConsentDeclineFallback();
  let label =
    variant === "mid-session" && declineFallbackModel !== null
      ? `Switch to ${renderModelName(declineFallbackModel)} and continue`
      : variant === "mid-session"
        ? "Not now"
        : "No, keep my current model";
  let [isBilledModel] = useState(() => isUsageCreditsModelBilled(model));
  let isLimitReached = modelFirstName === "Fable" && variant === "mid-session" && !isBilledModel;
  let [showUpsell] = useState(
    () =>
      modelFirstName === "Fable" &&
      (variant === "picker" || !isBgSession()) &&
      isBilledModel &&
      saffronLadderOn(),
  );
  let title =
    variant === "picker"
      ? `Switch to ${modelName}?`
      : isLimitReached
        ? "You've reached your Fable limit"
        : `${modelName} now uses usage credits`;
  switch (consentState.s) {
    case "loading":
      return jsxProd_default(Dialog, {
        title,
        color: "warning",
        onCancel: onDismiss,
        children: jsxProd_default(WorkerBadge, {
          message: "Checking usage credits\u2026",
        }),
      });
    case "choose": {
      let { balance, overagesEnabled, blocked, liveDefinite } = consentState;
      let amount = balance?.amount ?? 0;
      let currency = balance?.currency ?? "USD";
      let overagesOff = !overagesEnabled;
      let hasCreditsToReenable = overagesOff && amount > 0;
      let creditBalanceUnknown = overagesEnabled && balance === null;
      let hasCreditBalance = overagesEnabled && amount > 0;
      let canContinue = !blocked && (hasCreditBalance || creditBalanceUnknown);
      let canPurchase = canPurchaseExtraUsage();
      let manageLabel = isConsumerPlan()
        ? overagesOff
          ? "Set up usage credits on claude.ai"
          : "Manage usage credits on claude.ai"
        : overagesOff
          ? "Request usage credits from your admin"
          : "Request more from your admin";
      let leadSentence = isLimitReached
        ? `You've used your included Fable usage for this week. Continuing on ${modelName} uses usage credits`
        : `${modelName} runs on usage credits`;
      let balanceSentence =
        (overagesOff && !hasCreditsToReenable) || creditBalanceUnknown
          ? `${leadSentence}, purchased separately from your plan.`
          : `${leadSentence} \u2014 you have ${formatCurrency(hasCreditBalance || hasCreditsToReenable ? amount : 0, currency)} in credits.`;
      let label_2 = canContinue
        ? `Continue with ${modelName}`
        : hasCreditsToReenable && canPurchase
          ? "Yes, re-enable and continue"
          : canPurchase
            ? overagesOff
              ? "Yes, buy usage credits"
              : "Buy usage credits"
            : manageLabel;
      let upsellOption = showUpsell
        ? {
            label: "Upgrade to Max",
            value: "upsell",
          }
        : null;
      let placeholderA = false;
      let placeholderB = false;
      let defaultLimitLabel = formatCurrency(DEFAULT_MONTHLY_SPEND_LIMIT, "USD", "whole");
      return jsxProd_default(Dialog, {
        title,
        color: "warning",
        onCancel: onDismiss,
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          marginBottom: 1,
          children: [
            jsxProd_default_2(Text, {
              children: [balanceSentence, ""],
            }),
            hasCreditsToReenable
              ? jsxProd_default_2(Text, {
                  dimColor: true,
                  children: ["Usage credits are turned off. Re-enable to use ", modelName, "."],
                })
              : overagesOff
                ? jsxProd_default_2(Fragment, {
                    children: [
                      jsxProd_default(Text, {
                        dimColor: true,
                        children: "You don't have usage credits yet.",
                      }),
                      canPurchase &&
                        jsxProd_default_2(Fragment, {
                          children: [
                            jsxProd_default_2(Text, {
                              dimColor: true,
                              children: [
                                "Starts with a ",
                                defaultLimitLabel,
                                " monthly limit \xB7 run /usage-credits to adjust",
                              ],
                            }),
                            jsxProd_default_2(Text, {
                              dimColor: true,
                              children: [CREDITS_CONSENT_TEXT, " ", EXTRA_USAGE_HELP_URL],
                            }),
                          ],
                        }),
                    ],
                  })
                : jsxProd_default(LearnMoreLink, {
                    url: EXTRA_USAGE_HELP_URL,
                  }),
            jsxProd_default(
              ModelSelector,
              {
                options: [
                  {
                    label,
                    value: "switch",
                  },
                  {
                    label: label_2,
                    value: "confirm",
                  },
                  ...(upsellOption ? [upsellOption] : []),
                ],
                selectedValue: NO_COMMITTED_ROW,
                refuseInput,
                hideIndexes: true,
                defaultFocusValue: "switch",
                onChange: (value) => {
                  if (isInputRefusedNow()) {
                    refusableAnswer.refuse(value);
                    noteRefused();
                    return;
                  }
                  if (!refusableAnswer.answer(value)) return;
                  if (value === "switch") return onSwitch();
                  if (value === "upsell") return showUpsell ? onUpsell() : undefined;
                  if (canContinue) return onContinue();
                  if (hasCreditsToReenable && canPurchase) return onReenable();
                  return startPurchase(overagesOff && !hasCreditsToReenable, liveDefinite);
                },
                onCancel: onDismiss,
              },
              `${refusableAnswer.attempts}-${remount.remountKey}`,
            ),
          ],
        }),
      });
    }
    case "buy":
      return jsxProd_default(ExtraUsageDialogEntry, {
        initialStep: "buy_select",
        entryReason: "fable",
        onBeforePurchase: consentState.needsSetup
          ? () =>
              enableOverageForConsent({
                skipLiveCheck: consentState.skipLiveCheck,
                credentials,
                storageV5,
              })
          : undefined,
        onPurchaseSuccess: (mesage) => {
          saveModelConsent(modelFirstName, storageV5);
          logFeatureOk("model_fable_consent");
          resolveWhenTaken(() => finishWithAnswer("consent", mesage));
        },
        onDone: (result) => {
          if (typeof result === "string") {
            logFeatureSad("model_fable_consent", "buy_fallback");
            resolveWhenTaken(() => finishWithAnswer("dismiss", result));
            return;
          }
          balancePromiseRef.current = null;
          setConsentState({
            s: "loading",
          });
        },
      });
    case "reenabling":
      return jsxProd_default(Dialog, {
        title,
        color: "warning",
        onCancel: onDismiss,
        children: jsxProd_default(AwaitWork, {
          message: "Turning on usage credits\u2026",
          work: consentState.work,
          failure: false,
          onDone: (enabled) => {
            if (enabled) {
              saveModelConsent(modelFirstName, storageV5);
              logFeatureOk("model_fable_consent");
              resolveWhenTaken(() => finishWithAnswer("consent"));
            } else {
              logFeatureSad("model_fable_consent", "reenable_failed");
              resolveWhenTaken(() =>
                finishWithAnswer(
                  "dismiss",
                  "Couldn't turn on usage credits. Run /usage-credits to try again.",
                ),
              );
            }
          },
        }),
      });
    case "granted":
      return jsxProd_default(Dialog, {
        title,
        color: "warning",
        onCancel: () => {
          if (isRecentInput() || isInputRefusedNow()) {
            noteRefused();
            return;
          }
          if (hasFinishedRef.current) return;
          if (
            finishWithAnswer("dismiss", usageCreditsBlockedText(consentState.line, "unknown", modelName)) ===
            false
          )
            return;
          hasFinishedRef.current = true;
          logFeatureSad("model_fable_consent", "dismissed");
        },
        children: jsxProd_default(Box, {
          paddingTop: 1,
          children: jsxProd_default(WorkerBadge, {
            message: `${consentState.line} Checking usage credits\u2026`,
          }),
        }),
      });
    case "buy-external":
      return jsxProd_default(Dialog, {
        title,
        color: "warning",
        onCancel: onDismiss,
        children: jsxProd_default(WorkerBadge, {
          message: consentState.needsSetup ? "Setting up usage credits\u2026" : "Opening usage credits\u2026",
        }),
      });
    case "confirm-admin-request":
      return jsxProd_default(AdminRequestConfirmDialog, {
        extraUsage: consentState.extraUsage,
        wouldTakeAnswer,
        onDone: (message) => {
          let grantLine = grantLineRef.current;
          if (grantLine === null) return finishWithAnswer("dismiss", message);
          notifyDialogClaimed();
          setConsentState({
            s: "granted",
            line: grantLine,
          });
          sleep(ADMIN_REQUEST_TIMEOUT_MS)
            .then(() => checkExtraUsageStatus(credentials, storageV5))
            .catch(() => "unknown")
            .then((status) => {
              if (hasFinishedRef.current) return;
              hasFinishedRef.current = true;
              if (status === "enabled") {
                saveModelConsent(modelFirstName, storageV5);
                logFeatureOk("model_fable_consent");
                resolveWhenTaken(() => finishWithAnswer("consent", grantLine));
                return;
              }
              logFeatureSad(
                "model_fable_consent",
                status === "disabled"
                  ? "overage_enable_deferred"
                  : status === "blocked"
                    ? "credits_blocked"
                    : "credits_unconfirmed",
              );
              resolveWhenTaken(() =>
                finishWithAnswer("dismiss", usageCreditsBlockedText(grantLine, status, modelName)),
              );
            });
          return true;
        },
        onOutcome: (outcome) => {
          switch (outcome.outcome) {
            case "granted":
              grantLineRef.current = outcome.grantLine;
              return;
            case "filed":
              logFeatureSad("model_fable_consent", "overage_enable_deferred");
              return;
            case "failed":
              logFeatureBad("model_fable_consent", "admin_request_failed");
              return;
            case "cancelled":
              logFeatureSad("model_fable_consent", "dismissed");
              return;
          }
        },
      });
  }
}
//@ chunk-czq1j3j2.js:1222160-1222555 placement
function usageCreditsBlockedText(prefixText, status, modelName) {
  switch (status) {
    case "disabled":
      return `${prefixText} Usage credits aren't on for your organization yet. Ask your admin to turn them on, then run /model to switch to ${modelName}.`;
    case "blocked":
      return `${prefixText} Your organization's usage credits are capped or used up right now. Run /model to switch to ${modelName} once they're available.`;
    case "enabled":
    case "unknown":
      return `${prefixText} Run /model to switch to ${modelName}.`;
  }
}
export { FableUsageCreditsConsent };
