/**
 * tasks/LocalShellTask/backgroundNotices.ts
 *
 * 2.1.316 新增。后台任务通知文本。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1bagza07.js (1), chunk-7jxyna5q.js (12), chunk-wrq65rh8.js (24)
 * attribution: placement 37
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  stringSchema,
  discriminatedUnion,
  objectSchema,
  literal,
  array,
  booleanSchema,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { GET_TASK_TOOL_TEXT } from "../../remote/tools/nativeToolErrors.js";
import { isSingleShotPrintSession, isPrintInputClosed, getOriginalCwd } from "../../bootstrap/state.js";
import { getMaxBashTimeoutMs } from "../../utils/timeouts.js";
import { hasBackgroundBashStopAfterReply } from "../../tools/AgentTool/backgroundGates.js";
import { takeLastChars } from "../../utils/stringUtils.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { getHostAgentPolicy } from "../../utils/hostAgentPolicy.js";
import { isPlainNonInteractive } from "../../utils/sessionShape.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1bagza07.js:191-206 placement
/**
 * print 模式等待后台任务的默认上限（600000 ms），可被 CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS 覆盖
 */
var DEFAULT_PRINT_BG_WAIT_CEILING_MS = 600000;
//@ chunk-wrq65rh8.js:1590-1656 placement
/**
 * 取 print 模式等待后台任务的默认上限（环境变量优先）。
 */
function printBackgroundWaitCeilingMs() {
  return env.CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS ?? DEFAULT_PRINT_BG_WAIT_CEILING_MS;
}
//@ chunk-wrq65rh8.js:1656-1703 placement
function isTidySlothGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_sloth", true);
}
//@ chunk-wrq65rh8.js:1703-2666 placement
/**
 * 后台任务被停止（内存压力 / 超时）时的说明文案与给模型的建议。
 */
var BACKGROUND_STOP_REASONS = {
  memory_pressure: "stopped because the system is running low on memory",
  deadline: "stopped after reaching its background time limit",
};
var BACKGROUND_STOP_EXPLANATIONS = {
  memory_pressure:
    "This is not a failure of the command. Claude Code stopped it because the system was critically low on memory while the session was idle, which says nothing about the command or its own memory use, so there is nothing in it to debug. Do not start it again on your own, even if the work seems to need it: memory may still be short. Report what was stopped and why, and start it again only when asked. The user can turn this behavior off by starting Claude Code with CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP=1 in its environment; setting it from a shell command has no effect.",
  deadline:
    "If the work in progress still needs it, start it again with `run_in_background` and a longer `timeout`. If it already had the longest `timeout` allowed, do not restart it. Either way, report that it was stopped.",
};
//@ chunk-wrq65rh8.js:2666-3012 placement
/**
 * GetTask 结果的输出上限与按状态（working、completed、failed、cancelled）区分的 schema。
 */
var MAX_TASK_OUTPUT_CHARS; // deferred: uses stringSchema (../../../vendor/zod/v4/classic/schemas.js) of its import cycle while loading; runs once the cycle is complete
var MAX_TASK_OUTPUT_BYTES;
var GET_TASK_ID_PREFIX;
var taskStatusBaseFields;
var getTaskResultSchema;
deferInit("chunk-wrq65rh8.js:2666", () => {
  MAX_TASK_OUTPUT_CHARS = 12000;
  MAX_TASK_OUTPUT_BYTES = 4 * MAX_TASK_OUTPUT_CHARS;
  GET_TASK_ID_PREFIX = "gettask_";
  taskStatusBaseFields = {
    taskId: stringSchema(),
    statusMessage: stringSchema(),
    createdAt: stringSchema(),
    lastUpdatedAt: stringSchema(),
  };
  getTaskResultSchema = DoctorLazy(() =>
    discriminatedUnion("status", [
      objectSchema({
        ...taskStatusBaseFields,
        status: literal("working"),
      }),
      objectSchema({
        ...taskStatusBaseFields,
        status: literal("completed"),
        result: objectSchema({
          content: array(
            objectSchema({
              type: literal("text"),
              text: stringSchema(),
            }),
          ),
          isError: booleanSchema(),
        }),
      }),
      objectSchema({
        ...taskStatusBaseFields,
        status: literal("failed"),
        error: objectSchema({
          code: numberSchema(),
          message: stringSchema(),
        }),
      }),
      objectSchema({
        ...taskStatusBaseFields,
        status: literal("cancelled"),
      }),
    ]),
  );
});
//@ chunk-wrq65rh8.js:3012-3082 placement
/**
 * 解析任务结果为协议对象，解析失败返回 null。
 */
function parseTaskResultOrNull(value) {
  let parsed = getTaskResultSchema().safeParse(value);
  return parsed.success ? parsed.data : null;
}
//@ chunk-wrq65rh8.js:3082-3114 placement
/**
 * 把任务状态规整为协议字段后序列化成 JSON。
 */
function serializeTaskResult(task) {
  return jsonStringify(toGetTaskResult(task));
}
//@ chunk-wrq65rh8.js:3114-3732 placement
/**
 * 把任务状态对象规整为只含协议字段的 GetTask 结果（按状态选择字段）。
 */
function toGetTaskResult(task) {
  let { taskId, statusMessage, createdAt, lastUpdatedAt } = task;
  switch (task.status) {
    case "working":
      return {
        taskId,
        status: "working",
        statusMessage,
        createdAt,
        lastUpdatedAt,
      };
    case "completed":
      return {
        taskId,
        status: "completed",
        statusMessage,
        createdAt,
        lastUpdatedAt,
        result: {
          content: task.result.content.map(({ type, text }) => ({
            type,
            text,
          })),
          isError: task.result.isError,
        },
      };
    case "failed":
      return {
        taskId,
        status: "failed",
        statusMessage,
        createdAt,
        lastUpdatedAt,
        error: {
          code: task.error.code,
          message: task.error.message,
        },
      };
    case "cancelled":
      return {
        taskId,
        status: "cancelled",
        statusMessage,
        createdAt,
        lastUpdatedAt,
      };
  }
}
//@ chunk-wrq65rh8.js:3732-3843 placement
function describeInterimOutput(outputFile) {
  return outputFile === ""
    ? ""
    : ` Output is being written to ${outputFile}; use ${READ} on that path for interim output.`;
}
//@ chunk-wrq65rh8.js:3843-3891 placement
function fieldNote(label, outputFile) {
  return outputFile === "" ? "" : ` ${label}: ${outputFile}`;
}
//@ chunk-wrq65rh8.js:3891-4793 placement
/**
 * 后台任务「仍在运行」时给模型的几种说明：结果如何送达、属于别的代理、不要重复轮询。
 */
var BACKGROUND_TASK_DELIVERY_TEXT =
  "between your tool calls if you are still working, or by starting a new turn if you have already replied";
var BACKGROUND_DELIVERY_CHANNEL_TEXT = "Its result is delivered to the agent that started it, not to you.";
var OTHER_AGENT_RESULT_NOTE = `Do not call ${GET_TASK_TOOL_TEXT} again for this task: when the command finishes, its result is delivered to you automatically \u2014 ${BACKGROUND_TASK_DELIVERY_TEXT} (usually as a ${GET_TASK_TOOL_TEXT} result, otherwise as a task notification). If that result is all you are waiting for, end your turn; otherwise continue with other work.`;
var DO_NOT_POLL_TASK_TEXT = `Do not call ${GET_TASK_TOOL_TEXT} again for this task: if the command finishes while you are still working, its result is delivered to you automatically between your tool calls (usually as a ${GET_TASK_TOOL_TEXT} result, otherwise as a task notification). If you need that result before you reply and nothing else is left to do, wait with one foreground shell command that blocks until the output file shows what you need; otherwise continue with other work.`;
//@ chunk-wrq65rh8.js:4793-4827 placement
/**
 * 当前是否是单次 print 会话（或输入已关闭）。
 */
function isPrintInputDone() {
  return isSingleShotPrintSession() || isPrintInputClosed();
}
//@ chunk-wrq65rh8.js:4827-4863 placement
/**
 * print 会话且 tidy-sloth 开关关闭（此时才给前台等待建议）。
 */
function isPrintWithoutTidySloth() {
  return isPrintInputDone() && !isTidySlothGateOn();
}
//@ chunk-wrq65rh8.js:4863-5366 placement
/**
 * 后台命令仍在运行时给模型的建议：有其他工作就继续，只剩等待时用一个前台阻塞命令等，下次需要等待的命令放前台运行。
 */
function buildBackgroundWaitAdvice() {
  return `If you still need its result and have other work, keep working \u2014 it reaches you between your tool calls if it exits in time; if waiting for it is all that is left, wait with one foreground shell command that blocks until the output file shows what you need, rather than checking on it repeatedly. Next time, run a command you must wait on in the foreground (with a timeout of up to ${Math.floor(getMaxBashTimeoutMs() / 60000)} minutes) and keep the background for work you can start and forget.`;
}
//@ chunk-wrq65rh8.js:5366-5549 placement
function buildFinishBeforeResponseNotice() {
  return `Its result reaches you only if it finishes while you are still working: it is terminated when you give your final response, and nothing can follow that. ${buildBackgroundWaitAdvice()}`;
}
//@ chunk-wrq65rh8.js:5549-6344 placement
function backgroundTaskNotice(taskId, leadText, { backgroundedByUser = false, ending } = {}) {
  let deliveryAdvice =
    ending === "final_response"
      ? buildBackgroundWaitAdvice()
      : hasBackgroundBashStopAfterReply()
        ? "If it finishes while you are still working, its result is delivered to you automatically between your tool calls, so there is no need to check whether it is done or to sleep; if you need its result before you reply, wait with one foreground shell command that blocks until the output file shows what you need."
        : backgroundedByUser
          ? "Its result is delivered to you automatically when it finishes; carry on without waiting for it."
          : `When it finishes, its result is delivered to you automatically \u2014 ${BACKGROUND_TASK_DELIVERY_TEXT} \u2014 so there is no need to check whether it is done or to sleep; if that result is all you are waiting for, end your turn.`;
  let notice = {
    resultType: "task",
    taskId,
    status: "working",
    statusMessage: `${leadText} ${deliveryAdvice}`,
  };
  return jsonStringify(notice);
}
//@ chunk-wrq65rh8.js:6344-6391 placement
/**
 * 把时间戳转成 ISO 字符串。
 */
function isoTime(startTime) {
  return new Date(startTime).toISOString();
}
//@ chunk-wrq65rh8.js:6391-6585 placement
/**
 * 取任务输出末尾一段，被截断时加上"更早输出已省略"及完整输出路径。
 */
function formatTaskOutputTail({ content, omittedBytes }, elapsedLabel, lowerCase = "full output") {
  let tail = takeLastChars(content, MAX_TASK_OUTPUT_CHARS);
  let wasOmitted = omittedBytes > 0 || tail.length < content.length;
  let tailText = tail.replace(/^\n+/, "").trimEnd();
  return wasOmitted
    ? `[\u2026 earlier output omitted; ${lowerCase}: ${elapsedLabel}]
${tailText}`
    : tailText;
}
//@ chunk-wrq65rh8.js:6585-7275 placement
/**
 * 生成后台 shell 任务的 GetTask 结果：被停止时说明原因（附已有输出位置）；结束时给出退出码、输出尾部与输出文件位置。
 */
function buildShellTaskResult({
  taskId,
  outcome,
  exitCode,
  startTime,
  endTime,
  outputFile,
  output,
  stopCause,
  stopExplanation,
  endNote,
}) {
  let timestamps = {
    createdAt: isoTime(startTime),
    lastUpdatedAt: isoTime(endTime),
  };
  if (outcome === "killed") {
    let stopNote = stopCause
      ? `${BACKGROUND_STOP_REASONS[stopCause]}. ${stopExplanation ?? BACKGROUND_STOP_EXPLANATIONS[stopCause]}`
      : "stopped before it completed.";
    return {
      taskId,
      status: "cancelled",
      statusMessage: `The command was ${stopNote}${fieldNote("Output so far", outputFile)}`,
      ...timestamps,
    };
  }
  let label = endNote?.namesFullerOutput ? "Output" : "Full output";
  let joined = [
    output ? formatTaskOutputTail(output, outputFile, label.toLowerCase()) : "",
    endNote?.note,
  ].filter(Boolean).join(`

`);
  return {
    taskId,
    status: "completed",
    statusMessage:
      exitCode === undefined
        ? `Exited; the exit code is not known.${fieldNote(label, outputFile)}`
        : `Exited with code ${exitCode}.${fieldNote(label, outputFile)}`,
    ...timestamps,
    result: {
      content: joined
        ? [
            {
              type: "text",
              text: joined,
            },
          ]
        : [],
      isError: outcome === "failed",
    },
  };
}
//@ chunk-wrq65rh8.js:7437-8063 placement
/**
 * 由本地 shell 任务状态生成 GetTask 结果：运行中给出仍在运行的提示（视归属给不同建议），完成/失败/被停分别转为结果。
 */
function getShellTaskStatus(task, output, waitContext) {
  switch (task.status) {
    case "pending":
    case "running":
    case "paused":
      return {
        taskId: task.id,
        status: "working",
        statusMessage: `Still running.${describeInterimOutput(task.outputFile)} ${waitContext === "other_agent" ? BACKGROUND_DELIVERY_CHANNEL_TEXT : waitContext ? buildFinishBeforeResponseNotice() : hasBackgroundBashStopAfterReply() ? DO_NOT_POLL_TASK_TEXT : OTHER_AGENT_RESULT_NOTE}`,
        createdAt: isoTime(task.startTime),
        lastUpdatedAt: isoTime(task.startTime),
      };
    case "completed":
    case "failed":
      return buildShellTaskResult({
        taskId: task.id,
        outcome: task.status,
        exitCode: task.isAdopted ? undefined : task.result?.code,
        startTime: task.startTime,
        endTime: task.endTime ?? task.startTime,
        outputFile: task.outputFile,
        output,
      });
    case "killed":
      return buildShellTaskResult({
        taskId: task.id,
        outcome: "killed",
        exitCode: undefined,
        startTime: task.startTime,
        endTime: task.endTime ?? task.startTime,
        outputFile: task.outputFile,
        output: undefined,
      });
  }
}
//@ chunk-wrq65rh8.js:8063-8116 placement
/**
 * 由 uuid 生成任务 id（去掉连字符并加前缀）。
 */
function taskIdFromUuid(uuid) {
  return `${GET_TASK_ID_PREFIX}${uuid.replaceAll("-", "")}`;
}
//@ chunk-wrq65rh8.js:8116-8177 placement
/**
 * 判断字符串是否是任务 id。
 */
function isTaskId(value) {
  return typeof value === "string" && value.startsWith(GET_TASK_ID_PREFIX);
}
//@ chunk-wrq65rh8.js:8177-8211 placement
/**
 * 内层任务 id 的后缀与前导 id 后缀常量。
 */
var INNER_TASK_SUFFIX = ":inner";
var PREAMBLE_TASK_SUFFIX = ":preamble-";
//@ chunk-wrq65rh8.js:8211-8277 placement
/**
 * 去掉任务 id 里的前导后缀。
 */
function stripPreambleSuffix(toolUseId) {
  let index = toolUseId.indexOf(PREAMBLE_TASK_SUFFIX);
  return index === -1 ? toolUseId : toolUseId.slice(0, index);
}
//@ chunk-wrq65rh8.js:8277-8363 placement
/**
 * 内层任务 id 的父任务 id（内层后缀或无法解析时 undefined）。
 */
function parentTaskId(toolUseId) {
  if (toolUseId === undefined) return;
  let stripped = stripPreambleSuffix(toolUseId);
  return stripped.endsWith(INNER_TASK_SUFFIX) ? undefined : sanitizeMarkName(stripped);
}
//@ chunk-7jxyna5q.js:372218-372280 placement
/**
 * 宿主策略是否允许后台命令完成通知。
 */
function backgroundCompletionNoticeEnabled() {
  return !getHostAgentPolicy().backgroundCompletionNoticeDisabled;
}
//@ chunk-7jxyna5q.js:372280-372315 placement
/**
 * 是否应提示「命令结束时不会通知」。
 */
function shouldMentionBackgroundNotice() {
  return backgroundCompletionNoticeEnabled() && !isPlainNonInteractive();
}
//@ chunk-7jxyna5q.js:372315-372557 placement
/**
 * 提示：命令结束时不会通知，需要读输出文件，必要时在命令末尾自行 echo 标记。
 */
var NO_FINISH_NOTIFICATION_NOTICE =
  "Nothing notifies you when the command finishes: read the output file that the result names to check on it. The file gets no line when the command ends, so if you need to know that it has, end the command with an `echo` of your own.";
//@ chunk-7jxyna5q.js:372557-372566 placement
var MAX_NON_NEVER_DROPPED_TASKS = 8;
//@ chunk-7jxyna5q.js:372566-373393 placement
class BackgroundOutputGate {
  #e = [];
  #t = new WeakSet();
  #n = false;
  #i = null;
  #a = null;
  countBackgroundWork = null;
  openGate() {
    this.#n = true;
  }
  get gateOpen() {
    return this.#n;
  }
  markCopyCleared(value) {
    this.#i = value;
  }
  get copyCleared() {
    return this.#i;
  }
  markSyncedFolder(folder) {
    this.#a = folder;
  }
  get syncedFolder() {
    return this.#a;
  }
  stage(text, isNeverDropped = false) {
    let entry = {
      text,
      isNeverDropped,
    };
    let next = [...this.#e.filter((candidate) => candidate.text !== text), entry];
    let dropped = new Set(
      next.filter((candidate) => !candidate.isNeverDropped).slice(0, -MAX_NON_NEVER_DROPPED_TASKS),
    );
    this.#e = next.filter((candidate) => !dropped.has(candidate));
    let stateOf = () => {
      if (this.#e.includes(entry)) return "waiting";
      return this.#t.has(entry) ? "taken" : "gone";
    };
    return {
      get state() {
        return stateOf();
      },
      revise: (replacement) => {
        if (stateOf() !== "waiting") return;
        let nextEntry =
          replacement === null
            ? null
            : {
                text: replacement,
                isNeverDropped,
              };
        this.#e = this.#e.flatMap((existing) =>
          existing !== entry ? [existing] : nextEntry === null ? [] : [nextEntry],
        );
        entry = nextEntry ?? entry;
      },
    };
  }
  get pending() {
    return this.#e.length;
  }
  take() {
    let taken = this.#e;
    this.#e = [];
    taken.forEach((entry) => this.#t.add(entry));
    return taken.map((entry) => entry.text);
  }
}
//@ chunk-7jxyna5q.js:373393-373420 placement
/**
 * 按会话保存的后台输出门。
 */
var backgroundOutputGateSlots; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:373393", () => {
  backgroundOutputGateSlots = new SessionRootSlot(() => new BackgroundOutputGate());
});
//@ chunk-7jxyna5q.js:373420-373470 placement
/**
 * 该会话是否还有未取的后台输出。
 */
function hasPendingBackgroundOutput(session) {
  return (backgroundOutputGateSlots.peek(session)?.pending ?? 0) > 0;
}
//@ chunk-7jxyna5q.js:373470-373518 placement
/**
 * 该会话的后台输出门是否已打开。
 */
function isBackgroundOutputGateOpen(session) {
  return backgroundOutputGateSlots.peek(session)?.gateOpen ?? false;
}
//@ chunk-7jxyna5q.js:373518-373547 placement
/**
 * 对外导出的后台输出门查询。
 */
function backgroundOutputGateOpen(session) {
  return isBackgroundOutputGateOpen(session);
}
//@ chunk-7jxyna5q.js:373547-373575 placement
/**
 * 任务级 cwd 覆盖（当前恒为 null 的预留）。
 */
function taskCwdOverride(session) {
  return null;
}
//@ chunk-7jxyna5q.js:373575-373611 placement
/**
 * 任务的工作目录，缺省回退到原始 cwd。
 */
function taskCwd(session) {
  return taskCwdOverride(session) ?? getOriginalCwd();
}
//@ chunk-7jxyna5q.js:373611-373665 placement
/**
 * 任务输出副本被清理的时间（未清理为 null）。
 */
function taskCopyClearedAt(session) {
  return backgroundOutputGateSlots.peek(session)?.copyCleared ?? null;
}
export {
  BACKGROUND_STOP_EXPLANATIONS,
  isTidySlothGateOn,
  isTaskId,
  parseTaskResultOrNull,
  taskIdFromUuid,
  serializeTaskResult,
  INNER_TASK_SUFFIX,
  printBackgroundWaitCeilingMs,
  backgroundOutputGateSlots,
  taskCopyClearedAt,
  taskCwdOverride,
  PREAMBLE_TASK_SUFFIX,
  backgroundTaskNotice,
  backgroundCompletionNoticeEnabled,
  parentTaskId,
  isPrintWithoutTidySloth,
  isPrintInputDone,
  shouldMentionBackgroundNotice,
  taskCwd,
  NO_FINISH_NOTIFICATION_NOTICE,
  buildShellTaskResult,
  BACKGROUND_STOP_REASONS,
  stripPreambleSuffix,
  formatTaskOutputTail,
  MAX_TASK_OUTPUT_BYTES,
  getTaskResultSchema,
  getShellTaskStatus,
  backgroundOutputGateOpen,
  hasPendingBackgroundOutput,
  DEFAULT_PRINT_BG_WAIT_CEILING_MS,
};
