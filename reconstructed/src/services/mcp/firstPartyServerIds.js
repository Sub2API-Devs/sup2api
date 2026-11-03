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

//@ chunk-khngy9cs.js:338-362 placement
var REMOTE_DEVICES = "remote-devices";
//@ chunk-khngy9cs.js:362-428 placement
var CLAUDE_AI = "claude_ai",
  WIDGETS = "widgets",
  CCR_EMAIL = "ccr-email",
  VISUALIZE = "visualize";
//@ chunk-khngy9cs.js:428-556 placement
var MEMORY = "memory",
  VPn = `mcp__${MEMORY}__memory_`,
  A471CAF9_E559_5AD8_836C_4E5972877185 = "a471caf9-e559-5ad8-836c-4e5972877185",
  qPn = "63d0e670-f310-5da6-b45c-86ffaf444223";
/**
 * 根据命名空间与名称派生稳定的服务器 id（哈希，带进程内缓存）。
 */
//@ chunk-khngy9cs.js:556-743 placement
function derivedServerId(e, r) {
  if (e.length + r.length > 256) return hashAgentId(r, hashAgentId(e, c));
  let t = onProcessRootHost(i),
    _ = `${e.length}:${e}${r}`,
    o = t.get(_);
  if (o === void 0) {
    if (t.size >= 256) t.clear();
    ((o = hashAgentId(r, hashAgentId(e, c))), t.set(_, o));
  }
  return o;
}
//@ chunk-khngy9cs.js:743-809 placement
var c = "00000000-0000-0000-0000-000000000000",
  i = new HostScoped(() => new Map());
/**
 * 取 http MCP 配置中 X-MCP-Server-ID 请求头的值（小写）。
 */
//@ chunk-khngy9cs.js:809-994 placement
function mcpServerIdHeader(e) {
  if (e.type !== "http") return;
  let r = "headers" in e ? e.headers : void 0;
  for (let [t, _] of Object.entries(r ?? {}))
    if (t.toLowerCase() === "x-mcp-server-id") return _.toLowerCase();
  return;
}
//@ chunk-khngy9cs.js:994-1019 placement
var WIt = new SessionRootSlot(() => ({}));
//@ chunk-khngy9cs.js:1019-1055 placement
function eRi(e) {
  return mcpServerIdHeader(e) === qPn;
}
/**
 * 一方 MCP 服务器的 id、名称与路径常量：记忆、组件、文档、Pages、Artifacts 及其操作名。
 */
//@ chunk-khngy9cs.js:1055-1436 placement
var MEMORY_SERVER_ID = "758bbc64-7e6c-5dab-a3a5-2a4c7ca423fc",
  WIDGETS_SERVER_ID = "667a974b-0f6b-57fc-8973-52854120fcb3",
  DOCS_SERVER_NAMES = new Set(["Claude_Pages", "Claude_Docs"]),
  BATCH = "batch",
  CREATE = "create",
  QUERY = "query",
  READ = "read",
  UPDATE = "update",
  DOCS_SERVER_ID = "1a59c906-04da-521d-bda7-7f71b9f9e01c",
  DOCS_MCP_PATH = "/v1/pages/mcp",
  ARTIFACTS_SERVER_ID = "2cd180e1-ecb6-5156-82c8-41224ae6346e",
  CLAUDE_ARTIFACTS = "claude-artifacts",
  CCR_ARTIFACTS_MCP_PATH = "/v1/code/mcp/ccr-artifacts",
  ARTIFACTS_MCP_PATH = "/api/artifacts/mcp";
//@ chunk-khngy9cs.js:1436-1472 placement
function Iyr(e) {
  return mcpServerIdHeader(e) === DOCS_SERVER_ID;
}
/**
 * 远程设备与 IDE 工具的完整工具名常量，以及 office bridge 列表状态的元数据键。
 */
//@ chunk-khngy9cs.js:1472-1648 placement
var DEVICE_BASH_TOOL = `mcp__${REMOTE_DEVICES}__device_bash`,
  DEVICE_STAGE_FILES_TOOL = `mcp__${REMOTE_DEVICES}__device_stage_files`,
  DEVICE_COMMIT_FILES_TOOL = `mcp__${REMOTE_DEVICES}__device_commit_files`,
  IDE = "ide",
  IDE_EXECUTE_CODE_TOOL = `mcp__${IDE}__executeCode`,
  OFFICE_BRIDGE_LISTING = "office_bridge.listing";
/**
 * 读取工具元数据中的 office bridge 列表状态（stub 或 live）。
 */
//@ chunk-khngy9cs.js:1648-1769 placement
function officeBridgeListingState(e) {
  let _meta = e._meta,
    t =
      typeof _meta === "object" && _meta !== null && OFFICE_BRIDGE_LISTING in _meta
        ? _meta[OFFICE_BRIDGE_LISTING]
        : void 0;
  return t === "stub" || t === "live" ? t : void 0;
}
/**
 * 宿主能力相关列表：远程设备工具名、宿主能力服务器集合，以及宿主能力服务器名前缀与名称集合。
 */
//@ chunk-khngy9cs.js:1769-2209 placement
var REMOTE_DEVICE_TOOLS = [
    DEVICE_BASH_TOOL,
    `mcp__${REMOTE_DEVICES}__device_list_dir`,
    DEVICE_STAGE_FILES_TOOL,
    DEVICE_COMMIT_FILES_TOOL,
  ],
  HOST_CAPABILITY_SERVERS = new Set([IDE, REMOTE_DEVICES]),
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
  ],
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
//@ chunk-khngy9cs.js:2209-2296 placement
function n(e) {
  return e
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .toLowerCase()
    .replace(/-/g, "_");
}
//@ chunk-khngy9cs.js:2296-2321 placement
var E = ["claude_browser"];
//@ chunk-khngy9cs.js:2321-2387 placement
function JPn(e, r = E) {
  let t = n(e);
  return r.find((_) => n(_) === t) ?? null;
}
//@ chunk-khngy9cs.js:2387-2451 placement
function $Oe(e) {
  return e.toLowerCase().replace(/[^a-z0-9]/g, "");
}
//@ chunk-khngy9cs.js:2451-2512 placement
function KIt(e, r) {
  let t = $Oe(e);
  return t.length > 0 && t === $Oe(r);
}
/**
 * 判断 MCP 服务器名是否是宿主提供的能力服务器（IDE、远程设备、浏览器、Computer Use 等）。
 */
//@ chunk-khngy9cs.js:2512-2640 placement
function isHostCapabilityServer(e, r = E) {
  if (HOST_CAPABILITY_SERVERS.has(e)) return !0;
  if (JPn(e, r) !== null) return !1;
  let t = n(e);
  return HOST_CAPABILITY_NAMES.has(t) || HOST_CAPABILITY_PREFIXES.some((_) => t.startsWith(_));
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
  IDE,
  ARTIFACTS_SERVER_ID,
  CCR_ARTIFACTS_MCP_PATH,
  DOCS_MCP_PATH,
  MEMORY_SERVER_ID,
  qPn,
  WIDGETS_SERVER_ID,
  A471CAF9_E559_5AD8_836C_4E5972877185,
  DOCS_SERVER_ID,
  CCR_EMAIL,
  BATCH,
  $Oe,
  mcpServerIdHeader,
  WIt,
  ARTIFACTS_MCP_PATH,
  JPn,
  KIt,
  isHostCapabilityServer,
  HOST_CAPABILITY_SERVERS,
  IDE_EXECUTE_CODE_TOOL,
  VPn,
  WIDGETS,
  DOCS_SERVER_NAMES,
  Iyr,
  eRi,
  QUERY,
  DEVICE_STAGE_FILES_TOOL,
  REMOTE_DEVICE_TOOLS,
  READ,
  CREATE,
  UPDATE,
};
