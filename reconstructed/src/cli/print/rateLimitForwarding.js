/**
 * cli/print/rateLimitForwarding.ts
 *
 * 2.1.316 新增：把 rate_limit_event / 用量配额状态转发到 Remote Control 桥与 SDK 宿主
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (22)
 * attribution: placement 22
 */
import { DoctorLazy } from "../handlers/util.js";
import { u, string, array } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  isNonPromptUserRow,
  processQueuedCommands_2,
  isMachineOriginPrompt,
} from "../../utils/transcript/deserialize.js";
import { isBareTaskNotificationOrigin } from "../../utils/backgroundSessionResume.js";
import { artifactHeaderBlock } from "../../constants/xml.js";
import { isUserQueuedCommandAttachment, isUserPromptAt } from "../../utils/messages.js";
import { READNOTIFICATIONS } from "../../tools/ReadNotificationsTool/ReadNotificationsTool.js";
import {
  isValidUtilization,
  getWrapUpZone,
  getRawUtilization,
  getRawWindowLevels,
  getCurrentLimits,
  areLimitsObserved,
} from "../../services/claudeAiLimits.js";
import { createRateLimitEvent } from "../../entrypoints/sdk/coreSchemas.js";
import { getSessionId } from "../../bootstrap/state.js";
import { isUsageBasedBilling } from "../../utils/planTiers.js";
import { credentialIsOwnStoredLogin, getOauthAccountInfo } from "../../utils/auth.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { bridgeHostState } from "../../bridge/bridgeHostState.js";
import { isBridgeRateLimitEventEnabled } from "../../bridge/bridgeGates.js";
import { toRateLimitInfo } from "../../remote/sdkMessageAdapter.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { getReplBridgeHandle, getSdkHostedBridgeHandle } from "../../bridge/replBridgeHandle.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";

//@ chunk-0sfjpx19.js:20551-21087 placement = countToolCallsSince (1)
function hasCronToolUse(messages, sinceUuid) {
  let r = messages[sinceUuid];
  if (
    r?.type === "user" &&
    Array.isArray(r.message.content) &&
    r.message.content.some((h) => h?.type === "tool_result")
  )
    return true;
  let s = new Set();
  for (let toolCallCount = 0; toolCallCount < sinceUuid; toolCallCount++) {
    let y = messages[toolCallCount];
    if (y?.type === "assistant" && Array.isArray(y.message.content)) {
      for (let _ of y.message.content) if (_?.type === "tool_use") s.add(_.id);
    }
  }
  if (s.size === 0) return false;
  for (let h = sinceUuid; h < messages.length; h++) {
    let y = messages[h];
    if (y?.type === "user" && Array.isArray(y.message.content)) {
      for (let _ of y.message.content) if (_?.type === "tool_result" && s.has(_.tool_use_id)) return true;
    }
  }
  return false;
}
//@ chunk-0sfjpx19.js:21087-21218 placement
/**
 * 限额转发用的 schema：通知锚点（锚点 uuid 与 uuid 列表）与通知结果（notification_id 列表）。
 */
var notificationAnchorSchema = DoctorLazy(() =>
  u({
    anchorUuid: string(),
    uuids: array(string()),
    allUuids: array(string()).optional(),
  }),
);
var notificationsResultSchema = DoctorLazy(() =>
  u({
    notifications: array(
      u({
        notification_id: string(),
      }),
    ),
  }),
);
//@ chunk-0sfjpx19.js:21218-21677 placement = sanitizeFileName (0.752)
function findSingleToolCallPromptIndex(messages, toolName) {
  let r = countToolCallsSince_2(messages);
  let lastIndex = messages.findLastIndex((message) => {
    let k = notificationIdsFromToolResult(message, r);
    return k !== null && k !== "unknown" && k.includes(toolName);
  });
  if (lastIndex < 0) return -1;
  let lastIndex_2 = messages.findLastIndex(
    (message, k) => k < lastIndex && message.type === "user" && !isNonPromptUserRow(message),
  );
  let y = messages[lastIndex_2];
  if (
    y?.type !== "user" ||
    !isBareTaskNotificationOrigin(y.origin) ||
    !processQueuedCommands_2(y) ||
    !textContentOf(y.message.content)?.startsWith(artifactHeaderBlock())
  )
    return -1;
  let _ = 0;
  for (let j = lastIndex_2 + 1; j < messages.length; j++) {
    let msg = messages[j];
    if (msg.type === "attachment" && isUserQueuedCommandAttachment(msg)) return -1;
    let w = notificationIdsFromToolResult(msg, r);
    if (w === "unknown") return -1;
    _ += w?.length ?? 0;
  }
  return _ === 1 ? lastIndex_2 : -1;
}
//@ chunk-0sfjpx19.js:21677-21828 placement
function collectReadNotificationsResultIds(e) {
  let n = countToolCallsSince_2(e);
  let r = new Set();
  if (n.size === 0) return r;
  for (let s of e) {
    let h = notificationIdsFromToolResult(s, n);
    if (h !== null && h !== "unknown") for (let y of h) r.add(y);
  }
  return r;
}
//@ chunk-0sfjpx19.js:21828-22030 placement = countToolCallsSince (1)
function countToolCallsSince_2(e) {
  let n = new Set();
  for (let message of e) {
    if (message.type !== "assistant" || !Array.isArray(message.message.content)) continue;
    for (let s of message.message.content)
      if (s?.type === "tool_use" && s.name === READNOTIFICATIONS) n.add(s.id);
  }
  return n;
}
//@ chunk-0sfjpx19.js:22030-22304 placement
function notificationIdsFromToolResult(e, n) {
  if (
    e.type !== "user" ||
    !Array.isArray(e.message.content) ||
    !e.message.content.some((s) => s?.type === "tool_result" && n.has(s.tool_use_id))
  )
    return null;
  let r = notificationsResultSchema().safeParse(e.toolUseResult);
  return r.success ? r.data.notifications.map((notification) => notification.notification_id) : "unknown";
}
//@ chunk-0sfjpx19.js:22304-22373 placement
function machineOriginPromptAt(e, n) {
  let r = e[n];
  return r !== undefined && (isUserPromptAt(e, n, true) || isMachineOriginPrompt(r));
}
//@ chunk-0sfjpx19.js:22373-22546 placement
/**
 * 取消息内容中的文本：字符串直接返回，数组拼接全部 text 块，没有文本返回 null。
 */
function textContentOf(e) {
  if (typeof e === "string") return e;
  if (!Array.isArray(e)) return null;
  let n = [];
  for (let r of e) if (r.type === "text") n.push(r.text);
  return n.length > 0
    ? n.join(`
`)
    : null;
}
//@ chunk-0sfjpx19.js:22546-22644 placement = extractQuotaStatusFromError (0.772)
/**
 * 被拒状态且重置时间已过。旧版名错配。
 */
function isRejectedAndResetPassed(currentLimits, n = Date.now()) {
  return (
    currentLimits.status === "rejected" &&
    currentLimits.resetsAt !== undefined &&
    currentLimits.resetsAt * 1000 <= n
  );
}
//@ chunk-0sfjpx19.js:22644-22984 placement
/**
 * 从读数中挑出 five_hour/seven_day/seven_day_overage_included 转成 {utilization,resetsAt,status?,surpassedThreshold?}。
 */
function toUtilizationSnapshot(rawUtilization, rawWindowLevels) {
  let fiveHour = isValidUtilization(rawUtilization.five_hour) ? rawUtilization.five_hour : undefined;
  let sevenDay = isValidUtilization(rawUtilization.seven_day) ? rawUtilization.seven_day : undefined;
  let sevenDayOverageIncluded = isValidUtilization(rawUtilization.seven_day_overage_included)
    ? rawUtilization.seven_day_overage_included
    : undefined;
  if (!fiveHour && !sevenDay && !sevenDayOverageIncluded) return;
  return {
    ...(fiveHour && {
      five_hour: toWindowUtilization(fiveHour, rawWindowLevels.five_hour),
    }),
    ...(sevenDay && {
      seven_day: toWindowUtilization(sevenDay, rawWindowLevels.seven_day),
    }),
    ...(sevenDayOverageIncluded && {
      seven_day_overage_included: toWindowUtilization(
        sevenDayOverageIncluded,
        rawWindowLevels.seven_day_overage_included,
      ),
    }),
  };
}
//@ chunk-0sfjpx19.js:22984-23174 placement
/**
 * 窗口读数转 {utilization, resetsAt, status?, surpassedThreshold?}。
 */
function toWindowUtilization(e, n) {
  return {
    utilization: e.utilization,
    resetsAt: e.resets_at,
    ...(n?.status !== undefined && {
      status: n.status,
    }),
    ...(n?.surpassedThreshold !== undefined && {
      surpassedThreshold: n.surpassedThreshold,
    }),
  };
}
//@ chunk-0sfjpx19.js:23174-23652 placement
function buildRateLimitInfo(currentLimits, n, r) {
  let s = currentLimits.rateLimitGraceActive === true ? getWrapUpZone() : null;
  return createRateLimitEvent(
    {
      ...currentLimits,
      rateLimitGraceActive: s !== null,
      ...(s?.extraUsageStatus !== undefined &&
        currentLimits.status !== "rejected" &&
        currentLimits.overageStatus === undefined && {
          overageStatus: s.extraUsageStatus,
        }),
    },
    getSessionId(),
    {
      includeOverageInUse: !isUsageBasedBilling(),
      unifiedWindows: toUtilizationSnapshot(getRawUtilization(), getRawWindowLevels()),
      ...(currentLimits.status === "allowed_warning" &&
        currentLimits.rateLimitType !== "overage" &&
        credentialIsOwnStoredLogin() && {
          overageEnabled: getOauthAccountInfo()?.hasExtraUsageEnabled,
        }),
      ...(n !== undefined && {
        usageCreditOffer: n,
      }),
      ...(r !== undefined && {
        adminRequestOffer: r,
      }),
    },
  );
}
//@ chunk-0sfjpx19.js:23652-23665 placement
var RATE_LIMIT_EVENT_MIN_INTERVAL_MS = 30000;
//@ chunk-0sfjpx19.js:23665-23980 placement
/**
 * 生成 rate_limit_event 节流判定函数：网关提供方不发；限额未变化时只记录；已拒绝且已过重置时间不发；同一重置时刻在最小间隔内只发一次。
 */
function createRateLimitEventThrottle({
  minimumIntervalMs: e = RATE_LIMIT_EVENT_MIN_INTERVAL_MS,
  now: n = Date.now,
} = {}) {
  let r = new Map();
  return function (h) {
    if (getAPIProvider() === "gateway") return false;
    let y = n();
    let resetsAt = h.resetsAt ?? 0;
    if (!En(getCurrentLimits(), h)) {
      r.set(resetsAt, y);
      return false;
    }
    if (isRejectedAndResetPassed(h, y)) return false;
    for (let [k] of r) if (k !== 0 && k * 1000 <= y) r.delete(k);
    let b = r.get(resetsAt);
    if (b !== undefined && y - b < e) return false;
    r.set(resetsAt, y);
    return true;
  };
}
//@ chunk-0sfjpx19.js:23980-24026 placement
function clearRateLimitMirror() {
  bridgeHostState().lastRateLimitMirror = undefined;
}
//@ chunk-0sfjpx19.js:24026-24206 placement
function rateLimitMirrorPayload(e, n) {
  let r = bridgeHostState();
  let lastRateLimitMirror = r.lastRateLimitMirror;
  if (lastRateLimitMirror && lastRateLimitMirror.target.deref() === e && En(lastRateLimitMirror.info, n))
    return;
  r.lastRateLimitMirror = {
    target: new WeakRef(e),
    info: n,
  };
  return {
    rate_limit_info: n,
  };
}
//@ chunk-0sfjpx19.js:24206-24277 placement
/**
 * 把 rate_limit_event 转发给桥并镜像到会话元数据；桥接事件开关关闭时直接返回。
 */
function forwardRateLimitEvent(e, rateLimitInfo) {
  if (!isBridgeRateLimitEventEnabled()) return;
  return rateLimitMirrorPayload(e, toRateLimitInfo(rateLimitInfo.rate_limit_info));
}
//@ chunk-0sfjpx19.js:24277-24572 placement
/**
 * 把 rate_limit_event 写给桥并镜像到会话元数据，失败只记录。
 */
function forwardRateLimitEventToBridge(e, rateLimitInfo) {
  if (!isBridgeRateLimitEventEnabled()) return false;
  try {
    e.writeSdkMessages([rateLimitInfo]);
  } catch (error) {
    logForDebugging(`[bridge] rate_limit_event forward failed: ${errorMessage(error)}`, {
      level: "error",
    });
    return false;
  }
  try {
    let r = forwardRateLimitEvent(e, rateLimitInfo);
    if (r) e.reportMetadata(r);
  } catch (error) {
    logForDebugging(`[bridge] rate_limit_info metadata mirror failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
  return true;
}
//@ chunk-0sfjpx19.js:24572-24733 placement
/**
 * 把当前额度限制状态转发给桥接端：被拒且已过重置时间时清除，否则构建限额信息并上报元数据。
 */
function forwardRateLimitToBridge() {
  if (!isBridgeRateLimitEventEnabled() || !areLimitsObserved()) return;
  let e = getReplBridgeHandle() ?? getSdkHostedBridgeHandle();
  if (!e) return;
  clearRateLimitMirror();
  let currentLimits = getCurrentLimits();
  if (isRejectedAndResetPassed(currentLimits)) {
    reportRateLimitMirrorCleared(e);
    return;
  }
  let rateLimitInfo = buildRateLimitInfo(currentLimits);
  let s = rateLimitInfo && forwardRateLimitEvent(e, rateLimitInfo);
  if (s) e.reportMetadata(s);
}
//@ chunk-0sfjpx19.js:24733-24807 placement
function reportRateLimitMirrorCleared(e) {
  if (!isBridgeRateLimitEventEnabled()) return;
  let n = rateLimitMirrorPayload(e, null);
  if (n) e.reportMetadata(n);
}
//@ chunk-0sfjpx19.js:24807-24933 placement
function logBridgeRateLimitForward(e) {
  if (!areLimitsObserved()) return;
  let currentLimits = getCurrentLimits();
  if (isRejectedAndResetPassed(currentLimits)) {
    reportRateLimitMirrorCleared(e);
    return;
  }
  let rateLimitInfo = buildRateLimitInfo(currentLimits);
  if (rateLimitInfo && forwardRateLimitEventToBridge(e, rateLimitInfo))
    logFeatureOk("bridge_rate_limit_forward");
}
//@ chunk-0sfjpx19.js:24933-25022 placement
/**
 * 从 Map 取出并删除某键，同时判断其时间戳是否在 120 秒内。
 */
function takeRecentWithin(e, n, r = Date.now()) {
  let s = e.get(n);
  e.delete(n);
  return s !== undefined && r - s <= 120000;
}
export {
  findSingleToolCallPromptIndex,
  machineOriginPromptAt,
  textContentOf,
  notificationAnchorSchema,
  hasCronToolUse,
  forwardRateLimitToBridge,
  logBridgeRateLimitForward,
  buildRateLimitInfo,
  forwardRateLimitEventToBridge,
  takeRecentWithin,
  forwardRateLimitEvent,
  createRateLimitEventThrottle,
  collectReadNotificationsResultIds,
};
