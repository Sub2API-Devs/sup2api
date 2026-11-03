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
import { CIRCLE_MARK_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import {
  SAFEGUARDS_MODEL_ARTICLE_URL,
  SAFEGUARDS_DEFAULT_ARTICLE_URL,
  CYBER_SAFEGUARDS_ARTICLE_URL,
} from "../../services/api/refusalFallback.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useFallbackPermission } from "../permissions/FallbackPermissionRequest.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { LinkifiedText as LinkifiedText_2 } from "../LinkifiedText.js";
import { Text, Link } from "../../ink/components/Text.js";

//@ chunk-fm6h4dv7.js:40379-40615 placement
/**
 * 用量额度已花完时给出下次可用时间说明。
 */
function usageCreditsSpentLine(i, s = Date.now()) {
  let d = answeredStatusForWall(i);
  if (
    !isFiveHourAutoResumable(i) ||
    d === undefined ||
    d === null ||
    d.arm !== "reset" ||
    d.available ||
    d.nextAvailableAt === null ||
    i.resetsAt === undefined ||
    i.resetsAt * 1000 <= s ||
    !isLimitResetEnabled()
  )
    return;
  return fillDatePlaceholder(getLimitResetCopy().spentLine, formatIsoResetTime(d.nextAvailableAt));
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
  let d = currentResetFlowState();
  subscribeSessionSwitchReset(d);
  d.continuableWallResetsAt = quotaLimits.resetsAt ?? null;
  askUsageCreditsAvailability(quotaLimits, credentials, "wall");
}
//@ chunk-fm6h4dv7.js:40852-41598 placement
/**
 * 询问服务端用量额度是否可用（按阶段去重）。
 */
function askUsageCreditsAvailability(currentLimits, s, d) {
  if (!isLimitResetEnabled() || !isFiveHourAutoResumable(currentLimits)) return Promise.resolve();
  let resetsAt = currentLimits.resetsAt;
  if (resetsAt === undefined) return Promise.resolve();
  let b = currentResetFlowState();
  let accountEpoch = getLimitsAccountEpoch();
  let state = b.state;
  let failures = 0;
  if (state.phase !== "idle" && isFlowForWall(state, currentLimits))
    switch (state.phase) {
      case "answered":
        return Promise.resolve();
      case "asking":
        return b.pendingAsk ?? Promise.resolve();
      case "failed":
        if (d === "wall" && state.failures >= MAX_STATUS_ATTEMPTS) return Promise.resolve();
        failures = state.failures;
    }
  setResetFlowState({
    phase: "asking",
    wallResetsAt: resetsAt,
    accountEpoch,
  });
  let autoArmed = isQuotaAutoResumeArmed();
  let k = withDeadline(fetchJuniperTideStatus(s), STATUS_RETRY_DELAY_MS)
    .then((T) => {
      settleUsageCreditsAsk({
        wallResetsAt: resetsAt,
        accountEpoch,
        failures,
        result: T ?? {
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
      if (b.pendingAsk === k) b.pendingAsk = null;
    });
  b.pendingAsk = k;
  return k;
}
//@ chunk-fm6h4dv7.js:41598-42664 placement
/**
 * 处理额度询问结果并更新状态。
 */
function settleUsageCreditsAsk({ wallResetsAt, accountEpoch, failures, result: m, autoArmed }) {
  let resetFlowPhase = getResetFlowPhase();
  if (
    resetFlowPhase.phase !== "asking" ||
    resetFlowPhase.wallResetsAt !== wallResetsAt ||
    resetFlowPhase.accountEpoch !== accountEpoch
  )
    return;
  let status = m.kind === "answered" ? m.status : null;
  if (m.kind === "failed")
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
    outcome: fromEnum(m.kind === "answered" ? (status === null ? "absent" : "block") : m.kind),
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
function logLimitResetOfferShown(i, s) {
  let resetsAt = i.resetsAt ?? null;
  let m = currentResetFlowState();
  if (resetsAt === null || m.shownWallResetsAt === resetsAt) return;
  m.shownWallResetsAt = resetsAt;
  let b = answeredStatusForWall(i);
  logEvent("tengu_juniper_tide_shown", {
    arm: fromEnumOpt(b?.arm) ?? undefined,
    surface: fromEnum(s),
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
async function checkUsageCredits(i, credentials) {
  try {
    return await checkUsageCreditsUnsafe(i, credentials);
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
  let d = currentResetFlowState();
  let limitResetCopy = getLimitResetCopy();
  if (answeredStatusForWall(getCurrentLimits()) === undefined) {
    let k = d.pendingAsk !== null;
    await askUsageCreditsAvailability(getCurrentLimits(), credentials, entry);
    if (k && isFailedForWall(getCurrentLimits()))
      await askUsageCreditsAvailability(getCurrentLimits(), credentials, entry);
  }
  let currentLimits = getCurrentLimits();
  if (!canArmLowPriorityReset(currentLimits) || currentLimits.resetsAt === undefined) {
    let k = usageCreditsSpentLine(currentLimits);
    if (k !== undefined)
      return {
        outcome: "spent",
        text: k,
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
  if (d.claiming)
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
  let A;
  d.claiming = true;
  try {
    A = (await withDeadline(claimJuniperTide(credentials), STATUS_REQUEST_TIMEOUT_MS)) ?? {
      result: "error",
      nextAvailableAt: null,
    };
  } finally {
    d.claiming = false;
  }
  switch (
    (logEvent("tengu_juniper_tide_result", {
      result: fromEnum(A.result),
      entry: fromEnum(entry),
      latency_ms: Date.now() - now,
      config_version: configVersion,
    }),
    A.result)
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
      logFeatureSad("juniper_tide", A.result);
      break;
  }
  switch (A.result) {
    case "reset":
    case "not_limited": {
      d.unsettledClaimWallResetsAt = null;
      let k = limitResetAutoContinue() && d.continuableWallResetsAt === resetsAt;
      d.continuableWallResetsAt = null;
      applyFiveHourResetLocally(d, resetsAt, entry, k);
      let T = fillDatePlaceholder(
        limitResetCopy.successLine,
        A.result === "reset" ? formatIsoResetTime(A.nextAvailableAt) : undefined,
      );
      return {
        outcome: "reset",
        text: k ? T : `${T} \xB7 send a message to continue`,
      };
    }
    case "already_used": {
      markResetUnavailable(resetsAt, A.nextAvailableAt);
      if (d.unsettledClaimWallResetsAt === resetsAt) {
        d.unsettledClaimWallResetsAt = null;
        openUsageCreditsOffer(credentials);
      }
      return {
        outcome: "spent",
        text: fillDatePlaceholder(limitResetCopy.spentLine, formatIsoResetTime(A.nextAvailableAt)),
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
      if (A.result === "error") d.unsettledClaimWallResetsAt = resetsAt;
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
function applyFiveHourResetLocally(i, resetsAt, entry, m) {
  let b = [
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
      if (m) enqueueAutoContinuation();
    },
    () =>
      i.events.emit({
        type: "reset",
        entry,
      }),
  ];
  for (let _ of b)
    try {
      _();
    } catch (error) {
      logError(toError(error));
    }
}
//@ chunk-fm6h4dv7.js:45202-45392 placement
function clearFiveHourRejection(i) {
  forgetHeldWindows(["five_hour"]);
  let currentLimits = getCurrentLimits();
  if (
    currentLimits.status !== "rejected" ||
    currentLimits.rateLimitType !== "five_hour" ||
    currentLimits.resetsAt !== i
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
function openUsageCreditsOffer(i) {
  if (isQuotaAutoResumeArmed()) {
    confirmAndFire();
    return;
  }
  probeQuotaStatusAtStart(i, undefined).catch((error) => {
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
function subscribeSessionSwitchReset(i) {
  if (i.sessionSwitchSubscribed) return;
  i.sessionSwitchSubscribed = true;
  onSessionSwitch((s, d) => {
    if (isConversationResetSwitch(d)) i.continuableWallResetsAt = null;
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
function normalizeStatusSegments(i) {
  let filtered = i
    .split(CIRCLE_MARK_GLYPH)
    .map((b) => b.trim())
    .filter(Boolean);
  if (filtered.length === 0) return;
  let [d, ...m] = filtered;
  return m.length === 0 ? d : `${d} ${CIRCLE_MARK_GLYPH} ${m.join(MIDDOT_SEPARATOR)}`;
}
//@ chunk-fm6h4dv7.js:46209-46554 placement
/**
 * 解析限额标签字符串。
 */
function parseRateLimitLabel(i) {
  if (!i.startsWith(SESSION_RUNNING_LABEL) && !i.startsWith(SESSION_WAITING_PROMPT_LABEL)) return null;
  if (
    i.includes(`
`)
  )
    return null;
  let parts = i.split(MIDDOT_SEPARATOR);
  let d = parts[0];
  if (d !== SESSION_RUNNING_LABEL && d !== SESSION_WAITING_PROMPT_LABEL) return null;
  let lastIndex = parts.findLastIndex((k) => SHORT_ID_RE.test(k));
  let id = lastIndex === -1 ? undefined : parts[lastIndex];
  let _ = lastIndex === -1 ? parts.length : lastIndex;
  let sliced = parts.slice(1, _);
  let name = sliced.length > 0 ? sliced.join(MIDDOT_SEPARATOR) : undefined;
  let chips = lastIndex === -1 ? [] : parts.slice(lastIndex + 1);
  return {
    state: d,
    name,
    id,
    chips,
  };
}
//@ chunk-fm6h4dv7.js:46554-46927 placement
/**
 * 按宽度逐步缩短限额标签。
 */
function fitRateLimitLabel(fields, s, d = true) {
  let m = (_) => bunStringWidth(offerDedupeKey(_));
  let b = {
    ...fields,
    chips: [...fields.chips],
  };
  if (m(b) <= s) return b;
  if (b.state === SESSION_WAITING_PROMPT_LABEL) {
    b = {
      ...b,
      state: SESSION_WAITING_LABEL,
    };
    if (m(b) <= s) return b;
  }
  if (b.id !== undefined && b.name !== undefined && d) {
    b = {
      ...b,
      id: undefined,
    };
    if (m(b) <= s) return b;
  }
  if (b.name !== undefined) {
    let _ = m({
      ...b,
      name: undefined,
    });
    let h = s - _ - bunStringWidth(MIDDOT_SEPARATOR);
    let C = bunStringWidth(b.name);
    let A = C > MIN_SESSION_NAME_CHARS ? Math.max(h, MIN_SESSION_NAME_CHARS) : h;
    if (A >= 1 && A < C)
      b = {
        ...b,
        name: truncateToWidth(b.name, A),
      };
  }
  return b;
}
//@ chunk-fm6h4dv7.js:46927-47019 placement
/**
 * 函数 offerDedupeKey（按状态/名/id/标签拼键）。
 */
function offerDedupeKey(i) {
  return [i.state, ...(i.name ? [i.name] : []), ...(i.id ? [i.id] : []), ...i.chips].join(MIDDOT_SEPARATOR);
}
//@ chunk-fm6h4dv7.js:47019-47063 placement
function hasIndex(i) {
  let { index } = i;
  return index !== -1;
}
//@ chunk-fm6h4dv7.js:47063-47130 placement
var mapped = [SAFEGUARDS_MODEL_ARTICLE_URL, SAFEGUARDS_DEFAULT_ARTICLE_URL, CYBER_SAFEGUARDS_ARTICLE_URL].map(
  (i) => ({
    url: i,
    marker: `learn more: ${i}`,
  }),
);
//@ chunk-fm6h4dv7.js:47130-48311 placement
/**
 * 把文本中的标记替换为可点击链接。
 */
function LinkifiedText(props) {
  let _ = w(33);
  let { children, color, bold } = props;
  let fallbackPermission = useFallbackPermission();
  let h;
  let C;
  let color_2;
  let bold_2;
  let T;
  let x;
  if (_[0] !== bold || _[1] !== children || _[2] !== color || _[3] !== fallbackPermission) {
    x = EARLY_RETURN_SENTINEL;
    Fe: {
      let L;
      if (_[10] !== children) {
        L = (I) => {
          let { url, marker } = I;
          return {
            url,
            marker,
            index: children.indexOf(marker),
          };
        };
        _[10] = children;
        _[11] = L;
      } else L = _[11];
      C = mapped.map(L).find(hasIndex);
      if (!fallbackPermission || C === undefined) {
        let I;
        if (_[12] !== bold || _[13] !== children || _[14] !== color) {
          I = jsxProd_default(LinkifiedText_2, {
            color,
            bold,
            children,
          });
          _[12] = bold;
          _[13] = children;
          _[14] = color;
          _[15] = I;
        } else I = _[15];
        x = I;
        break Fe;
      }
      h = Text;
      color_2 = color;
      bold_2 = bold;
      T = children.slice(0, C.index);
    }
    _[0] = bold;
    _[1] = children;
    _[2] = color;
    _[3] = fallbackPermission;
    _[4] = h;
    _[5] = C;
    _[6] = color_2;
    _[7] = bold_2;
    _[8] = T;
    _[9] = x;
  } else {
    h = _[4];
    C = _[5];
    color_2 = _[6];
    bold_2 = _[7];
    T = _[8];
    x = _[9];
  }
  if (x !== EARLY_RETURN_SENTINEL) return x;
  let children_2;
  if (_[16] !== bold || _[17] !== color) {
    children_2 = jsxProd_default(Text, {
      color,
      bold,
      underline: true,
      children: "learn more",
    });
    _[16] = bold;
    _[17] = color;
    _[18] = children_2;
  } else children_2 = _[18];
  let I;
  if (_[19] !== C.url || _[20] !== children_2) {
    I = jsxProd_default(Link, {
      url: C.url,
      children: children_2,
    });
    _[19] = C.url;
    _[20] = children_2;
    _[21] = I;
  } else I = _[21];
  let G;
  if (_[22] !== children || _[23] !== C.index || _[24] !== C.marker.length) {
    G = children.slice(C.index + C.marker.length);
    _[22] = children;
    _[23] = C.index;
    _[24] = C.marker.length;
    _[25] = G;
  } else G = _[25];
  let R;
  if (_[26] !== h || _[27] !== color_2 || _[28] !== bold_2 || _[29] !== T || _[30] !== I || _[31] !== G) {
    R = jsxProd_default_2(h, {
      color: color_2,
      bold: bold_2,
      children: [T, I, G],
    });
    _[26] = h;
    _[27] = color_2;
    _[28] = bold_2;
    _[29] = T;
    _[30] = I;
    _[31] = G;
    _[32] = R;
  } else R = _[32];
  return R;
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
