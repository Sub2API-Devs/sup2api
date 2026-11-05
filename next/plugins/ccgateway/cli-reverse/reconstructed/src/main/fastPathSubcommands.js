/**
 * main/fastPathSubcommands.ts
 *
 * 2.1.316 新增：启动快速路径子命令判定（plugins、upgrade 等）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-egde1fa3.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-egde1fa3.js:191-260 placement
/**
 * 需要走快速路径的顶层子命令集合。
 */
var FAST_PATH_SUBCOMMANDS = new Set(["update", "upgrade", "doctor", "forward-home-settings"]);
//@ chunk-egde1fa3.js:260-283 placement
/**
 * 插件相关快速路径的占位判定，当前恒返回 false。
 */
function isPluginsFastPathArg(arg) {
  return false;
}
//@ chunk-egde1fa3.js:283-352 placement
/**
 * 参数里是否有 mcp serve
 */
function isMcpServe(args) {
  let index = args.indexOf("mcp");
  return index !== -1 && args[index + 1] === "serve";
}
//@ chunk-egde1fa3.js:352-432 placement
/**
 * agents 后跟 --json
 */
function isAgentsJson(args) {
  let index = args.indexOf("agents");
  return index !== -1 && args.includes("--json", index + 1);
}
//@ chunk-egde1fa3.js:432-515 placement
/**
 * plugin/plugins 后跟 eval
 */
function isPluginEval(args) {
  return args.some((arg, index) => (arg === "plugin" || arg === "plugins") && args[index + 1] === "eval");
}
//@ chunk-egde1fa3.js:515-580 placement
/**
 * remote-control 或 rc
 */
function isRemoteControlCommand(args) {
  return args.some((arg) => arg === "remote-control" || arg === "rc");
}
export {
  FAST_PATH_SUBCOMMANDS,
  isAgentsJson,
  isMcpServe,
  isPluginEval,
  isPluginsFastPathArg,
  isRemoteControlCommand,
};
