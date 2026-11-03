/**
 * services/mcp/agentRequestMeta.ts
 *
 * MCP 请求的代理元数据（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tw0z2kk3.js (4)
 * attribution: placement 4
 */
import { CLAUDE_CODE_REMOTE } from "./ccrMetaMcp.js";
import { Zl } from "./cliOwnedClients.js";
import { isCcrOriginUrl } from "./ccrMcpUrls.js";
import { excludeMainSessionAgentId, isMainAgent } from "../../utils/agentContext.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { stripIgnorables } from "../../utils/sanitization.js";
import { isObserverAgentTask } from "../../tasks/LocalAgentTask/LocalAgentTask.js";

//@ chunk-tw0z2kk3.js:448-537 placement
var CLAUDECODE_AGENTID = "claudecode/agentId",
  CLAUDECODE_AGENTTYPE = "claudecode/agentType",
  CLAUDECODE_ISOBSERVER = "claudecode/isObserver",
  c = 128,
  f = 64;
/**
 * 判断 MCP 连接是否是 Claude Code 远程服务器（名称匹配，且为 CCR 配置或指向 CCR 地址的动态 http 配置）。
 */
//@ chunk-tw0z2kk3.js:537-677 placement
function isClaudeCodeRemoteServer(r) {
  let { name: e, config: config } = r;
  if (e !== CLAUDE_CODE_REMOTE) return !1;
  return (
    Zl(config) ||
    (config.scope === "dynamic" &&
      "url" in config &&
      typeof config.url === "string" &&
      isCcrOriginUrl(config.url))
  );
}
/**
 * 生成发给 Claude Code 远程服务器的代理元数据：代理 id、代理类型与是否为观察者代理链。
 */
//@ chunk-tw0z2kk3.js:677-848 placement
function agentRequestMeta(r, e) {
  let n = excludeMainSessionAgentId(e.agentId, e.agentContext);
  if (n === void 0 || !isClaudeCodeRemoteServer(r)) return {};
  let t = truncateToLength(stripIgnorables(e.agentType ?? ""), c);
  return {
    [CLAUDECODE_AGENTID]: n,
    ...(t !== "" && { [CLAUDECODE_AGENTTYPE]: t }),
    ...(isObserverLineage(n, e) && { [CLAUDECODE_ISOBSERVER]: !0 }),
  };
}
/**
 * 沿任务注册表与代理上下文向上追溯父代理，判断是否属于观察者代理（追溯次数超限时视为是）。
 */
//@ chunk-tw0z2kk3.js:848-1249 placement
function isObserverLineage(r, { agentContext: agentContext, taskRegistry: taskRegistry }) {
  let t = [r],
    s = new Set();
  for (let i = t.pop(); i !== void 0; i = t.pop()) {
    if (s.has(i)) continue;
    if (s.size >= f) return !0;
    s.add(i);
    let o = taskRegistry.get(i);
    if (o !== void 0 && isObserverAgentTask(o)) return !0;
    if (o !== void 0 && "parentAgentId" in o && typeof o.parentAgentId === "string") t.push(o.parentAgentId);
    if (!isMainAgent(agentContext)) {
      let a =
        i === agentContext.agentId ? agentContext.parentAgentId : i === r ? agentContext.agentId : void 0;
      if (a !== void 0) t.push(a);
    }
  }
  return !1;
}

export { agentRequestMeta, isClaudeCodeRemoteServer };
