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
import { sequential } from "../utils/sequential.js";
import { isDisklessProcess } from "../bootstrap/state.js";
import { setBgExitCause } from "../utils/bgExitSidecars.js";
import { stripControlChars, drainRegisteredWriteQueues } from "../utils/settings/writeQueues.js";
import { waitForOAuthRefreshBeforeExit } from "../utils/auth/oauthRefreshExitWait.js";
import { withDeadline } from "../utils/sleep.js";
import { getOutermostCallFrame } from "../utils/cwd.js";
import { s } from "../remote/remoteMode.js";

//@ chunk-437rqrst.js:411-451 placement
function printCliError(r) {
  console.error(sequential.red(r));
}
/**
 * cliError：输出红色错误（可选）并以 1 退出；非 diskless 进程先记录退出原因。（旧版名 cliOk 配错，门面导出名为 cliError）
 */
//@ chunk-437rqrst.js:451-529 placement = cliOk (0.415)
function cliError(r, e = "cli_error") {
  if (r) printCliError(r);
  if (!isDisklessProcess()) setBgExitCause(e);
  process.exit(1);
  return;
}
//@ chunk-437rqrst.js:529-600 placement
function cliOk(r) {
  if (r)
    process.stdout.write(
      r +
        `
`,
    );
  process.exit(0);
  return;
}
//@ chunk-437rqrst.js:600-639 placement
function cliExit(r) {
  process.exit(r);
  return;
}
//@ chunk-437rqrst.js:639-718 placement
async function writeStdoutAndDrain(r) {
  await new Promise((e) => {
    process.stdout.write(r, () => e());
  });
}
//@ chunk-437rqrst.js:718-776 placement
function cliWarn(r) {
  process.stderr.write(
    sequential.yellow(stripControlChars(r)) +
      `
`,
  );
}
//@ chunk-437rqrst.js:776-787 placement
var i = 2000;
//@ chunk-437rqrst.js:787-955 placement
async function flushAnalyticsBeforeExit({ waitForOAuthRefresh: waitForOAuthRefresh = !0 } = {}) {
  if (waitForOAuthRefresh) await waitForOAuthRefreshBeforeExit();
  await withDeadline(drainRegisteredWriteQueues(), i);
  try {
    let { flushAnalyticsSinks: flushAnalyticsSinks } = await import("./chunk-af5wdhtv.js");
    await flushAnalyticsSinks();
  } catch {}
}
//@ chunk-437rqrst.js:955-1010 placement
async function exitAfterAnalyticsFlush(r) {
  (await flushAnalyticsBeforeExit(), process.exit(r));
  return;
}
//@ chunk-437rqrst.js:1010-1065 placement
async function cliErrorAfterAnalyticsFlush(r) {
  if (r) printCliError(r);
  return (await flushAnalyticsBeforeExit(), cliError());
}
//@ chunk-437rqrst.js:1065-1142 placement
async function cliOkAfterAnalyticsFlush(r) {
  if (r)
    process.stdout.write(
      r +
        `
`,
    );
  return (await flushAnalyticsBeforeExit(), cliOk());
}
/**
 * 在异步上下文外运行回调（AsyncLocalStorage.exit/run），旧版名 cliError 配错。
 */
//@ chunk-fnk5kvbf.js:2273-2338 fingerprint = cliError (0.708)
function cliError_2(msg) {
  let n = getOutermostCallFrame();
  return n === void 0 ? s.exit(msg) : s.run(n, msg);
}

export {
  writeStdoutAndDrain,
  exitAfterAnalyticsFlush,
  cliErrorAfterAnalyticsFlush,
  cliError,
  printCliError,
  cliWarn,
  cliError_2,
  cliOkAfterAnalyticsFlush,
  cliOk,
  flushAnalyticsBeforeExit,
  cliExit,
};
