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
import { u, string, _enum, array } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-s61vbvea.js:65885-65938 placement
/**
 * 导出函数 `normalizeServerPath`：参数 e，返回 ("/" + e).replace(/\/{2,}/g, "/")。
 */
function normalizeServerPath(e) {
  return ("/" + e).replace(/\/{2,}/g, "/");
}
//@ chunk-s61vbvea.js:65938-65970 placement
var memoryServerPortSlot = new HostScoped(() => ({
  port: null,
}));
//@ chunk-s61vbvea.js:65970-66000 placement
var memoryServerRequestSchema = DoctorLazy(() =>
  u({
    method: string(),
  }),
);
//@ chunk-s61vbvea.js:66000-66051 placement
var memoryServerHandleSlot = new HostScoped(() => ({
  handle: null,
  undelivered: null,
}));
//@ chunk-s61vbvea.js:66051-66401 placement
/**
 * 账号记忆服务器的模式常量（all/read_only/none 及排序）与 capabilities.experimental["anthropic/memory"] 的 schema。
 */
var COORDINATOR = "coordinator";
var ANTHROPIC_MEMORY = "anthropic/memory";
var READ_ONLY = "read_only";
var NONE = "none";
var MAX_SUBAGENT_NOTE_CHARS = 4096;
var MEMORY_MODE_RANK = {
  all: 0,
  read_only: 1,
  none: 2,
};
var memoryCapabilitiesSchema = DoctorLazy(() =>
  u({
    subagent_memory: _enum(["all", "read_only", "none"]).optional().catch(NONE),
    subagent_note: string().max(MAX_SUBAGENT_NOTE_CHARS).optional().catch(undefined),
    coordinator_memory: _enum(["all", "read_only", "none"]).optional().catch(NONE),
    callers: array(string()).optional().catch(undefined),
  }),
);
//@ chunk-s61vbvea.js:66401-67008 placement
function accountMemoryServerState(e, n) {
  let r;
  let s;
  let h;
  let y = false;
  for (let x of e ?? []) {
    if (!isMemoryToolServer_2(x)) continue;
    if (x.type !== "connected") {
      y ||= x.type !== "disabled";
      continue;
    }
    let P = x.capabilities.experimental?.[ANTHROPIC_MEMORY];
    if (P === undefined) continue;
    let j = memoryCapabilitiesSchema().safeParse(P);
    let G = j.success ? j.data.subagent_memory : NONE;
    let L = j.success ? normalizeMemoryText(j.data.subagent_note ?? "").trim() || undefined : undefined;
    if (G === undefined) h ??= L;
    else if (r === undefined || MEMORY_MODE_RANK[G] > MEMORY_MODE_RANK[r]) {
      r = G;
      s = L;
    }
  }
  let S = r === undefined ? n : n === undefined || MEMORY_MODE_RANK[r] >= MEMORY_MODE_RANK[n] ? r : n;
  let source = S === undefined ? "default" : S === r ? "served" : "fallback";
  let R = r === undefined || S === r;
  if (r === undefined) s = h;
  return {
    mode: S ?? READ_ONLY,
    source,
    ...(s !== undefined &&
      R && {
        note: s,
      }),
    ...(S === undefined &&
      y && {
        serverPending: true,
      }),
  };
}
//@ chunk-s61vbvea.js:67008-67041 placement
function isAccountMemoryToolName(e) {
  return MEMORY_SEARCH_TOOLS.has(e);
}
//@ chunk-s61vbvea.js:67041-67382 placement
/**
 * 创建判断工具是否为账号记忆服务器工具且需受控的函数：惰性计算协调记忆模式（取所有记忆服务器中最宽的），按模式与工具名决定。
 */
function createAccountMemoryToolGate(e) {
  let n;
  return (r) => {
    let mcpInfo = r.mcpInfo;
    if (mcpInfo?.accountMemoryServer !== true) return false;
    if (n === undefined) {
      let h = e();
      let y = hasCommsRoledServer(h) ? "none" : undefined;
      for (let S of h) {
        if (!isMemoryToolServer_2(S)) continue;
        let w =
          (isCoordinatorCapable(S) &&
            !isLocalAgentDynamicMemoryServer(S, MEMORY_READ) &&
            getMemoryCapabilities(S)?.coordinator_memory) ||
          "none";
        if (y === undefined || MEMORY_MODE_RANK[w] > MEMORY_MODE_RANK[y]) y = w;
      }
      n = y ?? "none";
    }
    return (
      n !== "none" &&
      (isAccountMemoryToolName(mcpInfo.toolName) || (n === "all" && mcpInfo.cliOwned !== true))
    );
  };
}
//@ chunk-s61vbvea.js:67382-67515 placement
function getMemoryCapabilities(e) {
  if (e.type !== "connected") return;
  let n = memoryCapabilitiesSchema().safeParse(e.capabilities.experimental?.[ANTHROPIC_MEMORY]);
  return n.success ? n.data : undefined;
}
//@ chunk-s61vbvea.js:67515-67571 placement
function isCoordinatorCapable(e) {
  return getMemoryCapabilities(e)?.callers?.includes(COORDINATOR) === true;
}
//@ chunk-s61vbvea.js:67571-67659 placement
/**
 * 导出函数 `isServedAccountMemoryTool`：参数 e, n，返回 e.mcpInfo?.accountMemoryServer === !0 && pVo(e.mcpInfo.toolName, n)。
 */
function isServedAccountMemoryTool(tool, n) {
  return tool.mcpInfo?.accountMemoryServer === true && isMemoryToolAllowed(tool.mcpInfo.toolName, n);
}
//@ chunk-s61vbvea.js:67659-67703 placement
/**
 * 导出函数 `isMemoryToolAllowed`：参数 e, n，返回 n === "none" || !eu(e)。
 */
function isMemoryToolAllowed(e, n) {
  return n === "none" || !isAccountMemoryToolName(e);
}
//@ chunk-s61vbvea.js:67703-67755 placement
function isMemextractCall(e) {
  return e.mcpRequestMeta?.[MEMORY_CALLER_META_KEY] === MEMEXTRACT;
}
//@ chunk-s61vbvea.js:67755-67860 placement
function getMemoryCallerMeta(e, n, r) {
  if (!e || isMemextractCall(n)) return;
  let s = n.memoryCaller ?? (isCoordinatorMode_2() && isCoordinatorCapable(r) ? COORDINATOR : undefined);
  return (
    s && {
      [MEMORY_CALLER_META_KEY]: s,
    }
  );
}
//@ chunk-s61vbvea.js:67860-67972 placement
/**
 * 把调用方记忆元数据写入（或从）目标对象中移除，来源为工具输入或 MCP 请求元数据。
 */
function applyMemoryCallerMeta(e, n, r, s) {
  let h =
    getMemoryCallerMeta(n, r, s)?.[MEMORY_CALLER_META_KEY] ?? r.mcpRequestMeta?.[MEMORY_CALLER_META_KEY];
  if (h === undefined) delete e[MEMORY_CALLER_META_KEY];
  else e[MEMORY_CALLER_META_KEY] = h;
}
//@ chunk-s61vbvea.js:67972-68322 placement
function refuseNonMainAccountMemoryWrite(accountMemoryServer, name, r) {
  let s = r.agentContext?.agentType !== "main" || r.agentId !== undefined || r.memoryCaller !== undefined;
  return accountMemoryServer && s && !isMemextractCall(r) && !isAccountMemoryToolName(name)
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
function memoryNoteIfEnabled(e) {
  return e.mode === "none" ? undefined : e.note;
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
