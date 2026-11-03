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
import { u, E, _enum, string, array } from "../../vendor/zod/v4/classic/schemas.js";
import { SIDE_QUESTION_NO_ANSWER } from "./bridgeMessaging.js";
import { createSyntheticAssistantMessage } from "../remote/remotePermissionBridge.js";
import { formatUnsignedEventWarning, formatUnsignedEventNotice } from "./deviceAttestation.js";
import { getSessionId } from "../bootstrap/state.js";
import { getControlRequestId } from "../utils/controlMessageCompat.js";

//@ chunk-1qpz7qcd.js:906-917 placement
var MAX_LIST_ITEMS = 32;
//@ chunk-1qpz7qcd.js:917-1043 placement
/**
 * 过滤出非空、≤64 字符的字符串，最多 32 个。
 */
function sanitizeStringList(e) {
  if (!Array.isArray(e)) return [];
  return e.filter((r) => typeof r === "string" && r.length > 0 && r.length <= 64).slice(0, 32);
}
//@ chunk-1qpz7qcd.js:1079-1092 placement
var MAX_CONTROL_RESPONSE_BYTES = 8000;
//@ chunk-1qpz7qcd.js:1092-1712 placement
/**
 * 等待 set_model 的裁决 Promise，成功/失败分别回 control_response。
 */
async function respondToSetModelVerdict({ verdict, respond, inform }) {
  let s = verdict.then(
    (y) =>
      y ?? {
        ok: true,
      },
  );
  let i;
  try {
    i = await s;
  } catch (error) {
    logForDebugging(`set_model verdict rejected: ${errorMessage(error)}`, {
      level: "error",
    });
    return respond({
      subtype: "error",
      error: "set_model failed",
      error_code: "internal_error",
    });
  }
  let b = typeof i.model === "string" ? sanitizeTelemetryString(i.model) : undefined;
  if (i.ok) {
    if (Array.isArray(i.notices))
      inform(i.notices.filter((notice) => typeof notice === "string").map(sanitizeTelemetryString));
    return respond(
      b === undefined
        ? {
            subtype: "success",
          }
        : {
            subtype: "success",
            response: {
              model: b,
            },
          },
    );
  }
  let code = i.code;
  let found = MODEL_UNAVAILABLE_REASONS.find((y) => y === code);
  return respond({
    subtype: "error",
    error: errorTextLines(i.error).map(sanitizeTelemetryString).join(`
`),
    ...(found !== undefined && {
      error_code: found,
    }),
    ...(b !== undefined && {
      model: b,
    }),
  });
}
//@ chunk-1qpz7qcd.js:1712-1772 placement
function errorTextLines(error) {
  return typeof error === "string"
    ? error.split(`
`)
    : [""];
}
//@ chunk-1qpz7qcd.js:1772-1848 placement
var LIVE_ONLY = "live_only";
var LIVE_ONLY_TOO_LARGE_TEXT = "The reply is too large to be sent without storing it";
//@ chunk-1qpz7qcd.js:1848-1892 placement
function markLiveOnlyResponse(requestId, r) {
  return {
    ...controlSuccessResponse(requestId, r),
    [LIVE_ONLY]: true,
  };
}
//@ chunk-1qpz7qcd.js:1892-1954 placement
function isLiveOnlyResponse(e) {
  return e.type === "control_response" && e[LIVE_ONLY] === true;
}
//@ chunk-1qpz7qcd.js:1954-2019 placement
function stripLiveOnlyMarker(riskColor) {
  if (!(LIVE_ONLY in riskColor)) return riskColor;
  let { [LIVE_ONLY]: r, ...n } = riskColor;
  return n;
}
//@ chunk-1qpz7qcd.js:2019-2245 placement
/**
 * 超过字节上限的 live-only control_response 替换成错误应答（"reply is too large"）。
 */
function capLiveOnlyResponseSize(e, r) {
  if (!isLiveOnlyResponse(e) || Buffer.byteLength(jsonStringify(e)) <= r) return e;
  let response = e.response;
  return {
    type: "control_response",
    [LIVE_ONLY]: true,
    ...(typeof e.uuid === "string" && {
      uuid: e.uuid,
    }),
    response: {
      subtype: "error",
      request_id: response?.request_id,
      error: LIVE_ONLY_TOO_LARGE_TEXT,
    },
  };
}
//@ chunk-1qpz7qcd.js:2245-2383 placement
function parseOptionalToolUseId(toolUseId) {
  if (toolUseId == null || toolUseId === "")
    return {
      valid: true,
      toolUseId: undefined,
    };
  if (typeof toolUseId === "string")
    return {
      valid: true,
      toolUseId,
    };
  return {
    valid: false,
  };
}
//@ chunk-1qpz7qcd.js:2383-2493 placement
/**
 * background_tasks 控制请求里 tool_use_id 类型错误的提示文本。
 */
var BACKGROUND_TASKS_DISABLED_MESSAGE = "Background tasks are disabled in this session.";
var BACKGROUND_TASKS_TOOL_USE_ID_ERROR = "background_tasks: tool_use_id must be a string";
//@ chunk-1qpz7qcd.js:2493-2700 placement
/**
 * initialize 应答里去掉 agents/skills 的 path 与 pluginId 字段后再发给远端。
 */
function stripInitializeAgentPaths(e) {
  return {
    mcpInstructions: undefined,
    agents: e.agents.map(({ path, pluginId, ...s }) => s),
    skills: e.skills && {
      ...e.skills,
      skillFrontmatter: e.skills.skillFrontmatter.map(({ path, pluginId, ...s }) => s),
    },
  };
}
//@ chunk-1qpz7qcd.js:2700-2749 placement
function isValidThinkingSettingsRequest(e) {
  return thinkingSettingsSchema().safeParse(e).success;
}
//@ chunk-1qpz7qcd.js:2749-3046 placement
/**
 * set_max_thinking_tokens 控制请求的 thinking 设置校验 schema，以及校验失败时的完整错误文案。
 */
var thinkingSettingsSchema = DoctorLazy(() =>
  u({
    max_thinking_tokens: E()
      .refine((e) => Number.isInteger(e))
      .nullable()
      .optional(),
    thinking_display: _enum(THINKING_DISPLAY_MODES).nullable().optional(),
  }),
);
var THINKING_SETTINGS_INVALID_MESSAGE = `set_max_thinking_tokens: max_thinking_tokens must be an integer or null and thinking_display must be ${THINKING_DISPLAY_MODES.map((e) => `"${e}"`).join(", ")}, or null`;
//@ chunk-1qpz7qcd.js:3046-3069 placement
var DISPLAY_ONLY = "display_only";
//@ chunk-1qpz7qcd.js:3069-3190 placement
function isDisplayOnlyHistoricalMessage(e) {
  return (
    (e.type === "user" || e.type === "assistant" || e.type === "system") &&
    e.historical === true &&
    e.display_only === true
  );
}
//@ chunk-1qpz7qcd.js:3190-3281 placement = extractErrorTypeFromData (1)
/**
 * 是否是带字符串 type 字段的对象。
 */
function hasStringType_3(data) {
  return data !== null && typeof data === "object" && "type" in data && typeof data.type === "string";
}
//@ chunk-1qpz7qcd.js:7139-7232 placement
function markSyntheticControlResponse(e) {
  return e.response !== null && e.synthetic !== false
    ? {
        ...e,
        response: SIDE_QUESTION_NO_ANSWER,
        synthetic: true,
      }
    : e;
}
//@ chunk-1qpz7qcd.js:7232-7508 placement
/**
 * side_question 控制请求的 zod schema（question + 可选历史问答）；同一声明还定义会话关闭提示文本与关闭时仍处理的只读子类型集合。
 */
var SIDE_QUESTION_REQUEST_SCHEMA = DoctorLazy(() =>
  u({
    question: string(),
    history: array(
      u({
        question: string(),
        response: string(),
        fallback_notice: string().optional(),
      }),
    ).optional(),
  }),
);
var SESSION_SHUTTING_DOWN_MESSAGE = "This session is shutting down.";
var READ_ONLY_CONTROL_SUBTYPES = new Set([
  "initialize",
  "file_suggestions",
  "read_file",
  "get_workspace_diff",
  "get_context_usage",
  "get_usage",
  "mcp_status",
]);
//@ chunk-1qpz7qcd.js:29975-30079 placement
/**
 * 未签名事件被丢弃时生成合成助手消息（control_request 除外）；窗口超限用警告文本，否则用普通提示。
 */
function createUnsignedEventNotice(e) {
  if (e.payloadType === "control_request") return;
  return createSyntheticAssistantMessage(
    e.windowCapped ? formatUnsignedEventWarning(e) : formatUnsignedEventNotice(e),
    getSessionId(),
  );
}
//@ chunk-1qpz7qcd.js:30079-30367 placement
/**
 * 会改变会话状态的 control_request 子类型集合（set_model、interrupt、mcp_reconnect、side_question 等），供 getControlRequestInfo 分类。
 */
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
  let controlRequestId = getControlRequestId(e);
  return typeof controlRequestId === "string" ? controlRequestId : undefined;
}
export {
  getControlRequestSubtype,
  sanitizeStringList,
  MAX_LIST_ITEMS,
  isValidThinkingSettingsRequest,
  THINKING_SETTINGS_INVALID_MESSAGE,
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
  BACKGROUND_TASKS_TOOL_USE_ID_ERROR,
  SIDE_QUESTION_REQUEST_SCHEMA,
  createUnsignedEventNotice,
  capLiveOnlyResponseSize,
  isLiveOnlyResponse,
  stripLiveOnlyMarker,
  MAX_CONTROL_RESPONSE_BYTES,
  DISPLAY_ONLY,
};
