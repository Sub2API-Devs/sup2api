/**
 * services/accountMemory/accountMemoryServer.ts
 *
 * 账号记忆 MCP 服务状态（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (18)
 * attribution: placement 18
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, _enum, array } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  isMemoryToolServer_2,
  MEMORY_SEARCH_TOOLS,
  isLocalAgentDynamicMemoryServer,
  MEMORY_CALLER_META_KEY,
  MEMEXTRACT,
} from "../../memdir/memoryTool.js";
import { normalizeMemoryText } from "../../memdir/memdir.js";
import { hasCommsRoledServer } from "../../coordinator/coordinatorMcpServers.js";
import { MEMORY_READ } from "../../tools/MemoryTool/memoryToolNames.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:65885-65938 placement
/**
 * 导出函数 `normalizeServerPath`：参数 e，返回 ("/" + e).replace(/\/{2,}/g, "/")。
 */
function normalizeServerPath(path) {
  return ("/" + path).replace(/\/{2,}/g, "/");
}
//@ chunk-s61vbvea.js:65938-65970 placement
var memoryServerPortSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:65938", () => {
  memoryServerPortSlot = new HostScoped(() => ({
    port: null,
  }));
});
//@ chunk-s61vbvea.js:65970-66000 placement
var memoryServerRequestSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:65970", () => {
  memoryServerRequestSchema = DoctorLazy(() =>
    objectSchema({
      method: stringSchema(),
    }),
  );
});
//@ chunk-s61vbvea.js:66000-66051 placement
var memoryServerHandleSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:66000", () => {
  memoryServerHandleSlot = new HostScoped(() => ({
    handle: null,
    undelivered: null,
  }));
});
//@ chunk-s61vbvea.js:66051-66401 placement
/**
 * 账号记忆服务器的模式常量（all/read_only/none 及排序）与 capabilities.experimental["anthropic/memory"] 的 schema。
 */
var COORDINATOR; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var ANTHROPIC_MEMORY;
var READ_ONLY;
var NONE;
var MAX_SUBAGENT_NOTE_CHARS;
var MEMORY_MODE_RANK;
var memoryCapabilitiesSchema;
deferInit("chunk-s61vbvea.js:66051", () => {
  COORDINATOR = "coordinator";
  ANTHROPIC_MEMORY = "anthropic/memory";
  READ_ONLY = "read_only";
  NONE = "none";
  MAX_SUBAGENT_NOTE_CHARS = 4096;
  MEMORY_MODE_RANK = {
    all: 0,
    read_only: 1,
    none: 2,
  };
  memoryCapabilitiesSchema = DoctorLazy(() =>
    objectSchema({
      subagent_memory: _enum(["all", "read_only", "none"]).optional().catch(NONE),
      subagent_note: stringSchema().max(MAX_SUBAGENT_NOTE_CHARS).optional().catch(undefined),
      coordinator_memory: _enum(["all", "read_only", "none"]).optional().catch(NONE),
      callers: array(stringSchema()).optional().catch(undefined),
    }),
  );
});
//@ chunk-s61vbvea.js:66401-67008 placement
function accountMemoryServerState(servers, state) {
  let server;
  let capabilities;
  let connected;
  let failed = false;
  for (let memoryServer of servers ?? []) {
    if (!isMemoryToolServer_2(memoryServer)) continue;
    if (memoryServer.type !== "connected") {
      failed ||= memoryServer.type !== "disabled";
      continue;
    }
    let capability = memoryServer.capabilities.experimental?.[ANTHROPIC_MEMORY];
    if (capability === undefined) continue;
    let parsed = memoryCapabilitiesSchema().safeParse(capability);
    let subagentMode = parsed.success ? parsed.data.subagent_memory : NONE;
    let subagentNote = parsed.success
      ? normalizeMemoryText(parsed.data.subagent_note ?? "").trim() || undefined
      : undefined;
    if (subagentMode === undefined) connected ??= subagentNote;
    else if (server === undefined || MEMORY_MODE_RANK[subagentMode] > MEMORY_MODE_RANK[server]) {
      server = subagentMode;
      capabilities = subagentNote;
    }
  }
  let mode =
    server === undefined
      ? state
      : state === undefined || MEMORY_MODE_RANK[server] >= MEMORY_MODE_RANK[state]
        ? server
        : state;
  let source = mode === undefined ? "default" : mode === server ? "served" : "fallback";
  let fromServer = server === undefined || mode === server;
  if (server === undefined) capabilities = connected;
  return {
    mode: mode ?? READ_ONLY,
    source,
    ...(capabilities !== undefined &&
      fromServer && {
        note: capabilities,
      }),
    ...(mode === undefined &&
      failed && {
        serverPending: true,
      }),
  };
}
//@ chunk-s61vbvea.js:67008-67041 placement
function isAccountMemoryToolName(toolName) {
  return MEMORY_SEARCH_TOOLS.has(toolName);
}
//@ chunk-s61vbvea.js:67041-67382 placement
/**
 * 创建判断工具是否为账号记忆服务器工具且需受控的函数：惰性计算协调记忆模式（取所有记忆服务器中最宽的），按模式与工具名决定。
 */
function createAccountMemoryToolGate(getClients) {
  let mode;
  return (tool) => {
    let mcpInfo = tool.mcpInfo;
    if (mcpInfo?.accountMemoryServer !== true) return false;
    if (mode === undefined) {
      let clients = getClients();
      let next = hasCommsRoledServer(clients) ? "none" : undefined;
      for (let client of clients) {
        if (!isMemoryToolServer_2(client)) continue;
        let candidates =
          (isCoordinatorCapable(client) &&
            !isLocalAgentDynamicMemoryServer(client, MEMORY_READ) &&
            getMemoryCapabilities(client)?.coordinator_memory) ||
          "none";
        if (next === undefined || MEMORY_MODE_RANK[candidates] > MEMORY_MODE_RANK[next]) next = candidates;
      }
      mode = next ?? "none";
    }
    return (
      mode !== "none" &&
      (isAccountMemoryToolName(mcpInfo.toolName) || (mode === "all" && mcpInfo.cliOwned !== true))
    );
  };
}
//@ chunk-s61vbvea.js:67382-67515 placement
function getMemoryCapabilities(client) {
  if (client.type !== "connected") return;
  let parsed = memoryCapabilitiesSchema().safeParse(client.capabilities.experimental?.[ANTHROPIC_MEMORY]);
  return parsed.success ? parsed.data : undefined;
}
//@ chunk-s61vbvea.js:67515-67571 placement
function isCoordinatorCapable(client) {
  return getMemoryCapabilities(client)?.callers?.includes(COORDINATOR) === true;
}
//@ chunk-s61vbvea.js:67571-67659 placement
/**
 * 导出函数 `isServedAccountMemoryTool`：参数 e, n，返回 e.mcpInfo?.accountMemoryServer === !0 && pVo(e.mcpInfo.toolName, n)。
 */
function isServedAccountMemoryTool(tool, mode) {
  return tool.mcpInfo?.accountMemoryServer === true && isMemoryToolAllowed(tool.mcpInfo.toolName, mode);
}
//@ chunk-s61vbvea.js:67659-67703 placement
/**
 * 导出函数 `isMemoryToolAllowed`：参数 e, n，返回 n === "none" || !eu(e)。
 */
function isMemoryToolAllowed(toolName, mode) {
  return mode === "none" || !isAccountMemoryToolName(toolName);
}
//@ chunk-s61vbvea.js:67703-67755 placement
function isMemextractCall(tool) {
  return tool.mcpRequestMeta?.[MEMORY_CALLER_META_KEY] === MEMEXTRACT;
}
//@ chunk-s61vbvea.js:67755-67860 placement
function getMemoryCallerMeta(enabled, tool, client) {
  if (!enabled || isMemextractCall(tool)) return;
  let caller =
    tool.memoryCaller ?? (isCoordinatorMode_2() && isCoordinatorCapable(client) ? COORDINATOR : undefined);
  return (
    caller && {
      [MEMORY_CALLER_META_KEY]: caller,
    }
  );
}
//@ chunk-s61vbvea.js:67860-67972 placement
/**
 * 把调用方记忆元数据写入（或从）目标对象中移除，来源为工具输入或 MCP 请求元数据。
 */
function applyMemoryCallerMeta(meta, enabled, tool, client) {
  let caller =
    getMemoryCallerMeta(enabled, tool, client)?.[MEMORY_CALLER_META_KEY] ??
    tool.mcpRequestMeta?.[MEMORY_CALLER_META_KEY];
  if (caller === undefined) delete meta[MEMORY_CALLER_META_KEY];
  else meta[MEMORY_CALLER_META_KEY] = caller;
}
//@ chunk-s61vbvea.js:67972-68322 placement
function refuseNonMainAccountMemoryWrite(isMainContext, name, context) {
  let notMain =
    context.agentContext?.agentType !== "main" ||
    context.agentId !== undefined ||
    context.memoryCaller !== undefined;
  return isMainContext && notMain && !isMemextractCall(context) && !isAccountMemoryToolName(name)
    ? "Only the session's main agent can change the user's account memory; a subagent, teammate, fork or backgrounded query cannot. If something should be saved, say so in your reply so the main agent can save it."
    : undefined;
}
//@ chunk-s61vbvea.js:68322-68398 placement
/**
 * 导出函数 `memoryCallerKind`：参数 { isTeammate: isTeammate, isBackground: isBackgrou…，返回 isTeammate || isBackground ? "worker" : "subagent"。
 */
function memoryCallerKind({ isTeammate, isBackground }) {
  return isTeammate || isBackground ? "worker" : "subagent";
}
//@ chunk-s61vbvea.js:68398-68451 placement
/**
 * 导出函数 `memoryNoteIfEnabled`：参数 e，返回 e.mode === "none" ? void 0 : e.note; } export { READ_ONLY, Y2t, tZs, nZs, createAccountMemoryToolGate, refuseN…。
 */
function memoryNoteIfEnabled(state) {
  return state.mode === "none" ? undefined : state.note;
}
export {
  READ_ONLY,
  isServedAccountMemoryTool,
  memoryCallerKind,
  memoryNoteIfEnabled,
  createAccountMemoryToolGate,
  refuseNonMainAccountMemoryWrite,
  applyMemoryCallerMeta,
  isMemoryToolAllowed,
  accountMemoryServerState,
  normalizeServerPath,
};
