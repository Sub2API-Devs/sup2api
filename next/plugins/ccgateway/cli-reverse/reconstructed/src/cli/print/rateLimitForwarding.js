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
import { objectSchema, stringSchema, array } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { bridgeHostState } from "../../bridge/bridgeHostState.js";
import { isBridgeRateLimitEventEnabled } from "../../bridge/bridgeGates.js";
import { toRateLimitInfo } from "../../remote/sdkMessageAdapter.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { getReplBridgeHandle, getSdkHostedBridgeHandle } from "../../bridge/replBridgeHandle.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0sfjpx19.js:20551-21087 placement (2.1.88 match: countToolCallsSince, 1)
function hasCronToolUse(messages, sinceUuid) {
  let targetMessage = messages[sinceUuid];
  if (
    targetMessage?.type === "user" &&
    Array.isArray(targetMessage.message.content) &&
    targetMessage.message.content.some((block) => block?.type === "tool_result")
  )
    return true;
  let toolUseIds = new Set();
  for (let toolCallCount = 0; toolCallCount < sinceUuid; toolCallCount++) {
    let message = messages[toolCallCount];
    if (message?.type === "assistant" && Array.isArray(message.message.content)) {
      for (let block of message.message.content) if (block?.type === "tool_use") toolUseIds.add(block.id);
    }
  }
  if (toolUseIds.size === 0) return false;
  for (let index = sinceUuid; index < messages.length; index++) {
    let message = messages[index];
    if (message?.type === "user" && Array.isArray(message.message.content)) {
      for (let block of message.message.content)
        if (block?.type === "tool_result" && toolUseIds.has(block.tool_use_id)) return true;
    }
  }
  return false;
}
//@ chunk-0sfjpx19.js:21087-21218 placement
/**
 * 限额转发用的 schema：通知锚点（锚点 uuid 与 uuid 列表）与通知结果（notification_id 列表）。
 */
var notificationAnchorSchema; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var notificationsResultSchema;
deferInit("chunk-0sfjpx19.js:21087", () => {
  notificationAnchorSchema = DoctorLazy(() =>
    objectSchema({
      anchorUuid: stringSchema(),
      uuids: array(stringSchema()),
      allUuids: array(stringSchema()).optional(),
    }),
  );
  notificationsResultSchema = DoctorLazy(() =>
    objectSchema({
      notifications: array(
        objectSchema({
          notification_id: stringSchema(),
        }),
      ),
    }),
  );
});
//@ chunk-0sfjpx19.js:21218-21677 placement (2.1.88 match: sanitizeFileName, 0.752)
function findSingleToolCallPromptIndex(messages, toolName) {
  let readCallIds = countToolCallsSince_2(messages);
  let lastIndex = messages.findLastIndex((message) => {
    let ids = notificationIdsFromToolResult(message, readCallIds);
    return ids !== null && ids !== "unknown" && ids.includes(toolName);
  });
  if (lastIndex < 0) return -1;
  let lastIndex_2 = messages.findLastIndex(
    (message, index) => index < lastIndex && message.type === "user" && !isNonPromptUserRow(message),
  );
  let message = messages[lastIndex_2];
  if (
    message?.type !== "user" ||
    !isBareTaskNotificationOrigin(message.origin) ||
    !processQueuedCommands_2(message) ||
    !textContentOf(message.message.content)?.startsWith(artifactHeaderBlock())
  )
    return -1;
  let count = 0;
  for (let j = lastIndex_2 + 1; j < messages.length; j++) {
    let message = messages[j];
    if (message.type === "attachment" && isUserQueuedCommandAttachment(message)) return -1;
    let ids = notificationIdsFromToolResult(message, readCallIds);
    if (ids === "unknown") return -1;
    count += ids?.length ?? 0;
  }
  return count === 1 ? lastIndex_2 : -1;
}
//@ chunk-0sfjpx19.js:21677-21828 placement
function collectReadNotificationsResultIds(messages) {
  let readCallIds = countToolCallsSince_2(messages);
  let ids = new Set();
  if (readCallIds.size === 0) return ids;
  for (let message of messages) {
    let notificationIds = notificationIdsFromToolResult(message, readCallIds);
    if (notificationIds !== null && notificationIds !== "unknown")
      for (let id of notificationIds) ids.add(id);
  }
  return ids;
}
//@ chunk-0sfjpx19.js:21828-22030 placement (2.1.88 match: countToolCallsSince, 1)
function countToolCallsSince_2(messages) {
  let ids = new Set();
  for (let message of messages) {
    if (message.type !== "assistant" || !Array.isArray(message.message.content)) continue;
    for (let block of message.message.content)
      if (block?.type === "tool_use" && block.name === READNOTIFICATIONS) ids.add(block.id);
  }
  return ids;
}
//@ chunk-0sfjpx19.js:22030-22304 placement
function notificationIdsFromToolResult(message, toolUseIds) {
  if (
    message.type !== "user" ||
    !Array.isArray(message.message.content) ||
    !message.message.content.some(
      (block) => block?.type === "tool_result" && toolUseIds.has(block.tool_use_id),
    )
  )
    return null;
  let parsed = notificationsResultSchema().safeParse(message.toolUseResult);
  return parsed.success
    ? parsed.data.notifications.map((notification) => notification.notification_id)
    : "unknown";
}
//@ chunk-0sfjpx19.js:22304-22373 placement
function machineOriginPromptAt(messages, index) {
  let message = messages[index];
  return message !== undefined && (isUserPromptAt(messages, index, true) || isMachineOriginPrompt(message));
}
//@ chunk-0sfjpx19.js:22373-22546 placement
/**
 * 取消息内容中的文本：字符串直接返回，数组拼接全部 text 块，没有文本返回 null。
 */
function textContentOf(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  let parts = [];
  for (let block of content) if (block.type === "text") parts.push(block.text);
  return parts.length > 0
    ? parts.join(`
`)
    : null;
}
//@ chunk-0sfjpx19.js:22546-22644 placement (2.1.88 match: extractQuotaStatusFromError, 0.772)
/**
 * 被拒状态且重置时间已过。旧版名错配。
 */
function isRejectedAndResetPassed(rateLimitState, nowMs = Date.now()) {
  return (
    rateLimitState.status === "rejected" &&
    rateLimitState.resetsAt !== undefined &&
    rateLimitState.resetsAt * 1000 <= nowMs
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
function toWindowUtilization(rawWindow, level) {
  return {
    utilization: rawWindow.utilization,
    resetsAt: rawWindow.resets_at,
    ...(level?.status !== undefined && {
      status: level.status,
    }),
    ...(level?.surpassedThreshold !== undefined && {
      surpassedThreshold: level.surpassedThreshold,
    }),
  };
}
//@ chunk-0sfjpx19.js:23174-23652 placement
function buildRateLimitInfo(rateLimitReport, usageCreditOffer, adminRequestOffer) {
  let wrapUpZone = rateLimitReport.rateLimitGraceActive === true ? getWrapUpZone() : null;
  return createRateLimitEvent(
    {
      ...rateLimitReport,
      rateLimitGraceActive: wrapUpZone !== null,
      ...(wrapUpZone?.extraUsageStatus !== undefined &&
        rateLimitReport.status !== "rejected" &&
        rateLimitReport.overageStatus === undefined && {
          overageStatus: wrapUpZone.extraUsageStatus,
        }),
    },
    getSessionId(),
    {
      includeOverageInUse: !isUsageBasedBilling(),
      unifiedWindows: toUtilizationSnapshot(getRawUtilization(), getRawWindowLevels()),
      ...(rateLimitReport.status === "allowed_warning" &&
        rateLimitReport.rateLimitType !== "overage" &&
        credentialIsOwnStoredLogin() && {
          overageEnabled: getOauthAccountInfo()?.hasExtraUsageEnabled,
        }),
      ...(usageCreditOffer !== undefined && {
        usageCreditOffer,
      }),
      ...(adminRequestOffer !== undefined && {
        adminRequestOffer,
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
  minimumIntervalMs = RATE_LIMIT_EVENT_MIN_INTERVAL_MS,
  now = Date.now,
} = {}) {
  let lastSentAt = new Map();
  return function (info) {
    if (getAPIProvider() === "gateway") return false;
    let nowMs = now();
    let resetsAt = info.resetsAt ?? 0;
    if (!import_sortedIndex_2(getCurrentLimits(), info)) {
      lastSentAt.set(resetsAt, nowMs);
      return false;
    }
    if (isRejectedAndResetPassed(info, nowMs)) return false;
    for (let [resetsAt] of lastSentAt)
      if (resetsAt !== 0 && resetsAt * 1000 <= nowMs) lastSentAt.delete(resetsAt);
    let last = lastSentAt.get(resetsAt);
    if (last !== undefined && nowMs - last < minimumIntervalMs) return false;
    lastSentAt.set(resetsAt, nowMs);
    return true;
  };
}
//@ chunk-0sfjpx19.js:23980-24026 placement
function clearRateLimitMirror() {
  bridgeHostState().lastRateLimitMirror = undefined;
}
//@ chunk-0sfjpx19.js:24026-24206 placement
function rateLimitMirrorPayload(target, info) {
  let hostState = bridgeHostState();
  let lastRateLimitMirror = hostState.lastRateLimitMirror;
  if (
    lastRateLimitMirror &&
    lastRateLimitMirror.target.deref() === target &&
    import_sortedIndex_2(lastRateLimitMirror.info, info)
  )
    return;
  hostState.lastRateLimitMirror = {
    target: new WeakRef(target),
    info,
  };
  return {
    rate_limit_info: info,
  };
}
//@ chunk-0sfjpx19.js:24206-24277 placement
/**
 * 把 rate_limit_event 转发给桥并镜像到会话元数据；桥接事件开关关闭时直接返回。
 */
function forwardRateLimitEvent(target, rateLimitInfo) {
  if (!isBridgeRateLimitEventEnabled()) return;
  return rateLimitMirrorPayload(target, toRateLimitInfo(rateLimitInfo.rate_limit_info));
}
//@ chunk-0sfjpx19.js:24277-24572 placement
/**
 * 把 rate_limit_event 写给桥并镜像到会话元数据，失败只记录。
 */
function forwardRateLimitEventToBridge(handle, rateLimitInfo) {
  if (!isBridgeRateLimitEventEnabled()) return false;
  try {
    handle.writeSdkMessages([rateLimitInfo]);
  } catch (error) {
    logForDebugging(`[bridge] rate_limit_event forward failed: ${errorMessage(error)}`, {
      level: "error",
    });
    return false;
  }
  try {
    let payload = forwardRateLimitEvent(handle, rateLimitInfo);
    if (payload) handle.reportMetadata(payload);
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
  let handle = getReplBridgeHandle() ?? getSdkHostedBridgeHandle();
  if (!handle) return;
  clearRateLimitMirror();
  let rateLimitState = getCurrentLimits();
  if (isRejectedAndResetPassed(rateLimitState)) {
    reportRateLimitMirrorCleared(handle);
    return;
  }
  let rateLimitInfo = buildRateLimitInfo(rateLimitState);
  let payload = rateLimitInfo && forwardRateLimitEvent(handle, rateLimitInfo);
  if (payload) handle.reportMetadata(payload);
}
//@ chunk-0sfjpx19.js:24733-24807 placement
function reportRateLimitMirrorCleared(handle) {
  if (!isBridgeRateLimitEventEnabled()) return;
  let payload = rateLimitMirrorPayload(handle, null);
  if (payload) handle.reportMetadata(payload);
}
//@ chunk-0sfjpx19.js:24807-24933 placement
function logBridgeRateLimitForward(handle) {
  if (!areLimitsObserved()) return;
  let rateLimitState = getCurrentLimits();
  if (isRejectedAndResetPassed(rateLimitState)) {
    reportRateLimitMirrorCleared(handle);
    return;
  }
  let rateLimitInfo = buildRateLimitInfo(rateLimitState);
  if (rateLimitInfo && forwardRateLimitEventToBridge(handle, rateLimitInfo))
    logFeatureOk("bridge_rate_limit_forward");
}
//@ chunk-0sfjpx19.js:24933-25022 placement
/**
 * 从 Map 取出并删除某键，同时判断其时间戳是否在 120 秒内。
 */
function takeRecentWithin(map, key, nowMs = Date.now()) {
  let at = map.get(key);
  map.delete(key);
  return at !== undefined && nowMs - at <= 120000;
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
