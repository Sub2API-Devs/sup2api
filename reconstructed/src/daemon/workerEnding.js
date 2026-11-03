/**
 * daemon/workerEnding.ts
 *
 * 2.1.316 新增。守护进程工作者结束码与说明。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vb0enkt7.js (6)
 * attribution: placement 6
 */
import { Ar } from "../../runtime/bun-runtime.js";
import { errorMessage } from "../utils/errors.js";
import { PassingCauseError } from "../utils/errors/PassingCauseError.js";
import { EXIT_TEMPFAIL, EXIT_CONFIG_ERROR } from "../utils/exitCodes.js";

//@ chunk-vb0enkt7.js:339-350 placement
/**
 * 导出值：EMPTY_WORKER_ENDING（空对象）。
 */
var EMPTY_WORKER_ENDING = {};
//@ chunk-vb0enkt7.js:350-440 placement
Ar(EMPTY_WORKER_ENDING, {
  default: () => EMPTY_WORKER_ENDING,
  endsInARowOf: () => endsInARowOf,
  unsettledBy: () => unsettledBy,
  workerEndingOf: () => workerEndingOf,
});
//@ chunk-vb0enkt7.js:440-512 placement
function endsInARowOf(e) {
  let n = Number(e);
  return Number.isSafeInteger(n) && n > 0 ? n : 0;
}
//@ chunk-vb0enkt7.js:512-595 placement
var unsettledBy = (e) => ({
  reason: `Error: ${errorMessage(e)}`,
  kind: e instanceof PassingCauseError ? "passing" : "lasting",
});
//@ chunk-vb0enkt7.js:595-758 placement
/**
 * 工作进程重试次数与结束文案
 */
var WORKER_RETRY_LIMIT = 5;
var TRIES_TEXT = `It did not pass in ${WORKER_RETRY_LIMIT} tries`;
var HELD_TEXT = "it is held for good, or refused to this process";
var RESTART_HINT = "Start the daemon again once this is mended.";
var WORKER_ENDING_TEXT = `${TRIES_TEXT}: ${HELD_TEXT}. ${RESTART_HINT}`;
//@ chunk-vb0enkt7.js:758-895 placement
/**
 * 守护进程工作者结束码与说明。
 */
function workerEndingOf(e, n) {
  let r = e.kind === "passing";
  let s = r && n + 1 < WORKER_RETRY_LIMIT;
  let i = r ? WORKER_ENDING_TEXT : RESTART_HINT;
  return s
    ? {
        code: EXIT_TEMPFAIL,
        said: `${e.reason}
`,
      }
    : {
        code: EXIT_CONFIG_ERROR,
        said: `${e.reason}
${i}
`,
      };
}
export { unsettledBy };
