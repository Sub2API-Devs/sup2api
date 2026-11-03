/**
 * plugins/bundled/claudeTest/messages.ts
 *
 * 2.1.316 新增：Claude Test 面向用户与模型的固定文本（不可用原因、插件冲突、助手未就绪）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ae5g0zb5.js (9)
 * attribution: placement 9
 */
import { CC_PLUGIN_CLAUDE_TEST, RELOAD_PLUGINS, IZ } from "./constants.js";

/**
 * 只能在终端 CLI 用、已有浏览器工具等不可用说明。
 */
//@ chunk-ae5g0zb5.js:81518-82782 placement
var CLI_ONLY_TEXT =
    "Claude Test works only in the Claude Code CLI in a terminal, not with claude -p. Open a terminal in your project folder, run claude, and type /claude-test there.",
  xn = `Claude Test did not start: this session already lists browser tools under Claude Test's name. In /plugin, open the Installed tab. Leave ${CC_PLUGIN_CLAUDE_TEST} (builtin) on. If the tab lists another Claude Test plugin, disable that one. If /mcp lists a server named plugin_claude-test_browser (with underscores, not colons), disable it. If you find neither, restart Claude Code. Then run /claude-test.`,
  Xr = `Claude Test cannot run in this session yet: Claude Code did not load its part that starts the browser helper. Type /${RELOAD_PLUGINS} (if it tells you to run it with --force, do that), then /claude-test. If that changes nothing, the usual cause is another enabled Claude Test plugin. In /plugin, open the Installed tab. Leave ${CC_PLUGIN_CLAUDE_TEST} (builtin) on. If the tab lists another Claude Test plugin, disable that one. Then, or if there is none, restart Claude Code.`,
  zr = `To start Claude Test, type /claude-test in the terminal where Claude Code is running. If that does not start it, or from Remote Control, type /${RELOAD_PLUGINS} first, then /claude-test.`,
  Kr = "Claude Test is still getting ready. Type /claude-test in a moment.";
//@ chunk-ae5g0zb5.js:82782-83032 placement
function formatConflictingPluginText(e) {
  return `Claude Test cannot run in this session: another enabled plugin is also named claude-test and loads first: ${e}. Disable or uninstall that one on the Installed tab of /plugin. Leave ${CC_PLUGIN_CLAUDE_TEST} (builtin) on. Then restart Claude Code.`;
}
/**
 * 浏览器助手未就绪、测试代理未启动等提示文本集合。
 */
//@ chunk-ae5g0zb5.js:83032-86068 placement
var HELPER_NOT_READY_TEXT =
    "Claude Test's browser helper is not ready in this session. Type /claude-test to start it and run the tests.",
  qr =
    "Claude Test could not start its test agent in this session, so nothing ran. Type /claude-test to try again. If this message comes back, restart Claude Code.",
  Ht = `Claude Test did not start: its test agents are not loaded in this session. Type /${RELOAD_PLUGINS} (if it tells you to run it with --force, do that), then /claude-test. If this message comes back, restart Claude Code.`,
  jt = "Claude Test did not start: its test agents are still loading. Type /claude-test in a moment.",
  Jr = "Claude Test did not start: its test agents were loaded just now. Type /claude-test to run it.",
  ut =
    "Claude Test is not available in this session right now, so it did not run. If you just changed your login, wait a moment, then type /claude-test again. If you see this message again, restart Claude Code; if it still shows, Claude Test is not available here.",
  ct =
    "Claude Test did not run: the Claude Code login or plan changed since its browser helper started, or could not be checked, so the helper was stopped. Type /claude-test to start it again.",
  Me =
    "Claude Test did not start: it could not check the Claude Code login. Type /claude-test to try again. If this happens again, sign in again with /login, or restart Claude Code.",
  Pn =
    "Claude Test is not ready yet: its browser helper connected, but its tools did not show in time. Run /claude-test. If the helper was only slow to start, that will work.",
  Ln = `Claude Test did not start: its browser helper is switched off for this project. Type /${RELOAD_PLUGINS} (if it tells you to run it with --force, do that), switch ${IZ} on in /mcp, then run /claude-test.`,
  kn = `Claude Test did not start: this session does not connect its browser helper (${IZ}). The cause is how this session was started, or a setting for MCP servers. To see which, start claude with --debug, run /claude-test, and read the line about $.mcp.connect in the debug log (in ~/.claude/debug). If the setting is your organization's, only your administrator can change it.`,
  Nn =
    "Claude Test did not start: its browser helper did not come up. Run /claude-test. If the helper was only slow to start, that will work. If it keeps failing, check that node is installed, and see /mcp for the error; you can reconnect the helper there, then run /claude-test.",
  Wt =
    "Claude Test did not start: Claude Code would not connect its browser helper in this session. Restart Claude Code and run /claude-test. If that fails too, start claude with --debug, run /claude-test, and read the line about $.mcp.connect in the debug log (in ~/.claude/debug); it says why.",
  In =
    "Claude Test did not start: another MCP server in this session already runs Claude Test's browser helper. In /mcp, switch off the server whose Command ends in playwright-mcp.mjs, then run /claude-test.",
  vn = "Starting the Claude Test browser helper.",
  Cn =
    "Claude Test did not start its browser helper: this build of Claude Code cannot check its files, so it starts nothing. Please report this.";
//@ chunk-ae5g0zb5.js:86068-87151 placement
function describeHelperFileMismatch(e, n, r) {
  switch (n) {
    case "differs":
      return `Claude Test did not start its browser helper: ${r ?? "a file"} in ${e} is not what this version of Claude Code ships. Delete ${e} and run /claude-test; the next run writes it afresh.`;
    case "linked":
      return `Claude Test did not start its browser helper: ${r ?? e} is a symbolic link, and it only runs from real folders. Delete that link (not what it points at) and run /claude-test; the next run writes the folder afresh.`;
    case "unwritable":
      return `Claude Test did not start its browser helper: it could not write its files under ${e}. Check that the folder can be written, or delete it, then run /claude-test.`;
    case "diskless":
      return "Claude Test's browser helper can't run in this session: it runs from files on disk, and this session has no disk of its own.";
    case "no_node":
      return "Claude Test did not start its browser helper: it found no working Node.js, or Node.js took too long to answer. Install Node.js, or set a default Node.js version in your version manager (for example asdf or mise). Then restart Claude Code and run /claude-test.";
  }
}
//@ chunk-ae5g0zb5.js:87151-87553 placement
function describeHelperEnvIgnored(e) {
  return `Claude Test's browser helper does not use the values that this project's .claude/settings.json or .claude/settings.local.json gives these variables: ${e.join(", ")}. It uses your own values instead, or none. To give the helper a value, set it in the shell that starts Claude Code or in your user settings (~/.claude/settings.json). Then restart Claude Code and run /claude-test.`;
}
//@ chunk-ae5g0zb5.js:87553-87695 placement
var LOAD_MARK_PREFIX = "Claude Test load mark (nothing to do for this line): ",
  Mn = "Claude Test did not run this request. Type /claude-test to run the tests.";
//@ chunk-ae5g0zb5.js:87695-87784 placement
function Pe(e) {
  return `Tell the person exactly this, and stop. Do not run anything: ${e}`;
}
//@ chunk-ae5g0zb5.js:87784-88391 placement
var CLAUDE_TEST_TITLE = "Claude Test",
  Gt = "",
  jn = `

The Claude Test panel is open in this terminal (pane: open): it shows the run live. This skill's panel rule (\xA73 step 6) applies until a newer text of this skill, loaded by a person's /claude-test, comes without this line.`,
  Wn = `

The Claude Test panel is open in this terminal (pane: open, no pictures): it shows the run live, but this terminal cannot draw its screenshots. This skill's panel rule (\xA73 step 6) applies, with its no-pictures clause, until a newer text of this skill, loaded by a person's /claude-test, comes without this line.`,
  Gn = "Open the full report";
//@ chunk-ae5g0zb5.js:88391-88412 placement
var na = 60000,
  Bn = 1000;

export {
  Nn,
  Wt,
  Ln,
  kn,
  LOAD_MARK_PREFIX,
  Mn,
  ct,
  CLI_ONLY_TEXT,
  Cn,
  Xr,
  Pn,
  ut,
  HELPER_NOT_READY_TEXT,
  In,
  xn,
  Jr,
  jt,
  Ht,
  qr,
  jn,
  Wn,
  Gt,
  Gn,
  CLAUDE_TEST_TITLE,
  vn,
  Kr,
  zr,
  Me,
  describeHelperEnvIgnored,
  describeHelperFileMismatch,
  formatConflictingPluginText,
  Pe,
  na,
  Bn,
};
