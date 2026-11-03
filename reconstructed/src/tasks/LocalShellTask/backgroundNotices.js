/**
 * tasks/LocalShellTask/backgroundNotices.ts
 *
 * 2.1.316 新增。后台任务通知文本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-207srz4f.js (1), chunk-fym4r1th.js (24), chunk-s61vbvea.js (12)
 * attribution: placement 37
 */
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  string,
  discriminatedUnion,
  u,
  literal,
  array,
  M,
  E,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
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

//@ chunk-fym4r1th.js:1089-1155 placement
/**
 * 取 print 模式等待后台任务的默认上限（环境变量优先）。
 */
function printBackgroundWaitCeilingMs() {
  return env.CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS ?? DEFAULT_PRINT_BG_WAIT_CEILING_MS;
}
//@ chunk-fym4r1th.js:1155-1202 placement
function isTidySlothGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_sloth", true);
}
//@ chunk-fym4r1th.js:1202-2165 placement
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
//@ chunk-fym4r1th.js:2165-2511 placement
/**
 * GetTask 结果的输出上限与按状态（working、completed、failed、cancelled）区分的 schema。
 */
var MAX_TASK_OUTPUT_CHARS = 12000;
var MAX_TASK_OUTPUT_BYTES = 4 * MAX_TASK_OUTPUT_CHARS;
var GET_TASK_ID_PREFIX = "gettask_";
var taskStatusBaseFields = {
  taskId: string(),
  statusMessage: string(),
  createdAt: string(),
  lastUpdatedAt: string(),
};
var getTaskResultSchema = DoctorLazy(() =>
  discriminatedUnion("status", [
    u({
      ...taskStatusBaseFields,
      status: literal("working"),
    }),
    u({
      ...taskStatusBaseFields,
      status: literal("completed"),
      result: u({
        content: array(
          u({
            type: literal("text"),
            text: string(),
          }),
        ),
        isError: M(),
      }),
    }),
    u({
      ...taskStatusBaseFields,
      status: literal("failed"),
      error: u({
        code: E(),
        message: string(),
      }),
    }),
    u({
      ...taskStatusBaseFields,
      status: literal("cancelled"),
    }),
  ]),
);
//@ chunk-fym4r1th.js:2511-2581 placement
/**
 * 解析任务结果为协议对象，解析失败返回 null。
 */
function parseTaskResultOrNull(e) {
  let s = getTaskResultSchema().safeParse(e);
  return s.success ? s.data : null;
}
//@ chunk-fym4r1th.js:2581-2613 placement
/**
 * 把任务状态规整为协议字段后序列化成 JSON。
 */
function serializeTaskResult(task) {
  return jsonStringify(toGetTaskResult(task));
}
//@ chunk-fym4r1th.js:2613-3231 placement
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
          content: task.result.content.map(({ type: d, text }) => ({
            type: d,
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
//@ chunk-fym4r1th.js:3231-3342 placement
function describeInterimOutput(outputFile) {
  return outputFile === ""
    ? ""
    : ` Output is being written to ${outputFile}; use ${FILE_READ_TOOL_NAME} on that path for interim output.`;
}
//@ chunk-fym4r1th.js:3342-3390 placement
function fieldNote(e, outputFile) {
  return outputFile === "" ? "" : ` ${e}: ${outputFile}`;
}
//@ chunk-fym4r1th.js:3390-4292 placement
/**
 * 后台任务「仍在运行」时给模型的几种说明：结果如何送达、属于别的代理、不要重复轮询。
 */
var BACKGROUND_TASK_DELIVERY_TEXT =
  "between your tool calls if you are still working, or by starting a new turn if you have already replied";
var BACKGROUND_DELIVERY_CHANNEL_TEXT = "Its result is delivered to the agent that started it, not to you.";
var OTHER_AGENT_RESULT_NOTE = `Do not call ${GET_TASK_TOOL_TEXT} again for this task: when the command finishes, its result is delivered to you automatically \u2014 ${BACKGROUND_TASK_DELIVERY_TEXT} (usually as a ${GET_TASK_TOOL_TEXT} result, otherwise as a task notification). If that result is all you are waiting for, end your turn; otherwise continue with other work.`;
var DO_NOT_POLL_TASK_TEXT = `Do not call ${GET_TASK_TOOL_TEXT} again for this task: if the command finishes while you are still working, its result is delivered to you automatically between your tool calls (usually as a ${GET_TASK_TOOL_TEXT} result, otherwise as a task notification). If you need that result before you reply and nothing else is left to do, wait with one foreground shell command that blocks until the output file shows what you need; otherwise continue with other work.`;
//@ chunk-fym4r1th.js:4292-4326 placement
/**
 * 当前是否是单次 print 会话（或输入已关闭）。
 */
function isPrintInputDone() {
  return isSingleShotPrintSession() || isPrintInputClosed();
}
//@ chunk-fym4r1th.js:4326-4362 placement
/**
 * print 会话且 tidy-sloth 开关关闭（此时才给前台等待建议）。
 */
function isPrintWithoutTidySloth() {
  return isPrintInputDone() && !isTidySlothGateOn();
}
//@ chunk-fym4r1th.js:4362-4866 placement
/**
 * 后台命令仍在运行时给模型的建议：有其他工作就继续，只剩等待时用一个前台阻塞命令等，下次需要等待的命令放前台运行。
 */
function buildBackgroundWaitAdvice() {
  return `If you still need its result and have other work, keep working \u2014 it reaches you between your tool calls if it exits in time; if waiting for it is all that is left, wait with one foreground shell command that blocks until the output file shows what you need, rather than checking on it repeatedly. Next time, run a command you must wait on in the foreground (with a timeout of up to ${Math.floor(getMaxBashTimeoutMs() / 60000)} minutes) and keep the background for work you can start and forget.`;
}
//@ chunk-fym4r1th.js:4866-5049 placement
function buildFinishBeforeResponseNotice() {
  return `Its result reaches you only if it finishes while you are still working: it is terminated when you give your final response, and nothing can follow that. ${buildBackgroundWaitAdvice()}`;
}
//@ chunk-fym4r1th.js:5049-5844 placement
function backgroundTaskNotice(taskId, s, { backgroundedByUser: n = false, ending: a } = {}) {
  let r =
    a === "final_response"
      ? buildBackgroundWaitAdvice()
      : hasBackgroundBashStopAfterReply()
        ? "If it finishes while you are still working, its result is delivered to you automatically between your tool calls, so there is no need to check whether it is done or to sleep; if you need its result before you reply, wait with one foreground shell command that blocks until the output file shows what you need."
        : n
          ? "Its result is delivered to you automatically when it finishes; carry on without waiting for it."
          : `When it finishes, its result is delivered to you automatically \u2014 ${BACKGROUND_TASK_DELIVERY_TEXT} \u2014 so there is no need to check whether it is done or to sleep; if that result is all you are waiting for, end your turn.`;
  let d = {
    resultType: "task",
    taskId,
    status: "working",
    statusMessage: `${s} ${r}`,
  };
  return jsonStringify(d);
}
//@ chunk-fym4r1th.js:5844-5891 placement
/**
 * 把时间戳转成 ISO 字符串。
 */
function isoTime(startTime) {
  return new Date(startTime).toISOString();
}
//@ chunk-fym4r1th.js:5891-6076 placement
/**
 * 取任务输出末尾一段，被截断时加上"更早输出已省略"及完整输出路径。
 */
function formatTaskOutputTail({ content, omittedBytes }, n) {
  let a = takeLastChars(content, MAX_TASK_OUTPUT_CHARS);
  let r = omittedBytes > 0 || a.length < content.length;
  let d = a.replace(/^\n+/, "").trimEnd();
  return r
    ? `[\u2026 earlier output omitted; full output: ${n}]
${d}`
    : d;
}
//@ chunk-fym4r1th.js:6076-6681 placement
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
  let outputTail = output ? formatTaskOutputTail(output, outputFile) : "";
  return {
    taskId,
    status: "completed",
    statusMessage:
      exitCode === undefined
        ? `Exited; the exit code is not known.${fieldNote("Full output", outputFile)}`
        : `Exited with code ${exitCode}.${fieldNote("Full output", outputFile)}`,
    ...timestamps,
    result: {
      content: outputTail
        ? [
            {
              type: "text",
              text: outputTail,
            },
          ]
        : [],
      isError: outcome === "failed",
    },
  };
}
//@ chunk-fym4r1th.js:6843-7469 placement
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
//@ chunk-fym4r1th.js:7469-7522 placement
/**
 * 由 uuid 生成任务 id（去掉连字符并加前缀）。
 */
function taskIdFromUuid(e) {
  return `${GET_TASK_ID_PREFIX}${e.replaceAll("-", "")}`;
}
//@ chunk-fym4r1th.js:7522-7583 placement
/**
 * 判断字符串是否是任务 id。
 */
function isTaskId(e) {
  return typeof e === "string" && e.startsWith(GET_TASK_ID_PREFIX);
}
//@ chunk-fym4r1th.js:7583-7617 placement
/**
 * 内层任务 id 的后缀与前导 id 后缀常量。
 */
var INNER_TASK_SUFFIX = ":inner";
var PREAMBLE_TASK_SUFFIX = ":preamble-";
//@ chunk-fym4r1th.js:7617-7683 placement
/**
 * 去掉任务 id 里的前导后缀。
 */
function stripPreambleSuffix(toolUseId) {
  let index = toolUseId.indexOf(PREAMBLE_TASK_SUFFIX);
  return index === -1 ? toolUseId : toolUseId.slice(0, index);
}
//@ chunk-fym4r1th.js:7683-7769 placement
/**
 * 内层任务 id 的父任务 id（内层后缀或无法解析时 undefined）。
 */
function parentTaskId(toolUseId) {
  if (toolUseId === undefined) return;
  let s = stripPreambleSuffix(toolUseId);
  return s.endsWith(INNER_TASK_SUFFIX) ? undefined : sanitizeMarkName(s);
}
//@ chunk-s61vbvea.js:453549-453611 placement
/**
 * 宿主策略是否允许后台命令完成通知。
 */
function backgroundCompletionNoticeEnabled() {
  return !getHostAgentPolicy().backgroundCompletionNoticeDisabled;
}
//@ chunk-s61vbvea.js:453611-453646 placement
/**
 * 是否应提示「命令结束时不会通知」。
 */
function shouldMentionBackgroundNotice() {
  return backgroundCompletionNoticeEnabled() && !isPlainNonInteractive();
}
//@ chunk-s61vbvea.js:453646-453888 placement
/**
 * 提示：命令结束时不会通知，需要读输出文件，必要时在命令末尾自行 echo 标记。
 */
var NO_FINISH_NOTIFICATION_NOTICE =
  "Nothing notifies you when the command finishes: read the output file that the result names to check on it. The file gets no line when the command ends, so if you need to know that it has, end the command with an `echo` of your own.";
//@ chunk-s61vbvea.js:453888-453897 placement
var MAX_NON_NEVER_DROPPED_TASKS = 8;
//@ chunk-s61vbvea.js:453897-454724 placement
class BackgroundOutputGate {
  #e = [];
  #t = new WeakSet();
  #n = false;
  #i = null;
  #l = null;
  countBackgroundWork = null;
  openGate() {
    this.#n = true;
  }
  get gateOpen() {
    return this.#n;
  }
  markCopyCleared(e) {
    this.#i = e;
  }
  get copyCleared() {
    return this.#i;
  }
  markSyncedFolder(e) {
    this.#l = e;
  }
  get syncedFolder() {
    return this.#l;
  }
  stage(e, isNeverDropped = false) {
    let r = {
      text: e,
      isNeverDropped,
    };
    let s = [...this.#e.filter((S) => S.text !== e), r];
    let h = new Set(s.filter((S) => !S.isNeverDropped).slice(0, -MAX_NON_NEVER_DROPPED_TASKS));
    this.#e = s.filter((S) => !h.has(S));
    let y = () => {
      if (this.#e.includes(r)) return "waiting";
      return this.#t.has(r) ? "taken" : "gone";
    };
    return {
      get state() {
        return y();
      },
      revise: (S) => {
        if (y() !== "waiting") return;
        let w =
          S === null
            ? null
            : {
                text: S,
                isNeverDropped,
              };
        this.#e = this.#e.flatMap((R) => (R !== r ? [R] : w === null ? [] : [w]));
        r = w ?? r;
      },
    };
  }
  get pending() {
    return this.#e.length;
  }
  take() {
    let e = this.#e;
    this.#e = [];
    e.forEach((n) => this.#t.add(n));
    return e.map((n) => n.text);
  }
}
//@ chunk-s61vbvea.js:454724-454751 placement
/**
 * 按会话保存的后台输出门。
 */
var backgroundOutputGateSlots = new SessionRootSlot(() => new BackgroundOutputGate());
//@ chunk-s61vbvea.js:454751-454801 placement
/**
 * 该会话是否还有未取的后台输出。
 */
function hasPendingBackgroundOutput(session) {
  return (backgroundOutputGateSlots.peek(session)?.pending ?? 0) > 0;
}
//@ chunk-s61vbvea.js:454801-454849 placement
/**
 * 该会话的后台输出门是否已打开。
 */
function isBackgroundOutputGateOpen(e) {
  return backgroundOutputGateSlots.peek(e)?.gateOpen ?? false;
}
//@ chunk-s61vbvea.js:454849-454878 placement
/**
 * 对外导出的后台输出门查询。
 */
function backgroundOutputGateOpen(session) {
  return isBackgroundOutputGateOpen(session);
}
//@ chunk-s61vbvea.js:454878-454906 placement
/**
 * 任务级 cwd 覆盖（当前恒为 null 的预留）。
 */
function taskCwdOverride(e) {
  return null;
}
//@ chunk-s61vbvea.js:454906-454942 placement
/**
 * 任务的工作目录，缺省回退到原始 cwd。
 */
function taskCwd(session) {
  return taskCwdOverride(session) ?? getOriginalCwd();
}
//@ chunk-s61vbvea.js:454942-454996 placement
/**
 * 任务输出副本被清理的时间（未清理为 null）。
 */
function taskCopyClearedAt(session) {
  return backgroundOutputGateSlots.peek(session)?.copyCleared ?? null;
}
//@ chunk-207srz4f.js:191-206 placement
/**
 * print 模式等待后台任务的默认上限（600000 ms），可被 CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS 覆盖
 */
var DEFAULT_PRINT_BG_WAIT_CEILING_MS = 600000;
export {
  isTaskId,
  parseTaskResultOrNull,
  taskIdFromUuid,
  serializeTaskResult,
  PREAMBLE_TASK_SUFFIX,
  stripPreambleSuffix,
  BACKGROUND_STOP_REASONS,
  isTidySlothGateOn,
  backgroundOutputGateOpen,
  hasPendingBackgroundOutput,
  backgroundOutputGateSlots,
  backgroundTaskNotice,
  backgroundCompletionNoticeEnabled,
  isPrintWithoutTidySloth,
  BACKGROUND_STOP_EXPLANATIONS,
  taskCwd,
  INNER_TASK_SUFFIX,
  parentTaskId,
  taskCopyClearedAt,
  NO_FINISH_NOTIFICATION_NOTICE,
  shouldMentionBackgroundNotice,
  buildShellTaskResult,
  isPrintInputDone,
  formatTaskOutputTail,
  MAX_TASK_OUTPUT_BYTES,
  getTaskResultSchema,
  getShellTaskStatus,
  taskCwdOverride,
  printBackgroundWaitCeilingMs,
  DEFAULT_PRINT_BG_WAIT_CEILING_MS,
};
