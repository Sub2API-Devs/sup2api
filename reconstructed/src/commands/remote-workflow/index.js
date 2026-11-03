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

/**
 * /__remote-workflow 命令对象（local）；描述：Run the workflow script delivered in this session environment (server-launched sessions only)；isHidden: true；实现 chunk-cg8zacmh.js 的 d。
 */
//@ chunk-e6aww6q8.js:2041309-2041603 placement
var remoteWorkflowCommandDefinition = {
    type: "local",
    name: "__remote-workflow",
    description:
      "Run the workflow script delivered in this session environment (server-launched sessions only)",
    isHidden: !0,
    disableModelInvocation: !0,
    supportsNonInteractive: !0,
    load: () => import("./chunk-cg8zacmh.js").then((e) => ({ call: e.call })),
  },
  remoteWorkflowCommand = remoteWorkflowCommandDefinition;
/**
 * /workflow-launch-exec 命令对象（local）；描述：Execute a server-launched workflow handoff (workflow_launch event sessions only)；isHidden: true；实现 chunk-3sew516d.js 的 u。
 */
//@ chunk-e6aww6q8.js:2041603-2041887 placement
var workflowLaunchExecCommandDefinition = {
    type: "local",
    name: "workflow-launch-exec",
    description: "Execute a server-launched workflow handoff (workflow_launch event sessions only)",
    isHidden: !0,
    disableModelInvocation: !0,
    supportsNonInteractive: !0,
    load: () => import("./chunk-3sew516d.js").then((e) => ({ call: e.call })),
  },
  workflowLaunchExecCommand = workflowLaunchExecCommandDefinition;

export { remoteWorkflowCommand, workflowLaunchExecCommand };
