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
function a9n(e) {
  return e.kind === "loop" ? "loop_wakeup" : "schedule_wakeup";
}
//@ chunk-e6aww6q8.js:1813001-1813052 placement
var lQo = ["handoff", "handback", "seeded", "unmarked"];
/**
 * 把提示来源转为钩子看到的来源（唤醒来源优先，否则 sdk、system 或 user）。
 */
//@ chunk-e6aww6q8.js:1813052-1813237 placement
function promptOriginForHooks({ promptSource: promptSource, wakeupSource: wakeupSource }) {
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
/**
 * 确定提示来源：元消息或系统调用为 system，非交互为 sdk，否则为调用方来源或 typed。
 */
//@ chunk-e6aww6q8.js:1813237-1813365 placement
function resolvePromptSource({
  isNonInteractive: isNonInteractive,
  isMeta: isMeta,
  callerSource: callerSource,
}) {
  if (isMeta || callerSource === "system") return "system";
  if (isNonInteractive) return "sdk";
  return callerSource ?? "typed";
}
/**
 * 提示来源类别与唤醒来源的取值列表。
 */
//@ chunk-e6aww6q8.js:1813365-1813676 placement
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
  ],
  WAKEUP_SOURCES = [
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
function uQo(e) {
  return WAKEUP_SOURCES.includes(e);
}
//@ chunk-e6aww6q8.js:1813715-1813784 placement
function htn(e) {
  if (e === void 0 || e === "") return;
  return uQo(e) ? e : "other";
}
//@ chunk-e6aww6q8.js:1813784-1813857 placement
function Xet(e) {
  let n = htn(e);
  return n === void 0 || n === "user" ? void 0 : originKindOfWakeup(n);
}
/**
 * 把唤醒来源映射为提示来源类别（定时、自动继续、对端、宿主合成）。
 */
//@ chunk-e6aww6q8.js:1813857-1814183 placement
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
function fQo(e) {
  switch (e) {
    case "loop_wakeup":
    case "schedule_wakeup":
      return e;
    default:
      return;
  }
}
/**
 * 生成提示相关的遥测字段：唤醒来源、宿主发起方、Artifact 评论回合。
 */
//@ chunk-e6aww6q8.js:1814274-1814521 placement
function promptTelemetryFields({
  wakeupSource: wakeupSource,
  hostInitiator: hostInitiator,
  artifactCommentTurn: artifactCommentTurn,
  inboundOrigin: inboundOrigin,
}) {
  let h = fQo(wakeupSource),
    y = htn(hostInitiator),
    S = void 0,
    found = lQo.find((L) => L === artifactCommentTurn);
  return {
    ...(h && { wakeup_source: fromEnum(h) }),
    ...(y && { host_initiator: fromEnum(y) }),
    ...(found && { artifact_comment_turn: fromEnum(found) }),
    ...void 0,
  };
}
/**
 * 判断提示来源（人工、自动继续、定时触发、对等发送等）。
 */
//@ chunk-e6aww6q8.js:1814521-1815207 placement
function classifyPromptSource({
  origin: origin,
  isMeta: isMeta,
  wakeupSource: wakeupSource,
  promptSource: promptSource,
  hostInitiator: hostInitiator,
}) {
  if (wakeupSource !== void 0) return "scheduled";
  let y = Xet(hostInitiator);
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
    case void 0:
      break;
  }
  if (isMeta) return "system";
  if (y !== void 0) return y;
  if (promptSource === "sdk") return "sdk";
  return "unknown";
}
//@ chunk-e6aww6q8.js:1815207-1815219 placement
var mQo = 1e4;
//@ chunk-e6aww6q8.js:1815219-1815274 placement
function h3e(e, n) {
  return `${String(e)}\x00${String(n)}`;
}
//@ chunk-e6aww6q8.js:1815274-1815469 placement
function singleToolResultId(e) {
  let n = e.message?.content;
  if (!Array.isArray(n)) return;
  let filtered = n.filter((h) => h?.type === "tool_result");
  if (filtered.length !== 1) return;
  let tool_use_id = filtered[0].tool_use_id;
  return tool_use_id === void 0 ? void 0 : String(tool_use_id);
}

export {
  singleToolResultId,
  h3e,
  mQo,
  a9n,
  resolvePromptSource,
  promptTelemetryFields,
  promptOriginForHooks,
  classifyPromptSource,
  PROMPT_ORIGIN_KINDS,
  Xet,
};
