/**
 * tools/REPLTool/stopReasons.ts
 *
 * 脚本停止原因与调用上限的说明文案（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (11)
 * attribution: placement 11
 */
import { unwrapAbortReason } from "../../utils/abortController.js";
import { TASKSTOP } from "../TaskStopTool/prompt.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { formatDuration as formatDuration_2 } from "../../utils/format.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-n51jggtb.js:58125-58188 placement
/**
 * 脚本被中断时的哨兵名与其 AbortError 实例。
 */
var REPL_SCRIPT_OVER; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var dOMException;
deferInit("chunk-n51jggtb.js:58125", () => {
  REPL_SCRIPT_OVER = "repl-script-over";
  dOMException = new DOMException(REPL_SCRIPT_OVER, "AbortError");
});
//@ chunk-n51jggtb.js:58188-58239 placement
/**
 * 判断 abort 信号的原因是否为脚本中断。
 */
function isScriptOverAbort(signal) {
  return signal.aborted && unwrapAbortReason(signal.reason) === REPL_SCRIPT_OVER;
}
//@ chunk-n51jggtb.js:58239-59231 placement
/**
 * 脚本已结束而残留代码仍在调用工具时的各种说明文本。
 */
var SCRIPT_RETURNED_NO_CALLS_MESSAGE =
  "[Tool call not made: the script that started this code has returned and none of its calls is still running, and after that the code it left behind can make no more calls. Nobody stopped or declined this call. To run these steps, await them inside one script.]";
var FINISHED_CODE_NO_CALLS_MESSAGE =
  "This tool call did not run. The piece of code that it belongs to had already finished, and a timer or promise that finished code leaves running can't make tool calls. To run these steps, send them again in one piece of code that awaits each of them.";
var STOPPED_BEFORE_CALL_MESSAGE =
  "This tool call did not run. The code that made it finished or was stopped before the call could start. If it is still needed and nobody stopped the code, make the call again in code that awaits it.";
var LOOP_AFTER_FINISH_MESSAGE =
  "Code that had already finished left a loop or promise chain running, and it kept making calls. Finished code can run no tool, so its calls now get no answer and it has stopped. To run these steps, send them again in one piece of code that awaits each of them.";
//@ chunk-n51jggtb.js:59231-59266 placement
/**
 * 按 abort 原因选择残留代码说明。
 */
function scriptOverMessage(signal, fallbackMessage) {
  return isScriptOverAbort(signal) ? SCRIPT_RETURNED_NO_CALLS_MESSAGE : fallbackMessage;
}
//@ chunk-n51jggtb.js:63532-63825 placement
/**
 * 脚本停止原因的各类前缀文案（语法错误、被中断、被 TaskStop/Claude Code 停止、语法不支持等）。
 */
var SYNTAX_ERROR_STATUS = "Syntax error, so nothing ran";
var INTERRUPTED_STATUS = "Interrupted";
var STOPPED_BY_TASKSTOP_STATUS = `Stopped by a ${TASKSTOP} call`;
var STOPPED_BY_APP_STATUS = "Stopped by Claude Code";
var UNSUPPORTED_SYNTAX_STATUS = "Nothing ran: this syntax isn't supported here";
var NO_IMPORT_STATUS = "Nothing ran: import and require aren't available here";
var NAME_COLLISION_STATUS = "Nothing ran: it would overwrite a name that is already taken here";
//@ chunk-n51jggtb.js:63825-63912 placement
/**
 * 超时停止的说明，注明不含工具调用耗时。
 */
function timeoutStatus(ms) {
  return `Timed out after ${formatDuration(ms)}, not counting time spent in tool calls`;
}
//@ chunk-n51jggtb.js:63912-63971 placement
/**
 * “某个调用可能卡住”的说明。
 */
function hungCallStatus(toolName) {
  return `Stopped: a call to ${toolName} may be hung`;
}
//@ chunk-n51jggtb.js:63971-64058 placement
/**
 * 达到调用上限时的说明。
 */
function callLimitStatus(limit) {
  return `Stopped at the limit of ${limit.toLocaleString("en-US")} tool calls`;
}
//@ chunk-n51jggtb.js:64058-64332 placement
/**
 * 达到上限时按等待中的调用生成说明。
 */
function stopStatus(ms, waitingCalls, phase) {
  let head = `Stopped at the ${formatDuration(ms)} limit`;
  if (waitingCalls.length > 0) {
    let toolNames = joinToolNames(waitingCalls);
    let waitingPhrase =
      waitingCalls.length === 1 ? `the ${toolNames} call was waiting` : `${toolNames} calls were waiting`;
    return `${head} while ${waitingPhrase} to run, perhaps for your permission`;
  }
  return phase === "shellCall" ? `${head} before a shell call finished` : head;
}
//@ chunk-n51jggtb.js:64332-64501 placement
/**
 * 把等待中的调用名拼成“a、b 和 c”形式的列表。
 */
function joinToolNames(waitingCalls) {
  let names = normalizeCaseForComparison_2(waitingCalls.map((call) => call.toolName));
  let usable = names.length > 3 ? [...names.slice(0, 3), "other"] : names;
  return usable.length <= 2 ? usable.join(" and ") : `${usable.slice(0, -1).join(", ")} and ${usable.at(-1)}`;
}
//@ chunk-n51jggtb.js:64501-64594 placement (2.1.88 match: formatDuration, 0.782)
/**
 * 把毫秒数格式化成秒。
 */
function formatDuration(ms) {
  return ms < 60000
    ? `${Number((ms / 1000).toFixed(3))}s`
    : formatDuration_2(ms, {
        hideTrailingZeros: true,
      });
}
export {
  STOPPED_BY_TASKSTOP_STATUS,
  STOPPED_BY_APP_STATUS,
  INTERRUPTED_STATUS,
  SYNTAX_ERROR_STATUS,
  UNSUPPORTED_SYNTAX_STATUS,
  NAME_COLLISION_STATUS,
  NO_IMPORT_STATUS,
  callLimitStatus,
  scriptOverMessage,
  FINISHED_CODE_NO_CALLS_MESSAGE,
  STOPPED_BEFORE_CALL_MESSAGE,
  joinToolNames,
  timeoutStatus,
  hungCallStatus,
  LOOP_AFTER_FINISH_MESSAGE,
  stopStatus,
  dOMException,
};
