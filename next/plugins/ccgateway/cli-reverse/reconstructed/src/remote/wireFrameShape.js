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
  stringSchema,
  unknown,
  looseObject,
  literal,
  numberSchema,
  array,
  booleanSchema,
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-c8ynteey.js:438-483 placement
/**
 * 导出常量或表 `UNSUPPORTED_CONTROL_SUBTYPE_TEXT`：值为 "Unsupported control request subtype"。
 */
var UNSUPPORTED_CONTROL_SUBTYPE_TEXT = "Unsupported control request subtype";
//@ chunk-c8ynteey.js:519-1345 placement
var CONTENT_BLOCK_TYPES; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-c8ynteey.js:519", () => {
  CONTENT_BLOCK_TYPES = DoctorLazy(() => {
    let input = record(stringSchema(), unknown());
    let text = looseObject({
      type: literal("text"),
      text: stringSchema(),
    });
    let byType = new Map();
    let schemas = {
      text,
      tool_use: looseObject({
        type: literal("tool_use"),
        id: stringSchema(),
        name: stringSchema(),
        input,
      }),
      thinking: looseObject({
        type: literal("thinking"),
        thinking: stringSchema(),
        signature: stringSchema().optional(),
      }),
      redacted_thinking: looseObject({
        type: literal("redacted_thinking"),
        data: stringSchema(),
      }),
      server_tool_use: looseObject({
        type: literal("server_tool_use"),
        id: stringSchema(),
        name: stringSchema(),
        input,
      }),
      mcp_tool_use: looseObject({
        type: literal("mcp_tool_use"),
        id: stringSchema(),
        name: stringSchema(),
        server_name: stringSchema(),
        input,
      }),
    };
    for (let [key, value] of Object.entries(schemas)) byType.set(key, value);
    let pctSchema = numberSchema().finite();
    return {
      text,
      assistantByType: byType,
      usage: looseObject({
        input_tokens: pctSchema,
        output_tokens: pctSchema,
        cache_creation_input_tokens: pctSchema.nullish(),
        cache_read_input_tokens: pctSchema.nullish(),
        iterations: array(looseObject({})).nullish(),
      }),
      generic: looseObject({
        type: stringSchema(),
      }),
      toolResultLike: looseObject({
        type: stringSchema(),
        tool_use_id: stringSchema(),
      }),
      toolResult: looseObject({
        type: literal("tool_result"),
        tool_use_id: stringSchema(),
        is_error: booleanSchema().optional(),
      }),
    };
  });
});
//@ chunk-c8ynteey.js:1345-1415 placement
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
//@ chunk-c8ynteey.js:1415-1451 placement
var MAX_FRAME_DEPTH = 256;
var TRUNCATED_DEPTH_TEXT = "[truncated: too deep]";
//@ chunk-c8ynteey.js:1451-1696 placement
function exceedsFrameDepth(value) {
  let stack = [];
  if (typeof value === "object" && value !== null)
    stack.push({
      value,
      depth: 1,
    });
  while (stack.length > 0) {
    let { value, depth } = stack.pop();
    if (depth > MAX_FRAME_DEPTH) return true;
    for (let child of Object.values(value))
      if (typeof child === "object" && child !== null)
        stack.push({
          value: child,
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
  let cappedCount = 0;
  let stack = [
    {
      value,
      depth: 1,
    },
  ];
  while (stack.length > 0) {
    let { value, depth } = stack.pop();
    let record = Array.isArray(value) ? value : isPlainObject(value) ? value : null;
    if (record === null) continue;
    for (let key of Object.keys(record)) {
      let child = Reflect.get(record, key);
      if (typeof child !== "object" || child === null) continue;
      if (depth + 1 > MAX_FRAME_DEPTH) {
        Reflect.set(record, key, TRUNCATED_DEPTH_TEXT);
        cappedCount++;
      } else
        stack.push({
          value: child,
          depth: depth + 1,
        });
    }
  }
  return cappedCount;
}
//@ chunk-c8ynteey.js:2010-2074 placement
function getTypeField(value) {
  return isPlainObject(value) && typeof value.type === "string" ? value.type : null;
}
//@ chunk-c8ynteey.js:2074-2177 placement = getReceivedType (0.776)
function getReceivedType(value) {
  let typeField = getTypeField(value);
  if (typeField !== null) return typeField;
  return value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
}
//@ chunk-c8ynteey.js:2177-2344 placement
function isValidAssistantBlock(block) {
  let typeField = getTypeField(block);
  if (typeField === null) return false;
  let types = CONTENT_BLOCK_TYPES();
  return (
    types.assistantByType.get(typeField) ??
    (typeField.endsWith("_tool_result") ? types.toolResultLike : types.generic)
  ).safeParse(block).success;
}
//@ chunk-c8ynteey.js:2344-2703 placement
/**
 * 规范化工具结果内容：数组只保留合法块，非字符串对象序列化为 JSON，失败返回 false。
 */
function normalizeToolResultContent(block) {
  let content = block.content;
  if (content === undefined || typeof content === "string") return true;
  if (Array.isArray(content)) {
    let filtered = content.filter((block) => {
      let typeField = getTypeField(block);
      if (typeField === null) return false;
      return typeField === "text"
        ? CONTENT_BLOCK_TYPES().text.safeParse(block).success
        : CONTENT_BLOCK_TYPES().generic.safeParse(block).success;
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
  let types = CONTENT_BLOCK_TYPES();
  if (typeField === "text") return types.text.safeParse(block).success;
  if (typeField === "tool_result") {
    if (!types.toolResult.safeParse(block).success) return false;
    return normalizeToolResultContent(block);
  }
  return types.generic.safeParse(block).success;
}
//@ chunk-c8ynteey.js:2934-3044 placement
function logFrameProblem(role, uuid, problem) {
  logForDebugging(
    `[wireFrameShape] ${role} frame ${typeof uuid === "string" ? uuid : "(no uuid)"}: ${problem}`,
    {
      level: "error",
    },
  );
}
//@ chunk-c8ynteey.js:3044-3299 placement
function dropMalformedBlocks(blocks, isValid, role, uuid) {
  let problems = [];
  let filtered = blocks.filter((block) => {
    try {
      if (isValid(block)) return true;
    } catch (error) {
      problems.push(`unreadable block (${errorMessage(error)})`);
      return false;
    }
    problems.push(getReceivedType(block));
    return false;
  });
  if (problems.length === 0) return blocks;
  logFrameProblem(
    role,
    uuid,
    `dropped ${problems.length} malformed content block(s): ${problems.join(", ")}`,
  );
  return filtered;
}
//@ chunk-c8ynteey.js:3299-4105 placement
function normalizeAssistantFrame(frame) {
  let uuid;
  if (typeof frame.uuid === "string" && frame.uuid !== "") uuid = frame.uuid;
  else {
    logFrameProblem("assistant", frame.uuid, "minted a uuid \u2014 original was not a non-empty string");
    uuid = randomUUID();
    frame.uuid = uuid;
  }
  let message = frame.message;
  if (!isPlainObject(message)) {
    logFrameProblem("assistant", frame.uuid, "dropped \u2014 message is not an object");
    return false;
  }
  if (message.id !== undefined && typeof message.id !== "string") {
    message.id =
      typeof message.id === "number" && Number.isFinite(message.id) ? String(message.id) : frame.uuid;
    logFrameProblem("assistant", frame.uuid, "coerced a non-string message.id");
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
    logFrameProblem("assistant", frame.uuid, "dropped \u2014 message.content is not an array");
    return false;
  }
  let validBlocks = dropMalformedBlocks(content, isValidAssistantBlock, "assistant", frame.uuid);
  if (validBlocks.length === 0 && content.length > 0) {
    logFrameProblem("assistant", frame.uuid, "dropped \u2014 no valid content blocks remain");
    return false;
  }
  if (validBlocks !== content) message.content = validBlocks;
  stripMalformedEnvelopeFields(message, uuid);
  return true;
}
//@ chunk-c8ynteey.js:4105-4506 placement
/**
 * 移除助手帧中格式错误的信封字段（model、stop_reason、usage）并记录。
 */
function stripMalformedEnvelopeFields(message, uuid) {
  let stripped = [];
  if (message.model !== undefined && typeof message.model !== "string") {
    delete message.model;
    stripped.push("model");
  }
  if (
    message.stop_reason !== undefined &&
    message.stop_reason !== null &&
    typeof message.stop_reason !== "string"
  ) {
    message.stop_reason = null;
    stripped.push("stop_reason");
  }
  if (message.usage !== undefined && !CONTENT_BLOCK_TYPES().usage.safeParse(message.usage).success) {
    delete message.usage;
    stripped.push("usage");
  }
  if (stripped.length > 0)
    logFrameProblem("assistant", uuid, `removed malformed envelope field(s): ${stripped.join(", ")}`);
}
//@ chunk-c8ynteey.js:4506-5078 placement
function normalizeUserFrame(frame) {
  if (frame.uuid !== undefined && (typeof frame.uuid !== "string" || frame.uuid === "")) {
    logFrameProblem("user", frame.uuid, "minted a uuid \u2014 original was not a non-empty string");
    frame.uuid = randomUUID();
  }
  let message = frame.message;
  if (!isPlainObject(message)) {
    logFrameProblem("user", frame.uuid, "dropped \u2014 message is not an object");
    return false;
  }
  let content = message.content;
  if (typeof content === "string") return true;
  if (!Array.isArray(content)) {
    logFrameProblem("user", frame.uuid, "dropped \u2014 message.content is neither string nor array");
    return false;
  }
  let validBlocks = dropMalformedBlocks(content, isValidUserBlock, "user", frame.uuid);
  if (validBlocks.length === 0 && content.length > 0) {
    logFrameProblem("user", frame.uuid, "dropped \u2014 no valid content blocks remain");
    return false;
  }
  if (validBlocks !== content) message.content = validBlocks;
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
function capFrameDepth(frame) {
  if (!isPlainObject(frame)) return true;
  try {
    let ok = true;
    try {
      let capped = capNestedDepth(frame);
      if (capped > 0)
        logFrameProblem(
          typeof frame.type === "string" ? frame.type : "unknown",
          frame.uuid,
          `replaced ${capped} subtree(s) nested deeper than ${MAX_FRAME_DEPTH} levels with a marker`,
        );
    } catch {
      ok = false;
    }
    let kept;
    switch (frame.type) {
      case "assistant":
        kept = normalizeAssistantFrame(frame);
        break;
      case "user":
        kept = normalizeUserFrame(frame);
        break;
      case "stream_event":
        kept = normalizeStreamEvent(frame.event);
        if (!kept) logFrameProblem("stream_event", frame.uuid, "dropped \u2014 inner event is malformed");
        break;
      default:
        kept = true;
        break;
    }
    if (kept && !ok && exceedsFrameDepth(frame)) {
      logFrameProblem(
        typeof frame.type === "string" ? frame.type : "unknown",
        frame.uuid,
        `dropped \u2014 nested deeper than ${MAX_FRAME_DEPTH} levels`,
      );
      return false;
    }
    return kept;
  } catch (error) {
    logFrameProblem(
      typeof frame.type === "string" ? frame.type : "unknown",
      frame.uuid,
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
function isSubagentToolRequest(request) {
  return (
    typeof request.agent_id === "string" &&
    request.agent_id !== "" &&
    typeof request.tool_name === "string" &&
    !isConfirmRepositoryTrustTool(request.tool_name) &&
    !isRequestComputerFolderTool(request.tool_name)
  );
}
//@ chunk-c8ynteey.js:7104-9093 placement
function normalizeCanUseToolRequest(request) {
  if (!isPlainObject(request)) return false;
  try {
    if (
      typeof request.tool_name !== "string" ||
      typeof request.tool_use_id !== "string" ||
      !isPlainObject(request.input) ||
      exceedsFrameDepth(request)
    ) {
      logForDebugging(
        "[wireFrameShape] can_use_tool request dropped \u2014 tool_name/tool_use_id not strings, input not an object, or nested too deep",
        {
          level: "error",
        },
      );
      return false;
    }
    let issues = [];
    for (let field of CAN_USE_TOOL_STRING_FIELDS)
      if (request[field] !== undefined && typeof request[field] !== "string") {
        delete request[field];
        issues.push(field);
      }
    for (let [field, allowed] of CAN_USE_TOOL_ENUM_FIELDS)
      if (request[field] !== undefined && allowed(request[field]) === undefined) {
        delete request[field];
        issues.push(field);
      }
    for (let field of CAN_USE_TOOL_BOOLEAN_FIELDS)
      if (request[field] !== undefined && typeof request[field] !== "boolean") {
        delete request[field];
        issues.push(field);
      }
    if (request.permission_suggestions !== undefined) {
      let permissionSuggestions = request.permission_suggestions;
      let suggestionsAreArray = Array.isArray(permissionSuggestions)
        ? permissionSuggestions.filter(
            (permissionSuggestion) => permissionUpdateSchema().safeParse(permissionSuggestion).success,
          )
        : [];
      if (
        !Array.isArray(permissionSuggestions) ||
        suggestionsAreArray.length !== permissionSuggestions.length
      ) {
        issues.push(
          `permission_suggestions (${Array.isArray(permissionSuggestions) ? `${permissionSuggestions.length - suggestionsAreArray.length} of ${permissionSuggestions.length} entries` : "not an array"})`,
        );
        if (suggestionsAreArray.length > 0) request.permission_suggestions = suggestionsAreArray;
        else delete request.permission_suggestions;
      }
    }
    if (request.matched_ask_rule !== undefined) {
      let matchedAskRule = request.matched_ask_rule;
      if (
        !isPlainObject(matchedAskRule) ||
        typeof matchedAskRule.source !== "string" ||
        typeof matchedAskRule.tool_name !== "string" ||
        (matchedAskRule.rule_content !== undefined && typeof matchedAskRule.rule_content !== "string")
      ) {
        delete request.matched_ask_rule;
        issues.push("matched_ask_rule");
      }
    }
    if (request.mcp_server !== undefined) {
      let mcpServer = request.mcp_server;
      if (
        !isPlainObject(mcpServer) ||
        typeof mcpServer.name !== "string" ||
        typeof mcpServer.source !== "string"
      ) {
        delete request.mcp_server;
        issues.push("mcp_server");
      }
    }
    if (request.mcp_skill !== undefined) {
      let mcpSkill = request.mcp_skill;
      if (
        !isPlainObject(mcpSkill) ||
        typeof mcpSkill.name !== "string" ||
        typeof mcpSkill.version !== "string" ||
        (mcpSkill.server_description !== undefined && typeof mcpSkill.server_description !== "string")
      ) {
        delete request.mcp_skill;
        request.tool_kind = "mcp_skill";
        issues.push("mcp_skill (tool_kind set to 'mcp_skill')");
      }
    }
    if (request.computer_folder !== undefined) {
      let computerFolder = request.computer_folder;
      if (
        !isPlainObject(computerFolder) ||
        typeof computerFolder.path !== "string" ||
        typeof computerFolder.computer_name !== "string"
      ) {
        delete request.computer_folder;
        issues.push("computer_folder");
      }
    }
    if (issues.length > 0)
      logForDebugging(
        `[wireFrameShape] can_use_tool request ${request.tool_use_id}: removed malformed field(s): ${issues.join(", ")}`,
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
function readWorkerEpoch(request) {
  let workerEpoch = request.worker_epoch;
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
