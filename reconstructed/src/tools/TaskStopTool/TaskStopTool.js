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
import { zodStrictObject, string, u } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  attachedMachineInputField,
  hasHostField,
  hostFieldNotForwardedMessage,
  HOST_TOOL_INPUT_FIELD,
} from "../../bridge/deviceRegistration.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { TASKSTOP, TASK_STOP_ALIASES, TASK_STOP_PROMPT } from "./prompt.js";
import {
  isViolinVarnishOn,
  currentAgentId,
  RemoteBackgroundLedger,
} from "../../services/remoteTools/backgroundCommands.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { resolveTeammateAddress } from "../../utils/swarm/teammateAddressLookup.js";
import { formatTaskNotFoundMessage, isSettledAgentAwaitingLoop, stopTask } from "../../tasks/stopTask.js";
import { isWaitingOnChildren } from "../../tasks/LocalAgentTask/keepalive.js";
import { isObserverAgentTask } from "../../tasks/LocalAgentTask/LocalAgentTask.js";

//@ chunk-kxyd0g16.js:26589-29286 fingerprint = TaskStopTool (0.542)
/**
 * TaskStop 工具（别名 KillShell/KillBash，并发安全、shouldDefer）：按 task_id（兼容 shell_id、队友/命名代理名）停止后台任务；远程执行开关（tengu_violin_varnish）下可停远程主机上的后台命令。
 */
var taskStopInputSchema = DoctorLazy(() =>
  zodStrictObject({
    task_id: string()
      .optional()
      .describe(
        "The ID of the background task to stop. Agent-team teammates and named background agents are also accepted by agent ID or name.",
      ),
    shell_id: string().optional().describe("Deprecated: use task_id instead"),
  }),
);
var taskStopRemoteInputSchema = DoctorLazy(() => taskStopInputSchema().extend(attachedMachineInputField()));
var taskStopOutputSchema = DoctorLazy(() =>
  u({
    message: string().describe("Status message about the operation"),
    task_id: string().describe("The ID of the task that was stopped"),
    task_type: string().describe("The type of the task that was stopped"),
    command: string().optional().describe("The command or description of the stopped task"),
  }),
);
var TaskStopTool = buildTool({
  name: TASKSTOP,
  searchHint: "kill a running background task",
  aliases: [...TASK_STOP_ALIASES],
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  userFacingName: () => "Stop Task",
  get remoteExecution() {
    return {
      supported: isViolinVarnishOn(),
    };
  },
  get inputSchema() {
    return isViolinVarnishOn() ? taskStopRemoteInputSchema() : taskStopInputSchema();
  },
  get outputSchema() {
    return taskStopOutputSchema();
  },
  shouldDefer: true,
  isConcurrencySafe() {
    return true;
  },
  toAutoClassifierInput(input) {
    return input.task_id ?? input.shell_id ?? "";
  },
  async description() {
    return "Stop a running background task by ID";
  },
  async prompt() {
    return TASK_STOP_PROMPT;
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    return {
      tool_use_id: toolUseID,
      type: "tool_result",
      content: jsonStringify(output),
    };
  },
  renderToolUseMessage() {
    return "";
  },
  create(e) {
    return {
      async validateInput(r, n) {
        let { taskRegistry, namedAgents } = e;
        if (hasHostField(r))
          return {
            result: false,
            message: hostFieldNotForwardedMessage(),
            errorCode: 3,
          };
        let h = r.task_id ?? r.shell_id;
        if (!h)
          return {
            result: false,
            message: "Missing required parameter: task_id",
            errorCode: 1,
          };
        let remoteCall = n.remoteCall;
        if (remoteCall !== undefined)
          return remoteCall.ownBackgroundShells?.holds(h) === true
            ? {
                result: true,
              }
            : {
                result: false,
                message: formatRemoteShellNotFound(h, remoteCall),
                errorCode: 1,
              };
        let k = taskRegistry.get(h);
        let w;
        if (!k) {
          let teammateAddress = resolveTeammateAddress(h, taskRegistry, namedAgents);
          if (teammateAddress.status === "ambiguous")
            return {
              result: false,
              message: teammateAddress.message,
              errorCode: 1,
            };
          if (teammateAddress.status === "found") k = teammateAddress.task;
          else w = teammateAddress.suggestion;
        }
        if (!k) {
          let S = currentAgentId(e);
          let R = isViolinVarnishOn() ? e.toolState.get(RemoteBackgroundLedger).find(h, S) : undefined;
          return {
            result: false,
            message:
              R !== undefined
                ? `Task ${h} needs ${HOST_TOOL_INPUT_FIELD}: "${R.hostName}".`
                : formatTaskNotFoundMessage(h, taskRegistry, namedAgents, w, S),
            errorCode: 1,
          };
        }
        if (
          k.status !== "running" &&
          !isWaitingOnChildren(k) &&
          !isObserverAgentTask(k) &&
          !isSettledAgentAwaitingLoop(k, k.id)
        )
          return {
            result: false,
            message: `Task ${h} is not running (status: ${k.status})`,
            errorCode: 3,
          };
        return {
          result: true,
        };
      },
      async call({ task_id, shell_id }, s) {
        let { taskRegistry, setTaskKillState, namedAgents } = e;
        let k = task_id ?? shell_id;
        if (!k) throw Error("Missing required parameter: task_id");
        let remoteCall = s.remoteCall;
        if (remoteCall !== undefined)
          return {
            data: {
              message:
                remoteCall.ownBackgroundShells?.stop(k) === true
                  ? `Successfully stopped background command ${k} on ${remoteCall.origin.hostName}`
                  : formatRemoteShellNotFound(k, remoteCall),
              task_id: k,
              task_type: "local_bash",
            },
          };
        let S = await stopTask(k, {
          taskRegistry,
          setAppState: setTaskKillState,
          session: e.session,
          getAppState: namedAgents,
          callerAgentId: currentAgentId(e),
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
//@ chunk-kxyd0g16.js:29286-29472 affinity
/**
 * 远程主机上找不到该后台命令时的提示。
 */
function formatRemoteShellNotFound(e, remoteCall) {
  return `No background command with ID ${e} is running on ${remoteCall.origin.hostName} for this session: it has already finished or been stopped, or it was never this session's.`;
}
export { TaskStopTool };
