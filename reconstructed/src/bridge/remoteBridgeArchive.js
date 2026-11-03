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

/**
 * 归档远程桥接会话；teleport 过来的、owner 已变更、被接替或已归档的会话不归档并记录原因。
 */
//@ chunk-4cm44bmp.js:98795-99549 placement
async function archiveRemoteBridgeSession(n, h, w, C, N, x, Q) {
  if (isTeleportedSession(n))
    return (
      logForDebugging(`[remote-bridge] Archive suppressed for teleported session ${n}`),
      removeBridgePlaceholdersFor(n, Q),
      200
    );
  if (x === "owner_changed")
    return (
      logForDebugging(`[remote-bridge] Archive suppressed for owner-changed session ${n}`),
      logForDiagnosticsNoPII("info", "bridge_repl_archive_suppressed_owner_changed"),
      "skipped_owner_changed"
    );
  if (x !== void 0)
    return (
      logForDebugging(`[remote-bridge] Archive suppressed for ${x} session ${n}`),
      logForDiagnosticsNoPII(
        "info",
        x === "superseded"
          ? "bridge_repl_archive_suppressed_superseded"
          : x === "session_archived"
            ? "bridge_repl_archive_suppressed_archived"
            : "bridge_repl_archive_suppressed_superseded_unknown",
      ),
      "skipped_superseded"
    );
  if (!w) return "no_token";
  let q = await getTrustedDeviceToken().catch(() => {
      return;
    }),
    A = await archiveCodeSession(h, w, n, N, {
      useV2: isCcrV2SessionCrudEnabled(),
      orgUUID: C,
      trustedDeviceToken: q,
    });
  if (isFinalArchiveOutcome(A)) removeBridgePlaceholdersFor(n, Q);
  return A;
}
//@ chunk-4cm44bmp.js:99549-99574 placement
var zs = 8,
  Xd = 5000,
  Qd = 2000;
/**
 * 重试归档被放弃的远程会话，成功或设备不受信任时停止，每次失败记日志。
 */
//@ chunk-4cm44bmp.js:99574-99854 placement
async function retryArchiveAbandonedSession(n, h) {
  for (let w = 0; w < zs; w++) {
    if (w > 0)
      await sleep(fullJitterBackoffMs({ baseMs: Xd, floorMs: Qd, attempt: w - 1 }), void 0, { unref: !0 });
    let C = await h();
    if (isFinalArchiveOutcome(C) || C === "untrusted_device") return;
    logForDebugging(
      `[remote-bridge] Archive of abandoned session ${n} not confirmed (attempt ${w + 1}/${zs}, status=${C})`,
    );
  }
}
/**
 * 重新激活（取消归档）远程桥接会话，处理 v2 接口与可信设备令牌，返回结果。
 */
//@ chunk-4cm44bmp.js:99854-101108 placement
async function unarchiveRemoteBridgeSession(n, h, w, C, N, x, Q) {
  if (!w) return { outcome: "ok" };
  let q = await getTrustedDeviceToken().catch(() => {
      return;
    }),
    A = await unarchiveCodeSession(h, w, n, N, {
      useV2: isCcrV2SessionCrudEnabled(),
      orgUUID: C,
      trustedDeviceToken: q,
    });
  if (A === "invalid")
    return (
      logForDiagnosticsNoPII("info", "bridge_repl_v2_unarchive_invalid_id"),
      { outcome: "gone", status: "invalid" }
    );
  if (A === "untrusted_device" || A === "untrusted_device_no_enroll" || A === "session_stale_relogin") {
    if (A === "untrusted_device") {
      let Y = await withUntrustedDeviceRecovery(
        q,
        (ie) =>
          unarchiveCodeSession(h, w, n, N, {
            useV2: isCcrV2SessionCrudEnabled(),
            orgUUID: C,
            trustedDeviceToken: ie,
          }),
        Q,
      );
      if (typeof Y === "number" && (Y < 300 || Y === 409))
        return (logForDiagnosticsNoPII("info", "bridge_repl_v2_unarchive_ok"), { outcome: "ok" });
      if (Y === "untrusted_device_no_enroll")
        return (
          logForDiagnosticsNoPII("info", "bridge_repl_v2_unarchive_elevated_auth"),
          { outcome: "elevated_auth", reason: "untrusted_device", refusal: REFUSAL_BEHIND_NO_ENROLL }
        );
    }
    if (
      (logForDiagnosticsNoPII("info", "bridge_repl_v2_unarchive_elevated_auth"),
      A === "untrusted_device_no_enroll")
    )
      return (
        logRefusalWithoutEnrollment("[remote-bridge]", REFUSAL_BEHIND_NO_ENROLL),
        clearTrustedDeviceTokenCache(),
        { outcome: "elevated_auth", reason: "untrusted_device", refusal: REFUSAL_BEHIND_NO_ENROLL }
      );
    return { outcome: "elevated_auth", reason: A };
  }
  if (typeof A !== "number") return (logForDiagnosticsNoPII("info", "bridge_repl_v2_unarchive_failed"), null);
  let Z = A < 300 || A === 409;
  if (
    (logForDiagnosticsNoPII("info", Z ? "bridge_repl_v2_unarchive_ok" : "bridge_repl_v2_unarchive_failed"), Z)
  )
    return { outcome: "ok" };
  if (A === 400 || A === 403 || A === 404) return { outcome: "gone", status: A };
  if (A === 401) x?.();
  return null;
}
/**
 * 只保留最后 h 条消息，但截断点落在某个分组区间内时前移到区间起点。
 */
//@ chunk-4cm44bmp.js:101108-101251 placement
function sliceTailKeepingGroups(n, h) {
  if (h <= 0 || n.length <= h) return n;
  let w = n.length - h;
  for (let { fromIdx: fromIdx, toIdx: toIdx } of findResumedThinkingRanges(n))
    if (w > fromIdx && w <= toIdx) {
      w = fromIdx;
      break;
    }
  return n.slice(w);
}
/**
 * 真实用户输入、不是中断消息、也不含 tool_result。
 */
//@ chunk-4cm44bmp.js:101251-101399 placement
function isPlainUserPrompt(n) {
  if (n.type !== "user" || !isRealUserTurn(n) || isInterruptionMessage(n)) return !1;
  let content = n.message.content;
  return typeof content === "string" || !content.some((w) => w.type === "tool_result");
}
/**
 * 带 parent_tool_use_id 的子代理消息，且不是发起 Agent/Task 工具调用的助手消息。
 */
//@ chunk-4cm44bmp.js:101399-101602 placement
function isSubagentStreamMessage(n) {
  if (
    (n.type !== "assistant" && n.type !== "user") ||
    n.parent_tool_use_id == null ||
    !isTaskLifecycleMessage(n)
  )
    return !1;
  return (
    n.type === "user" ||
    !n.message.content.some((h) => h.type === "tool_use" && (h.name === AGENT || h.name === TASK))
  );
}
/**
 * 只含中断提示文本的用户消息。
 */
//@ chunk-4cm44bmp.js:101602-101772 placement
function isInterruptionMessage(n) {
  if (n.type !== "user" || !isInterruptionOnlyMessage(n)) return !1;
  let content = n.message.content;
  return typeof content === "string"
    ? INTERRUPTION_TEXT_PREFIXES.includes(content)
    : content.every((w) => w.type !== "text" || INTERRUPTION_TEXT_PREFIXES.includes(w.text));
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
