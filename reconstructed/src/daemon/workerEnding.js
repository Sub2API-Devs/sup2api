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
import { the, EXIT_CONFIG_ERROR } from "../utils/exitCodes.js";

//@ chunk-vb0enkt7.js:339-350 placement
var Kwo = {};
//@ chunk-vb0enkt7.js:350-440 placement
Ar(Kwo, {
  default: () => Kwo,
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
/**
 * 工作进程重试次数与结束文案
 */
//@ chunk-vb0enkt7.js:595-758 placement
var WORKER_RETRY_LIMIT = 5,
  m = `It did not pass in ${WORKER_RETRY_LIMIT} tries`,
  p = "it is held for good, or refused to this process",
  t = "Start the daemon again once this is mended.",
  a = `${m}: ${p}. ${t}`;
/**
 * 守护进程工作者结束码与说明。
 */
//@ chunk-vb0enkt7.js:758-895 placement
function workerEndingOf(e, n) {
  let r = e.kind === "passing",
    s = r && n + 1 < WORKER_RETRY_LIMIT,
    i = r ? a : t;
  return s
    ? {
        code: the,
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
