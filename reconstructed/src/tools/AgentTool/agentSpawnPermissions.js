/**
 * tools/AgentTool/agentSpawnPermissions.ts
 *
 * 2.1.316 新增：插件 agent.spawn 钩子要求的 MCP 服务器检查与 dontAsk 模式下的代理调用权限缓存
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0tkmvwy0.js (7)
 * attribution: placement 7
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
import { string } from "../../../vendor/zod/v4/classic/schemas.js";
import { URL_IN_TEXT_RE, trimTrailingPunctuation } from "../../services/oauth/oauthErrors.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { narrowerMode } from "../../utils/permissions/browserToolNames.js";
import { resolveAgentOverrides } from "./agentDisplay.js";
import { WEBFETCH } from "../WebFetchTool/prompt.js";
import { WebFetchTool } from "../WebFetchTool/WebFetchTool.js";

//@ chunk-0tkmvwy0.js:6083-6264 placement
/**
 * 插件 agent.spawn 钩子指定的代理缺少所需 MCP 服务器时的错误文本。
 */
var formatSpawnHookMcpMissing = (agentType, servers) =>
  `Agent '${agentType}', named by a plugin's agent.spawn hook, requires MCP servers matching: ${servers.join(", ")}; none has tools yet. Use /mcp to configure and authenticate them.`;
//@ chunk-0tkmvwy0.js:6306-6495 placement
/**
 * agent.spawn 钩子改写输入后重新跑权限规则：改写后的输入若被 deny/ask 规则命中（且与原输入不是同一条规则）则返回该决策。
 */
async function checkSpawnHookRewrite(options) {
  let { tool, raised, rewritten, context } = options;
  if (isDeepStrictEqual(raised, rewritten)) return null;
  let _ = await checkRuleBasedPermissions(tool, rewritten, context);
  if (_ === null || _.behavior === "deny") return _;
  return isSameRuleDecision(await checkRuleBasedPermissions(tool, raised, context), _) ? null : _;
}
//@ chunk-0tkmvwy0.js:6495-6535 placement
var RULE_BEHAVIOR_VERB = {
  deny: "denies",
  ask: "asks about",
};
//@ chunk-0tkmvwy0.js:6535-7236 placement
/**
 * 按 [toolUseId, ...] 为键的有界缓存（默认 2048 项、10 分钟 TTL），set/take/has/dropToolUse。
 */
class ToolUseKeyedCache {
  #e = new Map();
  #t;
  #n;
  constructor(n = 2048, e = 600000) {
    this.#t = n;
    this.#n = e;
  }
  static key(n, e) {
    return JSON.stringify([n, ...e]);
  }
  static #o(n) {
    return `${JSON.stringify([n]).slice(0, -1)},`;
  }
  get size() {
    return this.#e.size;
  }
  set(n, e, value) {
    this.dropToolUse(n);
    if (this.#e.size >= this.#t) {
      let now = Date.now();
      for (let [y, _] of this.#e) if (now - _.at > this.#n) this.#e.delete(y);
      if (this.#e.size >= this.#t) {
        let y = this.#e.keys().next().value;
        if (y !== undefined) this.#e.delete(y);
      }
    }
    this.#e.set(ToolUseKeyedCache.key(n, e), {
      value,
      at: Date.now(),
    });
  }
  take(n, e) {
    let s = ToolUseKeyedCache.key(n, e);
    let f = this.#e.get(s);
    this.#e.delete(s);
    return f?.value;
  }
  has(n, e) {
    return this.#e.has(ToolUseKeyedCache.key(n, e));
  }
  dropToolUse(n) {
    let e = ToolUseKeyedCache.#o(n);
    for (let key of this.#e.keys()) if (key.startsWith(e)) this.#e.delete(key);
  }
}
//@ chunk-0tkmvwy0.js:7236-7289 placement
var DONTASK = "dontAsk";
var MAX_WEBFETCH_DISPATCH_URLS = 8;
var regExp = new RegExp(URL_IN_TEXT_RE.source, "gi");
//@ chunk-0tkmvwy0.js:7289-7310 placement
class WebFetchDispatchApprovals extends ToolUseKeyedCache {}
//@ chunk-0tkmvwy0.js:7310-7783 placement
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
  let _ = new Set([...prompt.matchAll(regExp)].map((S) => trimTrailingPunctuation(S[0])));
  if (_.size === 0 || _.size > MAX_WEBFETCH_DISPATCH_URLS) return false;
  for (let url of _) {
    let I = WebFetchTool.inputSchema.safeParse({
      url,
      prompt: "",
    });
    if (
      !I.success ||
      (await checkRuleBasedPermissions(WebFetchTool, I.data, toolUseContext)) !== null ||
      (await WebFetchTool.checkPermissions(I.data, toolUseContext)).behavior !== "allow"
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
