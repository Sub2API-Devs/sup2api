/**
 * utils/promptSource.ts
 *
 * 2.1.316 新增：提示来源
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (15)
 * attribution: placement 15
 */
import { fromEnum } from "../services/analytics/safeMetadata.js";

//@ chunk-e6aww6q8.js:1812930-1813001 placement
/**
 * wakeupSourceForKind：由 kind 得到唤醒来源。
 */
function wakeupSourceForKind(e) {
  return e.kind === "loop" ? "loop_wakeup" : "schedule_wakeup";
}
//@ chunk-e6aww6q8.js:1813001-1813052 placement
var WAKEUP_SOURCES = ["handoff", "handback", "seeded", "unmarked"];
//@ chunk-e6aww6q8.js:1813052-1813237 placement
/**
 * 把提示来源转为钩子看到的来源（唤醒来源优先，否则 sdk、system 或 user）。
 */
function promptOriginForHooks({ promptSource, wakeupSource }) {
  if (wakeupSource) return wakeupSource;
  switch (promptSource) {
    case "sdk":
      return "sdk";
    case "system":
      return "system";
    case "typed":
    case "queued":
    case "suggestion_accepted":
      return "user";
  }
}
//@ chunk-e6aww6q8.js:1813237-1813365 placement
/**
 * 确定提示来源：元消息或系统调用为 system，非交互为 sdk，否则为调用方来源或 typed。
 */
function resolvePromptSource({ isNonInteractive, isMeta, callerSource }) {
  if (isMeta || callerSource === "system") return "system";
  if (isNonInteractive) return "sdk";
  return callerSource ?? "typed";
}
//@ chunk-e6aww6q8.js:1813365-1813676 placement
/**
 * 提示来源类别与唤醒来源的取值列表。
 */
var PROMPT_ORIGIN_KINDS = [
  "human",
  "sdk",
  "scheduled",
  "task_notification",
  "auto_continuation",
  "peer",
  "host_synthetic",
  "system",
  "unknown",
];
var WAKEUP_SOURCES_2 = [
  "user",
  "scheduled-task",
  "sleep-auto-resume",
  "quit-auto-resume",
  "remote-restart-auto-resume",
  "ci-monitor",
  "dispatch",
  "side-session-brief",
  "side-session-start",
  "side-session-wake",
  "other",
];
//@ chunk-e6aww6q8.js:1813676-1813715 placement
function isWakeupSource(e) {
  return WAKEUP_SOURCES_2.includes(e);
}
//@ chunk-e6aww6q8.js:1813715-1813784 placement
function normalizeWakeupSource(e) {
  if (e === undefined || e === "") return;
  return isWakeupSource(e) ? e : "other";
}
//@ chunk-e6aww6q8.js:1813784-1813857 placement
/**
 * originKindForWakeup：唤醒来源对应的来源种类。
 */
function originKindForWakeup(hostInitiator) {
  let n = normalizeWakeupSource(hostInitiator);
  return n === undefined || n === "user" ? undefined : originKindOfWakeup(n);
}
//@ chunk-e6aww6q8.js:1813857-1814183 placement
/**
 * 把唤醒来源映射为提示来源类别（定时、自动继续、对端、宿主合成）。
 */
function originKindOfWakeup(e) {
  switch (e) {
    case "scheduled-task":
      return "scheduled";
    case "sleep-auto-resume":
    case "quit-auto-resume":
    case "remote-restart-auto-resume":
    case "ci-monitor":
      return "auto_continuation";
    case "dispatch":
      return "peer";
    case "side-session-brief":
    case "side-session-start":
    case "side-session-wake":
    case "other":
      return "host_synthetic";
  }
}
//@ chunk-e6aww6q8.js:1814183-1814274 placement
function scheduledWakeupKind(wakeupSource) {
  switch (wakeupSource) {
    case "loop_wakeup":
    case "schedule_wakeup":
      return wakeupSource;
    default:
      return;
  }
}
//@ chunk-e6aww6q8.js:1814274-1814521 placement
/**
 * 生成提示相关的遥测字段：唤醒来源、宿主发起方、Artifact 评论回合。
 */
function promptTelemetryFields({ wakeupSource, hostInitiator, artifactCommentTurn, inboundOrigin }) {
  let h = scheduledWakeupKind(wakeupSource);
  let y = normalizeWakeupSource(hostInitiator);
  let S = undefined;
  let found = WAKEUP_SOURCES.find((L) => L === artifactCommentTurn);
  return {
    ...(h && {
      wakeup_source: fromEnum(h),
    }),
    ...(y && {
      host_initiator: fromEnum(y),
    }),
    ...(found && {
      artifact_comment_turn: fromEnum(found),
    }),
    ...undefined,
  };
}
//@ chunk-e6aww6q8.js:1814521-1815207 placement
/**
 * 判断提示来源（人工、自动继续、定时触发、对等发送等）。
 */
function classifyPromptSource({ origin, isMeta, wakeupSource, promptSource, hostInitiator }) {
  if (wakeupSource !== undefined) return "scheduled";
  let y = originKindForWakeup(hostInitiator);
  switch (origin?.kind) {
    case "human":
      return y ?? "human";
    case "auto-continuation":
      return "auto_continuation";
    case "task-notification":
      if (origin.subkind === "scheduled-trigger") return "scheduled";
      if (origin.subkind === "peer-send-message" || origin.subkind === "projects-relay") return "peer";
      return "task_notification";
    case "peer":
    case "channel":
    case "coordinator":
    case "observer":
    case "observer-activity":
    case "slack-ping":
      return "peer";
    case "unclassified":
      return "host_synthetic";
    case "plugin":
      return "system";
    case undefined:
      break;
  }
  if (isMeta) return "system";
  if (y !== undefined) return y;
  if (promptSource === "sdk") return "sdk";
  return "unknown";
}
//@ chunk-e6aww6q8.js:1815207-1815219 placement
/**
 * WAKEUP_ORIGIN_TTL_MS：唤醒来源记录的有效期。
 */
var WAKEUP_ORIGIN_TTL_MS = 1e4;
//@ chunk-e6aww6q8.js:1815219-1815274 placement
/**
 * wakeupDedupKey：唤醒去重键。
 */
function wakeupDedupKey(uuid, n) {
  return `${String(uuid)}\x00${String(n)}`;
}
//@ chunk-e6aww6q8.js:1815274-1815469 placement
function singleToolResultId(e) {
  let content = e.message?.content;
  if (!Array.isArray(content)) return;
  let filtered = content.filter((h) => h?.type === "tool_result");
  if (filtered.length !== 1) return;
  let toolUseId = filtered[0].tool_use_id;
  return toolUseId === undefined ? undefined : String(toolUseId);
}
export {
  singleToolResultId,
  wakeupDedupKey,
  WAKEUP_ORIGIN_TTL_MS,
  wakeupSourceForKind,
  resolvePromptSource,
  promptTelemetryFields,
  promptOriginForHooks,
  classifyPromptSource,
  PROMPT_ORIGIN_KINDS,
  originKindForWakeup,
};
