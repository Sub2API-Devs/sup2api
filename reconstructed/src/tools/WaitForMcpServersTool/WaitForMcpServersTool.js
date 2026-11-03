/**
 * tools/WaitForMcpServersTool/WaitForMcpServersTool.ts
 *
 * 2.1.316 新增：等待 MCP 服务器连接完成的工具
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (11), chunk-qaeygs3y.js (2)
 * attribution: placement 13
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, array, string, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { getMcpClientsFromAccessor, getRootSession } from "../../bootstrap/state.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { createSignal } from "../../utils/signal.js";
import {
  isToolSearchEnabledOptimistic,
  modelSupportsToolReference,
  isVertexModelWithoutToolSearch,
} from "../../utils/toolSearch.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { normalizeNameForMCP } from "../../services/mcp/normalization.js";
import { internalKey } from "../../services/mcp/serverIdentity.js";
import { sleep } from "../../utils/sleep.js";
import { isUnconfiguredFailure } from "../../services/mcp/redactMcpErrors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { getNeedsAuthServers } from "../../services/tools/toolErrorCodes.js";
import { isHiddenReplyServer, appToolServerUnavailableText } from "../../services/mcp/appToolServerErrors.js";
import { isArtifactMountMode } from "../../services/artifacts/artifactMount.js";

//@ chunk-e6aww6q8.js:2499615-2499917 placement
/**
 * WaitForMcpServers 工具的等待超时与输入/输出 schema（等待的服务器名单；就绪、已连接、缓存、失败、待定、需认证、禁用、未配置、未知）。
 */
var MCP_WAIT_TIMEOUT_MS = 5000;
var waitForMcpInputSchema = DoctorLazy(() =>
  u({
    servers: array(string()).optional().describe("Server names to wait for (default: all pending)"),
  }),
);
var waitForMcpOutputSchema = DoctorLazy(() =>
  u({
    ready: M(),
    connected: array(string()),
    cached: array(string()).optional(),
    failed: array(string()),
    stillPending: array(string()),
    needsAuth: array(string()),
    disabled: array(string()),
    unconfigured: array(string()).optional(),
    ...{},
    unknown: array(string()),
  }),
);
//@ chunk-e6aww6q8.js:2499917-2499991 placement
/**
 * 返回仍处于连接中状态的 MCP 服务器名。
 */
function pendingMcpServerNames(e) {
  return e.filter((n) => n.type === "pending").map((n) => n.name);
}
//@ chunk-e6aww6q8.js:2499991-2500036 placement
/**
 * 判断当前是否有连接中的 MCP 服务器。
 */
function hasPendingMcpClients() {
  return pendingMcpServerNames(getMcpClientsFromAccessor() ?? []).length > 0;
}
//@ chunk-e6aww6q8.js:2500036-2500084 placement
/**
 * 按宿主记录“已声明等待 MCP 服务器”的状态与变更信号。
 */
var declaredByHost = new HostScoped(() => ({
  declared: false,
  changed: createSignal(),
}));
//@ chunk-e6aww6q8.js:2500084-2500173 placement
/**
 * 设置某宿主的已声明状态并通知变更。
 */
function setDeclaredByHost(e, n) {
  let r = declaredByHost.of(e);
  if (r.declared === n) return;
  r.declared = n;
  r.changed.emit();
}
//@ chunk-e6aww6q8.js:2500173-2500205 placement
/**
 * 标记当前宿主已声明。
 */
function markDeclared() {
  setDeclaredByHost(getRootSession().host, true);
}
//@ chunk-e6aww6q8.js:2500205-2500253 placement
/**
 * 当前宿主是否已声明等待。
 */
function isDeclared() {
  return declaredByHost.of(getRootSession().host).declared;
}
//@ chunk-e6aww6q8.js:2500253-2500279 placement
/**
 * 清除某宿主的已声明状态。
 */
function clearDeclared(host) {
  setDeclaredByHost(host, false);
}
//@ chunk-e6aww6q8.js:2500279-2500340 placement
/**
 * 订阅已声明状态的变更。
 */
function onDeclaredChange(refreshOnNextMicrotask) {
  return declaredByHost.of(getRootSession().host).changed.subscribe(refreshOnNextMicrotask);
}
//@ chunk-e6aww6q8.js:2500340-2500426 placement
/**
 * 工具搜索可用（且非旧 Vertex 模型）时关闭该工具，否则有连接中的 MCP 服务器或已声明时启用。
 */
function isWaitForMcpServersEnabled(mainLoopModel, n) {
  if (
    isToolSearchEnabledOptimistic() &&
    modelSupportsToolReference(mainLoopModel) &&
    !isVertexModelWithoutToolSearch(getCanonicalName(mainLoopModel))
  )
    return false;
  return pendingMcpServerNames(n).length > 0 || isDeclared();
}
//@ chunk-e6aww6q8.js:2500426-2503901 placement
/**
 * WaitForMcpServers 工具：isEnabled=Lmr —— 工具搜索可用（Oh 且模型支持 tool_reference 且非 Vertex 旧模型）时关闭；否则有连接中的 MCP 服务器（或 ftt()）时启用，用来等待它们就绪。getTools 只在工具搜索相关条件下追加它。
 */
var WaitForMcpServersTool = buildTool({
  isEnabled() {
    return isWaitForMcpServersEnabled(getMainLoopModel(), getMcpClientsFromAccessor() ?? []);
  },
  isConcurrencySafe() {
    return false;
  },
  isReadOnly() {
    return true;
  },
  name: WAITFORMCPSERVERS,
  backgrounding: "never",
  maxResultSizeChars: 1e4,
  async description() {
    return waitForMcpServersPrompt();
  },
  async prompt() {
    return waitForMcpServersPrompt();
  },
  get inputSchema() {
    return waitForMcpInputSchema();
  },
  get outputSchema() {
    return waitForMcpOutputSchema();
  },
  create(e) {
    return {
      async call(n, r) {
        let s = e.mcpClients();
        let h = pendingMcpServerNames(s);
        let y = n.servers?.length
          ? n.servers
          : h.length > 0
            ? h
            : s.filter((nt) => nt.type === "failed").map((nt) => nt.name);
        let S = new Set(y.map((nt) => normalizeNameForMCP(internalKey(nt))));
        let w = () =>
          e.mcpClients().filter((nt) => y.includes(nt.name) || S.has(normalizeNameForMCP(nt.name)));
        let now = Date.now();
        let G = now + MCP_WAIT_TIMEOUT_MS;
        while (w().some((nt) => nt.type === "pending") && Date.now() < G && !r.signal.aborted)
          await sleep(50, r.signal);
        let q = Date.now() - now;
        let Z = w();
        let Se = [];
        let ke = [];
        let we = [];
        let Ee = [];
        let Ae = [];
        let Ie = [];
        let Me = [];
        for (let nt of Z)
          switch (nt.type) {
            case "connected":
              Se.push(nt.name);
              break;
            case "cached":
              ke.push(nt.name);
              break;
            case "failed":
              if (isUnconfiguredFailure(nt)) Me.push(nt.name);
              else we.push(nt.name);
              break;
            case "pending":
              Ee.push(nt.name);
              break;
            case "needs-auth":
              Ae.push(nt.name);
              break;
            case "disabled":
              Ie.push(nt.name);
              break;
            default:
          }
        let We = new Set(Z.map((nt) => normalizeNameForMCP(nt.name)));
        let filtered = y.filter(
          (nt) => !We.has(normalizeNameForMCP(nt)) && !We.has(normalizeNameForMCP(internalKey(nt))),
        );
        let lt =
          Ee.length === 0 && we.length === 0 && Ae.length === 0 && Ie.length === 0 && filtered.length === 0;
        logForDebugging(
          `[WaitForMcpServers] waited=${q}ms connected=${Se.join(",")} cached=${ke.join(",")} failed=${we.join(",")} pending=${Ee.join(",")} needsAuth=${Ae.join(",")} disabled=${Ie.join(",")} unconfigured=${Me.join(",")} unknown=${filtered.join(",")}`,
        );
        logEvent("tengu_mcp_pending_call", {
          requestedCount: y.length,
          connectedCount: Se.length,
          cachedCount: ke.length,
          failedCount: we.length,
          pendingCount: Ee.length,
          needsAuthCount: Ae.length,
          disabledCount: Ie.length,
          unconfiguredCount: Me.length,
          unknownCount: filtered.length,
          waitMs: q,
          matched: lt,
          matchType: lit_2("wait"),
          success: lt,
        });
        let Je =
          getNeedsAuthServers(Z) ??
          (Ie.length > 0
            ? {
                kind: "mcp_disabled",
                servers: Ie,
              }
            : undefined);
        return {
          ...(Je !== undefined && {
            remedy: Je,
          }),
          data: {
            ready: lt,
            connected: Se,
            cached: ke,
            failed: we,
            stillPending: Ee,
            needsAuth: Ae,
            disabled: Ie,
            unconfigured: Me,
            unknown: filtered,
            ...false,
          },
        };
      },
    };
  },
  renderToolUseMessage(e) {
    let joined = e.servers?.join(", ");
    return joined ? `Wait for MCP servers to connect: ${joined}` : "Wait for pending MCP servers to connect";
  },
  userFacingName() {
    return "MCP Wait For Servers";
  },
  mapToolResultToToolResultBlockParam(e, toolUseId) {
    let filtered = e.failed.filter((y) => !isHiddenReplyServer(y));
    let filtered_2 = e.needsAuth.filter((y) => !isHiddenReplyServer(y));
    let filtered_3 = [
      `ready: ${e.ready}`,
      e.connected.length
        ? `Connected (their tools are now available \u2014 call them directly): ${e.connected.join(", ")}`
        : "",
      e.cached?.length
        ? `Cached (their tools are available now; connects on first call): ${e.cached.join(", ")}`
        : "",
      filtered.length ? `Failed to connect: ${filtered.join(", ")}` : "",
      e.stillPending.length
        ? `Still connecting (try again or proceed without): ${e.stillPending.join(", ")}`
        : "",
      filtered_2.length ? `Needs authentication (ask the user to run /mcp): ${filtered_2.join(", ")}` : "",
      filtered.length < e.failed.length
        ? appToolServerUnavailableText("failed")
        : filtered_2.length < e.needsAuth.length
          ? appToolServerUnavailableText("needs_auth")
          : "",
      e.disabled.length
        ? isArtifactMountMode()
          ? `Disabled for this project (the user can turn these servers back on by running /mcp in this project, in a terminal where this session runs): ${e.disabled.join(", ")}`
          : `Disabled (ask the user to enable via /mcp): ${e.disabled.join(", ")}`
        : "",
      e.unconfigured?.length
        ? `Not configured (no URL set \u2014 retrying will not help; the user must configure the server first): ${e.unconfigured.join(", ")}`
        : "",
      e.unknown.length ? `Unknown (no MCP server with this name is configured): ${e.unknown.join(", ")}` : "",
    ].filter(Boolean);
    return {
      type: "tool_result",
      tool_use_id: toolUseId,
      content: filtered_3.join(`
`),
      is_error: !e.ready,
    };
  },
});
//@ chunk-qaeygs3y.js:191-218 placement
var WAITFORMCPSERVERS = "WaitForMcpServers";
//@ chunk-qaeygs3y.js:218-949 placement
/**
 * WaitForMcpServers 工具的提示词：等待仍在连接的 MCP 服务器，就绪后其工具会出现在工具列表中，无需征求用户确认。
 */
function waitForMcpServersPrompt() {
  return [
    "Wait for MCP servers that are still connecting and whose tools are not",
    "yet in your tool list. Pass `servers` to wait for specific ones, or omit",
    "it to wait for all pending servers (once none is pending, a call without",
    "`servers` reports any server that failed to connect or is not configured).",
    "",
    ...[
      "If the user's request needs tools from a still-connecting server, call this",
      "tool to wait for it. Once it connects, its tools will be added to your tool",
      "list and you can use them directly. Returns ready=true when servers are",
      "ready, ready=false if they failed to connect, need authentication, or are",
      "disabled.",
    ],
    "",
    "You do not need to ask the user for confirmation to use this tool.",
  ].join(`
`);
}
export {
  WAITFORMCPSERVERS,
  onDeclaredChange,
  isDeclared,
  clearDeclared,
  markDeclared,
  WaitForMcpServersTool,
  hasPendingMcpClients,
};
