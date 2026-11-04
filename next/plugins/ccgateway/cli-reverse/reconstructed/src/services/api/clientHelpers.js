/**
 * services/api/clientHelpers.ts
 *
 * 2.1.316 新增：API 客户端辅助：GCP 路径校验、工具使用头编码、已知无效请求模式
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hwmsct5x.js (24)
 * attribution: placement 24
 */
import { StreamNoResponseError } from "./streamErrors.js";
import { withoutSensitiveHeaders } from "../../utils/anthropicHosts.js";
import { requestMethodAndUrl, testGuardedFetch } from "../../utils/testNetworkGuard.js";
import { getTLSFetchOptions } from "../../utils/mtls.js";
import { createTlsSessionFetch } from "../../upstreamproxy/proxyFetch.js";
import { identity } from "../../utils/identity.js";
import { env } from "../../utils/env.js";
import { isRemoteCowork } from "../../utils/entrypointKinds.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { spawnTimestampMs } from "../../utils/startupMarks.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { normalizeRequestId } from "../requestUserDialog.js";
import { stripAnyVersatileSuffix } from "../../utils/model/modelIds.js";
import { SAFE_FOUNDRY_KEY_RE } from "./foundryCapabilities.js";
import { UNREADABLE_TOOLS_USED_BEFORE_SUMMARY } from "../../bootstrap/stateSlices.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { isSillyShoreGateOn } from "../../utils/messages/untrustedArtifactContent.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { TODO_WRITE_TOOL_NAME } from "../../tools/TodoWriteTool/constants.js";
import { AGENT, TASK } from "../../tools/AgentTool/constants.js";
import { TOOL_SEARCH_TOOL_NAME } from "../../tools/ToolSearchTool/prompt.js";
import { ENTER_PLAN_MODE_TOOL_NAME } from "../../tools/EnterPlanModeTool/constants.js";
import { EXITPLANMODE } from "../../tools/ExitPlanModeTool/constants.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { jsonStringifyRaw } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hwmsct5x.js:246577-246643 placement
function isAbortedWithoutStreamError(signal) {
  return signal?.aborted === true && !(signal.reason instanceof StreamNoResponseError);
}
//@ chunk-hwmsct5x.js:246643-246799 placement
function modelApiFetch(input, init) {
  let url = withoutSensitiveHeaders(
    requestMethodAndUrl(input, init).url,
    init?.headers ?? (input instanceof Request ? input.headers : undefined),
  );
  let fetchInit = init?.tls
    ? {
        ...init,
        ...getTLSFetchOptions(url),
      }
    : init;
  return testGuardedFetch(input, fetchInit, createTlsSessionFetch("modelApi", fetchInit, url));
}
//@ chunk-hwmsct5x.js:246799-246935 placement
var FULL_CHECK_INTERVAL_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WORKER_START;
var authCacheClockState;
deferInit("chunk-hwmsct5x.js:246799", () => {
  FULL_CHECK_INTERVAL_MS = 120000;
  WORKER_START = "worker_start";
  authCacheClockState = identity(
    {
      lastFullCheck: WORKER_START,
      lifetimeSource: "process",
    },
    (state) => {
      state.lastFullCheck = WORKER_START;
      state.lifetimeSource = "process";
    },
  );
});
//@ chunk-hwmsct5x.js:246935-247061 placement
function getTenantLifetimeMs() {
  let lifetimeSource = authCacheClockState.lifetimeSource;
  if (lifetimeSource !== "process") return lifetimeSource.tenantLifetimeMs;
  return env.CLAUDE_CODE_REMOTE && isRemoteCowork() ? FULL_CHECK_INTERVAL_MS : undefined;
}
//@ chunk-hwmsct5x.js:247061-247119 placement
function msSinceLastFullCheck(nowMs) {
  let elapsedSinceFullCheck = getElapsedSinceFullCheck(nowMs);
  return elapsedSinceFullCheck === undefined ? undefined : nowMs - elapsedSinceFullCheck;
}
//@ chunk-hwmsct5x.js:247119-247131 placement
var AUTH_CACHE_FRESH_MS = 5000;
//@ chunk-hwmsct5x.js:247131-247306 placement
function getElapsedSinceFullCheck(nowMs) {
  let lastFullCheck = authCacheClockState.lastFullCheck;
  if (lastFullCheck === "worker_start")
    lastFullCheck = isRemoteManagedEnvironment() ? spawnTimestampMs() : undefined;
  if (lastFullCheck === undefined) return;
  if (lastFullCheck > nowMs)
    return authCacheClockState.lifetimeSource !== "process" && lastFullCheck - nowMs <= AUTH_CACHE_FRESH_MS
      ? 0
      : undefined;
  return nowMs - lastFullCheck;
}
//@ chunk-hwmsct5x.js:247306-247376 placement
function noteFullCheckAt(nowMs, tenantLifetimeMs) {
  let elapsedSinceFullCheck = getElapsedSinceFullCheck(nowMs);
  if (elapsedSinceFullCheck === undefined || elapsedSinceFullCheck >= tenantLifetimeMs)
    authCacheClockState.lastFullCheck = nowMs;
}
//@ chunk-hwmsct5x.js:247376-247442 placement
function advanceFullCheckMark(sentAt, answeredAt) {
  if (authCacheClockState.lastFullCheck === sentAt && answeredAt > sentAt)
    authCacheClockState.lastFullCheck = answeredAt;
}
//@ chunk-hwmsct5x.js:247442-247506 placement
function clearFullCheckMarkIf(sentAt) {
  if (authCacheClockState.lastFullCheck === sentAt) authCacheClockState.lastFullCheck = undefined;
}
//@ chunk-hwmsct5x.js:247506-247680 placement
function noteModelRequestSent(nowMs) {
  try {
    let tenantLifetimeMs = getTenantLifetimeMs();
    if (tenantLifetimeMs !== undefined) noteFullCheckAt(nowMs, tenantLifetimeMs);
  } catch (error) {
    logForDebugging(
      `[authCacheClock] could not note when a model request was sent; the request itself is unaffected: ${errorMessage(error)}`,
    );
  }
}
//@ chunk-hwmsct5x.js:247680-247719 placement
function resetFullCheckMark() {
  authCacheClockState.lastFullCheck = undefined;
}
//@ chunk-hwmsct5x.js:247719-247929 placement
var WORKSPACE_UNSUPPORTED_PATTERN = /([a-z0-9_, ]+?)\s+not supported in your workspace/i;
var FOUNDRY_UNSUPPORTED_PATTERN =
  /features are not available for Azure AI Foundry workspaces?:\s*([a-z0-9_, ]+)/i;
var WEB_SEARCH_UNAVAILABLE_PATTERN = /server-side web search is not available in this environment/i;
//@ chunk-hwmsct5x.js:247929-248067 placement
function getFoundryBaseUrl() {
  let resource = normalizeRequestId(env.ANTHROPIC_FOUNDRY_RESOURCE);
  return (
    env.ANTHROPIC_FOUNDRY_BASE_URL || (resource ? `https://${resource}.services.ai.azure.com` : undefined)
  );
}
//@ chunk-hwmsct5x.js:248067-248144 placement
function foundryModelKey(model) {
  let stripped = stripAnyVersatileSuffix(model);
  return `${getFoundryBaseUrl() ?? "unknown-foundry-resource"}::${stripped}`;
}
//@ chunk-hwmsct5x.js:248144-248171 placement
var TOOL_NAME_TOKEN_REGEX = /^[a-z][a-z0-9_]*$/;
//@ chunk-hwmsct5x.js:248171-248450 placement (2.1.88 match: makeToolSchema, 0.356)
/**
 * 从自然语言文本里解析出工具名列表（两种正则格式，否则命中关键词时返回 ["web_search"]）。与 WebSearch 工具本身无直接关系。
 */
function makeToolSchema(input) {
  let names = input.match(WORKSPACE_UNSUPPORTED_PATTERN)?.[1];
  if (names) {
    let mapped = names.split(",").map((token) => token.trim());
    if (mapped.every((token) => TOOL_NAME_TOKEN_REGEX.test(token))) return mapped;
  }
  let tokenNames = input.match(FOUNDRY_UNSUPPORTED_PATTERN)?.[1];
  if (tokenNames) {
    let filtered = tokenNames
      .split(/[,\s]+/)
      .filter((token) => token !== "and" && TOOL_NAME_TOKEN_REGEX.test(token));
    return filtered.length > 0 ? filtered : null;
  }
  if (WEB_SEARCH_UNAVAILABLE_PATTERN.test(input)) return ["web_search"];
  return null;
}
//@ chunk-hwmsct5x.js:249957-250329 placement
/**
 * 校验插入 claude.googleapis.com 请求路径的 GCP 项目/位置等环境变量只含字母数字连字符下划线。
 */
function assertGcpPathSegment(varName, value) {
  if (!value) return;
  if (!SAFE_FOUNDRY_KEY_RE.test(value))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${varName} may only contain letters, digits, hyphens, and underscores \u2014 ` +
        "it is interpolated into the claude.googleapis.com request path, so URL metacharacters in its value would rewrite the project/workspace the request targets. Unset it or correct its value.",
      "GCP path-segment env var failed the charset gate",
    );
}
//@ chunk-hwmsct5x.js:250329-250395 placement
/**
 * x-claude-code-sandy-plover 请求头（本轮用过的工具名列表）的编码限额：最多 64 项、总长 7168 字节、单项 256 字节。
 */
var SANDY_PLOVER_HEADER; // deferred: uses TOOL_NAME_PATTERN (../../bootstrap/stateSlices.js) of its import cycle while loading; runs once the cycle is complete
var MAX_TOOL_NAME_LIST_COUNT;
var MAX_TOOL_NAME_HEADER_BYTES;
var MAX_TOOL_NAME_BYTES;
var UNREADABLE_TOOLS_BEFORE_SUMMARY;
deferInit("chunk-hwmsct5x.js:250329", () => {
  SANDY_PLOVER_HEADER = "x-claude-code-sandy-plover";
  MAX_TOOL_NAME_LIST_COUNT = 64;
  MAX_TOOL_NAME_HEADER_BYTES = 7168;
  MAX_TOOL_NAME_BYTES = 256;
  UNREADABLE_TOOLS_BEFORE_SUMMARY = UNREADABLE_TOOLS_USED_BEFORE_SUMMARY;
});
//@ chunk-hwmsct5x.js:250395-250448 placement
function isSnugMittenAndSillyShoreOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_snug_mitten", false) && isSillyShoreGateOn();
}
//@ chunk-hwmsct5x.js:250448-250505 placement
/**
 * 内置工具名集合：编码请求头时把内置工具排在自定义工具之后。
 */
var BUILTIN_TOOL_NAMES; // deferred: uses GREP_TOOL_NAME (../../tools/GrepTool/prompt.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-hwmsct5x.js:250448", () => {
  BUILTIN_TOOL_NAMES = new Set([
    BASH_TOOL_NAME,
    FILE_READ_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
    GLOB_TOOL_NAME,
    GREP_TOOL_NAME,
    NOTEBOOK_EDIT_TOOL_NAME,
    TODO_WRITE_TOOL_NAME,
    AGENT,
    TASK,
    TOOL_SEARCH_TOOL_NAME,
    ENTER_PLAN_MODE_TOOL_NAME,
    EXITPLANMODE,
  ]);
});
//@ chunk-hwmsct5x.js:250505-250825 placement
/**
 * 把本轮用到的工具名编码成受长度上限约束的请求头值（超限时截断并加省略标记）。
 */
function encodeToolsUsedHeader(names) {
  let filtered = names.filter(
    (name) => name !== "" && Buffer.byteLength(name, "utf8") <= MAX_TOOL_NAME_BYTES,
  );
  let names_2 = [
    ...filtered.filter((name) => !BUILTIN_TOOL_NAMES.has(name)),
    ...filtered.filter((name) => BUILTIN_TOOL_NAMES.has(name)),
  ];
  let encoded = encodeToolNameList(names_2);
  if (encoded.length < names.length) {
    encoded = encodeToolNameList([UNREADABLE_TOOLS_BEFORE_SUMMARY, ...names_2]);
    return {
      value: `[${encoded.join(",")}]`,
      sent: encoded.length - 1,
      dropped: names.length - (encoded.length - 1),
    };
  }
  return {
    value: `[${encoded.join(",")}]`,
    sent: encoded.length,
    dropped: 0,
  };
}
//@ chunk-hwmsct5x.js:250825-251008 placement
function toolsUsedHeaderBuilder(conversationToolsUsed) {
  return conversationToolsUsed.built((names) => {
    let result = encodeToolsUsedHeader(names);
    if (result.dropped > 0 && conversationToolsUsed.reportTruncationOnce())
      logFeatureSad("api_tools_used_header", "incomplete_list", {
        sent: result.sent,
        dropped: result.dropped,
      });
    return result.value;
  });
}
//@ chunk-hwmsct5x.js:251008-251250 placement
function encodeToolNameList(names) {
  let out = [];
  let bytes = 2;
  for (let name of names) {
    if (out.length === MAX_TOOL_NAME_LIST_COUNT) break;
    let replaced = jsonStringifyRaw({
      name,
    }).replace(/[\u007f-\uffff]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`);
    let addedBytes = replaced.length + (out.length === 0 ? 0 : 1);
    if (bytes + addedBytes > MAX_TOOL_NAME_HEADER_BYTES) break;
    out.push(replaced);
    bytes += addedBytes;
  }
  return out;
}
export {
  assertGcpPathSegment,
  getFoundryBaseUrl,
  isSnugMittenAndSillyShoreOn,
  SANDY_PLOVER_HEADER,
  toolsUsedHeaderBuilder,
  noteModelRequestSent,
  modelApiFetch,
  isAbortedWithoutStreamError,
  foundryModelKey,
  makeToolSchema,
  UNREADABLE_TOOLS_BEFORE_SUMMARY,
  getTenantLifetimeMs,
  msSinceLastFullCheck,
  getElapsedSinceFullCheck,
  noteFullCheckAt,
  advanceFullCheckMark,
  clearFullCheckMarkIf,
  resetFullCheckMark,
};
