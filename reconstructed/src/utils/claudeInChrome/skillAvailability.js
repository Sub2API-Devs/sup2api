/**
 * utils/claudeInChrome/skillAvailability.ts
 *
 * 2.1.316 新增：Claude in Chrome 技能可用性
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hantmvxa.js (4)
 * attribution: placement 4
 */
import { HTTPS_CLAUDE_AI_CHROME } from "../../commands/chrome/chrome.js";
import { CFC_TOOL_PREFIX, CLAUDE_IN_CHROME_MCP_SERVER_NAME } from "./common.js";
import { isClaudeInChromeWiredThisSession } from "./setup.js";
import { resolveChromeInstallUpsell, $t } from "./installUpsell.js";
import { maybeAddBrowserBatchToChromeSelect, isToolSearchEnabledOptimistic } from "../toolSearch.js";
import { getChromeSystemPrompt } from "../toolSearchChrome.js";
import { MCP_CLAUDE_DEVICE_CHROME } from "./chromeToolNames.js";
import { logForDebugging } from "../debug.js";

/**
 * Claude in Chrome 技能不可用时给模型的说明：未安装、用户拒绝安装、组织策略禁止、工具不在当前上下文、连接失效、只有设备 Chrome 工具。
 */
//@ chunk-hantmvxa.js:45246-46232 placement
var CHROME_NOT_SET_UP_RESULT = `Browser tools are not available in this session: the Claude in Chrome extension is not set up. The user can install or connect it from ${HTTPS_CLAUDE_AI_CHROME} and manage browser tools with /chrome. Continue the task without browser tools (WebFetch and WebSearch cover read-only web content), or ask the user to perform browser steps manually. Do not attempt mcp__claude-in-chrome__* tool calls.`,
  CHROME_INSTALL_DECLINED_RESULT =
    "The user declined to install the Claude in Chrome extension for now. Do not suggest it again this session. Continue the task without browser tools (WebFetch and WebSearch cover read-only web content), or ask the user to perform browser steps manually. They can revisit with /chrome.",
  CHROME_POLICY_DENIED_RESULT =
    "Browser automation is not available: this organization's managed settings do not permit the Claude in Chrome MCP server. Continue the task without browser tools (WebFetch and WebSearch cover read-only web content), or ask the user to perform browser steps manually. Do not suggest installing the extension.";
/**
 * Chrome 技能不可用时的三种说明：工具不在本 agent 上下文中、浏览器连接失效（可用 /chrome 或 /mcp 恢复）、本技能针对的 CFC 工具当前不可用；以及视为失效的 MCP 客户端状态集合。
 */
//@ chunk-hantmvxa.js:46232-47411 placement
var CHROME_TOOLS_NOT_IN_CONTEXT =
    "Claude in Chrome browser tools are enabled for this session, but they are not part of this agent context (its tool set was fixed before the browser connection completed, or its agent type does not include them). Do not attempt mcp__claude-in-chrome__* tool calls here \u2014 complete the task with the tools this context does have, or report back so the main conversation can drive the browser.",
  CHROME_CONNECTION_BROKEN =
    "Claude in Chrome is enabled for this session, but the browser connection is not working (it failed or was disabled), so mcp__claude-in-chrome__* tools are not available. Do not attempt them. Continue the task without browser tools (WebFetch and WebSearch cover read-only web content), or ask the user to perform browser steps manually. The user can restart the connection with /chrome (Reconnect extension), or turn Claude in Chrome back on in /mcp if it was turned off there.",
  CFC_TOOLS_UNAVAILABLE = `The ${CFC_TOOL_PREFIX}* tools, which this skill's guidance is written for, are not available right now, so do not call or load them, even if you still see their definitions. That applies to those tools only. Continue the task with the tools you do have.`,
  DEAD_CLIENT_STATES = new Set(["failed", "disabled", "needs-auth"]);
//@ chunk-hantmvxa.js:47411-47512 placement
function isChromeClientDead(e) {
  let n = e?.filter((s) => s.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME) ?? [];
  return n.length > 0 && n.every((s) => DEAD_CLIENT_STATES.has(s.type));
}
/**
 * claude-in-chrome 技能被调用时返回的指导：已接入且有工具时给 Chrome 系统提示；子代理/预加载、只有设备 Chrome 工具、连接失效时给相应说明；未接入时走安装推荐。
 */
//@ chunk-hantmvxa.js:47512-48192 placement
async function chromeSkillGuidance(context) {
  let n = isClaudeInChromeWiredThisSession(),
    s = context.options?.tools?.some((r) => r.name?.startsWith(CFC_TOOL_PREFIX)) ?? !1;
  if (!n) return resolveChromeInstallUpsell(context);
  if (s) return maybeAddBrowserBatchToChromeSelect(getChromeSystemPrompt(isToolSearchEnabledOptimistic()));
  if (context.agentId !== void 0 || context.options?.isSkillPreload) return CHROME_TOOLS_NOT_IN_CONTEXT;
  if (
    context.options?.tools?.some((r) => r.name?.startsWith(MCP_CLAUDE_DEVICE_CHROME)) &&
    !context.options.mcpClients?.some(
      (r) => r.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME && r.type === "pending",
    )
  )
    return (
      logForDebugging(
        `[Claude in Chrome] Skill invoked with ${MCP_CLAUDE_DEVICE_CHROME}* tools in the tool pool but no ${CFC_TOOL_PREFIX}* tools; telling the model only that the latter are unavailable`,
      ),
      CFC_TOOLS_UNAVAILABLE
    );
  if (isChromeClientDead(context.options?.mcpClients))
    return (
      logForDebugging(
        "[Claude in Chrome] Skill invoked while the chrome MCP client is in a dead state; steering away from browser tools",
      ),
      CHROME_CONNECTION_BROKEN
    );
  if ($t()) return resolveChromeInstallUpsell(context);
  return maybeAddBrowserBatchToChromeSelect(getChromeSystemPrompt(isToolSearchEnabledOptimistic()));
}

export {
  chromeSkillGuidance,
  CHROME_NOT_SET_UP_RESULT,
  CHROME_POLICY_DENIED_RESULT,
  CHROME_INSTALL_DECLINED_RESULT,
};
