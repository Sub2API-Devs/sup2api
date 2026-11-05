/**
 * selfHostedRunner/runnerLiveness.ts
 *
 * runner 存活信号（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9n77nmqt.js (6)
 * attribution: placement 6
 */
import {
  provenSameProcessAsync,
  isProcessProvablyGone,
  hasExitedUnreaped,
} from "../utils/processIdentity.js";
import { sleep } from "../utils/sleep.js";
import { writeToStdout } from "../utils/process.js";
import { gracefulShutdown } from "../utils/gracefulShutdown.js";

//@ chunk-9n77nmqt.js:12969-12986 placement
var LIVENESS_INTERVAL_MS = 5000;
var LIVENESS_GRACE_MS = 500;
//@ chunk-9n77nmqt.js:12986-13027 placement
/**
 * 导出函数 `watchLiveness`：参数 e。
 */
function watchLiveness(config) {
  setInterval(checkAndShutdown, LIVENESS_INTERVAL_MS, config).unref();
}
//@ chunk-9n77nmqt.js:13027-13163 placement
async function isRunnerProcessAlive(proc) {
  let alive = await provenSameProcessAsync(proc.pid, proc.procStart);
  if (alive === undefined) {
    await sleep(LIVENESS_GRACE_MS);
    alive = await provenSameProcessAsync(proc.pid, proc.procStart);
  }
  return alive === true && !(await hasExitedUnreapedOrGone(proc));
}
//@ chunk-9n77nmqt.js:13163-13252 placement
async function hasExitedUnreapedOrGone(proc) {
  return (
    isProcessProvablyGone(proc.pid) ||
    (await hasExitedUnreaped(proc.pid)) ||
    (await provenSameProcessAsync(proc.pid, proc.procStart)) === false
  );
}
//@ chunk-9n77nmqt.js:13252-13307 placement
/**
 * 导出函数 `writeInitSystemLine`。
 */
function writeInitSystemLine() {
  writeToStdout(`{"type":"system","subtype":"init"}
`);
}
//@ chunk-9n77nmqt.js:13307-13347 placement
async function checkAndShutdown(config) {
  if (await hasExitedUnreapedOrGone(config)) gracefulShutdown(0);
}
export { watchLiveness, isRunnerProcessAlive, writeInitSystemLine };
