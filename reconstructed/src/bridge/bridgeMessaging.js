/**
 * bridge/bridgeMessaging.ts
 *
 * 桥消息助手：control_request/response 识别、出站可转发消息过滤、入站消息分派 handleIngressMessage、服务端控制请求应答、UUID 去重集合、结果消息合并
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/bridgeMessaging.ts
 * pieces: chunk-1qpz7qcd.js (15)
 * attribution: fingerprint 6, layout 7, callgraph-fingerprint 2
 */
import { bridgeHostState } from "./bridgeHostState.js";
import { isHumanOrAutoContinuation } from "../utils/messageProvenance.js";
import { isLocalCommandMessage } from "../utils/messages/localCommandTags.js";
import { isHumanTurn_3 } from "../utils/messagePredicates.js";
import { unwrapReminderText } from "../utils/systemReminder.js";
import { normalizeControlMessage } from "../utils/controlMessageCompat.js";
import { jsonParse } from "../utils/slowOperations.js";
import { logForDebugging } from "../utils/debug.js";
import { hasStringType_3, isDisplayOnlyHistoricalMessage, markLiveOnlyResponse } from "./controlRequests.js";
import { logEvent } from "../services/analytics/index.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { errorMessage } from "../utils/errors.js";
import { formatOperationFailure } from "../services/plugins/pluginOperations.js";
import { controlErrorResponse, controlSuccessResponse } from "../cli/print.js";
import { wantsLiveReply } from "./replControlHandler.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, stringSchema, literal } from "../../vendor/zod/v4/classic/schemas.js";
import { RELAY_SOURCE_KINDS_2 } from "../services/projectsRelay/relayConfig.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-1qpz7qcd.js:3281-3408 fingerprint = isSDKControlResponse (0.932)
function isSDKControlResponse(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    "type" in value &&
    value.type === "control_response" &&
    "response" in value &&
    value.response != null
  );
}
//@ chunk-1qpz7qcd.js:3408-3550 fingerprint = isSDKControlRequest (0.949)
function isSDKControlRequest(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    "type" in value &&
    value.type === "control_request" &&
    "request_id" in value &&
    "request" in value &&
    value.request != null
  );
}
//@ chunk-1qpz7qcd.js:3550-3595 layout
/**
 * 设置"状态帧"闸门（决定 compact_boundary 等是否转发）。
 */
function setBridgeStateFramesGate(gate) {
  bridgeHostState().bridgeStateFramesGate = gate;
}
//@ chunk-1qpz7qcd.js:3595-4144 callgraph-fingerprint = isEligibleBridgeMessage (0.273)
/**
 * 出站过滤：哪些本地消息要镜像到 Remote Control（user/assistant、非虚拟；hook_system_message、tool_host_result_lines、来自用户的 prompt 型 queued_command 附件；local_command、model_consent_fallback、受闸门控制的 compact_boundary）。
 */
function isEligibleBridgeMessage(message) {
  if ((message.type === "user" || message.type === "assistant") && message.isVirtual) return false;
  if (message.type === "attachment") {
    if (message.attachment.type === "hook_system_message") return true;
    if (message.attachment.type === "tool_host_result_lines") return true;
    return (
      message.attachment.type === "queued_command" &&
      message.attachment.commandMode === "prompt" &&
      !message.attachment.isMeta &&
      isHumanOrAutoContinuation(message.attachment.origin)
    );
  }
  return (
    message.type === "user" ||
    message.type === "assistant" ||
    (message.type === "system" &&
      (message.subtype === "local_command" ||
        message.subtype === "model_consent_fallback" ||
        (message.subtype === "compact_boundary" && (bridgeHostState().bridgeStateFramesGate?.() ?? true))))
  );
}
//@ chunk-1qpz7qcd.js:4144-4213 layout
/**
 * 是否是真实用户回合（非压缩摘要、非合成消息）。
 */
function isRealUserTurn(message) {
  return message.type === "user" && !message.isCompactSummary && !isLocalCommandMessage(message);
}
//@ chunk-1qpz7qcd.js:4213-4315 layout
/**
 * 是否是附件消息或 model_consent_fallback 系统消息。
 */
function isAttachmentOrConsentFallback(message) {
  return (
    message.type === "attachment" ||
    (message.type === "system" && message.subtype === "model_consent_fallback")
  );
}
//@ chunk-1qpz7qcd.js:4315-4733 layout
/**
 * 是否是瞬时 SDK 帧（conversation_reset、stream_event、status、task_* 系列、background_tasks_changed、thinking_tokens、code_change_published、vcs_state_changed、file_attachments_missing）。
 */
function isEphemeralSdkFrame(frame) {
  return (
    frame.type === "conversation_reset" ||
    frame.type === "stream_event" ||
    (frame.type === "system" && frame.subtype === "status") ||
    frame.subtype === "task_started" ||
    frame.subtype === "task_progress" ||
    frame.subtype === "task_updated" ||
    frame.subtype === "task_notification" ||
    frame.subtype === "background_tasks_changed" ||
    frame.subtype === "thinking_tokens" ||
    frame.subtype === "code_change_published" ||
    frame.subtype === "vcs_state_changed" ||
    frame.subtype === "file_attachments_missing"
  );
}
//@ chunk-1qpz7qcd.js:4733-4910 layout
/**
 * 从人类回合的首段文本派生会话标题。
 */
function deriveTitleFromHumanTurn(message) {
  if (!isHumanTurn_3(message)) return;
  let content = message.message.content;
  let raw;
  if (typeof content === "string") raw = content;
  else
    for (let block of content)
      if (block.type === "text") {
        raw = block.text;
        break;
      }
  if (!raw) return;
  return unwrapReminderText(raw) || undefined;
}
//@ chunk-1qpz7qcd.js:4910-6723 fingerprint = handleIngressMessage (0.59)
/**
 * 解析一条入站帧并分派：control_response → onPermissionResponse；control_request → onControlRequest；control_cancel_request → onControlCancel；
 * queued_notification（MCP send_message 形状的转成合成 user 帧，否则交给通知缓冲）；user 帧去掉回显（recentPosted）、重复投递、replay、带 parent_tool_use_id、fork 显示帧后交给 onInboundMessage。其余类型忽略。
 */
function handleIngressMessage(
  rawData,
  recentPostedUUIDs,
  recentInboundUUIDs,
  onInboundMessage,
  onPermissionResponse,
  onControlRequest,
  onControlCancel,
  onQueuedNotification,
) {
  try {
    let parsed = normalizeControlMessage(jsonParse(rawData));
    if (isSDKControlResponse(parsed)) {
      logForDebugging("[bridge:repl] Ingress message type=control_response");
      onPermissionResponse?.(parsed);
      return;
    }
    if (isSDKControlRequest(parsed)) {
      logForDebugging(`[bridge:repl] Inbound control_request subtype=${parsed.request.subtype}`);
      onControlRequest?.(parsed);
      return;
    }
    if (
      hasStringType_3(parsed) &&
      parsed.type === "control_cancel_request" &&
      "request_id" in parsed &&
      typeof parsed.request_id === "string"
    ) {
      logForDebugging(`[bridge:repl] Inbound control_cancel_request request_id=${parsed.request_id}`);
      onControlCancel?.(parsed.request_id);
      return;
    }
    if (isQueuedNotificationFrame(parsed)) {
      let userFrame = notificationToUserFrame(parsed.notification);
      if (userFrame === undefined) {
        if (onQueuedNotification) {
          logForDebugging("[bridge:repl] Ingress message type=queued_notification");
          onQueuedNotification({
            type: "queued_notification",
            notification: parsed.notification,
          });
        } else logForDebugging("[bridge:repl] Ignoring queued_notification: host has no notification buffer");
        return;
      }
      logForDebugging(
        "[bridge:repl] Ingress queued_notification from another session: delivering as its user frame",
      );
      parsed = userFrame;
    }
    if (!hasStringType_3(parsed)) return;
    let uuid = "uuid" in parsed && typeof parsed.uuid === "string" ? parsed.uuid : undefined;
    if (uuid && recentPostedUUIDs.has(uuid)) {
      logForDebugging(`[bridge:repl] Ignoring echo: type=${parsed.type} uuid=${uuid}`);
      return;
    }
    if (uuid && recentInboundUUIDs.has(uuid)) {
      logForDebugging(`[bridge:repl] Ignoring re-delivered inbound: type=${parsed.type} uuid=${uuid}`);
      return;
    }
    logForDebugging(`[bridge:repl] Ingress message type=${parsed.type}${uuid ? ` uuid=${uuid}` : ""}`);
    if (parsed.type === "user") {
      if ("isReplay" in parsed && parsed.isReplay === true) {
        logForDebugging(`[bridge:repl] Ignoring replay echo: uuid=${uuid ?? "none"}`);
        return;
      }
      if ("parent_tool_use_id" in parsed && parsed.parent_tool_use_id != null) {
        logForDebugging(
          `[bridge:repl] Ignoring parented user frame at ingress (echo/replay of a subagent frame): uuid=${uuid}`,
        );
        return;
      }
      if (isDisplayOnlyHistoricalMessage(parsed)) {
        logForDebugging(`[bridge:repl] Ignoring fork display frame at ingress: uuid=${uuid ?? "none"}`);
        return;
      }
      if (uuid) recentInboundUUIDs.add(uuid);
      logEvent("tengu_bridge_message_received", {
        is_repl: true,
      });
      logFeatureOk("bridge_message_receive");
      onInboundMessage?.(parsed);
    } else logForDebugging(`[bridge:repl] Ignoring non-user inbound message: type=${parsed.type}`);
  } catch (err) {
    logForDebugging(`[bridge:repl] Failed to parse ingress message: ${errorMessage(err)}`);
    logFeatureBad("bridge_message_receive", "bridge_message_receive_parse_failed");
  }
}
//@ chunk-1qpz7qcd.js:6723-7139 fingerprint = OUTBOUND_ONLY_ERROR (0.304)
/**
 * 服务端控制请求处理用的常量：可接受的 flag 设置键、超时与提示文本（outbound-only 拒绝、get_workspace_diff 超时、side_question 超时/无答案）。
 */
var ALLOWED_FLAG_SETTING_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_FLAG_SETTING_CHANGE_KEYS;
var MAX_FLAG_SETTING_VALUE_CHARS;
var OUTBOUND_ONLY_ERROR;
var WORKSPACE_DIFF_TIMEOUT_MS;
var WORKSPACE_DIFF_TIMEOUT_MESSAGE;
var SIDE_QUESTION_TIMEOUT_MS;
var SIDE_QUESTION_TIMEOUT_MESSAGE;
var SIDE_QUESTION_NO_ANSWER;
deferInit("chunk-1qpz7qcd.js:6723", () => {
  ALLOWED_FLAG_SETTING_KEYS = new Set(["effortLevel", "ultracode"]);
  MAX_FLAG_SETTING_CHANGE_KEYS = 5;
  MAX_FLAG_SETTING_VALUE_CHARS = 40;
  OUTBOUND_ONLY_ERROR =
    "This session is outbound-only. Enable Remote Control locally to allow inbound control.";
  WORKSPACE_DIFF_TIMEOUT_MS = 8000;
  WORKSPACE_DIFF_TIMEOUT_MESSAGE =
    "get_workspace_diff timed out: the workspace diff is still being computed; retry shortly";
  SIDE_QUESTION_TIMEOUT_MS = 660000;
  SIDE_QUESTION_TIMEOUT_MESSAGE = "side_question timed out: the host did not answer in time";
  SIDE_QUESTION_NO_ANSWER =
    "(No answer available for this side question. Try again, or ask in the main conversation.)";
});
//@ chunk-1qpz7qcd.js:8103-8506 fingerprint = handleServerControlRequest (0.312)
/**
 * （旧版 handleServerControlRequest 的 316 对应物在 _unattributed 的 chunk-1qpz7qcd.js#__i；本函数只负责回写）等待控制请求的处理结果后写回 control_response（错误映射为 error/error_code，实时回复用专门帧），附 session_id。
 */
function sendControlResponseWhenSettled(request, writeFrame, sessionId, responsePromise) {
  responsePromise
    .catch((error) => ({
      subtype: "error",
      error: formatOperationFailure(request.request.subtype, error),
    }))
    .then((outcome) => {
      let event = {
        ...(outcome.subtype === "error"
          ? controlErrorResponse(
              request.request_id,
              outcome.error,
              "error_code" in outcome ? outcome.error_code : undefined,
            )
          : wantsLiveReply(request, outcome.response)
            ? markLiveOnlyResponse(request.request_id, outcome.response ?? {})
            : controlSuccessResponse(request.request_id, outcome.response ?? {})),
        session_id: sessionId,
      };
      writeFrame(event);
      logForDebugging(
        `[bridge:repl] Sent control_response for ${request.request.subtype} request_id=${request.request_id} result=${outcome.subtype}`,
      );
    });
}
//@ chunk-1qpz7qcd.js:25657-26034 fingerprint = BoundedUUIDSet (1)
/**
 * 固定容量的环形 UUID 去重集合（满了淘汰最旧）。
 */
class BoundedUUIDSet {
  capacity;
  ring;
  set = new Set();
  writeIdx = 0;
  constructor(capacity) {
    this.capacity = capacity;
    this.ring = Array(capacity);
  }
  add(uuid) {
    if (this.set.has(uuid)) return;
    let evicted = this.ring[this.writeIdx];
    if (evicted !== undefined) this.set.delete(evicted);
    this.ring[this.writeIdx] = uuid;
    this.set.add(uuid);
    this.writeIdx = (this.writeIdx + 1) % this.capacity;
  }
  has(uuid) {
    return this.set.has(uuid);
  }
  clear() {
    this.set.clear();
    this.ring.fill(undefined);
    this.writeIdx = 0;
  }
}
//@ chunk-1qpz7qcd.js:26034-26106 layout
var mcpSendMessageNotificationSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-1qpz7qcd.js:26034", () => {
  mcpSendMessageNotificationSchema = DoctorLazy(() =>
    objectSchema({
      notification_id: stringSchema().min(1),
      origin: literal(RELAY_SOURCE_KINDS_2),
      content: stringSchema(),
    }),
  );
});
//@ chunk-1qpz7qcd.js:26106-26317 layout
/**
 * 把 MCP send_message 来源的 queued_notification 转成合成 user 帧（uuid=notification_id）。
 */
function notificationToUserFrame(notification) {
  let parsed = mcpSendMessageNotificationSchema().safeParse(notification);
  if (!parsed.success) return;
  return {
    type: "user",
    uuid: parsed.data.notification_id,
    message: {
      role: "user",
      content: parsed.data.content,
    },
    parent_tool_use_id: null,
    isSynthetic: true,
    inbound_origin: RELAY_SOURCE_KINDS_2,
  };
}
//@ chunk-1qpz7qcd.js:26317-26413 callgraph-fingerprint = isSDKMessage (0.548)
function isQueuedNotificationFrame(value) {
  return (
    typeof value === "object" && value !== null && "type" in value && value.type === "queued_notification"
  );
}
export {
  BoundedUUIDSet,
  isEligibleBridgeMessage,
  isEphemeralSdkFrame,
  SIDE_QUESTION_TIMEOUT_MS,
  SIDE_QUESTION_TIMEOUT_MESSAGE,
  deriveTitleFromHumanTurn,
  SIDE_QUESTION_NO_ANSWER,
  sendControlResponseWhenSettled,
  OUTBOUND_ONLY_ERROR,
  WORKSPACE_DIFF_TIMEOUT_MS,
  WORKSPACE_DIFF_TIMEOUT_MESSAGE,
  ALLOWED_FLAG_SETTING_KEYS,
  MAX_FLAG_SETTING_CHANGE_KEYS,
  MAX_FLAG_SETTING_VALUE_CHARS,
  isAttachmentOrConsentFallback,
  isRealUserTurn,
  handleIngressMessage,
  setBridgeStateFramesGate,
};
