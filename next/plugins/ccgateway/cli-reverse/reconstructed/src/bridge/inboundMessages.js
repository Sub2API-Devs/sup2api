/**
 * bridge/inboundMessages.ts
 *
 * 并入已有模块：消息列表诊断：渲染条目缺少 uuid 时的遥测代码、日志文本与可渲染条目类型表。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/inboundMessages.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-6gyvmn2t.js (1), chunk-aexe35rn.js (2), chunk-wjygkcr4.js (7)
 * attribution: fingerprint 3, placement 7, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { detectImageFormatFromBase64 } from "../utils/imageResizer.js";
import { parseDataUri } from "../utils/task/shellOutputPersist.js";
import { sniffImageMediaType } from "../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { __export } from "../../runtime/bun-runtime.js";
import {
  PLACED_SITE_MODULE_EXPORTS,
  INBOUND_MESSAGES_MODULE_EXPORTS,
} from "../components/pluginUi/renderSiteExports.js";
import { usePlacedActionKeys } from "../components/CompactSummary.js";
import {
  LocalCommandOutput,
  wrapLocalCommandOutput,
  pickLocalCommandOutput,
} from "../components/messages/UserLocalCommandOutputMessage.js";
import { init_react_production, createContext } from "../../vendor/react/cjs/react.production.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-aexe35rn.js:8293-8529 fingerprint (2.1.88 match: normalizeImageBlocks, 1)
/**
 * 给缺 media_type 的 base64 图片块补上（优先 mediaType 字段，否则从数据检测）。
 */
function normalizeImageBlocks(blocks) {
  if (!blocks.some(isMalformedBase64Image)) return blocks;
  return blocks.map((block) => {
    if (!isMalformedBase64Image(block)) return block;
    let src = block.source;
    let mediaType =
      typeof src.mediaType === "string" && src.mediaType
        ? src.mediaType
        : detectImageFormatFromBase64(block.source.data);
    return {
      ...block,
      source: {
        type: "base64",
        media_type: mediaType,
        data: block.source.data,
      },
    };
  });
}
//@ chunk-aexe35rn.js:8529-8626 affinity (2.1.88 match: isMalformedBase64Image, 1)
function isMalformedBase64Image(block) {
  if (block.type !== "image" || block.source?.type !== "base64") return false;
  return !block.source.media_type;
}
//@ chunk-5xgkngpb.js:3186724-3186950 fingerprint (2.1.88 match: isMalformedBase64Image, 1)
/**
 * 把可识别格式的 base64 图片包成 image 类型的 tool_result。
 */
function buildImageToolResult(source, toolUseId) {
  let dataUri = parseDataUri(source);
  if (!dataUri) return null;
  let mediaType = sniffImageMediaType(Buffer.from(dataUri.data, "base64"));
  if (mediaType === null) return null;
  return {
    tool_use_id: toolUseId,
    type: "tool_result",
    content: [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: dataUri.data,
        },
      },
    ],
  };
}
//@ chunk-6gyvmn2t.js:531-548 placement
var MAX_LIST_ENTRIES_WITHOUT_UUID_LOGGED = 500;
var UUID_MISSING_LOG_INTERVAL_MS = 5000;
//@ chunk-wjygkcr4.js:7939-7981 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:7939", () => {
  __export(PLACED_SITE_MODULE_EXPORTS, {
    PlacedSite: () => usePlacedActionKeys,
    default: () => PLACED_SITE_MODULE_EXPORTS,
  });
});
//@ chunk-wjygkcr4.js:7991-8076 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:7991", () => {
  __export(INBOUND_MESSAGES_MODULE_EXPORTS, {
    CommandOutputSite: () => LocalCommandOutput,
    default: () => INBOUND_MESSAGES_MODULE_EXPORTS,
    frameOf: () => wrapLocalCommandOutput,
    printedTextOf: () => pickLocalCommandOutput,
  });
});
//@ chunk-wjygkcr4.js:8076-8080 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:8076", () => {
  init_react_production();
});
//@ chunk-wjygkcr4.js:8080-8097 placement
/**
 * 桥接消息列表的 React context（qt(null)），与 PlacedSite 同文件导出，供占位动作键使用。
 */
var BRIDGE_PLACED_KEYS_CONTEXT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:8080", () => {
  BRIDGE_PLACED_KEYS_CONTEXT = createContext(null);
});
//@ chunk-wjygkcr4.js:8097-9157 placement
/**
 * 消息列表诊断：渲染条目缺少 uuid 时的遥测代码、日志文本与可渲染条目类型表。
 */
var MESSAGES_ENTRY_WITHOUT_UUID; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MESSAGES_ENTRY_WITHOUT_UUID_TEXT;
var RENDERABLE_ENTRY_TYPES;
var KNOWN_MESSAGE_ENTRY_TYPES;
var SYSTEM_SUBTYPES;
var ATTACHMENT_TYPES;
deferInit("chunk-wjygkcr4.js:8097", () => {
  MESSAGES_ENTRY_WITHOUT_UUID = "messages_entry_without_uuid";
  MESSAGES_ENTRY_WITHOUT_UUID_TEXT = "Messages: renderable entry without a string uuid";
  RENDERABLE_ENTRY_TYPES = {
    assistant: true,
    user: true,
    attachment: true,
    system: true,
    grouped_tool_use: true,
    collapsed_read_search: true,
    work_segment: true,
    speaker_label: true,
    recap_fold: true,
  };
  KNOWN_MESSAGE_ENTRY_TYPES = new Set([
    ...Object.keys(RENDERABLE_ENTRY_TYPES),
    "progress",
    "api_system",
    "tombstone",
  ]);
  SYSTEM_SUBTYPES = {
    api_error: true,
    informational: true,
    compact_boundary: true,
    microcompact_boundary: true,
    local_command: true,
    permission_retry: true,
    stop_hook_summary: true,
    turn_duration: true,
    memory_saved: true,
    agents_killed: true,
    away_summary: true,
    thinking: true,
    file_snapshot: true,
    bridge_status: true,
    scheduled_task_fire: true,
    read_divider: true,
    model_fallback: true,
    model_consent_fallback: true,
  };
  ATTACHMENT_TYPES = {
    file: true,
    invoked_skills: true,
    todo_reminder: true,
    task_reminder: true,
    tool_search_usage_reminder: true,
    relevant_memories: true,
    queued_command: true,
    diagnostics: true,
    plan_mode: true,
    plan_mode_reentry: true,
    attention_budget: true,
    auto_mode: true,
    mcp_resource: true,
    task_status: true,
    async_hook_response: true,
    hook_success: true,
    context_efficiency: true,
    deferred_tools_delta: true,
    agent_listing_delta: true,
    memory_update: true,
    mcp_instructions_delta: true,
    mcp_dropped_tools_delta: true,
  };
});
//@ chunk-wjygkcr4.js:9157-9278 fingerprint (2.1.88 match: extractInboundMessageFields, 1)
/**
 * 对象是否带非空字符串 uuid。
 */
function hasStringUuid(message) {
  if (typeof message !== "object" || message === null || !("uuid" in message)) return false;
  let { uuid } = message;
  return typeof uuid === "string" && uuid !== "";
}
//@ chunk-wjygkcr4.js:25612-25616 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:25612", () => {
  init_react_production();
});
export {
  buildImageToolResult,
  hasStringUuid,
  MAX_LIST_ENTRIES_WITHOUT_UUID_LOGGED,
  UUID_MISSING_LOG_INTERVAL_MS,
  normalizeImageBlocks,
  BRIDGE_PLACED_KEYS_CONTEXT,
  MESSAGES_ENTRY_WITHOUT_UUID,
  MESSAGES_ENTRY_WITHOUT_UUID_TEXT,
  KNOWN_MESSAGE_ENTRY_TYPES,
  SYSTEM_SUBTYPES,
  ATTACHMENT_TYPES,
};
