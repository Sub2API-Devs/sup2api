/**
 * commands/rate-limit-options/rate-limit-options.tsx
 *
 * /rate-limit-options 实现：升级、用量额度、自动恢复、等待等选项
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/rate-limit-options/rate-limit-options.tsx
 * pieces: chunk-dg94x42s.js (22)
 * attribution: sole-consumer 17, affinity 1, fingerprint 1, layout 2, callgraph-fingerprint 1
 */
import {
  init_react_production,
  useState,
  useEffect,
  useSyncExternalStore,
  useRef,
  useLayoutEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme, useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import {
  useRateLimitState,
  useResetReached,
  useQuotaAutoResumeState,
  TENGU_PEWTER_SUMMIT,
  isAutoResumeOfferEnabled,
  LIMIT_CATEGORIES,
  getRateLimitEventProps,
} from "../../components/rateLimit/quotaAutoResume.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getSubscriptionType, getRateLimitTier, getOauthAccountInfo } from "../../utils/auth.js";
import { canShowUpgradeCommand, isConsumerPlan } from "../../utils/planTiers.js";
import { getLspManager } from "../../services/lsp/manager.js";
import { fetchUtilization } from "../../services/api/usage.js";
import { formatResetTime } from "../../utils/format.js";
import { formatCurrency } from "../../services/api/referral.js";
import { logEvent } from "../../services/analytics/index.js";
import { updateOverageSpendLimit, fetchPrepaidBalance } from "../../services/api/billing.js";
import { markOverageAllowed, fileAdminLimitRequest } from "../../services/api/adminRequests.js";
import { color } from "../../components/design-system/color.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { FocusColumn } from "../../components/design-system/FocusColumn.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { emitStatusChange } from "../../services/claudeAiLimits.js";
import {
  resetOfferLabel,
  subscribeResetChanges,
  getResetFlowPhase,
  availableResetOffers,
  isClaimingReset,
  canArmLowPriorityReset,
  resetsUsedUpLine,
  reportResetOfferShown,
  refreshResetStatusForDialog,
  startResetFlowSafe,
  RESET_STATUS_MESSAGES,
  CHECKING_FOR_RESET_LINE,
} from "../../services/rateLimit/rateLimitWall.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { array, tuple, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  isPhaseActive,
  armQuotaAutoResumeFromDialog,
  withQuotaResumeFire,
  cancelQuotaAutoResume,
  hasPendingContinuation,
  canAutoResumeThisLimit,
} from "../../services/quotaAutoResume/quotaAutoResume.js";
import {
  canOfferLowPriority,
  logLowPriorityShown,
  enableLowPriorityMode,
  lowPriorityUnavailableMessage,
  lowPriorityOnMessage,
} from "../../services/lowPriorityMode.js";
import {
  onUsageCreditStateChange,
  currentUsageCreditState,
  onCreditOfferPromptChange,
  getCreditOfferPhase,
  getOfferMenuSuffix,
  getCreditOfferForRateLimit,
  logCreditOfferShown,
  retryOfferPrompt,
} from "../../services/usageCreditOffers.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import {
  usageCreditsSpentLine,
  logLimitResetOfferShown,
  maybeOpenUsageCreditsDialog,
  checkUsageCredits,
} from "../../components/rateLimit/usageCreditsOffer.js";
import { usageCreditsCommand } from "../extra-usage/index.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { getUsageCreditsFlowConfig, call as call_2 } from "../usage-credits/usageCredits.js";
import { runExtraUsage } from "../extra-usage/extra-usage-core.js";
import { useInputClock } from "../../ink/components/Input.js";
import { useRefusalTracker } from "../../components/CustomSelect/selectTypeahead.js";
import { upgradeCommand } from "../upgrade/index.js";
import { getLimitResetCopy } from "../limit-reset/index.js";
import { statusLineShouldDisplay } from "../../components/StatusLine.js";
import { isWithinRecentInput, RECENT_INPUT_GUARD_MS } from "../../hooks/useRecentInputGuard.js";
import { isFrozenMarker } from "../../utils/frozenMarkers.js";
import { isAutoResumableLimit } from "../../services/api/errors.js";
import { ResetLimits, ResetLimitsOffers } from "./ResetLimits.js";
import { callUpgradeFromSurface } from "../upgrade/upgrade.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../components/CustomSelect/select.js";

//@ chunk-dg94x42s.js:18401-18405 sole-consumer
init_react_production();
//@ chunk-dg94x42s.js:18405-18409 sole-consumer
init_react_production();
//@ chunk-dg94x42s.js:18409-18449 sole-consumer
function decrementNonNegative(count) {
  return Math.max(0, count - 1);
}
//@ chunk-dg94x42s.js:18449-18491 sole-consumer
var RESET_TIME_BUCKET_MS = 500;
var RESET_TIME_MARGIN_MS = 1000;
var MAX_RESET_TIME_MS = 10000000000;
var DEFAULT_RESET_SECONDS = 4000;
//@ chunk-dg94x42s.js:18491-18589 sole-consumer
function isOrgLevelRejectionWithBalance(rateLimitInfo) {
  return (
    rateLimitInfo.overageDisabledReason === "org_level_disabled_until" && rateLimitInfo.balanceMinorUnits > 0
  );
}
//@ chunk-dg94x42s.js:18589-18758 sole-consumer
function stepCreditAmount(currentSeconds, direction, usedCredits = null) {
  let baseSeconds = currentSeconds ?? DEFAULT_RESET_SECONDS;
  let roundedBaseSeconds =
    direction === 1
      ? Math.floor(baseSeconds / RESET_TIME_BUCKET_MS + 1) * RESET_TIME_BUCKET_MS
      : Math.ceil(baseSeconds / RESET_TIME_BUCKET_MS - 1) * RESET_TIME_BUCKET_MS;
  let usedCreditsSeconds =
    usedCredits === null
      ? RESET_TIME_BUCKET_MS
      : direction === 1
        ? Math.ceil((usedCredits + RESET_TIME_MARGIN_MS) / RESET_TIME_BUCKET_MS) * RESET_TIME_BUCKET_MS
        : usedCredits;
  return Math.min(MAX_RESET_TIME_MS, Math.max(usedCreditsSeconds, roundedBaseSeconds));
}
//@ chunk-dg94x42s.js:18758-24302 sole-consumer
/**
 * 限流选项菜单：升级、额外用量、自动恢复、等待等。
 */
function RateLimitOptionsMenu(props) {
  let $ = useMemoCache(61);
  let { balance, onDone, context } = props;
  let [upgradeElement, setUpgradeElement] = useState(null);
  let [theme] = useTheme();
  let rateLimitState = useRateLimitState();
  let memoSubscriptionType;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    memoSubscriptionType = getSubscriptionType();
    $[0] = memoSubscriptionType;
  } else memoSubscriptionType = $[0];
  let subscriptionType = memoSubscriptionType;
  let canUpgrade;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    let isMax20xTier = subscriptionType === "max" && getRateLimitTier() === "default_claude_max_20x";
    canUpgrade = !isMax20xTier && canShowUpgradeCommand();
    $[1] = canUpgrade;
  } else canUpgrade = $[1];
  let showUpgradeOption = canUpgrade;
  let currency = balance.currency;
  let [savedLimitCents, setSavedLimitCents] = useState(undefined);
  let [draftLimitCents, setDraftLimitCents] = useState(undefined);
  let [isSaving, setIsSaving] = useState(false);
  let [selectedIndex, setSelectedIndex] = useState(0);
  let [statusMessage, setStatusMessage] = useState(null);
  let loadLimitEffect;
  let loadLimitDeps;
  if ($[2] !== context.credentials) {
    loadLimitEffect = () => {
      let lspManager = getLspManager();
      if (lspManager) {
        setSavedLimitCents(lspManager.spendLimitCents);
        setDraftLimitCents(lspManager.spendLimitCents);
        return;
      }
      let isCancelled = false;
      fetchUtilization(context.credentials)
        .then((utilization) => {
          if (isCancelled) {
            return;
          }
          let monthlyLimit = utilization?.extra_usage?.monthly_limit ?? null;
          let usedCredits = utilization?.extra_usage?.used_credits ?? 0;
          let initialLimitCents = monthlyLimit === null ? null : Math.max(monthlyLimit, usedCredits);
          setSavedLimitCents(initialLimitCents);
          setDraftLimitCents(initialLimitCents);
        })
        .catch(() => {
          if (isCancelled) {
            return;
          }
          setSavedLimitCents(null);
          setDraftLimitCents(null);
        });
      return () => {
        isCancelled = true;
      };
    };
    loadLimitDeps = [context.credentials];
    $[2] = context.credentials;
    $[3] = loadLimitEffect;
    $[4] = loadLimitDeps;
  } else {
    loadLimitEffect = $[3];
    loadLimitDeps = $[4];
  }
  useEffect(loadLimitEffect, loadLimitDeps);
  let computedResetLabel;
  Te: {
    if (rateLimitState.resetsAt) {
      let formattedResetTime;
      if ($[5] !== rateLimitState.resetsAt) {
        formattedResetTime = formatResetTime(rateLimitState.resetsAt, true);
        $[5] = rateLimitState.resetsAt;
        $[6] = formattedResetTime;
      } else formattedResetTime = $[6];
      computedResetLabel = formattedResetTime;
      break Te;
    }
    computedResetLabel = undefined;
  }
  let resetLabel = computedResetLabel;
  let hasDraftLimit = draftLimitCents !== undefined;
  let limitText;
  if ($[7] !== currency || $[8] !== hasDraftLimit || $[9] !== draftLimitCents) {
    limitText = !hasDraftLimit
      ? "\u2026"
      : draftLimitCents === null
        ? "Unlimited"
        : formatCurrency(draftLimitCents, currency, "fit");
    $[7] = currency;
    $[8] = hasDraftLimit;
    $[9] = draftLimitCents;
    $[10] = limitText;
  } else limitText = $[10];
  const label = `Adjust monthly spend limit: ${limitText}`;
  const hint =
    savedLimitCents === null
      ? "\u2190 or \u2192 to set a limit"
      : "\u2190 or \u2192 to adjust \xB7 Del to remove limit";
  let adjustItem;
  if ($[11] !== label || $[12] !== hint) {
    adjustItem = {
      id: "adjust",
      label,
      hint,
    };
    $[11] = label;
    $[12] = hint;
    $[13] = adjustItem;
  } else adjustItem = $[13];
  const hint_2 = resetLabel ? `Resets ${resetLabel}` : "";
  let waitItem;
  if ($[14] !== hint_2) {
    waitItem = {
      id: "wait",
      label: "Wait for limit to reset",
      hint: hint_2,
    };
    $[14] = hint_2;
    $[15] = waitItem;
  } else waitItem = $[15];
  let menuItemsDraft;
  if ($[16] !== waitItem || $[17] !== adjustItem) {
    menuItemsDraft = [adjustItem, waitItem];
    if (showUpgradeOption) {
      let maxPlanLabel = subscriptionType === "max" ? "Max 20x" : "Max";
      let upgradeItem;
      if ($[19] === MEMO_CACHE_SENTINEL) {
        upgradeItem = {
          id: "upgrade",
          label: `Upgrade to ${maxPlanLabel} for higher session limits every month`,
          hint: "",
        };
        $[19] = upgradeItem;
      } else upgradeItem = $[19];
      menuItemsDraft.push(upgradeItem);
    }
    $[16] = waitItem;
    $[17] = adjustItem;
    $[18] = menuItemsDraft;
  } else menuItemsDraft = $[18];
  let menuItems = menuItemsDraft;
  let handleCancel;
  if ($[20] !== context || $[21] !== onDone) {
    handleCancel = function cancelAction() {
      logEvent("tengu_spend_limit_nudge_cancel", {});
      context.prefillRateLimitAutoQueueContinue?.();
      onDone(undefined, {
        display: "skip",
      });
    };
    $[20] = context;
    $[21] = onDone;
    $[22] = handleCancel;
  } else handleCancel = $[22];
  let onCancel = handleCancel;
  let handleSave;
  if (
    $[23] !== context.credentials ||
    $[24] !== currency ||
    $[25] !== hasDraftLimit ||
    $[26] !== onDone ||
    $[27] !== draftLimitCents ||
    $[28] !== savedLimitCents ||
    $[29] !== isSaving ||
    $[30] !== theme
  ) {
    handleSave = async function saveLimitInternal() {
      if (!hasDraftLimit || isSaving) {
        return;
      }
      if (draftLimitCents === savedLimitCents) {
        setStatusMessage(
          savedLimitCents === null
            ? "Press \u2190 or \u2192 to set a limit."
            : "Press \u2192 to raise the limit, or Del to remove it.",
        );
        return;
      }
      setIsSaving(true);
      let nextLimitCents = draftLimitCents ?? null;
      let updateResult = await updateOverageSpendLimit(nextLimitCents, currency, context.credentials);
      if (!updateResult.ok) {
        setIsSaving(false);
        setStatusMessage(
          updateResult.reason
            ? `Could not update your spend limit: ${updateResult.reason}`
            : "Could not update your spend limit. Press Enter to retry.",
        );
        return;
      }
      let disabledUntilDate =
        updateResult.disabledUntil != null ? new Date(updateResult.disabledUntil) : null;
      let isStillBlocked =
        disabledUntilDate != null &&
        (Number.isNaN(disabledUntilDate.getTime()) || disabledUntilDate > new Date());
      logEvent("tengu_spend_limit_nudge_save", {
        removed: nextLimitCents === null,
        reblocked: isStillBlocked,
      });
      if (isStillBlocked) {
        setIsSaving(false);
        let usedCreditsValue =
          updateResult.usedCredits !== null
            ? Math.max(savedLimitCents ?? 0, updateResult.usedCredits)
            : savedLimitCents;
        setSavedLimitCents(usedCreditsValue ?? null);
        setDraftLimitCents((previousUsedCredits) =>
          usedCreditsValue !== null && usedCreditsValue !== undefined && previousUsedCredits !== null
            ? Math.max(previousUsedCredits ?? 0, usedCreditsValue)
            : previousUsedCredits,
        );
        setStatusMessage(
          updateResult.usedCredits !== null
            ? `You've already used ${formatCurrency(updateResult.usedCredits, currency, "fit")} this month \u2014 set your limit above that.`
            : "Your current spend is still over the new limit. Raise it higher or remove it.",
        );
        return;
      }
      setStatusMessage(null);
      markOverageAllowed();
      if (nextLimitCents === null) onDone(color("success", theme)("Removed monthly spend limit"));
      else
        onDone(
          color(
            "success",
            theme,
          )(`Increased monthly spend limit to ${formatCurrency(nextLimitCents, currency, "fit")}`),
        );
    };
    $[23] = context.credentials;
    $[24] = currency;
    $[25] = hasDraftLimit;
    $[26] = onDone;
    $[27] = draftLimitCents;
    $[28] = savedLimitCents;
    $[29] = isSaving;
    $[30] = theme;
    $[31] = handleSave;
  } else handleSave = $[31];
  let saveLimit = handleSave;
  let handleSelect;
  if ($[32] !== saveLimit || $[33] !== context || $[34] !== onDone) {
    handleSelect = function selectItem(itemId) {
      if (itemId === "adjust" || itemId === "upgrade") context.cancelRateLimitAutoQueueContinue?.();
      else if (itemId === "wait") context.prefillRateLimitAutoQueueContinue?.();
      if (itemId === "adjust") saveLimit();
      else if (itemId === "wait") {
        logEvent("tengu_spend_limit_nudge_wait", {});
        onDone(undefined, {
          display: "skip",
        });
      } else if (itemId === "upgrade") {
        logEvent("tengu_spend_limit_nudge_upgrade", {});
        import("../upgrade/upgrade.js")
          .then((upgradeModule) => {
            let { callUpgradeFromSurface } = upgradeModule;
            return callUpgradeFromSurface(onDone, context, "spend_limit_options_menu");
          })
          .then((upgradeElementResult) => {
            if (upgradeElementResult) setUpgradeElement(upgradeElementResult);
          });
      }
    };
    $[32] = saveLimit;
    $[33] = context;
    $[34] = onDone;
    $[35] = handleSelect;
  } else handleSelect = $[35];
  let selectMenuItem = handleSelect;
  let handleKeyDown;
  if (
    $[36] !== selectMenuItem ||
    $[37] !== hasDraftLimit ||
    $[38] !== menuItems ||
    $[39] !== selectedIndex ||
    $[40] !== savedLimitCents ||
    $[41] !== isSaving
  ) {
    handleKeyDown = function onKeyDown(event) {
      if (isSaving) {
        return;
      }
      if (event.key === "up") {
        event.preventDefault();
        setStatusMessage(null);
        setSelectedIndex(decrementNonNegative);
        return;
      }
      if (event.key === "down") {
        event.preventDefault();
        setStatusMessage(null);
        setSelectedIndex((previousIndex) => Math.min(menuItems.length - 1, previousIndex + 1));
        return;
      }
      if (event.key === "return") {
        event.preventDefault();
        let selectedItem = menuItems[selectedIndex];
        if (selectedItem) selectMenuItem(selectedItem.id);
        return;
      }
      if (menuItems[selectedIndex]?.id !== "adjust" || !hasDraftLimit) {
        return;
      }
      if (event.key === "left") {
        event.preventDefault();
        setStatusMessage(null);
        setDraftLimitCents((currentLimitCents) =>
          stepCreditAmount(currentLimitCents ?? null, -1, savedLimitCents ?? null),
        );
      } else if (event.key === "right") {
        event.preventDefault();
        setStatusMessage(null);
        setDraftLimitCents((currentLimitCents) =>
          stepCreditAmount(currentLimitCents ?? null, 1, savedLimitCents ?? null),
        );
      } else if (event.key === "delete" || event.key === "backspace") {
        event.preventDefault();
        setStatusMessage(null);
        setDraftLimitCents(null);
      }
    };
    $[36] = selectMenuItem;
    $[37] = hasDraftLimit;
    $[38] = menuItems;
    $[39] = selectedIndex;
    $[40] = savedLimitCents;
    $[41] = isSaving;
    $[42] = handleKeyDown;
  } else handleKeyDown = $[42];
  let onKeyDown = handleKeyDown;
  if (upgradeElement) {
    return upgradeElement;
  }
  let balanceText;
  if ($[43] !== balance.amount || $[44] !== currency) {
    balanceText = formatCurrency(balance.amount, currency);
    $[43] = balance.amount;
    $[44] = currency;
    $[45] = balanceText;
  } else balanceText = $[45];
  const titleEnd = `Usage credit balance: ${balanceText}`;
  const isCancelActive = !isSaving;
  let menuList;
  if ($[46] !== menuItems || $[47] !== selectedIndex) {
    menuList = jsxProd_default(Box, {
      flexDirection: "column",
      children: menuItems.map((menuItem, menuItemIndex) => {
        let isSelectedItem = menuItemIndex === selectedIndex;
        return jsxProd_default_2(
          Box,
          {
            justifyContent: "space-between",
            gap: 2,
            children: [
              jsxProd_default_2(Text, {
                color: isSelectedItem ? "suggestion" : undefined,
                children: [isSelectedItem ? figures_default.pointer : " ", " ", menuItem.label],
              }),
              menuItem.hint
                ? jsxProd_default(Text, {
                    dimColor: true,
                    wrap: "truncate-end",
                    children: menuItem.hint,
                  })
                : null,
            ],
          },
          menuItem.id,
        );
      }),
    });
    $[46] = menuItems;
    $[47] = selectedIndex;
    $[48] = menuList;
  } else menuList = $[48];
  let statusView;
  if ($[49] !== statusMessage || $[50] !== isSaving) {
    statusView = isSaving
      ? jsxProd_default(WorkerBadge, {
          message: "Updating spend limit\u2026",
        })
      : statusMessage
        ? jsxProd_default(Box, {
            children: jsxProd_default(Text, {
              color: "error",
              children: statusMessage,
            }),
          })
        : null;
    $[49] = statusMessage;
    $[50] = isSaving;
    $[51] = statusView;
  } else statusView = $[51];
  let children;
  if ($[52] !== onKeyDown || $[53] !== menuList || $[54] !== statusView) {
    children = jsxProd_default_2(FocusColumn, {
      gap: 1,
      onKeyDown,
      children: [menuList, statusView],
    });
    $[52] = onKeyDown;
    $[53] = menuList;
    $[54] = statusView;
    $[55] = children;
  } else children = $[55];
  let dialog;
  if ($[56] !== onCancel || $[57] !== titleEnd || $[58] !== isCancelActive || $[59] !== children) {
    dialog = jsxProd_default(Dialog, {
      title: "What do you want to do?",
      titleEnd,
      onCancel,
      isCancelActive,
      color: "suggestion",
      children,
    });
    $[56] = onCancel;
    $[57] = titleEnd;
    $[58] = isCancelActive;
    $[59] = children;
    $[60] = dialog;
  } else dialog = $[60];
  return dialog;
}
//@ chunk-dg94x42s.js:24302-24339 sole-consumer
function emitStatusChangeNow() {
  return emitStatusChange(Date.now());
}
//@ chunk-dg94x42s.js:24339-24379 sole-consumer
function resetOfferPair(offer) {
  return [offer.kind, resetOfferLabel(offer)];
}
//@ chunk-dg94x42s.js:24379-24394 sole-consumer
function noop() {}
//@ chunk-dg94x42s.js:24394-24409 sole-consumer
function noop_2() {}
//@ chunk-dg94x42s.js:24409-24441 sole-consumer
function optionValue(option) {
  return option.value;
}
//@ chunk-dg94x42s.js:24441-24476 sole-consumer
function enumOfOptionValue(option) {
  return fromEnum(option.value);
}
//@ chunk-dg94x42s.js:24476-24491 sole-consumer
function noop_3() {}
//@ chunk-dg94x42s.js:24491-24506 sole-consumer
function noop_4() {}
//@ chunk-dg94x42s.js:24506-24521 sole-consumer
function noop_5() {}
//@ chunk-dg94x42s.js:24521-24552 sole-consumer
var overageOptionsSchema = DoctorLazy(() => array(tuple([stringSchema(), stringSchema()])));
//@ chunk-dg94x42s.js:24552-24869 affinity
/**
 * 选项是升级或额外用量。
 */
function isUpgradeOption(value) {
  switch (value) {
    case "upgrade":
    case "extra-usage":
      return true;
    case "cancel":
    case "auto-resume":
    case "low-priority":
    case "juniper-tide":
    case "juniper-tide-spent":
    case "cedar-ember-session":
    case "cedar-ember-weekly":
    case "cedar-ember-fable":
    case "cedar-ember-full":
    case "cedar-ember-spent":
    case "cancel-auto-resume":
      return false;
  }
}
//@ chunk-dg94x42s.js:24869-37678 fingerprint (2.1.88 match: RateLimitOptionsMenu, 0.363)
function RateLimitOptionsMenu_2(props) {
  let $ = useMemoCache(177);
  let { onDone, context } = props;
  let [localJsx, setLocalJsx] = useState(null);
  let claudeAiLimits = useRateLimitState();
  let { storageV5 } = useTheme_2();
  let cachedSubscriptionType;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    cachedSubscriptionType = getSubscriptionType();
    $[0] = cachedSubscriptionType;
  } else cachedSubscriptionType = $[0];
  let subscriptionType = cachedSubscriptionType;
  let cachedRateLimitTier;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    cachedRateLimitTier = getRateLimitTier();
    $[1] = cachedRateLimitTier;
  } else cachedRateLimitTier = $[1];
  let rateLimitTier = cachedRateLimitTier;
  let hasExtraUsageEnabled = getOauthAccountInfo()?.hasExtraUsageEnabled === true;
  let isUsageBasedBilling = getOauthAccountInfo()?.billingType === "usage_based";
  let isMax20xPlan = subscriptionType === "max" && rateLimitTier === "default_claude_max_20x";
  let isTeamOrEnterprise = subscriptionType === "team" || subscriptionType === "enterprise";
  let cachedJadeAnvilFlag;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    cachedJadeAnvilFlag = getFeatureValue_CACHED_MAY_BE_STALE("tengu_jade_anvil_4", false);
    $[2] = cachedJadeAnvilFlag;
  } else cachedJadeAnvilFlag = $[2];
  let putUpgradeOptionsFirst = cachedJadeAnvilFlag;
  let upgradePaths = claudeAiLimits.upgradePaths;
  let [statusChangeCallback] = useState(emitStatusChangeNow);
  let currentLimits = currentLimitsOrLatest(claudeAiLimits, statusChangeCallback);
  let hasLimits = currentLimits !== null;
  let resetsAt = currentLimits?.resetsAt;
  let immediate = useResetReached(resetsAt !== undefined ? resetsAt * 1000 : null);
  let { label } = getWaitOptionLabel(resetsAt, immediate);
  let phase = useQuotaAutoResumeState().phase;
  let isAutoResumeActiveCached;
  if ($[3] !== phase) {
    isAutoResumeActiveCached = isPhaseActive(phase);
    $[3] = phase;
    $[4] = isAutoResumeActiveCached;
  } else isAutoResumeActiveCached = $[4];
  let isAutoResumeActive = isAutoResumeActiveCached;
  let canOfferLowPriorityCached;
  if ($[5] !== claudeAiLimits) {
    canOfferLowPriorityCached = canOfferLowPriority(claudeAiLimits);
    $[5] = claudeAiLimits;
    $[6] = canOfferLowPriorityCached;
  } else canOfferLowPriorityCached = $[6];
  let lowPriorityEnabled = canOfferLowPriorityCached;
  let phase_2 = useSyncExternalStore(subscribeResetChanges, getResetFlowPhase, getResetFlowPhase).phase;
  let phase_3 = useSyncExternalStore(
    onUsageCreditStateChange,
    currentUsageCreditState,
    currentUsageCreditState,
  ).phase;
  let resetOffersJsonCached;
  if ($[7] !== claudeAiLimits) {
    resetOffersJsonCached = () => jsonStringify(availableResetOffers(claudeAiLimits).map(resetOfferPair));
    $[7] = claudeAiLimits;
    $[8] = resetOffersJsonCached;
  } else resetOffersJsonCached = $[8];
  let resetOffersJson = useSyncExternalStore(onUsageCreditStateChange, resetOffersJsonCached);
  let hasResetOffers = resetOffersJson !== "[]";
  let resetClaimInFlight = useSyncExternalStore(onUsageCreditStateChange, isClaimingReset);
  let canArmResetCached;
  if ($[9] !== claudeAiLimits) {
    canArmResetCached = () => canArmLowPriorityReset(claudeAiLimits);
    $[9] = claudeAiLimits;
    $[10] = canArmResetCached;
  } else canArmResetCached = $[10];
  let canArmReset = useSyncExternalStore(subscribeResetChanges, canArmResetCached);
  let getResetsUsedUpLine;
  if ($[11] !== claudeAiLimits) {
    getResetsUsedUpLine = () => resetsUsedUpLine(claudeAiLimits);
    $[11] = claudeAiLimits;
    $[12] = getResetsUsedUpLine;
  } else getResetsUsedUpLine = $[12];
  let resetsUsedUpText = useSyncExternalStore(onUsageCreditStateChange, getResetsUsedUpLine);
  let getUsageCreditsSpentLine;
  if ($[13] !== claudeAiLimits) {
    getUsageCreditsSpentLine = () => usageCreditsSpentLine(claudeAiLimits);
    $[13] = claudeAiLimits;
    $[14] = getUsageCreditsSpentLine;
  } else getUsageCreditsSpentLine = $[14];
  let creditsSpentText = useSyncExternalStore(subscribeResetChanges, getUsageCreditsSpentLine);
  let phase_4 = useSyncExternalStore(
    onCreditOfferPromptChange,
    getCreditOfferPhase,
    getCreditOfferPhase,
  ).phase;
  let offerMenuSuffix = useSyncExternalStore(
    onCreditOfferPromptChange,
    getOfferMenuSuffix,
    getOfferMenuSuffix,
  );
  let [isCheckingReset, setIsCheckingReset] = useState(false);
  let resetSelectedRef = useRef(false);
  let resetCancelledRef = useRef(false);
  let canOfferLimitReset = !hasResetOffers && !resetClaimInFlight && canArmReset;
  let resetsUsedUpEntry = hasResetOffers || canOfferLimitReset ? undefined : resetsUsedUpText;
  let usageCreditsSpentEntry =
    canOfferLimitReset || hasResetOffers || resetsUsedUpEntry !== undefined ? undefined : creditsSpentText;
  let [isResettingLimits, setIsResettingLimits] = useState(false);
  let cachedPewterSummitFlag;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    cachedPewterSummitFlag = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PEWTER_SUMMIT, false);
    $[15] = cachedPewterSummitFlag;
  } else cachedPewterSummitFlag = $[15];
  let pewterSummitFlag = cachedPewterSummitFlag;
  let shouldFetchPrepaidBalanceCached;
  if ($[16] !== claudeAiLimits.overageDisabledReason) {
    shouldFetchPrepaidBalanceCached =
      pewterSummitFlag &&
      !isTeamOrEnterprise &&
      claudeAiLimits.overageDisabledReason === "org_level_disabled_until" &&
      isConsumerPlan() &&
      usageCreditsCommand.isEnabled();
    $[16] = claudeAiLimits.overageDisabledReason;
    $[17] = shouldFetchPrepaidBalanceCached;
  } else shouldFetchPrepaidBalanceCached = $[17];
  let shouldFetchPrepaidBalance = shouldFetchPrepaidBalanceCached;
  let [prepaidBalance, setPrepaidBalance] = useState(null);
  let prepaidBalanceEffect;
  if (
    $[18] !== claudeAiLimits.overageDisabledReason ||
    $[19] !== context.credentials ||
    $[20] !== shouldFetchPrepaidBalance
  ) {
    prepaidBalanceEffect = () => {
      if (!shouldFetchPrepaidBalance) {
        return;
      }
      let isCancelled = false;
      fetchPrepaidBalance(context.credentials)
        .then((prepaidBalance) => {
          if (isCancelled || !prepaidBalance) {
            return;
          }
          if (
            isOrgLevelRejectionWithBalance({
              overageDisabledReason: claudeAiLimits.overageDisabledReason,
              balanceMinorUnits: prepaidBalance.amount,
            })
          )
            setPrepaidBalance(prepaidBalance);
        })
        .catch(noop);
      return () => {
        isCancelled = true;
      };
    };
    $[18] = claudeAiLimits.overageDisabledReason;
    $[19] = context.credentials;
    $[20] = shouldFetchPrepaidBalance;
    $[21] = prepaidBalanceEffect;
  } else prepaidBalanceEffect = $[21];
  let prepaidBalanceDeps;
  if ($[22] !== shouldFetchPrepaidBalance) {
    prepaidBalanceDeps = [shouldFetchPrepaidBalance];
    $[22] = shouldFetchPrepaidBalance;
    $[23] = prepaidBalanceDeps;
  } else prepaidBalanceDeps = $[23];
  useEffect(prepaidBalanceEffect, prepaidBalanceDeps);
  let isOrgPlanCached;
  if ($[24] === MEMO_CACHE_SENTINEL) {
    isOrgPlanCached = isTeamOrEnterprise && !isConsumerPlan();
    $[24] = isOrgPlanCached;
  } else isOrgPlanCached = $[24];
  let isOrgPlan = isOrgPlanCached;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let canOfferExtraUsageCached;
  if ($[25] !== claudeAiLimits.overageScope || $[26] !== isScreenReaderEnabled || $[27] !== upgradePaths) {
    canOfferExtraUsageCached =
      isOrgPlan &&
      isAutoResumeOfferEnabled(upgradePaths) &&
      !isBgSession() &&
      !isScreenReaderEnabled &&
      claudeAiLimits.overageScope !== "group_pool" &&
      getUsageCreditsFlowConfig()?.mode === "one_step";
    $[25] = claudeAiLimits.overageScope;
    $[26] = isScreenReaderEnabled;
    $[27] = upgradePaths;
    $[28] = canOfferExtraUsageCached;
  } else canOfferExtraUsageCached = $[28];
  let canOfferExtraUsage = canOfferExtraUsageCached;
  let [extraUsageResult, setExtraUsageResult] = useState(null);
  let extraUsageFetchedAtRef = useRef(null);
  let extraUsageRequestedRef = useRef(false);
  let extraUsageEffect;
  let extraUsageDeps;
  if ($[29] !== context.credentials || $[30] !== canOfferExtraUsage) {
    extraUsageEffect = () => {
      if (!canOfferExtraUsage || extraUsageRequestedRef.current) {
        return;
      }
      extraUsageRequestedRef.current = true;
      runExtraUsage(
        {
          openInBrowser: false,
        },
        context.credentials,
      )
        .then((extraUsageResponse) => {
          extraUsageFetchedAtRef.current = Date.now();
          setExtraUsageResult(extraUsageResponse);
        })
        .catch(noop_2);
    };
    extraUsageDeps = [canOfferExtraUsage, context.credentials];
    $[29] = context.credentials;
    $[30] = canOfferExtraUsage;
    $[31] = extraUsageEffect;
    $[32] = extraUsageDeps;
  } else {
    extraUsageEffect = $[31];
    extraUsageDeps = $[32];
  }
  useEffect(extraUsageEffect, extraUsageDeps);
  let extraUsageMessage =
    canOfferExtraUsage && extraUsageResult?.type === "message" ? extraUsageResult.value : null;
  let [isSendingAdminRequest, setIsSendingAdminRequest] = useState(false);
  let extraUsageSelectedRef = useRef(false);
  let typedInputRef = useRef(false);
  let lastFocusAtRef = useRef(null);
  let hasBillingAccess = useInputClock();
  let optionsChangedAtRef = useRef(null);
  let lastOptionsKeyRef = useRef(null);
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let upgradeOptions;
  if ($[33] !== extraUsageMessage || $[34] !== upgradePaths || $[35] !== offerMenuSuffix) {
    upgradeOptions = [];
    let hasUpgradePaths = upgradePaths !== undefined;
    if (isAutoResumeOfferEnabled(upgradePaths)) {
      let creditsNoun = isUsageBasedBilling ? "usage" : "usage credits";
      let extraUsageLabel;
      if (isOrgPlan) extraUsageLabel = "Ask your admin for more usage";
      else {
        extraUsageLabel = hasExtraUsageEnabled
          ? `Add funds to continue with ${creditsNoun}`
          : `Switch to ${creditsNoun}`;
        if (offerMenuSuffix !== undefined && !isUsageBasedBilling)
          extraUsageLabel = `${extraUsageLabel} \xB7 ${offerMenuSuffix}`;
      }
      let extraUsageOption;
      if ($[37] !== extraUsageMessage || $[38] !== extraUsageLabel) {
        extraUsageOption =
          extraUsageMessage !== null
            ? {
                label: extraUsageMessage,
                value: "extra-usage",
                disabled: true,
              }
            : {
                label: extraUsageLabel,
                value: "extra-usage",
              };
        $[37] = extraUsageMessage;
        $[38] = extraUsageLabel;
        $[39] = extraUsageOption;
      } else extraUsageOption = $[39];
      upgradeOptions.push(extraUsageOption);
    }
    if (
      hasUpgradePaths
        ? upgradePaths.includes("upgrade_plan") && upgradeCommand.isEnabled()
        : !isMax20xPlan && !isTeamOrEnterprise && upgradeCommand.isEnabled()
    ) {
      let upgradeOption;
      if ($[40] === MEMO_CACHE_SENTINEL) {
        upgradeOption = {
          label: "Upgrade your plan",
          value: "upgrade",
        };
        $[40] = upgradeOption;
      } else upgradeOption = $[40];
      upgradeOptions.push(upgradeOption);
    }
    $[33] = extraUsageMessage;
    $[34] = upgradePaths;
    $[35] = offerMenuSuffix;
    $[36] = upgradeOptions;
  } else upgradeOptions = $[36];
  let stopOption;
  if ($[41] === MEMO_CACHE_SENTINEL) {
    stopOption = {
      label: isUsageBasedBilling ? "Stop" : "Stop and wait for limit to reset",
      value: "cancel",
    };
    $[41] = stopOption;
  } else stopOption = $[41];
  let stopEntry = stopOption;
  let autoResumeOptionDraft;
  if ($[42] !== label || $[43] !== hasLimits || $[44] !== isAutoResumeActive) {
    autoResumeOptionDraft = isAutoResumeActive
      ? {
          label: "Don\u2019t continue automatically",
          value: "cancel-auto-resume",
        }
      : hasLimits
        ? {
            label,
            value: "auto-resume",
          }
        : undefined;
    $[42] = label;
    $[43] = hasLimits;
    $[44] = isAutoResumeActive;
    $[45] = autoResumeOptionDraft;
  } else autoResumeOptionDraft = $[45];
  let autoResumeOption = autoResumeOptionDraft;
  let resetOptions;
  if (
    $[46] !== autoResumeOption ||
    $[47] !== resetOffersJson ||
    $[48] !== resetsUsedUpEntry ||
    $[49] !== usageCreditsSpentEntry ||
    $[50] !== canOfferLimitReset ||
    $[51] !== lowPriorityEnabled
  ) {
    resetOptions = [];
    for (const [offerKey, offerLabel] of overageOptionsSchema().parse(jsonParse(resetOffersJson))) {
      let found = LIMIT_CATEGORIES.find((category) => category === offerKey);
      if (found !== undefined)
        resetOptions.push({
          label: offerLabel,
          value: `cedar-ember-${found}`,
        });
    }
    if (resetOffersJson === "[]" && resetsUsedUpEntry !== undefined) {
      let spentEntryOption;
      if ($[53] !== resetsUsedUpEntry) {
        spentEntryOption = {
          label: resetsUsedUpEntry,
          value: "cedar-ember-spent",
          disabled: true,
        };
        $[53] = resetsUsedUpEntry;
        $[54] = spentEntryOption;
      } else spentEntryOption = $[54];
      resetOptions.push(spentEntryOption);
    }
    if (canOfferLimitReset) {
      let resetOfferOption;
      if ($[55] === MEMO_CACHE_SENTINEL) {
        resetOfferOption = {
          label: getLimitResetCopy().label,
          value: "juniper-tide",
        };
        $[55] = resetOfferOption;
      } else resetOfferOption = $[55];
      resetOptions.push(resetOfferOption);
    } else if (usageCreditsSpentEntry !== undefined) {
      let spentTideOption;
      if ($[56] !== usageCreditsSpentEntry) {
        spentTideOption = {
          label: usageCreditsSpentEntry,
          value: "juniper-tide-spent",
          disabled: true,
        };
        $[56] = usageCreditsSpentEntry;
        $[57] = spentTideOption;
      } else spentTideOption = $[57];
      resetOptions.push(spentTideOption);
    }
    if (autoResumeOption) resetOptions.push(autoResumeOption);
    if (lowPriorityEnabled) {
      let lowPriorityOption;
      if ($[58] === MEMO_CACHE_SENTINEL) {
        lowPriorityOption = {
          label: statusLineShouldDisplay().label,
          value: "low-priority",
        };
        $[58] = lowPriorityOption;
      } else lowPriorityOption = $[58];
      resetOptions.push(lowPriorityOption);
    }
    $[46] = autoResumeOption;
    $[47] = resetOffersJson;
    $[48] = resetsUsedUpEntry;
    $[49] = usageCreditsSpentEntry;
    $[50] = canOfferLimitReset;
    $[51] = lowPriorityEnabled;
    $[52] = resetOptions;
  } else resetOptions = $[52];
  let allOptions;
  if ($[59] !== upgradeOptions || $[60] !== canOfferExtraUsage || $[61] !== resetOptions) {
    allOptions =
      putUpgradeOptionsFirst && !canOfferExtraUsage
        ? [...upgradeOptions, stopEntry, ...resetOptions]
        : [stopEntry, ...resetOptions, ...upgradeOptions];
    $[59] = upgradeOptions;
    $[60] = canOfferExtraUsage;
    $[61] = resetOptions;
    $[62] = allOptions;
  } else allOptions = $[62];
  let options = allOptions;
  let trackOptionsChange;
  let optionsDeps;
  if ($[63] !== options) {
    trackOptionsChange = () => {
      let joined = options.map(optionValue).join(" ");
      if (lastOptionsKeyRef.current !== null && lastOptionsKeyRef.current !== joined)
        optionsChangedAtRef.current = Date.now();
      lastOptionsKeyRef.current = joined;
    };
    optionsDeps = [options];
    $[63] = options;
    $[64] = trackOptionsChange;
    $[65] = optionsDeps;
  } else {
    trackOptionsChange = $[64];
    optionsDeps = $[65];
  }
  useLayoutEffect(trackOptionsChange, optionsDeps);
  let shouldRefuseInputCached;
  if ($[66] !== hasBillingAccess || $[67] !== noteRefused || $[68] !== refusedWithin) {
    shouldRefuseInputCached = function shouldRefuseRecentInput() {
      if (
        (optionsChangedAtRef.current !== null &&
          isWithinRecentInput(hasBillingAccess, optionsChangedAtRef.current, RECENT_INPUT_GUARD_MS)) ||
        refusedWithin(RECENT_INPUT_GUARD_MS)
      ) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[66] = hasBillingAccess;
    $[67] = noteRefused;
    $[68] = refusedWithin;
    $[69] = shouldRefuseInputCached;
  } else shouldRefuseInputCached = $[69];
  let shouldRefuseInput = shouldRefuseInputCached;
  let loggedShownRef = useRef(false);
  let logMenuShownEffect;
  let logMenuShownDeps;
  if ($[70] !== claudeAiLimits || $[71] !== context.submittedFromComposer || $[72] !== options) {
    logMenuShownEffect = () => {
      if (loggedShownRef.current) {
        return;
      }
      loggedShownRef.current = true;
      logEvent("tengu_rate_limit_options_menu_shown", {
        ...getRateLimitEventProps(claudeAiLimits),
        ...getCreditOfferForRateLimit(),
        entry: isFrozenMarker(context.submittedFromComposer) ? lit("typed") : lit("not_typed"),
        rows: options.map(enumOfOptionValue),
        blocked: isAutoResumableLimit(claudeAiLimits),
      });
    };
    logMenuShownDeps = [claudeAiLimits, context.submittedFromComposer, options];
    $[70] = claudeAiLimits;
    $[71] = context.submittedFromComposer;
    $[72] = options;
    $[73] = logMenuShownEffect;
    $[74] = logMenuShownDeps;
  } else {
    logMenuShownEffect = $[73];
    logMenuShownDeps = $[74];
  }
  useEffect(logMenuShownEffect, logMenuShownDeps);
  let logLowPriorityEffect;
  let logLowPriorityDeps;
  if ($[75] !== claudeAiLimits || $[76] !== lowPriorityEnabled) {
    logLowPriorityEffect = () => {
      if (lowPriorityEnabled) logLowPriorityShown(claudeAiLimits, "dialog");
    };
    logLowPriorityDeps = [lowPriorityEnabled, claudeAiLimits];
    $[75] = claudeAiLimits;
    $[76] = lowPriorityEnabled;
    $[77] = logLowPriorityEffect;
    $[78] = logLowPriorityDeps;
  } else {
    logLowPriorityEffect = $[77];
    logLowPriorityDeps = $[78];
  }
  useEffect(logLowPriorityEffect, logLowPriorityDeps);
  let logLimitResetEffect;
  let logLimitResetDeps;
  if ($[79] !== claudeAiLimits || $[80] !== canOfferLimitReset) {
    logLimitResetEffect = () => {
      if (canOfferLimitReset) logLimitResetOfferShown(claudeAiLimits, "dialog");
    };
    logLimitResetDeps = [canOfferLimitReset, claudeAiLimits];
    $[79] = claudeAiLimits;
    $[80] = canOfferLimitReset;
    $[81] = logLimitResetEffect;
    $[82] = logLimitResetDeps;
  } else {
    logLimitResetEffect = $[81];
    logLimitResetDeps = $[82];
  }
  useEffect(logLimitResetEffect, logLimitResetDeps);
  let reportResetOfferEffect;
  let reportResetOfferDeps;
  if ($[83] !== claudeAiLimits || $[84] !== hasResetOffers) {
    reportResetOfferEffect = () => {
      if (hasResetOffers) reportResetOfferShown(claudeAiLimits, "dialog");
    };
    reportResetOfferDeps = [hasResetOffers, claudeAiLimits];
    $[83] = claudeAiLimits;
    $[84] = hasResetOffers;
    $[85] = reportResetOfferEffect;
    $[86] = reportResetOfferDeps;
  } else {
    reportResetOfferEffect = $[85];
    reportResetOfferDeps = $[86];
  }
  useEffect(reportResetOfferEffect, reportResetOfferDeps);
  let hasCreditOfferSuffixCached;
  if ($[87] !== options || $[88] !== offerMenuSuffix) {
    hasCreditOfferSuffixCached =
      offerMenuSuffix !== undefined &&
      options.some(
        (option) =>
          option.value === "extra-usage" &&
          typeof option.label === "string" &&
          option.label.includes(offerMenuSuffix),
      );
    $[87] = options;
    $[88] = offerMenuSuffix;
    $[89] = hasCreditOfferSuffixCached;
  } else hasCreditOfferSuffixCached = $[89];
  let hasCreditOfferSuffix = hasCreditOfferSuffixCached;
  let logCreditOfferEffect;
  let logCreditOfferDeps;
  if ($[90] !== hasCreditOfferSuffix) {
    logCreditOfferEffect = () => {
      if (hasCreditOfferSuffix) logCreditOfferShown("cli_menu");
    };
    logCreditOfferDeps = [hasCreditOfferSuffix];
    $[90] = hasCreditOfferSuffix;
    $[91] = logCreditOfferEffect;
    $[92] = logCreditOfferDeps;
  } else {
    logCreditOfferEffect = $[91];
    logCreditOfferDeps = $[92];
  }
  useEffect(logCreditOfferEffect, logCreditOfferDeps);
  let openedCreditsDialogRef = useRef(false);
  let openCreditsDialogEffect;
  let openCreditsDialogDeps;
  if ($[93] !== claudeAiLimits || $[94] !== context.credentials || $[95] !== phase_2) {
    openCreditsDialogEffect = () => {
      if (openedCreditsDialogRef.current || phase_2 !== "failed") {
        return;
      }
      openedCreditsDialogRef.current = true;
      maybeOpenUsageCreditsDialog(claudeAiLimits, context.credentials);
    };
    openCreditsDialogDeps = [phase_2, claudeAiLimits, context.credentials];
    $[93] = claudeAiLimits;
    $[94] = context.credentials;
    $[95] = phase_2;
    $[96] = openCreditsDialogEffect;
    $[97] = openCreditsDialogDeps;
  } else {
    openCreditsDialogEffect = $[96];
    openCreditsDialogDeps = $[97];
  }
  useEffect(openCreditsDialogEffect, openCreditsDialogDeps);
  let resetFailedHandledRef = useRef(false);
  let resetAnsweredHandledRef = useRef(false);
  let refreshResetStatusEffect;
  let refreshResetStatusDeps;
  if ($[98] !== phase_3 || $[99] !== claudeAiLimits || $[100] !== context.credentials) {
    refreshResetStatusEffect = () => {
      if (phase_3 === "failed") {
        if (resetFailedHandledRef.current) {
          return;
        }
        resetFailedHandledRef.current = true;
        refreshResetStatusForDialog(claudeAiLimits, context.credentials);
        return;
      }
      if (phase_3 === "answered" && !resetAnsweredHandledRef.current) {
        resetAnsweredHandledRef.current = true;
        refreshResetStatusForDialog(claudeAiLimits, context.credentials);
      }
    };
    refreshResetStatusDeps = [phase_3, claudeAiLimits, context.credentials];
    $[98] = phase_3;
    $[99] = claudeAiLimits;
    $[100] = context.credentials;
    $[101] = refreshResetStatusEffect;
    $[102] = refreshResetStatusDeps;
  } else {
    refreshResetStatusEffect = $[101];
    refreshResetStatusDeps = $[102];
  }
  useEffect(refreshResetStatusEffect, refreshResetStatusDeps);
  let offerPromptRetriedRef = useRef(false);
  let retryOfferPromptEffect;
  let retryOfferPromptDeps;
  if ($[103] !== claudeAiLimits || $[104] !== context.credentials || $[105] !== phase_4) {
    retryOfferPromptEffect = () => {
      if (offerPromptRetriedRef.current || phase_4 !== "failed") {
        return;
      }
      offerPromptRetriedRef.current = retryOfferPrompt(claudeAiLimits, context.credentials);
    };
    retryOfferPromptDeps = [phase_4, claudeAiLimits, context.credentials];
    $[103] = claudeAiLimits;
    $[104] = context.credentials;
    $[105] = phase_4;
    $[106] = retryOfferPromptEffect;
    $[107] = retryOfferPromptDeps;
  } else {
    retryOfferPromptEffect = $[106];
    retryOfferPromptDeps = $[107];
  }
  useEffect(retryOfferPromptEffect, retryOfferPromptDeps);
  let onAutoResume;
  let onCancelAutoResume;
  let onResetLimit;
  let onCancel;
  let onClaimReset;
  let onLowPriority;
  let onExtraUsage;
  let onCancelPress;
  if (
    $[108] !== statusChangeCallback ||
    $[109] !== phase ||
    $[110] !== claudeAiLimits ||
    $[111] !== context ||
    $[112] !== onDone ||
    $[113] !== storageV5
  ) {
    onAutoResume = function handleAutoResume() {
      logEvent("tengu_rate_limit_options_menu_select_auto_resume", {});
      let limitsForResume = currentLimitsOrLatest(claudeAiLimits, statusChangeCallback);
      if (
        limitsForResume === null ||
        !armQuotaAutoResumeFromDialog(limitsForResume, Date.now(), "dialog", storageV5)
      ) {
        finishCancelled();
        return;
      }
      let { confirmationPhrase } = getWaitOptionLabel(
        limitsForResume.resetsAt,
        limitsForResume.resetsAt !== undefined && limitsForResume.resetsAt * 1000 <= Date.now(),
      );
      onDone(
        `Claude Code will continue automatically ${confirmationPhrase}. Keep this session open; it may still pause for permission prompts. Press esc to cancel the wait.`,
      );
    };
    let lowPriorityHandler;
    if ($[122] !== onDone) {
      lowPriorityHandler = function handleLowPriority() {
        logEvent("tengu_rate_limit_options_menu_select_low_priority", {});
        let lowPriorityResult = enableLowPriorityMode("dialog");
        if (lowPriorityResult === "unavailable") {
          onDone(lowPriorityUnavailableMessage());
          return;
        }
        onDone(lowPriorityOnMessage(lowPriorityResult));
      };
      $[122] = onDone;
      $[123] = lowPriorityHandler;
    } else lowPriorityHandler = $[123];
    onLowPriority = lowPriorityHandler;
    let claimResetHandler;
    if ($[124] !== context.credentials || $[125] !== onDone) {
      claimResetHandler = function handleClaimReset() {
        logEvent("tengu_rate_limit_options_menu_select_juniper_tide", {});
        setIsResettingLimits(true);
        checkUsageCredits("dialog", context.credentials)
          .then((claimResult) => {
            onDone(claimResult.text);
          })
          .catch(() => {
            onDone(getLimitResetCopy().unavailableLine);
          });
      };
      $[124] = context.credentials;
      $[125] = onDone;
      $[126] = claimResetHandler;
    } else claimResetHandler = $[126];
    onClaimReset = claimResetHandler;
    let resetLimitHandler;
    if ($[127] !== context.credentials || $[128] !== onDone) {
      resetLimitHandler = function handleResetLimit(category) {
        if (resetSelectedRef.current) {
          return;
        }
        resetSelectedRef.current = true;
        logEvent("tengu_rate_limit_options_menu_select_cedar_ember", {});
        setIsCheckingReset(true);
        startResetFlowSafe("dialog", context.credentials, category)
          .then((resetFlow) => {
            if (resetCancelledRef.current) {
              return;
            }
            switch (resetFlow.kind) {
              case "answer": {
                onDone(resetFlow.result.text);
                return;
              }
              case "confirm": {
                setLocalJsx(
                  jsxProd_default(ResetLimits, {
                    offer: resetFlow.offer,
                    entry: "dialog",
                    credentials: context.credentials,
                    onDone: (resetResult) => onDone(resetResult.text),
                  }),
                );
                return;
              }
              case "choose": {
                setLocalJsx(
                  jsxProd_default(ResetLimitsOffers, {
                    offers: resetFlow.offers,
                    unusable: resetFlow.unusable,
                    entry: "dialog",
                    credentials: context.credentials,
                    onDone: (resetResult) => onDone(resetResult.text),
                  }),
                );
                return;
              }
            }
          })
          .catch(() => {
            onDone(RESET_STATUS_MESSAGES);
          });
      };
      $[127] = context.credentials;
      $[128] = onDone;
      $[129] = resetLimitHandler;
    } else resetLimitHandler = $[129];
    onResetLimit = resetLimitHandler;
    let extraUsageHandler;
    if ($[130] !== context || $[131] !== onDone) {
      extraUsageHandler = function handleExtraUsage(category) {
        context.cancelRateLimitAutoQueueContinue?.();
        logEvent("tengu_rate_limit_options_menu_select_extra_usage", getCreditOfferForRateLimit());
        setIsSendingAdminRequest(true);
        fileAdminLimitRequest(category, context.credentials)
          .then((adminRequestResult) => {
            logEvent("tengu_rate_limit_options_menu_admin_ask", {
              filed: adminRequestResult.filed,
              mode: lit("one_step"),
            });
            withQuotaResumeFire(onDone)(adminRequestResult.value);
          })
          .catch(() => {
            onDone();
          });
      };
      $[130] = context;
      $[131] = onDone;
      $[132] = extraUsageHandler;
    } else extraUsageHandler = $[132];
    onExtraUsage = extraUsageHandler;
    let cancelAutoResumeAndFinishCached;
    if ($[133] !== onDone) {
      cancelAutoResumeAndFinishCached = function cancelAutoResumeAndFinish_2() {
        cancelQuotaAutoResume("dialog");
        onDone(
          "Automatic continue cancelled. Your session will wait for you instead; /rate-limit-options can arm it again.",
        );
      };
      $[133] = onDone;
      $[134] = cancelAutoResumeAndFinishCached;
    } else cancelAutoResumeAndFinishCached = $[134];
    let cancelAutoResumeAndFinish = cancelAutoResumeAndFinishCached;
    let cancelAutoResumeHandler;
    if ($[135] !== cancelAutoResumeAndFinish) {
      cancelAutoResumeHandler = function handleCancelAutoResume() {
        logEvent("tengu_rate_limit_options_menu_cancel_auto_resume", {});
        cancelAutoResumeAndFinish();
      };
      $[135] = cancelAutoResumeAndFinish;
      $[136] = cancelAutoResumeHandler;
    } else cancelAutoResumeHandler = $[136];
    onCancelAutoResume = cancelAutoResumeHandler;
    onCancelPress = function handleCancelPress() {
      logEvent("tengu_rate_limit_options_menu_cancel", {});
      if (hasPendingContinuation() || phase === "stale") {
        cancelAutoResumeAndFinish();
        return;
      }
      finishCancelled();
    };
    onCancel = function handleCancel() {
      logEvent("tengu_rate_limit_options_menu_cancel", {});
      finishCancelled();
    };
    function finishCancelled() {
      context.prefillRateLimitAutoQueueContinue?.();
      onDone(undefined, {
        display: "skip",
      });
    }
    $[108] = statusChangeCallback;
    $[109] = phase;
    $[110] = claudeAiLimits;
    $[111] = context;
    $[112] = onDone;
    $[113] = storageV5;
    $[114] = onAutoResume;
    $[115] = onCancelAutoResume;
    $[116] = onResetLimit;
    $[117] = onCancel;
    $[118] = onClaimReset;
    $[119] = onLowPriority;
    $[120] = onExtraUsage;
    $[121] = onCancelPress;
  } else {
    onAutoResume = $[114];
    onCancelAutoResume = $[115];
    onResetLimit = $[116];
    onCancel = $[117];
    onClaimReset = $[118];
    onLowPriority = $[119];
    onExtraUsage = $[120];
    onCancelPress = $[121];
  }
  let handleSelect;
  if (
    $[137] !== extraUsageResult ||
    $[138] !== context ||
    $[139] !== onAutoResume ||
    $[140] !== onCancelAutoResume ||
    $[141] !== onResetLimit ||
    $[142] !== onClaimReset ||
    $[143] !== onLowPriority ||
    $[144] !== onExtraUsage ||
    $[145] !== onCancelPress ||
    $[146] !== hasBillingAccess ||
    $[147] !== onDone ||
    $[148] !== canOfferExtraUsage ||
    $[149] !== shouldRefuseInput
  ) {
    handleSelect = function handleSelectOption(value) {
      if (shouldRefuseInput()) {
        return;
      }
      if (value === "extra-usage" && canOfferExtraUsage) {
        if (extraUsageSelectedRef.current) {
          return;
        }
        extraUsageSelectedRef.current = true;
      }
      if (
        value === "extra-usage" &&
        canOfferExtraUsage &&
        !typedInputRef.current &&
        extraUsageResult?.type === "confirm-admin-request" &&
        extraUsageResult.checked &&
        lastFocusAtRef.current !== null &&
        extraUsageFetchedAtRef.current !== null &&
        hasBillingAccess() - Math.max(lastFocusAtRef.current, extraUsageFetchedAtRef.current) >=
          RECENT_INPUT_GUARD_MS
      ) {
        onExtraUsage(extraUsageResult.extraUsage);
        return;
      }
      if (isUpgradeOption(value)) context.cancelRateLimitAutoQueueContinue?.();
      if (value === "upgrade") {
        logEvent("tengu_rate_limit_options_menu_select_upgrade", {});
        callUpgradeFromSurface(onDone, context, "rate_limit_options_menu").then((jsx) => {
          if (jsx) setLocalJsx(jsx);
        });
      } else if (value === "extra-usage") {
        logEvent("tengu_rate_limit_options_menu_select_extra_usage", getCreditOfferForRateLimit());
        call_2(onDone, context).then((jsx_0) => {
          if (jsx_0) setLocalJsx(jsx_0);
        });
      } else if (value === "auto-resume") onAutoResume();
      else if (value === "cancel-auto-resume") onCancelAutoResume();
      else if (value === "low-priority") onLowPriority();
      else if (value === "juniper-tide") onClaimReset();
      else if (value.startsWith("cedar-ember-")) {
        let found = LIMIT_CATEGORIES.find((category) => value === `cedar-ember-${category}`);
        if (found !== undefined) onResetLimit(found);
      } else if (value === "cancel") onCancelPress();
    };
    $[137] = extraUsageResult;
    $[138] = context;
    $[139] = onAutoResume;
    $[140] = onCancelAutoResume;
    $[141] = onResetLimit;
    $[142] = onClaimReset;
    $[143] = onLowPriority;
    $[144] = onExtraUsage;
    $[145] = onCancelPress;
    $[146] = hasBillingAccess;
    $[147] = onDone;
    $[148] = canOfferExtraUsage;
    $[149] = shouldRefuseInput;
    $[150] = handleSelect;
  } else handleSelect = $[150];
  let onChange = handleSelect;
  if (localJsx) {
    return localJsx;
  }
  if (isCheckingReset) {
    let onCancel_2;
    if ($[151] !== onCancel) {
      onCancel_2 = () => {
        resetCancelledRef.current = true;
        onCancel();
      };
      $[151] = onCancel;
      $[152] = onCancel_2;
    } else onCancel_2 = $[152];
    let children;
    if ($[153] === MEMO_CACHE_SENTINEL) {
      children = jsxProd_default(Text, {
        dimColor: true,
        children: CHECKING_FOR_RESET_LINE,
      });
      $[153] = children;
    } else children = $[153];
    let checkingResetDialog;
    if ($[154] !== onCancel_2) {
      checkingResetDialog = jsxProd_default(Dialog, {
        title: "What do you want to do?",
        onCancel: onCancel_2,
        color: "suggestion",
        children,
      });
      $[154] = onCancel_2;
      $[155] = checkingResetDialog;
    } else checkingResetDialog = $[155];
    return checkingResetDialog;
  }
  if (isResettingLimits) {
    let resettingDialog;
    if ($[156] === MEMO_CACHE_SENTINEL) {
      resettingDialog = jsxProd_default(Dialog, {
        title: "What do you want to do?",
        onCancel: noop_3,
        exitOnCtrlCD: true,
        color: "suggestion",
        hideInputGuide: true,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "Resetting your 5-hour limit\u2026 this usually takes a few seconds",
        }),
      });
      $[156] = resettingDialog;
    } else resettingDialog = $[156];
    return resettingDialog;
  }
  if (isSendingAdminRequest) {
    let adminRequestDialog;
    if ($[157] === MEMO_CACHE_SENTINEL) {
      adminRequestDialog = jsxProd_default(Dialog, {
        title: "What do you want to do?",
        onCancel: noop_4,
        exitOnCtrlCD: true,
        color: "suggestion",
        hideInputGuide: true,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "Sending request to your admin\u2026",
        }),
      });
      $[157] = adminRequestDialog;
    } else adminRequestDialog = $[157];
    return adminRequestDialog;
  }
  if (prepaidBalance) {
    let onDone_2;
    if ($[158] !== onDone) {
      onDone_2 = withQuotaResumeFire(onDone);
      $[158] = onDone;
      $[159] = onDone_2;
    } else onDone_2 = $[159];
    let prepaidBalanceDialog;
    if ($[160] !== context || $[161] !== prepaidBalance || $[162] !== onDone_2) {
      prepaidBalanceDialog = jsxProd_default(RateLimitOptionsMenu, {
        balance: prepaidBalance,
        onDone: onDone_2,
        context,
      });
      $[160] = context;
      $[161] = prepaidBalance;
      $[162] = onDone_2;
      $[163] = prepaidBalanceDialog;
    } else prepaidBalanceDialog = $[163];
    return prepaidBalanceDialog;
  }
  let onKeyDownCapture;
  let onPasteCapture;
  if ($[164] === MEMO_CACHE_SENTINEL) {
    onKeyDownCapture = (event) => {
      if (
        !event.ctrl &&
        !event.meta &&
        (event.key.length === 1 || (event.key.length > 1 && event.name === ""))
      )
        typedInputRef.current = true;
    };
    onPasteCapture = () => {
      typedInputRef.current = true;
    };
    $[164] = onKeyDownCapture;
    $[165] = onPasteCapture;
  } else {
    onKeyDownCapture = $[164];
    onPasteCapture = $[165];
  }
  let onFocus;
  if ($[166] !== canOfferExtraUsage) {
    onFocus = (value) => {
      lastFocusAtRef.current = value === "extra-usage" && canOfferExtraUsage ? Date.now() : null;
    };
    $[166] = canOfferExtraUsage;
    $[167] = onFocus;
  } else onFocus = $[167];
  const onUpFromFirstItem = canOfferExtraUsage ? noop_5 : undefined;
  let children;
  if (
    $[168] !== onChange ||
    $[169] !== options ||
    $[170] !== shouldRefuseInput ||
    $[171] !== onFocus ||
    $[172] !== onUpFromFirstItem
  ) {
    children = jsxProd_default(Box, {
      flexDirection: "column",
      onKeyDownCapture,
      onPasteCapture,
      children: jsxProd_default(ModelSelector, {
        options,
        onChange,
        refuseInput: shouldRefuseInput,
        selectedValue: NO_COMMITTED_ROW,
        onFocus,
        onUpFromFirstItem,
        visibleOptionCount: options.length,
      }),
    });
    $[168] = onChange;
    $[169] = options;
    $[170] = shouldRefuseInput;
    $[171] = onFocus;
    $[172] = onUpFromFirstItem;
    $[173] = children;
  } else children = $[173];
  let menuDialog;
  if ($[174] !== onCancel || $[175] !== children) {
    menuDialog = jsxProd_default(Dialog, {
      title: "What do you want to do?",
      onCancel,
      color: "suggestion",
      children,
    });
    $[174] = onCancel;
    $[175] = children;
    $[176] = menuDialog;
  } else menuDialog = $[176];
  return menuDialog;
}
//@ chunk-dg94x42s.js:37678-38028 layout
function getWaitOptionLabel(resetsAt, immediate) {
  if (immediate)
    return {
      label: "Wait here, then continue automatically shortly",
      confirmationPhrase: "shortly",
    };
  let resetLabel = formatResetTime(resetsAt);
  if (resetLabel)
    return {
      label: `Wait here, then continue automatically at ${resetLabel}`,
      confirmationPhrase: `at ${resetLabel}`,
    };
  return {
    label: "Wait here, then continue automatically when the limit resets",
    confirmationPhrase: "when your usage limit resets",
  };
}
//@ chunk-dg94x42s.js:38028-38095 layout
function currentLimitsOrLatest(claudeAiLimits, latestLimits) {
  if (canAutoResumeThisLimit(claudeAiLimits)) return claudeAiLimits;
  return latestLimits !== null && canAutoResumeThisLimit(latestLimits) ? latestLimits : null;
}
//@ chunk-dg94x42s.js:38095-38152 callgraph-fingerprint (2.1.88 match: call, 1)
/**
 * /rate-limit-options 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call(onDone, context) {
  return jsxProd_default(RateLimitOptionsMenu_2, {
    onDone,
    context,
  });
}
export { call };
