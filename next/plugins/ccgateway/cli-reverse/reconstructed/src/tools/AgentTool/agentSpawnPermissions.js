/**
 * tools/AgentTool/agentSpawnPermissions.ts
 *
 * 2.1.316 新增：插件 agent.spawn 钩子要求的 MCP 服务器检查与 dontAsk 模式下的代理调用权限缓存
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tmsx2mh0.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isDeepStrictEqual } from "util";
import {
  checkRuleBasedPermissions,
  hasAutoModeClassifierDenyRules,
  isChainOnAllowActive,
  isWebToolClassifierRouted_2,
} from "../../utils/permissions/permissions.js";
import { isSameRuleDecision } from "./agentLaunchHelpers.js";
import { logForDebugging } from "../../utils/debug.js";
import { URL_IN_TEXT_RE, trimTrailingPunctuation } from "../../services/oauth/oauthErrors.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { narrowerMode } from "../../utils/permissions/browserToolNames.js";
import { resolveAgentOverrides } from "./agentDisplay.js";
import { WEBFETCH } from "../WebFetchTool/prompt.js";
import { WebFetchTool } from "../WebFetchTool/WebFetchTool.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tmsx2mh0.js:6287-6468 placement
/**
 * 插件 agent.spawn 钩子指定的代理缺少所需 MCP 服务器时的错误文本。
 */
var formatSpawnHookMcpMissing = (agentType, servers) =>
  `Agent '${agentType}', named by a plugin's agent.spawn hook, requires MCP servers matching: ${servers.join(", ")}; none has tools yet. Use /mcp to configure and authenticate them.`;
//@ chunk-tmsx2mh0.js:6510-6699 placement
/**
 * agent.spawn 钩子改写输入后重新跑权限规则：改写后的输入若被 deny/ask 规则命中（且与原输入不是同一条规则）则返回该决策。
 */
async function checkSpawnHookRewrite(options) {
  let { tool, raised, rewritten, context } = options;
  if (isDeepStrictEqual(raised, rewritten)) return null;
  let rewrittenDecision = await checkRuleBasedPermissions(tool, rewritten, context);
  if (rewrittenDecision === null || rewrittenDecision.behavior === "deny") return rewrittenDecision;
  return isSameRuleDecision(await checkRuleBasedPermissions(tool, raised, context), rewrittenDecision)
    ? null
    : rewrittenDecision;
}
//@ chunk-tmsx2mh0.js:6699-6739 placement
var RULE_BEHAVIOR_VERB = {
  deny: "denies",
  ask: "asks about",
};
//@ chunk-tmsx2mh0.js:14474-15175 placement
/**
 * 按 [toolUseId, ...] 为键的有界缓存（默认 2048 项、10 分钟 TTL），set/take/has/dropToolUse。
 */
class ToolUseKeyedCache {
  #e = new Map();
  #t;
  #n;
  constructor(maxEntries = 2048, ttlMs = 600000) {
    this.#t = maxEntries;
    this.#n = ttlMs;
  }
  static key(toolUseId, parts) {
    return JSON.stringify([toolUseId, ...parts]);
  }
  static #r(toolUseId) {
    return `${JSON.stringify([toolUseId]).slice(0, -1)},`;
  }
  get size() {
    return this.#e.size;
  }
  set(toolUseId, parts, value) {
    this.dropToolUse(toolUseId);
    if (this.#e.size >= this.#t) {
      let now = Date.now();
      for (let [cacheKey, entry] of this.#e) if (now - entry.at > this.#n) this.#e.delete(cacheKey);
      if (this.#e.size >= this.#t) {
        let oldestKey = this.#e.keys().next().value;
        if (oldestKey !== undefined) this.#e.delete(oldestKey);
      }
    }
    this.#e.set(ToolUseKeyedCache.key(toolUseId, parts), {
      value,
      at: Date.now(),
    });
  }
  take(toolUseId, parts) {
    let cacheKey = ToolUseKeyedCache.key(toolUseId, parts);
    let entry = this.#e.get(cacheKey);
    this.#e.delete(cacheKey);
    return entry?.value;
  }
  has(toolUseId, parts) {
    return this.#e.has(ToolUseKeyedCache.key(toolUseId, parts));
  }
  dropToolUse(toolUseId) {
    let keyPrefix = ToolUseKeyedCache.#r(toolUseId);
    for (let key of this.#e.keys()) if (key.startsWith(keyPrefix)) this.#e.delete(key);
  }
}
//@ chunk-tmsx2mh0.js:15175-15228 placement
var DONTASK; // deferred: uses URL_IN_TEXT_RE (../../services/oauth/oauthErrors.js) of its import cycle while loading; runs once the cycle is complete
var MAX_WEBFETCH_DISPATCH_URLS;
var regExp;
deferInit("chunk-tmsx2mh0.js:15175", () => {
  DONTASK = "dontAsk";
  MAX_WEBFETCH_DISPATCH_URLS = 8;
  regExp = new RegExp(URL_IN_TEXT_RE.source, "gi");
});
//@ chunk-tmsx2mh0.js:15228-15249 placement
let WebFetchDispatchApprovals; // deferred: uses ToolUseKeyedCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-tmsx2mh0.js:15228", () => {
  WebFetchDispatchApprovals = class WebFetchDispatchApprovals extends ToolUseKeyedCache {};
});
//@ chunk-tmsx2mh0.js:15249-15722 placement
/**
 * dontAsk 模式下判断 web-fetch 代理派发能否免分类器审核：prompt 中 1–8 个 URL 均能通过 WebFetch 的输入校验与权限检查。
 */
async function isAutoApprovableWebFetchDispatch({ prompt, subagent_type: subagentType }, toolUseContext) {
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  let mode = toolPermissionContext.mode;
  if (
    !isAutoClassifierActive(mode) ||
    narrowerMode(DONTASK, mode) !== DONTASK ||
    !resolveAgentOverrides(subagentType, toolUseContext.options.agentDefinitions.activeAgents) ||
    typeof prompt !== "string" ||
    hasAutoModeClassifierDenyRules() ||
    isChainOnAllowActive() ||
    isWebToolClassifierRouted_2(WEBFETCH, mode, toolPermissionContext)
  )
    return false;
  let urls = new Set([...prompt.matchAll(regExp)].map((match) => trimTrailingPunctuation(match[0])));
  if (urls.size === 0 || urls.size > MAX_WEBFETCH_DISPATCH_URLS) return false;
  for (let url of urls) {
    let parsedInput = WebFetchTool.inputSchema.safeParse({
      url,
      prompt: "",
    });
    if (
      !parsedInput.success ||
      (await checkRuleBasedPermissions(WebFetchTool, parsedInput.data, toolUseContext)) !== null ||
      (await WebFetchTool.checkPermissions(parsedInput.data, toolUseContext)).behavior !== "allow"
    )
      return false;
  }
  return true;
}
export {
  isAutoApprovableWebFetchDispatch,
  WebFetchDispatchApprovals,
  checkSpawnHookRewrite,
  RULE_BEHAVIOR_VERB,
  formatSpawnHookMcpMissing,
  DONTASK,
};
