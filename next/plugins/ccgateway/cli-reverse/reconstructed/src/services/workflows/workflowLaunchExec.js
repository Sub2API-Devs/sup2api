/**
 * services/workflows/workflowLaunchExec.ts
 *
 * 2.1.316 新增：工作流启动执行。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3sew516d.js (1)
 * attribution: placement 1
 */
import { workflowLaunchHandoffs } from "./workflowLaunchResume.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { runRemoteWorkflow } from "./remoteWorkflow.js";
import { settlePendingAsyncHooks } from "../../utils/hooks/AsyncHookRegistry.js";

//@ chunk-3sew516d.js:12909-13795 placement
/**
 * /workflow-launch-exec 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var HOOK_SETTLE_GRACE_MS = 5000;
var callWorkflowLaunchExec = async (args, context) => {
  let trimmed = args.trim();
  let handoff = trimmed ? workflowLaunchHandoffs.of(context.session.host).take(trimmed) : undefined;
  if (!handoff) {
    logForDiagnosticsNoPII("info", "workflow_launch_exec_no_slot", {});
    return {
      type: "text",
      value:
        "workflow-launch-exec: no pending launch handoff for this invocation (expected when a restored session replays the dispatch turn); nothing executed.",
    };
  }
  let runResult = await runRemoteWorkflow({
    script: handoff.script,
    args: handoff.args,
    telemetrySource: "remote_event",
    serverAuthoredCarrier: true,
    eventSessionOrigin: handoff.eventSessionOrigin,
    context,
  });
  let hookSettle = settlePendingAsyncHooks({
    hookEvent: "SessionStart",
    graceMs: HOOK_SETTLE_GRACE_MS,
  })
    .then(({ pending, delivered }) => {
      if (pending > 0)
        logForDiagnosticsNoPII("info", "workflow_launch_hook_settle", {
          pending,
          delivered,
        });
    })
    .catch(() => {
      logForDiagnosticsNoPII("warn", "workflow_launch_hook_settle_failed", {});
    });
  try {
    await handoff.onRunSettled(runResult.ok);
  } catch {
    logForDiagnosticsNoPII("warn", "workflow_launch_settle_failed", {});
  }
  try {
    handoff.postResultLine(runResult.line);
  } catch {
    logForDiagnosticsNoPII("warn", "workflow_launch_result_post_failed", {});
  }
  await hookSettle;
  return {
    type: "text",
    value: runResult.line,
  };
};
export { callWorkflowLaunchExec };
