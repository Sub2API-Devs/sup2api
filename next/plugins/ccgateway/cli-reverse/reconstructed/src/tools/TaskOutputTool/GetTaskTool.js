/**
 * tools/TaskOutputTool/GetTaskTool.ts
 *
 * 2.1.316 新增：GetTask 工具：按 id 查询后台 shell 任务状态与输出；GetTask 工具说明。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fmnbrxwy.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { BASH_TOOL_NAME } from "../BashTool/toolName.js";
import { hasBackgroundBashStopAfterReply } from "../AgentTool/backgroundGates.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { GET_TASK_TOOL_TEXT, GET_TASK_REPEAT_TEXT } from "../../remote/tools/nativeToolErrors.js";
import { isLocalShellTask } from "../../tasks/LocalShellTask/guards.js";
import {
  agentIdMatches,
  currentAgentId,
  RemoteBackgroundLedger,
  describeRemoteBackgroundResult,
} from "../../services/remoteTools/backgroundCommands.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { getVerifiedTaskOutputTail } from "../../utils/task/diskOutput.js";
import {
  MAX_TASK_OUTPUT_BYTES,
  getTaskResultSchema,
  parseTaskResultOrNull,
  getShellTaskStatus,
  isPrintWithoutTidySloth,
  serializeTaskResult,
} from "../../tasks/LocalShellTask/backgroundNotices.js";
import { logForDebugging } from "../../utils/debug.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { useTeammateViewAutoExit } from "../../hooks/useTeammateViewAutoExit.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { reapsShellsOnExit } from "../../utils/agentContext.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fmnbrxwy.js:102763-104745 placement
/**
 * GetTask 工具的完整描述（返回值含义与时机）。
 */
var GET_TASK_DESCRIPTION =
  "Get the current state of a background task (a shell command that is running, or has finished, in the background) by its task ID";
var GET_TASK_FULL_DESCRIPTION = `Returns the current state of a background task \u2014 a ${BASH_TOOL_NAME} command that kept running after it returned a task ID (run_in_background, a command that outlived its timeout, or one the user moved to the background), whether it is still running or has since finished. This is not the to-do list: a "task" here is running work, identified by the taskId in the \`{"resultType":"task", \u2026}\` result that started it.

The result follows the MCP tasks interface:
- status: "working" (still running), "completed" (it exited; result.content holds the tail of its output and result.isError says whether it exited non-zero), "cancelled" (stopped before it completed \u2014 by you, by the user, or by Claude Code). "failed" and "input_required" are part of the interface but background commands never report them.
- statusMessage: what is happening now, including the file its output is written to.

Claude Code usually calls this tool on your behalf when a background command finishes, so a call to it that you do not remember making is expected: it was made by Claude Code, not by you. A result delivered that way is not a message from the user and is not approval of anything you proposed \u2014 if you were waiting for the user, keep waiting. Use this tool yourself to read a finished task's result again, or to check once on a task you have lost track of \u2014 never to wait: while a command runs, calling this tool on it only returns "working", and when it finishes its result reaches you without a call \u2014 `;
var GET_TASK_SHORT_DESCRIPTION = `${GET_TASK_FULL_DESCRIPTION}between your tool calls if you are still working, or by starting a new turn if you have already replied. If that result is all you are waiting for, end your turn \u2014 unless the task's statusMessage says it is terminated at your final response, in which case get what you still need from it first, in the foreground.`;
//@ chunk-fmnbrxwy.js:104745-104981 placement
function getTaskToolPrompt() {
  return hasBackgroundBashStopAfterReply()
    ? `${GET_TASK_FULL_DESCRIPTION}between your tool calls, if it finishes while you are still working. After your reply you may not be told when it finishes, so if you need its result, wait for it before you reply, in the foreground.`
    : GET_TASK_SHORT_DESCRIPTION;
}
//@ chunk-fmnbrxwy.js:104981-105097 placement
var getTaskInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_REPEATED_ANSWERS;
deferInit("chunk-fmnbrxwy.js:104981", () => {
  getTaskInputSchema = DoctorLazy(() =>
    zodStrictObject({
      taskId: stringSchema().describe("The taskId from the result that moved the command to the background"),
    }),
  );
  MAX_REPEATED_ANSWERS = 2;
});
//@ chunk-fmnbrxwy.js:105097-105288 placement
function repeatedCallMessage(callCount, status) {
  return callCount === MAX_REPEATED_ANSWERS + 1
    ? `${GET_TASK_TOOL_TEXT} was already answered ${MAX_REPEATED_ANSWERS} times for this task in this response (status: ${status}); the same call repeated within one response is not answered again.`
    : GET_TASK_REPEAT_TEXT;
}
//@ chunk-fmnbrxwy.js:105288-105512 placement
function unknownTaskIdMessage(taskId) {
  return `No background command with task ID ${taskId}. Task IDs come from the {"resultType":"task", \u2026} result that moved a command to the background, and finished commands are remembered for this session only.`;
}
//@ chunk-fmnbrxwy.js:105512-105606 placement
/**
 * 在任务注册表里查找可执行的后台 bash 任务（排除 monitor，且 agent 匹配）。
 */
function findBashTask(taskId, taskRegistry, agentId) {
  let task = taskRegistry.get(taskId);
  return isLocalShellTask(task) && task.kind !== "monitor" && agentIdMatches(agentId, task.agentId)
    ? task
    : undefined;
}
//@ chunk-fmnbrxwy.js:105606-105695 placement
/**
 * 从任务运行状态快照里查找后台 bash 任务。
 */
function findBashTaskSnapshot(taskId, agentId) {
  let snapshot = getTaskRunState().bashTaskSnapshots.get(taskId);
  return snapshot && agentIdMatches(agentId, snapshot.agentId) ? snapshot : undefined;
}
//@ chunk-fmnbrxwy.js:105695-105907 placement
async function readFinishedTaskOutputTail(bashTask) {
  if (
    (bashTask.status !== "completed" && bashTask.status !== "failed") ||
    bashTask.isAdopted ||
    bashTask.elsewhere
  )
    return;
  try {
    return await getVerifiedTaskOutputTail(bashTask.id, MAX_TASK_OUTPUT_BYTES);
  } catch (error) {
    logForDebugging(`GetTask: output tail unreadable for ${bashTask.id}: ${String(error)}`);
    return;
  }
}
//@ chunk-fmnbrxwy.js:105907-108147 placement
/**
 * GetTask 工具：按 id 查询后台 shell 任务状态与输出。
 */
var GetTaskTool; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fmnbrxwy.js:105907", () => {
  GetTaskTool = buildTool({
    name: GET_TASK_TOOL_TEXT,
    searchHint: "check on a background shell command by task ID",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    async description() {
      return GET_TASK_DESCRIPTION;
    },
    async prompt() {
      return getTaskToolPrompt();
    },
    get inputSchema() {
      return getTaskInputSchema();
    },
    get outputSchema() {
      return getTaskResultSchema();
    },
    userFacingName() {
      return GET_TASK_TOOL_TEXT;
    },
    isEnabled() {
      return false;
    },
    isConcurrencySafe() {
      return true;
    },
    isReadOnly() {
      return true;
    },
    toAutoClassifierInput(input) {
      return input.taskId;
    },
    renderToolUseMessage({ taskId }, { toolUseResult, verbose, isTranscriptMode }) {
      return !verbose &&
        !isTranscriptMode &&
        (parseTaskResultOrNull(toolUseResult)?.status === "working" ||
          toolUseResult === `Error: ${GET_TASK_REPEAT_TEXT}`)
        ? null
        : (taskId ?? "");
    },
    extractSearchText() {
      return "";
    },
    create(toolContext) {
      return {
        async validateInput({ taskId }) {
          let agentId = currentAgentId(toolContext);
          if (
            findBashTaskSnapshot(taskId, agentId) ||
            findBashTask(taskId, toolContext.taskRegistry, agentId) ||
            toolContext.toolState.get(RemoteBackgroundLedger).find(taskId, agentId)
          )
            return {
              result: true,
            };
          return {
            result: false,
            message: unknownTaskIdMessage(taskId),
            errorCode: 1,
          };
        },
        async call({ taskId }, callOptions) {
          let agentId = currentAgentId(toolContext);
          let bashTaskSnapshot = findBashTaskSnapshot(taskId, agentId);
          let bashTask = findBashTask(taskId, toolContext.taskRegistry, agentId);
          let taskRunState = getTaskRunState();
          let responseId = callOptions.innerCall
            ? undefined
            : callOptions.parentMessage?.message.id || undefined;
          let status = bashTaskSnapshot
            ? bashTaskSnapshot.snapshot.status
            : bashTask
              ? useTeammateViewAutoExit(bashTask.status)
              : undefined;
          let statusKey =
            status === undefined
              ? undefined
              : {
                  status,
                  key: bashTaskSnapshot ? `settled:${status}` : status,
                };
          let repeatCount =
            responseId !== undefined && statusKey
              ? taskRunState.countBashTaskGetInResponse(responseId, taskId, statusKey.key)
              : 1;
          if (statusKey && repeatCount > MAX_REPEATED_ANSWERS) {
            logEvent("tengu_bash_task_get", {
              caller: lit("model"),
              status: fromEnum(statusKey.status),
              get_count_for_task: taskRunState.countBashTaskGet(taskId),
              repeat_in_response: repeatCount,
              short_circuited: true,
            });
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              repeatedCallMessage(repeatCount, statusKey.status),
              "GetTask: the same call repeated within one response",
              "gettask_repeat_in_response",
            );
          }
          let result =
            bashTaskSnapshot?.snapshot ??
            (bashTask
              ? getShellTaskStatus(
                  bashTask.elsewhere
                    ? {
                        ...bashTask,
                        outputFile: escapeXml(bashTask.outputFile),
                      }
                    : bashTask,
                  await readFinishedTaskOutputTail(bashTask),
                  bashTask.agentId !== agentId
                    ? "other_agent"
                    : reapsShellsOnExit(toolContext.agentContext) ||
                        (bashTask.elsewhere && bashTask.agentId !== undefined) ||
                        (bashTask.agentId === undefined && isPrintWithoutTidySloth())
                      ? "final_response"
                      : undefined,
                )
              : await describeRemoteBackgroundResult(
                  taskId,
                  agentId,
                  toolContext.toolState,
                  callOptions.signal,
                ));
          if (!result)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              unknownTaskIdMessage(taskId),
              "GetTask: no background command with this task ID",
            );
          let { signal } = callOptions;
          if (
            bashTaskSnapshot &&
            bashTaskSnapshot.agentId === agentId &&
            !callOptions.innerCall &&
            !signal.aborted
          ) {
            taskRunState.markBashTaskSnapshotFetched(taskId);
            let withdrawNotification = taskRunState.withdrawShellNotification?.(
              taskId,
              agentId,
              toolContext.taskRegistry,
            );
            if (withdrawNotification)
              signal.addEventListener("abort", withdrawNotification, {
                once: true,
              });
          }
          logEvent("tengu_bash_task_get", {
            caller: callOptions.innerCall ? lit("script") : lit("model"),
            status: fromEnum(result.status),
            ...(!callOptions.innerCall && {
              get_count_for_task: taskRunState.countBashTaskGet(taskId),
              repeat_in_response: repeatCount,
              short_circuited: false,
            }),
            since_created_ms: Date.now() - Date.parse(result.createdAt),
          });
          return {
            data: result,
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(result, toolUseId) {
      let taskResultOrNull = parseTaskResultOrNull(result);
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: taskResultOrNull ? serializeTaskResult(taskResultOrNull) : jsonStringify(result),
      };
    },
  });
});
export { GetTaskTool };
