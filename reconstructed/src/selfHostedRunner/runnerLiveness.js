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
var n = 5000,
  i = 500;
//@ chunk-66nm9g6r.js:11838-11879 placement
function u(e) {
  setInterval(r, n, e).unref();
}
//@ chunk-66nm9g6r.js:11879-12015 placement
async function isRunnerProcessAlive(e) {
  let o = await provenSameProcessAsync(e.pid, e.procStart);
  if (o === void 0) (await sleep(i), (o = await provenSameProcessAsync(e.pid, e.procStart)));
  return o === !0 && !(await t(e));
}
//@ chunk-66nm9g6r.js:12015-12104 placement
async function t(e) {
  return (
    isProcessProvablyGone(e.pid) ||
    (await hasExitedUnreaped(e.pid)) ||
    (await provenSameProcessAsync(e.pid, e.procStart)) === !1
  );
}
//@ chunk-66nm9g6r.js:12104-12159 placement
function m() {
  writeToStdout(`{"type":"system","subtype":"init"}
`);
}
//@ chunk-66nm9g6r.js:12159-12199 placement
async function r(e) {
  if (await t(e)) gracefulShutdown(0);
}
