/**
 * commands/remote-workflow/index.ts
 *
 * 2.1.316 新增：/remote-workflow 命令对象：在云端运行工作流
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 2, layout 1
 */
import { isProgramUseCaseChoiceEnabled } from "../../utils/programUseCase.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { isCommandEnabled } from "../../commands.js";
import { getProgramUseCaseChoices } from "../../bootstrap/state.js";

//@ chunk-5xgkngpb.js:2097142-2097435 placement
/**
 * /__remote-workflow 命令对象（local）；描述：Run the workflow script delivered in this session environment (server-launched sessions only)；isHidden: true；实现 chunk-cg8zacmh.js 的 d。
 */
var remoteWorkflowCommand = {
  type: "local-jsx",
  name: "use-case",
  description: "Choose the Life Sciences use case that applies to your requests",
  argumentHint: "[use case]",
  availability: ["claude-ai"],
  immediate: true,
  requires: {
    workspace: true,
    ink: true,
  },
  isEnabled: () => isProgramUseCaseChoiceEnabled() && !isRemoteSessionAvailable(),
  get isHidden() {
    return !isCommandEnabled(this) || getProgramUseCaseChoices().length === 0;
  },
};
//@ chunk-5xgkngpb.js:2097435-2097729 layout
var remoteWorkflowHiddenCommand = {
  type: "local",
  name: "__remote-workflow",
  description:
    "Run the workflow script delivered in this session environment (server-launched sessions only)",
  isHidden: true,
  disableModelInvocation: true,
  supportsNonInteractive: true,
  load: () =>
    import("./remote-workflow.js").then((loadedModule) => ({
      call: loadedModule.call,
    })),
};
var workflowLaunchExecCommand = remoteWorkflowHiddenCommand;
//@ chunk-5xgkngpb.js:2097729-2098013 placement
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
    import("../../services/workflows/call.lazy.js").then((mod) => ({
      call: mod.call,
    })),
};
var workflowLaunchExecCommandAlias = workflowLaunchExecCommandDefinition;
export { remoteWorkflowCommand, workflowLaunchExecCommand, workflowLaunchExecCommandAlias };
