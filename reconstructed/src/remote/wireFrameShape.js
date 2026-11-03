/**
 * remote/wireFrameShape.ts
 *
 * 远程线帧形状规范化（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-c8ynteey.js (23)
 * attribution: placement 23
 */
import { randomUUID } from "crypto";
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  record,
  string,
  unknown,
  looseObject,
  literal,
  E,
  array,
  M,
} from "../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
import {
  toolCheckHookId,
  classicPreToolUseHookId,
  classicHookId,
} from "../plugins/functionHooks/sites/classicHookIds.js";
import { isConfirmRepositoryTrustTool, isRequestComputerFolderTool } from "./tools/protocolConstants.js";
import { permissionUpdateSchema } from "../utils/hooks/hookSpecificOutput.js";

//@ chunk-c8ynteey.js:438-483 placement
/**
 * 导出常量或表 `UNSUPPORTED_CONTROL_SUBTYPE_TEXT`：值为 "Unsupported control request subtype"。
 */
var UNSUPPORTED_CONTROL_SUBTYPE_TEXT = "Unsupported control request subtype";
//@ chunk-c8ynteey.js:519-1345 placement
var CONTENT_BLOCK_TYPES = DoctorLazy(() => {
  let input = record(string(), unknown());
  let text = looseObject({
    type: literal("text"),
    text: string(),
  });
  let n = new Map();
  let s = {
    text,
    tool_use: looseObject({
      type: literal("tool_use"),
      id: string(),
      name: string(),
      input,
    }),
    thinking: looseObject({
      type: literal("thinking"),
      thinking: string(),
      signature: string().optional(),
    }),
    redacted_thinking: looseObject({
      type: literal("redacted_thinking"),
      data: string(),
    }),
    server_tool_use: looseObject({
      type: literal("server_tool_use"),
      id: string(),
      name: string(),
      input,
    }),
    mcp_tool_use: looseObject({
      type: literal("mcp_tool_use"),
      id: string(),
      name: string(),
      server_name: string(),
      input,
    }),
  };
  for (let [key, value] of Object.entries(s)) n.set(key, value);
  let i = E().finite();
  return {
    text,
    assistantByType: n,
    usage: looseObject({
      input_tokens: i,
      output_tokens: i,
      cache_creation_input_tokens: i.nullish(),
      cache_read_input_tokens: i.nullish(),
      iterations: array(looseObject({})).nullish(),
    }),
    generic: looseObject({
      type: string(),
    }),
    toolResultLike: looseObject({
      type: string(),
      tool_use_id: string(),
    }),
    toolResult: looseObject({
      type: literal("tool_result"),
      tool_use_id: string(),
      is_error: M().optional(),
    }),
  };
});
//@ chunk-c8ynteey.js:1345-1415 placement
function isPlainObject(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-c8ynteey.js:1415-1451 placement
var MAX_FRAME_DEPTH = 256;
var TRUNCATED_DEPTH_TEXT = "[truncated: too deep]";
//@ chunk-c8ynteey.js:1451-1696 placement
function exceedsFrameDepth(e) {
  let r = [];
  if (typeof e === "object" && e !== null)
    r.push({
      value: e,
      depth: 1,
    });
  while (r.length > 0) {
    let { value: n, depth } = r.pop();
    if (depth > MAX_FRAME_DEPTH) return true;
    for (let i of Object.values(n))
      if (typeof i === "object" && i !== null)
        r.push({
          value: i,
          depth: depth + 1,
        });
  }
  return false;
}
//@ chunk-c8ynteey.js:1696-2010 placement
/**
 * 遍历对象，把超过最大深度的嵌套值替换为占位符，返回替换次数。
 */
function capNestedDepth(value) {
  let r = 0;
  let n = [
    {
      value,
      depth: 1,
    },
  ];
  while (n.length > 0) {
    let { value: s, depth } = n.pop();
    let a = Array.isArray(s) ? s : isPlainObject(s) ? s : null;
    if (a === null) continue;
    for (let key of Object.keys(a)) {
      let f = Reflect.get(a, key);
      if (typeof f !== "object" || f === null) continue;
      if (depth + 1 > MAX_FRAME_DEPTH) {
        Reflect.set(a, key, TRUNCATED_DEPTH_TEXT);
        r++;
      } else
        n.push({
          value: f,
          depth: depth + 1,
        });
    }
  }
  return r;
}
//@ chunk-c8ynteey.js:2010-2074 placement
function getTypeField(e) {
  return isPlainObject(e) && typeof e.type === "string" ? e.type : null;
}
//@ chunk-c8ynteey.js:2074-2177 placement = getReceivedType (0.776)
function getReceivedType(value) {
  let typeField = getTypeField(value);
  if (typeField !== null) return typeField;
  return value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
}
//@ chunk-c8ynteey.js:2177-2344 placement
function isValidAssistantBlock(e) {
  let typeField = getTypeField(e);
  if (typeField === null) return false;
  let n = CONTENT_BLOCK_TYPES();
  return (
    n.assistantByType.get(typeField) ?? (typeField.endsWith("_tool_result") ? n.toolResultLike : n.generic)
  ).safeParse(e).success;
}
//@ chunk-c8ynteey.js:2344-2703 placement
/**
 * 规范化工具结果内容：数组只保留合法块，非字符串对象序列化为 JSON，失败返回 false。
 */
function normalizeToolResultContent(block) {
  let content = block.content;
  if (content === undefined || typeof content === "string") return true;
  if (Array.isArray(content)) {
    let filtered = content.filter((s) => {
      let typeField = getTypeField(s);
      if (typeField === null) return false;
      return typeField === "text"
        ? CONTENT_BLOCK_TYPES().text.safeParse(s).success
        : CONTENT_BLOCK_TYPES().generic.safeParse(s).success;
    });
    if (filtered.length !== content.length) block.content = filtered;
    return true;
  }
  if (!isPlainObject(content)) {
    block.content = String(content);
    return true;
  }
  try {
    block.content = jsonStringify(content);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-c8ynteey.js:2703-2934 placement
function isValidUserBlock(block) {
  let typeField = getTypeField(block);
  if (typeField === null || !isPlainObject(block)) return false;
  let n = CONTENT_BLOCK_TYPES();
  if (typeField === "text") return n.text.safeParse(block).success;
  if (typeField === "tool_result") {
    if (!n.toolResult.safeParse(block).success) return false;
    return normalizeToolResultContent(block);
  }
  return n.generic.safeParse(block).success;
}
//@ chunk-c8ynteey.js:2934-3044 placement
function logFrameProblem(e, uuid, n) {
  logForDebugging(`[wireFrameShape] ${e} frame ${typeof uuid === "string" ? uuid : "(no uuid)"}: ${n}`, {
    level: "error",
  });
}
//@ chunk-c8ynteey.js:3044-3299 placement
function dropMalformedBlocks(blocks, isValid, role, uuid) {
  let i = [];
  let filtered = blocks.filter((block) => {
    try {
      if (isValid(block)) return true;
    } catch (error) {
      i.push(`unreadable block (${errorMessage(error)})`);
      return false;
    }
    i.push(getReceivedType(block));
    return false;
  });
  if (i.length === 0) return blocks;
  logFrameProblem(role, uuid, `dropped ${i.length} malformed content block(s): ${i.join(", ")}`);
  return filtered;
}
//@ chunk-c8ynteey.js:3299-4105 placement
function normalizeAssistantFrame(e) {
  let uuid;
  if (typeof e.uuid === "string" && e.uuid !== "") uuid = e.uuid;
  else {
    logFrameProblem("assistant", e.uuid, "minted a uuid \u2014 original was not a non-empty string");
    uuid = randomUUID();
    e.uuid = uuid;
  }
  let message = e.message;
  if (!isPlainObject(message)) {
    logFrameProblem("assistant", e.uuid, "dropped \u2014 message is not an object");
    return false;
  }
  if (message.id !== undefined && typeof message.id !== "string") {
    message.id = typeof message.id === "number" && Number.isFinite(message.id) ? String(message.id) : e.uuid;
    logFrameProblem("assistant", e.uuid, "coerced a non-string message.id");
  }
  if (typeof message.content === "string")
    message.content = [
      {
        type: "text",
        text: message.content,
      },
    ];
  let content = message.content;
  if (!Array.isArray(content)) {
    logFrameProblem("assistant", e.uuid, "dropped \u2014 message.content is not an array");
    return false;
  }
  let i = dropMalformedBlocks(content, isValidAssistantBlock, "assistant", e.uuid);
  if (i.length === 0 && content.length > 0) {
    logFrameProblem("assistant", e.uuid, "dropped \u2014 no valid content blocks remain");
    return false;
  }
  if (i !== content) message.content = i;
  stripMalformedEnvelopeFields(message, uuid);
  return true;
}
//@ chunk-c8ynteey.js:4105-4506 placement
/**
 * 移除助手帧中格式错误的信封字段（model、stop_reason、usage）并记录。
 */
function stripMalformedEnvelopeFields(message, uuid) {
  let n = [];
  if (message.model !== undefined && typeof message.model !== "string") {
    delete message.model;
    n.push("model");
  }
  if (
    message.stop_reason !== undefined &&
    message.stop_reason !== null &&
    typeof message.stop_reason !== "string"
  ) {
    message.stop_reason = null;
    n.push("stop_reason");
  }
  if (message.usage !== undefined && !CONTENT_BLOCK_TYPES().usage.safeParse(message.usage).success) {
    delete message.usage;
    n.push("usage");
  }
  if (n.length > 0)
    logFrameProblem("assistant", uuid, `removed malformed envelope field(s): ${n.join(", ")}`);
}
//@ chunk-c8ynteey.js:4506-5078 placement
function normalizeUserFrame(e) {
  if (e.uuid !== undefined && (typeof e.uuid !== "string" || e.uuid === "")) {
    logFrameProblem("user", e.uuid, "minted a uuid \u2014 original was not a non-empty string");
    e.uuid = randomUUID();
  }
  let message = e.message;
  if (!isPlainObject(message)) {
    logFrameProblem("user", e.uuid, "dropped \u2014 message is not an object");
    return false;
  }
  let content = message.content;
  if (typeof content === "string") return true;
  if (!Array.isArray(content)) {
    logFrameProblem("user", e.uuid, "dropped \u2014 message.content is neither string nor array");
    return false;
  }
  let s = dropMalformedBlocks(content, isValidUserBlock, "user", e.uuid);
  if (s.length === 0 && content.length > 0) {
    logFrameProblem("user", e.uuid, "dropped \u2014 no valid content blocks remain");
    return false;
  }
  if (s !== content) message.content = s;
  return true;
}
//@ chunk-c8ynteey.js:5078-5850 placement
function normalizeStreamEvent(event) {
  if (!isPlainObject(event)) return false;
  switch (event.type) {
    case "message_start":
      return isPlainObject(event.message) && typeof event.message.id === "string";
    case "content_block_start": {
      let contentBlock = event.content_block;
      if (!isPlainObject(contentBlock) || typeof contentBlock.type !== "string") return false;
      switch (contentBlock.type) {
        case "tool_use":
        case "server_tool_use":
          return typeof contentBlock.id === "string" && typeof contentBlock.name === "string";
        case "text":
          return typeof contentBlock.text === "string";
        case "thinking":
          return typeof contentBlock.thinking === "string";
        default:
          return true;
      }
    }
    case "content_block_delta": {
      let delta = event.delta;
      if (!isPlainObject(delta)) return false;
      switch (delta.type) {
        case "text_delta":
          return typeof delta.text === "string";
        case "input_json_delta":
          return typeof delta.partial_json === "string";
        case "signature_delta":
          return typeof delta.signature === "string";
        case "thinking_delta":
          return typeof delta.thinking === "string";
        default:
          return true;
      }
    }
    default:
      return true;
  }
}
//@ chunk-c8ynteey.js:5850-6510 placement
function capFrameDepth(e) {
  if (!isPlainObject(e)) return true;
  try {
    let r = true;
    try {
      let s = capNestedDepth(e);
      if (s > 0)
        logFrameProblem(
          typeof e.type === "string" ? e.type : "unknown",
          e.uuid,
          `replaced ${s} subtree(s) nested deeper than ${MAX_FRAME_DEPTH} levels with a marker`,
        );
    } catch {
      r = false;
    }
    let n;
    switch (e.type) {
      case "assistant":
        n = normalizeAssistantFrame(e);
        break;
      case "user":
        n = normalizeUserFrame(e);
        break;
      case "stream_event":
        n = normalizeStreamEvent(e.event);
        if (!n) logFrameProblem("stream_event", e.uuid, "dropped \u2014 inner event is malformed");
        break;
      default:
        n = true;
        break;
    }
    if (n && !r && exceedsFrameDepth(e)) {
      logFrameProblem(
        typeof e.type === "string" ? e.type : "unknown",
        e.uuid,
        `dropped \u2014 nested deeper than ${MAX_FRAME_DEPTH} levels`,
      );
      return false;
    }
    return n;
  } catch (error) {
    logFrameProblem(
      typeof e.type === "string" ? e.type : "unknown",
      e.uuid,
      `dropped \u2014 conformance threw: ${errorMessage(error)}`,
    );
    return false;
  }
}
//@ chunk-c8ynteey.js:6510-6968 placement
/**
 * can_use_tool 请求中需要按字符串、枚举与布尔规范化的字段列表。
 */
var CAN_USE_TOOL_STRING_FIELDS = [
  "blocked_path",
  "decision_reason",
  "decision_reason_type",
  "decision_reason_code",
  "decision_reason_rule_source",
  "title",
  "display_name",
  "description",
  "agent_id",
  "tool_kind",
  "server_prompt",
  "provenance_prompt_line",
];
var CAN_USE_TOOL_ENUM_FIELDS = [
  ["decision_reason_hook_event", toolCheckHookId],
  ["decision_reason_hook_source", classicPreToolUseHookId],
  ["decision_reason_hook_plugin_id", classicHookId],
];
var CAN_USE_TOOL_BOOLEAN_FIELDS = [
  "classifier_approvable",
  "suppress_always_allow_rule",
  "default_to_no",
  "requires_user_interaction",
  "server_policy_ask_only",
];
//@ chunk-c8ynteey.js:6968-7104 placement
/**
 * 判断工具请求来自子代理（有 agent_id 且不是特殊工具）。
 */
function isSubagentToolRequest(e) {
  return (
    typeof e.agent_id === "string" &&
    e.agent_id !== "" &&
    typeof e.tool_name === "string" &&
    !isConfirmRepositoryTrustTool(e.tool_name) &&
    !isRequestComputerFolderTool(e.tool_name)
  );
}
//@ chunk-c8ynteey.js:7104-9093 placement
function normalizeCanUseToolRequest(e) {
  if (!isPlainObject(e)) return false;
  try {
    if (
      typeof e.tool_name !== "string" ||
      typeof e.tool_use_id !== "string" ||
      !isPlainObject(e.input) ||
      exceedsFrameDepth(e)
    ) {
      logForDebugging(
        "[wireFrameShape] can_use_tool request dropped \u2014 tool_name/tool_use_id not strings, input not an object, or nested too deep",
        {
          level: "error",
        },
      );
      return false;
    }
    let r = [];
    for (let n of CAN_USE_TOOL_STRING_FIELDS)
      if (e[n] !== undefined && typeof e[n] !== "string") {
        delete e[n];
        r.push(n);
      }
    for (let [n, s] of CAN_USE_TOOL_ENUM_FIELDS)
      if (e[n] !== undefined && s(e[n]) === undefined) {
        delete e[n];
        r.push(n);
      }
    for (let n of CAN_USE_TOOL_BOOLEAN_FIELDS)
      if (e[n] !== undefined && typeof e[n] !== "boolean") {
        delete e[n];
        r.push(n);
      }
    if (e.permission_suggestions !== undefined) {
      let permissionSuggestions = e.permission_suggestions;
      let s = Array.isArray(permissionSuggestions)
        ? permissionSuggestions.filter(
            (permissionSuggestion) => permissionUpdateSchema().safeParse(permissionSuggestion).success,
          )
        : [];
      if (!Array.isArray(permissionSuggestions) || s.length !== permissionSuggestions.length) {
        r.push(
          `permission_suggestions (${Array.isArray(permissionSuggestions) ? `${permissionSuggestions.length - s.length} of ${permissionSuggestions.length} entries` : "not an array"})`,
        );
        if (s.length > 0) e.permission_suggestions = s;
        else delete e.permission_suggestions;
      }
    }
    if (e.matched_ask_rule !== undefined) {
      let matchedAskRule = e.matched_ask_rule;
      if (
        !isPlainObject(matchedAskRule) ||
        typeof matchedAskRule.source !== "string" ||
        typeof matchedAskRule.tool_name !== "string" ||
        (matchedAskRule.rule_content !== undefined && typeof matchedAskRule.rule_content !== "string")
      ) {
        delete e.matched_ask_rule;
        r.push("matched_ask_rule");
      }
    }
    if (e.mcp_server !== undefined) {
      let mcpServer = e.mcp_server;
      if (
        !isPlainObject(mcpServer) ||
        typeof mcpServer.name !== "string" ||
        typeof mcpServer.source !== "string"
      ) {
        delete e.mcp_server;
        r.push("mcp_server");
      }
    }
    if (e.mcp_skill !== undefined) {
      let mcpSkill = e.mcp_skill;
      if (
        !isPlainObject(mcpSkill) ||
        typeof mcpSkill.name !== "string" ||
        typeof mcpSkill.version !== "string" ||
        (mcpSkill.server_description !== undefined && typeof mcpSkill.server_description !== "string")
      ) {
        delete e.mcp_skill;
        e.tool_kind = "mcp_skill";
        r.push("mcp_skill (tool_kind set to 'mcp_skill')");
      }
    }
    if (e.computer_folder !== undefined) {
      let computerFolder = e.computer_folder;
      if (
        !isPlainObject(computerFolder) ||
        typeof computerFolder.path !== "string" ||
        typeof computerFolder.computer_name !== "string"
      ) {
        delete e.computer_folder;
        r.push("computer_folder");
      }
    }
    if (r.length > 0)
      logForDebugging(
        `[wireFrameShape] can_use_tool request ${e.tool_use_id}: removed malformed field(s): ${r.join(", ")}`,
        {
          level: "error",
        },
      );
    return true;
  } catch (error) {
    logForDebugging(
      `[wireFrameShape] can_use_tool request dropped \u2014 conformance threw: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return false;
  }
}
//@ chunk-c8ynteey.js:9093-9267 placement
function parsePermissionRequest(request) {
  let toolUseId = "tool_use_id" in request ? request.tool_use_id : undefined;
  return {
    behavior: "deny",
    message: "Malformed permission request from worker",
    ...(typeof toolUseId === "string" && {
      toolUseID: toolUseId,
    }),
  };
}
//@ chunk-c8ynteey.js:9267-9370 placement
/**
 * 读取有效的 worker_epoch（正整数）。
 */
function readWorkerEpoch(e) {
  let workerEpoch = e.worker_epoch;
  return typeof workerEpoch === "number" && Number.isSafeInteger(workerEpoch) && workerEpoch > 0
    ? workerEpoch
    : undefined;
}
export {
  normalizeStreamEvent,
  isSubagentToolRequest,
  UNSUPPORTED_CONTROL_SUBTYPE_TEXT,
  readWorkerEpoch,
  capFrameDepth,
  normalizeCanUseToolRequest,
  parsePermissionRequest,
};
