/**
 * commands/tasks/index.ts
 *
 * /tasks（别名 bashes）命令对象
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/tasks/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-5xgkngpb.js:1811647-1811831 fingerprint (2.1.88 match: tasks, 0.646)
var tasksCommand = {
  type: "local-jsx",
  name: "tasks",
  aliases: ["bashes"],
  description: "View and manage everything running in the background",
  immediate: true,
  thinClientDispatch: "control-request",
};
var tasksCommandAlias = tasksCommand;
export { tasksCommandAlias };
