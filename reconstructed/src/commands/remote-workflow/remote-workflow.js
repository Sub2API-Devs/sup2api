/**
 * commands/remote-workflow/remote-workflow.ts
 *
 * 2.1.316 新增：/__remote-workflow 命令：仅在 CCR 远程会话中运行环境里下发的工作流脚本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cg8zacmh.js (2)
 * attribution: placement 2
 */
import { oin, workflowPolicyRefusal, runRemoteWorkflow } from "../../services/workflows/remoteWorkflow.js";
import { env } from "../../utils/env.js";
import { REMOTE_WORKFLOW_ENV, CLAUDE_REMOTE_WORKFLOW_ARGS } from "../../services/workflow/loadWorkflows.js";
import { gx } from "../../services/workflow/scriptFile.js";

//@ chunk-cg8zacmh.js:12892-12943 placement
function e(s, t) {
  return { type: "text", value: oin(s, t) };
}
/**
 * /__remote-workflow 命令：仅在 CCR 远程会话中运行环境里下发的工作流脚本。
 */
//@ chunk-cg8zacmh.js:12943-13785 placement
var call = async (args, context) => {
  if (!env.CLAUDE_CODE_REMOTE)
    return e(
      "not-remote-session",
      "this command only runs inside a remote (CCR) session (CLAUDE_CODE_REMOTE is not set). Use the Workflow tool locally.",
    );
  let CLAUDE_REMOTE_WORKFLOW_SCRIPT = env.CLAUDE_REMOTE_WORKFLOW_SCRIPT;
  if (CLAUDE_REMOTE_WORKFLOW_SCRIPT === void 0 || CLAUDE_REMOTE_WORKFLOW_SCRIPT === "")
    return e(
      "env-missing",
      `${REMOTE_WORKFLOW_ENV} is not set. This command is the deterministic entry point for sessions launched with an environment-delivered workflow script; it has no interactive use.`,
    );
  let a = workflowPolicyRefusal();
  if (a) return e("policy-gate", a);
  let l,
    CLAUDE_REMOTE_WORKFLOW_ARGS_2 = env.CLAUDE_REMOTE_WORKFLOW_ARGS;
  if (CLAUDE_REMOTE_WORKFLOW_ARGS_2 !== void 0 && CLAUDE_REMOTE_WORKFLOW_ARGS_2 !== "") {
    if (CLAUDE_REMOTE_WORKFLOW_ARGS_2.length > gx)
      return e("args-too-large", `${CLAUDE_REMOTE_WORKFLOW_ARGS} exceeds ${gx} bytes.`);
    try {
      l = JSON.parse(CLAUDE_REMOTE_WORKFLOW_ARGS_2);
    } catch (error) {
      return e(
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
        args: l,
        telemetrySource: "remote_env",
        context: context,
      })
    ).line,
  };
};
