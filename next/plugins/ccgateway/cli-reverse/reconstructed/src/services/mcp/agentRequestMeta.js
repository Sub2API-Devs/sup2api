/**
 * services/mcp/agentRequestMeta.ts
 *
 * MCP 请求的代理元数据（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-p28azry7.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { CLAUDE_CODE_REMOTE } from "./ccrMetaMcp.js";
import { isCliOwnedConfig } from "./cliOwnedClients.js";
import { isCcrOriginUrl } from "./ccrMcpUrls.js";
import { excludeMainSessionAgentId, isMainAgent } from "../../utils/agentContext.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { stripIgnorables } from "../../utils/sanitization.js";
import { isObserverAgentTask } from "../../tasks/LocalAgentTask/LocalAgentTask.js";

//@ chunk-p28azry7.js:447-536 placement
/**
 * MCP 请求 meta 最多键数（64）。
 */
var CLAUDECODE_AGENTID = "claudecode/agentId";
var CLAUDECODE_AGENTTYPE = "claudecode/agentType";
var CLAUDECODE_ISOBSERVER = "claudecode/isObserver";
var MAX_AGENT_TYPE_CHARS = 128;
var MAX_META_KEYS = 64;
//@ chunk-p28azry7.js:536-676 placement
/**
 * 判断 MCP 连接是否是 Claude Code 远程服务器（名称匹配，且为 CCR 配置或指向 CCR 地址的动态 http 配置）。
 */
function isClaudeCodeRemoteServer(info) {
  let { name, config } = info;
  if (name !== CLAUDE_CODE_REMOTE) return false;
  return (
    isCliOwnedConfig(config) ||
    (config.scope === "dynamic" &&
      "url" in config &&
      typeof config.url === "string" &&
      isCcrOriginUrl(config.url))
  );
}
//@ chunk-p28azry7.js:676-846 placement (2.1.88 match: _temp0, 0.654)
/**
 * 生成发给 Claude Code 远程服务器的代理元数据：代理 id、代理类型与是否为观察者代理链。
 */
function agentRequestMeta(info, context) {
  let agentId = excludeMainSessionAgentId(context.agentId, context.agentContext);
  if (agentId === undefined || !isClaudeCodeRemoteServer(info)) return {};
  let agentType = truncateToLength(stripIgnorables(context.agentType ?? ""), MAX_AGENT_TYPE_CHARS);
  return {
    [CLAUDECODE_AGENTID]: agentId,
    ...(agentType !== "" && {
      [CLAUDECODE_AGENTTYPE]: agentType,
    }),
    ...(isObserverLineage(agentId, context) && {
      [CLAUDECODE_ISOBSERVER]: true,
    }),
  };
}
//@ chunk-p28azry7.js:846-1247 placement
/**
 * 沿任务注册表与代理上下文向上追溯父代理，判断是否属于观察者代理（追溯次数超限时视为是）。
 */
function isObserverLineage(agentId, { agentContext, taskRegistry }) {
  let stack = [agentId];
  let seen = new Set();
  for (let current = stack.pop(); current !== undefined; current = stack.pop()) {
    if (seen.has(current)) continue;
    if (seen.size >= MAX_META_KEYS) return true;
    seen.add(current);
    let task = taskRegistry.get(current);
    if (task !== undefined && isObserverAgentTask(task)) return true;
    if (task !== undefined && "parentAgentId" in task && typeof task.parentAgentId === "string")
      stack.push(task.parentAgentId);
    if (!isMainAgent(agentContext)) {
      let parentId =
        current === agentContext.agentId
          ? agentContext.parentAgentId
          : current === agentId
            ? agentContext.agentId
            : undefined;
      if (parentId !== undefined) stack.push(parentId);
    }
  }
  return false;
}
export { agentRequestMeta, isClaudeCodeRemoteServer };
