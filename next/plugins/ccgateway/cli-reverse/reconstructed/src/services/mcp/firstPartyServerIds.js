/**
 * services/mcp/firstPartyServerIds.ts
 *
 * 2.1.316 新增：一方 MCP 服务器 id
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-khngy9cs.js (19)
 * attribution: placement 19
 */
import { hashAgentId } from "../../utils/agentId.js";
import { onProcessRootHost } from "../../bootstrap/state.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { CCD_SESSION_MGMT } from "../../tools/SendMessageTool/constants.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-khngy9cs.js:338-362 placement
var REMOTE_DEVICES = "remote-devices";
//@ chunk-khngy9cs.js:362-428 placement
var CLAUDE_AI = "claude_ai";
var WIDGETS = "widgets";
var CCR_EMAIL = "ccr-email";
var VISUALIZE = "visualize";
//@ chunk-khngy9cs.js:428-556 placement
/**
 * 记忆服务器的固定 id。
 */
var MEMORY = "memory";
var MEMORY_TOOL_PREFIX = `mcp__${MEMORY}__memory_`;
var A471CAF9_E559_5AD8_836C_4E5972877185 = "a471caf9-e559-5ad8-836c-4e5972877185";
var MEMORY_SERVER_ID = "63d0e670-f310-5da6-b45c-86ffaf444223";
//@ chunk-khngy9cs.js:556-743 placement
/**
 * 根据命名空间与名称派生稳定的服务器 id（哈希，带进程内缓存）。
 */
function derivedServerId(prefix, name) {
  if (prefix.length + name.length > 256) return hashAgentId(name, hashAgentId(prefix, ZERO_UUID));
  let cache = onProcessRootHost(derivedIdCache);
  let cacheKey = `${prefix.length}:${prefix}${name}`;
  let cached = cache.get(cacheKey);
  if (cached === undefined) {
    if (cache.size >= 256) cache.clear();
    cached = hashAgentId(name, hashAgentId(prefix, ZERO_UUID));
    cache.set(cacheKey, cached);
  }
  return cached;
}
//@ chunk-khngy9cs.js:743-809 placement
/**
 * 派生服务器 id 的进程内缓存。
 */
var ZERO_UUID; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var derivedIdCache;
deferInit("chunk-khngy9cs.js:743", () => {
  ZERO_UUID = "00000000-0000-0000-0000-000000000000";
  derivedIdCache = new HostScoped(() => new Map());
});
//@ chunk-khngy9cs.js:809-994 placement
/**
 * 取 http MCP 配置中 X-MCP-Server-ID 请求头的值（小写）。
 */
function mcpServerIdHeader(config) {
  if (config.type !== "http") return;
  let headers = "headers" in config ? config.headers : undefined;
  for (let [key, value] of Object.entries(headers ?? {}))
    if (key.toLowerCase() === "x-mcp-server-id") return value.toLowerCase();
  return;
}
//@ chunk-khngy9cs.js:994-1019 placement
/**
 * 按会话根保存的 office bridge 状态。
 */
var officeBridgeState; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-khngy9cs.js:994", () => {
  officeBridgeState = new SessionRootSlot(() => ({}));
});
//@ chunk-khngy9cs.js:1019-1055 placement
/**
 * 判断配置上的服务器 id 是否为记忆服务器。
 */
function isMemoryServerId(config) {
  return mcpServerIdHeader(config) === MEMORY_SERVER_ID;
}
//@ chunk-khngy9cs.js:1055-1436 placement
/**
 * 一方 MCP 服务器的 id、名称与路径常量：记忆、组件、文档、Pages、Artifacts 及其操作名。
 */
var MEMORY_SERVER_ID_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WIDGETS_SERVER_ID;
var DOCS_SERVER_NAMES;
var BATCH;
var CREATE;
var QUERY;
var READ;
var UPDATE;
var DOCS_SERVER_ID;
var DOCS_MCP_PATH;
var ARTIFACTS_SERVER_ID;
var CLAUDE_ARTIFACTS;
var CCR_ARTIFACTS_MCP_PATH;
var ARTIFACTS_MCP_PATH;
deferInit("chunk-khngy9cs.js:1055", () => {
  MEMORY_SERVER_ID_2 = "758bbc64-7e6c-5dab-a3a5-2a4c7ca423fc";
  WIDGETS_SERVER_ID = "667a974b-0f6b-57fc-8973-52854120fcb3";
  DOCS_SERVER_NAMES = new Set(["Claude_Pages", "Claude_Docs"]);
  BATCH = "batch";
  CREATE = "create";
  QUERY = "query";
  READ = "read";
  UPDATE = "update";
  DOCS_SERVER_ID = "1a59c906-04da-521d-bda7-7f71b9f9e01c";
  DOCS_MCP_PATH = "/v1/pages/mcp";
  ARTIFACTS_SERVER_ID = "2cd180e1-ecb6-5156-82c8-41224ae6346e";
  CLAUDE_ARTIFACTS = "claude-artifacts";
  CCR_ARTIFACTS_MCP_PATH = "/v1/code/mcp/ccr-artifacts";
  ARTIFACTS_MCP_PATH = "/api/artifacts/mcp";
});
//@ chunk-khngy9cs.js:1436-1472 placement
/**
 * 判断配置上的服务器 id 是否为 docs 服务器。
 */
function isDocsServerId(config) {
  return mcpServerIdHeader(config) === DOCS_SERVER_ID;
}
//@ chunk-khngy9cs.js:1472-1648 placement
/**
 * office bridge 列表状态（stub/live）的元数据键。
 */
var DEVICE_BASH_TOOL = `mcp__${REMOTE_DEVICES}__device_bash`;
var DEVICE_STAGE_FILES_TOOL = `mcp__${REMOTE_DEVICES}__device_stage_files`;
var DEVICE_COMMIT_FILES_TOOL = `mcp__${REMOTE_DEVICES}__device_commit_files`;
var OFFICE_BRIDGE_LISTING_KEY = "ide";
var IDE_EXECUTE_CODE_TOOL = `mcp__${OFFICE_BRIDGE_LISTING_KEY}__executeCode`;
var OFFICE_BRIDGE_LISTING = "office_bridge.listing";
//@ chunk-khngy9cs.js:1648-1769 placement
/**
 * 读取工具元数据中的 office bridge 列表状态（stub 或 live）。
 */
function officeBridgeListingState(listing) {
  let _meta = listing._meta;
  let state =
    typeof _meta === "object" && _meta !== null && OFFICE_BRIDGE_LISTING in _meta
      ? _meta[OFFICE_BRIDGE_LISTING]
      : undefined;
  return state === "stub" || state === "live" ? state : undefined;
}
//@ chunk-khngy9cs.js:1769-2209 placement
/**
 * 宿主能力相关列表：远程设备工具名、宿主能力服务器集合，以及宿主能力服务器名前缀与名称集合。
 */
var REMOTE_DEVICE_TOOLS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var HOST_CAPABILITY_SERVERS;
var HOST_CAPABILITY_PREFIXES;
var HOST_CAPABILITY_NAMES;
deferInit("chunk-khngy9cs.js:1769", () => {
  REMOTE_DEVICE_TOOLS = [
    DEVICE_BASH_TOOL,
    `mcp__${REMOTE_DEVICES}__device_list_dir`,
    DEVICE_STAGE_FILES_TOOL,
    DEVICE_COMMIT_FILES_TOOL,
  ];
  HOST_CAPABILITY_SERVERS = new Set([OFFICE_BRIDGE_LISTING_KEY, REMOTE_DEVICES]);
  HOST_CAPABILITY_PREFIXES = [
    "claude_in_chrome",
    "claude_browser",
    "claude_preview",
    "claude_code_ios_simulator",
    "claude_code_android_emulator",
    "computer_use",
    "framebuffer",
    "plugins",
    "skills",
    "mcp_registry",
    "scheduled_tasks",
    "cowork",
    "session_info",
    "dispatch",
    "remote_devices",
    "ccd_directory",
  ];
  HOST_CAPABILITY_NAMES = new Set([
    "workspace",
    "terminal",
    "office",
    "visualize",
    "window_halo",
    "dev_debug",
    "ccd_session",
    CCD_SESSION_MGMT,
  ]);
});
//@ chunk-khngy9cs.js:2209-2296 placement
/**
 * 规范化服务器名（非字母数字下划线统一为_、转小写、连字符转下划线）。
 */
function normalizeServerToken(name) {
  return name
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .toLowerCase()
    .replace(/-/g, "_");
}
//@ chunk-khngy9cs.js:2296-2321 placement
/**
 * 宿主能力服务器的名字列表。
 */
var HOST_CAPABILITY_SERVER_NAMES = ["claude_browser"];
//@ chunk-khngy9cs.js:2321-2387 placement
/**
 * 按规范化名在宿主能力服务器里查找。
 */
function hostCapabilityServer(name, candidates = HOST_CAPABILITY_SERVER_NAMES) {
  let normalized = normalizeServerToken(name);
  return candidates.find((candidate) => normalizeServerToken(candidate) === normalized) ?? null;
}
//@ chunk-khngy9cs.js:2387-2451 placement
/**
 * 去掉非字母数字并转小写。
 */
function alnumLower(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}
//@ chunk-khngy9cs.js:2451-2512 placement
/**
 * 规范化后比较两个服务器名是否相同。
 */
function sameNormalizedServer(nameA, nameB) {
  let normalized = alnumLower(nameA);
  return normalized.length > 0 && normalized === alnumLower(nameB);
}
//@ chunk-khngy9cs.js:2512-2640 placement
/**
 * 判断 MCP 服务器名是否是宿主提供的能力服务器（IDE、远程设备、浏览器、Computer Use 等）。
 */
function isHostCapabilityServer(name, candidates = HOST_CAPABILITY_SERVER_NAMES) {
  if (HOST_CAPABILITY_SERVERS.has(name)) return true;
  if (hostCapabilityServer(name, candidates) !== null) return false;
  let normalized = normalizeServerToken(name);
  return (
    HOST_CAPABILITY_NAMES.has(normalized) ||
    HOST_CAPABILITY_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  );
}
export {
  DEVICE_BASH_TOOL,
  DEVICE_COMMIT_FILES_TOOL,
  REMOTE_DEVICES,
  MEMORY,
  CLAUDE_ARTIFACTS,
  CLAUDE_AI,
  VISUALIZE,
  derivedServerId,
  officeBridgeListingState,
  OFFICE_BRIDGE_LISTING_KEY,
  ARTIFACTS_SERVER_ID,
  CCR_ARTIFACTS_MCP_PATH,
  DOCS_MCP_PATH,
  MEMORY_SERVER_ID_2,
  MEMORY_SERVER_ID,
  WIDGETS_SERVER_ID,
  A471CAF9_E559_5AD8_836C_4E5972877185,
  DOCS_SERVER_ID,
  CCR_EMAIL,
  BATCH,
  alnumLower,
  mcpServerIdHeader,
  officeBridgeState,
  ARTIFACTS_MCP_PATH,
  hostCapabilityServer,
  sameNormalizedServer,
  isHostCapabilityServer,
  HOST_CAPABILITY_SERVERS,
  IDE_EXECUTE_CODE_TOOL,
  MEMORY_TOOL_PREFIX,
  WIDGETS,
  DOCS_SERVER_NAMES,
  isDocsServerId,
  isMemoryServerId,
  QUERY,
  DEVICE_STAGE_FILES_TOOL,
  REMOTE_DEVICE_TOOLS,
  READ,
  CREATE,
  UPDATE,
};
