/**
 * components/rateLimit/usageCreditsOffer.tsx
 *
 * 2.1.316 新增：检查用量额度的实际逻辑；把文本中的标记替换为可点击链接等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fm6h4dv7.js (24)
 * attribution: placement 24
 */
import {
  answeredStatusForWall,
  currentResetFlowState,
  isFlowForWall,
  MAX_STATUS_ATTEMPTS,
  setResetFlowState,
  fetchJuniperTideStatus,
  STATUS_RETRY_DELAY_MS,
  getResetFlowPhase,
  isFailedForWall,
  canArmLowPriorityReset,
  claimJuniperTide,
  STATUS_REQUEST_TIMEOUT_MS,
} from "../../services/rateLimit/rateLimitWall.js";
import {
  isFiveHourAutoResumable,
  currentSubscriptionTier,
  enqueueAutoContinuation,
} from "../../services/rateLimitContinuation.js";
import {
  isLimitResetEnabled,
  fillDatePlaceholder,
  getLimitResetCopy,
  limitResetConfigVersion,
  limitResetAutoContinue,
} from "../../commands/limit-reset/index.js";
import { formatResetTimeWithLocale, truncateToWidth } from "../../utils/format.js";
import {
  getLimitsAccountEpoch,
  getCurrentLimits,
  forgetHeldWindows,
  emitLimitsStatusChange,
  probeQuotaStatusAtStart,
} from "../../services/claudeAiLimits.js";
import {
  isQuotaAutoResumeArmed,
  cancelQuotaAutoResume,
  confirmAndFire,
  isConversationResetSwitch,
} from "../../services/quotaAutoResume/quotaAutoResume.js";
import { withDeadline } from "../../utils/sleep.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { isLowPriorityActive, endLowPriority } from "../../services/lowPriority/lowPriorityMode.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { onSessionSwitch } from "../../bootstrap/state.js";
import { CIRCLE_MARK_GLYPH } from "../../constants/figures.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import {
  SAFEGUARDS_MODEL_ARTICLE_URL,
  SAFEGUARDS_DEFAULT_ARTICLE_URL,
  CYBER_SAFEGUARDS_ARTICLE_URL,
} from "../../services/api/refusalFallback.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useFallbackPermission } from "../permissions/FallbackPermissionRequest.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { LinkifiedText as LinkifiedText_2 } from "../LinkifiedText.js";
import { Text, Link } from "../../ink/components/Text.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fm6h4dv7.js:40379-40615 placement
/**
 * 用量额度已花完时给出下次可用时间说明。
 */
function usageCreditsSpentLine(wall, now = Date.now()) {
  let status = answeredStatusForWall(wall);
  if (
    !isFiveHourAutoResumable(wall) ||
    status === undefined ||
    status === null ||
    status.arm !== "reset" ||
    status.available ||
    status.nextAvailableAt === null ||
    wall.resetsAt === undefined ||
    wall.resetsAt * 1000 <= now ||
    !isLimitResetEnabled()
  )
    return;
  return fillDatePlaceholder(getLimitResetCopy().spentLine, formatIsoResetTime(status.nextAvailableAt));
}
//@ chunk-fm6h4dv7.js:40615-40734 placement
function formatIsoResetTime(nextAvailableAt) {
  if (nextAvailableAt === null) return;
  let timestamp = Date.parse(nextAvailableAt);
  return Number.isFinite(timestamp)
    ? formatResetTimeWithLocale(Math.floor(timestamp / 1000), false, true, true)
    : undefined;
}
//@ chunk-fm6h4dv7.js:40734-40852 placement
/**
 * 撞到可重置的限额墙时（功能开启且该墙符合条件），记下可继续的重置时间并异步查询用量额度/重置是否可用。
 */
function offerUsageCreditsAtWall(quotaLimits, credentials) {
  if (!isLimitResetEnabled() || !isFiveHourAutoResumable(quotaLimits)) return;
  let flow = currentResetFlowState();
  subscribeSessionSwitchReset(flow);
  flow.continuableWallResetsAt = quotaLimits.resetsAt ?? null;
  askUsageCreditsAvailability(quotaLimits, credentials, "wall");
}
//@ chunk-fm6h4dv7.js:40852-41598 placement
/**
 * 询问服务端用量额度是否可用（按阶段去重）。
 */
function askUsageCreditsAvailability(limits, credentials, signal) {
  if (!isLimitResetEnabled() || !isFiveHourAutoResumable(limits)) return Promise.resolve();
  let resetsAt = limits.resetsAt;
  if (resetsAt === undefined) return Promise.resolve();
  let flow = currentResetFlowState();
  let accountEpoch = getLimitsAccountEpoch();
  let state = flow.state;
  let failures = 0;
  if (state.phase !== "idle" && isFlowForWall(state, limits))
    switch (state.phase) {
      case "answered":
        return Promise.resolve();
      case "asking":
        return flow.pendingAsk ?? Promise.resolve();
      case "failed":
        if (signal === "wall" && state.failures >= MAX_STATUS_ATTEMPTS) return Promise.resolve();
        failures = state.failures;
    }
  setResetFlowState({
    phase: "asking",
    wallResetsAt: resetsAt,
    accountEpoch,
  });
  let autoArmed = isQuotaAutoResumeArmed();
  let request = withDeadline(fetchJuniperTideStatus(credentials), STATUS_RETRY_DELAY_MS)
    .then((result) => {
      settleUsageCreditsAsk({
        wallResetsAt: resetsAt,
        accountEpoch,
        failures,
        result: result ?? {
          kind: "failed",
        },
        autoArmed,
      });
    })
    .catch((error) => {
      logError(toError(error));
      try {
        settleUsageCreditsAsk({
          wallResetsAt: resetsAt,
          accountEpoch,
          failures,
          result: {
            kind: "failed",
          },
          autoArmed,
        });
      } catch (error) {
        logError(toError(error));
      }
    })
    .finally(() => {
      if (flow.pendingAsk === request) flow.pendingAsk = null;
    });
  flow.pendingAsk = request;
  return request;
}
//@ chunk-fm6h4dv7.js:41598-42664 placement
/**
 * 处理额度询问结果并更新状态。
 */
function settleUsageCreditsAsk({ wallResetsAt, accountEpoch, failures, result, autoArmed }) {
  let resetFlowPhase = getResetFlowPhase();
  if (
    resetFlowPhase.phase !== "asking" ||
    resetFlowPhase.wallResetsAt !== wallResetsAt ||
    resetFlowPhase.accountEpoch !== accountEpoch
  )
    return;
  let status = result.kind === "answered" ? result.status : null;
  if (result.kind === "failed")
    setResetFlowState({
      phase: "failed",
      wallResetsAt,
      accountEpoch,
      failures: failures + 1,
    });
  else
    setResetFlowState({
      phase: "answered",
      wallResetsAt,
      accountEpoch,
      status,
    });
  logEvent("tengu_juniper_tide_asked", {
    outcome: fromEnum(result.kind === "answered" ? (status === null ? "absent" : "block") : result.kind),
    attempt: failures + 1,
    eligible: status?.eligible ?? false,
    ineligible_reason: fromEnumOpt(status?.ineligibleReason) ?? undefined,
    config_version: limitResetConfigVersion(),
  });
  if (status === null || !status.eligible) return;
  logEvent("tengu_juniper_tide_wall", {
    in_experiment: status.inExperiment,
    arm: fromEnumOpt(status.arm) ?? undefined,
    available: status.available,
    tier: fromEnum(currentSubscriptionTier()),
    auto_armed: autoArmed,
    low_priority_active: isLowPriorityActive(),
    config_version: limitResetConfigVersion(),
    surface: fromEnumOpt(status.eventProps?.surface) ?? undefined,
    server_tier: fromEnumOpt(status.eventProps?.tier) ?? undefined,
    tenure_bucket: fromEnumOpt(status.eventProps?.tenureBucket) ?? undefined,
    billing_path: fromEnumOpt(status.eventProps?.billingPath) ?? undefined,
    billing_period: fromEnumOpt(status.eventProps?.billingPeriod) ?? undefined,
    extra_usage_state: fromEnumOpt(status.eventProps?.extraUsageState) ?? undefined,
  });
}
//@ chunk-fm6h4dv7.js:42664-42878 placement
/**
 * 每个重置时间只打点一次 tengu_juniper_tide_shown（5 小时限额重置提示），附带实验分组、展示位置与配置版本。
 */
function logLimitResetOfferShown(wall, now) {
  let resetsAt = wall.resetsAt ?? null;
  let flow = currentResetFlowState();
  if (resetsAt === null || flow.shownWallResetsAt === resetsAt) return;
  flow.shownWallResetsAt = resetsAt;
  let status = answeredStatusForWall(wall);
  logEvent("tengu_juniper_tide_shown", {
    arm: fromEnumOpt(status?.arm) ?? undefined,
    surface: fromEnum(now),
    config_version: limitResetConfigVersion(),
  });
}
//@ chunk-fm6h4dv7.js:42878-42922 placement
/**
 * 函数 maybeOpenUsageCreditsDialog（满足条件时打开对话框）。
 */
function maybeOpenUsageCreditsDialog(claudeAiLimits, credentials) {
  if (isFailedForWall(claudeAiLimits)) askUsageCreditsAvailability(claudeAiLimits, credentials, "dialog");
}
//@ chunk-fm6h4dv7.js:42922-43047 placement
/**
 * 检查用量额度（出错时返回 unavailable）。
 */
async function checkUsageCredits(entry, credentials) {
  try {
    return await checkUsageCreditsUnsafe(entry, credentials);
  } catch (error) {
    logError(toError(error));
    return {
      outcome: "unavailable",
      text: getLimitResetCopy().unavailableLine,
    };
  }
}
//@ chunk-fm6h4dv7.js:43047-44741 placement
/**
 * 检查用量额度的实际逻辑。
 */
async function checkUsageCreditsUnsafe(entry, credentials) {
  let flow = currentResetFlowState();
  let limitResetCopy = getLimitResetCopy();
  if (answeredStatusForWall(getCurrentLimits()) === undefined) {
    let hasPendingAsk = flow.pendingAsk !== null;
    await askUsageCreditsAvailability(getCurrentLimits(), credentials, entry);
    if (hasPendingAsk && isFailedForWall(getCurrentLimits()))
      await askUsageCreditsAvailability(getCurrentLimits(), credentials, entry);
  }
  let currentLimits = getCurrentLimits();
  if (!canArmLowPriorityReset(currentLimits) || currentLimits.resetsAt === undefined) {
    let spentLine = usageCreditsSpentLine(currentLimits);
    if (spentLine !== undefined)
      return {
        outcome: "spent",
        text: spentLine,
      };
    return isFailedForWall(currentLimits)
      ? {
          outcome: "unavailable",
          text: limitResetCopy.unavailableLine,
        }
      : {
          outcome: "not_offered",
          text: RESET_UNAVAILABLE_TEXT,
        };
  }
  if (flow.claiming)
    return {
      outcome: "unavailable",
      text: RESET_IN_PROGRESS_TEXT,
    };
  let resetsAt = currentLimits.resetsAt;
  let configVersion = limitResetConfigVersion();
  logEvent("tengu_juniper_tide_selected", {
    entry: fromEnum(entry),
    auto_armed: isQuotaAutoResumeArmed(),
    config_version: configVersion,
  });
  let now = Date.now();
  let result;
  flow.claiming = true;
  try {
    result = (await withDeadline(claimJuniperTide(credentials), STATUS_REQUEST_TIMEOUT_MS)) ?? {
      result: "error",
      nextAvailableAt: null,
    };
  } finally {
    flow.claiming = false;
  }
  switch (
    (logEvent("tengu_juniper_tide_result", {
      result: fromEnum(result.result),
      entry: fromEnum(entry),
      latency_ms: Date.now() - now,
      config_version: configVersion,
    }),
    result.result)
  ) {
    case "reset":
    case "not_limited":
    case "already_used":
    case "ineligible":
      logFeatureOk("juniper_tide");
      break;
    case "unavailable":
    case "rate_limited":
    case "auth_error":
    case "error":
      logFeatureSad("juniper_tide", result.result);
      break;
  }
  switch (result.result) {
    case "reset":
    case "not_limited": {
      flow.unsettledClaimWallResetsAt = null;
      let notice = limitResetAutoContinue() && flow.continuableWallResetsAt === resetsAt;
      flow.continuableWallResetsAt = null;
      applyFiveHourResetLocally(flow, resetsAt, entry, notice);
      let successLine = fillDatePlaceholder(
        limitResetCopy.successLine,
        result.result === "reset" ? formatIsoResetTime(result.nextAvailableAt) : undefined,
      );
      return {
        outcome: "reset",
        text: notice ? successLine : `${successLine} \xB7 send a message to continue`,
      };
    }
    case "already_used": {
      markResetUnavailable(resetsAt, result.nextAvailableAt);
      if (flow.unsettledClaimWallResetsAt === resetsAt) {
        flow.unsettledClaimWallResetsAt = null;
        openUsageCreditsOffer(credentials);
      }
      return {
        outcome: "spent",
        text: fillDatePlaceholder(limitResetCopy.spentLine, formatIsoResetTime(result.nextAvailableAt)),
      };
    }
    case "ineligible":
      markResetIneligible(resetsAt);
      return {
        outcome: "not_offered",
        text: RESET_UNAVAILABLE_TEXT,
      };
    case "auth_error":
      return {
        outcome: "unavailable",
        text: RESET_LOGIN_FAILED_TEXT,
      };
    case "unavailable":
    case "rate_limited":
    case "error":
      if (result.result === "error") flow.unsettledClaimWallResetsAt = resetsAt;
      return {
        outcome: "unavailable",
        text: limitResetCopy.unavailableLine,
      };
  }
}
//@ chunk-fm6h4dv7.js:44741-44946 placement
var RESET_UNAVAILABLE_TEXT = "A 5-hour limit reset isn't available right now.";
var RESET_IN_PROGRESS_TEXT = "Your 5-hour limit is already being reset \xB7 one moment";
var RESET_LOGIN_FAILED_TEXT =
  "Couldn't reset your 5-hour limit with this login \xB7 run /login, then try again";
//@ chunk-fm6h4dv7.js:44946-45202 placement
/**
 * 5 小时限额重置成功后的本地收尾：取消额度自动继续、记录、把被拒的 five_hour 状态改回 allowed、复位提示状态、必要时刷新、发出 reset 事件；每步单独 try/catch。
 */
function applyFiveHourResetLocally(wall, resetsAt, entry, creditEntry) {
  let steps = [
    () => cancelQuotaAutoResume("juniper_tide"),
    () => {
      endLowPriority("reset");
    },
    () => clearFiveHourRejection(resetsAt),
    () => {
      let resetFlowPhase = getResetFlowPhase();
      if (resetFlowPhase.phase !== "idle" && resetFlowPhase.wallResetsAt === resetsAt)
        setResetFlowState({
          phase: "idle",
        });
    },
    () => {
      if (creditEntry) enqueueAutoContinuation();
    },
    () =>
      wall.events.emit({
        type: "reset",
        entry,
      }),
  ];
  for (let step of steps)
    try {
      step();
    } catch (error) {
      logError(toError(error));
    }
}
//@ chunk-fm6h4dv7.js:45202-45392 placement
function clearFiveHourRejection(resetsAt) {
  forgetHeldWindows(["five_hour"]);
  let currentLimits = getCurrentLimits();
  if (
    currentLimits.status !== "rejected" ||
    currentLimits.rateLimitType !== "five_hour" ||
    currentLimits.resetsAt !== resetsAt
  )
    return;
  emitLimitsStatusChange({
    ...currentLimits,
    status: "allowed",
    rateLimitType: undefined,
    resetsAt: undefined,
  });
}
//@ chunk-fm6h4dv7.js:45392-45465 placement
function openUsageCreditsOffer(wall) {
  if (isQuotaAutoResumeArmed()) {
    confirmAndFire();
    return;
  }
  probeQuotaStatusAtStart(wall, undefined).catch((error) => {
    logError(toError(error));
  });
}
//@ chunk-fm6h4dv7.js:45465-45650 placement
function markResetUnavailable(resetsAt, nextAvailableAt) {
  let resetFlowPhase = getResetFlowPhase();
  if (
    resetFlowPhase.phase !== "answered" ||
    resetFlowPhase.wallResetsAt !== resetsAt ||
    resetFlowPhase.status === null
  )
    return;
  setResetFlowState({
    ...resetFlowPhase,
    status: {
      ...resetFlowPhase.status,
      available: false,
      nextAvailableAt: nextAvailableAt ?? resetFlowPhase.status.nextAvailableAt,
    },
  });
}
//@ chunk-fm6h4dv7.js:45650-45801 placement
function markResetIneligible(resetsAt) {
  let resetFlowPhase = getResetFlowPhase();
  if (
    resetFlowPhase.phase !== "answered" ||
    resetFlowPhase.wallResetsAt !== resetsAt ||
    resetFlowPhase.status === null
  )
    return;
  setResetFlowState({
    ...resetFlowPhase,
    status: {
      ...resetFlowPhase.status,
      eligible: false,
      available: false,
    },
  });
}
//@ chunk-fm6h4dv7.js:45801-45935 placement
function subscribeSessionSwitchReset(wall) {
  if (wall.sessionSwitchSubscribed) return;
  wall.sessionSwitchSubscribed = true;
  onSessionSwitch((conversation, switchKind) => {
    if (isConversationResetSwitch(switchKind)) wall.continuableWallResetsAt = null;
  });
}
//@ chunk-fm6h4dv7.js:45935-46054 placement
/**
 * 会话状态短语常量（running / waiting for a prompt / waiting）、分隔符、8 位短 id 正则与长度上限。
 */
var SESSION_RUNNING_LABEL = "session running";
var SESSION_WAITING_PROMPT_LABEL = "session waiting for a prompt";
var SESSION_WAITING_LABEL = "session waiting";
var MIDDOT_SEPARATOR = " \xB7 ";
var SHORT_ID_RE = /^[0-9a-f]{8}$/;
var MIN_SESSION_NAME_CHARS = 20;
//@ chunk-fm6h4dv7.js:46054-46209 placement
/**
 * 按分隔符拆分状态文字、去掉空段，第一段之后的各段用 " · " 重新连接。
 */
function normalizeStatusSegments(label) {
  let filtered = label
    .split(CIRCLE_MARK_GLYPH)
    .map((state) => state.trim())
    .filter(Boolean);
  if (filtered.length === 0) return;
  let [first, ...rest] = filtered;
  return rest.length === 0 ? first : `${first} ${CIRCLE_MARK_GLYPH} ${rest.join(MIDDOT_SEPARATOR)}`;
}
//@ chunk-fm6h4dv7.js:46209-46554 placement
/**
 * 解析限额标签字符串。
 */
function parseRateLimitLabel(label) {
  if (!label.startsWith(SESSION_RUNNING_LABEL) && !label.startsWith(SESSION_WAITING_PROMPT_LABEL))
    return null;
  if (
    label.includes(`
`)
  )
    return null;
  let parts = label.split(MIDDOT_SEPARATOR);
  let runningPart = parts[0];
  if (runningPart !== SESSION_RUNNING_LABEL && runningPart !== SESSION_WAITING_PROMPT_LABEL) return null;
  let lastIndex = parts.findLastIndex((part) => SHORT_ID_RE.test(part));
  let id = lastIndex === -1 ? undefined : parts[lastIndex];
  let idEnd = lastIndex === -1 ? parts.length : lastIndex;
  let sliced = parts.slice(1, idEnd);
  let name = sliced.length > 0 ? sliced.join(MIDDOT_SEPARATOR) : undefined;
  let chips = lastIndex === -1 ? [] : parts.slice(lastIndex + 1);
  return {
    state: runningPart,
    name,
    id,
    chips,
  };
}
//@ chunk-fm6h4dv7.js:46554-46927 placement
/**
 * 按宽度逐步缩短限额标签。
 */
function fitRateLimitLabel(fields, maxWidth, dropChips = true) {
  let labelWidth = (fields) => bunStringWidth(offerDedupeKey(fields));
  let fitted = {
    ...fields,
    chips: [...fields.chips],
  };
  if (labelWidth(fitted) <= maxWidth) return fitted;
  if (fitted.state === SESSION_WAITING_PROMPT_LABEL) {
    fitted = {
      ...fitted,
      state: SESSION_WAITING_LABEL,
    };
    if (labelWidth(fitted) <= maxWidth) return fitted;
  }
  if (fitted.id !== undefined && fitted.name !== undefined && dropChips) {
    fitted = {
      ...fitted,
      id: undefined,
    };
    if (labelWidth(fitted) <= maxWidth) return fitted;
  }
  if (fitted.name !== undefined) {
    let nameWidth = labelWidth({
      ...fitted,
      name: undefined,
    });
    let remainingWidth = maxWidth - nameWidth - bunStringWidth(MIDDOT_SEPARATOR);
    let fittedNameWidth = bunStringWidth(fitted.name);
    let chipsWidth =
      fittedNameWidth > MIN_SESSION_NAME_CHARS
        ? Math.max(remainingWidth, MIN_SESSION_NAME_CHARS)
        : remainingWidth;
    if (chipsWidth >= 1 && chipsWidth < fittedNameWidth)
      fitted = {
        ...fitted,
        name: truncateToWidth(fitted.name, chipsWidth),
      };
  }
  return fitted;
}
//@ chunk-fm6h4dv7.js:46927-47019 placement
/**
 * 函数 offerDedupeKey（按状态/名/id/标签拼键）。
 */
function offerDedupeKey(label) {
  return [
    label.state,
    ...(label.name ? [label.name] : []),
    ...(label.id ? [label.id] : []),
    ...label.chips,
  ].join(MIDDOT_SEPARATOR);
}
//@ chunk-fm6h4dv7.js:47019-47063 placement
function hasIndex(field) {
  let { index } = field;
  return index !== -1;
}
//@ chunk-fm6h4dv7.js:47063-47130 placement
var mapped; // deferred: uses CYBER_SAFEGUARDS_ARTICLE_URL (../../services/api/refusalFallback.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fm6h4dv7.js:47063", () => {
  mapped = [SAFEGUARDS_MODEL_ARTICLE_URL, SAFEGUARDS_DEFAULT_ARTICLE_URL, CYBER_SAFEGUARDS_ARTICLE_URL].map(
    (url) => ({
      url,
      marker: `learn more: ${url}`,
    }),
  );
});
//@ chunk-fm6h4dv7.js:47130-48311 placement
/**
 * 把文本中的标记替换为可点击链接。
 */
function LinkifiedText(props) {
  let $ = useMemoCache(33);
  let { children, color, bold } = props;
  let fallbackPermission = useFallbackPermission();
  let textComponent;
  let foundLink;
  let color_2;
  let bold_2;
  let beforeText;
  let result;
  if ($[0] !== bold || $[1] !== children || $[2] !== color || $[3] !== fallbackPermission) {
    result = EARLY_RETURN_SENTINEL;
    Fe: {
      let locateMarker;
      if ($[10] !== children) {
        locateMarker = (link) => {
          let { url, marker } = link;
          return {
            url,
            marker,
            index: children.indexOf(marker),
          };
        };
        $[10] = children;
        $[11] = locateMarker;
      } else locateMarker = $[11];
      foundLink = mapped.map(locateMarker).find(hasIndex);
      if (!fallbackPermission || foundLink === undefined) {
        let plainText;
        if ($[12] !== bold || $[13] !== children || $[14] !== color) {
          plainText = jsxProd_default(LinkifiedText_2, {
            color,
            bold,
            children,
          });
          $[12] = bold;
          $[13] = children;
          $[14] = color;
          $[15] = plainText;
        } else plainText = $[15];
        result = plainText;
        break Fe;
      }
      textComponent = Text;
      color_2 = color;
      bold_2 = bold;
      beforeText = children.slice(0, foundLink.index);
    }
    $[0] = bold;
    $[1] = children;
    $[2] = color;
    $[3] = fallbackPermission;
    $[4] = textComponent;
    $[5] = foundLink;
    $[6] = color_2;
    $[7] = bold_2;
    $[8] = beforeText;
    $[9] = result;
  } else {
    textComponent = $[4];
    foundLink = $[5];
    color_2 = $[6];
    bold_2 = $[7];
    beforeText = $[8];
    result = $[9];
  }
  if (result !== EARLY_RETURN_SENTINEL) return result;
  let children_2;
  if ($[16] !== bold || $[17] !== color) {
    children_2 = jsxProd_default(Text, {
      color,
      bold,
      underline: true,
      children: "learn more",
    });
    $[16] = bold;
    $[17] = color;
    $[18] = children_2;
  } else children_2 = $[18];
  let linkElement;
  if ($[19] !== foundLink.url || $[20] !== children_2) {
    linkElement = jsxProd_default(Link, {
      url: foundLink.url,
      children: children_2,
    });
    $[19] = foundLink.url;
    $[20] = children_2;
    $[21] = linkElement;
  } else linkElement = $[21];
  let markerLink;
  if ($[22] !== children || $[23] !== foundLink.index || $[24] !== foundLink.marker.length) {
    markerLink = children.slice(foundLink.index + foundLink.marker.length);
    $[22] = children;
    $[23] = foundLink.index;
    $[24] = foundLink.marker.length;
    $[25] = markerLink;
  } else markerLink = $[25];
  let textComponentElement;
  if (
    $[26] !== textComponent ||
    $[27] !== color_2 ||
    $[28] !== bold_2 ||
    $[29] !== beforeText ||
    $[30] !== linkElement ||
    $[31] !== markerLink
  ) {
    textComponentElement = jsxProd_default_2(textComponent, {
      color: color_2,
      bold: bold_2,
      children: [beforeText, linkElement, markerLink],
    });
    $[26] = textComponent;
    $[27] = color_2;
    $[28] = bold_2;
    $[29] = beforeText;
    $[30] = linkElement;
    $[31] = markerLink;
    $[32] = textComponentElement;
  } else textComponentElement = $[32];
  return textComponentElement;
}
export {
  LinkifiedText,
  offerUsageCreditsAtWall,
  usageCreditsSpentLine,
  logLimitResetOfferShown,
  parseRateLimitLabel,
  fitRateLimitLabel,
  normalizeStatusSegments,
  SESSION_RUNNING_LABEL,
  SESSION_WAITING_PROMPT_LABEL,
  offerDedupeKey,
  maybeOpenUsageCreditsDialog,
  checkUsageCredits,
};
