/**
 * commands/remote-workflow/index.ts
 *
 * 2.1.316 新增：/remote-workflow 命令对象：在云端运行工作流
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
//@ chunk-e6aww6q8.js:2041309-2041603 placement
/**
 * /__remote-workflow 命令对象（local）；描述：Run the workflow script delivered in this session environment (server-launched sessions only)；isHidden: true；实现 chunk-cg8zacmh.js 的 d。
 */
var remoteWorkflowCommandDefinition = {
  type: "local",
  name: "__remote-workflow",
  description:
    "Run the workflow script delivered in this session environment (server-launched sessions only)",
  isHidden: true,
  disableModelInvocation: true,
  supportsNonInteractive: true,
  load: () =>
    import("./chunk-cg8zacmh.js").then((e) => ({
      call: e.call,
    })),
};
var remoteWorkflowCommand = remoteWorkflowCommandDefinition;
//@ chunk-e6aww6q8.js:2041603-2041887 placement
/**
 * /workflow-launch-exec 命令对象（local）；描述：Execute a server-launched workflow handoff (workflow_launch event sessions only)；isHidden: true；实现 chunk-3sew516d.js 的 u。
 */
var workflowLaunchExecCommandDefinition = {
  type: "local",
  name: "workflow-launch-exec",
  description: "Execute a server-launched workflow handoff (workflow_launch event sessions only)",
  isHidden: true,
  disableModelInvocation: true,
  supportsNonInteractive: true,
  load: () =>
    import("./chunk-3sew516d.js").then((e) => ({
      call: e.call,
    })),
};
var workflowLaunchExecCommand = workflowLaunchExecCommandDefinition;
export { remoteWorkflowCommand, workflowLaunchExecCommand };
