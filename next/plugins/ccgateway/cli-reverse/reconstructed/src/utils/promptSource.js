/**
 * utils/promptSource.ts
 *
 * 2.1.316 新增：提示来源
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (15)
 * attribution: placement 15
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { fromEnum } from "../services/analytics/safeMetadata.js";

//@ chunk-5xgkngpb.js:1889835-1889906 placement
/**
 * wakeupSourceForKind：由 kind 得到唤醒来源。
 */
function wakeupSourceForKind(source) {
  return source.kind === "loop" ? "loop_wakeup" : "schedule_wakeup";
}
//@ chunk-5xgkngpb.js:1889906-1889957 placement
var WAKEUP_SOURCES = ["handoff", "handback", "seeded", "unmarked"];
//@ chunk-5xgkngpb.js:1889957-1890142 placement
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
//@ chunk-5xgkngpb.js:1890142-1890270 placement
/**
 * 确定提示来源：元消息或系统调用为 system，非交互为 sdk，否则为调用方来源或 typed。
 */
function resolvePromptSource({ isNonInteractive, isMeta, callerSource }) {
  if (isMeta || callerSource === "system") return "system";
  if (isNonInteractive) return "sdk";
  return callerSource ?? "typed";
}
//@ chunk-5xgkngpb.js:1890270-1890581 placement
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
//@ chunk-5xgkngpb.js:1890581-1890620 placement
function isWakeupSource(source) {
  return WAKEUP_SOURCES_2.includes(source);
}
//@ chunk-5xgkngpb.js:1890620-1890689 placement
function normalizeWakeupSource(source) {
  if (source === undefined || source === "") return;
  return isWakeupSource(source) ? source : "other";
}
//@ chunk-5xgkngpb.js:1890689-1890762 placement
/**
 * originKindForWakeup：唤醒来源对应的来源种类。
 */
function originKindForWakeup(source) {
  let source_2 = normalizeWakeupSource(source);
  return source_2 === undefined || source_2 === "user" ? undefined : originKindOfWakeup(source_2);
}
//@ chunk-5xgkngpb.js:1890762-1891088 placement
/**
 * 把唤醒来源映射为提示来源类别（定时、自动继续、对端、宿主合成）。
 */
function originKindOfWakeup(source) {
  switch (source) {
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
//@ chunk-5xgkngpb.js:1891088-1891179 placement
function scheduledWakeupKind(wakeupSource) {
  switch (wakeupSource) {
    case "loop_wakeup":
    case "schedule_wakeup":
      return wakeupSource;
    default:
      return;
  }
}
//@ chunk-5xgkngpb.js:1891179-1891426 placement
/**
 * 生成提示相关的遥测字段：唤醒来源、宿主发起方、Artifact 评论回合。
 */
function promptTelemetryFields({ wakeupSource, hostInitiator, artifactCommentTurn, inboundOrigin }) {
  let wakeupKind = scheduledWakeupKind(wakeupSource);
  let normalizedInitiator = normalizeWakeupSource(hostInitiator);
  let unknown = undefined;
  let found = WAKEUP_SOURCES.find((candidate) => candidate === artifactCommentTurn);
  return {
    ...(wakeupKind && {
      wakeup_source: fromEnum(wakeupKind),
    }),
    ...(normalizedInitiator && {
      host_initiator: fromEnum(normalizedInitiator),
    }),
    ...(found && {
      artifact_comment_turn: fromEnum(found),
    }),
    ...undefined,
  };
}
//@ chunk-5xgkngpb.js:1891426-1892112 placement
/**
 * 判断提示来源（人工、自动继续、定时触发、对等发送等）。
 */
function classifyPromptSource({ origin, isMeta, wakeupSource, promptSource, hostInitiator }) {
  if (wakeupSource !== undefined) return "scheduled";
  let initiatorOrigin = originKindForWakeup(hostInitiator);
  switch (origin?.kind) {
    case "human":
      return initiatorOrigin ?? "human";
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
  if (initiatorOrigin !== undefined) return initiatorOrigin;
  if (promptSource === "sdk") return "sdk";
  return "unknown";
}
//@ chunk-5xgkngpb.js:1892112-1892124 placement
/**
 * WAKEUP_ORIGIN_TTL_MS：唤醒来源记录的有效期。
 */
var WAKEUP_ORIGIN_TTL_MS = 1e4;
//@ chunk-5xgkngpb.js:1892124-1892179 placement
/**
 * wakeupDedupKey：唤醒去重键。
 */
function wakeupDedupKey(uuid, turnId) {
  return `${String(uuid)}\x00${String(turnId)}`;
}
//@ chunk-5xgkngpb.js:1892179-1892374 placement
function singleToolResultId(message) {
  let content = message.message?.content;
  if (!Array.isArray(content)) return;
  let filtered = content.filter((block) => block?.type === "tool_result");
  if (filtered.length !== 1) return;
  let toolUseId = filtered[0].tool_use_id;
  return toolUseId === undefined ? undefined : String(toolUseId);
}
export {
  wakeupSourceForKind,
  originKindForWakeup,
  singleToolResultId,
  wakeupDedupKey,
  WAKEUP_ORIGIN_TTL_MS,
  resolvePromptSource,
  PROMPT_ORIGIN_KINDS,
  promptTelemetryFields,
  promptOriginForHooks,
  classifyPromptSource,
};
