/**
 * daemon/workerEnding.ts
 *
 * 2.1.316 新增。守护进程工作者结束码与说明。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-yg083ftp.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __export } from "../../runtime/bun-runtime.js";
import { errorMessage } from "../utils/errors.js";
import { PassingCauseError } from "../utils/errors/PassingCauseError.js";
import { EXIT_TEMPFAIL, EXIT_CONFIG_ERROR } from "../utils/exitCodes.js";

//@ chunk-yg083ftp.js:339-350 placement
/**
 * 导出值：EMPTY_WORKER_ENDING（空对象）。
 */
var EMPTY_WORKER_ENDING = {};
//@ chunk-yg083ftp.js:350-440 placement
__export(EMPTY_WORKER_ENDING, {
  default: () => EMPTY_WORKER_ENDING,
  endsInARowOf: () => endsInARowOf,
  unsettledBy: () => unsettledBy,
  workerEndingOf: () => workerEndingOf,
});
//@ chunk-yg083ftp.js:440-512 placement
function endsInARowOf(rawCount) {
  let count = Number(rawCount);
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}
//@ chunk-yg083ftp.js:512-595 placement
var unsettledBy = (error) => ({
  reason: `Error: ${errorMessage(error)}`,
  kind: error instanceof PassingCauseError ? "passing" : "lasting",
});
//@ chunk-yg083ftp.js:595-758 placement
/**
 * 工作进程重试次数与结束文案
 */
var WORKER_RETRY_LIMIT = 5;
var TRIES_TEXT = `It did not pass in ${WORKER_RETRY_LIMIT} tries`;
var HELD_TEXT = "it is held for good, or refused to this process";
var RESTART_HINT = "Start the daemon again once this is mended.";
var WORKER_ENDING_TEXT = `${TRIES_TEXT}: ${HELD_TEXT}. ${RESTART_HINT}`;
//@ chunk-yg083ftp.js:758-895 placement
/**
 * 守护进程工作者结束码与说明。
 */
function workerEndingOf(ending, endsInARow) {
  let isPassing = ending.kind === "passing";
  let canRetry = isPassing && endsInARow + 1 < WORKER_RETRY_LIMIT;
  let hintText = isPassing ? WORKER_ENDING_TEXT : RESTART_HINT;
  return canRetry
    ? {
        code: EXIT_TEMPFAIL,
        said: `${ending.reason}
`,
      }
    : {
        code: EXIT_CONFIG_ERROR,
        said: `${ending.reason}
${hintText}
`,
      };
}
export { unsettledBy, EMPTY_WORKER_ENDING, endsInARowOf, workerEndingOf };
