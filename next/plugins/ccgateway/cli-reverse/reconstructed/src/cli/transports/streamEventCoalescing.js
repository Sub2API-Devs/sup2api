/**
 * cli/transports/streamEventCoalescing.ts
 *
 * 2.1.316 新增：流事件合并（减少下行帧数）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-57e9qj14.js (17)
 * attribution: placement 17
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { jsonStringifyRaw } from "../../utils/slowOperations.js";
import { updateLastInteractionTime } from "../../bootstrap/state.js";
import { hasNonHumanOrigin } from "../../utils/messageProvenance.js";
import { DoctorLazy } from "../handlers/util.js";
import { zodStrictObject, _enum, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-57e9qj14.js:375-400 placement
/**
 * 单帧字节上限 61440 与可用预算 61440-4096（为头留余量）。
 */
var MAX_FRAME_BYTES = 61440;
var FRAME_BUDGET_BYTES = MAX_FRAME_BYTES - 4096;
//@ chunk-57e9qj14.js:400-448 placement
function _(chunk) {
  return Buffer.byteLength(jsonStringifyRaw(chunk)) - 2;
}
//@ chunk-57e9qj14.js:448-678 placement
function canMergeIntoRun(run, event, event_2, deltaType, index) {
  return (
    run.firstEvent.index === event_2.index &&
    run.deltaType === deltaType &&
    run.first.parent_tool_use_id === event.parent_tool_use_id &&
    run.first.thinking_display === event.thinking_display &&
    run.first.api_message_id === event.api_message_id &&
    run.bytes + index <= FRAME_BUDGET_BYTES
  );
}
//@ chunk-57e9qj14.js:678-1219 placement
/**
 * 判断流事件是否为可合并的 content_block_delta（文本、input_json 等），返回事件、增量类型和增量片段；否则返回 null。
 */
function extractMergeableDelta(event) {
  if (event.type !== "content_block_delta") return null;
  switch (event.delta.type) {
    case "text_delta":
      return {
        event,
        deltaType: "text_delta",
        chunk: event.delta.text,
        estimatedTokens: undefined,
      };
    case "input_json_delta":
      return {
        event,
        deltaType: "input_json_delta",
        chunk: event.delta.partial_json,
        estimatedTokens: undefined,
      };
    case "thinking_delta":
      return {
        event,
        deltaType: "thinking_delta",
        chunk: event.delta.thinking,
        estimatedTokens: event.delta.estimated_tokens ?? undefined,
      };
    case "citations_delta":
    case "signature_delta":
    case "compaction_delta":
      return null;
    default:
      event.delta;
      return null;
  }
}
//@ chunk-57e9qj14.js:1219-1632 placement
/**
 * 把累积的同类增量合成一个流事件；只有一个时直接返回原事件。
 */
function buildMergedStreamEvent(run) {
  if (run.count === 1) return run.first;
  let merged;
  switch (run.deltaType) {
    case "text_delta":
      merged = {
        type: "text_delta",
        text: run.accumulated,
      };
      break;
    case "input_json_delta":
      merged = {
        type: "input_json_delta",
        partial_json: run.accumulated,
      };
      break;
    case "thinking_delta":
      merged = {
        type: "thinking_delta",
        thinking: run.accumulated,
        estimated_tokens: run.estimatedTokens ?? null,
      };
      break;
  }
  return {
    ...run.first,
    event: {
      ...run.firstEvent,
      delta: {
        ...run.firstEvent.delta,
        ...merged,
      },
    },
  };
}
//@ chunk-57e9qj14.js:1632-2130 placement
/**
 * 合并相邻且可合并的 stream_event 增量（text/input_json/thinking，同 index、同父工具、同 message id，单段不超过字节上限）为一个事件，减少下行帧数；其他事件原样保留。
 */
function coalesceStreamEvents(events) {
  if (events.length <= 1) return events;
  let merged = [];
  let run = null;
  for (let event of events) {
    let mergeableDelta = extractMergeableDelta(event.event);
    if (mergeableDelta === null) {
      if (run !== null) {
        merged.push(buildMergedStreamEvent(run));
        run = null;
      }
      merged.push(event);
      continue;
    }
    let { event: event_2, deltaType, chunk, estimatedTokens } = mergeableDelta;
    let next = _(chunk);
    if (run !== null && canMergeIntoRun(run, event, event_2, deltaType, next)) {
      run.accumulated += chunk;
      run.bytes += next;
      run.count += 1;
      if (typeof estimatedTokens === "number")
        run.estimatedTokens = (run.estimatedTokens ?? 0) + estimatedTokens;
      continue;
    }
    if (run !== null) merged.push(buildMergedStreamEvent(run));
    run = {
      first: event,
      firstEvent: event_2,
      deltaType,
      accumulated: chunk,
      estimatedTokens,
      bytes: next,
      count: 1,
    };
  }
  if (run !== null) merged.push(buildMergedStreamEvent(run));
  return merged;
}
//@ chunk-57e9qj14.js:2130-2438 placement
/**
 * 在事件列表中按与 coalesceStreamEvents 相同的规则，找出给定 uuid 所在合并段的第一个事件 uuid（找不到返回原 uuid）。
 */
function findCoalescedRunHead(events, uuid) {
  let index = events.findIndex((event) => event.uuid === uuid);
  if (index < 0) return uuid;
  let headUuid = null;
  for (let runStart = 0; runStart <= index; runStart++) {
    let event = events[runStart];
    let mergeableDelta = extractMergeableDelta(event.event);
    if (mergeableDelta === null) {
      headUuid = null;
      continue;
    }
    let { event: event_2, deltaType, chunk } = mergeableDelta;
    let next = _(chunk);
    if (headUuid !== null && canMergeIntoRun(headUuid, event, event_2, deltaType, next))
      headUuid.bytes += next;
    else
      headUuid = {
        first: event,
        firstEvent: event_2,
        deltaType,
        bytes: next,
      };
  }
  return headUuid?.first.uuid ?? uuid;
}
//@ chunk-57e9qj14.js:2438-2860 placement
/**
 * 交互式控制请求子类型集合（中断、停止任务、改权限模式、改模型等），这些请求不参与合并。
 */
var INTERACTIVE_CONTROL_SUBTYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PERMISSION_PROMPT_SUBTYPES;
var SESSION_SETTING_SUBTYPES;
deferInit("chunk-57e9qj14.js:2438", () => {
  INTERACTIVE_CONTROL_SUBTYPES = new Set([
    "interrupt",
    "stop_task",
    "send_task_message",
    "set_permission_mode",
    "set_model",
    "set_max_thinking_tokens",
    "set_color",
    "mcp_toggle",
    "message_rated",
    "side_question",
    "ui_press",
    "ui_input",
    "ui_select",
    "ui_client_press",
    "ui_pane_show",
    "ui_close",
    "ui_scroll",
    "ui_prompt_edit",
  ]);
  PERMISSION_PROMPT_SUBTYPES = new Set(["can_use_tool", "request_user_dialog", "elicitation"]);
  SESSION_SETTING_SUBTYPES = new Set(["set_model", "set_permission_mode", "set_max_thinking_tokens"]);
});
//@ chunk-57e9qj14.js:2860-2923 placement
/**
 * 判断控制请求能否合并转发：是交互类子类型且不是会话设置类。
 */
function isCoalescableControlRequest(request) {
  return (
    isInteractiveControlSubtype(request.request) && !SESSION_SETTING_SUBTYPES.has(request.request.subtype)
  );
}
//@ chunk-57e9qj14.js:2923-2945 placement
/**
 * 把最后交互时间标记为刚刚（收到交互式控制请求时）。
 */
function noteInteractiveInput() {
  updateLastInteractionTime(true);
}
//@ chunk-57e9qj14.js:2945-3138 placement
function isUserInitiatedInboundEvent(event, uuid) {
  switch (event.type) {
    case "user":
      return !(uuid?.hostOwnsOrigin === true && hasNonHumanOrigin(event.origin, event.isSynthetic));
    case "bash_command":
      return true;
    case "control_request":
      return isInteractiveControlSubtype(event.request);
    default:
      return false;
  }
}
//@ chunk-57e9qj14.js:3138-3221 placement
function isInteractiveControlSubtype(request) {
  let subtype = request?.subtype;
  return typeof subtype === "string" && INTERACTIVE_CONTROL_SUBTYPES.has(subtype) && request?.by !== "app";
}
//@ chunk-57e9qj14.js:3221-3269 placement
/**
 * 判断控制请求子类型是否属于权限提示（决定是否即时回执）。
 */
function isPermissionPromptSubtype(request) {
  return PERMISSION_PROMPT_SUBTYPES.has(request.request.subtype);
}
//@ chunk-57e9qj14.js:3269-3384 placement
/**
 * x-ccr-session-writers 头的 schema：writers（仅所有者/非仅所有者）与声明时间。
 */
var X_CCR_SESSION_WRITERS; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var sessionWritersSchema;
deferInit("chunk-57e9qj14.js:3269", () => {
  X_CCR_SESSION_WRITERS = "x-ccr-session-writers";
  sessionWritersSchema = DoctorLazy(() =>
    zodStrictObject({
      writers: _enum(["owner_account_only", "not_owner_only"]),
      statedAtMs: numberSchema(),
    }),
  );
});
//@ chunk-57e9qj14.js:3384-3746 placement
/**
 * 解析 x-ccr-session-writers 头（分号分隔键值，v=1），返回 owner_account_only / not_owner_only；格式不符或有重复键时返回 undefined。
 */
function parseSessionWritersHeader(header) {
  if (header === null || header.includes(",")) return;
  let writers = new Map();
  for (let part of header.split(";")) {
    let trimmed = part.trim();
    let index = trimmed.indexOf("=");
    let key = index === -1 ? "" : trimmed.slice(0, index);
    if (key === "") continue;
    if (writers.has(key)) return;
    writers.set(key, trimmed.slice(index + 1));
  }
  if (writers.get("v") !== "1") return;
  switch (writers.get("owner_account_only")) {
    case "true":
      return "owner_account_only";
    case "false":
      return "not_owner_only";
    default:
      return;
  }
}
//@ chunk-57e9qj14.js:3746-3794 placement
/**
 * 判断写者声明是否为 "owner_account_only"（会话仅所有者可写）。
 */
function isOwnerAccountOnlyWriters(writers) {
  return writers === "owner_account_only";
}
//@ chunk-57e9qj14.js:3794-4139 placement
/**
 * 判断入站帧能否以"会话仅所有者可写"为依据放行：缺少帧时间戳、帧过旧、写者状态未知/非仅所有者、声明过旧时返回拒绝原因，否则 undefined。
 */
function checkSessionWritersFreshness({
  frameCreatedAt,
  sessionWriters,
  maxFrameAgeMs,
  maxStatementAgeMs,
  now,
}) {
  if (frameCreatedAt === undefined) return "no_frame_stamp";
  if (now - frameCreatedAt > maxFrameAgeMs) return "stale_frame";
  if (sessionWriters === undefined) return "session_writers_unknown";
  if (!isOwnerAccountOnlyWriters(sessionWriters.writers)) return "session_not_owner_only";
  if (maxStatementAgeMs === undefined) return;
  let ageMs = now - sessionWriters.statedAtMs;
  return ageMs >= 0 && ageMs <= maxStatementAgeMs ? undefined : "session_writers_stale";
}
export {
  isPermissionPromptSubtype,
  isUserInitiatedInboundEvent,
  noteInteractiveInput,
  isOwnerAccountOnlyWriters,
  X_CCR_SESSION_WRITERS,
  sessionWritersSchema,
  isCoalescableControlRequest,
  coalesceStreamEvents,
  MAX_FRAME_BYTES,
  findCoalescedRunHead,
  parseSessionWritersHeader,
  checkSessionWritersFreshness,
};
