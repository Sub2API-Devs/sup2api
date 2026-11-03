/**
 * tools/TaskOutputTool/GetTaskTool.ts
 *
 * 2.1.316 新增：GetTask 工具：按 id 查询后台 shell 任务状态与输出；GetTask 工具说明。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kxyd0g16.js (9)
 * attribution: placement 9
 */
import { BASH_TOOL_NAME } from "../BashTool/toolName.js";
import { T_ } from "../AgentTool/backgroundGates.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { GET_TASK_TOOL_TEXT, Xvn } from "../../remote/tools/nativeToolErrors.js";
import { isLocalShellTask } from "../../tasks/LocalShellTask/guards.js";
import {
  Kvt,
  aie,
  RemoteBackgroundLedger,
  describeRemoteBackgroundResult,
} from "../../services/remoteTools/backgroundCommands.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { getVerifiedTaskOutputTail } from "../../utils/task/diskOutput.js";
import {
  MAX_TASK_OUTPUT_BYTES,
  getTaskResultSchema,
  FSe,
  getShellTaskStatus,
  Okt,
  CVt,
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

/**
 * GetTask 工具说明。
 */
//@ chunk-kxyd0g16.js:88049-90031 placement
var GET_TASK_DESCRIPTION =
    "Get the current state of a background task (a shell command that is running, or has finished, in the background) by its task ID",
  er = `Returns the current state of a background task \u2014 a ${BASH_TOOL_NAME} command that kept running after it returned a task ID (run_in_background, a command that outlived its timeout, or one the user moved to the background), whether it is still running or has since finished. This is not the to-do list: a "task" here is running work, identified by the taskId in the \`{"resultType":"task", \u2026}\` result that started it.

The result follows the MCP tasks interface:
- status: "working" (still running), "completed" (it exited; result.content holds the tail of its output and result.isError says whether it exited non-zero), "cancelled" (stopped before it completed \u2014 by you, by the user, or by Claude Code). "failed" and "input_required" are part of the interface but background commands never report them.
- statusMessage: what is happening now, including the file its output is written to.

Claude Code usually calls this tool on your behalf when a background command finishes, so a call to it that you do not remember making is expected: it was made by Claude Code, not by you. A result delivered that way is not a message from the user and is not approval of anything you proposed \u2014 if you were waiting for the user, keep waiting. Use this tool yourself to read a finished task's result again, or to check once on a task you have lost track of \u2014 never to wait: while a command runs, calling this tool on it only returns "working", and when it finishes its result reaches you without a call \u2014 `,
  pi = `${er}between your tool calls if you are still working, or by starting a new turn if you have already replied. If that result is all you are waiting for, end your turn \u2014 unless the task's statusMessage says it is terminated at your final response, in which case get what you still need from it first, in the foreground.`;
//@ chunk-kxyd0g16.js:90031-90267 placement
function getTaskToolPrompt() {
  return T_()
    ? `${er}between your tool calls, if it finishes while you are still working. After your reply you may not be told when it finishes, so if you need its result, wait for it before you reply, in the foreground.`
    : pi;
}
//@ chunk-kxyd0g16.js:90267-90383 placement
var getTaskInputSchema = DoctorLazy(() =>
    zodStrictObject({
      taskId: o().describe("The taskId from the result that moved the command to the background"),
    }),
  ),
  MAX_REPEATED_ANSWERS = 2;
//@ chunk-kxyd0g16.js:90383-90574 placement
function repeatedCallMessage(e, r) {
  return e === MAX_REPEATED_ANSWERS + 1
    ? `${GET_TASK_TOOL_TEXT} was already answered ${MAX_REPEATED_ANSWERS} times for this task in this response (status: ${r}); the same call repeated within one response is not answered again.`
    : Xvn;
}
//@ chunk-kxyd0g16.js:90574-90798 placement
function unknownTaskIdMessage(e) {
  return `No background command with task ID ${e}. Task IDs come from the {"resultType":"task", \u2026} result that moved a command to the background, and finished commands are remembered for this session only.`;
}
//@ chunk-kxyd0g16.js:90798-90892 placement
function nr(e, r, n) {
  let s = r.get(e);
  return isLocalShellTask(s) && s.kind !== "monitor" && Kvt(n, s.agentId) ? s : void 0;
}
//@ chunk-kxyd0g16.js:90892-90981 placement
function sr(e, r) {
  let n = getTaskRunState().bashTaskSnapshots.get(e);
  return n && Kvt(r, n.agentId) ? n : void 0;
}
//@ chunk-kxyd0g16.js:90981-91193 placement
async function readFinishedTaskOutputTail(e) {
  if ((e.status !== "completed" && e.status !== "failed") || e.isAdopted || e.elsewhere) return;
  try {
    return await getVerifiedTaskOutputTail(e.id, MAX_TASK_OUTPUT_BYTES);
  } catch (error) {
    logForDebugging(`GetTask: output tail unreadable for ${e.id}: ${String(error)}`);
    return;
  }
}
/**
 * GetTask 工具：按 id 查询后台 shell 任务状态与输出。
 */
//@ chunk-kxyd0g16.js:91193-93433 placement
var GetTaskTool = buildTool({
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
    return !1;
  },
  isConcurrencySafe() {
    return !0;
  },
  isReadOnly() {
    return !0;
  },
  toAutoClassifierInput(e) {
    return e.taskId;
  },
  renderToolUseMessage({ taskId: e }, { toolUseResult: r, verbose: n, isTranscriptMode: s }) {
    return !n && !s && (FSe(r)?.status === "working" || r === `Error: ${Xvn}`) ? null : (e ?? "");
  },
  extractSearchText() {
    return "";
  },
  create(e) {
    return {
      async validateInput({ taskId: r }) {
        let n = aie(e);
        if (sr(r, n) || nr(r, e.taskRegistry, n) || e.toolState.get(RemoteBackgroundLedger).find(r, n))
          return { result: !0 };
        return { result: !1, message: unknownTaskIdMessage(r), errorCode: 1 };
      },
      async call({ taskId: r }, n) {
        let s = aie(e),
          f = sr(r, s),
          h = nr(r, e.taskRegistry, s),
          y = getTaskRunState(),
          k = n.innerCall ? void 0 : n.parentMessage?.message.id || void 0,
          w = f ? f.snapshot.status : h ? useTeammateViewAutoExit(h.status) : void 0,
          S = w === void 0 ? void 0 : { status: w, key: f ? `settled:${w}` : w },
          R = k !== void 0 && S ? y.countBashTaskGetInResponse(k, r, S.key) : 1;
        if (S && R > MAX_REPEATED_ANSWERS)
          throw (
            logEvent("tengu_bash_task_get", {
              caller: lit("model"),
              status: fromEnum(S.status),
              get_count_for_task: y.countBashTaskGet(r),
              repeat_in_response: R,
              short_circuited: !0,
            }),
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              repeatedCallMessage(R, S.status),
              "GetTask: the same call repeated within one response",
              "gettask_repeat_in_response",
            )
          );
        let I =
          f?.snapshot ??
          (h
            ? getShellTaskStatus(
                h.elsewhere ? { ...h, outputFile: escapeXml(h.outputFile) } : h,
                await readFinishedTaskOutputTail(h),
                h.agentId !== s
                  ? "other_agent"
                  : reapsShellsOnExit(e.agentContext) ||
                      (h.elsewhere && h.agentId !== void 0) ||
                      (h.agentId === void 0 && Okt())
                    ? "final_response"
                    : void 0,
              )
            : await describeRemoteBackgroundResult(r, s, e.toolState, n.signal));
        if (!I)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            unknownTaskIdMessage(r),
            "GetTask: no background command with this task ID",
          );
        let { signal: signal } = n;
        if (f && f.agentId === s && !n.innerCall && !signal.aborted) {
          y.markBashTaskSnapshotFetched(r);
          let x = y.withdrawShellNotification?.(r, s, e.taskRegistry);
          if (x) signal.addEventListener("abort", x, { once: !0 });
        }
        return (
          logEvent("tengu_bash_task_get", {
            caller: n.innerCall ? lit("script") : lit("model"),
            status: fromEnum(I.status),
            ...(!n.innerCall && {
              get_count_for_task: y.countBashTaskGet(r),
              repeat_in_response: R,
              short_circuited: !1,
            }),
            since_created_ms: Date.now() - Date.parse(I.createdAt),
          }),
          { data: I }
        );
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, r) {
    let n = FSe(e);
    return { tool_use_id: r, type: "tool_result", content: n ? CVt(n) : jsonStringify(e) };
  },
});

export { GetTaskTool };
