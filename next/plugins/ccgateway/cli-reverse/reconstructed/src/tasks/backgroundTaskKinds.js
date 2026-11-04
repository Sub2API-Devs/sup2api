/**
 * tasks/backgroundTaskKinds.ts
 *
 * 2.1.316 新增：后台任务种类常量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */

//@ chunk-e6aww6q8.js:3750553-3750768 placement
var hasRunningBackgroundWorkForAgent = (agentId, taskRegistry) =>
  Object.values(taskRegistry.all()).some((task) => {
    let isRunningBackgroundShell =
      task.type === "local_bash" && Boolean(task.isBackgrounded) && !task.elsewhere;
    return (
      task.status === "running" &&
      (isRunningBackgroundShell || task.type === "monitor_mcp" || task.type === "monitor_ws") &&
      task.agentId === agentId
    );
  });
export { hasRunningBackgroundWorkForAgent };
