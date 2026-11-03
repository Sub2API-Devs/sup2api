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
import { init_react_production, y, P, yt, R, zt } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { array, tuple, string } from "../../../vendor/zod/v4/classic/schemas.js";
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
function decrementNonNegative($i) {
  return Math.max(0, $i - 1);
}
//@ chunk-dg94x42s.js:18449-18491 sole-consumer
var RESET_TIME_BUCKET_MS = 500;
var RESET_TIME_MARGIN_MS = 1000;
var MAX_RESET_TIME_MS = 10000000000;
var DEFAULT_RESET_SECONDS = 4000;
//@ chunk-dg94x42s.js:18491-18589 sole-consumer
function isOrgLevelRejectionWithBalance(k) {
  return k.overageDisabledReason === "org_level_disabled_until" && k.balanceMinorUnits > 0;
}
//@ chunk-dg94x42s.js:18589-18758 sole-consumer
function stepCreditAmount(k, d, t = null) {
  let g = k ?? DEFAULT_RESET_SECONDS;
  let me =
    d === 1
      ? Math.floor(g / RESET_TIME_BUCKET_MS + 1) * RESET_TIME_BUCKET_MS
      : Math.ceil(g / RESET_TIME_BUCKET_MS - 1) * RESET_TIME_BUCKET_MS;
  let i =
    t === null
      ? RESET_TIME_BUCKET_MS
      : d === 1
        ? Math.ceil((t + RESET_TIME_MARGIN_MS) / RESET_TIME_BUCKET_MS) * RESET_TIME_BUCKET_MS
        : t;
  return Math.min(MAX_RESET_TIME_MS, Math.max(i, me));
}
//@ chunk-dg94x42s.js:18758-24302 sole-consumer
/**
 * 限流选项菜单：升级、额外用量、自动恢复、等待等。
 */
function RateLimitOptionsMenu(props) {
  let h = w(61);
  let { balance, onDone, context } = props;
  let [me, i] = y(null);
  let [xe] = useTheme();
  let rateLimitState = useRateLimitState();
  let at;
  if (h[0] === MEMO_CACHE_SENTINEL) {
    at = getSubscriptionType();
    h[0] = at;
  } else at = h[0];
  let Qt = at;
  let Ri;
  if (h[1] === MEMO_CACHE_SENTINEL) {
    let oo = Qt === "max" && getRateLimitTier() === "default_claude_max_20x";
    Ri = !oo && canShowUpgradeCommand();
    h[1] = Ri;
  } else Ri = h[1];
  let qt = Ri;
  let currency = balance.currency;
  let [J, ve] = y(undefined);
  let [W, ce] = y(undefined);
  let [x, Ce] = y(false);
  let [se, lt] = y(0);
  let [ke, z] = y(null);
  let dt;
  let pe;
  if (h[2] !== context.credentials) {
    dt = () => {
      let lspManager = getLspManager();
      if (lspManager) {
        ve(lspManager.spendLimitCents);
        ce(lspManager.spendLimitCents);
        return;
      }
      let Ie = false;
      fetchUtilization(context.credentials)
        .then((utilization) => {
          if (Ie) {
            return;
          }
          let monthlyLimit = utilization?.extra_usage?.monthly_limit ?? null;
          let usedCredits = utilization?.extra_usage?.used_credits ?? 0;
          let De = monthlyLimit === null ? null : Math.max(monthlyLimit, usedCredits);
          ve(De);
          ce(De);
        })
        .catch(() => {
          if (Ie) {
            return;
          }
          ve(null);
          ce(null);
        });
      return () => {
        Ie = true;
      };
    };
    pe = [context.credentials];
    h[2] = context.credentials;
    h[3] = dt;
    h[4] = pe;
  } else {
    dt = h[3];
    pe = h[4];
  }
  P(dt, pe);
  let ct;
  Te: {
    if (rateLimitState.resetsAt) {
      let V;
      if (h[5] !== rateLimitState.resetsAt) {
        V = formatResetTime(rateLimitState.resetsAt, true);
        h[5] = rateLimitState.resetsAt;
        h[6] = V;
      } else V = h[6];
      ct = V;
      break Te;
    }
    ct = undefined;
  }
  let ji = ct;
  let X = W !== undefined;
  let V;
  if (h[7] !== currency || h[8] !== X || h[9] !== W) {
    V = !X ? "\u2026" : W === null ? "Unlimited" : formatCurrency(W, currency, "fit");
    h[7] = currency;
    h[8] = X;
    h[9] = W;
    h[10] = V;
  } else V = h[10];
  const label = `Adjust monthly spend limit: ${V}`;
  const hint =
    J === null ? "\u2190 or \u2192 to set a limit" : "\u2190 or \u2192 to adjust \xB7 Del to remove limit";
  let Ne;
  if (h[11] !== label || h[12] !== hint) {
    Ne = {
      id: "adjust",
      label,
      hint,
    };
    h[11] = label;
    h[12] = hint;
    h[13] = Ne;
  } else Ne = h[13];
  const hint_2 = ji ? `Resets ${ji}` : "";
  let fe;
  if (h[14] !== hint_2) {
    fe = {
      id: "wait",
      label: "Wait for limit to reset",
      hint: hint_2,
    };
    h[14] = hint_2;
    h[15] = fe;
  } else fe = h[15];
  let B;
  if (h[16] !== fe || h[17] !== Ne) {
    B = [Ne, fe];
    if (qt) {
      let ro = Qt === "max" ? "Max 20x" : "Max";
      let We;
      if (h[19] === MEMO_CACHE_SENTINEL) {
        We = {
          id: "upgrade",
          label: `Upgrade to ${ro} for higher session limits every month`,
          hint: "",
        };
        h[19] = We;
      } else We = h[19];
      B.push(We);
    }
    h[16] = fe;
    h[17] = Ne;
    h[18] = B;
  } else B = h[18];
  let G = B;
  let We;
  if (h[20] !== context || h[21] !== onDone) {
    We = function Xe() {
      logEvent("tengu_spend_limit_nudge_cancel", {});
      context.prefillRateLimitAutoQueueContinue?.();
      onDone(undefined, {
        display: "skip",
      });
    };
    h[20] = context;
    h[21] = onDone;
    h[22] = We;
  } else We = h[22];
  let onCancel = We;
  let F;
  if (
    h[23] !== context.credentials ||
    h[24] !== currency ||
    h[25] !== X ||
    h[26] !== onDone ||
    h[27] !== W ||
    h[28] !== J ||
    h[29] !== x ||
    h[30] !== xe
  ) {
    F = async function $e() {
      if (!X || x) {
        return;
      }
      if (W === J) {
        z(
          J === null
            ? "Press \u2190 or \u2192 to set a limit."
            : "Press \u2192 to raise the limit, or Del to remove it.",
        );
        return;
      }
      Ce(true);
      let H = W ?? null;
      let D = await updateOverageSpendLimit(H, currency, context.credentials);
      if (!D.ok) {
        Ce(false);
        z(
          D.reason
            ? `Could not update your spend limit: ${D.reason}`
            : "Could not update your spend limit. Press Enter to retry.",
        );
        return;
      }
      let Zt = D.disabledUntil != null ? new Date(D.disabledUntil) : null;
      let Ei = Zt != null && (Number.isNaN(Zt.getTime()) || Zt > new Date());
      logEvent("tengu_spend_limit_nudge_save", {
        removed: H === null,
        reblocked: Ei,
      });
      if (Ei) {
        Ce(false);
        let Be = D.usedCredits !== null ? Math.max(J ?? 0, D.usedCredits) : J;
        ve(Be ?? null);
        ce((ei) => (Be !== null && Be !== undefined && ei !== null ? Math.max(ei ?? 0, Be) : ei));
        z(
          D.usedCredits !== null
            ? `You've already used ${formatCurrency(D.usedCredits, currency, "fit")} this month \u2014 set your limit above that.`
            : "Your current spend is still over the new limit. Raise it higher or remove it.",
        );
        return;
      }
      z(null);
      markOverageAllowed();
      if (H === null) onDone(color("success", xe)("Removed monthly spend limit"));
      else
        onDone(
          color("success", xe)(`Increased monthly spend limit to ${formatCurrency(H, currency, "fit")}`),
        );
    };
    h[23] = context.credentials;
    h[24] = currency;
    h[25] = X;
    h[26] = onDone;
    h[27] = W;
    h[28] = J;
    h[29] = x;
    h[30] = xe;
    h[31] = F;
  } else F = h[31];
  let $e = F;
  let ge;
  if (h[32] !== $e || h[33] !== context || h[34] !== onDone) {
    ge = function Oe(Y) {
      if (Y === "adjust" || Y === "upgrade") context.cancelRateLimitAutoQueueContinue?.();
      else if (Y === "wait") context.prefillRateLimitAutoQueueContinue?.();
      if (Y === "adjust") $e();
      else if (Y === "wait") {
        logEvent("tengu_spend_limit_nudge_wait", {});
        onDone(undefined, {
          display: "skip",
        });
      } else if (Y === "upgrade") {
        logEvent("tengu_spend_limit_nudge_upgrade", {});
        import("./chunk-txp87wj5.js")
          .then((ft) => {
            let { callUpgradeFromSurface } = ft;
            return callUpgradeFromSurface(onDone, context, "spend_limit_options_menu");
          })
          .then((ti) => {
            if (ti) i(ti);
          });
      }
    };
    h[32] = $e;
    h[33] = context;
    h[34] = onDone;
    h[35] = ge;
  } else ge = h[35];
  let Oe = ge;
  let ft;
  if (h[36] !== Oe || h[37] !== X || h[38] !== G || h[39] !== se || h[40] !== J || h[41] !== x) {
    ft = function L(event) {
      if (x) {
        return;
      }
      if (event.key === "up") {
        event.preventDefault();
        z(null);
        lt(decrementNonNegative);
        return;
      }
      if (event.key === "down") {
        event.preventDefault();
        z(null);
        lt((Ii) => Math.min(G.length - 1, Ii + 1));
        return;
      }
      if (event.key === "return") {
        event.preventDefault();
        let ii = G[se];
        if (ii) Oe(ii.id);
        return;
      }
      if (G[se]?.id !== "adjust" || !X) {
        return;
      }
      if (event.key === "left") {
        event.preventDefault();
        z(null);
        ce((ni) => stepCreditAmount(ni ?? null, -1, J ?? null));
      } else if (event.key === "right") {
        event.preventDefault();
        z(null);
        ce((Ni) => stepCreditAmount(Ni ?? null, 1, J ?? null));
      } else if (event.key === "delete" || event.key === "backspace") {
        event.preventDefault();
        z(null);
        ce(null);
      }
    };
    h[36] = Oe;
    h[37] = X;
    h[38] = G;
    h[39] = se;
    h[40] = J;
    h[41] = x;
    h[42] = ft;
  } else ft = h[42];
  let onKeyDown = ft;
  if (me) {
    return me;
  }
  let le;
  if (h[43] !== balance.amount || h[44] !== currency) {
    le = formatCurrency(balance.amount, currency);
    h[43] = balance.amount;
    h[44] = currency;
    h[45] = le;
  } else le = h[45];
  const titleEnd = `Usage credit balance: ${le}`;
  const isCancelActive = !x;
  let He;
  if (h[46] !== G || h[47] !== se) {
    He = jsxProd_default(Box, {
      flexDirection: "column",
      children: G.map((Ke, Wi) => {
        let Xi = Wi === se;
        return jsxProd_default_2(
          Box,
          {
            justifyContent: "space-between",
            gap: 2,
            children: [
              jsxProd_default_2(Text, {
                color: Xi ? "suggestion" : undefined,
                children: [Xi ? figures_default.pointer : " ", " ", Ke.label],
              }),
              Ke.hint
                ? jsxProd_default(Text, {
                    dimColor: true,
                    wrap: "truncate-end",
                    children: Ke.hint,
                  })
                : null,
            ],
          },
          Ke.id,
        );
      }),
    });
    h[46] = G;
    h[47] = se;
    h[48] = He;
  } else He = h[48];
  let Z;
  if (h[49] !== ke || h[50] !== x) {
    Z = x
      ? jsxProd_default(WorkerBadge, {
          message: "Updating spend limit\u2026",
        })
      : ke
        ? jsxProd_default(Box, {
            children: jsxProd_default(Text, {
              color: "error",
              children: ke,
            }),
          })
        : null;
    h[49] = ke;
    h[50] = x;
    h[51] = Z;
  } else Z = h[51];
  let children;
  if (h[52] !== onKeyDown || h[53] !== He || h[54] !== Z) {
    children = jsxProd_default_2(FocusColumn, {
      gap: 1,
      onKeyDown,
      children: [He, Z],
    });
    h[52] = onKeyDown;
    h[53] = He;
    h[54] = Z;
    h[55] = children;
  } else children = h[55];
  let Bi;
  if (h[56] !== onCancel || h[57] !== titleEnd || h[58] !== isCancelActive || h[59] !== children) {
    Bi = jsxProd_default(Dialog, {
      title: "What do you want to do?",
      titleEnd,
      onCancel,
      isCancelActive,
      color: "suggestion",
      children,
    });
    h[56] = onCancel;
    h[57] = titleEnd;
    h[58] = isCancelActive;
    h[59] = children;
    h[60] = Bi;
  } else Bi = h[60];
  return Bi;
}
//@ chunk-dg94x42s.js:24302-24339 sole-consumer
function emitStatusChangeNow() {
  return emitStatusChange(Date.now());
}
//@ chunk-dg94x42s.js:24339-24379 sole-consumer
function resetOfferPair(Ho) {
  return [Ho.kind, resetOfferLabel(Ho)];
}
//@ chunk-dg94x42s.js:24379-24394 sole-consumer
function noop() {}
//@ chunk-dg94x42s.js:24394-24409 sole-consumer
function noop_2() {}
//@ chunk-dg94x42s.js:24409-24441 sole-consumer
function optionValue(ks) {
  return ks.value;
}
//@ chunk-dg94x42s.js:24441-24476 sole-consumer
function enumOfOptionValue(Ds) {
  return fromEnum(Ds.value);
}
//@ chunk-dg94x42s.js:24476-24491 sole-consumer
function noop_3() {}
//@ chunk-dg94x42s.js:24491-24506 sole-consumer
function noop_4() {}
//@ chunk-dg94x42s.js:24506-24521 sole-consumer
function noop_5() {}
//@ chunk-dg94x42s.js:24521-24552 sole-consumer
var overageOptionsSchema = DoctorLazy(() => array(tuple([string(), string()])));
//@ chunk-dg94x42s.js:24552-24869 affinity
/**
 * 选项是升级或额外用量。
 */
function isUpgradeOption(k) {
  switch (k) {
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
//@ chunk-dg94x42s.js:24869-37678 fingerprint = RateLimitOptionsMenu (0.363)
function RateLimitOptionsMenu_2(props) {
  let l = w(177);
  let { onDone, context } = props;
  let [g, me] = y(null);
  let claudeAiLimits = useRateLimitState();
  let { storageV5 } = useTheme_2();
  let h;
  if (l[0] === MEMO_CACHE_SENTINEL) {
    h = getSubscriptionType();
    l[0] = h;
  } else h = l[0];
  let at = h;
  let Qt;
  if (l[1] === MEMO_CACHE_SENTINEL) {
    Qt = getRateLimitTier();
    l[1] = Qt;
  } else Qt = l[1];
  let Ri = Qt;
  let oo = getOauthAccountInfo()?.hasExtraUsageEnabled === true;
  let qt = getOauthAccountInfo()?.billingType === "usage_based";
  let J = at === "max" && Ri === "default_claude_max_20x";
  let ve = at === "team" || at === "enterprise";
  let W;
  if (l[2] === MEMO_CACHE_SENTINEL) {
    W = getFeatureValue_CACHED_MAY_BE_STALE("tengu_jade_anvil_4", false);
    l[2] = W;
  } else W = l[2];
  let ce = W;
  let upgradePaths = claudeAiLimits.upgradePaths;
  let [Ce] = y(emitStatusChangeNow);
  let se = currentLimitsOrLatest(claudeAiLimits, Ce);
  let lt = se !== null;
  let resetsAt = se?.resetsAt;
  let resetReached = useResetReached(resetsAt !== undefined ? resetsAt * 1000 : null);
  let { label } = getWaitOptionLabel(resetsAt, resetReached);
  let phase = useQuotaAutoResumeState().phase;
  let ut;
  if (l[3] !== phase) {
    ut = isPhaseActive(phase);
    l[3] = phase;
    l[4] = ut;
  } else ut = l[4];
  let Ie = ut;
  let Vt;
  if (l[5] !== claudeAiLimits) {
    Vt = canOfferLowPriority(claudeAiLimits);
    l[5] = claudeAiLimits;
    l[6] = Vt;
  } else Vt = l[6];
  let ae = Vt;
  let phase_2 = yt(subscribeResetChanges, getResetFlowPhase, getResetFlowPhase).phase;
  let phase_3 = yt(onUsageCreditStateChange, currentUsageCreditState, currentUsageCreditState).phase;
  let ct;
  if (l[7] !== claudeAiLimits) {
    ct = () => jsonStringify(availableResetOffers(claudeAiLimits).map(resetOfferPair));
    l[7] = claudeAiLimits;
    l[8] = ct;
  } else ct = l[8];
  let V = yt(onUsageCreditStateChange, ct);
  let Te = V !== "[]";
  let ji = yt(onUsageCreditStateChange, isClaimingReset);
  let X;
  if (l[9] !== claudeAiLimits) {
    X = () => canArmLowPriorityReset(claudeAiLimits);
    l[9] = claudeAiLimits;
    l[10] = X;
  } else X = l[10];
  let ps = yt(subscribeResetChanges, X);
  let pt;
  if (l[11] !== claudeAiLimits) {
    pt = () => resetsUsedUpLine(claudeAiLimits);
    l[11] = claudeAiLimits;
    l[12] = pt;
  } else pt = l[12];
  let Gt = yt(onUsageCreditStateChange, pt);
  let Ne;
  if (l[13] !== claudeAiLimits) {
    Ne = () => usageCreditsSpentLine(claudeAiLimits);
    l[13] = claudeAiLimits;
    l[14] = Ne;
  } else Ne = l[14];
  let Yt = yt(subscribeResetChanges, Ne);
  let phase_4 = yt(onCreditOfferPromptChange, getCreditOfferPhase, getCreditOfferPhase).phase;
  let B = yt(onCreditOfferPromptChange, getOfferMenuSuffix, getOfferMenuSuffix);
  let [ro, We] = y(false);
  let G = R(false);
  let Xe = R(false);
  let F = !Te && !ji && ps;
  let H = Te || F ? undefined : Gt;
  let D = F || Te || H !== undefined ? undefined : Yt;
  let [Zt, Ei] = y(false);
  let Be;
  if (l[15] === MEMO_CACHE_SENTINEL) {
    Be = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PEWTER_SUMMIT, false);
    l[15] = Be;
  } else Be = l[15];
  let ei = Be;
  let $e;
  if (l[16] !== claudeAiLimits.overageDisabledReason) {
    $e =
      ei &&
      !ve &&
      claudeAiLimits.overageDisabledReason === "org_level_disabled_until" &&
      isConsumerPlan() &&
      usageCreditsCommand.isEnabled();
    l[16] = claudeAiLimits.overageDisabledReason;
    l[17] = $e;
  } else $e = l[17];
  let ge = $e;
  let [Y, ft] = y(null);
  let Ji;
  if (l[18] !== claudeAiLimits.overageDisabledReason || l[19] !== context.credentials || l[20] !== ge) {
    Ji = () => {
      if (!ge) {
        return;
      }
      let ti = false;
      fetchPrepaidBalance(context.credentials)
        .then((prepaidBalance) => {
          if (ti || !prepaidBalance) {
            return;
          }
          if (
            isOrgLevelRejectionWithBalance({
              overageDisabledReason: claudeAiLimits.overageDisabledReason,
              balanceMinorUnits: prepaidBalance.amount,
            })
          )
            ft(prepaidBalance);
        })
        .catch(noop);
      return () => {
        ti = true;
      };
    };
    l[18] = claudeAiLimits.overageDisabledReason;
    l[19] = context.credentials;
    l[20] = ge;
    l[21] = Ji;
  } else Ji = l[21];
  let M;
  if (l[22] !== ge) {
    M = [ge];
    l[22] = ge;
    l[23] = M;
  } else M = l[23];
  P(Ji, M);
  let Ii;
  if (l[24] === MEMO_CACHE_SENTINEL) {
    Ii = ve && !isConsumerPlan();
    l[24] = Ii;
  } else Ii = l[24];
  let ii = Ii;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let Ni;
  if (l[25] !== claudeAiLimits.overageScope || l[26] !== isScreenReaderEnabled || l[27] !== upgradePaths) {
    Ni =
      ii &&
      isAutoResumeOfferEnabled(upgradePaths) &&
      !isBgSession() &&
      !isScreenReaderEnabled &&
      claudeAiLimits.overageScope !== "group_pool" &&
      getUsageCreditsFlowConfig()?.mode === "one_step";
    l[25] = claudeAiLimits.overageScope;
    l[26] = isScreenReaderEnabled;
    l[27] = upgradePaths;
    l[28] = Ni;
  } else Ni = l[28];
  let L = Ni;
  let [le, oi] = y(null);
  let Fe = R(null);
  let He = R(false);
  let Ke;
  let Wi;
  if (l[29] !== context.credentials || l[30] !== L) {
    Ke = () => {
      if (!L || He.current) {
        return;
      }
      He.current = true;
      runExtraUsage(
        {
          openInBrowser: false,
        },
        context.credentials,
      )
        .then((Xi) => {
          Fe.current = Date.now();
          oi(Xi);
        })
        .catch(noop_2);
    };
    Wi = [L, context.credentials];
    l[29] = context.credentials;
    l[30] = L;
    l[31] = Ke;
    l[32] = Wi;
  } else {
    Ke = l[31];
    Wi = l[32];
  }
  P(Ke, Wi);
  let Z = L && le?.type === "message" ? le.value : null;
  let [gt, Bi] = y(false);
  let $i = R(false);
  let Fi = R(false);
  let Hi = R(null);
  let hasBillingAccess = useInputClock();
  let Ki = R(null);
  let Qi = R(null);
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let Se;
  if (l[33] !== Z || l[34] !== upgradePaths || l[35] !== B) {
    Se = [];
    let fs = upgradePaths !== undefined;
    if (isAutoResumeOfferEnabled(upgradePaths)) {
      let so = qt ? "usage" : "usage credits";
      let Ue;
      if (ii) Ue = "Ask your admin for more usage";
      else {
        Ue = oo ? `Add funds to continue with ${so}` : `Switch to ${so}`;
        if (B !== undefined && !qt) Ue = `${Ue} \xB7 ${B}`;
      }
      let he;
      if (l[37] !== Z || l[38] !== Ue) {
        he =
          Z !== null
            ? {
                label: Z,
                value: "extra-usage",
                disabled: true,
              }
            : {
                label: Ue,
                value: "extra-usage",
              };
        l[37] = Z;
        l[38] = Ue;
        l[39] = he;
      } else he = l[39];
      Se.push(he);
    }
    if (
      fs
        ? upgradePaths.includes("upgrade_plan") && upgradeCommand.isEnabled()
        : !J && !ve && upgradeCommand.isEnabled()
    ) {
      let he;
      if (l[40] === MEMO_CACHE_SENTINEL) {
        he = {
          label: "Upgrade your plan",
          value: "upgrade",
        };
        l[40] = he;
      } else he = l[40];
      Se.push(he);
    }
    l[33] = Z;
    l[34] = upgradePaths;
    l[35] = B;
    l[36] = Se;
  } else Se = l[36];
  let he;
  if (l[41] === MEMO_CACHE_SENTINEL) {
    he = {
      label: qt ? "Stop" : "Stop and wait for limit to reset",
      value: "cancel",
    };
    l[41] = he;
  } else he = l[41];
  let ao = he;
  let lo;
  if (l[42] !== label || l[43] !== lt || l[44] !== Ie) {
    lo = Ie
      ? {
          label: "Don\u2019t continue automatically",
          value: "cancel-auto-resume",
        }
      : lt
        ? {
            label,
            value: "auto-resume",
          }
        : undefined;
    l[42] = label;
    l[43] = lt;
    l[44] = Ie;
    l[45] = lo;
  } else lo = l[45];
  let ri = lo;
  let K;
  if (l[46] !== ri || l[47] !== V || l[48] !== H || l[49] !== D || l[50] !== F || l[51] !== ae) {
    K = [];
    for (const [gs, hs] of overageOptionsSchema().parse(jsonParse(V))) {
      let found = LIMIT_CATEGORIES.find((bs) => bs === gs);
      if (found !== undefined)
        K.push({
          label: hs,
          value: `cedar-ember-${found}`,
        });
    }
    if (V === "[]" && H !== undefined) {
      let O;
      if (l[53] !== H) {
        O = {
          label: H,
          value: "cedar-ember-spent",
          disabled: true,
        };
        l[53] = H;
        l[54] = O;
      } else O = l[54];
      K.push(O);
    }
    if (F) {
      let O;
      if (l[55] === MEMO_CACHE_SENTINEL) {
        O = {
          label: getLimitResetCopy().label,
          value: "juniper-tide",
        };
        l[55] = O;
      } else O = l[55];
      K.push(O);
    } else if (D !== undefined) {
      let O;
      if (l[56] !== D) {
        O = {
          label: D,
          value: "juniper-tide-spent",
          disabled: true,
        };
        l[56] = D;
        l[57] = O;
      } else O = l[57];
      K.push(O);
    }
    if (ri) K.push(ri);
    if (ae) {
      let O;
      if (l[58] === MEMO_CACHE_SENTINEL) {
        O = {
          label: statusLineShouldDisplay().label,
          value: "low-priority",
        };
        l[58] = O;
      } else O = l[58];
      K.push(O);
    }
    l[46] = ri;
    l[47] = V;
    l[48] = H;
    l[49] = D;
    l[50] = F;
    l[51] = ae;
    l[52] = K;
  } else K = l[52];
  let O;
  if (l[59] !== Se || l[60] !== L || l[61] !== K) {
    O = ce && !L ? [...Se, ao, ...K] : [ao, ...K, ...Se];
    l[59] = Se;
    l[60] = L;
    l[61] = K;
    l[62] = O;
  } else O = l[62];
  let T = O;
  let mo;
  let co;
  if (l[63] !== T) {
    mo = () => {
      let joined = T.map(optionValue).join(" ");
      if (Qi.current !== null && Qi.current !== joined) Ki.current = Date.now();
      Qi.current = joined;
    };
    co = [T];
    l[63] = T;
    l[64] = mo;
    l[65] = co;
  } else {
    mo = l[64];
    co = l[65];
  }
  zt(mo, co);
  let fo;
  if (l[66] !== hasBillingAccess || l[67] !== noteRefused || l[68] !== refusedWithin) {
    fo = function Pe() {
      if (
        (Ki.current !== null && isWithinRecentInput(hasBillingAccess, Ki.current, RECENT_INPUT_GUARD_MS)) ||
        refusedWithin(RECENT_INPUT_GUARD_MS)
      ) {
        noteRefused();
        return true;
      }
      return false;
    };
    l[66] = hasBillingAccess;
    l[67] = noteRefused;
    l[68] = refusedWithin;
    l[69] = fo;
  } else fo = l[69];
  let Pe = fo;
  let go = R(false);
  let ho;
  let bo;
  if (l[70] !== claudeAiLimits || l[71] !== context.submittedFromComposer || l[72] !== T) {
    ho = () => {
      if (go.current) {
        return;
      }
      go.current = true;
      logEvent("tengu_rate_limit_options_menu_shown", {
        ...getRateLimitEventProps(claudeAiLimits),
        ...getCreditOfferForRateLimit(),
        entry: isFrozenMarker(context.submittedFromComposer) ? lit("typed") : lit("not_typed"),
        rows: T.map(enumOfOptionValue),
        blocked: isAutoResumableLimit(claudeAiLimits),
      });
    };
    bo = [claudeAiLimits, context.submittedFromComposer, T];
    l[70] = claudeAiLimits;
    l[71] = context.submittedFromComposer;
    l[72] = T;
    l[73] = ho;
    l[74] = bo;
  } else {
    ho = l[73];
    bo = l[74];
  }
  P(ho, bo);
  let Lo;
  let yo;
  if (l[75] !== claudeAiLimits || l[76] !== ae) {
    Lo = () => {
      if (ae) logLowPriorityShown(claudeAiLimits, "dialog");
    };
    yo = [ae, claudeAiLimits];
    l[75] = claudeAiLimits;
    l[76] = ae;
    l[77] = Lo;
    l[78] = yo;
  } else {
    Lo = l[77];
    yo = l[78];
  }
  P(Lo, yo);
  let Ao;
  let _o;
  if (l[79] !== claudeAiLimits || l[80] !== F) {
    Ao = () => {
      if (F) logLimitResetOfferShown(claudeAiLimits, "dialog");
    };
    _o = [F, claudeAiLimits];
    l[79] = claudeAiLimits;
    l[80] = F;
    l[81] = Ao;
    l[82] = _o;
  } else {
    Ao = l[81];
    _o = l[82];
  }
  P(Ao, _o);
  let wo;
  let xo;
  if (l[83] !== claudeAiLimits || l[84] !== Te) {
    wo = () => {
      if (Te) reportResetOfferShown(claudeAiLimits, "dialog");
    };
    xo = [Te, claudeAiLimits];
    l[83] = claudeAiLimits;
    l[84] = Te;
    l[85] = wo;
    l[86] = xo;
  } else {
    wo = l[85];
    xo = l[86];
  }
  P(wo, xo);
  let vo;
  if (l[87] !== T || l[88] !== B) {
    vo =
      B !== undefined &&
      T.some((Gi) => Gi.value === "extra-usage" && typeof Gi.label === "string" && Gi.label.includes(B));
    l[87] = T;
    l[88] = B;
    l[89] = vo;
  } else vo = l[89];
  let si = vo;
  let Co;
  let Do;
  if (l[90] !== si) {
    Co = () => {
      if (si) logCreditOfferShown("cli_menu");
    };
    Do = [si];
    l[90] = si;
    l[91] = Co;
    l[92] = Do;
  } else {
    Co = l[91];
    Do = l[92];
  }
  P(Co, Do);
  let Mo = R(false);
  let To;
  let Oo;
  if (l[93] !== claudeAiLimits || l[94] !== context.credentials || l[95] !== phase_2) {
    To = () => {
      if (Mo.current || phase_2 !== "failed") {
        return;
      }
      Mo.current = true;
      maybeOpenUsageCreditsDialog(claudeAiLimits, context.credentials);
    };
    Oo = [phase_2, claudeAiLimits, context.credentials];
    l[93] = claudeAiLimits;
    l[94] = context.credentials;
    l[95] = phase_2;
    l[96] = To;
    l[97] = Oo;
  } else {
    To = l[96];
    Oo = l[97];
  }
  P(To, Oo);
  let Uo = R(false);
  let Po = R(false);
  let Ro;
  let jo;
  if (l[98] !== phase_3 || l[99] !== claudeAiLimits || l[100] !== context.credentials) {
    Ro = () => {
      if (phase_3 === "failed") {
        if (Uo.current) {
          return;
        }
        Uo.current = true;
        refreshResetStatusForDialog(claudeAiLimits, context.credentials);
        return;
      }
      if (phase_3 === "answered" && !Po.current) {
        Po.current = true;
        refreshResetStatusForDialog(claudeAiLimits, context.credentials);
      }
    };
    jo = [phase_3, claudeAiLimits, context.credentials];
    l[98] = phase_3;
    l[99] = claudeAiLimits;
    l[100] = context.credentials;
    l[101] = Ro;
    l[102] = jo;
  } else {
    Ro = l[101];
    jo = l[102];
  }
  P(Ro, jo);
  let Eo = R(false);
  let Jo;
  let Io;
  if (l[103] !== claudeAiLimits || l[104] !== context.credentials || l[105] !== phase_4) {
    Jo = () => {
      if (Eo.current || phase_4 !== "failed") {
        return;
      }
      Eo.current = retryOfferPrompt(claudeAiLimits, context.credentials);
    };
    Io = [phase_4, claudeAiLimits, context.credentials];
    l[103] = claudeAiLimits;
    l[104] = context.credentials;
    l[105] = phase_4;
    l[106] = Jo;
    l[107] = Io;
  } else {
    Jo = l[106];
    Io = l[107];
  }
  P(Jo, Io);
  let ht;
  let bt;
  let Lt;
  let be;
  let At;
  let _t;
  let wt;
  let xt;
  if (
    l[108] !== Ce ||
    l[109] !== phase ||
    l[110] !== claudeAiLimits ||
    l[111] !== context ||
    l[112] !== onDone ||
    l[113] !== storageV5
  ) {
    ht = function ht() {
      logEvent("tengu_rate_limit_options_menu_select_auto_resume", {});
      let vt = currentLimitsOrLatest(claudeAiLimits, Ce);
      if (vt === null || !armQuotaAutoResumeFromDialog(vt, Date.now(), "dialog", storageV5)) {
        ai();
        return;
      }
      let { confirmationPhrase } = getWaitOptionLabel(
        vt.resetsAt,
        vt.resetsAt !== undefined && vt.resetsAt * 1000 <= Date.now(),
      );
      onDone(
        `Claude Code will continue automatically ${confirmationPhrase}. Keep this session open; it may still pause for permission prompts. Press esc to cancel the wait.`,
      );
    };
    let Ct;
    if (l[122] !== onDone) {
      Ct = function _t() {
        logEvent("tengu_rate_limit_options_menu_select_low_priority", {});
        let No = enableLowPriorityMode("dialog");
        if (No === "unavailable") {
          onDone(lowPriorityUnavailableMessage());
          return;
        }
        onDone(lowPriorityOnMessage(No));
      };
      l[122] = onDone;
      l[123] = Ct;
    } else Ct = l[123];
    _t = Ct;
    let f;
    if (l[124] !== context.credentials || l[125] !== onDone) {
      f = function At() {
        logEvent("tengu_rate_limit_options_menu_select_juniper_tide", {});
        Ei(true);
        checkUsageCredits("dialog", context.credentials)
          .then((ys) => {
            onDone(ys.text);
          })
          .catch(() => {
            onDone(getLimitResetCopy().unavailableLine);
          });
      };
      l[124] = context.credentials;
      l[125] = onDone;
      l[126] = f;
    } else f = l[126];
    At = f;
    let q;
    if (l[127] !== context.credentials || l[128] !== onDone) {
      q = function Lt(As) {
        if (G.current) {
          return;
        }
        G.current = true;
        logEvent("tengu_rate_limit_options_menu_select_cedar_ember", {});
        We(true);
        startResetFlowSafe("dialog", context.credentials, As)
          .then((resetFlow) => {
            if (Xe.current) {
              return;
            }
            switch (resetFlow.kind) {
              case "answer": {
                onDone(resetFlow.result.text);
                return;
              }
              case "confirm": {
                me(
                  jsxProd_default(ResetLimits, {
                    offer: resetFlow.offer,
                    entry: "dialog",
                    credentials: context.credentials,
                    onDone: (_s) => onDone(_s.text),
                  }),
                );
                return;
              }
              case "choose": {
                me(
                  jsxProd_default(ResetLimitsOffers, {
                    offers: resetFlow.offers,
                    unusable: resetFlow.unusable,
                    entry: "dialog",
                    credentials: context.credentials,
                    onDone: (ws) => onDone(ws.text),
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
      l[127] = context.credentials;
      l[128] = onDone;
      l[129] = q;
    } else q = l[129];
    Lt = q;
    let ee;
    if (l[130] !== context || l[131] !== onDone) {
      ee = function wt(xs) {
        context.cancelRateLimitAutoQueueContinue?.();
        logEvent("tengu_rate_limit_options_menu_select_extra_usage", getCreditOfferForRateLimit());
        Bi(true);
        fileAdminLimitRequest(xs, context.credentials)
          .then((Wo) => {
            logEvent("tengu_rate_limit_options_menu_admin_ask", {
              filed: Wo.filed,
              mode: lit("one_step"),
            });
            withQuotaResumeFire(onDone)(Wo.value);
          })
          .catch(() => {
            onDone();
          });
      };
      l[130] = context;
      l[131] = onDone;
      l[132] = ee;
    } else ee = l[132];
    wt = ee;
    let qe;
    if (l[133] !== onDone) {
      qe = function Dt() {
        cancelQuotaAutoResume("dialog");
        onDone(
          "Automatic continue cancelled. Your session will wait for you instead; /rate-limit-options can arm it again.",
        );
      };
      l[133] = onDone;
      l[134] = qe;
    } else qe = l[134];
    let Dt = qe;
    let Re;
    if (l[135] !== Dt) {
      Re = function bt() {
        logEvent("tengu_rate_limit_options_menu_cancel_auto_resume", {});
        Dt();
      };
      l[135] = Dt;
      l[136] = Re;
    } else Re = l[136];
    bt = Re;
    xt = function xt() {
      logEvent("tengu_rate_limit_options_menu_cancel", {});
      if (hasPendingContinuation() || phase === "stale") {
        Dt();
        return;
      }
      ai();
    };
    be = function be() {
      logEvent("tengu_rate_limit_options_menu_cancel", {});
      ai();
    };
    function ai() {
      context.prefillRateLimitAutoQueueContinue?.();
      onDone(undefined, {
        display: "skip",
      });
    }
    l[108] = Ce;
    l[109] = phase;
    l[110] = claudeAiLimits;
    l[111] = context;
    l[112] = onDone;
    l[113] = storageV5;
    l[114] = ht;
    l[115] = bt;
    l[116] = Lt;
    l[117] = be;
    l[118] = At;
    l[119] = _t;
    l[120] = wt;
    l[121] = xt;
  } else {
    ht = l[114];
    bt = l[115];
    Lt = l[116];
    be = l[117];
    At = l[118];
    _t = l[119];
    wt = l[120];
    xt = l[121];
  }
  let Ct;
  if (
    l[137] !== le ||
    l[138] !== context ||
    l[139] !== ht ||
    l[140] !== bt ||
    l[141] !== Lt ||
    l[142] !== At ||
    l[143] !== _t ||
    l[144] !== wt ||
    l[145] !== xt ||
    l[146] !== hasBillingAccess ||
    l[147] !== onDone ||
    l[148] !== L ||
    l[149] !== Pe
  ) {
    Ct = function li(value) {
      if (Pe()) {
        return;
      }
      if (value === "extra-usage" && L) {
        if ($i.current) {
          return;
        }
        $i.current = true;
      }
      if (
        value === "extra-usage" &&
        L &&
        !Fi.current &&
        le?.type === "confirm-admin-request" &&
        le.checked &&
        Hi.current !== null &&
        Fe.current !== null &&
        hasBillingAccess() - Math.max(Hi.current, Fe.current) >= RECENT_INPUT_GUARD_MS
      ) {
        wt(le.extraUsage);
        return;
      }
      if (isUpgradeOption(value)) context.cancelRateLimitAutoQueueContinue?.();
      if (value === "upgrade") {
        logEvent("tengu_rate_limit_options_menu_select_upgrade", {});
        callUpgradeFromSurface(onDone, context, "rate_limit_options_menu").then((jsx) => {
          if (jsx) me(jsx);
        });
      } else if (value === "extra-usage") {
        logEvent("tengu_rate_limit_options_menu_select_extra_usage", getCreditOfferForRateLimit());
        call_2(onDone, context).then((jsx_0) => {
          if (jsx_0) me(jsx_0);
        });
      } else if (value === "auto-resume") ht();
      else if (value === "cancel-auto-resume") bt();
      else if (value === "low-priority") _t();
      else if (value === "juniper-tide") At();
      else if (value.startsWith("cedar-ember-")) {
        let found = LIMIT_CATEGORIES.find((vs) => value === `cedar-ember-${vs}`);
        if (found !== undefined) Lt(found);
      } else if (value === "cancel") xt();
    };
    l[137] = le;
    l[138] = context;
    l[139] = ht;
    l[140] = bt;
    l[141] = Lt;
    l[142] = At;
    l[143] = _t;
    l[144] = wt;
    l[145] = xt;
    l[146] = hasBillingAccess;
    l[147] = onDone;
    l[148] = L;
    l[149] = Pe;
    l[150] = Ct;
  } else Ct = l[150];
  let onChange = Ct;
  if (g) {
    return g;
  }
  if (ro) {
    let onCancel;
    if (l[151] !== be) {
      onCancel = () => {
        Xe.current = true;
        be();
      };
      l[151] = be;
      l[152] = onCancel;
    } else onCancel = l[152];
    let children;
    if (l[153] === MEMO_CACHE_SENTINEL) {
      children = jsxProd_default(Text, {
        dimColor: true,
        children: CHECKING_FOR_RESET_LINE,
      });
      l[153] = children;
    } else children = l[153];
    let ee;
    if (l[154] !== onCancel) {
      ee = jsxProd_default(Dialog, {
        title: "What do you want to do?",
        onCancel,
        color: "suggestion",
        children,
      });
      l[154] = onCancel;
      l[155] = ee;
    } else ee = l[155];
    return ee;
  }
  if (Zt) {
    let f;
    if (l[156] === MEMO_CACHE_SENTINEL) {
      f = jsxProd_default(Dialog, {
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
      l[156] = f;
    } else f = l[156];
    return f;
  }
  if (gt) {
    let f;
    if (l[157] === MEMO_CACHE_SENTINEL) {
      f = jsxProd_default(Dialog, {
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
      l[157] = f;
    } else f = l[157];
    return f;
  }
  if (Y) {
    let onDone_2;
    if (l[158] !== onDone) {
      onDone_2 = withQuotaResumeFire(onDone);
      l[158] = onDone;
      l[159] = onDone_2;
    } else onDone_2 = l[159];
    let q;
    if (l[160] !== context || l[161] !== Y || l[162] !== onDone_2) {
      q = jsxProd_default(RateLimitOptionsMenu, {
        balance: Y,
        onDone: onDone_2,
        context,
      });
      l[160] = context;
      l[161] = Y;
      l[162] = onDone_2;
      l[163] = q;
    } else q = l[163];
    return q;
  }
  let onKeyDownCapture;
  let onPasteCapture;
  if (l[164] === MEMO_CACHE_SENTINEL) {
    onKeyDownCapture = (Mt) => {
      if (!Mt.ctrl && !Mt.meta && (Mt.key.length === 1 || (Mt.key.length > 1 && Mt.name === "")))
        Fi.current = true;
    };
    onPasteCapture = () => {
      Fi.current = true;
    };
    l[164] = onKeyDownCapture;
    l[165] = onPasteCapture;
  } else {
    onKeyDownCapture = l[164];
    onPasteCapture = l[165];
  }
  let onFocus;
  if (l[166] !== L) {
    onFocus = (Cs) => {
      Hi.current = Cs === "extra-usage" && L ? Date.now() : null;
    };
    l[166] = L;
    l[167] = onFocus;
  } else onFocus = l[167];
  const onUpFromFirstItem = L ? noop_5 : undefined;
  let children;
  if (
    l[168] !== onChange ||
    l[169] !== T ||
    l[170] !== Pe ||
    l[171] !== onFocus ||
    l[172] !== onUpFromFirstItem
  ) {
    children = jsxProd_default(Box, {
      flexDirection: "column",
      onKeyDownCapture,
      onPasteCapture,
      children: jsxProd_default(ModelSelector, {
        options: T,
        onChange,
        refuseInput: Pe,
        selectedValue: NO_COMMITTED_ROW,
        onFocus,
        onUpFromFirstItem,
        visibleOptionCount: T.length,
      }),
    });
    l[168] = onChange;
    l[169] = T;
    l[170] = Pe;
    l[171] = onFocus;
    l[172] = onUpFromFirstItem;
    l[173] = children;
  } else children = l[173];
  let Fo;
  if (l[174] !== be || l[175] !== children) {
    Fo = jsxProd_default(Dialog, {
      title: "What do you want to do?",
      onCancel: be,
      color: "suggestion",
      children,
    });
    l[174] = be;
    l[175] = children;
    l[176] = Fo;
  } else Fo = l[176];
  return Fo;
}
//@ chunk-dg94x42s.js:37678-38028 layout
function getWaitOptionLabel(resetsAt, d) {
  if (d)
    return {
      label: "Wait here, then continue automatically shortly",
      confirmationPhrase: "shortly",
    };
  let t = formatResetTime(resetsAt);
  if (t)
    return {
      label: `Wait here, then continue automatically at ${t}`,
      confirmationPhrase: `at ${t}`,
    };
  return {
    label: "Wait here, then continue automatically when the limit resets",
    confirmationPhrase: "when your usage limit resets",
  };
}
//@ chunk-dg94x42s.js:38028-38095 layout
function currentLimitsOrLatest(claudeAiLimits, d) {
  if (canAutoResumeThisLimit(claudeAiLimits)) return claudeAiLimits;
  return d !== null && canAutoResumeThisLimit(d) ? d : null;
}
//@ chunk-dg94x42s.js:38095-38152 callgraph-fingerprint = call (1)
/**
 * /rate-limit-options 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call(onDone, context) {
  return jsxProd_default(RateLimitOptionsMenu_2, {
    onDone,
    context,
  });
}
