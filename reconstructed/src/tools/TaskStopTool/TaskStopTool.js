/**
 * tools/TaskStopTool/TaskStopTool.ts
 *
 * TaskStop 工具（别名 KillShell/KillBash）：停止后台任务/命令，支持远程主机
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/TaskStopTool/TaskStopTool.ts
 * pieces: chunk-kxyd0g16.js (2)
 * attribution: fingerprint 1, affinity 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, o, u } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  attachedMachineInputField,
  Cf,
  hostFieldNotForwardedMessage,
  $r,
} from "../../bridge/deviceRegistration.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { TASKSTOP, TASK_STOP_ALIASES, TASK_STOP_PROMPT } from "./prompt.js";
import { P6, aie, RemoteBackgroundLedger } from "../../services/remoteTools/backgroundCommands.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { resolveTeammateAddress } from "../../utils/swarm/teammateAddressLookup.js";
import { formatTaskNotFoundMessage, gt, stopTask } from "../../tasks/stopTask.js";
import { isWaitingOnChildren } from "../../tasks/LocalAgentTask/keepalive.js";
import { isObserverAgentTask } from "../../tasks/LocalAgentTask/LocalAgentTask.js";

/**
 * TaskStop 工具（别名 KillShell/KillBash，并发安全、shouldDefer）：按 task_id（兼容 shell_id、队友/命名代理名）停止后台任务；远程执行开关（tengu_violin_varnish）下可停远程主机上的后台命令。
 */
//@ chunk-kxyd0g16.js:26589-29286 fingerprint = TaskStopTool (0.542)
var taskStopInputSchema = DoctorLazy(() =>
    zodStrictObject({
      task_id: o()
        .optional()
        .describe(
          "The ID of the background task to stop. Agent-team teammates and named background agents are also accepted by agent ID or name.",
        ),
      shell_id: o().optional().describe("Deprecated: use task_id instead"),
    }),
  ),
  taskStopRemoteInputSchema = DoctorLazy(() => taskStopInputSchema().extend(attachedMachineInputField())),
  taskStopOutputSchema = DoctorLazy(() =>
    u({
      message: o().describe("Status message about the operation"),
      task_id: o().describe("The ID of the task that was stopped"),
      task_type: o().describe("The type of the task that was stopped"),
      command: o().optional().describe("The command or description of the stopped task"),
    }),
  ),
  TaskStopTool = buildTool({
    name: TASKSTOP,
    searchHint: "kill a running background task",
    aliases: [...TASK_STOP_ALIASES],
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    userFacingName: () => "Stop Task",
    get remoteExecution() {
      return { supported: P6() };
    },
    get inputSchema() {
      return P6() ? taskStopRemoteInputSchema() : taskStopInputSchema();
    },
    get outputSchema() {
      return taskStopOutputSchema();
    },
    shouldDefer: !0,
    isConcurrencySafe() {
      return !0;
    },
    toAutoClassifierInput(e) {
      return e.task_id ?? e.shell_id ?? "";
    },
    async description() {
      return "Stop a running background task by ID";
    },
    async prompt() {
      return TASK_STOP_PROMPT;
    },
    mapToolResultToToolResultBlockParam(e, r) {
      return { tool_use_id: r, type: "tool_result", content: jsonStringify(e) };
    },
    renderToolUseMessage() {
      return "";
    },
    create(e) {
      return {
        async validateInput(r, n) {
          let { taskRegistry: taskRegistry, namedAgents: namedAgents } = e;
          if (Cf(r)) return { result: !1, message: hostFieldNotForwardedMessage(), errorCode: 3 };
          let h = r.task_id ?? r.shell_id;
          if (!h) return { result: !1, message: "Missing required parameter: task_id", errorCode: 1 };
          let remoteCall = n.remoteCall;
          if (remoteCall !== void 0)
            return remoteCall.ownBackgroundShells?.holds(h) === !0
              ? { result: !0 }
              : { result: !1, message: formatRemoteShellNotFound(h, remoteCall), errorCode: 1 };
          let k = taskRegistry.get(h),
            w;
          if (!k) {
            let S = resolveTeammateAddress(h, taskRegistry, namedAgents);
            if (S.status === "ambiguous") return { result: !1, message: S.message, errorCode: 1 };
            if (S.status === "found") k = S.task;
            else w = S.suggestion;
          }
          if (!k) {
            let S = aie(e),
              R = P6() ? e.toolState.get(RemoteBackgroundLedger).find(h, S) : void 0;
            return {
              result: !1,
              message:
                R !== void 0
                  ? `Task ${h} needs ${$r}: "${R.hostName}".`
                  : formatTaskNotFoundMessage(h, taskRegistry, namedAgents, w, S),
              errorCode: 1,
            };
          }
          if (k.status !== "running" && !isWaitingOnChildren(k) && !isObserverAgentTask(k) && !gt(k, k.id))
            return { result: !1, message: `Task ${h} is not running (status: ${k.status})`, errorCode: 3 };
          return { result: !0 };
        },
        async call({ task_id: r, shell_id: n }, s) {
          let {
              taskRegistry: taskRegistry,
              setTaskKillState: setTaskKillState,
              namedAgents: namedAgents,
            } = e,
            k = r ?? n;
          if (!k) throw Error("Missing required parameter: task_id");
          let remoteCall = s.remoteCall;
          if (remoteCall !== void 0)
            return {
              data: {
                message:
                  remoteCall.ownBackgroundShells?.stop(k) === !0
                    ? `Successfully stopped background command ${k} on ${remoteCall.origin.hostName}`
                    : formatRemoteShellNotFound(k, remoteCall),
                task_id: k,
                task_type: "local_bash",
              },
            };
          let S = await stopTask(k, {
            taskRegistry: taskRegistry,
            setAppState: setTaskKillState,
            session: e.session,
            getAppState: namedAgents,
            callerAgentId: aie(e),
            killedBy: "parent",
            storageV5: e.storageV5,
          });
          return {
            data: {
              message: S.note
                ? `Task ${S.taskId} ${S.note}`
                : `Successfully stopped task: ${S.taskId} (${S.command})`,
              task_id: S.taskId,
              task_type: S.taskType,
              command: S.command,
            },
          };
        },
      };
    },
  });
/**
 * 远程主机上找不到该后台命令时的提示。
 */
//@ chunk-kxyd0g16.js:29286-29472 affinity
function formatRemoteShellNotFound(e, r) {
  return `No background command with ID ${e} is running on ${r.origin.hostName} for this session: it has already finished or been stopped, or it was never this session's.`;
}

export { TaskStopTool };
