/**
 * bridge/inboundMessages.ts
 *
 * 并入已有模块：消息列表诊断：渲染条目缺少 uuid 时的遥测代码、日志文本与可渲染条目类型表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/inboundMessages.ts
 * pieces: chunk-ah34pb7m.js (10), chunk-e6aww6q8.js (1), chunk-mketzrwm.js (2)
 * attribution: placement 9, fingerprint 3, affinity 1
 */
import { Ar } from "../../runtime/bun-runtime.js";
import { usePlacedActionKeys } from "../components/CompactSummary.js";
import {
  LocalCommandOutput,
  Xl,
  pickLocalCommandOutput,
} from "../components/messages/UserLocalCommandOutputMessage.js";
import { j, qt } from "../../vendor/react/cjs/react.production.js";
import { detectImageFormatFromBase64 } from "../utils/imageResizer.js";
import { parseDataUri } from "../utils/task/shellOutputPersist.js";
import { Ph } from "../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";

//@ chunk-ah34pb7m.js:7726-7736 placement
var Qn = {};
//@ chunk-ah34pb7m.js:7736-7778 placement
Ar(Qn, { PlacedSite: () => usePlacedActionKeys, default: () => Qn });
//@ chunk-ah34pb7m.js:7778-7788 placement
var rn = {};
//@ chunk-ah34pb7m.js:7788-7873 placement
Ar(rn, {
  CommandOutputSite: () => LocalCommandOutput,
  default: () => rn,
  frameOf: () => Xl,
  printedTextOf: () => pickLocalCommandOutput,
});
//@ chunk-ah34pb7m.js:7873-7877 placement
j();
//@ chunk-ah34pb7m.js:7877-7894 placement
var ZXe = qt(null);
//@ chunk-ah34pb7m.js:7894-7898 placement
j();
//@ chunk-ah34pb7m.js:7898-7917 placement
var Vv = 500,
  vT = 5000;
/**
 * 消息列表诊断：渲染条目缺少 uuid 时的遥测代码、日志文本与可渲染条目类型表。
 */
//@ chunk-ah34pb7m.js:8081-9141 placement
var MESSAGES_ENTRY_WITHOUT_UUID = "messages_entry_without_uuid",
  ET = "Messages: renderable entry without a string uuid",
  zv = {
    assistant: !0,
    user: !0,
    attachment: !0,
    system: !0,
    grouped_tool_use: !0,
    collapsed_read_search: !0,
    work_segment: !0,
    speaker_label: !0,
    recap_fold: !0,
  },
  Qv = new Set([...Object.keys(zv), "progress", "api_system", "tombstone"]),
  Xv = {
    api_error: !0,
    informational: !0,
    compact_boundary: !0,
    microcompact_boundary: !0,
    local_command: !0,
    permission_retry: !0,
    stop_hook_summary: !0,
    turn_duration: !0,
    memory_saved: !0,
    agents_killed: !0,
    away_summary: !0,
    thinking: !0,
    file_snapshot: !0,
    bridge_status: !0,
    scheduled_task_fire: !0,
    read_divider: !0,
    model_fallback: !0,
    model_consent_fallback: !0,
  },
  Zv = {
    file: !0,
    invoked_skills: !0,
    todo_reminder: !0,
    task_reminder: !0,
    tool_search_usage_reminder: !0,
    relevant_memories: !0,
    queued_command: !0,
    diagnostics: !0,
    plan_mode: !0,
    plan_mode_reentry: !0,
    attention_budget: !0,
    auto_mode: !0,
    mcp_resource: !0,
    task_status: !0,
    async_hook_response: !0,
    hook_success: !0,
    context_efficiency: !0,
    deferred_tools_delta: !0,
    agent_listing_delta: !0,
    memory_update: !0,
    mcp_instructions_delta: !0,
    mcp_dropped_tools_delta: !0,
  };
/**
 * 对象是否带非空字符串 uuid。
 */
//@ chunk-ah34pb7m.js:9141-9262 fingerprint = extractInboundMessageFields (1)
function hasStringUuid(message) {
  if (typeof message !== "object" || message === null || !("uuid" in message)) return !1;
  let { uuid: uuid } = message;
  return typeof uuid === "string" && uuid !== "";
}
/**
 * 给缺 media_type 的 base64 图片块补上（优先 mediaType 字段，否则从数据检测）。
 */
//@ chunk-mketzrwm.js:8086-8322 fingerprint = normalizeImageBlocks (1)
function normalizeImageBlocks(blocks) {
  if (!blocks.some(isMalformedBase64Image)) return blocks;
  return blocks.map((block) => {
    if (!isMalformedBase64Image(block)) return block;
    let src = block.source,
      mediaType =
        typeof src.mediaType === "string" && src.mediaType
          ? src.mediaType
          : detectImageFormatFromBase64(block.source.data);
    return { ...block, source: { type: "base64", media_type: mediaType, data: block.source.data } };
  });
}
//@ chunk-mketzrwm.js:8322-8419 affinity = isMalformedBase64Image (1)
function isMalformedBase64Image(block) {
  if (block.type !== "image" || block.source?.type !== "base64") return !1;
  return !block.source.media_type;
}
/**
 * 把可识别格式的 base64 图片包成 image 类型的 tool_result。
 */
//@ chunk-e6aww6q8.js:3100334-3100560 fingerprint = isMalformedBase64Image (1)
function buildImageToolResult(source, toolUseId) {
  let r = parseDataUri(source);
  if (!r) return null;
  let s = Ph(Buffer.from(r.data, "base64"));
  if (s === null) return null;
  return {
    tool_use_id: toolUseId,
    type: "tool_result",
    content: [{ type: "image", source: { type: "base64", media_type: s, data: r.data } }],
  };
}

export {
  hasStringUuid,
  ZXe,
  buildImageToolResult,
  Vv,
  MESSAGES_ENTRY_WITHOUT_UUID,
  ET,
  Qv,
  Xv,
  Zv,
  vT,
  rn,
  Qn,
  normalizeImageBlocks,
};
