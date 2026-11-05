/**
 * services/api/requestHeaders.ts
 *
 * 2.1.316 新增：校验 x-api-key/Authorization/自定义头的值，非法时抛出带来源的错误；保留的请求头名与环境变量到请求头的映射等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (30), chunk-vn3g7zt8.js (46)
 * attribution: placement 66, layout 10
 */
import { isIP } from "net";
import { RETRY_ON_529_QUERY_SOURCES } from "./withRetry.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  toError,
} from "../../utils/errors.js";
import { checkValueChars, describeUnsafeValue } from "../../utils/settings/managedSettingsKeys.js";
import { textLengthAndLines } from "../../utils/auth.js";
import {
  isProgramUseCaseChoiceEnabled,
  isProgramUseCaseTurnScoped,
  programUseCaseIdForWire,
} from "../../utils/programUseCase.js";
import {
  wigglyDoveFieldCodeLr,
  wigglyDoveFieldCodeNg,
  wigglyDoveFieldCodeKi,
  wigglyDoveFieldCodeTn,
  wigglyDoveFieldCodeNy,
  wigglyDoveFieldCodeAx,
  wigglyDoveFieldCodeMz,
  wigglyDoveFieldCodeIa,
  isWigglyDoveHeader,
  TENGU_WIGGLY_DOVE,
  wigglyDoveFieldCodeTt,
  wigglyDoveFieldCodeBf,
  wigglyDoveFieldCodeOh,
  wigglyDoveFieldCodeOz,
  wigglyDoveFieldCodeFy,
  wigglyDoveFieldCodeRl,
  wigglyDoveFieldCodeYb,
  wigglyDoveFieldCodeNv,
  wigglyDoveFieldCodeZb,
  wigglyDoveFieldCodeVt,
  wigglyDoveFieldCodeFs,
  wigglyDoveFieldCodePh,
  wigglyDoveFieldCodeVd,
  wigglyDoveFieldCodeXf,
  wigglyDoveFieldCodeZr,
  wigglyDoveFieldCodeZx,
  wigglyDoveFieldCodeIi,
  wigglyDoveFieldCodeFz,
  wigglyDoveFieldCodeVy,
  wigglyDoveFieldCodeBm,
  wigglyDoveFieldCodeZi,
  wigglyDoveFieldCodeKb,
  wigglyDoveFieldCodeWb,
  wigglyDoveFieldCodeSw,
  wigglyDoveFieldCodeWj,
  wigglyDoveFieldCodeXu,
  wigglyDoveFieldCodeUm,
  wigglyDoveFieldCodeSa,
  wigglyDoveFieldCodeSu,
  wigglyDoveFieldCodeHo,
  wigglyDoveFieldCodeZg,
  wigglyDoveFieldCodeXb,
  wigglyDoveFieldCodeKh,
  wigglyDoveFieldCodeZl,
  wigglyDoveFieldCodeXs,
  wigglyDoveFieldCodeYm,
  wigglyDoveFieldCodeNp,
  wigglyDoveFieldCodeOm,
  wigglyDoveFieldCodePf,
  wigglyDoveFieldCodeBt,
  wigglyDoveFieldCodeVo,
  wigglyDoveFieldCodeIy,
  wigglyDoveFieldCodeZz,
  wigglyDoveFieldCodeBo,
  wigglyDoveFieldCodeQl,
  wigglyDoveFieldCodeMb,
  wigglyDoveFieldCodePd,
  wigglyDoveFieldCodeBq,
  wigglyDoveFieldCodeTg,
  wigglyDoveFieldCodeVr,
  wigglyDoveFieldCodeV,
  wigglyDoveFieldCodeYw,
  wigglyDoveFieldCodeJm,
  wigglyDoveFieldCodeYi,
  wigglyDoveFieldCodeWm,
  wigglyDoveFieldCodeHg,
  wigglyDoveFieldCodeYl,
  wigglyDoveFieldCodeBx,
  wigglyDoveFieldCodeQi,
  wigglyDoveFieldCodeOb,
  wigglyDoveFieldCodeSk,
  wigglyDoveFieldCodeRf,
  wigglyDoveFieldCodeWl,
  wigglyDoveFieldCodeFu,
  wigglyDoveFieldCodeRt,
  wigglyDoveFieldCodeVb,
  wigglyDoveFieldCodeMa,
  wigglyDoveFieldCodeMo,
  wigglyDoveFieldCodeJy,
  wigglyDoveHeaderName,
} from "./wigglyDove.js";
import { logError } from "../../utils/log.js";
import { isAntBuild, isEnvTruthy } from "../../utils/envUtils.js";
import { env } from "../../utils/env.js";
import { getCwdOrNull, getContextKey } from "../../utils/cwd.js";
import { findGitRoot, findCanonicalGitRoot, findRepoRemoteSlug } from "../../utils/git.js";
import { getSessionFlags, getSessionFlagReaders } from "./sessionFlags.js";
import { envDynamic } from "../../utils/envDynamic.js";
import {
  getEntrypointOnRequests,
  isCcsTenant,
  getCcrDerivedSurface,
  getPromptId,
  getSessionId,
} from "../../bootstrap/state.js";
import { CLI_ENTRYPOINT, isClaudeAiChatOrigin } from "../../utils/entrypointKinds.js";
import { isAutoModeActive } from "../../utils/permissions/autoModeState.js";
import { getComputerUseSession } from "../../utils/computerUse/session.js";
import { getCustomHeaders as getCustomHeaders_3 } from "./client.js";
import { effectiveEnvSnapshot } from "../../utils/settings/envSources.js";
import { isFirstPartyApiBackend, assumesFirstPartyBaseUrl } from "../../utils/model/providers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { isFirstPartyBaseUrl } from "../../utils/model/firstPartyBaseUrl.js";
import {
  sfToken,
  sfString,
  sfInnerList,
  isTextField,
  sfBoolean,
  serializeSfDictionary,
} from "../../utils/structuredFields.js";
import { streamFallbackWarning } from "./streamFallbackWarning.js";
import { logForDebugging } from "../../utils/debug.js";
import { isMemoryOperationQuerySource } from "../../utils/telemetry/accountMemoryRedaction.js";
import { turnAttributionKeyFor } from "../../utils/agentContext.js";
import { withDeadline } from "../../utils/sleep.js";
import { apiClient } from "../routines/routinesApi.js";
import { yieldToEventLoop } from "../../native-ts/file-index/index.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { getUserAgent } from "../../utils/http.js";
import { customHeaderNames } from "./customHeaders.js";
import { import_reject } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:389573-389664 placement
/**
 * 查询来源是否为主线程或代理。
 */
function isMainOrAgentQuerySource(querySource) {
  if (querySource === undefined) return true;
  if (querySource.startsWith("agent:")) return true;
  return RETRY_ON_529_QUERY_SOURCES.has(querySource);
}
//@ chunk-exfmq47h.js:389664-389752 placement
/**
 * 导出函数 `isRetryOn529Source`：参数 e，返回 !1; let n = RETRY_ON_529_QUERY_SOURCES; return e.startsWith("agent:") || n.has(e)。
 */
function isRetryOn529Source(querySource) {
  if (querySource === undefined) return false;
  let sources = RETRY_ON_529_QUERY_SOURCES;
  return querySource.startsWith("agent:") || sources.has(querySource);
}
//@ chunk-exfmq47h.js:389752-389927 placement
/**
 * 把查询来源分为 main/subagent/auxiliary。
 */
function classifyQuerySource(querySource) {
  if (querySource === undefined) return;
  if (querySource.startsWith("repl_main_thread") || querySource === "sdk") return "main";
  if (querySource.startsWith("agent:") || querySource === "hook_agent") return "subagent";
  return "auxiliary";
}
//@ chunk-exfmq47h.js:389927-389977 placement
/**
 * 是否为主线程查询。
 */
function isMainQuerySource(querySource) {
  return querySource === undefined || classifyQuerySource(querySource) === "main";
}
//@ chunk-exfmq47h.js:389977-390049 placement
/**
 * 是否为 auto mode 分类器查询。
 */
function isAutoModeQuerySource(querySource) {
  return querySource === "auto_mode" || querySource === "auto_mode_investigator" || false;
}
//@ chunk-exfmq47h.js:390049-390196 layout
var ARTIFACT_OUTPUT_SOURCE_QUERIES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:390049", () => {
  ARTIFACT_OUTPUT_SOURCE_QUERIES = new Set([
    "artifact_comment_reply",
    "artifact_comment_triage",
    "artifact_comment_analyst",
    "artifact_comment_fast_ack",
    "artifact_patch_edit",
  ]);
});
//@ chunk-exfmq47h.js:390196-390263 placement
function querySourceFamily(querySource) {
  let index = querySource.indexOf(":");
  return index > 0 ? querySource.slice(0, index) : undefined;
}
//@ chunk-exfmq47h.js:390263-390343 placement
/**
 * 自定义 agent 来源归一为 agent:custom。
 */
function normalizeAgentQuerySource(querySource) {
  if (querySource?.startsWith("agent:custom:")) return "agent:custom";
  return querySource;
}
//@ chunk-exfmq47h.js:390343-390485 placement
/**
 * 请求分类请求头 x-claude-code-request-class 与 x-claude-code-agent-type，及允许的请求类别列表。
 */
var X_CLAUDE_CODE_REQUEST_CLASS = "x-claude-code-request-class";
var X_CLAUDE_CODE_AGENT_TYPE = "x-claude-code-agent-type";
var REQUEST_CLASSES = ["main", "subagent", "workflow", "compaction", "auxiliary", "side_reply"];
//@ chunk-exfmq47h.js:390485-390684 placement
/**
 * 由查询来源确定请求通道（compaction、workflow、subagent 等），可被显式指定覆盖。
 */
function requestLaneFor(source, agentContext, requestClass) {
  if (source === undefined) return;
  if (requestClass !== undefined) return requestClass;
  if (source === "compact") return "compaction";
  let querySourceKind = classifyQuerySource(source);
  if (querySourceKind === "subagent" && agentContext.agentType === "subagent" && agentContext.workflowRunId)
    return "workflow";
  return querySourceKind;
}
//@ chunk-exfmq47h.js:390684-390708 placement
var AGENT_BUILTIN = "agent:builtin:";
//@ chunk-exfmq47h.js:390708-390925 placement
/**
 * 由 agent:* 查询来源得出代理种类（teammate、内置代理名、custom）。
 */
function agentKindFor(source, agentContext) {
  if (source === undefined || !source.startsWith("agent:")) return;
  if (agentContext.agentType === "teammate") return "teammate";
  if (source.startsWith(AGENT_BUILTIN)) return source.slice(AGENT_BUILTIN.length) || undefined;
  if (source.startsWith("agent:custom")) return "custom";
  return;
}
//@ chunk-exfmq47h.js:390925-390959 placement
var X_CLAUDE_CODE_PROMPT_ID = "x-claude-code-prompt-id";
//@ chunk-exfmq47h.js:390959-390989 placement
var X_COWORK_ENROLLMENT = "x-cowork-enrollment";
//@ chunk-exfmq47h.js:390989-391030 placement
var X_CLAUDE_REMOTE_SESSION_ORIGIN = "x-claude-remote-session-origin";
//@ chunk-exfmq47h.js:391030-391065 placement
var X_CLAUDE_CODE_SESSION_ID = "X-Claude-Code-Session-Id";
//@ chunk-exfmq47h.js:391065-391329 placement
/**
 * 请求头值非法（发送前拒绝）的错误。
 */
let InvalidRequestHeaderValueError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:391065", () => {
  InvalidRequestHeaderValueError = class InvalidRequestHeaderValueError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    header;
    source;
    constructor(status, header, source) {
      super(status, "request header value rejected before send: not a valid HTTP header value");
      this.header = header;
      this.source = source;
      this.name = "InvalidRequestHeaderValueError";
    }
    get isUserSupplied() {
      return this.source !== "claude-code";
    }
  };
});
//@ chunk-exfmq47h.js:391329-392487 placement
/**
 * 保留的请求头名与环境变量到请求头的映射。
 */
var RESERVED_REQUEST_HEADERS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var RESERVED_HEADER_SOURCE_ENV;
var CREDENTIAL_SOURCE_LABELS;
deferInit("chunk-exfmq47h.js:391329", () => {
  RESERVED_REQUEST_HEADERS = new Set([
    "x-app",
    X_CLAUDE_CODE_SESSION_ID,
    "x-claude-code-agent-id",
    "x-claude-code-parent-agent-id",
    X_CLAUDE_CODE_PROMPT_ID,
    X_CLAUDE_CODE_REQUEST_CLASS,
    X_CLAUDE_CODE_AGENT_TYPE,
    "x-anthropic-additional-protection",
    X_CLAUDE_REMOTE_SESSION_ORIGIN,
    X_COWORK_ENROLLMENT,
  ]);
  RESERVED_HEADER_SOURCE_ENV = {
    "x-client-app": "CLAUDE_AGENT_SDK_CLIENT_APP",
    "x-claude-remote-container-id": "CLAUDE_CODE_CONTAINER_ID",
    "x-claude-remote-session-id": "CLAUDE_CODE_REMOTE_SESSION_ID",
    "User-Agent": "User-Agent environment",
  };
  CREDENTIAL_SOURCE_LABELS = {
    ANTHROPIC_API_KEY: " from ANTHROPIC_API_KEY",
    apiKeyHelper: " from apiKeyHelper",
    "/login managed key": " from the saved /login API key",
    ANTHROPIC_AUTH_TOKEN: " from ANTHROPIC_AUTH_TOKEN",
    CLAUDE_CODE_OAUTH_TOKEN: " from CLAUDE_CODE_OAUTH_TOKEN",
    CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR: " from the OAuth token file descriptor",
    CCR_OAUTH_TOKEN_FILE: " from the OAuth token file",
    "claude.ai": " from the saved claude.ai login",
    ANTHROPIC_CUSTOM_HEADERS: " from ANTHROPIC_CUSTOM_HEADERS",
    CLAUDE_AGENT_SDK_CLIENT_APP: " from CLAUDE_AGENT_SDK_CLIENT_APP",
    CLAUDE_CODE_CONTAINER_ID: " from CLAUDE_CODE_CONTAINER_ID",
    CLAUDE_CODE_REMOTE_SESSION_ID: " from CLAUDE_CODE_REMOTE_SESSION_ID",
    "User-Agent environment":
      " from CLAUDE_CODE_ENTRYPOINT / CLAUDE_AGENT_SDK_VERSION / CLAUDE_AGENT_SDK_CLIENT_APP",
    unknown: "",
    "claude-code": "",
  };
});
//@ chunk-exfmq47h.js:392487-394058 placement
/**
 * 校验 x-api-key/Authorization/自定义头的值，非法时抛出带来源的错误。
 */
function validateAuthHeaders({
  apiKey,
  getApiKeySource,
  authToken,
  getAuthTokenSource,
  defaultHeaders,
  authorizationSource,
  customHeaderNames,
  envSuppliedHeaderNames,
}) {
  if (apiKey !== null && isInvalidHeaderPair("x-api-key", apiKey)) {
    let apiKeySource = getApiKeySource();
    throw new InvalidRequestHeaderValueError(
      `Invalid X-Api-Key header value${CREDENTIAL_SOURCE_LABELS[apiKeySource]}: ${describeInvalidHeaderValue(apiKey)}.`,
      "X-Api-Key",
      apiKeySource,
    );
  }
  for (let [key, value] of Object.entries(defaultHeaders)) {
    if (typeof value !== "string" || !isInvalidHeaderPair(key, value)) continue;
    let index = customHeaderNames.indexOf(key);
    let message = `distinct header ${index + 1} of ${customHeaderNames.length} parsed from ANTHROPIC_CUSTOM_HEADERS`;
    if (isInvalidHeaderName(key))
      throw new InvalidRequestHeaderValueError(
        index === -1
          ? `Invalid request header name: the HTTP runtime does not accept it (${characterCount(key.length)}).`
          : `Invalid name for ${message}: the HTTP runtime does not accept it (${characterCount(key.length)}).`,
        "other",
        index === -1 ? "claude-code" : "ANTHROPIC_CUSTOM_HEADERS",
      );
    let sourceEnv = RESERVED_HEADER_SOURCE_ENV[key];
    if (sourceEnv !== undefined && envSuppliedHeaderNames.has(key))
      throw new InvalidRequestHeaderValueError(
        `Invalid ${key} header value${CREDENTIAL_SOURCE_LABELS[sourceEnv]}: ${describeInvalidHeaderValue(value)}.`,
        "other",
        sourceEnv,
      );
    let isAuthorization = key === "Authorization" && authorizationSource !== null;
    if (key.toLowerCase() === "authorization") {
      let resolvedSource = isAuthorization
        ? authorizationSource
        : index === -1
          ? "unknown"
          : "ANTHROPIC_CUSTOM_HEADERS";
      let bareToken = isAuthorization && value.startsWith("Bearer ") ? value.slice(7) : value;
      throw new InvalidRequestHeaderValueError(
        `Invalid Authorization header value${CREDENTIAL_SOURCE_LABELS[resolvedSource]}: ${describeInvalidHeaderValue(bareToken)}.`,
        "Authorization",
        resolvedSource,
      );
    }
    if (index !== -1)
      throw new InvalidRequestHeaderValueError(
        `Invalid value for ${message}: ${describeInvalidHeaderValue(value)}.`,
        key.toLowerCase() === "x-api-key" ? "X-Api-Key" : "other",
        "ANTHROPIC_CUSTOM_HEADERS",
      );
    if (sourceEnv !== undefined)
      throw new InvalidRequestHeaderValueError(
        `Invalid ${key} header value${CREDENTIAL_SOURCE_LABELS[sourceEnv]}: ${describeInvalidHeaderValue(value)}.`,
        "other",
        sourceEnv,
      );
    throw new InvalidRequestHeaderValueError(
      RESERVED_REQUEST_HEADERS.has(key)
        ? `Invalid ${key} header value: ${describeInvalidHeaderValue(value)}.`
        : `Invalid request header value: ${describeInvalidHeaderValue(value)}.`,
      "other",
      "claude-code",
    );
  }
  if (authToken !== null && isInvalidHeaderPair("authorization", `Bearer ${authToken}`)) {
    let authTokenSource = getAuthTokenSource();
    throw new InvalidRequestHeaderValueError(
      `Invalid Authorization header value${CREDENTIAL_SOURCE_LABELS[authTokenSource]}: ${describeInvalidHeaderValue(authToken)}.`,
      "Authorization",
      authTokenSource,
    );
  }
}
//@ chunk-exfmq47h.js:394058-394126 placement
function isInvalidHeaderPair(name, value) {
  try {
    new Headers([[name, value]]);
    return false;
  } catch {
    return true;
  }
}
//@ chunk-exfmq47h.js:394126-394194 placement
function isInvalidHeaderName(name) {
  try {
    new Headers([[name, "x"]]);
    return false;
  } catch {
    return true;
  }
}
//@ chunk-exfmq47h.js:394194-394333 placement
function describeInvalidHeaderValue(value) {
  let problem = checkValueChars(value);
  let metrics = textLengthAndLines(value);
  return problem === null
    ? `it contains a character the HTTP runtime does not accept (${characterCount(metrics.length)})`
    : describeUnsafeValue(problem, metrics);
}
//@ chunk-exfmq47h.js:394333-394393 placement
function characterCount(text) {
  return text === 1 ? "1 character" : `${text} characters`;
}
//@ chunk-exfmq47h.js:394423-394995 placement
/**
 * 已知内容块类型集合。
 */
var KNOWN_CONTENT_BLOCK_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EXTRA_ALLOWLISTED_BLOCK_TYPES;
var ALLOWLISTED_BLOCK_TYPES;
deferInit("chunk-exfmq47h.js:394423", () => {
  KNOWN_CONTENT_BLOCK_TYPES = {
    advisor_tool_result: true,
    bash_code_execution_tool_result: true,
    code_execution_tool_result: true,
    compaction: true,
    container_upload: true,
    document: true,
    fallback: true,
    image: true,
    mcp_tool_listing: true,
    mcp_tool_result: true,
    mcp_tool_use: true,
    redacted_thinking: true,
    search_result: true,
    server_tool_use: true,
    text: true,
    text_editor_code_execution_tool_result: true,
    thinking: true,
    tool_result: true,
    tool_search_tool_result: true,
    tool_addition: true,
    tool_removal: true,
    tool_use: true,
    web_fetch_tool_result: true,
    web_search_tool_result: true,
  };
  EXTRA_ALLOWLISTED_BLOCK_TYPES = ["connector_text", "mid_conv_system", "tool_reference"];
  ALLOWLISTED_BLOCK_TYPES = new Set([
    ...Object.keys(KNOWN_CONTENT_BLOCK_TYPES),
    ...EXTRA_ALLOWLISTED_BLOCK_TYPES,
  ]);
});
//@ chunk-exfmq47h.js:394995-395049 placement
/**
 * 是否为已知内容块类型。
 */
function isKnownContentBlockType(blockType) {
  return typeof blockType === "string" && ALLOWLISTED_BLOCK_TYPES.has(blockType);
}
//@ chunk-exfmq47h.js:395049-395243 placement
var KNOWN_BLOCK_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:395049", () => {
  KNOWN_BLOCK_TYPES = new Set([
    "audio",
    "file",
    "function",
    "image_file",
    "image_url",
    "input_audio",
    "input_file",
    "input_image",
    "input_text",
    "output_text",
    "refusal",
    "resource",
    "resource_link",
    "video",
    "video_url",
  ]);
});
//@ chunk-exfmq47h.js:395243-395316 placement
/**
 * 导出函数 `allowlistedBlockType`：参数 e，返回 Sp.has(e) ? e : `non-allowlisted (${e.length} chars)`。
 */
function allowlistedBlockType(type) {
  return ALLOWLISTED_BLOCK_TYPES.has(type) ? type : `non-allowlisted (${type.length} chars)`;
}
//@ chunk-exfmq47h.js:395316-395471 placement
var KNOWN_ENUM_VALUES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NON_ALLOWLISTED_PATTERN;
deferInit("chunk-exfmq47h.js:395316", () => {
  KNOWN_ENUM_VALUES = new Set([
    "adaptive",
    "any",
    "auto",
    "base64",
    "content",
    "disabled",
    "enabled",
    "ephemeral",
    "none",
    "tool",
    "url",
  ]);
  NON_ALLOWLISTED_PATTERN = /^non-allowlisted \(\d{1,4} chars\)$/;
});
//@ chunk-exfmq47h.js:395471-395551 placement
function redactUnknownBlockType(type) {
  return isKnownBlockType(type) || NON_ALLOWLISTED_PATTERN.test(type)
    ? type
    : `non-allowlisted (${type.length} chars)`;
}
//@ chunk-exfmq47h.js:395551-395605 placement
function isKnownBlockType(type) {
  return ALLOWLISTED_BLOCK_TYPES.has(type) || KNOWN_BLOCK_TYPES.has(type) || KNOWN_ENUM_VALUES.has(type);
}
//@ chunk-vn3g7zt8.js:230678-230737 placement
/**
 * 按会话预取 CCR 发送方地址，失败只记录。
 */
function prefetchSenderAddressFor() {
  if (!isProgramUseCaseChoiceEnabled() || isProgramUseCaseTurnScoped()) return;
  return programUseCaseIdForWire() ?? undefined;
}
//@ chunk-vn3g7zt8.js:262489-262528 placement
/**
 * 请求头 SF 字典（键值对头）的限额：最多 32 项、键 128、值 128，另留键长余量。
 */
var MAX_HEADER_DICT_MEMBERS = 32;
var MAX_HEADER_KEY_LENGTH = 128;
var MAX_HEADER_VALUE_LENGTH = 128;
var RESERVED_DICT_SLOTS = 21;
var FREE_DICT_SLOTS = MAX_HEADER_DICT_MEMBERS - RESERVED_DICT_SLOTS;
//@ chunk-vn3g7zt8.js:262528-262555 placement
function senderAddressHeaderValue(address) {
  return wigglyDoveFieldCodeLr();
}
//@ chunk-vn3g7zt8.js:262555-262763 placement
var SUMMARY_QUERY_SOURCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CLASSIFIER_QUERY_SOURCES;
deferInit("chunk-vn3g7zt8.js:262555", () => {
  SUMMARY_QUERY_SOURCES = new Set([
    "compact",
    "agent_summary",
    "away_summary",
    "tool_use_summary_generation",
  ]);
  CLASSIFIER_QUERY_SOURCES = new Set([
    "auto_mode",
    "auto_mode_investigator",
    "compact_fab_check",
    "agent_classifier",
    "subagent_config_classifier",
  ]);
});
//@ chunk-vn3g7zt8.js:262763-262809 placement
function isClassifierQuerySource(querySource) {
  if (CLASSIFIER_QUERY_SOURCES.has(querySource)) return true;
  return false;
}
//@ chunk-vn3g7zt8.js:262809-262974 placement
function querySourceFlag(querySource) {
  let category = classifyQuerySource(querySource);
  if (querySource === undefined || category === undefined) return wigglyDoveFieldCodeNg();
  if (category === "main" || category === "subagent") return wigglyDoveFieldCodeKi();
  if (isClassifierQuerySource(querySource)) return wigglyDoveFieldCodeTn();
  if (SUMMARY_QUERY_SOURCES.has(querySource)) return wigglyDoveFieldCodeNy();
  return wigglyDoveFieldCodeNg();
}
//@ chunk-vn3g7zt8.js:262974-263466 placement
function getSandboxPosture(sessionFlagReaders, sessionFlags, cwd) {
  if (sessionFlagReaders === null) return null;
  let posture =
    sessionFlags === undefined || sessionFlags === "bypassPermissions" || (sessionFlags === "plan" && cwd);
  let egressRestricted = false;
  try {
    egressRestricted = sessionFlagReaders.areUnsandboxedCommandsAllowed() === false;
  } catch (error) {
    logError(error);
  }
  if (posture && !egressRestricted)
    return {
      toolSandboxActive: false,
      egressRestricted: false,
      hostAllowlistEnforced: false,
    };
  try {
    let restricted = sessionFlagReaders.isEgressRestricted();
    return {
      toolSandboxActive: sessionFlagReaders.isToolSandboxActive(),
      egressRestricted: restricted,
      hostAllowlistEnforced: restricted && sessionFlagReaders.isHostAllowlistEnforced(),
    };
  } catch (error) {
    logError(error);
    return {
      toolSandboxActive: false,
      egressRestricted: false,
      hostAllowlistEnforced: false,
    };
  }
}
//@ chunk-vn3g7zt8.js:263466-263588 placement
function runtimeEnvironmentFlag() {
  if (isAntBuild()) return wigglyDoveFieldCodeAx();
  if (env.KUBERNETES_SERVICE_HOST) return wigglyDoveFieldCodeMz();
  if (env.isCI || env.GITHUB_ACTIONS) return wigglyDoveFieldCodeIa();
  return;
}
//@ chunk-vn3g7zt8.js:263588-263802 placement
function repoSlugForHeader() {
  try {
    let cwdOrNull = getCwdOrNull();
    let gitRoot = cwdOrNull === null ? null : findGitRoot(cwdOrNull);
    let canonicalRoot = gitRoot === null ? null : findCanonicalGitRoot(gitRoot);
    let slug = canonicalRoot === null ? null : findRepoRemoteSlug(canonicalRoot);
    if (slug === null || !PRINTABLE_ASCII_RE.test(slug)) return;
    let sliced = slug.split(/[?#]/, 1)[0].slice(0, MAX_HEADER_VALUE_LENGTH - 2);
    return sliced === "" ? undefined : sliced;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-vn3g7zt8.js:263802-265013 placement
/**
 * 收集查询源、权限模式、bypass 可用性、沙箱姿态等，组成随请求发送的客户端上下文。
 */
async function buildRequestContextHeaders(
  querySource,
  permissionContext,
  toolNames,
  classifierJudgesServedCall = false,
) {
  let sessionFlags = getSessionFlags();
  let containerRuntime = await envDynamic();
  let header = permissionContext?.mode ?? sessionFlags?.currentPermissionMode ?? sessionFlags?.permissionMode;
  let value =
    permissionContext?.isBypassPermissionsModeAvailable ?? sessionFlags?.bypassPermissionsAvailable !== false;
  let entrypoint = getEntrypointOnRequests();
  let done = false;
  return {
    querySource,
    clientVersion: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    entrypoint:
      entrypoint !== undefined &&
      (isCcsTenant() || (isKnownEntrypoint(entrypoint) && entrypoint !== CLI_ENTRYPOINT))
        ? entrypoint
        : env.CLAUDE_CODE_ENTRYPOINT,
    claudeCodeServerTenant: false,
    ...false,
    permissionMode: header,
    bypassPermissionsAvailable: value,
    autoModeActive: isAutoModeActive(),
    ...{},
    classifierJudgesServedCall,
    computerUseActive: getComputerUseSession().binding !== undefined,
    containerRuntime,
    posture: getSandboxPosture(getSessionFlagReaders(), header, value),
    platform: "linux",
    hostEnvironment: runtimeEnvironmentFlag(),
    monorepoCheckout: false,
    gitOrigin: repoSlugForHeader(),
    githubHostedRunner: isEnvTruthy(env.GITHUB_ACTIONS) && env.RUNNER_ENVIRONMENT === "github-hosted",
    internetReachable: undefined,
    overrides: {
      extensions: [],
    },
  };
}
//@ chunk-vn3g7zt8.js:265013-265060 placement
var SAFE_HEADER_NAME_RE = /^[a-z][a-z0-9_]*$/;
var PRINTABLE_ASCII_RE = /^[\x20-\x7E]*$/;
//@ chunk-vn3g7zt8.js:265060-265246 placement (2.1.88 match: getCustomHeaders, 1)
function getCustomHeaders() {
  let customHeadersEnv = env.ANTHROPIC_CUSTOM_HEADERS;
  if (
    !getCustomHeaders_3(customHeadersEnv ?? "").some(
      ([name, value]) => isWigglyDoveHeader(name) && value !== "",
    )
  )
    return false;
  try {
    return customHeadersEnv?.trim() === effectiveEnvSnapshot().ANTHROPIC_CUSTOM_HEADERS?.trim();
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-vn3g7zt8.js:265246-265312 placement
function isWigglyDoveHeaderEnabled() {
  if (!isFirstPartyApiBackend()) return false;
  if (!getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WIGGLY_DOVE, false)) return false;
  return isFirstPartyBaseUrlSafe();
}
//@ chunk-vn3g7zt8.js:265312-265384 placement
function isFirstPartyBaseUrlSafe() {
  if (assumesFirstPartyBaseUrl()) return true;
  try {
    return isFirstPartyBaseUrl();
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-vn3g7zt8.js:265384-265418 placement
/**
 * 导出函数 `canSendWigglyDoveHeader`：返回 eh() && !getCustomHeaders()。
 */
function canSendWigglyDoveHeader() {
  return isWigglyDoveHeaderEnabled() && !getCustomHeaders();
}
//@ chunk-vn3g7zt8.js:265418-265463 placement
function headerNameOrRedacted(name) {
  return SAFE_HEADER_NAME_RE.test(name) ? sfToken(name) : sfString(name);
}
//@ chunk-vn3g7zt8.js:265463-265726 placement
function autoModeFlags(headers) {
  if (headers.classifierJudgesServedCall === true)
    return [
      {
        key: wigglyDoveFieldCodeTt(),
        value: sfInnerList([sfToken(senderAddressHeaderValue(headers))]),
      },
    ];
  let permissionMode = headers.permissionMode;
  if (permissionMode === undefined) return [];
  let flags =
    permissionMode === "auto" ||
    (permissionMode === "plan" && headers.autoModeActive && !headers.bypassPermissionsAvailable);
  return [
    {
      key: wigglyDoveFieldCodeTt(),
      value: sfInnerList(flags ? [sfToken(senderAddressHeaderValue(headers))] : []),
    },
  ];
}
//@ chunk-vn3g7zt8.js:265726-266477 placement
function encodeEnvironmentFlags(flags) {
  let { overrides } = flags;
  let pairs = [];
  let current;
  let previous;
  if (false);
  else if (flags.containerRuntime !== undefined)
    pairs.push({
      key: wigglyDoveFieldCodeBf(),
      value: sfToken(containerRuntimeLabel(flags.containerRuntime)),
    });
  else if (flags.githubHostedRunner)
    pairs.push({
      key: wigglyDoveFieldCodeBf(),
      value: sfToken(wigglyDoveFieldCodeOh()),
    });
  else if (flags.posture === null)
    pairs.push({
      key: wigglyDoveFieldCodeBf(),
      value: sfToken(wigglyDoveFieldCodeOz()),
    });
  else if (flags.posture.toolSandboxActive)
    switch (flags.platform) {
      case "linux":
        pairs.push({
          key: wigglyDoveFieldCodeBf(),
          value: sfToken(wigglyDoveFieldCodeFy()),
        });
        break;
      case "darwin":
        pairs.push({
          key: wigglyDoveFieldCodeBf(),
          value: sfToken(wigglyDoveFieldCodeRl()),
        });
        previous = wigglyDoveFieldCodeYb();
        break;
      default:
        pairs.push({
          key: wigglyDoveFieldCodeBf(),
          value: sfToken(wigglyDoveFieldCodeRl()),
        });
        previous = flags.platform === "win32" ? wigglyDoveFieldCodeNv() : wigglyDoveFieldCodeZb();
        break;
    }
  else {
    pairs.push({
      key: wigglyDoveFieldCodeBf(),
      value: sfToken(wigglyDoveFieldCodeVt()),
    });
    current = flags.hostEnvironment ?? wigglyDoveFieldCodeFs();
    if (flags.hostEnvironment === undefined)
      previous = flags.platform === "linux" ? wigglyDoveFieldCodePh() : wigglyDoveFieldCodeZb();
  }
  let newFlag = current;
  if (newFlag !== undefined)
    pairs.push({
      key: wigglyDoveFieldCodeVd(),
      value: sfToken(newFlag),
    });
  let oldFlag = previous;
  if (oldFlag !== undefined)
    pairs.push({
      key: wigglyDoveFieldCodeXf(),
      value: sfString(oldFlag),
    });
  return pairs;
}
//@ chunk-vn3g7zt8.js:266477-266526 placement
function containerRuntimeLabel(containerRuntime) {
  return containerRuntime === "bubblewrap" ? wigglyDoveFieldCodeFy() : wigglyDoveFieldCodeZr();
}
//@ chunk-vn3g7zt8.js:266526-266757 placement
function egressPostureFlags(headers) {
  if (headers.posture === null)
    return [
      {
        key: wigglyDoveFieldCodeZx(),
        value: sfToken(wigglyDoveFieldCodeIi()),
      },
    ];
  if (!headers.posture.egressRestricted)
    return [
      {
        key: wigglyDoveFieldCodeZx(),
        value: sfToken(wigglyDoveFieldCodeFz()),
      },
    ];
  return [
    {
      key: wigglyDoveFieldCodeZx(),
      value: sfToken(
        headers.posture.hostAllowlistEnforced ? wigglyDoveFieldCodeVy() : wigglyDoveFieldCodeBm(),
      ),
    },
    {
      key: wigglyDoveFieldCodeZi(),
      value: sfToken(wigglyDoveFieldCodeKb()),
    },
  ];
}
//@ chunk-vn3g7zt8.js:266757-266779 placement
function noopSenderHeader(headers) {
  return;
}
//@ chunk-vn3g7zt8.js:266779-267261 placement
var ENTRYPOINT_CODES = {
  cli: wigglyDoveFieldCodeWb,
  mcp: wigglyDoveFieldCodeSw,
  "sdk-cli": wigglyDoveFieldCodeWj,
  "sdk-ts": wigglyDoveFieldCodeXu,
  "sdk-py": wigglyDoveFieldCodeUm,
  bench: wigglyDoveFieldCodeSa,
  "claude-vscode": wigglyDoveFieldCodeSu,
  "claude-code-github-action": wigglyDoveFieldCodeHo,
  "local-agent": wigglyDoveFieldCodeZg,
  local_agent: wigglyDoveFieldCodeXb,
  "claude-desktop": wigglyDoveFieldCodeKh,
  remote: wigglyDoveFieldCodeZl,
  remote_baku: wigglyDoveFieldCodeXs,
  remote_cowork: wigglyDoveFieldCodeYm,
  remote_trigger: wigglyDoveFieldCodeNp,
  remote_cowork_trigger: wigglyDoveFieldCodeOm,
  remote_desktop: wigglyDoveFieldCodePf,
  remote_mobile: wigglyDoveFieldCodeBt,
  remote_projects: wigglyDoveFieldCodeVo,
  claude_in_slack: wigglyDoveFieldCodeIy,
  "claude-in-slack": wigglyDoveFieldCodeZz,
  "claude-in-teams": wigglyDoveFieldCodeBo,
  "claude-desktop-3p": wigglyDoveFieldCodeQl,
  "claude-security": wigglyDoveFieldCodeMb,
  "ssh-remote": wigglyDoveFieldCodePd,
  "claude-coworker": wigglyDoveFieldCodeBq,
  "claude-coworker-terminal": wigglyDoveFieldCodeTg,
};
//@ chunk-vn3g7zt8.js:267261-267303 placement
function isKnownEntrypoint(entrypoint) {
  return Object.hasOwn(ENTRYPOINT_CODES, entrypoint);
}
//@ chunk-vn3g7zt8.js:267303-267344 placement
function entrypointCodeValue(entrypoint) {
  return isKnownEntrypoint(entrypoint) ? ENTRYPOINT_CODES[entrypoint]() : wigglyDoveFieldCodeVr();
}
//@ chunk-vn3g7zt8.js:267344-268296 placement
function encodeClientIdentityFlags(headers) {
  let { overrides } = headers;
  let out =
    !headers.claudeCodeServerTenant && (headers.entrypoint === "sdk-ts" || headers.entrypoint === "sdk-py");
  let parts = [
    {
      key: wigglyDoveFieldCodeV(),
      value: isTextField(1),
    },
    {
      key: wigglyDoveFieldCodeYw(),
      value: sfToken(wigglyDoveFieldCodeJm()),
    },
  ];
  let header = undefined;
  let tenant = headers.claudeCodeServerTenant
    ? wigglyDoveFieldCodeYi()
    : (header ?? (out ? undefined : wigglyDoveFieldCodeWm()));
  if (tenant !== undefined)
    parts.push({
      key: wigglyDoveFieldCodeHg(),
      value: headerNameOrRedacted(tenant),
    });
  parts.push(
    {
      key: wigglyDoveFieldCodeYl(),
      value: sfToken(out ? wigglyDoveFieldCodeBx() : wigglyDoveFieldCodeQi()),
    },
    {
      key: wigglyDoveFieldCodeOb(),
      value: sfString(headers.clientVersion),
    },
  );
  if (headers.entrypoint !== undefined && headers.entrypoint !== "") {
    let entrypoint = entrypointCodeValue(headers.entrypoint);
    if (entrypoint !== undefined)
      parts.push({
        key: wigglyDoveFieldCodeSk(),
        value: sfString(entrypoint),
      });
  }
  let value = undefined;
  if (value !== undefined)
    parts.push({
      key: wigglyDoveFieldCodeRf(),
      value: sfString(value),
    });
  parts.push({
    key: wigglyDoveFieldCodeWl(),
    value: sfToken(querySourceFlag(headers.querySource)),
  });
  parts.push(...autoModeFlags(headers));
  let sender = noopSenderHeader(headers);
  parts.push(...(sender?.members ?? [...encodeEnvironmentFlags(headers), ...egressPostureFlags(headers)]));
  if (headers.computerUseActive)
    parts.push(
      {
        key: wigglyDoveFieldCodeFu(),
        value: sfBoolean(true),
      },
      {
        key: wigglyDoveFieldCodeRt(),
        value: sfToken(headers.hostEnvironment ?? wigglyDoveFieldCodeFs()),
      },
    );
  let headerOut = [];
  if (headers.monorepoCheckout) headerOut.push(sfToken(wigglyDoveFieldCodeVb()));
  if (headers.internetReachable === true) headerOut.push(sfToken(wigglyDoveFieldCodeMa()));
  if (headerOut.length > 0)
    parts.push({
      key: wigglyDoveFieldCodeMo(),
      value: sfInnerList(headerOut),
    });
  if (headers.gitOrigin !== undefined)
    parts.push({
      key: wigglyDoveFieldCodeJy(),
      value: sfString(headers.gitOrigin),
    });
  return parts;
}
//@ chunk-vn3g7zt8.js:268296-268384 placement
function serializeHeadersSfDictionary(headers) {
  return serializeSfDictionary(headers, {
    maxMembers: MAX_HEADER_DICT_MEMBERS,
    maxKeyLength: MAX_HEADER_KEY_LENGTH,
    maxValueLength: MAX_HEADER_VALUE_LENGTH,
    onDrop: noteHeaderMemberDropped,
  });
}
//@ chunk-vn3g7zt8.js:268384-268544 placement
function noteHeaderMemberDropped(name, value) {
  let headerMemberDropsNoted = streamFallbackWarning().headerMemberDropsNoted;
  if (headerMemberDropsNoted.has(name)) return;
  headerMemberDropsNoted.add(name);
  logForDebugging(`${wigglyDoveHeaderName()}: dropped ${name} (${value}); the rest of the header is sent`, {
    level: "warn",
  });
}
//@ chunk-vn3g7zt8.js:268544-268725 placement (2.1.88 match: getCustomHeaders, 1)
function getCustomHeaders_2() {
  let customHeaders = {};
  let headerName = wigglyDoveHeaderName();
  for (let line of (env.ANTHROPIC_CUSTOM_HEADERS ?? "").split(/\n|\r\n/)) {
    let colonIdx = line.indexOf(":");
    let headerLine = colonIdx >= 0 ? line.slice(0, colonIdx).trim() : "";
    if (headerLine !== headerName && isWigglyDoveHeader(headerLine)) customHeaders[headerLine] = undefined;
  }
  return customHeaders;
}
//@ chunk-vn3g7zt8.js:268725-268896 placement
async function buildClientIdentityHeader({
  querySource,
  permissionContext,
  toolNames,
  classifierJudgesServedCall,
}) {
  if (!isWigglyDoveHeaderEnabled()) return;
  try {
    return serializeHeadersSfDictionary(
      encodeClientIdentityFlags(
        await buildRequestContextHeaders(
          querySource,
          permissionContext,
          toolNames,
          classifierJudgesServedCall,
        ),
      ),
    );
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-vn3g7zt8.js:268896-269162 placement
function identityHeaders(permissionContextHeaderValue, headers) {
  if (permissionContextHeaderValue === undefined) return {};
  let out = {};
  for (let key of Object.keys(headers)) if (isWigglyDoveHeader(key)) out[key] = undefined;
  if (getCustomHeaders()) {
    for (let [name, value] of getCustomHeaders_3(env.ANTHROPIC_CUSTOM_HEADERS ?? ""))
      if (isWigglyDoveHeader(name)) out[name] = value;
    return out;
  }
  if (streamFallbackWarning().once("own_header_logged"))
    logForDebugging(`${wigglyDoveHeaderName()}: ${permissionContextHeaderValue}`);
  return {
    ...out,
    ...getCustomHeaders_2(),
    [wigglyDoveHeaderName()]: permissionContextHeaderValue,
  };
}
//@ chunk-vn3g7zt8.js:269190-269381 placement
var SENDER_ADDR_PATH = "/worker/sender_addr";
var SENDER_ADDR_WAIT_MS = 500;
var SENDER_ADDR_TTL_MS = 45000;
var TENGU_JAUNTY_PIKE = "tengu_jaunty_pike";
var TENGU_SUNNY_GARDEN = "tengu_sunny_garden";
var TENGU_GLISTENING_WILLOW = "tengu_glistening_willow";
var SENDER_ADDR_RETRIES = 3;
var X_SSR_CLIENT_IP = "x-ssr-client-ip";
var X_SSR_CLIENT_IP_SIG = "x-ssr-client-ip-sig";
var ANT_IPCOUNTRY = "ant-ipcountry";
//@ chunk-vn3g7zt8.js:269381-269626 layout
function senderAddressKeyFor(messages, promptId, querySource) {
  if (!isCcsTenant() || getCcrDerivedSurface() === "remote_projects") return;
  try {
    if (
      isMemoryOperationQuerySource(querySource) &&
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GLISTENING_WILLOW, false)
    )
      return;
  } catch (error) {
    logError(error);
  }
  let eventKey = turnAttributionKeyFor(messages);
  let runId = promptId ?? getPromptId() ?? undefined;
  let { carriedOn } = streamFallbackWarning().ccsSenderAddr;
  return eventKey !== undefined && runId !== undefined
    ? {
        event: carriedOn?.key === eventKey ? carriedOn.answer : eventKey,
        run: runId,
      }
    : undefined;
}
//@ chunk-vn3g7zt8.js:269626-269749 layout
function noteCarriedSenderAddress(answerEventUuid) {
  try {
    let contextKey = getContextKey();
    streamFallbackWarning().ccsSenderAddr.carriedOn =
      contextKey !== undefined && answerEventUuid !== undefined
        ? {
            key: contextKey,
            answer: answerEventUuid,
          }
        : undefined;
  } catch (error) {
    logError(error);
  }
}
//@ chunk-vn3g7zt8.js:269749-270079 placement
async function attachSenderAddress(headers, sender) {
  try {
    headers.delete(ANT_IPCOUNTRY);
    let startTime = performance.now();
    let address = await withDeadline(fetchCcrSenderAddress(sender, false), SENDER_ADDR_WAIT_MS);
    let { waits, turnStartedAt } = streamFallbackWarning().ccsSenderAddr;
    if (startTime >= turnStartedAt) waits.firstMs ??= performance.now() - startTime;
    waits.unsignedCalls += address ? 0 : 1;
    if (address) {
      headers.set(X_SSR_CLIENT_IP, address.ip);
      headers.set(X_SSR_CLIENT_IP_SIG, address.sig);
      if (address.country !== undefined) headers.set(ANT_IPCOUNTRY, address.country);
    }
  } catch (error) {
    headers.delete(X_SSR_CLIENT_IP);
    headers.delete(X_SSR_CLIENT_IP_SIG);
    headers.delete(ANT_IPCOUNTRY);
    logError(error);
  }
}
//@ chunk-vn3g7zt8.js:270079-271052 layout
async function fetchCcrSenderAddress(key, mayBeTooSoon) {
  let { asking, held } = streamFallbackWarning().ccsSenderAddr;
  let cacheKey = `${key.event}|${key.run}`;
  let heldEntry = held.get(cacheKey);
  if (heldEntry !== undefined && Date.now() - heldEntry.at < SENDER_ADDR_TTL_MS) return heldEntry.pair;
  let inFlight = asking.get(cacheKey);
  if (inFlight === undefined) {
    let wasOk = true;
    let uRLSearchParams = new URLSearchParams({
      event: key.event,
      run: key.run,
    });
    let timeoutSignal = AbortSignal.timeout(SENDER_ADDR_WAIT_MS);
    inFlight = {
      answer: apiClient
        .get(`${SENDER_ADDR_PATH}?${uRLSearchParams}`, {
          host: "ccr-session",
          auth: "session-jwt",
          signal: timeoutSignal,
        })
        .then((response) => {
          wasOk = response.ok;
          let data = response.ok && response.status === 200 ? response.data : undefined;
          let ip = data?.[X_SSR_CLIENT_IP];
          let sig = data?.[X_SSR_CLIENT_IP_SIG];
          let country = data?.[ANT_IPCOUNTRY];
          return typeof ip === "string" &&
            ip.length <= 45 &&
            isIP(ip) !== 0 &&
            typeof sig === "string" &&
            /^[\x21-\x7e]{1,256}$/.test(sig)
            ? {
                ip,
                sig,
                country: typeof country === "string" && /^[A-Z0-9]{2}$/.test(country) ? country : undefined,
              }
            : undefined;
        })
        .catch((error) => {
          logForDebugging(
            `No sender address from CCR: ${timeoutSignal.aborted ? `no answer in ${SENDER_ADDR_WAIT_MS} ms` : errorMessage(error)}`,
          );
          return;
        })
        .finally(() => {
          asking.delete(cacheKey);
          streamFallbackWarning().ccsSenderAddr.waits.asks += wasOk ? 1 : 0;
        }),
      mayBeTooSoon,
    };
    asking.set(cacheKey, inFlight);
  }
  let answer = await inFlight.answer;
  if (answer === undefined && inFlight.mayBeTooSoon)
    return mayBeTooSoon ? undefined : fetchCcrSenderAddress(key, false);
  let now = Date.now();
  for (let [heldKey, heldValue] of held) if (now - heldValue.at >= SENDER_ADDR_TTL_MS) held.delete(heldKey);
  held.set(cacheKey, {
    pair: answer,
    at: now,
  });
  return answer;
}
//@ chunk-vn3g7zt8.js:271052-271247 placement
async function prefetchCcrSenderAddress(key, force = false) {
  try {
    let { asking } = streamFallbackWarning().ccsSenderAddr;
    let compositeKey = `${key.event}|${key.run}`;
    let pending = asking.get(compositeKey);
    fetchCcrSenderAddress(key, force).catch(logError);
    if (
      asking.get(compositeKey) !== pending &&
      (force || getFeatureValue_CACHED_MAY_BE_STALE(TENGU_JAUNTY_PIKE, false))
    )
      for (let j = 0; j < SENDER_ADDR_RETRIES; j++) await yieldToEventLoop();
  } catch (error) {
    logSenderAddressFailure(error);
  }
}
//@ chunk-vn3g7zt8.js:271247-271371 placement
function logSenderAddressFailure(error) {
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `the early ask for a sender's address threw: ${errorMessage(error)}`,
      "the early ask for a sender's address threw",
    ),
  );
}
//@ chunk-vn3g7zt8.js:271371-271450 placement
/**
 * 导出函数 `isSunnyGardenSenderAddress`：返回 ( isCcsTenant() && isFirstPartyApiBackend() && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SUNNY_GARDEN, !1) ); …。
 */
function isSunnyGardenSenderAddress() {
  try {
    return (
      isCcsTenant() &&
      isFirstPartyApiBackend() &&
      isClaudeAiChatOrigin() &&
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SUNNY_GARDEN, false)
    );
  } catch (error) {
    logSenderAddressFailure(error);
    return false;
  }
}
//@ chunk-vn3g7zt8.js:271450-271567 layout
async function prefetchSenderAddress(promptId) {
  try {
    let key = promptId === undefined ? undefined : senderAddressKeyFor(undefined, promptId, undefined);
    if (key !== undefined) await prefetchCcrSenderAddress(key, true);
  } catch (error) {
    logSenderAddressFailure(error);
  }
}
//@ chunk-vn3g7zt8.js:271567-271609 layout
var TENGU_FUZZY_SPINDLE = "tengu_fuzzy_spindle";
var MAX_STREAM_TIMER_SLACK_MS = 1000;
var SUSPENSION_SLACK_MS = 5;
//@ chunk-vn3g7zt8.js:271609-271771 layout
function streamTimerSlackMs() {
  try {
    let configuredSlackMs =
      env.CLAUDE_CODE_STREAM_TIMER_SLACK_MS ?? getFeatureValue_CACHED_MAY_BE_STALE(TENGU_FUZZY_SPINDLE, 0);
    return typeof configuredSlackMs === "number" &&
      Number.isInteger(configuredSlackMs) &&
      configuredSlackMs >= 0 &&
      configuredSlackMs <= MAX_STREAM_TIMER_SLACK_MS
      ? configuredSlackMs
      : 0;
  } catch (error) {
    logError(toError(error));
    return 0;
  }
}
//@ chunk-vn3g7zt8.js:271771-271824 layout
function clipSlackMs(configuredMs, candidateMs) {
  return configuredMs > 0 && candidateMs > 0
    ? Math.min(configuredMs, MAX_STREAM_TIMER_SLACK_MS, candidateMs)
    : 0;
}
//@ chunk-vn3g7zt8.js:271824-271882 layout
function byteWatchdogSlackMs(
  configuredMs,
  streamIdleTimeoutMs,
  byteIdleTimeoutForProvider,
  streamIdleTimeoutMsParam,
) {
  return streamIdleTimeoutMsParam ||
    !(byteIdleTimeoutForProvider + MAX_STREAM_TIMER_SLACK_MS <= streamIdleTimeoutMs)
    ? 0
    : clipSlackMs(configuredMs, streamIdleTimeoutMs / 100);
}
//@ chunk-vn3g7zt8.js:271882-271985 layout
function slackStillFresh(clock, lastMonotonicMs, lastWallMs, slackMs) {
  if (!(slackMs > 0)) return false;
  let monotonicElapsedMs = clock.monotonicNow() - lastMonotonicMs;
  let wallElapsedMs = clock.now() - lastWallMs;
  return (
    monotonicElapsedMs < slackMs &&
    wallElapsedMs < slackMs &&
    wallElapsedMs >= monotonicElapsedMs - SUSPENSION_SLACK_MS
  );
}
//@ chunk-vn3g7zt8.js:271985-272063 placement
function baseRequestHeaders() {
  return {
    "x-app": isBgSession() ? "cli-bg" : "cli",
    "User-Agent": getUserAgent(),
    [X_CLAUDE_CODE_SESSION_ID]: getSessionId(),
  };
}
//@ chunk-vn3g7zt8.js:272063-272146 placement
function getForwardableEnvHeaders() {
  let names = new Set(customHeaderNames());
  return import_reject(
    baseRequestHeaders(),
    (name, value) => names.has(value) || checkValueChars(name) !== null,
  );
}
export {
  classifyQuerySource,
  querySourceFamily,
  normalizeAgentQuerySource,
  isAutoModeQuerySource,
  InvalidRequestHeaderValueError,
  clipSlackMs,
  slackStillFresh,
  senderAddressKeyFor,
  prefetchCcrSenderAddress,
  canSendWigglyDoveHeader,
  ARTIFACT_OUTPUT_SOURCE_QUERIES,
  isMainOrAgentQuerySource,
  streamTimerSlackMs,
  byteWatchdogSlackMs,
  noteCarriedSenderAddress,
  isSunnyGardenSenderAddress,
  prefetchSenderAddress,
  isKnownContentBlockType,
  getForwardableEnvHeaders,
  X_CLAUDE_CODE_SESSION_ID,
  allowlistedBlockType,
  isMainQuerySource,
  prefetchSenderAddressFor,
  requestLaneFor,
  agentKindFor,
  isRetryOn529Source,
  buildClientIdentityHeader,
  baseRequestHeaders,
  X_CLAUDE_REMOTE_SESSION_ORIGIN,
  X_CLAUDE_CODE_REQUEST_CLASS,
  X_CLAUDE_CODE_AGENT_TYPE,
  X_CLAUDE_CODE_PROMPT_ID,
  identityHeaders,
  validateAuthHeaders,
  X_COWORK_ENROLLMENT,
  attachSenderAddress,
  redactUnknownBlockType,
  REQUEST_CLASSES,
};
