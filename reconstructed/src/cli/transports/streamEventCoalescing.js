/**
 * cli/transports/streamEventCoalescing.ts
 *
 * 2.1.316 新增：流事件合并（减少下行帧数）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-w1p9g89k.js (17)
 * attribution: placement 17
 */
import { jsonStringifyRaw } from "../../utils/slowOperations.js";
import { updateLastInteractionTime } from "../../bootstrap/state.js";
import { hasNonHumanOrigin } from "../../utils/messageProvenance.js";
import { DoctorLazy } from "../handlers/util.js";
import { zodStrictObject, U, E } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-w1p9g89k.js:375-400 placement
var Oun = 61440,
  S = Oun - 4096;
//@ chunk-w1p9g89k.js:400-448 placement
function _(e) {
  return Buffer.byteLength(jsonStringifyRaw(e)) - 2;
}
//@ chunk-w1p9g89k.js:448-678 placement
function canMergeIntoRun(e, t, n, s, i) {
  return (
    e.firstEvent.index === n.index &&
    e.deltaType === s &&
    e.first.parent_tool_use_id === t.parent_tool_use_id &&
    e.first.thinking_display === t.thinking_display &&
    e.first.api_message_id === t.api_message_id &&
    e.bytes + i <= S
  );
}
/**
 * 判断流事件是否为可合并的 content_block_delta（文本、input_json 等），返回事件、增量类型和增量片段；否则返回 null。
 */
//@ chunk-w1p9g89k.js:678-1219 placement
function extractMergeableDelta(event) {
  if (event.type !== "content_block_delta") return null;
  switch (event.delta.type) {
    case "text_delta":
      return { event: event, deltaType: "text_delta", chunk: event.delta.text, estimatedTokens: void 0 };
    case "input_json_delta":
      return {
        event: event,
        deltaType: "input_json_delta",
        chunk: event.delta.partial_json,
        estimatedTokens: void 0,
      };
    case "thinking_delta":
      return {
        event: event,
        deltaType: "thinking_delta",
        chunk: event.delta.thinking,
        estimatedTokens: event.delta.estimated_tokens ?? void 0,
      };
    case "citations_delta":
    case "signature_delta":
    case "compaction_delta":
      return null;
    default:
      return (event.delta, null);
  }
}
/**
 * 把累积的同类增量合成一个流事件；只有一个时直接返回原事件。
 */
//@ chunk-w1p9g89k.js:1219-1632 placement
function buildMergedStreamEvent(e) {
  if (e.count === 1) return e.first;
  let t;
  switch (e.deltaType) {
    case "text_delta":
      t = { type: "text_delta", text: e.accumulated };
      break;
    case "input_json_delta":
      t = { type: "input_json_delta", partial_json: e.accumulated };
      break;
    case "thinking_delta":
      t = { type: "thinking_delta", thinking: e.accumulated, estimated_tokens: e.estimatedTokens ?? null };
      break;
  }
  return { ...e.first, event: { ...e.firstEvent, delta: { ...e.firstEvent.delta, ...t } } };
}
/**
 * 合并相邻且可合并的 stream_event 增量（text/input_json/thinking，同 index、同父工具、同 message id，单段不超过字节上限）为一个事件，减少下行帧数；其他事件原样保留。
 */
//@ chunk-w1p9g89k.js:1632-2130 placement
function coalesceStreamEvents(e) {
  if (e.length <= 1) return e;
  let t = [],
    n = null;
  for (let s of e) {
    let i = extractMergeableDelta(s.event);
    if (i === null) {
      if (n !== null) (t.push(buildMergedStreamEvent(n)), (n = null));
      t.push(s);
      continue;
    }
    let { event: event, deltaType: deltaType, chunk: chunk, estimatedTokens: estimatedTokens } = i,
      u = _(chunk);
    if (n !== null && canMergeIntoRun(n, s, event, deltaType, u)) {
      if (((n.accumulated += chunk), (n.bytes += u), (n.count += 1), typeof estimatedTokens === "number"))
        n.estimatedTokens = (n.estimatedTokens ?? 0) + estimatedTokens;
      continue;
    }
    if (n !== null) t.push(buildMergedStreamEvent(n));
    n = {
      first: s,
      firstEvent: event,
      deltaType: deltaType,
      accumulated: chunk,
      estimatedTokens: estimatedTokens,
      bytes: u,
      count: 1,
    };
  }
  if (n !== null) t.push(buildMergedStreamEvent(n));
  return t;
}
/**
 * 在事件列表中按与 coalesceStreamEvents 相同的规则，找出给定 uuid 所在合并段的第一个事件 uuid（找不到返回原 uuid）。
 */
//@ chunk-w1p9g89k.js:2130-2438 placement
function findCoalescedRunHead(e, t) {
  let index = e.findIndex((i) => i.uuid === t);
  if (index < 0) return t;
  let s = null;
  for (let i = 0; i <= index; i++) {
    let r = e[i],
      l = extractMergeableDelta(r.event);
    if (l === null) {
      s = null;
      continue;
    }
    let { event: event, deltaType: deltaType, chunk: chunk } = l,
      d = _(chunk);
    if (s !== null && canMergeIntoRun(s, r, event, deltaType, d)) s.bytes += d;
    else s = { first: r, firstEvent: event, deltaType: deltaType, bytes: d };
  }
  return s?.first.uuid ?? t;
}
/**
 * 交互式控制请求子类型集合（中断、停止任务、改权限模式、改模型等），这些请求不参与合并。
 */
//@ chunk-w1p9g89k.js:2438-2860 placement
var INTERACTIVE_CONTROL_SUBTYPES = new Set([
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
  ]),
  PERMISSION_PROMPT_SUBTYPES = new Set(["can_use_tool", "request_user_dialog", "elicitation"]),
  SESSION_SETTING_SUBTYPES = new Set(["set_model", "set_permission_mode", "set_max_thinking_tokens"]);
//@ chunk-w1p9g89k.js:2860-2923 placement
function C6n(e) {
  return y(e.request) && !SESSION_SETTING_SUBTYPES.has(e.request.subtype);
}
//@ chunk-w1p9g89k.js:2923-2945 placement
function RKs() {
  updateLastInteractionTime(!0);
}
//@ chunk-w1p9g89k.js:2945-3138 placement
function isUserInitiatedInboundEvent(e, t) {
  switch (e.type) {
    case "user":
      return !(t?.hostOwnsOrigin === !0 && hasNonHumanOrigin(e.origin, e.isSynthetic));
    case "bash_command":
      return !0;
    case "control_request":
      return y(e.request);
    default:
      return !1;
  }
}
//@ chunk-w1p9g89k.js:3138-3221 placement
function y(e) {
  let t = e?.subtype;
  return typeof t === "string" && INTERACTIVE_CONTROL_SUBTYPES.has(t) && e?.by !== "app";
}
//@ chunk-w1p9g89k.js:3221-3269 placement
function JZe(e) {
  return PERMISSION_PROMPT_SUBTYPES.has(e.request.subtype);
}
//@ chunk-w1p9g89k.js:3269-3384 placement
var X_CCR_SESSION_WRITERS = "x-ccr-session-writers",
  xKs = DoctorLazy(() =>
    zodStrictObject({ writers: U(["owner_account_only", "not_owner_only"]), statedAtMs: E() }),
  );
/**
 * 解析 x-ccr-session-writers 头（分号分隔键值，v=1），返回 owner_account_only / not_owner_only；格式不符或有重复键时返回 undefined。
 */
//@ chunk-w1p9g89k.js:3384-3746 placement
function parseSessionWritersHeader(e) {
  if (e === null || e.includes(",")) return;
  let t = new Map();
  for (let n of e.split(";")) {
    let trimmed = n.trim(),
      index = trimmed.indexOf("="),
      r = index === -1 ? "" : trimmed.slice(0, index);
    if (r === "") continue;
    if (t.has(r)) return;
    t.set(r, trimmed.slice(index + 1));
  }
  if (t.get("v") !== "1") return;
  switch (t.get("owner_account_only")) {
    case "true":
      return "owner_account_only";
    case "false":
      return "not_owner_only";
    default:
      return;
  }
}
//@ chunk-w1p9g89k.js:3746-3794 placement
function QZe(e) {
  return e === "owner_account_only";
}
/**
 * 判断入站帧能否以"会话仅所有者可写"为依据放行：缺少帧时间戳、帧过旧、写者状态未知/非仅所有者、声明过旧时返回拒绝原因，否则 undefined。
 */
//@ chunk-w1p9g89k.js:3794-4139 placement
function checkSessionWritersFreshness({
  frameCreatedAt: frameCreatedAt,
  sessionWriters: sessionWriters,
  maxFrameAgeMs: maxFrameAgeMs,
  maxStatementAgeMs: maxStatementAgeMs,
  now: now,
}) {
  if (frameCreatedAt === void 0) return "no_frame_stamp";
  if (now - frameCreatedAt > maxFrameAgeMs) return "stale_frame";
  if (sessionWriters === void 0) return "session_writers_unknown";
  if (!QZe(sessionWriters.writers)) return "session_not_owner_only";
  if (maxStatementAgeMs === void 0) return;
  let r = now - sessionWriters.statedAtMs;
  return r >= 0 && r <= maxStatementAgeMs ? void 0 : "session_writers_stale";
}

export {
  Oun,
  findCoalescedRunHead,
  coalesceStreamEvents,
  C6n,
  JZe,
  isUserInitiatedInboundEvent,
  RKs,
  QZe,
  checkSessionWritersFreshness,
  X_CCR_SESSION_WRITERS,
  parseSessionWritersHeader,
  xKs,
};
