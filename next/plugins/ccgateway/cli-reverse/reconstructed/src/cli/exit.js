/**
 * cli/exit.ts
 *
 * 子命令出口辅助：cliError/cliOk 打印后退出（另有 9 个同模块函数被切到 _unattributed/chunk-437rqrst）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/exit.ts
 * pieces: chunk-437rqrst.js (11), chunk-fnk5kvbf.js (1)
 * attribution: placement 11, fingerprint 1
 */
import { getOutermostCallFrame } from "../utils/cwd.js";
import { remoteCallFrameStorage } from "../remote/remoteMode.js";
import { sequential } from "../utils/sequential.js";
import { isDisklessProcess } from "../bootstrap/state.js";
import { setBgExitCause } from "../utils/bgExitSidecars.js";
import { stripControlChars, drainRegisteredWriteQueues } from "../utils/settings/writeQueues.js";
import { waitForOAuthRefreshBeforeExit } from "../utils/auth/oauthRefreshExitWait.js";
import { withDeadline } from "../utils/sleep.js";

//@ chunk-fnk5kvbf.js:2273-2338 fingerprint = cliError (0.708)
/**
 * 在异步上下文外运行回调（AsyncLocalStorage.exit/run），旧版名 cliError 配错。
 */
function cliError_2(msg) {
  let outermostCallFrame = getOutermostCallFrame();
  return outermostCallFrame === undefined
    ? remoteCallFrameStorage.exit(msg)
    : remoteCallFrameStorage.run(outermostCallFrame, msg);
}
//@ chunk-437rqrst.js:411-451 placement
function printCliError(message) {
  console.error(sequential.red(message));
}
//@ chunk-437rqrst.js:451-529 placement = cliOk (0.415)
/**
 * cliError：输出红色错误（可选）并以 1 退出；非 diskless 进程先记录退出原因。（旧版名 cliOk 配错，门面导出名为 cliError）
 */
function cliError(message, cause = "cli_error") {
  if (message) printCliError(message);
  if (!isDisklessProcess()) setBgExitCause(cause);
  process.exit(1);
  return;
}
//@ chunk-437rqrst.js:529-600 placement
function cliOk(message) {
  if (message)
    process.stdout.write(
      message +
        `
`,
    );
  process.exit(0);
  return;
}
//@ chunk-437rqrst.js:600-639 placement
function cliExit(code) {
  process.exit(code);
  return;
}
//@ chunk-437rqrst.js:639-718 placement
async function writeStdoutAndDrain(text) {
  await new Promise((resolve) => {
    process.stdout.write(text, () => resolve());
  });
}
//@ chunk-437rqrst.js:718-776 placement
function cliWarn(message) {
  process.stderr.write(
    sequential.yellow(stripControlChars(message)) +
      `
`,
  );
}
//@ chunk-437rqrst.js:776-787 placement
var WRITE_DRAIN_TIMEOUT_MS = 2000;
//@ chunk-437rqrst.js:787-955 placement
async function flushAnalyticsBeforeExit({ waitForOAuthRefresh = true } = {}) {
  if (waitForOAuthRefresh) await waitForOAuthRefreshBeforeExit();
  await withDeadline(drainRegisteredWriteQueues(), WRITE_DRAIN_TIMEOUT_MS);
  try {
    let { flushAnalyticsSinks } = await import("../services/analytics/flushSinks.js");
    await flushAnalyticsSinks();
  } catch {}
}
//@ chunk-437rqrst.js:955-1010 placement
async function exitAfterAnalyticsFlush(code) {
  await flushAnalyticsBeforeExit();
  process.exit(code);
  return;
}
//@ chunk-437rqrst.js:1010-1065 placement
async function cliErrorAfterAnalyticsFlush(message) {
  if (message) printCliError(message);
  await flushAnalyticsBeforeExit();
  return cliError();
}
//@ chunk-437rqrst.js:1065-1142 placement
async function cliOkAfterAnalyticsFlush(message) {
  if (message)
    process.stdout.write(
      message +
        `
`,
    );
  await flushAnalyticsBeforeExit();
  return cliOk();
}
export {
  writeStdoutAndDrain,
  exitAfterAnalyticsFlush,
  cliErrorAfterAnalyticsFlush,
  cliError,
  cliWarn,
  printCliError,
  cliError_2,
  cliOkAfterAnalyticsFlush,
  cliOk,
  flushAnalyticsBeforeExit,
  cliExit,
};
