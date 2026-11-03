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
import { u, o, U, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { isMemoryToolServer, TTi, Xro, MEMORY_CALLER_META_KEY, MEMEXTRACT } from "../../memdir/memoryTool.js";
import { normalizeMemoryText } from "../../memdir/memdir.js";
import { hasCommsRoledServer } from "../../coordinator/coordinatorMcpServers.js";
import { MEMORY_READ } from "../../tools/MemoryTool/memoryToolNames.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";

//@ chunk-s61vbvea.js:65885-65938 placement
function ONe(e) {
  return ("/" + e).replace(/\/{2,}/g, "/");
}
//@ chunk-s61vbvea.js:65938-65970 placement
var vq = new HostScoped(() => ({ port: null }));
//@ chunk-s61vbvea.js:65970-66000 placement
var Hq = DoctorLazy(() => u({ method: o() }));
//@ chunk-s61vbvea.js:66000-66051 placement
var Gq = new HostScoped(() => ({ handle: null, undelivered: null }));
//@ chunk-s61vbvea.js:66051-66401 placement
var COORDINATOR = "coordinator",
  ANTHROPIC_MEMORY = "anthropic/memory",
  READ_ONLY = "read_only",
  NONE = "none",
  LT = 4096,
  Ro = { all: 0, read_only: 1, none: 2 },
  Ym = DoctorLazy(() =>
    u({
      subagent_memory: U(["all", "read_only", "none"]).optional().catch(NONE),
      subagent_note: o()
        .max(LT)
        .optional()
        .catch(void 0),
      coordinator_memory: U(["all", "read_only", "none"]).optional().catch(NONE),
      callers: A(o())
        .optional()
        .catch(void 0),
    }),
  );
//@ chunk-s61vbvea.js:66401-67008 placement
function accountMemoryServerState(e, n) {
  let r,
    s,
    h,
    y = !1;
  for (let x of e ?? []) {
    if (!isMemoryToolServer(x)) continue;
    if (x.type !== "connected") {
      y ||= x.type !== "disabled";
      continue;
    }
    let P = x.capabilities.experimental?.[ANTHROPIC_MEMORY];
    if (P === void 0) continue;
    let safeParse = Ym().safeParse(P),
      G = safeParse.success ? safeParse.data.subagent_memory : NONE,
      L = safeParse.success
        ? normalizeMemoryText(safeParse.data.subagent_note ?? "").trim() || void 0
        : void 0;
    if (G === void 0) h ??= L;
    else if (r === void 0 || Ro[G] > Ro[r]) ((r = G), (s = L));
  }
  let S = r === void 0 ? n : n === void 0 || Ro[r] >= Ro[n] ? r : n,
    w = S === void 0 ? "default" : S === r ? "served" : "fallback",
    R = r === void 0 || S === r;
  if (r === void 0) s = h;
  return {
    mode: S ?? READ_ONLY,
    source: w,
    ...(s !== void 0 && R && { note: s }),
    ...(S === void 0 && y && { serverPending: !0 }),
  };
}
//@ chunk-s61vbvea.js:67008-67041 placement
function eu(e) {
  return TTi.has(e);
}
/**
 * 创建判断工具是否为账号记忆服务器工具且需受控的函数：惰性计算协调记忆模式（取所有记忆服务器中最宽的），按模式与工具名决定。
 */
//@ chunk-s61vbvea.js:67041-67382 placement
function createAccountMemoryToolGate(e) {
  let n;
  return (r) => {
    let mcpInfo = r.mcpInfo;
    if (mcpInfo?.accountMemoryServer !== !0) return !1;
    if (n === void 0) {
      let h = e(),
        y = hasCommsRoledServer(h) ? "none" : void 0;
      for (let S of h) {
        if (!isMemoryToolServer(S)) continue;
        let w = (Xm(S) && !Xro(S, MEMORY_READ) && getMemoryCapabilities(S)?.coordinator_memory) || "none";
        if (y === void 0 || Ro[w] > Ro[y]) y = w;
      }
      n = y ?? "none";
    }
    return n !== "none" && (eu(mcpInfo.toolName) || (n === "all" && mcpInfo.cliOwned !== !0));
  };
}
//@ chunk-s61vbvea.js:67382-67515 placement
function getMemoryCapabilities(e) {
  if (e.type !== "connected") return;
  let safeParse = Ym().safeParse(e.capabilities.experimental?.[ANTHROPIC_MEMORY]);
  return safeParse.success ? safeParse.data : void 0;
}
//@ chunk-s61vbvea.js:67515-67571 placement
function Xm(e) {
  return getMemoryCapabilities(e)?.callers?.includes(COORDINATOR) === !0;
}
//@ chunk-s61vbvea.js:67571-67659 placement
function Y2t(e, n) {
  return e.mcpInfo?.accountMemoryServer === !0 && pVo(e.mcpInfo.toolName, n);
}
//@ chunk-s61vbvea.js:67659-67703 placement
function pVo(e, n) {
  return n === "none" || !eu(e);
}
//@ chunk-s61vbvea.js:67703-67755 placement
function Jm(e) {
  return e.mcpRequestMeta?.[MEMORY_CALLER_META_KEY] === MEMEXTRACT;
}
//@ chunk-s61vbvea.js:67755-67860 placement
function getMemoryCallerMeta(e, n, r) {
  if (!e || Jm(n)) return;
  let s = n.memoryCaller ?? (isCoordinatorMode_2() && Xm(r) ? COORDINATOR : void 0);
  return s && { [MEMORY_CALLER_META_KEY]: s };
}
/**
 * 把调用方记忆元数据写入（或从）目标对象中移除，来源为工具输入或 MCP 请求元数据。
 */
//@ chunk-s61vbvea.js:67860-67972 placement
function applyMemoryCallerMeta(e, n, r, s) {
  let h =
    getMemoryCallerMeta(n, r, s)?.[MEMORY_CALLER_META_KEY] ?? r.mcpRequestMeta?.[MEMORY_CALLER_META_KEY];
  if (h === void 0) delete e[MEMORY_CALLER_META_KEY];
  else e[MEMORY_CALLER_META_KEY] = h;
}
//@ chunk-s61vbvea.js:67972-68322 placement
function refuseNonMainAccountMemoryWrite(e, n, r) {
  let s = r.agentContext?.agentType !== "main" || r.agentId !== void 0 || r.memoryCaller !== void 0;
  return e && s && !Jm(r) && !eu(n)
    ? "Only the session's main agent can change the user's account memory; a subagent, teammate, fork or backgrounded query cannot. If something should be saved, say so in your reply so the main agent can save it."
    : void 0;
}
//@ chunk-s61vbvea.js:68322-68398 placement
function tZs({ isTeammate: isTeammate, isBackground: isBackground }) {
  return isTeammate || isBackground ? "worker" : "subagent";
}
//@ chunk-s61vbvea.js:68398-68451 placement
function nZs(e) {
  return e.mode === "none" ? void 0 : e.note;
}

export {
  READ_ONLY,
  Y2t,
  tZs,
  nZs,
  createAccountMemoryToolGate,
  refuseNonMainAccountMemoryWrite,
  applyMemoryCallerMeta,
  pVo,
  accountMemoryServerState,
  ONe,
};
