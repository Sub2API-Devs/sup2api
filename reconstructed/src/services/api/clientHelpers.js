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
import { ge } from "../../utils/identity.js";
import { env } from "../../utils/env.js";
import { isRemoteCowork } from "../../utils/entrypointKinds.js";
import { mn } from "../../utils/remoteEnvironment.js";
import { spawnTimestampMs } from "../../utils/startupMarks.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { hi } from "../requestUserDialog.js";
import { Bn } from "../../utils/model/modelIds.js";
import { Xb } from "./foundryCapabilities.js";
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

//@ chunk-hwmsct5x.js:246577-246643 placement
function Wb(e) {
  return e?.aborted === !0 && !(e.reason instanceof StreamNoResponseError);
}
//@ chunk-hwmsct5x.js:246643-246799 placement
function modelApiFetch(input, init) {
  let r = withoutSensitiveHeaders(
      requestMethodAndUrl(input, init).url,
      init?.headers ?? (input instanceof Request ? input.headers : void 0),
    ),
    s = init?.tls ? { ...init, ...getTLSFetchOptions(r) } : init;
  return testGuardedFetch(input, s, createTlsSessionFetch("modelApi", s, r));
}
//@ chunk-hwmsct5x.js:246799-246935 placement
var FULL_CHECK_INTERVAL_MS = 120000,
  WORKER_START = "worker_start",
  authCacheClockState = ge({ lastFullCheck: WORKER_START, lifetimeSource: "process" }, (e) => {
    ((e.lastFullCheck = WORKER_START), (e.lifetimeSource = "process"));
  });
//@ chunk-hwmsct5x.js:246935-247061 placement
function getTenantLifetimeMs() {
  let lifetimeSource = authCacheClockState.lifetimeSource;
  if (lifetimeSource !== "process") return lifetimeSource.tenantLifetimeMs;
  return env.CLAUDE_CODE_REMOTE && isRemoteCowork() ? FULL_CHECK_INTERVAL_MS : void 0;
}
//@ chunk-hwmsct5x.js:247061-247119 placement
function msSinceLastFullCheck(e) {
  let n = getElapsedSinceFullCheck(e);
  return n === void 0 ? void 0 : e - n;
}
//@ chunk-hwmsct5x.js:247119-247131 placement
var Gb = 5000;
//@ chunk-hwmsct5x.js:247131-247306 placement
function getElapsedSinceFullCheck(e) {
  let lastFullCheck = authCacheClockState.lastFullCheck;
  if (lastFullCheck === "worker_start") lastFullCheck = mn() ? spawnTimestampMs() : void 0;
  if (lastFullCheck === void 0) return;
  if (lastFullCheck > e)
    return authCacheClockState.lifetimeSource !== "process" && lastFullCheck - e <= Gb ? 0 : void 0;
  return e - lastFullCheck;
}
//@ chunk-hwmsct5x.js:247306-247376 placement
function noteFullCheckAt(e, n) {
  let r = getElapsedSinceFullCheck(e);
  if (r === void 0 || r >= n) authCacheClockState.lastFullCheck = e;
}
//@ chunk-hwmsct5x.js:247376-247442 placement
function advanceFullCheckMark(e, n) {
  if (authCacheClockState.lastFullCheck === e && n > e) authCacheClockState.lastFullCheck = n;
}
//@ chunk-hwmsct5x.js:247442-247506 placement
function clearFullCheckMarkIf(e) {
  if (authCacheClockState.lastFullCheck === e) authCacheClockState.lastFullCheck = void 0;
}
//@ chunk-hwmsct5x.js:247506-247680 placement
function noteModelRequestSent(e) {
  try {
    let n = getTenantLifetimeMs();
    if (n !== void 0) noteFullCheckAt(e, n);
  } catch (error) {
    logForDebugging(
      `[authCacheClock] could not note when a model request was sent; the request itself is unaffected: ${errorMessage(error)}`,
    );
  }
}
//@ chunk-hwmsct5x.js:247680-247719 placement
function resetFullCheckMark() {
  authCacheClockState.lastFullCheck = void 0;
}
//@ chunk-hwmsct5x.js:247719-247929 placement
var WORKSPACE_UNSUPPORTED_PATTERN = /([a-z0-9_, ]+?)\s+not supported in your workspace/i,
  FOUNDRY_UNSUPPORTED_PATTERN =
    /features are not available for Azure AI Foundry workspaces?:\s*([a-z0-9_, ]+)/i,
  WEB_SEARCH_UNAVAILABLE_PATTERN = /server-side web search is not available in this environment/i;
//@ chunk-hwmsct5x.js:247929-248067 placement
function getFoundryBaseUrl() {
  let e = hi(env.ANTHROPIC_FOUNDRY_RESOURCE);
  return env.ANTHROPIC_FOUNDRY_BASE_URL || (e ? `https://${e}.services.ai.azure.com` : void 0);
}
//@ chunk-hwmsct5x.js:248067-248144 placement
function El(e) {
  let n = Bn(e);
  return `${getFoundryBaseUrl() ?? "unknown-foundry-resource"}::${n}`;
}
//@ chunk-hwmsct5x.js:248144-248171 placement
var TOOL_NAME_TOKEN_REGEX = /^[a-z][a-z0-9_]*$/;
/**
 * 从自然语言文本里解析出工具名列表（两种正则格式，否则命中关键词时返回 ["web_search"]）。与 WebSearch 工具本身无直接关系。
 */
//@ chunk-hwmsct5x.js:248171-248450 placement = makeToolSchema (0.356)
function makeToolSchema(input) {
  let n = input.match(WORKSPACE_UNSUPPORTED_PATTERN)?.[1];
  if (n) {
    let mapped = n.split(",").map((h) => h.trim());
    if (mapped.every((h) => TOOL_NAME_TOKEN_REGEX.test(h))) return mapped;
  }
  let r = input.match(FOUNDRY_UNSUPPORTED_PATTERN)?.[1];
  if (r) {
    let filtered = r.split(/[,\s]+/).filter((h) => h !== "and" && TOOL_NAME_TOKEN_REGEX.test(h));
    return filtered.length > 0 ? filtered : null;
  }
  if (WEB_SEARCH_UNAVAILABLE_PATTERN.test(input)) return ["web_search"];
  return null;
}
/**
 * 校验插入 claude.googleapis.com 请求路径的 GCP 项目/位置等环境变量只含字母数字连字符下划线。
 */
//@ chunk-hwmsct5x.js:249957-250329 placement
function assertGcpPathSegment(e, n) {
  if (!n) return;
  if (!Xb.test(n))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${e} may only contain letters, digits, hyphens, and underscores \u2014 ` +
        "it is interpolated into the claude.googleapis.com request path, so URL metacharacters in its value would rewrite the project/workspace the request targets. Unset it or correct its value.",
      "GCP path-segment env var failed the charset gate",
    );
}
//@ chunk-hwmsct5x.js:250329-250395 placement
var SANDY_PLOVER_HEADER = "x-claude-code-sandy-plover",
  Jb = 64,
  Qb = 7168,
  Zb = 256,
  zXo = UNREADABLE_TOOLS_USED_BEFORE_SUMMARY;
//@ chunk-hwmsct5x.js:250395-250448 placement
function pf() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_snug_mitten", !1) && isSillyShoreGateOn();
}
//@ chunk-hwmsct5x.js:250448-250505 placement
var df = new Set([
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
/**
 * 把本轮用到的工具名编码成受长度上限约束的请求头值（超限时截断并加省略标记）。
 */
//@ chunk-hwmsct5x.js:250505-250825 placement
function encodeToolsUsedHeader(e) {
  let filtered = e.filter((h) => h !== "" && Buffer.byteLength(h, "utf8") <= Zb),
    r = [...filtered.filter((h) => !df.has(h)), ...filtered.filter((h) => df.has(h))],
    s = encodeToolNameList(r);
  if (s.length < e.length)
    return (
      (s = encodeToolNameList([zXo, ...r])),
      { value: `[${s.join(",")}]`, sent: s.length - 1, dropped: e.length - (s.length - 1) }
    );
  return { value: `[${s.join(",")}]`, sent: s.length, dropped: 0 };
}
//@ chunk-hwmsct5x.js:250825-251008 placement
function toolsUsedHeaderBuilder(e) {
  return e.built((n) => {
    let r = encodeToolsUsedHeader(n);
    if (r.dropped > 0 && e.reportTruncationOnce())
      logFeatureSad("api_tools_used_header", "incomplete_list", { sent: r.sent, dropped: r.dropped });
    return r.value;
  });
}
//@ chunk-hwmsct5x.js:251008-251250 placement
function encodeToolNameList(names) {
  let n = [],
    r = 2;
  for (let s of names) {
    if (n.length === Jb) break;
    let replaced = jsonStringifyRaw({ name: s }).replace(
        /[\u007f-\uffff]/g,
        (w) => `\\u${w.charCodeAt(0).toString(16).padStart(4, "0")}`,
      ),
      y = replaced.length + (n.length === 0 ? 0 : 1);
    if (r + y > Qb) break;
    (n.push(replaced), (r += y));
  }
  return n;
}

export {
  assertGcpPathSegment,
  getFoundryBaseUrl,
  pf,
  SANDY_PLOVER_HEADER,
  toolsUsedHeaderBuilder,
  noteModelRequestSent,
  modelApiFetch,
  Wb,
  El,
  makeToolSchema,
  zXo,
  getTenantLifetimeMs,
  msSinceLastFullCheck,
  getElapsedSinceFullCheck,
  noteFullCheckAt,
  advanceFullCheckMark,
  clearFullCheckMarkIf,
  resetFullCheckMark,
};
