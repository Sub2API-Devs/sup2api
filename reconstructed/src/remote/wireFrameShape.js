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
import { pe, o, oe, kt, T, E, A, M } from "../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
import { MLs, sjn, ijn } from "../plugins/functionHooks/sites/classicHookIds.js";
import { KNe, m2 } from "./tools/protocolConstants.js";
import { permissionUpdateSchema } from "../utils/hooks/hookSpecificOutput.js";

//@ chunk-c8ynteey.js:438-483 placement
var R7 = "Unsupported control request subtype";
//@ chunk-c8ynteey.js:519-1345 placement
var CONTENT_BLOCK_TYPES = DoctorLazy(() => {
  let e = pe(o(), oe()),
    r = kt({ type: T("text"), text: o() }),
    n = new Map(),
    s = {
      text: r,
      tool_use: kt({ type: T("tool_use"), id: o(), name: o(), input: e }),
      thinking: kt({ type: T("thinking"), thinking: o(), signature: o().optional() }),
      redacted_thinking: kt({ type: T("redacted_thinking"), data: o() }),
      server_tool_use: kt({ type: T("server_tool_use"), id: o(), name: o(), input: e }),
      mcp_tool_use: kt({ type: T("mcp_tool_use"), id: o(), name: o(), server_name: o(), input: e }),
    };
  for (let [a, c] of Object.entries(s)) n.set(a, c);
  let finite = E().finite();
  return {
    text: r,
    assistantByType: n,
    usage: kt({
      input_tokens: finite,
      output_tokens: finite,
      cache_creation_input_tokens: finite.nullish(),
      cache_read_input_tokens: finite.nullish(),
      iterations: A(kt({})).nullish(),
    }),
    generic: kt({ type: o() }),
    toolResultLike: kt({ type: o(), tool_use_id: o() }),
    toolResult: kt({ type: T("tool_result"), tool_use_id: o(), is_error: M().optional() }),
  };
});
//@ chunk-c8ynteey.js:1345-1415 placement
function u(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-c8ynteey.js:1415-1451 placement
var y = 256,
  w = "[truncated: too deep]";
//@ chunk-c8ynteey.js:1451-1696 placement
function exceedsFrameDepth(e) {
  let r = [];
  if (typeof e === "object" && e !== null) r.push({ value: e, depth: 1 });
  while (r.length > 0) {
    let { value: n, depth: depth } = r.pop();
    if (depth > y) return !0;
    for (let i of Object.values(n))
      if (typeof i === "object" && i !== null) r.push({ value: i, depth: depth + 1 });
  }
  return !1;
}
/**
 * 遍历对象，把超过最大深度的嵌套值替换为占位符，返回替换次数。
 */
//@ chunk-c8ynteey.js:1696-2010 placement
function capNestedDepth(value) {
  let r = 0,
    n = [{ value: value, depth: 1 }];
  while (n.length > 0) {
    let { value: s, depth: depth } = n.pop(),
      a = Array.isArray(s) ? s : u(s) ? s : null;
    if (a === null) continue;
    for (let c of Object.keys(a)) {
      let f = Reflect.get(a, c);
      if (typeof f !== "object" || f === null) continue;
      if (depth + 1 > y) (Reflect.set(a, c, w), r++);
      else n.push({ value: f, depth: depth + 1 });
    }
  }
  return r;
}
//@ chunk-c8ynteey.js:2010-2074 placement
function getTypeField(e) {
  return u(e) && typeof e.type === "string" ? e.type : null;
}
//@ chunk-c8ynteey.js:2074-2177 placement = getReceivedType (0.776)
function getReceivedType(value) {
  let r = getTypeField(value);
  if (r !== null) return r;
  return value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
}
//@ chunk-c8ynteey.js:2177-2344 placement
function isValidAssistantBlock(e) {
  let r = getTypeField(e);
  if (r === null) return !1;
  let n = CONTENT_BLOCK_TYPES();
  return (n.assistantByType.get(r) ?? (r.endsWith("_tool_result") ? n.toolResultLike : n.generic)).safeParse(
    e,
  ).success;
}
/**
 * 规范化工具结果内容：数组只保留合法块，非字符串对象序列化为 JSON，失败返回 false。
 */
//@ chunk-c8ynteey.js:2344-2703 placement
function normalizeToolResultContent(block) {
  let content = block.content;
  if (content === void 0 || typeof content === "string") return !0;
  if (Array.isArray(content)) {
    let filtered = content.filter((s) => {
      let i = getTypeField(s);
      if (i === null) return !1;
      return i === "text"
        ? CONTENT_BLOCK_TYPES().text.safeParse(s).success
        : CONTENT_BLOCK_TYPES().generic.safeParse(s).success;
    });
    if (filtered.length !== content.length) block.content = filtered;
    return !0;
  }
  if (!u(content)) return ((block.content = String(content)), !0);
  try {
    return ((block.content = jsonStringify(content)), !0);
  } catch {
    return !1;
  }
}
//@ chunk-c8ynteey.js:2703-2934 placement
function isValidUserBlock(e) {
  let r = getTypeField(e);
  if (r === null || !u(e)) return !1;
  let n = CONTENT_BLOCK_TYPES();
  if (r === "text") return n.text.safeParse(e).success;
  if (r === "tool_result") {
    if (!n.toolResult.safeParse(e).success) return !1;
    return normalizeToolResultContent(e);
  }
  return n.generic.safeParse(e).success;
}
//@ chunk-c8ynteey.js:2934-3044 placement
function logFrameProblem(e, r, n) {
  logForDebugging(`[wireFrameShape] ${e} frame ${typeof r === "string" ? r : "(no uuid)"}: ${n}`, {
    level: "error",
  });
}
//@ chunk-c8ynteey.js:3044-3299 placement
function dropMalformedBlocks(blocks, isValid, role, uuid) {
  let i = [],
    filtered = blocks.filter((c) => {
      try {
        if (isValid(c)) return !0;
      } catch (error) {
        return (i.push(`unreadable block (${errorMessage(error)})`), !1);
      }
      return (i.push(getReceivedType(c)), !1);
    });
  if (i.length === 0) return blocks;
  return (
    logFrameProblem(role, uuid, `dropped ${i.length} malformed content block(s): ${i.join(", ")}`),
    filtered
  );
}
//@ chunk-c8ynteey.js:3299-4105 placement
function normalizeAssistantFrame(e) {
  let r;
  if (typeof e.uuid === "string" && e.uuid !== "") r = e.uuid;
  else
    (logFrameProblem("assistant", e.uuid, "minted a uuid \u2014 original was not a non-empty string"),
      (r = randomUUID()),
      (e.uuid = r));
  let message = e.message;
  if (!u(message))
    return (logFrameProblem("assistant", e.uuid, "dropped \u2014 message is not an object"), !1);
  if (message.id !== void 0 && typeof message.id !== "string")
    ((message.id =
      typeof message.id === "number" && Number.isFinite(message.id) ? String(message.id) : e.uuid),
      logFrameProblem("assistant", e.uuid, "coerced a non-string message.id"));
  if (typeof message.content === "string") message.content = [{ type: "text", text: message.content }];
  let content = message.content;
  if (!Array.isArray(content))
    return (logFrameProblem("assistant", e.uuid, "dropped \u2014 message.content is not an array"), !1);
  let i = dropMalformedBlocks(content, isValidAssistantBlock, "assistant", e.uuid);
  if (i.length === 0 && content.length > 0)
    return (logFrameProblem("assistant", e.uuid, "dropped \u2014 no valid content blocks remain"), !1);
  if (i !== content) message.content = i;
  return (stripMalformedEnvelopeFields(message, r), !0);
}
/**
 * 移除助手帧中格式错误的信封字段（model、stop_reason、usage）并记录。
 */
//@ chunk-c8ynteey.js:4105-4506 placement
function stripMalformedEnvelopeFields(message, uuid) {
  let n = [];
  if (message.model !== void 0 && typeof message.model !== "string") (delete message.model, n.push("model"));
  if (
    message.stop_reason !== void 0 &&
    message.stop_reason !== null &&
    typeof message.stop_reason !== "string"
  )
    ((message.stop_reason = null), n.push("stop_reason"));
  if (message.usage !== void 0 && !CONTENT_BLOCK_TYPES().usage.safeParse(message.usage).success)
    (delete message.usage, n.push("usage"));
  if (n.length > 0)
    logFrameProblem("assistant", uuid, `removed malformed envelope field(s): ${n.join(", ")}`);
}
//@ chunk-c8ynteey.js:4506-5078 placement
function normalizeUserFrame(e) {
  if (e.uuid !== void 0 && (typeof e.uuid !== "string" || e.uuid === ""))
    (logFrameProblem("user", e.uuid, "minted a uuid \u2014 original was not a non-empty string"),
      (e.uuid = randomUUID()));
  let message = e.message;
  if (!u(message)) return (logFrameProblem("user", e.uuid, "dropped \u2014 message is not an object"), !1);
  let content = message.content;
  if (typeof content === "string") return !0;
  if (!Array.isArray(content))
    return (
      logFrameProblem("user", e.uuid, "dropped \u2014 message.content is neither string nor array"),
      !1
    );
  let s = dropMalformedBlocks(content, isValidUserBlock, "user", e.uuid);
  if (s.length === 0 && content.length > 0)
    return (logFrameProblem("user", e.uuid, "dropped \u2014 no valid content blocks remain"), !1);
  if (s !== content) message.content = s;
  return !0;
}
//@ chunk-c8ynteey.js:5078-5850 placement
function normalizeStreamEvent(e) {
  if (!u(e)) return !1;
  switch (e.type) {
    case "message_start":
      return u(e.message) && typeof e.message.id === "string";
    case "content_block_start": {
      let content_block = e.content_block;
      if (!u(content_block) || typeof content_block.type !== "string") return !1;
      switch (content_block.type) {
        case "tool_use":
        case "server_tool_use":
          return typeof content_block.id === "string" && typeof content_block.name === "string";
        case "text":
          return typeof content_block.text === "string";
        case "thinking":
          return typeof content_block.thinking === "string";
        default:
          return !0;
      }
    }
    case "content_block_delta": {
      let delta = e.delta;
      if (!u(delta)) return !1;
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
          return !0;
      }
    }
    default:
      return !0;
  }
}
//@ chunk-c8ynteey.js:5850-6510 placement
function capFrameDepth(e) {
  if (!u(e)) return !0;
  try {
    let r = !0;
    try {
      let s = capNestedDepth(e);
      if (s > 0)
        logFrameProblem(
          typeof e.type === "string" ? e.type : "unknown",
          e.uuid,
          `replaced ${s} subtree(s) nested deeper than ${y} levels with a marker`,
        );
    } catch {
      r = !1;
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
        if (((n = normalizeStreamEvent(e.event)), !n))
          logFrameProblem("stream_event", e.uuid, "dropped \u2014 inner event is malformed");
        break;
      default:
        n = !0;
        break;
    }
    if (n && !r && exceedsFrameDepth(e))
      return (
        logFrameProblem(
          typeof e.type === "string" ? e.type : "unknown",
          e.uuid,
          `dropped \u2014 nested deeper than ${y} levels`,
        ),
        !1
      );
    return n;
  } catch (error) {
    return (
      logFrameProblem(
        typeof e.type === "string" ? e.type : "unknown",
        e.uuid,
        `dropped \u2014 conformance threw: ${errorMessage(error)}`,
      ),
      !1
    );
  }
}
/**
 * can_use_tool 请求中需要按字符串、枚举与布尔规范化的字段列表。
 */
//@ chunk-c8ynteey.js:6510-6968 placement
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
  ],
  CAN_USE_TOOL_ENUM_FIELDS = [
    ["decision_reason_hook_event", MLs],
    ["decision_reason_hook_source", sjn],
    ["decision_reason_hook_plugin_id", ijn],
  ],
  CAN_USE_TOOL_BOOLEAN_FIELDS = [
    "classifier_approvable",
    "suppress_always_allow_rule",
    "default_to_no",
    "requires_user_interaction",
    "server_policy_ask_only",
  ];
/**
 * 判断工具请求来自子代理（有 agent_id 且不是特殊工具）。
 */
//@ chunk-c8ynteey.js:6968-7104 placement
function isSubagentToolRequest(e) {
  return (
    typeof e.agent_id === "string" &&
    e.agent_id !== "" &&
    typeof e.tool_name === "string" &&
    !KNe(e.tool_name) &&
    !m2(e.tool_name)
  );
}
//@ chunk-c8ynteey.js:7104-9093 placement
function normalizeCanUseToolRequest(e) {
  if (!u(e)) return !1;
  try {
    if (
      typeof e.tool_name !== "string" ||
      typeof e.tool_use_id !== "string" ||
      !u(e.input) ||
      exceedsFrameDepth(e)
    )
      return (
        logForDebugging(
          "[wireFrameShape] can_use_tool request dropped \u2014 tool_name/tool_use_id not strings, input not an object, or nested too deep",
          { level: "error" },
        ),
        !1
      );
    let r = [];
    for (let n of CAN_USE_TOOL_STRING_FIELDS)
      if (e[n] !== void 0 && typeof e[n] !== "string") (delete e[n], r.push(n));
    for (let [n, s] of CAN_USE_TOOL_ENUM_FIELDS)
      if (e[n] !== void 0 && s(e[n]) === void 0) (delete e[n], r.push(n));
    for (let n of CAN_USE_TOOL_BOOLEAN_FIELDS)
      if (e[n] !== void 0 && typeof e[n] !== "boolean") (delete e[n], r.push(n));
    if (e.permission_suggestions !== void 0) {
      let permission_suggestions = e.permission_suggestions,
        s = Array.isArray(permission_suggestions)
          ? permission_suggestions.filter((i) => permissionUpdateSchema().safeParse(i).success)
          : [];
      if (!Array.isArray(permission_suggestions) || s.length !== permission_suggestions.length)
        if (
          (r.push(
            `permission_suggestions (${Array.isArray(permission_suggestions) ? `${permission_suggestions.length - s.length} of ${permission_suggestions.length} entries` : "not an array"})`,
          ),
          s.length > 0)
        )
          e.permission_suggestions = s;
        else delete e.permission_suggestions;
    }
    if (e.matched_ask_rule !== void 0) {
      let matched_ask_rule = e.matched_ask_rule;
      if (
        !u(matched_ask_rule) ||
        typeof matched_ask_rule.source !== "string" ||
        typeof matched_ask_rule.tool_name !== "string" ||
        (matched_ask_rule.rule_content !== void 0 && typeof matched_ask_rule.rule_content !== "string")
      )
        (delete e.matched_ask_rule, r.push("matched_ask_rule"));
    }
    if (e.mcp_server !== void 0) {
      let mcp_server = e.mcp_server;
      if (!u(mcp_server) || typeof mcp_server.name !== "string" || typeof mcp_server.source !== "string")
        (delete e.mcp_server, r.push("mcp_server"));
    }
    if (e.mcp_skill !== void 0) {
      let mcp_skill = e.mcp_skill;
      if (
        !u(mcp_skill) ||
        typeof mcp_skill.name !== "string" ||
        typeof mcp_skill.version !== "string" ||
        (mcp_skill.server_description !== void 0 && typeof mcp_skill.server_description !== "string")
      )
        (delete e.mcp_skill, (e.tool_kind = "mcp_skill"), r.push("mcp_skill (tool_kind set to 'mcp_skill')"));
    }
    if (e.computer_folder !== void 0) {
      let computer_folder = e.computer_folder;
      if (
        !u(computer_folder) ||
        typeof computer_folder.path !== "string" ||
        typeof computer_folder.computer_name !== "string"
      )
        (delete e.computer_folder, r.push("computer_folder"));
    }
    if (r.length > 0)
      logForDebugging(
        `[wireFrameShape] can_use_tool request ${e.tool_use_id}: removed malformed field(s): ${r.join(", ")}`,
        { level: "error" },
      );
    return !0;
  } catch (error) {
    return (
      logForDebugging(
        `[wireFrameShape] can_use_tool request dropped \u2014 conformance threw: ${errorMessage(error)}`,
        { level: "error" },
      ),
      !1
    );
  }
}
//@ chunk-c8ynteey.js:9093-9267 placement
function parsePermissionRequest(e) {
  let r = "tool_use_id" in e ? e.tool_use_id : void 0;
  return {
    behavior: "deny",
    message: "Malformed permission request from worker",
    ...(typeof r === "string" && { toolUseID: r }),
  };
}
/**
 * 读取有效的 worker_epoch（正整数）。
 */
//@ chunk-c8ynteey.js:9267-9370 placement
function readWorkerEpoch(e) {
  let worker_epoch = e.worker_epoch;
  return typeof worker_epoch === "number" && Number.isSafeInteger(worker_epoch) && worker_epoch > 0
    ? worker_epoch
    : void 0;
}

export {
  normalizeStreamEvent,
  isSubagentToolRequest,
  R7,
  readWorkerEpoch,
  capFrameDepth,
  normalizeCanUseToolRequest,
  parsePermissionRequest,
};
