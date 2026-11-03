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
var hasRunningBackgroundWorkForAgent = (e, taskRegistry) =>
  Object.values(taskRegistry.all()).some((r) => {
    let s = r.type === "local_bash" && Boolean(r.isBackgrounded) && !r.elsewhere;
    return (
      r.status === "running" && (s || r.type === "monitor_mcp" || r.type === "monitor_ws") && r.agentId === e
    );
  });
export { hasRunningBackgroundWorkForAgent };
