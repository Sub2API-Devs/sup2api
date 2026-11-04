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
import { zodStrictObject, stringSchema, objectSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-kxyd0g16.js:26589-29286 fingerprint = TaskStopTool (0.542)
/**
 * TaskStop 工具（别名 KillShell/KillBash，并发安全、shouldDefer）：按 task_id（兼容 shell_id、队友/命名代理名）停止后台任务；远程执行开关（tengu_violin_varnish）下可停远程主机上的后台命令。
 */
var taskStopInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var taskStopRemoteInputSchema;
var taskStopOutputSchema;
var TaskStopTool;
deferInit("chunk-kxyd0g16.js:26589", () => {
  taskStopInputSchema = DoctorLazy(() =>
    zodStrictObject({
      task_id: stringSchema()
        .optional()
        .describe(
          "The ID of the background task to stop. Agent-team teammates and named background agents are also accepted by agent ID or name.",
        ),
      shell_id: stringSchema().optional().describe("Deprecated: use task_id instead"),
    }),
  );
  taskStopRemoteInputSchema = DoctorLazy(() => taskStopInputSchema().extend(attachedMachineInputField()));
  taskStopOutputSchema = DoctorLazy(() =>
    objectSchema({
      message: stringSchema().describe("Status message about the operation"),
      task_id: stringSchema().describe("The ID of the task that was stopped"),
      task_type: stringSchema().describe("The type of the task that was stopped"),
      command: stringSchema().optional().describe("The command or description of the stopped task"),
    }),
  );
  TaskStopTool = buildTool({
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
    create(toolContext) {
      return {
        async validateInput(input, callOptions) {
          let { taskRegistry, namedAgents } = toolContext;
          if (hasHostField(input))
            return {
              result: false,
              message: hostFieldNotForwardedMessage(),
              errorCode: 3,
            };
          let targetTaskId = input.task_id ?? input.shell_id;
          if (!targetTaskId)
            return {
              result: false,
              message: "Missing required parameter: task_id",
              errorCode: 1,
            };
          let remoteCall = callOptions.remoteCall;
          if (remoteCall !== undefined)
            return remoteCall.ownBackgroundShells?.holds(targetTaskId) === true
              ? {
                  result: true,
                }
              : {
                  result: false,
                  message: formatRemoteShellNotFound(targetTaskId, remoteCall),
                  errorCode: 1,
                };
          let task = taskRegistry.get(targetTaskId);
          let suggestion;
          if (!task) {
            let teammateAddress = resolveTeammateAddress(targetTaskId, taskRegistry, namedAgents);
            if (teammateAddress.status === "ambiguous")
              return {
                result: false,
                message: teammateAddress.message,
                errorCode: 1,
              };
            if (teammateAddress.status === "found") task = teammateAddress.task;
            else suggestion = teammateAddress.suggestion;
          }
          if (!task) {
            let agentId = currentAgentId(toolContext);
            let remoteEntry = isViolinVarnishOn()
              ? toolContext.toolState.get(RemoteBackgroundLedger).find(targetTaskId, agentId)
              : undefined;
            return {
              result: false,
              message:
                remoteEntry !== undefined
                  ? `Task ${targetTaskId} needs ${HOST_TOOL_INPUT_FIELD}: "${remoteEntry.hostName}".`
                  : formatTaskNotFoundMessage(targetTaskId, taskRegistry, namedAgents, suggestion, agentId),
              errorCode: 1,
            };
          }
          if (
            task.status !== "running" &&
            !isWaitingOnChildren(task) &&
            !isObserverAgentTask(task) &&
            !isSettledAgentAwaitingLoop(task, task.id)
          )
            return {
              result: false,
              message: `Task ${targetTaskId} is not running (status: ${task.status})`,
              errorCode: 3,
            };
          return {
            result: true,
          };
        },
        async call({ task_id, shell_id }, callOptions) {
          let { taskRegistry, setTaskKillState, namedAgents } = toolContext;
          let targetTaskId = task_id ?? shell_id;
          if (!targetTaskId) throw Error("Missing required parameter: task_id");
          let remoteCall = callOptions.remoteCall;
          if (remoteCall !== undefined)
            return {
              data: {
                message:
                  remoteCall.ownBackgroundShells?.stop(targetTaskId) === true
                    ? `Successfully stopped background command ${targetTaskId} on ${remoteCall.origin.hostName}`
                    : formatRemoteShellNotFound(targetTaskId, remoteCall),
                task_id: targetTaskId,
                task_type: "local_bash",
              },
            };
          let stopResult = await stopTask(targetTaskId, {
            taskRegistry,
            setAppState: setTaskKillState,
            session: toolContext.session,
            getAppState: namedAgents,
            callerAgentId: currentAgentId(toolContext),
            killedBy: "parent",
            storageV5: toolContext.storageV5,
          });
          return {
            data: {
              message: stopResult.note
                ? `Task ${stopResult.taskId} ${stopResult.note}`
                : `Successfully stopped task: ${stopResult.taskId} (${stopResult.command})`,
              task_id: stopResult.taskId,
              task_type: stopResult.taskType,
              command: stopResult.command,
            },
          };
        },
      };
    },
  });
});
//@ chunk-kxyd0g16.js:29286-29472 affinity
/**
 * 远程主机上找不到该后台命令时的提示。
 */
function formatRemoteShellNotFound(taskId, remoteCall) {
  return `No background command with ID ${taskId} is running on ${remoteCall.origin.hostName} for this session: it has already finished or been stopped, or it was never this session's.`;
}
export { TaskStopTool };
