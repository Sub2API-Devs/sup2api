/**
 * services/api/clientHelpers.ts
 *
 * 2.1.316 新增：API 客户端辅助：GCP 路径校验、工具使用头编码、已知无效请求模式
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vn3g7zt8.js (26), chunk-wvdswywk.js (1)
 * attribution: placement 22, layout 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  connectorUsage,
  connectorFields,
  isConnectorFieldsReported,
  reportFieldsSent,
} from "./connectorFields.js";
import { getRootSession } from "../../bootstrap/state.js";
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
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { TODO_WRITE_TOOL_NAME } from "../../tools/TodoWriteTool/constants.js";
import { AGENT, TASK } from "../../tools/AgentTool/constants.js";
import { TOOL_SEARCH_TOOL_NAME } from "../../tools/ToolSearchTool/prompt.js";
import { ENTER_PLAN_MODE_TOOL_NAME } from "../../tools/EnterPlanModeTool/constants.js";
import { EXITPLANMODE } from "../../tools/ExitPlanModeTool/constants.js";
import { isServerIdentityActive, internalAndLegacyNames } from "../mcp/serverIdentity.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { logEvent } from "../analytics/index.js";
import { jsonStringifyRaw } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wvdswywk.js:3965-4074 placement
/**
 * 把本轮用到的工具名编码成受长度上限约束的请求头值（超限时截断并加省略标记）。
 */
function encodeToolsUsedHeader(name) {
  let state = connectorUsage.peek(getRootSession());
  let connectorId = state?.connectorByTool.get(name);
  return connectorId === undefined ? undefined : state?.byConnector.get(connectorId);
}
//@ chunk-vn3g7zt8.js:250857-250923 placement
function isAbortedWithoutStreamError(signal) {
  return signal?.aborted === true && !(signal.reason instanceof StreamNoResponseError);
}
//@ chunk-vn3g7zt8.js:250923-251079 placement
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
//@ chunk-vn3g7zt8.js:251079-251215 placement
var FULL_CHECK_INTERVAL_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WORKER_START;
var authCacheClockState;
deferInit("chunk-vn3g7zt8.js:251079", () => {
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
//@ chunk-vn3g7zt8.js:251215-251341 placement
function getTenantLifetimeMs() {
  let lifetimeSource = authCacheClockState.lifetimeSource;
  if (lifetimeSource !== "process") return lifetimeSource.tenantLifetimeMs;
  return env.CLAUDE_CODE_REMOTE && isRemoteCowork() ? FULL_CHECK_INTERVAL_MS : undefined;
}
//@ chunk-vn3g7zt8.js:251341-251399 placement
function msSinceLastFullCheck(nowMs) {
  let elapsedSinceFullCheck = getElapsedSinceFullCheck(nowMs);
  return elapsedSinceFullCheck === undefined ? undefined : nowMs - elapsedSinceFullCheck;
}
//@ chunk-vn3g7zt8.js:251399-251411 placement
var AUTH_CACHE_FRESH_MS = 5000;
//@ chunk-vn3g7zt8.js:251411-251586 placement
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
//@ chunk-vn3g7zt8.js:251586-251656 placement
function noteFullCheckAt(nowMs, tenantLifetimeMs) {
  let elapsedSinceFullCheck = getElapsedSinceFullCheck(nowMs);
  if (elapsedSinceFullCheck === undefined || elapsedSinceFullCheck >= tenantLifetimeMs)
    authCacheClockState.lastFullCheck = nowMs;
}
//@ chunk-vn3g7zt8.js:251656-251722 placement
function advanceFullCheckMark(sentAt, answeredAt) {
  if (authCacheClockState.lastFullCheck === sentAt && answeredAt > sentAt)
    authCacheClockState.lastFullCheck = answeredAt;
}
//@ chunk-vn3g7zt8.js:251722-251786 placement
function clearFullCheckMarkIf(sentAt) {
  if (authCacheClockState.lastFullCheck === sentAt) authCacheClockState.lastFullCheck = undefined;
}
//@ chunk-vn3g7zt8.js:251786-251960 placement
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
//@ chunk-vn3g7zt8.js:251960-251999 placement
function resetFullCheckMark() {
  authCacheClockState.lastFullCheck = undefined;
}
//@ chunk-vn3g7zt8.js:251999-252209 placement
var WORKSPACE_UNSUPPORTED_PATTERN = /([a-z0-9_, ]+?)\s+not supported in your workspace/i;
var FOUNDRY_UNSUPPORTED_PATTERN =
  /features are not available for Azure AI Foundry workspaces?:\s*([a-z0-9_, ]+)/i;
var WEB_SEARCH_UNAVAILABLE_PATTERN = /server-side web search is not available in this environment/i;
//@ chunk-vn3g7zt8.js:252209-252347 placement
function getFoundryBaseUrl() {
  let resource = normalizeRequestId(env.ANTHROPIC_FOUNDRY_RESOURCE);
  return (
    env.ANTHROPIC_FOUNDRY_BASE_URL || (resource ? `https://${resource}.services.ai.azure.com` : undefined)
  );
}
//@ chunk-vn3g7zt8.js:252347-252424 placement
function foundryModelKey(model) {
  let stripped = stripAnyVersatileSuffix(model);
  return `${getFoundryBaseUrl() ?? "unknown-foundry-resource"}::${stripped}`;
}
//@ chunk-vn3g7zt8.js:252424-252451 placement
var TOOL_NAME_TOKEN_REGEX = /^[a-z][a-z0-9_]*$/;
//@ chunk-vn3g7zt8.js:252451-252730 placement (2.1.88 match: makeToolSchema, 0.356)
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
//@ chunk-vn3g7zt8.js:254237-254609 placement
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
//@ chunk-vn3g7zt8.js:254609-254781 placement
/**
 * 内置工具名集合：编码请求头时把内置工具排在自定义工具之后。
 */
var SANDY_PLOVER_HEADER; // deferred: uses TOOL_NAME_PATTERN (../../bootstrap/stateSlices.js) of its import cycle while loading; runs once the cycle is complete
var MAX_TOOL_NAME_LIST_COUNT;
var MAX_TOOL_NAME_HEADER_BYTES;
var MAX_TOOL_NAME_BYTES;
var UNREADABLE_TOOLS_BEFORE_SUMMARY;
var TENGU_TOOLS_USED_HEADER_SIZE;
var TOOL_NAME_HEADER_SIZE_STEPS;
var BUILTIN_TOOL_NAMES;
deferInit("chunk-vn3g7zt8.js:254609", () => {
  SANDY_PLOVER_HEADER = "x-claude-code-sandy-plover";
  MAX_TOOL_NAME_LIST_COUNT = 64;
  MAX_TOOL_NAME_HEADER_BYTES = 7168;
  MAX_TOOL_NAME_BYTES = 256;
  UNREADABLE_TOOLS_BEFORE_SUMMARY = UNREADABLE_TOOLS_USED_BEFORE_SUMMARY;
  TENGU_TOOLS_USED_HEADER_SIZE = "tengu_tools_used_header_size";
  TOOL_NAME_HEADER_SIZE_STEPS = [10, 25, 50, 75, 90];
  BUILTIN_TOOL_NAMES = new Set([
    BASH_TOOL_NAME,
    READ,
    EDIT,
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
//@ chunk-vn3g7zt8.js:254781-255208 layout
function encodeToolNameEntries(entries) {
  let mapped = entries
    .filter(({ name }) => name !== "" && Buffer.byteLength(name, "utf8") <= MAX_TOOL_NAME_BYTES)
    .map(({ name, url, directory_entry: directoryEntry, unresolved }) => ({
      name,
      ...connectorFields(url, directoryEntry, unresolved),
    }));
  let names = [
    ...mapped.filter(({ name }) => !BUILTIN_TOOL_NAMES.has(name)),
    ...mapped.filter(({ name }) => BUILTIN_TOOL_NAMES.has(name)),
  ];
  let encoded = encodeToolNameList(names);
  if (encoded.length < entries.length) {
    encoded = encodeToolNameList([
      {
        name: UNREADABLE_TOOLS_BEFORE_SUMMARY,
      },
      ...names,
    ]);
    return {
      value: `[${encoded.join(",")}]`,
      sent: encoded.length - 1,
      dropped: entries.length - (encoded.length - 1),
    };
  }
  return {
    value: `[${encoded.join(",")}]`,
    sent: encoded.length,
    dropped: 0,
  };
}
//@ chunk-vn3g7zt8.js:255208-255544 placement
function toolsUsedHeaderBuilder(toolsUsed) {
  let serverIdentityActive = isConnectorFieldsReported();
  if (isServerIdentityActive() || serverIdentityActive) {
    let byServerName = new Map();
    for (let toolName of toolsUsed.names()) {
      let serverInfo = serverIdentityActive ? encodeToolsUsedHeader(toolName) : undefined;
      for (let names of internalAndLegacyNames(toolName)) {
        let existing = byServerName.get(names);
        if (
          existing === undefined ||
          (isVouchedOwnEntry(existing) && serverInfo !== undefined && !isVouchedOwnEntry(serverInfo))
        )
          byServerName.set(names, {
            name: names,
            ...serverInfo,
          });
      }
    }
    let headerValue = serializeToolsUsed(toolsUsed, Array.from(byServerName.values()));
    if (headerValue.includes('"directory_entry":')) reportFieldsSent();
    return headerValue;
  }
  return toolsUsed.built((names) =>
    serializeToolsUsed(
      toolsUsed,
      names.map((name) => ({
        name,
      })),
    ),
  );
}
//@ chunk-vn3g7zt8.js:255544-255612 layout
function isVouchedOwnEntry(entry) {
  return entry.directory_entry === undefined && entry.unresolved !== true;
}
//@ chunk-vn3g7zt8.js:255612-255782 layout
function serializeToolsUsed(toolsUsed, entries) {
  let encoded = encodeToolNameEntries(entries);
  if (encoded.dropped > 0 && toolsUsed.reportTruncationOnce())
    logFeatureSad("api_tools_used_header", "incomplete_list", {
      sent: encoded.sent,
      dropped: encoded.dropped,
    });
  reportHeaderSizeStep(toolsUsed, encoded);
  return encoded.value;
}
//@ chunk-vn3g7zt8.js:255782-255999 layout
function reportHeaderSizeStep(toolsUsed, encoded) {
  let entryCount = encoded.sent + (encoded.dropped > 0 ? 1 : 0);
  let byteSize = Buffer.byteLength(encoded.value, "utf8");
  let hitCap = encoded.dropped > 0;
  let sizeStep = {
    count: sizeStepFor(entryCount, MAX_TOOL_NAME_LIST_COUNT),
    bytes: sizeStepFor(byteSize, MAX_TOOL_NAME_HEADER_BYTES),
    capped: hitCap,
  };
  if (!toolsUsed.raiseHeaderSizeSteps(sizeStep)) return;
  logEvent(TENGU_TOOLS_USED_HEADER_SIZE, {
    count: entryCount,
    size_bytes: byteSize,
    hit_cap: hitCap,
  });
}
//@ chunk-vn3g7zt8.js:255999-256067 layout
function sizeStepFor(used, limit) {
  let step = 0;
  for (let candidateStep of TOOL_NAME_HEADER_SIZE_STEPS)
    if (used * 100 >= limit * candidateStep) step = candidateStep;
  return step;
}
//@ chunk-vn3g7zt8.js:256067-256302 placement
function encodeToolNameList(names) {
  let out = [];
  let bytes = 2;
  for (let name of names) {
    if (out.length === MAX_TOOL_NAME_LIST_COUNT) break;
    let replaced = jsonStringifyRaw(name).replace(
      /[\u007f-\uffff]/g,
      (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`,
    );
    let addedBytes = replaced.length + (out.length === 0 ? 0 : 1);
    if (bytes + addedBytes > MAX_TOOL_NAME_HEADER_BYTES) break;
    out.push(replaced);
    bytes += addedBytes;
  }
  return out;
}
export {
  resetFullCheckMark,
  assertGcpPathSegment,
  getFoundryBaseUrl,
  SANDY_PLOVER_HEADER,
  toolsUsedHeaderBuilder,
  noteModelRequestSent,
  modelApiFetch,
  isAbortedWithoutStreamError,
  UNREADABLE_TOOLS_BEFORE_SUMMARY,
  getTenantLifetimeMs,
  msSinceLastFullCheck,
  getElapsedSinceFullCheck,
  noteFullCheckAt,
  advanceFullCheckMark,
  clearFullCheckMarkIf,
  foundryModelKey,
  makeToolSchema,
};
