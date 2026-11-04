/**
 * bridge/inboundMessages.ts
 *
 * 并入已有模块：消息列表诊断：渲染条目缺少 uuid 时的遥测代码、日志文本与可渲染条目类型表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/inboundMessages.ts
 * pieces: chunk-ah34pb7m.js (8), chunk-e6aww6q8.js (1), chunk-mketzrwm.js (2)
 * attribution: placement 7, fingerprint 3, affinity 1
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

//@ chunk-mketzrwm.js:8086-8322 fingerprint (2.1.88 match: normalizeImageBlocks, 1)
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
//@ chunk-mketzrwm.js:8322-8419 affinity (2.1.88 match: isMalformedBase64Image, 1)
function isMalformedBase64Image(block) {
  if (block.type !== "image" || block.source?.type !== "base64") return false;
  return !block.source.media_type;
}
//@ chunk-e6aww6q8.js:3100334-3100560 fingerprint (2.1.88 match: isMalformedBase64Image, 1)
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
//@ chunk-ah34pb7m.js:7736-7778 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:7736", () => {
  __export(PLACED_SITE_MODULE_EXPORTS, {
    PlacedSite: () => usePlacedActionKeys,
    default: () => PLACED_SITE_MODULE_EXPORTS,
  });
});
//@ chunk-ah34pb7m.js:7788-7873 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:7788", () => {
  __export(INBOUND_MESSAGES_MODULE_EXPORTS, {
    CommandOutputSite: () => LocalCommandOutput,
    default: () => INBOUND_MESSAGES_MODULE_EXPORTS,
    frameOf: () => wrapLocalCommandOutput,
    printedTextOf: () => pickLocalCommandOutput,
  });
});
//@ chunk-ah34pb7m.js:7873-7877 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:7873", () => {
  init_react_production();
});
//@ chunk-ah34pb7m.js:7877-7894 placement
/**
 * 桥接消息列表的 React context（qt(null)），与 PlacedSite 同文件导出，供占位动作键使用。
 */
var BRIDGE_PLACED_KEYS_CONTEXT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:7877", () => {
  BRIDGE_PLACED_KEYS_CONTEXT = createContext(null);
});
//@ chunk-ah34pb7m.js:7894-7898 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:7894", () => {
  init_react_production();
});
//@ chunk-ah34pb7m.js:7898-7917 placement
var MAX_LIST_ENTRIES_WITHOUT_UUID_LOGGED = 500;
var UUID_MISSING_LOG_INTERVAL_MS = 5000;
//@ chunk-ah34pb7m.js:8081-9141 placement
/**
 * 消息列表诊断：渲染条目缺少 uuid 时的遥测代码、日志文本与可渲染条目类型表。
 */
var MESSAGES_ENTRY_WITHOUT_UUID; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MESSAGES_ENTRY_WITHOUT_UUID_TEXT;
var RENDERABLE_ENTRY_TYPES;
var KNOWN_MESSAGE_ENTRY_TYPES;
var SYSTEM_SUBTYPES;
var ATTACHMENT_TYPES;
deferInit("chunk-ah34pb7m.js:8081", () => {
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
//@ chunk-ah34pb7m.js:9141-9262 fingerprint (2.1.88 match: extractInboundMessageFields, 1)
/**
 * 对象是否带非空字符串 uuid。
 */
function hasStringUuid(message) {
  if (typeof message !== "object" || message === null || !("uuid" in message)) return false;
  let { uuid } = message;
  return typeof uuid === "string" && uuid !== "";
}
export {
  hasStringUuid,
  BRIDGE_PLACED_KEYS_CONTEXT,
  buildImageToolResult,
  MAX_LIST_ENTRIES_WITHOUT_UUID_LOGGED,
  MESSAGES_ENTRY_WITHOUT_UUID,
  MESSAGES_ENTRY_WITHOUT_UUID_TEXT,
  KNOWN_MESSAGE_ENTRY_TYPES,
  SYSTEM_SUBTYPES,
  ATTACHMENT_TYPES,
  UUID_MISSING_LOG_INTERVAL_MS,
  normalizeImageBlocks,
};
