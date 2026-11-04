/**
 * commands/tasks/index.ts
 *
 * /tasks（别名 bashes）命令对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/tasks/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-e6aww6q8.js:1736196-1736380 fingerprint = tasks (0.646)
/**
 * /tasks 命令对象（local-jsx）；描述：View and manage everything running in the background；别名 ["bashes"]；实现 chunk-pw933apk.js 的 i。
 */
var tasksCommandDefinition = {
  type: "local-jsx",
  name: "tasks",
  aliases: ["bashes"],
  description: "View and manage everything running in the background",
  immediate: true,
  thinClientDispatch: "control-request",
};
var tasksCommand = tasksCommandDefinition;
export { tasksCommand };
