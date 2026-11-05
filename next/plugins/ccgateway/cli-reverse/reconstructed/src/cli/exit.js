/**
 * cli/exit.ts
 *
 * 子命令出口辅助：cliError/cliOk 打印后退出（另有 9 个同模块函数被切到 _unattributed/chunk-437rqrst）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/exit.ts
 * pieces: chunk-323717f6.js (1), chunk-n49ac0t1.js (11), chunk-sbrfdm61.js (1)
 * attribution: fingerprint 1, placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getOutermostCallFrame } from "../utils/cwd.js";
import { remoteCallFrameStorage } from "../remote/remoteMode.js";
import { sequential } from "../utils/sequential.js";
import { isDisklessProcess } from "../bootstrap/state.js";
import { setBgExitCause } from "../utils/bgExitSidecars.js";
import { stripControlChars, drainRegisteredWriteQueues } from "../utils/settings/writeQueues.js";
import {
  beginExitWaitingForOAuthRefreshLast,
  waitForOAuthRefreshBeforeExit,
} from "../utils/auth/oauthRefreshExitWait.js";
import { withDeadline } from "../utils/sleep.js";
import { SERVER_NEVER_SENT_ERROR_CODES } from "../services/mcp/connectionLifecycle.js";

//@ chunk-sbrfdm61.js:2441-2506 placement
/**
 * 在异步上下文外运行回调（AsyncLocalStorage.exit/run），旧版名 cliError 配错。
 */
function runInOutermostCallFrame(exitCode) {
  let outermostCallFrame = getOutermostCallFrame();
  return outermostCallFrame === undefined
    ? remoteCallFrameStorage.exit(exitCode)
    : remoteCallFrameStorage.run(outermostCallFrame, exitCode);
}
//@ chunk-n49ac0t1.js:448-488 placement
function printCliError(message) {
  console.error(sequential.red(message));
}
//@ chunk-n49ac0t1.js:488-566 placement (2.1.88 match: cliOk, 0.414)
/**
 * cliError：输出红色错误（可选）并以 1 退出；非 diskless 进程先记录退出原因。（旧版名 cliOk 配错，门面导出名为 cliError）
 */
function cliError(message, cause = "cli_error") {
  if (message) printCliError(message);
  if (!isDisklessProcess()) setBgExitCause(cause);
  process.exit(1);
  return;
}
//@ chunk-n49ac0t1.js:566-637 placement
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
//@ chunk-n49ac0t1.js:637-676 placement
function cliExit(code) {
  process.exit(code);
  return;
}
//@ chunk-n49ac0t1.js:676-755 placement
async function writeStdoutAndDrain(text) {
  await new Promise((resolve) => {
    process.stdout.write(text, () => resolve());
  });
}
//@ chunk-n49ac0t1.js:755-813 placement
function cliWarn(message) {
  process.stderr.write(
    sequential.yellow(stripControlChars(message)) +
      `
`,
  );
}
//@ chunk-n49ac0t1.js:813-830 placement
var WRITE_DRAIN_TIMEOUT_MS = 2000;
var REFRESHED_WRITE_DRAIN_TIMEOUT_MS = 250;
//@ chunk-n49ac0t1.js:830-1050 placement
async function flushAnalyticsBeforeExit({ waitForOAuthRefresh = true } = {}) {
  let refreshOwnedByUs = beginExitWaitingForOAuthRefreshLast();
  if (waitForOAuthRefresh && !refreshOwnedByUs) await waitForOAuthRefreshBeforeExit();
  await withDeadline(drainRegisteredWriteQueues(), WRITE_DRAIN_TIMEOUT_MS);
  try {
    let { flushAnalyticsSinks } = await import("../services/analytics/flushSinks.js");
    await flushAnalyticsSinks();
  } catch {}
  if (waitForOAuthRefresh && refreshOwnedByUs) {
    await waitForOAuthRefreshBeforeExit();
    await withDeadline(drainRegisteredWriteQueues(), REFRESHED_WRITE_DRAIN_TIMEOUT_MS);
  }
}
//@ chunk-n49ac0t1.js:1050-1105 placement
async function exitAfterAnalyticsFlush(code) {
  await flushAnalyticsBeforeExit();
  process.exit(code);
  return;
}
//@ chunk-n49ac0t1.js:1105-1160 placement
async function cliErrorAfterAnalyticsFlush(message) {
  if (message) printCliError(message);
  await flushAnalyticsBeforeExit();
  return cliError();
}
//@ chunk-n49ac0t1.js:1160-1237 placement
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
//@ chunk-323717f6.js:8422-8500 fingerprint (2.1.88 match: cliError, 0.709)
function cliError_2(toolUseId, tool, options) {
  return toolUseId === undefined
    ? SERVER_NEVER_SENT_ERROR_CODES.exit(options)
    : SERVER_NEVER_SENT_ERROR_CODES.run(
        {
          tool,
          toolUseId,
        },
        options,
      );
}
export {
  printCliError,
  runInOutermostCallFrame,
  cliError,
  cliWarn,
  exitAfterAnalyticsFlush,
  cliErrorAfterAnalyticsFlush,
  writeStdoutAndDrain,
  flushAnalyticsBeforeExit,
  cliExit,
  cliOkAfterAnalyticsFlush,
  cliError_2,
  cliOk,
};
