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

/**
 * /workflow-launch-exec 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-3sew516d.js:12909-13795 placement
var HOOK_SETTLE_GRACE_MS = 5000,
  callWorkflowLaunchExec = async (args, context) => {
    let trimmed = args.trim(),
      e = trimmed ? workflowLaunchHandoffs.of(context.session.host).take(trimmed) : void 0;
    if (!e)
      return (
        logForDiagnosticsNoPII("info", "workflow_launch_exec_no_slot", {}),
        {
          type: "text",
          value:
            "workflow-launch-exec: no pending launch handoff for this invocation (expected when a restored session replays the dispatch turn); nothing executed.",
        }
      );
    let o = await runRemoteWorkflow({
        script: e.script,
        args: e.args,
        telemetrySource: "remote_event",
        serverAuthoredCarrier: !0,
        eventSessionOrigin: e.eventSessionOrigin,
        context: context,
      }),
      a = settlePendingAsyncHooks({ hookEvent: "SessionStart", graceMs: HOOK_SETTLE_GRACE_MS })
        .then(({ pending: pending, delivered: delivered }) => {
          if (pending > 0)
            logForDiagnosticsNoPII("info", "workflow_launch_hook_settle", {
              pending: pending,
              delivered: delivered,
            });
        })
        .catch(() => {
          logForDiagnosticsNoPII("warn", "workflow_launch_hook_settle_failed", {});
        });
    try {
      await e.onRunSettled(o.ok);
    } catch {
      logForDiagnosticsNoPII("warn", "workflow_launch_settle_failed", {});
    }
    try {
      e.postResultLine(o.line);
    } catch {
      logForDiagnosticsNoPII("warn", "workflow_launch_result_post_failed", {});
    }
    return (await a, { type: "text", value: o.line });
  };
