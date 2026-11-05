/**
 * tasks/backgroundTaskKinds.ts
 *
 * 2.1.316 新增：后台任务种类常量
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 */

//@ chunk-5xgkngpb.js:3846306-3846521 placement
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
