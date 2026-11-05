/**
 * plugins/bundled/claudeTest/messages.ts
 *
 * 2.1.316 新增：Claude Test 面向用户与模型的固定文本（不可用原因、插件冲突、助手未就绪）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mhn0amzz.js (9)
 * attribution: placement 9
 */
import { CC_PLUGIN_CLAUDE_TEST, RELOAD_PLUGINS, HELPER_SERVER_NAME } from "./constants.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-mhn0amzz.js:82757-84021 placement
/**
 * Claude Test 只在终端 CLI 里可用的说明，以及「会话里已有同名浏览器工具」时的处置步骤（检查 /plugin 的 Installed 页与 /mcp 里的 plugin_claude-test_browser）。
 */
var CLI_ONLY_TEXT; // deferred: uses CC_PLUGIN_CLAUDE_TEST (./constants.js) of its import cycle while loading; runs once the cycle is complete
var DUPLICATE_HELPER_TOOLS_TEXT;
var RELOAD_PART_MISSING_TEXT;
var START_HINT_TEXT;
var STILL_READYING_TEXT;
deferInit("chunk-mhn0amzz.js:82757", () => {
  CLI_ONLY_TEXT =
    "Claude Test works only in the Claude Code CLI in a terminal, not with claude -p. Open a terminal in your project folder, run claude, and type /claude-test there.";
  DUPLICATE_HELPER_TOOLS_TEXT = `Claude Test did not start: this session already lists browser tools under Claude Test's name. In /plugin, open the Installed tab. Leave ${CC_PLUGIN_CLAUDE_TEST} (builtin) on. If the tab lists another Claude Test plugin, disable that one. If /mcp lists a server named plugin_claude-test_browser (with underscores, not colons), disable it. If you find neither, restart Claude Code. Then run /claude-test.`;
  RELOAD_PART_MISSING_TEXT = `Claude Test cannot run in this session yet: Claude Code did not load its part that starts the browser helper. Type /${RELOAD_PLUGINS} (if it tells you to run it with --force, do that), then /claude-test. If that changes nothing, the usual cause is another enabled Claude Test plugin. In /plugin, open the Installed tab. Leave ${CC_PLUGIN_CLAUDE_TEST} (builtin) on. If the tab lists another Claude Test plugin, disable that one. Then, or if there is none, restart Claude Code.`;
  START_HINT_TEXT = `To start Claude Test, type /claude-test in the terminal where Claude Code is running. If that does not start it, or from Remote Control, type /${RELOAD_PLUGINS} first, then /claude-test.`;
  STILL_READYING_TEXT = "Claude Test is still getting ready. Type /claude-test in a moment.";
});
//@ chunk-mhn0amzz.js:84021-84271 placement
function formatConflictingPluginText(claudeTestRepository) {
  return `Claude Test cannot run in this session: another enabled plugin is also named claude-test and loads first: ${claudeTestRepository}. Disable or uninstall that one on the Installed tab of /plugin. Leave ${CC_PLUGIN_CLAUDE_TEST} (builtin) on. Then restart Claude Code.`;
}
//@ chunk-mhn0amzz.js:84271-87309 placement
/**
 * Claude Test 的失败文案组：浏览器助手未就绪、无法启动测试代理、代理未加载（提示跑 /reload-plugins 再用 /claude-test）、未运行请求等，每段都告诉模型原样转述并停止。
 */
var HELPER_NOT_READY_TEXT; // deferred: uses RELOAD_PLUGINS (./constants.js) of its import cycle while loading; runs once the cycle is complete
var AGENT_START_FAILED_TEXT;
var AGENTS_NOT_LOADED_TEXT;
var AGENTS_STILL_LOADING_TEXT;
var AGENTS_JUST_LOADED_TEXT;
var NOT_AVAILABLE_NOW_TEXT;
var LOGIN_CHANGED_TEXT;
var LOGIN_CHECK_FAILED_TEXT;
var BROWSER_UNAVAILABLE_TEXT;
var INSTALL_NEEDED_TEXT;
var RUN_BLOCKED_TEXT;
var NO_TESTS_TEXT;
var REPORT_MISSING_TEXT;
var TESTS_FAILED_TEXT;
var RUN_STOPPED_TEXT;
var ASK_IN_CHAT_TEXT;
deferInit("chunk-mhn0amzz.js:84271", () => {
  HELPER_NOT_READY_TEXT =
    "Claude Test's browser helper is not ready in this session. Type /claude-test to start it and run the tests.";
  AGENT_START_FAILED_TEXT =
    "Claude Test could not start its test agent in this session, so nothing ran. Type /claude-test to try again. If this message comes back, restart Claude Code.";
  AGENTS_NOT_LOADED_TEXT = `Claude Test did not start: its test agents are not loaded in this session. Type /${RELOAD_PLUGINS} (if it tells you to run it with --force, do that), then /claude-test. If this message comes back, restart Claude Code.`;
  AGENTS_STILL_LOADING_TEXT =
    "Claude Test did not start: its test agents are still loading. Type /claude-test in a moment.";
  AGENTS_JUST_LOADED_TEXT =
    "Claude Test did not start: its test agents were loaded just now. Type /claude-test to run it.";
  NOT_AVAILABLE_NOW_TEXT =
    "Claude Test is not available in this session right now, so it did not run. If you just changed your login, wait a moment, then type /claude-test again. If you see this message again, restart Claude Code; if it still shows, Claude Test is not available here.";
  LOGIN_CHANGED_TEXT =
    "Claude Test did not run: the Claude Code login or plan changed since its browser helper started, or could not be checked, so the helper was stopped. Type /claude-test to start it again.";
  LOGIN_CHECK_FAILED_TEXT =
    "Claude Test did not start: it could not check the Claude Code login. Type /claude-test to try again. If this happens again, sign in again with /login, or restart Claude Code.";
  BROWSER_UNAVAILABLE_TEXT =
    "Claude Test is not ready yet: its browser helper connected, but its tools did not show in time. Run /claude-test. If the helper was only slow to start, that will work.";
  INSTALL_NEEDED_TEXT = `Claude Test did not start: its browser helper is switched off for this project. Type /${RELOAD_PLUGINS} (if it tells you to run it with --force, do that), switch ${HELPER_SERVER_NAME} on in /mcp, then run /claude-test.`;
  RUN_BLOCKED_TEXT = `Claude Test did not start: this session does not connect its browser helper (${HELPER_SERVER_NAME}). The cause is how this session was started, or a setting for MCP servers. To see which, start claude with --debug, run /claude-test, and read the line about $.mcp.connect in the debug log (in ~/.claude/debug). If the setting is your organization's, only your administrator can change it.`;
  NO_TESTS_TEXT =
    "Claude Test did not start: its browser helper did not come up. Run /claude-test. If the helper was only slow to start, that will work. If it keeps failing, check that node is installed, and see /mcp for the error; you can reconnect the helper there, then run /claude-test.";
  REPORT_MISSING_TEXT =
    "Claude Test did not start: Claude Code would not connect its browser helper in this session. Restart Claude Code and run /claude-test. If that fails too, start claude with --debug, run /claude-test, and read the line about $.mcp.connect in the debug log (in ~/.claude/debug); it says why.";
  TESTS_FAILED_TEXT =
    "Claude Test did not start: another MCP server in this session already runs Claude Test's browser helper. In /mcp, switch off the server whose Command ends in playwright-mcp.mjs, then run /claude-test.";
  RUN_STOPPED_TEXT = "Starting the Claude Test browser helper.";
  ASK_IN_CHAT_TEXT =
    "Claude Test did not start its browser helper: this build of Claude Code cannot check its files, so it starts nothing. Please report this.";
});
//@ chunk-mhn0amzz.js:87309-88392 placement
function describeHelperFileMismatch(folder, problem, what) {
  switch (problem) {
    case "differs":
      return `Claude Test did not start its browser helper: ${what ?? "a file"} in ${folder} is not what this version of Claude Code ships. Delete ${folder} and run /claude-test; the next run writes it afresh.`;
    case "linked":
      return `Claude Test did not start its browser helper: ${what ?? folder} is a symbolic link, and it only runs from real folders. Delete that link (not what it points at) and run /claude-test; the next run writes the folder afresh.`;
    case "unwritable":
      return `Claude Test did not start its browser helper: it could not write its files under ${folder}. Check that the folder can be written, or delete it, then run /claude-test.`;
    case "diskless":
      return "Claude Test's browser helper can't run in this session: it runs from files on disk, and this session has no disk of its own.";
    case "no_node":
      return "Claude Test did not start its browser helper: it found no working Node.js, or Node.js took too long to answer. Install Node.js, or set a default Node.js version in your version manager (for example asdf or mise). Then restart Claude Code and run /claude-test.";
  }
}
//@ chunk-mhn0amzz.js:88392-88794 placement
function describeHelperEnvIgnored(ignored) {
  return `Claude Test's browser helper does not use the values that this project's .claude/settings.json or .claude/settings.local.json gives these variables: ${ignored.join(", ")}. It uses your own values instead, or none. To give the helper a value, set it in the shell that starts Claude Code or in your user settings (~/.claude/settings.json). Then restart Claude Code and run /claude-test.`;
}
//@ chunk-mhn0amzz.js:88794-88936 placement
/**
 * 加载标记前缀
 */
var LOAD_MARK_PREFIX = "Claude Test load mark (nothing to do for this line): ";
var REQUEST_NOT_RUN_TEXT = "Claude Test did not run this request. Type /claude-test to run the tests.";
//@ chunk-mhn0amzz.js:88936-89025 placement
/**
 * 让模型只转述并停止
 */
function tellPersonAndStop(message) {
  return `Tell the person exactly this, and stop. Do not run anything: ${message}`;
}
//@ chunk-mhn0amzz.js:89025-89632 placement
/**
 * Claude Test 面板的界面文案：标题 "Claude Test"、空标题常量，以及面板已打开（能画图 / 不能画图）时追加到 skill 文本里的两段说明和「查看报告」链接文字。
 */
var CLAUDE_TEST_TITLE = "Claude Test";
var PANE_TITLE = "";
var PANEL_OPEN_RULE = `

The Claude Test panel is open in this terminal (pane: open): it shows the run live. This skill's panel rule (\xA73 step 6) applies until a newer text of this skill, loaded by a person's /claude-test, comes without this line.`;
var PANEL_OPEN_NO_PICTURES_RULE = `

The Claude Test panel is open in this terminal (pane: open, no pictures): it shows the run live, but this terminal cannot draw its screenshots. This skill's panel rule (\xA73 step 6) applies, with its no-pictures clause, until a newer text of this skill, loaded by a person's /claude-test, comes without this line.`;
var OPEN_REPORT_LABEL = "Open the full report";
//@ chunk-mhn0amzz.js:89632-89653 placement
/**
 * 60000
 */
var PANEL_OPEN_FRESH_MS = 60000;
var PANE_POLL_MS = 1000;
export {
  NO_TESTS_TEXT,
  REPORT_MISSING_TEXT,
  INSTALL_NEEDED_TEXT,
  RUN_BLOCKED_TEXT,
  LOAD_MARK_PREFIX,
  REQUEST_NOT_RUN_TEXT,
  LOGIN_CHANGED_TEXT,
  CLI_ONLY_TEXT,
  ASK_IN_CHAT_TEXT,
  RELOAD_PART_MISSING_TEXT,
  BROWSER_UNAVAILABLE_TEXT,
  NOT_AVAILABLE_NOW_TEXT,
  HELPER_NOT_READY_TEXT,
  TESTS_FAILED_TEXT,
  DUPLICATE_HELPER_TOOLS_TEXT,
  AGENTS_JUST_LOADED_TEXT,
  AGENTS_STILL_LOADING_TEXT,
  AGENTS_NOT_LOADED_TEXT,
  AGENT_START_FAILED_TEXT,
  PANEL_OPEN_RULE,
  PANEL_OPEN_NO_PICTURES_RULE,
  PANE_TITLE,
  OPEN_REPORT_LABEL,
  CLAUDE_TEST_TITLE,
  RUN_STOPPED_TEXT,
  STILL_READYING_TEXT,
  START_HINT_TEXT,
  LOGIN_CHECK_FAILED_TEXT,
  describeHelperEnvIgnored,
  describeHelperFileMismatch,
  formatConflictingPluginText,
  tellPersonAndStop,
  PANEL_OPEN_FRESH_MS,
  PANE_POLL_MS,
};
