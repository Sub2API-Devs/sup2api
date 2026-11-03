/**
 * tools/BashTool/bashTelemetry.ts
 *
 * 2.1.316 新增。Bash 遥测。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fym4r1th.js (9)
 * attribution: placement 9
 */
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import { classifyBashCommand } from "./commandClassification.js";
import { fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { getVerifiedTaskOutputTail } from "../../utils/task/diskOutput.js";
import { MAX_TASK_OUTPUT_BYTES } from "../../tasks/LocalShellTask/backgroundNotices.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";

//@ chunk-fym4r1th.js:46066-46115 placement
/**
 * 需要给出原因的允许来源（user、classifier、auto_mode、hook）；getApprovalSource 用它在结果里附带来源。
 */
var APPROVAL_SOURCES_WITH_REASON = ["user", "classifier", "auto_mode", "hook"];
//@ chunk-fym4r1th.js:46115-46479 placement
/**
 * 判断 Bash 命令被允许的来源：用户确认、自动模式分类器、auto 模式或钩子；其他情况返回 undefined。
 */
function getApprovalSource(permissionDecision) {
  let decisionReason =
    permissionDecision.behavior === "allow" ? permissionDecision.decisionReason : undefined;
  switch (decisionReason?.type) {
    case "permissionPromptTool":
      return "user";
    case "classifier":
      return decisionReason.classifier === "auto-mode" && decisionReason.classifierAllowed === true
        ? "classifier"
        : undefined;
    case "mode":
      return decisionReason.mode === "auto" &&
        decisionReason.denialLimitRun !== true &&
        decisionReason.scriptCheckDeferred !== true
        ? "auto_mode"
        : undefined;
    case "hook":
      return "hook";
    default:
      return;
  }
}
//@ chunk-fym4r1th.js:46479-46977 placement
/**
 * 生成 Bash 命令计时遥测字段：墙钟时长、用户/系统 CPU、是否留有进程、/proc CPU 与 cgroup CPU（及是否共享）。
 */
function buildCommandTimingFields(shellUsage) {
  if (shellUsage === undefined) return {};
  return {
    duration_ms: Math.round(shellUsage.wallMs * 1000) / 1000,
    ...(shellUsage.cpu !== undefined && {
      command_cpu_user_ms: shellUsage.cpu.userMs,
      command_cpu_system_ms: shellUsage.cpu.systemMs,
      left_process_running: shellUsage.cpu.leftProcessRunning,
    }),
    ...(shellUsage.procCpuMs !== undefined && {
      command_proc_cpu_ms: shellUsage.procCpuMs,
    }),
    ...(shellUsage.cpuAccount !== undefined && {
      command_cgroup_cpu_ms: Math.round(shellUsage.cpuAccount.cpuMs * 1000) / 1000,
      command_cgroup_shared: shellUsage.cpuAccount.shared,
      command_cgroup_shared_left_running_only: shellUsage.cpuAccount.sharedWithLeftRunningOnly,
    }),
  };
}
//@ chunk-fym4r1th.js:46977-49092 placement
/**
 * 各测试框架的失败/通过输出正则对（pytest、RSpec、Jest、vitest、Go、Cargo、tap 等）；classifyTestOutcome 据此判断命令输出是测试失败还是通过。
 */
var BASH_TEST_PATTERNS = 8192;
var TEST_OUTPUT_PATTERNS = [
  [
    /^(?:=* ?(?:\d+ \w+, ){0,9}[1-9]\d* (?:failed|errors?)\b.{0,200} in \d[\d.]*s\b|FAIL Required test coverage of [\d.]+% not reached\.)/m,
    /^=* ?\d+ passed\b.{0,200} in \d[\d.]*s\b/m,
  ],
  [/^FAILED \([a-z ]+=\d/m, /^Ran \d+ tests? in [\d.]+s\s+OK\b/m],
  [
    /^(?:Tests?(?: Suites)?: +(?:\d+ \w+, ){0,9}[1-9]\d* failed\b|Jest: (?:".{0,200}" coverage threshold for \w+ \(.{0,20}\) not met: |Uncovered count for \w+ \(\d+\) exceeds |Coverage data for .{0,200} was not found\.))/m,
    /^Tests: +(?:\d+ \w+, ){0,9}\d+ passed, \d+ total\b/m,
  ],
  [
    /^ *(?:Tests?(?: Files)? +(?:\d+ \w+ \| ){0,9}[1-9]\d* failed\b.{0,80}\(\d+\)|Errors +[1-9]\d* errors?\b|ERROR: (?:Coverage for \w+ \([\d.]+%\) does not meet |Uncovered \w+ \(\d+\) exceed ).{0,200}threshold \()/m,
    /^ *Tests +(?:\d+ \w+ \| ){0,9}\d+ passed\b.{0,80}\(\d+\)/m,
  ],
  [/^ *[1-9]\d* failing\b/m, /^ *\d+ passing\b/m],
  [/^ *[1-9]\d* failed$/m, /^ *\d+ passed \([\d.]+(?:ms|s|m|h)\)/m, /^ {4}\S.{0,400} \u203A /m],
  [/^ *(?:[1-9]\d* fail|\d+ fail\r?\n *[1-9]\d* errors?)$/m, /^ *0 fail$/m],
  [/^[#\u2139] (?:fail|cancelled) [1-9]\d*$/m, /^[#\u2139] fail 0$/m],
  [/^FAILED \| \d+ passed\b/m, /^ok \| \d+ passed\b/m],
  [/^(?:--- FAIL: |FAIL(?:\t|$))/m, /^(?:ok {2}\t|PASS$)/m],
  [
    /^(?:test result: FAILED\.|error: (?:test failed|test run failed|\d+ targets? failed|could not compile)\b)/m,
    /^test result: ok\./m,
  ],
  [
    /^ *Summary \[[^\]\n]{0,40}\] [\d/]+ tests? run: .{0,200}\b[1-9]\d* (?:failed|timed out|exec failed)\b/m,
    /^ *Summary \[[^\]\n]{0,40}\] [\d/]+ tests? run: \d+ passed\b/m,
  ],
  [
    /^(?:\[\w+\] +)?Tests run: \d+, Failures: (?:[1-9]\d*, Errors: \d+|0, Errors: [1-9])/m,
    /^(?:\[\w+\] +)?Tests run: \d+, Failures: 0, Errors: 0\b/m,
  ],
  [
    /^(?:(?:\[\w+\] +)?BUILD FAIL(?:URE|ED)\b|\d+ tests? completed, [1-9]\d* failed\b)/m,
    /^(?:\[\w+\] +)?BUILD SUCCESS(?:FUL)?\b/m,
  ],
  [/^Failed! +- Failed:/m, /^Passed! +- Failed:/m],
  [
    /^\d+% tests passed, [1-9]\d* tests? failed out of \d+/m,
    /^100% tests passed, 0 tests failed out of \d+/m,
  ],
  [
    /^\d+ examples?, (?:[1-9]\d* failures?|0 failures, \d+ errors? occurred)\b/m,
    /^\d+ examples?, 0 failures\b/m,
  ],
  [/^(?:FAILURES|ERRORS)!$/m, /^OK \(\d+ tests?, \d+ assertions?\)/m],
];
//@ chunk-fym4r1th.js:49092-49281 placement
function detectTestOutcome(e) {
  let s = e.length - BASH_TEST_PATTERNS;
  let n = stripAnsiPerLine(
    s > 0
      ? e.slice(
          e.indexOf(
            `
`,
            s - 1,
          ),
        )
      : e,
  );
  if (TEST_OUTPUT_PATTERNS.some(([a]) => a.test(n))) return "failed";
  return TEST_OUTPUT_PATTERNS.some(([, a, r]) => a.test(n) && r?.test(n) !== true) ? "passed" : "unknown";
}
//@ chunk-fym4r1th.js:49281-49640 placement
/**
 * 根据输出判断测试命令的结果；若输出显示通过但退出码非零、被中断、超时或输出被截断，则记为 unknown。
 */
function classifyTestOutcome(e, s, n) {
  if (
    e.bash_test_scope === undefined ||
    e.bash_test_scope === "runs_no_tests" ||
    n.backgroundTaskId !== undefined
  )
    return;
  let testOutcome = detectTestOutcome(
    n.outputFilePath === undefined ? s : s.slice(n.stdout.length).replace(/^\n.*/, ""),
  );
  let parts = e.bash_programs.split(",");
  return testOutcome === "passed" &&
    (n.code !== 0 ||
      n.interrupted ||
      n.timedOut === true ||
      parts.includes("head") ||
      parts.includes("incomplete"))
    ? "unknown"
    : testOutcome;
}
//@ chunk-fym4r1th.js:49640-50162 placement
/**
 * 后台命令结束时计算命令分类与测试结果（从输出或任务输出尾部异步读取），异常时返回空结果。
 */
function classifyBackgroundCommand(e, taskOutput, n, interrupted, r) {
  try {
    let d = classifyBashCommand(e);
    if (d.bash_test_scope === undefined || n === undefined || n.outputFileSize !== undefined)
      return {
        commandClass: d,
        testOutcome: undefined,
      };
    let f = {
      code: n.code,
      interrupted,
      stdout: "",
    };
    let m = taskOutput.outputFileRedundant ? n.stdout : r;
    return {
      commandClass: d,
      testOutcome:
        m !== undefined
          ? fromEnumOpt(classifyTestOutcome(d, m, f))
          : getVerifiedTaskOutputTail(taskOutput.taskId, MAX_TASK_OUTPUT_BYTES)
              .then((verifiedTaskOutputTail) =>
                fromEnumOpt(classifyTestOutcome(d, verifiedTaskOutputTail.content, f)),
              )
              .catch((error) => {
                logForDebugging(
                  `Background command ${taskOutput.taskId}: output tail unreadable, no test outcome: ${String(error)}`,
                );
                return;
              }),
    };
  } catch (error) {
    logError(toError(error));
    return {
      commandClass: undefined,
      testOutcome: undefined,
    };
  }
}
//@ chunk-fym4r1th.js:50162-50244 placement
/**
 * 若值是 Promise 就 then 回调，否则同步调用；错误统一写日志。用于把同步/异步结果交给同一回调。
 */
function thenIfPromise(testOutcome, s) {
  if (testOutcome instanceof Promise) testOutcome.then(s).catch((error) => logError(toError(error)));
  else s(testOutcome);
}
//@ chunk-fym4r1th.js:50244-50436 placement
/**
 * 后台命令卡住检测常量：检测间隔、停滞阈值、尾部字节数，以及识别交互提示（y/n、Press Enter、Continue? 等）的正则。
 */
var STALL_CHECK_INTERVAL_MS = 5000;
var STALL_THRESHOLD_MS = 45000;
var STALL_TAIL_BYTES = 1024;
var INTERACTIVE_PROMPT_PATTERNS = [
  /\(y\/n\)/i,
  /\[y\/n\]/i,
  /\(yes\/no\)/i,
  /\b(?:Do you|Would you|Shall I|Are you sure|Ready to)\b.*\? *$/i,
  /Press (any key|Enter)/i,
  /Continue\?/i,
  /Overwrite\?/i,
];
export {
  STALL_THRESHOLD_MS,
  STALL_TAIL_BYTES,
  STALL_CHECK_INTERVAL_MS,
  getApprovalSource,
  classifyTestOutcome,
  buildCommandTimingFields,
  thenIfPromise,
  classifyBackgroundCommand,
  INTERACTIVE_PROMPT_PATTERNS,
  APPROVAL_SOURCES_WITH_REASON,
};
