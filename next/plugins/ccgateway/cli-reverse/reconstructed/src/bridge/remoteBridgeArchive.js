/**
 * bridge/remoteBridgeArchive.ts
 *
 * 2.1.316 新增：重新激活（取消归档）远程桥接会话，处理 v2 接口与可信设备令牌，返回结果；归档远程桥接会话；teleport 过来的、owner 已变更、被接替或已归档的会话不归档并记录原因。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4cm44bmp.js (8)
 * attribution: placement 8
 */
import { isTeleportedSession } from "./createSession.js";
import { logForDebugging } from "../utils/debug.js";
import { removeBridgePlaceholdersFor, isFinalArchiveOutcome } from "./bridgeReconnectBudget.js";
import { logForDiagnosticsNoPII } from "../utils/diagLogs.js";
import {
  getTrustedDeviceToken,
  withUntrustedDeviceRecovery,
  logRefusalWithoutEnrollment,
  clearTrustedDeviceTokenCache,
} from "./trustedDevice.js";
import { archiveCodeSession, unarchiveCodeSession, REFUSAL_BEHIND_NO_ENROLL } from "./codeSessionApi.js";
import { isCcrV2SessionCrudEnabled } from "./bridgeGates.js";
import { sleep, fullJitterBackoffMs } from "../utils/sleep.js";
import { findResumedThinkingRanges } from "../cli/transports/ccrMessageMapping.js";
import { isRealUserTurn } from "./bridgeMessaging.js";
import { isTaskLifecycleMessage } from "./remoteBridgeSettle.js";
import { AGENT, TASK } from "../tools/AgentTool/constants.js";
import { isInterruptionOnlyMessage, INTERRUPTION_TEXT_PREFIXES } from "../utils/messages.js";

//@ chunk-4cm44bmp.js:98795-99549 placement
/**
 * 归档远程桥接会话；teleport 过来的、owner 已变更、被接替或已归档的会话不归档并记录原因。
 */
async function archiveRemoteBridgeSession(
  sessionId,
  baseUrl,
  accessToken,
  orgUUID,
  httpTimeoutMs,
  suppressionReason,
  storageV5,
) {
  if (isTeleportedSession(sessionId)) {
    logForDebugging(`[remote-bridge] Archive suppressed for teleported session ${sessionId}`);
    removeBridgePlaceholdersFor(sessionId, storageV5);
    return 200;
  }
  if (suppressionReason === "owner_changed") {
    logForDebugging(`[remote-bridge] Archive suppressed for owner-changed session ${sessionId}`);
    logForDiagnosticsNoPII("info", "bridge_repl_archive_suppressed_owner_changed");
    return "skipped_owner_changed";
  }
  if (suppressionReason !== undefined) {
    logForDebugging(`[remote-bridge] Archive suppressed for ${suppressionReason} session ${sessionId}`);
    logForDiagnosticsNoPII(
      "info",
      suppressionReason === "superseded"
        ? "bridge_repl_archive_suppressed_superseded"
        : suppressionReason === "session_archived"
          ? "bridge_repl_archive_suppressed_archived"
          : "bridge_repl_archive_suppressed_superseded_unknown",
    );
    return "skipped_superseded";
  }
  if (!accessToken) return "no_token";
  let trustedDeviceToken = await getTrustedDeviceToken().catch(() => {
    return;
  });
  let outcome = await archiveCodeSession(baseUrl, accessToken, sessionId, httpTimeoutMs, {
    useV2: isCcrV2SessionCrudEnabled(),
    orgUUID,
    trustedDeviceToken,
  });
  if (isFinalArchiveOutcome(outcome)) removeBridgePlaceholdersFor(sessionId, storageV5);
  return outcome;
}
//@ chunk-4cm44bmp.js:99549-99574 placement
var ARCHIVE_RETRY_ATTEMPTS = 8;
var ARCHIVE_RETRY_BASE_MS = 5000;
var ARCHIVE_RETRY_FLOOR_MS = 2000;
//@ chunk-4cm44bmp.js:99574-99854 placement
/**
 * 重试归档被放弃的远程会话，成功或设备不受信任时停止，每次失败记日志。
 */
async function retryArchiveAbandonedSession(sessionId, archiveOnce) {
  for (let i = 0; i < ARCHIVE_RETRY_ATTEMPTS; i++) {
    if (i > 0)
      await sleep(
        fullJitterBackoffMs({
          baseMs: ARCHIVE_RETRY_BASE_MS,
          floorMs: ARCHIVE_RETRY_FLOOR_MS,
          attempt: i - 1,
        }),
        undefined,
        {
          unref: true,
        },
      );
    let outcome = await archiveOnce();
    if (isFinalArchiveOutcome(outcome) || outcome === "untrusted_device") return;
    logForDebugging(
      `[remote-bridge] Archive of abandoned session ${sessionId} not confirmed (attempt ${i + 1}/${ARCHIVE_RETRY_ATTEMPTS}, status=${outcome})`,
    );
  }
}
//@ chunk-4cm44bmp.js:99854-101108 placement
/**
 * 重新激活（取消归档）远程桥接会话，处理 v2 接口与可信设备令牌，返回结果。
 */
async function unarchiveRemoteBridgeSession(
  sessionId,
  baseUrl,
  accessToken,
  orgUUID,
  httpTimeoutMs,
  onUnauthorized,
  credentials,
) {
  if (!accessToken)
    return {
      outcome: "ok",
    };
  let refusedToken = await getTrustedDeviceToken().catch(() => {
    return;
  });
  let outcome = await unarchiveCodeSession(baseUrl, accessToken, sessionId, httpTimeoutMs, {
    useV2: isCcrV2SessionCrudEnabled(),
    orgUUID,
    trustedDeviceToken: refusedToken,
  });
  if (outcome === "invalid") {
    logForDiagnosticsNoPII("info", "bridge_repl_v2_unarchive_invalid_id");
    return {
      outcome: "gone",
      status: "invalid",
    };
  }
  if (
    outcome === "untrusted_device" ||
    outcome === "untrusted_device_no_enroll" ||
    outcome === "session_stale_relogin"
  ) {
    if (outcome === "untrusted_device") {
      let recoveryOutcome = await withUntrustedDeviceRecovery(
        refusedToken,
        (trustedDeviceToken) =>
          unarchiveCodeSession(baseUrl, accessToken, sessionId, httpTimeoutMs, {
            useV2: isCcrV2SessionCrudEnabled(),
            orgUUID,
            trustedDeviceToken,
          }),
        credentials,
      );
      if (typeof recoveryOutcome === "number" && (recoveryOutcome < 300 || recoveryOutcome === 409)) {
        logForDiagnosticsNoPII("info", "bridge_repl_v2_unarchive_ok");
        return {
          outcome: "ok",
        };
      }
      if (recoveryOutcome === "untrusted_device_no_enroll") {
        logForDiagnosticsNoPII("info", "bridge_repl_v2_unarchive_elevated_auth");
        return {
          outcome: "elevated_auth",
          reason: "untrusted_device",
          refusal: REFUSAL_BEHIND_NO_ENROLL,
        };
      }
    }
    logForDiagnosticsNoPII("info", "bridge_repl_v2_unarchive_elevated_auth");
    if (outcome === "untrusted_device_no_enroll") {
      logRefusalWithoutEnrollment("[remote-bridge]", REFUSAL_BEHIND_NO_ENROLL);
      clearTrustedDeviceTokenCache();
      return {
        outcome: "elevated_auth",
        reason: "untrusted_device",
        refusal: REFUSAL_BEHIND_NO_ENROLL,
      };
    }
    return {
      outcome: "elevated_auth",
      reason: outcome,
    };
  }
  if (typeof outcome !== "number") {
    logForDiagnosticsNoPII("info", "bridge_repl_v2_unarchive_failed");
    return null;
  }
  let isSuccess = outcome < 300 || outcome === 409;
  logForDiagnosticsNoPII(
    "info",
    isSuccess ? "bridge_repl_v2_unarchive_ok" : "bridge_repl_v2_unarchive_failed",
  );
  if (isSuccess)
    return {
      outcome: "ok",
    };
  if (outcome === 400 || outcome === 403 || outcome === 404)
    return {
      outcome: "gone",
      status: outcome,
    };
  if (outcome === 401) onUnauthorized?.();
  return null;
}
//@ chunk-4cm44bmp.js:101108-101251 placement
/**
 * 只保留最后 h 条消息，但截断点落在某个分组区间内时前移到区间起点。
 */
function sliceTailKeepingGroups(messages, keepCount) {
  if (keepCount <= 0 || messages.length <= keepCount) return messages;
  let startIdx = messages.length - keepCount;
  for (let { fromIdx, toIdx } of findResumedThinkingRanges(messages))
    if (startIdx > fromIdx && startIdx <= toIdx) {
      startIdx = fromIdx;
      break;
    }
  return messages.slice(startIdx);
}
//@ chunk-4cm44bmp.js:101251-101399 placement
/**
 * 真实用户输入、不是中断消息、也不含 tool_result。
 */
function isPlainUserPrompt(message) {
  if (message.type !== "user" || !isRealUserTurn(message) || isInterruptionMessage(message)) return false;
  let content = message.message.content;
  return typeof content === "string" || !content.some((block) => block.type === "tool_result");
}
//@ chunk-4cm44bmp.js:101399-101602 placement
/**
 * 带 parent_tool_use_id 的子代理消息，且不是发起 Agent/Task 工具调用的助手消息。
 */
function isSubagentStreamMessage(message) {
  if (
    (message.type !== "assistant" && message.type !== "user") ||
    message.parent_tool_use_id == null ||
    !isTaskLifecycleMessage(message)
  )
    return false;
  return (
    message.type === "user" ||
    !message.message.content.some(
      (block) => block.type === "tool_use" && (block.name === AGENT || block.name === TASK),
    )
  );
}
//@ chunk-4cm44bmp.js:101602-101772 placement
/**
 * 只含中断提示文本的用户消息。
 */
function isInterruptionMessage(message) {
  if (message.type !== "user" || !isInterruptionOnlyMessage(message)) return false;
  let content = message.message.content;
  return typeof content === "string"
    ? INTERRUPTION_TEXT_PREFIXES.includes(content)
    : content.every((block) => block.type !== "text" || INTERRUPTION_TEXT_PREFIXES.includes(block.text));
}
export {
  unarchiveRemoteBridgeSession,
  archiveRemoteBridgeSession,
  retryArchiveAbandonedSession,
  isInterruptionMessage,
  sliceTailKeepingGroups,
  isPlainUserPrompt,
  isSubagentStreamMessage,
};
