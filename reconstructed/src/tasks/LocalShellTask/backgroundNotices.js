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
import { o, Ir, u, T, A, M, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { GET_TASK_TOOL_TEXT } from "../../remote/tools/nativeToolErrors.js";
import { isSingleShotPrintSession, isPrintInputClosed, getOriginalCwd } from "../../bootstrap/state.js";
import { getMaxBashTimeoutMs } from "../../utils/timeouts.js";
import { T_ } from "../../tools/AgentTool/backgroundGates.js";
import { takeLastChars } from "../../utils/stringUtils.js";
import { ye } from "../../utils/startupMarks.js";
import { getHostAgentPolicy } from "../../utils/hostAgentPolicy.js";
import { isPlainNonInteractive } from "../../utils/sessionShape.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";

//@ chunk-fym4r1th.js:1089-1155 placement
function Usi() {
  return env.CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS ?? DEFAULT_PRINT_BG_WAIT_CEILING_MS;
}
//@ chunk-fym4r1th.js:1155-1202 placement
function isTidySlothGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_sloth", !0);
}
//@ chunk-fym4r1th.js:1202-2165 placement
var BACKGROUND_STOP_REASONS = {
    memory_pressure: "stopped because the system is running low on memory",
    deadline: "stopped after reaching its background time limit",
  },
  TVt = {
    memory_pressure:
      "This is not a failure of the command. Claude Code stopped it because the system was critically low on memory while the session was idle, which says nothing about the command or its own memory use, so there is nothing in it to debug. Do not start it again on your own, even if the work seems to need it: memory may still be short. Report what was stopped and why, and start it again only when asked. The user can turn this behavior off by starting Claude Code with CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP=1 in its environment; setting it from a shell command has no effect.",
    deadline:
      "If the work in progress still needs it, start it again with `run_in_background` and a longer `timeout`. If it already had the longest `timeout` allowed, do not restart it. Either way, report that it was stopped.",
  };
/**
 * GetTask 结果的输出上限与按状态（working、completed、failed、cancelled）区分的 schema。
 */
//@ chunk-fym4r1th.js:2165-2511 placement
var MAX_TASK_OUTPUT_CHARS = 12000,
  MAX_TASK_OUTPUT_BYTES = 4 * MAX_TASK_OUTPUT_CHARS,
  GET_TASK_ID_PREFIX = "gettask_",
  taskStatusBaseFields = { taskId: o(), statusMessage: o(), createdAt: o(), lastUpdatedAt: o() },
  getTaskResultSchema = DoctorLazy(() =>
    Ir("status", [
      u({ ...taskStatusBaseFields, status: T("working") }),
      u({
        ...taskStatusBaseFields,
        status: T("completed"),
        result: u({ content: A(u({ type: T("text"), text: o() })), isError: M() }),
      }),
      u({ ...taskStatusBaseFields, status: T("failed"), error: u({ code: E(), message: o() }) }),
      u({ ...taskStatusBaseFields, status: T("cancelled") }),
    ]),
  );
//@ chunk-fym4r1th.js:2511-2581 placement
function FSe(e) {
  let safeParse = getTaskResultSchema().safeParse(e);
  return safeParse.success ? safeParse.data : null;
}
//@ chunk-fym4r1th.js:2581-2613 placement
function CVt(e) {
  return jsonStringify(toGetTaskResult(e));
}
/**
 * 把任务状态对象规整为只含协议字段的 GetTask 结果（按状态选择字段）。
 */
//@ chunk-fym4r1th.js:2613-3231 placement
function toGetTaskResult(task) {
  let {
    taskId: taskId,
    statusMessage: statusMessage,
    createdAt: createdAt,
    lastUpdatedAt: lastUpdatedAt,
  } = task;
  switch (task.status) {
    case "working":
      return {
        taskId: taskId,
        status: "working",
        statusMessage: statusMessage,
        createdAt: createdAt,
        lastUpdatedAt: lastUpdatedAt,
      };
    case "completed":
      return {
        taskId: taskId,
        status: "completed",
        statusMessage: statusMessage,
        createdAt: createdAt,
        lastUpdatedAt: lastUpdatedAt,
        result: {
          content: task.result.content.map(({ type: d, text: text }) => ({ type: d, text: text })),
          isError: task.result.isError,
        },
      };
    case "failed":
      return {
        taskId: taskId,
        status: "failed",
        statusMessage: statusMessage,
        createdAt: createdAt,
        lastUpdatedAt: lastUpdatedAt,
        error: { code: task.error.code, message: task.error.message },
      };
    case "cancelled":
      return {
        taskId: taskId,
        status: "cancelled",
        statusMessage: statusMessage,
        createdAt: createdAt,
        lastUpdatedAt: lastUpdatedAt,
      };
  }
}
//@ chunk-fym4r1th.js:3231-3342 placement
function describeInterimOutput(e) {
  return e === ""
    ? ""
    : ` Output is being written to ${e}; use ${FILE_READ_TOOL_NAME} on that path for interim output.`;
}
//@ chunk-fym4r1th.js:3342-3390 placement
function se(e, s) {
  return s === "" ? "" : ` ${e}: ${s}`;
}
//@ chunk-fym4r1th.js:3390-4292 placement
var BACKGROUND_TASK_DELIVERY_TEXT =
    "between your tool calls if you are still working, or by starting a new turn if you have already replied",
  et = "Its result is delivered to the agent that started it, not to you.",
  tt = `Do not call ${GET_TASK_TOOL_TEXT} again for this task: when the command finishes, its result is delivered to you automatically \u2014 ${BACKGROUND_TASK_DELIVERY_TEXT} (usually as a ${GET_TASK_TOOL_TEXT} result, otherwise as a task notification). If that result is all you are waiting for, end your turn; otherwise continue with other work.`,
  st = `Do not call ${GET_TASK_TOOL_TEXT} again for this task: if the command finishes while you are still working, its result is delivered to you automatically between your tool calls (usually as a ${GET_TASK_TOOL_TEXT} result, otherwise as a task notification). If you need that result before you reply and nothing else is left to do, wait with one foreground shell command that blocks until the output file shows what you need; otherwise continue with other work.`;
//@ chunk-fym4r1th.js:4292-4326 placement
function M5o() {
  return isSingleShotPrintSession() || isPrintInputClosed();
}
//@ chunk-fym4r1th.js:4326-4362 placement
function Okt() {
  return M5o() && !isTidySlothGateOn();
}
/**
 * 后台命令仍在运行时给模型的建议：有其他工作就继续，只剩等待时用一个前台阻塞命令等，下次需要等待的命令放前台运行。
 */
//@ chunk-fym4r1th.js:4362-4866 placement
function buildBackgroundWaitAdvice() {
  return `If you still need its result and have other work, keep working \u2014 it reaches you between your tool calls if it exits in time; if waiting for it is all that is left, wait with one foreground shell command that blocks until the output file shows what you need, rather than checking on it repeatedly. Next time, run a command you must wait on in the foreground (with a timeout of up to ${Math.floor(getMaxBashTimeoutMs() / 60000)} minutes) and keep the background for work you can start and forget.`;
}
//@ chunk-fym4r1th.js:4866-5049 placement
function buildFinishBeforeResponseNotice() {
  return `Its result reaches you only if it finishes while you are still working: it is terminated when you give your final response, and nothing can follow that. ${buildBackgroundWaitAdvice()}`;
}
//@ chunk-fym4r1th.js:5049-5844 placement
function backgroundTaskNotice(e, s, { backgroundedByUser: n = !1, ending: a } = {}) {
  let r =
      a === "final_response"
        ? buildBackgroundWaitAdvice()
        : T_()
          ? "If it finishes while you are still working, its result is delivered to you automatically between your tool calls, so there is no need to check whether it is done or to sleep; if you need its result before you reply, wait with one foreground shell command that blocks until the output file shows what you need."
          : n
            ? "Its result is delivered to you automatically when it finishes; carry on without waiting for it."
            : `When it finishes, its result is delivered to you automatically \u2014 ${BACKGROUND_TASK_DELIVERY_TEXT} \u2014 so there is no need to check whether it is done or to sleep; if that result is all you are waiting for, end your turn.`,
    d = { resultType: "task", taskId: e, status: "working", statusMessage: `${s} ${r}` };
  return jsonStringify(d);
}
//@ chunk-fym4r1th.js:5844-5891 placement
function q(e) {
  return new Date(e).toISOString();
}
/**
 * 取任务输出末尾一段，被截断时加上"更早输出已省略"及完整输出路径。
 */
//@ chunk-fym4r1th.js:5891-6076 placement
function formatTaskOutputTail({ content: content, omittedBytes: omittedBytes }, n) {
  let a = takeLastChars(content, MAX_TASK_OUTPUT_CHARS),
    r = omittedBytes > 0 || a.length < content.length,
    trimEnd = a.replace(/^\n+/, "").trimEnd();
  return r
    ? `[\u2026 earlier output omitted; full output: ${n}]
${trimEnd}`
    : trimEnd;
}
/**
 * 生成后台 shell 任务的 GetTask 结果：被停止时说明原因（附已有输出位置）；结束时给出退出码、输出尾部与输出文件位置。
 */
//@ chunk-fym4r1th.js:6076-6681 placement
function buildShellTaskResult({
  taskId: taskId,
  outcome: outcome,
  exitCode: exitCode,
  startTime: startTime,
  endTime: endTime,
  outputFile: outputFile,
  output: output,
  stopCause: stopCause,
  stopExplanation: stopExplanation,
}) {
  let timestamps = { createdAt: q(startTime), lastUpdatedAt: q(endTime) };
  if (outcome === "killed") {
    let stopNote = stopCause
      ? `${BACKGROUND_STOP_REASONS[stopCause]}. ${stopExplanation ?? TVt[stopCause]}`
      : "stopped before it completed.";
    return {
      taskId: taskId,
      status: "cancelled",
      statusMessage: `The command was ${stopNote}${se("Output so far", outputFile)}`,
      ...timestamps,
    };
  }
  let outputTail = output ? formatTaskOutputTail(output, outputFile) : "";
  return {
    taskId: taskId,
    status: "completed",
    statusMessage:
      exitCode === void 0
        ? `Exited; the exit code is not known.${se("Full output", outputFile)}`
        : `Exited with code ${exitCode}.${se("Full output", outputFile)}`,
    ...timestamps,
    result: {
      content: outputTail ? [{ type: "text", text: outputTail }] : [],
      isError: outcome === "failed",
    },
  };
}
/**
 * 由本地 shell 任务状态生成 GetTask 结果：运行中给出仍在运行的提示（视归属给不同建议），完成/失败/被停分别转为结果。
 */
//@ chunk-fym4r1th.js:6843-7469 placement
function getShellTaskStatus(task, output, waitContext) {
  switch (task.status) {
    case "pending":
    case "running":
    case "paused":
      return {
        taskId: task.id,
        status: "working",
        statusMessage: `Still running.${describeInterimOutput(task.outputFile)} ${waitContext === "other_agent" ? et : waitContext ? buildFinishBeforeResponseNotice() : T_() ? st : tt}`,
        createdAt: q(task.startTime),
        lastUpdatedAt: q(task.startTime),
      };
    case "completed":
    case "failed":
      return buildShellTaskResult({
        taskId: task.id,
        outcome: task.status,
        exitCode: task.isAdopted ? void 0 : task.result?.code,
        startTime: task.startTime,
        endTime: task.endTime ?? task.startTime,
        outputFile: task.outputFile,
        output: output,
      });
    case "killed":
      return buildShellTaskResult({
        taskId: task.id,
        outcome: "killed",
        exitCode: void 0,
        startTime: task.startTime,
        endTime: task.endTime ?? task.startTime,
        outputFile: task.outputFile,
        output: void 0,
      });
  }
}
//@ chunk-fym4r1th.js:7469-7522 placement
function Wsi(e) {
  return `${GET_TASK_ID_PREFIX}${e.replaceAll("-", "")}`;
}
//@ chunk-fym4r1th.js:7522-7583 placement
function k5r(e) {
  return typeof e === "string" && e.startsWith(GET_TASK_ID_PREFIX);
}
//@ chunk-fym4r1th.js:7583-7617 placement
var Pxe = ":inner",
  $qe = ":preamble-";
//@ chunk-fym4r1th.js:7617-7683 placement
function Wbn(e) {
  let index = e.indexOf($qe);
  return index === -1 ? e : e.slice(0, index);
}
//@ chunk-fym4r1th.js:7683-7769 placement
function kVt(e) {
  if (e === void 0) return;
  let s = Wbn(e);
  return s.endsWith(Pxe) ? void 0 : ye(s);
}
//@ chunk-s61vbvea.js:453549-453611 placement
function oie() {
  return !getHostAgentPolicy().backgroundCompletionNoticeDisabled;
}
//@ chunk-s61vbvea.js:453611-453646 placement
function l4r() {
  return oie() && !isPlainNonInteractive();
}
/**
 * 提示：命令结束时不会通知，需要读输出文件，必要时在命令末尾自行 echo 标记。
 */
//@ chunk-s61vbvea.js:453646-453888 placement
var NO_FINISH_NOTIFICATION_NOTICE =
  "Nothing notifies you when the command finishes: read the output file that the result names to check on it. The file gets no line when the command ends, so if you need to know that it has, end the command with an `echo` of your own.";
//@ chunk-s61vbvea.js:453888-453897 placement
var J0 = 8;
//@ chunk-s61vbvea.js:453897-454724 placement
class BackgroundOutputGate {
  #e = [];
  #t = new WeakSet();
  #n = !1;
  #i = null;
  #l = null;
  countBackgroundWork = null;
  openGate() {
    this.#n = !0;
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
  stage(e, n = !1) {
    let r = { text: e, isNeverDropped: n },
      s = [...this.#e.filter((S) => S.text !== e), r],
      h = new Set(s.filter((S) => !S.isNeverDropped).slice(0, -J0));
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
        let w = S === null ? null : { text: S, isNeverDropped: n };
        ((this.#e = this.#e.flatMap((R) => (R !== r ? [R] : w === null ? [] : [w]))), (r = w ?? r));
      },
    };
  }
  get pending() {
    return this.#e.length;
  }
  take() {
    let e = this.#e;
    return ((this.#e = []), e.forEach((n) => this.#t.add(n)), e.map((n) => n.text));
  }
}
//@ chunk-s61vbvea.js:454724-454751 placement
var $vt = new SessionRootSlot(() => new BackgroundOutputGate());
//@ chunk-s61vbvea.js:454751-454801 placement
function Kei(e) {
  return ($vt.peek(e)?.pending ?? 0) > 0;
}
//@ chunk-s61vbvea.js:454801-454849 placement
function Q0(e) {
  return $vt.peek(e)?.gateOpen ?? !1;
}
//@ chunk-s61vbvea.js:454849-454878 placement
function Iqo(e) {
  return Q0(e);
}
//@ chunk-s61vbvea.js:454878-454906 placement
function Oqo(e) {
  return null;
}
//@ chunk-s61vbvea.js:454906-454942 placement
function Wer(e) {
  return Oqo(e) ?? getOriginalCwd();
}
//@ chunk-s61vbvea.js:454942-454996 placement
function Ger(e) {
  return $vt.peek(e)?.copyCleared ?? null;
}
/**
 * print 模式等待后台任务的默认上限（600000 ms），可被 CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS 覆盖
 */
//@ chunk-207srz4f.js:191-206 placement
var DEFAULT_PRINT_BG_WAIT_CEILING_MS = 600000;

export {
  k5r,
  FSe,
  Wsi,
  CVt,
  $qe,
  Wbn,
  BACKGROUND_STOP_REASONS,
  isTidySlothGateOn,
  Iqo,
  Kei,
  $vt,
  backgroundTaskNotice,
  oie,
  Okt,
  TVt,
  Wer,
  Pxe,
  kVt,
  Ger,
  NO_FINISH_NOTIFICATION_NOTICE,
  l4r,
  buildShellTaskResult,
  M5o,
  formatTaskOutputTail,
  MAX_TASK_OUTPUT_BYTES,
  getTaskResultSchema,
  getShellTaskStatus,
  Oqo,
  Usi,
  DEFAULT_PRINT_BG_WAIT_CEILING_MS,
};
