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
  Ne,
  Y,
  dt,
  Fr,
  re,
  fetchJuniperTideStatus,
  Kr,
  O7,
  ot,
  canArmLowPriorityReset,
  claimJuniperTide,
  $r,
} from "../../services/rateLimit/rateLimitWall.js";
import { WQe, JTe, enqueueAutoContinuation } from "../../services/rateLimitContinuation.js";
import {
  isLimitResetEnabled,
  fillDatePlaceholder,
  getLimitResetCopy,
  oJn,
  J3s,
} from "../../commands/limit-reset/index.js";
import { xk, truncateToWidth } from "../../utils/format.js";
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
  C7e,
  isConversationResetSwitch,
} from "../../services/quotaAutoResume/quotaAutoResume.js";
import { withDeadline } from "../../utils/sleep.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { dD, endLowPriority } from "../../services/lowPriority/lowPriorityMode.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { onSessionSwitch } from "../../bootstrap/state.js";
import { YO } from "../../utils/permissions/autoModeRulesPrompt.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { PXo, X8r, CYBER_SAFEGUARDS_ARTICLE_URL } from "../../services/api/refusalFallback.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { wJe } from "../permissions/FallbackPermissionRequest.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { LinkifiedText as LinkifiedText_2 } from "../LinkifiedText.js";
import { Text, Link } from "../../ink/components/Text.js";

/**
 * 用量额度已花完时给出下次可用时间说明。
 */
//@ chunk-fm6h4dv7.js:40379-40615 placement
function usageCreditsSpentLine(i, s = Date.now()) {
  let d = Ne(i);
  if (
    !WQe(i) ||
    d === void 0 ||
    d === null ||
    d.arm !== "reset" ||
    d.available ||
    d.nextAvailableAt === null ||
    i.resetsAt === void 0 ||
    i.resetsAt * 1000 <= s ||
    !isLimitResetEnabled()
  )
    return;
  return fillDatePlaceholder(getLimitResetCopy().spentLine, formatIsoResetTime(d.nextAvailableAt));
}
//@ chunk-fm6h4dv7.js:40615-40734 placement
function formatIsoResetTime(i) {
  if (i === null) return;
  let parse = Date.parse(i);
  return Number.isFinite(parse) ? xk(Math.floor(parse / 1000), !1, !0, !0) : void 0;
}
/**
 * 撞到可重置的限额墙时（功能开启且该墙符合条件），记下可继续的重置时间并异步查询用量额度/重置是否可用。
 */
//@ chunk-fm6h4dv7.js:40734-40852 placement
function offerUsageCreditsAtWall(i, s) {
  if (!isLimitResetEnabled() || !WQe(i)) return;
  let d = Y();
  (subscribeSessionSwitchReset(d),
    (d.continuableWallResetsAt = i.resetsAt ?? null),
    askUsageCreditsAvailability(i, s, "wall"));
}
/**
 * 询问服务端用量额度是否可用（按阶段去重）。
 */
//@ chunk-fm6h4dv7.js:40852-41598 placement
function askUsageCreditsAvailability(i, s, d) {
  if (!isLimitResetEnabled() || !WQe(i)) return Promise.resolve();
  let resetsAt = i.resetsAt;
  if (resetsAt === void 0) return Promise.resolve();
  let b = Y(),
    _ = getLimitsAccountEpoch(),
    state = b.state,
    C = 0;
  if (state.phase !== "idle" && dt(state, i))
    switch (state.phase) {
      case "answered":
        return Promise.resolve();
      case "asking":
        return b.pendingAsk ?? Promise.resolve();
      case "failed":
        if (d === "wall" && state.failures >= Fr) return Promise.resolve();
        C = state.failures;
    }
  re({ phase: "asking", wallResetsAt: resetsAt, accountEpoch: _ });
  let A = isQuotaAutoResumeArmed(),
    k = withDeadline(fetchJuniperTideStatus(s), Kr)
      .then((T) => {
        settleUsageCreditsAsk({
          wallResetsAt: resetsAt,
          accountEpoch: _,
          failures: C,
          result: T ?? { kind: "failed" },
          autoArmed: A,
        });
      })
      .catch((T) => {
        logError(toError(T));
        try {
          settleUsageCreditsAsk({
            wallResetsAt: resetsAt,
            accountEpoch: _,
            failures: C,
            result: { kind: "failed" },
            autoArmed: A,
          });
        } catch (error) {
          logError(toError(error));
        }
      })
      .finally(() => {
        if (b.pendingAsk === k) b.pendingAsk = null;
      });
  return ((b.pendingAsk = k), k);
}
/**
 * 处理额度询问结果并更新状态。
 */
//@ chunk-fm6h4dv7.js:41598-42664 placement
function settleUsageCreditsAsk({
  wallResetsAt: wallResetsAt,
  accountEpoch: accountEpoch,
  failures: failures,
  result: m,
  autoArmed: autoArmed,
}) {
  let _ = O7();
  if (_.phase !== "asking" || _.wallResetsAt !== wallResetsAt || _.accountEpoch !== accountEpoch) return;
  let h = m.kind === "answered" ? m.status : null;
  if (m.kind === "failed")
    re({ phase: "failed", wallResetsAt: wallResetsAt, accountEpoch: accountEpoch, failures: failures + 1 });
  else re({ phase: "answered", wallResetsAt: wallResetsAt, accountEpoch: accountEpoch, status: h });
  if (
    (logEvent("tengu_juniper_tide_asked", {
      outcome: fromEnum(m.kind === "answered" ? (h === null ? "absent" : "block") : m.kind),
      attempt: failures + 1,
      eligible: h?.eligible ?? !1,
      ineligible_reason: fromEnumOpt(h?.ineligibleReason) ?? void 0,
      config_version: oJn(),
    }),
    h === null || !h.eligible)
  )
    return;
  logEvent("tengu_juniper_tide_wall", {
    in_experiment: h.inExperiment,
    arm: fromEnumOpt(h.arm) ?? void 0,
    available: h.available,
    tier: fromEnum(JTe()),
    auto_armed: autoArmed,
    low_priority_active: dD(),
    config_version: oJn(),
    surface: fromEnumOpt(h.eventProps?.surface) ?? void 0,
    server_tier: fromEnumOpt(h.eventProps?.tier) ?? void 0,
    tenure_bucket: fromEnumOpt(h.eventProps?.tenureBucket) ?? void 0,
    billing_path: fromEnumOpt(h.eventProps?.billingPath) ?? void 0,
    billing_period: fromEnumOpt(h.eventProps?.billingPeriod) ?? void 0,
    extra_usage_state: fromEnumOpt(h.eventProps?.extraUsageState) ?? void 0,
  });
}
/**
 * 每个重置时间只打点一次 tengu_juniper_tide_shown（5 小时限额重置提示），附带实验分组、展示位置与配置版本。
 */
//@ chunk-fm6h4dv7.js:42664-42878 placement
function logLimitResetOfferShown(i, s) {
  let d = i.resetsAt ?? null,
    m = Y();
  if (d === null || m.shownWallResetsAt === d) return;
  m.shownWallResetsAt = d;
  let b = Ne(i);
  logEvent("tengu_juniper_tide_shown", {
    arm: fromEnumOpt(b?.arm) ?? void 0,
    surface: fromEnum(s),
    config_version: oJn(),
  });
}
//@ chunk-fm6h4dv7.js:42878-42922 placement
function Qho(i, s) {
  if (ot(i)) askUsageCreditsAvailability(i, s, "dialog");
}
/**
 * 检查用量额度（出错时返回 unavailable）。
 */
//@ chunk-fm6h4dv7.js:42922-43047 placement
async function checkUsageCredits(i, s) {
  try {
    return await checkUsageCreditsUnsafe(i, s);
  } catch (error) {
    return (logError(toError(error)), { outcome: "unavailable", text: getLimitResetCopy().unavailableLine });
  }
}
/**
 * 检查用量额度的实际逻辑。
 */
//@ chunk-fm6h4dv7.js:43047-44741 placement
async function checkUsageCreditsUnsafe(i, s) {
  let d = Y(),
    m = getLimitResetCopy();
  if (Ne(getCurrentLimits()) === void 0) {
    let k = d.pendingAsk !== null;
    if ((await askUsageCreditsAvailability(getCurrentLimits(), s, i), k && ot(getCurrentLimits())))
      await askUsageCreditsAvailability(getCurrentLimits(), s, i);
  }
  let b = getCurrentLimits();
  if (!canArmLowPriorityReset(b) || b.resetsAt === void 0) {
    let k = usageCreditsSpentLine(b);
    if (k !== void 0) return { outcome: "spent", text: k };
    return ot(b)
      ? { outcome: "unavailable", text: m.unavailableLine }
      : { outcome: "not_offered", text: RESET_UNAVAILABLE_TEXT };
  }
  if (d.claiming) return { outcome: "unavailable", text: RESET_IN_PROGRESS_TEXT };
  let resetsAt = b.resetsAt,
    h = oJn();
  logEvent("tengu_juniper_tide_selected", {
    entry: fromEnum(i),
    auto_armed: isQuotaAutoResumeArmed(),
    config_version: h,
  });
  let now = Date.now(),
    A;
  d.claiming = !0;
  try {
    A = (await withDeadline(claimJuniperTide(s), $r)) ?? { result: "error", nextAvailableAt: null };
  } finally {
    d.claiming = !1;
  }
  switch (
    (logEvent("tengu_juniper_tide_result", {
      result: fromEnum(A.result),
      entry: fromEnum(i),
      latency_ms: Date.now() - now,
      config_version: h,
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
      let k = J3s() && d.continuableWallResetsAt === resetsAt;
      ((d.continuableWallResetsAt = null), applyFiveHourResetLocally(d, resetsAt, i, k));
      let T = fillDatePlaceholder(
        m.successLine,
        A.result === "reset" ? formatIsoResetTime(A.nextAvailableAt) : void 0,
      );
      return { outcome: "reset", text: k ? T : `${T} \xB7 send a message to continue` };
    }
    case "already_used": {
      if ((markResetUnavailable(resetsAt, A.nextAvailableAt), d.unsettledClaimWallResetsAt === resetsAt))
        ((d.unsettledClaimWallResetsAt = null), zr(s));
      return {
        outcome: "spent",
        text: fillDatePlaceholder(m.spentLine, formatIsoResetTime(A.nextAvailableAt)),
      };
    }
    case "ineligible":
      return (markResetIneligible(resetsAt), { outcome: "not_offered", text: RESET_UNAVAILABLE_TEXT });
    case "auth_error":
      return { outcome: "unavailable", text: RESET_LOGIN_FAILED_TEXT };
    case "unavailable":
    case "rate_limited":
    case "error":
      if (A.result === "error") d.unsettledClaimWallResetsAt = resetsAt;
      return { outcome: "unavailable", text: m.unavailableLine };
  }
}
//@ chunk-fm6h4dv7.js:44741-44946 placement
var RESET_UNAVAILABLE_TEXT = "A 5-hour limit reset isn't available right now.",
  RESET_IN_PROGRESS_TEXT = "Your 5-hour limit is already being reset \xB7 one moment",
  RESET_LOGIN_FAILED_TEXT =
    "Couldn't reset your 5-hour limit with this login \xB7 run /login, then try again";
/**
 * 5 小时限额重置成功后的本地收尾：取消额度自动继续、记录、把被拒的 five_hour 状态改回 allowed、复位提示状态、必要时刷新、发出 reset 事件；每步单独 try/catch。
 */
//@ chunk-fm6h4dv7.js:44946-45202 placement
function applyFiveHourResetLocally(i, s, d, m) {
  let b = [
    () => cancelQuotaAutoResume("juniper_tide"),
    () => {
      endLowPriority("reset");
    },
    () => clearFiveHourRejection(s),
    () => {
      let _ = O7();
      if (_.phase !== "idle" && _.wallResetsAt === s) re({ phase: "idle" });
    },
    () => {
      if (m) enqueueAutoContinuation();
    },
    () => i.events.emit({ type: "reset", entry: d }),
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
  let s = getCurrentLimits();
  if (s.status !== "rejected" || s.rateLimitType !== "five_hour" || s.resetsAt !== i) return;
  emitLimitsStatusChange({ ...s, status: "allowed", rateLimitType: void 0, resetsAt: void 0 });
}
//@ chunk-fm6h4dv7.js:45392-45465 placement
function zr(i) {
  if (isQuotaAutoResumeArmed()) {
    C7e();
    return;
  }
  probeQuotaStatusAtStart(i, void 0).catch((s) => {
    logError(toError(s));
  });
}
//@ chunk-fm6h4dv7.js:45465-45650 placement
function markResetUnavailable(i, s) {
  let d = O7();
  if (d.phase !== "answered" || d.wallResetsAt !== i || d.status === null) return;
  re({ ...d, status: { ...d.status, available: !1, nextAvailableAt: s ?? d.status.nextAvailableAt } });
}
//@ chunk-fm6h4dv7.js:45650-45801 placement
function markResetIneligible(i) {
  let s = O7();
  if (s.phase !== "answered" || s.wallResetsAt !== i || s.status === null) return;
  re({ ...s, status: { ...s.status, eligible: !1, available: !1 } });
}
//@ chunk-fm6h4dv7.js:45801-45935 placement
function subscribeSessionSwitchReset(i) {
  if (i.sessionSwitchSubscribed) return;
  ((i.sessionSwitchSubscribed = !0),
    onSessionSwitch((s, d) => {
      if (isConversationResetSwitch(d)) i.continuableWallResetsAt = null;
    }));
}
/**
 * 会话状态短语常量（running / waiting for a prompt / waiting）、分隔符、8 位短 id 正则与长度上限。
 */
//@ chunk-fm6h4dv7.js:45935-46054 placement
var SESSION_RUNNING_LABEL = "session running",
  SESSION_WAITING_PROMPT_LABEL = "session waiting for a prompt",
  SESSION_WAITING_LABEL = "session waiting",
  MIDDOT_SEPARATOR = " \xB7 ",
  SHORT_ID_RE = /^[0-9a-f]{8}$/,
  MIN_SESSION_NAME_CHARS = 20;
/**
 * 按分隔符拆分状态文字、去掉空段，第一段之后的各段用 " · " 重新连接。
 */
//@ chunk-fm6h4dv7.js:46054-46209 placement
function normalizeStatusSegments(i) {
  let filtered = i
    .split(YO)
    .map((b) => b.trim())
    .filter(Boolean);
  if (filtered.length === 0) return;
  let [d, ...m] = filtered;
  return m.length === 0 ? d : `${d} ${YO} ${m.join(MIDDOT_SEPARATOR)}`;
}
/**
 * 解析限额标签字符串。
 */
//@ chunk-fm6h4dv7.js:46209-46554 placement
function parseRateLimitLabel(i) {
  if (!i.startsWith(SESSION_RUNNING_LABEL) && !i.startsWith(SESSION_WAITING_PROMPT_LABEL)) return null;
  if (
    i.includes(`
`)
  )
    return null;
  let parts = i.split(MIDDOT_SEPARATOR),
    d = parts[0];
  if (d !== SESSION_RUNNING_LABEL && d !== SESSION_WAITING_PROMPT_LABEL) return null;
  let lastIndex = parts.findLastIndex((k) => SHORT_ID_RE.test(k)),
    b = lastIndex === -1 ? void 0 : parts[lastIndex],
    _ = lastIndex === -1 ? parts.length : lastIndex,
    sliced = parts.slice(1, _),
    C = sliced.length > 0 ? sliced.join(MIDDOT_SEPARATOR) : void 0,
    A = lastIndex === -1 ? [] : parts.slice(lastIndex + 1);
  return { state: d, name: C, id: b, chips: A };
}
/**
 * 按宽度逐步缩短限额标签。
 */
//@ chunk-fm6h4dv7.js:46554-46927 placement
function fitRateLimitLabel(i, s, d = !0) {
  let m = (_) => bunStringWidth(YAr(_)),
    b = { ...i, chips: [...i.chips] };
  if (m(b) <= s) return b;
  if (b.state === SESSION_WAITING_PROMPT_LABEL) {
    if (((b = { ...b, state: SESSION_WAITING_LABEL }), m(b) <= s)) return b;
  }
  if (b.id !== void 0 && b.name !== void 0 && d) {
    if (((b = { ...b, id: void 0 }), m(b) <= s)) return b;
  }
  if (b.name !== void 0) {
    let _ = m({ ...b, name: void 0 }),
      h = s - _ - bunStringWidth(MIDDOT_SEPARATOR),
      C = bunStringWidth(b.name),
      A = C > MIN_SESSION_NAME_CHARS ? Math.max(h, MIN_SESSION_NAME_CHARS) : h;
    if (A >= 1 && A < C) b = { ...b, name: truncateToWidth(b.name, A) };
  }
  return b;
}
//@ chunk-fm6h4dv7.js:46927-47019 placement
function YAr(i) {
  return [i.state, ...(i.name ? [i.name] : []), ...(i.id ? [i.id] : []), ...i.chips].join(MIDDOT_SEPARATOR);
}
//@ chunk-fm6h4dv7.js:47019-47063 placement
function ti(i) {
  let { index: index } = i;
  return index !== -1;
}
//@ chunk-fm6h4dv7.js:47063-47130 placement
var mapped = [PXo, X8r, CYBER_SAFEGUARDS_ARTICLE_URL].map((i) => ({ url: i, marker: `learn more: ${i}` }));
/**
 * 把文本中的标记替换为可点击链接。
 */
//@ chunk-fm6h4dv7.js:47130-48311 placement
function LinkifiedText(i) {
  let _ = w(33),
    { children: children, color: color, bold: bold } = i,
    b = wJe(),
    h,
    C,
    A,
    k,
    T,
    x;
  if (_[0] !== bold || _[1] !== children || _[2] !== color || _[3] !== b) {
    x = EARLY_RETURN_SENTINEL;
    Fe: {
      let L;
      if (_[10] !== children)
        ((L = (I) => {
          let { url: url, marker: marker } = I;
          return { url: url, marker: marker, index: children.indexOf(marker) };
        }),
          (_[10] = children),
          (_[11] = L));
      else L = _[11];
      C = mapped.map(L).find(ti);
      if (!b || C === void 0) {
        let I;
        if (_[12] !== bold || _[13] !== children || _[14] !== color)
          ((I = e(LinkifiedText_2, { color: color, bold: bold, children: children })),
            (_[12] = bold),
            (_[13] = children),
            (_[14] = color),
            (_[15] = I));
        else I = _[15];
        x = I;
        break Fe;
      }
      h = Text;
      A = color;
      k = bold;
      T = children.slice(0, C.index);
    }
    ((_[0] = bold),
      (_[1] = children),
      (_[2] = color),
      (_[3] = b),
      (_[4] = h),
      (_[5] = C),
      (_[6] = A),
      (_[7] = k),
      (_[8] = T),
      (_[9] = x));
  } else ((h = _[4]), (C = _[5]), (A = _[6]), (k = _[7]), (T = _[8]), (x = _[9]));
  if (x !== EARLY_RETURN_SENTINEL) return x;
  let L;
  if (_[16] !== bold || _[17] !== color)
    ((L = e(Text, { color: color, bold: bold, underline: !0, children: "learn more" })),
      (_[16] = bold),
      (_[17] = color),
      (_[18] = L));
  else L = _[18];
  let I;
  if (_[19] !== C.url || _[20] !== L)
    ((I = e(Link, { url: C.url, children: L })), (_[19] = C.url), (_[20] = L), (_[21] = I));
  else I = _[21];
  let G;
  if (_[22] !== children || _[23] !== C.index || _[24] !== C.marker.length)
    ((G = children.slice(C.index + C.marker.length)),
      (_[22] = children),
      (_[23] = C.index),
      (_[24] = C.marker.length),
      (_[25] = G));
  else G = _[25];
  let R;
  if (_[26] !== h || _[27] !== A || _[28] !== k || _[29] !== T || _[30] !== I || _[31] !== G)
    ((R = r(h, { color: A, bold: k, children: [T, I, G] })),
      (_[26] = h),
      (_[27] = A),
      (_[28] = k),
      (_[29] = T),
      (_[30] = I),
      (_[31] = G),
      (_[32] = R));
  else R = _[32];
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
  YAr,
  Qho,
  checkUsageCredits,
};
