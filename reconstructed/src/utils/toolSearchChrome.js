/**
 * utils/toolSearchChrome.ts
 *
 * 2.1.316 新增：ToolSearch 模式判定与 Claude in Chrome 工具的延迟加载提示词
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mp7v59a0.js (9)
 * attribution: placement 9
 */
import { isHipaaOrg, areExperimentalBetasDisabled } from "./betas.js";
import { getAPIProvider } from "./model/providers.js";
import { getAdminTierEnvValue, getHostManagedToolSearchEnv } from "./settings/settings.js";
import { isEnvTruthy, parseIntLoose, isEnvDefinedFalsy } from "./envUtils.js";
import { logForDebugging } from "./debug.js";

//@ chunk-mp7v59a0.js:613-627 placement
var TOOL_SEARCH_FORCE_VALUE = "force";
/**
 * isToolSearchForceOverride：HIPAA 或非 firstParty 时为假；ENABLE_TOOL_SEARCH（含管理员层环境）为 "force"，或托管策略 hostToolSearchEnv 为 force 且未关闭实验 beta、未用 auto:≥100/假值阻止时为真。
 */
//@ chunk-mp7v59a0.js:627-949 placement
function isToolSearchForceOverride() {
  try {
    if (isHipaaOrg()) return !1;
    if (getAPIProvider() !== "firstParty") return !1;
    let e = getAdminTierEnvValue("ENABLE_TOOL_SEARCH");
    if (e === TOOL_SEARCH_FORCE_VALUE) return !0;
    if (getHostManagedToolSearchEnv() !== TOOL_SEARCH_FORCE_VALUE) return !1;
    if (isEnvTruthy(getAdminTierEnvValue("CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS"))) return !1;
    return e === void 0 || !isToolSearchEnvBlockingForce(e);
  } catch (error) {
    return (
      logForDebugging(`isToolSearchForceOverride: settings read failed: ${error}`, { level: "error" }),
      !1
    );
  }
}
//@ chunk-mp7v59a0.js:949-1047 placement = isAutoToolSearchMode (0.787)
function isToolSearchEnvBlockingForce(value) {
  if (value.startsWith("auto:")) {
    let o = parseIntLoose(value.slice(5));
    return !isNaN(o) && o >= 100;
  }
  return isEnvDefinedFalsy(value);
}
/**
 * 实验 beta 关闭或 HIPAA 下（且非 force）工具搜索整体关闭；同时不发 DeferredToolPlaceholder。
 */
//@ chunk-mp7v59a0.js:1047-1082 placement
function isToolSearchDisabledByBetas() {
  return areExperimentalBetasDisabled() && !isToolSearchForceOverride();
}
//@ chunk-mp7v59a0.js:1082-1390 placement
var CHROME_SELECT_QUERY_WITH_BATCH =
  'ToolSearch with query "select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp"'.replace(
    /"$/,
    ',mcp__claude-in-chrome__browser_batch"',
  );
//@ chunk-mp7v59a0.js:1390-1671 placement
function addBrowserBatchToChromeSelect(e) {
  return e.replace(
    'ToolSearch with query "select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp"',
    CHROME_SELECT_QUERY_WITH_BATCH,
  );
}
/**
 * Claude in Chrome 浏览器自动化的提示词（含先用 ToolSearch 加载 mcp__claude-in-chrome__* 工具）。
 */
//@ chunk-mp7v59a0.js:1671-6643 placement
var CHROME_TASK_TOOLS_HINT =
    "Add task-specific tools to the same call when the task obviously needs them: read_console_messages / read_network_requests for debugging, form_input for forms, gif_creator for recordings, javascript_tool for page scripting.",
  CHROME_PROMPT_HEADER = `# Claude in Chrome browser automation

You have access to browser automation tools (mcp__claude-in-chrome__*) for interacting with web pages in Chrome. Follow these guidelines for effective browser automation.`,
  CHROME_DEFERRED_LOADING_SECTION = `## Loading deferred tools

If the mcp__claude-in-chrome__* tools are deferred (must be loaded via ToolSearch before use), load every tool you expect to need in ONE ToolSearch call \u2014 the select query accepts a comma-separated list \u2014 never one call per tool. Start with the core set:

${'ToolSearch with query "select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp"'}

${CHROME_TASK_TOOLS_HINT}`,
  CHROME_GUIDELINES_SECTION = `## GIF recording

When performing multi-step browser interactions that the user may want to review or share, use mcp__claude-in-chrome__gif_creator to record them.

You must ALWAYS:
* Capture extra frames before and after taking actions to ensure smooth playback
* Name the file meaningfully to help the user identify it later (e.g., "login_process.gif")

## Console log debugging

You can use mcp__claude-in-chrome__read_console_messages to read console output. Console output may be verbose. If you are looking for specific log entries, use the 'pattern' parameter with a regex-compatible pattern. This filters results efficiently and avoids overwhelming output. For example, use pattern: "[MyApp]" to filter for application-specific logs rather than reading all console output.

## Alerts and dialogs

IMPORTANT: Do not trigger JavaScript alerts, confirms, prompts, or browser modal dialogs through your actions. These browser dialogs block all further browser events and will prevent the extension from receiving any subsequent commands. Instead, when possible, use console.log for debugging and then use the mcp__claude-in-chrome__read_console_messages tool to read those log messages. If a page has dialog-triggering elements:
1. Avoid clicking buttons or links that may trigger alerts (e.g., "Delete" buttons with confirmation dialogs)
2. If you must interact with such elements, warn the user first that this may interrupt the session
3. Use mcp__claude-in-chrome__javascript_tool to check for and dismiss any existing dialogs before proceeding

If you accidentally trigger a dialog and lose responsiveness, inform the user they need to manually dismiss it in the browser.

## Avoid rabbit holes and loops

When using browser automation tools, stay focused on the specific task. If you encounter any of the following, stop and ask the user for guidance:
- Unexpected complexity or tangential browser exploration
- Browser tool calls failing or returning errors after 2-3 attempts
- No response from the browser extension
- Page elements not responding to clicks or input
- Pages not loading or timing out
- Unable to complete the browser task despite multiple approaches

Explain what you attempted, what went wrong, and ask how the user would like to proceed. Do not keep retrying the same failing browser action or explore unrelated pages without checking in first.

## Tab context and session startup

IMPORTANT: At the start of each browser automation session, call mcp__claude-in-chrome__tabs_context_mcp first to get information about the user's current browser tabs. Use this context to understand what the user might want to work with before creating new tabs.

Never reuse tab IDs from a previous/other session. Follow these guidelines:
1. Only reuse an existing tab if the user explicitly asks to work with it
2. Otherwise, create a new tab with mcp__claude-in-chrome__tabs_create_mcp
3. If a tool returns an error indicating the tab doesn't exist or is invalid, call tabs_context_mcp to get fresh tab IDs
4. When a tab is closed by the user or a navigation error occurs, call tabs_context_mcp to see what tabs are available`,
  CHROME_PROMPT_WITH_TOOL_SEARCH = `${CHROME_PROMPT_HEADER}

${CHROME_DEFERRED_LOADING_SECTION}

${CHROME_GUIDELINES_SECTION}`,
  CHROME_PROMPT_WITHOUT_TOOL_SEARCH = `${CHROME_PROMPT_HEADER}

${CHROME_GUIDELINES_SECTION}`,
  CHROME_TOOL_SEARCH_REMINDER = `**IMPORTANT: If the Chrome browser tools are deferred (must be loaded via ToolSearch before use), load them with ToolSearch before calling them, and batch every tool you expect to need into ONE ToolSearch call (the select query accepts a comma-separated list). Do NOT load tools one at a time; each separate ToolSearch call wastes a full round-trip.**

Start a browser task whose tools are not yet loaded with a single call loading the core set:

ToolSearch with query "select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp"

${CHROME_TASK_TOOLS_HINT} Only issue a second ToolSearch if the task later needs a tool you did not anticipate.`;
/**
 * Claude in Chrome 的系统提示词片段：工具搜索开启时带"一次 ToolSearch 批量加载"段落。
 */
//@ chunk-mp7v59a0.js:6643-6672 placement
function getChromeSystemPrompt(e) {
  return e ? CHROME_PROMPT_WITH_TOOL_SEARCH : CHROME_PROMPT_WITHOUT_TOOL_SEARCH;
}
//@ chunk-mp7v59a0.js:6672-6956 placement
function isModelVersionAtLeast(model, minVersions) {
  let match = /^claude-([a-z]+)-(\d+(?:-\d+)*)$/.exec(model),
    n = match?.[1],
    l = match?.[2];
  if (!n || !l) return !1;
  let a = minVersions.find(([s]) => s === n)?.[1];
  if (!a) return !1;
  let mapped = l.split("-").map(Number);
  for (let s = 0; s < Math.max(mapped.length, a.length); s++) {
    let u = (mapped[s] ?? 0) - (a[s] ?? 0);
    if (u !== 0) return u > 0;
  }
  return !0;
}

export {
  isToolSearchForceOverride,
  isToolSearchDisabledByBetas,
  isModelVersionAtLeast,
  addBrowserBatchToChromeSelect,
  CHROME_TOOL_SEARCH_REMINDER,
  getChromeSystemPrompt,
};
