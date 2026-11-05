/**
 * commands/remote-workflow/remote-workflow.ts
 *
 * 2.1.316 新增：/__remote-workflow 命令：仅在 CCR 远程会话中运行环境里下发的工作流脚本。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-dyfxhj5f.js (2)
 * attribution: placement 2
 */
import {
  remoteWorkflowErrorLine,
  workflowPolicyRefusal,
  runRemoteWorkflow,
} from "../../services/workflows/remoteWorkflow.js";
import { env } from "../../utils/env.js";
import { REMOTE_WORKFLOW_ENV, CLAUDE_REMOTE_WORKFLOW_ARGS } from "../../services/workflow/loadWorkflows.js";
import { MAX_SCRIPT_FILE_BYTES } from "../../services/workflow/scriptFile.js";

//@ chunk-dyfxhj5f.js:14096-14147 placement
function remoteWorkflowTextResult(kind, message) {
  return {
    type: "text",
    value: remoteWorkflowErrorLine(kind, message),
  };
}
//@ chunk-dyfxhj5f.js:14147-14989 placement
/**
 * /__remote-workflow 命令：仅在 CCR 远程会话中运行环境里下发的工作流脚本。
 */
var call = async (args, context) => {
  if (!env.CLAUDE_CODE_REMOTE)
    return remoteWorkflowTextResult(
      "not-remote-session",
      "this command only runs inside a remote (CCR) session (CLAUDE_CODE_REMOTE is not set). Use the Workflow tool locally.",
    );
  let CLAUDE_REMOTE_WORKFLOW_SCRIPT = env.CLAUDE_REMOTE_WORKFLOW_SCRIPT;
  if (CLAUDE_REMOTE_WORKFLOW_SCRIPT === undefined || CLAUDE_REMOTE_WORKFLOW_SCRIPT === "")
    return remoteWorkflowTextResult(
      "env-missing",
      `${REMOTE_WORKFLOW_ENV} is not set. This command is the deterministic entry point for sessions launched with an environment-delivered workflow script; it has no interactive use.`,
    );
  let policyRefusal = workflowPolicyRefusal();
  if (policyRefusal) return remoteWorkflowTextResult("policy-gate", policyRefusal);
  let args_2;
  let CLAUDE_REMOTE_WORKFLOW_ARGS_2 = env.CLAUDE_REMOTE_WORKFLOW_ARGS;
  if (CLAUDE_REMOTE_WORKFLOW_ARGS_2 !== undefined && CLAUDE_REMOTE_WORKFLOW_ARGS_2 !== "") {
    if (CLAUDE_REMOTE_WORKFLOW_ARGS_2.length > MAX_SCRIPT_FILE_BYTES)
      return remoteWorkflowTextResult(
        "args-too-large",
        `${CLAUDE_REMOTE_WORKFLOW_ARGS} exceeds ${MAX_SCRIPT_FILE_BYTES} bytes.`,
      );
    try {
      args_2 = JSON.parse(CLAUDE_REMOTE_WORKFLOW_ARGS_2);
    } catch (error) {
      return remoteWorkflowTextResult(
        "args-parse",
        `${CLAUDE_REMOTE_WORKFLOW_ARGS} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return {
    type: "text",
    value: (
      await runRemoteWorkflow({
        script: CLAUDE_REMOTE_WORKFLOW_SCRIPT,
        args: args_2,
        telemetrySource: "remote_env",
        context,
      })
    ).line,
  };
};
export { call };
