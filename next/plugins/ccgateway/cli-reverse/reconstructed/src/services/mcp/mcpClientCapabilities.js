/**
 * services/mcp/mcpClientCapabilities.ts
 *
 * 2.1.316 新增：MCP 客户端能力声明（URL elicitation、MCP Apps UI、无状态跳过 initialize）与 anthropic-mcp-client-capabilities 头
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-06vyq63w.js (15), chunk-zcbqcqbg.js (3)
 * attribution: placement 18
 */
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { isModuleAdmitted } from "../../utils/plugins/functionHooks/admission.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { env } from "../../utils/env.js";
import { IO_MODELCONTEXTPROTOCOL_TASKS } from "./mcpTaskCapability.js";
import { mcpSdkGeneration } from "./mcpSdkGeneration.js";
import { isMcpTasksEnabled } from "./mcpTaskWorker.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import { isCcrHostedConfig } from "./config.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { MCP_PROTOCOL_LATEST, MCP_PROTOCOL_NEXT } from "./mcpCallConstants.js";
import { UNREACHABLE_ERROR_CODES } from "../api/errorUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-zcbqcqbg.js:263-351 placement
/**
 * 判断插件模块是否存在且被接纳。
 */
function isModuleAdmittedByName(plugin) {
  let found = getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === plugin);
  return found === undefined || isModuleAdmitted(found);
}
//@ chunk-zcbqcqbg.js:351-687 placement
function createModuleStore() {
  let byName = new Map();
  let keyByName = new Map();
  let mintedKeys = new Set();
  return {
    list: (name) => (isModuleAdmittedByName(name) ? [...(byName.get(name)?.values() ?? [])] : []),
    own: (name) => {
      let owned = byName.get(name) ?? new Map();
      byName.set(name, owned);
      return owned;
    },
    serverKey: (name) => keyByName.get(name),
    ownerOfKey: (key) => [...keyByName.entries()].find(([, candidate]) => candidate === key)?.[0],
    keyed: (name, key) => {
      keyByName.set(name, key);
      mintedKeys.add(key);
    },
    minted: (key) => mintedKeys.has(key),
    forget: (name) => {
      byName.delete(name);
      keyByName.delete(name);
    },
  };
}
//@ chunk-zcbqcqbg.js:687-700 placement
/**
 * 模块存储（插件模块索引）。
 */
var moduleStore; // deferred: uses createModuleStore of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-zcbqcqbg.js:687", () => {
  moduleStore = createModuleStore();
});
//@ chunk-06vyq63w.js:1490-1544 placement
/**
 * 是否启用 URL 模式 elicitation。
 */
function isUrlElicitationEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_url_elicitation", true);
}
//@ chunk-06vyq63w.js:1544-1610 placement
/**
 * 是否启用旧版 URL elicitation。
 */
function isLegacyUrlElicitationEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_legacy_url_elicitation", true) === true;
}
//@ chunk-06vyq63w.js:1610-1675 placement
/**
 * MCP 应用（UI）的 MIME 类型。
 */
var IO_MODELCONTEXTPROTOCOL_UI = "io.modelcontextprotocol/ui";
var MCP_APP_MIME_TYPE = "text/html;profile=mcp-app";
//@ chunk-06vyq63w.js:1675-1730 placement
/**
 * 当前是否作为 MCP 应用宿主。
 */
function isMcpAppsHost() {
  return env.CLAUDE_CODE_MCP_APPS_HOST === true;
}
//@ chunk-06vyq63w.js:1730-1834 placement
function baseClientCapabilities() {
  return {
    roots: {
      listChanged: true,
    },
    elicitation: {},
    ...(isMcpAppsHost() && {
      extensions: {
        [IO_MODELCONTEXTPROTOCOL_UI]: {
          mimeTypes: [MCP_APP_MIME_TYPE],
        },
      },
    }),
  };
}
//@ chunk-06vyq63w.js:1834-2023 placement
/**
 * 从客户端能力中去掉 tasks 能力及其扩展声明。
 */
function stripTasksCapability(capabilities) {
  let { tasks, extensions, ...rest } = capabilities;
  if (extensions === undefined || !(IO_MODELCONTEXTPROTOCOL_TASKS in extensions))
    return extensions === undefined
      ? rest
      : {
          ...rest,
          extensions,
        };
  let { [IO_MODELCONTEXTPROTOCOL_TASKS]: tasksExtension, ...otherExtensions } = extensions;
  return Object.keys(otherExtensions).length > 0
    ? {
        ...rest,
        extensions: otherExtensions,
      }
    : rest;
}
//@ chunk-06vyq63w.js:2023-2074 placement
/**
 * 基础客户端能力（v2 SDK 时附加任务扩展）。
 */
function clientCapabilitiesForSdk() {
  let capabilities = baseClientCapabilities();
  return mcpSdkGeneration() === "v2" ? withTasksExtension(capabilities) : capabilities;
}
//@ chunk-06vyq63w.js:2074-2163 placement
/**
 * 需要时给客户端能力加上 tasks 扩展。
 */
function withTasksExtension(capabilities) {
  if (!isMcpTasksEnabled() || isHttpMcpServeInvocation()) return capabilities;
  return {
    ...capabilities,
    extensions: {
      ...capabilities.extensions,
      [IO_MODELCONTEXTPROTOCOL_TASKS]: {},
    },
  };
}
//@ chunk-06vyq63w.js:2163-2249 placement
/**
 * 在基础能力上附加 elicitation（form/url）能力。
 */
function clientCapabilitiesWithElicitation() {
  let capabilities = clientCapabilitiesForSdk();
  if (!isUrlElicitationEnabled()) return capabilities;
  return {
    ...capabilities,
    elicitation: {
      form: {},
      url: {},
    },
  };
}
//@ chunk-06vyq63w.js:2249-2494 placement
/**
 * 选择发给 MCP 服务器的客户端能力：符合条件的服务器声明完整 elicitation 能力，否则用精简能力。
 */
function clientCapabilitiesFor(serverRef, { denylisted }) {
  let entry =
    (serverRef.type === undefined ||
      serverRef.type === "stdio" ||
      serverRef.type === "sse" ||
      serverRef.type === "http" ||
      serverRef.type === "ws") &&
    !isCcrHostedConfig(serverRef);
  let isRemoteTransport =
    isLegacyUrlElicitationEnabled() &&
    !denylisted &&
    entry &&
    !("bareElicitationCapability" in serverRef && serverRef.bareElicitationCapability === true)
      ? clientCapabilitiesWithElicitation()
      : clientCapabilitiesForSdk();
  return entry ? stripTasksCapability(isRemoteTransport) : isRemoteTransport;
}
//@ chunk-06vyq63w.js:2494-2554 placement
/**
 * 是否跳过无状态服务器的 initialize。
 */
function isStatelessSkipInitEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_stateless_skip_init", true);
}
//@ chunk-06vyq63w.js:2554-2666 placement
/**
 * 读取 server/discover 投影先验的开关值（off / legacy_only / all）。
 */
function discoverProjectionPrior() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_mcp_discover_projection_prior",
    "off",
  );
  return featureValue_CACHED_MAY_BE_STALE === "legacy_only" || featureValue_CACHED_MAY_BE_STALE === "all"
    ? featureValue_CACHED_MAY_BE_STALE
    : "off";
}
//@ chunk-06vyq63w.js:2666-2677 placement
/**
 * discover 投影信息的字节上限（6144）。
 */
var MAX_DISCOVER_PROJECTION_BYTES = 6144;
//@ chunk-06vyq63w.js:2677-3068 placement
function buildClientCapabilitiesHeader() {
  let projectionPrior = discoverProjectionPrior();
  if (!isStatelessSkipInitEnabled() && projectionPrior === "off") return {};
  let capabilities = clientCapabilitiesForSdk();
  let str = Buffer.from(jsonStringify(capabilities)).toString("base64");
  if (Buffer.byteLength(str, "ascii") > MAX_DISCOVER_PROJECTION_BYTES) {
    logForDebugging(
      "[claudeai-mcp] client capabilities header exceeds size limit \u2014 omitting init-projection headers",
    );
    return {};
  }
  return {
    "anthropic-mcp-client-capabilities": str,
    "MCP-Protocol-Version": MCP_PROTOCOL_LATEST,
    ...(projectionPrior !== "off" && {
      "anthropic-mcp-discover-protocol-version": MCP_PROTOCOL_NEXT,
    }),
  };
}
//@ chunk-06vyq63w.js:3068-3259 placement
var CLAUDEAI_FETCH_TIMEOUT_MS; // deferred: uses SSL_CERT_ERROR_CODES (../api/errorUtils.js) of its import cycle while loading; runs once the cycle is complete
var CLAUDEAI_FETCH_MAX_ATTEMPTS;
var CLAUDEAI_RETRY_BASE_MS;
var CLAUDEAI_RETRY_FACTOR;
var CLAUDEAI_RETRY_BUDGET_MS;
var TRANSIENT_NETWORK_ERRNOS;
var RETRYABLE_NETWORK_CODES;
deferInit("chunk-06vyq63w.js:3068", () => {
  CLAUDEAI_FETCH_TIMEOUT_MS = 5000;
  CLAUDEAI_FETCH_MAX_ATTEMPTS = 3;
  CLAUDEAI_RETRY_BASE_MS = 500;
  CLAUDEAI_RETRY_FACTOR = 3;
  CLAUDEAI_RETRY_BUDGET_MS = 12000;
  TRANSIENT_NETWORK_ERRNOS = new Set([
    "ECONNABORTED",
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "EAI_AGAIN",
    "ERR_SOCKET_CLOSED",
    "ERR_PROXY_TUNNEL",
  ]);
  RETRYABLE_NETWORK_CODES = new Set([...TRANSIENT_NETWORK_ERRNOS, ...UNREACHABLE_ERROR_CODES, "ERR_NETWORK"]);
});
export {
  TRANSIENT_NETWORK_ERRNOS,
  buildClientCapabilitiesHeader,
  CLAUDEAI_FETCH_TIMEOUT_MS,
  CLAUDEAI_FETCH_MAX_ATTEMPTS,
  CLAUDEAI_RETRY_BASE_MS,
  CLAUDEAI_RETRY_FACTOR,
  CLAUDEAI_RETRY_BUDGET_MS,
  RETRYABLE_NETWORK_CODES,
  moduleStore,
  clientCapabilitiesFor,
  stripTasksCapability,
  discoverProjectionPrior,
  clientCapabilitiesForSdk,
  clientCapabilitiesWithElicitation,
  isModuleAdmittedByName,
  createModuleStore,
  isMcpAppsHost,
  isStatelessSkipInitEnabled,
};
