/**
 * bridge/controlRequests.ts
 *
 * 2.1.316 新增：control_request id 记账（入站/出站/elicitation/宿主询问）与服务端担保的设置类请求形状校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1qpz7qcd.js (23)
 * attribution: placement 23
 */
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
import { sanitizeTelemetryString } from "../utils/sanitization.js";
import { MODEL_UNAVAILABLE_REASONS, THINKING_DISPLAY_MODES } from "../entrypoints/sdk/coreSchemas.js";
import { controlSuccessResponse } from "../cli/print.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, E, U, o, A } from "../../vendor/zod/v4/classic/schemas.js";
import { SIDE_QUESTION_NO_ANSWER } from "./bridgeMessaging.js";
import { createSyntheticAssistantMessage } from "../remote/remotePermissionBridge.js";
import { formatUnsignedEventWarning, formatUnsignedEventNotice } from "./deviceAttestation.js";
import { getSessionId } from "../bootstrap/state.js";
import { getControlRequestId } from "../utils/controlMessageCompat.js";

//@ chunk-1qpz7qcd.js:906-917 placement
var MAX_LIST_ITEMS = 32;
/**
 * 过滤出非空、≤64 字符的字符串，最多 32 个。
 */
//@ chunk-1qpz7qcd.js:917-1043 placement
function sanitizeStringList(e) {
  if (!Array.isArray(e)) return [];
  return e.filter((r) => typeof r === "string" && r.length > 0 && r.length <= 64).slice(0, 32);
}
//@ chunk-1qpz7qcd.js:1079-1092 placement
var MAX_CONTROL_RESPONSE_BYTES = 8000;
/**
 * 等待 set_model 的裁决 Promise，成功/失败分别回 control_response。
 */
//@ chunk-1qpz7qcd.js:1092-1712 placement
async function respondToSetModelVerdict({ verdict: verdict, respond: respond, inform: inform }) {
  let s = verdict.then((y) => y ?? { ok: !0 }),
    i;
  try {
    i = await s;
  } catch (error) {
    return (
      logForDebugging(`set_model verdict rejected: ${errorMessage(error)}`, { level: "error" }),
      respond({ subtype: "error", error: "set_model failed", error_code: "internal_error" })
    );
  }
  let b = typeof i.model === "string" ? sanitizeTelemetryString(i.model) : void 0;
  if (i.ok) {
    if (Array.isArray(i.notices))
      inform(i.notices.filter((notice) => typeof notice === "string").map(sanitizeTelemetryString));
    return respond(b === void 0 ? { subtype: "success" } : { subtype: "success", response: { model: b } });
  }
  let code = i.code,
    found = MODEL_UNAVAILABLE_REASONS.find((y) => y === code);
  return respond({
    subtype: "error",
    error: xe(i.error).map(sanitizeTelemetryString).join(`
`),
    ...(found !== void 0 && { error_code: found }),
    ...(b !== void 0 && { model: b }),
  });
}
//@ chunk-1qpz7qcd.js:1712-1772 placement
function xe(e) {
  return typeof e === "string"
    ? e.split(`
`)
    : [""];
}
//@ chunk-1qpz7qcd.js:1772-1848 placement
var LIVE_ONLY = "live_only",
  Oe = "The reply is too large to be sent without storing it";
//@ chunk-1qpz7qcd.js:1848-1892 placement
function markLiveOnlyResponse(e, r) {
  return { ...controlSuccessResponse(e, r), [LIVE_ONLY]: !0 };
}
//@ chunk-1qpz7qcd.js:1892-1954 placement
function isLiveOnlyResponse(e) {
  return e.type === "control_response" && e[LIVE_ONLY] === !0;
}
//@ chunk-1qpz7qcd.js:1954-2019 placement
function stripLiveOnlyMarker(e) {
  if (!(LIVE_ONLY in e)) return e;
  let { [LIVE_ONLY]: r, ...n } = e;
  return n;
}
/**
 * 超过字节上限的 live-only control_response 替换成错误应答（"reply is too large"）。
 */
//@ chunk-1qpz7qcd.js:2019-2245 placement
function capLiveOnlyResponseSize(e, r) {
  if (!isLiveOnlyResponse(e) || Buffer.byteLength(jsonStringify(e)) <= r) return e;
  let response = e.response;
  return {
    type: "control_response",
    [LIVE_ONLY]: !0,
    ...(typeof e.uuid === "string" && { uuid: e.uuid }),
    response: { subtype: "error", request_id: response?.request_id, error: Oe },
  };
}
//@ chunk-1qpz7qcd.js:2245-2383 placement
function parseOptionalToolUseId(e) {
  if (e == null || e === "") return { valid: !0, toolUseId: void 0 };
  if (typeof e === "string") return { valid: !0, toolUseId: e };
  return { valid: !1 };
}
//@ chunk-1qpz7qcd.js:2383-2493 placement
var BACKGROUND_TASKS_DISABLED_MESSAGE = "Background tasks are disabled in this session.",
  a7r = "background_tasks: tool_use_id must be a string";
/**
 * initialize 应答里去掉 agents/skills 的 path 与 pluginId 字段后再发给远端。
 */
//@ chunk-1qpz7qcd.js:2493-2700 placement
function stripInitializeAgentPaths(e) {
  return {
    mcpInstructions: void 0,
    agents: e.agents.map(({ path: path, pluginId: pluginId, ...s }) => s),
    skills: e.skills && {
      ...e.skills,
      skillFrontmatter: e.skills.skillFrontmatter.map(({ path: path, pluginId: pluginId, ...s }) => s),
    },
  };
}
//@ chunk-1qpz7qcd.js:2700-2749 placement
function isValidThinkingSettingsRequest(e) {
  return thinkingSettingsSchema().safeParse(e).success;
}
//@ chunk-1qpz7qcd.js:2749-3046 placement
var thinkingSettingsSchema = DoctorLazy(() =>
    u({
      max_thinking_tokens: E()
        .refine((e) => Number.isInteger(e))
        .nullable()
        .optional(),
      thinking_display: U(THINKING_DISPLAY_MODES).nullable().optional(),
    }),
  ),
  c7r = `set_max_thinking_tokens: max_thinking_tokens must be an integer or null and thinking_display must be ${THINKING_DISPLAY_MODES.map((e) => `"${e}"`).join(", ")}, or null`;
//@ chunk-1qpz7qcd.js:3046-3069 placement
var DISPLAY_ONLY = "display_only";
//@ chunk-1qpz7qcd.js:3069-3190 placement
function isDisplayOnlyHistoricalMessage(e) {
  return (
    (e.type === "user" || e.type === "assistant" || e.type === "system") &&
    e.historical === !0 &&
    e.display_only === !0
  );
}
/**
 * 是否是带字符串 type 字段的对象。
 */
//@ chunk-1qpz7qcd.js:3190-3281 placement = extractErrorTypeFromData (1)
function hasStringType_3(data) {
  return data !== null && typeof data === "object" && "type" in data && typeof data.type === "string";
}
//@ chunk-1qpz7qcd.js:7139-7232 placement
function markSyntheticControlResponse(e) {
  return e.response !== null && e.synthetic !== !1
    ? { ...e, response: SIDE_QUESTION_NO_ANSWER, synthetic: !0 }
    : e;
}
/**
 * side_question 控制请求的 zod schema（question + 可选历史问答）；同一声明还定义会话关闭提示文本与关闭时仍处理的只读子类型集合。
 */
//@ chunk-1qpz7qcd.js:7232-7508 placement
var SIDE_QUESTION_REQUEST_SCHEMA = DoctorLazy(() =>
    u({
      question: o(),
      history: A(u({ question: o(), response: o(), fallback_notice: o().optional() })).optional(),
    }),
  ),
  SESSION_SHUTTING_DOWN_MESSAGE = "This session is shutting down.",
  READ_ONLY_CONTROL_SUBTYPES = new Set([
    "initialize",
    "file_suggestions",
    "read_file",
    "get_workspace_diff",
    "get_context_usage",
    "get_usage",
    "mcp_status",
  ]);
/**
 * 未签名事件被丢弃时生成合成助手消息（control_request 除外）；窗口超限用警告文本，否则用普通提示。
 */
//@ chunk-1qpz7qcd.js:29975-30079 placement
function createUnsignedEventNotice(e) {
  if (e.payloadType === "control_request") return;
  return createSyntheticAssistantMessage(
    e.windowCapped ? formatUnsignedEventWarning(e) : formatUnsignedEventNotice(e),
    getSessionId(),
  );
}
/**
 * 会改变会话状态的 control_request 子类型集合（set_model、interrupt、mcp_reconnect、side_question 等），供 getControlRequestInfo 分类。
 */
//@ chunk-1qpz7qcd.js:30079-30367 placement
var MUTATING_CONTROL_SUBTYPES = new Set([
  "set_model",
  "set_permission_mode",
  "interrupt",
  "stop_task",
  "background_tasks",
  "cancel_async_message",
  "set_max_thinking_tokens",
  "rename_session",
  "set_color",
  "mcp_authenticate",
  "mcp_oauth_callback_url",
  "mcp_reconnect",
  "apply_flag_settings",
  "side_question",
  "reload_plugins",
]);
//@ chunk-1qpz7qcd.js:30367-30432 placement
function getControlRequestSubtype(e) {
  let r = getControlRequestId(e);
  return typeof r === "string" ? r : void 0;
}

export {
  getControlRequestSubtype,
  sanitizeStringList,
  MAX_LIST_ITEMS,
  isValidThinkingSettingsRequest,
  c7r,
  hasStringType_3,
  markLiveOnlyResponse,
  isDisplayOnlyHistoricalMessage,
  markSyntheticControlResponse,
  BACKGROUND_TASKS_DISABLED_MESSAGE,
  MUTATING_CONTROL_SUBTYPES,
  READ_ONLY_CONTROL_SUBTYPES,
  SESSION_SHUTTING_DOWN_MESSAGE,
  respondToSetModelVerdict,
  stripInitializeAgentPaths,
  parseOptionalToolUseId,
  a7r,
  SIDE_QUESTION_REQUEST_SCHEMA,
  createUnsignedEventNotice,
  capLiveOnlyResponseSize,
  isLiveOnlyResponse,
  stripLiveOnlyMarker,
  MAX_CONTROL_RESPONSE_BYTES,
  DISPLAY_ONLY,
};
