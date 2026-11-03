/**
 * selfHostedRunner/runnerLiveness.ts
 *
 * runner 存活信号（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-66nm9g6r.js (6)
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

//@ chunk-66nm9g6r.js:11821-11838 placement
var LIVENESS_INTERVAL_MS = 5000;
var LIVENESS_GRACE_MS = 500;
//@ chunk-66nm9g6r.js:11838-11879 placement
/**
 * 导出函数 `watchLiveness`：参数 e。
 */
function watchLiveness(e) {
  setInterval(checkAndShutdown, LIVENESS_INTERVAL_MS, e).unref();
}
//@ chunk-66nm9g6r.js:11879-12015 placement
async function isRunnerProcessAlive(e) {
  let o = await provenSameProcessAsync(e.pid, e.procStart);
  if (o === undefined) {
    await sleep(LIVENESS_GRACE_MS);
    o = await provenSameProcessAsync(e.pid, e.procStart);
  }
  return o === true && !(await hasExitedUnreapedOrGone(e));
}
//@ chunk-66nm9g6r.js:12015-12104 placement
async function hasExitedUnreapedOrGone(e) {
  return (
    isProcessProvablyGone(e.pid) ||
    (await hasExitedUnreaped(e.pid)) ||
    (await provenSameProcessAsync(e.pid, e.procStart)) === false
  );
}
//@ chunk-66nm9g6r.js:12104-12159 placement
/**
 * 导出函数 `writeInitSystemLine`。
 */
function writeInitSystemLine() {
  writeToStdout(`{"type":"system","subtype":"init"}
`);
}
//@ chunk-66nm9g6r.js:12159-12199 placement
async function checkAndShutdown(e) {
  if (await hasExitedUnreapedOrGone(e)) gracefulShutdown(0);
}
