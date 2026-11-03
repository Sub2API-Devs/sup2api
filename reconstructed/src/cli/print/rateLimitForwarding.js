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
import { u, o, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { tRe, processQueuedCommands_2, isMachineOriginPrompt } from "../../utils/transcript/deserialize.js";
import { isBareTaskNotificationOrigin } from "../../utils/backgroundSessionResume.js";
import { SDi } from "../../constants/xml.js";
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
import { lD } from "../../utils/planTiers.js";
import { credentialIsOwnStoredLogin, getOauthAccountInfo } from "../../utils/auth.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { ao } from "../../bridge/bridgeHostState.js";
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
    return !0;
  let s = new Set();
  for (let toolCallCount = 0; toolCallCount < sinceUuid; toolCallCount++) {
    let y = messages[toolCallCount];
    if (y?.type === "assistant" && Array.isArray(y.message.content)) {
      for (let _ of y.message.content) if (_?.type === "tool_use") s.add(_.id);
    }
  }
  if (s.size === 0) return !1;
  for (let h = sinceUuid; h < messages.length; h++) {
    let y = messages[h];
    if (y?.type === "user" && Array.isArray(y.message.content)) {
      for (let _ of y.message.content) if (_?.type === "tool_result" && s.has(_.tool_use_id)) return !0;
    }
  }
  return !1;
}
/**
 * 限额转发用的 schema：通知锚点（锚点 uuid 与 uuid 列表）与通知结果（notification_id 列表）。
 */
//@ chunk-0sfjpx19.js:21087-21218 placement
var notificationAnchorSchema = DoctorLazy(() =>
    u({ anchorUuid: o(), uuids: A(o()), allUuids: A(o()).optional() }),
  ),
  notificationsResultSchema = DoctorLazy(() => u({ notifications: A(u({ notification_id: o() })) }));
//@ chunk-0sfjpx19.js:21218-21677 placement = sanitizeFileName (0.752)
function findSingleToolCallPromptIndex(messages, toolName) {
  let r = countToolCallsSince_2(messages),
    lastIndex = messages.findLastIndex((b) => {
      let k = notificationIdsFromToolResult(b, r);
      return k !== null && k !== "unknown" && k.includes(toolName);
    });
  if (lastIndex < 0) return -1;
  let lastIndex_2 = messages.findLastIndex((b, k) => k < lastIndex && b.type === "user" && !tRe(b)),
    y = messages[lastIndex_2];
  if (
    y?.type !== "user" ||
    !isBareTaskNotificationOrigin(y.origin) ||
    !processQueuedCommands_2(y) ||
    !textContentOf(y.message.content)?.startsWith(SDi())
  )
    return -1;
  let _ = 0;
  for (let b = lastIndex_2 + 1; b < messages.length; b++) {
    let k = messages[b];
    if (k.type === "attachment" && isUserQueuedCommandAttachment(k)) return -1;
    let w = notificationIdsFromToolResult(k, r);
    if (w === "unknown") return -1;
    _ += w?.length ?? 0;
  }
  return _ === 1 ? lastIndex_2 : -1;
}
//@ chunk-0sfjpx19.js:21677-21828 placement
function collectReadNotificationsResultIds(e) {
  let n = countToolCallsSince_2(e),
    r = new Set();
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
  let safeParse = notificationsResultSchema().safeParse(e.toolUseResult);
  return safeParse.success
    ? safeParse.data.notifications.map((notification) => notification.notification_id)
    : "unknown";
}
//@ chunk-0sfjpx19.js:22304-22373 placement
function Gn(e, n) {
  let r = e[n];
  return r !== void 0 && (isUserPromptAt(e, n, !0) || isMachineOriginPrompt(r));
}
/**
 * 取消息内容中的文本：字符串直接返回，数组拼接全部 text 块，没有文本返回 null。
 */
//@ chunk-0sfjpx19.js:22373-22546 placement
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
/**
 * 被拒状态且重置时间已过。旧版名错配。
 */
//@ chunk-0sfjpx19.js:22546-22644 placement = extractQuotaStatusFromError (0.772)
function isRejectedAndResetPassed(e, n = Date.now()) {
  return e.status === "rejected" && e.resetsAt !== void 0 && e.resetsAt * 1000 <= n;
}
/**
 * 从读数中挑出 five_hour/seven_day/seven_day_overage_included 转成 {utilization,resetsAt,status?,surpassedThreshold?}。
 */
//@ chunk-0sfjpx19.js:22644-22984 placement
function toUtilizationSnapshot(e, n) {
  let r = isValidUtilization(e.five_hour) ? e.five_hour : void 0,
    s = isValidUtilization(e.seven_day) ? e.seven_day : void 0,
    h = isValidUtilization(e.seven_day_overage_included) ? e.seven_day_overage_included : void 0;
  if (!r && !s && !h) return;
  return {
    ...(r && { five_hour: toWindowUtilization(r, n.five_hour) }),
    ...(s && { seven_day: toWindowUtilization(s, n.seven_day) }),
    ...(h && { seven_day_overage_included: toWindowUtilization(h, n.seven_day_overage_included) }),
  };
}
/**
 * 窗口读数转 {utilization, resetsAt, status?, surpassedThreshold?}。
 */
//@ chunk-0sfjpx19.js:22984-23174 placement
function toWindowUtilization(e, n) {
  return {
    utilization: e.utilization,
    resetsAt: e.resets_at,
    ...(n?.status !== void 0 && { status: n.status }),
    ...(n?.surpassedThreshold !== void 0 && { surpassedThreshold: n.surpassedThreshold }),
  };
}
//@ chunk-0sfjpx19.js:23174-23652 placement
function buildRateLimitInfo(e, n, r) {
  let s = e.rateLimitGraceActive === !0 ? getWrapUpZone() : null;
  return createRateLimitEvent(
    {
      ...e,
      rateLimitGraceActive: s !== null,
      ...(s?.extraUsageStatus !== void 0 &&
        e.status !== "rejected" &&
        e.overageStatus === void 0 && { overageStatus: s.extraUsageStatus }),
    },
    getSessionId(),
    {
      includeOverageInUse: !lD(),
      unifiedWindows: toUtilizationSnapshot(getRawUtilization(), getRawWindowLevels()),
      ...(e.status === "allowed_warning" &&
        e.rateLimitType !== "overage" &&
        credentialIsOwnStoredLogin() && { overageEnabled: getOauthAccountInfo()?.hasExtraUsageEnabled }),
      ...(n !== void 0 && { usageCreditOffer: n }),
      ...(r !== void 0 && { adminRequestOffer: r }),
    },
  );
}
//@ chunk-0sfjpx19.js:23652-23665 placement
var li = 30000;
/**
 * 生成 rate_limit_event 节流判定函数：网关提供方不发；限额未变化时只记录；已拒绝且已过重置时间不发；同一重置时刻在最小间隔内只发一次。
 */
//@ chunk-0sfjpx19.js:23665-23980 placement
function createRateLimitEventThrottle({ minimumIntervalMs: e = li, now: n = Date.now } = {}) {
  let r = new Map();
  return function (h) {
    if (getAPIProvider() === "gateway") return !1;
    let y = n(),
      _ = h.resetsAt ?? 0;
    if (!En(getCurrentLimits(), h)) return (r.set(_, y), !1);
    if (isRejectedAndResetPassed(h, y)) return !1;
    for (let [k] of r) if (k !== 0 && k * 1000 <= y) r.delete(k);
    let b = r.get(_);
    if (b !== void 0 && y - b < e) return !1;
    return (r.set(_, y), !0);
  };
}
//@ chunk-0sfjpx19.js:23980-24026 placement
function di() {
  ao().lastRateLimitMirror = void 0;
}
//@ chunk-0sfjpx19.js:24026-24206 placement
function rateLimitMirrorPayload(e, n) {
  let r = ao(),
    lastRateLimitMirror = r.lastRateLimitMirror;
  if (lastRateLimitMirror && lastRateLimitMirror.target.deref() === e && En(lastRateLimitMirror.info, n))
    return;
  return ((r.lastRateLimitMirror = { target: new WeakRef(e), info: n }), { rate_limit_info: n });
}
//@ chunk-0sfjpx19.js:24206-24277 placement
function Ikr(e, n) {
  if (!isBridgeRateLimitEventEnabled()) return;
  return rateLimitMirrorPayload(e, toRateLimitInfo(n.rate_limit_info));
}
/**
 * 把 rate_limit_event 写给桥并镜像到会话元数据，失败只记录。
 */
//@ chunk-0sfjpx19.js:24277-24572 placement
function forwardRateLimitEventToBridge(e, n) {
  if (!isBridgeRateLimitEventEnabled()) return !1;
  try {
    e.writeSdkMessages([n]);
  } catch (error) {
    return (
      logForDebugging(`[bridge] rate_limit_event forward failed: ${errorMessage(error)}`, { level: "error" }),
      !1
    );
  }
  try {
    let r = Ikr(e, n);
    if (r) e.reportMetadata(r);
  } catch (error) {
    logForDebugging(`[bridge] rate_limit_info metadata mirror failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
  return !0;
}
/**
 * 把当前额度限制状态转发给桥接端：被拒且已过重置时间时清除，否则构建限额信息并上报元数据。
 */
//@ chunk-0sfjpx19.js:24572-24733 placement
function forwardRateLimitToBridge() {
  if (!isBridgeRateLimitEventEnabled() || !areLimitsObserved()) return;
  let e = getReplBridgeHandle() ?? getSdkHostedBridgeHandle();
  if (!e) return;
  di();
  let n = getCurrentLimits();
  if (isRejectedAndResetPassed(n)) {
    jn(e);
    return;
  }
  let r = buildRateLimitInfo(n),
    s = r && Ikr(e, r);
  if (s) e.reportMetadata(s);
}
//@ chunk-0sfjpx19.js:24733-24807 placement
function jn(e) {
  if (!isBridgeRateLimitEventEnabled()) return;
  let n = rateLimitMirrorPayload(e, null);
  if (n) e.reportMetadata(n);
}
//@ chunk-0sfjpx19.js:24807-24933 placement
function logBridgeRateLimitForward(e) {
  if (!areLimitsObserved()) return;
  let n = getCurrentLimits();
  if (isRejectedAndResetPassed(n)) {
    jn(e);
    return;
  }
  let r = buildRateLimitInfo(n);
  if (r && forwardRateLimitEventToBridge(e, r)) logFeatureOk("bridge_rate_limit_forward");
}
//@ chunk-0sfjpx19.js:24933-25022 placement
function gNn(e, n, r = Date.now()) {
  let s = e.get(n);
  return (e.delete(n), s !== void 0 && r - s <= 120000);
}

export {
  findSingleToolCallPromptIndex,
  Gn,
  textContentOf,
  notificationAnchorSchema,
  hasCronToolUse,
  forwardRateLimitToBridge,
  logBridgeRateLimitForward,
  buildRateLimitInfo,
  forwardRateLimitEventToBridge,
  gNn,
  Ikr,
  createRateLimitEventThrottle,
  collectReadNotificationsResultIds,
};
